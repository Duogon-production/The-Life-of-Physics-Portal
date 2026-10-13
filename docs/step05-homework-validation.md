# Step 05 Homework — final development validation

Review date: October 13, 2026 (Africa/Cairo). Status: core Homework workflows implemented and verified in development, with the explicit coverage and limits below. This report accompanies the isolated feature PR; no merge or production rollout is authorized.

## Repository and preservation

- Branch: `codex/step05-complete-homework`.
- Base/HEAD: `a1f6ddda2baea44cce880d8641973cf055a0421e`, the normal merge of approved Lessons PR #4.
- Delivery is isolated on the feature branch for a PR targeting `collab/v2-integrated-ui`. No merge, manual deployment or production changes occurred. Four disposable Firebase identities were created through verified onboarding and subsequently revoked/deleted.
- Main remains at `b2ca8d180c5d4bf984986850272ed8d8de916f34`.
- The previous ignored checkpoint and verified snapshot remain intact under `.local/step05/`.
- The feature branch tracks the integration branch: any eventual push must explicitly target `codex/step05-complete-homework`.

## Implemented functionality

### Teacher authoring

Existing lesson/part editor integration provides the File Upload (default) / Platform Questions selector in place. Platform Questions starts with exactly one question; toggling preserves authored questions without duplication. Display text, reference images and choice text are optional. Structurally distinct blank options retain UUID identities and private correct-option keys. Single-choice, multiple-choice and typed/photo essay questions are supported. Reordering, draft saving, explicit mode-change confirmation, publication, unpublication and student preview use Homework-specific contracts without weakening Exams.

Reference PDFs/images, model answers, external solution videos and private solution MP4 files are supported. Authoring freezes when any student starts work; subsequent structural editing requires a cloned version. Clones allocate unique family version numbers even under concurrent requests. Shared question/reference files are access-scoped, while every solution file receives its own physical object path in each version.

Clone copying downloads through the caller's authorization and writes with `upsert:false`. A retry accepts an existing target only when SHA-256 and length exactly match its authorized source. Every target still passes server byte validation and upload attestation. Incomplete clones remain drafts, expose a pending/retry control and cannot be published. Owned retry intents can be renewed after expiry. Original files are protected during pending copying. A pending version cannot itself spawn another unfinished clone.

### Student work and solutions

The authorized lesson experience lists Homework assignments and uses the same adaptive question renderer as teacher preview. Blank textbook MCQs render compact accessible letter controls, with responsive wrapping and real radio/checkbox semantics. No invented question content, empty image frame or substitute option identities are stored.

Students start, explicitly save and resume server drafts, upload photos/PDFs, submit atomically and review submission revisions. File Upload supports up to ten files per submission; written questions allow up to four files within that total. PDFs are limited to 20 MiB, images to 5 MiB and solution MP4s to 50,000,000 bytes. Mobile camera capture is exposed where supported. File decoding, bounds, ownership and final completion are verified server-side; upload transfer alone is not submission success.

Submission unlocks model answers and solution material immediately after the database transaction succeeds. Failed, empty or merely saved drafts cannot unlock them. Objective scoring uses private stable keys; incorrect and unanswered objective questions score zero, including missing response rows. Essays remain pending human correction. Solution release is independent from grade/feedback release. No Exams retry decision is imported: only an explicit released teacher request permits another Homework revision.

### Correction and history

The contextual Homework inbox supports course/group, human-readable assignment search/selection, student lookup and 25-row pagination with exact totals. Graders can inspect answers, objective marks, originals, typed essays and uploaded work, award written marks and provide feedback. Images/PDFs support normalized positioned regions and page-specific notes, preserving originals. Grade/release/annotation changes are audited; changes after release require a reason and withhold the changed correction until re-release.

Offering support staff can prepare corrections; contextual managers/instructors release them. Course editing permission alone does not authorize reading student submissions. Students receive only their own released correction details. Own submission history and correction events have separate pagination; revisions older than fifty remain reachable.

### Cleanup and playback

