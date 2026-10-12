# Step 03A — Exams implementation and validation

Work remains on `codex/step03a-secure-exam-attempts`, based on `053a750575660c4d414c901d92abddae827831e7`. The existing V2 components, styling and animations are retained. Firebase sessions and caller-scoped Supabase operations remain authoritative. No production changes, merge or deployment occurred.

## Database status

Development project: `gmvouqgjbtbkbhrdruzu`.

| Migration | Actual status | SHA256 |
| --- | --- | --- |
| 18: `20261012044748_secure_exam_attempts_and_results.sql` | Applied with approval | `79220F80F4DB566CCB6E63A64B4EA5FF1F8C7BF259C8AD77994695821259B6AE` |
| 19: `20261012053751_atomic_exam_authoring.sql` | Applied with this task's approval | `DC2B69BA2ADE74EFBC4BFF68DCEEC92C613E094A2544C2CCACAE764B2CADB764` |
| 20: `20261012063114_complete_exam_workflows.sql` | Applied to development with final completion approval | `4187606738502A28BCAA33E3FB1EE8BD6D503868F1898A1A39F9E7A2434C1F23` |

The final remote check found exactly the expected 20 migrations, zero public tables without RLS and the checked migration-20 RPCs. Migrations 1–18 were preserved; the canceled legacy ledger is absent.

Before applying 19, the exact project/history, definitions/grants, missing authoring functions, compatible schedule settings and full SQL were checked. It creates checked functions and one covering FK index, without rewriting existing academic records. Supabase MCP assigned version `20261012053751`; the reviewed file formerly named `20261012050408_atomic_exam_authoring.sql` was renamed to match. Its SQL/checksum did not change.

Migration 20 implements requirements beyond reviewed migration 19: all-format authoring, atomic answer snapshots, cloning, pagination and audited corrections. Applied migrations were not edited to add these features. The owner separately approved applying this exact SQL. Supabase MCP assigned version `20261012063114`; the reviewed filename was `20261012053905_complete_exam_workflows.sql`. SQL/checksum stayed unchanged.

## Implemented teacher experience

- Existing V2 list includes Create Exam even with zero exams. Course/offering choices require both contextual course-edit and offering-management authority. Students have no creation action.
- Existing builder creates/edits drafts and publishes exams/quizzes. Duration is unlimited or 1–1440 minutes; attempts are 1 or 2. Questions/options remain normalized rows with UUID contracts.
- All seven formats: single choice, multiple choice, true/false, numeric with absolute tolerance, short text, essay and photo. Numeric keys remain private. Multiple choice uses exact-set, all-or-nothing scoring.
- Used/shared definitions are immutable. Clone new version creates a new draft/schedule with predecessor/version tracking. Stale saves fail HTTP 409.
- Existing grading panel separates saving marks, total release and answer-review release. UUID cursor pagination uses 25 submissions per page; SQL traversed 107 without duplicates/omissions.
- Released-mark correction requires a student-visible reason and idempotency UUID. Complete marks, permissions and revision are checked under a lock; marks and before/after audit evidence commit atomically. Neither attempt's answer history is rewritten.
- Private `exam_grade_changes` has RLS and no application table grants. Direct audit updates/deletes fail while its parent exists. Separately authorized privileged parent-attempt deletion cascades audit records for scoped cleanup; application roles gain no deletion right. Released students see only their own correction reason/time/totals.

**Development availability:** all migration-20 RPCs are now applied. Compatible definition reads/saves retain migration-19 fallback behavior; grading never falls back to insecure/non-atomic writes. Authenticated browser completion results are recorded below.

## Implemented student experience and security

- Existing V2 runner starts/resumes, autosaves, restores on refresh, uses server-clock deadlines or No Time Limit, submits and handles retry/finalization/results.
- All seven inputs use UUID contracts. Numeric zero works; duplicate/foreign options and non-finite values fail validation. Migration 20 saves the complete snapshot atomically. Identical lost-response retries are idempotent; changed stale snapshots fail 409, including an unchanged first question.
- Database time, snapshotted deadlines and schedule close control expiry. Late client work is rejected. Attempt 2 receives a fresh deadline.
- Incorrect/unanswered objective answers produce the exact opaque retry prompt. Decline permanently closes retry; accept authorizes exactly one fresh second paper. Direct starts cannot bypass the decision. No third attempt. Attempt 2 replaces Attempt 1's score even if lower, while preserving both answer histories.
- Perfect objective answers, one-attempt papers and subjective-only pending grades do not incorrectly prompt retry. Missing rows are explicitly unanswered. Supplied subjective work remains Under Correction.
- Raw authenticated attempt score/max-score/grading projections remain revoked. Response marks, feedback, correct options and keys remain protected. Checked contextual staff/released-result RPCs provide legitimate access.
- Objective-only final papers auto-release totals; manual grading does not. Keys, per-question marks/feedback and both-attempt history require separate review release, respecting configured close time.
- Existing result cards show actual green correct options, red incorrect choices, 1st Try/2nd Try badges, numeric answers/tolerance and authorized feedback. Correction history is shown only after release.
- Private photo upload retains caller/offering ownership, MIME/file-signature checks, 5 MB bound, no overwrite, readiness verification and short signed read URLs. Typed questions remain typed; photo answers allow notes.

