#!/usr/bin/env bash
# This CI stand owns disposable data; the normal persistent laboratory is never touched.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
# Publish only after both original conversions succeed.
merge_capture() (
  local runtime="$1"
  local directory candidate
  directory="$(dirname "$runtime")"
  [[ -s "$runtime" ]] || { echo 'Runtime capture missing' >&2; exit 1; }
  candidate="$(mktemp "$PWD/coverage/world-merge.XXXXXX")"
  trap 'rm -f "$candidate"' EXIT
  cp coverage/coverage-final.json "$candidate"
  WORLD_LAB=1 NODE_ENV=development WORLD_LAB_RUNTIME_COVERAGE="$directory/merger.json" \
    node --import ./scripts/world-map/runtime-coverage-node.mjs \
    scripts/world-map/runtime-coverage-merge.mjs "$runtime" "$candidate"
  node scripts/world-map/runtime-coverage-merge.mjs "$directory/merger.json" "$candidate"
  mv "$candidate" coverage/coverage-final.json
)

usage() {
  printf 'Usage: %s [--capture runtime.json | --merge runtime.json]\n' "$0" >&2
}
mode=full
capture_path=''
if [[ "$#" -ne 0 ]]; then
  [[ "$#" -eq 2 ]] || { usage; exit 2; }
  [[ -n "$2" ]] || { usage; exit 2; }
  case "$1" in
    --capture)
      mode=capture
      capture_path="$2"
      [[ ! -e "$capture_path" ]] || { echo 'Capture output already exists' >&2; exit 1; }
      mkdir -p "$(dirname "$capture_path")"
      ;;
    --merge)
      merge_capture "$2"
      exit 0
      ;;
    *) usage; exit 2 ;;
  esac
fi

