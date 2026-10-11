-- Trusted staff only. Run with psql as postgres using an independently verified
-- existing owner_profile_id UUID, organization_name and organization_slug variables.
-- Example invocation is documented in docs/organization-provisioning.md.
-- No password, service key, user creation or email-based account linking here.
\set ON_ERROR_STOP on
begin;
select set_config('edulabs.provision_owner', :'owner_profile_id', true);
select set_config('edulabs.provision_name', :'organization_name', true);
select set_config('edulabs.provision_slug', :'organization_slug', true);
do $$
declare owner_id uuid := current_setting('edulabs.provision_owner')::uuid; organization_id uuid;
begin
 if current_user <> 'postgres' then
  raise exception 'Trusted database administrator required' using errcode='42501';
 end if;
 perform 1 from public.profiles where id=owner_id and status='active' for share;
 if not found then raise exception 'Existing active owner profile required' using errcode='23514'; end if;
 insert into public.organizations(name,slug,created_by)
 values(current_setting('edulabs.provision_name'),current_setting('edulabs.provision_slug'),owner_id)
 returning id into organization_id;
 insert into public.organization_memberships(organization_id,user_id,role,status,joined_at)
 values(organization_id,owner_id,'owner','active',now());
 perform set_config('edulabs.provision_organization',organization_id::text,true);
end $$;
select o.id,o.name,o.slug,m.user_id as owner_profile_id,m.role,m.status
from public.organizations o join public.organization_memberships m on m.organization_id=o.id
where o.id=current_setting('edulabs.provision_organization')::uuid and m.user_id=o.created_by;
commit;
