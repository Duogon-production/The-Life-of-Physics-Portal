# Supabase continuation report — 2026-10-10

## A. Completed work

Inspected the existing repository, actual Clerk/Prisma/UploadThing request paths,
all six original SQL migrations, remote functions/policies/constraints/indexes,
Storage configuration and active plan. The connected project
`gmvouqgjbtbkbhrdruzu` is healthy, Free, PostgreSQL 17.11, eu-west-1. Original
migrations were retained; no legacy application data was migrated or deleted.

Five new additive migrations were applied through the official Supabase MCP.
Their local filenames now match the remote migration history exactly:

| Migration | Actual change |
| --- | --- |
| `20261010100544_harden_storage_and_assessments.sql` | Free-compatible 50,000,000-byte course bucket; verified object ownership/size/MIME; restricted media INSERT columns; 24-hour upload expiry/abandonment/cleanup queue; completed submission files; per-student attempt locks instead of a cohort-wide exclusive start lock |
| `20261010100545_external_identity_preparation.sql` | Private string issuer/subject-to-profile registry and one replaceable identity helper; existing auth behavior preserved |
| `20261010100547_objective_assessment_grading.sql` | Trusted single/multiple-choice/true-false and explicit numeric grading on submission; subjective/manual fallback; staff-controlled release |
| `20261010101249_ready_media_references.sql` | Ready-only lesson assets and cleanup queue excluding all academic references |
| `20261010102724_bound_assessment_response_size.sql` | Maximum 65,536-byte persisted question response JSON |

Result: 19 public application tables, all with RLS; private answer-key and external
identity tables with deny-all client access; private expired-upload view. Existing
tables remain profiles, organizations, organization_memberships, courses,
course_staff, course_modules, lessons, course_offerings, offering_staff,
enrollments, media_assets, lesson_blocks, lesson_progress, assessments,
assessment_questions, assessment_options, offering_assessments,
assessment_attempts and assessment_responses. No commerce or global user-role
tables were introduced.

Application/tooling files added or updated in this continuation:

- `shared/contracts/lms.ts`: typed repository and storage ports covering all LMS areas.
- `shared/contracts/database.types.ts`: regenerated from the connected schema;
  compared successfully with a fresh official MCP generation.
- `server/repositories/lms.ts`: request-scoped RLS adapter, bounded reads, safe
  student columns, identity-derived progress/media writes, assessment/grading RPCs.
- `server/services/lms-staging.ts`: default-disabled gate, verified Supabase user
  and active profile required; no existing route calls it.
- `server/integrations/lms-storage.ts`: private authenticated upload/download
  transport with bounded file sizes and overwrite disabled.
- `server/services/user.ts`: verified primary Clerk email required before existing
  email linking or administrator allowlist promotion.
- `scripts/lms.test.cjs`: nine application integration/security regressions.
- `scripts/legacy-migration.cjs` and `.test.cjs`: read-only count inspection,
  repeatable dry-run mappings, duplicate/reference checks, three synthetic tests.
- `scripts/lms-storage-maintenance.cjs`: operator-only, dry-run-first bounded cleanup
  preparation; it was not run with deletion enabled.
- `scripts/lms-load-test.cjs`: opt-in 50/100/200 real-session HTTP workload harness.
- `scripts/lms-http-security.cjs`: four executed anonymous/schema/JWT HTTP checks.
- `supabase/tests/hardening.sql`: 51 rollback-only security/integrity checks.
- `supabase/tests/concurrency.md`: reproducible executed two-session regressions.
- `supabase/checks/20261010-advisor-results.json`: actual final official advisor output.
- `docs/database-architecture.md`, `docs/database-operations.md`,
  `docs/identity-transition.md`, `docs/legacy-data-migration.md`, this report, README,
  `.env.example`, `.gitignore` and npm scripts.

Previously restored Supabase config, seed, six migrations, original authorization
suite, browser/server clients and the Windows filesystem compatibility shim remain
in the workspace. They are not newly claimed implementations from this continuation.
Changes remain uncommitted; no Git push, deployment or production cutover occurred.

## B. Verification actually performed

| Check | Result |
| --- | --- |
| Original SQL authorization suite against actual remote development database | 71 passed, rerun after final migration |
| Additional SQL hardening suite against same database | 51 passed |
| Two competing enrollments into capacity-one synthetic offering | One admitted, one rejected; active count exactly one |
| Two simultaneous start requests by the same student | One attempt, attempt number one |
| Two simultaneous response saves | Exactly one response |
| Two simultaneous submissions | Submitted once; one response automatically awarded 2 points |
| Real HTTP anonymous course/profile requests | 401 / SQLSTATE 42501 |
| Real HTTP private identity schema request | 406 / PGRST106 |
| Real HTTP unsigned JWT with administrator subject | 401 |
| Application tests | 29 passed (17 existing, 12 new) |
| Layer boundary check, TypeScript and lint | Passed; existing lint warnings remain |
| Optimized Next.js production build | Passed; existing Clerk/Edge, Browserslist and exFAT cache warnings remain |
| Legacy database inspection | Read-only model counts succeeded; no personal data printed |
| Migration history/types/schema audit | Eleven migrations match; 19/19 public tables have RLS; zero unsafe search paths; only identity seam directly calls auth.uid |
| Official Supabase security/performance advisors | Executed; details below |

Rollback suites leave no fixtures behind. Committed concurrency fixtures were
new synthetic records only, and cleanup was scoped to their dedicated test offering.
Final original counts were restored: 3 offerings, 3 enrollments, 0 attempts, 7 banned
seed auth users, 0 Storage objects and 0 external identity mappings. No existing
course, student account, academic record or real file was removed.

