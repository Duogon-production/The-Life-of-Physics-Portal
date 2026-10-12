-- LOCAL ONLY. Additive continuation after immutable applied migrations 1–19.
-- All-format authoring, atomic grading, audit-preserving correction and bounded staff pagination.
create function private.save_exam_definition_v2(p_offering_id uuid,p_schedule_id uuid,p_expected_updated_at timestamptz,p_definition jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.course_offerings; a public.assessments; s public.offering_assessments;
 q jsonb; c jsonb; qid uuid; aid uuid; sid uuid; pos integer:=0; choice_pos integer; correct integer; duration integer; maximum integer; kind text; selected integer[];
begin
 select * into o from public.course_offerings where id=p_offering_id for share;
 if o.id is null or not private.can_manage_offering(o.id) or not private.can_edit_course(o.course_id) then raise exception 'Exam authoring unavailable' using errcode='42501'; end if;
 perform 1 from public.courses where id=o.course_id for share;
 if jsonb_typeof(p_definition) is distinct from 'object' or p_definition-array['title','description','durationMinutes','maxAttempts','isPublished','questions','kind']<>'{}'::jsonb
 or jsonb_typeof(p_definition->'title') is distinct from 'string' or length(btrim(p_definition->>'title')) not between 1 and 200
 or (p_definition->'description'<>'null'::jsonb and (jsonb_typeof(p_definition->'description') is distinct from 'string' or length(p_definition->>'description')>8000))
 or jsonb_typeof(p_definition->'isPublished') is distinct from 'boolean'
 or jsonb_typeof(p_definition->'questions') is distinct from 'array' then raise exception 'Invalid exam definition' using errcode='23514'; end if;
 if jsonb_array_length(p_definition->'questions') not between 1 and 100 then raise exception 'Invalid question count' using errcode='23514'; end if;
 if not p_definition ?& array['title','description','durationMinutes','maxAttempts','isPublished','questions'] then raise exception 'Missing definition fields' using errcode='23514'; end if;
 if p_definition->'maxAttempts' not in ('1'::jsonb,'2'::jsonb) then raise exception 'Invalid attempt limit' using errcode='23514'; end if;
 if p_definition ? 'kind' and p_definition->>'kind' not in('exam','quiz') then raise exception 'Invalid assessment kind' using errcode='23514'; end if;
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
  update public.assessments set type=coalesce(p_definition->>'kind',a.type),title=btrim(p_definition->>'title'),instructions=p_definition->>'description',status=case when (p_definition->>'isPublished')::boolean then 'published' else 'draft' end where id=aid;
  delete from public.assessment_options where question_id in(select id from public.assessment_questions where assessment_id=aid);
  delete from public.assessment_questions where assessment_id=aid;
  update public.offering_assessments set max_attempts=maximum,time_limit_seconds=duration,published=(p_definition->>'isPublished')::boolean where id=sid;
 else
  if p_expected_updated_at is not null then raise exception 'New exam cannot have a previous revision' using errcode='23514'; end if;
  insert into public.assessments(course_id,title,instructions,type,status,created_by) values(o.course_id,btrim(p_definition->>'title'),p_definition->>'description',coalesce(p_definition->>'kind','exam'),case when (p_definition->>'isPublished')::boolean then 'published' else 'draft' end,private.current_app_user_id()) returning id into aid;
  insert into public.offering_assessments(offering_id,assessment_id,max_attempts,time_limit_seconds,published) values(o.id,aid,maximum,duration,(p_definition->>'isPublished')::boolean) returning id into sid;
 end if;
 for q in select value from jsonb_array_elements(p_definition->'questions') loop
  if jsonb_typeof(q) is distinct from 'object' or q-array['type','text','imageUrl','choices','correctChoice','points','photoAllowed','questionType','correctChoices','numericValue','numericTolerance']<>'{}'::jsonb
  or q->>'type' not in ('MCQ','WRITTEN') or q->>'type' is null or jsonb_typeof(q->'text') is distinct from 'string' or length(btrim(q->>'text')) not between 1 and 8000
  or jsonb_typeof(q->'points') is distinct from 'number' or (q->>'points')::numeric not between 1 and 100 or (q->>'points')::numeric<>trunc((q->>'points')::numeric)
  or (q->'imageUrl'<>'null'::jsonb and (jsonb_typeof(q->'imageUrl') is distinct from 'string' or length(q->>'imageUrl')>2048 or q->>'imageUrl' !~ '^https://[^[:space:]]+$'))
  or (q ? 'photoAllowed' and jsonb_typeof(q->'photoAllowed')<>'boolean') then raise exception 'Invalid question' using errcode='23514'; end if;
  kind:=coalesce(q->>'questionType',case when q->>'type'='MCQ' then 'single_choice' when coalesce((q->>'photoAllowed')::boolean,false) then 'file_upload' else 'essay' end);
  if kind not in('single_choice','multiple_choice','true_false','numeric','short_text','essay','file_upload') or (kind in('single_choice','multiple_choice','true_false'))<>(q->>'type'='MCQ') then raise exception 'Invalid question format' using errcode='23514'; end if;
  insert into public.assessment_questions(assessment_id,question_type,prompt,points,position,settings) values(aid,kind,btrim(q->>'text'),(q->>'points')::numeric,pos,case when q->>'imageUrl' is null then '{}'::jsonb else jsonb_build_object('image_url',q->>'imageUrl') end) returning id into qid;
  if kind in('single_choice','multiple_choice','true_false') then
   if jsonb_typeof(q->'choices') is distinct from 'array' then raise exception 'Invalid options' using errcode='23514'; end if;
   if jsonb_array_length(q->'choices') not between 2 and 6 or (kind='true_false' and jsonb_array_length(q->'choices')<>2) then raise exception 'Invalid option count' using errcode='23514'; end if;
   if kind='multiple_choice' then
    if jsonb_typeof(q->'correctChoices') is distinct from 'array' or jsonb_array_length(q->'correctChoices') not between 1 and 6 then raise exception 'Select correct choices' using errcode='23514'; end if;
    if exists(select 1 from jsonb_array_elements(q->'correctChoices') x where jsonb_typeof(x)<>'number' or (x#>>'{}')::numeric<>trunc((x#>>'{}')::numeric) or (x#>>'{}')::numeric not between 0 and jsonb_array_length(q->'choices')-1) then raise exception 'Invalid answer key' using errcode='23514'; end if;
    select array_agg((x#>>'{}')::integer) into selected from jsonb_array_elements(q->'correctChoices') x;
    if cardinality(selected)<>(select count(distinct x) from unnest(selected) x) then raise exception 'Duplicate key option' using errcode='23514'; end if;
   else
    if jsonb_typeof(q->'correctChoice') is distinct from 'number' or (q->>'correctChoice')::numeric<>trunc((q->>'correctChoice')::numeric) or (q->>'correctChoice')::numeric not between 0 and jsonb_array_length(q->'choices')-1 then raise exception 'Invalid answer key' using errcode='23514'; end if;
    selected:=array[(q->>'correctChoice')::integer];
   end if;
   choice_pos:=0;
   for c in select value from jsonb_array_elements(q->'choices') loop
    if jsonb_typeof(c)<>'string' or length(btrim(c#>>'{}')) not between 1 and 500 then raise exception 'Invalid option text' using errcode='23514'; end if;
    insert into public.assessment_options(question_id,text,position,is_correct) values(qid,btrim(c#>>'{}'),choice_pos,choice_pos=any(selected));choice_pos:=choice_pos+1;
   end loop;
  else
   if q->'choices' is distinct from 'null'::jsonb or q->'correctChoice' is distinct from 'null'::jsonb then raise exception 'Non-choice question cannot contain option key' using errcode='23514'; end if;
   if kind='numeric' then
    if jsonb_typeof(q->'numericValue') is distinct from 'number' or jsonb_typeof(q->'numericTolerance') is distinct from 'number' or (q->>'numericTolerance')::numeric<0 then raise exception 'Numeric key requires value and tolerance' using errcode='23514'; end if;
    perform private.set_assessment_answer_key(qid,jsonb_build_object('kind','numeric','value',q->'numericValue','absolute_tolerance',q->'numericTolerance'));
   end if;
  end if;
  pos:=pos+1;
 end loop;
 return sid;
end $$;
revoke all on function private.save_exam_definition_v2(uuid,uuid,timestamptz,jsonb) from public,anon;
grant execute on function private.save_exam_definition_v2(uuid,uuid,timestamptz,jsonb) to authenticated;
create function public.save_exam_definition_v2(p_offering_id uuid,p_schedule_id uuid,p_expected_updated_at timestamptz,p_definition jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.save_exam_definition_v2(p_offering_id,p_schedule_id,p_expected_updated_at,p_definition) $$;
revoke all on function public.save_exam_definition_v2(uuid,uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.save_exam_definition_v2(uuid,uuid,timestamptz,jsonb) to authenticated;

create function private.save_exam_answers(p_attempt_id uuid,p_expected_revision bigint,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations; answer jsonb; state jsonb; revision bigint;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 if a.id is null then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 perform private.lock_exam(a.offering_assessment_id,a.user_id);
 select * into a from public.assessment_attempts where id=p_attempt_id;
 select * into p from private.assessment_participations where id=a.participation_id;
 if a.user_id is distinct from private.current_app_user_id() or not private.exam_enrolled((select offering_id from public.offering_assessments where id=a.offering_assessment_id)) then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 if a.status<>'in_progress' or a.deadline_at<=clock_timestamp() then raise exception 'Attempt cannot accept answers' using errcode='42501'; end if;
 if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Invalid answers' using errcode='23514'; end if;
 if jsonb_array_length(p_answers)<>(select count(*) from private.assessment_question_outcomes where attempt_id=a.id) or jsonb_array_length(p_answers)>100 then raise exception 'Incomplete answer snapshot' using errcode='23514'; end if;
 if exists(select 1 from jsonb_array_elements(p_answers) x where jsonb_typeof(x) is distinct from 'object' or x-array['question_id','response','media_asset_id']<>'{}'::jsonb or not x ?& array['question_id','response','media_asset_id'] or not exists(select 1 from private.assessment_question_outcomes o where o.attempt_id=a.id and o.question_id::text=x->>'question_id')) or (select count(distinct x->>'question_id') from jsonb_array_elements(p_answers) x)<>jsonb_array_length(p_answers) then raise exception 'Invalid question snapshot' using errcode='23514'; end if;
 if p.revision is distinct from p_expected_revision then
  if exists(select 1 from jsonb_array_elements(p_answers) x left join public.assessment_responses r on r.attempt_id=a.id and r.question_id::text=x->>'question_id' where r.response is distinct from nullif(x->'response','null'::jsonb) or r.media_asset_id::text is distinct from x->>'media_asset_id') then raise exception 'Stale answer snapshot' using errcode='PT409'; end if;
  return private.exam_state(p.schedule_id,p.user_id);
 end if;
 revision:=p_expected_revision;
 for answer in select x from jsonb_array_elements(p_answers) x order by x->>'question_id' loop
  state:=private.save_exam_response(a.id,(answer->>'question_id')::uuid,nullif(answer->'response','null'::jsonb),(answer->>'media_asset_id')::uuid,revision);
  revision:=(state->>'revision')::bigint;
 end loop;
 return private.exam_state(a.offering_assessment_id,a.user_id);
end $$;

create function private.get_exam_definition_v2(p_schedule_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.offering_assessments; a public.assessments;
begin
 select * into s from public.offering_assessments where id=p_schedule_id;
 select * into a from public.assessments where id=s.assessment_id;
 if s.id is null or a.type not in('exam','quiz') or not private.can_manage_offering(s.offering_id) or not private.can_edit_course(a.course_id) then raise exception 'Exam authoring unavailable' using errcode='42501'; end if;
 return jsonb_build_object('role','staff','id',s.id,'offeringId',s.offering_id,'updatedAt',s.updated_at,'title',a.title,'kind',a.type,'description',a.instructions,'durationMinutes',s.time_limit_seconds/60,'maxAttempts',s.max_attempts,'isPublished',s.published,
 'isLocked',exists(select 1 from public.assessment_attempts t join public.offering_assessments x on x.id=t.offering_assessment_id where x.assessment_id=a.id) or (select count(*) from public.offering_assessments where assessment_id=a.id)>1,
 'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'type',case when q.question_type in('single_choice','multiple_choice','true_false') then 'MCQ' else 'WRITTEN' end,'questionType',q.question_type,'photoAllowed',q.question_type='file_upload','text',q.prompt,'points',q.points,'imageUrl',q.settings->>'image_url',
 'choices',case when q.question_type in('single_choice','multiple_choice','true_false') then(select jsonb_agg(o.text order by o.position) from public.assessment_options o where o.question_id=q.id) end,
 'correctChoice',(select o.position from public.assessment_options o where o.question_id=q.id and o.is_correct order by position limit 1),
 'correctChoices',case when q.question_type='multiple_choice' then(select jsonb_agg(o.position order by o.position) from public.assessment_options o where o.question_id=q.id and o.is_correct) end,
 'numericValue',case when q.question_type='numeric' then k.answer->'value' end,'numericTolerance',case when q.question_type='numeric' then k.answer->'absolute_tolerance' end) order by q.position) from public.assessment_questions q left join private.assessment_answer_keys k on k.question_id=q.id where q.assessment_id=a.id),'[]'::jsonb));
end $$;

create function private.clone_exam_schedule(p_schedule_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.offering_assessments; a public.assessments; aid uuid; sid uuid;
begin
 select x.* into a from public.assessments x join public.offering_assessments y on y.assessment_id=x.id where y.id=p_schedule_id for share of x;
 select * into s from public.offering_assessments where id=p_schedule_id for share;
 if s.id is null or a.type not in('exam','quiz') or not private.can_manage_offering(s.offering_id) or not private.can_edit_course(a.course_id) then raise exception 'Clone unavailable' using errcode='42501'; end if;
 aid:=private.clone_assessment(a.id,left(a.title,180)||' (new version)');
 insert into public.offering_assessments(offering_id,assessment_id,time_limit_seconds,max_attempts,shuffle_questions,shuffle_options,published)
 values(s.offering_id,aid,s.time_limit_seconds,s.max_attempts,s.shuffle_questions,s.shuffle_options,false) returning id into sid;
 return sid;
end $$;

-- Immutable audit trail; never exposed through a direct Data API table grant.
create table private.exam_grade_changes (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
 changed_by uuid not null references public.profiles(id) on delete restrict,
 request_id uuid not null unique,
 reason text not null check(length(btrim(reason)) between 1 and 5000),
 before_grade jsonb not null check(jsonb_typeof(before_grade)='object'),
 after_grade jsonb not null check(jsonb_typeof(after_grade)='object'),
 created_at timestamptz not null default clock_timestamp()
);
alter table private.exam_grade_changes enable row level security;
revoke all on private.exam_grade_changes from public,anon,authenticated;
create index exam_grade_changes_attempt_idx on private.exam_grade_changes(attempt_id,created_at);
create index exam_grade_changes_actor_idx on private.exam_grade_changes(changed_by);
create function private.immutable_grade_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Application roles cannot delete attempts or audit rows. A separately authorized
 -- privileged parent deletion (e.g. exact synthetic fixture cleanup) can cascade.
 if tg_op='DELETE' and not exists(select 1 from public.assessment_attempts where id=old.attempt_id) then return old; end if;
 raise exception 'Grade audit entries are immutable' using errcode='42501';
end $$;
revoke all on function private.immutable_grade_change() from public,anon,authenticated;
create trigger immutable_grade_change before update or delete on private.exam_grade_changes for each row execute function private.immutable_grade_change();

create function private.grade_exam_paper(p_attempt_id uuid,p_expected_revision bigint,p_scores jsonb,p_feedback text,p_reason text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations; q record; mark numeric; prior jsonb; after_value jsonb; previous private.exam_grade_changes; count_required integer;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 if a.id is null then raise exception 'Submission unavailable' using errcode='42501'; end if;
 perform private.lock_exam(a.offering_assessment_id,a.user_id);
 select * into a from public.assessment_attempts where id=p_attempt_id;
 select * into p from private.assessment_participations where id=a.participation_id;
 if p.id is null or not private.can_support_offering((select offering_id from public.offering_assessments where id=a.offering_assessment_id)) then raise exception 'Grading unavailable' using errcode='42501'; end if;
 if p.attempts_state<>'finalized' or p.final_attempt_id<>a.id then raise exception 'Attempts must be finalized' using errcode='PT409'; end if;
 if jsonb_typeof(p_scores) is distinct from 'object' or length(coalesce(p_feedback,''))>5000 or p_request_id is null then raise exception 'Invalid grading request' using errcode='23514'; end if;
 select * into previous from private.exam_grade_changes where request_id=p_request_id;
 if previous.id is not null then
  if previous.attempt_id<>a.id or previous.changed_by<>private.current_app_user_id() or previous.after_grade->'requested_scores' is distinct from p_scores or previous.after_grade->>'feedback' is distinct from coalesce(p_feedback,'') or previous.reason is distinct from coalesce(nullif(btrim(p_reason),''),'Initial grading') then raise exception 'Request identifier already used' using errcode='PT409'; end if;
  return private.exam_state(p.schedule_id,p.user_id);
 end if;
 if p.revision is distinct from p_expected_revision then raise exception 'Stale grading revision' using errcode='PT409'; end if;
 if p.released_at is not null and (p_reason is null or length(btrim(p_reason)) not between 1 and 5000) then raise exception 'A correction reason is required' using errcode='23514'; end if;
 select count(*) into count_required from public.assessment_questions x join private.assessment_question_outcomes o on o.question_id=x.id and o.attempt_id=a.id where p.released_at is not null or x.question_type in('essay','short_text','file_upload');
 if (select count(*) from jsonb_object_keys(p_scores))<>count_required then raise exception 'Provide marks for the complete paper section' using errcode='23514'; end if;
 if exists(select 1 from jsonb_each(p_scores) x where not exists(select 1 from public.assessment_questions y join private.assessment_question_outcomes o on o.question_id=y.id and o.attempt_id=a.id where y.id::text=x.key and (p.released_at is not null or y.question_type in('essay','short_text','file_upload')))) then raise exception 'Invalid grading question' using errcode='23514'; end if;
 prior:=jsonb_build_object('score',a.score,'questions',(select jsonb_agg(jsonb_build_object('question_id',o.question_id,'points',o.awarded_points,'feedback',r.feedback) order by o.question_id) from private.assessment_question_outcomes o left join public.assessment_responses r on r.attempt_id=o.attempt_id and r.question_id=o.question_id where o.attempt_id=a.id));
 for q in select x.id,x.points,r.id as response_id from public.assessment_questions x join private.assessment_question_outcomes o on o.question_id=x.id and o.attempt_id=a.id left join public.assessment_responses r on r.attempt_id=a.id and r.question_id=x.id where p_scores ? x.id::text order by x.id loop
  if jsonb_typeof(p_scores->q.id::text) is distinct from 'number' then raise exception 'Invalid mark' using errcode='23514'; end if;
  mark:=(p_scores->>q.id::text)::numeric;
  if mark<0 or mark>q.points then raise exception 'Mark outside question range' using errcode='23514'; end if;
  -- A correction may award a missing response points, with the audit explicitly recording this.
  -- No response is invented and the original student's payload remains untouched.
  if p.released_at is null and q.response_id is null and mark<>0 then raise exception 'Unanswered work receives zero before release' using errcode='23514'; end if;
  update private.assessment_question_outcomes set awarded_points=mark,outcome=case when outcome='unanswered' then outcome else 'manual' end,evaluated_at=clock_timestamp() where attempt_id=a.id and question_id=q.id;
  update public.assessment_responses set awarded_points=mark,feedback=p_feedback,graded_by=private.current_app_user_id(),graded_at=clock_timestamp() where id=q.response_id;
 end loop;
 perform private.refresh_exam_grade(p.id);
 update public.assessment_attempts set graded_by=private.current_app_user_id(),graded_at=clock_timestamp() where id=a.id;
 select jsonb_build_object('score',t.score,'requested_scores',p_scores,'feedback',coalesce(p_feedback,''),'questions',(select jsonb_agg(jsonb_build_object('question_id',o.question_id,'points',o.awarded_points,'feedback',r.feedback) order by o.question_id) from private.assessment_question_outcomes o left join public.assessment_responses r on r.attempt_id=o.attempt_id and r.question_id=o.question_id where o.attempt_id=a.id)) into after_value from public.assessment_attempts t where t.id=a.id;
 insert into private.exam_grade_changes(attempt_id,changed_by,request_id,reason,before_grade,after_grade) values(a.id,private.current_app_user_id(),p_request_id,coalesce(nullif(btrim(p_reason),''),'Initial grading'),prior,after_value);
 return private.exam_state(p.schedule_id,p.user_id);
end $$;

create function private.get_exam_grade_changes(p_attempt_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations; staff boolean;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 select * into p from private.assessment_participations where id=a.participation_id;
 staff:=private.can_support_offering((select offering_id from public.offering_assessments where id=a.offering_assessment_id));
 if a.id is null or not coalesce(staff or (a.user_id=private.current_app_user_id() and private.is_active_user() and p.released_at is not null and p.final_attempt_id=a.id),false) then raise exception 'Grade history unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'changedAt',c.created_at,'reason',c.reason,'previousScore',c.before_grade->'score','score',c.after_grade->'score','staffId',case when staff then c.changed_by end) order by c.created_at,c.id) from private.exam_grade_changes c where c.attempt_id=a.id),'[]'::jsonb);
end $$;

create function private.get_exam_submission_page(p_schedule_id uuid,p_after uuid default null,p_limit integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare offering uuid; ids uuid[];
begin
 select s.offering_id into offering from public.offering_assessments s join public.assessments a on a.id=s.assessment_id where s.id=p_schedule_id and a.type in('exam','quiz');
 if offering is null or not private.can_support_offering(offering) then raise exception 'Submissions unavailable' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 50 then raise exception 'Invalid page size' using errcode='23514'; end if;
 select array_agg(x.id order by x.id) into ids from (select t.id from private.assessment_participations p join public.assessment_attempts t on t.id=p.final_attempt_id where p.schedule_id=p_schedule_id and p.attempts_state='finalized' and (p_after is null or t.id>p_after) order by t.id limit p_limit+1) x;
 return jsonb_build_object('ids',to_jsonb(coalesce(ids[1:p_limit],'{}'::uuid[])),'nextCursor',case when cardinality(ids)>p_limit then ids[p_limit] end);
end $$;

do $$ declare sig text; args text; ret text; fname text;
begin
 for sig,args,ret in select * from (values
 ('save_exam_answers(p_attempt_id uuid,p_expected_revision bigint,p_answers jsonb)','p_attempt_id,p_expected_revision,p_answers','jsonb'),
 ('get_exam_definition_v2(p_schedule_id uuid)','p_schedule_id','jsonb'),
 ('clone_exam_schedule(p_schedule_id uuid)','p_schedule_id','uuid'),
 ('grade_exam_paper(p_attempt_id uuid,p_expected_revision bigint,p_scores jsonb,p_feedback text,p_reason text,p_request_id uuid)','p_attempt_id,p_expected_revision,p_scores,p_feedback,p_reason,p_request_id','jsonb'),
 ('get_exam_grade_changes(p_attempt_id uuid)','p_attempt_id','jsonb'),
 ('get_exam_submission_page(p_schedule_id uuid,p_after uuid default null,p_limit integer default 25)','p_schedule_id,p_after,p_limit','jsonb')) x(s,a,r)
 loop
 fname:=split_part(sig,'(',1);
 execute format('create function public.%s returns %s language sql security invoker set search_path='''' as $fn$ select private.%I(%s) $fn$',sig,ret,fname,args);
 execute format('revoke all on function private.%I from public,anon',fname);
 execute format('grant execute on function private.%I to authenticated',fname);
 execute format('revoke all on function public.%I from public,anon',fname);
 execute format('grant execute on function public.%I to authenticated',fname);
 end loop;
end $$;
notify pgrst,'reload schema';

