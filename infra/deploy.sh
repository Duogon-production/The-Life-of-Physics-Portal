#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
env_file=${1:?Usage: infra/deploy.sh /etc/edulabs/deployment.env}
docker compose --env-file "$env_file" config --quiet
docker compose --env-file "$env_file" run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile
# Explicit service list prevents accidental worker activation.
docker compose --env-file "$env_file" up -d --wait --wait-timeout 180 app caddy
docker compose --env-file "$env_file" ps
echo 'Check HTTPS returns 401 without private-review credentials, then sign in interactively.'
echo 'A failed readiness check does not auto-rollback or mutate the database.'
