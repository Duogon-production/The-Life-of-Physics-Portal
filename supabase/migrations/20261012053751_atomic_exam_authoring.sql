-- LOCAL ONLY pending separate development application approval.
-- One transaction per complete V2 authoring save; existing attempt history stays immutable.
create function private.save_exam_definition(p_offering_id uuid,p_schedule_id uuid,p_expected_updated_at timestamptz,p_definition jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.course_offerings; a public.assessments; s public.offering_assessments;
 q jsonb; c jsonb; qid uuid; aid uuid; sid uuid; pos integer:=0; choice_pos integer; correct integer; duration integer; maximum integer;
begin
 select * into o from public.course_offerings where id=p_offering_id for share;
 if o.id is null or not private.can_manage_offering(o.id) or not private.can_edit_course(o.course_id) then raise exception 'Exam authoring unavailable' using errcode='42501'; end if;
 perform 1 from public.courses where id=o.course_id for share;
 if jsonb_typeof(p_definition) is distinct from 'object' or p_definition-array['title','description','durationMinutes','maxAttempts','isPublished','questions']<>'{}'::jsonb
 or jsonb_typeof(p_definition->'title') is distinct from 'string' or length(btrim(p_definition->>'title')) not between 1 and 200
 or (p_definition->'description'<>'null'::jsonb and (jsonb_typeof(p_definition->'description') is distinct from 'string' or length(p_definition->>'description')>8000))
 or jsonb_typeof(p_definition->'isPublished') is distinct from 'boolean'
 or jsonb_typeof(p_definition->'questions') is distinct from 'array' then raise exception 'Invalid exam definition' using errcode='23514'; end if;
 if jsonb_array_length(p_definition->'questions') not between 1 and 100 then raise exception 'Invalid question count' using errcode='23514'; end if;
 if p_definition->'maxAttempts' not in ('1'::jsonb,'2'::jsonb) then raise exception 'Invalid attempt limit' using errcode='23514'; end if;
 maximum:=(p_definition->>'maxAttempts')::integer;
 if p_definition->'durationMinutes'<>'null'::jsonb then
  if jsonb_typeof(p_definition->'durationMinutes') is distinct from 'number' or (p_definition->>'durationMinutes')::numeric<>trunc((p_definition->>'durationMinutes')::numeric) or (p_definition->>'durationMinutes')::numeric not between 1 and 1440 then raise exception 'Invalid duration' using errcode='23514'; end if;
  duration:=(p_definition->>'durationMinutes')::integer*60;
 end if;
 if p_schedule_id is not null then
  select x.* into a from public.assessments x join public.offering_assessments y on y.assessment_id=x.id where y.id=p_schedule_id for update of x;
  select * into s from public.offering_assessments where id=p_schedule_id for update;
  if s.id is null or s.offering_id<>o.id or a.course_id<>o.course_id or a.type not in ('exam','quiz') then raise exception 'Exam authoring unavailable' using errcode='42501'; end if;
  if s.updated_at is distinct from p_expected_updated_at then raise exception 'Exam changed. Reload before saving.' using errcode='PT409'; end if;
  if exists(select 1 from public.assessment_attempts t join public.offering_assessments x on x.id=t.offering_assessment_id where x.assessment_id=a.id)
  or (select count(*) from public.offering_assessments where assessment_id=a.id)>1 then raise exception 'Clone a new assessment version before editing a used or shared paper.' using errcode='PT409'; end if;
  aid:=a.id;sid:=s.id;
  update public.assessments set title=btrim(p_definition->>'title'),instructions=p_definition->>'description',status=case when (p_definition->>'isPublished')::boolean then 'published' else 'draft' end where id=aid;
  delete from public.assessment_options where question_id in(select id from public.assessment_questions where assessment_id=aid);
  delete from public.assessment_questions where assessment_id=aid;
  update public.offering_assessments set max_attempts=maximum,time_limit_seconds=duration,published=(p_definition->>'isPublished')::boolean where id=sid;
 else
  if p_expected_updated_at is not null then raise exception 'New exam cannot have a previous revision' using errcode='23514'; end if;
  insert into public.assessments(course_id,title,instructions,type,status,created_by) values(o.course_id,btrim(p_definition->>'title'),p_definition->>'description','exam',case when (p_definition->>'isPublished')::boolean then 'published' else 'draft' end,private.current_app_user_id()) returning id into aid;
  insert into public.offering_assessments(offering_id,assessment_id,max_attempts,time_limit_seconds,published) values(o.id,aid,maximum,duration,(p_definition->>'isPublished')::boolean) returning id into sid;
 end if;
 for q in select value from jsonb_array_elements(p_definition->'questions') loop
  if jsonb_typeof(q) is distinct from 'object' or q-array['type','text','imageUrl','choices','correctChoice','points','photoAllowed']<>'{}'::jsonb
  or q->>'type' not in ('MCQ','WRITTEN') or q->>'type' is null or jsonb_typeof(q->'text') is distinct from 'string' or length(btrim(q->>'text')) not between 1 and 8000
  or jsonb_typeof(q->'points') is distinct from 'number' or (q->>'points')::numeric not between 1 and 100 or (q->>'points')::numeric<>trunc((q->>'points')::numeric)
  or (q->'imageUrl'<>'null'::jsonb and (jsonb_typeof(q->'imageUrl') is distinct from 'string' or length(q->>'imageUrl')>2048 or q->>'imageUrl' !~ '^https://[^[:space:]]+$'))
  or (q ? 'photoAllowed' and jsonb_typeof(q->'photoAllowed')<>'boolean') then raise exception 'Invalid question' using errcode='23514'; end if;
  insert into public.assessment_questions(assessment_id,question_type,prompt,points,position,settings) values(aid,case when q->>'type'='MCQ' then 'single_choice' when coalesce((q->>'photoAllowed')::boolean,false) then 'file_upload' else 'essay' end,btrim(q->>'text'),(q->>'points')::numeric,pos,case when q->>'imageUrl' is null then '{}'::jsonb else jsonb_build_object('image_url',q->>'imageUrl') end) returning id into qid;
  if q->>'type'='MCQ' then
   if jsonb_typeof(q->'choices') is distinct from 'array' then raise exception 'Invalid options' using errcode='23514'; end if;
   if jsonb_array_length(q->'choices') not between 2 and 6 or jsonb_typeof(q->'correctChoice') is distinct from 'number' or (q->>'correctChoice')::numeric<>trunc((q->>'correctChoice')::numeric) or (q->>'correctChoice')::numeric not between 0 and jsonb_array_length(q->'choices')-1 then raise exception 'Invalid answer key' using errcode='23514'; end if;
   correct:=(q->>'correctChoice')::integer;choice_pos:=0;
   for c in select value from jsonb_array_elements(q->'choices') loop
    if jsonb_typeof(c)<>'string' or length(btrim(c#>>'{}')) not between 1 and 500 then raise exception 'Invalid option text' using errcode='23514'; end if;
    insert into public.assessment_options(question_id,text,position,is_correct) values(qid,btrim(c#>>'{}'),choice_pos,choice_pos=correct);choice_pos:=choice_pos+1;
   end loop;
  elsif q->'choices' is distinct from 'null'::jsonb or q->'correctChoice' is distinct from 'null'::jsonb then raise exception 'Written question cannot contain a key' using errcode='23514'; end if;
  pos:=pos+1;
 end loop;
 return sid;
end $$;
revoke all on function private.save_exam_definition(uuid,uuid,timestamptz,jsonb) from public,anon;
grant execute on function private.save_exam_definition(uuid,uuid,timestamptz,jsonb) to authenticated;
create function public.save_exam_definition(p_offering_id uuid,p_schedule_id uuid,p_expected_updated_at timestamptz,p_definition jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.save_exam_definition(p_offering_id,p_schedule_id,p_expected_updated_at,p_definition) $$;
revoke all on function public.save_exam_definition(uuid,uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.save_exam_definition(uuid,uuid,timestamptz,jsonb) to authenticated;

create function private.get_exam_definition(p_schedule_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.offering_assessments;a public.assessments;
begin
 select * into s from public.offering_assessments where id=p_schedule_id;
 select * into a from public.assessments where id=s.assessment_id;
 if s.id is null or a.type not in ('exam','quiz') or not private.can_manage_offering(s.offering_id) or not private.can_edit_course(a.course_id) then raise exception 'Exam authoring unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.assessment_questions where assessment_id=a.id and question_type not in('single_choice','essay','file_upload')) then raise exception 'Unsupported builder format; use a dedicated editor' using errcode='PT409'; end if;
 return jsonb_build_object('role','staff','id',s.id,'offeringId',s.offering_id,'updatedAt',s.updated_at,'title',a.title,'description',a.instructions,'durationMinutes',s.time_limit_seconds/60,'maxAttempts',s.max_attempts,'isPublished',s.published,
 'isLocked',exists(select 1 from public.assessment_attempts t join public.offering_assessments x on x.id=t.offering_assessment_id where x.assessment_id=a.id) or (select count(*) from public.offering_assessments where assessment_id=a.id)>1,
 'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'type',case when q.question_type='single_choice' then 'MCQ' else 'WRITTEN' end,'photoAllowed',q.question_type='file_upload','text',q.prompt,'points',q.points,'imageUrl',q.settings->>'image_url',
 'choices',case when q.question_type='single_choice' then(select jsonb_agg(o.text order by o.position) from public.assessment_options o where o.question_id=q.id) end,
 'correctChoice',case when q.question_type='single_choice' then(select o.position from public.assessment_options o where o.question_id=q.id and o.is_correct limit 1) end) order by q.position) from public.assessment_questions q where q.assessment_id=a.id),'[]'::jsonb));
end $$;
revoke all on function private.get_exam_definition(uuid) from public,anon;
grant execute on function private.get_exam_definition(uuid) to authenticated;
create function public.get_exam_definition(p_schedule_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.get_exam_definition(p_schedule_id) $$;
revoke all on function public.get_exam_definition(uuid) from public,anon;
grant execute on function public.get_exam_definition(uuid) to authenticated;

-- Covers the complete composite FK flagged by the development performance advisor.
create index assessment_attempt_participation_scope_idx on public.assessment_attempts(participation_id,offering_assessment_id,user_id);
notify pgrst,'reload schema';
