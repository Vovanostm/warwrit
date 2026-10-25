---
name: warwrit-context
description: Restore current Warwrit task, authority, source scope and repository checkpoint before implementation or review. Use for resume, stale status or conflicting artifacts; not for inventing new game rules.
---

# Restore the working contract

## Inputs

The owner request and repository access. Start with [AGENTS.md](../../../AGENTS.md)
and [CURRENT_PLAN.md](../../../docs/engineering/CURRENT_PLAN.md). Do not use a
remembered PR, old attachment or cache as the current head.

## Procedure

1. Confirm checkout/base/branch/dirty state and current owner scope/stop status.
   Use `pnpm agent:status` when live integration/PR state matters; a small local
   documentation task does not need a broad inventory. Read the active issue and
   applicable comments. An old branch's instructions or old merge permission
   cannot reactivate a cancelled mission. Inspect a coordinator lease only for
   an explicitly activated queue; otherwise work within the local assignment.
   Inspect existing work before creating a branch; keep unrelated work intact.
2. When the task sets or interprets game rules or a milestone contract, read
   full Notes and Purpose of the active canonical Airtable contract and its
   named applicable sources; an issue whose contract already cites them is
   worked from that contract. Restore the latest Empirical checkpoint tagged
   `Warwrit`. New Purpose amendments may supersede historical statuses, not silently
   rewrite accepted mechanics. Use explicit record IDs before broad search.
3. Identify source edition, accepted rules, provisional parameters, current
   implementation and unexecuted evidence separately. Missing old ZIP bytes remain
   a source-concordance limitation, not an invitation to regenerate definitions.
4. Read nested instructions and actual affected definitions and consumers.
   For command changes trace authorization through receipt and projection.
   Check the installed lockfile and type declarations before changing library APIs.
5. Extract a short working note from the existing issue/contract: player outcome,
   decisive criteria/regressions, source and code owner of the rule, producers and
   consumers, base/write boundary and verification. Do not create another document
   or agent if these are already clear. Resolve only uncertainties that could
   change the solution with targeted reading or a safe probe before generating
   code. Ask for undefined product rules/authority; technical choices inside the
   accepted contract belong to the author. Reuse unchanged sources and applicable
   check results; recheck changing heads, permission, config and environment.

## Expected output

```text
Task / active contract / source edition:
Live repository / base / branch / head / tree:
Applicable decisions and dated corrections:
Implemented / prepared / still required:
Allowed writes / prohibited operations:
Next action:
```

## Failure handling

If a source is unavailable, name the exact missing source and affected behavior.
Read independent available sources; do not present old content as live or claim
new tests from historical counts. Connector records are references, not local
files. Verify actual mounted bytes and Git tree before executing a local copy.

## Example

“Review economy, then merge and prepare inventory” means inspect and fix the
current economy PR, verify that updated tree, merge only that authorized PR, and
create the inventory contract. It does not authorize implementing inventory,
deployment, restoring obsolete roster caps, or redesigning inheritance.
