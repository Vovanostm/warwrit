# N02 — Finish the same company's next contract

## Current result — 2026-11-16

IN_PROGRESS / LOCAL. Both naturally reached companies physically joined HUNT-03
at Old Mill. The native battle ended at revision 135/round 16 with all six allied
fighters dead and all three hostiles standing. No manual battle order was sent
before timeout handling took over. Terminal company effects still await the
no-successor path, which is under diagnosis. The failed source state is retained.

A consistent backup captured before JOIN is restored into the separately owned
`m1_restore_current_20261116` database for R5 and continued control checks. Its
provenance and later divergence are recorded in N11. The contract objectives,
payment and manual-control acceptance remain open.

### Earlier restore checkpoint — 2026-11-15

IN_PROGRESS / LOCAL. T002 provenance is established on the owned restored N02
copy in `codex/m1-completion-20261115`. Company
`eb855f6f-ab02-42ca-9eef-a82b2c6830bf` (Дозор N01) belongs to the original
local fixture account in `world.porechye.atlas-v1`. The retained N02 final dump
was restored into the isolated `warwrit-m1-20261115` resources. The ordinary
mill rescue is completed/paid and HUNT-01 is completed in the restored state.

The next lawful action was resupply through Severny Dvor's Granary. Its original
food refusal preserved revision 178, 850 crowns and 41 rations. Under the owner's
November 15 recovery decision, the same company bought one ration for four crowns
through the ordinary interface. Canonical readback at revision 182/tick 28510
records 41 consumed rations, 36020 unfed person-ticks, 81 recovery food records,
one newly purchased ration, and merchant stock 279/cash 84 crowns. Company cash
is 846 crowns. Later opened food appears as funded coverage rather than a closed
ration stack; the independent browser observed 0 rations with 0.5 days remaining.

A second executor logged in normally, inspected the same three people,
equipment and paid contracts, then used «Разбить лагерь» and «Свернуть лагерь».
Both commands were confirmed. Treasury remained 846 crowns, equipment remained
visible and Rell's health advanced from 78/100 to 89/100. Retained screenshots
and snapshots are `output/playwright/r5-recovery-*`. NEXT-1 passed through the
retained company. NEXT-2–NEXT-6 remain open for the next newly selected contract.

## Player goal and normal journey

### Native continuation checkpoint — 2026-11-15

After the recorded training and resupply journeys, the same retained company
accepted «Пропавший разведчик» for 80 crowns and HUNT-03 «Знамя Харитона Обуха»
for 100 crowns through the Kamenny Brod issuer controls. The scout objective is
to search the bank at Тихая Гать and return Ивашка to the issuer. The hunt owner
must reach the Old Mill yard. Neither new reward has been claimed.

An independently created helper company, «Дозор помощника», belongs to account
`62254143-e21c-4178-aecb-b5199bf8ae94` and has company ID
`2a5ab48d-29c3-49d5-8bf7-526c7bd351bc`. It was created through ordinary login
at Severny Dvor with three living members, 800 crowns and 27 rations, then
travelled to Kamenny Brod and accepted the voluntary HUNT-03 helper slot.
Readiness and battle admission remain pending. The owned local Dex configuration
received a third test identity, retaining its existing clients and identities.

The older helper company remains unchanged at Old Mill with one living member,
two dead members and no rations. Its departure refusal is retained evidence.
The fresh helper does not replace that saved state. The fresh helper's direct
Old Mill route was refused because the intervening terrain was unexplored.
A normal nearby movement order was subsequently accepted at the visible frontier.
No route geometry or resources were granted.

The retained owner stopped its Old Mill route using the native S control.
The accepted STOP preserved terrain position and movement epoch 34. Reload
retained «Отряд остановился в местности». A new ordinary right-click on the
Old Mill marker then started movement from that position. Treasury remained
398.71 crowns. The battle, separate control rights, loot and new payouts remain
NOT_RUN in this continuation checkpoint.

Keep a surviving company viable beyond the first reward. Continue its actual
money, casualties, equipment, debts and accepted task. From ordinary login:
inspect journal → meet the real issuer → follow available mill clues →
complete the permitted hunt/rescue chain → physically return proof/person →
lawful payout → upkeep/payroll as applicable → restart → same company.

