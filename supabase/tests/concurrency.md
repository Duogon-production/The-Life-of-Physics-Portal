# Concurrent database regression tests

Executed on development project `gmvouqgjbtbkbhrdruzu` on 2026-10-10 through two concurrent official MCP calls per stage. These use real PostgreSQL transactions and `authenticated` database roles, with simulated JWT claims; they are not real-login HTTP capacity tests.

The fixture INSERT must fail on an existing ID. Do not reuse/delete an unrelated fixture. Only the rows newly created by this test are cleaned up. No auth users, existing courses, enrollments or academic records are removed.

1. Run setup below once. Launch capacity workers in two independent sessions concurrently. Expect one `admitted`, one `capacity_rejected`, and exactly one active enrollment.
2. Add the scheduled assessment. Launch the start worker twice concurrently. Expect exactly one attempt, number 1.
3. Launch the save worker twice concurrently. Expect exactly one response.
4. Launch the submit worker twice concurrently. Expect submitted status and 2 points for that single response.
5. Inspect results, then run the narrowly scoped cleanup. Baseline restored: 3 offerings, 3 enrollments, 0 attempts. Rerun both rollback SQL suites.

## Setup

```sql
begin;
insert into public.course_offerings(id,course_id,name,delivery_mode,status,capacity) values('e1000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','[test-only] concurrency capacity fixture','scheduled','active',1);
commit;
```

## Capacity worker A

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$ begin
 begin
 insert into public.enrollments(offering_id,user_id,status,enrolled_at) values('e1000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','active',now());
 perform pg_sleep(0.5);
 perform set_config('test.capacity_result','admitted',true);
 exception when check_violation then perform set_config('test.capacity_result','capacity_rejected',true);
 end;
end $$;
select current_setting('test.capacity_result') as result;
commit;
```

## Capacity worker B

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$ begin
 begin
 insert into public.enrollments(offering_id,user_id,status,enrolled_at) values('e1000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','active',now());
 perform pg_sleep(0.5);
 perform set_config('test.capacity_result','admitted',true);
 exception when check_violation then perform set_config('test.capacity_result','capacity_rejected',true);
 end;
end $$;
select current_setting('test.capacity_result') as result;
commit;
```

## Schedule

```sql
insert into public.offering_assessments(id,offering_id,assessment_id,published,max_attempts,time_limit_seconds) values('e2000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001',true,2,600);
```

## Start worker

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
select public.start_assessment_attempt('e2000000-0000-0000-0000-000000000001') as attempt_id;
select pg_sleep(0.5);
commit;
```

## Save worker

```sql
begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);select public.save_assessment_response((select id from public.assessment_attempts where offering_assessment_id='e2000000-0000-0000-0000-000000000001'),'80000000-0000-0000-0000-000000000001','{"option_ids":["90000000-0000-0000-0000-000000000001"]}'); select pg_sleep(0.25); commit;
```

## Submit worker

```sql
begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);select public.submit_assessment_attempt((select id from public.assessment_attempts where offering_assessment_id='e2000000-0000-0000-0000-000000000001')); select pg_sleep(0.25); commit;
```

## Cleanup

```sql
-- Remove ONLY synthetic rows created by this concurrency test. Never existing user records.
begin;
do $$ begin
 if not exists(select 1 from public.course_offerings where id='e1000000-0000-0000-0000-000000000001' and name='[test-only] concurrency capacity fixture' and course_id='30000000-0000-0000-0000-000000000001') then raise exception 'Test fixture identity mismatch'; end if;
end $$;
delete from public.assessment_responses r using public.assessment_attempts a,public.offering_assessments oa where r.attempt_id=a.id and a.offering_assessment_id=oa.id and oa.offering_id='e1000000-0000-0000-0000-000000000001';
delete from public.assessment_attempts a using public.offering_assessments oa where a.offering_assessment_id=oa.id and oa.offering_id='e1000000-0000-0000-0000-000000000001';
delete from public.offering_assessments where offering_id='e1000000-0000-0000-0000-000000000001';
delete from public.enrollments where offering_id='e1000000-0000-0000-0000-000000000001';
delete from public.course_offerings where id='e1000000-0000-0000-0000-000000000001' and name='[test-only] concurrency capacity fixture';
commit;
select (select count(*) from public.course_offerings) as offerings,(select count(*) from public.enrollments) as enrollments,(select count(*) from public.assessment_attempts) as attempts;
```
