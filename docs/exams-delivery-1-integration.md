# Exams Delivery 1 integration

## Scope and provenance

Integrated on `codex/integrate-exams-delivery-1` from the approved shared branch
commit `4770bdf3ded45c7ec359f65272af7f951b05ea25`. Only
`exams-delivery-1.patch` from the supplied handoff was applied after
`git apply --check` succeeded. The handoff changelog names `230b413` as its
author's baseline; that unrelated 23-file commit was **not** imported.
`CHANGELOG_FOR_MERGE.md` preserves the patch author's delivery record. This
report describes the resulting integration and its actual verification.

## Functionality

- Firebase/Supabase `/exams` and UUID detail pages show authorized exam and quiz
  schedules, course/offering labels, windows, limits and the viewer's attempts.
- Homework/assignments and practice are excluded in the database query before
  pagination and defensively excluded when constructing list/detail results.
- Loading, safe error, empty and partial-result states are distinct.
- Staff receive a read-only overview; no editor, runner, start, continue, retry,
  grading, answer review or write operations were added.
- Only graded attempt scores enter the rendered view model. Question counts
  become unavailable when the bounded question query is truncated.
- Existing Clerk fallback routes and V2 styling remain in place. Middleware
  permits only the explicit exams page and canonical UUID detail path; exam APIs
  and deeper paths remain outside the Firebase allowlist.

## Security boundary

Identity comes from the existing verified Firebase website context. All new
database reads use the existing caller-scoped Supabase server client and RLS.
Attempts are additionally filtered to the viewer's profile ID. No service-role
client, answer-key query, new SQL migration, RPC or write path was introduced.
Staff detection affects presentation and the published filter only; it grants
no database privileges. Missing RLS-visible relations are not fabricated.

Read-only development metadata verification confirmed 17 applied migrations,
including `20261011184623_restrict_organization_creation`, public-table RLS
enabled on all 19 application tables, and authenticated EXECUTE on
`public.create_organization(text,text)` still denied. All 17 local migrations
are unchanged from the approved base.

## Verification

- `npm run check`: passed; 82 tests, architecture boundaries, TypeScript and
  lint. Seven existing lint warnings remain; no new lint errors.
- Exam suite: 10 tests passed, now included in normal `npm test`.
- Regression coverage includes canonical route gating, exam/quiz filtering,
  own-attempt filtering, unreleased-score stripping, hidden relations, empty
  results, failed queries, truncated counts, read-only rendered output and
  sign-in redirects.
- Production builds: Firebase/Supabase staging and Clerk/legacy fallback.
  Both use process-local mode variables; no environment files were changed.
- `git diff --check`: passed.
- Anonymous read-only REST smoke returned `42501`: anonymous users lack table
  SELECT access. This verifies denial, **not** the authenticated join query.
- Real Firebase-authenticated browser acceptance, live enrolled/staff listing
  queries and cross-tenant runtime checks were not performed for this delivery.
  Repository tests use mocked clients and React server rendering. Existing SQL
  suites were not re-executed; this delivery changes no database objects/data.
- The server-dependent security runtime smoke was not run. Security and
  architecture regression tests are included in the passing application suite.

## Existing limitations and follow-up

These are documented boundaries, not implemented backend changes:

1. Existing RLS allows a viewer to SELECT their own attempt score columns even
   before graded status. This adapter strips unreleased scores, but that is not
   a database-wide grade-release guarantee. A reviewed backend release policy
   is required before offering a complete assessment experience.
2. The existing attempt-start RPC can permit a later attempt after submission;
   nullable maximum-attempt settings can be unlimited. This delivery adds no
   attempt-start controls. Retry/release rules need separate backend review.
3. Existing student assessment visibility can hide content before its opening
   time. Upcoming metadata is therefore limited by current RLS; the adapter
   does not bypass it.
4. Bounded reads can produce partial listings/attempt histories. The UI reports
   partial results; question counts are withheld when incomplete.
5. Staff/student mixed contextual roles still rely on per-row RLS. The overview
   never supplies other students' attempts or grants global staff access.

Next: review this PR and perform enrolled-student/staff authenticated acceptance
against development before extending the exam workflow. No merge, production
migration, deployment or Step 02C work is part of this delivery.
