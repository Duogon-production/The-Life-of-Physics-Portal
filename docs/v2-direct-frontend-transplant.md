# V2 frontend transplant — Step 1

## Scope and provenance

The implementation branch is `codex/v2-direct-frontend-transplant`, based on local
`main` at `b2ca8d180c5d4bf984986850272ed8d8de916f34`. The Step 01 lesson-card
and previous visual-redesign branches are retained separately. No merge, push,
deployment or production authentication switch is included.

The visual authority is the supplied `EduLabs-V2-UI-Source-Handoff-PORTABLE.zip`,
from `Duogon-production/test`, source commit
`e54331015246c746c89804faea9664356c94ae68`. All 195 manifest entries were
verified against their original SHA-256 before copying. 185 files were copied
directly; 140 remain byte-identical, 45 contain integration changes. Ten files
were protected/reference-only. See [the complete file ledger](v2-transplant-provenance.json)
for source hashes, paths and each file's classification. Identical source files
may not appear in Git's diff when the foundation already contained that source.

`app/globals.css` and `tailwind.config.js` are byte-identical to the handoff.
Existing package versions and lockfile were retained; the only package-script
change adds the adapter tests. Only the supplied portable source handoff was
imported; no source from the rejected redesign branch or other V2 archives was used.

## Screen-by-screen integration

Paths below are repository-relative. Common identity, transport and contract
adapters are described after this table.

