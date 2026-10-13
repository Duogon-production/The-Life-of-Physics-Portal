-- Homework is a distinct, offering-scoped workflow. No existing academic rows are changed.
create table public.homework_assignments (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete restrict,
 offering_id uuid not null references public.course_offerings(id) on delete restrict,
 lesson_id uuid not null references public.lessons(id) on delete restrict,
 segment_id uuid references public.lesson_segments(id) on delete restrict,
 title text not null check(length(trim(title)) between 1 and 200), instructions text not null default '' check(length(instructions)<=20000),
 mode text not null default 'FILE_UPLOAD' check(mode in ('FILE_UPLOAD','PLATFORM_QUESTIONS')),
 status text not null default 'draft' check(status in ('draft','published')),
 uses_marks boolean not null default true, file_points integer not null default 10 check(file_points between 0 and 1000),
 family_id uuid not null references public.homework_assignments(id) on delete restrict deferrable initially deferred,
 version integer not null default 1 check(version>0), supersedes_id uuid references public.homework_assignments(id) on delete restrict,
 revision bigint not null default 0 check(revision>=0), created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(family_id,version)
);
create index homework_assignments_course_idx on public.homework_assignments(course_id);
create index homework_assignments_lesson_idx on public.homework_assignments(lesson_id);
create index homework_assignments_offering_lesson_idx on public.homework_assignments(offering_id,lesson_id,status);
create index homework_assignments_segment_idx on public.homework_assignments(segment_id) where segment_id is not null;
create index homework_assignments_creator_idx on public.homework_assignments(created_by);
create index homework_assignments_supersedes_idx on public.homework_assignments(supersedes_id) where supersedes_id is not null;
create table public.homework_submissions (
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.homework_assignments(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict,number integer not null check(number>0),
 status text not null default 'draft' check(status in ('draft','submitted')),revision bigint not null default 0 check(revision>=0),
 submitted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(assignment_id,user_id,number),check((status='submitted')=(submitted_at is not null))
);
create unique index homework_submissions_one_draft on public.homework_submissions(assignment_id,user_id) where status='draft';
create index homework_submissions_user_idx on public.homework_submissions(user_id,assignment_id);
create index homework_submissions_inbox_idx on public.homework_submissions(assignment_id,status,created_at desc,id);
create table private.homework_uploads (
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.homework_assignments(id) on delete restrict,
 uploaded_by uuid not null references public.profiles(id) on delete restrict,
 submission_id uuid references public.homework_submissions(id) on delete restrict,
 purpose text not null check(purpose in ('reference','question','solution','submission')),
 name text not null check(length(trim(name)) between 1 and 200),mime text not null check(mime in ('application/pdf','image/png','image/jpeg','image/webp','video/mp4')),
 path text not null unique,status text not null default 'pending' check(status in ('pending','ready','archived')),
 size_bytes bigint check(size_bytes>0),sha256 text check(sha256 ~ '^[a-f0-9]{64}$'),pages integer check(pages between 1 and 1000),
 expires_at timestamptz not null default now()+interval '30 minutes',created_at timestamptz not null default now(),
 check((purpose='submission')=(submission_id is not null)),check(purpose='solution' or mime<>'video/mp4'),
 check(path like assignment_id::text||'/'||id::text||'/%')
);
create index homework_uploads_owner_idx on private.homework_uploads(uploaded_by,assignment_id);
create index homework_uploads_assignment_idx on private.homework_uploads(assignment_id);
create index homework_uploads_submission_idx on private.homework_uploads(submission_id) where submission_id is not null;
create table private.homework_clone_sources (
 upload_id uuid primary key references private.homework_uploads(id) on delete cascade,
 source_id uuid not null references private.homework_uploads(id) on delete restrict
);
create index homework_clone_sources_source_idx on private.homework_clone_sources(source_id);
create table public.homework_questions (
 id uuid primary key,assignment_id uuid not null references public.homework_assignments(id) on delete restrict,
 position integer not null check(position>=0),type text not null check(type in ('single_choice','multiple_choice','essay')),
 text text not null default '' check(length(text)<=10000),image_id uuid references private.homework_uploads(id) on delete restrict,
 points integer not null check(points between 0 and 1000),response_mode text not null check(response_mode in ('text','photo','both')),
 unique(assignment_id,position),unique(id,assignment_id)
);
create index homework_questions_image_idx on public.homework_questions(image_id) where image_id is not null;
create table public.homework_options (
 id uuid primary key,question_id uuid not null references public.homework_questions(id) on delete cascade,
 position integer not null check(position between 0 and 7),text text not null default '' check(length(text)<=2000),unique(question_id,position)
);
create table private.homework_keys (
 question_id uuid primary key references public.homework_questions(id) on delete cascade,
 correct_ids uuid[] not null default '{}',model_answer text not null default '' check(length(model_answer)<=10000)
);
create table private.homework_solutions (
 assignment_id uuid primary key references public.homework_assignments(id) on delete restrict,
 text text not null default '' check(length(text)<=20000),video_url text not null default '' check(length(video_url)<=2048 and (video_url='' or video_url ~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$')),
 video_id uuid references private.homework_uploads(id) on delete restrict
);
create index homework_solutions_video_idx on private.homework_solutions(video_id) where video_id is not null;
create table private.homework_materials (
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.homework_assignments(id) on delete restrict,
 upload_id uuid not null references private.homework_uploads(id) on delete restrict,
 purpose text not null check(purpose in ('reference','solution')),unique(assignment_id,upload_id)
);
create index homework_materials_upload_idx on private.homework_materials(upload_id);
create table public.homework_responses (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.homework_submissions(id) on delete restrict,
 question_id uuid not null references public.homework_questions(id) on delete restrict,response jsonb not null default '{}' check(octet_length(response::text)<=30000),
 unique(submission_id,question_id)
);
create index homework_responses_question_idx on public.homework_responses(question_id);
create table public.homework_submission_files (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.homework_submissions(id) on delete restrict,
 question_id uuid references public.homework_questions(id) on delete restrict,upload_id uuid not null references private.homework_uploads(id) on delete restrict,
 unique(submission_id,upload_id)
);
create index homework_submission_files_upload_idx on public.homework_submission_files(upload_id);
create index homework_submission_files_question_idx on public.homework_submission_files(question_id) where question_id is not null;
create table private.homework_corrections (
 submission_id uuid primary key references public.homework_submissions(id) on delete restrict,
 status text not null default 'under_correction' check(status in ('under_correction','corrected','approved','resubmit_required')),
 score numeric check(score>=0),feedback text not null default '' check(length(feedback)<=10000),revision bigint not null default 0 check(revision>=0),
 released_at timestamptz,released_by uuid references public.profiles(id) on delete restrict,
 corrected_by uuid references public.profiles(id) on delete restrict,corrected_at timestamptz,
 check((released_at is null)=(released_by is null))
);
create index homework_corrections_releaser_idx on private.homework_corrections(released_by) where released_by is not null;
create index homework_corrections_corrector_idx on private.homework_corrections(corrected_by) where corrected_by is not null;
create table private.homework_marks (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.homework_submissions(id) on delete restrict,
 question_id uuid not null references public.homework_questions(id) on delete restrict,points numeric check(points>=0),feedback text not null default '' check(length(feedback)<=4000),
 unique(submission_id,question_id)
);
create index homework_marks_question_idx on private.homework_marks(question_id);
create table private.homework_annotations (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.homework_submissions(id) on delete restrict,
 upload_id uuid not null references private.homework_uploads(id) on delete restrict,page integer not null check(page between 1 and 1000),
 x numeric not null check(x between 0 and 1),y numeric not null check(y between 0 and 1),
 width numeric not null check(width>0 and width<=1),height numeric not null check(height>0 and height<=1),
 note text not null check(length(trim(note)) between 1 and 4000),revision bigint not null default 0 check(revision>=0),
 author uuid not null references public.profiles(id) on delete restrict,updated_at timestamptz not null default now(),check(x+width<=1 and y+height<=1)
);
create index homework_annotations_submission_idx on private.homework_annotations(submission_id);
create index homework_annotations_upload_idx on private.homework_annotations(upload_id);
create index homework_annotations_author_idx on private.homework_annotations(author);
create table private.homework_audit (
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.homework_assignments(id) on delete restrict,
 submission_id uuid references public.homework_submissions(id) on delete restrict,actor uuid not null references public.profiles(id) on delete restrict,
 action text not null,reason text not null default '',before_value jsonb,after_value jsonb,created_at timestamptz not null default now()
);
create index homework_audit_assignment_idx on private.homework_audit(assignment_id,created_at,id);
create index homework_audit_submission_idx on private.homework_audit(submission_id) where submission_id is not null;
create index homework_audit_actor_idx on private.homework_audit(actor);
do $$ declare n text;begin
 foreach n in array array['homework_assignments','homework_questions','homework_options','homework_submissions','homework_responses','homework_submission_files'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated',n);
  execute format('grant select on public.%I to authenticated',n);
 end loop;
 foreach n in array array['homework_uploads','homework_clone_sources','homework_keys','homework_solutions','homework_materials','homework_corrections','homework_marks','homework_annotations','homework_audit'] loop
  execute format('alter table private.%I enable row level security',n);
  execute format('revoke all on private.%I from public,anon,authenticated',n);
 end loop;
end $$;
create function private.homework_staff(p_assignment uuid,p_capability text default 'view') returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.homework_assignments a where a.id=p_assignment and case p_capability
 when 'author' then private.can_edit_course(a.course_id)
 when 'grade' then private.can_support_offering(a.offering_id)
 when 'release' then private.can_manage_offering(a.offering_id)
 else private.can_edit_course(a.course_id) or private.can_support_offering(a.offering_id) end)
$$;
create function private.homework_enrolled(p_assignment uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from public.homework_assignments a join public.course_offerings o on o.id=a.offering_id join public.courses c on c.id=a.course_id
 join public.lessons l on l.id=a.lesson_id left join public.lesson_segments s on s.id=a.segment_id
 where a.id=p_assignment and a.status='published' and o.status='active' and c.status='published' and l.status='published'
 and (a.segment_id is null or s.status='published') and private.is_enrolled(a.offering_id)
 and exists(select 1 from public.enrollments e where e.offering_id=a.offering_id and e.user_id=(select private.current_app_user_id()) and e.status='active' and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp()) and (e.expires_at is null or clock_timestamp()<e.expires_at)))
$$;
create function private.homework_visible(p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$select private.homework_staff(p_assignment) or private.homework_enrolled(p_assignment)$$;
create function private.homework_submission_visible(p_submission uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.homework_submissions s where s.id=p_submission and (private.homework_staff(s.assignment_id,'grade') or (s.user_id=(select private.current_app_user_id()) and private.homework_enrolled(s.assignment_id))))
$$;
create function private.homework_unlocked(p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.homework_staff(p_assignment) or (private.homework_enrolled(p_assignment) and exists(select 1 from public.homework_submissions s where s.assignment_id=p_assignment and s.user_id=(select private.current_app_user_id()) and s.status='submitted'))
$$;
revoke all on function private.homework_staff(uuid,text),private.homework_enrolled(uuid),private.homework_visible(uuid),private.homework_submission_visible(uuid),private.homework_unlocked(uuid) from public,anon;
grant execute on function private.homework_staff(uuid,text),private.homework_enrolled(uuid),private.homework_visible(uuid),private.homework_submission_visible(uuid),private.homework_unlocked(uuid) to authenticated;
create policy homework_read on public.homework_assignments for select to authenticated using(private.homework_visible(id));
create policy homework_questions_read on public.homework_questions for select to authenticated using(private.homework_visible(assignment_id));
create policy homework_options_read on public.homework_options for select to authenticated using(exists(select 1 from public.homework_questions q where q.id=question_id));
create policy homework_submissions_read on public.homework_submissions for select to authenticated using(private.homework_submission_visible(id));
create policy homework_responses_read on public.homework_responses for select to authenticated using(private.homework_submission_visible(submission_id));
create policy homework_files_read on public.homework_submission_files for select to authenticated using(private.homework_submission_visible(submission_id));
-- A separate private bucket prevents lesson/exam endpoints from signing homework solutions.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('lms-homework','lms-homework',false,50000000,array['application/pdf','image/png','image/jpeg','image/webp','video/mp4']);
create function private.homework_upload_visible(p_upload uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.homework_uploads u where u.id=p_upload and private.is_active_user() and
 ((u.purpose<>'submission' and private.homework_staff(u.assignment_id)) or
 (u.purpose='submission' and private.homework_staff(u.assignment_id,'grade') and exists(select 1 from public.homework_submissions s where s.id=u.submission_id and s.status='submitted')) or
 (u.purpose='submission' and u.uploaded_by=(select private.current_app_user_id()) and private.homework_enrolled(u.assignment_id)) or
 (u.status='ready' and u.purpose='question' and exists(select 1 from public.homework_questions q where q.image_id=u.id and private.homework_enrolled(q.assignment_id))) or
 (u.status='ready' and u.purpose='reference' and exists(select 1 from private.homework_materials m where m.upload_id=u.id and m.purpose='reference' and private.homework_enrolled(m.assignment_id))) or
 (u.status='ready' and u.purpose='solution' and (exists(select 1 from private.homework_materials m where m.upload_id=u.id and m.purpose='solution' and private.homework_unlocked(m.assignment_id)) or exists(select 1 from private.homework_solutions s where s.video_id=u.id and private.homework_unlocked(s.assignment_id))))))
$$;
create function private.homework_upload_referenced(p_upload uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.homework_questions where image_id=p_upload) or exists(select 1 from private.homework_solutions where video_id=p_upload)
 or exists(select 1 from private.homework_materials where upload_id=p_upload) or exists(select 1 from public.homework_submission_files where upload_id=p_upload)
 or exists(select 1 from private.homework_annotations where upload_id=p_upload)
 or exists(select 1 from private.homework_clone_sources c join private.homework_uploads target on target.id=c.upload_id where c.source_id=p_upload and target.status='pending')
$$;
create function private.homework_storage(p_bucket text,p_path text,p_action text) returns boolean language plpgsql volatile security definer set search_path='' as $$
begin
 -- Serialize physical object insertion against exact metadata archival/cleanup.
 if p_action='insert' then perform 1 from private.homework_uploads where path=p_path for share;end if;
 return (select p_bucket='lms-homework' and private.is_active_user() and exists(select 1 from private.homework_uploads u where u.path=p_path and case p_action
 when 'insert' then u.status='pending' and u.expires_at>now() and u.uploaded_by=(select private.current_app_user_id()) and
  case when u.purpose='submission' then private.homework_enrolled(u.assignment_id) and exists(select 1 from public.homework_submissions s where s.id=u.submission_id and s.user_id=u.uploaded_by and s.status='draft') else private.homework_staff(u.assignment_id,'author') end
 when 'delete' then u.status='archived' and u.uploaded_by=(select private.current_app_user_id()) and not private.homework_upload_referenced(u.id)
 when 'read' then (u.status='ready' and private.homework_upload_visible(u.id)) or (u.status in ('pending','archived') and u.uploaded_by=(select private.current_app_user_id()) and
  ((u.status='archived' and not private.homework_upload_referenced(u.id)) or (u.status='pending' and u.expires_at>now() and private.homework_upload_visible(u.id))))
 else false end));
end $$;
revoke all on function private.homework_upload_visible(uuid),private.homework_upload_referenced(uuid),private.homework_storage(text,text,text) from public,anon,authenticated;
grant execute on function private.homework_upload_visible(uuid),private.homework_storage(text,text,text) to authenticated;
create policy homework_objects_insert on storage.objects for insert to authenticated with check(private.homework_storage(bucket_id,name,'insert'));
create policy homework_objects_read on storage.objects for select to authenticated using(private.homework_storage(bucket_id,name,'read'));
create policy homework_objects_delete on storage.objects for delete to authenticated using(private.homework_storage(bucket_id,name,'delete'));

create function private.homework_integrity() returns trigger language plpgsql security definer set search_path='' as $$
declare parent public.homework_assignments;
begin
 if not exists(select 1 from public.course_offerings o join public.lessons l on l.id=new.lesson_id join public.course_modules m on m.id=l.module_id
 where o.id=new.offering_id and o.course_id=new.course_id and m.course_id=new.course_id) or
 (new.segment_id is not null and not exists(select 1 from public.lesson_segments s where s.id=new.segment_id and s.lesson_id=new.lesson_id)) then raise exception 'Homework curriculum/offering mismatch' using errcode='23514';end if;
 if new.supersedes_id is null then if new.family_id<>new.id or new.version<>1 then raise exception 'Invalid initial version' using errcode='23514';end if;
 else select * into parent from public.homework_assignments where id=new.supersedes_id;
  if parent.id is null or parent.family_id<>new.family_id or parent.course_id<>new.course_id or parent.offering_id<>new.offering_id or parent.lesson_id<>new.lesson_id or parent.segment_id is distinct from new.segment_id or new.version<=parent.version then raise exception 'Invalid homework version lineage' using errcode='23514';end if;
 end if;
 if tg_op='UPDATE' and (new.course_id<>old.course_id or new.offering_id<>old.offering_id or new.lesson_id<>old.lesson_id or new.segment_id is distinct from old.segment_id or new.family_id<>old.family_id or new.supersedes_id is distinct from old.supersedes_id or new.version<>old.version) then raise exception 'Homework cannot be reparented' using errcode='23514';end if;
 return new;
end $$;
revoke all on function private.homework_integrity() from public,anon,authenticated;
create trigger homework_integrity before insert or update on public.homework_assignments for each row execute function private.homework_integrity();
create function private.homework_asset(p_assignment uuid,p_asset uuid,p_purpose text,p_submission uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare u private.homework_uploads;
begin
 select * into u from private.homework_uploads where id=p_asset for share;
 if u.id is null or u.status<>'ready' or u.purpose<>p_purpose or not exists(select 1 from public.homework_assignments a join public.homework_assignments b on b.family_id=a.family_id and b.course_id=a.course_id and b.offering_id=a.offering_id where a.id=p_assignment and b.id=u.assignment_id)
 or (p_purpose='submission' and (u.submission_id is distinct from p_submission or u.uploaded_by is distinct from (select private.current_app_user_id()))) then raise exception 'Wrong homework asset or ownership' using errcode='42501';end if;
end $$;
revoke all on function private.homework_asset(uuid,uuid,text,uuid) from public,anon,authenticated;

-- Authoring replaces a complete draft atomically; existing submissions freeze its definition.
create function private.save_homework(p_assignment uuid,p_offering uuid,p_lesson uuid,p_segment uuid,p_revision bigint,p_definition jsonb,p_confirm_mode_change boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.homework_assignments; o public.course_offerings; q jsonb; opt jsonb; item jsonb; n integer:=0; k integer; qid uuid; oid uuid; keys uuid[]; asset uuid; mode text;
begin
 if not private.is_active_user() then raise exception 'Authentication required' using errcode='42501';end if;
 select * into o from public.course_offerings where id=p_offering for share;
 if o.id is null or not private.can_edit_course(o.course_id) then raise exception 'Homework authoring denied' using errcode='42501';end if;
 if p_assignment is null then
  p_assignment:=gen_random_uuid();insert into public.homework_assignments(id,family_id,course_id,offering_id,lesson_id,segment_id,title,created_by) values(p_assignment,p_assignment,o.course_id,o.id,p_lesson,p_segment,p_definition->>'title',(select private.current_app_user_id()));
 end if;
 select * into a from public.homework_assignments where id=p_assignment for update;
 if a.id is null or a.offering_id<>p_offering or a.lesson_id<>p_lesson or a.segment_id is distinct from p_segment or not private.homework_staff(a.id,'author') then raise exception 'Authoring denied' using errcode='42501';end if;
 if a.revision<>coalesce(p_revision,0) then raise exception 'Homework changed; reload' using errcode='PT409';end if;
 if exists(select 1 from public.homework_submissions where assignment_id=a.id) then raise exception 'Work has started; clone a new version' using errcode='PT409';end if;
 if jsonb_typeof(p_definition)<>'object' or octet_length(p_definition::text)>500000 then raise exception 'Invalid definition' using errcode='23514';end if;
 mode:=p_definition->>'mode';
 if mode<>a.mode and exists(select 1 from public.homework_questions where assignment_id=a.id) and not p_confirm_mode_change then raise exception 'Confirm removal of authored questions' using errcode='23514';end if;
 if mode not in ('FILE_UPLOAD','PLATFORM_QUESTIONS') or jsonb_typeof(p_definition->'questions')<>'array' or jsonb_array_length(p_definition->'questions')>100 or
 (mode='FILE_UPLOAD' and jsonb_array_length(p_definition->'questions')<>0) or (mode='PLATFORM_QUESTIONS' and jsonb_array_length(p_definition->'questions')<1) then raise exception 'Invalid mode/question set' using errcode='23514';end if;
 -- This deletes only an explicitly saved, unstarted draft definition; no submitted work is affected.
 delete from public.homework_questions where assignment_id=a.id;
 for q in select value from jsonb_array_elements(p_definition->'questions') loop
  qid:=(q->>'id')::uuid;
  if q->>'type' not in ('single_choice','multiple_choice','essay') or jsonb_typeof(q->'options')<>'array' or jsonb_typeof(q->'correctIds')<>'array' then raise exception 'Invalid question structure' using errcode='23514';end if;
  asset:=(q->>'imageId')::uuid;if asset is not null then perform private.homework_asset(a.id,asset,'question');end if;
  insert into public.homework_questions(id,assignment_id,position,type,text,image_id,points,response_mode) values(qid,a.id,n,q->>'type',coalesce(q->>'text',''),asset,(q->>'points')::integer,q->>'responseMode');n:=n+1;
  keys:=array(select value::uuid from jsonb_array_elements_text(q->'correctIds'));
  if q->>'type'='essay' then
   if jsonb_array_length(q->'options')<>0 or cardinality(keys)<>0 then raise exception 'Essay cannot contain choices' using errcode='23514';end if;
  else
   if jsonb_array_length(q->'options') not between 2 and 8 or cardinality(keys)>8 or (q->>'type'='single_choice' and cardinality(keys)>1) or ((p_definition->>'published')::boolean and cardinality(keys)=0) or cardinality(keys)<>(select count(distinct v) from unnest(keys) v) then raise exception 'Invalid choice structure/key' using errcode='23514';end if;
   k:=0;for opt in select value from jsonb_array_elements(q->'options') loop
    oid:=(opt->>'id')::uuid;insert into public.homework_options(id,question_id,position,text) values(oid,qid,k,coalesce(opt->>'text',''));k:=k+1;
   end loop;
   if exists(select 1 from unnest(keys) v where not exists(select 1 from public.homework_options where id=v and question_id=qid)) then raise exception 'Foreign answer key' using errcode='23514';end if;
  end if;
  insert into private.homework_keys(question_id,correct_ids,model_answer) values(qid,keys,coalesce(q->>'modelAnswer',''));
 end loop;
 asset:=(p_definition->>'solutionVideoId')::uuid;if asset is not null then perform private.homework_asset(a.id,asset,'solution');if not exists(select 1 from private.homework_uploads where id=asset and mime='video/mp4') then raise exception 'Solution video must be MP4' using errcode='23514';end if;end if;
 insert into private.homework_solutions(assignment_id,text,video_url,video_id) values(a.id,coalesce(p_definition->>'modelAnswer',''),coalesce(p_definition->>'solutionVideo',''),asset)
 on conflict(assignment_id) do update set text=excluded.text,video_url=excluded.video_url,video_id=excluded.video_id;
 delete from private.homework_materials where assignment_id=a.id;
 foreach mode in array array['reference','solution'] loop
  if jsonb_typeof(p_definition->case mode when 'reference' then 'referenceIds' else 'solutionIds' end)<>'array' then raise exception 'Invalid resource set' using errcode='23514';end if;
  k:=0;for item in select value from jsonb_array_elements(p_definition->case mode when 'reference' then 'referenceIds' else 'solutionIds' end) loop
   k:=k+1;if k>10 then raise exception 'Too many resources' using errcode='23514';end if;asset:=(item#>>'{}')::uuid;perform private.homework_asset(a.id,asset,mode);
   insert into private.homework_materials(assignment_id,upload_id,purpose) values(a.id,asset,mode);
  end loop;
 end loop;
 update public.homework_assignments set title=p_definition->>'title',instructions=coalesce(p_definition->>'instructions',''),mode=p_definition->>'mode',status=case when (p_definition->>'published')::boolean then 'published' else 'draft' end,uses_marks=(p_definition->>'usesMarks')::boolean,file_points=(p_definition->>'filePoints')::integer,revision=revision+1,updated_at=clock_timestamp() where id=a.id;
 insert into private.homework_audit(assignment_id,actor,action,before_value,after_value) values(a.id,(select private.current_app_user_id()),'definition',to_jsonb(a),p_definition);
 return a.id;
end $$;
revoke all on function private.save_homework(uuid,uuid,uuid,uuid,bigint,jsonb,boolean) from public,anon;
grant execute on function private.save_homework(uuid,uuid,uuid,uuid,bigint,jsonb,boolean) to authenticated;
create function public.save_homework(p_assignment uuid,p_offering uuid,p_lesson uuid,p_segment uuid,p_revision bigint,p_definition jsonb,p_confirm_mode_change boolean default false) returns uuid language sql security invoker set search_path='' as $$select private.save_homework(p_assignment,p_offering,p_lesson,p_segment,p_revision,p_definition,p_confirm_mode_change)$$;
revoke all on function public.save_homework(uuid,uuid,uuid,uuid,bigint,jsonb,boolean) from public,anon;
grant execute on function public.save_homework(uuid,uuid,uuid,uuid,bigint,jsonb,boolean) to authenticated;

create function private.homework_submission_json(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.homework_submissions;c private.homework_corrections;staff boolean;visible boolean;answer jsonb;
begin
 select * into s from public.homework_submissions where id=p_id;
 if s.id is null or not private.homework_submission_visible(s.id) then raise exception 'Submission unavailable' using errcode='42501';end if;
 staff:=private.homework_staff(s.assignment_id,'grade');select * into c from private.homework_corrections where submission_id=s.id;visible:=staff or c.released_at is not null;
 answer:=jsonb_build_object('id',s.id,'revision',s.revision,'number',s.number,'status',s.status,'submittedAt',s.submitted_at,
 'answers',coalesce((select jsonb_agg(jsonb_build_object('questionId',r.question_id,'optionIds',coalesce(r.response->'optionIds','[]'::jsonb),'text',coalesce(r.response->>'text',''),'fileIds',coalesce((select jsonb_agg(f.upload_id order by f.id) from public.homework_submission_files f where f.submission_id=s.id and f.question_id=r.question_id),'[]'::jsonb)) order by q.position) from public.homework_responses r join public.homework_questions q on q.id=r.question_id where r.submission_id=s.id),'[]'::jsonb),
 'files',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'mime',u.mime) order by f.id) from public.homework_submission_files f join private.homework_uploads u on u.id=f.upload_id where f.submission_id=s.id),'[]'::jsonb));
 if c.submission_id is not null then answer:=answer||jsonb_build_object('correction',jsonb_build_object('status',case when visible then c.status when exists(select 1 from private.homework_marks where submission_id=s.id and points is null) or (select mode='FILE_UPLOAD' from public.homework_assignments where id=s.assignment_id) then 'under_correction' else 'submitted' end,'revision',case when staff then c.revision else 0 end,'released',c.released_at is not null,'score',case when visible and (select uses_marks from public.homework_assignments where id=s.assignment_id) then c.score end,'feedback',case when visible then c.feedback else '' end,
 'marks',case when visible then coalesce((select jsonb_agg(jsonb_build_object('questionId',m.question_id,'points',case when a.uses_marks then m.points end,'feedback',m.feedback)) from private.homework_marks m join public.homework_assignments a on a.id=s.assignment_id where m.submission_id=s.id),'[]'::jsonb) else '[]'::jsonb end,
 'annotations',case when visible then coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'fileId',n.upload_id,'page',n.page,'x',n.x,'y',n.y,'width',n.width,'height',n.height,'note',n.note,'revision',n.revision,'author',n.author,'updatedAt',n.updated_at) order by n.page,n.updated_at,n.id) from private.homework_annotations n where n.submission_id=s.id),'[]'::jsonb) else '[]'::jsonb end));end if;
 return answer;
