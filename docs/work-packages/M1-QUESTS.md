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

### «Голос из-под пола» — implementation slice, 2026-11-15

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

**Alternative and remaining scope:** the approved quiet descent is not exposed
yet. Its text requires using a lantern and supports and consuming materials;
there is no available inventory-backed source for those materials in the current
catalogue and supply paths. Do not display it as a free second rescue route.
Failure/retry: a living beast blocks release; observations and custody remain
unfinished, and ordinary command receipts protect accepted steps and delivery.

**Saved outcome and simplest try:** inspect the accepted contract after the
banner proof is presented, complete the existing beast hunt, then rescue and
deliver Остап. The owner contract, custody, hunt outcome and payment remain
saved. Native playthrough and player acceptance are NOT_RUN / NOT_MEASURED; the
quiet-material branch remains unimplemented.

Focused game-core ordinary-contract tests and core/server typechecks passed.
The web typecheck still reports the four existing `EquipmentTrader.tsx` DTO
mismatches recorded above. The approved Russian source text was checked with
`check_text.py` (0 issues). This partial slice is LOCAL; publication and merge
are NOT_RUN.
