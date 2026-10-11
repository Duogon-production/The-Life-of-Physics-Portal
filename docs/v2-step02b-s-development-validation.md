# Step 02B-S development validation

Date: 2026-10-11. Target: `gmvouqgjbtbkbhrdruzu` (the owner-approved development
project, healthy PostgreSQL 17). Branch: `codex/v2-step02b-s-org-security`.
HEAD remains `3d73c49c826dd71bd8fa3399ee72f8caab2bcb22`; all changes are uncommitted.
No production, deployment, push, merge or Step 02C work was performed.

## Applied migration

Applied only `restrict_organization_creation` through the official Supabase MCP.
The MCP assigned version `20261011184623`; the local migration was renamed from
its preparation timestamp `20261011183529` to match recorded history. SQL unchanged.

File: `supabase/migrations/20261011184623_restrict_organization_creation.sql`.

```sql
revoke execute on function public.create_organization(text, text)
  from public, anon, authenticated;

revoke execute on function private.create_organization(text, text)
  from public, anon, authenticated;
```

Preflight confirmed the exact project, the original 16 migration versions/names,
reviewed public invoker/private definer definitions, postgres ownership, fixed
empty search_path, effective privileges and absence of an organization INSERT
grant for authenticated. All 19 public tables retained RLS. Recorded migration
statements equal the two approved revokes; history now contains exactly 17 entries,
with no canceled legacy ledger. No other migration was applied.

## Effective EXECUTE privileges

| Role | Public before | Public after | Private before | Private after |
| --- | --- | --- | --- | --- |
| anon | denied | denied | denied | denied |
| authenticated | allowed | denied | allowed | denied |
| service_role | allowed | allowed | denied | denied |
| postgres | allowed | allowed | allowed | allowed |

Both exact signatures end in `(text,text)`. Tenant students, teachers, admins and
owners all use authenticated and cannot create organizations through either layer.
Existing service_role table privileges remain; the public invoker wrapper alone
does not give service_role access to the private function. Trusted provisioning
uses an authorized postgres transaction, not a new browser credential or role.

## SQL regression results

All eight executions completed without SQL errors and ended in ROLLBACK:

| Suite | Result |
| --- | --- |
| `organization-provisioning.sql` | PASS: both-function denial for anonymous/student/teacher/admin/owner, blocked direct inserts/self-owner assignment, atomic trusted provisioning, failed-owner FK rollback, retained course operations, tenant isolation, last-owner protection. |
| `teacher-editor.sql` | PASS: trusted organization fixtures; course creation/ownership, editing/publication, contextual access, suspension and cross-tenant denial. |
| `firebase-identity.sql` | PASS: issuer/subject resolution, profile onboarding/idempotency, tenant access, private-data and answer-key denial, identity disable/revocation and invalid-claim rejection. |
| `authorization.sql` | PASS: native identity RLS, student isolation, contextual staff access, assessment restrictions and new organization-RPC denials. |
| `hardening.sql` | PASS: existing media, assessment/grading and identity hardening assertions. |
| Generated Firebase authorization variant | PASS: same authorization coverage using Firebase string subjects. |
| Generated Firebase hardening variant | PASS: same hardening coverage using Firebase string subjects. |
| `organization-owner-cascade.sql` | PASS: last-owner deletion/demotion/suspension denial and synthetic parent-cascade behavior. |

Each execution appended a read-only completion SELECT after the suite's ROLLBACK,
so the MCP's final-result response confirms the entire preceding script completed.
The suites' internal assertions raise exceptions on failure. Detailed assertion
counts are not claimed because the MCP returns only the final result set.

Synthetic safety: preflight verified the seven seeded auth users are dormant,
passwordless, banned accounts with example.invalid addresses and the two seed
organizations match expected demo slugs. New organization/editor fixtures use
random subjects/UUIDs. Existing seed-only operations remain transactional. No real
account, tenant or academic record was selected as a mutation target.