| Screen | Actual V2 source used | Integration boundary and working behavior | Missing capability / unavoidable difference | Verification |
| --- | --- | --- | --- | --- |
| App shell, desktop/sidebar/mobile, splash/loading/footer | `frontend/components/{sidebar,navbar-routes,logo,edulabs-mark,intro-splash,loading-overlay,route-loading-signal,footer}.tsx`, loading provider, `frontend/features/dashboard/mobile-sidebar.tsx`, original UI primitives, CSS, logo SVG | Existing root/dashboard layouts retain server-session selection; original Figtree/Caprasimo fonts, classes, composition and animations; original sidebar uses application identity and verified scoped navigation; real logout | Firebase avatar/account menu replaces Clerk widget; staff/learner badge is presentation only. Existing multi-organization onboarding link remains available. Original fixed footer/contact branding is retained for Step 2 | Authenticated desktop/mobile screenshots; mobile navigation; logout/session restoration; no JS exceptions or hydration errors |
| Firebase sign-in/sign-up | Original auth layout and source route wrappers | Existing Firebase forms, provisioning and verified server sessions remain authoritative | Firebase forms intentionally replace Clerk forms. Visual parity of those form interiors is not claimed; no copied Clerk session handling used in Firebase mode | Real disposable Firebase sign-in, refresh and logout; sign-in screenshots |
| Student home | `frontend/features/dashboard/student-home.tsx`, original recommended/course card components | `WebsiteHome` projects authorized published lessons and offering-specific progress with `shared/v2-learning-model.ts`; original carousel/interactions retained | Live sessions/homework aren't connected; explicit unavailable status replaces fictional homework status. Original hero/template slides and fixed academic branding remain. Additional offering/assessment summaries preserve existing access paths | Student desktop/mobile screenshots; authenticated scope; bounded-data guard; adapter tests |
| Staff home | `frontend/features/dashboard/admin-home.tsx` | Scoped staff detection remains in `WebsiteHome`; actual accessible offering count supplied | No global ADMIN role. Unique-student, waitlist and homework metrics are unavailable, not invented. Signup/submission feeds aren't connected | Staff desktop/mobile screenshots; cross-tenant checks |
| Self Learning / course curriculum | `frontend/features/self-learning/self-learning-view.tsx`, `frontend/features/courses/lesson-card.tsx` | Modules group by real module ID plus offering; published lessons only; numbering restarts per module; real offering-specific completion; original expand/collapse and card JSX/classes | No fabricated images, segment counts or playback URLs. Part badge omitted when unknown. Cards cannot enter a legacy segment route. Without a selected offering, progress is explicitly unavailable. Incomplete/truncated results do not claim authoritative totals | Two same-title modules, draft exclusion, two offerings with distinct progress, numbering, no fabricated links/counts; desktop/mobile screenshots |
| Course detail | Source `app/(dashboard)/(routes)/courses/[courseId]/detail/page.tsx` extracted into `frontend/features/courses/course-detail.tsx` | Original detail composition gets an authorized course prop; real title and rich-text description; legacy fetches and feedback submission skipped in Firebase mode | Original inert Continue Studying and literal 4/5 rating retained as source issues; visible note labels rating as a template placeholder and feedback as unavailable. No cover shown when absent. Curriculum and offering selectors are appended because the new model separates courses and runs | Authorized course screenshots at both sizes; private unenrolled course denied |
| Search/catalog | Original `frontend/components/{search-input,course-card}.tsx` and source search composition | `WebsiteSearchCourses` supplies authorized courses, real module counts and bounded query/pagination | Global categories lack a backend adapter; visible status explains limitation. Organization name can label authorized results. Search is not a public/global catalog | TypeScript/build and authorization coverage; not separately exercised end-to-end in browser |
| Groups / offering roster | `frontend/features/groups/group-roster-view.tsx` | Existing group/offering server routes preserve offering selection. Staff gets authorized paged roster; student gets only own enrollment. Real enrollment status replaces unrelated legacy submission status | Original V2 assumes a single group; existing offering selector is retained rather than guessing. Classmate data remains private. Live session/homework submission data unavailable | Student group screenshot/check; live RLS own-record checks. Staff roster paging covered by existing tests, not a new browser scenario |
| Teacher course list | Original teacher courses page extracted to `frontend/features/teacher/courses/course-list.tsx`, original list table/columns | Authorized editable courses passed as props; real title/publication state; existing pagination retained | Original Lesson wording remains although the secure backend entity is a reusable course. No fabricated teacher/date fields | TypeScript, architecture and both production builds; list navigation exercised during authenticated acceptance |
| Teacher create | Original teacher/create source extracted to `frontend/features/teacher/courses/course-create.tsx` | Existing authorized POST creates a real private draft with selected organization and slug | Organization and slug controls added using copied form primitives because required by the approved tenant model; V2 lacked these fields | Real UI-created draft and persisted editor |
| Teacher course editor | Original teacher course page extracted to `frontend/features/teacher/courses/course-editor.tsx`; original `editor/{title-form,description-form,actions,chapter-naming-form,image-form,chapters-form}.tsx` | Real title/rich-text PATCH; slug/status/visibility controls; existing optimistic updated_at check; source publish action uses secure API; server permission guards retained | Metadata controls added; unsupported shared chapter numbering, cover uploads, segment editing and delete are disabled/inert with explanations. Original lesson/segment headings retained. Publishing metadata doesn't publish lessons, enroll students or grant broader permissions | Title, rich text, metadata survive refresh; publish works; stale tab 409; student/cross-tenant edit denied; desktop/mobile screenshots |
| Lesson playback, homework editor/submission | Original lesson route/component composition, `lesson-tabs`, homework form/questions, original teacher chapter editor components | Actual source is copied and compiles; existing legacy fallback wiring remains available only in legacy mode | V2 Course/Chapter means lesson/segment, whereas Supabase has course/module/lesson/block. A reviewed content/media adapter is required. Firebase lesson and chapter routes redirect to unavailable before Clerk auth; no success simulation or schema changes | Both builds; unsupported routes including dotted suffixes gated; no authenticated playback/submission claim |
| Exams | Original exam routes and `frontend/features/exams/*`, shared exam contracts/helpers | Actual source preserved | UI's authoring/attempt/review contract is not the existing Supabase assessment API; routes gated. No fake attempts, grades or answer keys | Both builds; gated navigation; live student answer-key-column denial. No exam completion claim |
| Support messenger | Original support route and `frontend/features/support/*`, shared contracts/helpers | Actual source preserved; upload dependency replaced by an explicit unavailable adapter | No approved tenant-safe messenger backend or upload flow. Firebase route gated; unsupported upload throws instead of returning fake success | Both builds; route gated. No message-send claim |
| User/admin submissions/waitlist/modals | Original admin components, original shared modal/form/UI source | Actual frontend source retained and type-checked | No global admin capability added. Existing Firebase middleware gates legacy admin endpoints/routes; copied Axios calls fail before transport outside allowed teacher APIs | Both builds; /admin/users gate, transport test, existing architecture checks. No admin-management claim |

## Backend and authorization boundaries

There are no changes to `server/`, `supabase/`, `middleware.ts`, the Firebase
server authentication implementation or secure API handlers. All 16 existing
local/applied migrations remain present; the canceled preservation ledger is
absent. No schema, RLS, Storage or production configuration changes were made.

`frontend/components/providers/v2-identity.tsx` adapts the copied hook names to
the existing application-auth provider. User identity never grants permissions.
`application-auth-provider.tsx` adds presentation fields only. Tenant/course
permissions still come from existing server services and PostgreSQL RLS.

`frontend/lib/api.ts` rejects incompatible copied requests in Firebase mode,
allowing only the existing same-origin teacher organization/course API paths.
This guard is defense in depth; server authorization and RLS remain mandatory.
`CapabilityGate` disables and makes unsupported editor subtrees inert. Firebase
guards on newly copied exam/support and existing lesson/chapter pages run before
legacy Clerk calls, including paths excluded by middleware's static-file matcher.
`v2-support-upload.ts` explicitly rejects unavailable uploads; `file-upload.tsx`
also gates Firebase uploads. No upload backend was extended for the transplant.