end $$;
revoke all on function private.homework_submission_json(uuid) from public,anon,authenticated;

create function private.homework_work(p_assignment uuid,p_action text,p_submission uuid default null,p_revision bigint default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.homework_assignments;s public.homework_submissions;c private.homework_corrections;u uuid:=(select private.current_app_user_id());
 q public.homework_questions;r jsonb;f jsonb;asset uuid;ids uuid[];keys uuid[];points numeric;total numeric;previous jsonb;annotation private.homework_annotations;ordinal integer;
begin
 if u is null or not private.is_active_user() or octet_length(p_data::text)>500000 then raise exception 'Authentication or payload invalid' using errcode='42501';end if;
 -- Authoring/unpublication take an exclusive root lock. Student work holds a shared
 -- root lock and serializes only the exact student's submission/correction rows.
 select * into a from public.homework_assignments where id=p_assignment for share;
 if a.id is null then raise exception 'Homework unavailable' using errcode='42501';end if;
 if p_action in ('start','save','submit') then perform 1 from public.enrollments e where e.offering_id=a.offering_id and e.user_id=u for share;end if;
 if p_action='start' then
  if not private.homework_enrolled(a.id) then raise exception 'Active enrollment required' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(a.id::text||u::text,0));
  select * into s from public.homework_submissions where assignment_id=a.id and user_id=u order by number desc limit 1 for update;
  if not private.homework_enrolled(a.id) then raise exception 'Enrollment expired during start' using errcode='42501';end if;
  if s.status='draft' then return private.homework_submission_json(s.id);end if;
  if s.id is not null and not exists(select 1 from private.homework_corrections where submission_id=s.id and status='resubmit_required' and released_at is not null) then return private.homework_submission_json(s.id);end if;
  ordinal:=coalesce(s.number,0)+1;
  insert into public.homework_submissions(assignment_id,user_id,number) values(a.id,u,ordinal) returning * into s;
  return private.homework_submission_json(s.id);
 end if;
 select * into s from public.homework_submissions where id=p_submission and assignment_id=a.id for update;
 if s.id is null then raise exception 'Submission unavailable' using errcode='42501';end if;
 if p_action in ('save','submit') then
  if s.user_id<>u or not private.homework_enrolled(a.id) then raise exception 'Student work denied' using errcode='42501';end if;
  if p_action='submit' and s.status='submitted' then return private.homework_submission_json(s.id);end if;
  if s.status<>'draft' then raise exception 'Submitted work is immutable' using errcode='PT409';end if;
  if p_revision is null or s.revision<>p_revision then raise exception 'Answers changed; reload' using errcode='PT409';end if;
  if p_action='save' then
   if jsonb_typeof(p_data->'answers')<>'array' or jsonb_array_length(p_data->'answers')>100 or jsonb_typeof(p_data->'fileIds')<>'array' or jsonb_array_length(p_data->'fileIds')>10 then raise exception 'Invalid answer snapshot' using errcode='23514';end if;
   if (a.mode='FILE_UPLOAD' and jsonb_array_length(p_data->'answers')<>0) or (a.mode='PLATFORM_QUESTIONS' and jsonb_array_length(p_data->'fileIds')<>0) then raise exception 'Wrong submission mode' using errcode='23514';end if;
   if (select count(distinct value->>'questionId') from jsonb_array_elements(p_data->'answers'))<>jsonb_array_length(p_data->'answers') then raise exception 'Duplicate question' using errcode='23514';end if;
   delete from public.homework_responses where submission_id=s.id;delete from public.homework_submission_files where submission_id=s.id;
   for r in select value from jsonb_array_elements(p_data->'answers') loop
    select * into q from public.homework_questions where id=(r->>'questionId')::uuid and assignment_id=a.id;
    if q.id is null or jsonb_typeof(r->'optionIds')<>'array' or jsonb_typeof(r->'fileIds')<>'array' or jsonb_typeof(r->'text')<>'string' or length(r->>'text')>20000 then raise exception 'Invalid question answer' using errcode='23514';end if;
    ids:=array(select value::uuid from jsonb_array_elements_text(r->'optionIds'));
    if cardinality(ids)<>(select count(distinct v) from unnest(ids) v) or (q.type='single_choice' and cardinality(ids)>1) or exists(select 1 from unnest(ids) v where not exists(select 1 from public.homework_options where id=v and question_id=q.id)) then raise exception 'Invalid answer choices' using errcode='23514';end if;
    if q.type='essay' then
     if cardinality(ids)<>0 or jsonb_array_length(r->'fileIds')>4 or (q.response_mode='text' and jsonb_array_length(r->'fileIds')>0) or (q.response_mode='photo' and length(r->>'text')>0) then raise exception 'Wrong written answer format' using errcode='23514';end if;
    elsif jsonb_array_length(r->'fileIds')>0 or length(r->>'text')>0 then raise exception 'Choice answers cannot contain files/text' using errcode='23514';end if;
    insert into public.homework_responses(submission_id,question_id,response) values(s.id,q.id,jsonb_build_object('optionIds',to_jsonb(ids),'text',r->>'text'));
    for f in select value from jsonb_array_elements(r->'fileIds') loop
     asset:=(f#>>'{}')::uuid;perform private.homework_asset(a.id,asset,'submission',s.id);insert into public.homework_submission_files(submission_id,question_id,upload_id) values(s.id,q.id,asset);
    end loop;
   end loop;
   for f in select value from jsonb_array_elements(p_data->'fileIds') loop
    asset:=(f#>>'{}')::uuid;perform private.homework_asset(a.id,asset,'submission',s.id);insert into public.homework_submission_files(submission_id,upload_id) values(s.id,asset);
   end loop;
   if (select count(*) from public.homework_submission_files where submission_id=s.id)>10 then raise exception 'Maximum ten files per submission' using errcode='23514';end if;
  else
   if a.mode='FILE_UPLOAD' and not exists(select 1 from public.homework_submission_files where submission_id=s.id) then raise exception 'Upload your completed work before submitting' using errcode='23514';end if;
   -- A completely empty online draft is not a successful submission/unlock event.
   if a.mode='PLATFORM_QUESTIONS' and not exists(select 1 from public.homework_responses where submission_id=s.id and (jsonb_array_length(response->'optionIds')>0 or length(trim(response->>'text'))>0)) and not exists(select 1 from public.homework_submission_files where submission_id=s.id) then raise exception 'Answer at least one question before submitting' using errcode='23514';end if;
   for q in select * from public.homework_questions where assignment_id=a.id order by position loop
    select response into r from public.homework_responses where submission_id=s.id and question_id=q.id;
    if q.type='essay' then points:=null;else
     ids:=coalesce(array(select value::uuid from jsonb_array_elements_text(r->'optionIds')),'{}');select correct_ids into keys from private.homework_keys where question_id=q.id;
     if cardinality(keys)=0 then raise exception 'Published key is invalid' using errcode='23514';end if;
     points:=case when cardinality(ids)=cardinality(keys) and ids@>keys and keys@>ids then q.points else 0 end;
    end if;
    insert into private.homework_marks(submission_id,question_id,points) values(s.id,q.id,points);
   end loop;
   insert into private.homework_corrections(submission_id,status,score) values(s.id,case when a.mode='PLATFORM_QUESTIONS' and not exists(select 1 from private.homework_marks where submission_id=s.id and points is null) then 'corrected' else 'under_correction' end,
    case when a.mode='PLATFORM_QUESTIONS' and not exists(select 1 from private.homework_marks where submission_id=s.id and points is null) then (select sum(m.points) from private.homework_marks m where m.submission_id=s.id) end);
   update public.homework_submissions set status='submitted',submitted_at=clock_timestamp() where id=s.id;
   insert into private.homework_audit(assignment_id,submission_id,actor,action) values(a.id,s.id,u,'submitted');
  end if;
  if not private.homework_enrolled(a.id) then raise exception 'Enrollment expired during work' using errcode='42501';end if;
  update public.homework_submissions set revision=revision+1,updated_at=clock_timestamp() where id=s.id;
  return private.homework_submission_json(s.id);
 end if;
 if p_action not in ('grade','release','annotate') or not private.homework_staff(a.id,case when p_action='release' then 'release' else 'grade' end) or s.status<>'submitted' then raise exception 'Correction denied' using errcode='42501';end if;
 select * into c from private.homework_corrections where submission_id=s.id for update;
 if p_revision is null or c.revision<>p_revision then raise exception 'Correction changed; reload' using errcode='PT409';end if;
 if c.released_at is not null and length(trim(coalesce(p_data->>'reason','')))<3 then raise exception 'Released correction requires an audit reason' using errcode='23514';end if;
 previous:=to_jsonb(c)||jsonb_build_object('marks',(select jsonb_agg(to_jsonb(m)) from private.homework_marks m where m.submission_id=s.id),'annotations',(select jsonb_agg(to_jsonb(n)) from private.homework_annotations n where n.submission_id=s.id));
 if p_action='grade' then
  if a.mode='FILE_UPLOAD' then total:=(p_data->>'score')::numeric;if a.uses_marks and (total is null or total<0 or total>a.file_points) then raise exception 'Invalid file marks' using errcode='23514';end if;
  else
   if jsonb_typeof(p_data->'marks')<>'array' or jsonb_array_length(p_data->'marks')>100 or (select count(distinct value->>'questionId') from jsonb_array_elements(p_data->'marks'))<>jsonb_array_length(p_data->'marks') then raise exception 'Invalid mark set' using errcode='23514';end if;
   for r in select value from jsonb_array_elements(p_data->'marks') loop
    select * into q from public.homework_questions where id=(r->>'questionId')::uuid and assignment_id=a.id and type='essay';points:=(r->>'points')::numeric;
    if q.id is null or points is null or points<0 or points>q.points then raise exception 'Invalid written marks' using errcode='23514';end if;
    update private.homework_marks set points=(r->>'points')::numeric,feedback=coalesce(r->>'feedback','') where submission_id=s.id and question_id=q.id;
   end loop;
   total:=case when not exists(select 1 from private.homework_marks where submission_id=s.id and points is null) then (select sum(m.points) from private.homework_marks m where m.submission_id=s.id) end;
  end if;
  update private.homework_corrections set score=total,feedback=coalesce(p_data->>'feedback',''),status=case when total is null and a.uses_marks then 'under_correction' else 'corrected' end,corrected_by=u,corrected_at=clock_timestamp() where submission_id=s.id;
 elsif p_action='annotate' then
  asset:=(p_data->>'fileId')::uuid;if not exists(select 1 from public.homework_submission_files where submission_id=s.id and upload_id=asset) then raise exception 'Annotation file is not this submission' using errcode='42501';end if;
  if not exists(select 1 from private.homework_uploads where id=asset and (p_data->>'page')::int between 1 and pages) then raise exception 'Annotation page does not exist' using errcode='23514';end if;
  if p_data->>'id' is not null then
   select * into annotation from private.homework_annotations where id=(p_data->>'id')::uuid and submission_id=s.id for update;
   if annotation.id is null or annotation.revision<>(p_data->>'annotationRevision')::bigint then raise exception 'Annotation changed' using errcode='PT409';end if;
   insert into private.homework_audit(assignment_id,submission_id,actor,action,reason,before_value) values(a.id,s.id,u,'annotation_previous',coalesce(p_data->>'reason',''),to_jsonb(annotation));
   update private.homework_annotations set page=(p_data->>'page')::int,x=(p_data->>'x')::numeric,y=(p_data->>'y')::numeric,width=(p_data->>'width')::numeric,height=(p_data->>'height')::numeric,note=p_data->>'note',revision=revision+1,author=u,updated_at=clock_timestamp() where id=annotation.id;
  else
   insert into private.homework_annotations(submission_id,upload_id,page,x,y,width,height,note,author) values(s.id,asset,(p_data->>'page')::int,(p_data->>'x')::numeric,(p_data->>'y')::numeric,(p_data->>'width')::numeric,(p_data->>'height')::numeric,p_data->>'note',u);
  end if;
 else
  if p_data->>'status' not in ('corrected','approved','resubmit_required') or (p_data->>'status'<>'resubmit_required' and ((a.uses_marks and c.score is null) or exists(select 1 from private.homework_marks where submission_id=s.id and points is null))) then raise exception 'Finish correction before release' using errcode='23514';end if;
  update private.homework_corrections set status=p_data->>'status',released_at=clock_timestamp(),released_by=u where submission_id=s.id;
 end if;
 -- Editing an already released correction withdraws it until authorized re-release.
 update private.homework_corrections set revision=revision+1,released_at=case when p_action='release' then released_at end,released_by=case when p_action='release' then released_by end where submission_id=s.id returning * into c;
 insert into private.homework_audit(assignment_id,submission_id,actor,action,reason,before_value,after_value) values(a.id,s.id,u,p_action,coalesce(p_data->>'reason',''),previous,to_jsonb(c)||jsonb_build_object('marks',(select jsonb_agg(to_jsonb(m)) from private.homework_marks m where m.submission_id=s.id),'annotations',(select jsonb_agg(to_jsonb(n)) from private.homework_annotations n where n.submission_id=s.id)));
 return private.homework_submission_json(s.id);
end $$;
revoke all on function private.homework_work(uuid,text,uuid,bigint,jsonb) from public,anon;
grant execute on function private.homework_work(uuid,text,uuid,bigint,jsonb) to authenticated;
create function public.homework_work(p_assignment uuid,p_action text,p_submission uuid default null,p_revision bigint default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.homework_work(p_assignment,p_action,p_submission,p_revision,p_data)$$;
revoke all on function public.homework_work(uuid,text,uuid,bigint,jsonb) from public,anon;
grant execute on function public.homework_work(uuid,text,uuid,bigint,jsonb) to authenticated;

create function private.get_homework(p_assignment uuid,p_submission uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.homework_assignments;staff boolean;unlocked boolean;solution private.homework_solutions;result jsonb;
begin
 select * into a from public.homework_assignments where id=p_assignment;
 if a.id is null or not private.homework_visible(a.id) then raise exception 'Homework unavailable' using errcode='42501';end if;
 staff:=private.homework_staff(a.id);unlocked:=private.homework_unlocked(a.id);if unlocked then select * into solution from private.homework_solutions where assignment_id=a.id;end if;
 result:=jsonb_build_object('id',a.id,'offeringId',a.offering_id,'lessonId',a.lesson_id,'segmentId',a.segment_id,'revision',a.revision,'version',a.version,'locked',exists(select 1 from public.homework_submissions where assignment_id=a.id),'staff',staff,'canGrade',private.homework_staff(a.id,'grade'),'canRelease',private.homework_staff(a.id,'release'),
 'mediaCopyPending',staff and exists(select 1 from private.homework_clone_sources c join private.homework_uploads target on target.id=c.upload_id where target.assignment_id=a.id),
 'definition',jsonb_build_object('title',a.title,'instructions',a.instructions,'mode',a.mode,'published',a.status='published','usesMarks',a.uses_marks,'filePoints',a.file_points,
 'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'type',q.type,'text',q.text,'imageId',q.image_id,'points',q.points,'responseMode',q.response_mode,
 'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'text',o.text) order by o.position) from public.homework_options o where o.question_id=q.id),'[]'::jsonb),
 'correctIds',case when staff then to_jsonb(k.correct_ids) else '[]'::jsonb end,'modelAnswer',case when staff then k.model_answer else '' end) order by q.position) from public.homework_questions q join private.homework_keys k on k.question_id=q.id where q.assignment_id=a.id),'[]'::jsonb),
 'modelAnswer',case when staff then solution.text else '' end,'solutionVideo',case when staff then coalesce(solution.video_url,'') else '' end,'solutionVideoId',case when staff then solution.video_id end,
 'referenceIds',coalesce((select jsonb_agg(m.upload_id) from private.homework_materials m where m.assignment_id=a.id and m.purpose='reference'),'[]'::jsonb),
 'solutionIds',case when staff then coalesce((select jsonb_agg(m.upload_id) from private.homework_materials m where m.assignment_id=a.id and m.purpose='solution'),'[]'::jsonb) else '[]'::jsonb end),
 'references',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'mime',u.mime)) from private.homework_materials m join private.homework_uploads u on u.id=m.upload_id where m.assignment_id=a.id and m.purpose='reference'),'[]'::jsonb),
 'submissions',case when p_submission is not null then jsonb_build_array(private.homework_submission_json(p_submission)) else coalesce((select jsonb_agg(private.homework_submission_json(s.id) order by s.number desc) from (select * from public.homework_submissions where assignment_id=a.id and user_id=(select private.current_app_user_id()) order by number desc limit 50) s),'[]'::jsonb) end,
 'historyHasMore',(select count(*)>50 from public.homework_submissions where assignment_id=a.id and user_id=(select private.current_app_user_id())),
 'solutions',case when unlocked then jsonb_build_object('text',coalesce(solution.text,''),'video',coalesce(solution.video_url,''),'videoId',solution.video_id,
 'files',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'mime',u.mime)) from private.homework_materials m join private.homework_uploads u on u.id=m.upload_id where m.assignment_id=a.id and m.purpose='solution'),'[]'::jsonb),
 'keys',coalesce((select jsonb_agg(jsonb_build_object('questionId',q.id,'correctIds',k.correct_ids,'modelAnswer',k.model_answer) order by q.position) from public.homework_questions q join private.homework_keys k on k.question_id=q.id where q.assignment_id=a.id),'[]'::jsonb)) end);
 if p_submission is not null and not exists(select 1 from public.homework_submissions where id=p_submission and assignment_id=a.id) then raise exception 'Submission assignment mismatch' using errcode='42501';end if;
 return result;
