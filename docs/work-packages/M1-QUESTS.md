# M1 quests — at least 20, four with moral choices

Status: **proposed, not started** (owner decision 2026-11-09). No writer assigned.
Rules: [m1-spec §11](../wiki/m1-spec.md#11-полный-объём-контента-m1),
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
([M1-STORY-MISSIONS](M1-STORY-MISSIONS.md)). The remaining quests start
from the draft catalogues and follow the writing rules. Repeatable contracts and missions without combat stay after M1.

## Selected twenty — owner decision 2026-11-13

Studioigor decisions #11–#12. Status: list and dilemma frames approved; player
text, facts and parameters still need the normal rewrite and owner text approval
before implementation. Catalogue cards are drafts; reuse their rewards/conditions
only after checking them against current rules.

| #     | Quest                                    | Template         | Source                                    |
| ----- | ---------------------------------------- | ---------------- | ----------------------------------------- |
| 1–8   | Eight existing contracts                 | mixed            | m1-spec §9, N05                           |
| 9     | Approved story mission                   | mission          | [M1-STORY-MISSIONS](M1-STORY-MISSIONS.md) |
| 10    | «Чьи волки» — moral                      | HUNT             | rewrite of Q035                           |
| 11    | «Обход, которого не было» — moral        | INVESTIGATE      | rewrite of Q033/Q039                      |
| 12    | «Девочка в синем платке» — moral         | RESCUE           | rewrite of Q046/Q047                      |
| 13    | «Грязный колодец» — moral                | INVESTIGATE      | rewrite of Q038                           |
| 14–20 | Q011, Q012, Q019, Q031, Q032, Q041, Q043 | HUNT/INV./RESCUE | catalogue drafts, difficulty I–III        |

Rejected on 2026-11-13: «Мельничный выкуп» (ransom of the miller's children
with Березняк grain). Shown but not chosen: «Знамя на продажу», «Обвал амбара».

### Moral dilemma frames

Each choice is made once, recorded as a fact and read later by the named
consumer. No hidden outcome is shown before the player can observe it.

| Quest                                            | Choice A                                                                                                                                     | Choice B                                                                                                                                | Saved facts and later consumer                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| «Чьи волки» (Тихая Гать / Северный Двор)         | Kill the pack: Северный Двор pays the bounty; a later raid on Тихая Гать becomes a fact                                                      | Spare the pack and expose the herder's deal: no bounty; Северный Двор refuses its next offer; Тихая Гать grants a guide (shorter route) | pack alive/dead, issuer refusal, raid fact, guide — contract board, atlas, return report |
| «Обход, которого не было» (Каменный Брод)        | Hand the watchman over: full reward; the refugee camp is removed                                                                             | Destroy the proof: no payment; the camp stays; the watchman later reveals a route or marker                                             | watchman status, camp present/absent, knowledge fact — town scene, atlas, report         |
| «Девочка в синем платке» (road to Северный Двор) | Carry the child and the wounded deserter: slower travel, extra rations; the deserter becomes a recruit candidate                             | Carry only the child: on-time delivery, full reward; the deserter's death is recorded                                                   | persons alive/dead, recruit offer, travel time — recruitment panel, report               |
| «Грязный колодец» (Березняк / Каменный Брод)     | Tell the truth (Battle of the Ford graves above the spring fouled the well): the old-faith herbalist stays; the church raises its care price | Give the priest his culprit: reward paid; the herbalist is exiled; herbs leave the trader                                               | herbalist present/exiled, care price, trader stock — care panel, trader, report          |

Next: rewrite the eleven new texts by the writing rules, name issuers from
established lore or mark proposals, then request text approval. Parameters
(rewards, price deltas, durations) are set in the implementing slice.

## Texts — 2026-11-13

APPROVED by the owner on 2026-11-13 («Approve texts»), after a full logic and
reward pass. The eleven Russian texts are in
[m1-quest-texts](../wiki/economy-quests/m1-quest-texts.md); the new people
in [characters.csv](../content/world/characters.csv) keep the file's only status
value, `proposal`. Reward amounts remain draft balance for the implementing slice.
Russian only; no English translation unless the owner asks (2026-11-13). Ordering found while writing: «Грязный колодец»
after «Пропавшие травы»; «Человек на обочине» only while Агафья stays;
«Голос из-под пола» after «Знамя Харитона Обуха». The foul-well cause is the Battle of the Ford graves above the spring;
the owner chose this over the church tannery on 2026-11-13 (studioigor #18).
