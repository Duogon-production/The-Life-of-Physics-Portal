-- Run against a seeded DEVELOPMENT database as postgres. Every change rolls back.
-- Uses actual anon/authenticated roles and auth.uid JWT claims, not mocked policies.
begin;
create temp table test_results(name text primary key,passed boolean not null);
grant select,insert on test_results to authenticated,anon;
create function pg_temp.assert_true(value boolean,name text) returns void language plpgsql set search_path = '' as $$
begin
 if value is distinct from true then raise exception 'FAILED: %',name; end if;
 insert into pg_temp.test_results values(name,true);
end $$;
create function pg_temp.expect_error(statement text,state text,name text) returns void language plpgsql set search_path = '' as $$
declare caught text;
begin
 begin execute statement;
 exception when others then get stacked diagnostics caught=returned_sqlstate; end;
 if caught is distinct from state then raise exception 'FAILED: %, expected %, got %',name,state,caught; end if;
 insert into pg_temp.test_results values(name,true);
end $$;

select pg_temp.assert_true((select count(*)=19 and bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),'all 19 public tables have RLS');
select pg_temp.assert_true((select count(*)=7 from public.profiles),'auth trigger created all seed profiles');
select pg_temp.assert_true(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role'),'no global user role');
select pg_temp.assert_true(not exists(select 1 from storage.buckets where id in ('lms-course-media','lms-submissions') and public),'buckets are private');
select pg_temp.assert_true(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.prosecdef and not coalesce(p.proconfig,array[]::text[]) @> array['search_path=""']),'definer functions have fixed empty search path');

-- Another student's records exist, so isolation assertions are non-vacuous.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000006","role":"authenticated"}',true);
select set_config('test.other_attempt',public.start_assessment_attempt('a0000000-0000-0000-0000-000000000002')::text,true);
select set_config('test.other_response',public.save_assessment_response(current_setting('test.other_attempt')::uuid,'80000000-0000-0000-0000-000000000001','{"option_ids":["90000000-0000-0000-0000-000000000002"]}')::text,true);

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
select pg_temp.assert_true((select count(*)=1 from public.courses),'student sees only enrolled course');
select pg_temp.assert_true((select count(*)=1 from public.course_offerings),'student cannot see sibling cohort');
select pg_temp.assert_true((select count(*)=1 from public.lessons),'student cannot see draft/other tenant lessons');
select pg_temp.assert_true((select count(*)=1 from public.enrollments),'student cannot read peer enrollment');
select pg_temp.assert_true((select count(*)=1 from public.profiles),'student cannot read peer profile/phone');
select pg_temp.assert_true((select count(*)=0 from public.lesson_progress),'student cannot read peer progress');
select pg_temp.assert_true((select count(*)=0 from public.assessment_attempts),'student cannot read peer attempt');
select pg_temp.assert_true((select count(*)=0 from public.assessment_responses),'student cannot read peer responses');
select pg_temp.assert_true((select count(*)=2 from public.assessment_options),'student can read safe option columns');
select pg_temp.expect_error('select is_correct from public.assessment_options','42501','student cannot select correctness');
select pg_temp.expect_error('select * from public.assessment_options','42501','wildcard cannot expose answer keys');
select pg_temp.expect_error('select * from private.assessment_answer_keys','42501','private grading data is inaccessible');
select pg_temp.expect_error($sql$select public.get_assessment_answer_keys('70000000-0000-0000-0000-000000000001')$sql$,'42501','answer key RPC denies student');
select pg_temp.expect_error($sql$update public.profiles set status='active'$sql$,'42501','student cannot change account status');
select pg_temp.expect_error($sql$insert into public.course_modules(course_id,title,position) values('30000000-0000-0000-0000-000000000001','attack',9)$sql$,'42501','student cannot insert teacher content');
do $$ declare n integer; begin
 update public.lessons set title='attack'; get diagnostics n=row_count;
 perform pg_temp.assert_true(n=0,'student cannot update teacher content');
