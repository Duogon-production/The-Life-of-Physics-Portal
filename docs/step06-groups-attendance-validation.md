# Step 06 — development migration and acceptance validation

October 14, 2026. Branch `codex/step06-complete-groups-attendance`, based on verified integration commit `e6530630257f832fe55785e2d860f77889fd048c`. PR #5 is merged and its approved Homework commit is an ancestor. Owner-approved development migration 23 is applied. Authenticated acceptance and exact fixture cleanup are complete; this report records the final development validation for PR review.

## Current development status

The owner approved the exact reviewed SQL under its original filename `20261013234230_complete_group_attendance_workflows.sql`. Supabase MCP applied it to development project **gmvouqgjbtbkbhrdruzu** and assigned migration version **20261014054726**. The Git filename now matches that actual version:

`supabase/migrations/20261014054726_complete_group_attendance_workflows.sql`

SHA-256 remains byte-for-byte unchanged:

`E1393DF9992D1D1853C630F97B203C346AC61F36982259DCBB87ECDB9E439D7B`

History contains exactly 23 migrations; the first 22 entries are unchanged. Immediate post-application comparison preserved all 78 original tables' counts, data digests, RLS and grants, all 156 original function definitions/grants and all 97 original policies. All twelve transactionally rolled-back development SQL suites passed, totaling 697 assertions. Generated database types have been refreshed while preserving nullable RPC argument contracts.

Four isolated Firebase identities were created and mapped through normal verified sign-in/onboarding for browser acceptance. Two synthetic tenants and narrowly scoped academic fixtures are recorded in an ignored local manifest. **Acceptance and exact cleanup are complete.** All four disposable Firebase identities were revoked/deleted and independently verified absent. Synthetic database records were removed with ownership guards; all original baseline counts/digests, grants, definitions and policies match. No Storage objects were created for Step 06.

The pre-approval sections below describe the reviewed implementation and local evidence. They are historical where they reference pending approval or remote testing; the current status above takes precedence.

## Schema and permissions

Six new public tables:

- `study_groups`: immutable offering ownership, delivery details, capacity, status and optimistic version.
- `group_staff`: explicit group assignments for existing offering staff; an unrelated assistant gains no access.
- `group_memberships`: enrollment-linked, server-timed membership intervals. One open assignment per user/offering; transfers preserve the old interval.
- `group_schedules`: normalized weekly Cairo slots, elapsed duration and a materialization cursor.
- `group_sessions`: stable dated occurrences, original timestamps, delivery snapshots, cancellation/exception flags and versioned attendance state.
- `session_attendance`: persisted eligible roster with `not_marked`, `attended` or `absent`.

One new private table, `private.group_audit`, stores actor, reason, timestamps and before/after snapshots for contextual changes. A null actor identifies a trusted system enrollment update rather than falsely attributing it to the original teacher.

All seven tables enable RLS. Public tables grant authenticated SELECT only, with contextual policies; no anonymous access or direct authenticated writes. Private audit data has no direct client grant. Writes use checked RPCs. UUID foreign keys, deliberate RESTRICT deletion, checks, a unique open-membership index, unique recurrence occurrence/weekly-slot indexes and query/FK indexes protect consistency. No bucket, Storage policy or binary storage is added.

Public SECURITY INVOKER RPCs, granted to authenticated only:

```
group_command(p_group uuid, p_action text,
              p_version integer default null, p_data jsonb default '{}') -> jsonb
group_view(p_group uuid default null, p_section text default 'sessions',
           p_page integer default 0, p_search text default '') -> jsonb
```

`group_command` returns group ID/version and, where applicable, session ID. It supports create/edit, archive/unarchive, staff assignment, add/remove/transfer, one-off creation, reschedule/cancel/restore and attendance save/finalize/reopen. Session mutations additionally require `sessionVersion` inside the payload. Stale writes raise `PT409`; permission failures use `42501`; invalid academic/state changes use constraint errors. HTTP maps these to safe 409/403/400 responses without SQL details.

