---
name: eval-driven-game-development
description: Measure a concrete Warwrit balance question about existing combat or economy rules using the current deterministic runner and reproducible scenarios. Use for requested win-rate, loss, pacing or resource-cost analysis.
license: MIT
metadata:
  upstream: edhahn/agent-skills
  upstream-ref: ffc6fc4bf1408bc3cac522916bb58e603f39ab45
---

# Measure one existing-rule question

Adapted from edhahn on 2026-11-06. See [PROVENANCE.md](PROVENANCE.md) for source
and local changes. Accepted mechanics and target values come from the owning
contract. Keep exploratory measurements descriptive until targets are agreed.

## Establish what the runner represents

Trace the questioned mechanic into the executed resolver. Read scenario setup,
ruleset, actor policy and termination conditions. Confirm the suspected ability,
resource or campaign stage affects that path and the metric can actually vary.
If the runner omits a decisive mechanic, report the gap and the smallest suitable
existing path. Ask for a product decision only when the rule itself is undefined.

Warwrit already has pure combat simulation and replay. Inspect
`scripts/combat-stress.ts` and `packages/testkit/src/combat.ts` before reuse.
The stress runner generates scenarios and samples replay/determinism checks at
intervals. A small run may never enter those branches. Its ruleset, actors and
doctrines must match the question before using it as balance evidence.

For an economy question, use the canonical money/resource transitions and include
actual sources, sinks and recovery costs. Establish what a combat-only runner
can say about the requested campaign stage before proposing an extension.

## Run the smallest informative comparison

Use the existing runner and public game interfaces. Choose scenarios bearing on
the assigned question. Retain seed range, trial count, content/ruleset revision,
starting state, bot policy and terminal/unresolved counts with the raw results.
Compare variants on matched scenarios and seeds when feasible. Keep per-seed
failures visible. Trial counts follow uncertainty and available time.

Win rates need sample size and an uncertainty interval. For independent binary
outcomes, a Wilson interval is a useful default. With paired seeds, repeated
scenarios or clustered actors, state that dependence and use a matching analysis.
Report losses, battle length or resource use when they explain the question.

Check another relevant policy before tuning when the conclusion may depend on
bot behavior. Keep policies and sample composition visible so the result can be
reproduced. Small samples can establish that a run works while leaving a balance
decision open.

## Preserve rules and approval boundaries

Balance targets and allowable regression deltas both need an accepted owner and
rationale before becoming blocking gates. Provisional targets remain reports.
Existing correctness/determinism assertions retain their required status.
Update a baseline through ordinary review with the reason for the changed result.

Keep RNG inputs and released replay semantics intact. For a refactor, compare
the required per-seed states, commands or replay outputs through existing checks.
Aggregate win-rate agreement alone leaves deterministic equivalence unresolved.
Harness, scheduling and dependency changes follow the actual assigned scope.

## Return a bounded answer

State the question, modeled path, command/revision, sample and policies, results,
uncertainty and next decision. Link the retained raw output. Describe omitted
mechanics and how they limit the conclusion. Comprehension, tension and enjoyment
need observed play sessions. Campaign persistence needs its applicable saved-state
journey. Mark each unexecuted check explicitly.
