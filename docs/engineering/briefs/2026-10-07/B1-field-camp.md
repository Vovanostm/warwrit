# B1 — Field camp: slower upkeep, gathering, offline presence

Execute with [00-common.md](00-common.md). Type: code + UI + text.
Time box: 6 agent-hours. Depends on: nothing. Blocks: B2 (camp attacks).

## Goal

A company camped in the field spends food and wages more slowly than one on the
move, gathers food and materials that depend on the terrain, and stays camped
when the player logs out. Logging out in a settlement puts the company on lodging.

**How the owner will try it:** make camp in a forest, wait some campaign time,
see the spend rate and the gathered goods; log out, log back in, the company is
still camped and the numbers advanced correctly.

## Owner decisions (verbatim)

- 2026-10-07: «Если компания разбила лагерь в поле — еда и жалование
  уменьшается, но чуть медленнее — в лагере будет охота, добыча ресурсов в
  зависимости от местности. Враги могут напасть, но будет автобой. В поселении
  безопаснее выходить из игры».
- This replaces the M1-spec §7 camp rule («лагерь предоставляет только текущую
  еду…; полная выплата жалованья сохраняется») for camps.

## Must read

- `docs/wiki/vision.md#компания-без-игрока` — recommended rates and yields.
- `docs/wiki/m1-spec.md` §7 (company, camp, upkeep) with the 2026-10-07 amendment.
- `docs/work-packages/M1-SUPPLIES.md` — rations, start supplies, payroll.
- Code: `packages/game-core/src/company/economy-maintenance.ts` (FIELD_CAMP mode),
  `economy-accrual.ts`, `economy-advance.ts`, `economy-payments.ts`,
  `economy-departure.ts`, `economy-coverage.ts`, `commands.ts`
  (`BeginFieldCamp`/`EndFieldCamp`); `packages/game-core/src/world/continuous-region.ts`
  (terrain at a point); `apps/server/src/company/executor.ts`, `holdings.ts`;
  `apps/server/src/world/continuous-movement.ts`; `apps/web/src/App.tsx`
  (camp toggle), `apps/web/src/game/GameShell.tsx`, `CompanyPanel.tsx`.

## In scope

- Camp upkeep multiplier for food and wages.
- Gathering per terrain with a finite, regrowing local stock.
- Logout behaviour: field → stays camped (camp is begun if the company is
  stationary and eligible); settlement → lodging (existing F1 or settlement stay).
- UI: camp state, current spend rate versus moving, gathered goods log.

## Out of scope

Enemy attacks on camps and autobattle (B2). New goods beyond the list below.
Professions or crafting. Changing payroll dates or the wage amount itself.

## Design constraints

- Versioned profile `field-camp-profile-2026-10-07-v1` in game-core with:
  - food and wage spend multiplier while camped: **0.75** (both);
  - gathering per campaign day per worker able to work, by terrain:
    forest — game (ration units) and wood; river/shore — fish (ration units);
    meadow — herbs (medical units); ruins — finds (repair units); other — none;
  - local stock per terrain cell cluster with a cap and a regrowth rate;
    gathering never exceeds stock.
    Pick concrete numbers so that a camp of 3 in forest covers about **one third**
    of its food need; document them as provisional balance.
- Wages stay owed in exact Q units; the multiplier applies to the accrual rate,
  never by rounding money away. Show the rule in the work-package page.
- All new effects are pure functions of explicit ticks, terrain and stock.
- Lodging in a settlement: no attack can start there except during a capture
  crisis (B5). B1 only records the state; B2 enforces it.

## Steps

1. **Contract.** Create `docs/work-packages/M1-FIELD-CAMP.md`: current model (with
   code pointers), the change, the profile numbers, logout rules, out of scope,
   AC. Commit. Done when a reader can implement from it without asking.
2. **game-core.** Profile, upkeep multiplier, gathering and stock regrowth.
   Tests: conservation (no goods beyond yield ≤ stock), determinism (same inputs
   → same outputs), wage exactness, idempotent advance across split intervals
   (advance A→B→C equals A→C). Commit.
3. **Server.** Apply in campaign advance; logout handler: field → camp,
   settlement → lodging; migration only if state shape changes. Tests through
   the executor. Commit.
4. **Web.** Camp panel: spend rate «в лагере −25 %», gathered goods with terrain,
   stock left. Strings in `i18n/camp.ru.ts` / `camp.en.ts`. Commit.
5. **Journey.** Play: forest camp and meadow camp; advance time; logout/login;
   capture screenshots and numbers. Critics. Fix. Commit.

## Acceptance criteria

- **AC-1** Camped company spends exactly 0.75 of the moving food and wage rate
  over the same campaign interval (test with exact values).
- **AC-2** Gathering depends on terrain: forest and meadow camps of equal size
  yield different goods; a plain-field camp yields none (test + journey).
- **AC-3** Gathering never exceeds local stock; stock regrows at the profile rate
  (test).
- **AC-4** Advance is interval-split invariant (test).
- **AC-5** Logout in the field leaves the company camped; logout in a settlement
  leaves it lodging; both survive a server restart (integration test or journey).
- **AC-6** The camp panel shows the reduced rate, gathered goods and stock in
  Russian and English (screenshots ru/en).
- **AC-7** No regression: existing economy and supplies tests pass unchanged
  except where the old camp rule is intentionally replaced (list each changed
  expectation and why).

## Critique

- Code: `warwrit-critic` on `base..HEAD` with AC-1..7 and test outputs.
  Focus: conservation, exact money, replay/idempotency, old camp rule consumers.
- Visual: `warwrit-visual-critic` on the camp panel in game, day and night.
- Text: `warwrit-text-critic` on panel strings and any log lines (ru+en).
- Journey: `warwrit-critic` journey mode with the forest/meadow/logout log.

## Stop and ask

- If the economy cannot express a reduced wage accrual without changing
  accepted payroll semantics (e.g. wage debt rules).
- If gathering needs a new item definition not in the list.
- If the numbers make starvation impossible or trivial in a 10-day start.

## Handoff extras

Profile numbers and the one-third check; changed test expectations with reasons.
