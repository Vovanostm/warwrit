# Warwrit current delivery plan

- Status: operational mirror for coding agents
- As of: 2026-09-03
- Product/planning authority: Warwrit Airtable decision/work-package ledger
- Architecture authority: accepted ADRs in `docs/architecture/`

This file exists to prevent an agent from inferring current project state from old issues or historical planning documents. If this file conflicts with a newer explicit owner decision or the canonical Airtable decision ledger, update this mirror in the same change.

## Current state

```yaml
milestone:
  M0: done
  M1: planned
  M2: planned
current_design_session: S-02-company-and-characters
current_implementation_package: none
next_implementation_package: WP-02-after-S-02-closes
renderer_decision: Q-T03-ready-before-WP-04
production_runtime: node-24
http_control_plane: fastify-5-pino
realtime_target: colyseus-0.18-bounded-adapter
persistence: postgresql-kysely-pg
experimental_runtime: bun-1.4-benchmark-only
```

## Why M0 is Done

M0 is the **headless technical combat proof**. WP-01 is complete and merged with green clean-checkout evidence.

M0 proves:

- deterministic commands/state/RNG;
- termination under 10,000 generated battles;
- fail-closed invalid commands;
- no double activation;
- deterministic AI using the public command path;
- exact replay/final-state digest;
- dependency-free/platform-neutral `game-core`.

M0 does **not** claim that combat is fun, readable, correctly paced for humans, or that the 30-second multiplayer timer is final. ADR-0002 explicitly treats those as later player-facing evidence.

The old milestone wording that made human playtest a headless-M0 completion requirement has been corrected. Battle duration, decision density, turn-flow readability and timer validation are M1 evidence gates.

## Current blocking design work — S-02

WP-02 remains `Design Blocked` until the current Company & Characters packet closes.

Already accepted and safe to rely on:

- persistent `Company` identity with a replaceable `CurrentLeader`;
- company name/banner are mutable without changing technical company identity;
- origin-based opening flow and six provisional M1 origins;
- origin-compatible family story creates 0–2 persistent relatives at run start;
- designated heir is optional;
- existing eligible characters form the successor pool;
- acting leader / limited regency for a minor heir;
- deterministic hard game-over from the persistent company graph;
- **no** retroactive emergency successor at defeat;
- category/custody-based inheritance rather than one random loss percentage.

Still blocking WP-02 implementation:

- `Q-CHAR-13A` — immutable/mutable character-state taxonomy;
- `Q-CHAR-13B` — roster/location/assignment state machine;
- `Q-CHAR-13C` — battle outcome versus player knowledge of outcome;
- `Q-CHAR-14A` — earned nickname policy;
- `Q-CHAR-14B` — derived combat role + slow retraining;
- `Q-CHAR-14C` — permanent injury/scar + rare-treatment policy.

Do not invent defaults for these six questions in implementation code.

## Delivery sequence

Default single-threaded sequence for one developer + coding agents:

```text
DONE  WP-00 Repository & Engineering Foundation
DONE  WP-01 Deterministic Combat Kernel
  ->  close S-02 / Q-CHAR-13A..14C
  ->  WP-02 Character, Company & Inventory Domain
  ->  WP-03 Encounter Authority, Persistence & Timers
  ->  Q-T03 renderer comparison
  ->  WP-04 Tactical Battle Client & V3 art-pipeline spike
  ->  WP-05 World Authority & Movement
  ->  WP-06 Fog, Maps, Rumors & Light Clock
  ->  WP-07 Core Contracts & Narrative Engine
  ->  WP-08 Physical Joinable PvE Battle
```

WP-09..WP-15 remain later M1/M2/alpha work according to their Airtable dependencies. Do not pull them forward merely because they are technically interesting.

## M1 evidence gates that were intentionally moved out of M0

### Combat feel / duration

`Q-C01` is resolved only by interactive playtest after the tactical client exists. Measure small/normal battle duration and decision density; do not treat generated AI simulation duration as human playtest evidence.

### 30-second activation timer

`Q-C10` requires WP-03 deadline semantics plus an interactive client. Measure think time, timeout/AFK rate and battle duration, then revalidate at WP-11 reinforcement scale.

### Combat-interest risk

`R-01` remains a real M1 product risk even though M0 technical correctness passed. Before M1 release/content scale, two measured interactive iterations must justify keeping the combat loop or trigger a simplify/pivot decision.

## Renderer gate

No permanent renderer dependency is accepted yet.

`Q-T03` / GitHub issue #6 compares Babylon.js 9.x and current PlayCanvas using the same Warwrit scene, assets, hardware/browser profile and agent workflow.

WP-04 may use spike-only isolated dependencies to collect evidence, but the production renderer lock requires a recorded ADR result.

## Architecture baseline

Read, in order:

1. `AGENTS.md`;
2. `docs/authority/PROJECT_AUTHORITY.md`;
3. `docs/architecture/0001-modular-monolith.md`;
4. `docs/architecture/0002-deterministic-combat-kernel.md`;
5. `docs/architecture/0003-m0-m1-technology-baseline.md`;
6. `docs/architecture/0004-company-identity-succession-boundary.md` when working on WP-02;
7. `docs/engineering/AI_TECHNOLOGY_HANDOFF.md` for framework/runtime work;
8. this current-plan mirror;
9. the active work-package contract.

## Change-control rule

Do not mark a work package Ready merely because its code dependencies are complete. A package is Ready only when its linked P0 design questions required by its DoD are closed or explicitly converted to versioned provisional evidence gates.

Do not mark a milestone Blocked merely because later player-facing validation remains. Milestone scope and evidence must match the kind of artifact being produced: headless technical proof, playable, alpha, or release.
