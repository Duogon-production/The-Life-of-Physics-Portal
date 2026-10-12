-- Step 03A. Local preparation only; remote application requires owner approval.
-- Existing exam attempts require explicit reconciliation, never inferred release.
do $$ begin
 if exists(select 1 from public.assessment_attempts t join public.offering_assessments s on s.id=t.offering_assessment_id join public.assessments a on a.id=s.assessment_id where a.type in ('exam','quiz')) then
  raise exception 'Existing exam attempts require a reviewed backfill before migration 18';
 end if;
 if exists(select 1 from public.offering_assessments s join public.assessments a on a.id=s.assessment_id where a.type in ('exam','quiz') and (s.max_attempts is null or s.max_attempts not in (1,2) or s.time_limit_seconds<60)) then
  raise exception 'Invalid exam settings require explicit correction before migration 18';
 end if;
end $$;

revoke select on public.assessment_attempts from public,anon,authenticated;
revoke select(score,max_score,graded_at,graded_by) on public.assessment_attempts from public,anon,authenticated;
grant select(id,offering_assessment_id,user_id,attempt_number,started_at,deadline_at,submitted_at,status,created_at,updated_at) on public.assessment_attempts to authenticated;

create table private.assessment_participations (
 id uuid primary key default gen_random_uuid(),
 schedule_id uuid not null references public.offering_assessments(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict,
 max_attempts integer not null check(max_attempts in (1,2)),
 duration_seconds integer check(duration_seconds>=60),
 attempts_state text not null default 'in_progress' check(attempts_state in ('in_progress','retry_decision_pending','retry_accepted','finalized')),
 retry_decision text check(retry_decision in ('accepted','declined','not_eligible','window_closed')),
 decided_at timestamptz,
 final_attempt_id uuid references public.assessment_attempts(id) on delete restrict,
 finalized_at timestamptz,
 grading_state text not null default 'pending' check(grading_state in ('pending','complete')),
 released_at timestamptz,
 released_by uuid references public.profiles(id) on delete restrict,
 review_released_at timestamptz,
 review_released_by uuid references public.profiles(id) on delete restrict,
 revision bigint not null default 0 check(revision>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(schedule_id,user_id), unique(id,schedule_id,user_id),
 check((retry_decision is null)=(decided_at is null)),
 check((attempts_state='finalized')=(finalized_at is not null)),
 check((attempts_state='finalized')=(final_attempt_id is not null)),
 check(released_at is null or (attempts_state='finalized' and grading_state='complete')),
 check(review_released_at is null or released_at is not null),
 check(attempts_state<>'retry_decision_pending' or (max_attempts=2 and retry_decision is null)),
 check(attempts_state<>'retry_accepted' or retry_decision='accepted')
);
create index assessment_participations_user_idx on private.assessment_participations(user_id,schedule_id);
create index assessment_participations_final_idx on private.assessment_participations(final_attempt_id);
create index assessment_participations_releaser_idx on private.assessment_participations(released_by);
create index assessment_participations_reviewer_idx on private.assessment_participations(review_released_by);
alter table private.assessment_participations enable row level security;
revoke all on private.assessment_participations from public,anon,authenticated;
create trigger touch_updated_at before update on private.assessment_participations for each row execute function private.touch_updated_at();
create trigger prevent_reparenting before update on private.assessment_participations for each row execute function private.reject_reparenting('id','schedule_id','user_id','max_attempts','duration_seconds');

alter table public.assessment_attempts add column participation_id uuid;
alter table public.assessment_attempts add constraint assessment_attempt_participation_fk foreign key(participation_id,offering_assessment_id,user_id) references private.assessment_participations(id,schedule_id,user_id) on delete restrict;
create index assessment_attempt_participation_idx on public.assessment_attempts(participation_id);
create unique index assessment_one_live_exam_attempt on public.assessment_attempts(offering_assessment_id,user_id) where status='in_progress' and participation_id is not null;
create trigger prevent_participation_reparenting before update on public.assessment_attempts for each row execute function private.reject_reparenting('participation_id');

create table private.assessment_question_outcomes (
 attempt_id uuid not null references public.assessment_attempts(id) on delete restrict,
 question_id uuid not null references public.assessment_questions(id) on delete restrict,
 display_position integer not null check(display_position>=0),
 option_order uuid[] not null default '{}',
 outcome text not null default 'pending' check(outcome in ('pending','correct','incorrect','unanswered','pending_manual','invalid_key','manual')),
 awarded_points numeric(12,3) check(awarded_points>=0 and awarded_points<>'NaN'::numeric),
 evaluated_at timestamptz,
 primary key(attempt_id,question_id), unique(attempt_id,display_position)
);
create index assessment_question_outcomes_question_idx on private.assessment_question_outcomes(question_id);
alter table private.assessment_question_outcomes enable row level security;
revoke all on private.assessment_question_outcomes from public,anon,authenticated;

-- Keep mature validation for non-exam workflows and answer payloads. Renamed
-- implementations are internal only; public wrappers still resolve the new names.
alter function private.start_assessment_attempt(uuid) rename to start_assessment_attempt_v17;
alter function private.save_assessment_response(uuid,uuid,jsonb,uuid) rename to save_assessment_response_v17;
alter function private.submit_assessment_attempt(uuid) rename to submit_assessment_attempt_v17;
alter function private.grade_assessment_response(uuid,numeric,text) rename to grade_assessment_response_v17;
alter function private.finalize_assessment_grade(uuid) rename to finalize_assessment_grade_v17;
alter function private.auto_grade_attempt(uuid) rename to auto_grade_attempt_v17;
revoke all on function private.start_assessment_attempt_v17(uuid),private.save_assessment_response_v17(uuid,uuid,jsonb,uuid),private.submit_assessment_attempt_v17(uuid),private.grade_assessment_response_v17(uuid,numeric,text),private.finalize_assessment_grade_v17(uuid),private.auto_grade_attempt_v17(uuid) from public,anon,authenticated;

create function private.validate_exam_settings() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='offering_assessments' then
  if exists(select 1 from public.assessments a where a.id=new.assessment_id and a.type in ('exam','quiz')) and (new.max_attempts is null or new.max_attempts not in (1,2) or new.time_limit_seconds<60) then
   raise exception 'Exams require 1 or 2 attempts and at least 60 seconds or unlimited duration' using errcode='23514';
  end if;
 elsif new.type in ('exam','quiz') and exists(select 1 from public.offering_assessments s where s.assessment_id=new.id and (s.max_attempts is null or s.max_attempts not in (1,2) or s.time_limit_seconds<60)) then
  raise exception 'Invalid exam schedule settings' using errcode='23514';
 end if;
 return new;
end $$;
create trigger validate_exam_settings before insert or update on public.offering_assessments for each row execute function private.validate_exam_settings();
create trigger validate_exam_settings before update of type on public.assessments for each row execute function private.validate_exam_settings();

-- One order for ALL operations: assessment SHARE, schedule SHARE, advisory lock,
-- enrollment SHARE, participation UPDATE, attempt UPDATE, response/media rows.
create function private.lock_exam(p_schedule uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.assessments a join public.offering_assessments s on s.assessment_id=a.id where s.id=p_schedule for share of a;
 perform 1 from public.offering_assessments where id=p_schedule for share;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_schedule::text||coalesce(p_user::text,'anonymous'),0));
 perform 1 from public.enrollments where offering_id=(select offering_id from public.offering_assessments where id=p_schedule) and user_id=p_user for share;
 perform 1 from private.assessment_participations where schedule_id=p_schedule and user_id=p_user for update;
 perform 1 from public.assessment_attempts where offering_assessment_id=p_schedule and user_id=p_user order by attempt_number for update;
end $$;

-- Enrollment expiry is checked after lock waits using wall-clock time. Keep
-- existing course/tenant authorization; do not modify global is_enrolled semantics.
create function private.exam_enrolled(p_offering uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select private.is_enrolled(p_offering) and exists(select 1 from public.enrollments e where e.offering_id=p_offering and e.user_id=private.current_app_user_id() and e.status='active' and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp()) and (e.expires_at is null or clock_timestamp()<e.expires_at))
$$;

create function private.exam_integrity() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.offering_assessments; p private.assessment_participations; a public.assessment_attempts;
begin
 if tg_table_name='assessment_attempts' then
  select * into s from public.offering_assessments where id=new.offering_assessment_id;
  if exists(select 1 from public.assessments where id=s.assessment_id and type in ('exam','quiz')) then
   select * into p from private.assessment_participations where id=new.participation_id;
   if p.id is null or new.attempt_number not in (1,2) or new.attempt_number>p.max_attempts or (tg_op='INSERT' and new.attempt_number=2 and (p.retry_decision is distinct from 'accepted' or p.attempts_state<>'retry_accepted')) then
    raise exception 'Exam attempt requires authorized participation' using errcode='23514';
   end if;
  elsif new.participation_id is not null then raise exception 'Participation is reserved for exams and quizzes' using errcode='23514'; end if;
 elsif tg_table_name='assessment_participations' then
  if new.final_attempt_id is not null then
   select * into a from public.assessment_attempts where id=new.final_attempt_id;
   if a.participation_id is distinct from new.id or a.status not in ('submitted','graded') or a.attempt_number<>(select max(attempt_number) from public.assessment_attempts where participation_id=new.id) then
    raise exception 'Final paper must be the latest submitted participation attempt' using errcode='23514';
   end if;
  end if;
 elsif tg_table_name='assessment_question_outcomes' then
  if not exists(select 1 from public.assessment_attempts t join public.offering_assessments x on x.id=t.offering_assessment_id join public.assessment_questions q on q.assessment_id=x.assessment_id where t.id=new.attempt_id and q.id=new.question_id and t.participation_id is not null and (new.awarded_points is null or new.awarded_points<=q.points)) then
   raise exception 'Invalid question outcome' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
create trigger exam_integrity before insert or update on public.assessment_attempts for each row execute function private.exam_integrity();
create trigger exam_integrity before insert or update on private.assessment_participations for each row execute function private.exam_integrity();
create trigger exam_integrity before insert or update on private.assessment_question_outcomes for each row execute function private.exam_integrity();

create function private.valid_objective_key(p_question uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare q public.assessment_questions; k jsonb; n integer; c integer;
begin
 select * into q from public.assessment_questions where id=p_question;
 if q.question_type in ('single_choice','multiple_choice','true_false') then
  select count(*),count(*) filter(where is_correct) into n,c from public.assessment_options where question_id=q.id;
  return n>=2 and c>0 and (q.question_type='multiple_choice' or c=1) and (q.question_type<>'true_false' or n=2);
 elsif q.question_type='numeric' then
  select answer into k from private.assessment_answer_keys where question_id=q.id;
  if k->>'kind' is distinct from 'numeric' or jsonb_typeof(k->'value') is distinct from 'number' or jsonb_typeof(k->'absolute_tolerance') is distinct from 'number' then return false; end if;
  return (k->>'absolute_tolerance')::numeric>=0;
 end if;
 return true;
end $$;

-- Does not infer objective correctness from points (zero-point questions exist).
create function private.auto_grade_attempt(p_attempt_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; q record; r public.assessment_responses; correct uuid[]; selected uuid[]; k jsonb; earned numeric; verdict text;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 if a.participation_id is null then perform private.auto_grade_attempt_v17(p_attempt_id); return; end if;
 if a.status<>'submitted' then return; end if;
 for q in select x.* from private.assessment_question_outcomes o join public.assessment_questions x on x.id=o.question_id where o.attempt_id=a.id order by o.display_position loop
  select * into r from public.assessment_responses where attempt_id=a.id and question_id=q.id;
  earned:=null; verdict:='pending_manual';
  if not private.valid_objective_key(q.id) then verdict:='invalid_key';
  elsif r.id is null or (q.question_type in ('short_text','essay') and btrim(r.response->>'text')='') or (q.question_type='file_upload' and r.media_asset_id is null) then earned:=0; verdict:='unanswered';
  elsif q.question_type in ('single_choice','multiple_choice','true_false') then
   select array_agg(id order by id) into correct from public.assessment_options where question_id=q.id and is_correct;
   select array_agg(value::uuid order by value::uuid) into selected from jsonb_array_elements_text(r.response->'option_ids');
   verdict:=case when selected=correct then 'correct' else 'incorrect' end;
   earned:=case when verdict='correct' then q.points else 0 end;
  elsif q.question_type='numeric' then
   select answer into k from private.assessment_answer_keys where question_id=q.id;
   verdict:=case when abs((r.response->>'value')::numeric-(k->>'value')::numeric)<=(k->>'absolute_tolerance')::numeric then 'correct' else 'incorrect' end;
   earned:=case when verdict='correct' then q.points else 0 end;
  end if;
  update private.assessment_question_outcomes set outcome=verdict,awarded_points=earned,evaluated_at=clock_timestamp() where attempt_id=a.id and question_id=q.id;
  if r.id is not null then update public.assessment_responses set awarded_points=earned,feedback=null,graded_by=null,graded_at=case when earned is not null then clock_timestamp() end where id=r.id; end if;
 end loop;
end $$;

create function private.refresh_exam_grade(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p private.assessment_participations; a public.assessment_attempts; total numeric; subjective boolean;
begin
 select * into p from private.assessment_participations where id=p_id;
 if p.attempts_state<>'finalized' then return; end if;
 select * into a from public.assessment_attempts where id=p.final_attempt_id;
 if exists(select 1 from private.assessment_question_outcomes where attempt_id=a.id and awarded_points is null) then return; end if;
 if (select count(*) from private.assessment_question_outcomes where attempt_id=a.id)<>(select count(*) from public.assessment_questions q join public.offering_assessments s on s.assessment_id=q.assessment_id where s.id=a.offering_assessment_id) then raise exception 'Incomplete exam manifest' using errcode='23514'; end if;
 select coalesce(sum(awarded_points),0) into total from private.assessment_question_outcomes where attempt_id=a.id;
 select exists(select 1 from private.assessment_question_outcomes o join public.assessment_questions q on q.id=o.question_id where o.attempt_id=a.id and q.question_type in ('short_text','essay','file_upload') and o.outcome<>'unanswered') into subjective;
 update public.assessment_attempts set score=total,status='graded',graded_at=coalesce(graded_at,clock_timestamp()) where id=a.id;
 update private.assessment_participations set grading_state='complete',released_at=case when not subjective then coalesce(released_at,clock_timestamp()) else released_at end,revision=revision+1 where id=p.id;
end $$;

-- Replace the trigger function too, invalidating any pre-migration cached plan
-- that referenced the renamed v17 grader in a long-lived database connection.
create or replace function private.grade_on_submission() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='submitted' and old.status='in_progress' then perform private.auto_grade_attempt(new.id); end if;
 return new;
end $$;
revoke all on function private.grade_on_submission() from public,anon,authenticated;

create function private.finish_exam_attempt(p_attempt uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations; s public.offering_assessments; eligible boolean;
begin
 select * into a from public.assessment_attempts where id=p_attempt;
 select * into p from private.assessment_participations where id=a.participation_id;
 select * into s from public.offering_assessments where id=a.offering_assessment_id;
 if a.status='in_progress' then
  -- Existing submission trigger invokes the new complete-paper evaluator.
  update public.assessment_attempts set status='submitted',submitted_at=clock_timestamp() where id=a.id;
 elsif a.status in ('submitted','graded') then return;
 else raise exception 'Attempt unavailable' using errcode='42501'; end if;
 eligible:=a.attempt_number=1 and p.max_attempts=2 and (s.closes_at is null or clock_timestamp()<s.closes_at)
  and not exists(select 1 from private.assessment_question_outcomes where attempt_id=a.id and outcome='invalid_key')
  and exists(select 1 from private.assessment_question_outcomes o join public.assessment_questions q on q.id=o.question_id where o.attempt_id=a.id and q.question_type in ('single_choice','multiple_choice','true_false','numeric') and o.outcome in ('incorrect','unanswered'));
 if eligible then
  update private.assessment_participations set attempts_state='retry_decision_pending',revision=revision+1 where id=p.id;
 else
  update private.assessment_participations set attempts_state='finalized',final_attempt_id=a.id,finalized_at=clock_timestamp(),retry_decision=coalesce(retry_decision,case when s.closes_at<=clock_timestamp() then 'window_closed' else 'not_eligible' end),decided_at=coalesce(decided_at,clock_timestamp()),revision=revision+1 where id=p.id;
  perform private.refresh_exam_grade(p.id);
 end if;
end $$;

create function private.reconcile_exam(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p private.assessment_participations; a public.assessment_attempts; s public.offering_assessments;
begin
 select * into p from private.assessment_participations where id=p_id;
 select * into s from public.offering_assessments where id=p.schedule_id;
 select * into a from public.assessment_attempts where participation_id=p.id order by attempt_number desc limit 1;
 if a.status='in_progress' and a.deadline_at<=clock_timestamp() then perform private.finish_exam_attempt(a.id); end if;
 select * into p from private.assessment_participations where id=p_id;
 if p.attempts_state in ('retry_decision_pending','retry_accepted') and s.closes_at<=clock_timestamp() then
  update private.assessment_participations set attempts_state='finalized',final_attempt_id=a.id,finalized_at=clock_timestamp(),retry_decision=coalesce(retry_decision,'window_closed'),decided_at=coalesce(decided_at,clock_timestamp()),revision=revision+1 where id=p.id;
  perform private.refresh_exam_grade(p.id);
 end if;
end $$;

create function private.exam_state(p_schedule uuid,p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p private.assessment_participations; a public.assessment_attempts; s public.offering_assessments; can_start boolean;
begin
 select * into s from public.offering_assessments where id=p_schedule;
 select * into p from private.assessment_participations where schedule_id=p_schedule and user_id=p_user;
 select * into a from public.assessment_attempts where participation_id=p.id order by attempt_number desc limit 1;
 can_start:=private.exam_enrolled(s.offering_id) and s.published and (s.opens_at is null or s.opens_at<=clock_timestamp()) and (s.closes_at is null or clock_timestamp()<s.closes_at) and (p.id is null or p.attempts_state='retry_accepted');
 return jsonb_build_object('schedule_id',p_schedule,'revision',coalesce(p.revision,0),'attempts_state',coalesce(p.attempts_state,'not_started'),'retry_decision',p.retry_decision,
 'can_start',coalesce(can_start,false),'can_decide',coalesce(p.attempts_state='retry_decision_pending' and private.exam_enrolled(s.offering_id) and (s.closes_at is null or clock_timestamp()<s.closes_at),false),
 'current_attempt',case when a.id is not null then jsonb_build_object('id',a.id,'attempt_number',a.attempt_number,'status',a.status,'deadline_at',a.deadline_at) end,
 'grading_state',coalesce(p.grading_state,'pending'),'result_released',p.released_at is not null,'review_released',p.review_released_at is not null,'server_now',clock_timestamp());
end $$;

create function private.start_assessment_attempt(p_offering_assessment_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.offering_assessments; a public.assessments; p private.assessment_participations; t public.assessment_attempts; uid uuid:=private.current_app_user_id(); aid uuid; n integer; started timestamptz; deadline timestamptz;
begin
 perform private.lock_exam(p_offering_assessment_id,uid);
 select * into s from public.offering_assessments where id=p_offering_assessment_id;
 select * into a from public.assessments where id=s.assessment_id;
 if a.type not in ('exam','quiz') then return private.start_assessment_attempt_v17(p_offering_assessment_id); end if;
 if uid is null or not private.exam_enrolled(s.offering_id) or not s.published or a.status<>'published' then raise exception 'Assessment unavailable' using errcode='42501'; end if;
 if (s.opens_at is not null and clock_timestamp()<s.opens_at) or s.closes_at<=clock_timestamp() then raise exception 'Outside assessment window' using errcode='42501'; end if;
 if s.max_attempts is null or s.max_attempts not in (1,2) or s.time_limit_seconds<60 then raise exception 'Invalid exam settings' using errcode='23514'; end if;
 if not exists(select 1 from public.assessment_questions where assessment_id=a.id) or exists(select 1 from public.assessment_questions where assessment_id=a.id and not private.valid_objective_key(id)) then raise exception 'Assessment requires staff correction' using errcode='23514'; end if;
 select * into p from private.assessment_participations where schedule_id=s.id and user_id=uid;
 if p.id is null then
  insert into private.assessment_participations(schedule_id,user_id,max_attempts,duration_seconds) values(s.id,uid,s.max_attempts,s.time_limit_seconds) returning * into p;
 end if;
 select * into t from public.assessment_attempts where participation_id=p.id order by attempt_number desc limit 1;
 if t.status='in_progress' then
  if t.deadline_at is null or clock_timestamp()<t.deadline_at then return t.id; end if;
  raise exception 'Synchronize expired exam before continuing' using errcode='PT409';
 end if;
 n:=coalesce(t.attempt_number,0)+1;
 if n>p.max_attempts or n>2 or (n=2 and (p.retry_decision is distinct from 'accepted' or p.attempts_state<>'retry_accepted')) or p.attempts_state='finalized' then raise exception 'Attempt not authorized' using errcode='42501'; end if;
 started:=clock_timestamp(); deadline:=case when p.duration_seconds is null then s.closes_at else least(s.closes_at,started+make_interval(secs=>p.duration_seconds)) end;
 if deadline<=started then raise exception 'Assessment closed' using errcode='42501'; end if;
 insert into public.assessment_attempts(offering_assessment_id,user_id,attempt_number,participation_id,started_at,deadline_at,max_score) values(s.id,uid,n,p.id,started,deadline,(select sum(points) from public.assessment_questions where assessment_id=a.id)) returning id into aid;
 insert into private.assessment_question_outcomes(attempt_id,question_id,display_position,option_order)
 select aid,q.id,(row_number() over(order by case when s.shuffle_questions then random() end,q.position,q.id)-1)::integer,
 coalesce((select array_agg(o.id order by case when s.shuffle_options then random() end,o.position,o.id) from public.assessment_options o where o.question_id=q.id),'{}'::uuid[]) from public.assessment_questions q where q.assessment_id=a.id;
 update private.assessment_participations set attempts_state='in_progress',revision=revision+1 where id=p.id;
 return aid;
end $$;

create function private.save_assessment_response(p_attempt_id uuid,p_question_id uuid,p_response jsonb,p_media_asset_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; rid uuid;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 perform private.lock_exam(a.offering_assessment_id,a.user_id);
 if a.participation_id is not null and not private.exam_enrolled((select offering_id from public.offering_assessments where id=a.offering_assessment_id)) then raise exception 'Attempt cannot accept answers' using errcode='42501'; end if;
 -- SHARE protects a ready asset through response validation and FK insertion.
 if p_media_asset_id is not null then perform 1 from public.media_assets where id=p_media_asset_id for share; end if;
 rid:=private.save_assessment_response_v17(p_attempt_id,p_question_id,p_response,p_media_asset_id);
 if a.participation_id is not null then update private.assessment_participations set revision=revision+1 where id=a.participation_id; end if;
 return rid;
end $$;

create function private.submit_assessment_attempt(p_attempt_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 perform private.lock_exam(a.offering_assessment_id,a.user_id);
 select * into a from public.assessment_attempts where id=p_attempt_id;
 if a.participation_id is null then perform private.submit_assessment_attempt_v17(p_attempt_id); return; end if;
 if a.user_id is distinct from private.current_app_user_id() or not private.is_active_user() then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 -- A revoked enrollment may freeze existing answers, but never start/save/retry.
 perform private.finish_exam_attempt(a.id);
 perform private.reconcile_exam(a.participation_id);
end $$;

create function private.sync_exam_participation(p_schedule_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.assessment_participations; s public.offering_assessments; uid uuid:=private.current_app_user_id();
begin
 perform private.lock_exam(p_schedule_id,uid);
 select * into s from public.offering_assessments where id=p_schedule_id;
 select * into p from private.assessment_participations where schedule_id=s.id and user_id=uid;
 if uid is null or not exists(select 1 from public.assessments where id=s.assessment_id and type in ('exam','quiz')) or (p.id is null and (not private.exam_enrolled(s.offering_id) or not s.published or not exists(select 1 from public.assessments where id=s.assessment_id and status='published'))) then raise exception 'Exam unavailable' using errcode='42501'; end if;
 if p.id is not null then perform private.reconcile_exam(p.id); end if;
 return private.exam_state(s.id,uid);
end $$;

create function private.decide_exam_retry(p_schedule_id uuid,p_decision text,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.assessment_participations; a public.assessment_attempts; s public.offering_assessments; decision text;
begin
 perform private.lock_exam(p_schedule_id,private.current_app_user_id());
 select * into s from public.offering_assessments where id=p_schedule_id;
 select * into p from private.assessment_participations where schedule_id=s.id and user_id=private.current_app_user_id();
 if p.id is null or not private.exam_enrolled(s.offering_id) then raise exception 'Exam unavailable' using errcode='42501'; end if;
 if p_decision not in ('accept','decline') or p_decision is null then raise exception 'Invalid decision' using errcode='23514'; end if;
 decision:=case when p_decision='accept' then 'accepted' else 'declined' end;
 perform private.reconcile_exam(p.id);
 select * into p from private.assessment_participations where id=p.id;
 if p.retry_decision=decision then return private.exam_state(s.id,p.user_id); end if;
 if p.revision is distinct from p_expected_revision or p.attempts_state<>'retry_decision_pending' or p.retry_decision is not null then raise exception 'Retry decision conflict' using errcode='PT409'; end if;
 if s.closes_at<=clock_timestamp() then raise exception 'Retry window closed' using errcode='PT409'; end if;
 select * into a from public.assessment_attempts where participation_id=p.id order by attempt_number desc limit 1;
 update private.assessment_participations set retry_decision=decision,decided_at=clock_timestamp(),attempts_state=case when decision='accepted' then 'retry_accepted' else 'finalized' end,
 final_attempt_id=case when decision='declined' then a.id end,finalized_at=case when decision='declined' then clock_timestamp() end,revision=revision+1 where id=p.id;
 if decision='declined' then perform private.refresh_exam_grade(p.id); end if;
 return private.exam_state(s.id,p.user_id);
end $$;

create function private.save_exam_response(p_attempt_id uuid,p_question_id uuid,p_response jsonb,p_media_asset_id uuid,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations; r public.assessment_responses;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 perform private.lock_exam(a.offering_assessment_id,a.user_id);
 select * into a from public.assessment_attempts where id=p_attempt_id;
 select * into p from private.assessment_participations where id=a.participation_id;
 if p.id is null or a.user_id is distinct from private.current_app_user_id() or not private.exam_enrolled((select offering_id from public.offering_assessments where id=a.offering_assessment_id)) or a.status<>'in_progress' or a.deadline_at<=clock_timestamp() then raise exception 'Attempt cannot accept answers' using errcode='42501'; end if;
 if not exists(select 1 from private.assessment_question_outcomes where attempt_id=a.id and question_id=p_question_id) then raise exception 'Invalid question' using errcode='23514'; end if;
 if p_response is null and p_media_asset_id is not null then raise exception 'Cannot attach a file to a cleared answer' using errcode='23514'; end if;
 select * into r from public.assessment_responses where attempt_id=a.id and question_id=p_question_id;
 if (p_response is null and r.id is null) or (r.id is not null and r.response=p_response and r.media_asset_id is not distinct from p_media_asset_id) then return private.exam_state(p.schedule_id,p.user_id); end if;
 if p.revision is distinct from p_expected_revision then raise exception 'Stale answer revision' using errcode='PT409'; end if;
 if p_response is null then
  if p_media_asset_id is not null then raise exception 'Cannot attach a file to a cleared answer' using errcode='23514'; end if;
  delete from public.assessment_responses where id=r.id;
  update private.assessment_participations set revision=revision+1 where id=p.id;
 else perform private.save_assessment_response(a.id,p_question_id,p_response,p_media_asset_id); end if;
 return private.exam_state(p.schedule_id,p.user_id);
end $$;

create function private.grade_assessment_response(p_response_id uuid,p_points numeric,p_feedback text default null) returns void language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations; q uuid;
begin
 select t.* into a from public.assessment_attempts t join public.assessment_responses r on r.attempt_id=t.id where r.id=p_response_id;
 -- Resolve question separately so the composite attempt row remains stable.
 select question_id into q from public.assessment_responses where id=p_response_id;
 perform private.lock_exam(a.offering_assessment_id,a.user_id);
 select * into p from private.assessment_participations where id=a.participation_id;
 if p.released_at is not null then raise exception 'Released grades are immutable' using errcode='42501'; end if;
 perform private.grade_assessment_response_v17(p_response_id,p_points,p_feedback);
 if p.id is not null then
  update private.assessment_question_outcomes set awarded_points=p_points,outcome=case when outcome in ('pending_manual','invalid_key') then 'manual' else outcome end,evaluated_at=clock_timestamp() where attempt_id=a.id and question_id=q;
  update private.assessment_participations set revision=revision+1 where id=p.id;
 end if;
end $$;

create function private.finalize_assessment_grade(p_attempt_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 perform private.lock_exam(a.offering_assessment_id,a.user_id);
 if not private.can_support_offering((select offering_id from public.offering_assessments where id=a.offering_assessment_id)) then raise exception 'Grading not permitted' using errcode='42501'; end if;
 if a.participation_id is null then perform private.finalize_assessment_grade_v17(p_attempt_id); return; end if;
 perform private.reconcile_exam(a.participation_id);
 select * into p from private.assessment_participations where id=a.participation_id;
 if p.attempts_state<>'finalized' or p.final_attempt_id<>a.id then raise exception 'Finalize attempts before the final paper grade' using errcode='23514'; end if;
 if p.grading_state='complete' then return; end if;
 if exists(select 1 from private.assessment_question_outcomes where attempt_id=a.id and awarded_points is null) then raise exception 'Grade every question first' using errcode='23514'; end if;
 perform private.refresh_exam_grade(p.id);
end $$;

create function private.release_exam_result(p_schedule_id uuid,p_user_id uuid,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.assessment_participations;
begin
 perform private.lock_exam(p_schedule_id,p_user_id);
 if not private.can_support_offering((select offering_id from public.offering_assessments where id=p_schedule_id)) then raise exception 'Release not permitted' using errcode='42501'; end if;
 select * into p from private.assessment_participations where schedule_id=p_schedule_id and user_id=p_user_id;
 if p.id is null then raise exception 'Result unavailable' using errcode='42501'; end if;
 if p.released_at is not null then return private.exam_state(p_schedule_id,p_user_id); end if;
 if p.revision is distinct from p_expected_revision then raise exception 'Stale result revision' using errcode='PT409'; end if;
 if p.attempts_state<>'finalized' or p.grading_state<>'complete' then raise exception 'Result is under correction' using errcode='23514'; end if;
 update private.assessment_participations set released_at=clock_timestamp(),released_by=private.current_app_user_id(),revision=revision+1 where id=p.id;
 return private.exam_state(p_schedule_id,p_user_id);
end $$;

create function private.release_exam_review(p_schedule_id uuid,p_user_id uuid,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.assessment_participations; s public.offering_assessments;
begin
 perform private.lock_exam(p_schedule_id,p_user_id);
 select * into s from public.offering_assessments where id=p_schedule_id;
 if not private.can_support_offering(s.offering_id) then raise exception 'Review release not permitted' using errcode='42501'; end if;
 select * into p from private.assessment_participations where schedule_id=s.id and user_id=p_user_id;
 if p.id is null then raise exception 'Result unavailable' using errcode='42501'; end if;
 if p.review_released_at is not null then return private.exam_state(s.id,p_user_id); end if;
 if p.revision is distinct from p_expected_revision then raise exception 'Stale review revision' using errcode='PT409'; end if;
 if p.released_at is null or s.closes_at>clock_timestamp() then raise exception 'Review is not available yet' using errcode='23514'; end if;
 update private.assessment_participations set review_released_at=clock_timestamp(),review_released_by=private.current_app_user_id(),revision=revision+1 where id=p.id;
 return private.exam_state(s.id,p_user_id);
end $$;

create or replace function private.get_assessment_results(p_attempt_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations; staff boolean; review boolean;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 select * into p from private.assessment_participations where id=a.participation_id;
 staff:=private.can_support_offering((select offering_id from public.offering_assessments where id=a.offering_assessment_id));
 if a.id is null or not (staff or (a.user_id=private.current_app_user_id() and private.is_active_user() and ((a.participation_id is null and a.status='graded') or (p.released_at is not null and p.final_attempt_id=a.id)))) then raise exception 'Results unavailable' using errcode='42501'; end if;
 review:=staff or a.participation_id is null or p.review_released_at is not null;
 return jsonb_build_object('attempt_id',a.id,'score',a.score,'max_score',a.max_score,'status',a.status,'responses',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'question_id',r.question_id,'awarded_points',case when review then r.awarded_points end,'feedback',case when review then r.feedback end,'graded_at',case when review then r.graded_at end) order by r.question_id) from public.assessment_responses r where r.attempt_id=a.id),'[]'::jsonb));
end $$;

create function private.get_exam_grading_detail(p_attempt_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assessment_attempts; p private.assessment_participations;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 if a.id is null or not private.can_support_offering((select offering_id from public.offering_assessments where id=a.offering_assessment_id)) then raise exception 'Grading not permitted' using errcode='42501'; end if;
 select * into p from private.assessment_participations where id=a.participation_id;
 return jsonb_build_object('state',private.exam_state(a.offering_assessment_id,a.user_id),'result',private.get_assessment_results(a.id),'questions',coalesce((select jsonb_agg(jsonb_build_object('question_id',o.question_id,'outcome',o.outcome,'awarded_points',o.awarded_points,'response_id',r.id,'response',r.response,'media_asset_id',r.media_asset_id) order by o.display_position) from private.assessment_question_outcomes o left join public.assessment_responses r on r.attempt_id=o.attempt_id and r.question_id=o.question_id where o.attempt_id=a.id),'[]'::jsonb));
end $$;

create function private.get_exam_review(p_schedule_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p private.assessment_participations;
begin
 select * into p from private.assessment_participations where schedule_id=p_schedule_id and user_id=private.current_app_user_id();
 if p.review_released_at is null or not private.is_active_user() then raise exception 'Review unavailable' using errcode='42501'; end if;
 return jsonb_build_object('schedule_id',p_schedule_id,'final_attempt_id',p.final_attempt_id,'questions',coalesce((select jsonb_agg(jsonb_build_object('question_id',q.id,'correct_option_ids',(select coalesce(jsonb_agg(id order by position),'[]'::jsonb) from public.assessment_options where question_id=q.id and is_correct),'numeric_key',case when q.question_type='numeric' then k.answer end,'attempts',(select jsonb_agg(jsonb_build_object('attempt_number',a.attempt_number,'response',r.response,'media_asset_id',r.media_asset_id,'awarded_points',o.awarded_points,'feedback',r.feedback) order by a.attempt_number) from public.assessment_attempts a join private.assessment_question_outcomes o on o.attempt_id=a.id and o.question_id=q.id left join public.assessment_responses r on r.attempt_id=a.id and r.question_id=q.id where a.participation_id=p.id)) order by q.position) from public.assessment_questions q left join private.assessment_answer_keys k on k.question_id=q.id where q.assessment_id=(select assessment_id from public.offering_assessments where id=p_schedule_id)),'[]'::jsonb));
end $$;

create function private.get_exam_attempt_content(p_attempt_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assessment_attempts;
begin
 select * into a from public.assessment_attempts where id=p_attempt_id;
 if a.id is null or a.participation_id is null or a.user_id is distinct from private.current_app_user_id() or not private.exam_enrolled((select offering_id from public.offering_assessments where id=a.offering_assessment_id)) then raise exception 'Exam unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'position',o.display_position,'question_type',q.question_type,'prompt',q.prompt,'points',q.points,'settings',q.settings,'options',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'text',x.text) order by array_position(o.option_order,x.id)),'[]'::jsonb) from public.assessment_options x where x.question_id=q.id),'response',r.response,'media_asset_id',r.media_asset_id) order by o.display_position) from private.assessment_question_outcomes o join public.assessment_questions q on q.id=o.question_id left join public.assessment_responses r on r.attempt_id=o.attempt_id and r.question_id=o.question_id where o.attempt_id=a.id),'[]'::jsonb);
end $$;

create function private.get_exam_summaries(p_schedule_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.current_app_user_id(); result jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_schedule_ids is null or cardinality(p_schedule_ids)>100 then raise exception 'At most 100 schedules' using errcode='23514'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('schedule_id',s.id,'state',private.exam_state(s.id,uid),'attempts',coalesce((select jsonb_agg(jsonb_build_object('attempt_number',a.attempt_number,'status',a.status,'started_at',a.started_at,'deadline_at',a.deadline_at,'submitted_at',a.submitted_at,'result_released',p.released_at is not null and p.final_attempt_id=a.id,'score',case when p.released_at is not null and p.final_attempt_id=a.id then a.score end,'max_score',case when p.released_at is not null and p.final_attempt_id=a.id then a.max_score end) order by a.attempt_number) from public.assessment_attempts a left join private.assessment_participations p on p.id=a.participation_id where a.offering_assessment_id=s.id and a.user_id=uid),'[]'::jsonb))),'[]'::jsonb) into result
 from public.offering_assessments s join public.assessments x on x.id=s.assessment_id where s.id=any(p_schedule_ids) and x.type in ('exam','quiz') and (private.can_support_offering(s.offering_id) or (s.published and x.status='published' and private.exam_enrolled(s.offering_id)));
 return result;
end $$;

-- Explicit grants for deliberate entry points only; all internal helpers denied.
do $$ declare f record; sig text; args text; ret text; fname text;
begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('validate_exam_settings','lock_exam','exam_enrolled','exam_integrity','valid_objective_key','auto_grade_attempt','refresh_exam_grade','finish_exam_attempt','reconcile_exam','exam_state') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
 for sig,args,ret in select * from (values
 ('start_assessment_attempt(p_offering_assessment_id uuid)','p_offering_assessment_id','uuid'),
 ('save_assessment_response(p_attempt_id uuid,p_question_id uuid,p_response jsonb,p_media_asset_id uuid default null)','p_attempt_id,p_question_id,p_response,p_media_asset_id','uuid'),
 ('submit_assessment_attempt(p_attempt_id uuid)','p_attempt_id','void'),
 ('grade_assessment_response(p_response_id uuid,p_points numeric,p_feedback text default null)','p_response_id,p_points,p_feedback','void'),
 ('finalize_assessment_grade(p_attempt_id uuid)','p_attempt_id','void'),
 ('sync_exam_participation(p_schedule_id uuid)','p_schedule_id','jsonb'),
 ('decide_exam_retry(p_schedule_id uuid,p_decision text,p_expected_revision bigint)','p_schedule_id,p_decision,p_expected_revision','jsonb'),
 ('save_exam_response(p_attempt_id uuid,p_question_id uuid,p_response jsonb,p_media_asset_id uuid,p_expected_revision bigint)','p_attempt_id,p_question_id,p_response,p_media_asset_id,p_expected_revision','jsonb'),
 ('release_exam_result(p_schedule_id uuid,p_user_id uuid,p_expected_revision bigint)','p_schedule_id,p_user_id,p_expected_revision','jsonb'),
 ('release_exam_review(p_schedule_id uuid,p_user_id uuid,p_expected_revision bigint)','p_schedule_id,p_user_id,p_expected_revision','jsonb'),
 ('get_exam_grading_detail(p_attempt_id uuid)','p_attempt_id','jsonb'),
 ('get_exam_review(p_schedule_id uuid)','p_schedule_id','jsonb'),
 ('get_exam_attempt_content(p_attempt_id uuid)','p_attempt_id','jsonb'),
 ('get_exam_summaries(p_schedule_ids uuid[])','p_schedule_ids','jsonb')) v(sig,args,ret) loop
  fname:=split_part(sig,'(',1);
  execute format('revoke all on function private.%I from public,anon',fname);
  execute format('grant execute on function private.%I to authenticated',fname);
  execute format('create or replace function public.%s returns %s language sql security invoker set search_path='''' as $fn$ select private.%I(%s) $fn$',sig,ret,fname,args);
  execute format('revoke all on function public.%I from public,anon',fname);
  execute format('grant execute on function public.%I to authenticated',fname);
 end loop;
end $$;
notify pgrst,'reload schema';
