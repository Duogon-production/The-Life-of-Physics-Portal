# Pre-VPS deployment runbook — private staging only

Base: Step 08 candidate `f96c21007dd437613a2dda881197677c5fc48a81`, PR #8 remains draft/unmerged. This infrastructure branch is separate. Development Supabase is `gmvouqgjbtbkbhrdruzu`, 25 migrations. These instructions authorize no production rollout or remote change by themselves.

## Runtime audit

Next.js 15.5.27 App Router requires a Node server: Firebase Admin cookies/verification, protected API handlers, Supabase caller-token requests, signed Storage access and legacy Clerk/Prisma fallback prevent static export. Firebase 13's locked SDK requires **Node >=24.12.0**; the former >=22.13 declaration was insufficient. Docker uses a digest-pinned Node 24 Debian bookworm/glibc image, OpenSSL 3 and CA certificates. The host is Debian 13; the container OS can independently remain bookworm. Prisma is generated inside Linux, Sharp installs its Linux native binaries, and the existing Buffer compatibility shim is preserved in standalone startup. No dependencies are imported from Windows node_modules.

`EDULABS_STANDALONE=1` opts into standalone output and two build workers only for the image. Ordinary Firebase and Clerk builds retain their normal configuration. The image copies standalone output, static assets and public resources; it does not copy source secrets, Git data, node_modules from the host, local test artifacts or backups. The Docker context is allowlisted. Public build configuration is recorded inside the image; runtime mismatches fail closed. Build args must never carry private keys, Admin JSON, database passwords or service-role keys.

Web and worker run as UID/GID 10001, without Linux capabilities, with read-only roots and bounded tmpfs. Caddy has only NET_BIND_SERVICE, no admin API, read-only root and persistent certificate volumes. Only Caddy publishes ports; by default they bind loopback. A mandatory separate Basic Auth gate protects **all** application paths and assets before Firebase authorization. The notification worker is an opt-in profile and additionally refuses startup unless explicitly enabled; its server credential is never mounted in web or Caddy.

## Capacity planning (budget, not a load-test guarantee)

- Target: 4 vCPU, 8 GB RAM. App limit 3 GB / 2.5 CPUs, Node heap 2 GB; Caddy 256 MB / 0.5 CPU; optional worker 384 MB / 0.5 CPU. Reserve at least 1.5–2 GB for Debian/Docker, native allocations and monitoring. No local PostgreSQL is deployed.
- Build heap 4 GB, two build workers. Prefer prebuilding and transferring images so the 8 GB VPS serves traffic without simultaneous builds. A build may need 4–6 GB RAM; do not build while the trial is busy.
- Reserve **25 GB free** for Docker build/cache and at least **40 GB total usable disk** for two releases, logs and operational headroom; 60+ GB is preferable if retaining build caches. Actual image sizes/test measurements are in `docs/pre-vps-validation.md`. Videos and database binaries must not live on the VPS.
- Logs rotate at 10 MB ×3 per container. Alert at 85% disk use, OOM/restarts, unhealthy containers and sustained high RAM/CPU. Docker health does not prove Firebase mail, database availability or actual external TLS.

## Environment variables (names only)

Public build file: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Optional public Firebase fields: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`.

Web runtime: `APP_ORIGIN`, `GOOGLE_APPLICATION_CREDENTIALS`; image fixes `NEXT_PUBLIC_AUTH_BACKEND=firebase-staging`, `LMS_DATA_BACKEND=supabase-staging`. Optional `PUSH_VAPID_PUBLIC_KEY`. Firebase Admin credentials are a protected runtime file, not environment-file contents. Do not supply Clerk, Prisma database, Mux, UploadThing or Supabase service credentials to this staging web image.

Compose interpolation: `EDULABS_IMAGE`, `EDULABS_WORKER_IMAGE`, `WEB_ENV_FILE`, `CADDY_ENV_FILE`, `FIREBASE_ADMIN_FILE`, `HTTPS_BIND`, `WORKER_ENV_FILE`, `NOTIFICATION_WORKER_KEY_FILE`.

Caddy runtime: `APP_HOST`, `TLS_EMAIL`, `REVIEW_USER`, `REVIEW_PASSWORD_HASH`. Generate a strong separate review password; it does not replace Firebase sign-in. Preserve literal dollar signs in the bcrypt hash (single-quote its value in the protected Compose env_file).

Optional worker: `NOTIFICATION_WORKER_ENABLED`, `NOTIFICATION_WORKER_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY_FILE`, `NOTIFICATION_WORKER_PUSH`, `PUSH_VAPID_SUBJECT`, `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY_FILE`. No worker key is needed to deploy the default stack. Full push requires a separately reviewed private-key secret mount and device testing; do not enable it by only setting a flag.

## Debian 13 preparation after purchase and authorization

Keep the initial SSH session open. Create a named operator with an SSH public key, test a **second** login, then disable password/root login via a reviewed sshd drop-in. Run `sshd -t` before reload. Keep an OVH recovery-console path. Do not blindly run hardening changes without testing your actual access.

Example first-host operator setup (replace the public-key file path, and test `ssh operator@VPS_IP` separately before hardening):

```bash
sudo adduser --disabled-password --gecos '' operator
sudo usermod -aG sudo operator
sudo install -d -m 0700 -o operator -g operator /home/operator/.ssh
sudo install -m 0600 -o operator -g operator /path/to/approved-authorized_keys /home/operator/.ssh/authorized_keys
# Configure the operator's sudo authentication through the recovery/initial
# administrator session; do not leave an unusable locked sudo account.
sudo passwd operator
# After the separate SSH/sudo check, write the reviewed drop-in:
printf '%s\n' 'PermitRootLogin no' 'PasswordAuthentication no' 'KbdInteractiveAuthentication no' 'PubkeyAuthentication yes' | sudo tee /etc/ssh/sshd_config.d/00-edulabs.conf >/dev/null
sudo sshd -t
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication'
# Only reload if the effective configuration is correct and recovery is ready:
sudo systemctl reload ssh
```

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl openssh-server ufw unattended-upgrades
sudo ufw allow OpenSSH
sudo ufw enable
# For private SSH-tunnel staging, do not open 80/443 externally.
# Also restrict SSH source IP using OVH's firewall where available.
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian trixie stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
```

