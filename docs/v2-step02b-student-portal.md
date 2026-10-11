# Step 02B — student portal cleanup

Branch `codex/v2-step02b-student-portal` starts at approved Step 02A commit
`69051440f5115043f918da35ef4c4ba1d570030a`. Previous branches are preserved.

## Scope and behavior

- Home no longer advertises organization creation to anyone. Teaching tools
  appear only when existing contextual capabilities identify staff; learner
  Home has no teaching-tools navigation. Existing authorized course creation
  remains available to staff.
- The old self-service onboarding page returns 404, including direct visits.
  Next.js may stream this not-found screen with HTTP 200; tests assert the
  not-found UI and no form rather than relying on the document status alone.
  Its HTTP POST endpoint delegates to a new server-only fail-closed handler
  returning 403. It performs no identity lookup or database mutation. The old
  organization backend implementation is retained for a future reviewed
  managed-provisioning integration. A teacher-form fallback no longer links
  back to onboarding; it explains that EduLabs staff arrange course access.
- Home and Self-Learning omit the supplementary Groups & Offerings section only
  when the authorized load is complete and its offering collection is empty.
  Nonempty sections retain their original JSX/classes and real offering links.
  The dedicated Groups route retains its explicit enrollment empty state.
- Home omits the supplementary assessment section when a complete authorized
  result has no available/upcoming published schedules. Nonempty results remain
  informational; no exam backend or participation capability was introduced.
- Incomplete results retain the existing limit warning and explicitly say the
  offering/assessment data is incomplete. They are never treated as genuine
  empty results. Repository errors/null responses still throw; no catch converts
  authorization/query failures into empty collections.

The desktop and mobile navigation share the existing Sidebar. Its Firebase staff
section is already conditional on verified contextual staff organization IDs.
Learner routes Home, Self Learning and Group remain; teacher/admin links are
absent for learners. No sidebar redesign or new teacher panel was necessary.
Scoped owners/instructors retain existing teacher interfaces and permission checks.

## Important blocker — managed provisioning is not fully enforced

Live development database inspection confirmed authenticated has EXECUTE on
`public.create_organization(text,text)`. Its private SECURITY DEFINER implementation
checks only an active account, then creates an organization and owner membership.
This was the prior self-service model. Hiding UI and closing the HTTP endpoint
cannot revoke that direct Supabase RPC capability.

This step does **not** claim that staff-only organization provisioning is fully
secured. The database grant is deliberately unchanged under the instruction to
preserve the 16 migrations and RLS policies and report provisioning architecture
blockers. No direct-RPC mutation was performed merely to demonstrate the issue;
the function definition and privilege metadata establish it.

Before enabling a managed platform in production, separately approve a migration
that revokes end-user execution of both public/private self-service wrappers,
reviews organization INSERT policies/other entry points, and defines a trusted
EduLabs-operator provisioning workflow. Operator authorization must not derive
from an organization owner/teacher role, email address or browser assertion.
Do not invent a global profile teacher/admin role to solve this. The future
operator boundary needs explicit design, grant/role tests and staging review.
This is an unresolved security/product decision, not work for Step 02C.

## Changed files

- `app/(dashboard)/_components/website-pages.tsx`: conditional teaching tools,
  complete-empty supplementary panels and truthful incomplete messages.
- `app/(dashboard)/(routes)/onboarding/organization/page.tsx`: closed UI route.
- `app/api/teacher/organizations/route.ts`: delegates to closed HTTP handler.
- `server/http/managed-provisioning.ts`: narrow server-only denial boundary;
  existing teacher services, handlers and repositories remain untouched.
- `frontend/features/teacher/courses/teacher-form.tsx`: remove obsolete fallback link.
- `scripts/student-portal.test.cjs`, npm test list in `package.json`, this report.

No migrations, RLS, Firebase session/configuration, existing teacher course
operations, global CSS, animation sources, logos, carousel logic or design tokens
were edited. No schema changes were applied remotely. Removing empty
supplementary sections naturally shortens the page; all retained V2 components
and their visual interactions remain intact.

## Verification and screenshots

Targeted tests render the real server page composition and shared Sidebar using
controlled authorized scopes. They cover genuine empty/nonempty/incomplete
results, propagation of failed loads, absent learner provisioning/teacher/admin
links and the fail-closed organization HTTP handler. Existing repository tests
continue to cover bounded authorized queries and tenant-specific capabilities.

Local acceptance artifacts are Git-ignored in `.local/step02b/`. Baseline is the
retained approved Step 02A production build. Before/after Home and Self-Learning
screenshots use 1440×1000 and 390×1000 viewports with mobile drawer captures.
`before-empty/`, `before-populated/`, `after-empty/`, `after-populated/` contain
route names followed by viewport width; `-menu.png` captures the drawer.
Synthetic identities/records only; no real student data is used in screenshots.

Authenticated tests use Chromium; no Firefox/WebKit coverage is claimed.
Runtime before/after snapshots complement source-level protection checks;
unchanged carousel timing is not a promise of identical carousel slide pixels.

No commit contains fixture credentials, tokens, private-key files, screenshots or
environment files. Exact disposable fixtures are guarded and cleaned after
testing; existing accounts and data are preserved.

Cleanup completed: guarded SQL confirmed zero remaining exact fixture profiles,
organizations, courses, lessons and progress; all three disposable Firebase
accounts were revoked/deleted and their local credential manifest erased.
No schema, policy or grant was changed during cleanup.

### Recorded verification outcomes

- `npm run check`: 72 tests pass, TypeScript and architecture checks pass;
  lint has zero errors and the same seven preexisting warnings.
- Firebase/Supabase and Clerk/legacy isolated production builds both pass.
  Existing Tailwind ambiguity/deprecated image configuration warnings remain.
- The 22 authenticated baseline/regression checks pass, including course title,
  rich-text and metadata persistence, publication, stale-tab 409, tenant-denied
  edits, Firebase sign-in/logout/session restoration, mobile navigation and
  offering-specific student progress. No JS exceptions or hydration errors.
- Eleven live caller-JWT/RLS assertions pass: anonymous/private and cross-tenant
  denial, published-only lessons, own progress, unauthorized writes and denied
  answer-key access. No policy was weakened.
- Dedicated student checks cover complete empty and populated Home/Self-Learning
  at both widths, mobile menus, no provisioning/staff links, direct onboarding
  not-found UI, organization POST 403, retained populated offering links and
  absent empty assessment summaries. Incomplete/failed scopes are tested with
  controlled server-page inputs rather than manufacturing production failures.

The empty after-state uses the same synthetic learner after withdrawing only its
exact synthetic course to draft through the authorized teacher JWT. This verifies
that withdrawal leads to a legitimate empty authorized course scope rather than
hiding a failed query. No existing course or enrollment was changed. Preliminary
direct fixture updates returned zero rows with an owner token revoked by the
logout acceptance check. Exact disposable credentials were used to refresh tokens;
the RLS checks were rerun and owner-positive reads were verified before write
denials. No policy was weakened or enrollment changed to facilitate testing.

Step 02C carousel behavior, Step 02D account settings and Step 02E teacher
contacts remain deferred, as do exams/homework/media, customization and teacher
panel development. No push, merge, deployment or production config change.
