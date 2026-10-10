-- Preparation only: no external provider is trusted or activated by this migration.
-- Existing Supabase UUID identities and Clerk application behavior are unchanged.
create table private.external_identities (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id) on delete restrict,
 provider text not null check(provider in ('supabase','clerk','firebase')),
 issuer text not null check(length(issuer)>0),
 subject text not null check(length(subject)>0),
 status text not null default 'active' check(status in ('active','disabled')),
 verified_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(issuer,subject)
);
create index external_identities_profile_id_idx on private.external_identities(profile_id);
alter table private.external_identities enable row level security;
revoke all on private.external_identities from public,anon,authenticated;
create trigger touch_updated_at before update on private.external_identities for each row execute function private.touch_updated_at();
comment on table private.external_identities is 'Inactive preparation for verified issuer/subject mapping. No self-linking or email-based linking. Only a future reviewed provisioning workflow may populate it.';

-- One replaceable identity boundary. The future Firebase phase must replace this
-- implementation with verified issuer+string-subject resolution, not a UUID cast.
create function private.current_app_user_id() returns uuid
language sql stable security invoker set search_path='' as $$ select auth.uid() $$;
revoke all on function private.current_app_user_id() from public,anon;
grant execute on function private.current_app_user_id() to authenticated;

do $$ declare f record; p record; definition text; command text;
begin
 for f in select pr.oid from pg_catalog.pg_proc pr join pg_catalog.pg_namespace n on n.oid=pr.pronamespace
   where n.nspname in ('private','public') and pr.prokind='f' and pr.proname<>'current_app_user_id'
 loop
   definition:=pg_catalog.pg_get_functiondef(f.oid);
   if position('auth.uid()' in definition)>0 then
     execute replace(definition,'auth.uid()','private.current_app_user_id()');
   end if;
 end loop;
 for p in select * from pg_catalog.pg_policies where schemaname in ('public','storage')
   and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%')
 loop
   command:=format('alter policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
   if p.qual is not null then command:=command||' using ('||replace(p.qual,'auth.uid()','private.current_app_user_id()')||')'; end if;
   if p.with_check is not null then command:=command||' with check ('||replace(p.with_check,'auth.uid()','private.current_app_user_id()')||')'; end if;
   execute command;
 end loop;
end $$;
