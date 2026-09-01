# Warwrit

Warwrit is a browser-first persistent tactical game project. The repository has completed **WP-01 — Deterministic Combat Kernel**: a headless M0 combat proof now exists, while rendering, persistence, networking, world simulation, and final balance remain outside this work package.

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

The bootstrap installs the pinned package manager and dependencies, starts PostgreSQL, runs the repository verification suite, executes 10,000 generated combat simulations, exercises migration up/down, and then stops local infrastructure.

## Daily commands

| Command                   | Purpose                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                | Run the web and server development processes                         |
| `pnpm verify`             | Format, lint, architecture, content, type, build, and unit checks    |
| `pnpm test:combat:stress` | Run the 10,000-battle deterministic M0 stress gate                   |
| `pnpm test:migrations`    | Apply and roll back the current migration set against `DATABASE_URL` |
| `pnpm db:up`              | Start local PostgreSQL                                               |
| `pnpm db:down`            | Stop local PostgreSQL                                                |
| `pnpm clean`              | Remove generated build and coverage output                           |

Copy `.env.example` to `.env` for local overrides. The default Docker database URL is already documented there.

## Repository layout

```text
apps/
  server/       Server-authoritative HTTP process and persistence adapters
  web/          Browser shell; no combat renderer exists yet
packages/
  game-core/    Pure deterministic combat/domain kernel; no I/O imports
  protocol/     Versioned transport contracts and shared API types
  testkit/      Test-only generators and helpers
assets/         Versioned asset manifest and future source assets
content/        Future validated authored content
scripts/        Repository verification, combat stress, and migration tools
docs/           Authority, architecture, engineering, and work-package records
```

## Combat kernel

`packages/game-core` now owns axial hex coordinates, deterministic pathfinding, versioned prototype rules, explicit RNG state, immutable command reduction, individual initiative, movement, melee/ranged prototype attacks, defense, waiting, physical retreat, wounds, death, morale, stamina, AI doctrines, canonical state serialization, and command-stream replay.

All numeric combat values are **provisional M0 parameters**, not approved final balance. Their single source of truth is `COMBAT_RULES_V1` (`m0-prototype-v1`).

The kernel still may not import filesystem, network, clock, process, ambient randomness, database, framework, or rendering APIs. The repository-level architecture check fails on forbidden imports, undeclared workspace edges, and circular dependencies.

## Project authority

The source-of-truth hierarchy is defined in [`docs/authority/PROJECT_AUTHORITY.md`](docs/authority/PROJECT_AUTHORITY.md). Engineering agents must also follow [`AGENTS.md`](AGENTS.md).

## Licensing

No open-source license has been selected. Publication of this repository does not grant reuse rights.
