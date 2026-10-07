# B2 — Autobattle and «go to a settlement and log out»

Execute with [00-common.md](00-common.md). Type: code + UI + text.
Time box: 8 agent-hours. Depends on: B1 merged (camp state). Blocks: B5.

## Goal

When a real hostile party attacks a company whose player is offline or has
delegated travel, the battle runs automatically with the same rules and engine.
The AI retreats when outmatched; wounds and deaths are real. The player can give
the order «идти в <поселение> и выйти»: the company travels, auto-fights any
encounter on the way, and lodges on arrival. On return the player reads a report.

**How the owner will try it:** order the company to Kamenny Brod across a road
with a known band, log out, log back in later: the company is in town, the report
shows the fight, the retreat or win, wounds and losses.

## Owner decisions (verbatim)

- 2026-10-07: «Враги могут напасть, но будет автобой».
- 2026-10-07: «Да, ИИ отступает. Игрок в целом может указать ИИ идти в город и
  выйти — если будут по пути битвы, ИИ будет их играть».

## Must read

- `docs/wiki/vision.md#компания-без-игрока`; `docs/wiki/bestiary/world-rules.md`
  (2026-10-07 amendment), `docs/wiki/bestiary/encounters.md` (retreat).
- `docs/wiki/battlefield-test-maps.md` (current combat presentation decisions).
- Code: `packages/game-core/src/combat/ai.ts` (`chooseAiCommand`, `runAiBattle`),
  `engine.ts`, `rules.ts`, `runtime-v2.ts`, `setup-v2.ts`, `replay.ts`;
  `packages/game-core/src/world/population.ts`, `continuous-movement.ts`;
  `apps/server/src/encounters/ai-worker.ts`, `executor.ts`, `admission.ts`,
  `effects.ts`; `apps/server/src/world/route-worker.ts`, `continuous-movement.ts`.

## In scope

- Retreat doctrine for the player side under AI control.
- Encounter trigger against camped or delegated companies by real hostile parties.
- Delegated order «go to settlement and log out» with lifecycle
  (issued → travelling → arrived/lodged | interrupted by defeat).
- Battle report on return built from the persisted event log.

## Out of scope

Autobattle involving a second player's company. New enemy types. Changing combat
rules or balance. PvP.

## Design constraints

- Same engine: autobattle = existing battle setup + AI for both sides; no
  separate resolver, no shortcut formula.
- Retreat doctrine: start retreating when the side's strength (sum of current
  HP and armour of able fighters) falls below **50 %** of the enemy's, or when
  morale of the leader breaks; retreating fighters move toward the battle edge
  and leave when they reach it. Record the thresholds in a versioned doctrine.
- Who may attack: only hostile parties from `population.ts` that see the camp
  (existing visibility rules) or whose path crosses the company; never in a
  settlement except during a capture crisis (B5 flag, default false).
- Deterministic: seed from the encounter ID; replay reproduces the battle.
- Persist atomically: battle result, wounds, deaths, loot, retreat, and the
  order state in one transaction; idempotent on restart.

## Steps

1. **Contract.** `docs/work-packages/M1-AUTOBATTLE.md`: trigger, doctrine,
   order lifecycle, report content, persistence, AC. Commit.
2. **game-core.** Retreat doctrine and an autobattle entry that wraps the
   existing setup/run. Tests: deterministic replay, retreat triggers at the
   threshold, no fighter teleports, deaths only through rule effects. Commit.
3. **Server.** Trigger for camped/delegated companies; delegated order worker;
   transaction; restart idempotency test. Commit.
4. **Web.** Order button on the map/settlement picker; on login a report:
   where, against whom, outcome, wounded, dead, retreat, loot. Strings in
   `i18n/autobattle.ru.ts` / `.en.ts`. Commit.
5. **Combat stress.** `pnpm test:combat:stress` must still pass.
6. **Journey.** Two plays: one won, one retreated (adjust the band or company
   for the second). Critics. Commit.

## Acceptance criteria

- **AC-1** The same seed and setup produce the same autobattle events (test).
- **AC-2** The player side retreats when below the strength threshold; fighters
  leave through the edge; the report says «отступили» (test + journey).
- **AC-3** Deaths and wounds in autobattle use the normal rule effects and are
  persisted (test).
- **AC-4** No autobattle starts against a company lodging in a settlement
  (test).
- **AC-5** The delegated order reaches the settlement, fights on the way and
  lodges; survives server restart mid-route (integration test or journey).
- **AC-6** Report on login in ru and en, matching the persisted events
  (screenshots).
- **AC-7** `pnpm test:combat:stress` passes.

## Critique

- Code: `warwrit-critic` — determinism, atomicity, restart idempotency, same
  engine, no hidden-state leak.
- Text: `warwrit-text-critic` — the report reads like a company chronicle line,
  not a log dump.
- Visual: `warwrit-visual-critic` — order UI and report in game.
- Journey: both plays.

## Stop and ask

- If the current engine cannot run without a human controller for the player
  side without changing combat rules.
- If visibility rules do not exist for camps and you would have to invent them.
