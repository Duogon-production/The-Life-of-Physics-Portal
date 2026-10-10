# Dependency security remediation — 2026-10-10

## A. Security audit summary

Work is on `security/dependency-remediation`, created from the existing dirty checkout. Existing local Supabase work and other changes were preserved. Nothing was committed, pushed, deployed, or migrated to another provider.

The fresh baseline reproduced the historical 44 affected-package findings. This is a count of npm audit package entries, including inherited findings, rather than 44 independent vulnerabilities. The complete [advisory inventory](dependency-advisory-inventory.md) covers all 139 original direct advisory records, installed versions, affected ranges, actual remediation versions, dependency paths, applicability and compatibility. Unchanged and upgraded direct packages are listed below.

| Severity | Before, all | After, all | Before, production | After, production |
|---|---:|---:|---:|---:|
| Critical | 4 | 0 | 4 | 0 |
| High | 23 | 7 | 23 | 5 |
| Moderate | 15 | 0 | 15 | 0 |
| Low | 2 | 2 | 2 | 2 |
| Total | 44 | 9 | 44 | 7 |

All four critical package findings are removed: Next.js, Clerk, form-data and protobufjs. Moderate findings are also gone. The remaining nine entries represent **two unpatched upstream advisories**, detailed in D. The audit is deliberately not described as clean.

Important baseline exposures:

- Next.js 13.4.12 handled App Router/SSR/RSC, remote image optimization and the authentication middleware boundary. Middleware bypass and Windows server vulnerabilities were material concerns. Some other advisories required absent features, including Pages Router i18n, application Server Actions, CSP nonces or untrusted beforeInteractive scripts. An affected package version alone did not establish each exploit.
- Clerk 4.25.3 was within the critical `auth()`/`getAuth()` IDOR range. These functions were used throughout the application. The SDK also brought old cookie, URL matching and JWT dependencies.
- form-data 4.0.0 was introduced through Axios used by the app and backend Mux/LiveKit dependencies; form-data 3.0.1 came through the older Clerk/Node fetch type chain. These were replaced by form-data 4.0.6 or removed with the old SDK tree. Browser Axios does not invoke the Node multipart implementation.
- protobufjs 7.2.5 and its UTF-8 helper were in the LiveKit client/protocol tree. Network message decoding is used; exposing an arbitrary protobuf schema/code-generation service was not found. Fresh compatible transitives are protobufjs 7.6.6 and @protobufjs/utf8 1.1.2.
- UploadThing pinned Effect 3.17.7. Its AsyncLocalStorage advisory was relevant because upload middleware also resolves Clerk identity. No cross-user exploit was demonstrated, but the dependency was patched rather than relying on that uncertainty.

Audits cover the entire tree and production scope. Build tools were moved to devDependencies according to actual purpose; this was not counted as remediation. All-dependency audit findings remain visible. UploadThing's optional Tailwind peer still causes Tailwind and four inherited packages to appear in the production audit even though their use here is build/watch-time.

Raw evidence: [all before](security/audit.before.json), [all after](security/audit.after.json), [production before](security/audit.production.before.json), [production after](security/audit.production.after.json). No audit configuration, ignores, severity filter or package exclusion was introduced.

## B. Fixes implemented

Major targeted upgrades are Next.js 13.4.12 → 15.5.27; Clerk Next.js 4.25.3 → 7.9.14; Clerk backend 0.30.3 → 3.23.2; Axios 1.5.1 → 1.20.0; React/React DOM 18.2.0 → 18.3.1; query-string 8.1.0 → 9.5.1; PostCSS 8.4.31 → 8.5.29; ESLint 8.50.0 → 8.57.1; eslint-config-next 13.5.4 → 15.5.27. React Quill 2.0.0/Quill 1.3.7 was replaced with react-quill-new 3.8.3/Quill 2.0.3.