The approved shared database/LMS contracts and Supabase client configuration were
protected from source overwrite. Optional UI fields in courses/dashboard contracts
represent unknown media/counts, real grouping, enrollment state and disabled URLs.
No global role column or extra backend authority was introduced.

## Unavoidable source changes

The provenance ledger identifies all 45 adapted source files. Their changes are
limited to identity/provider connections; protected server-route adaptation;
authorized prop projections; type reconciliation; unavailable feature gates;
required tenant metadata fields; and correct treatment of unknown values.
Copied component interiors retain their source structure/classes except the
documented gates, account widget and necessary metadata controls above.

Two handoff imports referenced `MessageSquareText`, absent from the installed
lucide version also named by the handoff. They use the existing `MessageSquare`
export under an alias, a small unavoidable icon difference without changing
dependencies. Duplicate `reviewNote`/`submissionStatus` JSX attributes in copied
lesson tabs were removed to compile. Unsupported exam-answer upload is gated.
Unused old-layout SupportModal mounting was removed because V2 uses its messenger
route. Original styling variables and forced-light behavior are retained.

## Verification and limits

- `npm run check`: all 64 application/adapter tests pass; architecture and
  TypeScript pass; lint has zero errors and seven warnings in copied legacy UI
  (six image warnings and one existing effect-dependency warning).
- Both isolated production builds pass: Clerk/legacy fallback and
  Firebase/Supabase. Build environment/dist configuration lives only in ignored
  `.local/transplant/`; tracked production config was not changed. Original
  Tailwind ambiguous-animation warnings and existing images.domains warning remain.
- Real authenticated Chromium 153 tests use disposable Firebase identities,
  real provisioning, organization/course APIs and Supabase data. They cover the
  working behaviors enumerated above: all 22 checks pass. No Firefox/WebKit coverage is claimed in
  this task. No JavaScript exceptions or hydration mismatches were observed.
- Eleven live caller-JWT/PostgreSQL assertions cover anonymous private-data
  denial, cross-tenant reads, published-only lessons, own offering progress,
  student/cross-tenant course mutation denial with unchanged records, and student
  answer-key-column denial. No policy was weakened to make a screen work.
- Supabase inspection confirms all 19 public application tables have RLS enabled
  and the applied migration versions match all 16 local files. Existing private
  helper tables intentionally have RLS with no direct policies. The preexisting
  Supabase Auth leaked-password-protection advisory remains; production auth
  configuration was not changed. Firebase is the active tested identity provider.
  See [Supabase remediation guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The original reference at `http://localhost:3100` is reachable. Matching
1440×1000 and 390×1000 viewport screenshots were captured for it and this app.
The reference sign-in form finished loading and was captured; its authenticated
pages were not accessed. Therefore protected-screen visual parity is established by direct
source provenance, not by a complete side-by-side runtime comparison. This is a
remaining acceptance limitation, not a claim that all original features work.

Local screenshots and machine-readable test reports are deliberately Git-ignored
under `.local/transplant/`. Screenshots contain only synthetic test identities and
records. Fixture credentials/tokens are never part of the committed report.

After acceptance, a guarded transaction removed only the recorded fixture IDs:
three profiles, two organizations, three courses, three modules, six lessons,
two offerings, two enrollments and three progress rows, plus their generated
memberships/staff/external-identity links. The transaction rejected unexpected
ownership, children or unrelated academic data before deleting anything and
confirmed zero remaining fixture profiles/organizations/courses/lessons/progress.
The three exact disposable Firebase accounts were revoked/deleted afterward and
their local credential manifest was erased. Existing user accounts, authorized
test data and legacy records were preserved.

## Remaining work — separate approval

Step 1 is complete for existing supported backend operations. Content playback,
lesson/block authoring, course cover Storage, homework, exams, support, enrollment
administration and global legacy admin workflows still need separately reviewed
backend adapters. Copying their source is not equivalent to completing those
features. No alternative UI, fake records or new policies were introduced to
hide those gaps.

Step 2 has not started. Original fixed teacher/contact branding, hero/template
slides, single-teacher language, inert Continue Studying, literal ratings,
lesson/course terminology and other handoff UI issues remain listed for a later
review. A credential-authorized original V2 reference session is also needed for
a full protected-screen comparison without importing legacy accounts.

For local review, launch `.local/start-edulabs.bat` from **this checkout on this
branch**. Use the actual free-port URL printed by the launcher; a server from an
older D: checkout will show the older code. Open `/home`, `/self-learning`, a real
authorized course/offering, or `/teacher/courses`. Synthetic acceptance records
are removed after testing; the application will display the real account's
authorized data or its genuine empty state.
