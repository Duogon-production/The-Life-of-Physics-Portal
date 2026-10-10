-- All identity/grade-sensitive writes go through checked RPCs. Public wrappers
-- are SECURITY INVOKER; implementations live outside the exposed API schema.
create function private.create_organization(p_name text,p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare oid uuid;
begin
 if not private.is_active_user() then raise exception 'Authentication required' using errcode='42501'; end if;
 insert into public.organizations(name,slug,created_by) values(p_name,p_slug,(select auth.uid())) returning id into oid;
 insert into public.organization_memberships(organization_id,user_id,role,status,joined_at) values(oid,(select auth.uid()),'owner','active',now());
 return oid;
end $$;

create function private.start_assessment_attempt(p_offering_assessment_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare oa public.offering_assessments; a public.assessments; existing public.assessment_attempts; num integer; aid uuid; deadline timestamptz; total numeric;
begin
 select ass.* into a from public.assessments ass join public.offering_assessments x on x.assessment_id=ass.id where x.id=p_offering_assessment_id for share of ass;
 select * into oa from public.offering_assessments where id=p_offering_assessment_id for update;
 if oa.id is null or not private.is_enrolled(oa.offering_id) or not oa.published or a.status<>'published' then raise exception 'Assessment unavailable' using errcode='42501'; end if;
 perform 1 from public.enrollments e where e.offering_id=oa.offering_id and e.user_id=(select auth.uid()) for share;
 if (oa.opens_at is not null and clock_timestamp()<oa.opens_at) or (oa.closes_at is not null and clock_timestamp()>=oa.closes_at) then raise exception 'Outside assessment window' using errcode='42501'; end if;
 select * into existing from public.assessment_attempts x where x.offering_assessment_id=oa.id and x.user_id=(select auth.uid()) and x.status='in_progress' order by x.attempt_number desc limit 1;
 if existing.id is not null then
   if existing.deadline_at is null or clock_timestamp()<existing.deadline_at then return existing.id; end if;
   update public.assessment_attempts set status='submitted', submitted_at=clock_timestamp() where id=existing.id;
 end if;
 select coalesce(max(x.attempt_number),0)+1 into num from public.assessment_attempts x where x.offering_assessment_id=oa.id and x.user_id=(select auth.uid());
 if oa.max_attempts is not null and num>oa.max_attempts then raise exception 'Attempt limit reached' using errcode='42501'; end if;
 deadline:=case when oa.time_limit_seconds is null then oa.closes_at else least(oa.closes_at,now()+make_interval(secs=>oa.time_limit_seconds)) end;
 select coalesce(sum(q.points),0) into total from public.assessment_questions q where q.assessment_id=a.id;
 insert into public.assessment_attempts(offering_assessment_id,user_id,attempt_number,deadline_at,max_score) values(oa.id,(select auth.uid()),num,deadline,total) returning id into aid;
 return aid;
end $$;

create function private.save_assessment_response(p_attempt_id uuid,p_question_id uuid,p_response jsonb,p_media_asset_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare a public.assessment_attempts; oa public.offering_assessments; q public.assessment_questions; rid uuid; choices jsonb; count_choices integer;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id for update;
 select * into oa from public.offering_assessments where id=a.offering_assessment_id;
 if a.id is null or a.user_id is distinct from (select auth.uid()) or not private.is_enrolled(oa.offering_id) or a.status<>'in_progress' or (a.deadline_at is not null and clock_timestamp()>=a.deadline_at) then raise exception 'Attempt cannot accept answers' using errcode='42501'; end if;
 select * into q from public.assessment_questions where id=p_question_id and assessment_id=oa.assessment_id;
 if q.id is null or jsonb_typeof(p_response) is distinct from 'object' then raise exception 'Invalid question/response' using errcode='23514'; end if;
 if q.question_type in ('single_choice','multiple_choice','true_false') then
   choices:=p_response->'option_ids';
   if jsonb_typeof(choices) is distinct from 'array' or p_response-array['option_ids']<>'{}'::jsonb then raise exception 'Expected option_ids array' using errcode='23514'; end if;
   count_choices:=jsonb_array_length(choices);
   if (q.question_type<>'multiple_choice' and count_choices<>1) or count_choices=0
     or (select count(distinct x.value) from jsonb_array_elements_text(choices) x)<>count_choices
     or exists(select 1 from jsonb_array_elements_text(choices) x where not exists(select 1 from public.assessment_options o where o.question_id=q.id and o.id::text=x.value)) then
     raise exception 'Invalid selected options' using errcode='23514';
   end if;
 elsif q.question_type='numeric' then
   if jsonb_typeof(p_response->'value') is distinct from 'number' or p_response-array['value']<>'{}'::jsonb then raise exception 'Expected numeric value' using errcode='23514'; end if;
 elsif q.question_type in ('short_text','essay') then
   if jsonb_typeof(p_response->'text') is distinct from 'string' or p_response-array['text']<>'{}'::jsonb then raise exception 'Expected text response' using errcode='23514'; end if;
 elsif q.question_type='file_upload' then
   if p_media_asset_id is null or p_response-array['text']<>'{}'::jsonb then raise exception 'Expected submission asset' using errcode='23514'; end if;
 end if;
 if q.question_type<>'file_upload' and p_media_asset_id is not null then raise exception 'File not allowed for question type' using errcode='23514'; end if;
 insert into public.assessment_responses(attempt_id,question_id,response,media_asset_id) values(a.id,q.id,p_response,p_media_asset_id)
 on conflict(attempt_id,question_id) do update set response=excluded.response,media_asset_id=excluded.media_asset_id returning id into rid;
 return rid;
end $$;

create function private.submit_assessment_attempt(p_attempt_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.assessment_attempts; offering uuid;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id for update;
 select oa.offering_id into offering from public.offering_assessments oa where oa.id=a.offering_assessment_id;
 if a.id is null or a.user_id is distinct from (select auth.uid()) or not private.is_enrolled(offering) then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 if a.status in ('submitted','graded') then return; end if;
 if a.status<>'in_progress' then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 -- Late submission is allowed, but saves stop at the snapshotted deadline.
 update public.assessment_attempts set status='submitted',submitted_at=clock_timestamp() where id=a.id;
end $$;

create function private.grade_assessment_response(p_response_id uuid,p_points numeric,p_feedback text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.assessment_attempts; offering uuid;
begin
 select at.* into a from public.assessment_attempts at join public.assessment_responses r on r.attempt_id=at.id where r.id=p_response_id for update of at;
 select oa.offering_id into offering from public.offering_assessments oa where oa.id=a.offering_assessment_id;
 if a.id is null or not private.can_support_offering(offering) or a.status<>'submitted' then raise exception 'Grading not permitted' using errcode='42501'; end if;
 if p_points is null or p_points<0 or p_points='NaN'::numeric then raise exception 'Invalid points' using errcode='23514'; end if;
 update public.assessment_responses set awarded_points=p_points,feedback=p_feedback,graded_by=(select auth.uid()),graded_at=now() where id=p_response_id;
end $$;

create function private.finalize_assessment_grade(p_attempt_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.assessment_attempts; offering uuid; total numeric;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id for update;
 select oa.offering_id into offering from public.offering_assessments oa where oa.id=a.offering_assessment_id;
 if a.id is null or not private.can_support_offering(offering) or a.status<>'submitted' then raise exception 'Grading not permitted' using errcode='42501'; end if;
 if exists(select 1 from public.assessment_responses r where r.attempt_id=a.id and r.awarded_points is null) then raise exception 'Grade all submitted responses first' using errcode='23514'; end if;
 select coalesce(sum(r.awarded_points),0) into total from public.assessment_responses r where r.attempt_id=a.id;
 update public.assessment_attempts set score=total,status='graded',graded_at=now(),graded_by=(select auth.uid()) where id=a.id;
end $$;

create function private.get_assessment_results(p_attempt_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a public.assessment_attempts; offering uuid;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 select oa.offering_id into offering from public.offering_assessments oa where oa.id=a.offering_assessment_id;
 if a.id is null or not (private.can_support_offering(offering) or (a.user_id=(select auth.uid()) and private.is_active_user() and a.status='graded')) then raise exception 'Results unavailable' using errcode='42501'; end if;
 return jsonb_build_object('attempt_id',a.id,'score',a.score,'max_score',a.max_score,'status',a.status,'responses',
   coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'question_id',r.question_id,'awarded_points',r.awarded_points,'feedback',r.feedback,'graded_at',r.graded_at)) from public.assessment_responses r where r.attempt_id=a.id),'[]'::jsonb));
end $$;

create function private.get_assessment_answer_keys(p_assessment_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 if not private.can_grade_assessment(p_assessment_id) then raise exception 'Answer keys are restricted to authorized staff' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('question_id',q.id,'answer',k.answer,'options',
   coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'text',o.text,'position',o.position,'is_correct',o.is_correct) order by o.position) from public.assessment_options o where o.question_id=q.id),'[]'::jsonb)))
 from public.assessment_questions q left join private.assessment_answer_keys k on k.question_id=q.id where q.assessment_id=p_assessment_id),'[]'::jsonb);
