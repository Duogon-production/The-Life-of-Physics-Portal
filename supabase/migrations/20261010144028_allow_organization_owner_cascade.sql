-- Retain last-owner protection for existing tenants. During ON DELETE CASCADE,
-- the parent organization has already been deleted by its authorized operator.
-- No grants, RLS policies, application delete endpoints or academic data change.
create or replace function private.protect_last_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    perform 1 from public.organizations o where o.id = old.organization_id for update;
    if not found then
      if tg_op = 'DELETE' then return old; end if;
      return new;
    end if;
    if not exists (
      select 1 from public.organization_memberships m
      where m.organization_id = old.organization_id and m.user_id <> old.user_id
        and m.role = 'owner' and m.status = 'active'
    ) then
      raise exception 'Organization requires an active owner' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.protect_last_owner() from public, anon, authenticated;
