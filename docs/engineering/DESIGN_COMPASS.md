# Design compass — references, rules and examples for agents

Read this before designing or reviewing any world, quest, text or combat
feature. It is the compact, binding digest; the evidence and per-game analysis
live in [benchmarks](../wiki/benchmarks.md) (Russian, owner-facing). Do not load
that report unless you need a source for a specific claim. Each mechanic has
its own page with status and cross-links: [mechanics index](../wiki/mechanics/index.md);
open only the pages your task touches.

Authority: owner decisions of 2026-10-07/08 quoted in
[vision](../wiki/vision.md) (REQ-01..23) and [benchmarks §1](../wiki/benchmarks.md#1-решения-владельца--2026-10-08).
Anything marked _candidate_ needs an owner decision before it becomes a rule.

## 1. What the game is

- The player leads a **mercenary band** in a grounded dark-fantasy kingdom torn
  by a succession war. The band never commands an army.
- **Duchy armies march and fight parallel battles**; the world lives without the
  player. The game master (administrator) decides battles that change a
  town's owner or turn the crisis; simple server rules with no tactical battle
  decide skirmishes, ambushes and sieges of small places. Bands work around the war:
  scouting, escorting or raiding supply trains, foragers, deserters, battlefields,
  service for one side.
- Scale: test with 10–20 players; target 200–1000 bands. Capacity NOT_MEASURED.
- **Focus now:** make the current world deep and interesting and make combat
  deep, readable and rich in mechanics. New worlds or regions are out of scope
  (REQ-19 cancelled 2026-10-08).

## 2. North star in one line

Battle Brothers' world systems and combat spirit, Witcher-quality people and
stories, XCOM-quality presentation, and a world that remembers what bands did.

## 3. Take (reference → what to copy)

| Area   | Reference                    | Copy this                                                                                                                                                                                                                        |
| ------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| World  | Battle Brothers              | Settlement _situations_ that change prices/recruits and spawn the contract that clears them; attached sites that can burn and be rebuilt; faction relations; crisis with a warning phase                                         |
| World  | Pentiment, EVE               | One truth for all; places change visibly and permanently; a chronicle of what bands did                                                                                                                                          |
| Quests | The Witcher 3 «Bloody Baron» | Request → hidden truth → choice with no clean outcome → the place remembers                                                                                                                                                      |
| Quests | Pathologic 2                 | Stories have deadlines and continue without the player                                                                                                                                                                           |
| People | Kingdom Come: Deliverance II | Rulers and patrons with their own right and their own shame                                                                                                                                                                      |
| Combat | Battle Brothers              | Zone of control, morale with panic/flight, fatigue, armour with its own durability, formation skills. **First priority (owner 2026-10-08): zone of control and morale with flight/surrender**; armour decided; rest _candidates_ |
| Combat | Into the Breach              | Big threats telegraph intent; push/displace as real options. **Telegraphed creature intent is first priority**; push is a _candidate_                                                                                            |
| Combat | XCOM 2                       | Presentation only: preview, pacing, feedback, camera beats ([details](../wiki/battlefield-test-maps.md#шесть-опор-качества))                                                                                                     |
| Combat | Jagged Alliance 3            | Mercenaries with character and personal talents                                                                                                                                                                                  |

Already decided for combat: Battle Brothers spirit; trained melee always deals
damage (only recruits miss; incorporeal foes ignore normal weapons); no XCOM
cover or flanking ([rule](../wiki/combat.md#урон-в-ближнем-бою--решение-владельца-2026-10-07)).

## 4. Avoid (mistake → where seen → test)

1. **Breadth without depth** (Bannerlord, «Смута» 2024). Test: every place has a
   named person, a problem and a reason to come.
2. **No through-line or late game** (Wartales, Bannerlord). Test: the feature
   feeds a season goal or a band's ambition.
3. **Fetch chains** — walk from one boyar to the next voivode («Смута», Bannerlord).
   Test: every step is a decision, a finding or a fight.
4. **Repeated lines** (Battle Brothers). Test: a generated text read twice in one
   session is a defect.
5. **No second turn** in a story. Test: the truth changes how the player sees
   the patron; the outcome has a cost.
6. **Faceless rulers and patrons** (Bannerlord). Test: name, want, silence.
7. **Human-only enemies** (Wartales). Test: people, beasts and creatures need
   different answers; beasts have lairs on the map.
8. **Displayed chance ≠ real chance** (XCOM 2 hidden aim assist, JA3 hidden
   odds). Test: the preview is the same pure function as resolution.
9. **High-chance misses as the core loop** (XCOM 2). Already solved by the melee
   rule; do not reintroduce misses for trained melee.
10. **Unexplained mechanics** (BB zone of control). Test: every rule is visible
    before confirm: cost, target, reason for refusal, known risk.
11. **Hard "mission failed" timers** (XCOM 2). Use situational pressure:
    reinforcements, the enemy leaving, night.
12. **Erratic AI** (JA3). Test: enemies retreat or surrender for a visible
    morale reason.
13. **Upkeep grind** (Darkest Dungeon, BB). Test: costs create decisions, not chores.
14. **Retcons and invented canon.** World events are dated forward events;
    no new factions, gods, magic, witnesses or history without the owner.
15. **Template geography and function names** (Овсяный, Конный…) and the
    "living next to ruined" cliché (≈20 of 128 atlas hooks). Do not add more.

## 5. Checklists

**New place or place text.** Person · problem · reason to come · state
(_living / threatened / occupied / ruined_) · what changes if a band acts ·
consistent with [atlas](../wiki/world/map.md) and lore.

**New contract or story.** Patron with a want and a silence · hidden truth ·
choice with a cost · what the place remembers · deadline or what happens
without the band · one truth shared by all bands; later bands get a
continuation, not a replay · text per [writing rules](../wiki/world/writing.md).

**World or army event.** Dated, forward-only · visible on the map as a place
situation · creates or closes work for bands · authorized command with a log
and idempotency · decided by the game master or by the simple battle rules,
never by a client.

**Combat mechanic.** Owner decision recorded · visible before confirm · preview
equals resolution · deterministic core, new ruleset version, old replays
untouched · a counter-play exists · makes people, beasts or creatures play
differently · presented to the XCOM bar (≤1.5 s action, skippable).

## 6. Examples (form only — not canon)

- **Place, bad:** "Orchards around a surviving market; neighbouring families
  return to old plots." **Good:** "Returning families quarrel over boundaries a
  wartime collector rewrote; someone must find a witness — or make one keep quiet."
- **Contract with a second turn** (from «Ночной зверь у мельницы»): Frol pays to
  kill the beast → he himself buried the dead too shallow → kill it (cheap, another
  comes) or rebury the dead (slow, costly, Frol loses face) → the mill's state
  and Tikhaya Gat's attitude remember.
- **Situation:** "Two taxes" at Severny Dvor — bread dearer, fewer recruits, a
  contract to stand by during collection; cleared when one collector leaves empty-handed.
- **Game-master event, bad:** "A great battle happened in Porechye" (past, no trace).
  **Good:** "A Zhitnoe regiment is quartered in Lugovets" — place _occupied_,
  prices up, recruiters in the tavern, contract to find a lost supply train.
- **Parallel battle:** its outcome changes nearby situations — wounded and
  deserters on roads, a battlefield to search, burial work, grain prices.
- **Combat, bad:** three 90% attacks miss and the player cannot tell why.
  **Good:** spearmen hold the zone of control at Kamenny Brod; a large creature
  telegraphs a two-hex charge; a shield push knocks it off line into its own side.

## 7. Where the details live

| Topic                                  | Page                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Every mechanic, status and cross-links | [mechanics index](../wiki/mechanics/index.md)                                |
| Evidence, per-game analysis, sources   | [benchmarks](../wiki/benchmarks.md)                                          |
| Vision and requirements                | [vision](../wiki/vision.md)                                                  |
| World, duchies, Porechye               | [world](../wiki/world/index.md), [Porechye](../wiki/world/porechye.md)       |
| Writing                                | [writing](../wiki/world/writing.md), [TEXT_CRITIQUE](TEXT_CRITIQUE.md)       |
| Combat rules and presentation          | [combat](../wiki/combat.md), [battlefield](../wiki/battlefield-test-maps.md) |
| Progression research (20 games)        | [progression-research](../wiki/progression-research.md)                      |
| Visual acceptance                      | [VISUAL_CRITIQUE](VISUAL_CRITIQUE.md)                                        |