Student file removal first commits an updated draft, then requests exact object cleanup. Teacher detachment cleans only unreferenced owned assets after save; explicit editor close handles staged uploads. Cleanup failure is visible and retains the private original for scoped maintenance. Referenced/shared/historical originals cannot be archived by these endpoints. Physical Storage insertion is serialized against metadata archival to prevent a late upload after cleanup. No Storage metadata is deleted directly with SQL.

Signed media URLs last five minutes; solution media refreshes its authorization and preserves ordinary video playback position. PDF/image validation does not claim malware scanning, transcoding, DRM or screen-recording prevention.

## Applied development migration

- File: `supabase/migrations/20261013184915_complete_homework_workflows.sql`.
- SHA-256: `98DBF18052878B1FDE3A94E04D50C0C447E65A4FE16DDA7BAC7EA1FFD480C84C`.
- Applied after explicit owner approval to development Supabase `gmvouqgjbtbkbhrdruzu` only.
- The reviewed file was originally named `20261013153243_complete_homework_workflows.sql`. Supabase MCP assigned applied version `20261013184915`; the local filename was aligned with that history entry without changing the approved file bytes/checksum. The approved original is retained only in the ignored acceptance evidence directory. A narrowly scoped `.gitattributes` rule preserves this migration’s exact reviewed bytes across checkouts.
- Verified history: the same 21 migrations plus `20261013184915_complete_homework_workflows` (22 total).
- No modification to migrations 1–21, authentication architecture, existing function definitions, existing grants or existing academic records.
- Adds fifteen tables, one private bucket, new indexes/functions/triggers/policies and one private maintenance view.
- Data effect at application: one new private `lms-homework` bucket; all Homework tables start empty. No existing academic-row updates, backfills, imports or deletion.
- DELETE/UPDATE statements inside new RPC bodies execute only during later authorized operations. Unstarted definitions and student drafts may be replaced atomically; historical submissions/marks/files use restrictive foreign keys and immutable version semantics.

Tables:

- `public.homework_assignments`
- `public.homework_submissions`
- `private.homework_uploads`
- `private.homework_clone_sources`
- `public.homework_questions`
- `public.homework_options`
- `private.homework_keys`
- `private.homework_solutions`
- `private.homework_materials`
- `public.homework_responses`
- `public.homework_submission_files`
- `private.homework_corrections`
- `private.homework_marks`
- `private.homework_annotations`
- `private.homework_audit`

Public RPC entry points:

- `save_homework`
- `homework_work`
- `get_homework`
- `homework_inbox`
- `homework_lifecycle`
- `homework_upload`
- `homework_history`
- `homework_revisions`

Public tables grant authenticated SELECT only with RLS. Anonymous users receive no Homework table/RPC access. Private tables have RLS enabled, no API grants and intentional default-deny policies. Public wrappers are SECURITY INVOKER; private definers have empty search paths, fully qualified references and checked actor/context. Internal asset, referenced-file and submission-serialization helpers cannot be called directly by authenticated users.

`hw_upload` attestation is created server-side through existing protected Firebase Admin configuration, is exact-upload scoped and accepted only with a recent signed token. The server never returns this token, persists it as an account custom claim, or exposes an Admin/service-role credential. Actual Firebase exchange, byte validation, private Storage access and cleanup passed authenticated acceptance after migration application.

### Historical preflight and post-application verification

The project is ACTIVE_HEALTHY on PostgreSQL 17.11. Read-only inspection confirmed the exact expected 21 migration versions, ending in `20261013141230_complete_lesson_workflows`. Homework tables and the new bucket were absent at preflight. They now exist with all fifteen tables using RLS and restricted grants. Both public/private `create_organization(text,text)` remain non-executable by authenticated users.

Observed baseline: eight profiles, two organizations, one lesson block, one lesson progress record, one lesson segment, one segment progress record and zero assessment attempts. This baseline was captured before fixture creation. After scoped cleanup, all 28 pre-existing public/private table digests match that baseline exactly.

