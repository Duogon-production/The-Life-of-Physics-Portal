-- Cross-table invariants apply even to trusted backend writes.
create function private.check_lms_integrity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare course uuid; org uuid; other_course uuid; linked_org uuid;
begin
 if tg_table_name='course_staff' then
   select c.organization_id into org from public.courses c where c.id=new.course_id;
   if not exists(select 1 from public.organization_memberships m where m.organization_id=org and m.user_id=new.user_id and m.status='active'
     and (new.role in ('assistant','editor') or m.role in ('owner','admin','teacher'))) then
     raise exception 'Course staff must be active staff of its organization' using errcode='23514';
   end if;
 elsif tg_table_name='offering_staff' then
   select c.organization_id into org from public.course_offerings o join public.courses c on c.id=o.course_id where o.id=new.offering_id;
   if not exists(select 1 from public.organization_memberships m where m.organization_id=org and m.user_id=new.user_id and m.status='active'
     and (new.role='teaching_assistant' or m.role in ('owner','admin','teacher'))) then
     raise exception 'Offering staff must be active staff of its organization' using errcode='23514';
   end if;
 elsif tg_table_name='course_offerings' then
   if not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=new.timezone) then raise exception 'Unknown timezone' using errcode='23514'; end if;
 elsif tg_table_name='offering_assessments' then
   select o.course_id into course from public.course_offerings o where o.id=new.offering_id;
   select a.course_id into other_course from public.assessments a where a.id=new.assessment_id;
   if course is distinct from other_course then raise exception 'Assessment and offering belong to different courses' using errcode='23514'; end if;
 elsif tg_table_name='lesson_progress' then
   select o.course_id into course from public.course_offerings o where o.id=new.offering_id;
   select m.course_id into other_course from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=new.lesson_id;
   if course is distinct from other_course then raise exception 'Lesson is outside the enrolled offering course' using errcode='23514'; end if;
 elsif tg_table_name='lesson_blocks' and new.media_asset_id is not null then
   select c.organization_id into org from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=new.lesson_id;
   select a.organization_id into linked_org from public.media_assets a where a.id=new.media_asset_id and a.bucket='lms-course-media';
   if org is distinct from linked_org then raise exception 'Lesson media must belong to its organization' using errcode='23514'; end if;
 elsif tg_table_name='media_assets' and new.offering_id is not null then
   select c.organization_id into org from public.course_offerings o join public.courses c on c.id=o.course_id where o.id=new.offering_id;
   if org is distinct from new.organization_id then raise exception 'Submission media has a different organization' using errcode='23514'; end if;
 elsif tg_table_name='assessment_responses' then
   select oa.assessment_id, oa.offering_id into course, org from public.assessment_attempts a join public.offering_assessments oa on oa.id=a.offering_assessment_id where a.id=new.attempt_id;
   select q.assessment_id into other_course from public.assessment_questions q where q.id=new.question_id;
   if course is distinct from other_course then raise exception 'Question is outside the attempt assessment' using errcode='23514'; end if;
   if new.media_asset_id is not null and not exists(select 1 from public.media_assets m join public.assessment_attempts a on a.id=new.attempt_id where m.id=new.media_asset_id and m.offering_id=org and m.uploaded_by=a.user_id and m.kind='submission') then
     raise exception 'Response file must belong to this student and offering' using errcode='23514';
   end if;
   if new.awarded_points>(select q.points from public.assessment_questions q where q.id=new.question_id) then raise exception 'Awarded points exceed question points' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function private.check_lms_integrity() from public, anon, authenticated;
do $$ declare t text; begin
 foreach t in array array['course_staff','offering_staff','course_offerings','offering_assessments','lesson_progress','lesson_blocks','media_assets','assessment_responses'] loop
 execute format('create trigger check_integrity before insert or update on public.%I for each row execute function private.check_lms_integrity()',t);
 end loop;
end $$;

-- Parent links never move: reparenting could invalidate descendants or history.
create function private.reject_reparenting() returns trigger language plpgsql set search_path = '' as $$
declare k text; begin
 foreach k in array tg_argv loop
   if to_jsonb(new)->k is distinct from to_jsonb(old)->k then raise exception 'Immutable identity/link: %',k using errcode='23514'; end if;
 end loop;
 return new;
