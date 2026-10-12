# Step 03A: secure exam attempts and results — approval proposal

Historical design record: approved by the owner and now implemented and validated on development.
See [implementation and validation](step03a-exams-implementation.md) for current
status. The proposal-stage statements below describe that earlier checkpoint;
they are retained as history, not the current implementation status.

## Verified starting point and scope

- Base: `collab/v2-integrated-ui`, `053a750575660c4d414c901d92abddae827831e7`.
- Isolated working branch: `codex/step03a-secure-exam-attempts`.
- Development project inspected read-only: `gmvouqgjbtbkbhrdruzu`.
- Local and applied histories contain the same 17 migrations, including
  `20261011184623_restrict_organization_creation.sql`. Preserve all 17 unchanged.
- Live inventory at audit: zero assessment attempts and responses; two schedules,
  both with maximum attempts 2 and duration 1,800 seconds. One assessment and one
  question exist. No existing assessment data was modified or exported.
- No assessment table is currently in a Realtime publication. The examined
  assessment-dependent private media-cleanup view is security-invoker and does
  not grant learners a separate disclosure path.

This slice prepares the database foundation and necessary read adapters. It does
not enable ExamRunner, add teacher UI, change animations, implement homework or
practice workflows, or change Firebase provisioning. Application writes continue
to use the verified Firebase identity and caller-scoped Supabase JWT.

## Findings and evidence

| Surface | Verified behavior | Consequence |
| --- | --- | --- |
| `assessment_attempts` | Authenticated has SELECT on every current column, including `score`, `max_score`, `graded_at`, `graded_by`. Own-row RLS permits the student row. | A permitted student's direct REST/SQL read bypasses React's score stripping. This is a confirmed privilege defect; no actual student score was accessed because there are no attempts. |
| `assessment_responses` | Column grants already exclude `awarded_points`, `feedback`, `graded_at`, `graded_by`. | Preserve these restrictions. Staff must use authorized RPCs for these fields too. |
| Options and keys | `assessment_options.is_correct` is not selectable by authenticated. Private answer keys and `get_assessment_answer_keys` require contextual grading permissions. | No student key bypass identified in the inspected paths. Keep the staff-only key boundary. |
| Question settings | Live CHECK permits only placeholder, length and file-validation keys; no stored settings exist currently. | No demonstrated answer-key leak here. Retain the allowlist and keep numeric answer keys private. Do not move answer keys into settings. |
| `start_assessment_attempt` | Serializes starts by schedule/user, resumes an unexpired attempt, increments attempt number after submission; limits apply only when `max_attempts IS NOT NULL`. | Direct Attempt 2 start bypasses a retry decision. NULL permits unlimited attempts. |
| `auto_grade_attempt` | Iterates existing response rows only. | A question with no response row receives no explicit unanswered evaluation. |
| `finalize_assessment_grade` | Checks ungraded existing responses, then sums them; does not require coverage of every question. | It can finalize an incomplete paper without explicitly accounting for missing answers. |
| `get_assessment_results` | Own active user may read a `graded` attempt; staff use offering permissions. | Grading and release are conflated. Attempt 1 feedback/marks can be disclosed while another attempt remains possible. |
| Submission/expiry | Save locks attempt and checks deadline; submit is idempotent; start lazily submits an expired attempt. | Useful foundations, but no persistent exam-wide retry/finalization state. Expiry must not accidentally create Attempt 2. |
| History | Content/schedules/keys are protected from editing once attempts exist. | Retain clone/version strategy and immutable submitted answers; preserve both attempts. |

The existing functions have empty search paths and qualified object references.
Public wrappers are invoker functions; private implementations are definer
functions. Intentional RPCs are executable by authenticated, not anonymous;
internal grading helpers are not authenticated-callable. Authorization must
remain inside private implementations, including for direct SQL invocation.

`private.can_support_offering` currently includes contextual offering assistants
with active organization membership. This proposal preserves those existing
grading permissions; it does not create global staff access or expand roles.

Application impact: `server/repositories/exams.ts` selects scores before filtering
them, and `server/repositories/lms.ts` selects all attempt columns. Both must change
with the privilege change, otherwise column protection correctly causes errors.
Theoretical maximum marks remain derivable from published question points; hiding
the stored `max_score` field does not make that public arithmetic secret.

## Proposed migration 18

