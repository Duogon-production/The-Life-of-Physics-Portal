-- An expired/abandoned upload must never become newly referenced while cleanup
-- removes it. Lock the asset for the entire referencing transaction.
create function private.require_ready_lesson_media() returns trigger
language plpgsql security definer set search_path='' as $$
declare asset_status text;
begin
 if new.media_asset_id is not null then
   select m.status into asset_status from public.media_assets m where m.id=new.media_asset_id for share;
   if asset_status is distinct from 'ready' then raise exception 'Lesson media must be ready' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function private.require_ready_lesson_media() from public,anon,authenticated;
create trigger require_ready_media before insert or update of media_asset_id on public.lesson_blocks for each row execute function private.require_ready_lesson_media();

create or replace view private.expired_media_uploads with (security_invoker=true) as
 select id,organization_id,uploaded_by,storage_provider,bucket,object_path,upload_expires_at
 from public.media_assets m where ((status='pending' and upload_expires_at<now()) or status='archived')
 and not exists(select 1 from public.lesson_blocks b where b.media_asset_id=m.id)
 and not exists(select 1 from public.assessment_responses r where r.media_asset_id=m.id);
revoke all on private.expired_media_uploads from public,anon,authenticated;
