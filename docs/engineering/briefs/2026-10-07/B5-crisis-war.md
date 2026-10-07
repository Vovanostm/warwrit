# B5 — World crisis: the duchies' war comes to Porechye

Execute with [00-common.md](00-common.md). Type: design + code + UI + text.
Time box: 10 agent-hours. Depends on: B2 and B3 merged; CURRENT_PLAN stages 3–6
stable. Do not start earlier — ask the parent.

## Goal

One crisis type works end to end: a regiment of one duchy enters Porechye,
captures settlements (not destroys them), deserters and rival mercenaries
multiply, both sides post contracts, and companies can retake and restore a
captured settlement. All companies see the same crisis.

**How the owner will try it:** in a local world with two companies, trigger the
crisis; watch a regiment take Severny Dvor; take contracts from both sides;
retake the village; see it restored.

## Owner decisions (verbatim)

- 2026-10-03: one worked crisis type; settlements «могут быть разорены или
  захвачены, но их можно вернуть к жизни игровыми действиями».
- 2026-10-07: «Да, поселения захватывают. Дополнительные кризисы — волны
  чудовищ». Monster waves are a later brief, not this one.

## Must read

- `docs/wiki/vision.md#кризисы`; `docs/wiki/world/index.md` (duchies, war,
  Zhitnoe and Polesye, coins); `docs/wiki/world/porechye.md`.
- Battle Brothers Noble War reference (sources in vision.md).
- `docs/wiki/m1-spec.md` §18 stage 7; `docs/work-packages/M1-LIVING-PLACES.md`.
- Code: `packages/game-core/src/world/` (`population.ts`, `continuous-*`),
  `packages/game-core/src/contracts/`, B3's generator; `apps/server/src/world/`,
  `apps/server/src/contracts/`; `apps/web/src/game/WorldMap*.tsx`, `PlaceScene.tsx`.

## In scope

Crisis state machine; regiment parties; capture and occupation effects on a
settlement; crisis contracts for both sides via B3 causes; restoration; map and
place visuals for occupation; text.

## Out of scope

Monster waves. Destruction of settlements. PvP between companies. Joining a
duchy permanently.

## Design constraints

- Phases: rumour → arrival → capture → occupation → relief → restored. Each
  phase has entry/exit conditions on world facts.
- Capture changes: who holds the place, its watch, prices, available services,
  which issuers offer work. Never deletes people or buildings.
- Contracts for both sides; taking one side's contract makes that side's
  issuers friendlier and the other's colder in that region only.
- Companies' results move the crisis (e.g. regiment strength, supply); the
  server clock alone does not decide the outcome.
- Deterministic and shared; one crisis state for all companies.
- Lore: the regiment, banner and officers follow `world/index.md`; no new
  duchies, gods or magic.

## Steps

1. **Contract.** `docs/work-packages/M1-CRISIS-WAR.md`: phases, triggers,
   capture effects, contracts per phase, restoration, AC. Owner reads the phase
   table (stop and send to parent). Commit.
2. **game-core.** State machine + effects + tests (determinism, no destruction,
   restoration reachable, shared state). Commit.
3. **Server + B3 integration.** Crisis causes feed the contract generator. Commit.
4. **Web.** Occupied settlement on the map and in the place scene (banner, guards,
   changed services); crisis news line. Visual critic. Strings in
   `i18n/crisis.ru.ts` / `.en.ts`. Commit.
5. **Journey.** Two companies, full crisis to restoration. Critics. Commit.

## Acceptance criteria

- **AC-1** Owner approved the phase table.
- **AC-2** A captured settlement is retaken and restored by player actions
  (journey).
- **AC-3** No settlement, person or building is deleted by the crisis (test).
- **AC-4** Both companies see the same crisis phase and holder (test + journey).
- **AC-5** Contracts from both sides appear in the relevant phases (journey).
- **AC-6** Visual critic ACCEPT on occupied place and map, day and night.
- **AC-7** Text critic ACCEPT on crisis news and contract texts ru+en.

## Critique

Code, visual, text and journey critics as in 00-common §5.

## Stop and ask

After step 1 (owner reads phases); if capture requires changing settlement
ownership models outside world/contracts.