The HTTP adapter verifies Firebase session/exact origin, strictly bounds/validates bodies and retains caller JWTs. Unknown actions and legacy endpoints remain blocked. Definers have empty search paths/qualified references; invoker wrappers have explicit privileges. Tenant RLS, trusted provisioning and teacher operations remain authoritative. No global staff authorization or client service-role key was introduced.

## Actual verification

| Check | Result |
| --- | --- |
| `npm run check` | 111 tests passed; TypeScript/architecture passed; lint zero errors, seven existing unrelated warnings |
| Development SQL after 20 | All nine rollback suites passed: authorization 73, hardening 51, Firebase identity 34, owner cascade 5, provisioning 61, teacher editor 20, secure exams 76, authoring 17, completion 50 (387 total) |
| Local native PostgreSQL | All 20 local migrations; nine rollback suites; 387 assertions passed |
| Real concurrency | Ten independent-session races passed, including audited corrections, atomic snapshots and enrollment expiry during a lock wait |
| Actual timer | Real 60-second deadline passed; eligible retry preserved, second paper got a fresh deadline |
| Prior authenticated Chromium | Foundation 14 checks; runner/grading/photo 14 checks; subsequent read-only smoke passed |
| Migration-19 real Chromium workflow | Seven checks passed: draft persistence, publish, stale 409, permitted student access, unlimited autosave/resume, perfect objective finalization and used-paper lock; mobile builder screenshot captured |
| Final cross-browser acceptance | Chromium, Firefox and WebKit each passed six actual Firebase-authenticated checks: home, authorized listing without student authoring, released two-attempt history, mobile layout, withheld photo grade, logout; no JavaScript exceptions |
| Migration-20 full authenticated workflow | 12 checkpoints passed: seven-format draft/publish, autosave/refresh, reused authorized photo, opaque retry, direct bypass denial, lower second-paper score, manual grading, independent releases, both histories, audited correction, clone/mobile and student staff-denial/self-learning smoke |
| Firebase/Supabase production build | Passed with isolated ignored output/process-local staging mode |
| Clerk/Prisma fallback production build | Passed independently with isolated ignored output |
| Development advisors after 20 | No new security warnings; missing-FK-index finding resolved; fresh unused-index INFO retained |

Local SQL verifies roles/locks but does not replace real Firebase/PostgREST acceptance. The complete all-format teacher→student→grading→correction/clone scenario passed in authenticated Chromium (12 workflow checkpoints). The teacher created the seven-format draft through the actual builder; browser reloads discarded two response bodies, so the harness recovered those exact IDs through read-only queries and resumed without duplicates. No application code correction was needed. No production capacity claim is made.