end $$;
select pg_temp.expect_error($sql$insert into public.enrollments(offering_id,user_id,status) values('60000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000005','active')$sql$,'42501','student cannot self enroll');
select pg_temp.expect_error($sql$insert into public.lesson_progress(offering_id,lesson_id,user_id) values('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006')$sql$,'42501','student cannot write peer progress');
select pg_temp.expect_error($sql$insert into public.lesson_progress(offering_id,lesson_id,user_id) values('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000005')$sql$,'23514','progress rejects cross-course lesson');
insert into public.lesson_progress(offering_id,lesson_id,user_id,status,started_at) values('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','in_progress',now());
update public.lesson_progress set status='completed',completed_at=now() where user_id=auth.uid();
select pg_temp.assert_true((select count(*)=1 from public.lesson_progress where status='completed'),'student can update own progress');
select pg_temp.expect_error($sql$select public.start_assessment_attempt('a0000000-0000-0000-0000-000000000002')$sql$,'42501','student cannot start unenrolled offering assessment');
select pg_temp.expect_error($sql$insert into public.assessment_attempts(offering_assessment_id,user_id,attempt_number) values('a0000000-0000-0000-0000-000000000001',auth.uid(),99)$sql$,'42501','attempt insert requires checked RPC');
select set_config('test.attempt',public.start_assessment_attempt('a0000000-0000-0000-0000-000000000001')::text,true);
select pg_temp.assert_true(public.start_assessment_attempt('a0000000-0000-0000-0000-000000000001')=current_setting('test.attempt')::uuid,'start RPC resumes current attempt');
select pg_temp.expect_error($sql$update public.assessment_attempts set score=999,status='graded'$sql$,'42501','student cannot assign grade');
select pg_temp.expect_error(format('select public.save_assessment_response(%L::uuid,%L::uuid,%L::jsonb)',current_setting('test.other_attempt'),'80000000-0000-0000-0000-000000000001','{"option_ids":["90000000-0000-0000-0000-000000000001"]}'),'42501','student cannot answer peer attempt');
select pg_temp.expect_error(format('select public.save_assessment_response(%L::uuid,%L::uuid,%L::jsonb)',current_setting('test.attempt'),'80000000-0000-0000-0000-000000000001','{"option_ids":["90000000-0000-0000-0000-000000000001"],"awarded_points":2}'),'23514','response rejects extra grading payload');
select set_config('test.response',public.save_assessment_response(current_setting('test.attempt')::uuid,'80000000-0000-0000-0000-000000000001','{"option_ids":["90000000-0000-0000-0000-000000000001"]}')::text,true);
select public.submit_assessment_attempt(current_setting('test.attempt')::uuid);
select pg_temp.expect_error(format('select public.get_assessment_results(%L::uuid)',current_setting('test.attempt')),'42501','results withheld until finalized grading');
select pg_temp.expect_error(format('select public.save_assessment_response(%L::uuid,%L::uuid,%L::jsonb)',current_setting('test.attempt'),'80000000-0000-0000-0000-000000000001','{"option_ids":["90000000-0000-0000-0000-000000000002"]}'),'42501','submitted answers are immutable');
select pg_temp.expect_error(format('select public.grade_assessment_response(%L::uuid,2)',current_setting('test.response')),'42501','student cannot invoke grader');
-- Test legitimate organization bootstrap: identities have contextual roles.
select set_config('test.created_org',public.create_organization('Temporary test tenant','temporary-rls-test')::text,true);
select pg_temp.assert_true(private.has_org_role(current_setting('test.created_org')::uuid,array['owner']),'atomic organization bootstrap gives contextual owner');

-- Organization A owner has no role in B.
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select pg_temp.assert_true((select count(*)=0 from public.courses where organization_id='20000000-0000-0000-0000-000000000002'),'teacher A cannot read private tenant B course');
select pg_temp.assert_true((select count(*)=0 from public.enrollments where offering_id='60000000-0000-0000-0000-000000000003'),'teacher A cannot read tenant B roster');
select pg_temp.assert_true((select count(*)=0 from public.profiles where id='10000000-0000-0000-0000-000000000007'),'teacher A cannot read tenant B student');
select pg_temp.expect_error($sql$insert into public.course_modules(course_id,title,position) values('30000000-0000-0000-0000-000000000002','attack',8)$sql$,'42501','teacher A cannot write tenant B course');
select pg_temp.expect_error($sql$update public.organization_memberships set status='suspended' where user_id=auth.uid()$sql$,'23514','last active owner cannot be removed');
select pg_temp.expect_error($sql$update public.assessment_questions set prompt='changed' where id='80000000-0000-0000-0000-000000000001'$sql$,'23514','attempted assessment questions freeze');
select pg_temp.expect_error($sql$update public.assessment_options set is_correct=false where id='90000000-0000-0000-0000-000000000001'$sql$,'23514','attempted assessment answer keys freeze');
select pg_temp.expect_error($sql$update public.assessments set instructions='changed' where id='70000000-0000-0000-0000-000000000001'$sql$,'23514','attempted assessment metadata freezes');
select pg_temp.expect_error($sql$update public.offering_assessments set max_attempts=99 where id='a0000000-0000-0000-0000-000000000001'$sql$,'23514','attempted assessment delivery config freezes');
select set_config('test.clone',public.clone_assessment('70000000-0000-0000-0000-000000000001')::text,true);
select pg_temp.assert_true((select version=2 and status='draft' from public.assessments where id=current_setting('test.clone')::uuid),'cloning creates draft next version');

