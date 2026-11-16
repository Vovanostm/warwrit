# N08 — Terminal battles release the company and preserve truth

## Current result — 2026-11-16

PARTIAL / LOCAL. Recorded defeats preserve their actual casualties and release
their bindings. The restored companies continued through paid quests, property
recovery, trade and safe-camp rest. Their latest retry ended with all four
remaining fighters dead after the client lost usable battle control. Both
companies are now GAME_OVER. The dated result below owns that failure and its
follow-up. Hostile escape and successful ordinary hunt continuation remain open.

## Native control loss and fourth defeat — 2026-11-16

FAILED / LOCAL. Before retry, ordinary UI confirmed all three owner fighters
and the one surviving helper at 100/100 health and 50 morale, FIELD duty and
equipped weapons. The owner had 27 rations, the helper 4. The accepted ordinary
JOINs created 0fb84685-22e9-4e9c-871e-cd281d3e74be at tick 98500 against the two
retained healthy raiders. The owner JOIN command was
c63f2c48-8f13-42fe-8705-5c220122758b.

The clients repeatedly displayed zero controlled units and lacked command
controls. A read-only call through the existing readEncounterAccess boundary
returned valid correctly scoped grants for both accounts, with selfAfk true.
Public state kept advancing while private grant requests became obsolete.
The parent temporarily SIGSTOP-paused its verified API PID 28040 during the
client correction, then SIGCONT-resumed that same process. The initial sandbox
signal failed with operation-not-permitted; the explicit escalation succeeded.
No canonical state or deadline was edited. The wall clock continued advancing.

The first client correction and normal reload briefly restored controlled-unit
counts and resume buttons. Neither account obtained a usable accepted battle
action in this retry. Resume requests and unattended wait/hostile actions
continued. The final server-side projection handoff correction followed the
terminal result, with its separate checks recorded in N09.

The battle resolved at revision 133, round 23. All four allied fighters were
canonically dead and both hostiles remained active at 60/60. The terminal worker
applied those consequences. Read-only roots confirmed both companies GAME_OVER,
zero living active members and no encounter binding. An earlier inference from
disappearing initiative entries suggested retreat; the canonical terminal state
corrects that inference to death. This is another failed verification journey.
The previous saves, losses, paid quests, receipts and property records remain
retained. Native victory, N1, OUT-3 and full M1 acceptance stay open.

## Scope reconciliation — 2026-11-13

The November 9 owner answer requires S4 panic/surrender in campaign combat.
An incapacitated fighter lies down and skips turns for the remainder of the
battle. [M1-CAMPAIGN-BATTLE](../M1-CAMPAIGN-BATTLE.md) owns that accepted scope.
O5's remaining captivity/property-policy questions must be assessed separately
from the accepted tactical surrender behavior. Carrying wounded follows M1.
Fresh executable and terminal-path checks in this reconciliation are NOT_RUN.

## Earlier implementation checkpoint — 2026-11-15

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

### Leadership-choice regression — 2026-11-15

The focused terminal-evidence test now resolves a deterministic battle with the
company leader dead and a paid companion retreating alive. It verifies that
finalization waits for the player's choice, restores the companion's verified prior
presence, then applies their permanent succession using the existing membership and
wage account. It checks the saved leader death, released binding, one completed
encounter and idempotent finalization retry. This is constructed-source regression
evidence, not native campaign acceptance; SQL, browser continuation and native
leadership remain NOT_RUN. A household-only successor still requires real
service-terms evidence.

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

### Bound clock and retained terminal recovery — 2026-11-16

LOCAL on `codex/m1-completion-20261115`. The native HUNT-03 defeat exposed a
persisted one-tick helper advance after admission. Its last company receipt
identified `GuardServiceOffer` at revision145. The binding and its initial root
were at tick80988, while the helper's lifecycle, finance and physical state were
at80989. The first battle command was also at80989. The terminal worker kept
rejecting practice evidence and retained both company bindings.

The shared stationary catch-up now refuses active encounters before reading the
clock or settling movement. The guard-service GET keeps its read-only bound
view and skips offer creation. Terminal evidence derives journal requests,
practice and consequence facts from the stored admission root and its bound
revision. Actual applications still consume the current retained root and its
processed clock. Existing monotonic receipt-time and exact replay checks apply.
The correction preserves the earlier food/finance advance, without charging its
interval twice or rewinding the save. No released replay or migration changed.

The actual worker applied terminal revision135 at 2026-11-16T01:29:08.530Z.
Both original companies reached tick81005 and GAME_OVER, with three deceased
characters each, no IN_ENCOUNTER members and no active binding. The owner now
has two completed encounter records, the fresh helper one. All six deaths and
the hostile victory remain. Original-save victory and subsequent work are
unavailable because these two companies ended.

Checks performed on the scoped source are seven terminal-evidence tests,
including a real economy catch-up followed by settlement and exact finalization
retry, and the separate no-write bound-catch-up regression. Server typecheck,
Prettier and scoped diff checks passed. The actual PostgreSQL readback confirms
binding release and the terminal acknowledgment. An initial diagnostic selected
an absent acknowledgment column, then the read was corrected to the actual
`effects_applied_at` field. Full suites and native surrender are NOT_RUN.
Performance and human acceptance are NOT_MEASURED. T007 remains open for the
other required native outcomes. Continue success-path checks on the separately
restored pre-battle database recorded by N11.

### Restored native surrender and continuation — 2026-11-16

