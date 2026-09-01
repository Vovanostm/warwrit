# Warwrit

Warwrit is a browser-first persistent tactical game project. The repository is currently at **WP-00 — Repository & Engineering Foundation**: the engineering substrate exists, but no gameplay mechanics are implemented yet.

## Bootstrap

Prerequisites:

- Node.js `24.20.x`;
- Corepack;
- Docker with Docker Compose v2;
- Git.

From a clean checkout, run one command:

```bash
./scripts/bootstrap.sh
```

The bootstrap installs the pinned package manager and dependencies, starts PostgreSQL, runs the complete verification suite, exercises migration up/down, and then stops local infrastructure.

## Daily commands

| Command                | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `pnpm dev`             | Run the web and server development processes                         |
| `pnpm verify`          | Format, lint, architecture, content, type, build, and unit checks    |
| `pnpm test:migrations` | Apply and roll back the current migration set against `DATABASE_URL` |
| `pnpm db:up`           | Start local PostgreSQL                                               |
| `pnpm db:down`         | Stop local PostgreSQL                                                |
| `pnpm clean`           | Remove generated build and coverage output                           |

Copy `.env.example` to `.env` for local overrides. The default Docker database URL is already documented there.

## Repository layout

```text
apps/
  server/       Server-authoritative HTTP process and persistence adapters
  web/          Browser shell; no combat client exists yet
packages/
  game-core/    Pure deterministic domain kernel; no I/O imports are allowed
  protocol/     Versioned transport contracts and shared API types
  testkit/      Test-only helpers; production packages must not depend on it
assets/         Versioned asset manifest and future source assets
content/        Future validated authored content
scripts/        Repository verification, bootstrap, and migration smoke tools
docs/           Authority, architecture, engineering, and work-package records
```

## Architectural rule

`packages/game-core` is the dependency center of the future deterministic simulation. It may not import filesystem, network, clock, process, random, database, framework, or rendering APIs. The repository-level architecture check fails on forbidden imports, undeclared workspace edges, and circular dependencies.

## Project authority

The source-of-truth hierarchy is defined in [`docs/authority/PROJECT_AUTHORITY.md`](docs/authority/PROJECT_AUTHORITY.md). Engineering agents must also follow [`AGENTS.md`](AGENTS.md).

## Licensing

No open-source license has been selected. Publication of this repository does not grant reuse rights.
