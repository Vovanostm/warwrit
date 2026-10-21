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
defect and permission under AGENTS hard rule 1: the owner's words for this PR,
or a quoted mission scope that names its issue, or the
[warwrit-orca](../warwrit-orca/SKILL.md) merge-on-gates rule for pipeline slice
PRs. Pass the expected head SHA to the merge operation. Do not dismiss a
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
Commands / exit result / run+job / logs / checked tree:
Author vs external review / limitations:
One next step:
```

Write/read back the issue or PR; close the issue the PR delivered or relabel it
with what is left. Update the canonical Airtable checkpoint and an Empirical
`Warwrit` event at a milestone or when the owner asks, not for every slice.
Preserve older dated evidence as history. Do not announce a milestone or M1
complete because one slice passed.

Before the session stops (not while waiting for CI), follow
[AGENTS.md § Orchestration](../../../AGENTS.md#orchestration): push work in
progress, leave the five-line handoff on the issue and release or transfer the
coordinator lease.

## Next AI task

Use the actual merged interfaces and remaining requirements as input. Specify
mission, IN/OUT, sources+precedence, finite trust contracts, compatibility, ordered
phases, stable behavior postulates and the existing gate. Pin the verified base
in the issue/checkpoint rather than in every reusable skill. Distinguish completed
source/code review from unimplemented next-slice tests. Creating a task does not
start an agent. Do not implement the successor slice during this delivery.
