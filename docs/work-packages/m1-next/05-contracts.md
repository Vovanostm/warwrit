# N05 — Existing eight-contract and eleven-scene coverage

## Scope reconciliation — 2026-11-13

The existing C01–C09 matrix covers the original eight instances and eleven
scenes. The November 9 owner decision raises the full M1 target to at least
twenty quests with four moral choices. Aggregate quest acceptance belongs to
[M1-QUESTS](../M1-QUESTS.md), which reuses this matrix's demonstrated results.
New quest premises and consequences need approval through the writing/design
workflow. Ordinary withdrawal/payment/trophy behavior follows
[M1-CONTRACT-TERMS](../M1-CONTRACT-TERMS.md); FIRST HUNT retains its own policy.
Fresh gameplay checks for this reconciliation are NOT_RUN.

## Current result — 2026-11-17

COMPLETED / LOCAL for T031; the accepted living-rescue matrix now has its final native mill delivery,
reload and exact-retry evidence. C01 uses N02's genuine HUNT-03 terminal,
standard and once-only 100-crown return. C02 reuses unchanged WLC-08 evidence.
C03–C06 have native paid journeys and focused authenticated refusal, privacy,
custody and replay checks below. Fresh C07–C09 records both clues, a real
six-survivor beast victory, source-bound claw, living Senka, both physical returns
and 170 crowns paid once in total. The three original rescue death/report
branches follow the owner's after-M1 task below. RC-GAP-MACHINE-01 retains its
original source-archive limitation. Human acceptance remains with T027/T036.
[Common contract](COMMON.md). [Prompt](prompts/05-contracts.md).

## Original rescue scope — owner decision 2026-11-17

The owner moved death of Demyan, Ivashka and Senka and reports of their death to
the task after M1 below. C05/C06/C09 acceptance covers living rescue, custody,
delivery and payment. The three unproduced death-report slots are deferred from
T031. The four accepted moral-choice quests retain their defined consequences.
The older dated records preserve the former gaps and their source limitations.

## Death of rescued people and reports after M1

- [ ] Define and implement actual death events and observer-grounded reports for
      Demyan, Ivashka and Senka after M1.

Start by agreeing with the owner which events can kill each person and how an
observer can discover and report that death. Then connect canonical transitions,
custody and quest outcomes, apply the accepted reward/refusal policy, and check
saved knowledge, exact retry and re-entry. The task is complete when the approved
events and truthful reports work through normal game controls. Current runtime
producers for these deaths remain unimplemented. The archive limitation stays
with its original owning record.

## Player goal and normal path

Find authentic work through actual local people/places, understand terms, choose
to accept/help/defer, investigate or fight, return actual proof/person, and receive
one lawful result. Shortest trial: ordinary company → a real local issuer →
one existing contract → its physical objective → issuer hand-in → journal/re-entry.
The aggregate outcome is every required M1 instance/scene and supported branch
usable with persistent company/world consequences.

## Canonical sources and dependencies

[M1 scope](../../wiki/m1-spec.md), [Porechye](../../wiki/world/porechye.md),
[authored definitions](../../content/CONTRACTS_M1_DERIVATIVE.md),
[local visits](../M1-LIVING-PLACES.md), [writing](../../wiki/world/writing.md),
[world text](../../wiki/world/index.md); current executor/proof/custody definitions.
N01 supplies an integrated base. N02 evidence can satisfy matching rows.
N08 supplies accepted terminal policy when an encountered branch requires it.
Do not make all of N08 or unrelated story lab PR336 a blanket prerequisite.
The separate B4 «Кто выдал тайник» and its unset payment are not silently added
to the accepted eight. No old source ZIP catalogue reconstruction.

## Leaf work and scenario order

These nine leaves cover eight instances and eleven scenes, not nine contracts.
Actual IDs and prerequisite facts come from the current authored definition.