Baseline advisors: six intentional private default-deny RLS INFO notices, one existing Supabase Auth leaked-password-protection warning, and six unused-index INFO findings. Final advisors were rerun: fifteen intentional private default-deny RLS INFO notices (nine new Homework tables), the same existing password-protection warning and nine unused-index INFO findings. No new security warning was introduced. Existing function definitions, policies and organization-provisioning restrictions were verified unchanged.

## Local verification

| Check | Actual result |
| --- | --- |
| `npm run check` | 144 application tests passed, architecture checks passed, TypeScript passed, lint zero errors/seven existing warnings |
| PGlite migration replay and SQL | All 11 suites passed: 459 existing assertions plus 96 Homework assertions (555 total) |
| Native PostgreSQL upgrade replay | All SQL suites and 30 independent-session races passed (14 Homework, 16 Exams/Lessons) |
| Native PostgreSQL fresh replay | Same SQL/concurrency checks passed |
| Migration preservation | 31 pre-existing tables/data/grants, 129 function definitions/grants and 88 policies unchanged across migration 22 |
| Firebase/Supabase isolated production build | Passed |
| Clerk/Prisma isolated production build | Passed |
| `git diff --check` | Passed |
| Secret/artifact scan | No sensitive filename candidates, private keys, API-token literals or JWT literals in intended implementation files |

Final post-cleanup evidence logs are ignored under `.local/step05/`: `check-clean.log`, `native-clean.log`, `build-firebase-clean.log`, `build-legacy-clean.log`; additional upgrade/PGlite replay logs and remote rollback-suite evidence are retained there. No logs, credentials, environment files, build outputs or local acceptance artifacts are intended for Git.

Concurrency coverage includes duplicate starts/submissions, stale saves, competing grades/releases, definition freezing, attachment/archive races, unpublication, twenty-pending-upload quota, distinct family versions, both Storage-insertion/archive orderings, and enrollment expiry while waiting on a row lock. SQL tests include private keys/grades, solution gates, cloned-path isolation, ownership, synthetic attestation rejection/acceptance, page bounds, annotations, cross-tenant/peer/enrollment denial and histories beyond fifty entries.

The preservation harness checks whole pre-existing row digests and database objects, rather than assuming RLS-hidden rows were not changed. All SQL test data is synthetic and confined to rollback transactions or disposable local databases. No connected development data is changed by local tests.

Dependencies are pinned: PDF.js 6.4.299, pdf-lib 1.17.1, sharp 0.35.5. Node minimum is now 22.13.0 to match PDF.js. Audit comparison introduces no new vulnerable package names: the existing seven findings (five high glob/Tailwind-chain entries and two low Quill-chain entries) remain and are not claimed fixed by Homework.

## Authenticated acceptance and implementation corrections

The full workflow ran against a fresh isolated local server and the approved development services using real Firebase sessions. Four synthetic identities (teacher, assigned assistant, student and same-offering peer) were normally provisioned through Firebase verification into Supabase. Trusted atomic tenant/owner setup created two disposable organizations, and the teacher created the actual course/modules/lessons through existing authorized operations. No email-only identity linking or fake Firebase mapping was used.

Passed Chromium 153.0.8010.12 workflows:

- File Upload default, exactly one automatic Platform question, repeated tab switching without duplicates, blank textbook single-choice MCQ, typed/photo written answers, private PDF/MP4/reference uploads, publication, teacher preview and mobile layout.
- Shared compact answer rendering, mixed blank/filled options and real question-image authoring/rendering, with private solutions still locked.
- Server draft save and refresh restoration; successful submission; immediate solution unlock; actual private MP4 playback while essay score stayed withheld.
- Real malformed PDF rejection, mobile upload controls and exact cleanup of a removed draft attachment.
- Assigned assistant grading with direct API/UI release denial; teacher objective/manual total release; student receives only released grades and comments.
- Real PDF.js worker/canvas renders two pages; page-two positioned note; student reads the released annotation on the original PDF at mobile width.
- Actual pointer-positioned image annotation, post-release reason/audit, re-release and student annotation review through older submission history.
- Twenty-six actual teacher-requested revisions created through checked server operations; original released total preserved; paginated student history and teacher inbox reach revision one.
- Independently stored cloned solutions; draft/publication denial before completion; simulated failed copy-request transport; real copy retry/attestation; normal eager copying; original submission does not unlock a new version or another student's files. Hash-mismatch/non-overwrite cases are covered in local service tests, not claimed as a real Storage outage experiment.
- Blank multiple-choice checkbox answer is actually auto-graded and released. A real incorrect MCQ scores zero while a missing written answer remains pending.
- Real HTTP concurrency: duplicate start/submit return the same submission, stale saves reject with 409, competing teacher/assistant grading produces one 200/one 409, duplicate release produces one 200/one 409.
- Same-offering peer, wrong tenant, draft, expired enrollment, direct tables/RPC/Storage, forged upload completion and organization-creation denial.
- Existing Lessons cards/content/progress/draft denial and Exams listing/detail/submission/release/retry restrictions remain functional.

Firefox 155.0 and WebKit 26.6 additionally passed real Firebase sign-in and read-only released PDF/annotation rendering at desktop (1440px) and mobile (390px) widths. Full authoring/upload/grading/race coverage was Chromium; equivalent full workflows are not claimed for the other engines. The recorded teacher/student/grading and cross-browser error collections contained no uncaught JavaScript exceptions.

Acceptance exposed and corrected narrowly scoped application issues:

