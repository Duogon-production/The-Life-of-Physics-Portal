-- Atomic creation: membership authorizes insertion; the creator receives contextual ownership.
create function private.create_teacher_course(p_organization_id uuid, p_title text, p_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := private.current_app_user_id(); v_course uuid;
begin
  if v_user is null or not private.has_org_role(p_organization_id, array['owner','admin','teacher']) then
    raise exception 'Course creation forbidden' using errcode = '42501';
  end if;
  if length(btrim(p_title)) not between 1 and 200 or length(p_slug) not between 1 and 100
     or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid course metadata' using errcode = '22023';
  end if;
  insert into public.courses(organization_id,title,slug,status,visibility,created_by)
  values(p_organization_id,btrim(p_title),p_slug,'draft','private',v_user) returning id into v_course;
  insert into public.course_staff(course_id,user_id,role) values(v_course,v_user,'owner');
  return v_course;
end $$;
revoke all on function private.create_teacher_course(uuid,text,text) from public, anon;
grant execute on function private.create_teacher_course(uuid,text,text) to authenticated;
create function public.create_teacher_course(p_organization_id uuid,p_title text,p_slug text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_teacher_course(p_organization_id,p_title,p_slug) $$;
revoke all on function public.create_teacher_course(uuid,text,text) from public, anon;
grant execute on function public.create_teacher_course(uuid,text,text) to authenticated;
