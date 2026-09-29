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

Manual development keeps PostgreSQL at `127.0.0.1:5432` by default. Choose another host port when needed with `POSTGRES_PORT=55434 pnpm db:up`.

## Environment contract

Local overrides live in one root `.env` file, normally created from `.env.example`.

- the server watch process loads `../../.env` through Node's `--env-file-if-exists` flag;
- Vite uses the repository root as its `envDir`;
- only variables prefixed with `VITE_` may be exposed to browser code;
- production processes receive environment variables from their deployment environment and do not load developer files implicitly.

## Development processes

```bash
pnpm db:up
pnpm dev
```

- web: `http://localhost:5173`;
- server: `http://localhost:3000`;
- liveness: `http://localhost:3000/health/live`;
- readiness: `http://localhost:3000/health/ready`.

The Vite development server proxies `/api/*` to the server and removes the `/api` prefix.

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
