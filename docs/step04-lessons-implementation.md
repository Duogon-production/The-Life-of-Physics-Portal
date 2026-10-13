# Step 04 — Lessons implementation and development validation

Updated October 13, 2026. The earlier pre-approval draft was replaced by the approved Lessons & Videos migration, which is now applied to development.

Status: implemented and validated on `codex/step04-complete-lessons`, based on
integration commit `5fc043442335b8d9d96b57ef938c2768ec04d5ac`. Development
migration 21 is applied. Real Firebase teacher, assigned assistant and student
acceptance passed. Synthetic accounts, academic records and Storage objects were
removed and verified. This branch is ready for integration review; it is not merged
or deployed. Production and local main were not changed.

## Implemented

- Existing teacher course editor now manages modules, lessons and parts. Creation,
  title/rich description editing, complete-set ordering, visible draft/published
  status, lesson publication and part publication use contextual Supabase operations.
- The existing teacher chapter route has a Firebase/Supabase adapter using the V2
  two-card segment editor and existing title/description components. Clerk routes
  retain their previous implementations. No stylesheet or animation was replaced.
- Teachers can choose Chapter, Unit, Week and the existing curriculum presets for
  each module, set private per-part thumbnails, and preview drafts without writing
  student progress. Explicit course editors may include organization assistants; no
  global teacher/assistant permission was added.
- Parts support HTTPS YouTube/Vimeo embeds, direct HTTPS MP4/WebM and private MP4
  uploads, rich notes, private PDFs and PNG/JPEG/WebP resources. Students receive
  actual authorized parts, counts and offering-specific status on V2 lesson cards.
  Numbering restarts within each module; links resume an in-progress part or the
  first unfinished part rather than inventing a chapter URL.
- The existing V2 LessonTabs/playlist receives a secure player adapter. Desktop
  and mobile previous/next part and lesson links retain offering identity. Native MP4 position is
  saved/restored, with pause/visibility/navigation saves, throttled updates and
  explicit completion. Completion events queue behind an active save.
- Progress uses revision checks and PostgreSQL serialization. Each offering/user
  has independent part history. Completion of an individual part is monotonic;
  lesson status is projected from the current published parts, not an authoritative
  stored percentage. New published parts cannot inherit cached completion.
- Resources resolve fresh authorized 10-minute signed URLs on each open. Private
  video URLs refresh after eight minutes. Failed access and missing content produce
  explicit unavailable/error states; incomplete data is not treated as an empty course.

## Migration 21

File: `supabase/migrations/20261013141230_complete_lesson_workflows.sql`.

SHA-256: `06EABC96311A9D60654CE9FAE46586CB748F23BF058ABCFED865F801E4AAF7E1`.

The owner approved the candidate filename `20261012130855_complete_lesson_workflows.sql`.
Supabase MCP assigned applied version `20261013141230`; the Git filename was
renamed to match history, without changing the approved SQL or SHA-256.
Development project: `gmvouqgjbtbkbhrdruzu`. Exactly 21 migrations are present,
with all 20 preceding versions/names unchanged and no canceled legacy ledger.

The additive migration adds `course_modules.group_type`, `lessons.description`,
private upload scopes, part thumbnail references, `lesson_segments`,
`lesson_resources` and `lesson_segment_progress`. All three new public tables have
RLS, SELECT-only application table privileges, constrained foreign keys and indexes.
Existing Supabase block content is retained and displayed, with contextual editing
of existing text/heading/callout notes. A compatibility insert creates one real
initial part for each existing block-based lesson and copies only its actual
in-progress/completed offering records into part progress. No original block,
lesson, progress, exam or identity row is rewritten or deleted; no Clerk/Prisma data
is imported. Read-only development preflight found one qualifying lesson and one
progress row, with no incompatible title/position values. Migrations 1–20 are unchanged.

Checked public SECURITY INVOKER wrappers delegate to private SECURITY DEFINER
implementations with empty search paths and qualified references:

- `edit_learning_content(course_id, action, id, parent_id, updated_at, data)`
- `save_segment_progress(offering_id, segment_id, position, complete, revision)`
- `archive_unused_lesson_upload(asset_id)`
- `register_lesson_upload(course_id, mime, filename)`
- `get_lesson_upload(course_id, asset_id)`

Teacher writes lock the course root, check contextual edit permission, validate
parent ownership and reject stale edits/reorders with SQLSTATE PT409 (HTTP 409).
Reorders require the exact current item set and item timestamps. There is no
destructive lesson/part removal endpoint; unpublication retains progress history.
Progress requires the published lesson/part and active enrollment in that exact
offering's course. Identity uses the existing verified Firebase/native-Supabase
profile resolver, never an arbitrary submitted user ID.

`private.can_view_media` is extended only for authorized new part/resource
references. Assets must be ready course media in the same organization and already
visible to the attaching teacher. The asset lock serializes reference creation
against cleanup. No anonymous grants or organization-provisioning grants are added.