SQL tests use actual database roles with transaction-local simulated JWT claims.
The HTTP tests prove gateway/public-access boundaries, not signed-in student API
behavior. Storage completion tests use rollback-only object metadata fixtures,
not real uploaded bytes. Real authenticated student HTTP/Storage tests, 50/100/200
workloads, database CPU/RAM measurements and backup restores remain unexecuted:
there are no supplied real development test sessions, and Docker/Postgres client
tools are absent. No production concurrency/latency/resource guarantee is claimed.

## C. Security findings

Addressed: unsupported 512 MiB Free upload configuration; missing upload expiry and
verified owner/MIME/size checks; client-controlled ready/provider INSERT fields;
incomplete submission/lesson file references; cohort-wide start contention;
unbounded persisted responses; scattered UUID identity assumptions; and legacy
unverified-email account linking/admin promotion. Existing cross-tenant RLS,
column-level key protection, immutable exam history and RPC privilege boundaries
were verified rather than weakened.

Final official advisor output has **no ERROR findings**. Security has one WARN:
leaked-password protection disabled. [Supabase documents this as Pro-only](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No upgrade was purchased and no new Supabase password login was added. Keep the
warning visible; revisit authentication protections in the Firebase phase.
Two INFO findings are intentional RLS-without-policies on inaccessible private
tables. Performance has 14 unused-index INFO findings and no WARN/ERROR. Necessary
FK/authorization indexes were retained on this tiny development database.

`npm audit` reports **44 vulnerabilities: 4 critical, 23 high, 15 moderate, 2 low**.
Critical package entries include legacy Next, Clerk, form-data and protobufjs.
No automatic breaking major upgrades were applied. The legacy stack needs a
separate tested upgrade before public launch. This foundation is not a declaration
that the entire existing application is production-ready.

Legacy email-based account recovery still changes external IDs/reset approval and
group associations for recreated accounts; it now requires a verified email but
should become an explicit audited recovery workflow. The legacy global-role/admin
allowlist remains confined to the existing system, not copied into the new model.
Tenant onboarding, signup settings, abuse limits and administrator provisioning
need explicit launch policy; the existing Supabase organization-bootstrap RPC is
not a commercial tenant onboarding/anti-abuse system.

## D. Application integration

All existing student/teacher pages, group workflows, course authoring, progress,
homework, support and uploads still use Clerk, Prisma/legacy PostgreSQL and
UploadThing. Their UI was not redesigned. Only the verified-email security check
changes legacy identity handling.

Supabase now has typed server-side repository/storage implementations and complete
database exam/grading workflows. They are deliberately unactivated in live routes.
The default server flag is `LMS_DATA_BACKEND=legacy`. Enabling staging still requires
a real verified Supabase session; a Clerk session alone fails closed. No Firebase
implementation, new Supabase login flow, service-role student proxy or client-side
privileged credentials were introduced. Operator maintenance credentials are
separate from all application clients and never use NEXT_PUBLIC names.

## E. Remaining work by phase

- **Essential before Firebase:** approve stable profile/Clerk/Firebase mapping,
  tenant ownership and cohort assignments; specify recovery/onboarding policies;
  preserve source snapshots and resolve unsupported legacy model mappings.
- **Firebase integration phase:** safely detach profile auth.users FK/creation
  trigger; configure strict issuer/audience trust; implement verified string-subject
  resolver, provisioning, session adapter, revocation and real-token RLS tests.
  No requirement to create one Supabase Auth account per Firebase user.
- **Frontend hosting migration phase:** adapt runtime/cookies/HTTP transport,
  verify environment exposure and deployment behavior separately. No Vercel or
  Cloudflare configuration changed here.
- **Required before public launch:** remediate legacy dependency vulnerabilities,
  audited recovery/admin provisioning, endpoint size/rate limits, real authenticated
  student/Storage tests, 50/100/200 measurements, backup/restore rehearsal, completed
  dry-run data migration/reconciliation, upload retention scheduling and monitoring.
- **Optional later:** R2 adapter, content revisions, regrading audit, live sessions/
  attendance, invitations/notifications/audit/webhooks and integer-minor-unit commerce.

## F. Migration readiness

The legacy read-only inspection found real records, not an empty database. The
dry-run tool is rerunnable but deliberately cannot import. Approved profile,
organization and group-to-offering maps, an explicit homework/history mapping,
source snapshot/export, migration ledger/checksums, count/FK/file reconciliation,
restore rehearsal and separately authorized cutover are still required.

PostgreSQL content/academic schema and shared data-access ports are reusable on a
self-hosted PostgreSQL/ASP.NET Core backend. Auth.users FK/trigger, JWT helpers,
API roles/RPC transport and Storage policies are still platform dependencies.
They require the documented reviewed identity-context migration, least-privilege
pooled backend role, HTTP repository adapter, file transport and separate file-byte
transfer. TLS, monitoring, patches, encrypted off-site backups and real-host load
tests are operational prerequisites. No server was provisioned or backup restored.

## G. Current cost

The connected Supabase organization is confirmed **Free ($0/month)**. Development
database size is about **13.4 MB**, not a prediction for 2,000 students. Current
[Free limits](https://supabase.com/pricing) include 500 MB database, shared CPU/
500 MB RAM, 1 GB Storage, limited egress and inactivity pauses. A large video
library and high-frequency exam/progress writes can exceed these limits quickly.

No purchases, upgrades, paid services or new recurring jobs were introduced.
Existing Clerk, legacy DB hosting, UploadThing, Mux, LiveKit and Resend references
remain; their billing plans were not verified, so the complete legacy deployment
cannot be certified as $0/month. Independent backups and capacity measurements
remain necessary even at this initial scale.