Encounter `77ac1437-4895-4954-b2ed-528e65bf6fb7` resolved at revision 66,
round 7. Its terminal effects applied at 02:09:09.391 UTC. Read-only PostgreSQL
inspection confirms three surrendered allies, one retreated ally and two dead
helper companions. Both companies have `active: null` and run status ACTIVE.
The retained journal has fourteen account commands, including primary manual
orders from both accounts and one-action autoplay. Timeout commands and stale
reconnects also occurred. The later flee attempt sent no command before resolution.

The owner's two surrendered fighters left five equipped items in two world-
custodied ground bundles at Old Mill. Its retreated Kest retained his two items;
Rell's previously stored sword stayed in the caravan. The helper's surrendered
leader left four items in a third ground bundle. Its deceased companions' five
items remain in two world-custodied corpse containers at Old Mill. Source item
IDs and company ownership are retained. Personal wallets were not moved.

The ordinary company view shows surviving members without the surrendered gear
in their hands. Its retained non-carried items use the corrected heading from
N06. Owner travel, scout delivery, camp/rest, FIELD return and camp closure
succeeded afterward. The helper travelled back to the bodies, observed its death
wage claims, and returned to town. Its kin payment currently reveals a separate
carried-purse access defect tracked in N04. Full OUT-3 and fresh native combat
with the later accepted-revision UI gate remain NOT_RUN. These results preserve
both defeats and do not establish native hostile escape or victory.

### Separate fresh QA defeat — 2026-11-16

The development-login Wolf Trail attempt
`dd0da47c-a03e-457c-9e0f-2278245b7837` in the isolated control-sync database
ended in round 15 with six allied deaths and three surviving wolves. The
parent's controller expired before the helper's JOIN completed, and subsequent
coordination did not restore continuous control. No account battle action was
accepted. Preserve this failed save. [N09](09-player-experience.md#fresh-qa-attempt-and-controller-coordination-failure--2026-11-16)
owns the controller failure and the pending persistent-driver check. Native
victory, hostile escape/retry and final control verification remain open.

## T007 outcome-composition completion — 2026-11-16

COMPLETED / LOCAL for T007. The integrated editor/replay evidence retains all
three side identities after middle is eliminated and north/south continue
(revision 330). The restored native campaign battle records three surrenders,
one retreat and two deaths; both companies remain ACTIVE and their bindings
are released. Surrendered equipment remains in its real ground bundles; actual
retreat/death policy and item identities are preserved. The separate original
six-death defeat retains both companies GAME_OVER with released bindings.

[N11 R2](11-durability.md#current-status--2026-11-16) supplies the real PostgreSQL
pending-outcome/rollback/restart/worker evidence, permanent successor wait,
once-only application and release. The constructed leadership preparer above
adds deterministic policy evidence. Together these cover T007's side history,
continuation, terminal effects, leadership and release requirements. This does
not turn R2 into R5 or infer native control acceptance from the editor.

OUT-3 still needs an actual native hostile escape followed by ordinary retry.
Fresh MULTI-7 campaign continuation after the UI revision gate remains under
T010; native hunt victory/proof/payment remains under T014. N08 is PARTIAL.

## Own-property recovery after combat — owner decision 2026-11-16

After its battle has ended, a company physically present at the dropped items
may recover its own property, including while living enemies remain at that
place. This follows the owner's explicit answer in the implementation chat.
Surrender still drops equipped gear into the actual world bundle, and recovery
moves the existing item to an authorized carried container. Ownership,
condition, source and quantity remain attached to that item. Existing authority
checks handle other people's property, remote access and active encounters.
LOCAL implementation now uses ordinary TransferItem with source-only local
world containers. Native pickup and reload returned Dozor's existing sword,
shield and helmet at Old Mill while the hostiles remained alive. Focused checks,
compatibility and remaining campaign work belong to
[N06](06-company-capabilities.md#returning-owned-equipment--owner-decision-2026-11-16).

## Fresh native retry and effect recovery — 2026-11-16

PARTIAL / LOCAL. After normal recovery and equipping of both founders' existing
swords/shields, both companies submitted HUNT-03 JOIN through the visible cards.
The first simultaneous attempt left the owner ready and the helper unconfirmed.
A fresh helper click admitted the two companies. The browser runner then used
seven visible one-action autoplay clicks, one available manual defend and
one request to resume control. Automation supplies agent/browser evidence. Human tactical acceptance remains
NOT_RUN.

Encounter `36dc7e1a-a73e-43b6-aa12-9d7a96d7c83c` resolved in round 3 at revision 24.
Its durable commands contain four flee actions, one defend, two moves, nine waits
and eight attacks. Four allies retreated, Ratko died, and the hostile heavy-weapon
raider died. Two hostile raiders remain alive. The hostile side won. The four
retreating fighters retained low tactical morale (10/14/14/16) from prior saved
outcomes. The parent checked health and equipment but overlooked that morale
before this retry. This attempt is a further defeat, with its actual consequences
preserved. The owner subsequently accepted fed safe-camp recovery at 10 morale per day
up to 50, recorded in N06. Its implementation is in progress.

The terminal result initially retained pending effects because the helper's
first defense practice failed under the physical residual. The correction and
native automatic recovery are recorded in
[N11](11-durability.md#native-retry-pending-on-first-skill-practice--2026-11-16).
Both company effects now apply and release their bindings. Both remain ACTIVE.
The saved finite diagnostic input is
`output/m1-native-third-pending-state-20261116.json` (mode 0600).
The UI driver evidence is `output/m1-two-player-controls-20261116.jsonl` and
`output/m1-two-player-controls-summary-20261116.log`. Effects are APPLIED. Hunt payment, gear pickup and subsequent
continuation remain NOT_RUN for this attempt.