end $$;

create function private.set_assessment_answer_key(p_question_id uuid,p_answer jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare course uuid;
begin
 select a.course_id into course from public.assessment_questions q join public.assessments a on a.id=q.assessment_id where q.id=p_question_id;
 if course is null or not private.can_edit_course(course) then raise exception 'Editing not permitted' using errcode='42501'; end if;
 insert into private.assessment_answer_keys(question_id,answer) values(p_question_id,p_answer) on conflict(question_id) do update set answer=excluded.answer;
end $$;

create function private.clone_assessment(p_assessment_id uuid,p_title text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare old_a public.assessments; new_id uuid; q public.assessment_questions; new_q uuid;
begin
 select * into old_a from public.assessments where id=p_assessment_id for share;
 if old_a.id is null or not private.can_edit_course(old_a.course_id) then raise exception 'Editing not permitted' using errcode='42501'; end if;
 insert into public.assessments(course_id,title,type,instructions,status,version,supersedes_assessment_id,created_by)
 values(old_a.course_id,coalesce(p_title,old_a.title),old_a.type,old_a.instructions,'draft',old_a.version+1,old_a.id,(select auth.uid())) returning id into new_id;
 for q in select * from public.assessment_questions where assessment_id=old_a.id order by position loop
   insert into public.assessment_questions(assessment_id,question_type,prompt,points,position,settings) values(new_id,q.question_type,q.prompt,q.points,q.position,q.settings) returning id into new_q;
   insert into public.assessment_options(question_id,text,position,is_correct) select new_q,o.text,o.position,o.is_correct from public.assessment_options o where o.question_id=q.id;
   insert into private.assessment_answer_keys(question_id,answer) select new_q,k.answer from private.assessment_answer_keys k where k.question_id=q.id;
 end loop;
 return new_id;
end $$;

-- Expose only deliberate RPC signatures; never grant execution to anonymous.
do $$ declare sig text; args text; ret text; fname text; begin
 for sig,args,ret in select * from (values
 ('create_organization(p_name text,p_slug text)','p_name,p_slug','uuid'),
 ('start_assessment_attempt(p_offering_assessment_id uuid)','p_offering_assessment_id','uuid'),
 ('save_assessment_response(p_attempt_id uuid,p_question_id uuid,p_response jsonb,p_media_asset_id uuid default null)','p_attempt_id,p_question_id,p_response,p_media_asset_id','uuid'),
 ('submit_assessment_attempt(p_attempt_id uuid)','p_attempt_id','void'),
 ('grade_assessment_response(p_response_id uuid,p_points numeric,p_feedback text default null)','p_response_id,p_points,p_feedback','void'),
 ('finalize_assessment_grade(p_attempt_id uuid)','p_attempt_id','void'),
 ('get_assessment_results(p_attempt_id uuid)','p_attempt_id','jsonb'),
 ('get_assessment_answer_keys(p_assessment_id uuid)','p_assessment_id','jsonb'),
 ('set_assessment_answer_key(p_question_id uuid,p_answer jsonb)','p_question_id,p_answer','void'),
 ('clone_assessment(p_assessment_id uuid,p_title text default null)','p_assessment_id,p_title','uuid')) x(sig,args,ret)
 loop
 fname:=split_part(sig,'(',1);
 execute format('revoke all on function private.%I from public,anon',fname);
 execute format('grant execute on function private.%I to authenticated',fname);
 execute format('create function public.%s returns %s language sql security invoker set search_path = '''' as $fn$ select private.%I(%s) $fn$',sig,ret,fname,args);
 execute format('revoke all on function public.%I from public,anon',fname);
 execute format('grant execute on function public.%I to authenticated',fname);
 end loop;
end $$;
