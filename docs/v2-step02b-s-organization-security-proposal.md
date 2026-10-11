# Step 02B-S: organization creation security — reviewed proposal

Development application and eight rollback regression suites have now succeeded
under separate owner approval. See `v2-step02b-s-development-validation.md` for
current status. The preparation and approval text below is retained as history.

The owner approved preparation and local validation of this proposal. The exact
two revokes are now migration 17,
`supabase/migrations/20261011184623_restrict_organization_creation.sql`.
The regression suite and fixture updates are implemented. **Application to the
connected development database still requires separate authorization.** The
remainder records the reviewed proposal and test scope; actual validation results
are recorded in `v2-step02b-s-validation.md`.

Reviewed on 2026-10-11 against commit
`3d73c49c826dd71bd8fa3399ee72f8caab2bcb22`, on isolated branch
`codex/v2-step02b-s-org-security`. No database changes or fixture writes have been
performed. This document is a proposal, not a claim that the vulnerability is fixed.

## Findings

Read-only inspection at proposal time of development project
`gmvouqgjbtbkbhrdruzu` confirmed the 16 foundation migrations were applied and the
canceled legacy ledger was absent. Migration 17 remains local and unapplied.

| Entry point | Current behavior |
| --- | --- |
| `/onboarding/organization` | Returns not found; student onboarding is disabled. |
| `POST /api/teacher/organizations` | Returns 403 through `managedOrganizationPOST`. |
| Retained teacher handler/repository | Still contains an organization RPC call, but the HTTP route does not dispatch to it. |
| `public.create_organization(text,text)` | SQL SECURITY INVOKER wrapper; EXECUTE granted to authenticated, service_role and postgres. |
| `private.create_organization(text,text)` | SECURITY DEFINER owned by postgres; EXECUTE granted to authenticated and postgres. Checks active identity, then inserts organization and active owner membership. |
| Direct organization INSERT | Authenticated and anon have no INSERT privilege. No permissive INSERT policy exists. |
| Organization membership INSERT | Requires existing contextual owner, or contextual admin assigning a non-owner role. |

Both functions have fixed empty search_path. That protects name resolution, but
does not authorize organization creation. An active Firebase identity resolves to
an application profile and can currently call the public RPC as authenticated.
RLS cannot stop inserts performed under the definer's privileged owner identity.

The live `trusted_identity` policies are RESTRICTIVE; they do not grant organization
insertion or bypass contextual membership policies. The function-source inspection
found only the public wrapper referencing `create_organization`; repository search
found no separate automated staff provisioning endpoint.

The private function's service_role EXECUTE privilege is currently false. Thus the
public wrapper's existing service_role grant is not itself a working service-role
provisioning flow. We must not claim this proposal adds one.

## Proposed migration 17

Review the exact SQL in
`supabase/migrations/20261011184623_restrict_organization_creation.sql`:

```sql
revoke execute on function public.create_organization(text, text)
  from public, anon, authenticated;

revoke execute on function private.create_organization(text, text)
  from public, anon, authenticated;
```

This is additive permission hardening: retain both function definitions, existing
data, all 16 migrations, tenant RLS, triggers, Firebase identity resolution and
teacher course operations. Tenant owners/admins/teachers also use authenticated;
they therefore lose self-service creation of additional organizations, as required
by the managed-platform model. Their permissions inside existing tenants remain.

No new global profile role, operator table, secret, default privilege change or
service-role grant is introduced. Existing explicit privileged grants remain.
Revoke both layers so a caller cannot bypass the public wrapper through SQL or a
future private-schema exposure. PUBLIC is included to prevent implicit execution.

The original draft was outside the migration runner pending preparation approval.
It has now been promoted using `supabase migration new` with CLI 2.81.3 via npx.
No project dependency or lockfile was changed. The migration is now discoverable
by the runner: **do not run db push/migration up against connected development
until database application is separately approved**.

## Trusted provisioning boundary

For this slice, EduLabs staff use an authorized database administration connection
(`postgres`) to insert the organization and first active owner membership in one
transaction. Identify the existing active profile UUID through a separately
verified Firebase issuer/subject relationship; never infer ownership from email
alone or accept a browser-supplied owner assertion. Set organization.created_by
according to the reviewed provisioning action, and joined_at explicitly.

An existing profile is required. Staff should validate that the profile is active
and that a valid owner membership exists before committing. Membership-insert
failure must roll back the organization insert; there must be no intermediate
commit. Existing foreign keys and last-owner protection remain authoritative.
The last-owner trigger prevents removal of an existing last owner; it does not
automatically require an initial owner for every privileged organization INSERT.