Observable outcome: the company completes its next existing contract and can
choose another action. Shortest trial: open that saved company, read its accepted
mill objectives and perform the next lawful objective through the normal UI.

## Sources and dependencies

- N01's recorded usable integration; existing issues#368/#370/#177.
- [M1](../../wiki/m1-spec.md), [Porechye](../../wiki/world/porechye.md),
  [authored contracts](../../content/CONTRACTS_M1_DERIVATIVE.md),
  [living-place issuer visits](../M1-LIVING-PLACES.md).
- Current WLC-08 acceptance and actual retained state; [N05](05-contracts.md)
  owns aggregate contract coverage, not a second version of mill rules.

Access to someone else's stand is not implied by these specs. If unavailable,
record SAME_COMPANY criterion NOT_RUN and independently exercise a naturally
created isolated company. Do not replace it and claim retained continuation.

## Choices, failure and saved consequences

Player may prepare more supplies, recover a member, decline helper terms, defer
the night objective or retreat when legal. Only source-backed accessible clues
advance objectives. Actual dead/missing/unavailable targets produce their accepted
failure/refusal, never a fabricated captive/trophy. Incomplete proof never pays.
Unknown outcome offers exact retry/readback; it does not repeat a changed request.
Physical helper presence and consent remain required where applicable. No second
reward is inferred for the helper. Save task facts, custody, proof ownership,
receipts, casualties, balances and released encounter bindings together as owned.

### Incomplete weapon-pair JOIN feedback — 2026-11-16

Player goal: join an already-consented FIRST HUNT battle and understand a refusal
caused by the requesting company's own incomplete equipment. Normal path: a helper
records JOIN consent, then the owner sends the completing JOIN from the contract
interface. If an eligible fighter in the requesting company's field party has an
enabled weapon whose catalogue definition requires an enabled OFF_HAND item, and
that item is missing, refuse activation with `INCOMPATIBLE_ACTIVITY` plus the
optional `INCOMPLETE_WEAPON_PAIR` reason. The browser explains the missing required
equipment only for that reason; other `INCOMPATIBLE_ACTIVITY` replies keep the
established generic text.

The check reads only the requesting company's eligible party and canonical
catalogue definitions. It does not inspect a partner's equipment. Unarmed fighters
remain eligible, and no combat or loadout rule changes. On refusal, preserve JOIN
intent, contract revision, company state, balance, items and the owner's receipt
absence so the same request can be retried after preparation. The observable
outcome is either the precise refusal or normal admission after the requesting
party is unarmed / has its required item. The route regression now checks these
saved-state effects with a disposable PostgreSQL database.

Checks: server/web typechecks, protocol/game-core builds, focused UI/helper tests
(18 passed), targeted ESLint, Prettier and `git diff --check` passed. The
disposable PostgreSQL route regression passed (1 passed; 28 unrelated cases
skipped), including exact retry with the same command after removing hand gear.
A prior run's OBSERVE payload assertion failure was not reproduced by the current
focused UI test run. This is LOCAL route and response-mapper evidence; a native
browser/player admission journey was not run and remains separate from N02's open
contract objectives.

## Implementation boundary

IN: smallest reproduced blockers in the existing journal/issuer/contract/travel/
encounter/custody/payout path; record a complete ordinary continuation.
OUT: a new mission, rewritten manuscript, synthetic helper, new reward or
unapproved outcome, debug-only completion, broad new service/learning systems.
Existing server contract executor composes trusted game-core effects and one
transaction; web displays authorized observations, not locally completed steps.

Candidate scope: `apps/server/src/contracts/`, narrowly required encounter/world
adapters, `apps/web/src/game/ContractBoard*` and issuer/journal consumers,
matching protocol/core contract files and public-boundary tests.
Reserve exact files after reproducing the gap; hand wider policy changes to
their owner. Preserve receipts and historical content/replay definitions.

## Work plan

