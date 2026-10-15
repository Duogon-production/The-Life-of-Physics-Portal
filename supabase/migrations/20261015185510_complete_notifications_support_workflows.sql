-- Additive Step 07. No historical notification backfill, account approvals or staff grants.
create table private.support_operators (
 user_id uuid primary key references public.profiles(id) on delete restrict,
 active boolean not null default true, created_at timestamptz not null default now()
);
create table private.organization_support_staff (
 organization_id uuid not null references public.organizations(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict,
 active boolean not null default true, created_at timestamptz not null default now(), primary key(organization_id,user_id)
);
create index organization_support_staff_user_idx on private.organization_support_staff(user_id,organization_id);
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
 requester_id uuid not null references public.profiles(id) on delete restrict,
 category text not null check(category in ('account','video','upload','exam','website','other')),
 subject text not null check(length(btrim(subject)) between 1 and 120),
 status text not null default 'OPEN' check(status in ('OPEN','IN_PROGRESS','RESOLVED')),
 assigned_to uuid references public.profiles(id) on delete restrict,
 version integer not null default 0 check(version>=0), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), last_message_at timestamptz not null default now(),
 response_due_at timestamptz, first_staff_response_at timestamptz
);
create index support_tickets_requester_idx on public.support_tickets(requester_id,created_at desc);
create index support_tickets_org_queue_idx on public.support_tickets(organization_id,status,updated_at desc);
create index support_tickets_assignee_idx on public.support_tickets(assigned_to) where assigned_to is not null;
create index support_tickets_due_idx on public.support_tickets(response_due_at) where status<>'RESOLVED';
create table public.support_messages (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete restrict,
 sender_id uuid not null references public.profiles(id) on delete restrict, staff boolean not null,
 body text not null check(length(btrim(body)) between 1 and 2000), created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages(ticket_id,created_at,id);
create index support_messages_sender_idx on public.support_messages(sender_id,created_at);
create table private.support_audit (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete restrict,
 actor_id uuid not null references public.profiles(id) on delete restrict, action text not null,
 before_data jsonb not null, after_data jsonb not null, created_at timestamptz not null default now()
);
create index support_audit_ticket_idx on private.support_audit(ticket_id,created_at);
create index support_audit_actor_idx on private.support_audit(actor_id);
create table private.support_requests (
 actor_id uuid not null references public.profiles(id) on delete restrict, request_id uuid not null,
 fingerprint text not null, result jsonb not null, created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
create table public.notification_preferences (
 user_id uuid not null references public.profiles(id) on delete restrict,
 event_type text not null check(event_type in ('account_approved','lesson_published','session_details','session_starting','exam_released','homework_released','support_reply')),
 in_app boolean not null default true, push boolean not null default false, updated_at timestamptz not null default now(),primary key(user_id,event_type)
);
create table private.notification_events (
 id uuid primary key default gen_random_uuid(), event_key text not null unique check(length(event_key)<=300),
 event_type text not null check(event_type in ('account_approved','lesson_published','session_details','session_starting','exam_released','homework_released','support_reply')),
 organization_id uuid references public.organizations(id) on delete restrict, resource_id uuid not null,
 session_id uuid references public.group_sessions(id) on delete restrict, context_hash text, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index notification_events_org_idx on private.notification_events(organization_id);
create index notification_events_session_idx on private.notification_events(session_id) where session_id is not null;
create index notification_events_group_idx on private.notification_events(resource_id) where event_type in ('session_details','session_starting');
create table private.group_notification_state (
 group_id uuid primary key references public.study_groups(id) on delete restrict,
 revision bigint not null default 1 check(revision>0), details_hash text not null
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references private.notification_events(id) on delete restrict,
 recipient_id uuid not null references public.profiles(id) on delete restrict,
 event_type text not null, in_app boolean not null default true, created_at timestamptz not null default now(), read_at timestamptz,
 unique(event_id,recipient_id)
);
create index notifications_recipient_idx on public.notifications(recipient_id,created_at desc,id);
create index notifications_unread_idx on public.notifications(recipient_id) where read_at is null;
create table private.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete restrict,
 endpoint text not null unique check(length(endpoint)<=2048), p256dh text not null, auth text not null,
 active boolean not null default true, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on private.push_subscriptions(user_id);
create table private.notification_deliveries (
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.notifications(id) on delete restrict,
 subscription_id uuid not null references private.push_subscriptions(id) on delete restrict,
 status text not null default 'pending' check(status in ('pending','leased','sent','failed','cancelled')),
 attempts integer not null default 0 check(attempts between 0 and 8), next_attempt_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz, last_status integer, sent_at timestamptz, unique(notification_id,subscription_id)
);
create index notification_deliveries_due_idx on private.notification_deliveries(next_attempt_at) where status in ('pending','leased');
create index notification_deliveries_subscription_idx on private.notification_deliveries(subscription_id);
create index group_sessions_notification_due_idx on public.group_sessions(starts_at,id) where mode='online' and not cancelled;

do $$ declare t text; begin
 foreach t in array array['support_operators','organization_support_staff','support_audit','support_requests','notification_events','push_subscriptions','notification_deliveries','group_notification_state'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated,service_role',t);
 end loop;
 foreach t in array array['support_tickets','support_messages','notification_preferences','notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;

create function private.support_staff_for(p_org uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=p_user and p.status='active') and (
 exists(select 1 from private.support_operators x where x.user_id=p_user and x.active) or
 exists(select 1 from public.organization_memberships m where m.organization_id=p_org and m.user_id=p_user and m.status='active' and
 (m.role in ('owner','admin') or exists(select 1 from private.organization_support_staff s where s.organization_id=p_org and s.user_id=p_user and s.active))))
$$;
create function private.support_access(p_ticket uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.support_tickets t where t.id=p_ticket and private.is_active_user() and
 (t.requester_id=(select private.current_app_user_id()) or private.support_staff_for(t.organization_id,(select private.current_app_user_id()))))
$$;
create function private.support_contact_org(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_active_user() and (p_org is null or exists(select 1 from public.organizations o where o.id=p_org and o.status='active' and
 (private.is_org_member(o.id) or exists(select 1 from public.enrollments e join public.course_offerings f on f.id=e.offering_id join public.courses c on c.id=f.course_id where c.organization_id=o.id and e.user_id=(select private.current_app_user_id())))))
$$;
create policy support_tickets_read on public.support_tickets for select to authenticated using(private.support_access(id));
create policy support_messages_read on public.support_messages for select to authenticated using(private.support_access(ticket_id));
create policy preferences_read on public.notification_preferences for select to authenticated using(user_id=(select private.current_app_user_id()));

-- Fingerprints exclude attendance/version-only changes and never expose meeting URLs.
create function private.group_notice_hash(p_group uuid) returns text language sql stable security definer set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_array(g.mode,g.join_url,g.instructions)::text,'UTF8')),'hex') from public.study_groups g where g.id=p_group
$$;
create function private.session_notice_hash(p_session uuid) returns text language sql stable security definer set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_array(extract(epoch from s.starts_at),extract(epoch from s.ends_at),s.mode,s.join_url,s.instructions,s.cancelled)::text,'UTF8')),'hex') from public.group_sessions s where s.id=p_session
$$;
create function private.group_notice_recipient(p_group uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.group_memberships m join public.study_groups g on g.id=m.group_id
 join public.enrollments e on e.id=m.enrollment_id and e.user_id=m.user_id and e.offering_id=g.offering_id
 join public.course_offerings o on o.id=g.offering_id join public.courses c on c.id=o.course_id
 join public.organizations org on org.id=c.organization_id join public.profiles p on p.id=m.user_id
 where m.group_id=p_group and m.user_id=p_user and m.starts_at<=clock_timestamp() and m.ends_at is null
 and (m.enrollment_expires_at is null or m.enrollment_expires_at>clock_timestamp()) and g.status='active'
 and e.status='active' and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp()) and (e.expires_at is null or e.expires_at>clock_timestamp())
 and o.status='active' and c.status='published' and org.status='active' and p.status='active')
