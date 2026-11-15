# Warwrit project authority

## Purpose

This document prevents implementation convenience, an old draft, or an agent suggestion from silently overriding the intended game.

## Source hierarchy

1. Latest explicit decision by the product owner.
2. Repository decisions, wiki/GDD and recorded owner amendments under AGENTS.md.
3. Accepted architecture decision records.
4. Active work-package implementation contract.
5. Versioned schemas, executable tests, and generated evidence.
6. Code comments and implementation notes.
7. Historical drafts, archived interview material, and chat proposals.

A lower source may clarify implementation but may not contradict a higher source.

## Decision states

Material product decisions use explicit states:

- `OPEN` — unresolved and blocking or tracked;
- `PROVISIONAL` — implemented as a testable default with a revisit trigger;
- `APPROVED` — accepted source of truth;
- `DEFERRED` — intentionally outside the current scope;
- `REJECTED` — considered and not selected;
- `SUPERSEDED` — replaced by a newer append-only decision.

Current rules are updated in their owning document with the owner decision date.
Superseded drafts and competing versions are removed from working documentation.
Git and original delivery records retain decision and permission provenance.

## Engineering interpretation

When a work package requires a value that product authority has not approved, prefer one of the following:

1. keep the value configurable and mark it provisional;
2. isolate it behind a port so implementation can proceed without choosing policy;
3. stop the affected slice and register the blocker.

Do not infer game design from generic genre conventions.

## Repository authority

- `AGENTS.md` controls contribution behavior.
- ADRs control accepted architecture.
- Work-package documents control scope and evidence.
- Tests demonstrate implementation behavior but do not by themselves authorize new product behavior.
- CI and broad audits are advisory under the November 8 AGENTS.md amendment.
  Player-facing outcomes and focused checks own behavioral evidence. Merge
  follows explicit owner authority and current expected-head protection.
