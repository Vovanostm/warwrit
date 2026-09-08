# AGENTS.md — Warwrit engineering contract

Applies repository-wide; read stricter directory instructions before editing.

## Authority and scope

Latest explicit owner decision > canonical Airtable decisions/GDD > accepted ADRs > active work-package contract > executable specifications > implementation > historical drafts. Preserve accepted history with dated amendments; never turn a proposal or a test plan into an approved decision or a passed check.

The single operational entry is `docs/engineering/CURRENT_PLAN.md`: active slice,
activation prerequisite, issue/contract and source records. Read it and the full
active work-package contract before editing. GitHub is authoritative for live
refs, comments, merge status and CI; a document saying “ready” is not proof.
Canonical product memory: Airtable base `apph3bj1NyVrfJeLM` and Empirical tag
`Warwrit`. Read full Notes plus dated Purpose amendments. Preserve the named
original source-archive limitation; do not reconstruct the catalogue again or
reopen superseded interview blockers.

Implementation, tests and PR updates are authorized. Merge, auto-merge, deployment and paid provisioning require separate permission. One owner plus ChatGPT agents; one writer per slice. Server target: Yandex Cloud 2 cores / 4 GB; available client: MacBook + Chrome. These are constraints, not measured capacity.

## Simple design

Use intention-revealing names, cohesive functions and modules with one reason to change. Separate policy from transport/storage and prefer explicit data over hidden side effects. Share a rule when it is genuinely the same rule; do not compress code into clever expressions merely to reduce lines.

Keep the functional modular monolith. No class per command, generic framework, DI container, event bus, service or abstraction without a present requirement. Remove dead code and duplicated work. Catalogue data is not duplicate business logic; independent test expectations are not a second implementation.

## Working skills

Load the matching repository skill on demand, not all references on every task.
These are workflows, not another GDD or a source of authorization. Hosts without
skill discovery can read the same `SKILL.md` files directly.

| Task                                                                 | Skill                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Start/resume a slice, resolve source or status conflict              | [.agents/skills/warwrit-context/SKILL.md](.agents/skills/warwrit-context/SKILL.md)   |
| Implement a pure domain change or cross-component effect             | [.agents/skills/warwrit-domain/SKILL.md](.agents/skills/warwrit-domain/SKILL.md)     |
| Review/refactor, reproduce an exploit or verify an invariant         | [.agents/skills/warwrit-review/SKILL.md](.agents/skills/warwrit-review/SKILL.md)     |
| Validate, publish, authorized merge, checkpoint or next-task handoff | [.agents/skills/warwrit-delivery/SKILL.md](.agents/skills/warwrit-delivery/SKILL.md) |

## Code Review Rules

Review observable failures before cosmetic rearrangement. Give each finding its
violated source/postulate, concrete counterexample, affected boundary and smallest
fix. Distinguish reproduced defects from risks, balance hypotheses and style
preferences. A green test suite does not prove absence of defects.

SSOT means one owner for each rule or mutable fact, not merely fewer repeated
strings. Derived views, immutable observations and independent test oracles are
not competing truth when their inputs and refresh boundary are explicit. Check
all consumers before extracting a rule; similar-looking policies can differ.
SRP follows reasons to change (e.g. cash movement vs departure eligibility), not
one file per command. KISS/YAGNI favor a finite current contract over speculative
frameworks; they do not justify leaving proven defects or unsafe coupling.

Flag person-wide obligations accidentally narrowed to the latest membership;
coverage continued by somebody who already left; `basicWork` substituted for
`localDuty`; eligibility used as proof that an effect occurred; and resetting an
allocation epoch without changing its claims. Automatic local settlement may
leave distant debt, but must never swallow an invalid supplied access capability.
For hidden-fate changes, compare command sequences and colleagues' actual payouts,
not only two initial projection objects.

## Dependency and state boundaries

- `game-core`: pure, deterministic, serializable, zero runtime dependencies and no Node/browser I/O. Time and randomness are explicit inputs.
- `protocol`: versioned transport contracts, no domain behavior or private canonical state.
- `testkit`: test-only infrastructure and fixtures; never imported by production.
- `server`: authenticated adapters and process composition. Realtime rooms are projections, not canonical state.
- `web`: no server internals. Cross-package imports use public `@warwrit/*` exports; no cycles.

