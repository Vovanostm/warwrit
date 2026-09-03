# ADR-0003: Freeze the M0/M1 technology baseline and keep measured escape hatches

- Status: Accepted
- Date: 2026-09-03
- Requirements: `Q-T02`, `ENG-FND`, `ARCH-BOUNDARY`, `ENCOUNTER-AUTH`, `RECONNECT`
- Supersedes: informal technology recommendations that are not encoded in an accepted ADR

## Context

Warwrit now has an implemented engineering foundation and deterministic combat kernel. The repository is not a blank-slate architecture exercise anymore:

- root tooling is pinned to Node.js `24.20.x` and pnpm `11.25.x`;
- `apps/server` already uses Fastify 5, Kysely, `pg`, and Pino;
- `apps/web` already uses React 19 and Vite 7;
- the pure `@warwrit/game-core` boundary is enforced and the M0 combat stress/replay gate exists;
- no realtime framework or 3D renderer has been committed yet.

A September 2026 review compared Node.js, Bun, Go/Rust alternatives, Colyseus versus custom realtime transports, Babylon.js versus PlayCanvas, PostgreSQL access layers, API transparency, and coding-agent/LLM support.

The review found two earlier recommendations were too aggressive:

1. removing Fastify would replace already-working infrastructure before any measured benefit exists;
2. declaring Babylon.js the final renderer before a representative renderer/art-pipeline spike would convert an assumption into an architecture decision.

Relevant external evidence as of this decision:

- Node.js 24 is Active LTS and remains supported through April 2028: <https://github.com/nodejs/Release#release-schedule>.
- Bun 1.4 rewrote its core in Rust and materially improved Node compatibility, but Bun's own compatibility matrix still identifies incomplete areas such as `perf_hooks`, `cluster`, and parts of `http2`: <https://bun.sh/docs/runtime/nodejs-compat>.
- Colyseus 0.18 provides server-owned turn-based scaffolding, automatic reconnection, current coding-agent guidance, and a WebSocket transport that can reuse an existing Node HTTP server: <https://docs.colyseus.io/getting-started>, <https://docs.colyseus.io/room/reconnection>, <https://docs.colyseus.io/server/transport/ws>.
- Babylon.js 9 has strong game/rendering depth and official MCP tooling: <https://github.com/BabylonJS/Documentation/blob/master/content/toolsAndResources/mcpServers.md>.
- PlayCanvas has first-class coding-agent Skills and an Editor MCP server able to edit and verify a live project: <https://developer.playcanvas.com/user-manual/getting-started/use-playcanvas-skills/>, <https://developer.playcanvas.com/user-manual/editor/mcp-server/>.

## Decision

### 1. Production runtime: Node.js 24 LTS

Use the repository-pinned Node.js 24 line for M0 and M1 production and CI.

Bun 1.4 is an explicit **benchmark and compatibility lane**, not a production dependency. Domain packages must remain portable enough to execute under Bun for comparative verification, but production code must not require `bun:*`, Bun globals, Bun's package manager, or Bun-only networking APIs.

A Node -> Bun switch requires a superseding ADR with reproducible evidence. Marketing benchmarks, startup speed, package-install speed, or the Rust rewrite alone are insufficient reasons.

### 2. HTTP/control plane: retain Fastify 5

Keep Fastify as the HTTP/control-plane adapter because it is already implemented, tested, and provides mature lifecycle, logging, health, schema/plugin, and test-injection behavior.

Do **not** migrate existing HTTP endpoints to Colyseus routes merely to reduce the number of frameworks.

Fastify remains an adapter in `apps/server`; domain packages must not import it.

### 3. Realtime: adopt Colyseus 0.18 as a bounded adapter

Use Colyseus 0.18.x when realtime encounter/world work begins. Its responsibilities are limited to:

- WebSocket transport and heartbeat;
- room/session lifecycle;
- reconnection and seat/session recovery;
- client-visible state projection;
- message transport and realtime deadlines/orchestration helpers.

Colyseus Rooms are **not** canonical domain aggregates and are **not** the durable source of truth. Canonical encounter/world/company state remains owned by Warwrit application/domain code and PostgreSQL persistence.

Initial integration should prefer one process and one public origin. Colyseus `WebSocketTransport` supports reuse of an existing Node HTTP server; the integration work package must prove that this composes cleanly with the Fastify lifecycle. If shared-server composition creates lifecycle or correctness problems, use a separate internal realtime port behind the same reverse-proxy origin rather than coupling domain logic to either framework.

Do not introduce `uWebSockets.js`, Redis Presence, or multi-process matchmaking until load/topology evidence requires them.

### 4. Persistence: PostgreSQL + Kysely + pg

