# Local development and CI

## Pinned toolchain

- Node.js `24.20.0` LTS line;
- pnpm `11.25.0` through Corepack;
- ESLint `10.x` with the exact dependency graph committed in the lockfile;
- Vitest `4.x` and fast-check `4.9.0` for example- and property-based verification;
- PostgreSQL `17` for the first persistence contract;
- Linux CI on `ubuntu-24.04`.

The exact package graph is committed in `pnpm-lock.yaml`.

## Clean bootstrap

```bash
./scripts/bootstrap.sh
```

The script fails closed if the Node.js line or Docker is unavailable. It performs the repository verification suite, the 10,000-battle combat stress gate, and migration up/down. Set `KEEP_INFRA=1` to leave PostgreSQL running after validation.

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
4. content/asset validation;
5. package builds in dependency order;
6. strict TypeScript checks against built workspace contracts;
7. unit and property tests.

The M0 combat acceptance gate runs separately:

```bash
pnpm test:combat:stress
```

It generates 10,000 deterministic battles with 4–12 fighters, runs both sides through server-style AI, asserts terminal resolution and state invariants, samples replay reconstruction and exact reruns, and emits a SHA-256 digest plus aggregate evidence. A failure aborts clean bootstrap and CI.

Migration smoke also runs separately because it requires PostgreSQL:

```bash
pnpm test:migrations
```

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
