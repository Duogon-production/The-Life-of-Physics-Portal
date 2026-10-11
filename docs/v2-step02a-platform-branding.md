# Step 02A — platform branding cleanup

Branch: `codex/v2-step02a-platform-branding`, from approved commit
`8e4d4430453d24c949198da1095d64faa08e8433`. Instructions were read from the
supplied Step02A packet's README-FIRST, CODEX-PROMPT and ACCEPTANCE documents.
No source handoff was reimported.

## Inventory recorded before editing

| Reference | Firebase reachability | Decision |
| --- | --- | --- |
| Footer: Mrs. Ghada Ali, 01094683366, WhatsApp 201094683366, direct call and /support | Mounted in authenticated learner and staff dashboard shells | Neutral platform/course-help copy; preserve three styled slots, remove Firebase destinations and clearly label coming soon |
| Sidebar Support /support | Mounted directly on desktop and reused by mobile drawer | Same icon/classes/position; focusable disabled help label in Firebase |
| FirebaseForm: The Life of Physics heading | Public Firebase sign-in/sign-up/verification presentation | Heading text becomes EduLabs; no authentication logic or styling change |
| TextbookHeader: fixed teacher/phone and ticket CTA | No importing call site in current tree | Leave unmounted source unchanged |
| WaitlistOverlay: Mrs. Ghada enrollment list, assistant WhatsApp 201156102015, Clerk approval polling | Dashboard renders only after Firebase early return, in legacy branch | Preserve legacy enrollment flow; no Firebase mounting introduced |
| SupportModal: support.lop.physics@gmail.com and legacy support calls | Legacy dashboard/legacy sidebar-routes; not Firebase shell | Preserve fallback; do not activate ticket system |
| SupportView: fixed TEACHER_CONTACT and legacy ticket interfaces; NewTicketModal | /support explicitly gated in Firebase before Clerk auth | Preserve gated source; no new ticket behavior |
| FacebookMessenger: fixed application/page IDs | Root layout explicitly requires !firebase | Preserve isolated fallback; no Facebook widget active in Firebase |
| Home/group route legacy queries and teacher enrollment assumptions | Each route returns WebsiteHome/WebsiteGroups before legacy branch | Keep existing authorized new-LMS adapters unchanged |
| shared/constants/contact.ts | Used in legacy-only views and footer's legacy conditional | Retain real fallback details; never substitute fabricated platform contacts |
| Physics-named utility classes | Design tokens, not visible identity/contact claims | Leave unchanged under design lock |

## Exact behavior changes

Only three UI components changed. No className, CSS, spacing, font, icon, logo,
splash, loading, carousel or animation definitions changed.

In Firebase mode the footer's old teacher-name/phone sentence becomes:
“Platform help: EduLabs · Course questions: your authorized teacher.” Its three
existing styled contact elements now read “Course help — soon”, “Contact — soon”
and “Help — soon”. They have no href, have role=link, aria-disabled=true, remain
keyboard-focusable and explain the unavailable routing through title text. They
cannot navigate, call, open WhatsApp or claim to create a ticket. In legacy mode
the original real WhatsApp, phone and support destinations and labels remain.

The shared sidebar's Support element becomes “Help — soon” only in Firebase
mode. It has no destination, declares its disabled state, retains focus styling
and cannot close/navigate the mobile drawer on activation. Other working sidebar
links and all course/organization operations are unchanged. The original footer
creator attribution is preserved verbatim. No ownership attribution changes are
proposed in this slice.

The shared Firebase form heading changes from “The Life of Physics” to “EduLabs”.
Its form controls, validation, sessions, verification and provisioning logic are
unchanged. The corresponding original public sign-in screenshot is retained in
the baseline captures.

The footer and sidebar support elements use native anchors instead of Next Link
where an href must be absent. Legacy support still navigates to the same working
route, using a normal browser navigation. This is the smallest semantic binding
change; DOM hierarchy and styles remain intact. Text length can naturally change
wrapping; no compensating layout redesign was introduced.

## Verification

Results and before/after screenshots are stored locally under ignored
`.local/step02a/`. Disposable accounts use synthetic identities only, with Admin
credentials read from the existing protected external configuration. Secrets,
tokens, test passwords and fixture IDs are excluded from this committed report.

The new `scripts/platform-branding.test.cjs` renders the real footer in both
authentication modes. It verifies Firebase contains no legacy contact hrefs or
names, all three actions are disabled/focusable, creator credit remains, and
legacy contact destinations still work. `package.json` includes it in npm test.