evidence_root="$PWD/output/world-lab-ci"
evidence_dir="$evidence_root/runtime-$$"
mkdir -p "$evidence_root"
mkdir "$evidence_dir"
[[ -n "$capture_path" ]] || capture_path="$evidence_dir/runtime.json"
[[ ! -e "$evidence_dir/server.pid" ]] || { echo 'Refusing stale CI stand ownership'; exit 1; }
source scripts/compose-cli.sh
select_compose_cli
project="warwrit-world-check-$(date +%s)-$$-${RANDOM}"
infra_started=0
api_pid=''
web_pid=''
authoring_pid=''
compose() {
  POSTGRES_PORT=0 "${COMPOSE_CLI[@]}" --project-name "$project" --file "$PWD/compose.yaml" "$@"
}
export WORLD_LAB=1 NODE_ENV=development
export WORLD_LAB_RUNTIME_PID_FILE="$evidence_dir/server.pid"
export WORLD_LAB_RUNTIME_COVERAGE="$evidence_dir/server.json"
export WORLD_LAB_BROWSER_OUTPUT="$evidence_dir"
cleanup() {
  local result=$?
  trap - EXIT
  for pid in "$api_pid" "$web_pid" "$authoring_pid"; do
    [[ -z "$pid" ]] || kill "$pid" 2>/dev/null || true
  done
  for pid in "$api_pid" "$web_pid" "$authoring_pid"; do
    [[ -z "$pid" ]] || wait "$pid" 2>/dev/null || true
  done
  if [[ "$infra_started" == 1 ]]; then
    compose down --volumes --remove-orphans >>"$evidence_dir/infra.log" 2>&1 || result=1
  fi
  rm -f "$evidence_dir/server.pid"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
node --input-type=module <<'JS'
import { createServer } from 'node:net';
for (const port of [3038, 3039, 5338, 5326]) {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
JS
infra_started=1
compose up -d --wait postgres >"$evidence_dir/infra.log" 2>&1
binding="$(compose port postgres 5432)"
[[ "$binding" == 127.0.0.1:* ]] || { echo 'PostgreSQL binding is not loopback'; exit 1; }
pg_port="${binding##*:}"
[[ "$pg_port" =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid PostgreSQL binding'; exit 1; }
compose exec -T postgres createdb -U warwrit warwrit_world_lab
export WORLD_LAB_DATABASE_URL="postgres://warwrit:warwrit@127.0.0.1:$pg_port/warwrit_world_lab"
pnpm --filter @warwrit/protocol build --inlineSources >"$evidence_dir/build.log" 2>&1
pnpm --filter @warwrit/game-core build --inlineSources >>"$evidence_dir/build.log" 2>&1
pnpm --filter @warwrit/testkit build --inlineSources >>"$evidence_dir/build.log" 2>&1
node --import tsx --import ./scripts/world-map/runtime-coverage-node.mjs \
  scripts/world-map/world-lab-server.ts >"$evidence_dir/server.log" 2>&1 &
api_pid=$!
printf '%s\n' "$api_pid" >"$evidence_dir/server.pid"
WORLD_LAB_RUNTIME_COVERAGE="$evidence_dir/vite.json" \
  node --import ./scripts/world-map/runtime-coverage-node.mjs apps/web/node_modules/vite/bin/vite.js \
  --configLoader runner --config scripts/world-map/world-lab-vite.config.ts >"$evidence_dir/web.log" 2>&1 &
web_pid=$!
WORLD_LAB_RUNTIME_COVERAGE="$evidence_dir/authoring-vite.json" \
  node --import ./scripts/world-map/runtime-coverage-node.mjs apps/web/node_modules/vite/bin/vite.js \
  --configLoader runner --config scripts/world-map/navigation-lab-vite.config.ts >"$evidence_dir/authoring-web.log" 2>&1 &
authoring_pid=$!
ready=0
for ((attempt=0; attempt<120; attempt++)); do
  kill -0 "$api_pid" && kill -0 "$web_pid" && kill -0 "$authoring_pid" || { cat "$evidence_dir/server.log"; exit 1; }
  if curl --fail --silent http://127.0.0.1:5338/scripts/world-map/world-lab.html >/dev/null &&
     curl --fail --silent http://127.0.0.1:3038/health/live >/dev/null &&
     curl --fail --silent http://127.0.0.1:5326/scripts/world-map/navigation-lab.html >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
[[ "$ready" == 1 ]] || { cat "$evidence_dir/server.log"; exit 1; }
WORLD_LAB_RUNTIME_COVERAGE="$evidence_dir/driver.json" \
  node --import ./scripts/world-map/runtime-coverage-node.mjs scripts/world-map/world-lab.browser.mjs
api_pid="$(cat "$evidence_dir/server.pid")"
[[ "$api_pid" =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid owned API pid'; exit 1; }
kill -USR2 "$api_pid" "$web_pid" "$authoring_pid"
for ((attempt=0; attempt<30; attempt++)); do
  [[ ! -s "$evidence_dir/server.json" || ! -s "$evidence_dir/vite.json" || ! -s "$evidence_dir/authoring-vite.json" ]] || break
  sleep 1
done
[[ -s "$evidence_dir/server.json" ]] || { echo 'API measurement missing'; exit 1; }
node --input-type=module - "$evidence_dir" "$evidence_root" "$capture_path" <<'JS'
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const directory = process.argv[2];
const reports = await Promise.all(['browser', 'server', 'vite', 'authoring-vite', 'driver'].map(async name =>
  JSON.parse(await readFile(resolve(directory, `${name}.json`), 'utf8'))));
const migration = JSON.parse(await readFile(resolve(process.argv[3], 'migration.json'), 'utf8'));
await writeFile(process.argv[4], JSON.stringify({
  entries: [...reports.flatMap(report => report.entries), ...migration.entries],
  reports: [resolve(process.argv[3], 'sql/coverage-final.json')],
}), { flag: 'wx' });
JS
if [[ "$mode" == full ]]; then merge_capture "$capture_path"; fi
