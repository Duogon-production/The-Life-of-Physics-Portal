#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
config=${1:?Usage: infra/build.sh PUBLIC_ENV IMAGE_TAG [web|worker]}
tag=${2:?Image tag required}
target=${3:-web}
[[ "$target" == web || "$target" == worker ]] || exit 2
[[ "$tag" =~ ^[a-zA-Z0-9._:/-]+$ ]] || exit 2
args=()
while IFS='=' read -r key value || [[ -n "$key" ]]; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  value=${value%$'\r'}
  case "$key" in
    NEXT_PUBLIC_FIREBASE_API_KEY|NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN|NEXT_PUBLIC_FIREBASE_PROJECT_ID|NEXT_PUBLIC_FIREBASE_APP_ID|NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET|NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) args+=(--build-arg "$key=$value");;
    *) echo "Unexpected build setting name; secrets are runtime-only: $key" >&2; exit 2;;
  esac
done < "$config"
docker build --target "$target" --tag "$tag" "${args[@]}" .
