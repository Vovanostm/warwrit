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
acceptance is included. Spec review ACCEPT. Current results are recorded below.

### Launch implementation and verification — 2026-11-06

The candidate reused PR334 on main149fa8e6; its merged delivery is recorded below. Independent specification
and executable-source review ACCEPT. Fresh frozen install passed on Node24.20.0 /
pnpm11.25.0. Plain `pnpm dev` first reproduced missing `game-core`/`protocol`
exports. The root command now builds both before starting API/web. Dex supports
private port/config selection through the existing Compose stack. The
[runbook](LOCAL_DEVELOPMENT.md#isolated-ordinary-game-worktree--176) contains the
exact tested setup. Migration up applied all19 migrations to a new private world.

The first actual database shutdown terminated the API on an unhandled idle `pg`
pool error. The pool now handles that event with a fixed structured warning,
without logging error/client connection details. Pinned `pg-pool` removes the
failed client itself. Repeating the same real outage returned live200/ready503;
PostgreSQL recovery restored ready200 without restarting API. Missing production
configuration exits1 before listening. Identity discovery returned the correct
private issuer. Database readiness does not promise external issuer availability.

Ordinary **Войти** → local Dex player-one → **Дозор запуска** with Rell/Mora and
leader Радан passed. All9 equipment actions, ten rations for40crowns and the
local **Когда молчит мельница** contract were accepted. Starting upkeep left27
rations, then purchase gave37 and treasury760. Ctrl+C stopped the dev processes
and released API/RT/UI ports. `pnpm db:down` retained both volumes. After up,
migration applied[]/pending[]; reload and logout/ordinary OIDC login restored the
same account/company, equipped items,37rations,760crowns and accepted contract.
Read-only SQL retained one account/company and receipt counts11company +1contract.
No game-state SQL writes or fixture entry were used. Campaign time advanced normally.

Focused config/app/database tests16 PASS; server types/scoped lint PASS after
building testkit for test declarations. Initial typecheck lacked those generated
exports, and the added regression's first spy-context typing needed correction.
Scoped format/diff PASS. Prettier cannot parse `.env.example`; Compose parsing
and actual startup verify that file. Browser CLI first hit a nonexecutable wrapper
and restricted npm cache; native in-app browser completed the ordinary flow.
The first form submission coincided with the deliberate DB outage and failed
without company creation; retry after recovery created exactly one company.

Ordinary right-click travel from Северный Двор to Березняк completed. The
**Волчья тропа** contract was accepted at its actual issuer, and **Вступить в бой**
created encounter b22828d2-304f-4f47-8d87-71ec9899e8a2 with company_binding
admission. UI displayed all6 fighters and **Сводка боя синхронизирована**;
read-only socket inspection confirmed an established realtime3577 connection.
No fixture admission or position edit was used. No manual combat action was sent;
the ordinary deadline marked the observing player AFK. The API/web were then
stopped, preserving the active encounter.

### Merged launch closeout — 2026-11-06

[PR334](https://github.com/Vovanostm/warwrit/pull/334) MERGED at 18:24 UTC as
bd919d1a5be4eee5766e404e464f6caca8bfe48e, expected head
adedf6c0166ef3bbcd20452902df96c1624d55ec enforced. Issue176 CLOSED. GitHub main,
origin/main and the clean main checkout `.claude/worktrees/agent-harness-cleanup`
were read back at that merge. Ordinary diff found no content change between the
reviewed head and actual merge. The original dirty sprite-combat checkout remains
with its existing owner.

[CI42266945856](https://github.com/Vovanostm/warwrit/actions/runs/42266945856)
SUCCESS, full logs read. Existing bootstrap passed 1259 tests with 98 skipped, 10000 combat
stress battles, migration smoke and 88 real PostgreSQL/auth checks. Both real world-map
and ordinary painted-game browser journeys passed. Measured units, source-checked
browser aggregation and unchanged quality audit passed. Final
[PR scope42267008090](https://github.com/Vovanostm/warwrit/actions/runs/42267008090)
SUCCESS; the earlier same-head scope run was cancelled when the PR body update
triggered its replacement. Final code and documentation source reviews ACCEPT.
Runtime evidence above is author-owned; the reviewer did not replay browser/SQL.
The isolated development processes were stopped after smoke and project volumes
retained. Runbook restarts the same stack. Hosted checks do not replace the wider
M1 acceptance. External-provider, full battle/reward, backup/restore, deployment,
full visual/device/human acceptance remain NOT_RUN. FPS/capacity NOT_MEASURED.
Local execution logs are under output/ (untracked).

### Post-review blank-database correction — 2026-11-06

Owner requested another review/fix/PR/merge cycle after the initial delivery.
With complete OIDC and a blank `DATABASE_URL`, development/test returned
identity configuration without a usable database. The actual entry process answered ready200 and auth/session404.
Production already refused the same input at its later mandatory-dependency guard.

Normalize the trimmed empty URL to missing once, before all existing requirements.
Identity and encounter-fixture setup now reject it before app construction.
Parameterized regression covers development/test/production with absent/empty/
whitespace URLs, plus valid padded URLs. Fixture setup also checks blank values.
The old implementation failed the new matrix. After correction the real entry
process exited1 with `OIDC identity requires DATABASE_URL` and no listener3586.
The previously retained world/volumes were not started or changed for this check.

Branch `codex/launch-blank-database`, base0f9ea2a1. Focused config/app/database
checks19, server types and scoped lint/format PASS. Independent source review
ACCEPT. The reviewer did not execute product or runtime checks. Fresh browser/SQL replay NOT_RUN for this configuration-only change.
The earlier accepted valid-configuration journey remains historical evidence.
[PR407](https://github.com/Vovanostm/warwrit/pull/407) is published. Owner resumed
with explicit continue/merge permission. Main a2348871 (recovery PR363) advanced
during the first CI. Integrate it while retaining both document histories and
the recovery owner's current checkpoint. The blank-database correction is
unchanged. Integrated protocol build, server types and19 focused tests PASS.
[PR407](https://github.com/Vovanostm/warwrit/pull/407) MERGED at 19:59 UTC as
4c1f0ce477a9f4f608e3c309a1ac32d9ad98b4d0 with expected head
32b4cca2c4c715d60d12475e8246af4b0eb198e1. Live GitHub/origin/main and the clean
main checkout were read back at that merge. Reviewed and merged contents match.
Independent integration/source review ACCEPT applies to the unchanged correction
and the shared-document conflict resolution, without re-reviewing recovery.

[Integrated CI42280535817](https://github.com/Vovanostm/warwrit/actions/runs/42280535817)
and [scope42280535469](https://github.com/Vovanostm/warwrit/actions/runs/42280535469)
SUCCESS, logs read. Existing bootstrap passed 1264 tests with 99 skipped,
10000 stress battles, migration smoke and 89 real PostgreSQL/auth scenarios.
Both world-map and ordinary painted-game browser journeys passed. Measured units,
browser aggregation and unchanged native quality audit passed. The first
pre-integration CI42276113660 also passed, but current acceptance uses the
integrated run. No retained-world access was needed for the author regression.
Full M1/hosted/external-provider and visual/device/human limits remain.

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

## Current correction to historical gaps — 2026-11-06

The supplies shop is available through settlement buildings and was exercised in
this launch check. Unarmed profiles exist in current main. The dated no-shop /
unimplemented-fists bullets below describe2026-10-02. Recovery/payroll delivery
and the complete eight-contract acceptance remain tracked in CURRENT_PLAN and
M1 assessment. This launch check does not establish their completion.

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

## Same-company next contract — #368, 2026-11-07

Owner requested the next issue after approving payroll2b1e834c. PR338 merged as
b1c7264e, with fullCI42286898832 and final scope42291895718 PASS; local main readback
matched with an empty approved-head diff. Recovery PR363/#169 is also integrated.
Parent owns branch codex/m1-next-contract-368 in the existing payroll-integration
worktree. Reserve ordinary contract/player continuation plus its owning docs.
The separate #378/PR408 hostile-retreat writer retains its encounter/core scope.

Use the same retained Company2, company4c9a440c-1795-4156-a82b-d46c16f25f77,
partya93231cb-3691-40f3-ba5b-7c94bfca3fcf, and database
warwrit_payroll_native_20261105. API3598/realtime3599/UI5398 and relay3597 remain
owned here; PostgreSQL maps to32769 and Dex5618 is retained. New ignored records
are output/playwright/next-contract368-20261107/. Original native records and
saves stay intact. Prior assisted battle and full-M1 limits remain.

Initial route plan, superseded by the actual result below. The ordinary UI
showed accepted HUNT-02, Волчья тропа. All three living members had100HP FIELD; Mora retains a treated severe wound, the captain remains dead,
and cash693.94 follows the real50 payroll. The physician is unarmed; normal fist
profiles are supported. Inspect/equip available gear before entering a timed fight.

- [ ] Ordinary preparation/travel with existing provisions reaches Березняк.
- [ ] Same-company JOIN, real three-wolf outcome, source-bound pelt pickup and
      ordinary PRESENT yield the fixed80-crown reward once.
- [ ] The same party can take its next ordinary action after the reward.
- [ ] Owned server restart/re-entry retains company, people, custody, knowledge,
      cash and receipts once. No saved-state/time/seed/health/position edits.

Use ordinary UI and read-only SQL. Fix only the first reproduced blocker. An
already working path needs a source-grounded result rather than a filler code
change. At activation, native checks and independent final critique were pending.
The actual result below supersedes this plan.

### Actual result — #368, 2026-11-07

**LOCAL native PASS, independent finite journey ACCEPT.** Issue368 permits one
available authentic next contract. Existing game code already supports this
result; no product code, migration, dependency or new test was required.

The initial wolf route was not completed. Ordinary gear preparation and travel
reached the exact Березняк/деревенский луг anchor. The accepted wolf card referred
to the previous lost encounter039c5bab-6e4d-4f5a-93b4-a5a3b517ce8c, with dead
captain, two dead wolves and a living leader with24HP. There was no new JOIN or proof.
The UI still described readiness; that feedback/continuation boundary stays with
#380/#409. No state, time, health, seed, position or reward was edited. Route
planning took44 ticks; no exact stopwatch duration was measured.

The same recovered/paid Company2 instead completed **Пропавшие травы / INVEST-02**,
ci.m1.missing-herbs.01, through ordinary UI at Березняк.

- [x] Accept at the herbalist and record missing stock, fact
      missing-herbs-stock-record at7416.
- [x] At night, inspection is visibly unavailable with «ночью следов не
      разглядеть»; report is also unavailable. This is a UI prerequisite check,
      not an executed HTTP409 refusal. Natural daylight enables inspection.
- [x] Inspect the meadow at7419, retaining missing-herbs-trail-observation and
      «Свежие срезы у корня, ножом. Тропа уходит к Северному Двору.»
- [x] Report to Agafya at7421, retaining missing-herbs-report, SUCCESS/revision4
      and the visible paid state. Treasury693.94→733.94 is exactly40 crowns.
      Four ordinary-contract receipts contain one rewardQ40000000.
- [x] Take the next ordinary action. Buy one ration for4crowns at the bazaar,
      treasury733.94→729.94, rations6→7 and stock300→299.
- [x] Restart only the owned API and re-enter. Captured before/after reports are
      deeply equal, preserving company, people, custody, observed knowledge,
      cash, hunt/proof rows and captured receipts/audit. The helper excludes the
      ordinary_contracts row. Before/after UI and a separate after-restart query
      retain its three authentic facts, SUCCESS/revision4 and paid state.
      Re-entry offers no repeat reward and records no duplicate purchase.

Native journey source is merged payroll b1c7264e, branch checkpoint a97004bd.
Five1440×900 images cover night refusal, daytime clue, paid result, next purchase
and re-entry. The independent read-only critic inspected all five and the saved
reports, accepted the finite criteria and found no material issue. Optional shop
text polish remains «Купить 1 рационов».

Current main 668dc68b (PR408/412) was then integrated with product source unchanged
from main. Protocol build PASS, owned API restart/readiness PASS and ordinary
re-entry/Place smoke PASS at1440×900. Same company/party at Березняк, paid herb
card, learned clues,729.94crowns and four quest receipts remain. The old lost
wolf card still says «принят, ждёт участия»/«Отряд готов к бою» without JOIN;
PR408's hostile-escape guidance does not cover this defeat. Preserve it for its
bounded follow-up; do not infer that the hunt was completed.

Detailed ignored local records are in
output/playwright/next-contract368-20261107/, including before-restart.json,
after-restart.json, ordinary-herbs-retained.json and current-main-retained.png.
An earlier travel snapshot recorded a transient Colyseus offline warning;
current-main retained-view console has no error. This is finite continuation
and persistence evidence. All-eight-contract, new-player first-hour, whole-scene
art/device acceptance, capacity and full backup/restore remain outside #368.
Game suites and fresh CI NOT_RUN for this documentation-only closeout.
