# N02 — Finish the same company's next contract

## Current result — 2026-11-15

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
