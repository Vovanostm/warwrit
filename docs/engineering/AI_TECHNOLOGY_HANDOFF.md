# Warwrit technology baseline — AI handoff

```yaml
status: authoritative-implementation-guidance
as_of: 2026-09-03
scope: M0-M1
authority: ADR-0003
repository: Vovanostm/warwrit
production_runtime: node-24
package_manager: pnpm-11
language: typescript-strict
http_control_plane: fastify-5
realtime: colyseus-0.18-planned
persistence: postgresql
sql_layer: kysely-pg
web_shell: react-19-vite-7
renderer: provisional-babylon-9-vs-playcanvas-spike-required
experimental_runtime: bun-1.4
```

## Read this first

Before changing infrastructure or adding a framework dependency:

1. read [`../architecture/0003-m0-m1-technology-baseline.md`](../architecture/0003-m0-m1-technology-baseline.md);
2. read the root [`../../AGENTS.md`](../../AGENTS.md);
3. inspect the exact dependency versions in the current `package.json` and lockfile;
4. read the active work-package contract;
5. do not infer a version-sensitive API from memory.

## Current decisions

- **Runtime — ACCEPTED:** Node.js 24 LTS. Use the repository-pinned Node line.
- **Package manager — ACCEPTED:** pnpm. Use the frozen `pnpm-lock.yaml`; do not replace it with Bun/npm/yarn.
- **Language — ACCEPTED:** strict TypeScript. Shared domain/protocol types stay TypeScript.
- **HTTP/control plane — ACCEPTED:** Fastify 5 + Pino. Keep existing health/control APIs; do not migrate for aesthetics.
- **Realtime — ACCEPTED FOR M1 ADAPTER:** Colyseus 0.18.x. Introduce only in the realtime work package; keep Rooms non-canonical.
- **Persistence — ACCEPTED:** PostgreSQL. It is canonical durable state.
- **SQL layer — ACCEPTED:** Kysely + `pg`. Prefer explicit SQL-shaped queries and transactions.
- **Browser shell — ACCEPTED:** React 19 + Vite 7. React owns UI composition, not canonical simulation.
- **Renderer — PROVISIONAL:** Babylon.js 9.x versus current PlayCanvas. Run the required comparative spike before production renderer lock.
- **Alternate runtime — EXPERIMENTAL:** Bun 1.4. Benchmark/compatibility lane only; no Bun-only production APIs.
- **High-throughput WebSocket — DEFERRED:** uWebSockets.js. Add only after the default transport fails measured budgets.
- **Redis/distributed topology — DEFERRED:** none for M0/M1. Add only after a multi-process or multi-machine requirement exists.
- **Go/Rust/Nakama rewrite — REJECTED FOR M0/M1:** do not reopen without a measured blocker.

## Architecture invariant

The dependency direction is always inward:

```text
React / renderer ─────┐
Fastify ──────────────┤
Colyseus ─────────────┤
PostgreSQL/Kysely ────┼──> application adapters ───> pure domain
Node process APIs ────┤
                      └──> protocol contracts where appropriate
```

Forbidden direction:

```text
pure domain ─X─> Fastify / Colyseus / Babylon / PlayCanvas / pg / Node / Bun
```

Do not move network room state, database models, scene objects, clocks, environment access, or framework classes into `packages/game-core`.

## Colyseus implementation rules

When Colyseus is first introduced:

- use the current `0.18.x` API only;
- install/use the official `colyseus/skill` for coding agents;
- inspect the installed version before writing `Room`, `Schema`, reconnect, or transport code;
- treat `sessionId`/reconnection as transport/session identity, not company/character identity;
- persist canonical encounter state through Warwrit application/persistence code, not Colyseus Room memory;
- start with the default Node WebSocket transport;
- prefer reuse of the existing Node HTTP server if lifecycle tests prove clean composition;
- test duplicate command, stale revision, manual-vs-AI deadline race, reconnect, restart, and immutable terminal state.

Do not adopt `@colyseus/database` for canonical Warwrit persistence without a superseding ADR.

## Bun rules

Allowed:

- run pure-domain tests under Bun in a dedicated experiment;
- run cross-runtime deterministic replay/digest checks;
- benchmark representative combat/world workloads;
- document compatibility findings.

Forbidden without a superseding ADR:

- `bun:*` imports in production code;
- `Bun.serve`, Bun WebSocket APIs, Bun SQL APIs, or Bun-only process primitives in canonical server paths;
- changing the workspace package manager from pnpm to Bun;
- changing CI/production runtime from Node because of synthetic hello-world benchmarks.

Runtime migration evidence must cover correctness, soak/reliability, observability, PostgreSQL/Kysely, Colyseus reconnect, and a material expected-load advantage.

## Renderer spike contract

Do not add Babylon.js or PlayCanvas as a permanent production dependency before the renderer spike closes.

Build the same representative Warwrit scenario in both candidates:

```text
- tactical camera and hex/grid overlay
- selectable/hoverable units
- representative animated humanoids
- props/terrain and fog
- day/night lighting transition
- particles/VFX
- UI-to-scene interaction
- asset import/update workflow
- at least one AI-agent-driven scene/code change followed by visual verification
```

Measure:

```text
performance: p50/p95 CPU frame, GPU frame, memory
startup: JS/bundle/start time
content: animation + asset pipeline effort
features: picking, overlays, fog, lighting, particles
agentability: inspect/edit/verify via official tools
reviewability: Git diff + reproducible project state
operations: debugging/profiling workflow
```

Record the result as an ADR update or superseding renderer ADR. Do not choose by generic benchmark or preference alone.

## LLM/version-safety protocol

For any fast-moving framework:

```text
inspect installed version
  -> inspect local typings/source
  -> read official skill/llms.txt/docs
  -> implement smallest adapter change
  -> typecheck
  -> focused tests
  -> integration/replay/load evidence as applicable
```

Known high-risk areas for stale model knowledge:

- Colyseus pre-0.18 examples;
- renderer major-version examples;
- Bun Node-compatibility assumptions;
- lifecycle/shutdown/reconnect APIs.

## Do not technology-shop during feature work

An agent working on a gameplay work package must not replace the runtime, HTTP framework, database layer, realtime framework, renderer, package manager, or test stack as incidental cleanup.

If the active technology blocks the work:

1. capture the concrete failure and reproduction;
2. quantify impact;
3. compare the smallest workaround against migration cost;
4. open/update the relevant architecture question;
5. propose a superseding ADR.

Until that process completes, implement within the accepted baseline.
