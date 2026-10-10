# Database operations and Free-tier limits

## Applying schema and running checks

The development project is `gmvouqgjbtbkbhrdruzu`; verify the target on every run.
Its eleven migration versions match `supabase/migrations/`. Never change applied SQL.
Create new files with `npx supabase migration new descriptive_name`; review changes,
then use the official MCP `apply_migration`. MCP assigns the applied timestamp;
reconcile the local filename with `list_migrations` before CLI `db push`.

For CLI operations, authenticate/link locally, review `npx supabase db push --dry-run`,
then apply only the reviewed migration set. Do not put access tokens in scripts.
For a disposable LOCAL Supabase stack, Docker is required: `npx supabase start`,
then `npx supabase db reset` applies migrations and development seed. Never run reset
against a remote database. No Docker/Postgres client is installed in this workspace,
so remote schema/security tests used the official MCP instead.

Execute `supabase/tests/authorization.sql` and `supabase/tests/hardening.sql` as
postgres against the seeded development project. Each is a transaction ending in
ROLLBACK; it fails on an incorrect assertion. They require actual `authenticated`
and `anon` database roles and seed identities. `supabase/tests/concurrency.md`
documents the executed two-session regressions and narrowly scoped fixture cleanup.
Never load seed identities into production or unban them for real sign-in.

Run `npm run check` and `npm run build`. Regenerate public types using the official
MCP `generate_typescript_types`, or `npx supabase gen types typescript --project-id
gmvouqgjbtbkbhrdruzu --schema public` and save the result to
`shared/contracts/database.types.ts`. Use UTF-8; older Windows PowerShell redirection
may produce UTF-16. Do not include private tables in application-generated types.

Inspect `pg_policies`, `information_schema.role_table_grants`, column privileges,
`pg_proc.prosecdef/proconfig`, foreign keys/indexes and both official advisors after
schema changes. Private tables intentionally have no client policies or table grants.
The private schema must remain excluded from Data API schemas.

## Upload maintenance

No Supabase UI upload flow is activated. Once enabled, register asset metadata,
upload without overwrite, call completion RPC, and abandon failed uploads. Pending
uploads expire after 24 hours. Regularly run the operator-only maintenance script,
initially in dry-run, and alert on pending age/queue growth. No scheduled job was
installed, and no actual files were deleted during this task.

`scripts/lms-storage-maintenance.cjs` requires explicit development-only variables:
`LMS_MAINTENANCE_ENV=development`, `LMS_MAINTENANCE_PROJECT_REF`, and
`LMS_MAINTENANCE_DATABASE_URL`. Apply additionally requires operator-only
`LMS_MAINTENANCE_SECRET_KEY` and `--apply`; these are never NEXT_PUBLIC variables or
application request credentials. The script validates project matching, bounds each
batch to 100, archives eligible unreferenced metadata before calling the Storage
deletion API, retains metadata and retries failures idempotently. It never deletes
ready media, unregistered objects, academic references or database rows. A production
retention job needs separately reviewed targeting/credentials and authorization.

## Controlled HTTP performance tests

`scripts/lms-load-test.cjs` runs one bounded wave each at 50, 100 and 200 concurrent
students. It measures start/save/submit/progress p50/p95/max latency and errors.
It requires a dedicated development project, publishable key and 200 distinct REAL
verified student access tokens. No token minting/signup/privileged bypass is supplied.

Set `LMS_LOAD_TEST_ENV=development`, `LMS_LOAD_TEST_PROJECT_REF`,
`LMS_LOAD_TEST_SESSIONS` (an ignored local JSON path), plus the public URL/key.
Each fixture item has `profileId`, `accessToken`, `offeringAssessmentId`,
`questionId`, `response`, `offeringId`, `lessonId`. Use disposable test offerings,
adequate capacity and at least three attempts per identity, or separate offerings
per wave. This test writes synthetic attempts/progress; never target real exams.
Capture project CPU/RAM/connections/locks and egress independently before/during/
after each wave. The script's client timings do not measure server resource usage.
HTTP workload runs remain unexecuted because the current seven seed identities are
banned and no real test sessions were supplied. No student-capacity guarantee exists.

## Independent backups and restores