1. ADC remote custom-token signing returned `auth/insufficient-permission`. The existing protected service-account file now initializes a local certificate signer after project validation. No new IAM grants, copied keys or browser credentials were introduced. See [Firebase custom-token signing guidance](https://firebase.google.com/docs/auth/admin/create-custom-tokens). Workload ADC and existing explicit server credential modes remain supported; credential-mode regression tests pass.
2. The parent admin layout still invoked Clerk before the Firebase Homework page adapter. The Firebase branch now delegates to the allowlisted, context-authorized page; legacy authorization remains intact and has a regression test.
3. Inbox rows from the previous request briefly appeared under the new page number. Rendering now requires a matching request key; student revision history similarly requires the selected response page. A regression test ensures old rows are absent during loading.
4. Same-title published versions were indistinguishable to students. Assignment controls now include their real version number.
5. Image annotation regions suppress native image dragging and handle pointer cancellation. Pointer-normalization regression and actual browser dragging passed. Empty mixed-choice labels shrink to their actual letter/control size.
6. Database types were regenerated from the applied project. Twenty previously supported nullable RPC arguments were retained because generated PostgreSQL function metadata does not describe argument nullability; runtime SQL signatures/permissions were not changed.

## Fixture cleanup and preservation

Run identifier: `c653e177-cebe-4138-b0a4-49a8500b57de`. Exact identities, object paths and credential-free cleanup receipts are retained in ignored `.local/step05/acceptance/` evidence; passwords/tokens remain outside Git and this report.

Ownership guards checked the exact two tenant IDs/slugs, course/assignment IDs, verified Firebase mappings, four profile IDs, upload ownership and object paths before cleanup. Cleanup removed thirteen stored objects via authorized Storage API calls; all fifteen application upload records were archived through the checked endpoint and privileged queries verified zero objects remained before application fixture records were deleted. No `storage.objects` row was deleted directly with SQL.

A guarded rollback dry-run passed before final scoped database deletion. All five assignments, twenty-nine submissions, test course/lesson/enrollment/exam/progress records and four profiles/identity mappings were removed. Four exact Firebase accounts were revoked, deleted and verified absent. The private feature bucket and schema remain. No unintended fixtures remain, and all twenty-eight original public/private table digests match the preflight baseline.

Post-cleanup checks passed again: 144 application tests, TypeScript, architecture, lint (seven existing warnings), both production builds, local SQL/native concurrency and all eleven development rollback SQL suites. Original Exams/Lessons data, migration 17 restrictions and main were preserved. Only the isolated port-3165 test server was stopped; unrelated development servers were left intact.

## Remaining limits and next action

- Native phone-camera hardware was not exercised; mobile capture controls and actual photo/PDF selection/uploads were tested. No full-capacity load benchmark, DRM, transcoding or malware-scanning claim is made.
- Signed media URLs are five-minute bearer links. New unauthorized/expired-enrollment access is denied, while a previously issued link can remain usable until its expiry.
- Existing contextual course/group discovery remains bounded and reports limited results; authoring currently rejects a course with more than 100 groups explicitly. Submission inbox/history remain paginated without a 100-submission cap. Questions/options/files also have explicit documented bounds.
- Existing npm audit findings (five high build-glob-chain entries and two low Quill-chain entries), seven lint warnings and the pre-existing Supabase Auth password-protection warning remain unchanged. They are not claimed fixed by Homework.
- The older Exams documentation's separate unexecuted REST script and historical cross-browser/load-testing limits remain unchanged; this Homework evidence does not retroactively certify those earlier experiments.
- Next action is owner review of the feature PR targeting `collab/v2-integrated-ui`. Do not merge, manually deploy, change main or apply production migrations without separate approval.

## Exact applied migration history (22)

1. `20261001230352_lms_schema`
2. `20261001230357_lms_authorization`
3. `20261001230358_lms_integrity`
4. `20261001230606_lms_workflows`
5. `20261001230644_lms_storage`
6. `20261001230955_lms_verification_fixes`
7. `20261010100544_harden_storage_and_assessments`
8. `20261010100545_external_identity_preparation`
9. `20261010100547_objective_assessment_grading`
10. `20261010101249_ready_media_references`
11. `20261010102724_bound_assessment_response_size`
12. `20261010123515_firebase_identity_resolution`
13. `20261010124048_private_firebase_provisioning`
14. `20261010144028_allow_organization_owner_cascade`
15. `20261010181016_teacher_course_creation`
16. `20261010181140_reuse_course_owner_trigger`
17. `20261011184623_restrict_organization_creation`
18. `20261012044748_secure_exam_attempts_and_results`
19. `20261012053751_atomic_exam_authoring`
20. `20261012063114_complete_exam_workflows`
21. `20261013141230_complete_lesson_workflows`
22. `20261013184915_complete_homework_workflows`

## Complete changed-file inventory (34 files)

- `.gitattributes`
- `app/(dashboard)/(routes)/admin/layout.tsx`
- `app/(dashboard)/(routes)/admin/submissions/page.tsx`
- `app/(dashboard)/_components/homework-inbox-page.tsx`
- `app/(dashboard)/_components/secure-lesson-page.tsx`
- `app/api/homework/[assignmentId]/[action]/route.ts`
- `docs/step05-homework-validation.md`
- `frontend/features/admin/submissions/homework-inbox.tsx`
- `frontend/features/courses/lesson/homework-assignments.tsx`
- `frontend/features/courses/lesson/homework-file-review.tsx`
- `frontend/features/courses/lesson/homework-history.tsx`
- `frontend/features/courses/lesson/homework-media.tsx`
- `frontend/features/courses/lesson/homework-question.tsx`
- `frontend/features/courses/lesson/homework-student.tsx`
- `frontend/features/teacher/chapters/editor/homework-editor.tsx`
- `frontend/features/teacher/chapters/editor/learning-editor.tsx`
- `frontend/lib/homework.ts`
- `middleware.ts`
- `package-lock.json`
- `package.json`
- `scripts/exam-sql-local.cjs`
- `scripts/firebase-auth.test.cjs`
- `scripts/homework-concurrency.cjs`
- `scripts/homework.test.cjs`
- `server/http/homework.ts`
- `server/integrations/firebase-admin.ts`
- `server/services/homework-clone-media.ts`
- `server/services/homework-file-validation.ts`
- `server/services/homework.ts`
- `shared/contracts/database.types.ts`
- `shared/contracts/homework.ts`
- `shared/website-routes.ts`
- `supabase/migrations/20261013184915_complete_homework_workflows.sql`
- `supabase/tests/homework.sql`
