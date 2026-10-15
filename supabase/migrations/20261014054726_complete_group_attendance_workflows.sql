-- Step 06. Additive only; existing objects/data are preserved.
-- Meeting URLs deliberately support ASCII DNS FQDNs, not userinfo or IP literals.
create function private.valid_group_meeting_url(value text) returns boolean language plpgsql immutable security invoker set search_path='' as $url$
declare parts text[]; host text; label text; port text;
begin
 if value='' then return true; end if;
 if value is null or length(value)>2000 or octet_length(value)<>length(value) or value ~ '[[:space:][:cntrl:]]' or value ~ '[^ -~]' or position(chr(92) in value)>0 then return false; end if;
 parts:=regexp_match(value, '^https://([A-Za-z0-9.-]+)(:([0-9]{1,5}))?([/?#][A-Za-z0-9._~!$&''()*+,;=:@/?#%+-]*)?$');
 if parts is null then return false; end if;
 host:=parts[1];port:=parts[3];
 if length(host)>253 or host !~ '[.]' or host !~ '([.][A-Za-z]{2,63}|[.]xn--[A-Za-z0-9-]{2,59})$' then return false; end if;
 foreach label in array string_to_array(host,'.') loop
  if length(label) not between 1 and 63 or label !~ '^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$' then return false; end if;
 end loop;
 if port is not null and port::integer not between 1 and 65535 then return false; end if;
 if value ~ '%(?![A-Fa-f0-9]{2})' or value ~* '%(0[0-9a-f]|1[0-9a-f]|7f)' then return false; end if;
 return true;
end$url$;
revoke all on function private.valid_group_meeting_url(text) from public,anon;
grant execute on function private.valid_group_meeting_url(text) to authenticated;