Free projects require operator-managed exports and off-site backups; database
backups do not contain Storage bytes. See [official backup guidance](https://supabase.com/docs/guides/platform/backups).
Keep encrypted database exports, file manifests/checksums and file copies together.
Record migration versions, PostgreSQL version, extension versions, identity issuer
configuration and restore instructions. Restrict access: profiles/identity subjects,
responses, phone numbers and auth exports contain personal/sensitive data.

Use PostgreSQL 17 client tools. Store connection settings in a protected PostgreSQL
service file/passfile, not shell history. Example for operator-reviewed backup:

```powershell
New-Item -ItemType Directory -Force .local/backups
$env:PGSERVICE = 'lms_backup_source'
pg_dump --format=custom --no-owner --no-acl --schema=public --schema=private --file=.local/backups/lms.dump
pg_restore --list .local/backups/lms.dump
```

This application-only dump needs a compatible target with auth identities, roles,
Storage metadata and required extensions already restored/provisioned; it is NOT
a complete Supabase disaster-recovery dump. Before detaching the auth FK, profiles
still require matching auth.users UUIDs. Back up required auth data and Storage
metadata separately using the official Supabase backup/restore workflow and strict
credential handling. Back up Storage objects through their API; SQL metadata alone
cannot recover files. Do not export server signing keys into Git.

Restore ONLY into a new disposable compatible target: validate its identity first,
create required roles/platform dependencies and apply reviewed migrations, then
restore data in dependency order. For a target restored with an application schema
dump rather than migrations, separately reapply/review grants because `--no-acl`
omits them. Example `pg_restore --exit-on-error --single-transaction --no-owner
--no-acl --data-only --dbname=service=lms_restore_target .local/backups/lms.dump`
requires an empty migrated schema and correct auth dependency preparation. Never
use `--clean` against a live target. Verify counts, foreign keys, identity mapping,
both SQL suites, real-token APIs and file checksums. Rehearse a restore before
public launch. A full backup/restore was not executed in this task.

## Self-hosted PostgreSQL and ASP.NET Core

The relational model, UUIDs, timestamptz, constraints, grading and history guards
are PostgreSQL. Supabase-specific dependencies still include auth.users FK/trigger,
auth.uid/auth.jwt, API roles/grants, Storage buckets/objects/policies and RPC transport.
Follow `identity-transition.md` to detach identities without rewriting user FKs.
Replace the repository adapter with ASP.NET Core endpoints, verify Firebase tokens,
install a transaction-scoped trusted identity resolver and least-privilege RLS role,
replace Storage transport/policies, and migrate file bytes separately. Rehearse
restore, real-token isolation, pooled-session reuse and exam load on the actual host.
Self-hosting also requires TLS, patches, monitoring, email configuration, encrypted
off-site backups and disaster recovery. This work has not provisioned a host.

## Cost and capacity

The connected organization is confirmed Free. Official limits checked 2026-10-10:
500 MB database, shared CPU/500 MB RAM, 1 GB Storage, 5 GB uncached egress plus 5 GB
cached egress, and pauses after one inactive week. Unlimited API request count is
not unlimited compute. See [current pricing](https://supabase.com/pricing).

Development database size was about 13.4 MB after hardening/testing, with no actual
Storage objects. This does not project production usage. Responses/attempt indexes,
archived history and large JSON responses grow with every exam. Measure realistic
retention before launch; alert before capacity limits (for example 70% and 85%).
Save answers on changes with debouncing, not every keystroke. Throttle progress
updates; avoid one database connection per student, polling full rosters, and unused
Realtime subscriptions. None were added. PDFs and videos can exhaust 1 GB Storage
and egress rapidly. Keep large videos on an explicitly budgeted external delivery
service; the Free 50 MB file bound is not a video-library allowance.

Clerk, the legacy PostgreSQL provider, UploadThing, Mux, LiveKit and Resend remain
referenced by existing code. Their active plans/bills were not verified; no claim
that the entire legacy deployment costs $0 is made. No paid service, upgrade,
purchase or hosting configuration change was introduced.

## Troubleshooting

- RLS denial with Clerk login: expected until the separate identity migration;
  do not enable a service-role browser proxy to bypass it.
- Empty lists: inspect contextual role, organization/profile status, active
  enrollment/expiry and published content. Editors do not automatically manage cohorts.
- Option wildcard permission error: request safe columns; correctness is staff RPC only.
- Expired attempt: answer saves stop at deadline; explicit submit can still freeze
  saved answers. Starting beyond the attempt limit rolls back its attempted expiry update.
- Upload failure: check actual global/bucket bounds, registered owner/path, expiry,
  MIME and completion. Never edit storage.objects metadata as an application workaround.
- Migration mismatch: reconcile applied versions before db push, never apply an
  existing migration twice or repair history without inspecting the remote schema.
- Windows exFAT EISDIR: npm scripts preload the narrow filesystem compatibility
  shim. It preserves real errors and symbolic links; its three regression tests pass.
