-- Authorization helpers are private, stable, non-recursive and identity-bound.

create function private.is_active_user() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and status='active') $$;
revoke all on function private.is_active_user from public, anon;
grant execute on function private.is_active_user to authenticated;

create function private.has_org_role(org_id uuid, roles text[]) returns boolean language sql stable security definer set search_path = '' as $$ select private.is_active_user() and exists(select 1 from public.organization_memberships m join public.organizations o on o.id=m.organization_id where m.organization_id=org_id and m.user_id=(select auth.uid()) and m.status='active' and m.role=any(roles) and o.status='active') $$;
revoke all on function private.has_org_role from public, anon;
grant execute on function private.has_org_role to authenticated;

create function private.is_org_member(org_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select private.has_org_role(org_id,array['owner','admin','teacher','assistant']) $$;
revoke all on function private.is_org_member from public, anon;
grant execute on function private.is_org_member to authenticated;

create function private.is_course_staff(course_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.course_staff s join public.courses c on c.id=s.course_id where s.course_id=$1 and s.user_id=(select auth.uid()) and private.is_org_member(c.organization_id)) $$;
revoke all on function private.is_course_staff from public, anon;
grant execute on function private.is_course_staff to authenticated;

create function private.can_edit_course(course_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.courses c where c.id=$1 and (private.has_org_role(c.organization_id,array['owner','admin']) or (private.is_org_member(c.organization_id) and exists(select 1 from public.course_staff s where s.course_id=c.id and s.user_id=(select auth.uid()) and s.role in ('owner','instructor','editor'))))) $$;
revoke all on function private.can_edit_course from public, anon;
grant execute on function private.can_edit_course to authenticated;

create function private.can_manage_course_staff(course_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.courses c where c.id=$1 and (private.has_org_role(c.organization_id,array['owner','admin']) or (private.is_org_member(c.organization_id) and exists(select 1 from public.course_staff s where s.course_id=c.id and s.user_id=(select auth.uid()) and s.role='owner')))) $$;
revoke all on function private.can_manage_course_staff from public, anon;
grant execute on function private.can_manage_course_staff to authenticated;

create function private.can_manage_offering(offering_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.course_offerings o join public.courses c on c.id=o.course_id where o.id=$1 and (private.has_org_role(c.organization_id,array['owner','admin']) or (private.is_org_member(c.organization_id) and (exists(select 1 from public.course_staff s where s.course_id=c.id and s.user_id=(select auth.uid()) and s.role in ('owner','instructor')) or exists(select 1 from public.offering_staff s where s.offering_id=o.id and s.user_id=(select auth.uid()) and s.role='instructor'))))) $$;
revoke all on function private.can_manage_offering from public, anon;
grant execute on function private.can_manage_offering to authenticated;

create function private.can_support_offering(offering_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select private.can_manage_offering($1) or exists(select 1 from public.offering_staff s join public.course_offerings o on o.id=s.offering_id join public.courses c on c.id=o.course_id where s.offering_id=$1 and s.user_id=(select auth.uid()) and private.is_org_member(c.organization_id)) $$;
revoke all on function private.can_support_offering from public, anon;
grant execute on function private.can_support_offering to authenticated;

create function private.is_enrolled(offering_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select private.is_active_user() and exists(select 1 from public.enrollments e join public.course_offerings o on o.id=e.offering_id join public.courses c on c.id=o.course_id join public.organizations g on g.id=c.organization_id where e.offering_id=$1 and e.user_id=(select auth.uid()) and e.status='active' and (e.expires_at is null or e.expires_at>now()) and (e.enrolled_at is null or e.enrolled_at<=now()) and o.status='active' and c.status='published' and g.status='active') $$;
revoke all on function private.is_enrolled from public, anon;
grant execute on function private.is_enrolled to authenticated;

create function private.can_view_course(course_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select private.can_edit_course($1) or private.is_course_staff($1) or exists(select 1 from public.course_offerings o where o.course_id=$1 and (private.can_support_offering(o.id) or private.is_enrolled(o.id))) $$;
revoke all on function private.can_view_course from public, anon;
grant execute on function private.can_view_course to authenticated;

create function private.can_view_lesson(lesson_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=$1 and ((private.can_edit_course(m.course_id) or private.is_course_staff(m.course_id)) or (l.status='published' and private.can_view_course(m.course_id)))) $$;
revoke all on function private.can_view_lesson from public, anon;
grant execute on function private.can_view_lesson to authenticated;

create function private.can_view_assessment(assessment_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.assessments a where a.id=$1 and (private.can_edit_course(a.course_id) or exists(select 1 from public.offering_assessments oa where oa.assessment_id=a.id and (private.can_support_offering(oa.offering_id) or (a.status='published' and oa.published and (oa.opens_at is null or oa.opens_at<=now()) and private.is_enrolled(oa.offering_id)))))) $$;
revoke all on function private.can_view_assessment from public, anon;
grant execute on function private.can_view_assessment to authenticated;

create function private.can_grade_assessment(assessment_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.assessments a where a.id=$1 and (private.can_edit_course(a.course_id) or exists(select 1 from public.offering_assessments oa where oa.assessment_id=a.id and private.can_support_offering(oa.offering_id)))) $$;
revoke all on function private.can_grade_assessment from public, anon;
grant execute on function private.can_grade_assessment to authenticated;

create function private.can_view_profile(user_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select private.is_active_user() and ($1=(select auth.uid()) or exists(select 1 from public.organization_memberships m where m.user_id=$1 and private.has_org_role(m.organization_id,array['owner','admin'])) or exists(select 1 from public.enrollments e where e.user_id=$1 and private.can_support_offering(e.offering_id))) $$;
revoke all on function private.can_view_profile from public, anon;
grant execute on function private.can_view_profile to authenticated;

create function private.can_view_media(asset_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.media_assets a where a.id=$1 and (a.uploaded_by=(select auth.uid()) and private.is_active_user() or private.has_org_role(a.organization_id,array['owner','admin']) or (a.offering_id is not null and private.can_support_offering(a.offering_id)) or exists(select 1 from public.lesson_blocks b where b.media_asset_id=a.id and private.can_view_lesson(b.lesson_id)))) $$;
revoke all on function private.can_view_media from public, anon;
grant execute on function private.can_view_media to authenticated;

create policy profiles_select on public.profiles for select to authenticated using (private.can_view_profile(id));

create policy profiles_update on public.profiles for update to authenticated using (id=(select auth.uid()) and private.is_active_user()) with check (id=(select auth.uid()) and private.is_active_user());

grant select on public.profiles to authenticated; grant update(display_name, avatar_path, phone) on public.profiles to authenticated;

create policy organizations_select on public.organizations for select to authenticated using (private.is_org_member(id) or exists(select 1 from public.courses c where c.organization_id=organizations.id and private.can_view_course(c.id)));

create policy organizations_update on public.organizations for update to authenticated using (private.has_org_role(id,array['owner','admin'])) with check (private.has_org_role(id,array['owner','admin']));

grant select on public.organizations to authenticated; grant update(name,slug) on public.organizations to authenticated;

create policy organization_memberships_select on public.organization_memberships for select to authenticated using (user_id=(select auth.uid()) or private.has_org_role(organization_id,array['owner','admin']));

create policy organization_memberships_insert on public.organization_memberships for insert to authenticated  with check (private.has_org_role(organization_id,array['owner']) or (role<>'owner' and private.has_org_role(organization_id,array['admin'])));

create policy organization_memberships_update on public.organization_memberships for update to authenticated using (private.has_org_role(organization_id,array['owner']) or (role<>'owner' and private.has_org_role(organization_id,array['admin']))) with check (private.has_org_role(organization_id,array['owner']) or (role<>'owner' and private.has_org_role(organization_id,array['admin'])));

create policy organization_memberships_delete on public.organization_memberships for delete to authenticated using (private.has_org_role(organization_id,array['owner']) or (role<>'owner' and private.has_org_role(organization_id,array['admin'])));

grant select, insert, delete on public.organization_memberships to authenticated; grant update(role,status,joined_at) on public.organization_memberships to authenticated;

create policy courses_select on public.courses for select to authenticated using (private.can_view_course(id));

create policy courses_insert on public.courses for insert to authenticated  with check (private.has_org_role(organization_id,array['owner','admin','teacher']) and created_by=(select auth.uid()));

create policy courses_update on public.courses for update to authenticated using (private.can_edit_course(id)) with check (private.can_edit_course(id));

create policy courses_delete on public.courses for delete to authenticated using (private.can_edit_course(id));

grant delete on public.courses to authenticated;

grant insert on public.courses to authenticated; grant update(title,slug,description,status,visibility) on public.courses to authenticated;

grant select on public.courses to authenticated;

create policy course_staff_select on public.course_staff for select to authenticated using (private.can_view_course(course_id));

create policy course_staff_insert on public.course_staff for insert to authenticated  with check (private.can_manage_course_staff(course_id));

create policy course_staff_update on public.course_staff for update to authenticated using (private.can_manage_course_staff(course_id)) with check (private.can_manage_course_staff(course_id));

create policy course_staff_delete on public.course_staff for delete to authenticated using (private.can_manage_course_staff(course_id));

grant delete on public.course_staff to authenticated;

grant insert on public.course_staff to authenticated; grant update(role) on public.course_staff to authenticated;

grant select on public.course_staff to authenticated;

create policy course_modules_select on public.course_modules for select to authenticated using (private.can_view_course(course_id));

create policy course_modules_insert on public.course_modules for insert to authenticated  with check (private.can_edit_course(course_id));

create policy course_modules_update on public.course_modules for update to authenticated using (private.can_edit_course(course_id)) with check (private.can_edit_course(course_id));

create policy course_modules_delete on public.course_modules for delete to authenticated using (private.can_edit_course(course_id));

grant delete on public.course_modules to authenticated;

grant insert on public.course_modules to authenticated; grant update(title,description,position) on public.course_modules to authenticated;

grant select on public.course_modules to authenticated;

create policy lessons_select on public.lessons for select to authenticated using (private.can_view_lesson(id));

create policy lessons_insert on public.lessons for insert to authenticated  with check (exists(select 1 from public.course_modules m where m.id=module_id and private.can_edit_course(m.course_id)));

create policy lessons_update on public.lessons for update to authenticated using (exists(select 1 from public.course_modules m where m.id=module_id and private.can_edit_course(m.course_id))) with check (exists(select 1 from public.course_modules m where m.id=module_id and private.can_edit_course(m.course_id)));

create policy lessons_delete on public.lessons for delete to authenticated using (exists(select 1 from public.course_modules m where m.id=module_id and private.can_edit_course(m.course_id)));

grant delete on public.lessons to authenticated;

grant insert on public.lessons to authenticated; grant update(title,position,status,estimated_duration_seconds) on public.lessons to authenticated;

grant select on public.lessons to authenticated;

create policy lesson_blocks_select on public.lesson_blocks for select to authenticated using (private.can_view_lesson(lesson_id));

create policy lesson_blocks_insert on public.lesson_blocks for insert to authenticated  with check (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=lesson_id and private.can_edit_course(m.course_id)));

create policy lesson_blocks_update on public.lesson_blocks for update to authenticated using (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=lesson_id and private.can_edit_course(m.course_id))) with check (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=lesson_id and private.can_edit_course(m.course_id)));

create policy lesson_blocks_delete on public.lesson_blocks for delete to authenticated using (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=lesson_id and private.can_edit_course(m.course_id)));

grant delete on public.lesson_blocks to authenticated;

grant insert on public.lesson_blocks to authenticated; grant update(block_type,position,content,media_asset_id) on public.lesson_blocks to authenticated;

grant select on public.lesson_blocks to authenticated;

create policy course_offerings_select on public.course_offerings for select to authenticated using (private.can_support_offering(id) or private.is_enrolled(id));

create policy course_offerings_insert on public.course_offerings for insert to authenticated  with check (exists(select 1 from public.courses c where c.id=course_id and (private.has_org_role(c.organization_id,array['owner','admin']) or (private.is_org_member(c.organization_id) and exists(select 1 from public.course_staff s where s.course_id=c.id and s.user_id=(select auth.uid()) and s.role in ('owner','instructor'))))));

create policy course_offerings_update on public.course_offerings for update to authenticated using (private.can_manage_offering(id)) with check (private.can_manage_offering(id));

grant insert on public.course_offerings to authenticated; grant update(name,delivery_mode,starts_at,ends_at,enrollment_opens_at,enrollment_closes_at,timezone,capacity,status) on public.course_offerings to authenticated;

grant select on public.course_offerings to authenticated;

create policy offering_staff_select on public.offering_staff for select to authenticated using (private.can_support_offering(offering_id));

create policy offering_staff_insert on public.offering_staff for insert to authenticated  with check (exists(select 1 from public.course_offerings o where o.id=offering_id and private.can_manage_course_staff(o.course_id)));

create policy offering_staff_update on public.offering_staff for update to authenticated using (exists(select 1 from public.course_offerings o where o.id=offering_id and private.can_manage_course_staff(o.course_id))) with check (exists(select 1 from public.course_offerings o where o.id=offering_id and private.can_manage_course_staff(o.course_id)));

create policy offering_staff_delete on public.offering_staff for delete to authenticated using (exists(select 1 from public.course_offerings o where o.id=offering_id and private.can_manage_course_staff(o.course_id)));

grant delete on public.offering_staff to authenticated;

grant insert on public.offering_staff to authenticated; grant update(role) on public.offering_staff to authenticated;

grant select on public.offering_staff to authenticated;

create policy enrollments_select on public.enrollments for select to authenticated using ((user_id=(select auth.uid()) and private.is_active_user()) or private.can_support_offering(offering_id));

create policy enrollments_insert on public.enrollments for insert to authenticated  with check (private.can_manage_offering(offering_id));

create policy enrollments_update on public.enrollments for update to authenticated using (private.can_manage_offering(offering_id)) with check (private.can_manage_offering(offering_id));

grant insert on public.enrollments to authenticated; grant update(status,enrolled_at,expires_at,completed_at,source) on public.enrollments to authenticated;

grant select on public.enrollments to authenticated;

create policy lesson_progress_select on public.lesson_progress for select to authenticated using ((user_id=(select auth.uid()) and private.is_active_user()) or private.can_support_offering(offering_id));

create policy lesson_progress_insert on public.lesson_progress for insert to authenticated  with check (user_id=(select auth.uid()) and private.is_enrolled(offering_id) and private.can_view_lesson(lesson_id));

create policy lesson_progress_update on public.lesson_progress for update to authenticated using (user_id=(select auth.uid()) and private.is_enrolled(offering_id) and private.can_view_lesson(lesson_id)) with check (user_id=(select auth.uid()) and private.is_enrolled(offering_id) and private.can_view_lesson(lesson_id));

grant insert on public.lesson_progress to authenticated; grant update(status,started_at,completed_at,last_accessed_at,video_position_seconds) on public.lesson_progress to authenticated;

grant select on public.lesson_progress to authenticated;

create policy assessments_select on public.assessments for select to authenticated using (private.can_view_assessment(id));

create policy assessments_insert on public.assessments for insert to authenticated  with check (private.can_edit_course(course_id) and created_by=(select auth.uid()));

create policy assessments_update on public.assessments for update to authenticated using (private.can_edit_course(course_id)) with check (private.can_edit_course(course_id));

create policy assessments_delete on public.assessments for delete to authenticated using (private.can_edit_course(course_id));

grant delete on public.assessments to authenticated;

grant insert on public.assessments to authenticated; grant update(title,type,instructions,status) on public.assessments to authenticated;

grant select on public.assessments to authenticated;

create policy assessment_questions_select on public.assessment_questions for select to authenticated using (private.can_view_assessment(assessment_id));

create policy assessment_questions_insert on public.assessment_questions for insert to authenticated  with check (exists(select 1 from public.assessments a where a.id=assessment_id and private.can_edit_course(a.course_id)));

create policy assessment_questions_update on public.assessment_questions for update to authenticated using (exists(select 1 from public.assessments a where a.id=assessment_id and private.can_edit_course(a.course_id))) with check (exists(select 1 from public.assessments a where a.id=assessment_id and private.can_edit_course(a.course_id)));

create policy assessment_questions_delete on public.assessment_questions for delete to authenticated using (exists(select 1 from public.assessments a where a.id=assessment_id and private.can_edit_course(a.course_id)));

grant delete on public.assessment_questions to authenticated;

grant insert on public.assessment_questions to authenticated; grant update(question_type,prompt,points,position,settings) on public.assessment_questions to authenticated;

grant select on public.assessment_questions to authenticated;

create policy assessment_options_select on public.assessment_options for select to authenticated using (exists(select 1 from public.assessment_questions q where q.id=question_id and private.can_view_assessment(q.assessment_id)));

create policy assessment_options_insert on public.assessment_options for insert to authenticated  with check (exists(select 1 from public.assessment_questions q join public.assessments a on a.id=q.assessment_id where q.id=question_id and private.can_edit_course(a.course_id)));

create policy assessment_options_update on public.assessment_options for update to authenticated using (exists(select 1 from public.assessment_questions q join public.assessments a on a.id=q.assessment_id where q.id=question_id and private.can_edit_course(a.course_id))) with check (exists(select 1 from public.assessment_questions q join public.assessments a on a.id=q.assessment_id where q.id=question_id and private.can_edit_course(a.course_id)));

create policy assessment_options_delete on public.assessment_options for delete to authenticated using (exists(select 1 from public.assessment_questions q join public.assessments a on a.id=q.assessment_id where q.id=question_id and private.can_edit_course(a.course_id)));

grant delete on public.assessment_options to authenticated;

grant insert on public.assessment_options to authenticated; grant update(text,position,is_correct) on public.assessment_options to authenticated;

grant select(id,question_id,text,position,created_at,updated_at) on public.assessment_options to authenticated;

create policy offering_assessments_select on public.offering_assessments for select to authenticated using (private.can_support_offering(offering_id) or (published and private.is_enrolled(offering_id) and exists(select 1 from public.assessments a where a.id=assessment_id and a.status='published')));

create policy offering_assessments_insert on public.offering_assessments for insert to authenticated  with check (private.can_manage_offering(offering_id));

create policy offering_assessments_update on public.offering_assessments for update to authenticated using (private.can_manage_offering(offering_id)) with check (private.can_manage_offering(offering_id));

grant insert on public.offering_assessments to authenticated; grant update(opens_at,closes_at,time_limit_seconds,max_attempts,shuffle_questions,shuffle_options,published) on public.offering_assessments to authenticated;

grant select on public.offering_assessments to authenticated;

create policy assessment_attempts_select on public.assessment_attempts for select to authenticated using ((user_id=(select auth.uid()) and private.is_active_user()) or exists(select 1 from public.offering_assessments oa where oa.id=offering_assessment_id and private.can_support_offering(oa.offering_id)));

create policy assessment_responses_select on public.assessment_responses for select to authenticated using (exists(select 1 from public.assessment_attempts a join public.offering_assessments oa on oa.id=a.offering_assessment_id where a.id=attempt_id and ((a.user_id=(select auth.uid()) and private.is_active_user()) or private.can_support_offering(oa.offering_id))));

grant select on public.assessment_attempts to authenticated; grant select(id,attempt_id,question_id,response,media_asset_id,created_at,updated_at) on public.assessment_responses to authenticated;

create policy media_assets_select on public.media_assets for select to authenticated using (private.can_view_media(id));

create policy media_assets_insert on public.media_assets for insert to authenticated  with check (uploaded_by=(select auth.uid()) and status='pending' and ((bucket='lms-course-media' and private.has_org_role(organization_id,array['owner','admin','teacher'])) or (bucket='lms-submissions' and private.is_enrolled(offering_id))));

grant select, insert on public.media_assets to authenticated;