Reject invalid commands without partial mutation. Preserve exact money, unique ownership, source/command idempotency and public/private knowledge separation. A revision token, actor string or receipt ID supplied by a client is not authority. New command policies must be exhaustive and fail closed. Version changes to canonical serialization, command semantics, RNG or combat require compatibility analysis; never rewrite released V1 replay history.

## World and narrative consistency

Apply the same canonical condition capabilities to actual tasks; presence, duty and ability are not interchangeable. Own retained values from external evidence instead of aliasing mutable adapter records. Narrative is an observer-appropriate rendering of established facts, never a second source of truth: no invented witness, fate, biography or teleport to make a story work. Keep new prose/content proposals separate from approved rules and code evidence.

## Tests are executable specifications

Owner policy, 2026-09-07: test important, durable software principles rather than mirror changing implementation. This supersedes blanket demands for a new test per behavior edit, command, field or helper.

Each retained test states an observable invariant through a stable public boundary. Priorities: determinism/replay, conservation and exact arithmetic, authorization/tenant isolation, privacy, atomic rejection, source idempotency, valid value-preserving serialization, and actual transaction/migration integrity. Add a small regression when a discovered defect violates one of these principles.

Do not snapshot entire catalogues, pin provisional balance values/counts/hashes as behavior, inspect private call order, mock every collaborator, or copy every command payload into a parallel test catalogue. Prefer a small set of readable examples and property/table-driven specifications. Use an independent schema validator only in test tooling, never as a second production rules engine. Compilation and content validation should handle structural checks already guaranteed there.

Refactoring or balance/content tuning should not require editing behavioral expectations. Change expectations only when the underlying contract changes, with its source recorded. Removing redundant tests must preserve their meaningful invariant in a named remaining specification; never delete the only regression for an unfixed bug. No test-count or blanket coverage targets. Do not replace many useful tests with one opaque giant test just to lower the count.

Test the layer that owns the rule. Admission is not execution. Do not fake future gameplay handlers or database transactions to make a test pass. Test doubles are for external boundaries, not for reimplementing the domain. Keep a small real PostgreSQL migration/transaction check where applicable and the deterministic combat stress/replay gate.

This is a project-specific risk-based policy, not a claim that Robert Martin recommends fewer tests indiscriminately. Relevant basis: his Test Contra-variance and Giving Up on TDD essays emphasize decoupling tests from implementation structure.

## Verification without duplicate work

During edits run focused specifications, formatting and typechecks for affected modules. Reuse completed evidence for an unchanged SHA; do not repeatedly run the full suite for wording-only progress updates.

Before requesting acceptance, the exact final code must pass the existing full gate once in a clean environment:

```bash
pnpm verify
pnpm test:combat:stress
pnpm test:migrations
```

Record SHA, commands, outcomes and limitations. A tool/runner failure is not a pass; do not weaken checks to obtain green CI. A passed stress test proves technical invariants, not fun, balance, browser FPS or production load capacity.

## Persistence and operations

Schema changes need ordered up/down migrations; never edit a released migration. Canonical writes and receipts must be atomic. Publish only after commit. Preserve existing data and rollback compatibility.

Logs are structured and exclude credentials, session tokens and personal data. `/health/live` proves process liveness; `/health/ready` returns 503 when required dependencies are unavailable.

## Technology and delivery

Read ADR-0003 and `docs/engineering/AI_TECHNOLOGY_HANDOFF.md`. Keep repository-pinned Node 24/pnpm, Fastify, PostgreSQL/Kysely/pg. Bun is experimental only. Colyseus is an adapter when introduced. The renderer is not frozen until the representative comparison; no incidental framework migration, second lockfile, Redis, distributed topology or Go/Rust service.

Before using changing library APIs inspect the exact lockfile/typings and official documentation. Add new technology only with an accepted decision and measured need. Do not deploy coding agents or load generators on the target game VM.

Keep commits reviewable. PR reports state scope, actual verification, migration impact and remaining risks. Update the canonical project checkpoint with readback after meaningful delivery; do not duplicate the full specification in every status comment. Report briefly to the owner.
