#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
api_port="${COMBAT_API_PORT:-3022}"
web_port="${COMBAT_WEB_PORT:-5320}"
for candidate in "$api_port" "$web_port"; do
  if [[ ! "$candidate" =~ ^[1-9][0-9]*$ ]] || (( candidate > 65535 )); then
    printf 'Invalid combat lab port: %s\n' "$candidate" >&2
    exit 1
  fi
done
if [[ "$api_port" == "$web_port" ]]; then
  printf 'Combat API and web ports must differ.\n' >&2
  exit 1
fi

# The lab owns disposable in-memory battles and never opens the campaign database.
export DATABASE_URL='' ENCOUNTER_FIXTURES=0
export OIDC_ISSUER='' OIDC_CLIENT_ID='' OIDC_CLIENT_SECRET='' OIDC_REDIRECT_URI='' PUBLIC_ORIGIN=''
export HOST=127.0.0.1 PORT="$api_port" COMBAT_LAB=1 NODE_ENV=development
export COMBAT_LAB_ORIGIN="http://127.0.0.1:$web_port"
export VITE_COMBAT_LAB=1 WEB_PORT="$web_port" API_PROXY_TARGET="http://127.0.0.1:$api_port"
pnpm --filter @warwrit/protocol build
pnpm --filter @warwrit/game-core build

api_pid=''
web_pid=''
cleanup() {
  [[ -z "$api_pid" ]] || kill "$api_pid" 2>/dev/null || true
  [[ -z "$web_pid" ]] || kill "$web_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
pnpm --filter @warwrit/server dev &
api_pid=$!
pnpm --filter @warwrit/web dev &
web_pid=$!
printf '\nSprite combat and editors: http://127.0.0.1:%s/combat-lab\n' "$web_port"
wait "$api_pid" "$web_pid"
