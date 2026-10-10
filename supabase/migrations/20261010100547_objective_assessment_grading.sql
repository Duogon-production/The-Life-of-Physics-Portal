-- Explicit marking contract: choices are exact-set, all-or-nothing. Numeric
-- grading is opt-in with {"kind":"numeric","value":12.5,"absolute_tolerance":0.01}.
-- Unspecified/malformed keys and subjective responses remain for manual grading.
create function private.auto_grade_attempt(p_attempt_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; r record; correct uuid[]; selected uuid[]; key jsonb; earned numeric; answer_value numeric; expected numeric; tolerance numeric;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id for update;
 if a.status is distinct from 'submitted' then return; end if;
 for r in select ar.id,ar.response,q.id as question_id,q.question_type,q.points from public.assessment_responses ar
 join public.assessment_questions q on q.id=ar.question_id where ar.attempt_id=a.id and ar.awarded_points is null
 loop
   earned:=null;
   if r.question_type in ('single_choice','multiple_choice','true_false') then
     select array_agg(o.id order by o.id) into correct from public.assessment_options o where o.question_id=r.question_id and o.is_correct;
     if coalesce(array_length(correct,1),0)>0 and (r.question_type='multiple_choice' or array_length(correct,1)=1)
     and (r.question_type<>'true_false' or (select count(*) from public.assessment_options o where o.question_id=r.question_id)=2) then
       select array_agg(x.value::uuid order by x.value::uuid) into selected from jsonb_array_elements_text(r.response->'option_ids') x;
       earned:=case when selected=correct then r.points else 0 end;
     end if;
   elsif r.question_type='numeric' then
     select k.answer into key from private.assessment_answer_keys k where k.question_id=r.question_id;
     if key->>'kind'='numeric' and jsonb_typeof(key->'value')='number' and jsonb_typeof(key->'absolute_tolerance')='number' then
       expected:=(key->>'value')::numeric; tolerance:=(key->>'absolute_tolerance')::numeric;
       if tolerance>=0 and jsonb_typeof(r.response->'value')='number' then
         answer_value:=(r.response->>'value')::numeric;
         earned:=case when abs(answer_value-expected)<=tolerance then r.points else 0 end;
       end if;
     end if;
   end if;
   if earned is not null then
     update public.assessment_responses set awarded_points=earned,feedback=null,graded_by=null,graded_at=clock_timestamp() where id=r.id;
   end if;
 end loop;
 -- Publication of results remains an explicit authorized staff finalization.
end $$;
revoke all on function private.auto_grade_attempt(uuid) from public,anon,authenticated;

create or replace function private.submit_assessment_attempt(p_attempt_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; offering uuid;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id for update;
 select oa.offering_id into offering from public.offering_assessments oa where oa.id=a.offering_assessment_id;
 if a.id is null or a.user_id is distinct from (select private.current_app_user_id()) or not private.is_enrolled(offering) then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 if a.status in ('submitted','graded') then return; end if;
 if a.status<>'in_progress' then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 update public.assessment_attempts set status='submitted',submitted_at=clock_timestamp() where id=a.id;
end $$;

-- Expiring an old attempt during start also runs trusted grading. The trigger
-- observes the same locked attempt and never exposes grading answers to callers.
create function private.grade_on_submission() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='submitted' and old.status='in_progress' then perform private.auto_grade_attempt(new.id); end if;
 return new;
end $$;
revoke all on function private.grade_on_submission() from public,anon,authenticated;
create trigger auto_grade_submitted after update of status on public.assessment_attempts for each row execute function private.grade_on_submission();

-- Validate numeric keys at authoring time rather than silently inventing a rule.
create or replace function private.set_assessment_answer_key(p_question_id uuid,p_answer jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare course uuid; typ text;
begin
 select a.course_id,q.question_type into course,typ from public.assessment_questions q join public.assessments a on a.id=q.assessment_id where q.id=p_question_id;
 if course is null or not private.can_edit_course(course) then raise exception 'Editing not permitted' using errcode='42501'; end if;
 if typ='numeric' then
   if p_answer->>'kind' is distinct from 'numeric' or jsonb_typeof(p_answer->'value') is distinct from 'number'
   or jsonb_typeof(p_answer->'absolute_tolerance') is distinct from 'number'
   or p_answer-array['kind','value','absolute_tolerance']<>'{}'::jsonb then
     raise exception 'Numeric grading requires value and nonnegative absolute_tolerance' using errcode='23514';
   end if;
   if (p_answer->>'absolute_tolerance')::numeric<0 then raise exception 'Negative tolerance' using errcode='23514'; end if;
 end if;
 insert into private.assessment_answer_keys(question_id,answer) values(p_question_id,p_answer) on conflict(question_id) do update set answer=excluded.answer;
end $$;
