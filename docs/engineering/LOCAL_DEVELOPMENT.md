# Local development and CI

## Pinned toolchain

- Node.js `24.20.0` LTS line;
- pnpm `11.25.0` through Corepack;
- PostgreSQL `17` for the first persistence contract;
- Linux CI on `ubuntu-24.04`.

The exact package graph is committed in `pnpm-lock.yaml`.

## Clean bootstrap

```bash
./scripts/bootstrap.sh
```

The script fails closed if the Node.js line or Docker is unavailable. Set `KEEP_INFRA=1` to leave PostgreSQL running after validation.

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
2. ESLint;
3. dependency-boundary and cycle checks;
4. content/asset validation;
5. package builds in dependency order;
6. strict TypeScript checks against built workspace contracts;
7. unit tests.

Migration smoke runs separately because it requires PostgreSQL:

```bash
pnpm test:migrations
```

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
