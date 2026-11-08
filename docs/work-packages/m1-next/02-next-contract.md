# N02 — Finish the same company's next contract

## Current result — 2026-11-09

DONE / LOCAL, NEXT-1–NEXT-6 pass in the owner's explicit separate continuation of
original **Дозор N01**. Its mill-worker and beast contracts are completed and paid;
fresh response-loss/exact retry, payroll/resupply, actual restart, fresh OIDC and
post-restart recovery action pass. First failed save stays GAME_OVER separately.
Owner steering selects N01, not WLC08's separate first-paid-hunt company; the later
explicit save-branch permission is recorded below. No manual gameplay data edit.
[N01 provenance](01-integration.md).

### Authority, source and reserved paths

Worktree `.claude/worktrees/n02-next-contract`, branch `codex/n02-next-contract`,
base main `87e785d537fc4bf4bbb6856456391015350d235b`; executable source unchanged.
Graph index is old primary sprite7841632a, so discovery uses bounded source reads.
Exact reserved paths: this file, `../M1-LIVING-PLACES.md` (result pointer), and
`../../../CHANGELOG.md` (one entry). No product code change is needed so far.
Local checks/documentation/commits authorized; publication/merge/deploy NOT_AUTHORIZED.

Owner also explicitly allowed QA acceleration: «Разрешаю ускорение. В целом сейчас
для любых тестов можно безопасно использовать ускорение». Only existing guarded
Playground steps are used in isolated `n01_savecopy` and `n02_n01_continuation`; no SQL clock edits. Label
movement/light/upkeep evidence as accelerated; real clock/offline/device acceptance
is not inferred. Original N01 DB `warwrit` and its baseline dump are untouched.

### Owner-authorized separate continuation — 2026-11-09

After the retained failed run was recorded, owner explicitly chose:
«Продолжить отдельную копию исходного N01; поражение оставить отдельным результатом».
Created new DB **n02_n01_continuation** from a read-only dump of original N01
**warwrit**, preserving both original and failed **n01_savecopy**. Restore writes
only the new allocated DB. Source company ID is unchanged, ACTIVE, canonical13,
760 crowns,37 rations, accepted mill-worker. It is an explicit save branch, not a
claim that the failed party recovered or its casualties vanished. The first failure
keeps NEXT-2 FAIL for that run; successful evidence below names this separate continuation.
The intermediate empty n02_independent received migrations and ordinary OIDC only;
no company was created there. No game data from that setup is target evidence.

### Separate continuation: C08 success — 2026-11-09

In **n02_n01_continuation**, repeat C07 through ordinary ASK/INSPECT
(`a4cb31b8-174f-4342-b710-e5d9fe51a047`, `7b4532a8-d696-4f32-8e63-0835bd254f09`).
Naturally create **Помощь N02** through player-two OIDC/company UI, read/accept
the actual helper terms at Frol and physically travel both companies to the mill.
Helper JOIN precedes owner JOIN; no synthetic participant or remote admission.
Actual bridge-v3 battle `eb1fd004-f41e-46d6-a4f2-796b6a08e713` ends at revision115,
round15, first-hunt-companies victory, beast0. No clock steps during combat.
All three N01 members survive. Helper founder and Mora die; helper Rell survives
and is chosen as leader through ordinary UI. Both bindings release, terminal
effects applied. Receipts:62 account,28 system_ai,25 system_timeout.

PICKUP `593d23b3-a770-4b48-b422-5b904476aa02` puts unique claw
`proof.mill-beast.claw.01` in N01's offered supply container, receipt
`a0e200cc-5f4f-4cb7-a90e-6d7bbe7778c1`. RELEASE
`786775bc-0fa0-48b2-8a63-d4f0dd099c6b` commits revision4, both living-release
facts and sole custody of `person.mill-worker.01` to the same N01 company.
SQL confirms source encounter/terminal revision and unredeemed sole custodian.
At that step no payment yet: N01 760, helper800. Journal correctly requires physical return
to Северный Двор; claw requires return to Тихая Гать. Captures:
`output/playwright/n02-{coop-victory,helper-leadership,custody-proof}.png`.
Earlier failed save remains unchanged; this is only the authorized save branch.

