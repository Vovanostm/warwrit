# Warwrit

Warwrit is a browser-first persistent tactical game. **M1 is in progress.**
The ordinary local game supports OIDC sign-in, a persistent company, equipment,
supplies, painted-atlas travel, contracts, server-authoritative tactical combat,
physical proof, rewards, care, rest and payroll. Implementation and earlier
bounded journeys do not establish complete M1 acceptance.

## Current development

- [Current delivery plan](docs/engineering/CURRENT_PLAN.md) — live integration status and ownership.
- [WLC-08 acceptance](docs/engineering/WLC_08_ACCEPTANCE.md) — exact candidate, fresh results and remaining M1 criteria.
- [Development roadmap](docs/engineering/ROADMAP.md) — full M1 scope and next playable steps.
- [Documentation map](docs/README.md) — authority, architecture and owning contracts.

Babylon.js is the supported renderer under [ADR-0006](docs/architecture/0006-m1-renderer-babylon.md).
The protected development-only [Playground](docs/engineering/DEVELOPER_PLAYGROUND.md)
contains the authoritative [Combat Lab](docs/engineering/COMBAT_LAB_CONSOLIDATION.md)
and [World/Battle Map Editor](docs/engineering/UNIFIED_MAP_EDITOR.md).
Their results apply to isolated developer scenarios; use the ordinary game for
campaign acceptance. See WLC-08 for whether these changes are merged or candidates.

For a new local game use the [isolated OIDC setup](docs/engineering/LOCAL_DEVELOPMENT.md#isolated-ordinary-game-worktree--176),
then `pnpm db:up`, `pnpm db:migrate:up` and `pnpm dev`. Use a dedicated named
Compose project and retain its volumes for restart/re-entry. The full diagnostic
bootstrap below is optional; it is not the ordinary player launch command.

## Bootstrap

Prerequisites:

- Node.js `24.20.x`;
- Corepack;
- Docker Engine with the Compose v2 plugin; on macOS use [colima](docs/engineering/LOCAL_DEVELOPMENT.md#container-runtime-colima);
- Git.

From a clean checkout, run one command:

```bash
./scripts/bootstrap.sh
```

The bootstrap installs the pinned package manager and dependencies, starts PostgreSQL, runs the repository verification suite, executes 10,000 generated combat simulations, exercises migration up/down, and then stops local infrastructure.

## Daily commands

| Command                   | Purpose                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                | Run the web and server development processes                                                                  |
| `pnpm verify`             | Format, lint, architecture, dead code, patterns, content, type, build, and unit checks                        |
| `pnpm check:changes`      | Fail on dead code, complexity or duplication introduced by this branch                                        |
| `pnpm report:quality`     | Report complexity hotspots and duplicated code (non-blocking)                                                 |
| `pnpm test:combat:stress` | Run the 10,000-battle deterministic M0 stress gate                                                            |
| `pnpm test:migrations`    | Apply and roll back migrations, then run encounter and OIDC PostgreSQL specs, against an empty `DATABASE_URL` |
| `pnpm db:up`              | Start local PostgreSQL                                                                                        |
| `pnpm db:down`            | Stop local PostgreSQL                                                                                         |
| `pnpm clean`              | Remove generated build and coverage output                                                                    |

Copy `.env.example` to `.env` for local overrides. The default Docker database URL is already documented there.

## Repository layout

```text
apps/
  server/       Server-authoritative HTTP process and persistence adapters
  web/          React player UI, Babylon.js scenes and development-only Playground
packages/
  game-core/    Pure deterministic combat/domain kernel; no I/O imports
  protocol/     Versioned transport contracts and shared API types
  testkit/      Test-only generators and helpers
assets/         Active asset manifest, original art and retained source assets
content/        Reserved authoring area; current definitions live in game-core
scripts/        Repository verification, combat stress, and migration tools
docs/           Authority, architecture, engineering, and work-package records
```

## Combat kernel

`packages/game-core` now owns axial hex coordinates, deterministic pathfinding, versioned prototype rules, explicit RNG state, immutable command reduction, individual initiative, movement, melee/ranged prototype attacks, defense, waiting, physical retreat, wounds, death, morale, stamina, AI doctrines, canonical state serialization, and command-stream replay.

Current campaign and Combat Lab encounters use `m1-domain-bridge-v5`. Historical
`m0-prototype-v1` and sprite rules remain for versioned replay and fixtures; they
are not the current campaign balance contract. Provisional parameters retain their
source status. [Combat mechanics](docs/wiki/combat.md) documents the rules.

The kernel still may not import filesystem, network, clock, process, ambient randomness, database, framework, or rendering APIs. The repository-level architecture check fails on forbidden imports, undeclared workspace edges, and circular dependencies.

## Project authority

The source-of-truth hierarchy is defined in [`docs/authority/PROJECT_AUTHORITY.md`](docs/authority/PROJECT_AUTHORITY.md). Engineering agents must also follow [`AGENTS.md`](AGENTS.md), the live [delivery plan](docs/engineering/CURRENT_PLAN.md), and the [development roadmap](docs/engineering/ROADMAP.md).

## Licensing

No open-source license has been selected. Publication of this repository does not grant reuse rights.
