-- DEVELOPMENT ONLY. Simulated gateway claims test PostgreSQL authorization, not
-- Firebase signature verification. Real-token HTTP tests are a separate suite.
begin;
create temp table test_results(name text primary key, passed boolean not null);
grant select,insert on test_results to authenticated,anon;
create function pg_temp.assert_true(value boolean,name text) returns void language plpgsql set search_path='' as $$
begin if value is distinct from true then raise exception 'FAILED: %',name; end if; insert into pg_temp.test_results values(name,true); end $$;
create function pg_temp.expect_denied(statement text,name text) returns void language plpgsql set search_path='' as $$
declare caught text;
begin begin execute statement; exception when others then get stacked diagnostics caught=returned_sqlstate; end;
if caught is distinct from '42501' then raise exception 'FAILED: %, got %',name,caught; end if;
insert into pg_temp.test_results values(name,true); end $$;
create function pg_temp.firebase_claims(subject text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('iss','https://securetoken.google.com/diagonproduction','aud','diagonproduction','role','authenticated','email_verified',true,'auth_time',floor(extract(epoch from now()))::bigint,'sub',subject)::text,true); end $$;

insert into private.external_identities(profile_id,provider,issuer,subject,verified_at)
select id,'firebase','https://securetoken.google.com/diagonproduction','firebase-fixture-'||right(id::text,12),now() from public.profiles;
set local role authenticated;
select pg_temp.firebase_claims('firebase-fixture-000000000005');
select pg_temp.assert_true(public.current_profile_id()='10000000-0000-0000-0000-000000000005','string subject resolves stable UUID');
select pg_temp.assert_true(public.onboard_firebase_profile()=public.current_profile_id(),'onboarding preserves mapped profile');
select pg_temp.assert_true((select count(*)=1 from public.courses),'Firebase student sees enrolled course only');
select pg_temp.assert_true((select count(*)=1 from public.enrollments),'Firebase student sees own enrollment only');
select pg_temp.assert_true((select count(*)=0 from public.profiles where id='10000000-0000-0000-0000-000000000006'),'Firebase student cannot see peer');
select pg_temp.expect_denied('select is_correct from public.assessment_options','Firebase cannot read answer keys');
select pg_temp.expect_denied($s$insert into public.course_modules(course_id,title,position) values('30000000-0000-0000-0000-000000000001','attack',99)$s$,'Firebase cannot author teacher content');
select pg_temp.expect_denied($s$select public.start_assessment_attempt('a0000000-0000-0000-0000-000000000002')$s$,'Firebase cannot start sibling offering exam');
select pg_temp.expect_denied('select * from private.external_identities','Firebase cannot read private identity registry');
select pg_temp.expect_denied($s$insert into public.profiles(id) values('10000000-0000-0000-0000-000000000009')$s$,'Firebase cannot select profile UUID');

select pg_temp.firebase_claims('firebase-fixture-000000000001');
select pg_temp.assert_true(private.has_org_role('20000000-0000-0000-0000-000000000001',array['owner']),'Firebase owner retains contextual role');
select pg_temp.assert_true((select count(*)=0 from public.courses where organization_id='20000000-0000-0000-0000-000000000002'),'Firebase owner A cannot see tenant B');
select pg_temp.firebase_claims('firebase-fixture-000000000002');
select pg_temp.assert_true(private.has_org_role('20000000-0000-0000-0000-000000000001',array['teacher']) and private.has_org_role('20000000-0000-0000-0000-000000000002',array['admin']),'Firebase supports different contextual roles');
select pg_temp.assert_true(private.can_edit_course('30000000-0000-0000-0000-000000000001'),'Firebase assigned teacher can author');

select pg_temp.firebase_claims('unknown-firebase-subject');
select pg_temp.assert_true(public.current_profile_id() is null,'unmapped identity fails closed');
select pg_temp.assert_true((select count(*)=0 from public.courses),'unmapped identity sees no courses');
select set_config('test.new_profile',public.onboard_firebase_profile()::text,true);
select pg_temp.assert_true(public.onboard_firebase_profile()=current_setting('test.new_profile')::uuid,'repeated onboarding is idempotent');
select pg_temp.assert_true((select count(*)=0 from public.organization_memberships),'new profile has no staff memberships');
select pg_temp.assert_true((select count(*)=0 from public.enrollments),'new profile has no inferred enrollment');
-- auth.users is private; perform the native-user assertion with the operator below instead.
reset role;
select pg_temp.assert_true(not exists(select 1 from auth.users where id=current_setting('test.new_profile')::uuid),'Firebase onboarding creates no native auth row');
update public.profiles set status='suspended' where id=current_setting('test.new_profile')::uuid;
set local role authenticated;
select pg_temp.assert_true(public.current_profile_id() is null,'suspended profile fails closed');
select pg_temp.expect_denied('select public.onboard_firebase_profile()','suspended profile cannot re-onboard');
reset role;
update public.profiles set status='active' where id=current_setting('test.new_profile')::uuid;
update private.external_identities set status='disabled' where subject='unknown-firebase-subject';
set local role authenticated;
select pg_temp.assert_true(public.current_profile_id() is null,'disabled mapping fails closed');
select pg_temp.expect_denied('select public.onboard_firebase_profile()','disabled identity cannot recreate profile');

select pg_temp.firebase_claims('firebase-fixture-000000000005');
select public.revoke_my_firebase_identity();
select pg_temp.assert_true(public.current_profile_id() is null,'logout immediately invalidates old Firebase authentication time');
select pg_temp.assert_true((select count(*)=0 from public.courses),'revoked Firebase token cannot read content');
select pg_temp.expect_denied('select public.onboard_firebase_profile()','revoked token cannot re-onboard');
select set_config('request.jwt.claims',jsonb_set(auth.jwt(),'{auth_time}',to_jsonb(extract(epoch from now())::bigint+2))::text,true);
select pg_temp.assert_true(public.current_profile_id()='10000000-0000-0000-0000-000000000005','new login after revocation can resolve identity');
select set_config('request.jwt.claims',jsonb_set(auth.jwt(),'{aud}','"another-project"')::text,true);
select pg_temp.assert_true(public.current_profile_id() is null,'wrong Firebase audience rejected');
select pg_temp.expect_denied('select public.onboard_firebase_profile()','wrong audience cannot onboard');
select pg_temp.firebase_claims('firebase-fixture-000000000005');
select set_config('request.jwt.claims',jsonb_set(auth.jwt(),'{iss}','"https://securetoken.google.com/another-project"')::text,true);
select pg_temp.assert_true(public.current_profile_id() is null,'wrong Firebase issuer rejected');
select pg_temp.firebase_claims('firebase-fixture-000000000005');
select set_config('request.jwt.claims',jsonb_set(auth.jwt(),'{email_verified}','false')::text,true);
select pg_temp.assert_true(public.current_profile_id() is null,'unverified email denied');
select pg_temp.expect_denied('select public.onboard_firebase_profile()','unverified email cannot onboard');
select pg_temp.firebase_claims('10000000-0000-0000-0000-000000000001');
select pg_temp.assert_true(public.current_profile_id() is null,'Firebase UUID-shaped subject cannot impersonate native owner');
reset role;
select jsonb_build_object('passed',count(*),'checks',jsonb_agg(name order by name)) as firebase_identity_tests from test_results;
rollback;