| Leaf / existing issue | Result and mandatory special case                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01/#379              | `HUNT-03` — «Знамя налётчиков»: actual eligible battle source → unique standard → lawful bearer → one payout; no proof from an ineligible terminal outcome |
| C02/#380              | `HUNT-02` — «Волчья тропа»: real hunt → pelt pickup/capacity → return → once-only payment; reuse unchanged WLC-08 coverage                                 |
| C03/#381              | `INVEST-01` — «Следы на дороге»: available actual observation → truthful report; no remote or fabricated observation                                       |
| C04/#382              | `INVEST-02` — «Пропавшие травы»: actual daytime inspection and both required clues → report; missing/night-time access does not invent findings            |
| C05/#383              | `RESCUE-01` — «Спасение из погреба»: actual living captive → release/custody → physical delivery and payment; source dependency C01; death branch after M1 |
| C06/#384              | `RESCUE-02` — «Потерянный разведчик»: lawful discovery/custody → actual live delivery and payment; death branch after M1                                   |
| C07/#385              | `MILL-01` / `MILL-02`: source-backed beginning and two real clues; stop before inventing night-beast eligibility                                           |
| C08/#386              | `HUNT-01`: source-eligible night hunt → real terminal/proof; after C07                                                                                     |
| C09/#387              | `MILL-03` / `MILL-04`: actual worker release/custody → live delivery and final accepted result; after C08                                                  |

Execute C07 → C08 → C09. Do not require full worker delivery before its own
night-hunt prerequisite. Other independent ready leaves can run serially.
For each leaf record: issuer/scene, acceptance terms, every material player
choice, trusted prerequisites, success, refusal/failure, retry and saved effects.
A branch matrix lists all reachable authored alternatives; do not sample away
an exposed failure branch. Reuse unchanged evidence rather than fabricate new runs.

## State, architecture and implementation boundaries

Proof follows real source → accessible evidence → current lawful bearer →
unique claim → one funded payout. Witnesses know only their established facts.
A dialogue button never creates a captive, combat victory, item or hidden truth.
Journal is an observation of accepted work/facts, not a remote issuer or payoff.

Contracts own instance/scene state and receipts; company owns people/money/items;
world/encounter owners provide trusted presence/terminal facts. Commit actual
custody/proof/reward effects atomically at their existing authority boundary.
Keep stable IDs, content versions, released replay and existing funded rewards.

Candidate paths: existing server `contracts/` and directly required encounter/
custody adapters, existing core contract preparers, web ContractBoard/HuntList/
PlaceActivity/issuer visits and i18n entries. Reserve exact paths per leaf;
never rewrite the entire authored catalogue or add a generic scripting engine.
New art only for an actual missing accepted asset, under graphics/lore rules.
No new reward amount, NPC, battle archetype or hidden outcome is approved here.

## Ordered implementation plan

1. Join source instance/scene IDs to existing API/UI and prior evidence. List
   missing behavior vs missing evidence; select one ready leaf and exact paths.
2. Write that leaf's actual branch table before code; read owning guards/facts.
3. Try the ordinary path; fix the smallest missing rule consumer or player blocker.
4. Exercise its authored success and failure/refusal branches in naturally reached
   disposable worlds; preserve any failed retained run.
5. Exercise physical helper participation where required, private findings,
   proof/custody and once-only payment, with exact retry for changed money paths.
6. Reload/restart, link evidence to the leaf and commit its coherent correction.
7. After all leaves, reconcile eight instances/eleven scenes and required art/
   content provenance on the same compatible integrated build.

## Acceptance / DoD

- [x] CT-1 Exactly the accepted eight instances/eleven scenes are mapped to
      existing definitions and all reachable source-backed branch criteria.
- [x] CT-2 Every leaf succeeds through ordinary entry with actual issuer,
      location/time/knowledge, combat or custody, proof and final result.
- [x] CT-3 Each exposed material alternative/refusal/failure has truthful feedback
      and accepted saved consequences; no unsupported successful placeholder.
- [x] CT-4 Required owner/helper presence/consent and observer privacy hold;
      living-rescue rewards require their actual source/custody, and ineligible
      proof cannot produce a reward. The three death branches follow the after-M1 task.
- [x] CT-5 Unique ownership/custody, funded one-time payout and exact retry survive
      reload/API restart. Relevant competing-claim risk has real SQL evidence.
- [x] CT-6 Required four reusable backgrounds, six portraits, two trophy images,
      three enemy archetypes and the mill chain have source/licensing and actual
      integrated-use evidence; asset counts alone do not accept presentation.
