# M1 local playtest

Dated launch and loop evidence removed 2026-11-09 ([previous edition](https://github.com/Vovanostm/warwrit/blob/87e785d537fc4bf4bbb6856456391015350d235b/docs/engineering/M1_LOCAL_PLAYTEST.md)). Launch steps: [LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md). The first full ordinary loop (#370) merged via PR414.

How the owner plays the M1 alpha on the Mac in Chrome, what to look at, and what is
known to be missing. Start the stack per
[LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#development-processes); status is in
[ROADMAP](ROADMAP.md). The earlier 2026-09-29 company-opening evidence
that lived in this file is in git history (commit `97d8480`).

## Start

Follow [the isolated ordinary-game runbook](LOCAL_DEVELOPMENT.md); then sign in and create a company.

## Time

- Campaign: 1000 ticks per day, one tick = 21.6 s. Roads take 8–16 ticks
  (≈3–6 minutes); the city to the mill is ≈9 minutes.
- Light: 10 minutes of day, 5 minutes of night (top bar). The mill beast shows
  itself only at night.

## Route of a session (about 1.5–2 hours)

1. **Company.** Create it; open **Отряд**: people, health, gear (equip with
   «взять»/«надеть»), rations, cash, wages owed.
2. **Map.** Click a settlement; **Путь** shows the road, time and rations.
   «Выступить»; the banner moves on the server clock. Sign out, stop and
   restart `pnpm dev`, sign in: the party is still on its road.
3. **Contracts** (tab **Место** at the issuer):

   | Contract                             | Issuer        | Steps                                                                                                                             | Reward |
   | ------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
   | Знамя у старой мельницы (FIRST HUNT) | Каменный Брод | accept → mill → fight 3 raiders → pick up the standard → present                                                                  | 100    |
   | Следы на дороге                      | Каменный Брод | inspect the bank at Тихая Гать → report                                                                                           | 40     |
   | Пропавший разведчик                  | Каменный Брод | search the bank at Тихая Гать → bring him back                                                                                    | 80     |
   | Пропавшие травы                      | Березняк      | ask → inspect the green by day → report                                                                                           | 40     |
   | Волчья тропа                         | Березняк      | fight three wolves there → pick up the pelt → present                                                                             | 80     |
   | Пленник в погребе                    | Тихая Гать    | free him at the mill once the raiders are dead → bring him                                                                        | 80     |
   | Когда молчит мельница                | Северный Двор | inspect the mill yard, ask the keeper at Тихая Гать → (the beast hunt opens) → free the worker once the beast is dead → bring him | 80     |
   | Ночной зверь у мельницы              | Тихая Гать    | opens after the two clues; fight the beast at night → claw → present                                                              | 90     |

4. **Battle.** 30 seconds per turn (counter in the turn line). Click an enemy
   for the target, a free hex for the destination, then the action. Drag/WASD
   move the camera, the wheel zooms. If the timer runs out you are marked
   inactive; «Вернуться к управлению» returns control after the next turn.
5. **Losses.** The fallen stay on the field and in the roster as «Погиб». If
   the leader falls, choose a successor in the battle panel; with nobody left
   the company's run ends.
6. **Camp.** At a place with no living enemies: **Место → Разбить лагерь**.
   Rations are not spent while camping; strike the camp before marching.
7. **Two players.** The second company can help a contract («Помочь
   владельцу»); both must stand at the objective and join. The reward goes
   once to whoever presents the trophy or delivers the person.

## What to report

For each session: what you tried, what you expected, what happened, and the
time on the top bar. Note anything slow (map or battle frame rate, waits
after a command), confusing texts, and any money that looks wrong.

## Complete first ordinary loop — #370, 2026-11-07

Owner assignment is implement, review, merge and update main. Writer
`codex/m1-full-loop-370` owns this continuation and its affected source/docs in
`.claude/worktrees/m1-full-loop-370`, based on integrated main `4a22a09c`.
The original dirty checkout and other stands remain independently owned.

### Player result and rules

Continue the ordinary new company prepared in #369 through a real hunt,
source-bound trophy/reward, care, food-supported rest, lawful pay and a next
available contract. Re-enter the same company after a real owned API restart.
#368 supplies independent next-contract/payroll/recovery evidence but does not
substitute for this company's first loop. Full eight-contract/M1 acceptance
remains with #177/#161.

- Normal journey uses ordinary sign-in, existing gear/supply/contract controls,
  actual map travel and encounter commands, trophy pickup and presentation,
  existing care/rest/payroll and the next offer.
- Refused actions expose their actual location, capacity, money, condition or
  time prerequisite. A defeat preserves casualties and the unfinished contract.
  Missing proof never earns a reward. No manual clock/state/health/money edits.
- Retry/re-entry must retain company/people, ownership, facts, exact cash and
  receipts. Restart must not duplicate rewards, care, purchases or pay.
- Existing company/domain command executor, world movement, durable encounter,
  proof claim and payroll remain their respective owners. UI renders their
  public projections. Fix only observed blockers through those boundaries.
  No new game rule, schema, dependency or alternate persistence is planned.
