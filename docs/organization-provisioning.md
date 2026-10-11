# Managed organization provisioning

Step 02B-S migration 17 was applied to approved development project
`gmvouqgjbtbkbhrdruzu` as `20261011184623_restrict_organization_creation.sql`.
Synthetic rollback provisioning tests passed. The manual committing procedure
below has not been run and requires authorization for its specific tenant and owner.
There is no new operator UI or application RPC.

EduLabs staff provision tenants through an authorized postgres administration
connection. A tenant owner/admin/teacher is not a platform operator. Firebase
onboarding still creates an empty profile only. Confirm the intended existing
active profile UUID against its verified Firebase issuer/subject identity and the
staff-approved ownership request; do not associate accounts solely by email.

Use `supabase/manual/provision_organization.sql` with psql variables:

```powershell
# Use your existing protected database connection configuration. No credentials
# belong in this command, source control, browser code or reports.
psql -X -v owner_profile_id="<verified-existing-profile-uuid>" `
  -v organization_name="<approved-name>" -v organization_slug="<approved-unique-slug>" `
  -f supabase/manual/provision_organization.sql
```

The script requires postgres, validates and locks the active owner profile,
inserts organization and active owner membership, and commits once. psql variable
quoting prevents SQL interpolation of names/slugs. Uniqueness/check/FK errors stop
execution; the uncommitted transaction rolls back when this one-shot connection
exits. With an interactive session, explicitly issue ROLLBACK after any error.
There is no upsert, overwrite or deletion. Existing last-owner protections remain.
Review the resulting organization and owner UUIDs after a successful authorized run.

## Privilege recovery

Before application, capture the two functions' definitions, owners and ACLs plus
effective privileges for anon/authenticated/service_role/postgres. Recheck that
the live state still matches the proposal. Migration 17 changes only EXECUTE ACLs.

If application fails in its transaction, roll back the transaction; neither
revocation should survive partially. Check both effective privileges afterwards.
If a committed change must be reversed, obtain explicit owner authorization and
create a new forward recovery migration (do not edit/delete applied migration 17):

```sql
begin;
grant execute on function public.create_organization(text,text) to authenticated;
grant execute on function private.create_organization(text,text) to authenticated;
commit;
```

These grants restore the reviewed pre-change authenticated privileges. Do not grant
to PUBLIC/anon or change service_role: their existing grants are preserved by the
hardening migration. Recovery reopens the known self-service vulnerability, so
prefer repairing a trusted provisioning workflow while retaining the revokes.
Verify effective privileges and rerun relevant tests after either recovery or repair.
No data restore, account reset or academic-record deletion is needed for ACL recovery.

## Local validation and later development verification

With an isolated local Supabase/PostgreSQL development database containing the
foundation schema and migration 17, run the rollback suites using psql with
`-X -v ON_ERROR_STOP=1 -f <suite>`:

- `supabase/tests/organization-provisioning.sql`: synthetic Firebase identities,
  both-layer RPC denial, atomic trusted fixtures and failed-provision rollback,
  teacher/owner operations, tenant isolation and last-owner protection.
- `supabase/tests/teacher-editor.sql`: standalone synthetic Firebase editor checks.
- `supabase/tests/authorization.sql` and `hardening.sql`: require development seed.
- `firebase-identity.sql` and `organization-owner-cascade.sql`: retained regressions.
- `node scripts/firebase-sql-suite.cjs` renders Firebase versions of the seeded
  authorization/hardening suites into ignored `.local`; rendering is not execution.

These suites were approved, executed and rolled back in development for Step 02B-S.
Future mutation-based executions require authorization even though they roll back.
Claims are simulated; signature verification is covered
by separate application authentication tests. Database test success must be reported
only after actual execution. Keep the manual provisioning psql script separate from
automatically discovered migrations and rollback tests; it intentionally commits.
