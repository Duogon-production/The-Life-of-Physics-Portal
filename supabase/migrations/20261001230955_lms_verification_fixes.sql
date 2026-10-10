-- Verification found heterogeneous trigger record fields require JSON access.
-- Cross-table invariants apply even to trusted backend writes.
create or replace function private.check_lms_integrity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare course uuid; org uuid; other_course uuid; linked_org uuid; row_data jsonb;
begin
 row_data:=to_jsonb(new);
 if tg_table_name='course_staff' then
   select c.organization_id into org from public.courses c where c.id=(row_data->>'course_id')::uuid;
   if not exists(select 1 from public.organization_memberships m where m.organization_id=org and m.user_id=(row_data->>'user_id')::uuid and m.status='active'
     and ((row_data->>'role')::text in ('assistant','editor') or m.role in ('owner','admin','teacher'))) then
     raise exception 'Course staff must be active staff of its organization' using errcode='23514';
   end if;
 elsif tg_table_name='offering_staff' then
   select c.organization_id into org from public.course_offerings o join public.courses c on c.id=o.course_id where o.id=(row_data->>'offering_id')::uuid;
   if not exists(select 1 from public.organization_memberships m where m.organization_id=org and m.user_id=(row_data->>'user_id')::uuid and m.status='active'
     and ((row_data->>'role')::text='teaching_assistant' or m.role in ('owner','admin','teacher'))) then
     raise exception 'Offering staff must be active staff of its organization' using errcode='23514';
   end if;
 elsif tg_table_name='course_offerings' then
   if not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=(row_data->>'timezone')::text) then raise exception 'Unknown timezone' using errcode='23514'; end if;
 elsif tg_table_name='offering_assessments' then
   select o.course_id into course from public.course_offerings o where o.id=(row_data->>'offering_id')::uuid;
   select a.course_id into other_course from public.assessments a where a.id=(row_data->>'assessment_id')::uuid;
   if course is distinct from other_course then raise exception 'Assessment and offering belong to different courses' using errcode='23514'; end if;
 elsif tg_table_name='lesson_progress' then
   select o.course_id into course from public.course_offerings o where o.id=(row_data->>'offering_id')::uuid;
   select m.course_id into other_course from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=(row_data->>'lesson_id')::uuid;
   if course is distinct from other_course then raise exception 'Lesson is outside the enrolled offering course' using errcode='23514'; end if;
 elsif tg_table_name='lesson_blocks' and (row_data->>'media_asset_id')::uuid is not null then
   select c.organization_id into org from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=(row_data->>'lesson_id')::uuid;
   select a.organization_id into linked_org from public.media_assets a where a.id=(row_data->>'media_asset_id')::uuid and a.bucket='lms-course-media';
   if org is distinct from linked_org then raise exception 'Lesson media must belong to its organization' using errcode='23514'; end if;
 elsif tg_table_name='media_assets' and (row_data->>'offering_id')::uuid is not null then
   select c.organization_id into org from public.course_offerings o join public.courses c on c.id=o.course_id where o.id=(row_data->>'offering_id')::uuid;
   if org is distinct from (row_data->>'organization_id')::uuid then raise exception 'Submission media has a different organization' using errcode='23514'; end if;
 elsif tg_table_name='assessment_responses' then
   select oa.assessment_id, oa.offering_id into course, org from public.assessment_attempts a join public.offering_assessments oa on oa.id=a.offering_assessment_id where a.id=(row_data->>'attempt_id')::uuid;
   select q.assessment_id into other_course from public.assessment_questions q where q.id=(row_data->>'question_id')::uuid;
   if course is distinct from other_course then raise exception 'Question is outside the attempt assessment' using errcode='23514'; end if;
   if (row_data->>'media_asset_id')::uuid is not null and not exists(select 1 from public.media_assets m join public.assessment_attempts a on a.id=(row_data->>'attempt_id')::uuid where m.id=(row_data->>'media_asset_id')::uuid and m.offering_id=org and m.uploaded_by=a.user_id and m.kind='submission') then
     raise exception 'Response file must belong to this student and offering' using errcode='23514';
   end if;
   if (row_data->>'awarded_points')::numeric>(select q.points from public.assessment_questions q where q.id=(row_data->>'question_id')::uuid) then raise exception 'Awarded points exceed question points' using errcode='23514'; end if;
 end if;
 return new;
end $$;

create index lesson_progress_offering_id_user_id_idx on public.lesson_progress(offering_id,user_id);
