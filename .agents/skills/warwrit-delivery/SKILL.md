---
name: warwrit-delivery
description: Validate and deliver a Warwrit slice, publish a PR, perform an explicitly authorized merge, and create a source-grounded next-agent handoff. Use after implementation/review; never implies permission for merge, deploy or paid services.
---

# Deliver exact code and a usable continuation

For substantive change records, read [project record](references/project-record.md).
Current AGENTS.md makes CI/full suites/audits advisory and independent reviews
optional; older work-package gate wording does not override those policies.

Follow [AGENTS.md](../../../AGENTS.md) and the active contract. Reuse the same
PR for corrections. One writer owns the source tree; do not launch overlapping
writers or regenerate already approved source catalogues.

## Freeze and verify

1. Finish source, regression and necessary documentation edits. Read the staged
   diff for scope, secret leakage, leftovers and changed semantics. Run focused
   checks while editing; fix observed defects and record unavailable checks.
2. Record the reviewed branch/head and base. Use the repository-pinned toolchain
   and frozen lockfile. Do not compute routine tree/hash manifests; full
   clean-checkout/bootstrap checks remain optional under AGENTS.md.
3. Publish once; CI may be skipped or ignored under AGENTS.md. If using CI
   evidence, read its actual logs/conclusion and identify the checked revision.
   A synthetic PR merge ref is not an executed merge; do not reuse old evidence
   as proof of changed code.

## Merge only when authorized

Before merging read live head/base, reviews, unresolved threads and applicable
CI evidence. Require no unresolved blocking defect and explicit permission for
this PR. Pass the expected head SHA to the merge operation. Do not dismiss a
review or force a ref to bypass a failure. Read back merged status, actual merge
SHA/tree, default-branch ref and linked issue state. A failed tool call is not a
merge. Auto-merge, deployment and purchases are separate operations.

## Handoff

PR descriptions state scope, actual checks, migration impact and remaining risks.

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

Record status, checks, limits and permissions in the owning task document.
Update the [roadmap](../../../docs/engineering/ROADMAP.md) checkbox only when
its done criterion changes. Add a short entry using
[warwrit-changelog](../warwrit-changelog/SKILL.md); do not update the old plan.
Write/read back the issue or PR when publishing. Preserve older dated evidence
as history. Do not announce full WP-02 or M1 complete because one slice passed.

## Next AI task

Use the actual merged interfaces and remaining requirements as input. Specify
mission, IN/OUT, sources+precedence, finite trust contracts, compatibility, ordered
phases, stable behavior postulates and the existing gate. Pin the verified base
in the issue/checkpoint rather than in every reusable skill. Distinguish completed
source/code review from unimplemented next-slice tests. Creating a task does not
start an agent. Do not implement the successor slice during this delivery.