-- Assigned instructor also has an independent admin role in organization B.
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select pg_temp.assert_true(private.has_org_role('20000000-0000-0000-0000-000000000001',array['teacher']) and private.has_org_role('20000000-0000-0000-0000-000000000002',array['admin']),'different tenant roles work');
select pg_temp.assert_true((select count(*)=3 from public.enrollments),'instructor and admin can see authorized rosters');
update public.courses set title='Admin updated title' where id='30000000-0000-0000-0000-000000000002';
select pg_temp.assert_true((select title='Admin updated title' from public.courses where id='30000000-0000-0000-0000-000000000002'),'tenant admin can manage course');
select pg_temp.assert_true(jsonb_array_length(public.get_assessment_answer_keys('70000000-0000-0000-0000-000000000001'))=1,'assigned instructor can retrieve grading keys');
select pg_temp.expect_error(format('select public.grade_assessment_response(%L::uuid,3)',current_setting('test.response')),'23514','grade cannot exceed question points');
select public.grade_assessment_response(current_setting('test.response')::uuid,2,'Correct');
select public.finalize_assessment_grade(current_setting('test.attempt')::uuid);
select pg_temp.assert_true((public.get_assessment_results(current_setting('test.attempt')::uuid)->>'score')::numeric=2,'instructor can finalize legitimate grade');

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
select pg_temp.assert_true(private.can_edit_course('30000000-0000-0000-0000-000000000001'),'assigned editor can author course');
select pg_temp.assert_true(private.can_support_offering('60000000-0000-0000-0000-000000000001') and not private.can_support_offering('60000000-0000-0000-0000-000000000002'),'teaching assistant roster scope is assigned offering');
select pg_temp.assert_true(not private.can_manage_offering('60000000-0000-0000-0000-000000000001'),'teaching assistant cannot manage offering/enrollment');

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
select pg_temp.assert_true((public.get_assessment_results(current_setting('test.attempt')::uuid)->>'score')::numeric=2,'student can read released own grade');
select pg_temp.expect_error(format('select public.get_assessment_results(%L::uuid)',current_setting('test.other_attempt')),'42501','student cannot retrieve peer results');
select pg_temp.expect_error('select awarded_points,feedback from public.assessment_responses','42501','direct grade fields require results RPC');
select set_config('test.attempt2',public.start_assessment_attempt('a0000000-0000-0000-0000-000000000001')::text,true);
select public.submit_assessment_attempt(current_setting('test.attempt2')::uuid);
select pg_temp.expect_error($sql$select public.start_assessment_attempt('a0000000-0000-0000-0000-000000000001')$sql$,'42501','max attempts enforced');

-- Submission uploads require tenant/owner/enrollment-bound metadata.
insert into public.media_assets(id,organization_id,uploaded_by,offering_id,kind,mime_type,original_filename,bucket,object_path)
values('b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',auth.uid(),'60000000-0000-0000-0000-000000000001','submission','application/pdf','homework.pdf','lms-submissions','20000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001/homework.pdf');
select pg_temp.assert_true(private.can_upload_media('lms-submissions','20000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001/homework.pdf'),'student can upload registered own submission');
select pg_temp.expect_error($sql$select public.complete_media_upload('b0000000-0000-0000-0000-000000000001')$sql$,'23514','upload completion requires actual storage object');
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000006","role":"authenticated"}',true);
select pg_temp.assert_true((select count(*)=0 from public.media_assets),'student cannot read peer submission assets');
select pg_temp.assert_true(not private.can_upload_media('lms-submissions','20000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001/homework.pdf'),'student cannot upload over peer metadata');

reset role;
update public.enrollments set status='suspended' where offering_id='60000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000005';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
select pg_temp.assert_true((select count(*)=0 from public.courses),'suspended enrollment cannot access private content');
select pg_temp.assert_true(not private.can_upload_media('lms-submissions','20000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001/homework.pdf'),'suspended enrollment cannot upload');
select pg_temp.assert_true((public.get_assessment_results(current_setting('test.attempt')::uuid)->>'score')::numeric=2,'own historical grade survives enrollment suspension');
reset role;
update public.organization_memberships set status='suspended' where organization_id='20000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select pg_temp.assert_true((select count(*)=0 from public.courses where organization_id='20000000-0000-0000-0000-000000000001'),'suspended staff membership revokes assigned course access');
select pg_temp.assert_true(private.has_org_role('20000000-0000-0000-0000-000000000002',array['admin']),'suspension in A preserves independent role in B');
select pg_temp.expect_error($sql$select public.get_assessment_answer_keys('70000000-0000-0000-0000-000000000001')$sql$,'42501','suspended course staff loses grading keys');

reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select pg_temp.expect_error('select * from public.courses','42501','anonymous cannot read private catalog');
select pg_temp.expect_error('select * from public.profiles','42501','anonymous cannot read profiles');
select pg_temp.expect_error($sql$select public.create_organization('attack','attack')$sql$,'42501','anonymous cannot invoke write RPC');
reset role;
select jsonb_build_object('passed',count(*),'failed',0,'checks',jsonb_agg(name order by name)) as authorization_test_results from test_results;
rollback;