$$;
create function private.group_notice_upcoming(p_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.group_sessions s where s.group_id=p_group and s.mode='online' and s.join_url<>'' and not s.cancelled
 and s.starts_at>clock_timestamp() and s.starts_at<=clock_timestamp()+interval '14 days')
$$;
create function private.notification_current(p_event uuid,p_user uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare e private.notification_events;s public.group_sessions;
begin
 select * into e from private.notification_events where id=p_event;
 if e.id is null or e.revoked_at is not null then return false;end if;
 if e.event_type not in ('session_details','session_starting') then return true;end if;
 if not private.group_notice_recipient(e.resource_id,p_user) then return false;end if;
 if e.session_id is null then return e.event_type='session_details' and e.context_hash=private.group_notice_hash(e.resource_id) and private.group_notice_upcoming(e.resource_id);end if;
 select * into s from public.group_sessions where id=e.session_id and group_id=e.resource_id;
 return coalesce(s.id is not null and not s.cancelled and s.mode='online' and s.join_url<>'' and s.starts_at>clock_timestamp()
 and e.context_hash=private.session_notice_hash(s.id),false);
end $$;
create function private.notification_visible(p_event uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_user=(select private.current_app_user_id()) and private.notification_current(p_event,p_user)
$$;
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=(select private.current_app_user_id()) and in_app and private.notification_visible(event_id,recipient_id));

-- Generated links only, checked again when read. No titles, scores, answer keys or message bodies in notifications/push.
create function private.notification_link(p_event uuid,p_user uuid) returns text language plpgsql stable security definer set search_path='' as $$
declare e private.notification_events; l public.lessons; course uuid; part uuid; off uuid;
begin
 if p_user is distinct from private.current_app_user_id() then return null;end if;
 select * into e from private.notification_events where id=p_event;
 if e.event_type='account_approved' then return null;
 elsif e.event_type='support_reply' then if private.support_access(e.resource_id) then return '/support?ticket='||e.resource_id;end if;
 elsif e.event_type in ('session_starting','session_details') then
  if private.notification_current(e.id,p_user) then return '/groups';end if;
 elsif e.event_type='exam_released' then
  if exists(select 1 from private.assessment_participations p where p.schedule_id=e.resource_id and p.user_id=p_user and p.released_at is not null) then return '/exams/'||e.resource_id;end if;
 elsif e.event_type='homework_released' then
  select a.lesson_id,a.offering_id,a.segment_id into l.id,off,part from public.homework_submissions s join public.homework_assignments a on a.id=s.assignment_id join private.homework_corrections c on c.submission_id=s.id where s.id=e.resource_id and s.user_id=p_user and c.released_at is not null and private.homework_enrolled(a.id);
 elsif e.event_type='lesson_published' then
  select x.* into l from public.lessons x where x.id=e.resource_id and x.status='published' and private.can_view_lesson(x.id);
 end if;
 if l.id is not null then
  select m.course_id into course from public.course_modules m join public.lessons x on x.module_id=m.id where x.id=l.id;
  if part is null then select s.id into part from public.lesson_segments s where s.lesson_id=l.id and s.status='published' order by s.position limit 1;
  elsif not exists(select 1 from public.lesson_segments s where s.id=part and s.lesson_id=l.id and s.status='published') then return null;end if;
  if off is null then select o.id into off from public.course_offerings o where o.course_id=course and private.is_enrolled(o.id) order by o.id limit 1;end if;
  if part is not null and off is not null then return '/courses/'||course||'/chapters/'||part||'?offering='||off;end if;
 end if;return null;
end $$;

create function private.emit_notification(p_key text,p_type text,p_org uuid,p_resource uuid,p_users uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare event uuid;recipient uuid;n uuid;
begin
 -- Empty/inactive/fully opted-out recipient sets do not consume the source key.
 select array_agg(distinct p.id order by p.id) into p_users from public.profiles p where p.id=any(coalesce(p_users,'{}'::uuid[])) and p.status='active'
 and (coalesce((select in_app from public.notification_preferences where user_id=p.id and event_type=p_type),true) or coalesce((select push from public.notification_preferences where user_id=p.id and event_type=p_type),false));
 if coalesce(cardinality(p_users),0)=0 then return;end if;
 insert into private.notification_events(event_key,event_type,organization_id,resource_id) values(p_key,p_type,p_org,p_resource) on conflict(event_key) do nothing returning id into event;
 if event is null then select id into event from private.notification_events where event_key=p_key and event_type=p_type and organization_id is not distinct from p_org and resource_id=p_resource and revoked_at is null;end if;
 if event is null then return;end if;
 foreach recipient in array coalesce(p_users,'{}'::uuid[]) loop
  if not exists(select 1 from public.profiles where id=recipient and status='active') then continue;end if;
  if coalesce((select in_app from public.notification_preferences where user_id=recipient and event_type=p_type),true) or coalesce((select push from public.notification_preferences where user_id=recipient and event_type=p_type),false) then
   insert into public.notifications(event_id,recipient_id,event_type,in_app) values(event,recipient,p_type,coalesce((select in_app from public.notification_preferences where user_id=recipient and event_type=p_type),true)) on conflict do nothing returning id into n;
   if n is not null and coalesce((select push from public.notification_preferences where user_id=recipient and event_type=p_type),false) then
    insert into private.notification_deliveries(notification_id,subscription_id) select n,s.id from private.push_subscriptions s where s.user_id=recipient and s.active on conflict do nothing;
   end if;
  end if;
 end loop;
end $$;

create function private.emit_session_notice(p_key text,p_type text,p_group uuid,p_session uuid,p_users uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare org uuid;fingerprint text;
begin
 select c.organization_id into org from public.study_groups g join public.course_offerings o on o.id=g.offering_id join public.courses c on c.id=o.course_id where g.id=p_group;
 select array_agg(distinct x order by x) into p_users from unnest(coalesce(p_users,'{}'::uuid[])) x where private.group_notice_recipient(p_group,x);
 if coalesce(cardinality(p_users),0)=0 then return;end if;
 if p_session is null then
  if not private.group_notice_upcoming(p_group) then return;end if;
  fingerprint:=private.group_notice_hash(p_group);
 else
  if not exists(select 1 from public.group_sessions s where s.id=p_session and s.group_id=p_group and s.mode='online' and not s.cancelled and s.join_url<>'' and s.starts_at>clock_timestamp()) then return;end if;
  fingerprint:=private.session_notice_hash(p_session);
 end if;
 perform private.emit_notification(p_key,p_type,org,p_group,p_users);
 update private.notification_events set session_id=p_session,context_hash=fingerprint where event_key=p_key and revoked_at is null and context_hash is null;
end $$;
-- One current joining-information event per group revision, one notification per
-- eligible recipient. A later member extends the existing event's recipient set.
create function private.emit_group_joining_notice(p_group uuid,p_user uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare g public.study_groups;state private.group_notification_state;users uuid[];fingerprint text;
begin
 -- Group before state/event locks: matches group_command/materialization ordering.
 select * into g from public.study_groups where id=p_group for share;
 if g.id is null then return;end if;
 fingerprint:=private.group_notice_hash(g.id);
 insert into private.group_notification_state(group_id,details_hash) values(g.id,fingerprint)
 on conflict(group_id) do update set details_hash=excluded.details_hash,revision=case when group_notification_state.details_hash<>excluded.details_hash
 or exists(select 1 from private.notification_events e where e.event_key='group-details:'||g.id||':'||group_notification_state.revision and e.revoked_at is not null)
 then group_notification_state.revision+1 else group_notification_state.revision end returning * into state;
 if not private.group_notice_upcoming(g.id) then return;end if;
 select array_agg(distinct m.user_id order by m.user_id) into users from public.group_memberships m where m.group_id=g.id and (p_user is null or m.user_id=p_user)
 and private.group_notice_recipient(g.id,m.user_id) and not exists(select 1 from public.notifications n join private.notification_events e on e.id=n.event_id where e.event_key='group-details:'||g.id||':'||state.revision and n.recipient_id=m.user_id);
 perform private.emit_session_notice('group-details:'||g.id||':'||state.revision,'session_details',g.id,null,users);
end $$;
create function private.revoke_session_notices(p_group uuid,p_session uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update private.notification_events e set revoked_at=clock_timestamp() where e.revoked_at is null and e.event_type in ('session_details','session_starting') and e.resource_id=p_group
 and ((p_session is not null and e.session_id=p_session) or (e.session_id is null and (e.context_hash is distinct from private.group_notice_hash(p_group) or not private.group_notice_upcoming(p_group))));
 update private.notification_deliveries d set status='cancelled',lease_token=null,lease_until=null where d.status in ('pending','leased') and exists(select 1 from public.notifications n join private.notification_events e on e.id=n.event_id where n.id=d.notification_id and e.revoked_at is not null and e.resource_id=p_group);
end $$;
create function private.notification_business_event() returns trigger language plpgsql security definer set search_path='' as $$
declare org uuid;resource uuid;kind text;recipients uuid[];key text;item record;lesson public.lessons;
begin
 if tg_table_name='courses' then
  if new.status<>'published' or (tg_op='UPDATE' and old.status='published') then return new;end if;
  select array_agg(distinct e.user_id) into recipients from public.enrollments e join public.course_offerings o on o.id=e.offering_id where o.course_id=new.id and o.status='active' and e.status='active' and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp()) and (e.expires_at is null or e.expires_at>clock_timestamp());
  for item in select l.id from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=new.id and l.status='published' loop
   perform private.emit_notification('course-publish:'||new.id||':'||new.updated_at||':'||item.id,'lesson_published',new.organization_id,item.id,recipients);
  end loop;return new;
 elsif tg_table_name='lesson_segments' then
  if new.status<>'published' or (tg_op='UPDATE' and old.status='published') or (select count(*) from public.lesson_segments where lesson_id=new.lesson_id and status='published')<>1 then return new;end if;
  select * into lesson from public.lessons where id=new.lesson_id and status='published';if lesson.id is null then return new;end if;
  select c.organization_id into org from public.course_modules m join public.courses c on c.id=m.course_id where m.id=lesson.module_id and c.status='published';if org is null then return new;end if;
  select array_agg(distinct e.user_id) into recipients from public.enrollments e join public.course_offerings o on o.id=e.offering_id join public.course_modules m on m.course_id=o.course_id where m.id=lesson.module_id and o.status='active' and e.status='active' and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp()) and (e.expires_at is null or e.expires_at>clock_timestamp());
  kind:='lesson_published';resource:=lesson.id;key:='lesson:'||lesson.id||':'||lesson.updated_at;
 elsif tg_table_name='enrollments' then
  if new.status<>'active' or (tg_op='UPDATE' and old.status='active') then return new;end if;
  select c.organization_id into org from public.course_offerings o join public.courses c on c.id=o.course_id where o.id=new.offering_id;
  kind:='account_approved';resource:=new.id;recipients:=array[new.user_id];key:='enrollment:'||new.id||':'||new.updated_at;
 elsif tg_table_name='lessons' then
  if new.status<>'published' or (tg_op='UPDATE' and old.status='published') then return new;end if;
  select c.organization_id into org from public.course_modules m join public.courses c on c.id=m.course_id where m.id=new.module_id and c.status='published';
  if org is null then return new;end if;
  select array_agg(distinct e.user_id) into recipients from public.enrollments e join public.course_offerings o on o.id=e.offering_id join public.course_modules m on m.course_id=o.course_id where m.id=new.module_id and o.status='active' and e.status='active' and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp()) and (e.expires_at is null or e.expires_at>clock_timestamp());
  kind:='lesson_published';resource:=new.id;key:='lesson:'||new.id||':'||new.updated_at;
 elsif tg_table_name='assessment_participations' then
  if new.released_at is null or (tg_op='UPDATE' and old.released_at is not distinct from new.released_at) then return new;end if;
  select c.organization_id into org from public.offering_assessments a join public.course_offerings o on o.id=a.offering_id join public.courses c on c.id=o.course_id where a.id=new.schedule_id;
  kind:='exam_released';resource:=new.schedule_id;recipients:=array[new.user_id];key:='exam:'||new.id||':'||new.released_at;
 elsif tg_table_name='homework_corrections' then
  if new.released_at is null or (tg_op='UPDATE' and old.released_at is not distinct from new.released_at) then return new;end if;
  select c.organization_id,array[s.user_id] into org,recipients from public.homework_submissions s join public.homework_assignments a on a.id=s.assignment_id join public.course_offerings o on o.id=a.offering_id join public.courses c on c.id=o.course_id where s.id=new.submission_id;
  kind:='homework_released';resource:=new.submission_id;key:='homework:'||new.submission_id||':'||new.released_at;
 elsif tg_table_name='study_groups' then
  if tg_op='UPDATE' and (old.mode,old.join_url,old.instructions,old.status) is not distinct from (new.mode,new.join_url,new.instructions,new.status) then return new;end if;
  perform private.revoke_session_notices(new.id,null);
  perform private.emit_group_joining_notice(new.id);return new;
 elsif tg_table_name='group_memberships' then
  if new.ends_at is null then perform private.emit_group_joining_notice(new.group_id,new.user_id);end if;return new;
 elsif tg_table_name='group_sessions' then
  if tg_op='UPDATE' then
   if (old.starts_at,old.ends_at,old.mode,old.join_url,old.instructions,old.cancelled) is not distinct from (new.starts_at,new.ends_at,new.mode,new.join_url,new.instructions,new.cancelled) then return new;end if;
   perform private.revoke_session_notices(new.group_id,new.id);
  end if;
  if new.mode<>'online' or new.cancelled or new.starts_at<=clock_timestamp() or new.join_url='' then return new;end if;
  if tg_op='INSERT' and new.schedule_id is not null and not new.exception then
   -- Materialization is silent per occurrence. At most one joining summary per
   -- recipient/revision is created, and only for the next 14 days.
   if new.starts_at<=clock_timestamp()+interval '14 days' then perform private.emit_group_joining_notice(new.group_id);end if;return new;
  end if;
  select array_agg(distinct m.user_id) into recipients from public.group_memberships m where m.group_id=new.group_id and private.group_notice_recipient(new.group_id,m.user_id);
  perform private.emit_session_notice('session:'||new.id||':'||new.version||':'||private.session_notice_hash(new.id),'session_details',new.group_id,new.id,recipients);return new;
 end if;
 if kind is not null then perform private.emit_notification(key,kind,org,resource,recipients);end if;return new;
end $$;
create trigger notification_enrollment after insert or update on public.enrollments for each row execute function private.notification_business_event();
create trigger notification_course after insert or update on public.courses for each row execute function private.notification_business_event();
create trigger notification_lesson after insert or update on public.lessons for each row execute function private.notification_business_event();
create trigger notification_lesson_part after insert or update on public.lesson_segments for each row execute function private.notification_business_event();
create trigger notification_exam after insert or update on private.assessment_participations for each row execute function private.notification_business_event();
create trigger notification_homework after insert or update on private.homework_corrections for each row execute function private.notification_business_event();
create trigger notification_session after insert or update on public.group_sessions for each row execute function private.notification_business_event();
create trigger notification_group_details after insert or update on public.study_groups for each row execute function private.notification_business_event();
create trigger notification_group_join after insert on public.group_memberships for each row execute function private.notification_business_event();

create function private.notification_command(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.current_app_user_id();kind text;sub private.push_subscriptions;n integer;item record;page integer:=coalesce((p_data->>'page')::int,0);filter text:=coalesce(p_data->>'filter','all');
begin
 if u is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>12000 then raise exception 'Invalid input' using errcode='23514';end if;
 if p_action='list' then
  if page not between 0 and 100000 or filter not in ('all','read','unread') then raise exception 'Invalid filter' using errcode='23514';end if;
  return jsonb_build_object('unread',(select count(*) from public.notifications where recipient_id=u and in_app and read_at is null and private.notification_current(event_id,u)),'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,event_type,created_at,read_at,private.notification_link(event_id,u) link from public.notifications where recipient_id=u and in_app and private.notification_current(event_id,u) and (filter='all' or (read_at is null)=(filter='unread')) order by created_at desc,id limit 25 offset page*25)x),'[]'::jsonb),'page',page);
 elsif p_action in ('read','unread','read-all') then
  update public.notifications set read_at=case when p_action='unread' then null else clock_timestamp() end where recipient_id=u and (p_action='read-all' or id=(p_data->>'id')::uuid);return jsonb_build_object('ok',true);
 elsif p_action='preferences' then
  return coalesce((select jsonb_agg(to_jsonb(p)-'user_id') from public.notification_preferences p where user_id=u),'[]'::jsonb);
 elsif p_action='preference' then
  insert into public.notification_preferences(user_id,event_type,in_app,push) values(u,p_data->>'event',(p_data->>'inApp')::boolean,(p_data->>'push')::boolean) on conflict(user_id,event_type) do update set in_app=excluded.in_app,push=excluded.push,updated_at=clock_timestamp();
  update private.notification_deliveries d set status='cancelled',lease_token=null where d.status in ('pending','leased') and exists(select 1 from public.notifications n where n.id=d.notification_id and n.recipient_id=u and n.event_type=p_data->>'event') and not (p_data->>'push')::boolean;return jsonb_build_object('ok',true);
 elsif p_action='subscribe' then
  -- Fixed provider suffixes prevent arbitrary endpoint SSRF. No credentials, fragments, ports or controls.
  if coalesce(p_data->>'endpoint','') !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|updates\.push\.services\.mozilla\.org|[a-z0-9-]+\.notify\.windows\.com|web\.push\.apple\.com)/[A-Za-z0-9_/:?=&%+.~-]+$' or length(p_data->>'endpoint')>2048
   or coalesce(p_data->>'p256dh','') !~ '^[A-Za-z0-9_-]{87}=?$' or coalesce(p_data->>'auth','') !~ '^[A-Za-z0-9_-]{22}={0,2}$' then raise exception 'Unsupported push endpoint or keys' using errcode='23514';end if;
  perform pg_advisory_xact_lock(hashtextextended('push:'||u,0));
  if (select count(*) from private.push_subscriptions where user_id=u and active)>=10 and not exists(select 1 from private.push_subscriptions where user_id=u and endpoint=p_data->>'endpoint') then raise exception 'Subscription limit' using errcode='23514';end if;
  select * into sub from private.push_subscriptions where endpoint=p_data->>'endpoint' for update;
  if sub.id is not null and sub.user_id<>u then raise exception 'Subscription belongs to another account' using errcode='42501';end if;
  insert into private.push_subscriptions(user_id,endpoint,p256dh,auth) values(u,p_data->>'endpoint',p_data->>'p256dh',p_data->>'auth') on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,active=true,updated_at=clock_timestamp();return jsonb_build_object('ok',true);
 elsif p_action='unsubscribe' then
  update private.push_subscriptions set active=false,updated_at=clock_timestamp() where user_id=u and endpoint=p_data->>'endpoint';return jsonb_build_object('ok',true);
 else raise exception 'Unknown action' using errcode='23514';end if;
end $$;
create function private.support_command(p_action text,p_ticket uuid,p_version integer,p_request uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.current_app_user_id();t public.support_tickets;previous jsonb;result jsonb;fingerprint text;saved private.support_requests;staff boolean;org uuid;target uuid;msg uuid;page integer:=coalesce((p_data->>'page')::int,0);search text:=coalesce(p_data->>'search','');filter text:=coalesce(p_data->>'filter','ALL');
begin
 if u is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>12000 or page not between 0 and 100000 or length(search)>120 or filter not in ('ALL','OPEN','IN_PROGRESS','RESOLVED') then raise exception 'Invalid input' using errcode='23514';end if;
 if p_action='organizations' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.organizations o where private.support_contact_org(o.id)),'[]'::jsonb);end if;
 if p_action='list' then
  return jsonb_build_object('page',page,'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select t.*,private.support_staff_for(t.organization_id,u) staff from public.support_tickets t where private.support_access(t.id) and (filter='ALL' or t.status=filter) and (position(lower(search) in lower(t.subject))>0 or search='') order by t.updated_at desc,t.id limit 25 offset page*25)x),'[]'::jsonb));
 end if;
 if p_action='get' then
  if not private.support_access(p_ticket) then raise exception 'Ticket unavailable' using errcode='42501';end if;
  select * into t from public.support_tickets where id=p_ticket;
  return jsonb_build_object('ticket',to_jsonb(t),'staff',private.support_staff_for(t.organization_id,u),'messages',coalesce((select jsonb_agg(to_jsonb(x)) from (select m.id,m.body,m.created_at,m.staff,m.sender_id=u mine,coalesce(p.display_name,'Learner') sender_name from public.support_messages m join public.profiles p on p.id=m.sender_id where m.ticket_id=t.id order by m.created_at desc,m.id limit 25 offset page*25)x),'[]'::jsonb),'page',page,'assignees',case when private.support_staff_for(t.organization_id,u) then coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name)) from public.profiles p where private.support_staff_for(t.organization_id,p.id)),'[]'::jsonb) else '[]'::jsonb end);
 end if;
 if p_request is null then raise exception 'Request ID required' using errcode='23514';end if;
 -- Serialize per actor before locking a ticket, including the rate-limit check.
 perform pg_advisory_xact_lock(hashtextextended('support-actor:'||u,0));
 perform pg_advisory_xact_lock(hashtextextended(u||':'||p_request,0));
 fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_action,p_ticket,p_version,p_data)::text,'UTF8')),'hex');
 select * into saved from private.support_requests where actor_id=u and request_id=p_request;
 if found then if saved.fingerprint<>fingerprint then raise exception 'Request ID reused' using errcode='23514';end if;return saved.result;end if;
 if p_action='create' then
  perform pg_advisory_xact_lock(hashtextextended('support:'||u,0));
  if (select count(*) from public.support_tickets where requester_id=u and created_at>clock_timestamp()-interval '1 hour')>=5 then raise exception 'Ticket rate limit' using errcode='PT429';end if;
  org:=(p_data->>'organizationId')::uuid;if not private.support_contact_org(org) then raise exception 'Organization unavailable' using errcode='42501';end if;
  insert into public.support_tickets(organization_id,requester_id,category,subject,response_due_at) values(org,u,p_data->>'category',btrim(p_data->>'subject'),clock_timestamp()+interval '48 hours') returning * into t;
  insert into public.support_messages(ticket_id,sender_id,staff,body) values(t.id,u,false,btrim(p_data->>'body'));
  previous:='{}';
 else
  if not private.support_access(p_ticket) then raise exception 'Ticket unavailable' using errcode='42501';end if;
  select * into t from public.support_tickets where id=p_ticket for update;
  if not private.support_access(t.id) then raise exception 'Permission changed' using errcode='42501';end if;
  if p_version is distinct from t.version then raise exception 'Stale ticket' using errcode='PT409';end if;
  previous:=to_jsonb(t);staff:=private.support_staff_for(t.organization_id,u) and t.requester_id<>u;
  if p_action='reply' then
   if (select count(*) from public.support_messages where sender_id=u and created_at>clock_timestamp()-interval '1 hour')>=60 then raise exception 'Message rate limit' using errcode='PT429';end if;
   insert into public.support_messages(ticket_id,sender_id,staff,body) values(t.id,u,staff,btrim(p_data->>'body')) returning id into msg;
   update public.support_tickets set last_message_at=clock_timestamp(),status=case when staff then 'IN_PROGRESS' when status='RESOLVED' then 'OPEN' else status end,response_due_at=case when staff then null else clock_timestamp()+interval '48 hours' end,first_staff_response_at=case when staff then coalesce(first_staff_response_at,clock_timestamp()) else first_staff_response_at end where id=t.id;
   if staff then perform private.emit_notification('support:'||msg,'support_reply',t.organization_id,t.id,array[t.requester_id]);end if;
  elsif p_action='status' then
   if not staff and p_data->>'status' not in ('OPEN','RESOLVED') then raise exception 'Staff required' using errcode='42501';end if;
   update public.support_tickets set status=p_data->>'status',response_due_at=case when p_data->>'status'='OPEN' then clock_timestamp()+interval '48 hours' when p_data->>'status'='RESOLVED' then null else response_due_at end where id=t.id;
  elsif p_action='assign' then
   target:=(p_data->>'userId')::uuid;
   if not staff or (target is not null and not private.support_staff_for(t.organization_id,target)) then raise exception 'Assignment denied' using errcode='42501';end if;
   update public.support_tickets set assigned_to=target where id=t.id;
  else raise exception 'Unknown action' using errcode='23514';end if;
  update public.support_tickets set version=version+1,updated_at=clock_timestamp() where id=t.id returning * into t;
 end if;
 insert into private.support_audit(ticket_id,actor_id,action,before_data,after_data) values(t.id,u,p_action,previous,to_jsonb(t));
 result:=jsonb_build_object('id',t.id,'version',t.version);
 insert into private.support_requests(actor_id,request_id,fingerprint,result) values(u,p_request,fingerprint,result);return result;
