# CHANGELOG_FOR_MERGE — Exams, Delivery 1 (Foundation)

## Baseline
- Repository: `https://github.com/EduLabs-LMS/EduLabs-LMS`
- Branch: `collab/v2-integrated-ui`
- Baseline commit SHA: `230b413cdcc40308c3748879c38b0d16e071b7b4` — **verified**: the uploaded ZIP contained `.git`; `git rev-parse HEAD` returned this SHA and the working tree was clean before any change. (`.git` is **not** included in the returned ZIP, so the changes appear as an uncommitted diff on that baseline.)
- Task: 1 and 2 (see status below)
- Delivery: 1 of 6
- Completion status: **Task 1 complete. Task 2 partially complete** (identity/page layer and data adapters done; runner, results, builder and grading components deliberately not yet adapted because they need backend contracts — see below).

## Implemented

### Task 1 — Navigation and listing
- **Sidebar:** the live sidebar (`frontend/components/sidebar.tsx`) *already* had an active `Exams` link to `/exams` with no SOON badge at this baseline, so it was not modified. The "Coming Soon" badge only existed in `frontend/features/dashboard/sidebar-routes.tsx`, which nothing imports (dead code); I changed only its Exams entry to `href: '/exams'` with no badge. The Sessions item is untouched in both files.
- **`/exams` under Firebase:** previously redirected to `/unavailable` (page-level *and* in `middleware.ts` via `isPhaseOneRoute`). Now:
  - `shared/website-routes.ts` allowlists `/exams` and `/exams/<uuid>` (nothing else under `/exams`).
  - `/exams` renders a real listing from Supabase (`offering_assessments` + `assessments` + `course_offerings` + `courses`, the viewer's own `assessment_attempts`, and question counts), all with the caller's JWT so **RLS stays authoritative**.
  - Shows title, course/offering, type, instructions, time limit (null = "No time limit"), attempts allowed, question count, window, and a derived state (Not started / In progress / Time expired / Submitted / Graded / Opens later / Closed). Icons + text, not colour alone.
  - Loading (`exams/loading.tsx` skeleton), empty, error (safe message + retry link), partial-list (safety cap) states.
- **`/exams/[examId]`:** read-only detail page (config, window, the student's own attempt history, released mark only if staff-finalized). It deliberately has **no Start/Continue button**: starting an attempt consumes one and starts the server clock, which must not happen without the runner UI (Delivery 2).
- Staff (any offering capability via `offeringCapability`; this is narrower than the dashboard layout's test, which also counts course capability) see a **read-only** overview with an explicit "awaiting backend integration" notice.

### Task 2 — Adapt existing frontend to Firebase/Supabase
Done:
- Firebase-mode exam pages no longer touch Clerk, Prisma, or `/api/exams/*`. Identity = verified Firebase session via `getWebsiteContext()`; data = request-scoped Supabase client.
- Added a read-only data adapter (`server/repositories/exams.ts`, `server/services/exams.ts`) and a typed contract (`shared/contracts/exam-listing.ts`).
- Documented every missing `/api/exams/*` endpoint and its mapping to existing RPCs / new contracts (next section).

Not done (intentionally, per the brief):
- `exam-runner.tsx`, `exam-result.tsx`, `exam-builder.tsx`, `exam-grading-panel.tsx`, `exams-view.tsx` are **unchanged**. In Firebase mode they cannot work: `frontend/lib/api.ts` blocks `/api/exams*` (and `scripts/v2-transplant.test.cjs` asserts that), and their data model differs (below). I did not weaken that guard.
- No retry behaviour, answer review, grading, uploads, or config editing is shown or simulated.

What remains: Deliveries 2–6 (Part D of the brief) — all still required.

## Modified Files
| File | Change |
|---|---|
| `app/(dashboard)/(routes)/exams/page.tsx` | Firebase branch renders `<WebsiteExams />` instead of redirecting to `/unavailable`. Legacy Clerk branch left intact (matches the repo's dual-mode pattern used by `/home`, `/self-learning`, `/group`). +2 lines. |
| `app/(dashboard)/(routes)/exams/[examId]/page.tsx` | Same pattern → `<WebsiteExam examId=… />`. +2 lines. |
| `shared/website-routes.ts` | Added `/exams` and `/exams/<uuid>` to `isPhaseOneRoute`. **Security-relevant (middleware allowlist) — please review.** |
| `frontend/features/dashboard/sidebar-routes.tsx` | Dead file: Exams entry gets `href: '/exams'`, badge removed. |

## Added Files
| File | Purpose |
|---|---|
| `shared/contracts/exam-listing.ts` | Types + pure helpers (`deriveExamListState`, `formatTimeLimit`, `formatAttempts`). |
| `server/repositories/exams.ts` | Read-only, RLS-scoped queries. No RPCs, no writes, no answer-key columns. |
| `server/services/exams.ts` | Viewer/staff resolution + `loadExamList()` / `loadExam(id)`. (Needed so `app/` doesn't import `server/integrations`, which `npm run check:boundaries` forbids.) |
| `app/(dashboard)/_components/website-exams.tsx` | Server components `WebsiteExams` / `WebsiteExam` (kept out of `website-pages.tsx` to avoid merge conflicts). |
| `frontend/features/exams/exams-list.tsx` | Presentational list/detail/error/not-found views, V2 card styling reused from `ExamsView`. |
| `app/(dashboard)/(routes)/exams/loading.tsx` | Loading skeleton. |
| `scripts/exams-foundation.test.cjs` | 6 tests (see Tests). **Not added to the `npm test` script** to avoid touching `package.json`; run it directly or append it to the list. |
| `CHANGELOG_FOR_MERGE.md` | This file. |

## Deleted Files
None.

## Backend/API Dependencies

### A. What the existing frontend expects vs. what exists
| Existing frontend call | Status | Maps to |
|---|---|---|
| `GET /api/exams` (list; student & staff) | **Replaced** for reads by the server adapter above (no HTTP endpoint needed). | RLS reads |
| `GET /api/exams/:id` (run state) | Blocked → Delivery 2/3 | needs `get_assessment_run_state` (new) + reads of `assessment_questions`/`assessment_options` (exist, keys excluded) |
| `POST /api/exams/:id/start` | Blocked → Delivery 2 | **Reusable:** `start_assessment_attempt(p_offering_assessment_id) → uuid` (existing) — but see Known Issue 1 before wiring |
| `PUT /api/exams/:id/answers` | Blocked → Delivery 2 | **Reusable:** `save_assessment_response(p_attempt_id, p_question_id, p_response jsonb, p_media_asset_id)`. Response shapes: choice types `{"option_ids":[uuid]}`, numeric `{"value":n}`, short_text/essay `{"text":"…"}`, file_upload requires `p_media_asset_id` |
| `POST /api/exams/:id/submit` | Blocked → Delivery 2 | **Reusable:** `submit_assessment_attempt(p_attempt_id)`; trigger `grade_on_submission` auto-grades |
| `POST /api/exams/:id/decision` | Blocked → Delivery 3 | **New RPC** `decide_assessment_retry` |
| `exam-result` data | Blocked → Delivery 4 | **New RPC** `get_assessment_review`; existing `get_assessment_results` only works for `status='graded'` and returns no selections/keys |
| `GET /api/exams/:id/grading`, `PATCH …/grading/:sessionId` | Blocked → Delivery 5 | **Reusable:** staff can already read attempts/responses via RLS; `grade_assessment_response(p_response_id, p_points, p_feedback)`, `finalize_assessment_grade(p_attempt_id)`; images via `media_assets`/`can_download_media` |
| `POST/PUT/PATCH/DELETE /api/exams…` (builder, publish, delete) | Blocked → Delivery 6 | Largely achievable with existing RLS grants (`assessments`, `assessment_questions`, `assessment_options`, `offering_assessments` update of `time_limit_seconds,max_attempts,published`), plus `set_assessment_answer_key` for numeric keys. Needs a Codex-approved server adapter and the validation migration below |

### B. New backend contracts requested from Codex (not implemented here)
All must derive identity from `auth.uid()`, be `security definer` with fixed `search_path`, and never return per-question correctness before release.

1. **`decide_assessment_retry(p_offering_assessment_id uuid, p_decision text)`** — `p_decision ∈ ('view_final','retry')`.
   - Persists one decision row per (student, offering_assessment) (**needs a migration/table**), idempotent for the same decision, rejects the opposite once set, rejects if exam not in "retry pending", never creates attempt 3.
   - `retry` → records decision and creates/returns Attempt 2 (reuse `start_assessment_attempt` internally). `view_final` → permanently declines and finalizes.
   - Returns: `{ status, attempt_id? }`. Auth: enrolled, active student, own attempts only.
2. **`get_assessment_run_state(p_offering_assessment_id uuid) → jsonb`** — `{ state, attempts_used, max_attempts, current_attempt_id, attempt_number, deadline_at, server_now, retry_status ('none'|'pending'|'accepted'|'declined'), finalized, mcq_has_mistakes (bool, only while retry is pending), written_status ('none'|'under_correction'|'graded'), mcq_score?/mcq_total? (only when release rules allow) }`. No question ids, option ids, or per-question flags. Reusable: attempt/deadline logic in `start_assessment_attempt`. Needs the decision table.
3. **`get_assessment_review(p_offering_assessment_id uuid) → jsonb`** — only after finalization **and** release authorization; returns for each question: correct option ids, the student's actual selections per attempt (`attempt_number → option_ids`), awarded points/feedback. Existing `private.get_assessment_answer_keys` is staff-only and cannot be reused for students.
4. **Finalization rules** (server-enforced; frontend only displays): finalize on submit when `max_attempts=1`; when no auto-graded mistakes on attempt 1 (**define whether unanswered MCQs count as mistakes** — unanswered questions currently have *no* `assessment_responses` row, so `auto_grade_attempt` never scores them); on `view_final`; on attempt-2 submit. Introduce a state distinct from today's `status='graded'` (which means *staff released results*), so "Finalized" (no more attempts) can coexist with "Under Correction".
5. **Config validation migration** — `max_attempts IN (1,2)` (currently nullable and any `>0`; `NULL` means unlimited attempts), `time_limit_seconds IS NULL OR >= 60` (currently any `>0`). Decide handling of existing rows. Admin updates currently go straight through the `offering_assessments` column grants, so DB-level validation is required.
6. **Student upload for file_upload questions** — reuse `media_assets` (`kind='submission'`, `lms-submissions`), `complete_media_upload`, `can_download_media`; confirm the response→attempt/student association and that staff-only signed access covers the correcting admin.

### C. Data-model mismatches to resolve in Deliveries 2–6
- Old model: one `Exam` with `durationMinutes`, `maxAttempts: 1|2`, `MCQ|WRITTEN` and **choice indexes**, UploadThing `imageUrl`. New model: `assessments` (course) + `offering_assessments` (per offering; **the exam "id" for students is the `offering_assessments.id`**), `time_limit_seconds`, nullable `max_attempts`, six question types, **option UUIDs**, `media_assets`. `shared/contracts/exams.ts` and `shared/exams.ts` are unchanged; the runner/result/builder need an adapter or contract change.
- `shared/exams.ts` already contains the exact retry prompt string (`RETRY_PROMPT`) and `attemptLabel` (`1st Try`/`2nd Try`) for reuse in Deliveries 3–4.

## Tests and Verification
Environment: Node 22, **no `node_modules`, no network, no database, no browser**.

Run and passing:
- `node scripts/check-boundaries.cjs` → **passed** (it initially flagged my first draft for importing `server/integrations` from `app/`; fixed by adding `server/services/exams.ts`).
- `node --test scripts/exams-foundation.test.cjs` → **6/6 pass**: state derivation (incl. unlimited, expired deadline, outside window, submitted after close), time/attempt formatting (null = unlimited), middleware allowlist (only `/exams` and `/exams/<uuid>`), repository never selects answer-key columns or reads `assessment_options`, attempts are filtered to the viewer's profile id, student view filters `published=true`, rows hidden by RLS are skipped rather than fabricated, empty result.
- Existing suite (14 files): 65 pass / 8 fail with my changes, **the same 8 fail on the untouched baseline** (`Cannot find module 'zod'` / `'postcss'`, caused by the missing `node_modules`). `firebase-auth` (middleware) and `v2-transplant` (incl. the `/api/exams` guard) pass.
- Syntax-level transpile check of every new/changed `.ts/.tsx` file → OK.

**Not run (must be run by Codex):** `npm run typecheck`, `npm run lint`, `next build`, and any rendering of the new components. Type-correctness against `database.types.ts` and lucide-react icon names has **not** been verified by a compiler. No test touched a real Supabase instance, so RLS behaviour of the new queries (student sees only published/enrolled rows and own attempts) is verified by reading the migrations, not by execution.

Acceptance scenarios (Part F): Navigation — implemented, unverified in a browser; Duration/Attempts display — implemented (display only); **everything else (retry logic, answer review, written answers, timer, admin grading, backend enforcement) — Pending.**

## Known Issues
1. **Security finding for Codex (existing backend):** `start_assessment_attempt` creates the next attempt whenever the previous one is submitted and `attempt_number <= max_attempts`. With `max_attempts = 2`, a student can call this RPC directly right after attempt 1 and start attempt 2 with **no retry decision recorded**. The retry-decision contract must gate this server-side before any runner UI starts attempts. Likewise `max_attempts IS NULL` allows unlimited attempts.
2. The listing deliberately offers **no Start/Continue/second-attempt action** yet; students with a submitted attempt 1 on a 2-attempt exam see only status.
3. `TIME_EXPIRED` is a label derived from the client-visible `deadline_at`; the backend closes/grades such an attempt on the next start request. The displayed clock is only used to pick a label; enforcement stays server-side.
4. Staff detection: anyone with offering capability gets the read-only staff view, even if they are also enrolled as a student in another offering.
5. All assessment types (`quiz`, `exam`, `assignment`, `practice`) that are published and scheduled are listed, with the type shown. **Product decision needed:** whether `/exams` should show only `exam` (and maybe `quiz`).
6. "Released mark" is shown only for attempts with `status='graded'` (staff-finalized), per the rule against showing an unconfirmed total. Whether `finalize_assessment_grade` requires all essays graded first is not enforced/verified here.
7. Lists are capped at 100 schedules / 2,000 question rows / 500 attempts; a notice is shown when truncated.
8. Legacy Clerk branches in `exams/page.tsx` and `[examId]/page.tsx` remain for non-staging builds (repo-wide pattern). Remove together with the other pages when Clerk is retired.
9. Visual/responsive appearance was **not** checked in a browser.

## Integration Notes
- **Middleware allowlist** (`shared/website-routes.ts`): opens `/exams` and `/exams/<uuid>` in Firebase mode. If Codex later adds `/api/exams/*` handlers, `middleware.ts` currently returns 503 for any `/api/*` not allowlisted, and `frontend/lib/api.ts` blocks them client-side — both would need explicit, reviewed exceptions. I did not add any.
- `app/(dashboard)/_components/website-pages.tsx`, `server/repositories/website.ts` and `server/repositories/lms.ts` are untouched (I added separate files instead) to minimise conflicts. `server/repositories/lms.ts` already wraps `startAttempt/saveResponse/submitAttempt/gradeResponse/finalizeGrade/results` and should be reused for Deliveries 2 and 5 rather than duplicated.
- No migrations, RLS, grants, RPCs, `package.json`, lockfile, or env files were changed.
- Missing files in this ZIP are **not** deletions.

## Continuation summary (for another Claude session)
Delivery 1 is finished. Next: **Delivery 2 (runner + timer)** once Codex confirms Known Issue 1 and contract B.2. Start by adapting `ExamRunner` to `ExamListItem.id` (offering_assessment id), option UUIDs, and the `save_assessment_response` payload shapes in section A; keep the server `deadline_at`/`server_now` as the only timer source. Reuse `server/repositories/lms.ts` for RPC calls via a new server service, and add the exact routes to the middleware/`api.ts` allowlists only with Codex approval.
