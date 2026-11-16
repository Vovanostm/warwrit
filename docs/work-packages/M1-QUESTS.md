# M1 quests — at least 20, four with moral choices

Status: **IN PROGRESS / LOCAL**. The quest list, dilemma frames and eleven new
Russian texts were approved by the owner on November 13. «Обход, которого не
было» is implemented; remaining quests and full M1 gameplay checks are NOT_RUN.
Draft rewards retain their balance status.
Rules: [m1-spec §11](M1-QUESTS.md#selected-twenty--owner-decision-2026-11-13),
[quest rules](../wiki/economy-quests/quest-rules.md),
[writing](../wiki/world/writing.md).

## Player outcome

M1 has at least 20 quests on the HUNT/INVESTIGATE/RESCUE templates. At least
four of them end in a moral choice, in the spirit of «save the village or the
children». The consequences are saved and visible later in the world.

- Normal path: take a quest → investigate/fight → choose → reward and
  consequence recorded.
- Alternatives: each moral choice has at least two outcomes with different
  saved consequences; a wrong accusation or failed rescue is a real outcome.
- Failure/retry: defeat keeps the quest unfinished.

Simplest try: play one moral-choice quest twice in separate local worlds and
compare the saved outcomes.

## Current state (checked 2026-11-09)

Eight contracts exist (m1-spec §9) and one approved story mission
([M1-STORY-MISSIONS](M1-STORY-MISSIONS.md)). The eleven additional quests use the owner-approved Russian texts. Repeatable contracts and missions without combat stay after M1.

## Selected twenty — owner decision 2026-11-13

Studioigor decisions #11–#12. List and dilemma frames approved. The later
November 13 text approval is recorded below. Rewards and numerical effects in the approved texts remain trial balance
for verification during implementation.

| #   | Quest                    | Stable ID / source                                               |
| --- | ------------------------ | ---------------------------------------------------------------- |
| 1–8 | Eight existing contracts | [Instances](../wiki/m1-spec.md#9-контракты-улика-и-выплата), N05 |
| 9   | Кто выдал тайник         | [B4](M1-STORY-MISSIONS.md)                                       |
| 10  | Чьи волки                | `ci.m1.whose-wolves.01`                                          |
| 11  | Обход, которого не было  | `ci.m1.empty-watch-record.01`                                    |
| 12  | Девочка в синем платке   | `ci.m1.stretcher-and-sword.01`                                   |
| 13  | Грязный колодец          | `ci.m1.foul-well.01`                                             |
| 14  | Мешок у дороги           | `ci.m1.dragged-sack.01`                                          |
| 15  | Вожак с рваным ухом      | `ci.m1.not-one-pack.01`                                          |
| 16  | Свежие следы на дороге   | `ci.m1.tracks-over-tracks.01`                                    |
| 17  | Мешок легче накладной    | `ci.m1.light-sack.01`                                            |
| 18  | Чужая расписка           | `ci.m1.two-receipts.01`                                          |
| 19  | Человек на обочине       | `ci.m1.man-by-road.01`                                           |
| 20  | Голос из-под пола        | `ci.m1.voice-under-boards.01`                                    |

### Moral dilemma frames

Each choice is made once, recorded as a fact and read later by the named
consumer. No hidden outcome is shown before the player can observe it.

| Quest                                            | Choice A                                                                                                                                         | Choice B                                                                                                                                | Saved facts and later consumer                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| «Чьи волки» (Тихая Гать / Северный Двор)         | Kill the pack: Северный Двор pays the bounty; a later raid on Тихая Гать becomes a fact                                                          | Spare the pack and expose the herder's deal: no bounty; Северный Двор refuses its next offer; Тихая Гать grants a guide (shorter route) | pack alive/dead, issuer refusal, raid fact, guide — contract board, atlas, return report |
| «Обход, которого не было» (Каменный Брод)        | Hand the watchman over: full reward; the refugee camp is removed                                                                                 | Destroy the proof: no payment; the camp stays; the watchman later reveals a route or marker                                             | watchman status, camp present/absent, knowledge fact — town scene, atlas, report         |
| «Девочка в синем платке» (road to Северный Двор) | Carry the child and the wounded deserter: slower travel, extra rations; the deserter becomes a recruit candidate                                 | Carry only the child: on-time delivery, full reward; the deserter's death is recorded                                                   | persons alive/dead, recruit offer, travel time — recruitment panel, report               |
| «Грязный колодец» (Березняк / Каменный Брод)     | Tell the truth (battle at Kamenny Brod graves above the spring fouled the well): the old-faith herbalist stays; the church raises its care price | Give the priest his culprit: reward paid; the herbalist is exiled; herbs leave the trader                                               | herbalist present/exiled, care price, trader stock — care panel, trader, report          |

### «Чьи волки» guide — owner decision 2026-11-15

The owner approved a 25% travel-time reduction from Тихая Гать to Северный
Двор, granted only to the company that spared the pack and exposed Ефим. The
revised line is «Быстрее доберётесь». The guide is a saved, company-scoped
source and cannot shorten travel to other destinations. Movement profiles may
combine it with carrying burdens only through finite approved modifiers.

Next: implement the remaining approved texts and saved consequence consumers.
Parameters (rewards, price deltas, durations) are set in each implementing slice.

## Asset implementation checkpoint — 2026-11-15

Six dialogue/issuer portraits are registered with prompts and adaptations in
`assets/manifest.json` and consumed by NpcPortrait in B4 and hunt cards. The
ordinary Фрол card was inspected in the browser. The other required art and
twenty-quest consequence matrix remain open under T035. Portrait appearances
are production candidates awaiting owner visual acceptance. Detailed evidence
belongs to [the story record](M1-STORY-MISSIONS.md#portrait-integration--2026-11-15).

## Texts — 2026-11-13

APPROVED by the owner on 2026-11-13 («Approve texts»), after a full logic and
reward pass. The eleven Russian texts are in
[m1-quest-texts](../wiki/economy-quests/m1-quest-texts.md); the new people
in [characters.csv](../content/world/characters.csv) keep the file's only status
value, `proposal`. Reward amounts remain draft balance for the implementing slice.
Russian only; no English translation unless the owner asks (2026-11-13). Ordering found while writing: «Грязный колодец»
after «Пропавшие травы»; «Человек на обочине» only while Агафья stays;
«Голос из-под пола» after «Знамя Харитона Обуха». The foul-well cause is the battle at Kamenny Brod graves above the spring;
the owner chose this over the church tannery on 2026-11-13 (studioigor #18).

## Implementation checkpoint — 2026-11-15

Integration follow-up — 2026-11-16. The foul-well quest, company-specific chapel
price and finite herbalist purchases are combined with the preceding quests.
Game-core/protocol builds, server/web typechecks and39 focused tests across six
files pass on the integrated candidate. Migration0030 was applied to the owned
stand. Its down migration refuses retained chapel money or herbalist stock,
with both populated cases checked in the author's disposable-clone smoke.
The author's two real transaction cases pass. Native care and purchase outcomes
remain pending their normal player journey.

The isolated integration candidate now contains «Мешок легче накладной»,
«Чужая расписка» and both «Обход, которого не было» endings together with
the delayed-consequence correction. The merged candidate passes game-core and
protocol builds, server/web typechecks and 51 focused tests across eight files.
Its real PostgreSQL light-sack suite passes all three cases, including origin
validation, both terminal payments and delayed company-private local disclosure.
Hunt guidance also passes the portrait/payment component checks and the text
checker (0 issues). The changed passages were read together for meaning and flow.
Migration 0029 is applied to the owned stand. Its destructive down execution
remains NOT_RUN. These local checks do not close T031/T032/T035 or player acceptance.

Implemented the approved [«Обход, которого не было» text](../wiki/economy-quests/m1-quest-texts.md#обход-которого-не-было)
as `ci.m1.empty-watch-record.01`, an ordinary INVESTIGATE offer at Каменный Брод.
The offer advertises a 65-crown trial reward. Handing the sack to Евсей pays it,
records Прокоп in the book and puts him in custody. The camp remains until
2,000 campaign ticks after the choice, then its removal becomes public.
Destroying the proof completes with no payment and leaves the camp and watchman
in place. After 3,000 ticks, the acting company learns Прокоп's old-ford
disclosure only by reading the contract board at Каменный Брод; 3,000 ticks is
the provisional implementation of «через несколько дней».

Evidence stays company-private. After resolution, the shared contract board and
town visit show the camp and watchman status. The no-payment ending grants only
the acting company an approximate atlas marker at Каменный Брод; the testimony
does not establish exact ford geography or a route benefit. The return report
shows the choice and each matured consequence as separate company-scoped phases.
The board derives payout status from frozen accepted terms and explicitly says
when no reward was paid, for both the owner and other companies. Report cursor details are in
[M1-OFFLINE-REPORT](M1-OFFLINE-REPORT.md#same-tick-contract-outcome-cursor--2026-11-15).

Focused game-core, protocol, server and web consumer checks for the contract,
report cursor and phase split passed (46 tests). The focused PostgreSQL
return-report API case passed 1/1 in a disposable clone with migration 0029
applied. The PostgreSQL light-sack suite passed 3/3, including the delayed
local-read regression; its command helper supplies the request origin required
by the CSRF check. Scoped ESLint, Prettier, migration guard and
`git diff --check` passed. The full web typecheck still reports four existing
`EquipmentTrader.tsx` DTO mismatches. Normal in-game playthrough, native player
acceptance and remaining quest checks are NOT_RUN;
broader player acceptance is NOT_MEASURED. This slice is LOCAL; publication and
merge are NOT_RUN.

### T032 «Вожак с рваным ухом» and «Свежие следы на дороге» — 2026-11-15

Implemented the two approved manuscripts as `ci.m1.not-one-pack.01` and
`ci.m1.tracks-over-tracks.01`. Savva's HUNT has a separate world hunt profile,
60-crown issuer wallet and a unique physical wolf-pelt proof. The existing
server hunt flow records the actual encounter result, pickup and presentation;
ordinary wolves cannot satisfy the leader proof. Savva's offer opens at the
Bereznyak elder and returns to him for the trophy.

Gordey's 40-crown INVESTIGATE offer freezes one of the approved mowers/bandits
truths when its world instance is created. Only its matching fresh-tracks clue
enables the paid report. The no-findings report requires the old-camp clue and
is rejected once fresh tracks are found. It pays nothing. Gordey's offer opens
at the Kamenny Brod watch; the investigation visits Bereznyak and Tikhaya Gat
before returning to him. Russian names, brief, steps and findings are visible
through the existing contract UI. Both journeys have connected routes on the
canonical painted atlas.

Focused core, manifest, server and web tests passed: 51 tests across 8 files,
including truth privacy, paid/no-payout report rules, physical-proof custody,
issuer visits and atlas connectivity. Game-core and server typechecks passed;
the server check required building the workspace testkit dependency. Web
typecheck is NOT_PASS because of four existing `EquipmentTrader.tsx` DTO errors
(`publicRevision` and `interruptsLearning`); no T032 files were reported. Full
browser play, player acceptance and balance approval are NOT_RUN/NOT_MEASURED.
This T032 slice is LOCAL; commit, publication and merge are NOT_RUN.

Parent integration of this two-quest slice passes 50 focused tests across eight
files, both game-core/protocol builds and server/web typechecks. The first test
launch failed with ENOSPC before collecting tests. After freeing space by
sparsely omitting unchanged art in completed code worktrees, the same focused
run passed. The author's four DTO errors are resolved on the integration base.
The two-quest implementation is locally committed. Its native playthrough and
the remaining T032 quests keep the whole task open.

## «Грязный колодец» implementation checkpoint — 2026-11-15

Added `ci.m1.foul-well.01` as an ordinary INVESTIGATE contract after
«Пропавшие травы». The truth ending requires the ravine and Frol's testimony,
does not pay, and records that Агафья stays; naming her pays a trial 120 crowns
without requiring the ravine. Her exile and herb removal appear after seven
campaign days; contract-board world facts show the current state. The doubled
chapel-care price applies only to the truth-ending company. Reward and price
figures remain trial balance values.

The chapel option appears for an eligible company healer treating a known wound
at Каменный Брод. It charges 5 crowns, or 10 for the truth-ending company, from
the company's local purse and credits the shared chapel ledger in the same
transaction. Березняк starts with 12 medical units at 5 crowns each; each
purchase debits the purse, adds units to party inventory and reduces shared
stock. At accusation tick + 7000, the herbalist leaves and the remaining stock
becomes unavailable. The board reports current herbalist, chapel-price and
trader-stock consequences.

## Verification update — 2026-11-16

Focused contract, supply-purchase and care-command UI tests passed (23/23);
server typecheck, migration guard, migration smoke up/down, and `git diff
--check` passed. Two focused PostgreSQL integration cases passed on disposable
migration-backed clones: chapel payment verified 5/10-crown debits, shared
treasury credit, company scoping, replay and rollback; herbalist purchase
verified purse debit, company-owned party inventory, finite stock, replay,
rollback, and zero stock plus rejection at accusation tick + 7000. The truth
price remains private to its company in the contract board projection.

Migration 0030 rollback now refuses to drop any nonzero chapel balance or
herbalist stock. On a disposable clone, migration smoke verified that both a
nonzero chapel balance and a nonzero stock value block rollback; after removing
the test row, the migration completed the normal down/up checks.

Normal browser playthrough, downstream acceptance and player acceptance are
NOT_RUN. Web typecheck still reports four existing `EquipmentTrader.tsx` DTO
errors. The slice is LOCAL; publication and merge are NOT_RUN.

## «Мешок у дороги» implementation — 2026-11-15

Player goal: find Ерёма’s missing flour sack and return that same cargo to him
at Северный Двор. The normal path follows flour from Каменный Брод to two boys
in the willows, then delivers the sack. At the meeting the company may return
the full sack or leave the boys one hat of flour and deliver the same sack
short. The short branch also records the boys’ private account that Ерёма slept
on the cart. Either delivery pays the trial 25 crowns; the shared world records
whether the granary received the full sack, while the sleep fact stays known
only to the company that heard it.

Observable result: after a short return, the Northern Dvor visit shows that the
granary received less flour and the participating company sees the sleep fact.
Try it from the ordinary contract board at Северный Двор: accept the offer,
follow the flour, share flour with the boys, then return the sack.

The ordinary-contract state now tracks the unique contract-owned sack through
pickup, company custody and delivery to issuer custody; it is displayed with
the company and retains its original pickup receipt. Sharing flour disables the
full-sack ending. Delivery by another company cannot settle the owner’s cargo.
The owner may withdraw while carrying the sack: the company keeps custody, the
offer stays unavailable, and only that former holder can return the sack to
the issuer. That return ends the offer without a reward. Old ordinary saves
without the cargo field still load as having no cargo.
Wrong-place or missing-evidence commands leave state unchanged and can be
retried after travelling or recording the required clue. Withdrawal before
pickup reopens the offer; withdrawal while carrying keeps the sack with that
company and exposes its unpaid return action at the issuer. The approved
late/missed-deadline outcome remains unimplemented pending the clock decision.
The accepted clocks define Campaign Day as 1,000 ticks and visual DAY/NIGHT as
600/300 seconds; they do not define an evening boundary or ordinary-contract
expiry. Owner decision on the intended deadline rule is pending.

Focused game-core, server projection and web consumer tests passed (28/28).
Game-core, protocol and testkit builds and server typecheck passed. Web
typecheck is blocked by four existing `EquipmentTrader.tsx` DTO errors
(`publicRevision` and `interruptsLearning`). Normal in-game playthrough and
player acceptance are NOT_RUN; broader player acceptance is NOT_MEASURED. This
slice is LOCAL; publication and merge are NOT_RUN.

## «Мешок у дороги» deadline decision and implementation — 2026-11-16

Owner decision: the company has one Campaign Day, exactly 1,000 ticks, from
acceptance. For acceptance at tick `A`, pickup and paid delivery are allowed
only in `[A, A + 1000)`. The exact deadline tick is expired: a late pickup or
delivery closes no reward path. This supersedes the earlier pending note. The
contract UI replaces “before evening” with one day from acceptance and shows
expiry without payment.

After expiry, a sack already in company custody stays with that same holder.
The holder can still return it to Ерёма at Северный Двор without payment; no
expiry path deletes or teleports cargo. Existing command receipts still replay
the original accepted response before evaluating current time. Code-path review
confirmed this ordering is unchanged; exact replay after expiry was not runtime
tested because PostgreSQL integration was NOT_RUN.

The deadline and acceptance tick are frozen in accepted terms. Older accepted
snapshots recover their deadline from the existing acceptance fact; no guessed
wall time or migration is used. If that fact is absent, the legacy snapshot
retains its prior terms. Core boundary tests cover pickup and delivery at the
exclusive deadline, successful delivery one tick before it, unpaid cargo return
after expiry and legacy-term reconstruction. Focused core, server projection
and web contract tests passed 30/30; game-core/protocol builds and server
typecheck pass. Web
typecheck remains blocked by the four pre-existing `EquipmentTrader.tsx` DTO
errors. PostgreSQL integration and native playthrough: NOT_RUN; player
acceptance: NOT_MEASURED. This slice is LOCAL; publication and merge are NOT_RUN.

### «Голос из-под пола» — implementation result, 2026-11-16

**Player goal:** free Василиса's husband Остап from the cellar under the old
mill and bring him alive to Тихая Гать.

**Normal path implemented:** after a company redeems «Знамя Харитона Обуха»,
Василиса's RESCUE offer appears in Тихая Гать. At the mill, the company records
the cellar and beast-track observations, defeats the existing mill-beast hunt,
releases Остап into the contract's custody, travels back with the field party,
and delivers him to Василиса. The delivery pays 120 crowns from her finite
120-crown contract purse. The ordinary RESCUE profile saves observations,
custody and delivery; the existing mill hunt supplies the beast's real terminal
state and its route transport.

**Quiet descent implemented:** at the contract's Тихая Гать offer, the company
can buy one lantern, rope and support-board kit for 15 crowns. Stock is finite:
two kits per world. The purchase debits the company wallet, transfers the kit to
party supplies, updates shared stock and records a receipt and audit event in
the ordinary command transaction. At the mill, after recording both
observations and defeating the existing beast hunt, the company can use the kit
to release Остап quietly. The item is consumed into a saved tombstone when he
enters contract custody. The original beast-first release remains available.

**Failure/retry and saved outcome:** a purchase fails without partial changes if
the party lacks funds, supply capacity or stock; the ordinary command receipt
protects accepted purchases and steps from duplicate execution. The quiet release
requires the purchase fact and an owned, unconsumed kit. The accepted contract
version is v2; accepted v1 saves retain their original terms and dangerous-route
eligibility. Migration 0031 allows rollback from untouched genesis stock and
refuses to drop stock, price, revision or cash changed by purchases. Both endings
preserve the owner contract, custody, hunt outcome and payment. The simplest try
is to present the banner proof, buy the kit at Тихая Гать, complete the existing
mill-beast hunt, choose either release step, then deliver Остап.

Focused game-core, protocol and server builds passed; server typecheck passed;
focused game-core, server and web tests passed (30/30); the isolated PostgreSQL
purchase/release/delivery integration case passed (1/1), using the integration
clone harness; static migration checks, Russian text checker (0 issues),
formatting and `git diff --check` passed.
The web typecheck reports the four existing `EquipmentTrader.tsx` DTO mismatches
recorded above. Native playthrough and player acceptance are NOT_RUN /
NOT_MEASURED. This slice is LOCAL; publication and merge are NOT_RUN.

Rollback follow-up (2026-11-16): the 0031 guard passed an empty down/up cycle
and refused rollback after a populated one-purchase stock/cash fixture, retaining
the row and applied migration record. The migration test ran on the disposable
per-file integration clone; no source database was migrated.

## T032 roadside rescue — 2026-11-16

Implemented approved `ci.m1.man-by-road.01` as a one-company RESCUE offer from
Агафья. The offer is available only while she remains in Березняке; the normal
board and authoritative command both close it after a saved accusation and
7,000 campaign ticks. A truth report or no foul-well result leaves her available.
The roadside scene has no new world site: it uses the first outward station on
the existing Bereznyak approach road, at painted-map fp `(-2548, 1127)` with a
128-fp radius on the retained atlas edition. An active company sees its target
marker on the painted map and can send the normal movement command there.

At the target, the player chooses either to take Sidor into on-foot custody or
return to Агафья for the single stretcher tracked by this contract before going
back to fetch him. The fetched source is a one-use fact in the unique world
contract; helper companies are disabled so they cannot duplicate that source.
On foot, the party must record the roadside rest and wait at least 300 campaign
ticks before continuing. On either route, Sidor remains in the party's canonical
contract custody. If Агафья is still in Березняке, delivery to her pays at most
the 25 crowns in his seeded wallet. If her exile matures while the rescue is
active, delivery to the village completes without payment and releases Sidor
from custody; the scene does not claim that anyone treats or houses him. Offers
disappear and ACCEPT is rejected after the exile, while an accepted rescue
remains finishable. Custody stores `ON_FOOT` or `STRETCHER`, which the ordinary
movement adapter uses for the route's travel burden and food; all company-scoped
custody remains in guest food loads even when a travel mode is not assigned.
Reward, rest duration and one-stretcher availability are trial values, not a
balance acceptance. The approved Russian brief and findings remain in
[the manuscript](../wiki/economy-quests/m1-quest-texts.md#человек-на-обочине).

Owner decision 2026-11-16: after exile matures, an already accepted rescue can
finish by delivering Sidor alive to Березняк without reward. No new failure
ending is inferred, and custody stays with the company until delivery.

The early game-core/protocol commit is `8841f9c1779f5e48170712aaeafdfda8862b8ac6`;
the foul-well shared dependency is `54290b29`. Game-core and protocol builds
and testkit build, server and web typechecks pass. Focused game-core, server,
foul-well and map-visit tests pass 27/27 across four files. Movement burden
integration, PostgreSQL, browser/native play and owner acceptance are NOT_RUN.
This slice is LOCAL and does not close T032 or M1 acceptance yet.

### Rescue integration checks — 2026-11-16

Integrated the quiet mill rescue and roadside rescue into the retained M1
checkout. Preserved cargo deadlines, unpaid person return after withdrawal,
delayed Prokop disclosure and the current tick as the seventh projection
argument. Sidor branches reuse the existing unavailable-step response for
mutually exclusive findings. The owner-approved exile ending delivers living
Sidor to Bereznyak without reward and retains custody until delivery.

Parent checks passed 42 focused tests across ordinary transitions, projection,
well consequences and meeting points. Mill rescue purchase/delivery and guarded
0031 rollback passed 2/2 on disposable PostgreSQL databases, both disposed.
Migration 0031 was applied to the owned local stand. Native rescue play remains
NOT_RUN and T032 remains open. LOCAL.

## «Чьи волки» checkpoint — 2026-11-16

Implemented `ci.m1.whose-wolves.01` as one finite HUNT offer with six wolves
and an 80-crown issuer wallet. The owner can record the two ordered findings at
Тихая Гать. Before any encounter, the company can return to Кондрат and expose
Ефим; that rejects the reward and binds one later Кондрат offer refusal to the
same company. The refusal now runs through the ordinary-contract ACCEPT command,
stores its exact receipt with the denied instance atomically, and hides that
offer only from the affected company. Its denied instance ID stays recorded, so
a fresh ACCEPT command cannot bypass that refusal. Killing the pack settles
`PACK_KILLED` only with the actual pelt presentation and payment transaction.
The public raid fact materializes on a read at or after 7,000 campaign ticks.
Findings and the refused offer instance remain company-private.

The owner approved the revised Efim line and a 25% travel-time reduction from
Тихая Гать to Северный Двор. A pure guide-entitlement accessor binds the effect
to the informed company, that direction and the saved exposure event. The
movement-plan consumer and finite stacking profiles are being integrated by
the movement slice; guide travel is not yet player-verified.

The HUNT screen now offers clue inspection, the issuer report choice and
branch feedback. Text check: 0 issues. The canonical finding reader now stores
only its three persisted fields; its regression checks saved-state roundtrip.
Focused game-core, HUNT and contract-board tests passed (31). Game-core,
protocol and server typechecks passed. Web typecheck still reports
the four existing `EquipmentTrader.tsx` DTO errors. A PostgreSQL endpoint case
passed 1/1 on the per-file isolated database harness, covering ordered private
findings, report replay, the later ordinary offer, receipt replay, no payout,
retry rejection, saved denial and the other company's view; the harness disposed
the database after the test. The Russian text checker reported 0 issues for the
contract board. Prettier, scoped ESLint and `git diff --check` passed; the
migration guard is NOT_RUN because no migration changed in this follow-up.
Normal playthrough and player acceptance are NOT_RUN; enjoyment is NOT_MEASURED.
This slice is LOCAL; publication and merge are NOT_RUN.

## «Девочка в синем платке» checkpoint — 2026-11-16

Implemented `ci.m1.stretcher-and-sword.01` with the approved two outcomes. Both
deliver Настя to Пелагея and record Кондрат’s 90-crown payment as her debt.
Carrying Лука uses stretcher travel; carrying Настя alone keeps normal pace.
Custody guests add food demand against company stock. Continuous movement plan
version 4 stores the finite custody modes and exact source for any route guide;
the trial scales are on-foot ×1.25, stretcher ×1.5 and guide ×0.75. They
multiply over cumulative route timing,
so old saved plans retain their original timing. The guide is applied only to
the company and Тихая Гать → Северный Двор trip that earned it.

After carrying Лука, the owning company can observe his camp offer in Северный
Двор after 3,000 campaign ticks; the offer appears only for that company and the
server rechecks the saved observation when it is hired. Taking only Настя leaves
Лука at the ford. His death appears only after that company inspects the return
road. The return report separates the choice from the later death observation and
recruit offer, with each result scoped to its company.

Game-core and protocol builds, testkit build, and server and web typechecks
passed. Focused movement-timing, guest-food-demand, return-report and contract
board tests passed (60 tests across six files). Browser playthrough, PostgreSQL integration, and
native player acceptance are NOT_RUN; enjoyment is NOT_MEASURED. This slice is
LOCAL; publication and merge are NOT_RUN.

### Legacy movement-plan compatibility — 2026-11-16

Fixed persisted plan dispatch so version 4 uses `navigationVersion` to select
its geometry: modifier-bearing legacy plans without navigation metadata retain
legacy span timing and interpolation, while `polygon-v1` plans retain exact
geometry. Server route loading now validates exact geometry against the same
metadata instead of assuming every version 4 plan is exact. Added a JSON
roundtrip regression for a modified legacy plan, including its scaled duration
and an intermediate position. The focused atlas movement test passed (7 tests);
game-core typecheck, server typecheck, scoped Prettier and `git diff --check`
passed. Browser playthrough, PostgreSQL integration and player acceptance are
NOT_RUN. This compatibility fix is LOCAL; publication and merge are NOT_RUN.

### Combined quest integration — 2026-11-16

Integrated «Чьи волки», «Девочка в синем платке» and guard service with the
ordinary rescue/cargo paths. The combined catalogue check exposed an absent
whose-wolves manifest binding. Added its definition, observation/proof/report
sources and scene for the existing killed/spared outcomes. Preserved the
current cargo/custody return policy, seventh current-tick projection argument,
terrain goals and quiet-descent stock projection. Removed one duplicate UI
blocker case and retained grammatical hunt guidance.

Game-core/protocol builds and server/web typechecks passed after updating the
guard-service test fixture for the existing care-pool argument. Focused combined
checks passed 91/92 initially, with one letter-case expectation then corrected
and the affected 17-test file passing. The subsequent catalogue/ordinary/UI
run passed 50/50, and food/return-report checks passed 41/41. Migration 0032
was applied to the owned stand. Native combined quests and full T032
acceptance remain NOT_RUN. LOCAL.

### Web build dependency — 2026-11-16

The ordinary hunt UI imports public game-core constants. Added the existing
workspace package as an explicit web dependency, so recursive production builds
wait for its declarations instead of racing their generation. Regenerated the
single pnpm lockfile with the owning package manager in offline mode. Web
typecheck passed. The independent release rehearsal owns the full build result.
LOCAL.