Authenticated browser checks use Chromium, 1440×1000 and 390×1000 viewports,
teacher and learner identities, light/dark system preferences and mobile drawers.
The existing approved app forces its light presentation in both preferences;
this task does not introduce a dark theme or change that behavior. Keyboard Enter
on disabled help keeps the current URL. Visible Firebase text and links are
checked for old teacher names, numbers, WhatsApp/call/support destinations,
Physics identity and support email. Facebook scripts are checked as absent.

The baseline production artifact is the retained Step 1 build. Before/after
screenshots use the same synthetic actors and records. Comparison targets are
the unchanged shell/card layout and the necessary footer/sidebar text and action
differences. Original public V2 sign-in is a reference only; no legacy users or
records are imported.

## Protected work and deferred scope

### Recorded results

- `npm run check`: 66 tests pass, architecture and TypeScript pass, lint has
  zero errors and the same seven Step 1 warnings.
- Isolated Firebase/Supabase and Clerk/legacy production builds both pass.
  Existing Tailwind ambiguity and images.domains warnings remain unchanged.
- All 22 original authenticated acceptance checks pass against both the baseline
  and changed build: real Firebase sessions, organization/course creation,
  persisted title/rich-text/metadata edits, publication, stale-tab 409, tenant
  denial, learner scope/progress, logout and session restoration. No JavaScript
  exceptions or hydration errors were observed.
- Eleven direct caller-JWT/PostgreSQL assertions pass for private-data denial,
  published lessons, own progress, unauthorized/cross-tenant writes and denied
  answer-key access. No RLS policy changed.
- Exact synthetic fixture cleanup passed guarded ownership/child checks and
  confirmed zero remaining fixture profiles, organizations, courses, lessons
  and progress. Three disposable Firebase accounts were revoked/deleted; the
  local credential manifest was erased. Existing data was preserved.
- The authenticated branding audit passes eight viewport/theme cases per
  before/after run, including four mobile drawer captures. All disabled help
  controls tested with keyboard Enter keep the URL unchanged. No horizontal
  overflow was found. Browser coverage is Chromium only, not Firefox/WebKit.
- AST comparison confirms every className expression in both changed components
  matches Step 1 exactly, ignoring Windows line endings. Git confirms the global
  CSS, animation sources, layouts and backend files have no changes.
- The final Firebase heading-only cleanup was followed by both production
  rebuilds, another successful `npm run check`, and public sign-in/sign-up
  browser checks at both viewport sizes with no JavaScript errors. Those public
  screenshots are `after/sign-in-{1440,390}.png` and `after/sign-up-{1440,390}.png`.
- Before screenshots: `.local/step02a/before/{ownerA,outsider}-{light,dark}-{1440,390}.png`.
  After screenshots: corresponding files under `.local/step02a/after/`.
  Mobile drawer files end in `-menu.png`. Full teacher-editor/course comparisons
  are also under `baseline-screenshots/` and `screenshots/` respectively.

The expected visual differences are neutral footer text, three coming-soon
labels and the sidebar's Help label. At 390px the new footer sentence wraps to
two lines and the shorter buttons wrap differently, changing footer height by
approximately one text line. This is natural copy wrapping with identical CSS,
not a layout or animation change. Screenshots use matching viewports and actual
synthetic records; dynamic V2 carousel states are not a pixel-perfect guarantee.

Changed files: `frontend/components/footer.tsx`, `frontend/components/sidebar.tsx`,
`frontend/features/auth/firebase-form.tsx` (heading text only),
`scripts/platform-branding.test.cjs`, the npm test command in `package.json`, and
this report. Git diff whitespace checks pass. No secrets/environment files,
screenshots, local launchers or test credentials are included in the commit.

Firebase sessions/configuration, server services, API handlers, middleware,
Supabase queries/schema/RLS, all 16 migrations, global styles/design tokens and
animation components remain unchanged. Main, Step 1, lesson-card and rejected
redesign branches are preserved. No merge, push or deployment is included.

The platform/course support split is explanatory only. Implementing tenant-safe
ticket routing needs separate approval. Placeholder slides, rating displays,
Continue Studying, lesson/course terminology, global role navigation labels,
themes, schedules, exams, uploads and lesson authoring remain deferred. Gated
source and legacy contact constants remain intentionally present in Git; they
are not active contacts in the new application's reachable UI.

Stop after this slice for owner approval. Step 02B has not started.
