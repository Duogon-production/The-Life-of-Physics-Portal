# Firebase authentication staging integration

The report below describes the earlier authentication-only phase. The subsequent
[Phase 1 website integration](phase1-website-integration.md) restores the original
LMS pages, replaces the isolated `/lms-staging` destination, and records updated
real authenticated acceptance checks and the additive fourteenth migration.

Implementation and verification report, 10 October 2026. Development branch:
`codex/firebase-auth-integration`. Clerk remains the default. No push, deployment,
production account cutover, paid infrastructure, provider removal or academic
data import was performed.

## A. Firebase integration

The modular Firebase 13 web SDK initializes lazily and idempotently. The staging
provider restores browser-local persistence, observes ID token changes, renews
the server credential after refresh and page visibility changes, and exposes
account/loading/error/logout state. Email/password registration and login,
Google popup with redirect fallback, password reset, verification email resend,
verified-email refresh and account controls are implemented. Passwords are sent
to Firebase, never the LMS backend. Registration requires at least 12 characters
in the UI; configure the provider password policy separately for enforcement.

Files:

- `shared/auth-config.ts`: explicit backend flag and public Firebase configuration.
- `frontend/lib/firebase.ts`: initialization, persistence and state restoration.
- `frontend/components/providers/firebase-auth-provider.tsx`: token/session lifecycle.
- `frontend/features/auth/firebase-form.tsx`: branded login/registration/recovery UI.
- `frontend/features/auth/firebase-account.tsx`: account and logout control.
- `app/layout.tsx`, existing sign-in/sign-up pages and `middleware.ts`: select the
  backend without changing the default Clerk UI. Root rendering is explicitly
  dynamic under both backends.
- `app/lms-staging/page.tsx`: protected server-rendered organization/course/offering
  reads through the existing typed repository and the caller's RLS identity.

The complete retained Clerk/native dependency file list is recorded in
`docs/auth-dependency-inventory.md`. Supabase browser/server adapters, staging
repository validation, generated database types, local Supabase Firebase config,
secret-file exclusions, package versions, boundary checks, tests and database
operations/architecture documentation were updated alongside those entry points.

Firebase staging routes all legacy dashboard/course/admin/group pages to this
isolated screen and returns 503 for legacy API/UploadThing workflows. This is
intentional: their Clerk/Prisma authorization must not consume Firebase UIDs.
Clerk components/hooks in those legacy screens remain intact for rollback.
The staging view is read-only; it does not pretend that teaching, assessments,
uploads, attendance, payments or legacy course playback have been migrated.

## B. Supabase integration

Two new version-controlled migrations were applied through the official MCP:

1. `20261010123515_firebase_identity_resolution.sql` removes only the profile's
   FK to `auth.users`, preserving every profile UUID and downstream academic FK.
   Existing native users receive private issuer/subject mappings. The native
   creation trigger maintains that mapping; native account deletion disables its
   mapping and preserves academic history instead of cascading profile deletion.
   Firebase users do not need a synthetic Supabase Auth account.
2. `20261010124048_private_firebase_provisioning.sql` moves privileged onboarding
   and revocation logic into private functions behind invoker API wrappers.

The original eleven migrations are unchanged. There are still 19 public tables,
all with RLS, plus the existing private registry/answer-key tables. No auth.users
columns were altered. No legacy table was touched. Types were regenerated from
the connected development schema in `shared/contracts/database.types.ts`.

`private.current_app_user_id()` now resolves the gateway-verified `(iss,sub)` to
an active UUID profile. Firebase tokens must have the exact diagonproduction
issuer/audience, authenticated API role, verified email and authentication time
newer than the mapping's revocation boundary. Native Supabase tokens must have
the exact connected project's issuer and authenticated audience. Unknown,
disabled, suspended, foreign-project and UUID-shaped spoof subjects fail closed.
Mappings never derive from email, user metadata roles or a supplied profile UUID.

`onboard_firebase_profile()` has no arguments. It transaction-locks the verified
issuer/subject, returns an existing active mapping, or creates one new empty
profile with a random UUID. It creates no membership, enrollment or staff role.
Concurrent initial calls serialize across backend instances using a PostgreSQL
advisory transaction lock and the registry's unique issuer/subject constraint.