Two narrow Storage cleanup policies allow the owner of an **archived, unreferenced course
upload** to locate/remove that exact object through the Storage API. These policies
never apply to `lms-submissions`, never grant general student deletion, and cannot
remove referenced video/resources. The maintenance queue includes new references.
A third scoped policy lets only the current authorized uploading editor inspect
their own pending course file. Large files upload directly to Storage with the
existing Firebase caller JWT; server completion checks actual stored bytes,
signatures, MIME, size and ownership before readiness. This avoids the hosting
platform request-body limit without exposing privileged credentials. Course upload
revocation is rechecked, and the new path does not relax submission permissions.
Failed uploads/attachments attempt scoped cleanup and report retained asset IDs if
cleanup is unavailable. Detaching a resource preserves the stored asset for reuse
and trusted maintenance; it does not silently delete a shared file.

## Local verification

- Application check: 123 tests, TypeScript, architecture and lint pass. Lint retains
  the seven existing unrelated warnings.
- All 21 migrations replay successfully against disposable PostgreSQL/PGlite.
  Both a seeded foundation upgrade and fresh install/seed order pass the suites.
- Existing nine SQL suites: 387 assertions pass. New Lessons rollback suite:
  72 assertions pass, covering tenant/draft isolation, teacher/editor rights,
  student mutation denial, offering-specific progress, stale revisions, ordering,
  resource visibility, guarded cleanup and migration-17 restrictions.
- Native PostgreSQL: the ten existing Exams races plus six new independent-session
  lesson races pass: concurrent initial progress, concurrent module creation,
  save/unpublish serialization, competing stale teacher edits and both outcomes of
  an attachment/cleanup race. No connected development DB is used by this harness.
- Firebase/Supabase and Clerk/Prisma builds use isolated ignored output directories.
  Both final builds passed (exit 0), with no production configuration change.
- The ten rollback SQL suites also ran against development after migration:
  459 assertions passed (387 existing and 72 Lessons). No fixtures persisted from
  these suites. Anonymous RPC execution is denied; public write wrappers remain
  SECURITY INVOKER and checked private implementations have empty search paths.
- The three new public tables have RLS, authenticated SELECT-only grants and no
  anonymous access. Organization creator definitions and denied EXECUTE privileges
  match the pre-migration snapshot. Existing blocks, original lesson progress,
  assessment attempts and organization row digests match before/after cleanup.
- Database table types for the three new tables were regenerated from the applied
  development schema, preserving existing application RPC contracts.
