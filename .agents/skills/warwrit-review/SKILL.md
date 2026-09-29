---
name: warwrit-review
description: Review Warwrit domain code for SSOT, SRP, KISS/YAGNI, conservation, temporal causality and hidden-state leaks. Use for PR review or a reproduced bug; not blanket test counts, cosmetic rewrites or balance approval.
---

# Review executable game invariants

Read the exact active contract and actual diff/callers, not only the PR description.
Follow [AGENTS.md](../../../AGENTS.md). A separate author pass is still author
review; do not claim another agent's approval.

## Counterexample pass

Choose the relevant postulates and trace public preparation plus projection.
For every finding keep: source/postulate, failing input sequence, expected vs
observed result, minimal owning fix, regression and remaining limitation.
Use severities for player/data impact, not file length. Reproduce first; distinguish
an unproven suspicion from a confirmed defect.

| Concern            | Useful adversarial sequence                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Value conservation | Split and reload; reserve then settle; reject mid-transfer; sum real wallets plus actual sinks                                   |
| C04                | Original unequal weights, partial DEFAULT, reveal older debt, TARGETED only that debt, then DEFAULT; tiny sorted-rational oracle |
| Physical scope     | Same site/different room; old remote purse; moved beneficiary; inventory full during mandatory handover                          |
| History            | End service/rejoin, old claim remains; change leader without changing others' terms; same source concerns two people             |
| Time               | Before/at/after deadline; same boundary in several chunks; prospective rate; earlier actual death with later observation         |
| Knowledge          | Paired worlds with same observations but different hidden fate, then payments/transfers/retry/insufficient funds                 |
| Atomicity          | Missing provider/item/receipt, old command with changed body, no child-only commit or side effect on rejection                   |

Independent oracles must not call the helper under test to calculate expectations.
A small enumeration is suitable for a tiny C04 oracle, never production monetary
allocation. Assert observable allocations, balances, custody, deadlines and
rejections rather than helper call order or catalogue snapshots.

## Structure pass

Map each mutable fact and each policy to its owner and consumers. Distinguish
canonical state, derived values, immutable observations and source receipts.
Consolidate semantic duplicates that have drifted; don't combine different
capabilities, debt vs optional gifts, or actual vs known intervals because their
code looks similar. Move cohesive responsibility instead of wrapping every helper.
Do not introduce extensibility for hypothetical races, magic or frameworks.

## Known defect patterns

Moved from AGENTS.md on 2026-09-29; check these on every domain review.

Flag person-wide obligations accidentally narrowed to the latest membership;
coverage continued by somebody who already left; `basicWork` substituted for
`localDuty`; eligibility used as proof that an effect occurred; and resetting an
allocation epoch without changing its claims. Automatic local settlement may
leave distant debt, but must never swallow an invalid supplied access capability.
For hidden-fate changes, compare command sequences and colleagues' actual payouts,
not only two initial projection objects.

## General pass

After the invariant passes, check the diff for: runtime errors on absent values
or out-of-range indices; unbounded work over whole histories or catalogues;
unintended changes to other consumers; breaking protocol, serialization or
migration contracts without a compatibility note; injection, missing authorization
or secrets in code and logs. Prefer the existing module's style over generic
preferences. Suggest a simplification only for the changed code: remove
unnecessary nesting, indirection or abstraction while preserving behavior,
independent test oracles and the actual/known-state separation. Label these as
optional advice, separate from defects.

Tool pointers, not verdicts: `pnpm exec fallow review --base <ref> --brief` for
changed-file dead code, complexity and clones; `pnpm exec ast-grep scan <paths>`
for code-shape warnings. A clone or warning is a lead; confirm the shared rule
and all consumers before consolidating (see AGENTS.md "Code Review Rules").

## Worked example

From fix `b69d881` (`prepareLearningBacking`, C05-FIN):

```text
Severity: data impact — valid long-lived companies
Postulate: own retained values at the boundary; do not deep-copy the whole world
  per helper (warwrit-domain); a valid canonical root must prepare deterministically
Sequence: valid root whose finance.sourceEffects holds 1,001 entries; same
  learning request as on a fresh root
Expected: identical accepted/funded ticks, transfer, wallets, movements and
  obligations; caller's root/finance/sourceEffects objects unchanged
Observed: helper re-serialised the entire root via snapshotJson before preparing
Owning fix: use the validated input state directly in learning-backing.ts
Regression: learning-cost.spec.test.ts compares the large and fresh roots through
  the public preparer and asserts identity of the caller's objects
Limit: proves this preparer only; other helpers need their own check
```

## Exit

Run the smallest regressions that disprove the old implementation, apply the
fix, then check affected existing specifications and types. Preserve the sole
regression of each old defect. One final exact-tree gate belongs to delivery;
repeated unchanged full runs add no evidence. Report test scope honestly: pure
roundtrip is not SQL crash recovery; headless combat is not player enjoyment.
