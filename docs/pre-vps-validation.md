# Pre-VPS local validation — October 16, 2026

## Scope and isolation

Branch `codex/pre-vps-deployment` is based on verified Step 08 `f96c21007dd437613a2dda881197677c5fc48a81`. Worktree: `C:/dev/EduLabs-LMS/.local/worktrees/pre-vps`. Its PR is stacked on the Step 08 feature branch to keep the infrastructure diff independently reviewable. PR #8 remains draft; neither PR is merged. Main remains `b2ca8d180c5d4bf984986850272ed8d8de916f34`.

Development Supabase history was inspected read-only: exactly 25 migrations. All migration files are unchanged from the base. No remote SQL mutation, provider/billing change, DNS, VPS connection, real account creation or real student data was used. Runtime testing only read the already-authorized protected Firebase Admin file through a read-only mount; its contents were not copied into source, image layers or reports.

Docker Desktop was absent. The existing Ubuntu WSL registration referenced a missing VHDX; it was left untouched. A separate local Debian 13 WSL2 distribution, `EduLabsInfraTest`, was created under `E:/EduLabs-Infra-Test` (NTFS, ample free space). This is local test infrastructure, not OVH. Original app servers and worktrees were not modified. Test HTTPS bound loopback port 8443, with an internal CA and disposable gate password stored only under ignored `.local/infra/`. Local images/volumes are retained for reuse; the stack/runtime are stopped after packaging. No worker schedule is enabled.

## Actual results

| Check | Result |
| --- | --- |
| Fresh Linux web image build | Passed, Node 24.22.0 / Debian bookworm, pinned base digest |
| Linux startup | Healthy on Debian 13 WSL2 Docker; actual Next server served sign-in/assets |
| Worker image | Built; refused startup while disabled, before reading credentials/contacting provider |
| Windows checks | 200 tests, TypeScript, architecture and lint passed; seven existing lint warnings |
| Linux checks in builder image | Same 200 tests, TypeScript, architecture and lint passed |
| SQL regression | All 15 local rollback suites / 892 assertions passed; no remote execution |
| Clerk/legacy production build | Passed with isolated output and existing configuration read only in-process |
| Firebase/Supabase Linux production build | Passed with public-only build args; no Admin/service/database secret at build time |
| HTTPS browser smoke | Five check groups passed, Chromium desktop and 390×844 mobile |
| Graceful shutdown | SIGTERM stop completed in ~2.1 seconds, exit 0, no OOM; restarted healthy |
| Runtime isolation | UID/GID 10001, read-only web filesystem, capabilities dropped, no published app port, 3 GiB memory bound |
| Secret-negative tests | Missing Admin credential fails closed; mismatched public runtime settings/mode/origin rejected in unit tests |
| Build-context canaries | Synthetic `.env.local` and `infra/credentials-canary.json` excluded even from builder image |
| Shell/configuration | Bash syntax and actual Compose/Caddy configuration validation passed |

Browser smoke verified: unauthenticated pages/API/health/static assets return 401 at the private gate; incorrect gate password is denied; correct gate serves actual application/static assets; academic API still rejects missing Firebase identity; desktop/mobile sign-in has no JavaScript exceptions. A browser-injected Firebase throttle creates only one synthetic client identity, shows account-preserved recovery, and prevents another immediate create/send. All Google authentication writes were intercepted in this recovery test: no actual provider account or email was created. It does not establish that live Firebase mail or a VPS domain works.

The tested web image is about **357 MB** (357,329,404 bytes), worker **248 MB** (248,259,945 bytes); layers are shared. Caddy 2.11.7 is ~66 MB. Observed idle RSS-like Docker memory usage after smoke: web ~123 MiB, Caddy ~15 MiB. These are idle observations, not peak-build/traffic/load benchmarks. Capacity budgets and exact commands are in `docs/pre-vps-deployment.md`.

Image IDs before release tagging:

- Web: `sha256:0f65ad661432a3c52c839175bafd89e4b461e600758781ccf06010b7f9f58154`.
- Worker: `sha256:ab46b6fe9c18c072e389f271fecbe57f82ba5c7bf96aab3e12c677bbf17ec423`.
- Node base: `node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5`.
- Caddy: `caddy:2-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f`.

The local test daemon was Debian's Docker 26.1.5 and Compose 2.26.1. Production instructions use the current official Docker repository; `!override`/optional env_file need a sufficiently recent Compose plugin. WSL reported no swap-limit support, so production cgroup/swap/firewall behavior still requires OVH smoke testing. No assertion of OVH hardware or kernel parity is made.