Private-table no-policy INFO is intentional default deny. Existing Supabase Auth leaked-password-protection warning remains; the application uses Firebase login. Fresh unused indexes were not dropped. References: [password security](https://supabase.com/docs/guides/auth/password-security), [database linter](https://supabase.com/docs/guides/database/database-linter).

## Synthetic cleanup — completed and verified

The owner deleted the exact private synthetic photo through the Storage dashboard. A privileged read independently verified absence before cleanup. No Storage metadata was deleted with SQL and no student permissions were weakened.

The exact run-owned cleanup passed a transactionally rolled-back dry run, then committed: two test organizations/courses/offerings, one enrollment, eleven schedules (including UI-created draft and clone), nine attempts, their responses/outcomes/audit rows, one media record and two Firebase identity mappings/profiles. Only those verified disposable Firebase users had sessions revoked and accounts deleted; getUser confirmed both absent. Existing seed owners were retained.

Persisted verification restored the initial baseline: eight profiles, two organizations, zero attempts/responses, zero synthetic audit entries and no test tenant/identity/media/object leftovers. Passwords, tokens, signed URLs and exact fixture manifests remain Git-ignored; the cleanup evidence is under ignored .local/step03a/acceptance.

## Completion status and practical limits

The requested Exams feature is functionally complete in development and ready for PR review. The V2 UI, Firebase/Supabase architecture, migration 17 provisioning restriction and contextual tenant isolation remain intact. Migrations 1–20 match development; no production migration, main change, merge or deployment was performed.

- All-format end-to-end acceptance ran in Chromium. Firefox/WebKit each passed the separate authenticated student smoke; full teacher authoring/grading was not repeated in those engines.
- Pagination across 107 submissions passed real development rollback SQL and native PostgreSQL; browser acceptance verified a real final-paper page and disabled next-page state, not 107 persistent browser identities.
- An additional standalone Firebase-password/direct-REST verification script was rejected by automatic approval review (blocked by policy), and was not retried. Real browser HTTP bypass attempts and database-role regression suites passed for score/key protection and tenant isolation. This extra actual-token REST check remains unexecuted.
- Browser fixtures were synthetic; performance/load capacity and production readiness are not inferred. Supported authoring bounds are 100 questions, 2–6 choice options, 1–1440 minutes or unlimited; photo submissions accept PNG/JPEG/WebP up to 5 MB.
- Seven existing unrelated lint warnings remain. Supabase's existing leaked-password protection warning applies to native Supabase Auth; this app uses Firebase. Private default-deny audit tables and fresh unused indexes are intentional advisor INFO findings.

Final delivery uses the isolated feature branch and a PR targeting collab/v2-integrated-ui only. Production and main remain unchanged. PR merge requires owner review.

## Repeat local checks

`npm run check` runs application tests, architecture, TypeScript and lint. `npm run test:exam-sql` runs scratch embedded PostgreSQL. Pinned dependencies stay in ignored `.local/step03a/runtime`. Native tests use an isolated loopback cluster and ignored `pg-port.txt`:

```powershell
npm run test:exam-sql:postgres
node scripts/exam-sql-local.cjs --postgres --timers
```

These harnesses create/drop only their unique local scratch database. Never point them at development/customer databases. Evidence/screenshots stay in ignored `.local/step03a/acceptance`.

## Complete changed-file inventory

- `app/(dashboard)/_components/website-exams.tsx`
- `app/api/secure-exams/[examId]/[action]/route.ts`
- `docs/database-architecture.md`
- `docs/step03a-exams-implementation.md`
- `docs/step03a-secure-exams-proposal.md`
- `frontend/features/exams/exam-builder.tsx`
- `frontend/features/exams/exam-grading-panel.tsx`
- `frontend/features/exams/exam-result.tsx`
- `frontend/features/exams/exam-runner.tsx`
- `frontend/features/exams/exam-staff.tsx`
- `frontend/features/exams/exam-teacher-portal.tsx`
- `frontend/features/exams/exams-list.tsx`
- `frontend/lib/api.ts`
- `middleware.ts`
- `package.json`
- `scripts/exam-concurrency.cjs`
- `scripts/exam-deadline.cjs`
- `scripts/exam-runner.test.cjs`
- `scripts/exam-security.test.cjs`
- `scripts/exam-sql-local.cjs`
- `scripts/exams-foundation.test.cjs`
- `server/http/exam-runner.ts`
- `server/repositories/exam-security.ts`
- `server/repositories/exams.ts`
- `server/repositories/lms.ts`
- `server/services/exam-authoring.ts`
- `server/services/exam-grading.ts`
- `server/services/exam-runner.ts`
- `server/services/exam-security.ts`
- `server/services/exams.ts`
- `shared/contracts/database.types.ts`
- `shared/contracts/exam-authoring.ts`
- `shared/contracts/exam-listing.ts`
- `shared/contracts/exam-security.ts`
- `shared/contracts/exams.ts`
- `shared/contracts/lms.ts`
- `shared/exams.ts`
- `supabase/migrations/20261012044748_secure_exam_attempts_and_results.sql`
- `supabase/migrations/20261012053751_atomic_exam_authoring.sql`
- `supabase/migrations/20261012063114_complete_exam_workflows.sql`
- `supabase/tests/authorization.sql`
- `supabase/tests/concurrency.md`
- `supabase/tests/exam-attempts-results.sql`
- `supabase/tests/exam-authoring.sql`
- `supabase/tests/exam-completion.sql`
- `supabase/tests/hardening.sql`
- `supabase/tests/local-bootstrap.sql`

Final review: 47 source/document/test/migration files; no secret-pattern findings, local artifact paths or changes to the 17 base migrations. No dependency/lockfile, production configuration or unrelated route changes. Application/document whitespace checks passed. The full base-to-head check reports one terminal blank line in immutable, already-applied migration 20; it is intentionally preserved to retain the approved checksum. No other whitespace errors were found. Test-only Next tsconfig additions were removed after stopping the isolated server.
