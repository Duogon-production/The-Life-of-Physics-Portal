-- Disposable embedded PostgreSQL ONLY. Managed auth/storage API substitutes;
-- never a migration and never run on an existing Supabase project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create schema extensions;
alter default privileges in schema public grant execute on functions to service_role;
create table auth.users (
 id uuid primary key, aud text, role text, email text, encrypted_password text,
 banned_until timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
 created_at timestamptz, updated_at timestamptz
);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
grant usage on schema auth,storage,public to anon,authenticated,service_role;
grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb,unique(bucket_id,name));
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