end $$;

-- Trusted worker only: materialize due reminders, claim with SKIP LOCKED and a revocable lease.
create function private.notification_worker(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare session_row record;d private.notification_deliveries;recipient uuid[];result jsonb;
begin
 if p_action in ('claim','sweep') then
  for session_row in select x.* from public.group_sessions x join public.study_groups g on g.id=x.group_id
  where x.mode='online' and not x.cancelled and g.status='active' and x.join_url<>''
  and x.starts_at between clock_timestamp() and clock_timestamp()+interval '15 minutes'
  and exists(select 1 from public.group_memberships m where m.group_id=x.group_id and private.group_notice_recipient(g.id,m.user_id)
   and (coalesce((select in_app from public.notification_preferences where user_id=m.user_id and event_type='session_starting'),true) or coalesce((select push from public.notification_preferences where user_id=m.user_id and event_type='session_starting'),false))
   and not exists(select 1 from public.notifications n join private.notification_events e on e.id=n.event_id where e.event_key='reminder:'||x.id||':'||x.version||':'||private.session_notice_hash(x.id) and n.recipient_id=m.user_id))
  order by x.starts_at,x.id limit 500 loop
   select array_agg(distinct m.user_id order by m.user_id) into recipient from public.group_memberships m where m.group_id=session_row.group_id and private.group_notice_recipient(m.group_id,m.user_id);
   perform private.emit_session_notice('reminder:'||session_row.id||':'||session_row.version||':'||private.session_notice_hash(session_row.id),'session_starting',session_row.group_id,session_row.id,recipient);
  end loop;
  if p_action='sweep' then return jsonb_build_object('ok',true);end if;
  update private.notification_deliveries set status='failed',lease_token=null,lease_until=null where status='leased' and lease_until<clock_timestamp() and attempts>=8;
  update private.notification_deliveries x set status='cancelled',lease_token=null where status in ('pending','leased') and (not exists(select 1 from private.push_subscriptions s where s.id=x.subscription_id and s.active) or exists(select 1 from public.notifications n join public.notification_preferences p on p.user_id=n.recipient_id and p.event_type=n.event_type where n.id=x.notification_id and not p.push) or not exists(select 1 from public.notifications n join public.profiles p on p.id=n.recipient_id and p.status='active' where n.id=x.notification_id) or exists(select 1 from public.notifications n where n.id=x.notification_id and not private.notification_current(n.event_id,n.recipient_id)));
  with due as (select id from private.notification_deliveries where (status='pending' or status='leased' and lease_until<clock_timestamp()) and next_attempt_at<=clock_timestamp() and attempts<8 order by next_attempt_at,id for update skip locked limit 25), claimed as (update private.notification_deliveries x set status='leased',lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '5 minutes',attempts=attempts+1 from due where x.id=due.id returning x.*)
  select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'lease',x.lease_token,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth)),'[]'::jsonb) into result from claimed x join private.push_subscriptions s on s.id=x.subscription_id;return result;
 elsif p_action='check' then
  select * into d from private.notification_deliveries where id=(p_data->>'id')::uuid for update;
  if d.id is null or d.status<>'leased' or d.lease_token is distinct from (p_data->>'lease')::uuid or d.lease_until<=clock_timestamp() then return jsonb_build_object('valid',false);end if;
  if not exists(select 1 from public.notifications n join private.push_subscriptions s on s.id=d.subscription_id and s.active
   join public.profiles p on p.id=n.recipient_id and p.status='active'
   join public.notification_preferences pref on pref.user_id=n.recipient_id and pref.event_type=n.event_type and pref.push
   where n.id=d.notification_id and private.notification_current(n.event_id,n.recipient_id)) then
   update private.notification_deliveries set status='cancelled',lease_token=null,lease_until=null where id=d.id;return jsonb_build_object('valid',false);
  end if;
  return jsonb_build_object('valid',true);
 elsif p_action='finish' then
  select * into d from private.notification_deliveries where id=(p_data->>'id')::uuid for update;
  if d.status<>'leased' or d.lease_token is distinct from (p_data->>'lease')::uuid or d.lease_until<=clock_timestamp() then raise exception 'Expired lease' using errcode='PT409';end if;
  if (p_data->>'status')::int in (404,410) then update private.push_subscriptions set active=false where id=d.subscription_id;end if;
  update private.notification_deliveries set status=case when (p_data->>'status')::int between 200 and 299 then 'sent' when (p_data->>'status')::int in (400,401,403,404,410,413) or attempts>=8 then 'failed' else 'pending' end,last_status=(p_data->>'status')::int,sent_at=case when (p_data->>'status')::int between 200 and 299 then clock_timestamp() end,next_attempt_at=clock_timestamp()+make_interval(secs=>least(3600,(power(2,attempts)*30)::int)),lease_token=null,lease_until=null where id=d.id;return jsonb_build_object('ok',true);
 else raise exception 'Unknown action' using errcode='23514';end if;