Restrictive policies require an active resolved identity on every public table
and on the two LMS Storage buckets. Existing permissive contextual policies and
assessment RPCs still determine permissions. Storage's raw `owner_id` remains
the Firebase subject; media uploader/academic foreign keys remain profile UUIDs.
Both native and Firebase-subject versions of the complete existing SQL suites
pass, including ownership checks. Private buckets remain private.

The browser and request-scoped server Supabase clients use the public publishable
key and `accessToken` callback with the actual Firebase ID token. No service-role
proxy or Supabase authentication-cookie impersonation is used. Existing native
Supabase client behavior remains available when Firebase staging is disabled.

## C. Authentication security

`server/integrations/firebase-admin.ts` initializes the trusted Node Admin SDK
with ADC or owner-configured server-only service-account credentials. It rejects
emulator configuration. `server/services/firebase-auth.ts` verifies ID tokens
with revocation checking enabled, checks issuer/audience/expiry/subject, and
provisions exactly `role: authenticated` while preserving existing custom claims.
Conflicting API roles and disabled users fail closed. This API role confers no
teacher/admin permissions; PostgreSQL membership data is authoritative.

Provisioning is idempotent for both new and existing Firebase accounts. Parallel
requests for the same UID coalesce within a process. Firebase's custom-claims API
is read/replace, without compare-and-swap: all other claim writers must coordinate
with this writer before introducing independent claim updates or multiple custom
claim management services. The browser forces token refresh after provisioning.
Failures surface as retryable sign-in errors and never mint an LMS session.

`server/http/firebase/route.ts`, exposed by thin Node-runtime adapters under
`app/api/auth/firebase/{provision,session,logout}/route.ts`, accepts tokens rather
than client-selected identities or roles. Every mutation validates the exact
Origin against `APP_ORIGIN`; missing origin, foreign origin and cross-site fetch
are denied. Production without APP_ORIGIN fails closed. Bodies are stream-bounded
to 18 KB, and session tokens are bounded to 3,800 characters for cookie safety.

The server cookie contains a **real Firebase ID token**, not a Firebase session
cookie. In production it is Secure, HttpOnly, SameSite=Strict, Path=/ and uses a
`__Host-` name without Domain. It expires no later than the token, at most one hour.
The browser Firebase SDK retains the refresh credential through its own persistence
and renews the server cookie; the backend never stores a refresh token in that
cookie. Sensitive server access re-verifies revocation, then RLS resolves the UUID.
Interactive browser compromise can access Firebase browser credentials; HttpOnly
protects the server cookie, not Firebase's browser persistence. Continue existing
XSS protections and avoid injecting untrusted HTML.

Logout invalidates the verified subject's older authentication times in the
private registry before revoking Firebase refresh tokens, then clears the cookie
and signs out the browser. This signs out that Firebase identity across devices.
The registry boundary prevents an old JWT from continuing direct Supabase access
after this application's successful logout. External Firebase Admin revocation
or account disabling alone does not notify PostgreSQL: already issued tokens can
remain valid at Supabase until expiry unless the operator also disables/invalidates
the registry mapping. Use both systems for urgent account suspension. No paid
revocation webhook or Cloud Function was introduced.

Private Firebase Admin credentials were **not available** in this workspace.
Production-path revocation verification, custom claim assignment and the full
server-cookie handshake therefore have not been verified against a real user.
Unit tests substitute the Admin SDK and test the boundary independently.

## D. Legacy migration and preservation

Read-only Prisma inspection found 7 users, 4 courses, 8 chapters, 2 attachments,
4 UserProgress rows, 2 groups, 4 group memberships, 1 submission, 2 support tickets
and 1 personalization record. Remaining inspected models were empty. Existing
Clerk accounts, Prisma records, UploadThing files and ownership/history were kept.

`npm run db:auth-plan` creates an ignored `.local/auth-migration-plan-*.json`
containing the seven Clerk subjects, proposed profile IDs equal to their existing
legacy UUIDs, unresolved Firebase subjects, required identity evidence and hashes
of every inspected model's records. Two reports were generated and their record
fingerprints compared. It performs a read-only transaction and has no apply mode.
`scripts/legacy-migration.cjs` still provides the broader dry-run content/cohort
mapping plan; it now exports its model inventory for reuse.

No existing user was migrated, linked or assigned new privileges. All seven
Supabase demo profiles/native identity mappings remain separate from the seven
legacy users. The private registry currently has **zero Firebase mappings**;
rollback SQL fixtures were not persisted. New Firebase onboarding creates an
empty account and cannot automatically claim legacy courses or administrator roles.

