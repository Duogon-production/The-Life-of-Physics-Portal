# Step 07 — Notifications and Support: development accepted

Validated October 15, 2026. Branch `codex/step07-complete-notifications-support`; base `ed6691f8329d1f9329dd825bb11223820e247de8`; PR target `collab/v2-integrated-ui`. No production migration, manual deployment, main change, PR merge or Step 08 implementation.

## Applied migration and preservation

Development project **`gmvouqgjbtbkbhrdruzu`** now has exactly **24** expected migrations. The owner-approved file `20261015170246_complete_notifications_support_workflows.sql` was applied through the official MCP, which assigned version **`20261015185510`**. The local file is now `supabase/migrations/20261015185510_complete_notifications_support_workflows.sql`. Its bytes were not changed. Both the local file and the database's complete stored 48,614-byte statement have SHA-256 **`1CADDB90AD4243E234EA7422754FA98215FB674D0D67A91691248F7F1A5B1C13`**.

Preflight verified the project, exact approved checksum, the previous 23 migrations, absence of Step 07 objects, and all 166 existing function definitions and 103 policies against a fresh replay. Comparisons accounted for Windows line endings and the local bootstrap's missing hosted service-role defaults. No actual definition/policy drift remained.

Post-application fingerprints preserve **85 original tables' rows/columns/RLS/grants, 166 existing function definitions/grants and 103 policies**. Twelve additive tables started empty. The intended private-schema USAGE addition is limited to `service_role` for the trusted worker wrapper. Organization creation remains restricted. Migrations 1–23 are unchanged from the integration base; migration 23's raw SHA remains `E1393DF9992D1D1853C630F97B203C346AC61F36982259DCBB87ECDB9E439D7B`.

## Actual verification

| Check | Result |
| --- | --- |
| Full application checks | **180 tests passed**, architecture, TypeScript and lint passed |
| Development SQL | **14 rollback suites / 816 assertions passed** |
| New SQL suites | Notifications/Support **68**; group-notification corrections **51** |
| Native local PostgreSQL | Full replay and **59 independent-session concurrency cases passed** |
| Production builds | Firebase/Supabase and Clerk/legacy both **passed** |
| Real Firebase workflows | Chromium password sign-in/onboarding for four disposable identities; student, contextual teacher, assistant and platform operator tests passed |
| Desktop/mobile | Chromium workflows; Firefox/WebKit restored real Firebase sessions for Notifications, Support and Groups at **1280/390px**, no page exceptions or horizontal overflow |
| Cleanup | **97 post-migration tables** restored to pre-fixture fingerprints; all four Firebase identities revoked and deleted; no Storage objects created |

Authenticated workflows verified ticket creation, escaped script text, assignment, replies, resolution/reopen, stored 48-hour response targets, first staff response, cross-tenant/role denial and stale HTTP 409. Platform operator status conferred no academic management privilege. Notifications verified real unread changes, read/unread, preferences suppressing future events, authorized links and direct worker/organization RPC denials.

A two-slot recurring timetable materialized over 20 real sessions silently; later enrollment received exactly one current joining summary. Metadata-only and unchanged schedule saves retained all session IDs without duplicate notices. A URL change replaced the visible summary. A real one-off session produced one announcement. Two trusted worker sweeps produced one reminder; rescheduling revoked it and cancellation hid obsolete details. The sweep transaction first rejected any non-fixture due session. Direct Firebase-authenticated deceptive-URL RPC attempts failed. An expired enrollment denied group/session data and joining notices while own support remained available.

Existing lesson progress, Exams listing/submission/retry enforcement, Homework submission/solution unlocking/correction release and concurrent Groups edits passed. Exam/Homework result-release notifications came from actual submission/release transactions, not fabricated notification rows.

Acceptance uncovered and fixed two application entry-point omissions: Support was still disabled as “soon” in sidebar/footer, and the bell was initially mounted in an unused textbook header. Support links now work, and the existing bell is mounted in the active desktop sidebar header and mobile header. Branding, layout classes and animations are preserved. The final rebuilt Firebase browser test verified those entry points and the actual unread bell. A regression covers Firebase versus legacy mobile navigation.

