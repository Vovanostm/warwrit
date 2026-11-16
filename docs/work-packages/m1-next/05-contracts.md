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

## Current result — 2026-11-16

PARTIAL / LOCAL; full matrix remains open. C03 and C06 have newly recorded
ordinary paid journeys; C02 reuses unchanged WLC-08 wolf-proof/payment evidence.
N02's restored state retains completed/paid mill rescue and completed HUNT-01,
so C07–C09 success is inherited saved-state evidence. Their source/branch and
receipt details remain separate gaps. C04 now has a paid native two-clue journey
and reload. C01 now has the native victory, unique standard, physical return,
once-only 100-crown payout, compiled restart and subsequent supply purchase under
[N02](02-next-contract.md#native-hunt-03-completion--2026-11-16). Its saved proof
source is the actual terminal encounter. C05 now has a native living rescue,
custody re-entry, physical delivery, 80-crown payment and paid re-entry below.
The new authenticated checks below close C03's refusal gap and C06's accepted
live-delivery replay gap. C07–C09 source/refusal details and unavailable/dead-target
branches remain open. Next: finish the ordinary mill chain and its actual sources.
[Common contract](COMMON.md). [Prompt](prompts/05-contracts.md).

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

| Leaf / existing issue | Result and mandatory special case                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01/#379              | `HUNT-03` — «Знамя налётчиков»: actual eligible battle source → unique standard → lawful bearer → one payout; no proof from an ineligible terminal outcome       |
| C02/#380              | `HUNT-02` — «Волчья тропа»: real hunt → pelt pickup/capacity → return → once-only payment; reuse unchanged WLC-08 coverage                                       |
| C03/#381              | `INVEST-01` — «Следы на дороге»: available actual observation → truthful report; no remote or fabricated observation                                             |
| C04/#382              | `INVEST-02` — «Пропавшие травы»: actual daytime inspection and both required clues → report; missing/night-time access does not invent findings                  |
| C05/#383              | `RESCUE-01` — «Спасение из погреба»: actual living captive → release/custody → physical delivery; no reward for a dead/unavailable target; source dependency C01 |
| C06/#384              | `RESCUE-02` — «Потерянный разведчик»: lawful discovery/custody → actual live delivery; preserve unavailable/dead-target branch                                   |
| C07/#385              | `MILL-01` / `MILL-02`: source-backed beginning and two real clues; stop before inventing night-beast eligibility                                                 |
| C08/#386              | `HUNT-01`: source-eligible night hunt → real terminal/proof; after C07                                                                                           |
| C09/#387              | `MILL-03` / `MILL-04`: actual worker release/custody → live delivery and final accepted result; after C08                                                        |

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

- [ ] CT-1 Exactly the accepted eight instances/eleven scenes are mapped to
      existing definitions and all reachable source-backed branch criteria.
- [ ] CT-2 Every leaf succeeds through ordinary entry with actual issuer,
      location/time/knowledge, combat or custody, proof and final result.
- [ ] CT-3 Each exposed material alternative/refusal/failure has truthful feedback
      and accepted saved consequences; no unsupported successful placeholder.
- [ ] CT-4 Required owner/helper presence/consent and observer privacy hold;
      unavailable/dead targets and ineligible proof cannot produce false rewards.
- [ ] CT-5 Unique ownership/custody, funded one-time payout and exact retry survive
      reload/API restart. Relevant competing-claim risk has real SQL evidence.
- [ ] CT-6 Required four reusable backgrounds, six portraits, two trophy images,
      three enemy archetypes and the mill chain have source/licensing and actual
      integrated-use evidence; asset counts alone do not accept presentation.
- [ ] CT-7 Matrix distinguishes author evidence/new run/inherited unchanged proof;
      no B4 expansion or unrelated story/engine work enters the diff.

## Checks and unresolved policy

Focused changed contract tests, real SQL for custody/claim transactions, ordinary
browser scenes, wording/lore checks for changed text. Mark absent human/device
evidence separately. Missing accepted custody/target policy blocks that leaf;
continue ready leaves. Unsupported surrender is not fixed by minting hunt proof.

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
