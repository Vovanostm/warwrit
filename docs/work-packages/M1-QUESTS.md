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
