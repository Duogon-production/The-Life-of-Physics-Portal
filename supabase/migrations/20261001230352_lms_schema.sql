-- Initial tenant-aware LMS. No legacy tables or identities are modified.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;
create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := pg_catalog.now(); return new; end $$;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text, avatar_path text, phone text,
 status text not null default 'active' check (status in ('active','suspended','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name'), 200)) on conflict(id) do nothing;
 return new;
end $$;
revoke all on function private.create_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;


create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), status text not null default 'active' check(status in ('active','suspended','archived')), created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.organization_memberships (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, role text not null check(role in ('owner','admin','teacher','assistant')), status text not null default 'active' check(status in ('invited','active','suspended')), joined_at timestamptz, unique(organization_id,user_id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.courses (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict, title text not null check(length(trim(title))>0), slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text, status text not null default 'draft' check(status in ('draft','published','archived')), visibility text not null default 'private' check(visibility in ('private','unlisted','public')), created_by uuid references public.profiles(id) on delete set null, unique(organization_id,slug), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.course_staff (id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, role text not null check(role in ('owner','instructor','assistant','editor')), unique(course_id,user_id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.course_modules (id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade, title text not null, description text, position integer not null check(position>=0), unique(course_id,position), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.lessons (id uuid primary key default gen_random_uuid(), module_id uuid not null references public.course_modules(id) on delete cascade, title text not null, position integer not null check(position>=0), status text not null default 'draft' check(status in ('draft','published')), estimated_duration_seconds integer check(estimated_duration_seconds>=0), unique(module_id,position), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.course_offerings (id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete restrict, name text not null, delivery_mode text not null default 'scheduled' check(delivery_mode in ('self_paced','scheduled','live','blended')), starts_at timestamptz, ends_at timestamptz, enrollment_opens_at timestamptz, enrollment_closes_at timestamptz, timezone text not null default 'Africa/Cairo', capacity integer check(capacity>0), status text not null default 'draft' check(status in ('draft','active','completed','archived')), check(ends_at>=starts_at), check(enrollment_closes_at>=enrollment_opens_at), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.offering_staff (id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.course_offerings(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, role text not null check(role in ('instructor','teaching_assistant')), unique(offering_id,user_id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.enrollments (id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.course_offerings(id) on delete restrict, user_id uuid not null references public.profiles(id) on delete restrict, status text not null default 'invited' check(status in ('invited','active','completed','cancelled','suspended')), enrolled_at timestamptz, expires_at timestamptz, completed_at timestamptz, source text, created_by uuid references public.profiles(id) on delete set null, unique(offering_id,user_id), check(expires_at>=enrolled_at), check(completed_at>=enrolled_at), check(status<>'completed' or completed_at is not null), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.media_assets (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict, uploaded_by uuid not null references public.profiles(id) on delete restrict, offering_id uuid references public.course_offerings(id) on delete restrict, kind text not null check(kind in ('image','video','pdf','file','submission')), mime_type text not null, original_filename text not null, storage_provider text not null default 'supabase' check(storage_provider='supabase'), bucket text not null check(bucket in ('lms-course-media','lms-submissions')), object_path text not null, size_bytes bigint check(size_bytes>=0), status text not null default 'pending' check(status in ('pending','ready','archived')), unique(bucket,object_path), check(object_path like organization_id::text || '/' || id::text || '/%'), check((bucket='lms-submissions' and kind='submission' and offering_id is not null) or (bucket='lms-course-media' and kind<>'submission' and offering_id is null)), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.lesson_blocks (id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id) on delete cascade, block_type text not null check(block_type in ('text','heading','image','video','pdf','embed','file','callout')), position integer not null check(position>=0), content jsonb not null default '{}'::jsonb check(jsonb_typeof(content)='object'), media_asset_id uuid references public.media_assets(id) on delete restrict, unique(lesson_id,position), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.lesson_progress (id uuid primary key default gen_random_uuid(), offering_id uuid not null, lesson_id uuid not null references public.lessons(id) on delete restrict, user_id uuid not null, status text not null default 'not_started' check(status in ('not_started','in_progress','completed')), started_at timestamptz, completed_at timestamptz, last_accessed_at timestamptz, video_position_seconds integer check(video_position_seconds>=0), foreign key(offering_id,user_id) references public.enrollments(offering_id,user_id) on delete restrict, unique(offering_id,lesson_id,user_id), check(completed_at>=started_at), check(status<>'completed' or completed_at is not null), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.assessments (id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete restrict, title text not null, type text not null check(type in ('quiz','exam','assignment','practice')), instructions text, status text not null default 'draft' check(status in ('draft','published','archived')), version integer not null default 1 check(version>0), supersedes_assessment_id uuid references public.assessments(id) on delete restrict, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.assessment_questions (id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.assessments(id) on delete cascade, question_type text not null check(question_type in ('single_choice','multiple_choice','true_false','numeric','short_text','essay','file_upload')), prompt text not null, points numeric(12,3) not null default 1 check(points>=0 and points<>'NaN'::numeric), position integer not null check(position>=0), settings jsonb not null default '{}'::jsonb check(jsonb_typeof(settings)='object' and settings - array['placeholder','min_length','max_length','allowed_mime_types','max_files','max_size_bytes'] = '{}'::jsonb), unique(assessment_id,position), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.assessment_options (id uuid primary key default gen_random_uuid(), question_id uuid not null references public.assessment_questions(id) on delete cascade, text text not null, position integer not null check(position>=0), is_correct boolean not null default false, unique(question_id,position), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.offering_assessments (id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.course_offerings(id) on delete restrict, assessment_id uuid not null references public.assessments(id) on delete restrict, opens_at timestamptz, closes_at timestamptz, time_limit_seconds integer check(time_limit_seconds>0), max_attempts integer check(max_attempts>0), shuffle_questions boolean not null default false, shuffle_options boolean not null default false, published boolean not null default false, unique(offering_id,assessment_id), check(closes_at>=opens_at), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.assessment_attempts (id uuid primary key default gen_random_uuid(), offering_assessment_id uuid not null references public.offering_assessments(id) on delete restrict, user_id uuid not null references public.profiles(id) on delete restrict, attempt_number integer not null check(attempt_number>0), started_at timestamptz not null default now(), deadline_at timestamptz, submitted_at timestamptz, status text not null default 'in_progress' check(status in ('in_progress','submitted','graded','void')), score numeric(12,3) check(score>=0 and score<>'NaN'::numeric), max_score numeric(12,3) check(max_score>=0 and max_score<>'NaN'::numeric), graded_at timestamptz, graded_by uuid references public.profiles(id) on delete set null, unique(offering_assessment_id,user_id,attempt_number), check(submitted_at>=started_at), check(deadline_at>=started_at), check(score<=max_score), check(status not in ('submitted','graded') or submitted_at is not null), check(status<>'graded' or (graded_at is not null and score is not null)), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.assessment_responses (id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.assessment_attempts(id) on delete restrict, question_id uuid not null references public.assessment_questions(id) on delete restrict, response jsonb not null default '{}'::jsonb check(jsonb_typeof(response)='object'), media_asset_id uuid references public.media_assets(id) on delete restrict, awarded_points numeric(12,3) check(awarded_points>=0 and awarded_points<>'NaN'::numeric), feedback text, graded_by uuid references public.profiles(id) on delete set null, graded_at timestamptz, unique(attempt_id,question_id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
create trigger touch_updated_at before update on public.profiles for each row execute function private.touch_updated_at();

alter table public.organizations enable row level security;
revoke all on public.organizations from public, anon, authenticated;
create trigger touch_updated_at before update on public.organizations for each row execute function private.touch_updated_at();

alter table public.organization_memberships enable row level security;
revoke all on public.organization_memberships from public, anon, authenticated;
create trigger touch_updated_at before update on public.organization_memberships for each row execute function private.touch_updated_at();

alter table public.courses enable row level security;
revoke all on public.courses from public, anon, authenticated;
create trigger touch_updated_at before update on public.courses for each row execute function private.touch_updated_at();

alter table public.course_staff enable row level security;
revoke all on public.course_staff from public, anon, authenticated;
create trigger touch_updated_at before update on public.course_staff for each row execute function private.touch_updated_at();

alter table public.course_modules enable row level security;
revoke all on public.course_modules from public, anon, authenticated;
create trigger touch_updated_at before update on public.course_modules for each row execute function private.touch_updated_at();

alter table public.lessons enable row level security;
revoke all on public.lessons from public, anon, authenticated;
create trigger touch_updated_at before update on public.lessons for each row execute function private.touch_updated_at();

alter table public.course_offerings enable row level security;
revoke all on public.course_offerings from public, anon, authenticated;
create trigger touch_updated_at before update on public.course_offerings for each row execute function private.touch_updated_at();

alter table public.offering_staff enable row level security;
revoke all on public.offering_staff from public, anon, authenticated;
create trigger touch_updated_at before update on public.offering_staff for each row execute function private.touch_updated_at();

alter table public.enrollments enable row level security;
revoke all on public.enrollments from public, anon, authenticated;
create trigger touch_updated_at before update on public.enrollments for each row execute function private.touch_updated_at();

alter table public.media_assets enable row level security;
revoke all on public.media_assets from public, anon, authenticated;
create trigger touch_updated_at before update on public.media_assets for each row execute function private.touch_updated_at();

alter table public.lesson_blocks enable row level security;
revoke all on public.lesson_blocks from public, anon, authenticated;
create trigger touch_updated_at before update on public.lesson_blocks for each row execute function private.touch_updated_at();

alter table public.lesson_progress enable row level security;
revoke all on public.lesson_progress from public, anon, authenticated;
create trigger touch_updated_at before update on public.lesson_progress for each row execute function private.touch_updated_at();

alter table public.assessments enable row level security;
revoke all on public.assessments from public, anon, authenticated;
create trigger touch_updated_at before update on public.assessments for each row execute function private.touch_updated_at();

alter table public.assessment_questions enable row level security;
revoke all on public.assessment_questions from public, anon, authenticated;
create trigger touch_updated_at before update on public.assessment_questions for each row execute function private.touch_updated_at();

alter table public.assessment_options enable row level security;
revoke all on public.assessment_options from public, anon, authenticated;
create trigger touch_updated_at before update on public.assessment_options for each row execute function private.touch_updated_at();

alter table public.offering_assessments enable row level security;
revoke all on public.offering_assessments from public, anon, authenticated;
create trigger touch_updated_at before update on public.offering_assessments for each row execute function private.touch_updated_at();

alter table public.assessment_attempts enable row level security;
revoke all on public.assessment_attempts from public, anon, authenticated;
create trigger touch_updated_at before update on public.assessment_attempts for each row execute function private.touch_updated_at();

alter table public.assessment_responses enable row level security;
revoke all on public.assessment_responses from public, anon, authenticated;
create trigger touch_updated_at before update on public.assessment_responses for each row execute function private.touch_updated_at();

create index organizations_created_by_idx on public.organizations(created_by);

create index organization_memberships_user_id_organization_id_idx on public.organization_memberships(user_id, organization_id);

create index organization_memberships_organization_id_role_idx on public.organization_memberships(organization_id, role);

create index courses_created_by_idx on public.courses(created_by);

create index course_staff_user_id_course_id_idx on public.course_staff(user_id, course_id);

create index course_offerings_course_id_idx on public.course_offerings(course_id);

create index offering_staff_user_id_offering_id_idx on public.offering_staff(user_id, offering_id);

create index enrollments_user_id_offering_id_idx on public.enrollments(user_id, offering_id);

create index enrollments_offering_id_status_idx on public.enrollments(offering_id, status);

create index enrollments_created_by_idx on public.enrollments(created_by);

create index media_assets_organization_id_idx on public.media_assets(organization_id);

create index media_assets_uploaded_by_idx on public.media_assets(uploaded_by);

create index media_assets_offering_id_idx on public.media_assets(offering_id);

create index lesson_blocks_media_asset_id_idx on public.lesson_blocks(media_asset_id);

create index lesson_progress_user_id_offering_id_idx on public.lesson_progress(user_id, offering_id);

create index lesson_progress_lesson_id_idx on public.lesson_progress(lesson_id);

create index assessments_course_id_idx on public.assessments(course_id);

create index assessments_created_by_idx on public.assessments(created_by);

create index assessments_supersedes_assessment_id_idx on public.assessments(supersedes_assessment_id);

create index offering_assessments_assessment_id_idx on public.offering_assessments(assessment_id);

create index assessment_attempts_user_id_offering_assessment_id_idx on public.assessment_attempts(user_id, offering_assessment_id);

create index assessment_attempts_graded_by_idx on public.assessment_attempts(graded_by);

create index assessment_responses_question_id_idx on public.assessment_responses(question_id);

create index assessment_responses_graded_by_idx on public.assessment_responses(graded_by);

create index assessment_responses_media_asset_id_idx on public.assessment_responses(media_asset_id);

create table private.assessment_answer_keys (
 question_id uuid primary key references public.assessment_questions(id) on delete cascade,
 answer jsonb not null default '{}'::jsonb check(jsonb_typeof(answer)='object')
);
alter table private.assessment_answer_keys enable row level security;
revoke all on private.assessment_answer_keys from public, anon, authenticated;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