1. Confirm candidate and saved company provenance, task/party/conditions and next objective.
2. Read that objective's actual guards/source; state success, refusal and retry.
3. Try the ordinary step. Fix only a reproduced missing consumer/feedback defect.
4. Continue clues → hunt → delivery in source order; preserve real losses.
5. Exercise actual proof/payout, then one lost accepted reply/exact retry if not
   covered by unchanged current evidence; no duplicate payout or source consumption.
6. Continue upkeep/recovery/payroll as applicable, restart/re-enter and compare
   relevant saved facts through authorized reads.
7. Link resulting coverage to the matching N05 leaf; commit and report remaining gaps.

## Acceptance / DoD

- [x] NEXT-1 The identified retained company is continued without state edits,
      reset, replacement company or fabricated prerequisites.
- [ ] NEXT-2 All objectives of its next contract finish from normal entry with
      actual observations, combat/custody and return where required.
- [ ] NEXT-3 Proof/claim/reward are lawful and once-only; helper terms and unique
      ownership hold, including the relevant refusal or retry.
- [ ] NEXT-4 Actual casualties, food, money, payroll/obligations and task outcome
      persist after API restart and ordinary login; no stale encounter lock.
- [ ] NEXT-5 The player can perform a lawful subsequent action and understands
      whether the next available choice is work, recovery, resupply or a refusal.
- [ ] NEXT-6 Scoped fixes, source ownership, checks and inherited-vs-new evidence
      are recorded. A successful next contract does not close all eight M1 instances.

## Verification and unresolved inputs

Ordinary two-account browser where required; focused server/SQL for any changed
payout/custody transaction; UI checks for actual refusal/retry defects.
Unsupported source policy blocks its branch only. If the genuine target becomes
unavailable, record the real result; use another naturally reached test world for
success coverage, preserving both. No forced-win battle or SQL health repair.

### Native owner/helper attempt — 2026-11-16

The helper's ordinary route reached the east bridge and Old Mill after the
marker hit-area correction and known-route search. Both parties had three living
field members, and the helper accepted JOIN first. Owner JOIN initially returned
NOT_AVAILABLE because Rell retained a sword after his shield was sold. A
rollback-only diagnostic located the existing sword/shield projection requirement.
The diagnostic committed no admission or state changes.

The owner travelled normally to Kamenny Brod, bought 20 rations for 80 crowns
(318.71 crowns remained), and transferred Rell's sword into the caravan through
the ordinary item controls. This retained ownership and enabled the existing
unarmed combat profile. The return to Old Mill and JOIN were accepted normally,
with contract revision 4 and encounter `b8df737c-e46e-443a-852b-6447258f592f`.
QA time advancement shortened travel waits.

The first projection showed three controlled owner units and six other units;
the helper saw its separate three units. Later private-grant refreshes showed
zero controls during other actors' turns. The runners spent the human deadlines
inspecting and coordinating instead of sending orders. The battle proceeded via
timeout handling and ended in defeat, with six dead and zero fled/surrendered.
Manual control and victory were not demonstrated. The original outcome and its
pending company consequences remain intact. Evidence includes
`output/playwright/m1-original-defeat-20261116.png` and the matching snapshot.

The equipment refusal now states the actual shield requirement and the existing
caravan-transfer alternative. Its own-company check also covers available FIELD
or RECOVERY members admitted under the current immobility rules. Parent server/web typechecks and 18 focused tests passed after the correction.
Prettier and scoped diff checks passed. LOCAL.

### Original defeat settled — 2026-11-16

The original attempt above has now settled through the normal terminal worker.
The guard-service offer read had advanced the bound helper by one tick, and the
terminal producer incorrectly used its current revision as admission evidence.
The prevention and retained-state correction are recorded in [N08](08-battle-outcomes.md#bound-clock-and-retained-terminal-recovery--2026-11-16).
Both original companies are GAME_OVER with all six deaths preserved and no
remaining encounter binding. The terminal acknowledgment is revision135, applied
at 2026-11-16T01:29:08.530Z. NEXT-2–NEXT-5 are still open. Success coverage will
use the explicitly separate pre-battle restored copy, retaining this failed
attempt as actual history.
