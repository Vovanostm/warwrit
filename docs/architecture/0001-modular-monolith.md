# ADR-0001: Begin as a typed modular monolith

- Status: Accepted
- Date: 2026-09-01
- Requirements: `ENG-FND`, `ARCH-BOUNDARY`

## Context

Warwrit needs a deterministic game kernel, a browser client, server authority, persistence, and eventually realtime encounter/world processes. The first milestone is a headless combat proof, not distributed-service scale.

Premature service boundaries would add deployment, schema, observability, failure-recovery, and consistency costs before the domain model is stable.

## Decision

Use one pnpm monorepo and initially deploy a modular-monolith server.

```text
apps/web            browser composition
apps/server         process and infrastructure composition
packages/game-core  pure deterministic domain
packages/protocol   versioned transport contracts
packages/testkit    test-only support
```

Dependencies point inward. The pure kernel owns no I/O. Infrastructure is composed at the application edge. `worldId` and protocol versioning are present from the beginning so future partitioning does not require identity migration.

## Consequences

Positive:

- deterministic code can be tested without database, network, or rendering;
- refactoring across young boundaries remains inexpensive;
- one lockfile and CI pipeline reproduce the entire product;
- future services can be extracted around measured consistency and load boundaries.

Negative:

- module boundaries require active enforcement because process isolation does not provide it;
- one deployable can become coupled if package rules are bypassed;
- independent scaling is deferred.

## Enforcement

`pnpm check:architecture` rejects forbidden workspace edges, deep imports, source cycles, and any external or Node.js import in `game-core`.

A future distributed architecture requires a superseding ADR with measured bottlenecks, data ownership, failure semantics, rollout, rollback, and operational cost.
