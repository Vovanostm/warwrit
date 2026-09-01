# ADR-0002: Keep the M0 combat kernel dependency-free and replayable

- Status: Accepted
- Date: 2026-09-02
- Requirements: `M0-COMBAT`, `Q-C01` … `Q-C10`

## Context

Warwrit's first gameplay milestone must prove deterministic headless combat before rendering, persistence, networking, or multiplayer orchestration. The kernel must support 4–12 fighters, individual initiative, movement, attacks, defense, retreat, wounds, death, AI, and exact replay.

The implementation needs established solutions for hex geometry and generative verification, but `AGENTS.md` requires `game-core` to retain zero runtime dependencies and no platform I/O. Adding a grid framework, ECS, state-machine framework, or realtime library would increase coupling without solving an M0 requirement.

The combat model is inspired by proven tactical-RPG concepts such as action points, initiative modified by fatigue and wounds, degrading armor, and morale. It deliberately does not reproduce the full complexity of a mature game.

## Decision

### Runtime kernel

Keep `@warwrit/game-core` dependency-free and model combat as pure immutable transitions:

```text
BattleSetup + CombatCommand
  → applyCombatCommand
  → BattleState + CombatEvent[]
```

Use:

- axial hex coordinates and the standard cube-distance formula;
- deterministic breadth-first shortest paths with fixed neighbor ordering;
- an explicit serializable `xorshift32-v1` RNG state with rejection sampling for bounded integers;
- individual round initiative with stable unit-ID tie-breaking;
- one versioned provisional ruleset, `m0-prototype-v1`;
- JSON-serializable setup, commands, events, state, and replay;
- deterministic AI commands built through the same public command reducer as player intents.

### Reused tooling

Use `fast-check` as a development-only dependency for shrinking property-based failures. Retain Vitest, TypeScript, ESLint, the architecture checker, and the existing clean-bootstrap pipeline.

Do not add a runtime hex-grid or RNG package. The selected algorithms are small, stable, independently testable, and keeping them local preserves the enforced zero-dependency core. A later work package may supersede this choice only if a measured need outweighs replay/versioning cost.

### Balance status

All numbers in `COMBAT_RULES_V1` are `provisional`. A successful M0 correctness gate proves termination and determinism, not player-facing balance or enjoyment.

## Consequences

Positive:

- every state transition can run in a test, server process, replay verifier, or future worker without adapters;
- AI cannot bypass player command validation or combat invariants;
- replays identify both RNG algorithm and ruleset version;
- failures found by fast-check shrink to small reproducible seeds;
- the kernel remains portable and easy to profile.

Negative:

- the local hex and RNG implementations require focused tests and explicit version discipline;
- breadth-first pathfinding is intentionally unweighted and suitable only for the small uniform-cost M0 maps;
- `processedCommandIds` and full command replay are bounded M0 structures, not a persistence/receipt design;
- no backward replay migration exists yet because only one unreleased ruleset exists.

## Deferred decisions

The following remain outside WP-01:

- terrain weights, elevation, cover, line of sight, reactions, and zones of control;
- surrender, captivity, and campaign consequences;
- three-side and multiplayer turn ownership;
- realtime deadlines, reconnect, idempotent network receipts, and database snapshots;
- player-facing balance, animation timing, and UI previews.

Each requires a later feature contract and, where replay semantics change, a new versioned ruleset or replay schema.

## Enforcement

- `pnpm check:architecture` rejects runtime dependencies and forbidden platform imports in `game-core`.
- Vitest covers commands, retreat, terminal immutability, hexes, RNG, replay, and AI behavior.
- fast-check covers hex invariants and generated battle determinism.
- `pnpm test:combat:stress` executes the 10,000-battle M0 gate.