`group_view` exposes bounded group/offering discovery, detail, real sessions, eligible/member/staff lists, audit and attendance history. A session UUID selects its paginated attendance sheet and whole-sheet counts. Lists use 25-row pages. Session responses carry authoritative next-session information independently of the selected history page, server time and explicit catch-up state. Attendance writes accept at most 100 marks per atomic save.

Private SECURITY DEFINER implementations have an empty search path and qualified application objects. Materialization and roster-snapshot helpers have no authenticated/anonymous EXECUTE grant. Public wrappers call only the authorized private command/view functions. Existing Firebase identity resolution and organization/course/offering authorization helpers remain authoritative.

## Existing-data effects

The migration creates new objects and an additive enrollment trigger. It does **not** update, delete, backfill or reset existing records. Existing tables, columns, policies, function definitions and grants remain unchanged. Exams, Lessons, Homework and migrations 1–22 are untouched.

The new AFTER UPDATE trigger on enrollment status/expiry/start dates affects only future updates involving newly created group memberships: it closes the current interval at the actual server clock and, if still eligible, opens a new interval with the revised expiry. Old eligibility and attendance are retained. It never automatically assigns a previously removed/suspended student to a group after reactivation.

The group command and enrollment trigger serialize through the offering row. The command deliberately avoids an enrollment FOR UPDATE lock that would invert the enrollment updater's lock order. A concurrent suspension may commit after an addition and then closes that new assignment atomically. Real concurrent testing verifies this outcome and absence of deadlock.

Recovery is forward-only by default: leave existing data and schema in place, disable the new routes if an unexpected acceptance failure appears, preserve diagnostics and obtain review for a corrective migration. Do not automatically drop historical tables or restore unsafe grants.

## Implemented application workflows

- Existing `/group` and `/groups` now use Firebase/Supabase groups, not an offering renamed as a group. Authorized staff get creation/editing, weekly slots, delivery details, capacity and archival controls within V2 panel styling.
- Staff can search paginated rosters, add actual eligible profiles, deactivate/transfer members, assign offering assistants, manage dated sessions and save/finalize/reopen attendance with an explicit correction reason.
- Students get their authorized group/session details and self-only finalized attendance history, including after transfer or enrollment expiry. No peer emails, private homework status or peer attendance is rendered or returned.
- Online meeting URLs require HTTPS without credentials. Center groups require an address. Join/location details are current-membership/enrollment protected. Session snapshots preserve historical delivery details. Livestream is accurately labelled Coming Soon.
- Home uses real dated sessions. Countdowns start with hydration-safe placeholders, use server time, show In Progress/completed states and refresh at boundaries. Group views poll changes and revoke protected details on denied access. Failures/loading/catch-up are distinguished from legitimate emptiness.
- The legacy group API refuses Firebase mode before invoking Clerk authentication. Clerk/Prisma fallback routes still build.

## Recurrence and historical attendance

Weekly schedules use IANA `Africa/Cairo`, with UTC instants persisted as timestamptz. Spring-forward nonexistent wall times are skipped for recurring meetings and rejected for one-off input. Fall-back ambiguity chooses PostgreSQL's later standard-time occurrence. Duration represents elapsed minutes.

Materialization holds the group row and uses unique `(schedule_id, occurrence_date)` keys. Each call processes at most 91 calendar days per active slot, toward a 90-day future horizon. A cursor retains missed past occurrences after long inactivity. Incomplete catch-up is explicit; the UI retries bounded batches. No cron credential or manual database edit is required. Home discovery is explicitly limited to 100 accessible active groups; individual group pages remain paginated.

Metadata-only edits preserve recurrence and every existing session snapshot. Omitting schedules leaves them unchanged. Schedule edits compare weekday/time/duration sets: unchanged slots retain IDs and cursors; only removed/changed slots deactivate, with only their untouched future generated instances cancelled. Explicit [] clears automatic future recurrence; it preserves past sessions and exceptions. Explicit reschedule/cancellation exceptions remain intact. Archival cancels future sessions without deleting attendance. Unarchive does not silently restore cancelled classes: restore the intended instance or revise the future pattern.