create table public.study_groups (
 id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.course_offerings(id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 160), description text not null default '' check(length(description)<=4000),
 mode text not null check(mode in ('online','center')), location text not null default '' check(length(location)<=1000),
 join_url text not null default '' check(private.valid_group_meeting_url(join_url)),
 instructions text not null default '' check(length(instructions)<=2000), timezone text not null default 'Africa/Cairo' check(timezone='Africa/Cairo'),
 capacity integer check(capacity between 1 and 10000), status text not null default 'active' check(status in ('active','archived')),
 version integer not null default 0, created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), unique(id,offering_id),
 check(mode<>'center' or length(btrim(location))>0)
);
create index study_groups_offering on public.study_groups(offering_id,status,id);
create index study_groups_creator on public.study_groups(created_by);
create table public.group_staff (
 group_id uuid not null references public.study_groups(id) on delete restrict, user_id uuid not null references public.profiles(id) on delete restrict,
 primary key(group_id,user_id), created_at timestamptz not null default clock_timestamp()
);
create index group_staff_user on public.group_staff(user_id,group_id);
create table public.group_memberships (
 id uuid primary key default gen_random_uuid(), group_id uuid not null, offering_id uuid not null,
 user_id uuid not null references public.profiles(id) on delete restrict, enrollment_id uuid not null references public.enrollments(id) on delete restrict,
 starts_at timestamptz not null default clock_timestamp(), ends_at timestamptz, enrollment_expires_at timestamptz,
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default clock_timestamp(),
 foreign key(group_id,offering_id) references public.study_groups(id,offering_id) on delete restrict,
 check(ends_at is null or ends_at>=starts_at)
);
create unique index group_memberships_one_active on public.group_memberships(offering_id,user_id) where ends_at is null;
create index group_memberships_group_history on public.group_memberships(group_id,starts_at,ends_at,user_id);
create index group_memberships_user on public.group_memberships(user_id,offering_id);
create index group_memberships_enrollment on public.group_memberships(enrollment_id);
create index group_memberships_creator on public.group_memberships(created_by);
create table public.group_schedules (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.study_groups(id) on delete restrict,
 weekday integer not null check(weekday between 0 and 6), local_time time not null,
 duration_minutes integer not null check(duration_minutes between 1 and 1440),
 active boolean not null default true, materialized_through date not null default ((clock_timestamp() at time zone 'Africa/Cairo')::date-1), created_at timestamptz not null default clock_timestamp()
);
create index group_schedules_group on public.group_schedules(group_id,active);
create unique index group_schedules_unique_active on public.group_schedules(group_id,weekday,local_time) where active;
create table public.group_sessions (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.study_groups(id) on delete restrict,
 schedule_id uuid references public.group_schedules(id) on delete restrict, occurrence_date date,
 title text not null check(length(btrim(title)) between 1 and 200), starts_at timestamptz not null, ends_at timestamptz not null,
 original_starts_at timestamptz not null, original_ends_at timestamptz not null,
 mode text not null check(mode in ('online','center')), location text not null default '', join_url text not null default '' check(private.valid_group_meeting_url(join_url)), instructions text not null default '',
 cancelled boolean not null default false, cancellation_reason text not null default '', exception boolean not null default false,
 attendance_state text not null default 'draft' check(attendance_state in ('draft','finalized','reopened')),
 roster_at timestamptz, version integer not null default 0, created_by uuid not null references public.profiles(id) on delete restrict,
 updated_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours'), unique(schedule_id,occurrence_date)
);
create index group_sessions_group_date on public.group_sessions(group_id,starts_at,id);
create index group_sessions_creator on public.group_sessions(created_by);
create index group_sessions_updater on public.group_sessions(updated_by);
create table public.session_attendance (
 session_id uuid not null references public.group_sessions(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict,
 membership_id uuid not null references public.group_memberships(id) on delete restrict,
 status text not null default 'not_marked' check(status in ('not_marked','attended','absent')),
 updated_by uuid references public.profiles(id) on delete restrict, updated_at timestamptz not null default clock_timestamp(),
 primary key(session_id,user_id)
);
create index session_attendance_user on public.session_attendance(user_id,session_id);
create index session_attendance_membership on public.session_attendance(membership_id);
create index session_attendance_updater on public.session_attendance(updated_by);
create table private.group_audit (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.study_groups(id) on delete restrict,
 session_id uuid references public.group_sessions(id) on delete restrict, actor_id uuid references public.profiles(id) on delete restrict,
 action text not null, reason text not null default '', before_data jsonb, after_data jsonb, created_at timestamptz not null default clock_timestamp()
);
create index group_audit_group_date on private.group_audit(group_id,created_at,id);
create index group_audit_session on private.group_audit(session_id);
create index group_audit_actor on private.group_audit(actor_id);
alter table private.group_audit enable row level security;
revoke all on private.group_audit from public,anon,authenticated;

create function private.can_manage_group(p_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.study_groups g where g.id=p_group and
 (private.can_manage_offering(g.offering_id) or (private.can_support_offering(g.offering_id) and exists(
 select 1 from public.group_staff s where s.group_id=g.id and s.user_id=(select private.current_app_user_id())))))
$$;
create function private.can_view_group(p_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.can_manage_group(p_group) or exists(select 1 from public.study_groups g join public.group_memberships m on m.group_id=g.id
 where g.id=p_group and g.status='active' and m.user_id=(select private.current_app_user_id()) and m.starts_at<=clock_timestamp() and m.ends_at is null and private.is_enrolled(g.offering_id)
 and exists(select 1 from public.enrollments e where e.id=m.enrollment_id and e.status='active' and (e.expires_at is null or e.expires_at>clock_timestamp()) and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp())))
$$;
revoke all on function private.can_manage_group(uuid),private.can_view_group(uuid) from public,anon;
grant execute on function private.can_manage_group(uuid),private.can_view_group(uuid) to authenticated;

-- Table access is read-only. All writes go through the identity-bound, locked RPC.
alter table public.study_groups enable row level security;
alter table public.group_staff enable row level security;
alter table public.group_memberships enable row level security;
alter table public.group_schedules enable row level security;
alter table public.group_sessions enable row level security;
alter table public.session_attendance enable row level security;
revoke all on public.study_groups,public.group_staff,public.group_memberships,public.group_schedules,public.group_sessions,public.session_attendance from public,anon,authenticated;
grant select on public.study_groups,public.group_staff,public.group_memberships,public.group_schedules,public.group_sessions,public.session_attendance to authenticated;
create policy groups_read on public.study_groups for select to authenticated using(private.can_view_group(id));
create policy group_staff_read on public.group_staff for select to authenticated using(private.can_manage_group(group_id));
create policy group_memberships_read on public.group_memberships for select to authenticated using(private.can_manage_group(group_id) or (user_id=(select private.current_app_user_id()) and private.is_active_user()));
create policy group_schedules_read on public.group_schedules for select to authenticated using(private.can_view_group(group_id));
-- Students receive current join information only through current membership AND enrollment.
create policy group_sessions_read on public.group_sessions for select to authenticated using(private.can_view_group(group_id));
create policy session_attendance_read on public.session_attendance for select to authenticated using(
 exists(select 1 from public.group_sessions s where s.id=session_id and private.can_manage_group(s.group_id)) or
 (user_id=(select private.current_app_user_id()) and private.is_active_user() and exists(select 1 from public.group_sessions s where s.id=session_id and s.attendance_state='finalized' and not s.cancelled)));

-- Materialization is bounded to 90 days per group, serialized by the group row.
-- PostgreSQL uses Cairo's IANA rules. Nonexistent spring-forward local times are
-- skipped; ambiguous fall-back times use PostgreSQL's standard-time occurrence.
create function private.materialize_group(p_group uuid) returns void language plpgsql security definer set search_path='' as $$
declare g public.study_groups; r public.group_schedules; d date; t timestamptz; first_day date; last_day date;
begin
 select * into g from public.study_groups where id=p_group for update;
 if g.status<>'active' then return; end if;
 for r in select * from public.group_schedules where group_id=g.id and active loop
  first_day:=r.materialized_through+1;
  last_day:=least(first_day+90,(clock_timestamp() at time zone g.timezone)::date+90);
  if first_day>last_day then continue; end if;
  for d in select x::date from generate_series(first_day::timestamp,last_day::timestamp,interval '1 day') x loop
   if extract(dow from d)::int<>r.weekday then continue; end if;
   t:=(d+r.local_time) at time zone g.timezone;
   if t<r.created_at or t at time zone g.timezone<>d+r.local_time then continue; end if;
   insert into public.group_sessions(group_id,schedule_id,occurrence_date,title,starts_at,ends_at,original_starts_at,original_ends_at,mode,location,join_url,instructions,created_by,updated_by)
   values(g.id,r.id,d,g.name,t,t+make_interval(mins=>r.duration_minutes),t,t+make_interval(mins=>r.duration_minutes),g.mode,g.location,g.join_url,g.instructions,g.created_by,g.created_by)
   on conflict(schedule_id,occurrence_date) do nothing;
  end loop;
  update public.group_schedules set materialized_through=last_day where id=r.id;
 end loop;
end$$;
revoke all on function private.materialize_group(uuid) from public,anon,authenticated;

create function private.snapshot_group_roster(p_session uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.group_sessions;
begin
 select * into s from public.group_sessions where id=p_session for update;
 if s.roster_at is not null then return; end if;
 if s.cancelled or s.starts_at>clock_timestamp() then raise exception 'Session has not started or is cancelled' using errcode='23514'; end if;
 insert into public.session_attendance(session_id,user_id,membership_id)
 select s.id,m.user_id,m.id from public.group_memberships m
 where m.group_id=s.group_id and m.starts_at<=s.starts_at and (m.ends_at is null or m.ends_at>s.starts_at)
 and (m.enrollment_expires_at is null or m.enrollment_expires_at>s.starts_at)
 on conflict do nothing;
 update public.group_sessions set roster_at=clock_timestamp() where id=s.id;
end$$;
revoke all on function private.snapshot_group_roster(uuid) from public,anon,authenticated;

create function private.group_command(p_group uuid,p_action text,p_version integer,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.study_groups; s public.group_sessions; old jsonb; u uuid:=(select private.current_app_user_id());
 e public.enrollments; m public.group_memberships; target uuid; entry jsonb; schedules jsonb; sid uuid; result jsonb; reason text;
begin
 if u is null or not private.is_active_user() then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>65536 then raise exception 'Invalid input' using errcode='23514'; end if;
 if p_action='create' then
  target:=(p_data->>'offeringId')::uuid;
  if not private.can_manage_offering(target) then raise exception 'Permission denied' using errcode='42501'; end if;
  insert into public.study_groups(offering_id,name,mode,location,join_url,instructions,description,capacity,created_by)
  values(target,btrim(p_data->>'name'),p_data->>'mode',coalesce(p_data->>'location',''),coalesce(p_data->>'joinUrl',''),coalesce(p_data->>'instructions',''),coalesce(p_data->>'description',''),(p_data->>'capacity')::int,u) returning * into g;
 else
  -- Offering lock serializes membership capacity, uniqueness and transfers.
  select offering_id into target from public.study_groups where id=p_group;
  if not private.can_manage_group(p_group) then raise exception 'Permission denied' using errcode='42501'; end if;
  perform 1 from public.course_offerings where id=target for update;
  select * into g from public.study_groups where id=p_group for update;
  if not private.can_manage_group(p_group) then raise exception 'Permission changed' using errcode='42501'; end if;
  if p_action not in ('attendance','finalize','reopen','session') and p_version is distinct from g.version then raise exception 'Stale group' using errcode='PT409'; end if;
  if g.status='archived' and p_action not in ('reopen','attendance','finalize','unarchive') then raise exception 'Group archived' using errcode='23514'; end if;
 end if;
 old:=to_jsonb(g); reason:=coalesce(p_data->>'reason','');
 if length(reason)>1000 then raise exception 'Reason too long' using errcode='23514'; end if;
 if p_action in ('create','edit') then
  if p_action='edit' then
   if not private.can_manage_offering(g.offering_id) then raise exception 'Group configuration requires instructor' using errcode='42501'; end if;
   if (p_data->>'capacity')::int<(select count(*) from public.group_memberships where group_id=g.id and ends_at is null) then raise exception 'Capacity below membership' using errcode='23514'; end if;
   update public.study_groups set name=case when p_data?'name' then btrim(p_data->>'name') else name end,description=case when p_data?'description' then p_data->>'description' else description end,mode=case when p_data?'mode' then p_data->>'mode' else mode end,location=case when p_data?'location' then p_data->>'location' else location end,join_url=case when p_data?'joinUrl' then p_data->>'joinUrl' else join_url end,instructions=case when p_data?'instructions' then p_data->>'instructions' else instructions end,capacity=case when p_data?'capacity' then (p_data->>'capacity')::int else capacity end where id=g.id returning * into g;
  end if;
  -- Omission leaves recurrence untouched. [] explicitly clears automatic future
  -- recurrence; exceptions and historical sessions are retained.
  if p_data?'schedules' then
   schedules:=p_data->'schedules';
   if jsonb_typeof(schedules) is distinct from 'array' or jsonb_array_length(schedules)>14 then raise exception 'Invalid weekly schedule' using errcode='23514'; end if;
   for entry in select value from jsonb_array_elements(schedules) loop
    if jsonb_typeof(entry) is distinct from 'object' or (entry->>'time') is null or entry->>'time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (entry->>'weekday') is null or (entry->>'weekday')::int not between 0 and 6 or (entry->>'durationMinutes') is null or (entry->>'durationMinutes')::int not between 1 and 1440 then raise exception 'Invalid weekly schedule' using errcode='23514'; end if;
   end loop;
   if exists(select 1 from jsonb_array_elements(schedules) x group by (x->>'weekday')::int,x->>'time' having count(*)>1) then raise exception 'Duplicate weekly slot' using errcode='23505'; end if;
   update public.group_schedules r set active=false where r.group_id=g.id and r.active and not exists(
    select 1 from jsonb_array_elements(schedules) x where (x->>'weekday')::int=r.weekday and (x->>'time')::time=r.local_time and (x->>'durationMinutes')::int=r.duration_minutes);
   update public.group_sessions set cancelled=true,cancellation_reason='Recurring schedule revised',version=version+1,updated_at=clock_timestamp(),updated_by=u
   where group_id=g.id and schedule_id in (select id from public.group_schedules where group_id=g.id and not active) and starts_at>clock_timestamp() and not exception and not cancelled;
   for entry in select value from jsonb_array_elements(schedules) loop
    if not exists(select 1 from public.group_schedules r where r.group_id=g.id and r.active and r.weekday=(entry->>'weekday')::int and r.local_time=(entry->>'time')::time and r.duration_minutes=(entry->>'durationMinutes')::int) then
     insert into public.group_schedules(group_id,weekday,local_time,duration_minutes) values(g.id,(entry->>'weekday')::int,(entry->>'time')::time,(entry->>'durationMinutes')::int);
    end if;
   end loop;
   perform private.materialize_group(g.id);
  end if;
 elsif p_action in ('archive','unarchive') then
  if not private.can_manage_offering(g.offering_id) then raise exception 'Instructor required' using errcode='42501'; end if;
  update public.study_groups set status=case p_action when 'archive' then 'archived' else 'active' end where id=g.id;
  if p_action='archive' then
   update public.group_sessions set cancelled=true,cancellation_reason='Group archived',version=version+1,updated_by=u,updated_at=clock_timestamp() where group_id=g.id and starts_at>clock_timestamp() and not cancelled;
  end if;
 elsif p_action='staff' then
  if not private.can_manage_offering(g.offering_id) then raise exception 'Instructor required' using errcode='42501'; end if;
  target:=(p_data->>'userId')::uuid;
  if not exists(select 1 from public.offering_staff os join public.course_offerings o on o.id=os.offering_id join public.courses c on c.id=o.course_id join public.organization_memberships om on om.organization_id=c.organization_id and om.user_id=os.user_id join public.profiles p on p.id=os.user_id where os.offering_id=g.offering_id and os.user_id=target and om.status='active' and p.status='active') then raise exception 'Assign offering staff first' using errcode='23514'; end if;
  if coalesce((p_data->>'remove')::boolean,false) then delete from public.group_staff where group_id=g.id and user_id=target;
  else insert into public.group_staff(group_id,user_id) values(g.id,target) on conflict do nothing; end if;
 elsif p_action in ('add','remove','transfer') then
  target:=(p_data->>'userId')::uuid;
  -- Enrollment UPDATE takes its row lock before its AFTER trigger acquires the
  -- offering lock. Do not invert that order with an enrollment FOR UPDATE here.
  -- The shared offering lock serializes the interval trigger with this command;
  -- a concurrent uncommitted suspension completes afterward and closes the interval.
  select * into e from public.enrollments where offering_id=g.offering_id and user_id=target;
  if p_action<>'remove' and (e.id is null or e.status<>'active' or (e.expires_at is not null and e.expires_at<=clock_timestamp()) or (e.enrolled_at is not null and e.enrolled_at>clock_timestamp()) or not exists(select 1 from public.profiles where id=target and status='active')) then raise exception 'Active eligible enrollment required' using errcode='23514'; end if;
  select * into m from public.group_memberships where offering_id=g.offering_id and user_id=target and ends_at is null for update;
  if p_action='add' and m.group_id=g.id then return jsonb_build_object('id',g.id,'version',g.version); end if;
  if p_action='add' and m.id is not null then raise exception 'Already assigned; use transfer' using errcode='23514'; end if;
  if p_action in ('remove','transfer') and (m.id is null or m.group_id<>g.id) then raise exception 'Membership changed' using errcode='PT409'; end if;
  if p_action='transfer' then
   sid:=(p_data->>'targetGroupId')::uuid;
   if sid=g.id or not private.can_manage_group(sid) then raise exception 'Target permission denied' using errcode='42501'; end if;
   if not exists(select 1 from public.study_groups where id=sid and offering_id=g.offering_id and status='active') then raise exception 'Target offering mismatch' using errcode='23514'; end if;
   perform 1 from public.study_groups where id=sid for update;
  else sid:=g.id; end if;
  if p_action<>'remove' and exists(select 1 from public.study_groups x where x.id=sid and x.capacity is not null and x.capacity<=(select count(*) from public.group_memberships where group_id=sid and ends_at is null)) then raise exception 'Group is full' using errcode='23514'; end if;
  if m.id is not null then update public.group_memberships set ends_at=clock_timestamp() where id=m.id; end if;
  if p_action<>'remove' then
   insert into public.group_memberships(group_id,offering_id,user_id,enrollment_id,enrollment_expires_at,created_by) values(sid,g.offering_id,target,e.id,e.expires_at,u);
  end if;
  if sid<>g.id then
   update public.study_groups set version=version+1,updated_at=clock_timestamp() where id=sid;
   insert into private.group_audit(group_id,actor_id,action,reason,after_data) values(sid,u,'transfer_in',reason,jsonb_build_object('userId',target,'from',g.id));
  end if;
 elsif p_action='one-off' then
  insert into public.group_sessions(group_id,title,starts_at,ends_at,original_starts_at,original_ends_at,mode,location,join_url,instructions,exception,created_by,updated_by)
  values(g.id,btrim(p_data->>'title'),(p_data->>'startsAt')::timestamptz,(p_data->>'endsAt')::timestamptz,(p_data->>'startsAt')::timestamptz,(p_data->>'endsAt')::timestamptz,g.mode,g.location,g.join_url,g.instructions,true,u,u) returning id into sid;
 elsif p_action in ('session','attendance','finalize','reopen') then
  select * into s from public.group_sessions where id=(p_data->>'sessionId')::uuid and group_id=g.id for update;
  if s.id is null then raise exception 'Session unavailable' using errcode='42501'; end if;
  if s.version is distinct from (p_data->>'sessionVersion')::int then raise exception 'Stale session' using errcode='PT409'; end if;
  old:=jsonb_build_object('session',to_jsonb(s),'marks',(select coalesce(jsonb_agg(to_jsonb(a) order by a.user_id),'[]'::jsonb) from public.session_attendance a where session_id=s.id and p_action='attendance' and exists(select 1 from jsonb_array_elements(coalesce(p_data->'marks','[]'::jsonb)) mark where (mark->>'userId')::uuid=a.user_id))); sid:=s.id;
  if p_action='session' then
   if s.attendance_state<>'draft' then raise exception 'Attendance already finalized' using errcode='23514'; end if;
   if p_data->>'operation'='reschedule' then
    if s.starts_at<=clock_timestamp() or s.roster_at is not null then raise exception 'Past session or saved roster immutable' using errcode='23514'; end if;
    update public.group_sessions set starts_at=(p_data->>'startsAt')::timestamptz,ends_at=(p_data->>'endsAt')::timestamptz,
    mode=g.mode,location=g.location,join_url=g.join_url,instructions=g.instructions,exception=true where id=s.id;
   elsif p_data->>'operation' in ('cancel','restore') then
    update public.group_sessions set cancelled=(p_data->>'operation'='cancel'),cancellation_reason=reason,exception=true where id=s.id;
   else raise exception 'Invalid session operation' using errcode='23514'; end if;
  else
   if s.cancelled then raise exception 'Cancelled session' using errcode='23514'; end if;
   if p_action='reopen' then
    if not private.can_manage_offering(g.offering_id) then raise exception 'Instructor required' using errcode='42501'; end if;
    if s.attendance_state<>'finalized' or length(btrim(reason))<3 then raise exception 'Correction requires finalized sheet and reason' using errcode='23514'; end if;
    update public.group_sessions set attendance_state='reopened' where id=s.id;
   else
    if s.attendance_state='finalized' then raise exception 'Attendance finalized' using errcode='PT409'; end if;
    perform private.snapshot_group_roster(s.id);
    if p_action='attendance' then
     if jsonb_typeof(p_data->'marks')<>'array' or jsonb_array_length(p_data->'marks')>100 then raise exception 'Maximum 100 marks per atomic save' using errcode='23514'; end if;
     for entry in select value from jsonb_array_elements(p_data->'marks') loop
      update public.session_attendance set status=entry->>'status',updated_by=u,updated_at=clock_timestamp() where session_id=s.id and user_id=(entry->>'userId')::uuid;
      if not found then raise exception 'Student not in dated roster' using errcode='23514'; end if;
     end loop;
    else
     if not private.can_manage_offering(g.offering_id) then raise exception 'Instructor required' using errcode='42501'; end if;
     update public.group_sessions set attendance_state='finalized' where id=s.id;
    end if;
   end if;
  end if;
  update public.group_sessions set version=version+1,updated_at=clock_timestamp(),updated_by=u where id=s.id;
 else raise exception 'Unknown operation' using errcode='23514'; end if;
 update public.study_groups set version=version+1,updated_at=clock_timestamp() where id=g.id returning * into g;
 select case when sid is not null and p_action not in ('transfer','add','remove') then (select to_jsonb(x) from public.group_sessions x where id=sid) else to_jsonb(g) end into result;
 insert into private.group_audit(group_id,session_id,actor_id,action,reason,before_data,after_data) values(g.id,case when p_action in ('session','attendance','finalize','reopen','one-off') then sid end,u,p_action,reason,old,jsonb_build_object('record',result,'input',p_data,'sheetDigest',case when p_action in ('finalize','reopen') then (select encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_array(a.user_id,a.membership_id,a.status) order by a.user_id)::text,'[]'),'UTF8')),'hex') from public.session_attendance a where a.session_id=sid) end));
 return jsonb_build_object('id',g.id,'version',g.version,'sessionId',case when p_action in ('session','attendance','finalize','reopen','one-off') then sid end);