### C09: lawful payment, exact retry and next action — 2026-11-09

Physically return via known roads: mill → Тихая Гать inn → Каменный Брод →
Северный Двор elder. Authorized Playground advances shorten travel, with actual
movement POST acceptance awaited before each step. PRESENT claw
`34426412-18ff-45cd-ba9d-a94bdcf01b0f` pays90 once, receipt
`873ebd43-62f6-42a9-a686-0e991fbd9d84`; keeper wallet180→90, N01 760→850.
Global proof claim records sole N01 custodian/redeemer and that receipt; the
physical claw remains present but redeemed, as implemented by current terms.

DELIVER from elder's actual building uses command
`2f2581b2-9449-4b82-a98d-8880630aa7d8`, expectedRevision4. Forward the actual
browser request, observe server200 with rewardQ80000000/revision5, then abort only
its reply. UI reports unknown outcome. Reload: persisted sessionStorage envelope
and “Повторить” survive; board also reads committed completion. Retry through that
button returns original success. CLI network23538/24517 request bodies are exactly
identical, including command/revision; response24517 is original revision5/reward80.
SQL: exactly one matching ordinary receipt, one delivery source, custody[],
SUCCESS, revision5, steward wallet160→80, N01 850→930. No duplicate payout or
person consumption. Helper stays800, no automatic reward.

Subsequent ordinary action at local purse: payroll command
`02c2f23a-2fd8-45af-89e8-990903038cd5` pays actual due40 to living Rell/Kest20 each,
company930→890; each personal purse50→70; due balance0. Fractional next-day claims
remain not yet due. Buy10 real rations at Северный Двор barn for40, command
`9706f606-3d77-4876-a1c3-74d92c5cdb3f`: company890→850, rations31→41,
shop290→280. Previous37→31 consumption is actual accelerated campaign upkeep.
Main roster3 living, no known treatable conditions; wound care NOT_RUN. No policy
for deceased helper payees is invented or exercised. Captures:
`output/playwright/n02-{claw-payment,deliver-reply-lost,deliver-exact-retry,payroll,resupply}.png`.
The retry check's final text extraction hit two `aside` elements after the accepted
response; subsequent network-body readback, screenshot, cleared attempt and SQL
confirm success. This is a diagnostic-selector failure, not an extra payout attempt.

### Restart and post-restart continuation — 2026-11-09

Close both browser contexts and stop own API/web. Capture20 canonical table groups,
restart both processes with unchanged source/config/DB, wait for readiness, and
capture again before any browser observation: deep equality PASS for all20 groups.
`output/n02-continuation-{before,after}-restart.json` and
`output/n02-continuation-complete.dump` preserve that checkpoint. A first readiness
probe preceded the listener and failed; ready log plus next probe confirm startup.

Fresh ordinary Dex logins for both accounts restore: N01 ACTIVE,3 living,
850 crowns,41 rations, Rell/Kest purses70 each, due0, next-day obligations retained;
both contracts completed/paid, custody[], redeemed unique claw. Helper ACTIVE,
Rell leader, founder/Mora DEAD,800 crowns,24 rations and outstanding obligations
retained without invented deceased-payee settlement. Both active encounter bindings
are null, resolved battle115 and admission.effects_applied_at remain committed.
Main's post-restart ordinary SetAssignment command
`9b09924e-ef42-48eb-87b0-de020bcc7e25` assigns Rell RECOVERY; reload retains it and
shows health60→61 under ordinary time, with “Вернуть в строй” available. No QA
steps after restart. Final N01 tick2232: due0, not-yet-due4.64crowns. Helper's
last observation tick2225: due32.87, not-yet-due2.25; no payout was attempted.
Final capture/dump `output/n02-continuation-final.{json,dump}` retained.

Screenshots `output/playwright/n02-restart-{roster,completed,helper}.png` and
`n02-post-restart-rest.png`; actual1440×1000 desktop controls/readability reviewed.
The late recovery probe first used visible text instead of the control's full
accessible name and timed out without a request; observed “Назначить отдых: Rell”
then succeeded. No gameplay fix needed. No human enjoyment/owner-device verdict
is inferred from automated local Chromium evidence.