end $$;
revoke all on function private.reject_reparenting() from public, anon, authenticated;
do $$ declare t text; col text; begin
 for t,col in select * from (values
 ('profiles','id'),('organizations','id'),('organization_memberships','organization_id,user_id'),
 ('courses','organization_id'),('course_staff','course_id,user_id'),('course_modules','course_id'),('lessons','module_id'),
 ('course_offerings','course_id'),('offering_staff','offering_id,user_id'),('enrollments','offering_id,user_id'),
 ('lesson_blocks','lesson_id'),('media_assets','organization_id,uploaded_by,offering_id,bucket,object_path'),
 ('lesson_progress','offering_id,lesson_id,user_id'),('assessments','course_id,version,supersedes_assessment_id'),
 ('assessment_questions','assessment_id'),('assessment_options','question_id'),('offering_assessments','offering_id,assessment_id'),
 ('assessment_attempts','offering_assessment_id,user_id,attempt_number,started_at,deadline_at,max_score'),('assessment_responses','attempt_id,question_id')) x(t,col)
 loop
 execute format('create trigger prevent_reparenting before update on public.%I for each row execute function private.reject_reparenting(%s)',t,
   (select string_agg(quote_literal(k),',') from unnest(array['id']||string_to_array(col,',')) k));
 end loop;
end $$;

create function private.preserve_assessment_history() returns trigger language plpgsql security definer set search_path = '' as $$
declare aid uuid; qid uuid; row_data jsonb;
begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 if tg_table_name='assessments' then aid:=(row_data->>'id')::uuid;
 elsif tg_table_name in ('assessment_questions','offering_assessments') then aid:=(row_data->>'assessment_id')::uuid;
 else
   qid:=(row_data->>'question_id')::uuid;
   select q.assessment_id into aid from public.assessment_questions q where q.id=qid;
 end if;
 -- Serializes author edits against attempt creation (which takes SHARE).
 perform 1 from public.assessments a where a.id=aid for update;
 if exists(select 1 from public.assessment_attempts at join public.offering_assessments oa on oa.id=at.offering_assessment_id where oa.assessment_id=aid) then
   raise exception 'Assessment has attempts; clone a new version to edit it' using errcode='23514';
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.preserve_assessment_history() from public, anon, authenticated;
create trigger preserve_history before update or delete on public.assessments for each row execute function private.preserve_assessment_history();
create trigger preserve_history before insert or update or delete on public.assessment_questions for each row execute function private.preserve_assessment_history();
create trigger preserve_history before insert or update or delete on public.assessment_options for each row execute function private.preserve_assessment_history();
create trigger preserve_history before insert or update or delete on private.assessment_answer_keys for each row execute function private.preserve_assessment_history();
create trigger preserve_history before update or delete on public.offering_assessments for each row execute function private.preserve_assessment_history();

create function private.protect_last_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if old.role='owner' and old.status='active' and (tg_op='DELETE' or new.role<>'owner' or new.status<>'active') then
   perform 1 from public.organizations o where o.id=old.organization_id for update;
   if not exists(select 1 from public.organization_memberships m where m.organization_id=old.organization_id and m.user_id<>old.user_id and m.role='owner' and m.status='active') then
     raise exception 'Organization requires an active owner' using errcode='23514';
   end if;
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.protect_last_owner() from public, anon, authenticated;
create trigger protect_last_owner before update or delete on public.organization_memberships for each row execute function private.protect_last_owner();

create function private.enforce_capacity() returns trigger language plpgsql security definer set search_path = '' as $$
declare cap integer;
begin
 select o.capacity into cap from public.course_offerings o where o.id=new.offering_id for update;
 if new.status='active' and cap is not null and (select count(*) from public.enrollments e where e.offering_id=new.offering_id and e.status='active' and e.id<>new.id)>=cap then
   raise exception 'Offering capacity exceeded' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function private.enforce_capacity() from public, anon, authenticated;
create trigger enforce_capacity before insert or update on public.enrollments for each row execute function private.enforce_capacity();

create function private.assign_course_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.created_by is not null then insert into public.course_staff(course_id,user_id,role) values(new.id,new.created_by,'owner'); end if;
 return new;
end $$;
revoke all on function private.assign_course_owner() from public, anon, authenticated;
create trigger assign_course_owner after insert on public.courses for each row execute function private.assign_course_owner();