end$$;
revoke all on function private.group_command(uuid,text,integer,jsonb) from public,anon;
grant execute on function private.group_command(uuid,text,integer,jsonb) to authenticated;
create function public.group_command(p_group uuid,p_action text,p_version integer default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.group_command(p_group,p_action,p_version,p_data)$$;
revoke all on function public.group_command(uuid,text,integer,jsonb) from public,anon;
grant execute on function public.group_command(uuid,text,integer,jsonb) to authenticated;

-- Read RPC separates current protected details from historical own attendance.
create function private.group_view(p_group uuid,p_section text,p_page integer,p_search text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.study_groups; staff boolean; u uuid:=(select private.current_app_user_id()); result jsonb; session_uuid uuid; group_row record;
begin
 if u is null or not private.is_active_user() then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_page not between 0 and 100000 or length(p_search)>160 then raise exception 'Invalid page or search' using errcode='23514'; end if;
 if p_group is null then
  if p_section='history' then
   select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page) into result from (
    select a.status,s.id as session_id,s.title,s.starts_at,listed.name as group_name from public.session_attendance a join public.group_sessions s on s.id=a.session_id join public.study_groups listed on listed.id=s.group_id
    where a.user_id=u and s.attendance_state='finalized' and not s.cancelled order by s.starts_at desc,s.id limit 25 offset p_page*25) x;
   return result;
  end if;
  if p_section='upcoming' then
   if (select count(*) from public.study_groups listed where private.can_view_group(listed.id) and listed.status='active')>100 then raise exception 'Open an individual group to view its sessions' using errcode='23514'; end if;
   for group_row in select id from public.study_groups where status='active' and private.can_view_group(id) order by id limit 100 loop perform private.materialize_group(group_row.id); end loop;
   select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'serverNow',clock_timestamp(),'page',0,'catchingUp',exists(select 1 from public.group_schedules r join public.study_groups listed on listed.id=r.group_id where r.active and private.can_view_group(listed.id) and r.materialized_through<(clock_timestamp() at time zone 'Africa/Cairo')::date)) into result from (
    select s.*,listed.name as group_name from public.group_sessions s join public.study_groups listed on listed.id=s.group_id where private.can_view_group(listed.id) and not s.cancelled and s.ends_at>clock_timestamp() order by s.starts_at,s.id limit 25) x;
   return result;
  end if;
  if p_section='offerings' then
   select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page,'hasMore',(select count(*)>25 from (select 1 from public.course_offerings o where private.can_manage_offering(o.id) and o.name ilike '%'||p_search||'%' limit 26 offset p_page*25) z)) into result from (select o.id,o.name from public.course_offerings o where private.can_manage_offering(o.id) and o.name ilike '%'||p_search||'%' order by o.id limit 25 offset p_page*25) x;
   return result;
  end if;
  select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page,'hasMore',(select count(*)>25 from (select 1 from public.study_groups listed where private.can_view_group(listed.id) and listed.name ilike '%'||p_search||'%' limit 26 offset p_page*25) z),'serverNow',clock_timestamp()) into result
  from (select listed.*,private.can_manage_group(listed.id) as staff,private.can_manage_offering(listed.offering_id) as instructor,o.name as offering_name from public.study_groups listed join public.course_offerings o on o.id=listed.offering_id where private.can_view_group(listed.id) and listed.name ilike '%'||p_search||'%' order by listed.created_at,listed.id limit 25 offset p_page*25) x;
  return result;
 end if;
 select * into g from public.study_groups where id=p_group;
 staff:=private.can_manage_group(p_group);
 if not private.can_view_group(p_group) then
  if p_section<>'history' or not exists(select 1 from public.group_memberships where group_id=p_group and user_id=u) then raise exception 'Group unavailable' using errcode='42501'; end if;
 end if;
 if p_section='detail' then
  return jsonb_build_object('group',to_jsonb(g)||jsonb_build_object('staff',staff,'instructor',private.can_manage_offering(g.offering_id),'offering_name',(select name from public.course_offerings where id=g.offering_id)),
  'schedules',(select coalesce(jsonb_agg(jsonb_build_object('weekday',weekday,'time',to_char(local_time,'HH24:MI'),'durationMinutes',duration_minutes)),'[]'::jsonb) from public.group_schedules where group_id=g.id and active),'serverNow',clock_timestamp());
 elsif p_section='sessions' then
  perform private.materialize_group(g.id);
  if not private.can_view_group(g.id) then raise exception 'Access changed' using errcode='42501'; end if;
  select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page,'serverNow',clock_timestamp(),'nextSession',(select to_jsonb(ns) from public.group_sessions ns where ns.group_id=g.id and not ns.cancelled and ns.ends_at>clock_timestamp() order by ns.starts_at,ns.id limit 1),'catchingUp',exists(select 1 from public.group_schedules r where r.group_id=g.id and r.active and r.materialized_through<(clock_timestamp() at time zone 'Africa/Cairo')::date),'hasMore',(select count(*)>25 from (select 1 from public.group_sessions where group_id=g.id limit 26 offset p_page*25) z)) into result
  from (select s.*,case when s.cancelled then 'cancelled' when s.ends_at<=clock_timestamp() then 'completed' when s.starts_at<=clock_timestamp() then 'ongoing' else 'upcoming' end as state
   from public.group_sessions s where s.group_id=g.id order by case when s.ends_at>clock_timestamp() and not s.cancelled then 0 else 1 end,case when s.ends_at>clock_timestamp() and not s.cancelled then s.starts_at end asc,s.starts_at desc,s.id limit 25 offset p_page*25) x;
 elsif p_section in ('members','eligible','staff','audit') then
  if not staff then raise exception 'Staff required' using errcode='42501'; end if;
  if p_section='members' then
   select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page,'hasMore',(select count(*)>25 from (select 1 from public.group_memberships m join public.profiles p on p.id=m.user_id where m.group_id=g.id and coalesce(p.display_name,'') ilike '%'||p_search||'%' limit 26 offset p_page*25) z)) into result
   from (select m.*,p.display_name,exists(select 1 from public.enrollments e where e.id=m.enrollment_id and e.status='active' and (e.expires_at is null or e.expires_at>clock_timestamp()) and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp())) as eligible from public.group_memberships m join public.profiles p on p.id=m.user_id where m.group_id=g.id and coalesce(p.display_name,'') ilike '%'||p_search||'%' order by m.starts_at desc,m.id limit 25 offset p_page*25) x;
  elsif p_section='eligible' then
   select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page,'hasMore',(select count(*)>25 from (select 1 from public.enrollments e join public.profiles p on p.id=e.user_id where e.offering_id=g.offering_id and e.status='active' and p.status='active' and (e.expires_at is null or e.expires_at>clock_timestamp()) and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp()) and coalesce(p.display_name,'') ilike '%'||p_search||'%' limit 26 offset p_page*25) z)) into result
   from (select e.user_id,p.display_name from public.enrollments e join public.profiles p on p.id=e.user_id where e.offering_id=g.offering_id and e.status='active' and p.status='active' and (e.expires_at is null or e.expires_at>clock_timestamp()) and (e.enrolled_at is null or e.enrolled_at<=clock_timestamp()) and coalesce(p.display_name,'') ilike '%'||p_search||'%' order by p.display_name,e.user_id limit 25 offset p_page*25) x;
  elsif p_section='staff' then
   select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page) into result from (select os.user_id,p.display_name,exists(select 1 from public.group_staff gs where gs.group_id=g.id and gs.user_id=os.user_id) as assigned from public.offering_staff os join public.profiles p on p.id=os.user_id where os.offering_id=g.offering_id order by os.user_id limit 25 offset p_page*25) x;
  else
   select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page) into result from (select action,reason,actor_id,created_at,before_data,after_data from private.group_audit where group_id=g.id order by created_at desc,id limit 25 offset p_page*25) x;
  end if;
 elsif p_section='history' then
  select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page) into result from (
   select a.user_id,a.status,s.id as session_id,s.title,s.starts_at,p.display_name from public.session_attendance a join public.group_sessions s on s.id=a.session_id join public.profiles p on p.id=a.user_id
   where s.group_id=g.id and not s.cancelled and (staff or (a.user_id=u and s.attendance_state='finalized')) and (p_search='' or a.user_id::text=p_search or coalesce(p.display_name,'') ilike '%'||p_search||'%') order by s.starts_at desc,a.user_id limit 25 offset p_page*25) x;
 else
  if not staff then raise exception 'Staff required' using errcode='42501'; end if;
  session_uuid:=p_section::uuid;
   if not exists(select 1 from public.group_sessions where id=session_uuid and group_id=g.id) then raise exception 'Session unavailable' using errcode='42501'; end if;
   perform private.snapshot_group_roster(session_uuid);
   select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'page',p_page,'hasMore',(select count(*)>25 from (select 1 from public.session_attendance where session_id=session_uuid limit 26 offset p_page*25) z),
    'session',(select to_jsonb(s) from public.group_sessions s where id=session_uuid),
    'counts',(select jsonb_build_object('attended',count(*) filter(where status='attended'),'absent',count(*) filter(where status='absent'),'not_marked',count(*) filter(where status='not_marked')) from public.session_attendance where session_id=session_uuid)) into result
   from (select a.*,p.display_name from public.session_attendance a join public.profiles p on p.id=a.user_id where a.session_id=session_uuid order by a.user_id limit 25 offset p_page*25) x;
 end if;
 return result;