Two harness mistakes were corrected: a direct group RPC request omitted required parameters, and an inherited homework UI assertion remained on the Exams page. Corrected requests/navigation passed; neither required database/application changes.

## Exact synthetic cleanup and evidence

Run `8566c6aa-7089-4bdd-b567-f510a94cdc94` created four manifest-owned Firebase identities through normal verified onboarding, two tenants/courses/offerings, three groups, one exam and one Homework assignment/submission, plus their support/notification records. Tenant/initial-owner provisioning was atomic. The platform operator entry belonged only to a disposable identity.

Cleanup checked exact tenant slugs/owners, verified identity mappings, actor membership, academic IDs and absence of uploads. The guarded cleanup first succeeded under ROLLBACK. After acceptance, sessions were revoked, scoped cleanup committed, and all four Firebase identities were deleted and independently confirmed absent. Database fingerprints match the post-migration/pre-fixture baseline across **all 97 tables**, including Auth and Storage; functions and policies are unchanged. **No Storage objects or Storage metadata were created/deleted in Step 07.** All randomized local test databases were verified absent, and only the owned loopback PostgreSQL cluster was stopped, with files retained.

Ignored evidence is in this worktree's `.local/step07/`: development baseline, SQL results, cleanup verification, final check/build/native logs and `acceptance/` browser logs/screenshots/manifests. Tokens/passwords/browser state/local certificate keys/launchers remain outside Git. Environment files were not copied. The original checkout and separate manual demo were unchanged.

## Advisors and truthful limitations

