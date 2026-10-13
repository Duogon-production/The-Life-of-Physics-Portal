-- Additive lesson delivery. Existing blocks, progress and Exams are retained.
alter table public.course_modules add column group_type text not null default 'Module' check(group_type in ('Chapter','Month','Unit','Week','Module','Term','Revision'));
grant update(group_type) on public.course_modules to authenticated;
alter table public.lessons add column description text not null default '' check(length(description)<=100000);
grant update(description) on public.lessons to authenticated;

create table public.lesson_segments (
 id uuid primary key default gen_random_uuid(),
 lesson_id uuid not null references public.lessons(id) on delete restrict,
 title text not null check(length(trim(title)) between 1 and 200),
 description text not null default '' check(length(description)<=100000),
 position integer not null check(position>=0),
 status text not null default 'draft' check(status in ('draft','published')),
 video_url text check(video_url is null or (length(video_url)<=2048 and video_url ~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$')),
 video_asset_id uuid references public.media_assets(id) on delete restrict,
 thumbnail_asset_id uuid references public.media_assets(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(lesson_id,position), unique(id,lesson_id), check(video_url is null or video_asset_id is null)
);
create index lesson_segments_video_asset_idx on public.lesson_segments(video_asset_id) where video_asset_id is not null;
create index lesson_segments_thumbnail_idx on public.lesson_segments(thumbnail_asset_id) where thumbnail_asset_id is not null;
create table public.lesson_resources (
 id uuid primary key default gen_random_uuid(), segment_id uuid not null references public.lesson_segments(id) on delete restrict,
 name text not null check(length(trim(name)) between 1 and 200),
 media_asset_id uuid not null references public.media_assets(id) on delete restrict,
 created_at timestamptz not null default now(), unique(segment_id,media_asset_id)
);
create index lesson_resources_media_idx on public.lesson_resources(media_asset_id);
create table public.lesson_segment_progress (
 id uuid primary key default gen_random_uuid(), offering_id uuid not null,
 user_id uuid not null, segment_id uuid not null, lesson_id uuid not null,
 status text not null default 'in_progress' check(status in ('in_progress','completed')),
 video_position_seconds integer not null default 0 check(video_position_seconds between 0 and 604800),
 revision bigint not null default 0 check(revision>=0),
 started_at timestamptz default now(), completed_at timestamptz,
 updated_at timestamptz not null default now(),
 foreign key(offering_id,user_id) references public.enrollments(offering_id,user_id) on delete restrict,
 foreign key(segment_id,lesson_id) references public.lesson_segments(id,lesson_id) on delete restrict,
 unique(offering_id,user_id,segment_id), check((status='completed')=(completed_at is not null)),check(completed_at>=started_at)
);
create index lesson_segment_progress_segment_idx on public.lesson_segment_progress(segment_id,lesson_id);
create index lesson_segment_progress_lesson_idx on public.lesson_segment_progress(lesson_id);
create index lesson_segment_progress_user_idx on public.lesson_segment_progress(user_id,offering_id);
alter table public.lesson_segments enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.lesson_segment_progress enable row level security;
revoke all on public.lesson_segments,public.lesson_resources,public.lesson_segment_progress from public,anon,authenticated;
grant select on public.lesson_segments,public.lesson_resources,public.lesson_segment_progress to authenticated;
create trigger touch_updated_at before update on public.lesson_segments for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.lesson_segment_progress for each row execute function private.touch_updated_at();
create trigger prevent_reparenting before update on public.lesson_segments for each row execute function private.reject_reparenting('id','lesson_id');

create function private.can_view_segment(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lesson_segments s join public.lessons l on l.id=s.lesson_id join public.course_modules m on m.id=l.module_id
 where s.id=p_id and (private.can_edit_course(m.course_id) or private.is_course_staff(m.course_id) or
 (s.status='published' and l.status='published' and private.can_view_lesson(l.id))))
$$;
revoke all on function private.can_view_segment(uuid) from public,anon;
grant execute on function private.can_view_segment(uuid) to authenticated;
create policy segments_read on public.lesson_segments for select to authenticated using(private.can_view_segment(id));
create policy resources_read on public.lesson_resources for select to authenticated using(private.can_view_segment(segment_id));
create policy segment_progress_read on public.lesson_segment_progress for select to authenticated using
 ((user_id=(select private.current_app_user_id()) and private.is_active_user()) or private.can_support_offering(offering_id));

-- A ready resource/video must be course media from the same organization.
create function private.check_segment_media() returns trigger language plpgsql security definer set search_path='' as $$
declare asset uuid; lesson uuid; org uuid; assets uuid[];
begin
 if tg_table_name='lesson_segments' then assets:=array[new.video_asset_id,new.thumbnail_asset_id]; lesson:=new.lesson_id;
 else assets:=array[new.media_asset_id]; select x.lesson_id into lesson from public.lesson_segments x where x.id=new.segment_id; end if;
 select c.organization_id into org from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=lesson;
 foreach asset in array assets loop
  if asset is not null then
   perform 1 from public.media_assets a where a.id=asset for share;
   if not exists(select 1 from public.media_assets a where a.id=asset and a.organization_id=org and a.bucket='lms-course-media' and a.status='ready'
    and (tg_table_name<>'lesson_segments' or
     ((asset is distinct from nullif(to_jsonb(new)->>'video_asset_id','')::uuid or a.mime_type='video/mp4')
      and (asset is distinct from nullif(to_jsonb(new)->>'thumbnail_asset_id','')::uuid or a.mime_type in ('image/png','image/jpeg','image/webp')))))
    or ((select private.current_app_user_id()) is not null and not private.can_view_media(asset)) then raise exception 'Invalid lesson media' using errcode='23514'; end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function private.check_segment_media() from public,anon,authenticated;
create trigger check_segment_media before insert or update on public.lesson_segments for each row execute function private.check_segment_media();
create trigger check_segment_media before insert or update on public.lesson_resources for each row execute function private.check_segment_media();

create or replace function private.can_view_media(asset_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.media_assets a where a.id=$1 and
 (a.uploaded_by=(select private.current_app_user_id()) and private.is_active_user() or private.has_org_role(a.organization_id,array['owner','admin'])
 or (a.offering_id is not null and private.can_support_offering(a.offering_id))
 or exists(select 1 from public.lesson_blocks b where b.media_asset_id=a.id and private.can_view_lesson(b.lesson_id))
 or exists(select 1 from public.lesson_segments s where (s.video_asset_id=a.id or s.thumbnail_asset_id=a.id) and private.can_view_segment(s.id))
 or exists(select 1 from public.lesson_resources r where r.media_asset_id=a.id and private.can_view_segment(r.segment_id))))
$$;

-- All author writes serialize at the course root; stale edits fail rather than overwrite.
create function private.edit_learning_content(p_course_id uuid,p_action text,p_id uuid,p_parent_id uuid,p_updated_at timestamptz,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid; stamp timestamptz; parent uuid; item jsonb; n integer; i integer; tbl text; parent_col text;
begin
 perform 1 from public.courses c where c.id=p_course_id for update;
 if not private.can_edit_course(p_course_id) then raise exception 'Content editing denied' using errcode='42501'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid content' using errcode='23514'; end if;
 if p_action in ('create_module','edit_module','reorder_modules') then tbl:='course_modules'; parent_col:='course_id'; parent:=p_course_id;
 elsif p_action in ('create_lesson','edit_lesson','reorder_lessons') then
  tbl:='lessons'; parent_col:='module_id';
  if p_action='edit_lesson' then select l.module_id into parent from public.lessons l where l.id=p_id; else parent:=p_parent_id; end if;
  if not exists(select 1 from public.course_modules m where m.id=parent and m.course_id=p_course_id) then raise exception 'Module unavailable' using errcode='42501'; end if;
 elsif p_action='edit_block' then
  tbl:='lesson_blocks'; parent_col:='lesson_id';select b.lesson_id into parent from public.lesson_blocks b where b.id=p_id;
  if not exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=parent and m.course_id=p_course_id) then raise exception 'Lesson unavailable' using errcode='42501'; end if;
 elsif p_action in ('create_segment','edit_segment','reorder_segments','attach_resource','remove_resource') then
  tbl:='lesson_segments'; parent_col:='lesson_id';
  if p_action in ('edit_segment','attach_resource','remove_resource') then select s.lesson_id into parent from public.lesson_segments s where s.id=p_id; else parent:=p_parent_id; end if;
  if not exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=parent and m.course_id=p_course_id) then raise exception 'Lesson unavailable' using errcode='42501'; end if;
 else raise exception 'Unknown content action' using errcode='23514'; end if;
 if p_action like 'create_%' then
  if length(trim(coalesce(p_data->>'title',''))) not between 1 and 200 then raise exception 'Title required' using errcode='23514'; end if;
  execute format('select coalesce(max(position),-1)+1 from public.%I where %I=$1',tbl,parent_col) into n using parent;
  if n>=500 then raise exception 'Content limit reached' using errcode='23514'; end if;
  execute format('insert into public.%I(%I,title,position) values($1,$2,$3) returning id',tbl,parent_col) into target using parent,trim(p_data->>'title'),n;
  return target;
 end if;
 if p_action like 'reorder_%' then
  if jsonb_typeof(p_data->'items') is distinct from 'array' or jsonb_array_length(p_data->'items')>500 then raise exception 'Invalid order' using errcode='23514'; end if;
  execute format('select count(*) from public.%I where %I=$1',tbl,parent_col) into n using parent;
  if n<>jsonb_array_length(p_data->'items') or n<>(select count(distinct x->>'id') from jsonb_array_elements(p_data->'items') x) then raise exception 'Order changed. Reload.' using errcode='PT409'; end if;
  for item in select value from jsonb_array_elements(p_data->'items') loop
   execute format('select updated_at from public.%I where id=$1 and %I=$2',tbl,parent_col) into stamp using (item->>'id')::uuid,parent;
   if stamp is null or stamp is distinct from (item->>'updated_at')::timestamptz then raise exception 'Content changed. Reload.' using errcode='PT409'; end if;
  end loop;
  -- Temporarily shift above the current maximum to satisfy immediate UNIQUE indexes.
  execute format('select coalesce(max(position),0)+1 from public.%I where %I=$1',tbl,parent_col) into i using parent;
  execute format('update public.%I set position=position+$2 where %I=$1',tbl,parent_col) using parent,i;
  i:=0;
  for item in select value from jsonb_array_elements(p_data->'items') loop
   execute format('update public.%I set position=$2 where id=$1',tbl) using (item->>'id')::uuid,i; i:=i+1;
  end loop;
  return parent;
 end if;
 execute format('select updated_at from public.%I where id=$1 and %I=$2',tbl,parent_col) into stamp using p_id,parent;
 if stamp is null then raise exception 'Content unavailable' using errcode='42501'; end if;
 if p_updated_at is null or stamp is distinct from p_updated_at then raise exception 'Content changed. Reload.' using errcode='PT409'; end if;
 if p_action='edit_block' then
  if jsonb_typeof(p_data->'text') is distinct from 'string' or length(p_data->>'text')>100000 or not exists(select 1 from public.lesson_blocks b where b.id=p_id and b.block_type in ('text','heading','callout')) then raise exception 'Invalid text block' using errcode='23514'; end if;
  update public.lesson_blocks set content=(content-'html')||jsonb_build_object('text',p_data->>'text') where id=p_id;return p_id;
 end if;
 if p_action='attach_resource' then
  insert into public.lesson_resources(segment_id,name,media_asset_id) values(p_id,p_data->>'name',(p_data->>'asset_id')::uuid) returning id into target;
  update public.lesson_segments set title=title where id=p_id; return target;
 elsif p_action='remove_resource' then
  delete from public.lesson_resources where id=(p_data->>'resource_id')::uuid and segment_id=p_id;
  update public.lesson_segments set title=title where id=p_id; return p_id;
 end if;
 if length(trim(coalesce(p_data->>'title',''))) not between 1 and 200 or length(coalesce(p_data->>'description',''))>100000 then raise exception 'Invalid title/description' using errcode='23514'; end if;
 if p_action='edit_module' then update public.course_modules set title=trim(p_data->>'title'),description=coalesce(p_data->>'description',''),group_type=coalesce(p_data->>'group_type',group_type) where id=p_id;
 elsif p_action='edit_lesson' then
  if p_data->>'status'='published' and not exists(select 1 from public.lesson_segments s where s.lesson_id=p_id and s.status='published') then raise exception 'Publish a part first' using errcode='23514'; end if;
  update public.lessons set title=trim(p_data->>'title'),description=coalesce(p_data->>'description',''),status=p_data->>'status' where id=p_id;
 else
  if p_data->>'status'='published' and nullif(trim(p_data->>'description'),'') is null and nullif(p_data->>'video_url','') is null and nullif(p_data->>'video_asset_id','') is null and not exists(select 1 from public.lesson_resources r where r.segment_id=p_id) and not exists(select 1 from public.lesson_blocks b where b.lesson_id=parent) then raise exception 'Add video, notes or a resource first' using errcode='23514'; end if;
  update public.lesson_segments set title=trim(p_data->>'title'),description=coalesce(p_data->>'description',''),status=p_data->>'status',video_url=nullif(p_data->>'video_url',''),video_asset_id=nullif(p_data->>'video_asset_id','')::uuid,thumbnail_asset_id=nullif(p_data->>'thumbnail_asset_id','')::uuid where id=p_id;
 end if;
 return p_id;
end $$;
revoke all on function private.edit_learning_content(uuid,text,uuid,uuid,timestamptz,jsonb) from public,anon;
grant execute on function private.edit_learning_content(uuid,text,uuid,uuid,timestamptz,jsonb) to authenticated;
create function public.edit_learning_content(p_course_id uuid,p_action text,p_id uuid,p_parent_id uuid,p_updated_at timestamptz,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.edit_learning_content(p_course_id,p_action,p_id,p_parent_id,p_updated_at,p_data) $$;
revoke all on function public.edit_learning_content(uuid,text,uuid,uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.edit_learning_content(uuid,text,uuid,uuid,timestamptz,jsonb) to authenticated;

create function private.save_segment_progress(p_offering_id uuid,p_segment_id uuid,p_position integer,p_complete boolean,p_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.lesson_segments; p public.lesson_segment_progress; c uuid; total integer; done integer;
begin
 select x.* into s from public.lesson_segments x where x.id=p_segment_id for share;
 select m.course_id into c from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=s.lesson_id;
 -- Enrollment lock serializes saves for this student/offering, including different parts.
 perform 1 from public.enrollments e where e.offering_id=p_offering_id and e.user_id=(select private.current_app_user_id()) for share;
 if s.id is null or s.status<>'published' or not private.can_view_segment(s.id) or not private.is_enrolled(p_offering_id)
 or not exists(select 1 from public.course_offerings o where o.id=p_offering_id and o.course_id=c) then raise exception 'Lesson access denied' using errcode='42501'; end if;
 if p_position is null or p_position not between 0 and 604800 or p_complete is null or p_revision is null then raise exception 'Invalid progress' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_offering_id::text||':'||(select private.current_app_user_id())::text,0));
 select * into p from public.lesson_segment_progress x where x.offering_id=p_offering_id and x.segment_id=s.id and x.user_id=(select private.current_app_user_id()) for update;
 if coalesce(p.revision,0)<>p_revision then raise exception 'Progress changed. Reload.' using errcode='PT409'; end if;
 insert into public.lesson_segment_progress(offering_id,user_id,segment_id,lesson_id,status,video_position_seconds,completed_at,revision)
 values(p_offering_id,(select private.current_app_user_id()),s.id,s.lesson_id,case when p_complete then 'completed' else 'in_progress' end,p_position,case when p_complete then now() end,1)
 on conflict(offering_id,user_id,segment_id) do update set video_position_seconds=excluded.video_position_seconds,
 status=case when lesson_segment_progress.status='completed' or p_complete then 'completed' else 'in_progress' end,
 completed_at=coalesce(lesson_segment_progress.completed_at,excluded.completed_at),revision=lesson_segment_progress.revision+1 returning * into p;
 select count(*),count(*) filter(where x.status='completed') into total,done from public.lesson_segments sg left join public.lesson_segment_progress x on x.segment_id=sg.id and x.offering_id=p_offering_id and x.user_id=(select private.current_app_user_id()) where sg.lesson_id=s.lesson_id and sg.status='published';
 insert into public.lesson_progress(offering_id,lesson_id,user_id,status,started_at,completed_at,last_accessed_at,video_position_seconds)
 values(p_offering_id,s.lesson_id,(select private.current_app_user_id()),case when total>0 and total=done then 'completed' else 'in_progress' end,now(),case when total>0 and total=done then now() end,now(),p_position)
 on conflict(offering_id,lesson_id,user_id) do update set status=excluded.status,completed_at=excluded.completed_at,last_accessed_at=now(),video_position_seconds=excluded.video_position_seconds;
 return jsonb_build_object('revision',p.revision,'status',p.status,'position',p.video_position_seconds);
end $$;
revoke all on function private.save_segment_progress(uuid,uuid,integer,boolean,bigint) from public,anon;
grant execute on function private.save_segment_progress(uuid,uuid,integer,boolean,bigint) to authenticated;
create function public.save_segment_progress(p_offering_id uuid,p_segment_id uuid,p_position integer,p_complete boolean,p_revision bigint) returns jsonb language sql security invoker set search_path='' as $$ select private.save_segment_progress(p_offering_id,p_segment_id,p_position,p_complete,p_revision) $$;
revoke all on function public.save_segment_progress(uuid,uuid,integer,boolean,bigint) from public,anon;
grant execute on function public.save_segment_progress(uuid,uuid,integer,boolean,bigint) to authenticated;

-- Exact owned, unreferenced COURSE uploads only. Never student submissions.
-- The asset lock conflicts with attachment validation, closing cleanup/link races.
create function private.archive_unused_lesson_upload(p_asset_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare m public.media_assets;
begin
 select * into m from public.media_assets where id=p_asset_id for update;
 if m.id is null or m.bucket<>'lms-course-media' or m.uploaded_by is distinct from (select private.current_app_user_id()) or not private.is_active_user() then raise exception 'Cleanup denied' using errcode='42501'; end if;
 if exists(select 1 from public.lesson_blocks b where b.media_asset_id=m.id) or exists(select 1 from public.assessment_responses r where r.media_asset_id=m.id)
 or exists(select 1 from public.lesson_segments s where s.video_asset_id=m.id or s.thumbnail_asset_id=m.id) or exists(select 1 from public.lesson_resources r where r.media_asset_id=m.id) then raise exception 'Media is referenced' using errcode='23514'; end if;
 update public.media_assets set status='archived' where id=m.id;
end $$;
revoke all on function private.archive_unused_lesson_upload(uuid) from public,anon;
grant execute on function private.archive_unused_lesson_upload(uuid) to authenticated;
create function public.archive_unused_lesson_upload(p_asset_id uuid) returns void language sql security invoker set search_path='' as $$ select private.archive_unused_lesson_upload(p_asset_id) $$;
revoke all on function public.archive_unused_lesson_upload(uuid) from public,anon;
grant execute on function public.archive_unused_lesson_upload(uuid) to authenticated;
create function private.can_remove_lesson_upload(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select p_bucket='lms-course-media' and private.is_active_user() and exists(select 1 from public.media_assets m where m.bucket=p_bucket and m.object_path=p_path
 and m.status='archived' and m.uploaded_by=(select private.current_app_user_id())
 and not exists(select 1 from public.lesson_blocks b where b.media_asset_id=m.id)
 and not exists(select 1 from public.assessment_responses r where r.media_asset_id=m.id)
 and not exists(select 1 from public.lesson_segments s where s.video_asset_id=m.id or s.thumbnail_asset_id=m.id)
 and not exists(select 1 from public.lesson_resources r where r.media_asset_id=m.id))
$$;
revoke all on function private.can_remove_lesson_upload(text,text) from public,anon;
grant execute on function private.can_remove_lesson_upload(text,text) to authenticated;
create policy lms_unused_course_object_delete on storage.objects for delete to authenticated using(private.can_remove_lesson_upload(bucket_id,name));
-- Storage's removal API also needs to locate the exact owned archived object.
create policy lms_unused_course_object_read on storage.objects for select to authenticated using(private.can_remove_lesson_upload(bucket_id,name));

-- Bind new uploads to the course whose editor authorized them. This permits
-- contextual assistant editors without granting organization-wide teacher rights.
create table private.lesson_upload_scopes (
 asset_id uuid primary key references public.media_assets(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete restrict
);
create index lesson_upload_scopes_course_idx on private.lesson_upload_scopes(course_id);
alter table private.lesson_upload_scopes enable row level security;
revoke all on private.lesson_upload_scopes from public,anon,authenticated;
create function private.register_lesson_upload(p_course_id uuid,p_mime text,p_filename text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare asset uuid:=gen_random_uuid(); org uuid; kind text; extension text; path text;
begin
 if not private.can_edit_course(p_course_id) then raise exception 'Upload denied' using errcode='42501'; end if;
 if p_mime not in ('video/mp4','application/pdf','image/png','image/jpeg','image/webp') or p_filename is null or length(trim(p_filename)) not between 1 and 200 then raise exception 'Invalid upload metadata' using errcode='23514'; end if;
 select c.organization_id into org from public.courses c where c.id=p_course_id for share;
 kind:=case when p_mime='video/mp4' then 'video' when p_mime='application/pdf' then 'pdf' else 'image' end;
 extension:=case p_mime when 'video/mp4' then 'mp4' when 'application/pdf' then 'pdf' when 'image/png' then 'png' when 'image/jpeg' then 'jpg' else 'webp' end;
 path:=org::text||'/'||asset::text||'/resource.'||extension;
 insert into public.media_assets(id,organization_id,uploaded_by,kind,mime_type,original_filename,bucket,object_path)
 values(asset,org,(select private.current_app_user_id()),kind,p_mime,p_filename,'lms-course-media',path);
 insert into private.lesson_upload_scopes(asset_id,course_id) values(asset,p_course_id);
 return jsonb_build_object('id',asset,'path',path);
end $$;
revoke all on function private.register_lesson_upload(uuid,text,text) from public,anon;
grant execute on function private.register_lesson_upload(uuid,text,text) to authenticated;
create function public.register_lesson_upload(p_course_id uuid,p_mime text,p_filename text) returns jsonb language sql security invoker set search_path='' as $$ select private.register_lesson_upload(p_course_id,p_mime,p_filename) $$;
revoke all on function public.register_lesson_upload(uuid,text,text) from public,anon;
grant execute on function public.register_lesson_upload(uuid,text,text) to authenticated;

create function private.get_lesson_upload(p_course_id uuid,p_asset_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.media_assets;
begin
 if not private.can_edit_course(p_course_id) then raise exception 'Upload inspection denied' using errcode='42501'; end if;
 select a.* into m from public.media_assets a join private.lesson_upload_scopes u on u.asset_id=a.id where a.id=p_asset_id and u.course_id=p_course_id
 and a.uploaded_by=(select private.current_app_user_id()) and a.bucket='lms-course-media' and a.status in ('pending','ready');
 if m.id is null then raise exception 'Upload inspection denied' using errcode='42501'; end if;
 return jsonb_build_object('id',m.id,'path',m.object_path,'mime',m.mime_type,'name',m.original_filename);
end $$;
revoke all on function private.get_lesson_upload(uuid,uuid) from public,anon;
grant execute on function private.get_lesson_upload(uuid,uuid) to authenticated;
create function public.get_lesson_upload(p_course_id uuid,p_asset_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.get_lesson_upload(p_course_id,p_asset_id) $$;
revoke all on function public.get_lesson_upload(uuid,uuid) from public,anon;
grant execute on function public.get_lesson_upload(uuid,uuid) to authenticated;

create function private.can_review_lesson_upload(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select p_bucket='lms-course-media' and exists(select 1 from public.media_assets m join private.lesson_upload_scopes u on u.asset_id=m.id
 where m.bucket=p_bucket and m.object_path=p_path and m.status='pending' and m.upload_expires_at>now()
 and m.uploaded_by=(select private.current_app_user_id()) and private.can_edit_course(u.course_id))
$$;
revoke all on function private.can_review_lesson_upload(text,text) from public,anon;
grant execute on function private.can_review_lesson_upload(text,text) to authenticated;
create policy lms_pending_lesson_object_read on storage.objects for select to authenticated using(private.can_review_lesson_upload(bucket_id,name));

create or replace function private.can_upload_media(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.media_assets m where m.bucket=p_bucket and m.object_path=p_path
 and m.storage_provider='supabase' and m.uploaded_by=(select private.current_app_user_id()) and m.status='pending' and m.upload_expires_at>now()
 and (not exists(select 1 from private.lesson_upload_scopes u where u.asset_id=m.id) or exists(select 1 from private.lesson_upload_scopes u where u.asset_id=m.id and private.can_edit_course(u.course_id)))
 and ((m.bucket='lms-course-media' and (private.has_org_role(m.organization_id,array['owner','admin','teacher'])
 or exists(select 1 from private.lesson_upload_scopes u where u.asset_id=m.id and private.can_edit_course(u.course_id))))
 or (m.bucket='lms-submissions' and private.is_enrolled(m.offering_id))))
$$;

create or replace function private.complete_media_upload(p_asset_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare m public.media_assets; object_owner text; bytes bigint; actual_mime text; limit_bytes bigint; scoped boolean;
begin
 select * into m from public.media_assets where id=p_asset_id for update;
 select exists(select 1 from private.lesson_upload_scopes u where u.asset_id=m.id) into scoped;
 if scoped and not exists(select 1 from private.lesson_upload_scopes u where u.asset_id=m.id and private.can_edit_course(u.course_id)) then raise exception 'Course upload permission was revoked' using errcode='42501'; end if;
 if m.id is null or m.uploaded_by is distinct from (select private.current_app_user_id()) or not private.is_active_user()
 or not ((m.bucket='lms-course-media' and (private.has_org_role(m.organization_id,array['owner','admin','teacher']) or scoped))
 or (m.bucket='lms-submissions' and private.is_enrolled(m.offering_id))) then raise exception 'Upload completion not permitted' using errcode='42501'; end if;
 if m.status='ready' then return; end if;
 if not private.can_upload_media(m.bucket,m.object_path) then raise exception 'Upload expired or unavailable' using errcode='42501'; end if;
 select o.owner_id,(o.metadata->>'size')::bigint,o.metadata->>'mimetype' into object_owner,bytes,actual_mime from storage.objects o where o.bucket_id=m.bucket and o.name=m.object_path;
 select b.file_size_limit into limit_bytes from storage.buckets b where b.id=m.bucket;
 if scoped then limit_bytes:=least(limit_bytes,case when m.mime_type='video/mp4' then 50000000 when m.mime_type='application/pdf' then 20971520 else 5242880 end); end if;
 if bytes is null then raise exception 'Storage object does not exist' using errcode='23514'; end if;
 if object_owner is distinct from (select auth.jwt()->>'sub') or bytes<0 or bytes>limit_bytes or actual_mime is distinct from m.mime_type then
  raise exception 'Storage object ownership, size or MIME mismatch' using errcode='23514'; end if;
 update public.media_assets set status='ready',size_bytes=bytes where id=m.id;
end $$;

-- Maintenance queue includes all new references. Storage objects are removed only
-- through the Storage API by trusted maintenance, never DELETE FROM storage.objects.
create or replace view private.expired_media_uploads with (security_invoker=true) as
 select id,organization_id,uploaded_by,storage_provider,bucket,object_path,upload_expires_at
 from public.media_assets m where ((status='pending' and upload_expires_at<now()) or status='archived')
 and not exists(select 1 from public.lesson_blocks b where b.media_asset_id=m.id)
 and not exists(select 1 from public.assessment_responses r where r.media_asset_id=m.id)
 and not exists(select 1 from public.lesson_segments s where s.video_asset_id=m.id or s.thumbnail_asset_id=m.id)
 and not exists(select 1 from public.lesson_resources r where r.media_asset_id=m.id);
revoke all on private.expired_media_uploads from public,anon,authenticated;

-- Compatibility for existing SUPABASE block-based lessons, not legacy imports.
-- Preserve every block/lesson/progress row. Add one real initial delivery part
-- only where content already exists, retaining the lesson's publication status.
do $$ begin
 if exists(select 1 from public.lessons l where exists(select 1 from public.lesson_blocks b where b.lesson_id=l.id) and length(trim(l.title)) not between 1 and 200) then
  raise exception 'Existing block lesson titles require review' using errcode='23514';
 end if;
end $$;
insert into public.lesson_segments(lesson_id,title,position,status)
 select l.id,l.title,0,l.status from public.lessons l
 where exists(select 1 from public.lesson_blocks b where b.lesson_id=l.id)
 and not exists(select 1 from public.lesson_segments s where s.lesson_id=l.id);
insert into public.lesson_segment_progress(offering_id,user_id,segment_id,lesson_id,status,video_position_seconds,revision,started_at,completed_at,updated_at)
 select p.offering_id,p.user_id,s.id,p.lesson_id,p.status,coalesce(p.video_position_seconds,0),1,p.started_at,p.completed_at,p.updated_at
 from public.lesson_progress p join public.lesson_segments s on s.lesson_id=p.lesson_id and s.position=0
 where p.status in ('in_progress','completed') and exists(select 1 from public.lesson_blocks b where b.lesson_id=p.lesson_id);