end$$;
revoke all on function private.group_view(uuid,text,integer,text) from public,anon;
grant execute on function private.group_view(uuid,text,integer,text) to authenticated;
create function public.group_view(p_group uuid default null,p_section text default 'sessions',p_page integer default 0,p_search text default '') returns jsonb language sql security invoker set search_path='' as $$select private.group_view(p_group,p_section,p_page,p_search)$$;
revoke all on function public.group_view(uuid,text,integer,text) from public,anon;
grant execute on function public.group_view(uuid,text,integer,text) to authenticated;

-- Enrollment changes split membership intervals at the server clock; old eligibility
-- is not rewritten. No existing enrollment or membership is changed on installation.
create function private.group_enrollment_interval() returns trigger language plpgsql security definer set search_path='' as $$
declare m public.group_memberships; actor uuid;
begin
 if new.status is not distinct from old.status and new.expires_at is not distinct from old.expires_at and new.enrolled_at is not distinct from old.enrolled_at then return new; end if;
 perform 1 from public.course_offerings where id=new.offering_id for update;
 for m in select * from public.group_memberships where enrollment_id=new.id and ends_at is null for update loop
  update public.group_memberships set ends_at=greatest(starts_at,clock_timestamp()) where id=m.id;
  if new.status='active' and (new.expires_at is null or new.expires_at>clock_timestamp()) and (new.enrolled_at is null or new.enrolled_at<=clock_timestamp()) then
   insert into public.group_memberships(group_id,offering_id,user_id,enrollment_id,enrollment_expires_at,created_by)
   values(m.group_id,m.offering_id,m.user_id,m.enrollment_id,new.expires_at,m.created_by);
  end if;
  actor:=(select private.current_app_user_id());
  insert into private.group_audit(group_id,actor_id,action,before_data,after_data) values(m.group_id,actor,'enrollment_interval',to_jsonb(m),jsonb_build_object('status',new.status,'expiresAt',new.expires_at));
  update public.study_groups set version=version+1,updated_at=clock_timestamp() where id=m.group_id;
 end loop;
 return new;
end$$;
revoke all on function private.group_enrollment_interval() from public,anon,authenticated;
create trigger group_enrollment_interval after update of status,expires_at,enrolled_at on public.enrollments for each row execute function private.group_enrollment_interval();
