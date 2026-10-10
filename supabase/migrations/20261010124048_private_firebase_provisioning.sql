-- Expose only invoker wrappers. The reviewed privileged implementations live
-- in the non-exposed private schema alongside the other authorization helpers.
do $$ declare name text; definition text;
begin
 foreach name in array array['onboard_firebase_profile','revoke_my_firebase_identity'] loop
  definition := pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.' || name || '()'));
  execute replace(definition,'FUNCTION public.' || name || '()','FUNCTION private.' || name || '()');
  execute format('revoke all on function private.%I() from public,anon',name);
  execute format('grant execute on function private.%I() to authenticated',name);
 end loop;
end $$;
create or replace function public.onboard_firebase_profile() returns uuid
language sql security invoker set search_path='' as $$ select private.onboard_firebase_profile() $$;
create or replace function public.revoke_my_firebase_identity() returns void
language sql security invoker set search_path='' as $$ select private.revoke_my_firebase_identity() $$;
revoke all on function public.onboard_firebase_profile(),public.revoke_my_firebase_identity() from public,anon;
grant execute on function public.onboard_firebase_profile(),public.revoke_my_firebase_identity() to authenticated;
