#!/usr/bin/env bash
# Own disposable campaign data; an existing stand and its volumes are never reset.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
source scripts/compose-cli.sh
select_compose_cli
run_id="$(date +%s)-$$-${RANDOM}"
evidence="$PWD/output/painted-game-ci/$run_id"
mkdir -p "$evidence"
project="warwrit-painted-check-$run_id"
dex_id=''
api_pid=''
web_pid=''
infra_started=0
compose() {
  POSTGRES_PORT=0 "${COMPOSE_CLI[@]}" --project-name "$project" --file "$PWD/compose.yaml" "$@"
}
cleanup() {
  local result=$?
  trap - EXIT
  for pid in "$api_pid" "$web_pid"; do
    [[ -z "$pid" ]] || kill "$pid" 2>/dev/null || true
  done
  for pid in "$api_pid" "$web_pid"; do
    [[ -z "$pid" ]] || wait "$pid" 2>/dev/null || true
  done
  [[ -z "$dex_id" ]] || docker rm -f "$dex_id" >/dev/null || result=1
  if [[ "$infra_started" == 1 ]]; then
    compose down --volumes --remove-orphans >>"$evidence/infra.log" 2>&1 || result=1
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Refuse collisions before starting anything. Existing Dex reuse is explicit,
# only for the approved local fixture at the same issuer/callback as CI.
node --input-type=module - "${WARWRIT_QA_USE_EXISTING_DEX:-0}" <<'JS'
import { createServer } from 'node:net';
for (const port of [3528, 3529, 5228, ...(process.argv[2] === '1' ? [] : [5618])]) {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
JS
infra_started=1
compose up -d --wait postgres >"$evidence/infra.log" 2>&1
binding="$(compose port postgres 5432)"
[[ "$binding" == 127.0.0.1:* ]] || { echo 'PostgreSQL binding is not loopback'; exit 1; }
pg_port="${binding##*:}"
[[ "$pg_port" =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid PostgreSQL binding'; exit 1; }
export DATABASE_URL="postgres://warwrit:warwrit@127.0.0.1:$pg_port/warwrit"
export NODE_ENV=development HOST=127.0.0.1 PORT=3528 ENCOUNTER_REALTIME_PORT=3529
export WORLD_MAP=painted-atlas WORLD_LAB=0 COMBAT_LAB=0 ENCOUNTER_FIXTURES=0
export OIDC_ISSUER=http://127.0.0.1:5618/dex OIDC_CLIENT_ID=warwrit-local
export OIDC_CLIENT_SECRET=warwrit-local-only-secret
export PUBLIC_ORIGIN=http://127.0.0.1:5228 OIDC_REDIRECT_URI=http://127.0.0.1:5228/auth/callback
export VITE_COMBAT_LAB=0 WEB_PORT=5228 API_PROXY_TARGET=http://127.0.0.1:3528
export ENCOUNTER_REALTIME_PROXY_TARGET=http://127.0.0.1:3529
export WARWRIT_GAME_MEASUREMENT=1

if [[ "${WARWRIT_QA_USE_EXISTING_DEX:-0}" != 1 ]]; then
  sed -e 's@127.0.0.1:5556@127.0.0.1:5618@g' -e 's@127.0.0.1:5173@127.0.0.1:5228@g' \
    fixtures/identity/dex.dev.yaml >"$evidence/dex.yaml"
  dex_id="$(docker run -d --rm --name "warwrit-painted-dex-$run_id" \
    -p 127.0.0.1:5618:5556 --tmpfs /var/dex \
    -v "$evidence/dex.yaml:/etc/dex/config.yaml:ro" \
    ghcr.io/dexidp/dex@sha256:bc7cfce7c17f52864e2bb2a4dc1d2f86a41e3019f6d42e81d92a301fad0c8a1d \
    dex serve /etc/dex/config.yaml)"
fi
for ((attempt=0; attempt<60; attempt++)); do
  if curl --fail --silent "$OIDC_ISSUER/.well-known/openid-configuration" >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent "$OIDC_ISSUER/.well-known/openid-configuration" >/dev/null
pnpm --filter @warwrit/protocol build --inlineSources >"$evidence/build.log" 2>&1
pnpm --filter @warwrit/game-core build --inlineSources >>"$evidence/build.log" 2>&1
pnpm --filter @warwrit/testkit build --inlineSources >>"$evidence/build.log" 2>&1
node --import tsx apps/server/src/db/migrate.ts up >"$evidence/migrate.log" 2>&1
WORLD_LAB_RUNTIME_COVERAGE="$evidence/server.json" \
  node --import tsx --import ./scripts/world-map/runtime-coverage-node.mjs apps/server/src/index.ts \
  >"$evidence/server.log" 2>&1 &
api_pid=$!
WORLD_LAB_RUNTIME_COVERAGE="$evidence/vite.json" \
  node --import ./scripts/world-map/runtime-coverage-node.mjs apps/web/node_modules/vite/bin/vite.js \
  apps/web --configLoader runner --config apps/web/vite.config.ts >"$evidence/web.log" 2>&1 &
web_pid=$!
ready=0
for ((attempt=0; attempt<120; attempt++)); do
  kill -0 "$api_pid" && kill -0 "$web_pid" || { cat "$evidence/server.log" "$evidence/web.log"; exit 1; }
  if curl --fail --silent http://127.0.0.1:3528/health/ready >/dev/null &&
     curl --fail --silent http://127.0.0.1:5228/ >/dev/null; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]] || { echo 'Owned ordinary game did not become ready'; exit 1; }
WARWRIT_WEB_URL="$PUBLIC_ORIGIN" WARWRIT_COMBAT_WEB_URL='' \
  WARWRIT_QA_EMAIL=player-one@example.test WARWRIT_QA_PASSWORD=local-only-pass-one \
  WARWRIT_BROWSER_OUTPUT="$evidence" WORLD_LAB_RUNTIME_COVERAGE="$evidence/driver.json" \
  node --import ./scripts/world-map/runtime-coverage-node.mjs scripts/world-map/painted-game.browser.mjs
kill -USR2 "$api_pid" "$web_pid"
for ((attempt=0; attempt<30; attempt++)); do
  [[ ! -s "$evidence/server.json" || ! -s "$evidence/vite.json" ]] || break
  sleep 1
done
node --input-type=module - "$evidence" <<'JS'
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const directory = process.argv[2];
const reports = await Promise.all(['browser', 'server', 'vite', 'driver'].map(async name =>
  JSON.parse(await readFile(resolve(directory, `${name}.json`), 'utf8'))));
await writeFile(resolve(directory, 'runtime.json'), JSON.stringify({ entries: reports.flatMap(report => report.entries) }));
JS
node scripts/world-map/runtime-coverage-merge.mjs "$evidence/runtime.json" coverage/coverage-final.json
printf 'Ordinary painted-map journey passed. Evidence: %s\n' "$evidence"
