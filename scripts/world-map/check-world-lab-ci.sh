#!/usr/bin/env bash
# This fresh CI stand owns its launcher; its persistent database is never reset.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
evidence_root="$PWD/output/world-lab-ci"
evidence_dir="$evidence_root/runtime-$$"
mkdir -p "$evidence_root"
mkdir "$evidence_dir"
[[ ! -e "$evidence_dir/server.pid" ]] || { echo 'Refusing stale CI stand ownership'; exit 1; }
export WORLD_LAB=1
export WORLD_LAB_RUNTIME_PID_FILE="$evidence_dir/server.pid"
export WORLD_LAB_RUNTIME_COVERAGE="$evidence_dir/server.json"
export WORLD_LAB_BROWSER_OUTPUT="$evidence_dir"
bash scripts/start-world-lab.sh > "$evidence_dir/server.log" 2>&1 &
launcher_pid=$!
cleanup() {
  kill "$launcher_pid" 2>/dev/null || true
  wait "$launcher_pid" 2>/dev/null || true
  rm -f "$evidence_dir/server.pid"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
ready=0
for ((attempt=0; attempt<120; attempt++)); do
  kill -0 "$launcher_pid" || { cat "$evidence_dir/server.log"; exit 1; }
  if curl --fail --silent http://127.0.0.1:5338/scripts/world-map/world-lab.html >/dev/null &&
     curl --fail --silent http://127.0.0.1:3038/health/live >/dev/null; then
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
kill -USR2 "$api_pid"
for ((attempt=0; attempt<30; attempt++)); do
  [[ ! -s "$evidence_dir/server.json" ]] || break
  sleep 1
done
[[ -s "$evidence_dir/server.json" ]] || { echo 'API measurement missing'; exit 1; }
node --input-type=module - "$evidence_dir" "$evidence_root" <<'JS'
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const directory = process.argv[2];
const reports = await Promise.all(['browser', 'server', 'driver'].map(async name =>
  JSON.parse(await readFile(resolve(directory, `${name}.json`), 'utf8'))));
const migration = JSON.parse(await readFile(resolve(process.argv[3], 'migration.json'), 'utf8'));
await writeFile(resolve(directory, 'runtime.json'), JSON.stringify({
  entries: [...reports.flatMap(report => report.entries), ...migration.entries],
  reports: [resolve(process.argv[3], 'sql/coverage-final.json')],
}));
JS
WORLD_LAB_RUNTIME_COVERAGE="$evidence_dir/merger.json" \
  node --import ./scripts/world-map/runtime-coverage-node.mjs \
  scripts/world-map/runtime-coverage-merge.mjs "$evidence_dir/runtime.json" coverage/coverage-final.json
node scripts/world-map/runtime-coverage-merge.mjs "$evidence_dir/merger.json" coverage/coverage-final.json