- Final advisors: no new actionable security warnings. Six private tables have
  intentional default-deny RLS ([advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).
  The pre-existing Supabase Auth [leaked-password warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
  remains; this application uses Firebase Authentication. Six unused-index INFO
  findings remain on existing tables; indexes were retained for their FK/query paths
  ([advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)).

Evidence and credentials are Git-ignored under `.local/step04/`; no secrets,
private manifests, browser tokens, build outputs or synthetic media are committed.

## Authenticated development acceptance

Clean Chromium used actual Firebase password sign-in and the existing verified
Firebase-to-Supabase onboarding, with one disposable teacher, assistant and student.
Trusted setup created two synthetic tenants atomically with active owners; the
assistant was explicitly assigned course-editor permission in the first tenant.
No fabricated identity mapping or service-role browser client was used.

Passed:

- Teacher browser creates a course, module, Week curriculum grouping, lesson and
  three parts; empty-state actions persist. Assigned assistant edits a published
  part through the existing V2 title editor.
- Teacher uploads a real synthetic MP4, PNG thumbnail and PDF through the actual
  private Storage flow. Draft preview includes the video without learner writes.
  Contextual assistant uploads are also authorized; another tenant remains denied.
- Checked operations publish parts, lessons and the course, persist descriptions,
  reorder the complete part set and reject a stale writer with HTTP 409.
- Student sees only real published cards; the draft part is absent. Actual private
  MP4 playback advances, pause/explicit save stores position 12 seconds, and refresh
  restores that position. The thumbnail loads and the authorized PDF returns PDF bytes.
- Part completion, next/previous parts, next/previous lessons and aggregate lesson
  completion work. Self-Learning status reflects actual part history.
- Draft and cross-tenant direct URLs are denied, as are direct student author
  writes, private foreign media metadata/signing and new media/progress writes after
  unpublication. Expired enrollment denies lesson, PDF, media and progress.
- Invalid URLs and file signatures fail validation. Failed native playback shows
  an explicit error. Logout blocks direct authenticated lesson access; earlier
  refreshes restored the active session. No student JavaScript exceptions occurred.
- Desktop (1440/1280 wide) and mobile (390 wide) learner/player/editor layouts were
  captured and checked for horizontal overflow after loading overlays cleared.
- Existing Exams listing/detail load, one-attempt submission releases its allowed
  result and a direct extra start is denied. Existing Exams SQL/concurrency tests pass.

Browser testing exposed upload controls becoming available before a refreshed
revision arrived. The editor now keeps controls busy through the React refresh
transition; sequential thumbnail/PDF uploads then passed. Early denial assertions
expected HTTP 403 where the app intentionally masks inaccessible courses with 404;
those assertions were corrected, without relaxing application authorization.
Existing development console warnings about the inherited boolean inert attribute
and deprecated image configuration remain; no student JavaScript exception occurred.

Screenshots (ignored local evidence): `acceptance/student-desktop-final.png`,
`student-mobile-final.png`, `teacher-desktop-final.png`,
`teacher-mobile-final.png`, `student-video-resume.png` and `exams-regression.png`
under `.local/step04/`.

## Verified fixture cleanup

Run `c4790087-0d70-47f1-91f6-5ed5279984b1`: six exact course-media objects were
removed with uploader authorization through the Storage API. A privileged query
confirmed zero remaining objects before dependent record cleanup. No Storage
metadata was deleted with SQL. A guarded transaction was first dry-run/rolled back,
then committed for only the recorded synthetic two tenants, two courses, two
modules, three lessons, five parts, one offering enrollment, one quiz/schedule/
attempt, media metadata and three verified profiles/mappings. Firebase sessions
were revoked before cleanup and all three exact Firebase identities were deleted
and independently confirmed absent. No real account or academic record was changed.

The final baseline is eight profiles, two original organizations, one original
block, one unchanged original lesson-progress row, one compatibility part and one
preserved segment-progress row; no assessment attempts remain, matching baseline.

## Explicit limitations and remaining validation

- External iframe providers do not expose reliable playback position here; students
  use explicit completion. Native MP4 supports position resume. Ordinary media
  controls and signed URLs provide no DRM or screen-recording prevention.
- A previously issued signed URL can remain usable until its 10-minute expiry;
  revoked enrollment prevents new authorization. Downloaded files cannot be revoked.
- Uploads for the new flow are bound to an explicitly authorized course through a
  private scope record. An active organization assistant with course-editor
  assignment can upload there; unrelated courses/organizations remain inaccessible.
- MP4 limit is the existing 50,000,000-byte bucket bound; PDFs are 20 MiB and images
  5 MiB at the application boundary. MIME signatures and ownership are checked.
- Homework authoring, submissions, marking and submission-gated solutions require
  a separate Homework milestone. Firebase lesson parts expose no broken legacy
  homework controls. The Clerk fallback remains unchanged.
- Authenticated browser coverage is Chromium desktop plus mobile viewport, not
  physical devices or Firefox/WebKit. External YouTube/Vimeo source normalization
  is tested; provider availability is outside this app. The eight-minute signed
  video refresh is implemented, but no long-duration soak/load test was performed.
- Production, load testing and any production data backfill are outside this approval.

## Recovery boundary

Do not drop new tables or reset the DB to roll back application behavior. Keep
existing academic records intact and switch back to the preceding application
branch if needed. Privilege/policy corrections require an additive reviewed
migration. If Storage cleanup fails, retain the exact archived asset/object and
report it for scoped trusted cleanup; never delete `storage.objects` with SQL.

## Changed files (40)

- `app/(dashboard)/(routes)/courses/[courseId]/chapters/[chapterId]/page.tsx`
- `app/(dashboard)/(routes)/teacher/courses/[courseId]/chapters/[chapterId]/page.tsx`
- `app/(dashboard)/_components/learning-part-page.tsx`
- `app/(dashboard)/_components/secure-lesson-page.tsx`
- `app/(dashboard)/_components/teacher-editor.tsx`
- `app/(dashboard)/_components/website-pages.tsx`
- `app/api/learning/[courseId]/[action]/route.ts`
- `app/api/learning/[courseId]/blocks/[resourceId]/route.ts`
- `app/api/learning/[courseId]/resources/[resourceId]/route.ts`
- `docs/step04-lessons-implementation.md`
- `frontend/features/courses/lesson-card.tsx`
- `frontend/features/courses/lesson/lesson-blocks.tsx`
- `frontend/features/courses/lesson/lesson-tabs.tsx`
- `frontend/features/courses/lesson/secure-player.tsx`
- `frontend/features/teacher/chapters/editor/learning-editor.tsx`
- `frontend/features/teacher/courses/course-editor.tsx`
- `frontend/lib/lesson-upload.ts`
- `middleware.ts`
- `package.json`
- `scripts/exam-sql-local.cjs`
- `scripts/lesson-concurrency.cjs`
- `scripts/lessons.test.cjs`
- `scripts/student-portal.test.cjs`
- `scripts/website.test.cjs`
- `server/http/lesson-resource.ts`
- `server/http/lessons.ts`
- `server/repositories/website.ts`
- `server/services/lesson-blocks.ts`
- `server/services/lesson-media.ts`
- `server/services/lessons.ts`
- `server/services/website.ts`
- `shared/contracts/dashboard.ts`
- `shared/contracts/database.types.ts`
- `shared/contracts/lessons.ts`
- `shared/v2-learning-model.ts`
- `shared/website-routes.ts`
- `supabase/migrations/20261013141230_complete_lesson_workflows.sql`
- `supabase/seed.sql`
- `supabase/tests/authorization.sql`
- `supabase/tests/lessons.sql`
