# Milestone 1 — UI cleanup, notification preview and Exams loading

## Baseline and isolation

- Repository: `EduLabs-LMS/EduLabs-LMS`.
- Original checkout: clean `codex/step06-complete-groups-attendance`, `0334349c4cb4ee7a213b321b720823b15dcb2f61`.
- Fetched shared integration: `d0f5aff793c9101703faf3f698f456cbd25dabd6`.
- Latest staging candidate: `codex/pre-vps-deployment`, `fdafb13b407a4b31219b8d3f4655a3785f63021b`; PR #9 remains draft, stacked on Step 08 PR #8. No newer remote candidate appeared on fetch.
- Feature branch: `codex/milestone-1-ui-notifications`, based on that staging candidate. Its draft PR targets `codex/pre-vps-deployment`, keeping the milestone diff separate from unmerged infrastructure/Step 08 changes. This does not approve or merge either prerequisite PR.
- Isolated worktree relocated to `E:/EduLabs-Milestone1` after C: ran out of space during production builds. Original checkouts and local credentials were preserved.

## Changes and behavior

### Sidebar

The Firebase contextual label is now STUDENT or STAFF; database roles and permission decisions are unchanged. Both sidebar implementations say “Sign out”; their existing sign-out callbacks and the Firebase account menu/session cleanup remain unchanged.

The Firebase notification bell moved from desktop branding/mobile header into the sidebar's bottom account section. Mobile users open the existing navigation drawer to reach the same account-associated control. There is no duplicate header bell. Its existing border, green badge and hard shadow are retained. No separate icon received a guessed shadow: the request did not identify that icon.

### Notification preview

The existing Radix Popover supplies a portalled, collision-aware preview, outside/Escape dismissal and focus restoration, including inside the mobile Radix Sheet. It displays up to five unread items, unread count, existing event labels, timestamp and read/unread state, authorized resource links and “View all notifications.”

It uses the existing POST `/api/communications` envelope with `domain=notifications`, `action=list`, `data={filter:unread,page:0}`. The database already bounds a page to 25; the preview renders the first five. There is no new RPC, recipient selector, database or authorization mechanism. The API does not return arbitrary message bodies/titles, so the preview uses its established event labels rather than inventing missing content.

Initial/open/retry loads have loading, empty and explicit error states. Requests abort after 15 seconds; obsolete requests and unmounts cannot publish stale state. Thirty-second visible-tab refresh and full-page read/unread events update the count. Background refresh preserves existing keyed links/focus while fetching; errors remove old content instead of representing a failed authorization request as an empty page. Opening the preview never marks items read. The full Notifications page retains filtering, pagination, preferences and opt-in push controls.

### Exams: reproduced findings and limits

The original vague loading report could not be reproduced against an actual authenticated staging session. The route skeleton itself intentionally renders while the server loads and contains no exam records.

Two concrete issues were verified:

1. An isolated browser reproduction against baseline `fdafb13` showed a failed legacy `/api/exams` request rendering “No exams are available right now.” The corrected view distinguishes errors from successful empty results, offers retry, sets loading for retries and bounds requests to 15 seconds. A request generation guard rejects stale completions. Staff/student empty copy remains distinct.
2. The Firebase server error view linked “Try again” to `/exams`, which does not explicitly invalidate the current server response and also leaves detail context. A small client retry button now calls `router.refresh()` on the current route and disables itself during the transition. The browser harness verifies the callback; it does not claim to reproduce a real Firebase cache failure.

No grading, score/answer release, runner, timer, autosave, attempt or submission logic changed. Firebase and Clerk routes remain separated.

## Verification

Browser evidence is **component acceptance with fictional local API/provider fixtures**, not real Firebase authentication or live Supabase RLS acceptance. No accounts or remote records were created or changed. Existing endpoint authorization and exam-security application regressions remain part of `npm run check`.

| Check | Actual result |
| --- | --- |
| `npm run check` | PASS: 204 application tests, architecture, TypeScript, lint; seven inherited lint warnings, no new warnings |
| Focused milestone/communications/Exams foundation suites | PASS: 35 tests |
| Firebase/Supabase production build | PASS, exit 0 |
| Clerk/legacy production build | PASS, exit 0 |
| Chromium component acceptance | PASS: 14 check groups; desktop 1440×1000 and mobile 390×844 |
| Preview timeout and refresh | PASS: hung response becomes error after 15 seconds; background refresh preserves focused link |
| Unauthorized notification response | PASS: synthetic 403 is an explicit error, not an empty list; existing origin/viewer/recipient-injection tests also pass |
| Migration preservation | PASS: 25 files byte-identical to staging baseline |
| Scope/secret audit | PASS: 14 intended changed/new files; no env, credentials, private keys, local artifacts or lockfile changes |
| `git diff --check` | PASS |
| Real authenticated staging, live RLS, physical devices, Firefox/WebKit | NOT RUN; not represented as passed |

Both initial C: builds failed with `ENOSPC`; they were rerun successfully on E:. No original source or unrelated artifacts were discarded. The newly generated Firebase webpack cache was moved to `E:/EduLabs-Milestone1-Firebase-Cache` and the new worktree was moved/registered with `git worktree repair`; unrelated worktrees were not relocated. Final builds were rerun after the last preview layout adjustment.

To rerun component browser checks, install optional tooling under the ignored directory:

```powershell
npm install --prefix .local/milestone1/tools --no-audit --no-fund esbuild@0.25.12 playwright@1.61.1
node scripts/milestone1-browser.cjs
```

Install Chromium with that Playwright version if unavailable. Run a Firebase production build first for matching locally bundled font assets. Browser artifacts are ignored under `.local/milestone1/browser/`; the harness serves loopback on an ephemeral port, rejects nonlocal browser requests and shuts down afterward. It does not add demo routes or authentication bypasses to the application.

Before/after desktop, mobile and failed-Exams screenshots are captured from the actual components. API, identity and router behavior are explicit synthetic fixtures. Screenshots are evidence for the changed components, not an assertion that a real user signed in.

Local evidence under `E:/EduLabs-Milestone1/.local/milestone1/`:

- `browser/before-desktop.png`, `browser/after-desktop.png`.
- `browser/before-mobile.png`, `browser/after-mobile.png`.
- `browser/before-exams-failure.png`, `browser/after-exams-failure.png`.
- `browser/results.json`, `browser.log`, `focused.log`, `check-final.log`, `build-firebase-final.log`, `build-legacy-final.log`, `scope-audit.json`.

The screenshot harness uses actual Figtree/Caprasimo assets from an existing local build, blocks nonlocal requests and captures completed animation states. It does not change application fonts or animations. Browser artifacts and optional tools remain Git-ignored.

## Preserved boundaries

No SQL, migration, RLS policy, grant, Firebase configuration, environment file, Caddy/Cloudflare/domain setting or deployment configuration changed. All 25 migration files are preserved byte-for-byte against the baseline. No remote database access/mutation, production deployment, main change or integration merge is part of this milestone. No protected Admin JSON, env, browser credential/session state or generated runtime artifacts belong in the commit.

## Remaining limits

- Intended separate icon-shadow target needs an owner reference; no unrelated redesign was made.
- Real Firebase-authenticated staging/browser testing was not performed; no supplied test identity or permission to create fixtures was assumed.
- Chromium desktop/mobile viewport coverage is not physical-device, Firefox or WebKit acceptance.
- This frontend task does not retest or claim changes to live database RLS or Web Push delivery.
- Existing dependency advisories and unrelated lint warnings are inherited; no dependency upgrade was introduced.
