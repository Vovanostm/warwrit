# N08 — Terminal battles release the company and preserve truth

## Scope reconciliation — 2026-11-13

The November 9 owner answer requires S4 panic/surrender in campaign combat.
An incapacitated fighter lies down and skips turns for the remainder of the
battle. [M1-CAMPAIGN-BATTLE](../M1-CAMPAIGN-BATTLE.md) owns that accepted scope.
O5's remaining captivity/property-policy questions must be assessed separately
from the accepted tactical surrender behavior. Carrying wounded follows M1.
Fresh executable and terminal-path checks in this reconciliation are NOT_RUN.

## Current result — 2026-11-15

IN_PROGRESS / LOCAL on `codex/m1-completion-20261115`. New schema3/bridge-v6
admission, replay, independent company control, terminal effects and release
have passed the real PostgreSQL wolf-trail scenarios. Historical readers retain
their versioned behavior.

The latest owner rule in M1-CAMPAIGN-BATTLE accepts surrender with gear left on
the field. Captivity, ransom and prisoner transport remain post-M1. The earlier
O5 source deferral is superseded for this accepted surrender behavior.
Company gear transfer and finalization now have a focused verified-journal
regression. It preserves living members, prior presence, exact item IDs and an
idempotent finalization. This is invariant evidence from a constructed source,
not a native campaign surrender. Canonical hostile gear and surrender disposition
now persist through terminal settlement. Equipment condition reflects actual
remaining armor. Surrendered living enemies are excluded from later admissions.
Ordinary loot pickup and sale remain open under T022.

All three newly admitted hunt profiles use bridge-v6. Incapacitated living units
skip activations and render prone while preserving selection and targeting.
The final integrated encounter PostgreSQL suite passed26 tests. Focused company
finalization, projection, scene and terminal-view checks also passed. Native
surrender and ordinary campaign UI continuation remain unverified.

Independent review found that surrendered gear moved canonically while observed
inventory still showed its old equipment slots. The drop now refreshes the exact
item snapshots and the observed ground bundle through the existing mutation helper.
The finalization regression checks all 12 moved items, their three observed bundles,
living people and exact retry. The focused source test passes.

Native hostile escape/surrender, browser continuation and the remaining outcome
rows keep their direct acceptance criteria below.

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

Surrender follows the latest gear-drop rule above. Captivity, transport, rescue
and reward retain their separately accepted policies. A Capture consumer alone
provides no new outcome authority. Inventory any exposed unsupported custody
state and retain its source refusal until its policy is defined.

## Outcome rows and choices

| Row                            | Actual behavior to prove                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| O1 Victory                     | Lawful physical casualties/proof eligibility, released companies and once-only effects                                              |
| O2 Company withdrawal          | Actual eligible exit cells/units, preserved dead/withdrawn members, no false victory/proof; player can find and use the control     |
| O3 Hostile escape/retry        | Real living enemy survivors persist; unfinished hunt is retryable under fresh consent and saved attempt history; no false trophy    |
| O4 Death/incapacity/leadership | Capability and actual succession/game-over follow accepted rules; no emergency heir/resurrection or stranded canonical binding      |
| O5 Surrender                   | Surrender leaves real gear and exits combat; living identity, source and once-only consequences persist. Captivity remains post-M1. |

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
   Separate accepted surrender work from deferred captivity.
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
      terminal/result/continuation coverage; captivity remains deferred.
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
