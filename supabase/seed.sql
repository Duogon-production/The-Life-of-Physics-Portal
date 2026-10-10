-- DEVELOPMENT ONLY. Dormant synthetic identities have no password/identity and
-- are banned from sign-in. Tests impersonate their UUIDs inside rollback SQL.
-- Never load this file into a production project.
begin;
insert into auth.users(id,aud,role,email,encrypted_password,banned_until,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('10000000-0000-0000-0000-000000000001','authenticated','authenticated','owner-a@example.invalid','', 'infinity','{"provider":"email","providers":["email"]}','{"display_name":"Organization A owner"}',now(),now()),
 ('10000000-0000-0000-0000-000000000002','authenticated','authenticated','teacher@example.invalid','', 'infinity','{"provider":"email","providers":["email"]}','{"display_name":"Teacher A / Admin B"}',now(),now()),
 ('10000000-0000-0000-0000-000000000003','authenticated','authenticated','owner-b@example.invalid','', 'infinity','{"provider":"email","providers":["email"]}','{"display_name":"Organization B owner"}',now(),now()),
 ('10000000-0000-0000-0000-000000000004','authenticated','authenticated','editor@example.invalid','', 'infinity','{"provider":"email","providers":["email"]}','{"display_name":"Course editor"}',now(),now()),
 ('10000000-0000-0000-0000-000000000005','authenticated','authenticated','student-a@example.invalid','', 'infinity','{"provider":"email","providers":["email"]}','{"display_name":"Student Group A"}',now(),now()),
 ('10000000-0000-0000-0000-000000000006','authenticated','authenticated','student-b@example.invalid','', 'infinity','{"provider":"email","providers":["email"]}','{"display_name":"Student Group B"}',now(),now()),
 ('10000000-0000-0000-0000-000000000007','authenticated','authenticated','student-other-org@example.invalid','', 'infinity','{"provider":"email","providers":["email"]}','{"display_name":"Student Organization B"}',now(),now())
on conflict(id) do nothing;
insert into public.organizations(id,name,slug,created_by) values
 ('20000000-0000-0000-0000-000000000001','Demo Physics Academy','demo-physics','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','Demo Science Academy','demo-science','10000000-0000-0000-0000-000000000003') on conflict(id) do nothing;
insert into public.organization_memberships(organization_id,user_id,role,status,joined_at) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner','active',now()),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','teacher','active',now()),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','assistant','active',now()),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','owner','active',now()),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','admin','active',now()) on conflict(organization_id,user_id) do nothing;
insert into public.courses(id,organization_id,title,slug,status,created_by) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Physics Secondary 3','physics-secondary-3','published','10000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Private Science','private-science','published','10000000-0000-0000-0000-000000000003') on conflict(id) do nothing;
insert into public.course_staff(course_id,user_id,role) values
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','instructor'),
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','editor') on conflict(course_id,user_id) do nothing;
insert into public.course_modules(id,course_id,title,position) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Electricity',0),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','Science',0) on conflict(id) do nothing;
insert into public.lessons(id,module_id,title,position,status) values
 ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Ohm law',0,'published'),
 ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Draft lesson',1,'draft'),
 ('50000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000002','Private lesson',0,'published') on conflict(id) do nothing;
insert into public.lesson_blocks(lesson_id,block_type,position,content) values
 ('50000000-0000-0000-0000-000000000001','text',0,'{"text":"Voltage equals current times resistance."}') on conflict(lesson_id,position) do nothing;
insert into public.course_offerings(id,course_id,name,delivery_mode,status,capacity) values
 ('60000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','October 2026 Group A','blended','active',30),
 ('60000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','October 2026 Group B','blended','active',30),
 ('60000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','Science Group A','self_paced','active',30) on conflict(id) do nothing;
insert into public.offering_staff(offering_id,user_id,role) values
 ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','instructor'),
 ('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','instructor'),
 ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','teaching_assistant') on conflict(offering_id,user_id) do nothing;
insert into public.enrollments(offering_id,user_id,status,enrolled_at) values
 ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','active',now()),
 ('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000006','active',now()),
 ('60000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000007','active',now()) on conflict(offering_id,user_id) do nothing;
insert into public.lesson_progress(offering_id,lesson_id,user_id,status,started_at) values
 ('60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','in_progress',now()) on conflict(offering_id,lesson_id,user_id) do nothing;
insert into public.assessments(id,course_id,title,type,status,created_by) values
 ('70000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Electricity Quiz','quiz','published','10000000-0000-0000-0000-000000000001') on conflict(id) do nothing;
-- Avoid touching content when rerunning a seed after attempts exist.
insert into public.assessment_questions(id,assessment_id,question_type,prompt,points,position)
select '80000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','single_choice','What is the unit of resistance?',2,0
where not exists(select 1 from public.assessment_questions where id='80000000-0000-0000-0000-000000000001');
insert into public.assessment_options(id,question_id,text,position,is_correct)
select v.id::uuid,'80000000-0000-0000-0000-000000000001',v.label,v.position,v.correct from (values
 ('90000000-0000-0000-0000-000000000001','Ohm',0,true),('90000000-0000-0000-0000-000000000002','Volt',1,false)) v(id,label,position,correct)
where not exists(select 1 from public.assessment_options o where o.id=v.id::uuid);
insert into public.offering_assessments(id,offering_id,assessment_id,max_attempts,time_limit_seconds,published) values
 ('a0000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001',2,1800,true),
 ('a0000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001',2,1800,true) on conflict(id) do nothing;
commit;