Before linking an existing user, require either a verified provider export tied
to the existing immutable Clerk subject or fresh authenticated proof of both the
old Clerk identity and the target Firebase identity. An approved operator links
that subject to the reviewed stable UUID. Matching verified emails alone is not
sufficient. Collisions and previously onboarded empty profiles require explicit
review; never overwrite another subject's mapping.

Firebase supports selected password-hash imports including bcrypt. Actual Clerk
hash export availability, algorithm and parameters have not been established for
this instance, so password compatibility is **not asserted**. Request a supported
provider export and test import on disposable development users first. If that
is unavailable or incompatible, use an approved account-claim process followed
by a Firebase password-reset flow. For Google users, preserve provider subjects
from verified export or dual-login evidence; do not merge by Google email alone.
No export containing passwords/hashes was requested or generated.

## E. Verification

Executed successfully:

- Existing application suite: 35 tests, including Clerk middleware, legacy API
  identity handling, async route params, upload permissions and security mitigations.
- Firebase boundary suite: 10 tests covering project/expiry/UID validation,
  revocation-check requests, concurrent claim coalescing, preserved claims,
  privileged-role rejection, disabled users, staging route isolation, CSRF,
  request limits, cookie settings, verified-email gating, token forwarding and logout.
- TypeScript, architecture boundaries and ESLint: no errors; eight pre-existing
  warnings remain in legacy admin UI. Browser boundary checks now reject Firebase Admin.
- Production builds in default Clerk mode and explicit Firebase staging mode.
- Default Clerk production runtime: 10 existing smoke checks passed.
- Supabase real anonymous/forged-token HTTP suite: 4 checks passed.
- A temporary **real Firebase password account** passed six checks: registration,
  login, refresh-token exchange, signature/issuer/audience/expiry validation
  (without Admin revocation lookup), forged-signature rejection, and a Supabase
  permission denial with code 42501 when the authenticated claim was absent.
  The latter confirms the connected Firebase issuer is recognized, but does not
  prove tenant authorization with the required claim. The temporary account was
  deleted using its own token; no test password or token was logged or persisted.
- SQL authorization 71 + hardening 51 checks passed with native mappings.
- Both existing suites also passed with Firebase string-subject fixtures:
  another 71 + 51 checks. Render with `npm run db:firebase-sql`; generated rollback
  SQL lives in `.local/`. These are simulated gateway claims, not real-token tests.
- `supabase/tests/firebase-identity.sql`: 34 additional rollback checks passed.
- Supabase security/performance advisors were run. No new security WARN/ERROR
  remains after migration 13. Existing findings: disabled Supabase leaked-password
  protection, intentional deny-all private tables and unused indexes in a small
  development database. No plan upgrade was made to remove the paid-setting warning.
- Dependency audit: 0 critical, 7 high, 2 low, unchanged from the prior baseline.
  Existing unpatched braces/Quill limitations and mitigations remain documented
  in `docs/dependency-security-report.md`. New Firebase gRPC transitive vulnerabilities
  were fixed with the exact patched 1.14.6 override.

Not executed or not proven:

- Real Google popup/redirect, verification/reset email delivery, browser persistence
  and restore, verified real-user session-cookie creation, revocation and logout.
- Full positive/cross-tenant HTTP access using real privileged/verified Firebase
  development accounts. `npm run test:firebase-tenant` reports blocked until an
  ignored `.local/firebase-http-identities.json` contains the approved fixtures.
- First-ever onboarding concurrency under real signed tokens, real-token assessment
  writes/concurrency and Storage upload/download transfers. SQL concurrency safety
  is designed and idempotency tested; that is not a real HTTP concurrency result.
- Local Firebase staging runtime: automatic approval review rejected starting the
  server with only “blocked by policy”. Build and unit results are not substitutes
  for that runtime check.
- A full import/reconciliation, 50/100/200 authenticated load test or production cutover.

## F. Owner setup and acceptance

1. Keep `NEXT_PUBLIC_AUTH_BACKEND=clerk` and `LMS_DATA_BACKEND=legacy` for normal use.
   Firebase public Web config is provided in `.env.example`; public Firebase
   values were also added to the ignored local `.env.local`, without changing flags.