end $$;
revoke all on function private.get_homework(uuid,uuid) from public,anon;
grant execute on function private.get_homework(uuid,uuid) to authenticated;
create function public.get_homework(p_assignment uuid,p_submission uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.get_homework(p_assignment,p_submission)$$;
revoke all on function public.get_homework(uuid,uuid) from public,anon;
grant execute on function public.get_homework(uuid,uuid) to authenticated;

create function private.homework_inbox(p_offering uuid,p_assignment uuid default null,p_search text default '',p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.can_support_offering(p_offering) then raise exception 'Inbox denied' using errcode='42501';end if;
 if p_page not between 0 and 100000 or length(p_search)>200 then raise exception 'Invalid pagination/search' using errcode='23514';end if;
 select jsonb_build_object('page',p_page,'pageSize',25,'total',count(*),'rows',coalesce((select jsonb_agg(v.row order by v.created_at desc,v.id) from
 (select s.id,s.created_at,jsonb_build_object('submission',private.homework_submission_json(s.id),'assignmentId',a.id,'title',a.title,'userId',s.user_id,'studentName',p.display_name,'files',(select count(*) from public.homework_submission_files f where f.submission_id=s.id),'answers',(select count(*) from public.homework_responses r where r.submission_id=s.id)) row
 from public.homework_submissions s join public.homework_assignments a on a.id=s.assignment_id join public.profiles p on p.id=s.user_id where a.offering_id=p_offering and s.status='submitted' and (p_assignment is null or a.id=p_assignment) and (p_search='' or p.display_name ilike '%'||p_search||'%' or s.user_id::text=p_search) order by s.created_at desc,s.id limit 25 offset p_page*25) v),'[]'::jsonb)) into result
 from public.homework_submissions s join public.homework_assignments a on a.id=s.assignment_id join public.profiles p on p.id=s.user_id where a.offering_id=p_offering and s.status='submitted' and (p_assignment is null or a.id=p_assignment) and (p_search='' or p.display_name ilike '%'||p_search||'%' or s.user_id::text=p_search);
 return result;
end $$;
revoke all on function private.homework_inbox(uuid,uuid,text,integer) from public,anon;
grant execute on function private.homework_inbox(uuid,uuid,text,integer) to authenticated;
create function public.homework_inbox(p_offering uuid,p_assignment uuid default null,p_search text default '',p_page integer default 0) returns jsonb language sql security invoker set search_path='' as $$select private.homework_inbox(p_offering,p_assignment,p_search,p_page)$$;
revoke all on function public.homework_inbox(uuid,uuid,text,integer) from public,anon;
grant execute on function public.homework_inbox(uuid,uuid,text,integer) to authenticated;

create function private.homework_lifecycle(p_assignment uuid,p_action text,p_revision bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.homework_assignments;cloned_id uuid;q public.homework_questions;opt public.homework_options;qid uuid;oid uuid;ids uuid[];k private.homework_keys;source_upload private.homework_uploads;copied_id uuid;next_version integer;
begin
 select * into a from public.homework_assignments where id=p_assignment for update;
 if a.id is null or not private.homework_staff(a.id,'author') then raise exception 'Authoring denied' using errcode='42501';end if;
 if p_revision is null or a.revision<>p_revision then raise exception 'Homework changed' using errcode='PT409';end if;
 if p_action='unpublish' then update public.homework_assignments set status='draft',revision=revision+1,updated_at=clock_timestamp() where id=a.id;return a.id;
 elsif p_action='publish' then
  if a.mode='PLATFORM_QUESTIONS' and (not exists(select 1 from public.homework_questions where assignment_id=a.id) or exists(select 1 from public.homework_questions question_row join private.homework_keys key_row on key_row.question_id=question_row.id where question_row.assignment_id=a.id and question_row.type<>'essay' and cardinality(key_row.correct_ids)=0)) then raise exception 'Complete question keys' using errcode='23514';end if;
  if exists(select 1 from private.homework_materials m join private.homework_uploads asset on asset.id=m.upload_id where m.assignment_id=a.id and asset.status<>'ready') or exists(select 1 from private.homework_solutions solution join private.homework_uploads asset on asset.id=solution.video_id where solution.assignment_id=a.id and asset.status<>'ready') then raise exception 'Finish cloned media before publishing' using errcode='23514';end if;
  update public.homework_assignments set status='published',revision=revision+1,updated_at=clock_timestamp() where id=a.id;return a.id;
 elsif p_action<>'clone' then raise exception 'Unknown lifecycle action' using errcode='23514';end if;
 if exists(select 1 from private.homework_clone_sources copy join private.homework_uploads target on target.id=copy.upload_id where target.assignment_id=a.id) then raise exception 'Finish this version media before cloning again' using errcode='23514';end if;
 perform pg_advisory_xact_lock(hashtextextended(a.family_id::text||'homework-version',0));
 select coalesce(max(version),0)+1 into next_version from public.homework_assignments where family_id=a.family_id;
 cloned_id:=gen_random_uuid();insert into public.homework_assignments(id,family_id,course_id,offering_id,lesson_id,segment_id,title,instructions,mode,status,uses_marks,file_points,version,supersedes_id,created_by)
 values(cloned_id,a.family_id,a.course_id,a.offering_id,a.lesson_id,a.segment_id,a.title,a.instructions,a.mode,'draft',a.uses_marks,a.file_points,next_version,a.id,(select private.current_app_user_id()));
 for q in select * from public.homework_questions where assignment_id=a.id order by position loop
  qid:=gen_random_uuid();insert into public.homework_questions values(qid,cloned_id,q.position,q.type,q.text,q.image_id,q.points,q.response_mode);
  select * into k from private.homework_keys where question_id=q.id;ids:='{}';
  for opt in select * from public.homework_options where question_id=q.id order by position loop
   oid:=gen_random_uuid();insert into public.homework_options values(oid,qid,opt.position,opt.text);if opt.id=any(k.correct_ids) then ids:=array_append(ids,oid);end if;
  end loop;insert into private.homework_keys values(qid,ids,k.model_answer);
 end loop;
 -- Solution objects receive new private paths per version: a prior submission
 -- cannot authorize signing the new version's files via the Storage API.
 for source_upload in select asset.* from private.homework_uploads asset where asset.id in
 (select m.upload_id from private.homework_materials m where m.assignment_id=a.id and m.purpose='solution'
 union select solution.video_id from private.homework_solutions solution where solution.assignment_id=a.id and solution.video_id is not null) loop
  if source_upload.status<>'ready' then raise exception 'Finish original solution uploads before cloning' using errcode='23514';end if;
  copied_id:=gen_random_uuid();insert into private.homework_uploads(id,assignment_id,uploaded_by,purpose,name,mime,path)
  values(copied_id,cloned_id,(select private.current_app_user_id()),'solution',source_upload.name,source_upload.mime,cloned_id::text||'/'||copied_id::text||'/'||split_part(source_upload.path,'/',3));
  insert into private.homework_clone_sources(upload_id,source_id) values(copied_id,source_upload.id);
 end loop;
 insert into private.homework_solutions select cloned_id,solution.text,solution.video_url,(select copy.upload_id from private.homework_clone_sources copy join private.homework_uploads target on target.id=copy.upload_id where copy.source_id=solution.video_id and target.assignment_id=cloned_id) from private.homework_solutions solution where solution.assignment_id=a.id;
 insert into private.homework_materials(assignment_id,upload_id,purpose) select cloned_id,case when m.purpose='reference' then m.upload_id else (select copy.upload_id from private.homework_clone_sources copy join private.homework_uploads target on target.id=copy.upload_id where copy.source_id=m.upload_id and target.assignment_id=cloned_id) end,m.purpose from private.homework_materials m where m.assignment_id=a.id;
 insert into private.homework_audit(assignment_id,actor,action,before_value) values(cloned_id,(select private.current_app_user_id()),'cloned',to_jsonb(a));return cloned_id;
end $$;
revoke all on function private.homework_lifecycle(uuid,text,bigint) from public,anon;
grant execute on function private.homework_lifecycle(uuid,text,bigint) to authenticated;
create function public.homework_lifecycle(p_assignment uuid,p_action text,p_revision bigint) returns uuid language sql security invoker set search_path='' as $$select private.homework_lifecycle(p_assignment,p_action,p_revision)$$;
revoke all on function public.homework_lifecycle(uuid,text,bigint) from public,anon;
grant execute on function public.homework_lifecycle(uuid,text,bigint) to authenticated;

-- Byte verification is performed server-side. Completion additionally requires a
-- short-lived, Firebase Admin-signed, exact-upload attestation, never a browser flag.
create function private.homework_upload(p_assignment uuid,p_action text,p_id uuid default null,p_submission uuid default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.homework_assignments;f private.homework_uploads;u uuid:=(select private.current_app_user_id());purpose text;mime text;ext text;size bigint;owner text;actual_mime text;proof jsonb;
begin
 select * into a from public.homework_assignments where id=p_assignment for share;
 if a.id is null or u is null or not private.is_active_user() then raise exception 'Upload denied' using errcode='42501';end if;
 if p_action='intent' then
  purpose:=p_data->>'purpose';mime:=p_data->>'mime';
  if purpose not in ('question','reference','solution','submission') or mime not in ('application/pdf','image/png','image/jpeg','image/webp','video/mp4') or (mime='video/mp4' and purpose<>'solution') or (purpose='question' and mime not in ('image/png','image/jpeg','image/webp')) then raise exception 'Unsupported upload type' using errcode='23514';end if;
  if purpose='submission' then
   perform 1 from public.enrollments e where e.offering_id=a.offering_id and e.user_id=u for share;
   perform 1 from public.homework_submissions s where s.id=p_submission and s.assignment_id=a.id and s.user_id=u and s.status='draft' for share;
   if not private.homework_enrolled(a.id) or not exists(select 1 from public.homework_submissions s where s.id=p_submission and s.assignment_id=a.id and s.user_id=u and s.status='draft') then raise exception 'Submission upload denied' using errcode='42501';end if;
  elsif not private.homework_staff(a.id,'author') or exists(select 1 from public.homework_submissions where assignment_id=a.id) then raise exception 'Author upload denied; clone started work' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(a.id::text||u::text||'uploads',0));
  if (select count(*) from private.homework_uploads where assignment_id=a.id and uploaded_by=u and status='pending' and expires_at>now())>=20 then raise exception 'Finish or clean pending uploads first' using errcode='23514';end if;
  ext:=case mime when 'application/pdf' then 'pdf' when 'image/png' then 'png' when 'image/jpeg' then 'jpg' when 'image/webp' then 'webp' else 'mp4' end;p_id:=gen_random_uuid();
  insert into private.homework_uploads(id,assignment_id,uploaded_by,submission_id,purpose,name,mime,path) values(p_id,a.id,u,case when purpose='submission' then p_submission end,purpose,p_data->>'name',mime,a.id::text||'/'||p_id::text||'/resource.'||ext) returning * into f;
 elsif p_action='clone-tasks' then
  if not private.homework_staff(a.id,'author') or exists(select 1 from private.homework_clone_sources copy join private.homework_uploads target on target.id=copy.upload_id where target.assignment_id=a.id and target.uploaded_by<>u) then raise exception 'Only the authorized clone creator can finish its copied media' using errcode='42501';end if;
  -- Retrying an owned, unfinished clone renews only its pending copy intents.
  update private.homework_uploads target set expires_at=clock_timestamp()+interval '30 minutes' where target.assignment_id=a.id and target.status='pending' and exists(select 1 from private.homework_clone_sources copy where copy.upload_id=target.id);
  return coalesce((select jsonb_agg(jsonb_build_object('id',target.id,'path',target.path,'sourcePath',source.path,'mime',target.mime)) from private.homework_clone_sources copy join private.homework_uploads target on target.id=copy.upload_id join private.homework_uploads source on source.id=copy.source_id where target.assignment_id=a.id and target.status='pending'),'[]'::jsonb);
 else
  select * into f from private.homework_uploads where id=p_id for update;
  if f.id is null or (f.assignment_id<>a.id and (p_action<>'get' or not exists(select 1 from public.homework_assignments source where source.id=f.assignment_id and source.family_id=a.family_id and source.course_id=a.course_id and source.offering_id=a.offering_id))) then raise exception 'Wrong upload' using errcode='42501';end if;
  if p_action='get' then
   if f.status<>'ready' or not private.homework_upload_visible(f.id) then raise exception 'File locked or unavailable' using errcode='42501';end if;
   if not private.homework_staff(a.id) and not (
    (f.purpose='submission' and f.assignment_id=a.id and f.uploaded_by=u and private.homework_enrolled(a.id)) or
    (f.purpose='question' and private.homework_enrolled(a.id) and exists(select 1 from public.homework_questions where assignment_id=a.id and image_id=f.id)) or
    (f.purpose='reference' and private.homework_enrolled(a.id) and exists(select 1 from private.homework_materials m where m.assignment_id=a.id and m.upload_id=f.id and m.purpose='reference')) or
    (f.purpose='solution' and private.homework_unlocked(a.id) and (exists(select 1 from private.homework_materials m where m.assignment_id=a.id and m.upload_id=f.id and m.purpose='solution') or exists(select 1 from private.homework_solutions where assignment_id=a.id and video_id=f.id)))) then raise exception 'File is not available through this assignment' using errcode='42501';end if;
  elsif p_action='pending' then
   if f.uploaded_by<>u or not private.homework_storage('lms-homework',f.path,'read') then raise exception 'Pending file unavailable' using errcode='42501';end if;
  elsif p_action='archive' then
   if f.uploaded_by<>u or private.homework_upload_referenced(f.id) then raise exception 'Referenced or foreign upload cannot be cleaned' using errcode='42501';end if;
   update private.homework_uploads set status='archived' where id=f.id returning * into f;
   delete from private.homework_clone_sources where upload_id=f.id;
  elsif p_action='complete' then
   proof:=auth.jwt()->'hw_upload';
   if f.uploaded_by<>u or proof->>'id' is distinct from f.id::text or coalesce((auth.jwt()->>'iat')::bigint,0)<extract(epoch from now())-90 or (proof->>'sha256') is null or proof->>'sha256' !~ '^[a-f0-9]{64}$' then raise exception 'Server byte-verification attestation required' using errcode='42501';end if;
   if f.status='ready' then return jsonb_build_object('id',f.id,'path',f.path,'name',f.name,'mime',f.mime);end if;
   if not private.homework_storage('lms-homework',f.path,'insert') then raise exception 'Upload authorization expired' using errcode='42501';end if;
   select o.owner_id,(o.metadata->>'size')::bigint,o.metadata->>'mimetype' into owner,size,actual_mime from storage.objects o where o.bucket_id='lms-homework' and o.name=f.path;
   if owner is distinct from auth.jwt()->>'sub' or size is null or size<=0 or size<>(proof->>'size')::bigint or actual_mime<>f.mime or size>(case when f.mime='video/mp4' then 50000000 when f.mime='application/pdf' then 20971520 else 5242880 end) then raise exception 'Invalid stored file metadata' using errcode='23514';end if;
   if f.mime<>'video/mp4' and ((proof->>'pages') is null or (proof->>'pages')::int not between 1 and 1000) then raise exception 'Verified page count missing' using errcode='23514';end if;
   update private.homework_uploads set status='ready',size_bytes=size,sha256=proof->>'sha256',pages=(proof->>'pages')::int where id=f.id returning * into f;
   delete from private.homework_clone_sources where upload_id=f.id;
  else raise exception 'Unknown upload action' using errcode='23514';end if;
 end if;
 return jsonb_build_object('id',f.id,'path',f.path,'name',f.name,'mime',f.mime,'status',f.status);
end $$;
revoke all on function private.homework_upload(uuid,text,uuid,uuid,jsonb) from public,anon;
grant execute on function private.homework_upload(uuid,text,uuid,uuid,jsonb) to authenticated;
create function public.homework_upload(p_assignment uuid,p_action text,p_id uuid default null,p_submission uuid default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.homework_upload(p_assignment,p_action,p_id,p_submission,p_data)$$;
revoke all on function public.homework_upload(uuid,text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.homework_upload(uuid,text,uuid,uuid,jsonb) to authenticated;

create function private.homework_history(p_submission uuid,p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.homework_submissions;staff boolean;result jsonb;
begin
 select * into s from public.homework_submissions where id=p_submission;
 if s.id is null or not private.homework_submission_visible(s.id) then raise exception 'History unavailable' using errcode='42501';end if;
 staff:=private.homework_staff(s.assignment_id,'grade');if p_page not between 0 and 100000 then raise exception 'Invalid page' using errcode='23514';end if;
 select jsonb_build_object('page',p_page,'total',count(*),'rows',coalesce((select jsonb_agg(v.row order by v.created_at desc,v.id) from
 (select h.id,h.created_at,jsonb_build_object('id',h.id,'action',h.action,'reason',h.reason,'actor',h.actor,'createdAt',h.created_at,
 'score',case when a.uses_marks then h.after_value->'score' end,'feedback',h.after_value->>'feedback','status',h.after_value->>'status',
 'annotations',coalesce((select jsonb_agg(jsonb_build_object('id',n->>'id','fileId',n->>'upload_id','page',n->'page','x',n->'x','y',n->'y','width',n->'width','height',n->'height','note',n->>'note','revision',n->'revision','author',n->>'author','updatedAt',n->>'updated_at')) from jsonb_array_elements(coalesce(nullif(h.after_value->'annotations','null'::jsonb),'[]'::jsonb)) n),'[]'::jsonb)) row
 from private.homework_audit h join public.homework_assignments a on a.id=h.assignment_id where h.submission_id=s.id and (h.action='release' or staff and h.action in ('grade','annotate')) order by h.created_at desc,h.id limit 25 offset p_page*25) v),'[]'::jsonb)) into result from private.homework_audit h where h.submission_id=s.id and (h.action='release' or staff and h.action in ('grade','annotate'));
 return result;
end $$;
revoke all on function private.homework_history(uuid,integer) from public,anon;
grant execute on function private.homework_history(uuid,integer) to authenticated;
create function public.homework_history(p_submission uuid,p_page integer default 0) returns jsonb language sql security invoker set search_path='' as $$select private.homework_history(p_submission,p_page)$$;
revoke all on function public.homework_history(uuid,integer) from public,anon;
grant execute on function public.homework_history(uuid,integer) to authenticated;

create view private.expired_homework_uploads with (security_invoker=true) as
 select id,assignment_id,uploaded_by,path,status,expires_at from private.homework_uploads u
 where ((u.status='pending' and u.expires_at<now()) or u.status='archived') and not private.homework_upload_referenced(u.id);
revoke all on private.expired_homework_uploads from public,anon,authenticated;

-- Own immutable submission revisions, including histories longer than the initial view.
create function private.homework_revisions(p_assignment uuid,p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.homework_enrolled(p_assignment) then raise exception 'Homework history unavailable' using errcode='42501';end if;
 if p_page not between 0 and 100000 then raise exception 'Invalid page' using errcode='23514';end if;
 select jsonb_build_object('rows',coalesce((select jsonb_agg(private.homework_submission_json(s.id) order by s.number desc) from (select id,number from public.homework_submissions where assignment_id=p_assignment and user_id=(select private.current_app_user_id()) and status='submitted' order by number desc limit 25 offset p_page*25) s),'[]'::jsonb),'total',(select count(*) from public.homework_submissions where assignment_id=p_assignment and user_id=(select private.current_app_user_id()) and status='submitted'),'page',p_page) into result;
 return result;
end $$;
revoke all on function private.homework_revisions(uuid,integer) from public,anon;
grant execute on function private.homework_revisions(uuid,integer) to authenticated;
create function public.homework_revisions(p_assignment uuid,p_page integer default 0) returns jsonb language sql security invoker set search_path='' as $$select private.homework_revisions(p_assignment,p_page)$$;
revoke all on function public.homework_revisions(uuid,integer) from public,anon;
grant execute on function public.homework_revisions(uuid,integer) to authenticated;