Keep PostgreSQL as canonical persistence and Kysely + `pg` as the primary application SQL layer.

Do not adopt `@colyseus/database`, Drizzle, an ORM, Redis, an event store, or a second canonical database merely because a framework offers it. Any such change requires a domain/persistence requirement and a superseding ADR.

### 5. Browser shell: React 19 + Vite 7

Keep the existing React/Vite browser shell. Game rendering must remain an adapter beside React rather than making React own simulation state.

### 6. Renderer: provisional, not yet frozen

Do not install a production renderer solely from the prior recommendation.

The current working default remains **Babylon.js 9.x**, because its animation/rendering breadth fits the tactical-diorama requirements and its MCP/editor ecosystem is now strong.

However, **PlayCanvas must be tested as the only mandatory renderer alternative before the renderer is frozen**, because its current Engine/React tooling, agent Skills, Editor MCP workflow, and web-native authoring may materially reduce implementation and verification cost for an AI-heavy project.

The renderer decision closes only after one representative Warwrit spike runs the same scene/workflow in both candidates. Until then, the renderer choice is `PROVISIONAL` even though the rest of this ADR is accepted.

### 7. Agent/LLM contract

Coding agents must not generate framework APIs from model memory when version-sensitive behavior is involved.

Before changing framework-bound code, an agent must:

1. inspect the installed version in `package.json` / lockfile;
2. read local types and repository guidance;
3. use current official Skills, `llms.txt`, or official documentation where available;
4. implement behind an adapter boundary;
5. run typecheck/tests and include evidence.

When Colyseus is introduced, install the official `colyseus/skill` into the repository agent context. Renderer-specific Skills/MCP configuration is added only after the renderer decision closes.

## Revisit gates

### Node -> Bun

A runtime-change ADR may be proposed only if Bun passes all of the following on the same Warwrit revision:

- `pnpm verify`, migration smoke, and the deterministic combat stress/replay gates;
- identical canonical replay/state digests for the agreed cross-runtime corpus;
- PostgreSQL/Kysely, logging, tracing/profiling, graceful shutdown, and Colyseus reconnect tests;
- a long-running soak sufficient to detect leak/event-loop regressions;
- no required Node-compatibility workaround in canonical application code;
- a material measured advantage at expected Warwrit load (for example >=20% server CPU reduction, >=25% RSS reduction, or an equivalent demonstrated operating-cost/reliability improvement).

The numeric thresholds are decision triggers, not claims about current Bun performance.

### Default WebSocket -> uWebSockets.js / alternate transport

Change only after expected-load tests show the default Colyseus `ws` transport violates an agreed connection, CPU, memory, or latency budget. Raw transport throughput alone is not a reason.

### Babylon.js vs PlayCanvas

Use the same representative scene, assets, interactions, target browser/hardware profile, and acceptance script. Score at minimum:

- p50/p95 CPU and GPU frame time;
- memory and startup/bundle cost;
- animated-character and asset-pipeline effort;
- tactical overlays, picking, fog, lighting, particles, and day/night implementation;
- AI-agent ability to inspect, edit, and visually verify the scene;
- API clarity/testability and Git/review workflow;
- failure/debugging workflow.

A renderer becomes `ACCEPTED` only when it passes the hard performance/quality budgets and has a documented implementation-cost advantage. If results are effectively tied, prefer the lower-lock-in, easier-to-review workflow rather than adding bespoke engine abstractions.

## Consequences

Positive:

- preserves the already-green WP-00 foundation instead of churning it;
- keeps production on a mature LTS runtime while making Bun migration cheap and evidence-driven;
- uses Colyseus for the difficult multiplayer lifecycle without allowing it to become the domain model;
- avoids a premature renderer lock before representative evidence exists;
- creates explicit rules that reduce LLM version hallucinations;
- preserves future Node -> Bun, Babylon -> PlayCanvas, and `ws` -> uWebSockets changes as bounded adapter decisions.

Negative:

- M1 temporarily carries Fastify plus Colyseus instead of one server framework;
- Bun's runtime/package-manager simplicity is not used immediately;
- renderer work requires a small comparative spike before production scene implementation;
- agent setup must maintain version-specific Skills/documentation.

## Enforcement

- `packages/game-core` and other pure domain packages must not import Node, Bun, Fastify, Colyseus, Babylon.js, PlayCanvas, PostgreSQL drivers, or browser APIs.
- Framework/runtime dependencies live at application or adapter edges.
- `AGENTS.md` carries the short-form agent rules from this ADR.
- Any production runtime, canonical persistence, realtime ownership, or renderer change requires an ADR update/superseding ADR with measured evidence.