2. Configure trusted Admin access **outside the repository**. Prefer workload
   identity/ADC; locally GOOGLE_APPLICATION_CREDENTIALS can point to a protected
   owner-managed service-account file outside this repo. Alternatively set
   FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in a trusted server secrets
   store. Both must belong to diagonproduction and have the necessary Firebase
   Authentication administration permission. Never use NEXT_PUBLIC_ for them,
   put them in Git, or paste them into chat. No key was generated by this work.
3. On a separate local staging process set NEXT_PUBLIC_AUTH_BACKEND=firebase-staging,
   LMS_DATA_BACKEND=supabase-staging and APP_ORIGIN to the exact browser origin.
   Rebuild after changing public flags. Use `http://localhost:3000` with npm run dev;
   use HTTPS to verify production Secure __Host cookie behavior. Localhost browser
   exceptions vary and are not a substitute for testing the HTTPS staging origin.
   Do not disable Secure cookies to make a production-mode test pass.
4. Confirm localhost and the intended staging host are authorized Firebase domains,
   configure email templates/password policy and Google redirect hosting according
   to Firebase's guidance. Redirect mode can need a same-origin auth handler or
   supported custom auth domain where browsers block third-party storage; current
   Firebase authDomain is preserved and that hosting configuration is unverified.
5. Provision seven authenticated development identities (owner A, teacher A,
   student A, teacher B, student B, multi-role, suspended) plus anonymous access.
   Use the trusted provisioning endpoint to assign only the authenticated API role.
   Approve private identity-to-synthetic-profile mappings and contextual fixture
   permissions separately. Never assign production roles from client form values.
6. Run real tenant HTTP tests. The private manifest is an array of objects with
   `label`, `refreshToken`, `profileId`, `allowedCourseIds`, `allowedProfileIds`,
   `canGradeA`. Exact labels appear in the blocked command output. Store no tokens
   in tracked files. The runner refreshes real Firebase tokens and checks UUID
   mapping, course/profile visibility, answer-key denial, grader access, repeated
   onboarding and student privacy. It intentionally lists its remaining test gaps.
7. Complete browser and real server-session tests, revocation/disable propagation,
   token expiry, Google, verification, reset, storage transfers and assessment
   mutation/concurrency tests. Re-run existing suites and advisor checks.
8. Approve legacy account/content/cohort assignments, backup/restore rehearsal and
   importer separately. Compare fingerprints and semantic counts/history before
   activating any migrated workflow. Changing an existing private identity mapping,
   resolving collisions or linking legacy staff requires reviewed operator evidence.
9. Obtain explicit production cutover approval only after acceptance, load testing,
   reconciliation and rollback rehearsal. Rollback the application by restoring
   Clerk/legacy flags and rebuilding. Additive schema can remain; do not drop
   historical profiles/mappings as a rollback shortcut.

Firebase Admin requires a trusted Node backend, not Edge middleware. The integration
does not deploy Cloud Functions, require Blaze, upgrade Supabase or change Vercel.
For future Cloudflare hosting, keep browser Firebase on the web tier and run Admin
verification/provisioning on a compatible trusted Node service, or port those APIs
to ASP.NET Core on Hetzner. A Workers-only migration needs a reviewed verifier and
trusted provisioning service; merely importing firebase-admin into Workers is not
an approved deployment plan. Stable UUID mapping and relational authorization can
survive a future PostgreSQL transport change; port the trusted issuer/JWT context,
RLS and object ownership semantics with security tests.

## G. Readiness

| Stage | Status |
| --- | --- |
| Staging authentication and UUID/RLS integration code | Implemented |
| Real Firebase password authentication and token refresh | Tested |
| Real Google/browser/server session/custom claims/revocation | Not verified; configuration/acceptance required |
| PostgreSQL RLS with native and simulated Firebase identities | Passed |
| Supabase positive tenant RLS with real claimed Firebase identities | Blocked |
| Existing Clerk users and academic data migrated | No; preserved unchanged |
| Full website migrated / production cutover ready | No |

## Primary references

- [Supabase official Firebase third-party authentication](https://supabase.com/docs/guides/auth/third-party/firebase-auth)
- [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firebase session management and revocation](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Firebase session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies) — the implementation deliberately uses ID tokens, not these cookies.
- [Firebase user/password hash import](https://firebase.google.com/docs/auth/admin/import-users)
- [Firebase redirect sign-in best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- [Clerk migration overview](https://clerk.com/docs/guides/development/migrating/overview)
