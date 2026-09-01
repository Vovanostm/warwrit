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

## 2. Current combat scope

WP-01 is the headless M0 combat proof. It may implement only deterministic combat behavior required by its work-package contract.

- `COMBAT_RULES_V1` is the single source of truth for provisional M0 numbers.
- Prototype parameters remain `provisional`; passing simulations does not make them final balance.
- Do not introduce world movement, campaign consequences, economy, persistence, realtime rooms, authentication, rendering, or UI into `game-core`.
- Height, cover, reactions, zones of control, surrender, captivity, multiplayer, and three-side combat require a later work package or an approved scope change.

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

## 9. Pull-request evidence

A PR description must state:

- work-package or requirement IDs;
- material architecture decisions;
- verification commands and outcomes;
- migration impact;
- known limitations and deferred scope.
