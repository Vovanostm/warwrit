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

### Four-company painted preview

Owner correction, 2026-10-30: `http://127.0.0.1:5259` now serves the authored
`atlas-v6.png` through the ordinary private cartography API. The legacy preview
previously served at that address was stopped. Use **Выйти** and **Войти за
компанию 1 / 2 / 3 / 4** to switch saved test companies; use separate browser
profiles for concurrent players. These four companies belong to the separate
`world.porechye.atlas-v1` world. Their unknown terrain stays covered by the
existing fog rules; this shortcut grants no extra map knowledge.

Restart the configured preview from its own checkout:

```bash
cd /Users/vovanostm/.codex/worktrees/local-painted-login/warwrit
pnpm dev
```

Its retained local `.env` selects `WORLD_MAP=painted-atlas`, UI5259/API3259/
realtime3260, a local identity origin and the existing painted QA database
`warwrit_painted_gameqa_camera_20261029` on PostgreSQL32768. Keep that local
configuration; a fresh copy of `.env.example` uses different default ports.
No database reset or migration is part of this switch. Legacy accounts/companies
remain in their old database; their coordinates are not reinterpreted as atlas
coordinates. The original painted-map writer checkout remains untouched.

All four first/repeat entries, slot1 reload and four unchanged SQL company
bindings were checked in the running browser/database. Independent image review
confirmed settled painted terrain and matching headers for all four; independent
browser/SQL replay was NOT_RUN. Types, scoped lint and 13 focused
config/auth/movement tests passed. This is local configuration evidence, not
new art, whole-game, release or hosted-operation acceptance. Full gates NOT_RUN;
no new commit, PR, merge or deployment. Captures are local under
`/Users/vovanostm/learn/warwrit/output/local-painted-login/`.

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

### Four quick-login test companies

The development sign-in screen offers **Войти за компанию 1 / 2 / 3 / 4**.
Each button uses its own local test account. On first use it creates
**Тестовая компания N**, with **Капитан N** and two existing opening companions,
through the ordinary company APIs. The current opening grants 800 crowns after
hiring and 30 rations. Subsequent logins restore the saved company and its
progress; they do not reset it. Choose **Выйти** to switch companies. Use separate
browser profiles for simultaneous players, since tabs share the session cookie.

The server exposes this shortcut only with `NODE_ENV=development`, a loopback
listener (`127.0.0.1`, `localhost` or `::1`) and a local HTTP `PUBLIC_ORIGIN`.
The Vite development UI checks availability before showing the buttons. Production
builds hide them and production servers do not register the quick-login routes.
`POST /auth/local-companies` accepts only company numbers 1–4 and the configured
request origin. It issues the ordinary HttpOnly session and revokes the browser's
previous session. These four identities are separate from Dex and existing players.
No migration, password entry, external identity provider or save reset is required.

Verification, 2026-10-29: real browser first creation and repeat login reached the
map for all four companies; PostgreSQL readback retained the same four company IDs.
Company 1 also restored after reload. Configuration/origin/slot boundary tests
(10) and the existing PostgreSQL OIDC integration (1) passed; server/web types,
scoped lint and formatting passed. The first 1280×720 capture exposed footer
overlap; reduced local-card padding fixes it at 1280×720 and 1440×900. Independent
image review scores every applicable UI criterion 2–3/3, with no remaining scoped
finding; independent browser input was NOT_RUN. Its formal art-rubric verdict
remains BLOCKED on close/game and day/night comparison sheets, which this static
login screen does not provide. No whole-game visual acceptance is claimed.
The new entry-flow complexity finding was resolved by separating session, read,
create and save responsibilities; final audit has no introduced findings in the
new entry/auth/config source. The overall changed-code audit still fails on
other branch/WIP findings in this mixed tree, blocking a normal local commit.
No hook bypass was used. Full game/release gates were NOT_RUN for this
development-only change. Local only, not committed, published, merged or deployed.
Browser captures: `output/local-company-login/`.

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

## Local production-artifact rehearsal

Use the existing isolated rehearsal database and a private environment file
outside version control, mode 0600. Set its `DATABASE_URL`, complete OIDC
configuration, `PUBLIC_ORIGIN`, `OIDC_REDIRECT_URI`, `HOST`, `PORT` and
`ENCOUNTER_REALTIME_PORT` for that rehearsal. The registered OIDC callback must
match the web origin. Remove development Playground flags from this environment.
Keep the ordinary development runtime stopped while reusing its ports.

Build once from the repository root with the pinned toolchain:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Start the compiled API in one terminal. Replace the environment-file placeholder
with the private file prepared for the isolated database:

```bash
NODE_ENV=production node --env-file=/absolute/path/m1-runtime.env apps/server/dist/index.js
```

Start the compiled web preview in a second terminal. This local example uses
the existing rehearsal callback on port 5335, API port 3035 and realtime 3036:

```bash
API_PROXY_TARGET=http://127.0.0.1:3035 ENCOUNTER_REALTIME_PROXY_TARGET=http://127.0.0.1:3036 pnpm --filter @warwrit/web preview --host 127.0.0.1 --port 5335 --strictPort
```

Open `http://127.0.0.1:5335`, use ordinary **Войти**, and verify the saved company.
Check `/health/live` and `/health/ready` on the API. For the readiness drill,
route only this rehearsal API through an owned local TCP proxy to PostgreSQL.
Stopping that proxy must yield liveness 200 and readiness 503. Restart it, wait
for readiness 200, and repeat ordinary login. Keep the shared database and Dex
running. Stop the two owned application terminals with `Ctrl+C`, then restart
against the same private environment and verify the same company again.

The detailed current result and restore link belong to
[N12](../work-packages/m1-next/12-release-preparation.md).

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
