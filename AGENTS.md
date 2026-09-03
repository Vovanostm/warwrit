# AGENTS.md — Warwrit engineering contract

These instructions apply to every human or automated contributor unless a deeper directory contains a stricter `AGENTS.md`.

## 1. Authority order

When sources conflict, use this order:

1. explicit, latest owner decision;
2. canonical Warwrit decision records and Master GDD;
3. accepted ADRs;
4. the active work-package contract;
5. executable tests and schemas;
6. implementation details;
7. chat suggestions and historical drafts.

Do not silently convert a proposal into an approved product decision. Record unresolved design choices as blockers or provisional parameters.

## 2. Current delivery state

M0 is complete as a headless technical proof. WP-00 and WP-01 are merged and green. Passing M0 proves correctness, determinism, termination and replay; it does **not** prove player-facing combat feel, human battle duration or the final multiplayer turn timer.

Current product/design focus is `S-02 — Company & Characters`. `WP-02` remains `Design Blocked` until the six active P0 questions `Q-CHAR-13A/B/C` and `Q-CHAR-14A/B/C` close. Do not implement policy for those questions from model assumptions.

Accepted WP-02 boundaries are recorded in `docs/architecture/0004-company-identity-succession-boundary.md`, including persistent company identity, pre-existing family/household characters, succession/regency and deterministic hard game-over with no emergency successor generation.

After S-02 closes, the default single-threaded delivery sequence is WP-02 → WP-03 → Q-T03 renderer spike → WP-04. Read `docs/engineering/CURRENT_PLAN.md` for the current operational mirror before starting a new work package.

`COMBAT_RULES_V1` remains the source of truth for provisional M0 combat numbers. Prototype values remain provisional; do not relabel simulation correctness as final balance.

## 3. Dependency boundaries

- `packages/game-core` is pure and deterministic. It has no runtime dependencies and no Node.js or browser I/O imports.
- `packages/protocol` contains versioned contracts, not domain behavior.
- `packages/testkit` is test-only. It must never be imported by production source files.
- `apps/server` owns infrastructure adapters and server process composition.
- `apps/web` may depend on protocol contracts, not server internals.
- Cross-package imports use `@warwrit/*`; never reach into another package's private path.
- Circular file or workspace dependencies are forbidden.

## 4. Determinism rules

- Randomness enters through explicit versioned state or a seeded port.
- Time enters through an explicit clock or command value.
- Commands, events, rulesets, replays, and canonical state are serializable.
- Domain functions do not read environment variables, global process state, storage, or network resources.
- Invalid commands fail closed and must not partially mutate canonical state.
- A change to RNG semantics, canonical serialization, command semantics, or combat rules requires versioning and replay compatibility analysis.

## 5. Persistence and migrations

- Every schema change requires ordered `*.up.sql` and `*.down.sql` files.
- A migration must be transaction-safe or explicitly document why it cannot be.
- Never edit an already released migration; add a new one.
- `pnpm test:migrations` must pass before merge.

## 6. Logging and health

- Server logs are structured JSON.
- Never log credentials, session tokens, raw authorization headers, or personal data.
- `/health/live` proves process liveness only.
- `/health/ready` proves required dependencies are usable and returns `503` when they are not.

## 7. Required validation

Before opening or updating a pull request, run:

```bash
pnpm verify
pnpm test:combat:stress
pnpm test:migrations
```

A change is not complete while CI is red, the lockfile is stale, formatting differs, architecture/content checks fail, or the combat stress gate does not reach a terminal state for all generated battles.

## 8. Change discipline

- Keep commits coherent and reviewable.
- Update authority documentation when changing architecture or process.
- Add or update tests for every behavior change.
- Prefer small modular-monolith boundaries over premature services.
- Do not add Kubernetes, distributed messaging, event sourcing infrastructure, or independent deployables without an accepted ADR and measured need.
- Do not weaken a check to make a failure disappear; fix the underlying violation or document an explicit exception.
- Do not mark a package Ready only because code dependencies are complete; linked blocking product decisions must also be closed or explicitly provisionalized.
- Do not infer current project priority from issue numbers or old closed issue bodies; use `docs/engineering/CURRENT_PLAN.md` plus the canonical Airtable planning ledger.

## 9. Technology baseline and AI API safety

ADR-0003 is authoritative for M0/M1 technology choices. Read `docs/engineering/AI_TECHNOLOGY_HANDOFF.md` before adding or replacing infrastructure/framework dependencies.

- Production/CI runtime remains the repository-pinned Node.js 24 line. Bun 1.4 is an experimental compatibility/benchmark lane only until a superseding ADR is accepted.
- pnpm remains the package manager. Do not introduce a second production lockfile or migrate package management incidentally.
- Keep the existing Fastify HTTP/control plane. Do not replace working Fastify endpoints with Colyseus/Hono/Elysia routes as cleanup.
- When realtime is introduced, use Colyseus 0.18.x as an adapter for transport, room/session lifecycle, reconnect, and client projections. Colyseus Room memory is not canonical domain state.
- Keep PostgreSQL + Kysely + `pg` as canonical persistence/application SQL. Do not adopt a framework database/ORM as a second source of truth.
- The renderer is not frozen yet. Babylon.js 9.x is the working default, but the required Babylon-vs-PlayCanvas representative spike must close before a permanent production renderer dependency is accepted.
- Do not add `uWebSockets.js`, Redis presence, Go/Rust services, Nakama, or distributed topology without the measured trigger and ADR required by ADR-0003.

For fast-moving framework APIs, never rely on model memory alone. Before coding:

1. inspect the exact installed package version and lockfile;
2. inspect local typings/source and current repository guidance;
3. use current official Skills, `llms.txt`, or official documentation where available;
4. implement behind the existing adapter boundary;
5. typecheck and run focused/integration evidence.

When Colyseus is added, install/use the official `colyseus/skill`; older model examples frequently target pre-0.18 APIs. Renderer-specific Skills/MCP setup is added only after the renderer decision closes.

## 10. Pull-request evidence

A PR description must state:

- work-package or requirement IDs;
- material architecture decisions;
- verification commands and outcomes;
- migration impact;
- known limitations and deferred scope.