### Baseline and current acceptance

At the source baseline, normal Dex player-one login restores company `eb855f6f-ab02-42ca-9eef-a82b2c6830bf`,
760crowns,37rations, three living people and accepted mill-worker revision1.
Rell's sword/shield/coat are inherited N01 state. Equip the leader's four items
and Kest's two items through the ordinary UI; all nine carried equipment items
are now equipped. Physically travel via Kamenny Brod and explore toward Tikhaya
Gat; speak to Frol at the inn; discover and enter the actual ruined mill and INSPECT
its yard. No acceptance/encounter/custody fact is supplied by the QA clock.

| Acceptance | Result | Actual evidence on unchanged base executable                                                                                                                                          |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NEXT-1     | PASS   | Owner-selected N01 ID/provenance retained in explicitly authorized separate source-save branch; original and failed saves preserved.                                                  |
| NEXT-2     | PASS   | Current C07 clues → actual co-op kill → unique claw/custody → physical return → both contracts completed. First failed run stays FAIL separately.                                     |
| NEXT-3     | PASS   | Current real SQL: keeper−90/steward−80/N01+170, sole redeemed proof, custody consumed once; fresh lost200/reload/exact retry, one receipt.                                            |
| NEXT-4     | PASS   | Successful API/web restart:20 groups exactly equal before new observations; fresh two-account OIDC confirms casualties, balances, food, obligations, completion and no stale binding. |
| NEXT-5     | PASS   | Ordinary local payroll40 and barn resupply10 for40 succeed after payment; no stale battle binding.                                                                                    |
| NEXT-6     | PASS   | Unchanged executable87e785d5; source/authority, new vs inherited evidence, failures, focused checks and scoped self-review recorded; local commits only.                              |

First failed run's C07 source event commands: ASK `0484af27-bdfb-4e7e-b0bd-fdeb8aefa054`;
INSPECT `46e29715-43bd-468d-b320-f50fbe324952`. SQL readback: revision3,
owner same company, three facts including inherited acceptance, custody[],outcome null.
`output/playwright/n02-n01-{equipped,frol,mill-clues}.png` retain native captures.
N05 owns aggregate coverage; matching leaves are C07/#385 → C08/#386 → C09/#387.
Neither these substeps nor this task close all eight M1 instances.

### Preserved failed night hunt — 2026-11-09

After C07, the same company physically returned to Frol, accepted HUNT-01 for90,
returned to the mill and JOINed at night. Actual encounter
`7266c461-6090-460c-86e0-ad16970659db`, bridge-v3, revision48/round12,
resolved with first-hunt-hostiles winning. All three company members DEAD;
beast still alive150. Terminal effects applied; runStatus GAME_OVER, no living
successor, no active bindings. Cash760; no proof/custody/reward was fabricated.

Author check failure: the implementer expected the v5 single-action chooser,
but it is unavailable in this v3 hunt. Manual commands existed at admission;
the author spent too long investigating instead of maintaining manual control.
The server set AFK and the party died. This failure is not player success or
proof of a product defect. Inspection of `encounters/admission.ts` confirms v3
is explicitly selected for non-wolf hunts; no unsupported ruleset upgrade is made.
The earlier blanket candidate-v5 description does not override actual stored versions.

Keep this actual failed world and `output/n01-defeat-retained.dump` unchanged.
Original N01 `warwrit` remains intact. Owner subsequently authorized the separate
source-save copy recorded above. No rollback of n01_savecopy occurred.
Native failed result `output/playwright/n02-n01-defeat.png`. Actual API/web
stop/start followed by deep equality of all20canonical groups PASS before new
observations (`output/n01-defeat-{before,after}-restart.json`). Ordinary fresh Dex
login → roster confirms all three dead, run ended/new orders closed,760crowns,
37rations,18.24crowns not-yet-due claims, equipment moved to company supply.
Re-entry capture `output/playwright/n02-n01-defeat-reentry.png`. NEXT-2 FAIL for this run; NEXT-3 payout NOT_RUN; NEXT-4
casualty persistence is checked separately from required successful payout continuity.

### Checks, probes and retained resources

