#!/usr/bin/env bash
set -euo pipefail
cd /opt/edulabs/current
container=$(docker compose --env-file /etc/edulabs/deployment.env ps -q app)
[[ -n "$container" ]] || { echo 'EduLabs app is absent'; exit 1; }
[[ "$(docker inspect --format '{{.State.Health.Status}}' "$container")" == healthy ]] || { echo 'EduLabs app is unhealthy'; exit 1; }
used=$(df -P /opt/edulabs | awk 'NR==2 {gsub(/%/,"",$5);print $5}')
[[ "$used" -lt 85 ]] || { echo 'EduLabs disk usage exceeds 85%'; exit 1; }
echo 'EduLabs internal health and disk checks passed; this does not prove email, remote TLS or database availability.'
