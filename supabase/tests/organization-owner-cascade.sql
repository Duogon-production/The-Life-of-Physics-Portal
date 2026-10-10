-- DEVELOPMENT ONLY. New test organization, no changes to existing records.
begin;
do $$
declare
  test_org uuid := gen_random_uuid();
  caught text;
  owner_id uuid := '10000000-0000-0000-0000-000000000001';
begin
  insert into public.organizations(id,name,slug)
    values(test_org,'Disposable owner cascade test',test_org::text);
  insert into public.organization_memberships(organization_id,user_id,role,status)
    values(test_org,owner_id,'owner','active');

  begin delete from public.organization_memberships where organization_id=test_org;
  exception when others then get stacked diagnostics caught=returned_sqlstate; end;
  if caught is distinct from '23514' then raise exception 'Last-owner deletion was not blocked'; end if;

  caught := null;
  begin update public.organization_memberships set role='admin' where organization_id=test_org;
  exception when others then get stacked diagnostics caught=returned_sqlstate; end;
  if caught is distinct from '23514' then raise exception 'Last-owner demotion was not blocked'; end if;

  caught := null;
  begin update public.organization_memberships set status='suspended' where organization_id=test_org;
  exception when others then get stacked diagnostics caught=returned_sqlstate; end;
  if caught is distinct from '23514' then raise exception 'Last-owner suspension was not blocked'; end if;

  delete from public.organizations where id=test_org;
  if exists(select 1 from public.organization_memberships where organization_id=test_org) then
    raise exception 'Parent deletion left memberships behind';
  end if;
  if has_table_privilege('authenticated','public.organizations','DELETE') then
    raise exception 'Application role unexpectedly has tenant deletion privileges';
  end if;
end $$;
select 5 as passed, 'Last-owner protection and authorized parent cascade' as checks;
rollback;