Privileged queries inside the organization suite verify rejected calls created no
rows, the failed provisioning left no orphan, tenant B actually exists and stayed
unchanged, and authorized teacher edits persisted within the test transaction.
After all rollbacks, captured counts and all schema/grant/policy/function metadata
exactly matched the immediate post-migration baseline:
8 profiles, 8 external identities, 2 organizations, 5 memberships and 2 courses.
No synthetic organization/editor identity survived the transactions.

## Narrow local fixture corrections

Before testing, `firebase-identity.sql` and `scripts/firebase-sql-suite.cjs` were
restricted from mapping every public profile to mapping only the seven verified
dormant synthetic seed identities. The identity suite's new test subject is random,
and its disable UPDATE now matches both issuer and exact generated subject.
These prevent a rollback test from touching a real account even transiently.
No application authorization, schema or unrelated permission change was needed.

## Application verification

`npm run check` after application: PASS, 72 application tests, architecture boundary
checks, TypeScript and ESLint. Seven existing frontend warnings remain.
Post-application `npm run build`: PASS in both Firebase/Supabase staging mode and
Clerk/legacy fallback mode. Existing ESLint and Tailwind ambiguous-utility warnings
remain. Build selectors were process-local only; no environment file or production
authentication setting was edited. Foundation hash, 13-file scope, credential-pattern,
Git-ignore and `git diff --check` verification also passed. Detailed logs and the
before/after verification summary are preserved in ignored `.local/step02b-s`.

No new real-token browser sign-in or concurrent multi-session test was run in this
slice. SQL gateway claims are simulated; they do not verify Firebase signatures.
Existing application Firebase tests passed as part of the 72-test suite. The manual
committing provisioning script was reviewed but not executed; its atomic operations
and rollback failure case were exercised through the synthetic SQL suite.

## Preserved behavior and advisors

Pre/post metadata comparisons show identical tenant policies, RLS flags, table and
column grants, triggers, all function bodies/owners, and unrelated function ACLs.
Only authenticated EXECUTE on the two organization functions changed. The 16
foundation migration contents remain unchanged. Frontend, Firebase session code,
teacher runtime code and existing feature branches were not edited.

Security/performance advisor findings match the pre-application baseline; no new
findings were introduced. No unrelated advisor remediation was applied:

- Existing WARN: Supabase native Auth leaked-password protection is disabled.
  This setting does not govern Firebase passwords; changing either authentication
  configuration needs separate review. [Remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Two existing INFO notices: RLS without policies on private answer keys and
  external identities. These are intentionally deny-by-default private tables,
  accessed through reviewed privileged helpers. [Explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Six existing INFO notices: unused indexes. Retain them; a development usage
  snapshot is insufficient justification for dropping authorization/query indexes.
  [Guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Complete changed-file list

New files:

1. `supabase/migrations/20261011184623_restrict_organization_creation.sql`
2. `supabase/tests/organization-provisioning.sql`
3. `supabase/manual/provision_organization.sql`
4. `docs/organization-provisioning.md`
5. `docs/v2-step02b-s-organization-security-proposal.md`
6. `docs/v2-step02b-s-validation.md`
7. `docs/v2-step02b-s-development-validation.md`

Updated files:

8. `supabase/tests/authorization.sql`
9. `supabase/tests/teacher-editor.sql`
10. `supabase/tests/firebase-identity.sql`
11. `scripts/firebase-sql-suite.cjs`
12. `docs/database-architecture.md`
13. `docs/new-lms-phase2.md`

Local logs, generated Firebase SQL and verification evidence remain Git-ignored
under `.local`. No secret, environment file or local artifact is added to Git.

## Recovery and remaining risks

The security migration was not reverted. Retain its two denials. If recovery is
explicitly approved later, use a new forward migration to restore only the reviewed
authenticated grants; that reopens the known vulnerability. No data reset is needed.

Trusted database administrators/service credentials retain powerful capabilities
and require protected operational access. Manual provisioning needs explicit tenant
and owner approval; an automated staff operator workflow is outside this slice.
All production project states are untouched and unverified by this development run.
Existing advisor notices and untested real-browser/concurrency scenarios remain as
described above. Stop for owner review before committing, merging, pushing or Step 02C.