Attendance snapshots are first created after the session begins, using membership intervals and enrollment-expiry snapshots at the dated start. Later additions are excluded; later transfers/removals preserve eligibility for earlier sessions. Effective times use `clock_timestamp()` after lock waits, preventing a delayed addition from backdating eligibility. Rescheduling a started/snapshotted session is rejected. Draft cancellation retains marks but prevents finalization/display as ordinary attendance.

Assistants may mark attendance only for explicitly assigned groups. Only offering instructors/managers finalize or reopen. Reopen requires a reason; students see finalized, noncancelled attendance only. Correction drafts are withheld until re-finalized. `not_marked` is never implicitly converted to absent. Session percentages explicitly use marked students as the denominator. Historical staff searches accept a student name or exact profile UUID.

Open assignments occupy capacity until explicitly deactivated/transferred or closed by an enrollment update. Naturally expired enrollments immediately lose protected reads and are labelled inactive; staff can deactivate the assignment to release its seat. No staff can edit membership effective dates through the public RPC.

## Local verification

- **159 application tests**, including 15 new Groups tests: validation, URL safety, Cairo DST/midnight, next-session boundaries, pagination limits, Firebase/legacy boundary and actual React server rendering of learner versus instructor creation controls.
- **697 SQL assertions across 12 suites**: the existing 555 plus 142 new group/session/attendance assertions. Includes an actual 28-student roster, page boundaries, correction history, tenant/assistant/peer denial, failure atomicity, explicit exceptions and 200-day catch-up.
- **44 native independent-session races**: existing 10 Exams, 6 Lessons and 14 Homework, plus 14 Groups races. Groups cover capacity, duplicate membership, competing transfers, cross-group uniqueness, duplicate generation, reschedule/cancel, attendance conflicts, finalization, revocation during a lock wait, late-join historical eligibility, concurrent suspension and expiry during protected reads.
- Fresh install and seeded upgrade replay pass on disposable native PostgreSQL. PGlite replay/regressions also pass. Local preservation compares **46 existing tables/data/grants, 156 function definitions/grants and 97 policies**, with no changes from migration 23.
- TypeScript, architecture boundaries and lint pass; lint retains the same seven pre-existing warnings. Both isolated production builds pass: Firebase/Supabase and Clerk/Prisma. Existing Tailwind ambiguous-class warning is unchanged.
- Migration checksum, old migration-22 checksum and Git diff whitespace checks pass. Secrets/local artifacts are excluded. No application dependency or lockfile change is introduced.

Logs and the checkpoint remain ignored under `.local/step06/`.

## Historical pre-approval acceptance plan (completed below)

At the pre-approval checkpoint, Step 06 had not yet completed real authenticated acceptance. The plan below is retained as historical context; its executed results follow in the final acceptance section.

After approval: recheck the exact 22-entry history/checksum and baseline digests; apply only migration 23 to the named development project; inspect grants/history/advisors and rerun rollback suites; create isolated verified Firebase teacher/assistant/student fixtures through the existing identity flow; test all management/student workflows and direct denial cases at desktop/mobile widths; run practical Firefox/WebKit smoke checks and Exams/Lessons/Homework regressions; remove exact fixtures and verify baseline restoration. Only after acceptance passes, commit/push this isolated branch and open a PR against `collab/v2-integrated-ui`. Do not merge or deploy.

No production mutation, migration, deployment, push, commit or main change has occurred. No Step 07 work has begun.

## Changed files

```
.gitattributes
app/(dashboard)/_components/website-pages.tsx
app/api/study-groups/route.ts
docs/step06-groups-attendance-validation.md
frontend/components/session-countdown.tsx
frontend/components/upcoming-session.tsx
frontend/features/dashboard/student-home.tsx
frontend/features/groups/group-roster-view.tsx
frontend/features/groups/group-workspace.tsx
frontend/features/groups/use-group-sessions.ts
middleware.ts
package.json
scripts/exam-sql-local.cjs
scripts/group-concurrency.cjs
scripts/groups.test.cjs
server/http/admin/groups/route.ts
server/http/groups.ts
server/services/groups.ts
shared/contracts/dashboard.ts
shared/contracts/database.types.ts
shared/contracts/groups.ts
supabase/migrations/20261013234230_complete_group_attendance_workflows.sql
supabase/tests/groups-attendance.sql
```

