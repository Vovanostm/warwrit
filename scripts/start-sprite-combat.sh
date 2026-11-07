#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Retained command alias. The protected Playground is the sole combat lab.
if [[ "${PLAYGROUND:-}" != 1 || -z "${PLAYGROUND_ACCOUNT_IDS:-}" || -z "${DATABASE_URL:-}" ]]; then
  printf 'Combat Lab uses /dev/playground/combat. Set PLAYGROUND=1, PLAYGROUND_ACCOUNT_IDS, DATABASE_URL and complete local OIDC/PUBLIC_ORIGIN configuration (see docs/engineering/DEVELOPER_PLAYGROUND.md).\n' >&2
  exit 1
fi
worktree_port() { [[ -f .worktree-ports ]] && sed -n "s/^$1=\([0-9][0-9]*\)$/\1/p" .worktree-ports | head -n 1; }
export NODE_ENV=development HOST=127.0.0.1
export PORT="${PORT:-$(worktree_port COMBAT_API_PORT || true)}"
export WEB_PORT="${WEB_PORT:-$(worktree_port COMBAT_WEB_PORT || true)}"
export PORT="${PORT:-3000}" WEB_PORT="${WEB_PORT:-5173}"
export API_PROXY_TARGET="http://127.0.0.1:$PORT"
printf 'Developer Combat Lab: http://127.0.0.1:%s/dev/playground/combat (authenticated allowlist required)\n' "$WEB_PORT"
exec pnpm dev
