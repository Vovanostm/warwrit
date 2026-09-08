---
name: warwrit-domain
description: Implement a bounded Warwrit game-core slice using existing commands, deterministic state and finite trusted evidence. Use for economy, inventory, care, outcomes or lifecycle composition; not UI, SQL deployment or new game design.
---

# Implement one bounded domain slice

## Start

Use the active contract from [CURRENT_PLAN.md](../../../docs/engineering/CURRENT_PLAN.md).
Apply [AGENTS.md](../../../AGENTS.md); use `warwrit-context` when resuming.
For items/care/outcomes read [physical-state.md](references/physical-state.md).

## Work from behavior to one owner

For each affected transition write a short table:

| Input / trusted fact               | Required preconditions          | Actual state delta                      | Unmet requirement                   | Observable delta             |
| ---------------------------------- | ------------------------------- | --------------------------------------- | ----------------------------------- | ---------------------------- |
| Existing command + scoped evidence | Person/place/right/time/version | Exact debit, custody or interval change | Named component, not generic effect | What this observer can learn |

Search existing production consumers before adding a type or formula. Reuse
`company/values.ts`, `commands.ts`, `guards.ts`, `input.ts`, `definitions.ts` and the
actual lifecycle/economy APIs. Do not infer person-wide history from only the
active membership. Do not replace a financial claim with a new balance.

## Implement

Close eligible `[from,to)` intervals before applying the causal boundary; then
compute consequences. Preserve the last-known observation separately from
private actual facts. Validate all predicates before returning a changed draft.
Commands, facts, receipts and public observations have different responsibilities.
A payload ID or boolean is not proof of source authority or fulfillment.

Keep one combined preparation when money, items and membership depend on one
another. Consume actual typed requirements, calculate real changes and carry a
finite residual list. Never turn a child PREPARED result or a client acknowledgement
into aggregate acceptance. Authentication, exact ID/body replay, subject-scoped
source replay and fresh revision are separate ordered checks.

Own retained external values at the boundary; do not deep-copy the entire world
for every helper. Use exact integer money/time and stable source/subject IDs.
Derive constants from the versioned catalogue, not duplicated reducer literals.
Extract only genuinely shared rules; use clear functions, not a general effect
engine. Separate public projection from private execution when editing both.

## Reviewable result

Run focused public-boundary specifications, affected typechecks and formatting.
Record compatibility for changed stored semantics, not a blanket version bump.
Keep original behavior assertions when adapting representation. Report missing
upstream facts explicitly; no invented gear, provider, wages or zero-debt default.
Stop at the slice boundary and route final evidence through `warwrit-delivery`.
