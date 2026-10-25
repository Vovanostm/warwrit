---
name: warwrit-delivery
description: Validate and deliver a Warwrit slice, publish a PR, perform an explicitly authorized merge, and create a source-grounded next-agent handoff. Use after implementation/review; never implies permission for merge, deploy or paid services.
---

# Deliver exact code and a usable continuation

Follow [AGENTS.md](../../../AGENTS.md) and the active contract. Reuse the same
PR for corrections. One writer owns the source tree; do not launch overlapping
writers or regenerate already approved source catalogues.

## Freeze and verify

1. Finish source, regression and necessary documentation edits. Read the staged
   diff for scope, secret leakage, leftovers and changed semantics. Run focused
   checks while editing; fix tool environment issues without weakening the gate.
2. Record `git rev-parse HEAD HEAD^{tree}` and base. Use the repository-pinned
   toolchain and frozen lockfile. The existing clean-checkout gate is owned by
   AGENTS.md / `scripts/bootstrap.sh`; do not copy it into another workflow.
3. Publish once to trigger the applicable PR pipeline, not duplicate push and PR
   full gates. Read actual logs and conclusion. A synthetic PR merge ref is not
   an executed merge. Verify its tree equals the reviewed tree. Reuse exact
   evidence on an unchanged tree; new code invalidates prior-tree evidence.

## Merge only when authorized

Before merging read live head/base, reviews, unresolved threads and applicable
CI evidence, including the `PR scope` check. Require no unresolved blocking
defect and current explicit permission under
[AGENTS permission policy](../../../AGENTS.md#permission-policy--current-as-of-2026-10-25).
Historical merge-on-gates permission never restarts a cancelled mission.
Infrastructure requires independent reviewer ACCEPT for the affected head. Pass the expected head SHA to the merge operation. Do not dismiss a
review or force a ref to bypass a failure. Read back merged status, actual merge
SHA/tree, default-branch ref and linked issue state. A failed tool call is not a
merge. Auto-merge, deployment and purchases are separate operations.

## Handoff

Persist a detailed result once, with short operational pointers elsewhere:

```text
Task / contract / source edition / versions:
Branch / base / reviewed head / tree / actual merge (or NOT_MERGED):
Implemented effects / finite residual requirements:
Postulate -> public specification -> actual result:
Commands / environment / exit result / run+job / logs / checked revision:
Author vs external review / limitations:
Rework cause / first submitted result accepted / later regressions:
Tokens (input/output/cache), elapsed to acceptance: actual values or NOT_MEASURED
One next step:
```

When external writes are authorized, write/read back the issue or PR. Close
only issues whose individual criteria passed; related issue links do not prove
acceptance. Size is advisory; semantic review must assess cohesion and rollback. Update the canonical Airtable checkpoint and an Empirical
`Warwrit` event at a milestone or when the owner asks, not for every slice.
Preserve older dated evidence as history. Do not announce a milestone or M1
complete because one slice passed.

Before stopping preserve WIP and a short checkpoint under
[AGENTS orchestration](../../../AGENTS.md#orchestration). A delegated editor
returns its diff to the parent; a branch owner commits finished steps. Do not
push or write external records without current permission, especially after stop.

## Next AI task

Use the actual merged interfaces and remaining requirements as input. Specify
mission, IN/OUT, sources+precedence, finite trust contracts, compatibility, ordered
phases, stable behavior postulates and the existing gate. Pin the verified base
in the issue/checkpoint rather than in every reusable skill. Distinguish completed
source/code review from unimplemented next-slice tests. Creating a task does not
start an agent. Do not implement the successor slice during this delivery.
