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

Implemented the approved [«Обход, которого не было» text](../wiki/economy-quests/m1-quest-texts.md#обход-которого-не-было)
as `ci.m1.empty-watch-record.01`, an ordinary INVESTIGATE offer at Каменный Брод.
The offer advertises a 65-crown trial reward. Handing the sack to Евсей pays it,
records Прокоп in the book, removes the refugee camp and puts Прокоп in custody.
Destroying the proof completes with no payment, leaves the camp and watchman in
place, and preserves Прокоп's later disclosure about the old ford.

Evidence stays company-private. After resolution, the shared contract board and
town visit show the camp and watchman status. The no-payment ending grants only
the acting company an approximate atlas marker at Каменный Брод; the testimony
does not establish exact ford geography or a route benefit. The return report
shows either ending to that company. The board derives the ending's payout
status from its frozen accepted terms and explicitly says when no reward was
paid, for both the owner and other companies. Report cursor details are in
[M1-OFFLINE-REPORT](M1-OFFLINE-REPORT.md#same-tick-contract-outcome-cursor--2026-11-15).

Focused game-core, protocol, server and web consumer tests passed before the
same-tick cursor correction. After that correction, server typecheck and 8
return-report unit tests passed; the focused PostgreSQL return-report API case
passed 1/1 in a disposable clone with migration 0029 applied. Scoped ESLint,
Prettier, migration guard and `git diff --check` passed. The full web typecheck
still reports four existing `EquipmentTrader.tsx` DTO mismatches; this follow-up
passed focused contract projection and board tests (14/14), including paid and
no-payment labels. Normal in-game playthrough, native player acceptance and
remaining quest checks are NOT_RUN;
broader player acceptance is NOT_MEASURED. This slice is LOCAL; publication and
merge are NOT_RUN.

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
eligibility. Both endings preserve the owner contract, custody, hunt outcome and
payment. The simplest try is to present the banner proof, buy the kit at Тихая
Гать, complete the existing mill-beast hunt, choose either release step, then
deliver Остап.

Focused game-core, protocol and server builds passed; server typecheck passed;
focused game-core, server and web tests passed (30/30); the isolated PostgreSQL
purchase/release/delivery integration case passed (1/1), using the integration
clone harness; static migration checks, Russian text checker (0 issues),
formatting and `git diff --check` passed.
The web typecheck reports the four existing `EquipmentTrader.tsx` DTO mismatches
recorded above. Native playthrough and player acceptance are NOT_RUN /
NOT_MEASURED. This slice is LOCAL; publication and merge are NOT_RUN.