## Narrow corrections discovered during testing

- Firebase SDK requires Node >=24.12.0; updated application engine metadata and pinned container runtime accordingly. No existing dependency version changed.
- Linux `npm ci` exposed three omitted optional/peer lock entries: `@emnapi/core`, `@emnapi/runtime`, `@opentelemetry/api`. Repaired lock metadata using the pinned Linux npm; Windows and Linux clean install/checks passed afterward.
- Preserved the existing Buffer compatibility shim in standalone/worker entrypoints because standalone does not execute the original configuration JavaScript at runtime.
- Fixed secret mount target names and Caddy block syntax, then reran real startup/gate checks. Increased proxy body cap to 64 MB to preserve the application's existing 50,000,000-byte video upload allowance; application file validation remains authoritative.
- Worker uses its own small pinned lockfile, avoiding unrelated legacy/native application dependencies and a slow full dependency-pruning stage.
- Signup recovery preserves an existing authenticated Firebase identity after email-send/profile-update failure. It never auto-links an unauthenticated account by matching email and never changes verification/enrollment authorization.

Failed intermediate build/harness logs were retained under `.local/infra/`; final passing logs are `verified-docker-build.log`, `worker-build.log`, `final-check.log`, `linux-check.log`, `legacy-build.log`, `sql.log`, `browser-smoke.log`, `container-verification.json` and `shutdown-results.json`. Screenshots: `sign-in-desktop.png`, `sign-in-mobile.png`, `signup-recovery.png`. Nothing from that private evidence directory is committed.

## Security findings and remaining gates

Application npm audit remains at the established **seven high and two low** advisories: high findings in existing lint/Tailwind/build-tool dependency paths; low Quill/react-quill-new findings. No existing package was upgraded or vulnerability silently marked resolved. Worker audit reported **zero** advisories. An independent OS/container CVE scanner was not run; digest pinning and fresh apt packages are not a claim of CVE-free images. Review these findings before production release.

Live Firebase verification-email throttling remains unresolved. Recovery UI is tested against a simulated provider failure; real verification-code consumption and inbox delivery must pass after the provider throttle clears. No quota/provider/billing change was attempted. R2/video delivery is still a separate integration gap; existing Supabase media remains in place. Device push and live worker dispatch require explicitly configured credentials and acceptance, not merely a running container.

The VPS has not been purchased, and no real host firewall/SSH, public DNS/ACME, authorized domain, production database, production deployment, load test or physical-device test was executed. The package is ready for owner review and a private staging rollout after these configuration/access gates; it is not an authorization or claim of production readiness.

The source archive is generated from the reviewed infrastructure commit; image archive contains only web/worker images (no running-container state, secret mounts or volumes). SHA-256 manifests accompany both. Caddy is pulled by its pinned digest on the destination. Preserve older image/config releases and never revert schema automatically. Exact package paths/digests and PR URL are reported at delivery.

## Changed files (39)

- `.gitattributes`
- `.gitignore`
- `frontend/features/auth/firebase-form.tsx`
- `middleware.ts`
- `next.config.js`
- `package-lock.json`
- `package.json`
- `scripts/firebase-auth.test.cjs`
- `.dockerignore`
- `Dockerfile`
- `app/api/health/route.ts`
- `compose.yaml`
- `docs/pre-vps-deployment.md`
- `docs/pre-vps-validation.md`
- `frontend/lib/signup-recovery.ts`
- `infra/Caddyfile`
- `infra/Caddyfile.local`
- `infra/buffer-compat.cjs`
- `infra/build-config.cjs`
- `infra/build.sh`
- `infra/caddy.env.example`
- `infra/compose.local.yaml`
- `infra/deploy.sh`
- `infra/deployment.env.example`
- `infra/edulabs-monitor.service`
- `infra/edulabs-monitor.timer`
- `infra/healthcheck.cjs`
- `infra/monitor.sh`
- `infra/public.env.example`
- `infra/runtime.cjs`
- `infra/web.env.example`
- `infra/worker-health.cjs`
- `infra/worker.cjs`
- `infra/worker.env.example`
- `infra/worker/package-lock.json`
- `infra/worker/package.json`
- `scripts/deployment.test.cjs`
- `scripts/signup-recovery.test.cjs`
- `server/http/health.ts`
