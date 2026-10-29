# Local development and CI

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
`scripts/world-map/check-world-lab-ci.sh` starts its owned launcher and uses a
fresh runtime subdirectory in `output/world-lab-ci/`; it stops/waits its children
and removes only its owned PID file. It never resets the persistent database.
Its same-run browser/server/SQL reports supplement unit coverage through the
source-checking merger before the unchanged audit. Missing/stale reports fail;
previous local evidence is not uploaded as CI proof. The job budget is30 minutes
for the existing15m28s gate plus measured SQL/browser phases.

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

`WARWRIT_RUNTIME_COVERAGE=/absolute/input.json git commit ...` adds this measured
coverage after the hook's ordinary related tests and before the unchanged Fallow
thresholds. The merger rejects changed mapped sources before writing the target,
and resolves mapper end-of-line sentinels to verified line lengths without changing
hit counts. Reusing a matching capture proves coverage of unchanged source; it does
not prove a newly executed journey. This is optional local evidence tooling, not a
replacement for required CI or tests.

One local start for the playable alpha (company, world, contracts, encounters):

```bash
cp .env.example .env     # once; loopback-only test values
pnpm install --frozen-lockfile
pnpm db:up               # PostgreSQL 17 on 127.0.0.1:55432 and Dex on 127.0.0.1:5556
pnpm db:migrate:up       # applies every pending ordered migration
pnpm dev                 # server :3000, realtime :3110, web :5173
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

The Compose project name is the checkout directory name, so two checkouts get
separate volumes but share the published ports; stop one stack before starting
another.

Orca worktrees run [`scripts/orca-setup.sh`](../../scripts/orca-setup.sh) on
creation: dependencies, package builds and private combat-lab ports in
`.worktree-ports`, which `pnpm dev:combat` reads. Several worktrees can serve
the combat lab at once; the campaign stack above stays shared.
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

The same audit runs locally as Git `pre-commit` and `pre-merge-commit` hooks
(`scripts/git-hooks/`) for every agent and terminal. It audits the working tree
against the merge-base with `origin/main` (override with `FALLOW_AUDIT_BASE`), so
an untracked unused file also blocks a commit; a Markdown-only commit skips it.
It takes about 10–15 s. Rebase and cherry-pick run no hook, and
`git commit --no-verify` skips it (the audit is then `NOT_RUN`); CI stays the
final gate. Agents may skip it only for intermediate work-branch commits under
[AGENTS.md § Work-package steps](../../AGENTS.md#work-package-steps).

A fresh `pnpm install` points the clone's `core.hooksPath` at the hooks. pnpm
skips that `prepare` step when `node_modules` is already current, so an existing
clone runs `pnpm run prepare` once; `pnpm agent:preflight` prints whether the
gate is active. The setting is shared by all worktrees, but a worktree whose base
predates the hooks runs none until it merges `main`.

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

## Proportional local validation

Owner amendment — 2026-10-25: one assigned check owner runs
`bash scripts/orca-validate.sh <worktree> [base-ref]` per relevant revision.
`--plan` as the third argument prints routing without network or mutation.
The script uses local refs (no implicit fetch), requires a valid merge base and
checks integration/clean tree before acceptance. Refresh live refs when integration
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
results until their code/dependencies/configuration/environment changes. Hooks and
required PR CI still run the existing coverage-dependent audit and full bootstrap;
local focused success does not waive them. For a tooling-only assignment run the
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
- `/health/ready`: required database probe succeeds. Without a configured database, the foundation process is considered ready for isolated HTTP tests.