- No new security warning. Eight private-table “RLS enabled, no policy” INFO findings are intentional default-deny tables with revoked client grants. Existing Supabase Auth leaked-password protection warning remains. See [RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- One pre-existing Groups composite-FK index advisory remains. Fresh indexes initially appear unused; they should not be removed based on fresh-development usage counters. See [index advisor](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).
- **Web Push device delivery remains unverified.** VAPID is absent, so Enable is truthfully disabled while in-app notifications work. Encrypted payload generation and worker leases/retries passed locally. Protected server worker credentials, VAPID, scheduling and real device/provider receipt tests remain operational setup. Near-start in-app reminders also require the scheduled worker; acceptance used an explicit trusted, guarded sweep.
- Real support operators/organization-support staff and queue staffing must be deliberately provisioned. No real privileges were auto-granted. Firebase support persists messages; email and support attachments are not claimed.
- Global account/whitelist approval belongs to Step 08. The current “Learning access approved” event reflects actual enrollment activation, not Firebase account creation. No Step 08 work started.
- Unchanged baseline npm audit: **seven high/two low** advisories involving braces/glob development tooling and Quill export dependencies. Seven existing lint warnings and pre-existing Tailwind/Next build warnings remain. Production-scale load, push-device/OS matrix and email delivery are not claimed.

The following implementation record retains the architecture and review rationale. Its local-only evidence is historical; the current applied status, browser acceptance and cleanup above supersede the former approval gates.

## Actual implementation

- PostgreSQL persists recipient notifications, per-event preferences, immutable source events and private push delivery jobs. Triggers run within the originating business transaction: records become visible only after successful commit and roll back with failed business operations. Nothing dispatches external messages from a trigger.
- Enrollment activation creates an informational learning-access approval event. Published courses/lessons and the first published lesson part generate authorized lesson notifications. Actual exam-result and homework-feedback releases generate generic notifications without scores, answer keys, correction text or message contents. Online session announcements follow the corrected policy below: recurring materialization is quiet per occurrence, and current joining summaries are deduplicated per recipient/details revision. A trusted worker creates bounded, deduplicated reminders during the 15-minute window before a session starts.
- `/notifications` provides unread counts, read/unread filters, pagination, individual/bulk read actions and preferences. The bell uses the existing header, styles and typography. In-app and push preferences operate independently. Resource links are generated by the database and checked against current access/publication/release state; clients cannot supply arbitrary recipient IDs or links. Approval events have no link.
- Firebase `/support` uses Supabase tickets/messages instead of redirecting to unavailable or invoking legacy email/Prisma handlers. Existing V2 panels, buttons, dialog, text inputs and status badges are reused. Creation requires category, subject and description; users select an eligible learning organization or the platform technical queue.
- Tickets have searchable/paginated lists and message history, replies, status changes, assignment, first-response timestamps and actual response deadlines/overdue indicators. Student replies reopen resolved tickets. Duplicate request IDs cannot create duplicate records; mismatched reuse is rejected. Concurrent stale edits return 409. Database rate limits serialize per actor.
- Organization owners/admins can manage their organization's support queue. Additional organization staff need explicit trusted assignment and active membership. Teachers do not automatically become support operators. Platform technical operators are a separate private trusted registry; this grants no academic or grading privileges.
- Browser Web Push registration requires a user click, explicit permission and supported secure browser APIs. The service worker neither caches private pages nor intercepts network requests; it displays a generic update and opens only same-origin `/notifications`. Unsupported/missing configuration is reported honestly.
- The trusted dispatcher uses `web-push@3.6.7`, AES128GCM encryption/VAPID, bounded claims, `SKIP LOCKED`, lease tokens, exponential retry delays and provider-status acknowledgement. Expired/revoked subscriptions are disabled. Provider acceptance is distinguished from proven device delivery. It can run in in-app-reminder-only mode. No dispatcher has been started against a hosted database.
- The existing help modal creates an actual Firebase-mode platform ticket and retains its idempotency key across network retries. Legacy fallback remains separate; its optional email transport now uses server-side destinations, escaped HTML, bounded input and explicit errors for missing configuration/provider rejection.

## Approved migration architecture

Project permitted for a future application: **`gmvouqgjbtbkbhrdruzu` only**. Read-only project lookup confirms the named project is healthy. Hosted history still has 23 migrations. **Migration 24 has not been applied remotely.**

Filename:

`supabase/migrations/20261015185510_complete_notifications_support_workflows.sql`

SHA-256:

`1CADDB90AD4243E234EA7422754FA98215FB674D0D67A91691248F7F1A5B1C13`

The complete SQL is the file above, not this report. The official Supabase CLI generated its filename; `.gitattributes` preserves its exact checksum across checkouts.

Four new public tables, all RLS-enabled and SELECT-only for authenticated callers:

- `support_tickets`
- `support_messages`
- `notifications`
- `notification_preferences`

Eight new private RLS/default-deny tables:

- `support_operators`
- `organization_support_staff`
- `support_audit`
- `support_requests`
- `notification_events`
- `push_subscriptions`
- `notification_deliveries`
- `group_notification_state`

Public invoker RPCs `support_command` and `notification_command` are authenticated-only. Their private implementations have explicit identity/context checks, qualified references and fixed empty search paths. No anonymous EXECUTE or direct authenticated write grant is added. `notification_worker` and its private implementation are executable only by the trusted service role (and database owner), with explicit private-schema USAGE for that server role. No client may read subscriptions, delivery secrets, operator assignments or internal audit/request records.

The migration adds future-operation triggers and supporting indexes, including a partial due-session index. The new private joining-state table tracks a details fingerprint/revision, and private events include a session reference, context fingerprint and revocation timestamp. The only additional authenticated helper grant is an identity-bound visibility predicate used by notifications RLS; all other new session helpers remain internal. Worker signatures and service-role-only execution remain unchanged; an internal check action revalidates leased deliveries. It does not update/backfill/delete existing rows, approve any account, assign support operators, change organization provisioning, create Storage objects, or modify existing function definitions/RLS policies. All 23 previous migration Git blobs are unchanged; the protected migration-22/23 raw checksums remain intact. Five earlier files receive normal Windows CRLF checkout conversion in the fresh worktree; this is not a Git SQL-content change.

## Historical local review evidence

- Full `npm run check`: **179 application tests**, architecture checks, TypeScript and lint; seven pre-existing lint warnings, no new warning/error. `.eslintrc.json` now declares its config root, preventing inherited duplicate plugin instances in nested worktrees.
- Embedded fresh-install and native PostgreSQL upgrade replay: all **14 rollback suites**, **816 assertions**, including **68 Notifications & Support assertions** and **51 focused group-notification review assertions**. Covers real publication/release/session operations, privacy, operator restrictions/revocation, independent preferences, stale writes, duplicate requests, message text safety, subscription takeover denial and push failure/opt-out behavior.
- Native independent-session concurrency: existing 44 cases plus eight Communications cases and **seven focused group-notification cases** (59 total): duplicate creates, persisted uniqueness, simultaneous reply/status conflict, concurrent event deduplication, delivery-claim exclusion, lease recovery, stale acknowledgement rejection and retry scheduling.
- Local pre/post migration preservation: all **53 original tables' rows/RLS/grants**, **166 existing function definitions/grants** and **103 policies** unchanged. Fresh replay tests were corrected to account for genuine seed-generated notifications; no notifications were deleted to make assertions pass.
- Firebase/Supabase and Clerk/legacy production builds pass using isolated build outputs and the existing configuration without copying `.env` files. These are build checks, not production deployment or authenticated acceptance.
- Web Push encryption is exercised locally with ephemeral synthetic keys and encrypted request generation. Network delivery/device receipt is **not tested**.
- `git diff --check` passes. The added-line/untracked-file credential scan inspected all 30 changed/new files and found no configured credentials or private keys. Local test databases are randomized, dedicated, and dropped by the harness; no hosted fixtures/accounts have been created.

Evidence is under this checkout's ignored `.local/step07/`: check/build logs, correction-native-final.log/correction-fresh-sql.log, migration preservation and credential audit. All randomized test databases were verified absent; only the owned test cluster on loopback 51507 was stopped, with files retained. No sample identities/auth bypasses were introduced into application code.

## Recovery and historical acceptance checklist

Do not automatically drop tables, delete notifications/tickets, restore unsafe organization EXECUTE grants or revert academic security. If development validation fails, stop the dispatcher, preserve diagnostics and obtain approval for a forward correction. Revert application exposure by using the previous reviewed integration checkpoint if needed. Disabling only the newly added notification triggers would require a reviewed corrective operation. Revoke new worker execution/private-schema USAGE only after checking previous schema ACLs and dependencies; the migration's preflight must capture them. Preserve all ticket/message/audit history.

The completed acceptance followed this checklist: verify all event producers using real business operations, opt-in/out and retry handling, role-specific support queues, assignment/status changes, concurrent HTTP 409s, current-authority deep links and unavailable states. Verify Exams/Lessons/Homework/Groups, desktop/mobile layouts and unauthorized direct reads/writes. Clean up exact manifest IDs in foreign-key order (deliveries/subscriptions, notifications/events, support requests/audit/messages/tickets/assignments, group_notification_state, academic fixtures, then verified synthetic identities). Never remove Storage metadata directly. Finish checks and open a reviewed Step 07 PR; no automatic merge/deployment.

## Migration review corrections - current policy

The prior pending SQL SHA `999B78398F8CF9962D82090064575E28EA03F0C45AF7B2C4413280D694C5CE5D` was rejected at owner review and was never applied. Its exact bytes are retained only in the ignored `.local/step07/review-original-m24.sql`. The owner approved its replacement, whose exact bytes were subsequently applied as recorded above.

1. **No per-occurrence recurring announcement.** Normal generated recurrence INSERTs do not create session-specific details events. During relevant materialization, they may publish one current joining summary per group details revision and recipient; a two-slot, approximately 90-day timetable therefore creates one announcement for each eligible student, not dozens. Past catch-up produces no historical alerts.
2. **Current joining summaries only.** Summaries require an authorized online, uncancelled dated session starting in the next 14 days. A new eligible membership receives the current summary when such a session exists. If members precede the first timetable, the first relevant generated occurrence publishes that one summary. No existing memberships or historical sessions are scanned/backfilled by migration application.
3. **Recipient-aware deduplication.** Empty/inactive/fully opted-out recipient sets do not create an event. An existing source event may add a later eligible recipient, with `(event_id,recipient_id)` uniqueness preventing resends. Students who already received the same joining revision are not alerted again for unchanged timetables or repeated membership intervals. Preferences remain authoritative.
4. **Meaningful joining configuration.** Changes to group online mode, meeting URL or joining instructions advance a private details revision; unchanged saves and metadata-only edits do not. When relevant upcoming online sessions exist, current members receive one revised joining summary. Previous group-summary contexts are revoked. The alert links to the authorized group; it does not contain a URL or claim that immutable dated session snapshots were rewritten. Existing dated URLs/attendance/scheduling behavior are preserved.
5. **Deliberate one-off/exception notices.** Future one-off creation, restore, relevant session changes and explicit recurring-session rescheduling produce session-specific notices tied to the actual dated snapshot. Late members receive the current group summary, not a replay of old one-off announcements. Session fingerprints use UTC epoch values, independent of a request's timezone.
6. **Cancellation/reschedule safety.** Relevant session changes revoke previous session details/reminders and cancel pending/leased push jobs. If no relevant upcoming sessions remain, the old shared joining summary is also revoked. Restoring/newly publishing relevant sessions can start a new summary revision without resurrecting revoked evidence. Direct table RLS, unread counts and the list RPC exclude revoked, superseded, expired-session or no-longer-authorized notices. Session-starting notices disappear when the old snapshot is no longer current; students still use the unchanged Groups page for normal session access.
7. **The worker stays within 15 minutes.** Its bounded 500-session sweep considers only eligible, opted-in recipients who have not received the current reminder snapshot/version. Later members can extend that reminder event while it remains within the window; repeated/concurrent sweeps are idempotent. Empty/opted-out groups do not consume keys or block later eligible groups in the bounded batch.
8. **Dispatch recheck.** Before contacting a push provider, the dispatcher checks the lease, recipient/profile, subscription, preference and current session authority. Revoked jobs are skipped. Cancellation during an already in-flight provider request cannot recall that request, but its payload is a generic update with no class, time, meeting URL or private content. A revoked lease is not acknowledged as sent, and the application cannot retrieve the revoked academic announcement.

Focused SQL tests cover all owner-requested cases plus historical catch-up, first timetable after assignment, connection-timezone independence, direct RLS/RPC denial, preference filtering and current-context integrity. Native races cover concurrent membership assignment, materialization, URL edit versus late join, reminder sweeps, cancellation after claim, stale context hiding and extending a source event to a concurrent different recipient. Fresh-install assertions account for legitimate seed-generated lesson notifications now that empty source keys are no longer consumed; no data is deleted or fake notifications suppressed to pass tests.

The correction changes only these eight files; no frontend JSX, CSS, animations or authentication configuration changed:

- `supabase/migrations/20261015185510_complete_notifications_support_workflows.sql`
- `supabase/tests/group-notifications.sql` (new)
- `supabase/tests/notifications-support.sql` (fresh-fixture baseline assertion)
- `scripts/group-notification-concurrency.cjs` (new)
- `scripts/exam-sql-local.cjs` (includes the new suites)
- `scripts/communications.test.cjs` (dispatch invalidation regressions)
- `scripts/notification-dispatch.cjs` (authorization recheck and revoked-lease handling)
- `docs/step07-notifications-support-validation.md`

At the correction review checkpoint, development had 23 migrations and the revised migration was unapplied. Owner approval and development application followed, as recorded above.

## Complete Step 07 changed-file list (33 files)

- `.env.example`
- `.eslintrc.json`
- `.gitattributes`
- `app/(dashboard)/(routes)/notifications/page.tsx`
- `app/(dashboard)/(routes)/support/page.tsx`
- `app/api/communications/route.ts`
- `docs/step07-notifications-support-validation.md`
- `frontend/components/support-modal.tsx`
- `frontend/components/footer.tsx`
- `frontend/components/sidebar.tsx`
- `frontend/features/dashboard/mobile-sidebar.tsx`
- `scripts/platform-branding.test.cjs`
- `frontend/features/notifications/notifications-view.tsx`
- `frontend/features/support/supabase-support-view.tsx`
- `frontend/lib/communications.ts`
- `middleware.ts`
- `package-lock.json`
- `package.json`
- `public/edulabs-push-sw.js`
- `scripts/communications-concurrency.cjs`
- `scripts/communications.test.cjs`
- `scripts/exam-sql-local.cjs`
- `scripts/group-notification-concurrency.cjs`
- `scripts/notification-dispatch.cjs`
- `server/http/communications.ts`
- `server/http/support/route.ts`
- `server/services/communications.ts`
- `shared/contracts/communications.ts`
- `shared/contracts/database.types.ts`
- `shared/website-routes.ts`
- `supabase/migrations/20261015185510_complete_notifications_support_workflows.sql`
- `supabase/tests/group-notifications.sql`
- `supabase/tests/notifications-support.sql`
