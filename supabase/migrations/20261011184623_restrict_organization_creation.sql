-- Managed LMS: organization creation is reserved for trusted staff provisioning.
-- Preserve function definitions, privileged grants, tenant RLS and existing data.
revoke execute on function public.create_organization(text, text)
  from public, anon, authenticated;

revoke execute on function private.create_organization(text, text)
  from public, anon, authenticated;
