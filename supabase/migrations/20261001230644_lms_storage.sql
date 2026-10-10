-- Existing portal uploads justify private course/submission buckets. UploadThing
-- files are not migrated automatically; clients must register media metadata first.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('lms-course-media','lms-course-media',false,536870912,array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','text/plain']),
 ('lms-submissions','lms-submissions',false,20971520,array['image/jpeg','image/png','image/webp','application/pdf','text/plain']);

create function private.can_upload_media(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.media_assets m where m.bucket=p_bucket and m.object_path=p_path and m.uploaded_by=(select auth.uid()) and m.status='pending' and
 ((m.bucket='lms-course-media' and private.has_org_role(m.organization_id,array['owner','admin','teacher'])) or (m.bucket='lms-submissions' and private.is_enrolled(m.offering_id))))
$$;
create function private.can_download_media(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.media_assets m where m.bucket=p_bucket and m.object_path=p_path and private.can_view_media(m.id))
$$;
revoke all on function private.can_upload_media(text,text),private.can_download_media(text,text) from public,anon;
grant execute on function private.can_upload_media(text,text),private.can_download_media(text,text) to authenticated;
create policy lms_objects_insert on storage.objects for insert to authenticated with check
 (bucket_id in ('lms-course-media','lms-submissions') and private.can_upload_media(bucket_id,name));
create policy lms_objects_select on storage.objects for select to authenticated using
 (bucket_id in ('lms-course-media','lms-submissions') and private.can_download_media(bucket_id,name));
-- No overwrite/delete: files referenced by historical submissions must survive.
-- Replacements receive new immutable paths; trusted retention jobs clean orphans.
create function private.complete_media_upload(p_asset_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.media_assets; bytes bigint;
begin
 select * into m from public.media_assets where id=p_asset_id for update;
 if m.id is null or not private.can_upload_media(m.bucket,m.object_path) then raise exception 'Upload completion not permitted' using errcode='42501'; end if;
 select (o.metadata->>'size')::bigint into bytes from storage.objects o where o.bucket_id=m.bucket and o.name=m.object_path;
 if bytes is null then raise exception 'Storage object does not exist' using errcode='23514'; end if;
 update public.media_assets set status='ready',size_bytes=bytes where id=m.id;
end $$;
revoke all on function private.complete_media_upload(uuid) from public,anon;
grant execute on function private.complete_media_upload(uuid) to authenticated;
create function public.complete_media_upload(p_asset_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.complete_media_upload(p_asset_id) $$;
revoke all on function public.complete_media_upload(uuid) from public,anon;
grant execute on function public.complete_media_upload(uuid) to authenticated;