- [x] CT-7 Matrix distinguishes author evidence/new run/inherited unchanged proof;
      no B4 expansion or unrelated story/engine work enters the diff.

## Acceptance evidence reconciliation — 2026-11-17

| Criteria   | Evidence and provenance                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CT-1, CT-7 | Existing C01–C09 table owns eight instances/eleven scenes. [T035 reconciliation](../M1-QUESTS.md) retains source IDs. C02 reuses unchanged WLC-08 evidence. The dated sections identify each new native journey and each isolated SQL fixture.                                                                                                                         |
| CT-2       | C01 uses [N02's native completion](02-next-contract.md#native-hunt-03-completion--2026-11-16). C03–C06 have native paid paths below. C07–C09 use the fresh matrix mill journey and final saved delivery below.                                                                                                                                                         |
| CT-3, CT-4 | Authenticated road/herbs/cellar/scout/mill tests below exercise unavailable evidence, wrong place/time, privacy and holder-only custody/payment. Mill native HELP and JOIN retain actual consent/presence. [N08](08-battle-outcomes.md) owns actual no-proof/escape/retry SQL evidence. The three unimplemented death/report sources follow the owner's after-M1 task. |
| CT-5       | The leaf SQL cases and native reloads preserve funded exact-once results. Final mill readbacks and exact replay preserve worker revision 5, five ordinary receipts and both company states.                                                                                                                                                                            |
| CT-6       | [M1-QUESTS](../M1-QUESTS.md) records T035's four backgrounds, six portraits, two trophy images, three archetypes and source/licence/integrated-use mapping. The native mill path now demonstrates its full integrated chain.                                                                                                                                           |

The scoped self-review checked the owner decision, final delivery/replay readbacks
and unchanged evidence against CT-1–CT-7. No new source catalogue, asset batch or
extra gameplay rule was introduced. T031 is complete locally. T027/T028/T036,
N08's separately specified native hostile-escape case and human acceptance keep
their own status. Game tests for this documentation closeout are NOT_RUN.

## Checks and unresolved policy

Focused changed contract tests, real SQL for custody/claim transactions, ordinary
browser scenes, wording/lore checks for changed text. Mark absent human/device
evidence separately. Missing accepted custody/target policy blocks that leaf;
continue ready leaves. Unsupported surrender is not fixed by minting hunt proof.

## Mill clue eligibility and hunt refusals — 2026-11-17

The approved MILL-02 manifest also permits an independent lawful night-threat
observation. This branch now uses the ordinary worker contract on fresh offers.
The player accepts a fresh worker rescue, reaches the mill yard at night, inspects
the living beast and retains the observation. The saved observation reveals the
hunt without the track/report pair. Wrong place, daylight and an absent living
target must refuse without a saved finding. A lost response uses the ordinary
exact retry. Rescue/delivery retain their existing pair requirements. The simplest
trial is the new night inspection at the actual mill yard on that fresh offer, followed by reload
and the hunt offer. Previously accepted offers keep their saved steps. Legacy
accepted saves without stored terms retain the existing profile-hydration path.

LOCAL. The authenticated PostgreSQL case in
`apps/server/src/contracts/ordinary.mill-eligibility.integration.test.ts` uses
actual ACCEPT/HELP/STEP commands. Zero clues, one clue and clues split between
two companies keep HUNT-01 hidden. Both clues recorded by the same company
unlock it. Daytime JOIN and pre-terminal PICKUP refuse, preserving the company
snapshot/revisions, receipts, proof claims and hunt wallet. Travel is fixture
setup in this test. No terminal result, beast death or successful proof is seeded.

The isolated per-file PostgreSQL case passes 1/1 and its database was disposed.
Scoped ESLint, server types, Prettier and diff checks pass. The final additional
zero-clue assertion was rerun with PostgreSQL and formatting. Native C07–C09
continuation remains in progress on the preserved QA matrix world. The three
death-report producers follow the owner's after-M1 task. The living delivery is now recorded below.

The new `ordinary.mill-night-observation.integration.test.ts` passes 1/1 on an
isolated per-file PostgreSQL clone. It checks wrong-place refusal, daylight and
no-living-target refusals, the actual authenticated night STEP, saved unlock after
app recreation and exact command replay. The latter two refusals preserve the
company snapshot and receipts, and the no-living-target case preserves the facts.
The cleared-hostile state is an explicit negative test fixture. No proof or trophy
claim is seeded. This fresh-offer test remains separate from the native QA3
contract accepted before the new inspection was available.

Core ordinary tests pass 21/21. Core build/types, server/web types, scoped ESLint,
formatting and diff checks pass. Initial missing-environment, acceptance-fact and
JSON-fixture assertion failures were corrected before the successful SQL run.
Parent review corrected the finding-key prefix and retained exhaustive gate input
types. The new finding uses the existing UI lookup. The complete root production
build passes, including `index-CFWbcjwC.js`; its log is
`output/m1-integrated-build-night-observation-20261117.log`. Native continuation
is recorded below. Death-report rules follow the owner's after-M1 task.

### Native mill continuation checkpoint

The retained QA matrix world has no reset or repaired gameplay state. QA3
accepted the worker contract at Северный Двор (`2f234ce6`), inspected the actual
mill yard (`a124f1ab`) and reached Фрол through normal scouting and travel. The
keeper STEP `7a84efe7-9e16-4ac0-82f3-3319e237fb0c` succeeded at revision 3 and
showed the human report. QA3 accepted HUNT-01 at Gat through
`f9de0cbb-6bb7-4c8c-a057-9ecef2b60d2a`. QA4 separately travelled to Gat and
volunteered through HELP `7c0b66d8-37c3-4a6a-9be4-8c258e797f82`, revision 2.
Both returned to Old Mill by accepted routes. The compiled `index-CFWbcjwC.js`
restored both companies and their consent. Nighttime JOIN commands `98e5bedc`
and `e6a016e2` admitted all six equipped people to encounter
`308aa36e-0ab0-428f-8fa1-942ceee9f352`. It ended in round 3, revision 32, with
all six allies alive and the actual beast dead. Thirty account orders and two AI
orders were saved, with zero timeout orders. Each company used manual Defend and
visible one-action autoplay. Effects applied and both companies are ACTIVE,
unbound and outside an encounter. [N08](08-battle-outcomes.md) owns the outcome.

The world claw claim names this actual terminal revision. Pickup command
`c181421a-425a-4ebd-9393-84531d2a9da7` took it into the company supply container.
Ordinary release `b0efe91a-23a3-4b11-a263-13cbb247d997` succeeded at worker
revision 4. Reload retained the living finding and «С отрядом: Сенька», plus the
held unredeemed claw. The owner then followed the normal accepted route to Gat
(`a0e67f37`) entirely in real time. PRESENT
`1104669c-7243-4e96-96fe-50d249752a4f` paid 90 crowns with receipt
`789a751c-1bba-44e5-b291-3a7eab742559`, public revision 6. Ordinary re-entry on
the newer `index-DBR1Y_I3.js` retained completed HUNT-01, 890 crowns and living
Senka. The owner then followed the actual accepted Gat → Северный Двор route
`8c0759c3-b4e5-4a56-baed-753c34b00562` in real time. At the elder's house,
«Передать результат заказчику» sent delivery
`9cd97f84-223a-4bf4-9bd6-2444fb58276c`. It saved SUCCESS at tick 3037,
worker revision 5, paid 80 crowns and cleared custody. Owner cash rose 890→970.
The public consequence says «Сенька вернулся в Северный Двор». Reload on
`index-DHU6DWGG.js` retained completed/paid work, 970 crowns and no travelling
Senka. The helper remains at the mill with its original 800 crowns.

An exact authenticated replay of that original delivery returned its original
revision-5/80-crown response. Read-only before/after comparison retained the
identical worker state, five ordinary receipts and both company states. The hunt
issuer paid from 180→90 crowns and worker issuer from 160→80. The browser's
30-second response waiter expired during the original delivery, but the UI and
canonical readback then established success before any replay. That waiter
alone does not establish server latency. No reset or gameplay SQL repair was used.

Final evidence is `output/m1-matrix-mill-final-readback-20261117.json`,
`output/m1-matrix-mill-paid-reentry-20261117.log`,
`output/m1-matrix-mill-delivery-exact-replay-20261117.log` and
`output/m1-matrix-mill-after-replay-20261117.json`. Ordinary travel and original
hand-in are in `output/m1-matrix-senka-{return-route,issuer-arrival,delivery}-20261117.log`.
These new results supersede the pending living-delivery notes in earlier dated
sections. The separate owner death deferral supersedes their death-source gaps.

Author assistance includes the protected QA clock, reading public map masks and
map-coordinate conversion for native clicks. QA3 accepted Gordey's existing
HUNT-03 to obtain its lawful Old Mill marker. It did not join that hunt. Unknown
routes were refused before successful intermediate scouting. QA4's browser was
closed on lease release and reopened with the same quick-login 4, preserving
arrival and consent. The resumed offline report was closed normally. The unused
raw browser listener on 9337 is absent. Native receipts and route logs are
`output/m1-matrix-{keeper-clue,beast-accept,beast-helper}-20261117.log`,
`output/m1-matrix-claw-and-senka-release-20261117.log`,
`output/m1-matrix-custody-reentry-and-gat-route-20261117.log` and the associated
scout/clock logs. N12 owns the private runtime configuration pointers.

## C03 refusals and C06 saved delivery replay — 2026-11-16

LOCAL / FOCUSED SQL PASSED. The C03 authenticated route case accepts the actual
profile, then refuses wrong-place inspection, reporting before the observation
and an extra forged observation payload. Contract state/facts, issuer funds and
receipts remain unchanged. Full company state and both revisions are compared
around the wrong-place refusal, then again around the two later refusals after
the explicit test-fixture relocation.

The C06 case accepts the live scout profile, searches at the real authored bank,
gets living custody and physically submits delivery at the issuer fixture. It
checks all four source/discovery/recovery/delivery facts, cleared custody, paid
board state, one delivery receipt, one reward movement and exactly 80,000,000Q
added to company-owned wallets. After recreating the application, the exact old
delivery request returns its original result and preserves the whole company,
contract and receipts. These are public-route tests with controlled PostgreSQL
fixtures, separate from the earlier native journeys.

Both new files pass one isolated PostgreSQL case each, run sequentially through
node --env-file-if-exists=.env node_modules/vitest/vitest.mjs run --mode integration
with their respective ordinary.road-tracks.integration.test.ts and
ordinary.lost-scout.integration.test.ts paths. Scoped ESLint, Prettier, server
typecheck and diff checks pass. The first C03 setup lacked a campaign clock and
used the wrong FK cleanup order; those fixtures were corrected and the failed
per-file clone was disposed. All passing per-file clones were also disposed.
No production source changed. Dead/unavailable targets still lack the approved
causal sources described in the owning rows. Full suites/native replay of these
constructed cases are NOT_RUN. T031 remains open.

## C06 native scout delivery — 2026-11-16

LOCAL. The restored N02 owner accepted «Пропавший разведчик», searched the bank
at Тихая Гать, acquired living Ивашка Рябой in custody, physically returned to
Каменный Брод and delivered through Караульня. The accepted command paid
80 crowns once in this journey, raising cash 318.71→398.71, cleared custody and
showed completion paid to this company. The same company then camped and rested
through ordinary controls. Details and remaining re-entry/retry evidence belong
to [N02](02-next-contract.md#scout-delivery-and-subsequent-recovery--2026-11-16).
The unavailable/dead-target branch and the rest of the eight-contract/eleven-scene
matrix remain open.

## C03 native road observation and report — 2026-11-16

LOCAL. The restored N02 company accepted «Следы на дороге» from Евсей at the
market, physically reached Тихая Гать, inspected the bank and returned to the
issuer. Its ordinary report paid 40 crowns once, taking cash 398.71 → 438.71.
The completed paid result survived reload and runtime return. The following
journey to Северный Двор retained that cash and both completed contracts.
Command and continuation details belong to
[N02](02-next-contract.md#roadtracks-delivery-and-retained-continuation--2026-11-16).
Remote/fabricated-observation refusals were NOT_RUN in this native journey;
this result does not close the complete C03/CT branch matrix.

## Inherited mill result and remaining branches — 2026-11-16

LOCAL. N02's restored final dump already retains the original ordinary mill
rescue completed/paid and HUNT-01 completed. Reuse that saved success for
C07–C09. It does not document each source clue, terminal/proof binding,
custody/delivery receipt or replay. The older WLC-08 final journey only accepted
the mill contract with its objectives still open, so its successful Wolf Trail
run adds C02 evidence only.

The remaining mill checks concern actual clue sources and eligibility, the
hunt/proof relationship and absent-proof refusal, living delivery/custody and
unavailable/dead-target handling. The separate approved «Голос из-под пола»
implementation and its quiet-release equipment purchase do not substitute for
these original scenes. Neither another full success replay nor a new mill
implementation is required by this reconciliation.

## Surrendered raiders and rescue access — 2026-11-16

FIXED / LOCAL. Source inspection found a concrete C05 access regression.
The ordinary gate requires every raider's health to be zero, although the saved
surrender disposition already makes a living hostile unavailable for a new hunt.
A victorious company can therefore remain blocked from Demyan's cellar after
the band surrenders. The correction reuses the existing isAvailableHuntHostile
policy for defeated-source gates. Live available raiders retain the refusal.

The focused isolated PostgreSQL check exercises the public board and release
command for active, surrendered and dead raider fixtures, preserving the saved
hostile pools and disposition. Before the correction, the surrendered case
failed at the gate while the active/dead cases passed. Afterward all three cases
and the existing complete descent-kit rescue passed (4/4). The first fixture
attempt lacked a compatible campaign clock and was corrected before the isolated
regression run. Server types, scoped ESLint/format and diff checks passed.
An existing unused test import was removed. Logs are
`output/m1-cellar-gate-before-corrected-20261116.log` and
`output/m1-cellar-gate-after-20261116.log`.

The player's path remains physical arrival at the mill, lawful release, then
live delivery to Marfa. This correction reuses the same saved availability rule
as hunt admission and preserves old rows without a disposition. It does not
create a captive-death source or complete the remaining C05 native journey.
Publication/merge and native C05 are NOT_RUN for this correction.

## C04 daylight and report regression — 2026-11-16

LOCAL public-boundary evidence. The new missing-herbs PostgreSQL case uses
ordinary authenticated acceptance, the stock observation, server-clock-derived
night refusal, daylight inspection and the two-clue report. A report before the
trail observation refuses with MISSING_EVIDENCE and leaves the issuer's 80-crown
wallet intact. The night inspection refuses without adding a clue or paying.
After the seeded clock reaches day, inspection records the second clue and the
report pays 40 crowns once from the finite issuer wallet.

Reopening the app retains the completed/paid result. Exact late report replay
returns the original response and preserves all finance movements and issuer
cash. The other company sees the shared completion without the private findings.
The clock epoch/QA offset and company locations are isolated test fixtures.
The production clock reader and command routes determine daylight authority.
Native C04 play remains NOT_RUN.

The Luna author's focused case passed 1/1. The parent added the incomplete-report
refusal assertion and repeated the case successfully (1/1) against the isolated
m1_herbs_checks_20261116 database. Scoped types, lint and formatting passed
with the integrated test. The related rescue gate cases explicitly skip when
the dedicated database input is absent. Log is `output/m1-missing-herbs-parent-20261116.log`.
The normal herbalist/green/report journey remains open under C04/T031.

## C04 native paid journey — 2026-11-16

COMPLETED / LOCAL for C04's ordinary path. The existing helper company
2a5ab48d-29c3-49d5-8bf7-526c7bd351bc continued after the saved battle effects
recovered. It travelled from Old Mill to Bereznyak through the map with route
receipt 9c415225-4fd4-4924-8ac0-e824cf240d45. The parent's protected QA control
advanced 1000 ticks through receipt 47937a6f-6bf7-4d02-88bb-29efa5d1b001,
from 91226 to 92226. The route arrived and the ordinary place controls opened.

At Agafya's herbalist visit the company accepted the 40-crown terms and recounted
stock. The recorded clue is «Нет шести связок, и все — от крови. Остальное не
тронуто». Night inspection showed «ночью следов не разглядеть» with its action
disabled. After natural daylight, the company left for the green and inspected
the meadow. Its clue is «Свежие срезы у корня, ножом. Тропа уходит к Северному
Двору». Returning to Agafya and handing in produced «Заказчик заплатил 40 кр.».

Reload retained both clues and the completed/paid contract. Treasury changed
715.86→755.86 crowns. The native path used one hand-in. Exact late replay,
missing evidence, night-command refusal and observer privacy have the isolated
PostgreSQL evidence above. The founder retains sword/shield and 36/100 health.
The company has six carried rations plus its opened-food reserve. Kest, Rell and
Ratko remain dead. The saved defeat and obligations remain part of this company.

Captures are `.playwright-cli/c04-herbs-paid-reloaded.png`,
`.playwright-cli/c04-herbs-final-squad.png` and their corresponding txt snapshots.
The ordinary C05 rescue and the remaining original source branches retain their
own T031 criteria. Full M1 acceptance remains open.

## C05 native living rescue and paid re-entry — 2026-11-16

LOCAL / SUCCESS PATH PASSED. The same Dozor N01 company continued after the
recorded genuine HUNT-03 victory. The owned development runtime resumed after
its compiled production restart check. Ordinary movement reached Tikhaya Gat;
one known STALE_REVISION refusal was followed by a fresh deliberate movement
intent. The player entered the inn and opened both Marfa's story and payment
conditions. ACCEPT 360beaf7-0234-4c8f-b965-140042bc02bb saved the 80-crown terms.

Ordinary travel then reached the Old Mill yard. All three actual raiders were
dead across the retained attempts. Release 71f0e1d5-558e-43a4-9942-49b1c5a59ddd
succeeded and produced the live-captive source/release facts at tick 93774. The UI
said Demyan was alive and travelling with the company. It exposed no delivery
action while away from Tikhaya Gat. Ordinary reload retained the living custody,
then actual travel returned him to Marfa at the inn.

Delivery 31e4a742-18ba-45e3-8f73-303459f28119 succeeded at tick 93888, revision 3,
with reward 80000000Q. The card shows completed/paid to this company. Custody
cleared and owner cash increased 494.71→574.71 crowns. Another ordinary reload
retained that paid result and removed the travelling-captive line. A scoped
read-only transaction confirms SUCCESS, empty custody, the actual release and
delivery source IDs, three once-only command receipts, company ACTIVE and no
encounter binding at Tikhaya Gat bank.

Protected UI clock advances of 100 ticks shortened the actual accepted journeys;
no company, NPC, contract or receipt rows were repaired or fabricated. This is
native live-path evidence. The preceding authenticated regression supplies the
stranger/helper refusals, unchanged rejected state, holder-only payment, exact
replay and reopened completion. It does not supply a captive-death event. The
authored death-report slot has no existing runtime producer or approved causal
trigger in this M1 profile, so that source/branch remains NOT_RUN. The initial
C05 captive source is now demonstrated by the real post-raider release.

Logs are output/m1-c05-*.log. The final contract/receipt/company read-only result
is output/m1-c05-final-readback-20261116.json. No production code changed during
this journey. Full suites and owner acceptance are NOT_RUN. The remaining N05
rows keep T031 open; RC-GAP-MACHINE-01 retains its separate archive limitation.

## C05 authenticated delivery authority — 2026-11-16

LOCAL public-boundary evidence. The existing surrendered-raiders PostgreSQL
case now continues after lawful release. A second authenticated company at the
issuer gets NOT_A_PARTICIPANT when it attempts delivery. After its accepted HELP
command, another delivery attempt gets MISSING_EVIDENCE. The captive remains
with the original holder. Both company snapshots, the contract including its
wallet and custody, and both receipt sets remain unchanged by each refusal.

The holder then delivers at the issuer with the current contract revision.
Its local purse gains exactly 80 crowns, the issuer wallet loses the same amount,
and custody clears. Exact replay returns the original response. Reopening the
application retains COMPLETED/PAID for the holder and one delivery receipt at
each transaction boundary.

The focused isolated case passed 1/1, with three siblings skipped. Server
typecheck, scoped ESLint, Prettier and diff checks passed. The initial delivery
fixture was at the wrong place; it was moved to the issuer before the passing
run. The later HELP fixture initially omitted required `stepId: null`; it was
corrected and the focused case passed again. Log is
`output/m1-cellar-custody-focused-20261116.log`. Company creation, battle outcome
and place changes in this case are explicit isolated fixtures. This supplies
route/transaction coverage. Native C05 travel, rescue and delivery remain open.
