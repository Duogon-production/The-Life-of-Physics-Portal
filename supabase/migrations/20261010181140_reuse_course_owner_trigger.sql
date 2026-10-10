-- Preserve the existing ownership trigger rather than assigning the owner twice.
-- Atomic creation: membership authorizes insertion; the creator receives contextual ownership.
create or replace function private.create_teacher_course(p_organization_id uuid, p_title text, p_slug text)
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
  -- Existing assign_course_owner trigger assigns the creator within this transaction.
  return v_course;
end $$;