Trusted postgres and existing service_role table privileges are unchanged. No
service-role credential is added to the browser or new application route. This is
manual trusted provisioning, not an operator management UI. A future automated
staff workflow needs separate approval and explicit platform authorization.

## Regression test plan — execute only after approval

Add a standalone `supabase/tests/organization-provisioning.sql` rollback suite.
Run as the authorized development administrator; create random, synthetic
Firebase subject/profile fixtures through the existing onboarding mechanism,
then provision two organizations using the trusted transaction path. Use actual
`SET LOCAL ROLE authenticated`/`anon` with simulated gateway claims. These tests
exercise PostgreSQL authorization, not Firebase signature validation. Do not use
real customer identities, tokens, passwords or existing tenant records.

| Test | Required result |
| --- | --- |
| Privilege inspection of both signatures | anon/authenticated EXECUTE false, postgres true; service_role grants unchanged. |
| Active ordinary student calls public RPC | SQLSTATE 42501; no organization or owner membership created. |
| Same student calls private implementation | SQLSTATE 42501; no rows created. |
| Tenant owner, admin and teacher call either function | Denied; contextual roles cannot act as platform operators. |
| Anonymous calls either function | Denied. |
| Student directly inserts organization | SQLSTATE 42501. |
| Student inserts self as owner into existing tenant | SQLSTATE 42501. |
| Trusted postgres provisions organization plus existing owner | Both rows exist atomically with the intended owner UUID. |
| Invalid owner FK in provisioning subtransaction | Error; no orphan organization survives the subtransaction. |
| Existing owner creates course and edits own organization | Authorized, with affected-row and persisted-value assertions. |
| Assigned teacher creates/edits own tenant course | Existing course owner assignment and edit authorization still work. |
| Owner/admin/teacher of A reads private B data | No B organization, membership or private course rows visible. |
| A owner attempts B membership insertion / course creation | SQLSTATE 42501. |
| A owner attempts B organization/course updates | Zero rows affected; privileged verification confirms B unchanged. |
| Student attempts tenant content edits | Denied/zero affected rows as appropriate; contents unchanged. |
| Removing the existing last active owner | Existing SQLSTATE 23514 protection remains. |

Snapshot fixture row counts before denied calls and verify afterwards as postgres
to avoid mistaking RLS-hidden rows for absence. Verify B fixtures really exist as
postgres before testing isolation. Roll back the entire suite, including identities,
organizations, memberships and courses; do not delete or reset unrelated data.
Test any unexpected inherited grants using has_function_privilege, not ACL text alone.

Update existing tests that intentionally expect the old self-service model:

- `supabase/tests/authorization.sql`: replace successful student organization
  bootstrap and contextual-owner assertions with permission-denial assertions.
- `supabase/tests/teacher-editor.sql`: replace the two authenticated organization
  bootstrap calls with trusted postgres fixture setup. Retain teacher editing,
  cross-tenant, suspended-account, publication and anonymous coverage.
- Re-render Firebase variants with `scripts/firebase-sql-suite.cjs` after updating
  authorization tests. It generates files only; running it is not a database test.
- Keep `scripts/student-portal.test.cjs` checks for hidden onboarding and the 403
  HTTP endpoint. Update architecture documentation that still describes self-service
  organization creation; retain historical Phase 2 context clearly labeled.

After approved application: run these rollback suites plus existing identity,
hardening and owner-cascade suites; confirm migration history has exactly 17
expected entries and no canceled ledger. Compare policies/RLS flags and function
definitions to the read-only baseline; only the two ACLs should change. Run the
application test suite and architecture/type/lint checks, and inspect Supabase
security/performance advisors if available. No UI change or browser redesign test
is necessary for the two grants, but keep existing student-route regression coverage.

## Original approval and execution sequence

1. Owner approves the two-revoke SQL and manual trusted provisioning boundary. Done.
2. Generate migration 17; add the planned regression suite and update obsolete test
   setup/documentation on this branch. Done; local validation is recorded separately.
3. Review the diff, recheck live definitions/grants/history for drift, and apply only
   the approved migration to the connected development project.
4. Run rollback database regressions and application checks; report actual results
   and any genuine findings. Stop for review; no merge, push or deployment.

The vulnerability remains open until step 3. No UI, production configuration,
database data, shared branch or existing feature branch has been changed by this
proposal. This proposal does not audit or implement the complete permissions engine.