Use current security-patched Docker packages from the official repository. Docker access is root-equivalent; use sudo rather than adding untrusted users to its group. Published Docker ports can bypass UFW, so do not publish app/database ports, retain loopback defaults, and verify external reachability from another network before allowing reviewers. Public Caddy ports and DNS changes require separate approval.

## Build, transfer and start

Prepare templates outside Git/build context. Do not put actual configuration inside `infra/` or package a credential with the source archive.

```bash
sudo install -d -m 0750 /etc/edulabs
sudo install -d -m 0755 /opt/edulabs/releases
# Extract the reviewed source package into /opt/edulabs/releases/RELEASE_SHA
# and set /opt/edulabs/current to that release (only after verifying the path).
cd /opt/edulabs/current
sudo cp infra/deployment.env.example /etc/edulabs/deployment.env
sudo cp infra/web.env.example /etc/edulabs/web.env
sudo cp infra/caddy.env.example /etc/edulabs/caddy.env
sudo chmod 0600 /etc/edulabs/*.env
# Securely transfer Admin JSON separately, then:
sudo chown 10001:10001 /etc/edulabs/firebase-admin.json
sudo chmod 0400 /etc/edulabs/firebase-admin.json
# Fill the protected files and public build file using reviewed settings.
bash infra/build.sh /absolute/path/public.env edulabs-web:RELEASE_SHA web
# Alternatively load an already built image and verify its provided SHA-256:
# sha256sum -c edulabs-images.sha256
# sudo docker load -i edulabs-images.tar
# Set EDULABS_IMAGE to the exact reviewed immutable release tag in deployment.env.
sudo bash infra/deploy.sh /etc/edulabs/deployment.env
```

Generate the gate password hash interactively, without putting a plaintext password in shell history:

```bash
sudo docker run --rm -it caddy:2-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f caddy hash-password
```

For staging **without DNS changes**, use `APP_ORIGIN=https://localhost:8443`, `APP_HOST=localhost` and the local Caddy override. It uses an internal CA, not a publicly trusted certificate:

```bash
sudo docker compose --env-file /etc/edulabs/deployment.env -f compose.yaml -f infra/compose.local.yaml config --quiet
sudo docker compose --env-file /etc/edulabs/deployment.env -f compose.yaml -f infra/compose.local.yaml up -d --wait app caddy
# From your laptop AFTER the server exists:
ssh -N -L 8443:127.0.0.1:8443 operator@VPS_IP
# Open https://localhost:8443. Trust the exact internal CA only after verifying
# its fingerprint over SSH; never disable browser certificate validation globally.
```

Local override requires Compose >=2.24.4 (`!override` support); current official plugin satisfies this. For public trusted HTTPS later, use the normal Caddyfile, approved hostname/DNS, matching APP_ORIGIN and Firebase authorized domain, then deliberately expose only Caddy 80/443. Automatic ACME issuance requires a reachable hostname/ports and persistent `/data`. No DNS or provider setting has been changed by this preparation.

Before sharing: unauthenticated HTTPS requests to sign-in, API, health and static assets must return 401; wrong Basic credentials must fail. Then test the approved review login, static assets, Firebase sign-in and authorized course access. Keep the gate on until explicit product/security release approval. Verify Supabase history read-only; deployment scripts never run migrations, seed or reset databases.

