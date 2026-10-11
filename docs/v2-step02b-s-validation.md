# Step 02B-S preparation and local validation

> Historical pre-application report. Migration 17 has since been applied to
> development with separate approval; see
> [development verification](v2-step02b-s-development-validation.md).

Date: 2026-10-11. Branch: `codex/v2-step02b-s-org-security`.
At this historical preparation checkpoint, HEAD was
`3d73c49c826dd71bd8fa3399ee72f8caab2bcb22` and changes were uncommitted.
They were subsequently committed as `8b578ca5e10dcb389eeb403df20df1e0c1fcf419`
and pushed in PR #1 after successful approved development application/testing.
No connected-database SQL, migration application, provisioning, deployment,
merge or push was performed during this preparation turn.

## Final migration 17

File: `supabase/migrations/20261011184623_restrict_organization_creation.sql`.
Generated with `npx --yes supabase@2.81.3 migration new restrict_organization_creation`.
Executable SQL (the file also contains explanatory comments):

```sql
revoke execute on function public.create_organization(text, text)
  from public, anon, authenticated;

revoke execute on function private.create_organization(text, text)
  from public, anon, authenticated;
```

This preserves function bodies/ownership, service_role privileges, table/column
grants, policies, RLS flags, triggers and existing data. The only intended database
behavior change is denial of self-service organization creation through both
function layers, including for contextual tenant owners/admins/teachers.

## Complete review-file list

New files:

- `supabase/migrations/20261011184623_restrict_organization_creation.sql`
- `supabase/tests/organization-provisioning.sql`
- `supabase/manual/provision_organization.sql`
- `docs/organization-provisioning.md`
- `docs/v2-step02b-s-organization-security-proposal.md` (retained reviewed proposal)
- `docs/v2-step02b-s-validation.md` (this report)

Updated files:

- `supabase/tests/authorization.sql`
- `supabase/tests/teacher-editor.sql`
- `docs/database-architecture.md`
- `docs/new-lms-phase2.md`

The previously untracked proposal SQL was promoted into migration 17 and removed
from `supabase/proposals`. Generated logs/Firebase SQL variants remain ignored in
`.local/step02b-s` and `.local`. No package, lockfile, environment, auth, UI or
application runtime file is changed.

## Local results

- `npm run check`: PASS. 72 application tests passed; architecture boundaries,
  TypeScript and ESLint passed. Seven warnings remain in unchanged frontend files
  (image optimization and an existing hook dependency).
- Firebase/Supabase staging-mode `npm run build`: PASS. Environment selectors
  were set only inside the build process shell; no environment file was edited.
- Clerk/legacy fallback-mode `npm run build`: PASS. Both builds retain existing
  ESLint and Tailwind ambiguous-utility warnings; no new runtime files were changed.
- `node scripts/firebase-sql-suite.cjs`: PASS, regenerated both ignored SQL variants;
  this is rendering, not execution against PostgreSQL.
- Foundation preservation: all 16 migration Git content hashes match approved
  base; 17 migration files now exist locally, canceled legacy ledger absent.
  Git line-ending normalization was respected when comparing working files.
- Exact migration scope: PASS; after comments/whitespace are removed, executable
  text equals the reviewed two revokes, with no other statements.
- `git diff --check`: PASS.

**Not executed:** PostgreSQL rollback suites, manual provisioning script, migration
application, API tests requiring a live database, and Supabase advisors. No local
Docker, PostgreSQL server or psql executable is available; connected development
mutation is explicitly outside current authorization. SQL assertions are prepared
but must not be represented as passing database authorization tests. The connected
database still had the previously confirmed RPC vulnerability at this preparation
checkpoint. The later authorized development application closed it, as recorded
in `v2-step02b-s-development-validation.md`.

## Prepared database regression coverage

The standalone organization suite uses random synthetic Firebase subjects and
profiles, real anon/authenticated role switching and a transaction ending in
ROLLBACK. It verifies both function privileges/call denials, no rows from rejected
calls, trusted atomic organization/owner creation, failed owner-FK rollback, owner
and assigned-teacher course operations, cross-tenant read/write/membership denial,
student content-edit denial and existing last-owner protection. Privileged final
reads confirm tenant B exists and is unchanged, avoiding vacuous RLS assertions.

The old authorization suite now expects student denial rather than self-service
bootstrap. The teacher editor suite uses atomic postgres organization/owner fixture
setup and retains its original course permissions/publication/suspension tests.
Claims in SQL suites are simulated; Firebase signature validation remains an
application-authentication responsibility covered by existing application tests.

## Trusted provisioning and recovery

The manual psql script requires postgres and an independently verified existing
active owner UUID. It locks that profile, creates the organization and initial
active owner in one transaction, and commits once. Missing/invalid ownership,
constraint or membership errors abort provisioning. It contains no credentials,
email matching, account creation, destructive statements or upserts. It has not run.

Recovery details and commands are in `organization-provisioning.md`. Capture the
two ACLs before applying. If the migration transaction fails, roll it back. If an
authorized committed recovery is necessary, create a new forward migration granting
authenticated EXECUTE on exactly the same two signatures. Do not grant PUBLIC/anon
or modify service_role. Restoring those grants reopens the known vulnerability;
prefer keeping the security fix and correcting trusted provisioning instead.

## Historical next approval — subsequently granted and completed

The preparation report requested authorization to apply **only migration 17** to the connected Supabase
development project and execute the synthetic rollback regression suites there.
First recheck live history/ACLs for drift; then verify changed privileges, unchanged
tenant policies, retained teacher operations and advisor findings. A successful
development verification is required before calling the database fix validated.
That authorization was subsequently granted and development verification passed.
These were the historical execution boundaries, not an outstanding approval request.
