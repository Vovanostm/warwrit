#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Private persistent test database: never use the campaign DATABASE_URL.
docker compose -p warwrit-world-lab -f compose.world-lab.yaml up -d --wait postgres
export WORLD_LAB=1 NODE_ENV=development
export WORLD_LAB_DATABASE_URL='postgres://world_lab:world_lab@127.0.0.1:65438/warwrit_world_lab'
build_args=()
api_imports=(--import tsx)
if [[ -n "${WORLD_LAB_RUNTIME_COVERAGE:-}" ]]; then
  build_args+=(--inlineSources)
  api_imports+=(--import ./scripts/world-map/runtime-coverage-node.mjs)
fi
# macOS Bash 3.2 treats an empty array as unset under `set -u`.
pnpm --filter @warwrit/protocol build ${build_args[@]+"${build_args[@]}"}
pnpm --filter @warwrit/game-core build ${build_args[@]+"${build_args[@]}"}
pnpm --filter @warwrit/testkit build ${build_args[@]+"${build_args[@]}"}

api_pid=''
web_pid=''
cleanup() {
  [[ -z "$api_pid" ]] || kill "$api_pid" 2>/dev/null || true
  [[ -z "$web_pid" ]] || kill "$web_pid" 2>/dev/null || true
  [[ -z "$api_pid" ]] || wait "$api_pid" 2>/dev/null || true
  [[ -z "$web_pid" ]] || wait "$web_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
node "${api_imports[@]}" scripts/world-map/world-lab-server.ts &
api_pid=$!
if [[ -n "${WORLD_LAB_RUNTIME_PID_FILE:-}" ]]; then
  (set -o noclobber; printf '%s\n' "$api_pid" > "$WORLD_LAB_RUNTIME_PID_FILE")
fi
node apps/web/node_modules/vite/bin/vite.js --config scripts/world-map/world-lab-vite.config.ts &
web_pid=$!
printf '\nShared world laboratory: http://127.0.0.1:5338/scripts/world-map/world-lab.html\n'
printf 'Choose different companies in separate browser profiles. Data survives server restart.\n'
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$web_pid" 2>/dev/null; do
  sleep 1
done
if ! kill -0 "$api_pid" 2>/dev/null; then wait "$api_pid"; else wait "$web_pid"; fi