Proposed descriptive name: `secure_exam_attempts_and_results`. Allocate its real
timestamp only when implementation is approved. The following is a concrete
object/change specification, not reviewed executable migration SQL. Final SQL,
its diff, and test evidence must be reviewed before remote application.

### 1. Close direct disclosure

Revoke table-wide attempt SELECT from authenticated and any PUBLIC/anon path;
revoke explicit protected-column grants as well, then grant only this whitelist:

```sql
GRANT SELECT (
  id, offering_assessment_id, user_id, attempt_number,
  started_at, deadline_at, submitted_at, status, created_at, updated_at
) ON public.assessment_attempts TO authenticated;
```

Keep own/staff row RLS and the restrictive trusted-identity policy. Do not grant
table-wide SELECT back to staff: they use the same authenticated database role
as students, so contextual staff grade access belongs in checked RPCs. Preserve
response/option column restrictions, private-key grants and existing write
restrictions. Verify effective inherited privileges, not just literal ACL entries.

Neither a security-definer public view nor a policy exposing graded rows is a
substitute for these column privileges. [Supabase column-security guidance](https://supabase.com/docs/guides/database/postgres/column-level-security)
explains why table-level SELECT overrides individual column revocations.

### 2. Persist exam-wide state privately

Add `private.assessment_participations`, one row per exam/quiz schedule and user:

- UUID primary key; schedule/user FKs with RESTRICT; UNIQUE(schedule_id,user_id).
- `max_attempts` snapshot CHECK IN (1,2); duration snapshot NULL or >=60 seconds.
- `attempts_state`: `in_progress`, `retry_decision_pending`, `retry_accepted`,
  `finalized`. No row means not started.
- `retry_decision`: NULL, `accepted`, `declined`, `not_eligible`, `window_closed`;
  decision timestamp. Acceptance is irreversible and remains recorded after
  Attempt 2 starts. `retry_accepted` means accepted but not started yet.
- `final_attempt_id` nullable FK RESTRICT; `finalized_at` nullable timestamptz.
- `grading_state`: `pending` or `complete`; `released_at`, `released_by` nullable.
- `review_released_at`, `review_released_by` nullable, independently controlled.
- BIGINT revision >=0; created/updated timestamptz using the existing touch helper.
- CHECKs tying finalization, decision, release and grading fields together.

Enable RLS, revoke direct access from PUBLIC/anon/authenticated and do not expose
the private schema through the Data API. Internal helpers alone access this row.
Add a nullable participation FK to attempts: required by an integrity trigger for
exam/quiz attempts; other assessment types keep their existing workflow. Enforce
schedule/user/participation consistency with a composite FK and referenced unique
key, not an application-only check. Final-attempt ownership and number must also
be checked by an integrity trigger. Index non-leading FK/query paths after
checking existing PK/unique indexes for redundancy.

Keep attempt `status` values for compatibility: `graded` means grading complete,
not permission to release. A student-facing state is derived from participation:

| State | Meaning |
| --- | --- |
| In progress | A current attempt accepts answers before its effective deadline. |
| Submitted | Attempt answers are frozen and evaluated in one transaction. |
| Retry decision pending | First paper has objective errors and another start is still possible; no marks or question-level correctness returned. |
| Retry accepted/declined | Permanent decision; accepted permits exactly one additional attempt, declined finalizes Attempt 1. |
| Attempts finalized | No more attempts; identifies the paper used for the total. |
| Under Correction | Attempts finalized, but at least one supplied subjective answer awaits grading. |
| Graded, not released | All final-paper questions accounted for, result still withheld. |
| Released | Final total authorized; answer review can remain withheld separately. |

### 3. Evaluate every question, including absent responses

Add private `assessment_question_outcomes`: composite PK(attempt_id,question_id),
RESTRICT FKs, RLS enabled, no direct learner privileges. Record the frozen paper's
evaluation for every question, including questions with no response row:
`correct`, `incorrect`, `unanswered`, `pending_manual`, `invalid_key` plus awarded
points nullable, evaluation/grading metadata and timestamps. Validate question
belongs to the attempt's assessment. Use existing response grade fields for
supplied answers; update outcome and response atomically from grading RPCs and
reject inconsistencies. Outcomes are completeness records, not a second editable
answer store. A missing response is never fabricated as a student's selection.

Use the existing exact-set choice grading and numeric tolerance rules. Objective
types are single/multiple choice, true/false and numeric. Subjective types remain
short_text, essay and file_upload. An unanswered objective question scores zero
and qualifies for the opaque retry prompt. A supplied subjective answer remains
pending manual grading; it is never counted as objectively correct. Proposed
blank-subjective handling is zero without manual review (owner decision below).

Check objective keys before first start; reject malformed/missing keys generically
without returning their contents. If corruption is detected after start, retain
the answers, withhold release and flag a staff correction issue. Do not infer
correctness, silently deny retry eligibility or publish an incomplete total.

### 4. Settings and immutable history

For exam/quiz schedules enforce non-null maximum attempts IN (1,2) and duration
NULL or >=60 seconds using a shared validation helper invoked by schedule writes,
assessment-type changes and starts. Cross-table type rules cannot be ordinary
CHECK subqueries. Leave assignment/practice settings semantics unchanged.
Preflight invalid exam/quiz settings and abort rather than silently clamp them.

Retain the existing assessment-history immutability triggers for questions,
options, keys and schedule settings. Freeze saved selections after submission;
Attempt 2 gets separate response rows. Preserve every attempt for future visual
history. If shuffle is requested, persist an immutable private presentation order
per attempt and return only that attempt's order; refresh must not reshuffle.
No snapshot of an entire lesson/course tree and no binary data in PostgreSQL.

## RPC proposal and contracts

All new public wrappers: SECURITY INVOKER, `SET search_path=''`; checked private
implementations: SECURITY DEFINER, same search path, fully qualified references.
Explicitly REVOKE PUBLIC/anon EXECUTE in the same migration before granting only
intended authenticated entry points. Internal evaluators get no authenticated
EXECUTE. Never accept a caller-supplied student ID for a student operation.

| RPC | Proposed behavior/return |
| --- | --- |
| `start_assessment_attempt(uuid) -> uuid` | Preserve signature. Resume same live attempt; first start as before; second only with accepted decision and still-open enrollment/window. No third attempt. Expired current attempt requires reconciliation; never auto-start a retry. |
| `save_assessment_response(uuid,uuid,jsonb,uuid DEFAULT NULL) -> uuid` | Preserve existing validation/media flow and return shape; serialize with exam state, no write after deadline/submission. Existing caller uses ordered saves. |
| `submit_assessment_attempt(uuid) -> void` | Preserve signature; freeze/evaluate entire paper, compute eligibility and transition participation atomically; repeated submit is a no-op. |
| `grade_assessment_response(uuid,numeric,text DEFAULT NULL) -> void` | Preserve contextual staff authorization; update response/outcome together, no grading mutation after released result. |
| `finalize_assessment_grade(uuid) -> void` | Require every question accounted for; complete grading only. Does not itself authorize subjective grade release. |
| `get_assessment_results(uuid) -> jsonb` | Staff preview remains scoped; exam/quiz student reads require finalized participation and released final result, never just attempt.status=graded. Keep existing envelope; withheld access returns generic denial. Other assessment types retain their existing graded-result gate through this RPC, while raw score columns are protected for all types. |
| `get_assessment_answer_keys(uuid) -> jsonb` | Remains staff-only. Student review uses a separate sanitized result projection. |
| **`sync_exam_participation(p_schedule_id uuid) -> jsonb`** | Authenticated POST/RPC; reconciles expiry under lock and returns safe current state. No browser timer authority. |
| **`decide_exam_retry(p_schedule_id uuid,p_decision text,p_expected_revision bigint) -> jsonb`** | `accept` or `decline`; one permanent compare-and-set decision. Same repeated choice returns committed state; opposite/stale conflicting choice returns conflict. |
| **`save_exam_response(p_attempt_id uuid,p_question_id uuid,p_response jsonb,p_media_asset_id uuid,p_expected_revision bigint) -> jsonb`** | Versioned wrapper over existing save rules; returns safe state/revision, handles duplicate identical save before stale-revision denial. Different stale content rejected. Explicit NULL response means clear answer before deadline. |
| **`release_exam_result(p_schedule_id uuid,p_user_id uuid,p_expected_revision bigint) -> jsonb`** | Contextual grading staff only; requires finalized attempts and fully graded final paper; idempotent. No global admin bypass. |
| **`release_exam_review(p_schedule_id uuid,p_user_id uuid,p_expected_revision bigint) -> jsonb`** | Staff-only, separately enables sanitized answer review after finalization/result release and review policy requirements. |
| **`get_exam_summaries(p_schedule_ids uuid[]) -> jsonb`** | Bounded read-only own-state/result projection for existing listings, respecting RLS-equivalent checks and release gate. No expiry mutations in page GET rendering. |
| **`get_exam_grading_detail(p_attempt_id uuid) -> jsonb`** | Contextual staff only; supplied answers, missing-question outcomes, private grading fields. Supports existing grading wrappers without granting raw grade SELECT. |

New names/signatures are proposed, not installed. Reconcile all actual parameter
names/overloads against generated types before implementing; revoke obsolete
overloads so an old signature cannot bypass the new gate. Legacy uuid/void RPCs
remain secure even if callers ignore the new state contract.

Safe state envelope (no points, error counts, incorrect IDs, answer keys, grader
IDs or feedback):

```json
{
  "schedule_id": "uuid", "revision": 4,
  "attempts_state": "retry_decision_pending",
  "retry_decision": null, "can_start": false, "can_decide": true,
  "current_attempt": {"id": "uuid", "attempt_number": 1, "status": "submitted", "deadline_at": null},
  "grading_state": "pending", "result_released": false, "review_released": false,
  "server_now": "ISO timestamptz"
}
```

Own selections can be returned separately for the current attempt; they do not
include correctness. Protected result fields are omitted until release. Released
total requires completed subjective grading. Review payload includes both attempts'
own answers, explicit absent selections, and correct answers only when review is
authorized. Staff preview must never be cached/shared into a learner projection.
The legacy results envelope keeps its shape, but question-level awarded points,
feedback and grading metadata stay NULL/omitted for a student until review release:
those fields can identify incorrect questions even without an explicit answer key.

Use SQLSTATE `PT409` for stale/conflicting transitions (HTTP 409); generic
permission denial for outsiders without disclosing existence. Compare-and-set
revisions cover all new state-changing calls. The final implementation must not
advertise exactly-once arbitrary legacy saves: that old signature lacks a revision;
it provides serialized writes with last accepted write winning before submission.

## Retry, deadline and release rules (recommended defaults)

1. Submission freezes all questions and evaluates eligibility internally. Only
   the boolean decision-pending state is disclosed. No incorrect identities or
   correct options are returned.
2. Prompt only for two-attempt exam/quiz, Attempt 1 with at least one objective
   wrong/absent answer, valid evaluation, and an open second-start window.
   Use the exact approved prompt; supplied essays remain pending independently.
3. Decline permanently finalizes Attempt 1. Accept authorizes exactly one
   Attempt 2. Attempt 2 is a fresh full paper with a fresh duration, bounded by
   the schedule close; no answer correctness carries into the run response.
4. Recommend final score from the final attempted paper, not a per-question best
   combination. Own prior selections remain in history; no automatic carry-forward
   of written answers or files into Attempt 2.
5. All-objective papers can release automatically once attempts finalize and all
   grades are complete. Subjective papers require staff finalize + explicit
   release. Declining with pending essay shows Under Correction, never a total.
6. Correct-answer/feedback review remains locked until explicit staff review
   release, after the schedule close when a close exists. Unlimited-window exams
   require explicit staff review release. Marks can release earlier without keys.
7. Deadline = earlier of schedule close and start + duration. NULL duration has
   no duration deadline, but schedule close still applies. Reject saves at or
   after the effective deadline using database clock time. A late submit only
   freezes already saved answers; no 20-second answer-writing grace despite the
   unused legacy UI grace constant. Decide this explicitly before runner wiring.
8. On expiry, reconcile like submission. If the first timer expired but the
   schedule remains open, an eligible retry decision is still possible. Schedule
   close ends pending/accepted-but-unused retry rights and finalizes Attempt 1.
   Attempt 2 timeout finalizes Attempt 2. Refresh never resets deadlines.

## Concurrency, authorization and transaction guarantees

- Start/decide/save/clear/submit/reconcile/grade/finalize/release use the same
  schedule+user advisory transaction lock, then participation/attempt row locks.
  Resolve IDs without locking first, acquire locks in a documented consistent
  parent-to-child order, re-read and authorize after waiting. Retain assessment/
  schedule and enrollment locking so content, enrollment and window changes cannot
  race writes. Grading triggers must not invert this lock order.
- Add a partial unique index for one in-progress attempt per schedule/user and
  preserve existing unique attempt numbering. Validate numbers 1/2 and decision
  linkage for exam/quiz attempts in integrity checks. Do not rely on the frontend.
- Submission, evaluation, missing-answer accounting and retry state commit
  together; no transient result is visible between them. Race: submit vs save
  serializes; answer either commits before freeze/deadline or is rejected.
- Concurrent accept/decline has one winner; loser gets 409. Repeated acceptance
  or decline returns the same decision. Concurrent second starts return the same
  attempt UUID, never two new rows. Failed grading rolls back the whole change.
- Do not update expiry and then throw inside the same transaction while claiming
  expiry persisted: PostgreSQL rolls it back. Dedicated sync commits reconciliation
  and returns state; legacy start denies an expired resume without promising a
  persisted transition. Subsequent sync/submit converges safely.
- Expiry is logically effective at its timestamp even without a background worker.
  Persist reconciliation on sync/submit/staff operations. No cron infrastructure
  required for this slice; an idle expired row may retain its old physical status
  until reconciliation, but cannot accept writes or bypass retry gates.
- Active enrollment is required to start/save/decide. Existing active-profile
  historical released-result access after enrollment suspension is preserved.
  Suspension cannot disclose withheld results. Internal expiry reconciliation
  must safely finalize stored answers even if enrollment is no longer active.
- Actor must be active and verified through `private.current_app_user_id()`.
  Contextual staff checks remain specific to the relevant offering/course/tenant.
  Anonymous, unverified Firebase identity and cross-tenant staff all fail closed.
- Keep existing ready/private-media validation, uploader/offering/type/size checks,
  payload limit and signed download authorization. Lock referenced ready assets
  during save to prevent a validation/cleanup race. No public bucket or service
  credential in browser code.

## Existing records, compatibility and rollout

There are currently no attempts to convert. Recheck immediately before applying:
if new attempts or invalid schedule settings appear, stop for a reviewed backfill
plan. Never automatically mark old grades released, choose a retry decision,
delete an attempt, clamp settings, or rewrite submitted answers.

For a future nonempty database, an owner-approved backfill must group attempts by
schedule/user, preserve all original rows, flag >2 attempts and inconsistent
history, and leave release withheld until individually reviewed. This is not
legacy Clerk/Prisma data migration and does not link old identities.

Replace attempt SELECT * and direct score reads with safe projections and checked
summary/results RPCs. Update generated TypeScript types, LMS result schemas and
exam-list state derivation together. A graded attempt alone must not render
GRADED/released in the UI. Existing read-only design stays intact; no runner/start/
retry/grading controls are enabled. Review payload integration is a later slice.

Deployment order must avoid broken reads: prepare/test both adapters and migration
against an isolated development database, coordinate development application
restart with privilege change, then verify direct API denial. Production rollout
requires separate approval. If application compatibility fails, fix/revert the
adapter while retaining column protection; do not restore vulnerable SELECT or
auto-release data as a rollback. New data/state should be preserved during repair.

## Detailed verification plan — not yet executed for migration 18

SQL suites should use synthetic fixture IDs, real role/JWT context, privileged
postcondition verification and ROLLBACK. No assumption that RLS-hidden means absent.

1. Privileges: anon/authenticated SELECT *, score/max_score/filter/order queries,
   response grade/feedback/grader fields and option correctness all denied;
   permitted raw metadata/own selections readable; protected RPC internals denied.
2. Role matrix: ordinary learner, another learner, owner, instructor, assistant,
   inactive membership, cross-tenant staff, unverified identity. Verify keys and
   grading previews only for existing contextual permissions, not global roles.
3. Release: in-progress, submitted, retry pending, accepted, declined, manually
   graded-but-unreleased, finalized-under-correction, released. Probe direct REST,
   nested selects and all old/new RPC signatures; no early marks/feedback/keys.
4. Retry: one attempt; perfect objective; wrong choice; unanswered with no row;
   numeric tolerance; all essay; mixed essay/objective; malformed keys. Assert
   prompt eligibility without per-question/count leakage, direct Attempt 2 denial,
   accepted single start, permanent decline, no Attempt 3, invalid NULL/>2 settings.
5. Completion: missing subjective zero policy; supplied subjective pending;
   partial manual grading; complete finalization; no omitted questions; score sum
   and max checks; no total under correction; no mutation after release.
6. Timing: exact deadline boundary, unlimited duration, schedule close, first/
   second expiry, accepted-but-unused retry, suspension, late submit and refresh.
   Assert clock is authoritative and errors do not pretend rolled-back expiry
   transitions persisted. No client clock/grace bypass.
7. Idempotency: duplicate starts/submits/decisions/releases; identical save retry;
   stale differing save and stale decision return 409; frozen-answer edits denied.
8. Integrity: cross-assessment question/participation/media, history edits and
   submitted deletes denied; attempts retain separate selections and attachment
   references; normal teacher course editor and migration 17 checks unchanged.
9. Multi-connection races: two starts; accept vs decline; two second starts; save
   vs submit/expiry; grade vs release; enrollment suspension vs save; simultaneous
   authoring lock. Use actual independent database connections, barriers and
   bounded lock timeouts. Single-transaction SQL tests are not concurrency proof.

Browser acceptance after separate development application approval: disposable
Firebase identities through normal verified onboarding, development-only teacher/
student enrollment and minimal exam fixtures. Keep passwords/tokens out of Git
and reports. Record exact fixture ownership; cleanup only those fixtures after
evidence collection. Test Chromium/Firefox/WebKit where installed; report actual
coverage. For this foundation slice use authenticated read-only pages plus direct
RPC/API harness; do not turn on ExamRunner merely to test the backend. Full runner
navigation/visual answer history acceptance follows its separately approved wiring.

Verify released and withheld listing/detail output, tenant denial, historical
results, logout/restoration, failed-vs-empty responses, and direct API calls using
the real student token. Full validation: all existing SQL suites (especially
authorization, hardening, Firebase identity, provisioning and teacher editor), new
exam security suite, `npm run check`, relevant exam tests, both Firebase/Supabase
and Clerk/legacy builds, `git diff --check`. Inspect security/performance advisors
after any separately authorized remote application. Do not claim passing tests
for this proposed implementation before it exists.

## Expected files

Proposed implementation scope, with exact list confirmed during implementation:

- `supabase/migrations/<timestamp>_secure_exam_attempts_and_results.sql` (18).
- `supabase/tests/exam-attempts-results.sql` (new), `authorization.sql`,
  `hardening.sql`, `concurrency.md`; other fixtures only if affected.
- `scripts/exam-attempts-results.test.cjs` and a concurrency harness (new);
  `scripts/exams-foundation.test.cjs`, `scripts/lms.test.cjs`,
  `scripts/firebase-sql-suite.cjs`, `package.json` to register coverage.
- `shared/contracts/database.types.ts`, `shared/contracts/lms.ts`,
  `shared/contracts/exam-listing.ts` and new typed RPC/state contract if needed.
- `server/repositories/lms.ts`, `server/repositories/exams.ts`, relevant existing
  LMS/exams service validation and result schemas.
- `docs/database-architecture.md`, this proposal and an implementation/validation
  report. No existing migration edits, new auth system, frontend redesign or
  unrelated dependencies. No legacy identity or data investigation.

## Owner decisions before implementation

Please approve or correct these proposed defaults:

1. **Scoring:** final attempted paper determines the result; Attempt 2 is a fresh
   full paper, with no automatic carry-forward of answers. Both histories retained.
2. **Release:** all-objective final results auto-release; supplied subjective
   answers require staff completion and explicit result release. A missing/blank
   subjective response is zero without a teacher needing to grade a nonexistent
   answer. Supplied subjective work is always pending, not objectively correct.
3. **Answer review:** explicit staff release, only after schedule close when set;
   keys/feedback remain hidden before that even if the total is released.
4. **Deadline:** strict database deadline, no answer-save grace; a fresh second
   duration remains bounded by schedule close; close forfeits unused retry rights.
5. **Settings scope:** enforce 1/2 attempts and >=1 minute/unlimited for exams and
   quizzes only; retain assignment/practice workflow semantics.

Approval stages: (a) approve/correct this design to prepare implementation and
local tests; (b) review exact final migration SQL and test evidence, then separately
authorize development application/isolated runtime fixtures; (c) review validation
before any commit/push/merge/deployment. No approval is inferred from this report.

## Checks performed for this proposal

`npm run check` passed on the isolated branch: existing application tests,
architecture boundaries, TypeScript and lint (zero errors; seven existing lint
warnings). No implementation-specific SQL regressions, concurrency tests, browser
acceptance or production builds were run for the proposed changes, because runtime
code and database changes have not been implemented. The only new file is this
document. The branch remains at the approved checkpoint with an uncommitted report.
