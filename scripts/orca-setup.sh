#!/usr/bin/env bash
# Prepare a new Orca worktree: dependencies, workspace package builds and private combat-lab ports.
set -euo pipefail
cd "${ORCA_WORKTREE_PATH:-$(git rev-parse --show-toplevel)}"

if ! command -v pnpm >/dev/null 2>&1 && command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env)"
  fnm use --install-if-missing >/dev/null
fi
command -v pnpm >/dev/null 2>&1 || { echo 'orca-setup: pnpm is not on PATH; install Node 24.20 and pnpm 11.25.' >&2; exit 1; }

pnpm install --frozen-lockfile --prefer-offline
# Workspace packages export dist/, which a fresh checkout does not have.
pnpm --filter @warwrit/protocol --filter @warwrit/game-core --filter @warwrit/testkit build

listening() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
slot=$(( $(printf '%s' "$PWD" | cksum | cut -d' ' -f1) % 1000 ))
for _ in $(seq 1000); do
  listening $((23000 + slot)) || listening $((25000 + slot)) || break
  slot=$(( (slot + 1) % 1000 ))
done
printf 'COMBAT_API_PORT=%s\nCOMBAT_WEB_PORT=%s\n' $((23000 + slot)) $((25000 + slot)) > .worktree-ports
echo "orca-setup: ready. pnpm dev:combat -> http://127.0.0.1:$((25000 + slot))/combat-lab"
