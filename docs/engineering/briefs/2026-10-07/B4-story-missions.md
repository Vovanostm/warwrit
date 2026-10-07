# B4 — Missions without combat: detective and visual novel

Execute with [00-common.md](00-common.md). Type: story + code + UI + text.
Time box: 10 agent-hours (story 3, engine and UI 7). Depends on: nothing.

## Goal

A playable non-combat mission engine and the first mission **«Кто выдал
тайник»**: in Severny Dvor the company questions people, inspects places,
collects findings and testimony, notices a contradiction and names who told
Khariton Obukh's band about the grain hidden at the Old Mill. Scenes play as
illustrated panels with portraits and dialogue; choices are limited to what the
company knows. A right and a wrong accusation lead to different consequences.

**How the owner will try it:** after «Когда молчит мельница», Kondrat offers the
new mission; the owner plays it twice, accusing different people, and sees
different endings.

## Owner decision (verbatim)

- 2026-10-07: «Надо добавить часть миссий — визуальные новеллы, а не бой,
  детективы».

## Must read

- `docs/wiki/vision.md#миссии-без-боя-новеллы-и-детективы`.
- `docs/wiki/world/porechye.md` (Kondrat Ovsyanik, Senka, Ulita Tkachikha,
  Petrus, Obukh's band; «о тайнике знали трое»), `world/index.md`.
- `docs/wiki/world/writing.md`, `world/literary-style.md` (sample 4, voices).
- `docs/engineering/TEXT_CRITIQUE.md`, `VISUAL_CRITIQUE.md`.
- `docs/work-packages/M1-LIVING-PLACES.md` (place panels, buildings).
- Code: `packages/game-core/src/contracts/` (INVESTIGATE template, runtime);
  `apps/web/src/game/PlaceScene.tsx`, `PlaceActivity.tsx`, `place-buildings.ts`,
  `ContractBoard.tsx`; `apps/server/src/contracts/`.

## In scope

- Authored mission story (truth, suspects, places, findings, testimony,
  contradiction, outcomes, late-company behaviour).
- Story mission data model and pure reducer in game-core.
- Server runner and persistence; scene UI on place panels with portraits.
- Text ru+en.

## Out of scope

Combat inside the mission (an optional «драться» branch is not required).
New canon beyond Porechye. Voice acting, music.

## Design constraints

- Story first. The owner reads and approves the story (step 1) before code.
- Truth fixed in data before play; the game never changes the truth after the
  player's guess.
- Knowledge is per company; testimony and findings are facts the company
  learned, with source and time; the accusation screen offers only people the
  company met.
- Payment only for a proven accusation (the contradiction found); a wrong
  accusation has world consequences (trust, who leaves, what Kondrat does) and no
  «proven» payment.
- Shared world: one truth; a later company learns the established outcome and
  gets different follow-up work, not the same riddle.
- Portraits: reuse existing portrait style; new portraits only after a visual
  critic ACCEPT on one sample. Use place art already in `assets/art/m1/places/`.

## Steps

1. **Story.** In `docs/wiki/world/porechye.md` add a dated section «Кто выдал
   тайник»: truth, three suspects (name, want, lie, what they know), places,
   8–12 findings/testimony items, the contradiction, right/wrong outcomes, late
   company. Text critic until ACCEPT. Then stop and send the story to the parent
   for owner approval (§8). Commit.
2. **Contract.** `docs/work-packages/M1-STORY-MISSIONS.md`: data model (scenes,
   conditions on known facts, choices, outcomes), reducer, persistence, UI,
   AC. Commit.
3. **game-core.** Model + reducer + validator (no unreachable scene, every
   outcome reachable, truth consistent). Tests: wrong accusation never pays,
   knowledge per company, determinism. Commit.
4. **Server + web.** Runner, journal of findings, accusation screen, scene
   panels with portraits. Strings in `i18n/story.ru.ts` / `.en.ts`. Commit.
5. **Journey.** Play both endings. Critics. Commit.

## Acceptance criteria

- **AC-1** Owner approved the story (quote the approval in the handoff).
- **AC-2** The mission is playable start to finish in the running game, with two
  different endings (journey screenshots).
- **AC-3** The accusation lists only people the company met; the «proven»
  payment requires the contradiction (test).
- **AC-4** Knowledge is per company; a second company does not see the first
  one's testimony (test).
- **AC-5** Validator rejects unreachable scenes and missing outcomes (test).
- **AC-6** Text critic ACCEPT on the full mission text ru+en.
- **AC-7** Visual critic ACCEPT on the scene panel layout, day and night.

## Critique

- Text: `warwrit-text-critic` on the story (step 1) and on the final in-game text.
- Code: `warwrit-critic` — knowledge separation, truth immutability, payment rule.
- Visual: `warwrit-visual-critic` — scene panels, portraits, readability.
- Journey: both endings.

## Stop and ask

- After step 1 (mandatory owner approval).
- If the mission needs a canon fact outside Porechye.