## Owner review corrections — October 14, 2026

This supersedes the original unapproved migration checksum `6285947D9F5160EF6701B1DA3B74EE4B9EBA5D3D223FF4C0A6CFCB61E22B9E3D`. The exact original is retained in an ignored local review copy for comparison. The filename remains unchanged; neither version has been applied remotely.

- Metadata patches preserve omitted fields and omitted recurrence. The HTTP edit schema now supports partial patches without inserting a schedules default. Full form submission of the same schedule (including reordered arrays) preserves schedule IDs, materialization cursors, session IDs/versions and attendance. Accepted group writes still advance the group version, including otherwise identical edits, so stale-tab protection remains in force.
- Schedule changes reconcile exact weekday/time/duration triples. Explicit empty arrays deliberately remove all active recurring slots and cancel only future automatic instances. Explicit exceptions, past automatic occurrences and academic records remain intact. Metadata changes update group defaults; existing dated delivery snapshots remain unchanged unless explicitly rescheduled.
- `private.valid_group_meeting_url(text)` validates the entire value and is shared by group and session CHECK constraints. It supports ASCII DNS FQDN HTTPS URLs, optionally with a TCP port 1–65535 and valid URI path/query/fragment escapes. It rejects userinfo, single-label/malformed hosts, IP literals, invalid ports, raw whitespace/controls/backslashes/non-ASCII characters, malformed percent escapes and encoded controls. Application validation uses the same rules; direct authenticated create/edit bypass attempts and a privileged malformed session snapshot update are covered. DNS resolution/provider availability is not checked in PostgreSQL.
- Attendance audits store prior values only for explicitly changed user IDs (bounded by the existing 100-mark request limit), plus the requested new values and session metadata. Finalize/reopen events store a fixed-size SHA-256 fingerprint of the ordered roster/status tuples. Full sheets are no longer copied on each small edit; immutable app-level audit evidence remains available for reconstruction and reconciliation.
- Focused revision files: the pending migration, shared Groups validation contract, Groups HTTP edit validator, application tests, SQL tests, native concurrency tests and this report. Existing migration files and unrelated implementation remain unchanged.

Historical pre-approval revision verification: 159 application tests; 697 SQL assertions, including 142 Groups assertions; 44 native races, including 14 Groups races; native fresh/upgrade replay and PGlite pass; TypeScript, architecture and lint pass (same seven warnings); both builds pass. Local preservation still verifies all46 prior tables/data/grants,156 prior function definitions/grants and97 policies. Development history was rechecked read-only and remains22 migrations. No remote fixture, commit, push, merge, deployment or production/main change occurred. Real authenticated acceptance remains pending explicit migration approval.

## Post-application automated verification

- All 12 SQL authorization/regression suites passed on development inside rollback transactions: **697 assertions**, including **142 Groups assertions**.
- Fresh and upgrade disposable native PostgreSQL replays passed, including **44 concurrent-operation cases**, **14** for Groups.
- Final `npm run check` passed **159 application tests**, architecture boundaries, TypeScript and lint (seven pre-existing warnings). Both isolated Firebase/Supabase and Clerk/legacy production builds passed after type regeneration.
- Security advisor: the existing Supabase Auth leaked-password-protection warning remains; the only added security entry is informational default-deny RLS on the private audit table. No new security warning.
- Performance advisor flags the composite group-membership FK as informational. Reviewed EXPLAIN confirms the existing `group_memberships_group_history` index supplies the leading group-ID lookup; offering ID is a residual invariant of a globally unique group. An extra composite index was not added to the byte-locked migration. Unused-index information on new tables is expected before representative traffic; production-scale load remains untested.
- Remote integration remains `e6530630257f832fe55785e2d860f77889fd048c`; local main remains `b2ca8d180c5d4bf984986850272ed8d8de916f34`.

