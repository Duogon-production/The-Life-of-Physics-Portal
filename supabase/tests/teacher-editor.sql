-- Development only. Simulated gateway claims test database authorization, not Firebase signature verification.
-- All synthetic identities, organizations and courses are rolled back. Existing data is untouched.
begin;
create temp table teacher_test_results(name text primary key);
create temp table teacher_test_users(label text primary key, id uuid not null);
grant select,insert on teacher_test_results,teacher_test_users to authenticated,anon;
select set_config('teacher_test.run',gen_random_uuid()::text,true);
create function pg_temp.claim(label text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('iss','https://securetoken.google.com/diagonproduction','aud','diagonproduction','role','authenticated','email_verified',true,'auth_time',floor(extract(epoch from now()))::bigint,'sub','teacher-test-'||current_setting('teacher_test.run')||'-'||label)::text,true); end $$;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql set search_path='' as $$
begin if value is distinct from true then raise exception 'FAILED %',label; end if; insert into pg_temp.teacher_test_results values(label); end $$;
create function pg_temp.denied(statement text,label text) returns void language plpgsql set search_path='' as $$
declare caught text;
begin begin execute statement; exception when others then get stacked diagnostics caught=returned_sqlstate; end;
if caught is distinct from '42501' then raise exception 'FAILED %, SQLSTATE %',label,caught; end if;
insert into pg_temp.teacher_test_results values(label); end $$;
set local role authenticated;
select pg_temp.claim('owner');
insert into teacher_test_users values('owner',public.onboard_firebase_profile());
select set_config('teacher_test.org',public.create_organization('Phase 2 disposable A','phase2-a-'||current_setting('teacher_test.run'))::text,true);
select pg_temp.ok(private.has_org_role(current_setting('teacher_test.org')::uuid,array['owner']),'organization creator becomes contextual owner');
select pg_temp.claim('other');
insert into teacher_test_users values('other',public.onboard_firebase_profile());
select set_config('teacher_test.other_org',public.create_organization('Phase 2 disposable B','phase2-b-'||current_setting('teacher_test.run'))::text,true);
select pg_temp.claim('teacher');
insert into teacher_test_users values('teacher',public.onboard_firebase_profile());
select pg_temp.claim('assistant');
insert into teacher_test_users values('assistant',public.onboard_firebase_profile());
select pg_temp.claim('student');
insert into teacher_test_users values('student',public.onboard_firebase_profile());
reset role;
insert into public.organization_memberships(organization_id,user_id,role,status)
select current_setting('teacher_test.org')::uuid,id,label,'active' from teacher_test_users where label in ('teacher','assistant');
set local role authenticated;
select pg_temp.claim('teacher');
select set_config('teacher_test.course',public.create_teacher_course(current_setting('teacher_test.org')::uuid,'Disposable physics','physics')::text,true);
select pg_temp.ok((select status='draft' and visibility='private' from public.courses where id=current_setting('teacher_test.course')::uuid),'new course is private draft');
select pg_temp.ok((select role='owner' from public.course_staff where course_id=current_setting('teacher_test.course')::uuid and user_id=public.current_profile_id()),'teacher receives course ownership atomically');
update public.courses set title='Edited physics',status='published',visibility='unlisted' where id=current_setting('teacher_test.course')::uuid;
select pg_temp.ok((select title='Edited physics' and status='published' from public.courses where id=current_setting('teacher_test.course')::uuid),'assigned teacher can edit and publish');
select pg_temp.denied($s$select public.create_teacher_course(current_setting('teacher_test.other_org')::uuid,'Cross tenant','cross-tenant')$s$,'teacher cannot create in another tenant');
select pg_temp.claim('owner');
select pg_temp.ok(private.can_edit_course(current_setting('teacher_test.course')::uuid),'organization owner can edit teacher course');
select pg_temp.claim('other');
select pg_temp.ok(not private.can_edit_course(current_setting('teacher_test.course')::uuid),'owner B cannot edit organization A');
select pg_temp.ok((select count(*)=0 from public.courses where id=current_setting('teacher_test.course')::uuid),'owner B cannot read private organization A course');
with changed as (update public.courses set title='Forbidden tenant edit' where id=current_setting('teacher_test.course')::uuid returning id)
select pg_temp.ok((select count(*)=0 from changed),'RLS blocks owner B course updates');
select pg_temp.claim('student');
select pg_temp.ok((select count(*)=0 from public.courses where id=current_setting('teacher_test.course')::uuid),'unenrolled student cannot read course');
with changed as (update public.courses set title='Forbidden student edit' where id=current_setting('teacher_test.course')::uuid returning id)
select pg_temp.ok((select count(*)=0 from changed),'RLS blocks student course updates');
select pg_temp.denied($s$select public.create_teacher_course(current_setting('teacher_test.org')::uuid,'Attack','attack')$s$,'student cannot create teacher content');
select pg_temp.claim('assistant');
select pg_temp.denied($s$select public.create_teacher_course(current_setting('teacher_test.org')::uuid,'Attack','attack')$s$,'organization assistant cannot create courses');
select pg_temp.ok(not private.can_edit_course(current_setting('teacher_test.course')::uuid),'unassigned assistant cannot edit');
reset role;
insert into public.course_staff(course_id,user_id,role) select current_setting('teacher_test.course')::uuid,id,'editor' from teacher_test_users where label='assistant';
set local role authenticated;
select pg_temp.ok(private.can_edit_course(current_setting('teacher_test.course')::uuid),'assigned editor can edit in own organization');
with changed as (update public.courses set description='Edited by assigned editor' where id=current_setting('teacher_test.course')::uuid returning id)
select pg_temp.ok((select count(*)=1 from changed),'RLS permits assigned editor metadata updates');
reset role;
update public.organization_memberships set status='suspended' where user_id=(select id from teacher_test_users where label='teacher') and organization_id=current_setting('teacher_test.org')::uuid;
set local role authenticated;
select pg_temp.claim('teacher');
select pg_temp.ok(not private.can_edit_course(current_setting('teacher_test.course')::uuid),'suspended teacher loses editor privileges');
with changed as (update public.courses set title='Forbidden suspended edit' where id=current_setting('teacher_test.course')::uuid returning id)
select pg_temp.ok((select count(*)=0 from changed),'RLS blocks suspended teacher course updates');
select pg_temp.denied($s$select public.create_teacher_course(current_setting('teacher_test.org')::uuid,'Attack','attack')$s$,'suspended teacher cannot create courses');
set local role anon;
select pg_temp.denied($s$select public.create_teacher_course(current_setting('teacher_test.org')::uuid,'Attack','attack')$s$,'anonymous cannot execute course creation');
reset role;
select jsonb_build_object('passed',count(*),'checks',jsonb_agg(name order by name)) as teacher_editor_tests from teacher_test_results;
rollback;
