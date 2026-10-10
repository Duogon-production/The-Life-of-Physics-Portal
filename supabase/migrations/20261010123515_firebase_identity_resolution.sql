-- Remove only the authentication FK, retaining all profile UUIDs and academic FKs.
-- Native Supabase identities remain supported through the same private registry.
alter table public.profiles drop constraint profiles_id_fkey;
alter table private.external_identities add column tokens_valid_after timestamptz not null default 'epoch';

insert into private.external_identities(profile_id,provider,issuer,subject,verified_at)
select p.id,'supabase','https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1',u.id::text,now()
from public.profiles p join auth.users u on u.id=p.id
on conflict(issuer,subject) do nothing;

create or replace function private.create_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(new.raw_user_meta_data->>'display_name',128)) on conflict(id) do nothing;
 insert into private.external_identities(profile_id,provider,issuer,subject,verified_at)
 values(new.id,'supabase','https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1',new.id::text,now());
 return new;
end $$;

-- Deleting a native authentication account disables its mapping; academic rows survive.
create function private.disable_native_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update private.external_identities set status='disabled'
 where provider='supabase' and issuer='https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1' and subject=old.id::text;
 return old;
end $$;
revoke all on function private.disable_native_identity() from public,anon,authenticated;
create trigger on_auth_user_deleted after delete on auth.users for each row execute function private.disable_native_identity();

create function private.is_trusted_identity_token() returns boolean
language sql stable security invoker set search_path='' as $$
 select coalesce(auth.jwt()->>'role'='authenticated' and (
  (auth.jwt()->>'iss'='https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1' and auth.jwt()->>'aud'='authenticated')
  or (auth.jwt()->>'iss'='https://securetoken.google.com/diagonproduction'
      and auth.jwt()->>'aud'='diagonproduction' and auth.jwt()->>'email_verified'='true')
 ),false)
$$;
revoke all on function private.is_trusted_identity_token() from public,anon;
grant execute on function private.is_trusted_identity_token() to authenticated;

create or replace function private.current_app_user_id() returns uuid
language sql stable security definer set search_path='' as $$
 select e.profile_id from private.external_identities e join public.profiles p on p.id=e.profile_id
 where private.is_trusted_identity_token() and e.issuer=auth.jwt()->>'iss' and e.subject=auth.jwt()->>'sub'
 and e.status='active' and p.status='active'
 and (e.provider<>'firebase' or
   (auth.jwt()->>'auth_time' ~ '^[0-9]{1,12}$' and
    (auth.jwt()->>'auth_time')::numeric > extract(epoch from e.tokens_valid_after)))
$$;
revoke all on function private.current_app_user_id() from public,anon;
grant execute on function private.current_app_user_id() to authenticated;

create function public.current_profile_id() returns uuid
language sql stable security invoker set search_path='' as $$ select private.current_app_user_id() $$;
revoke all on function public.current_profile_id() from public,anon;
grant execute on function public.current_profile_id() to authenticated;

-- No profile/UID arguments: the gateway-verified JWT alone determines the identity.
-- Serializes concurrent first requests across application instances.
create function public.onboard_firebase_profile() returns uuid
language plpgsql security definer set search_path='' as $$
declare identity private.external_identities; profile uuid; claims jsonb := auth.jwt();
begin
 if not private.is_trusted_identity_token() or claims->>'iss'<>'https://securetoken.google.com/diagonproduction'
 or coalesce(length(claims->>'sub'),0) not between 1 and 128
 or coalesce(claims->>'auth_time','') !~ '^[0-9]{1,12}$'
 then raise exception 'Verified Firebase identity required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended((claims->>'iss') || ':' || (claims->>'sub'),0));
 select * into identity from private.external_identities where issuer=claims->>'iss' and subject=claims->>'sub' for update;
 if found then
  profile := private.current_app_user_id();
  if profile is null then raise exception 'Identity unavailable' using errcode='42501'; end if;
  return profile;
 end if;
 profile := gen_random_uuid();
 insert into public.profiles(id,display_name) values(profile,left(claims->>'name',128));
 insert into private.external_identities(profile_id,provider,issuer,subject,verified_at)
 values(profile,'firebase',claims->>'iss',claims->>'sub',now());
 return profile;
end $$;
revoke all on function public.onboard_firebase_profile() from public,anon;
grant execute on function public.onboard_firebase_profile() to authenticated;

create function public.revoke_my_firebase_identity() returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_trusted_identity_token() or auth.jwt()->>'iss'<>'https://securetoken.google.com/diagonproduction'
 then raise exception 'Verified Firebase identity required' using errcode='42501'; end if;
 update private.external_identities set tokens_valid_after=now()
 where provider='firebase' and issuer=auth.jwt()->>'iss' and subject=auth.jwt()->>'sub';
end $$;
revoke all on function public.revoke_my_firebase_identity() from public,anon;
grant execute on function public.revoke_my_firebase_identity() to authenticated;

-- Also protects raw-subject Storage ownership and future permissive policies.
do $$ declare t record;
begin
 for t in select tablename from pg_catalog.pg_tables where schemaname='public' loop
  execute format('create policy trusted_identity on public.%I as restrictive to authenticated using ((select private.current_app_user_id()) is not null) with check ((select private.current_app_user_id()) is not null)',t.tablename);
 end loop;
end $$;
create policy lms_trusted_identity on storage.objects as restrictive to authenticated
using (bucket_id not in ('lms-course-media','lms-submissions') or (select private.current_app_user_id()) is not null)
with check (bucket_id not in ('lms-course-media','lms-submissions') or (select private.current_app_user_id()) is not null);
comment on table private.external_identities is 'Verified issuer/subject to stable UUID mapping. Private, never email-linked; contextual roles remain relational. Firebase onboarding creates only a new empty profile.';
