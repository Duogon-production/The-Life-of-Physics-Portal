-- Free-tier upload bound; per-student exam start serialization.
update storage.buckets set file_size_limit=50000000 where id='lms-course-media';

-- Keep the relational asset reference stable when changing storage providers.
alter table public.media_assets drop constraint media_assets_storage_provider_check;
alter table public.media_assets add constraint media_assets_storage_provider_check check(storage_provider in ('supabase','r2','external'));
alter table public.media_assets add column upload_expires_at timestamptz not null default (now()+interval '24 hours');
alter table public.media_assets add constraint media_assets_safe_path check(object_path !~ '(^|/)\.\.(/|$)' and length(object_path)<=1024);
create index media_assets_pending_expiry_idx on public.media_assets(upload_expires_at) where status='pending';
revoke insert on public.media_assets from authenticated;
grant insert(id,organization_id,uploaded_by,offering_id,kind,mime_type,original_filename,bucket,object_path) on public.media_assets to authenticated;

create or replace function private.can_upload_media(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.media_assets m where m.bucket=p_bucket and m.object_path=p_path
 and m.storage_provider='supabase' and m.uploaded_by=(select auth.uid()) and m.status='pending' and m.upload_expires_at>now()
 and ((m.bucket='lms-course-media' and private.has_org_role(m.organization_id,array['owner','admin','teacher']))
 or (m.bucket='lms-submissions' and private.is_enrolled(m.offering_id))))
$$;
create or replace function private.can_download_media(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.media_assets m where m.bucket=p_bucket and m.object_path=p_path
 and m.storage_provider='supabase' and m.status='ready' and private.can_view_media(m.id))
$$;
alter policy lms_objects_insert on storage.objects with check
 (bucket_id in ('lms-course-media','lms-submissions') and owner_id=(select auth.jwt()->>'sub') and private.can_upload_media(bucket_id,name));