Next.js 15 is the smallest currently supported patched major compatible with React 18 and current Clerk. Next.js 13 is unsupported; a safe 13.x-only repair was not available. The [Next.js support policy](https://nextjs.org/support-policy) gives 15 a two-year maintenance window from its October 2024 release. Plan the Next.js 16/React 19 compatibility work before that window ends around **2026-10-21**, especially if launch follows that date.

Unrelated UI component package versions were retained at their original installed versions, rather than leaving incidental minor upgrades from the dependency refresh. Direct versions are now pinned. Prisma and @prisma/client remain paired at 5.22.0; UploadThing, Mux and LiveKit direct versions remain unchanged. The npm v3 lockfile was refreshed with patched compatible transitives and retains integrity hashes.

Removed dependencies: unused `@neon/config`, `@neon/env`, `@react-email/render`, and `moment`. Repository searches found no active application use. The otherwise unused `neon.ts` configuration stub was removed with its package. No legacy database, authentication or upload integration was removed. `@next/env` is now explicitly declared for the existing operational scripts that already used it.

Overrides are limited to these packages:

| Override | Reason and verification |
|---|---|
| `postcss: $postcss` → 8.5.29 | Next.js 15.5.27 pins vulnerable PostCSS 8.4.31. Remains within the PostCSS 8 API. Production build and nested/Tailwind CSS regression checks pass. |
| `postcss-selector-parser: 7.1.6` | Patches the selector parser inherited through PostCSS nested/Tailwind. This crosses the parser's major version, so actual nested selectors, responsive utilities and the full production stylesheet build were tested. |
| `effect: 3.22.2` | UploadThing/shared and Effect platform consume Effect 3. The override stays on that major, bypassing UploadThing's vulnerable exact pin. Middleware authorization, route registry and production build pass; a real upload remains an account-dependent acceptance test. |

Do not remove these overrides merely because a parent framework version is newer: check its resolved lockfile dependencies and rerun verification first.

Compatibility changes:

- Server Clerk helpers now come from `@clerk/nextjs/server`; all `auth()` calls await the current API. Backend account lookup uses `createClerkClient`.
- `clerkMiddleware` explicitly protects every matched private route. Sign-in/sign-up, the existing test page and the UploadThing callback remain public. UploadThing itself still authenticates and authorizes upload initialization.
- Next.js pages and handlers await promised route parameters; the browser course detail page uses `useParams`. Search parameters and Supabase request cookies are awaited.
- Sign-out redirect configuration moved from UserButton to ClerkProvider. Clerk optional form fields are explicitly retained. The teacher/student role rules and existing identities were not migrated.
- The editor retains snow/bubble themes and the string HTML contract. `useSemanticHTML={false}` preserves the old DOM-serialized HTML behavior and avoids the unpatched Quill semantic-export path.
- Lint uses the ESLint CLI instead of deprecated `next lint`. Actual build/type/lint packages are devDependencies. Node 22+ is required; verification used Node 24.18.0.
- Local development binds `localhost` instead of all network interfaces, matching Next/Clerk's internal localhost origin on this Windows setup. Use `npm run dev` and open `http://localhost:3000`; LAN access now requires an explicit hostname override.

### Direct package inventory

| Direct package | Before installed | After installed | Final scope |
|---|---|---|---|
| @clerk/backend | 0.30.3 | 3.23.2 | Runtime/browser |
| @clerk/nextjs | 4.25.3 | 7.9.14 | Runtime/browser |
| @hello-pangea/dnd | 16.3.0 | 16.3.0 | Runtime/browser |
| @hookform/resolvers | 3.3.1 | 3.3.1 | Runtime/browser |
| @livekit/components-react | 1.4.0 | 1.4.0 | Runtime/browser |
| @livekit/components-styles | 1.0.7 | 1.0.7 | Runtime/browser |
| @mux/mux-node | 7.3.2 | 7.3.2 | Runtime/browser |
| @mux/mux-player-react | 2.0.1 | 2.0.1 | Runtime/browser |
| @neon/config | 1.8.2 | Removed | Runtime/browser |
| @neon/env | 1.4.7 | Removed | Runtime/browser |
| @next/env | — | 15.5.27 | Development/build |
| @prisma/client | 5.22.0 | 5.22.0 | Runtime/browser |
| @radix-ui/react-alert-dialog | 1.0.5 | 1.0.5 | Runtime/browser |
| @radix-ui/react-checkbox | 1.0.4 | 1.0.4 | Runtime/browser |
| @radix-ui/react-dialog | 1.0.5 | 1.0.5 | Runtime/browser |
| @radix-ui/react-dropdown-menu | 2.0.6 | 2.0.6 | Runtime/browser |
| @radix-ui/react-label | 2.0.2 | 2.0.2 | Runtime/browser |
| @radix-ui/react-popover | 1.0.7 | 1.0.7 | Runtime/browser |
| @radix-ui/react-progress | 1.0.3 | 1.0.3 | Runtime/browser |
| @radix-ui/react-separator | 1.0.3 | 1.0.3 | Runtime/browser |
| @radix-ui/react-slot | 1.0.2 | 1.0.2 | Runtime/browser |
| @radix-ui/react-tooltip | 1.0.7 | 1.0.7 | Runtime/browser |
| @react-email/render | 2.1.0 | Removed | Runtime/browser |
| @supabase/ssr | 0.12.7 | 0.12.7 | Runtime/browser |
| @supabase/supabase-js | 2.117.2 | 2.117.2 | Runtime/browser |
| @tanstack/react-table | 8.10.7 | 8.10.7 | Runtime/browser |
| @types/node | 20.8.2 | 20.8.2 | Development/build |
| @types/react | 18.2.25 | 18.2.25 | Development/build |
| @types/react-dom | 18.2.10 | 18.2.10 | Development/build |
| @uploadthing/react | 7.3.3 | 7.3.3 | Runtime/browser |
| autoprefixer | 10.4.16 | 10.4.16 | Development/build |
| axios | 1.5.1 | 1.20.0 | Runtime/browser |
| class-variance-authority | 0.7.0 | 0.7.0 | Runtime/browser |
| clsx | 2.0.0 | 2.0.0 | Runtime/browser |
| cmdk | 0.2.0 | 0.2.0 | Runtime/browser |
| eslint | 8.50.0 | 8.57.1 | Development/build |
| eslint-config-next | 13.5.4 | 15.5.27 | Development/build |
| framer-motion | 13.4.6 | 13.4.6 | Runtime/browser |
| livekit-client | 1.14.4 | 1.14.4 | Runtime/browser |
| livekit-server-sdk | 1.2.7 | 1.2.7 | Runtime/browser |
| lucide-react | 0.284.0 | 0.284.0 | Runtime/browser |
| moment | 2.29.4 | Removed | Runtime/browser |
| next | 13.4.12 | 15.5.27 | Runtime/browser |
| next-themes | 0.2.1 | 0.2.1 | Runtime/browser |
| postcss | 8.4.31 | 8.5.29 | Development/build |
| prisma | 5.22.0 | 5.22.0 | Development/build |
| query-string | 8.1.0 | 9.5.1 | Runtime/browser |
| react | 18.2.0 | 18.3.1 | Runtime/browser |
| react-dom | 18.2.0 | 18.3.1 | Runtime/browser |
| react-facebook | 9.0.12 | 9.0.12 | Runtime/browser |
| react-hook-form | 7.47.0 | 7.47.0 | Runtime/browser |
| react-hot-toast | 2.4.1 | 2.4.1 | Runtime/browser |
| react-icons | 4.11.0 | 4.11.0 | Runtime/browser |
| react-quill | 2.0.0 | Removed | Runtime/browser |
| react-quill-new | — | 3.8.3 | Runtime/browser |
| recharts | 2.9.0 | 2.9.0 | Runtime/browser |
| resend | 6.31.0 | 6.31.0 | Runtime/browser |
| server-only | 0.0.1 | 0.0.1 | Runtime/browser |
| tailwind-merge | 1.14.0 | 1.14.0 | Runtime/browser |
| tailwindcss | 3.3.3 | 3.3.3 | Development/build |
| tailwindcss-animate | 1.0.7 | 1.0.7 | Development/build |
| typescript | 5.2.2 | 5.2.2 | Development/build |
| uploadthing | 7.7.4 | 7.7.4 | Runtime/browser |
| zod | 3.22.4 | 3.22.4 | Runtime/browser |
| zustand | 4.4.4 | 4.4.4 | Runtime/browser |


## C. Verification results

| Command / check | Result |
|---|---|
| `npm ci` | Pass; clean installation and Prisma Client generation. No database migration or writes. |
| `npm run typecheck` | Pass, including Supabase client/types and Next.js generated route types. |
| `npm run lint` | Pass: zero errors; eight pre-existing image/hook warnings remain. |
| `npm test` | 35 tests pass: 29 existing plus six dependency compatibility/security regressions. |
| `npm run check:boundaries` | Pass: client/server separation and private environment restrictions retained. |
| `npm run build` | Pass: production compilation, generated route validation, page data and build traces. |
| `npm run dev -- --port 3109` | Starts successfully on localhost; sign-in and UploadThing endpoints return 200. |
| `npm run test:security-smoke` | Ten checks pass against a local production server: login pages; student/teacher/admin redirects; anonymous API rejection; old middleware-bypass header rejection; UploadThing registry; native Sharp PNG; LiveKit JWT signing. |
| `npm run test:lms-http` | Four real Supabase HTTP checks pass: anonymous course/profile denial; private schema not exposed; unsigned JWT rejected. |
| `npm run db:legacy-inspect` | Read-only Prisma inspection succeeds: 7 users, 4 courses, 8 chapters and existing associated data remain accessible. No writes. |
| Supabase `authorization.sql` via official MCP | 71 assertions pass using actual database roles and policies. Transaction rolled back. |
| Supabase `hardening.sql` via official MCP | 51 assertions pass including assessment/media constraints. Transaction rolled back. |
| Migration hashes | All eleven SQL migration files unchanged by this remediation. No migrations applied or policies modified. |
| Browser bundle secret check | No configured private credential value found in production static JavaScript. No credential values printed. |
| `npm audit --json`, `npm audit --omit=dev --json` | Both exit 1 because remaining advisories are disclosed, with counts in A. This is not a passing clean audit. |
| `npm ls --all` | Dependency tree inspected. npm 11.6.2 reports two extraneous optional WASM packages after clean install; no missing required dependency remains. See below. |

The npm 11.6.2 installer initially omitted the optional Sharp WASM runtime from its lock resolution. A one-off npm 11.21.0 install repaired the same v3 lockfile; global npm was not changed. A subsequent ordinary `npm ci` succeeds. npm still reports `@img/sharp-wasm32` and `@emnapi/runtime` as extraneous on Windows because their optional platform wrapper is not active. Native Windows Sharp is installed and its actual PNG smoke test passes. This is a remaining optional-package accounting issue, not a claimed clean `npm ls`. No dependency deletion, disabled install scripts, unsafe override or downgraded image processor was used to conceal it.

Local runtime smoke uses `npm run start -- --hostname localhost --port 3108`. Binding only `127.0.0.1` while Next's internal origin uses localhost caused IPv6 proxy connection errors on this machine; using localhost resolves the test environment issue. That failed experiment is not counted as a passing smoke.

Verification limits: there are no dedicated signed-in teacher/student browser sessions or disposable upload accounts available to this task. Successful interactive sign-in, persistence across refresh, account management, actual file upload/download, Mux remote operations and visual equivalence across authenticated pages are **not end-to-end verified**. Their code type-checks/builds, and authorization adapters have unit coverage. No identity provisioning, real uploads, paid service or production data writes were used as a substitute.

The official Supabase advisors were also checked. No security ERROR was reported. The existing leaked-password-protection WARN remains on the Free project; it was not enabled through a paid upgrade. The two private deny-all tables intentionally have no RLS policies; unused-index notices on the small development dataset do not justify deleting indexes. These are unchanged database findings, separate from dependency remediation.

## D. Remaining vulnerabilities

| Package entries | Advisory | Severity | Exposure, mitigation and next action |
|---|---|---|---|
| braces; inherited chokidar, micromatch, fast-glob, Tailwind, @next/eslint-plugin-next, eslint-config-next | [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | High; seven all-scope / five production-scope entries | All published braces releases through 3.0.3 lack recursive-AST depth guards. This app only supplies trusted repository/build/watch patterns, not student-request patterns. Do not feed upload names, arbitrary tenant configuration or user patterns into these tools. Build untrusted branches only in disposable CI. Monitor upstream and replace the dependency once a real patch is released. Tailwind 4 would require a separate CSS migration and would not by itself eliminate the ESLint chain. No published compatible fix was found. |
| quill, react-quill-new | [GHSA-v3m3-f69x-jf25 / CVE-2025-15056](https://github.com/advisories/GHSA-v3m3-f69x-jf25) | Low; two entries in both scopes | Quill 2.0.3 interpolates formula/video values in semantic HTML export. No patched release is published. Both application wrappers set `useSemanticHTML={false}`; the app does not invoke getSemanticHTML, removing the identified export path. A regression test guards this. Do not introduce semantic HTML export without sanitization/escaping. Keep the audit finding visible and upgrade to the first patched release; do not downgrade Quill to evade the advisory. |

The [original Quill disclosure](https://fluidattacks.com/advisories/diomedes) identifies semantic/export HTML as the vulnerable workflow. Disabling this path is a mitigation, not an upstream package patch. Any future raw-HTML rendering/export feature needs an independent sanitization design.

No known fixable critical/moderate advisory remains. The remaining high/low advisories have no published safe compatible patch and their identified application exposures are bounded as described. No assertion is made that every possible vulnerability in those packages is impossible.

## E. Breaking changes and maintenance

Clerk and Next.js majors required the source migrations in B. Anonymous non-document API requests now receive Clerk's protected 404 response rather than the older middleware behavior; browser document requests redirect to sign-in. Consumers should treat 401/403/404 as denied, rather than expecting a JSON authentication error from middleware. No authenticated endpoint response contract was intentionally changed.

Next.js 15 defaults GET handlers and request APIs differently; protected request-dependent pages remain dynamic. The application has no use-server actions to migrate. ClerkProvider's current components retain the configured flows, but an authenticated browser acceptance pass remains required because SDK-rendered UI can change between major versions.

Quill 2 uses newer internal document/list handling while keeping the same named themes. Existing stored HTML is not rewritten. Check existing lists/links and save/reopen a description in the account acceptance pass. No site layout, colors, navigation or page design was changed intentionally.

ESLint 8, the existing Mux SDK name and Recharts 2 still emit deprecation notices. They have no unresolved audit advisory beyond the documented build chain; maintenance migrations should be planned separately. The original runtime choices were retained to avoid an unrelated UI/media rewrite. Finish the Next.js support-window upgrade before a launch beyond its maintenance period.

Clerk 7 also deprecates `createRouteMatcher` in favor of checks where protected resources are accessed. It remains supported in this installed major and its behavior is covered by unit and runtime checks. Existing resource checks were preserved. Include the [resource-based authorization migration](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher) in the next authentication phase, especially for endpoints whose only current guard is middleware; this task did not perform a full resource-authorization redesign.

## F. Repository changes

Core manifests: `package.json`, npm v3 `package-lock.json`. Authentication: `middleware.ts`, `app/layout.tsx`, protected layouts/pages, server HTTP handlers and `server/services/user.ts`. Next.js request compatibility also touches dynamic course/teacher pages, search and the client course detail page. Frontend changes are limited to Clerk sign-out configuration, server sidebar auth calls and editor/preview package/compatibility props.

Supabase application adapter changes: `server/integrations/supabase.ts` and `server/services/lms-staging.ts` await request cookies/client creation. UploadThing auth changes: `server/integrations/uploadthing.ts`. Existing backend/LMS tests now mock the current server-only Clerk import.

Added `scripts/dependency-security.test.cjs`, `scripts/security-smoke.cjs`, this report, `docs/dependency-advisory-inventory.md`, and the four raw audit JSON snapshots under `docs/security/`. README links the report and smoke command. Removed unused `neon.ts`.

The exact remediation file manifest is [changed-files.txt](security/changed-files.txt); prior unrelated local files are excluded. Some listed files also contained pre-existing work, as noted above.

The checkout also contains prior uncommitted Supabase directories, docs, scripts, types, .gitignore changes and verified-email work. Those are not new dependency-remediation deliverables and were preserved. There is no commit or push to review yet; the branch contains the combined existing local state plus these changes.

## G. Production readiness

Dependency security is substantially improved and all currently fixable identified findings were addressed. The known unpatched build-pattern issue has no student-input path here, and Quill's identified export path is disabled. A zero-warning security certification is **not** claimed.

Proceed with engineering/staging validation. Public launch still needs a real teacher/student login and session/account/upload acceptance pass, review of the two retained upstream risks, and a supported Next.js version at the actual launch date. This dependency task did not certify broader application authorization, LiveKit room membership, abuse controls, rate limiting, operational backup/recovery or load capacity for 2,000 students.

## H. Firebase readiness

The repository can proceed to the planned Firebase/Supabase design and implementation phase; no Firebase dependency, hosting cutover, Clerk user migration or Supabase data cutover was introduced. The retained advisories do not require a premature authentication migration, but the framework support deadline and account acceptance checks should be handled first or explicitly included in that phase.

Firebase identities must not simply replace `profiles.id`: the Supabase model still references `auth.users`. Define a verified subject mapping/token strategy and preserve contextual organization/offering authorization. See [identity transition](identity-transition.md) and [legacy data mapping](legacy-data-migration.md). Clerk remains the active website authentication provider; Supabase staging remains opt-in and requires its own verified session.