## Optional notification scheduling

The existing dispatcher loops every 30 seconds; the database's bounded due-window/deduplication implements scheduled reminders. Do not run a second cron job over it. The default `--in-app-only` path avoids claims of device delivery. To enable after authorization: prepare a matching development-only project/worker credential, mount its file with UID 10001 read permission, copy/fill `worker.env.example`, set `NOTIFICATION_WORKER_ENABLED=true`, build target `worker`, and explicitly run:

```bash
bash infra/build.sh /absolute/path/public.env edulabs-worker:RELEASE_SHA worker
sudo docker compose --env-file /etc/edulabs/deployment.env --profile notifications up -d --wait notification-worker
```

This step is **not executed** during preparation; a service-role credential would be powerful and must be approved/protected. Worker heartbeat checks successful dispatch/sweep, logs only summaries, and forwards SIGTERM with 60 seconds to finish current work. A provider acceptance is not proof of device delivery.

## Rollback, monitoring and backups

Record release SHA, image IDs/digests, public build fingerprint and migration version in the release manifest. Retain the previous image/source/config. Roll back **code only** using the previous image tag and matching public config, e.g. `EDULABS_IMAGE=edulabs-web:PREVIOUS_SHA sudo -E bash infra/deploy.sh /etc/edulabs/deployment.env` (or edit only the reviewed image tag in the protected file). Do not roll back schema automatically. This package has no migration or destructive cleanup command. Release switching briefly interrupts the single instance; clients may need refresh for old assets/server actions. Do not claim zero downtime.

Inspect `docker compose ps`, bounded logs, `docker stats --no-stream`, OOM/restart counts and disk usage. Install the provided monitor service/timer only after verifying `/opt/edulabs/current`; it fails on internal app health or >=85% disk use. Configure an external authenticated HTTPS probe/notification channel separately; a journal entry is not an alert delivered to an operator. Docker restart policies restart exited processes, not merely unhealthy containers.

Back up encrypted protected configuration and Caddy's certificate volume with root-only access; never include them in a source ZIP or public registry. App containers hold no authoritative academic files/database. Plan Supabase backups/PITR under the selected provider plan, plus separate object-storage backups and Firebase identity recovery/export procedures. A PostgreSQL dump does not back up Storage binaries or Firebase identities. Use pg_dump 17 with PGPASSFILE (0600) and connection flags, not passwords in argv; encrypt before off-host transfer. Test restore into an approved disposable project before relying on a backup. No backup/export of real records was performed here.

For a separately authorized database backup, supply `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` and a protected `PGPASSFILE`, then use `pg_dump -Fc --no-owner --no-acl -f /protected-backup/edulabs.dump`. Confirm the provider's required SSL settings and include schema/privilege recovery in the restore plan; this command alone does not preserve roles/grants or Storage objects. Keep dump paths out of this repository. Never restore over an existing project to test recovery.

## Remaining integration and launch gates

Cloudflare R2 is **not integrated**. Existing media uses Supabase private Storage and validated provider/direct video URLs. An R2 bucket alone supplies neither protected streaming/transcoding nor DRM; moving objects requires a separately reviewed provider adapter, ownership/signed-URL policy, lifecycle/CORS and video delivery design. Keep current media working; no R2 credentials/bucket, migration or video milestone is introduced here. Check Supabase bandwidth/Storage and actual teacher playback before trial.

Signup recovery now preserves an already-created account when verification mail is throttled, resumes only that already authenticated Firebase identity, and offers controlled resend. It never links an unauthenticated account by email, marks an account verified, bypasses server verification or grants enrollment. **Firebase's actual verification-email throttle is not fixed**: provider quota/real inbox delivery must be verified separately before real student onboarding. Domain/provider/billing changes remain unauthorized.

PR #8 is not merged. Before any production rollout, review its blockers and this infrastructure PR, explicitly approve the target database/configuration, provision real teacher/cohort/owners safely, verify actual mail and mobile devices, and address documented dependency advisories. No paid infrastructure, VPS connection, DNS, production database, provider/billing or main change occurred.

## Time estimate after receiving SSH

With reviewed images, credentials, public settings and an approved hostname ready: roughly **45–90 minutes** for Debian hardening, transfer/start, TLS/private gate and smoke tests. A private SSH-tunnel/internal-CA preview may be ready in **30–60 minutes** without DNS. Allow **2–3 hours** if building on the VPS or troubleshooting networking; DNS propagation, provider verification throttling and missing credentials have no guaranteed duration. These are engineering estimates, not a launch guarantee.

Sources: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [Docker Debian installation](https://docs.docker.com/engine/install/debian/), [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).
