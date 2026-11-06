# M1 local playtest

Current status (2026-11-05): the atlas, hunt markers, treatment and local hire/Join
are merged. Recovery/payroll candidates and full-loop acceptance are tracked in
[the current plan](CURRENT_PLAN.md) and [M1 assessment](../wiki/m1-spec.md#state-2026-11-05).
Dated gaps below are historical. This guide is a scenario, not evidence that the
whole current game or its stated session duration passed a new playtest.

How the owner plays the M1 alpha on the Mac in Chrome, what to look at, and what is
known to be missing. Start the stack per
[LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#development-processes); live status is in
[CURRENT_PLAN](CURRENT_PLAN.md). The earlier 2026-09-29 company-opening evidence
that lived in this file is in git history (commit `97d8480`).

## Reproducible launch contract — #176, 2026-11-06

Owner requested spec → independent review → implementation → independent review
→ merge → update main. Sole writer uses `codex/repro-launch176` in
`.claude/worktrees/repro-launch176`, based on main `149fa8e6`. Reuse PR334's
production configuration guard and its PR. Shared documentation belongs to this
writer for this slice. Other delivery histories and retained worlds stay intact.

Observable result: a fresh checkout starts the ordinary painted-atlas game,
creates a company through local Dex OIDC, then restores that same account/company
and accepted player actions after stopping and restarting the complete stack.

- Install pinned Node24.20/pnpm11.25 with the frozen lockfile. Build required
  workspace exports before ordinary development startup. No hidden copied dist,
  configuration, account or company from another checkout.
- Configure one explicit Compose project, private PostgreSQL/Dex volumes and
  unused loopback ports. Keep existing default ports supported. Dex issuer,
  callback, web origin, API and realtime proxy must agree. Ordinary **Войти** is
  the identity acceptance path. Quick company login and encounter fixtures do
  not establish that result.
- Require database-backed complete OIDC configuration before production startup,
  reusing PR334. Production refuses fixtures/lab modes. Development health-only
  tools retain their existing contract.
- Check HTTP200 live/ready after migration. Stop only this project's PostgreSQL
  while the API runs: live200 and ready503. Restart it: ready200. Readiness checks
  database/schema availability. Issuer reachability is verified separately by
  discovery and actual login, rather than promised by the database probe.
- Gracefully stop owned development processes and `pnpm db:down` without volume
  deletion. Repeat up/migrate/dev, reload and logout/OIDC login. Verify the same
  account/company, equipment/supplies and accepted contract using UI and read-only
  SQL. Campaign time can advance offline according to existing rules.
- Reach one ordinary encounter through normal travel/contract/JOIN and verify
  realtime connection. This is launch smoke, with full battle/reward acceptance
  retained by the gameplay owners.
- Document exact commands, troubleshooting, actual checks and limits in the
  existing runbook/playtest/wiki/checkpoint/changelog. Independent source review
  follows implementation. Final full gate is the existing clean PR CI sequence.

Reserved resources: Compose `warwrit-launch176-20261106`, PostgreSQL54376,
Dex5576, API3576, realtime3577, UI5276. No deployment, purchase, schema/rule
change, separate orchestrator, retained-volume deletion or external-provider
acceptance is included. Spec review and runtime checks are initially NOT_RUN.

## Проверенный обычный путь рисованной карты — 2026-10-29

Текущий локальный кандидат: `codex/game-painted-map`, база `48d8a2ae`.
Результаты и ограничения принадлежат
[действующему контракту карты](../work-packages/WORLD-MAP-NAVIGATION-LAB.md#ordinary-integration-checkpoint--2026-10-29).
Это проверка карты в игре; полный M1, бой и публичная публикация ею не приняты.

Для нового окружения `WORLD_MAP=painted-atlas` выбирает отдельный мир
`world.porechye.atlas-v1`. Отсутствующее значение сохраняет legacy `main`.
Не переключайте существующий мир, ожидая автоматического переноса: старые
компании, координаты и принятые пути не мигрируют. Пример настройки находится
в [`.env.example`](../../.env.example); общий запуск — в
[LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#development-processes).
Сохраняйте базу при остановке и повторном запуске; новый плейтест использует
отдельно названную базу, а не сброс имеющегося мира.

Проверенный автором стенд: UI `http://127.0.0.1:5228`, API3228, realtime3229,
локальный Dex5618. Вход player-one → новая компания с одним спутником →
ПКМ на известную землю → прибытие → reload сохраняет положение. ПКМ на
поселение задаёт маршрут; `S` или пробел останавливает. ЛКМ по месту открывает
просмотр: входы доступны после настоящего прибытия. Колесо приближает,
перетаскивание двигает камеру; раздел «Отряд» сохраняет снаряжение и припасы.
Ночной вид проверен при естественной смене света. Неизвестные части атласа
закрыты сервером; чёрная/бумажная область не является отсутствующим артом.

Ниже сохранена историческая инструкция legacy-пути. Её «Выступить», времена
дорог и перечень пробелов не описывают новый рисованный кандидат. Текущую
готовность всех систем смотрите в [M1 §17](../wiki/m1-spec.md#17-что-выполнить-до-полной-работоспособности-m1).

## Start

### Ordinary entry checked — 2026-11-06

On main `b89f4128`, a fresh isolated PostgreSQL world passed the ordinary local
Dex OIDC flow (the **Войти** link), company opening with two selected companions,
all nine equipment actions, a ten-ration purchase and acceptance of the real
local mill-worker offer. No account/company/position/health/money edits were used.
The unfilled opening form and a third companion were disabled; quantity zero
disabled purchase. Ten rations cost40crowns: treasury800→760, stock300→290;
company rations27→37 after the existing upkeep settlement.

Normal logout and another OIDC login, including a separate browser context,
restored the same company, all equipment,37rations,760crowns and the accepted
contract. SQL readback found one account/company,11company receipts
(opening+nine equips+purchase) and one accepted mill-worker receipt. The contract's
remote steps correctly named their location/prerequisite blockers.

Owned resources: Compose `warwrit-entry369-20261106`, PostgreSQL54369,
API3528/realtime3529/UI5228; retained player databases were not touched.
Local evidence: output/playwright/entry369/ (untracked).
The initial browser reached Vite before the API was ready; a reload after ready
recovered. A shared CLI version mismatch required switching browser automation;
neither is a gameplay defect established by this check. External-provider login,
new combat/reward/rest/payroll/restart, full visual/device/human acceptance and
the full M1 remain NOT_RUN. Next: #371/PR335 exact ordinary-request recovery.

```bash
pnpm db:up && pnpm db:migrate:up && pnpm dev
```

Open `http://127.0.0.1:5173` and choose **Войти**. Fixture accounts:
`player-one@example.test` / `local-only-pass-one` and
`player-two@example.test` / `local-only-pass-two`. Use a second Chrome profile
or a private window for the second player.

For a fresh test world, allocate a separate named database/Compose project.
Stop and restart the existing stack without deleting its volumes; retain company
state and backups. The former destructive reset recipe is withdrawn on 2026-10-29.

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

## Known gaps (2026-10-02)

- Unarmed («кулаки») and incapacitated (wait/retreat only) combat profiles are
  not implemented; a party with a member who holds no weapon cannot join a fight.
- F1 (safe service at a settlement) and paying wages are not available in the
  interface; wages accrue as debt shown in **Отряд**. There is no shop: rations
  are only the starting stock, so use camps on long trips.
- Mac performance and frame rate are `NOT_MEASURED`.

## Profile correction in progress — 2026-10-20

Local source9eee0ce adds real fists and co-located immobile members in persistent
combat; it does not yet supersede main's unavailable-profile behavior. Fists use
range1, base damage6,2AP/8stamina, no penetration or weapon-skill XP. An immobile
member cannot move/retreat independently. Critical-bleed attack/defence policy
awaits the owner; rescue/transport remains unavailable.

Author focused tests/types passed. Final mixed-party browser, terminal and real
process-restart acceptance remain pending; see [combat profile status](../wiki/combat.md#company-profile-implementation--2026-10-20).
The dated2026-10-02 gaps above are historical, not a current inventory of all UI
features (for example, food purchase has since been delivered).

## Delivered profile and persistent HUD — 2026-10-20

The earlier policy-pending/local-only profile note is superseded by merged
PR241 and the owner's explicit decision: critical bleeding permits attack and
defence while movement and independent retreat are forbidden. Fists retain
range1/damage6/2AP/8stamina and no weapon-skill XP. Rescue/transport remains
undefined. The bounded wolf hunt uses the tactical bridge from PR246 and the
shared fullscreen commander from merged PR247. Unmapped abilities remain
unavailable; unsupported surrender outcomes remain pending without payment.
[Current delivery and proof boundaries](evidence/persistent-hud/main-readback.md).
The representative trophy/payment/restart check is in progress, not full M1
or a new external sign-in/company-creation acceptance.