Pinned Node24.20.0/pnpm11.25.0; frozen install and shared core/protocol builds PASS.
`pnpm exec vitest run packages/game-core/src/contracts/ordinary.test.ts`:2PASS,
1file, unchanged source. Chromium1440×1000; controls, journal and actual travel
refusals checked. Final scoped Prettier, relative links, diff whitespace and
self-review PASS. No filler code or tests added: no product defect reproduced.
Read-only final assertions PASS after correcting the probe's numeric wallet-column
expectation; its first number-vs-string assertion was a diagnostic error.
CI/full suites/coverage/stress and human/device acceptance NOT_RUN. FPS/heap/capacity
and enjoyment NOT_MEASURED. No application/schema/replay/content version change.

Borrowed N01 project `warwrit-n01-20261108`, PostgreSQL54901/Dex55901; own
API33901/realtime33902/web53901. Run from this worktree with ignored `.env`,
`output/dex.dev.yaml`, `output/compose-network.yaml`; current DB is **n02_n01_continuation**.
Pre-N02 dump `output/n01-before-n02.dump`; read-only canonical capture helper
`output/.tools/capture.mjs`; starting20groups `output/n01-n02-initial.json`.
Normal UI `http://127.0.0.1:53901`; same public fixture player-one OIDC login.

Preserved earlier WLC08 diagnostic: the original `wlc08_final` was found before
owner selected N01. Its player-one company830crowns/Kest DEAD travelled to Kamenny
Brod; its original helper began travel and was stopped through the UI. No clue,
payout, replacement or acceleration in that world. Own WLC08 browser/API/web closed;
its pre-existing PostgreSQL/Dex left running. It is not N02 target acceptance.

Corrected probe/setup failures: wrapper lacked execute bit (invoke with bash),
old WLC08 .env referenced a stopped loss relay (fix only own proxy), marker click
outside its hit disc (use actual disc), initial login/restart readiness races.
An eastbound exploration detour was real and retained; later source-guided physical
exploration discovered the mill without a knowledge/state edit. Stale tile409s
while movement/light revisions changed recovered on normal polling; no product
repair or blanket performance verdict is claimed.

Own browsers/API/web are closed; borrowed PostgreSQL/Dex and all saves/dumps stay
retained. To try: from this worktree use ignored `.env` for the continuation DB,
run `pnpm exec tsx --env-file-if-exists=.env apps/server/src/index.ts` and, in another
terminal, `pnpm --filter @warwrit/web dev`; open `http://127.0.0.1:53901`, ordinary
player-one Dex login → Место/Отряд. Rell rests; return him to duty when ready.
No open blocker to scoped NEXT acceptance. Helper deceased-payee disposition is
outside this task and remains untested; preserve claims and resolve policy before
any settlement. N05 owns aggregate C07/#385, C08/#386, C09/#387 coverage.
Next task: N05 incorporates these scoped results and checks the next uncovered
authored contract; this does not dispatch an agent or claim full M1.
[Common contract](COMMON.md). Launch and subsequent authority supplied in this chat.

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
- Current WLC-08 acceptance and actual retained state; N05 (owner-supplied planning package)
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
- [x] NEXT-2 All objectives of its next contract finish from normal entry with
      actual observations, combat/custody and return where required.
- [x] NEXT-3 Proof/claim/reward are lawful and once-only; helper terms and unique
      ownership hold, including the relevant refusal or retry.
- [x] NEXT-4 Actual casualties, food, money, payroll/obligations and task outcome
      persist after API restart and ordinary login; no stale encounter lock.
- [x] NEXT-5 The player can perform a lawful subsequent action and understands
      whether the next available choice is work, recovery, resupply or a refusal.
- [x] NEXT-6 Scoped fixes, source ownership, checks and inherited-vs-new evidence
      are recorded. A successful next contract does not close all eight M1 instances.

## Verification and unresolved inputs

Ordinary two-account browser where required; focused server/SQL for any changed
payout/custody transaction; UI checks for actual refusal/retry defects.
Unsupported source policy blocks its branch only. If the genuine target becomes
unavailable, record the real result; use another naturally reached test world for
success coverage, preserving both. No forced-win battle or SQL health repair.