Final browser and cleanup results follow.

## Final authenticated acceptance and cleanup

Real Firebase sessions were established through the existing sign-in/provisioning flow for four disposable identities: teacher, assigned assistant, student and peer. They were limited to two synthetic tenants. No fake identity mapping, service-role browser client, real-user email delivery or original academic-record mutation was used.

**Chromium desktop/mobile passed:**

- Teacher creates an online group with two Cairo weekly slots; unchanged form submission, metadata-only edits and refresh retain recurrence/session IDs.
- Enrolled students are added and an offering assistant is explicitly assigned; center-group editing persists.
- Actual one-off creation, Cairo rescheduling, cancellation and restoration work, including navigating to the historical/cancelled session page. Stable IDs and original timing remain.
- Countdown transitions into In Progress without refresh and switches to the next occurrence; Home shows the student's real next center session.
- Assistant marks the dated roster; teacher finalizes, reopens with a reason and finalizes an assistant's UI correction. Stale versions and assistant finalization are denied. Students see only their own finalized attendance, with drafts hidden.
- Transfer preserves historical attendance and removes old joining access. Archive/unarchive blocks/restores student access.
- HTTP and direct Supabase RPC attempts reject deceptive meeting URLs; tenant-B access, unrelated assistants, peer-private data and organization creation remain denied.
- Concurrent authenticated edits produce exactly one 200 and one 409. Enrollment expiry blocks direct group/session reads and removes joining UI while preserving own attendance history. Actual logout clears the cookie and protected navigation redirects to sign-in.
- Desktop/mobile screenshots and overflow checks pass; no page JavaScript exceptions were observed in the covered workflows.
- Lessons content/completion persisted; Exams listing/detail, submission, result release and retry denial passed; Homework blank-choice submission, solution unlocking and persisted lesson-homework UI passed.

**Firefox:** authenticated mobile group, center details, layout/overflow and page-exception smoke passed, including a non-Cairo browser timezone. This was a restored real Firebase session, not a repeated full workflow.

**WebKit limit:** sign-in renders and Firebase provisioning/session endpoints return 200, but WebKit does not send the production secure `__Host-lms-firebase-id` cookie to Home over this HTTP localhost origin, causing sign-in redirects. Request diagnostics confirmed `cookieSent:false`. Authenticated WebKit acceptance remains unverified until an HTTPS test origin is configured. Cookie protections were not weakened.

Test-selector failures were corrected only in ignored harness files: initial hydration timing, prefilled textarea label matching, scoping session controls separately from history entries, navigating paginated historical/cancelled rows and using the actual lesson page for Homework. No product authentication or UI change was needed for these harness failures.

**Cleanup verified:** guarded rollback rehearsal passed, then exact scoped cleanup committed. Four Firebase identities were revoked/deleted with UID/email/display-name guards and getUser-not-found verification. All seven new tables are empty. All **78** original table states, **156** function definitions/ACLs and **97** policies exactly match the pre-migration baseline. No test Storage objects existed, no Storage metadata was deleted through SQL, and all 23 migrations remain recorded.

Evidence is local and Git-ignored under `.local/step06/acceptance/`: manifests/credentials are excluded from Git; sanitized screenshots include `student-online-desktop.png`, `teacher-groups-desktop.png`, `student-center-mobile.png`, `assistant-groups-mobile.png`, `home-countdown.png`, `firefox-student-mobile.png`, `homework-regression.png` and `expired-student-history.png`.

Remaining limits: full authenticated WebKit/HTTPS validation, production-scale load/soak testing, external meeting-provider availability and future livestream functionality. Supabase Auth's existing leaked-password warning is unchanged ([advisor guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)); private default-deny audit RLS and the reviewed composite-FK index note are informational ([RLS guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [FK guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)). No production mutation, deployment, merge, main change or Step 07 work occurred.