create or replace function private.complete_media_upload(p_asset_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare m public.media_assets; object_owner text; bytes bigint; actual_mime text; limit_bytes bigint;
begin
 select * into m from public.media_assets where id=p_asset_id for update;
 if m.id is null or m.uploaded_by is distinct from (select auth.uid()) or not private.is_active_user()
 or not ((m.bucket='lms-course-media' and private.has_org_role(m.organization_id,array['owner','admin','teacher']))
 or (m.bucket='lms-submissions' and private.is_enrolled(m.offering_id))) then raise exception 'Upload completion not permitted' using errcode='42501'; end if;
 if m.status='ready' then return; end if;
 if not private.can_upload_media(m.bucket,m.object_path) then raise exception 'Upload expired or unavailable' using errcode='42501'; end if;
 select o.owner_id,(o.metadata->>'size')::bigint,o.metadata->>'mimetype' into object_owner,bytes,actual_mime from storage.objects o where o.bucket_id=m.bucket and o.name=m.object_path;
 select b.file_size_limit into limit_bytes from storage.buckets b where b.id=m.bucket;
 if bytes is null then raise exception 'Storage object does not exist' using errcode='23514'; end if;
 if object_owner is distinct from (select auth.jwt()->>'sub') or bytes<0 or bytes>limit_bytes or actual_mime is distinct from m.mime_type then
   raise exception 'Storage object ownership, size or MIME mismatch' using errcode='23514';
 end if;
 update public.media_assets set status='ready',size_bytes=bytes where id=m.id;
end $$;

create function private.abandon_media_upload(p_asset_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare m public.media_assets;
begin
 select * into m from public.media_assets where id=p_asset_id for update;
 if m.id is null or m.uploaded_by is distinct from (select auth.uid()) or not private.is_active_user() then raise exception 'Upload unavailable' using errcode='42501'; end if;
 if m.status='archived' then return; end if;
 if m.status<>'pending' then raise exception 'Referenced completed assets cannot be abandoned' using errcode='23514'; end if;
 update public.media_assets set status='archived' where id=m.id;
end $$;
revoke all on function private.abandon_media_upload(uuid) from public,anon;
grant execute on function private.abandon_media_upload(uuid) to authenticated;
create function public.abandon_media_upload(p_asset_id uuid) returns void language sql security invoker set search_path='' as $$ select private.abandon_media_upload(p_asset_id) $$;
revoke all on function public.abandon_media_upload(uuid) from public,anon;
grant execute on function public.abandon_media_upload(uuid) to authenticated;

-- No deletion here: a trusted maintenance process must remove expired objects via
-- the Storage API before archiving metadata. This private queue has no API grants.
create view private.expired_media_uploads with (security_invoker=true) as
 select id,organization_id,uploaded_by,storage_provider,bucket,object_path,upload_expires_at
 from public.media_assets m where (status='pending' and upload_expires_at<now()) or
 (status='archived' and not exists(select 1 from public.lesson_blocks b where b.media_asset_id=m.id)
 and not exists(select 1 from public.assessment_responses r where r.media_asset_id=m.id));
revoke all on private.expired_media_uploads from public,anon,authenticated;

create or replace function private.start_assessment_attempt(p_offering_assessment_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare oa public.offering_assessments; a public.assessments; existing public.assessment_attempts; num integer; aid uuid; deadline timestamptz; total numeric; started timestamptz;
begin
 select ass.* into a from public.assessments ass join public.offering_assessments x on x.assessment_id=ass.id where x.id=p_offering_assessment_id for share of ass;
 select * into oa from public.offering_assessments where id=p_offering_assessment_id for share;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_offering_assessment_id::text || coalesce((select auth.uid())::text,'anonymous'),0));
 perform 1 from public.enrollments e where e.offering_id=oa.offering_id and e.user_id=(select auth.uid()) for share;
 if oa.id is null or not private.is_enrolled(oa.offering_id) or not oa.published or a.status<>'published' then raise exception 'Assessment unavailable' using errcode='42501'; end if;
 if (oa.opens_at is not null and clock_timestamp()<oa.opens_at) or (oa.closes_at is not null and clock_timestamp()>=oa.closes_at) then raise exception 'Outside assessment window' using errcode='42501'; end if;
 select * into existing from public.assessment_attempts x where x.offering_assessment_id=oa.id and x.user_id=(select auth.uid()) and x.status='in_progress' order by x.attempt_number desc limit 1;
 if existing.id is not null then
   if existing.deadline_at is null or clock_timestamp()<existing.deadline_at then return existing.id; end if;
   update public.assessment_attempts set status='submitted', submitted_at=clock_timestamp() where id=existing.id;
 end if;
 select coalesce(max(x.attempt_number),0)+1 into num from public.assessment_attempts x where x.offering_assessment_id=oa.id and x.user_id=(select auth.uid());
 if oa.max_attempts is not null and num>oa.max_attempts then raise exception 'Attempt limit reached' using errcode='42501'; end if;
 started:=clock_timestamp();
 deadline:=case when oa.time_limit_seconds is null then oa.closes_at else least(oa.closes_at,started+make_interval(secs=>oa.time_limit_seconds)) end;
 if deadline is not null and deadline<=started then raise exception 'Assessment closed' using errcode='42501'; end if;
 select coalesce(sum(q.points),0) into total from public.assessment_questions q where q.assessment_id=a.id;
 insert into public.assessment_attempts(offering_assessment_id,user_id,attempt_number,started_at,deadline_at,max_score) values(oa.id,(select auth.uid()),num,started,deadline,total) returning id into aid;
 return aid;
end $$;

create function private.require_completed_response_file() returns trigger
language plpgsql security definer set search_path='' as $$
declare m public.media_assets; q public.assessment_questions;
begin
 if new.media_asset_id is not null then
   select * into m from public.media_assets where id=new.media_asset_id;
   select * into q from public.assessment_questions where id=new.question_id;
   if m.status is distinct from 'ready' or q.question_type is distinct from 'file_upload'
   or (q.settings ? 'max_size_bytes' and m.size_bytes>(q.settings->>'max_size_bytes')::bigint)
   or (q.settings ? 'allowed_mime_types' and not (q.settings->'allowed_mime_types' ? m.mime_type)) then
     raise exception 'Submission file is incomplete or disallowed by question settings' using errcode='23514';
   end if;
 end if;
 return new;
end $$;
revoke all on function private.require_completed_response_file() from public,anon,authenticated;
create trigger require_completed_file before insert or update of media_asset_id on public.assessment_responses for each row execute function private.require_completed_response_file();

