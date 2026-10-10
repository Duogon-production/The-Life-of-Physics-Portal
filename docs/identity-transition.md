# Identity transition: preparation only

## Current trust boundary

The live portal authenticates with Clerk and stores application users in Prisma.
The Supabase development model authenticates only Supabase UUID subjects, through
`private.current_app_user_id()`. That helper currently returns `auth.uid()` unchanged.
All public/private application functions and public/Storage RLS policies now use
this seam rather than scattering UUID-subject parsing throughout the model.
Storage object ownership deliberately compares `owner_id` to raw `auth.jwt()->>'sub'`;
the external provider subject and the internal application UUID are different concepts.

The remaining direct dependency is `profiles.id -> auth.users.id ON DELETE CASCADE`
and the `auth.users` profile-creation trigger. Both remain intact in this phase.
No Firebase SDK, trusted Firebase issuer, token exchange, new login page or
Clerk-to-Supabase impersonation bridge was introduced. A Clerk cookie does not
authorize Supabase queries. The staging repository requires a real verified
Supabase user and active profile; the default feature flag is `legacy`.

## Stable application identity

`private.external_identities` is a non-exposed registry with UUID primary key,
stable `profile_id`, text `provider`, text `issuer`, text `subject`, active/disabled
status, required `verified_at`, timestamps, and unique `(issuer,subject)`.
Subjects are strings and can contain Firebase UIDs. It references profiles, not
`auth.users`. It is empty, has RLS with no client policies, and has no application
table grants. No browser, student, instructor or public RPC can self-link identities.

Never map by an unverified email, display name, a client-supplied UUID, or mutable
user metadata. Never infer tenant roles from Firebase custom profile fields.
Role authority remains relational memberships, course staff, offering staff and
enrollments. The legacy email sync now requires the verified primary Clerk email
before performing its existing email-based synchronization/admin allowlist logic.
Legacy email-based relinking and hardcoded admin provisioning still need replacement
with an audited administrative recovery/provisioning workflow before public launch.

## Exact next-phase sequence (not executed)

1. Back up application data, identity mappings and file manifests. Restore them
   into an isolated development environment and validate row counts/references.
   Inventory Clerk subjects and choose each existing user's stable profile UUID.
   Resolve account collisions manually. Preserve existing valid profile UUIDs.
2. Write a reviewed additive migration that drops ONLY the profile FK to
   `auth.users` and removes/replaces ONLY this application's automatic profile
   creation trigger. Do not modify `auth.users` structure or delete identities.
   Preserve every profile and all descendant foreign keys. No new Supabase Auth
   account must be required for a Firebase user.
3. Populate the private identity registry using verified provider exports and
   authenticated administrative reconciliation. Existing Supabase users can be
   explicitly mapped by their known authentication UUID; Clerk-to-Firebase linking
   requires authenticated proof/approved migration, never email matching alone.
4. Configure the official Firebase third-party authentication trust for exactly
   the intended Firebase project. Verify token signature, issuer, audience,
   expiration and authenticated role. Reject tokens from other Firebase projects,
   even if they use the same Google signing keys. Scope this trust to staging first.
5. Replace `private.current_app_user_id()` with a fixed-search-path, fully qualified
   SECURITY DEFINER resolver that looks up the verified JWT `(iss,sub)` in the
   private registry and returns its active profile UUID. Reject missing, disabled
   or ambiguous mappings; do not fall back to casting a Firebase UID or accepting
   a supplied profile ID. Restrict execute grants to the required application role.
   Review every auth/storage helper again, including raw Storage `owner_id` behavior.
6. Replace the staging session adapter with Firebase server token verification;
   use publishable Supabase clients plus the verified third-party access token.
   Do not implement a service-role proxy for student requests. Add refresh/logout,
   revoked-token handling, onboarding, invitation and administrative linking flows.
7. Test real authenticated REST/RPC/Storage requests: cross-issuer tokens, expired
   tokens, disabled mappings, suspended profiles, tenant isolation, answer keys and
   ownership. Run SQL suites and 50/100/200 session workloads before routing UI reads.
8. Import validated legacy mappings/content through an approved resumable importer;
   compare counts and academic history; cut over features incrementally with a
   tested rollback. Keep Clerk operational until that separate cutover is approved.

This is an implementation sequence, not an activated provider migration.
Official reference: [Supabase Firebase third-party authentication](https://supabase.com/docs/guides/auth/third-party/firebase-auth).

## Later ASP.NET Core/PostgreSQL backend

Keep profile UUIDs, external subjects and relational authorizations unchanged.
Replace the Supabase transport implementation behind the shared LMS port with
HTTP endpoints. Verify Firebase tokens in ASP.NET Core. Use a least-privileged
database role with RLS, no ownership/BYPASSRLS, and transaction-local trusted
identity context set only by the verified backend. Never grant end users SQL
connections or allow a request body to choose that context. Replace Supabase JWT
functions with a reviewed identity-context resolver; port Storage policies to the
file service. Test pooled-connection context isolation and clearing on rollback.
