# Local development and CI

## Supported renderer — WLC-02, 2026-11-07

The ordinary game and Combat Lab share the Babylon.js 9.28.0 battle renderer;
map/place scenes also use Babylon. Run the ordinary game below or `pnpm dev:combat`
for the authenticated Playground lab after configuring its database/OIDC/allowlist. There is no supported engine query switch or
`@warwrit/renderer-spike` launch/build/bake command. That directory retains only
historical assets/licenses and a source-history pointer; do not reinstall
PlayCanvas to run current scenes. See the
[removal record](LEGACY_INVENTORY.md#wlc-02--remove-playcanvas-pilot-2026-11-07).

## Pinned toolchain

- Node.js `24.20.0` LTS line;
- pnpm `11.25.0` through Corepack;
- ESLint `10.x` with the exact dependency graph committed in the lockfile;
- Vitest `4.x` and fast-check `4.9.0` for example- and property-based verification;
- PostgreSQL `17` for the first persistence contract;
- Linux CI on `ubuntu-24.04`.

The exact package graph is committed in `pnpm-lock.yaml`.

## Container runtime (colima)

Owner decision, 2026-09-29: local containers run on [colima](https://github.com/abiosoft/colima)
(Docker runtime, macOS Virtualization.Framework). OrbStack and Docker Desktop are
not used. CI keeps the Docker engine of GitHub's `ubuntu-24.04` runner.

```bash
brew install colima docker docker-compose
colima start --vm-type=vz --cpu 2 --memory 4   # matches the 2-core/4 GB target, not a measured need
docker context use colima                       # colima sets this on start; check with `docker context ls`
```

Homebrew's Compose is a Docker CLI plugin. Add its directory to `~/.docker/config.json`
as Homebrew's caveat states:

```json
{ "cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"] }
```

`~/.docker/cli-plugins/` takes precedence over that directory. A link left there
by a removed runtime (for example OrbStack's `docker-compose`) breaks
`docker compose` with `unknown command` while `docker info` still works; delete the
stale link. Verify before running the gate:

```bash
docker compose version
docker info --format '{{.ServerVersion}}'
```

## Clean bootstrap

```bash
./scripts/bootstrap.sh
```

The script fails closed if the Node.js line or Docker is unavailable. It performs the repository verification suite, the 10,000-battle combat stress gate, and migration up/down against a disposable PostgreSQL container. Each run uses a unique Compose project and dynamically published loopback port, replaces any inherited `DATABASE_URL` with that container's URL, and removes only its own containers, network and volume on exit. It never prints the database URL. Set `KEEP_INFRA=1` to retain the run's PostgreSQL; the script prints its project, port and project-scoped cleanup command.

Manual development publishes PostgreSQL on `POSTGRES_PORT` (`55432` in `.env.example`, `5432` without a `.env`) so it does not collide with another local PostgreSQL.

## Environment contract

Local overrides live in one root `.env` file, normally created from `.env.example`.

- the server watch process loads `../../.env` through Node's `--env-file-if-exists` flag;
- Vite uses the repository root as its `envDir`;
- only variables prefixed with `VITE_` may be exposed to browser code;
- production processes receive environment variables from their deployment environment and do not load developer files implicitly.

## Development processes

### Quick company entry and current place

Owner requests, 2026-10-29/30: the development sign-in screen has four buttons
**Войти за компанию 1 / 2 / 3 / 4**. Each slot has a separate persisted local
identity. First use creates **Тестовая компания N** with **Капитан N** and two
existing companions through the ordinary opening and command APIs; repeat entry
restores that company's progress. The current start grants 800 crowns after
hiring and 30 rations. Choose **Выйти** to switch; use separate browser profiles
for concurrent players, since tabs share the session cookie.

Quick entry requires complete database-backed identity configuration,
`NODE_ENV=development`, a loopback listener and a local HTTP `PUBLIC_ORIGIN`.
It uses the ordinary HttpOnly rotating session, enforces the configured request
Origin and accepts only slots1–4. Production UI hides the controls; production
servers do not register these routes. No external identity-provider request,
password entry, migration or existing-save reset occurs in this shortcut.
See [identity boundary](ID01-IDENTITY.md#four-local-company-profiles).

**Место** means the party's actual stationary settlement/landmark. Selecting a
remote site on the map stays on **Путь** and does not open that settlement.
Continuous movement must confirm `STATIONARY_SITE` before settlement entry;
pending, moving and terrain states do not expose settlement buildings. The
movement and party public revisions must agree before Place/local observations
are enabled; mismatched stationary arrivals refresh the world immediately and
every15seconds until confirmed, respecting a busy world request. A building
visit closes on departure or location change. The journal uses place names or
travel/terrain labels, not raw coordinates. Existing server access checks remain
unchanged. Related travel contract: [M1 world travel](../work-packages/M1-WORLD-TRAVEL.md).

The painted-atlas preview on5259 is a separate unpublished checkout at
`/Users/vovanostm/.codex/worktrees/local-painted-login/warwrit`, with its own
retained local configuration. Its map/combat WIP and private world are outside
this PR; no painted assets, migration0018 or game rules are delivered here.
This clean-main slice uses main's existing continuous renderer. Earlier actual
browser creation/re-entry for all4 and Каменный Брод versus selected Тихая Гать
are preview evidence; fresh exact-main checks/review/CI are recorded in CURRENT_PLAN.

For the separate networked painted-atlas laboratory:

```bash
pnpm dev:world
```

Open `http://127.0.0.1:5338/scripts/world-map/world-lab.html`. Choose player A
and player B in separate browser profiles/contexts: ordinary tabs share a cookie.
Right-click orders movement; left-drag/WASD pans, the wheel zooms, Space stops
only your company. The nearby-place button opens a server-validated scene.
Both clients use the same eightfold test clock; there are no private time controls.

The PR audit also runs a real Chromium journey with pinned development-only
Playwright1.64.1. `pnpm test:world:browser` uses the running isolated lab, creates
two browser contexts and exercises fixture sessions, visits/recovery, movement,
camera, pursuit/stale retry, transport resumption and legacy controls. Install
Chromium with `pnpm exec playwright install chromium`; an explicit local Chrome
executable can be supplied through `WORLD_LAB_CHROMIUM`.

CI collects existing SQL execution with `WARWRIT_INTEGRATION_COVERAGE` and actual
migration child execution with `WARWRIT_MIGRATION_RUNTIME_COVERAGE`. Defaults keep
the normal migration command unchanged. The CI-only helper
`scripts/world-map/check-world-lab-ci.sh` starts disposable PostgreSQL plus captured
API/Vite child processes in a fresh `output/world-lab-ci/runtime-*` directory.
It stops/waits only its own children and removes only its own Compose project.
The persistent laboratory database is never reset. Private UI5338 keeps its
file allowlist; retired Navigation Lab notice and fog-design references run on a separate loopback
origin5326. The full atlas is denied there. `pnpm dev:map` now opens
`/dev/playground/maps` on the ordinary development web stand; it requires the
[Playground setup](DEVELOPER_PLAYGROUND.md) and an allowlisted authenticated
account. Atlas bytes and draft API are served only through that protected scope.
See [Map Editor journeys and lifecycle](UNIFIED_MAP_EDITOR.md).
Its same-run browser/server/SQL reports supplement unit coverage through the
source-checking merger before the unchanged audit. Missing/stale reports fail;
previous local evidence is not uploaded as CI proof. The job budget is35 minutes
since2026-11-05: run42044643870 exhausted the previous30-minute job cap during
the ordinary-browser step after successful bootstrap, measured units and world
journey. Browser/launcher PASS messages preceded cancellation; the CI step was
cancelled and audit was NOT_RUN. The whole-job allowance adds headroom for measured execution variance; individual
scenario deadlines, checks and audit thresholds retain their existing limits.

Full PR CI keeps bootstrap first, captures both browser journeys, measures units,
then merges world/merger-self/painted measurements before the native audit.
Both CI launchers accept `--capture <runtime.json>` to collect into a new path
without touching unit coverage, and `--merge <runtime.json>` to aggregate without
starting services/builds/browsers. World capture still needs bootstrap's current
SQL/migration outputs. No-argument invocation retains capture-and-merge behavior.
World aggregation publishes an owned candidate only after both conversions pass.
Run aggregation once after a fresh unit report; an earlier successful phase may
remain after a later phase fails, but that partial result is not CI acceptance.
Captures stay under `output/` while measured units replace `coverage/`; no package
rebuild occurs between capture and source-validated aggregation.

This launcher owns loopback API3038, realtime3039 and UI5338, plus the persistent
`warwrit-world-lab` Compose project/PostgreSQL65438. It uses `compose.world-lab.yaml`
and its own database and cookie; it never uses the campaign `DATABASE_URL`.
Stopping the launcher stops its children and keeps the database. Restarting
retains the companies, accepted routes and NPC identities. The single-player
stand remains at5326. Ports are fixed and fail on conflict; stop the owning
launcher before starting another copy. Never delete the volume to fix a route.
The development fixture login is loopback-only and unavailable in production.
See the [current implementation boundaries](../wiki/world/map.md#сетевая-лаборатория--реализация-2026-10-26).

For optional measured Node coverage, stop the owning launcher first and choose
an unused absolute JSON path:

```bash
WORLD_LAB_RUNTIME_COVERAGE="$PWD/output/world-lab-engine.json" pnpm dev:world
```

This opt-in builds inline source maps and uses a process-local inspector session;
no debugger port is exposed. Send SIGUSR2 to this launcher's API child after the
journey to save one capture, or allow graceful process exit. An existing destination
fails startup; an empty file or capture error is not evidence. Browser coverage must
be collected for each document before navigation discards it. Combine the measured
entries in `{ "entries": [...], "reports": [...] }`; `reports` may name real SQL
Istanbul reports. Each entry carries its captured script text, functions and map.
If a map omits original content, `frozenBeforeMs` must record the actual capture
process start boundary, before any affected source edit. Prefer inline originals.

For a hosted final-audit failure, first download `quality-audit-<run>-<attempt>`
from that CI run. Read `output/quality-audit/context.txt`, the explanation step,
and `audit.stderr`; render the retained report locally without rerunning analysis:

```bash
node scripts/print-quality-audit.mjs /absolute/artifact/output/quality-audit/audit.json
```

For a known complexity finding, inspect structural metrics without producing
coverage again:

```bash
pnpm exec fallow health scripts/world-map/world-lab.browser.mjs --complexity --max-cyclomatic 1 --report-only --format json --output-file output/readiness-health.json
```

The temporary threshold1 displays simple functions too. This source-only,
advisory report provides no current measured coverage/CRAP verdict and never
replaces the native audit. Do not change measured counters or suppress a finding
to make it pass; correct the actual code or its proven measurement defect.

The artifact also retains the same-run `coverage/coverage-final.json`. It is
historical evidence for the recorded checkout/base and inputs, not coverage of
subsequent edits. Unknown attribution stays unknown. Inspect the complete JSON
for categories outside the concise complexity/clone explanation. Reproduce only
the unresolved diagnostic with relevant inputs before choosing a full local
measured run; do not substitute this report for required current-head CI.

After explicit tests produce current `coverage/coverage-final.json`, merge an
optional measured runtime capture and run the audit explicitly.

```bash
node scripts/world-map/runtime-coverage-merge.mjs /absolute/input.json coverage/coverage-final.json
pnpm check:changes
```

The merger rejects changed mapped sources before writing the target and resolves
mapper end-of-line sentinels to verified line lengths without changing hit counts.
Reusing a matching capture establishes coverage of unchanged source. A fresh
journey still needs its own execution evidence. Git commits perform no coverage
processing. For another local audit, start with a fresh measured unit report before
merging the selected runtime/SQL captures once. Repeatedly merging into the same
accumulated report adds its hit counts again and can overflow downstream readers.
Keep prior reports as historical evidence. This optional diagnostic supplements
required CI and tests.

One local start for the playable alpha (company, world, contracts, encounters):

```bash
cp .env.example .env     # once; loopback-only test values
pnpm install --frozen-lockfile
pnpm db:up               # PostgreSQL 17 on 127.0.0.1:55432 and Dex on 127.0.0.1:5556
pnpm db:migrate:up       # applies every pending ordered migration
pnpm dev                 # builds shared exports, then server :3000, realtime :3110, web :5173
```

Open `http://127.0.0.1:5173` (use `127.0.0.1`, not `localhost`: the session
cookie and OIDC redirect are bound to that origin) and choose **Войти**. The
local Dex accepts the fixture accounts below; they are public test values for
this loopback stack only.

| Account                   | Password              |
| ------------------------- | --------------------- |
| `player-one@example.test` | `local-only-pass-one` |
| `player-two@example.test` | `local-only-pass-two` |

Use a second browser profile (or a private window) for the second player.

- web: `http://127.0.0.1:5173` (proxies `/api/*` without the prefix,
  `/auth/callback` and the `/colyseus` realtime socket);
- server: `http://127.0.0.1:3000`; liveness `/health/live`, readiness
  `/health/ready` (503 while PostgreSQL is unavailable).

Stop with `Ctrl+C` in the `pnpm dev` terminal and `pnpm db:down`; data stays in
the Compose volumes, so the next `pnpm db:up` returns the same world. To restart
only the server (persistence check), stop and rerun `pnpm dev`. `docker compose
down --volumes` deletes the local world and identities irreversibly.

Compose defaults to the checkout directory name. Checkouts with the same final
folder name share that default, even when their parent paths differ. For concurrent
campaign stacks, configure a unique `COMPOSE_PROJECT_NAME` and all ports using the
isolated recipe below.

### Isolated ordinary-game worktree — #176

Prerequisites are the pinned toolchain above, running Colima/Docker Compose and
GitHub access. Create a new persistent worktree from current main, or clone the
repository into a new folder. Work only inside that checkout. Check that the five
ports below are unused with `lsof -nP -iTCP:<port> -sTCP:LISTEN`; choose another
set if occupied. Reserve the project name as well. Reuse this exact configuration
for every restart. This example owns PostgreSQL54376/Dex5576/API3576/RT3577/UI5276.
Use another unique name and matching ports for a second checkout.

```bash
pnpm install --frozen-lockfile
mkdir -p output
cat > .env <<'ENV'
NODE_ENV=development
HOST=127.0.0.1
PORT=3576
LOG_LEVEL=info
COMPOSE_PROJECT_NAME=warwrit-launch176-20261106
POSTGRES_PORT=54376
DATABASE_URL=postgres://warwrit:warwrit@127.0.0.1:54376/warwrit
DEX_PORT=5576
DEX_CONFIG_FILE=./output/dex.dev.yaml
OIDC_ISSUER=http://127.0.0.1:5576/dex
OIDC_CLIENT_ID=warwrit-local
OIDC_CLIENT_SECRET=warwrit-local-only-secret
OIDC_REDIRECT_URI=http://127.0.0.1:5276/auth/callback
PUBLIC_ORIGIN=http://127.0.0.1:5276
WEB_PORT=5276
API_PROXY_TARGET=http://127.0.0.1:3576
VITE_API_BASE_URL=/api
ENCOUNTER_REALTIME_PORT=3577
ENCOUNTER_REALTIME_PROXY_TARGET=http://127.0.0.1:3577
WORLD_MAP=painted-atlas
ENV
sed -e 's@^issuer:.*@issuer: http://127.0.0.1:5576/dex@' \
    -e 's@http://127.0.0.1:5173/auth/callback@http://127.0.0.1:5276/auth/callback@' \
    fixtures/identity/dex.dev.yaml > output/dex.dev.yaml
pnpm db:up
pnpm db:migrate:up
pnpm dev
```

This generates the local Dex configuration from tracked source and public test
values. Its internal listener remains5556. `DEX_PORT` changes the published port;
`DEX_CONFIG_FILE` selects the matching issuer/callback. Default configuration
continues to use5556/5173. `.env` and `output/` are ignored local files. The ordinary
`pnpm dev` builds core/protocol before starting the two development processes.

In another terminal inside the same checkout, wait for readiness before opening
`http://127.0.0.1:5276`. Use **Войти** and a fixture account from the table above.
Create a company, equip a member, buy supplies and accept an available local
contract. Record the visible company name, equipment, supplies and contract.
Ordinary travel/JOIN then checks an encounter and the realtime socket at3577.

```bash
curl -fsS http://127.0.0.1:3576/health/ready
curl -fsS http://127.0.0.1:5576/dex/.well-known/openid-configuration
# Keep pnpm dev running while checking a database outage.
docker compose stop postgres
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3576/health/live  # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3576/health/ready # 503
docker compose up -d --wait postgres
curl -fsS http://127.0.0.1:3576/health/ready
```

Stop `pnpm dev` with Ctrl+C, then run `pnpm db:down`. Both project volumes remain.
Restart with `pnpm db:up && pnpm db:migrate:up && pnpm dev`. Reload, log out and
use **Войти** again. The same account/company and accepted actions must return.
Campaign clock/upkeep may advance across downtime. Keep the same issuer, project,
world selector and configuration. Do not use `down --volumes`, prune, a new project
name or manual SQL edits as restart recovery.

Troubleshooting follows the failing boundary.

- Connection refused or Vite proxy errors. Check API readiness first. An occupied
  port fails startup. Stop only its known owner or reserve a different complete set.
- Dex redirect failure. Check the generated callback and issuer against `.env`.
  Restart Dex after changing its configuration and start a new login flow.
- Readiness503. Check this project's PostgreSQL and pending migrations. A startup
  with unavailable schema/database can refuse before opening HTTP. Running-server
  dependency loss is checked separately above. Preserve the volume.
- Failed login while ready200. Readiness probes database/schema. Check issuer
  discovery and perform ordinary login to establish local identity availability.
- Apparent new company. Confirm the same database/project, issuer, account and
  `WORLD_MAP`. Atlas and legacy saves are separate. Cookies are host-scoped, so
  separate Chrome profiles are required for concurrent stacks on127.0.0.1.

The [playtest result](M1_LOCAL_PLAYTEST.md#reproducible-launch-contract--176-2026-11-06)
records actual verification and remaining limits. Production requires complete
DB/OIDC configuration, uses deployment-supplied environment and prohibits local
fixture/lab modes. This local recipe uses public development credentials.

Orca worktrees run [`scripts/orca-setup.sh`](../../scripts/orca-setup.sh) on
creation: dependencies, package builds and private combat-lab ports in
`.worktree-ports`, which the `pnpm dev:combat` alias reads. WLC-06 retires the
DB-free lab: each stand also needs explicit Playground identity, developer allowlist
and a migrated disposable database. It uses `/dev/playground/combat`.
[Orca setup and limits](AGENT_TEAM.md#orca-parallel-worktrees--2026-10-18).

## Verification pipeline

`pnpm verify` runs in this order:

1. formatting check;
2. ESLint, including deterministic-core restrictions on ambient time, randomness, process, storage, network, browser, and concurrency APIs;
3. dependency-boundary and cycle checks;
4. unused files, exports and dependencies (`fallow dead-code`, configured in `.fallowrc.jsonc`);
5. ast-grep code-shape rules and their rule tests (`sgconfig.yml`, `ast-grep/`);
6. content/asset validation;
7. package builds in dependency order;
8. strict TypeScript checks against built workspace contracts;
9. unit and property tests.

Pull-request CI also runs `pnpm check:changes` (`fallow audit`): it fails only on
dead code, complexity or duplication that the branch introduces in changed files.
Inherited complexity and clones are listed by `pnpm report:quality` and
`pnpm exec ast-grep scan` warnings; fixing them belongs to an owning change.

Local Git `pre-commit` and `pre-merge-commit` hooks run only
`git diff --cached --check`. Staged whitespace errors fail visibly, including
Markdown. Unstaged/untracked code and missing coverage do not affect this check.
Run focused tests, types or lint explicitly before the step commit and record
actual failures. A successful local commit establishes only that local check.

Clean PR CI owns `pnpm test:coverage`, measured world-map journeys and
`pnpm check:changes` against the PR base. Local audit remains an explicit
`pnpm check:changes` diagnostic when its coverage inputs are available.
The 2026-11-04 cleanup removes automatic coverage generation/merging and the
second Claude `PreToolUse` audit. Claude startup/resume print local preflight.
Compaction runs no inventory hook. Run `pnpm agent:status` for live integration state.

A fresh `pnpm install` points the clone's `core.hooksPath` at the tracked hooks.
Existing clones can run `pnpm run prepare` if preflight reports an inactive hook.
That setting is shared by worktrees, whose checked-out hook contents may differ.
Check the actual checkout before applying these semantics to an older branch.
Hook regressions run with `node --test scripts/git-hooks/check-hooks.mjs`.

The M0 combat acceptance gate runs separately:

```bash
pnpm test:combat:stress
```

It generates 10,000 deterministic battles with 4–12 fighters, runs both sides through server-style AI, asserts terminal resolution and state invariants, samples replay reconstruction and exact reruns, and emits a SHA-256 digest plus aggregate evidence. A failure aborts clean bootstrap and CI.

Migration smoke and the encounter PostgreSQL specifications run separately because
they require an empty PostgreSQL database. The smoke applies and rolls back every
migration, leaving no schema; the script then applies all migrations and runs the
encounter specifications (atomic receipts, competing connections, replay after
reload) and the OIDC session specification (in-process test issuer, no Dex)
through `WARWRIT_ENCOUNTER_DATABASE_URL` and `IDENTITY_TEST_DATABASE_URL`. Before
2026-09-29 CI skipped both because only `DATABASE_URL` was set:

```bash
pnpm test:migrations
```

## Start and resume context

`pnpm agent:preflight [base-ref]` prints this checkout's identity, tool versions,
hook status and dirty paths. It also lists upstream instruction, role, guard,
configuration and delegation-guide changes
since the branch fork using the selected local ref (default `origin/main`).
The notice establishes upstream changes, including any already ported separately.
Compare actual source before deciding integration. All comparisons use local refs.
Refresh live refs explicitly when integration needs them. A missing local base is
reported. Inspect other worktrees with `git worktree list` when ownership needs it.
Supporting harness/docs tasks retain their status in the existing owning page and
hand current-game checkpoint changes to the game integrator.

## Focused checks

Use these while editing; the full gate above runs once on the final tree.

```bash
pnpm agent:preflight                                  # checkout identity for start/resume/handoff
pnpm agent:status                                     # live main, CI, open PRs, active writer branches (git + gh)
pnpm --filter @warwrit/game-core build                # refresh dist before testkit-based specs
pnpm exec vitest run packages/game-core/src/company   # one directory or file
pnpm exec vitest run -t "replay" packages/game-core   # tests whose name matches
pnpm --filter @warwrit/game-core typecheck            # one package
pnpm exec prettier --check <changed files>
pnpm check:architecture
pnpm check:migrations                                 # released migrations unchanged vs origin/main
pnpm check:changes                                    # new dead code/complexity/duplication vs origin/main
pnpm exec ast-grep scan <paths>                       # code-shape rules; warnings are known weak spots
pnpm exec fallow dupes --trace dup:<fingerprint>      # inspect one clone group before consolidating
pnpm test:coverage                                    # v8 coverage/coverage-final.json; no threshold
pnpm exec fallow health --coverage coverage/coverage-final.json   # measured CRAP per function
```

Testkit and cross-package specs import built workspace exports; `typecheck` uses
`--noEmit` and does not refresh `dist`.

When company observation/roster-read semantics change, include the existing
recruitment SQL consumer alongside the affected executor/routes checks:

```bash
pnpm exec vitest run --mode integration apps/server/src/company/recruitment.integration.test.ts
```

Use built public packages and `DATABASE_URL` for an exclusively owned disposable
PostgreSQL. Existing integration setup creates/migrates its isolated test databases.
Normal unit mode skips this scenario. After an observation, load the current
persisted aggregate before a fixture edit; restoring an old genesis state can
mismatch the row's newer revisions. [Observed recovery failure](HARNESS_EVAL.md#fresh-recovery-consumer-check).

## Proportional local validation

Owner amendment — 2026-10-25: one assigned check owner runs
`bash scripts/orca-validate.sh <worktree> [base-ref]` per relevant revision.
`--plan` as the third argument prints routing without network or mutation.
Failed checks print a diagnostic tail (up to 8192 bytes) and the exact rerun command,
while retaining `.orca/validate-<step>.log` and a nonzero overall result.
The script uses local refs (no implicit fetch), requires a valid merge base and
checks integration/clean tree and scope before format/product commands, stopping
on any failure. A committed CURRENT_PLAN edit or deletion also runs its existing
plan checker before those commands.
Clean CI runs that same checker before toolchain setup/bootstrap. PR scope retains
task linkage and size reporting. Refresh live refs when integration
requires it; the script does not claim its local origin/main is live.

| Affected paths                                                                 | Local route                                                                      |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Markdown docs/instructions only                                                | Scoped format; review affected local links/deleted targets                       |
| Web source/public (including CSS)                                              | Workspace contract builds, web typecheck, code lint, web tests                   |
| Server source                                                                  | Workspace contract builds, server typecheck, code lint, server tests             |
| Core/protocol/testkit source                                                   | Contract builds, all consumer typechecks/tests, changed-code lint                |
| Scripts, CI, package config, lockfile, migrations, assets elsewhere or unknown | Conservative existing `pnpm verify` route, plus the owning focused fixture/check |

Deletion and rename classification includes both old and new paths. Format/lint
receives only existing files. Package/consumer test selection avoids claiming
zero related tests as sufficient; Vitest fails with zero tests. A routing fixture
proves selected commands, not that those commands passed on real game code.
Inspect compatibility and actual runtime consumers as well as this coarse routing.
Database/schema changes retain their relevant real database checks and resource
ownership; local routing never authorizes starting a shared DB.

Do not repeat unchanged validation in builder and coordinator. Preserve applicable
results until their code/dependencies/configuration/environment changes. Required
PR CI uses this same committed-path classifier. Only its exact `docs` result
selects the documentation path, with pinned frozen install, changed-file
formatting, harness regressions, plan and migration protection. CI invokes the
existing focused validator against the tested checkout's merge base. A fetched
base ref advancing after the synthetic merge does not create an unrelated
up-to-date-base failure. Frozen install enables the pinned pnpm shim first. Product tests, browser
journeys and measured quality audit are skipped for that documented scope.
Mixed changes, scripts/workflows, config, dependencies, assets and unknown paths
use the full bootstrap/coverage/browser/audit path. Main pushes and manual runs
also use the full path. Failed classification fails CI. Review affected local
links and deleted targets explicitly. Adding runtime Markdown consumption under
`docs/` requires updating this classifier contract.
Local focused success does not waive full-route PR CI. For a tooling-only assignment run the
owning fixtures/syntax/format directly and report broad game checks NOT_RUN.

## Combat implementation rules

- `packages/game-core/src/combat/rules.ts` owns all provisional M0 numeric parameters.
- RNG state records the algorithm name and draw count; changing its sequence requires a new algorithm/ruleset version.
- Hex coordinates are axial and paths use deterministic breadth-first search with stable neighbor ordering.
- Commands are immutable intents. The kernel computes paths, hit rolls, damage, initiative, and outcomes.
- Rejected commands return the original state object and no events.
- Replays contain the setup, seed, ruleset ID, and accepted command stream; they are JSON-serializable.
- `packages/testkit` may generate scenarios, but production code may not import it.

The kernel is not an untrusted network boundary. A later server/API work package must validate transport payloads before constructing typed combat commands.

## Migrations

Migration pairs live in `apps/server/migrations`:

```text
NNNN_name.up.sql
NNNN_name.down.sql
```

Commands:

```bash
pnpm db:migrate:up
pnpm db:migrate:status
pnpm db:migrate:down
```

The migrator records applied versions in `schema_migrations`, executes each migration transactionally, and rolls back the latest applied migration. The smoke test also checks status and idempotent up/down behavior.

## Structured logging

The server uses Pino-compatible JSON logging with a stable `service` field. Event-specific values belong in structured fields; user secrets and authorization material never belong in logs.

## Health semantics

- `/health/live`: process can answer HTTP; no downstream checks.
- `/health/ready`: the configured database/schema probe succeeds. Production startup requires database-backed OIDC configuration. Development health-only tools can omit it and use the existing HTTP-only readiness. Issuer reachability is established by discovery/login separately.

## Developer Playground (WLC-05)

Use a disposable development database, apply ordinary migrations, then enable
`PLAYGROUND=1` and `PLAYGROUND_ACCOUNT_IDS` (comma-separated authenticated account
IDs from `/auth/session`). Keep `NODE_ENV=development` or `test`, a loopback
`HOST`, complete OIDC settings and exact `PUBLIC_ORIGIN` matching the browser.
Sign in normally, then open `/dev/playground` (Combat Lab / Map Editor).
The server rejects missing/unauthorized sessions and foreign mutation origins.
No wildcard developer grant or company/identity mutation endpoint is added.

WLC-06: create → choose debug preset → visually edit map/participants/equipment/
initial pools/seed → save → Validate → Start. Preflight also validates edits without
mutating saved state. Manual commands, Step, Autoplay/Pause and inspection use
`/dev/playground/combat`; Map Editor links back to this single command entry.
Clone/reset/delete and exact retry share the shell. TTL is fixed at 24 hours;
tombstones count toward quotas until cleanup. Apply new migration0022 for isolated
encounter storage. The server-only scope has no public-schema fallback or campaign
clock/effects. A lost combat response blocks replacement and survives reload/API
restart; use the exact-retry button. Download/verify replay pins schema2, bridge-v5,
content revision, seed, accepted commands and final digest. Unknown old content
remains metadata-only until explicitly reset/reconfigured. `COMBAT_LAB=1` is refused.
[Foundation](DEVELOPER_PLAYGROUND.md) · [Current lab behavior/checks](COMBAT_LAB_CONSOLIDATION.md).

Production server packaging uses `pnpm --filter @warwrit/server build`
and `pnpm --filter @warwrit/server start`, with shared packages built
first. Deploy only `apps/server/dist/` plus ordinary runtime dependencies,
shared package distributions, required content and migration files. The existing
Vite compiler strips debug registrations with a production build constant; it
preserves module paths for relative content URLs and external workspace packages.
Development runs source through the existing `dev`/tsx command; standard build/start always use the stripped production distribution.
No deployment is performed by these instructions. The ordinary production web
build strips both debug entrypoints even when `VITE_COMBAT_LAB=1` is supplied.

### Opt-in Playground campaign time — WLC-08

On an exclusively owned disposable development database, add
`PLAYGROUND_CAMPAIGN_WORLD=world.porechye.atlas-v1` alongside the normal
painted-world/Playground/OIDC/account allowlist settings. It must name this
stand's configured world. Apply migrations and restart the development API.
Open `/dev/playground/combat`: **Время изолированного QA-мира** offers fixed
+1/+10/+100/+1000 campaign-tick steps. This changes the test campaign clock;
normal game reads/commands then settle food, rest and wages. Auth sessions,
light cycles and combat deadlines retain real time. Active/unsettled encounters
refuse advancement. Reload/exact retry uses the same saved command and receipt.
Do not enable on retained player databases. Production refuses this setting.
Time and receipts survive restart; rollback0024 refuses to discard a used journal.
This is explicitly accelerated QA evidence, not a real six-hour waiting test.
