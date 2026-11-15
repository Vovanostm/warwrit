# N08 — Terminal battles release the company and preserve truth

## Scope reconciliation — 2026-11-13

The November 9 owner answer requires S4 panic/surrender in campaign combat.
An incapacitated fighter lies down and skips turns for the remainder of the
battle. [M1-CAMPAIGN-BATTLE](../M1-CAMPAIGN-BATTLE.md) owns that accepted scope.
O5's remaining captivity/property-policy questions must be assessed separately
from the accepted tactical surrender behavior. Carrying wounded follows M1.
Fresh executable and terminal-path checks in this reconciliation are NOT_RUN.

## Current result — 2026-11-08

SPECIFIED / LOCAL. Hostile-retreat settlement PR408 and repeat-admission PR416
are already merged; native first hostile escape remained unproved in their owning
record. Surrender/captivity#377 is deferred/source-blocked, not approved here.
Next: read current retreat policy, reachable outcomes and actual terminal worker.
[Common contract](COMMON.md). [Prompt](prompts/08-battle-outcomes.md).

## Player goal and ordinary path

Understand a battle's real result and continue as the surviving company.
Try: normal contract/physical admission → real persistent battle → lawful
victory, withdrawal, loss or other enabled terminal result → actual consequences/
release → recover, retry unfinished work or game-over as accepted → re-entry.

## Sources and dependencies

N01; [retreat and dated policy](../../wiki/mechanics/retreat.md),
[M1 physical outcomes](../../wiki/m1-spec.md), [lifecycle](../WP-02.2.md),
[physical effects](../WP-02.4.md), current encounter effects/terminal evidence.
Existing#364/#377/#378/#409/#392, not new duplicates.

No surrender/capture/transport/rescue/reward policy may be inferred from the
existence of a Capture consumer. Owner-deferred captivity remains OUT.
If newly exposed executable content reaches that unsupported state, identify
the exposure and propose a bounded prevention/source decision; do not remove a
guard and falsely settle it as a victory.

## Outcome rows and choices

| Row                            | Actual behavior to prove                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| O1 Victory                     | Lawful physical casualties/proof eligibility, released companies and once-only effects                                           |
| O2 Company withdrawal          | Actual eligible exit cells/units, preserved dead/withdrawn members, no false victory/proof; player can find and use the control  |
| O3 Hostile escape/retry        | Real living enemy survivors persist; unfinished hunt is retryable under fresh consent and saved attempt history; no false trophy |
| O4 Death/incapacity/leadership | Capability and actual succession/game-over follow accepted rules; no emergency heir/resurrection or stranded canonical binding   |
| O5 Deferred policy exposure    | Unsupported surrender/captivity is inventoried and stays unactivated; any necessary new activation waits for owner policy        |

Manual/autoplay handoff and timely player return must be clear. A retreat button
must explain current eligibility. A loss summary names actual outcomes, not a
generic successful completion. Source-defined enemy survivors and historical
attempts are retained; subsequent encounters do not reroll them as fresh enemies.
Reload and unknown-response retry preserve the same terminal result.

## Architecture, saved state and write set

Combat engine resolves battle facts; physical/company owners derive real effects;
contract owner separately judges proof. Terminal coordinator atomically persists
all required company outcomes, attempt/history, receipts and binding release.
Do not conflate combat resolution, property/custody or reward authority.
Released replay V1/history and old encounter attempts are immutable.

Candidate paths: server `encounters/terminal-evidence.ts`, `effects.ts`,
`executor.ts`, `hunt-attempt.ts`, leadership/admission only as selected;
contract terminal-result consumer; web encounter CommandDesk/battle presentation/
LeadershipChoice and result panel; existing core outcome owners and tests.
Reserve exact paths; no combat AI/skill rewrite, new balance or captivity system.

## Work plan

1. Inventory reachable outcomes from current actors/rules and map accepted sources.
   Separate O5 source refusal from implementation gaps.
2. Reuse merged/current passing evidence; select the first uncovered enabled row.
3. Attempt the native ordinary scenario, recording choices and actual casualties.
   Do not force enemy state/rolls or repair a failed company to get the desired run.
4. Fix a reproduced terminal/control/history/receipt defect in the smallest owner.
5. Exercise relevant real SQL commit/retry/restart and the actual post-battle
   action. A prepared-save SQL scenario supports invariants, not native reachability.
6. Re-run affected UI feedback/day-night/result layout and saved continuation.
7. Record each outcome's achieved/inherited/unreproduced/source-deferred state;
   commit finished corrections without claiming a missing native case passed.

## Acceptance / DoD

- [ ] OUT-1 Every currently enabled reachable outcome has accepted source and
      terminal/result/continuation coverage; O5 remains explicitly deferred.
- [ ] OUT-2 O1–O4 apply truthful people/items/condition/knowledge effects and
      release all participating companies atomically, including retry/restart.
- [ ] OUT-3 A native hostile escape and ordinary retry use actual saved survivors,
      fresh helper consent and historical attempt identity; no false proof/reward.
- [ ] OUT-4 Own withdrawal, leadership/game-over and manual/autoplay controls are
      discoverable, usable and explain accepted eligibility and consequences.
- [ ] OUT-5 Loss/withdrawal UI matches canonical result after reload; no lingering
      lock, duplicate terminal receipt, resurrection or invented captive.
- [ ] OUT-6 Required native cases are evidenced separately from seeded invariant
      tests. An unreproduced hostile escape leaves OUT-3 open, not waived.

## Checks and decisions

Use focused encounter/terminal/attempt public tests and real multi-company SQL
where changed. Browser uses ordinary persistent encounters. A naturally
unreproduced outcome requires an honest NOT_RUN plus a bounded next attempt,
not endless battles, fake state or automatic gameplay-policy change.