end $$;
create function public.notification_command(p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.notification_command(p_action,p_data)$$;
create function public.support_command(p_action text,p_ticket uuid default null,p_version integer default null,p_request uuid default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.support_command(p_action,p_ticket,p_version,p_request,p_data)$$;
create function public.notification_worker(p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.notification_worker(p_action,p_data)$$;

revoke all on function private.support_staff_for(uuid,uuid),private.support_access(uuid),private.support_contact_org(uuid),private.notification_link(uuid,uuid),private.emit_notification(text,text,uuid,uuid,uuid[]),private.notification_business_event(),private.notification_command(text,jsonb),private.support_command(text,uuid,integer,uuid,jsonb),private.notification_worker(text,jsonb),public.notification_command(text,jsonb),public.support_command(text,uuid,integer,uuid,jsonb),public.notification_worker(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.support_access(uuid),private.support_contact_org(uuid),private.notification_command(text,jsonb),private.support_command(text,uuid,integer,uuid,jsonb),public.notification_command(text,jsonb),public.support_command(text,uuid,integer,uuid,jsonb) to authenticated;
grant execute on function private.notification_worker(text,jsonb),public.notification_worker(text,jsonb) to service_role;
grant usage on schema private to service_role;

-- Internal session context helpers cannot be invoked to send or inspect another user's notices.
revoke all on function private.group_notice_hash(uuid),private.session_notice_hash(uuid),private.group_notice_recipient(uuid,uuid),private.group_notice_upcoming(uuid),private.notification_current(uuid,uuid),private.notification_visible(uuid,uuid),private.emit_session_notice(text,text,uuid,uuid,uuid[]),private.emit_group_joining_notice(uuid,uuid),private.revoke_session_notices(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function private.notification_visible(uuid,uuid) to authenticated;
