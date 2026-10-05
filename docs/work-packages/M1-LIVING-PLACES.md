# Living places — 2026-10-04

Active owner request: make cities, villages and visited landmarks feel alive,
with parallax, highlighted entrances and at least ten building types with two
or three visual variants each, in one coherent style.

Parent `/root` is the sole writer on `codex/living-locations` in the primary
checkout, based on main `9c86605`. Existing player database and API are retained.
The independent visual critic is read-only. No merge or deployment permission.

## Observable outcome

Select a place on the map, open **Место**, explore its layered ink/wash scene,
hover or keyboard-focus a building and enter it when the party is physically
there. Return to the map without sending a movement command. Remote places
are previews, with entrance access disabled.

## Finite scope and decisions

- Ten types, each with rural, river and town variants: market, forge, elder's
  house, inn, chapel, herbalist, stable, guardhouse, mill and granary.
- Original transparent building sheets, three silhouettes per type. Shared
  black ink, weathered wood/stone, moss, ochre and rust palette under ADR-0006.
- Authored sets for Kamenny Brod, Bereznyak, Tikhaya Gat, Severny Dvor and the
  old mill. Existing painted landscapes supply the distant layer; buildings,
  foreground vegetation, smoke and night illumination supply depth and life.
- A building opens an illustrated place panel. The elder's house exposes the
  existing contract UI, forge links to the existing company equipment UI.
  Other interiors are descriptive visits; this cycle does not invent shops,
  healing, wages, recruits, goods or new NPC facts. Available existing contracts
  remain accessible from the place sidebar.
- Client presentation only. Actual movement mode/site controls entrance
  eligibility. No server, protocol, domain, migration or dependency changes.
- Native buttons, visible keyboard focus, Escape/return, touch selection,
  reduced-motion support and scoped pointer handling. No camera/game command
  on parallax or entrance selection.

## Owning files and checks

`apps/web/src/game/{GameShell,PlaceScene,place-buildings}` and place-scene CSS;
`assets/art/m1/places/buildings`, existing art manifest; this contract, current
plan and the existing wiki specification. No second source writer.

Focused web typecheck/build, changed-file lint/format, architecture check and
real authenticated browser journey (city/village/landmark, remote preview,
entrance, return, keyboard, reduced motion and narrow viewport). Independent
critic receives current captures and actual journey evidence before completion.
No full-M1 acceptance claim.

## Result

Implemented 2026-10-04. Ten transparent sheets contain three original variants
each. City, village, river settlement, farm and ruined mill use authored visual
sets. Persistent gold entrance labels distinguish actual access from disabled
remote previews. Layered pointer parallax, smoke, night shading, keyboard entry,
Escape and touch selection are available. The old mill retains its ruined
watermill image and one yard entrance; intact settlement mills have no local
contracts shortcut.

- Final `scripts/bootstrap.sh`: PASS, exit 0. Format/lint, architecture,
  dead-code, content, build/typecheck and unit checks passed: 604 checks,
  46 skipped. Combat stress: 10,000 battles. Migration/auth/encounter checks:
  14 passed, disposable PostgreSQL removed. Earlier interrupted run ended143
  and is not a pass. Existing player storage was not replaced.
- Final changed-code audit: PASS, three inherited findings excluded by the
  existing gate; no suppression or hook bypass. The action simplification made
  during the bootstrap is additionally checked through focused web typecheck,
  lint and authenticated browser readback.
- Actual browser: village visits for all ten entrances, elder/contracts and
  forge/equipment links, Enter/Escape with restored entrance focus, map return,
  city/river/ruin remote previews and 390px layout. Pointer motion gives distinct
  distant/building/foreground transforms. Final narrow width equals content
  width390. Current village scene fits1440×1000 with all ten entrances visible.
- Independent read-only critic inspected current source and fresh captures;
  reported no remaining established material issue after fixes for focus,
  persistent access labels, ruined-mill art, remote contract context and layout.
  Critic did not operate the browser or measure motion.
- NOT_RUN/NOT_MEASURED: live reduced-motion override, physical old-mill entry,
  device/performance matrix, subjective enjoyment and full M1 acceptance.
  Commerce, healing, repair, recruitment and new NPC services are unavailable;
  these visits are descriptive panels and links to existing actions.

Local playtest: `http://127.0.0.1:5287`, select a map place, then **Место**.
Enter a highlighted building where the party is present; **← Карта** returns.
Diagnostic captures remain local under `output/playwright/living-places`.
Published [PR139](https://github.com/Vovanostm/warwrit/pull/139), implementation
commit `584497b`, normal commit audit passed. GitHub CI pending at publication;
local checks do not prove its result. Canonical Airtable/Empirical publication
checkpoint NOT_UPDATED; repository files and PR own this delivery record.
NOT_MERGED; no deployment authorization.

## Owner correction — cohesive settlements, 2026-10-04

The owner rejected the overview as houses pasted over meadow texture and
requires a professionally composed, multilayer complete settlement. This
supersedes visual acceptance of the first cycle; earlier technical checks
remain historical evidence only.

Next observable outcome: open Bereznyak and see a coherent inhabited village
with lanes, courtyards, fences, supporting homes and grounded buildings in one
perspective and light. Painted distant scenery, settlement terrain/architecture
and close foliage/props provide separate depth planes; entrance points follow
the painted doors. Then apply the same art direction to city, river settlement,
farm and ruined mill. Retain ten building types/three variants and existing
actions, access eligibility and player storage. No new mechanics or technology.

Parent remains the sole writer on the same branch/PR. Independent critic is
read-only. Confirm no pasted silhouettes/texture repeats, perspective/light
consistency, door alignment at pointer extremes, unobstructed entrances,
remote-disabled cues and usable narrow framing. No merge/deployment.

### Cohesive scene result — 2026-10-04

Implemented five connected painted locations: village lanes/gardens, dense
stone town and crossing, riverside docks/boardwalks, farm working yard and
the ruined watermill. Ten building types each have rural, river and town
architecture within the paintings; the earlier 30 source variants remain.
The overview no longer pastes isolated building sprites onto grass texture.
Distance, continuous settlement terrain/architecture and near props move at
different depths. City, river and ruin have distinct foreground material;
the ruin retains its broken roof/wheel and distant castle silhouette.

Door markers share the settlement transform and render above foreground
decoration. Close views crop the same full painting and sidebar art matches it.
The overview stays mounted during visits, retaining image readiness and
keyboard focus on return. Narrow screens scroll the aspect-preserved panorama
and expose a two-column building menu. New prompts and inspected references
are recorded alongside consuming assets in
`assets/art/m1/places/settlements-v2/provenance.json` and the existing art index.
Removed the obsolete, now-unused `placeIllustration` adapter; no map/domain
rules or player storage change.

- Actual authenticated browser: all ten village entrances, elder/contracts
  focus, forge/equipment route, Enter/Escape and restored door focus, map
  return; disabled city/river/farm/ruin remote entrances. 390px page width
  equals content width; menu opens granary, Escape focuses its entrance and
  panorama scrolls to402.5px, exposing the far buildings. Separate layer motion
  confirmed on real pointer input from left/right river entrances, with no
  visible exposed edge seam. Current day/night overview and village close
  captures, plus refreshed site-specific foregrounds, were reviewed.
- Independent read-only critic found no established material defect in the
  inspected integrated scenes; village ink revision resolved its earlier
  style concern. Repeated foreground framing was optional feedback and was
  replaced for city, river and ruin. Critic inspected source/captures rather
  than operating the browser. Enjoyment remains NOT_MEASURED.
- Full bootstrap passed:604 unit checks,46 skipped,10000 combat stress battles
  and14 migration/auth/encounter checks. Disposable verification PostgreSQL
  was removed. First attempt failed on the obsolete illustration export and
  is not a pass. After the passing bootstrap, equivalent layer defaults were
  consolidated in `placeBuildings`; current web build/typecheck, affected lint and
  changed-code audit against `origin/main` passed, with4 inherited findings
  excluded by the existing gate. No suppression or hook bypass.
- NOT_RUN/NOT_MEASURED: live reduced-motion override, physical remote-place
  entry, broader device/performance matrix, full M1 acceptance. New commerce,
  repair, healing and recruiting mechanics remain outside this visual cycle.

Playtest remains at `http://127.0.0.1:5287`: map place → **Место** → highlighted
entrance. Current captures are local in `output/playwright/living-places`;
the incorrectly named `ruin-night-final-19.jpg` is a map after hot reload and
is excluded from visual evidence. Correction implementation commit `381fbf8`
passed the normal commit audit. PR139 owns publication; current correction CI
must be read from its new head. NOT_MERGED; no deployment authorization.

## Owner correction — contracts through people and places, 2026-10-04

Owner rejects a settlement-wide contract dispenser and requires meaningful
visits: tavern, smith, elder, notice board and watch/barracks. The broader goal
is a deep, interesting game. This supersedes the first visual cycle's decision
to keep every available offer actionable in the place sidebar.

Current-source readback: Airtable `recZhUoTiwT7kIc8s`, `rechIKj0hsvfXIvFU`
and the earlier proposal `recA4VT0YX9x0LuO1`, plus
[the authored catalogue](../content/CONTRACTS_M1_DERIVATIVE.md). Earlier rules
already require actual local issuers, authentic evidence and physical hand-in.
The earlier web shell at `9c86605` shows a common sidebar; it does not implement
individual building conversations. Original archive concordance remains
unavailable; this is not a reconstruction of original game UI.

First observable cycle: at Bereznyak, a lead directs the player to the herbalist;
enter, ask what happened and what payment requires, accept existing terms,
inspect the real daytime clue, return to the same issuer and report for the
existing once-only payment. The journal retains accepted tasks and findings
while away; it cannot replace conversations and hand-ins. The author owns the
existing web shell/boards, place presentation and this section. No new domain,
server, protocol, migration, reward or NPC identity is introduced.

### Implemented meeting-point presentation

| Existing issuer / contract                                    | Meeting point in the existing issuer area |
| ------------------------------------------------------------- | ----------------------------------------- |
| City notice clerk / road tracks                               | Market notice board                       |
| Village provisioner / missing herbs                           | Herbalist                                 |
| City watch / lost scout and raider standard                   | Guardhouse                                |
| Village steward / mill worker                                 | Elder's house                             |
| Bereznyak elder / wolf trail                                  | Elder's house                             |
| River caller / cellar rescue and warning keeper / night beast | Inn                                       |

The keeper's existing ASK step is also at the river inn. A notice board gives
a lead, while its existing clerk discusses the contract. A smith has no
existing authored contract: no assignment is fabricated merely to fill a door.
Remote scenes remain disabled previews. Meeting points are authored client
presentation inside the same canonical areas, not persisted server subareas;
server presence, proof, revision, funded wallet and replay checks remain the
authority. No claim of server-enforced interior occupancy is made.

Outside a meeting, new local offers show leads rather than accept/help buttons.
Inside, only the matching issuer's offers and relevant task interactions appear.
Source-based conversation topics expose the brief and fixed proof/payment terms.
Accepted field work stays accessible in the journal, while ASK/REPORT/DELIVER
and hunt PRESENT lead back to their meeting point. Existing request retries,
helper choices, encounter discovery and custody remain intact.

### Deeper design direction — proposal, not implemented policy

Use three distinct sources of opportunity: public announcements, local talk
and direct personal requests. Each offer has an interested issuer, a reason
to hire the company, a source for each known statement and explicit proof
requirements. Rumors remain attributed uncertain reports; hearing a rumor does
not establish guilt, spawn a captive or complete an objective.

Reference patterns: The Witcher 3 uses notice boards alongside conversations
with issuers; Mount & Blade: Warband distributes requests among lords, village
elders and guild masters, with taverns serving other social functions; Battle
Brothers distinguishes settlement contracts and tavern information. These are
design comparisons, not evidence of a replicated or newly tested game system.

Proposed roles: inn — travelers and attributed news; smith — equipment-related
work; elder — village needs; board — public leads; watch — official search and
bounties; herbalist — supplies and local observations; market — merchant needs.
New smith work, trade, reputation gates, bargaining, NPC schedules and response
consequences need a finite authored profile before becoming executable rules.
Existing rewards/terms are fixed; this cycle adds no bargaining or reputation
bonuses.

Depth should come from information and consequential choices. The existing
mill chain already distinguishes grain-cart evidence, a keeper's report,
night-beast proof and delivery of the living worker: killing the beast does
not prove grain theft. Extend that causal structure before generating extra
fetch quests. A future choice must change a source-backed outcome, relationship
or access and survive re-entry; dialogue options that all produce the same
result must not be presented as branching gameplay. Distinct information can
justify a detour; empty obligatory building hops cannot.

Current-cycle acceptance: a local lead opens the correct building; unrelated
buildings expose no acceptance or hand-in; a matching meeting shows fixed terms;
the journal preserves existing work; remote entry stays disabled; keyboard,
return focus and narrow screens remain usable. Full acceptance/payment playthrough
must be reported separately from read-only UI checks. Independent critic required.

### Meeting-point cycle result — 2026-10-04

The playable UI journey at `http://127.0.0.1:5287` is **Место → Пропавшие
травы → Поговорить** or the highlighted **Травник** door. The matching meeting
shows the established brief, fixed40-crown reward and personal evidence hand-in.
The elder separately offers **Волчья тропа**, with80 crowns visible before
acceptance. Plaza leads expose no accept button; unrelated buildings show no
other issuer's offers. The forge retains equipment access without an invented
smith contract. The journal keeps accepted tasks and observations.

Fresh read-only browser checks cover herbalist lead/doorway/topics, elder,
forge, journal focus, Escape return focus, and390px layout (viewport/content
both390px). The retained **Проверка луга** company remains at Bereznyak with850
crowns; no acceptance, field work, hand-in or payment command was submitted.
Current captures: `output/playwright/living-places/herbalist-conversation-wide-final-33.jpg`
and `herbalist-conversation-narrow-current-29.jpg`.

Critic-found regressions are fixed: premature hand-in invitations before proof,
lost journal focus, treating every village mill as the objective, and wolf
JOIN/PICKUP while speaking to the elder. Three component regressions check
lead/issuer routing, blocked versus ready hand-in including a remote site, and
actual ruined-mill versus village/issuer field access. The existing hunt
transport test also checks selected-instance routing, session rejection and
malformed/private response rejection after the reader extraction. These tests
verify public presentation/transport, not a fabricated gameplay transaction.

Final `scripts/bootstrap.sh` passed on the current source:608 unit checks,
46 skipped,10,000 combat stress battles and14 database checks; disposable
verification infrastructure was removed. Log:
`/tmp/warwrit-contract-visits-bootstrap-final.log`. Current coverage generation
and the normal changed-code audit passed; log:
`/tmp/warwrit-contract-visits-audit-final.log`. Focused renderer/transport checks
passed15 tests. Independent read-only critic returned **DONE** on the final
source and1440×900/390px captures, with no material defect found.
Earlier audit failures were corrected without suppressions or hook bypass.

PR139 currently conflicts with newer main map/road work. This branch is a
playable candidate; integration and CI must be reported independently. Full acceptance → clue → return → payout through these new
meeting controls is **NOT_RUN**; client visits are not a new server occupancy
rule. Broader systemic depth remains the proposal above. No merge/deployment.

## Authorized integration — 2026-10-04

Owner explicitly requested “fix conflicts, merge, update local main”. This
supersedes this work package's earlier no-merge statements for PR139 only.
Parent owns the isolated integration checkout; the primary checkout's unrelated
owner documents, local captures and retained player data remain intact.
Both settlement and road records are retained in the existing art registry;
current main exact geometry and road rendering remain authoritative. Final
integrated source checks, playable smoke check, independent critique and GitHub
CI are required before the expected-head merge. Deployment is not authorized.

Conflict resolution retains all existing registry entries and both delivery
histories. No domain/server/protocol difference remains against main. Fresh
integrated web typecheck and21 focused presentation/transport/exact-navigation
checks passed. Unit coverage run passed614 checks,46 skipped; the normal audit
against current main passed. Full clean CI and the independent integrated
playable review remain pending before merge. The initial isolated typecheck
could not find unbuilt public workspace packages; building the pinned packages
resolved that environment failure without source changes.

## Location depth methods — 2026-10-05

Владелец требует глубину внутри самого поселения: при движении мыши должны
меняться перспектива и перекрытия домов, базара и проходов. Запрос этого этапа —
исследовать современные простые методы и готовые workflows. Это локальное
исследование на `main` / `917644a`, не реализация и не выбор новой технологии.
Исторические проверки предыдущих циклов не принимают новый эффект.

### Текущая граница

В `PlaceScene.tsx` / `place-scene.css` три изображения получают разные CSS-сдвиги;
всё поселение и его входы имеют один общий transform. `place-buildings.ts`
хранит координаты дверей в процентах картины. Поэтому внутренний объём пока
не меняется. Осмотрены `bereznyak-painting.png` и утверждённый `unit-c-ink.png`:
крыши, навесы, заборы и мелкая растительность требуют сохранения чётких контуров.
Babylon.js 9.28.0 уже установлен; локальные typings содержат `ShaderMaterial`
и `GaussianSplattingMesh`. Наличие API не доказывает импорт конкретного результата.

### Сравнение методов

| Метод                                                       | Что даёт                                                             | Готовая основа / workflow                                                                                                                                                                               | Практическое ограничение                                                                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Дополнительные плоскости по глубине                         | Меняет перекрытия групп зданий                                       | Маски, восстановленный фон, плоскости в существующем Babylon                                                                                                                                            | Сам дом остаётся плоским; много ручной подготовки рисунка                                                                                                        |
| Карта глубины + шейдер с проекцией лучей                    | Непрерывный параллакс внутри картинки, включая видимые стены и крыши | [DepthFlow](https://github.com/BrokenSource/DepthFlow), готовые CLI, Python API и GLSL; depth из [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2)                                | Лучший кандидат для малого движения; скрытые поверхности не восстанавливает, контуры могут растягиваться                                                         |
| Карта глубины / point map → текстурированная 3D-поверхность | Реальная проекция видимого рельефа при движении камеры               | [MoGe](https://github.com/microsoft/MoGe), CLI экспорта GLB/PLY, web demo                                                                                                                               | Это слепок видимых поверхностей, а не замкнутые дома; разрывы на границах и отсутствующие задние стороны. Текущая MoGe-3 не поддерживает macOS                   |
| Layered Depth Image + inpainting                            | Несколько глубин за одним контуром, заполнение открывающегося фона   | [3D Photo Inpainting](https://github.com/vt-vl-lab/3d-photo-inpainting), скрипт и Colab, экспорт PLY                                                                                                    | Подход решает важную проблему перекрытий, но исходный стек Python 3.7 / PyTorch 1.4 / Linux устарел; не простой первый запуск на Mac                             |
| Camera projection / простая геометрия                       | Стабильные фасады, боковые стены и крыши с исходной рисовкой         | Blender: согласование камеры, UV projection/bake, GLB; [fSpy](https://github.com/stuffmatic/fSpy) и [официальный importer](https://github.com/stuffmatic/fSpy-Blender) помогают согласовать перспективу | Понятный традиционный workflow, но форму и открывающиеся участки нужно готовить вручную; fSpy не моделирует сцену и зависит от согласованной перспективы рисунка |
| Single-image Gaussian Splatting                             | Объёмная сцена для соседних ракурсов                                 | [Apple SHARP](https://github.com/apple/ml-sharp), `sharp predict`, экспорт 3DGS PLY; инференс заявлен для CPU/CUDA/MPS                                                                                  | Более сложные правки, взаимодействие и контроль тонких контуров; качество на нашей рисовке не доказано. Лицензия модели исключает product development            |

Простой displacement filter, который только сдвигает UV по серому значению,
может выглядеть как резиновая картинка. Для требуемой перспективы нужен
согласованный расчёт проекции по глубине либо движение настоящей камеры над
поверхностью; поворот общего прямоугольника сам по себе недостаточен.

### Современные генераторы и готовые скрипты

- **Depth Anything V2 Small:** готовый `run.py`, batch по папке, grayscale depth;
  официальный пример выбирает CUDA, MPS или CPU. Small имеет Apache-2.0;
  Base/Large/Giant имеют CC-BY-NC-4.0. Для коммерчески пригодного первого
  workflow предлагаем Small. Есть [ComfyUI node](https://github.com/kijai/ComfyUI-DepthAnythingV2):
  `Load Image → DepthAnythingV2 → Save Image`; это depth, ещё не готовый параллакс.
- **[Depth Anything 3](https://github.com/ByteDance-Seed/depth-anything-3):** более
  новая линия, есть CLI, Gradio и экспорты; DA3-Small/Base имеют Apache-2.0.
  DepthFlow пока не включает её в готовые estimators. Документированный quick
  start ориентирован на CUDA/xformers, поэтому меньшая сложность на Mac не доказана.
  Разные DA3 checkpoint имеют разные лицензии; большой default не следует выбирать автоматически.
- **DepthFlow 1.0.1:** готовый офлайн инструмент предпросмотра/видео, не Babylon
  plugin. Поддерживает собственную карту depth и настройки offset, height,
  focus/isometric. Проекция реализована ray marching в GLSL; есть отдельный
  сигнал проблемных контуров, но он не генерирует отсутствующий фон. Код AGPL-3.0:
  использование инструмента и включение его кода в клиент — разные решения.
  Для клиента нужен отдельный перенос/реализация и проверка лицензии выбранного кода.
  В просмотренном checkout страница segmentation пустая; готовый автоматический
  workflow разделения поселения на слои там не подтверждён.

Следующие команды перепроверены по документации, **не запускались**. Первая
выполняется в отдельно установленном Depth Anything V2 с checkpoint Small:

```bash
python run.py --encoder vits --img-path settlement.png --outdir depth --pred-only --grayscale
```

DepthFlow имеет документированные команды `depthflow da2 --model small` и
`depthflow input --image settlement.png --depth depth.png`; последовательность
предпросмотра/экспорта нужно выбирать по установленной версии и её `--help`.
Для MoGe документирован `moge infer -i settlement.png --version v2 -o result --maps --glb --ply`.
Установка текущего всего MoGe checkout на Mac не рекомендуется без отдельной
проверки совместимого окружения v2: зависимости v3 требуют Triton/FlexGEMM.

### Предлагаемый первый workflow

1. Взять цельную существующую картину Березняка; подготовить depth через
   Depth Anything V2 Small либо вручную. Нейросеть работает при подготовке
   ассета, а не во время игры. Исправить плоскости стен/крыш и глубину проходов;
   штрихи и тени не должны становиться самостоятельным рельефом.
2. Проверить малое горизонтальное/вертикальное смещение в офлайн depth preview.
   Это быстрый отбор качества графики, а не игровая приёмка.
3. При удовлетворительном результате заменить только средний слой сцены на
   согласованную depth-проекцию в Babylon. Сохранить дальний/ближний планы и
   исходную статичную картинку для fallback/reduced motion. Для входов применять
   ту же проекцию исходной точки и глубины; процентные координаты с одним общим
   CSS-transform больше не гарантируют совпадение с дверью.
4. Если появляются заметные растяжения, вынести только проблемные ближние дома
   и навесы в отдельные плоскости с восстановленными скрытыми участками.
   Сложные фасады при необходимости заменить простой проекционной геометрией.
   Не моделировать все здания заранее и не наращивать амплитуду поверх дефектов.
5. Перед расширением проверить в игре нейтральный и крайние виды, день/ночь,
   вход/возврат, remote preview, клавиатуру, reduced motion и узкий экран.
   Независимый playable critic сравнивает текущие виды с утверждённой рисовкой;
   нельзя принимать резиновые стены, ореолы, щели, оторванные основания и съехавшие входы.

Это рекомендация по минимальному первому прототипу. Полная диорама из вручную
смоделированных домов из предыдущего обсуждения остаётся вариантом для более
широких ракурсов, а не обязательным первым шагом. Число слоёв и амплитуда не
назначены критериями качества; пригодный диапазон нужно увидеть на нашем арте.

### Проверка и статус

Прочитаны актуальные upstream README, DepthFlow input/camera/estimator/license
docs и GLSL, SHARP code/model licenses; source/API наличие и статичная рисовка
проверены локально. Часть GitHub чтений получила 404/400/rate limit, Blender
manual — 403, Babylon web docs вернули оболочку без текста. Доступные upstream
raw-файлы и локальные typings прочитаны вместо них; эти неудачные запросы не
считаются проверкой недоступных страниц. Первый format check выявил формат
новой таблицы; он исправлен. Документальные readback, scoped diff и локальные
ссылки PASS; итоговый format check выполнен после исправления.

Установка/запуск инструментов, генерация depth, GLB/PLY импорт, сравнение на
нашем рисунке, игровой прототип и independent playable critique — **NOT_RUN**.
Качество, время подготовки, FPS, GPU/RAM и размер ассетов — **NOT_MEASURED**.
Меняются только owning work package, CURRENT_PLAN и CHANGELOG; игрового diff,
публикации, merge, deployment или платного производства нет.

## Location depth implementation — 2026-10-05

Владелец поручил выбрать оптимальный метод, реализовать, review и test.
Решение первого цикла: офлайн Depth Anything V2 Small и собственная
depth-проекция в существующем Babylon.js. Сохраняем цельные исходные картины,
дальний/ближний планы, общий стиль и все существующие действия. Каждая точка
среднего слоя получает camera-space глубину; входы и дым используют ту же
проекцию. Рендер обновляется при движении/изменении размера, с коротким
сглаживанием, и прекращает кадры после остановки. При ошибке GPU/ассетов
остаётся исходная картинка; reduced motion фиксирует нейтральный вид.

Первый playable: открыть Березняк → «Место», провести мышью между краями
панорамы, войти через видимую дверь и вернуться Escape. После этого проверить
остальные четыре существующие картины, день/ночь и узкий экран. Исходный
рисунок и каноническое состояние не меняются. Увеличение ракурса ограничено
отсутствием скрытых поверхностей; отдельная геометрия вводится только по
подтверждённому визуальному дефекту первого результата.

Parent — единственный writer на primary `main` / `917644a`: `PlaceScene`,
`place-buildings`, CSS, новые renderer depth modules, offline script/assets,
additive manifest и owning docs. Независимый reviewer/critic read-only;
чужие dirty terrain/wiki/skills и сохранённая компания остаются вне write set.
Текущий статус — реализация в работе; источники, проверки и ограничения
фиксируются здесь после интегрированного review. PR/merge/deployment не запрошены.

### Реализация и проверка

Пять карт depth подготовлены на Mac через MPS, без модели в игровом клиенте.
Workflow: `uv run --python 3.12 scripts/prepare-place-depth.py`; зависимости и
revision модели закреплены в скрипте. Карты имеют ширину768px, near=white;
нормализация1/99 перцентилей и слабое сглаживание записаны в
[`depth-v1/provenance.json`](../../assets/art/m1/places/depth-v1/provenance.json).
Small использует Apache-2.0. GLSL написан для проекта, код AGPL DepthFlow
не включён. Используется установленный Babylon9.28.0, новых runtime-зависимостей
или изменений канонического состояния нет.

Рельеф видимых поверхностей проецируется с ограниченным сдвигом точки
наблюдения: ближние дома и площадь реагируют сильнее дальних. Обратная
проекция ищет первую поверхность вдоль луча; входы и дым используют прямую
проекцию той же глубины. Средний слой и входы имеют общий запас изображения
по краям. В нейтральном виде шейдер показывает исходные пиксели картины.
Сглаживание прекращает кадры после остановки; reduced motion фиксирует ракурс.
При ошибке декодирования, шейдера или потере WebGL остаётся исходный CSS-вид.
Дополнительная крайняя проверка fallback выявила вертикальный шов после
увеличения амплитуды: исправлено сохранением прежнего диапазона18/10px для
статичного режима и сбросом сдвига при отказе GPU. Активный диапазон60/30px
для дальнего/ближнего планов сохранён; исправленный край снят повторно.

Parent выполнил настоящий вход через локальную тестовую учётную запись,
открыл четыре поселения через карту и проверил средний слой в нейтральном,
крайних горизонтальных и вертикальных видах. В Северном Дворе клик по двери
старейшины открывает интерьер, Escape возвращает фокус на дверь. В удалённом
Березняке все входы остаются disabled. Город и речное поселение проверены через
тот же настоящий интерфейс. Старая мельница, все дополнительные ночные виды,
reduced motion и StrictMode/lifecycle проверены на настоящем `PlaceScene` в
временном браузерном harness; это компонентная интеграция, не полный игровой
поход к мельнице. Рисунок разрушенной мельницы и его состояние сохранены.

Проверены горизонтальная прокрутка390px, вход через меню с клавиатуры,
Escape/focus и отсутствие общего горизонтального overflow. Владелец затем
уточнил целевую платформу: **desktop; мобильный просмотр только landscape,
тот же интерфейс мельче**. [AGENTS.md](../../AGENTS.md#desktop-viewport-and-mobile-orientation)
фиксирует решение; отдельный мобильный/portrait UX не требуется. Уже выполненные
узкие проверки остаются дополнительным свидетельством, не расширением ТЗ.

Принудительная потеря WebGL возвращает видимую картину и `data-depth=fallback`.
При reduced motion координаты входов не меняются. В600ms покоя наблюдатель
Babylon зарегистрировал0 кадров этой сцены; после unmount/1200ms её engine
и meshes отсутствовали. Это ограниченная проверка lifecycle, не измерение FPS
или памяти. Материалы/активы освобождаются вместе со сценой.

Снимки и последовательность кадров сохранены в
`output/playwright/place-depth` (локально: `output/playwright/place-depth/`),
`depth-motion-preview.gif` (локально: `output/playwright/place-depth/depth-motion-preview.gif`)
показывает внутреннее движение на исходной рисовке. GIF собран из последовательных
захватов canvas; скорость GIF не является измеренной частотой рендера.

Первичный независимый source/day-village/night-farm critic не нашёл
существенных дефектов; повторный расширенный проход и итоговый clean gate
ещё выполняются. Первоначальный clean bootstrap: PASS630/47skipped,
10000-battle stress и migrations/14 PostgreSQL checks; отдельная временная БД
удалена, игровая БД сохранена. После крайнего fallback-исправления focused
format/lint и повторный браузерный отказ GPU PASS. Итоговые результаты ниже
обновляются после полного прохода исправленной версии.

### Итог — 2026-10-05

Локальный эффект реализован во всех пяти существующих сценах. Повторный
независимый source/visual critic завершил проход **DONE_WITH_CONCERNS**:
существенных незакрытых дефектов в осмотренных исходниках и видах нет;
он подтвердил исходный fallback-шов и его исправление. Проверены дальние/
ближние поверхности, входы, пути, стиль и состояние разрушенной мельницы.
Движение оценено по пяти декодированным кадрам24-кадрового preview и крайним
снимкам. Native click/Escape/access и runtime assertions выполнил parent,
критик не повторял их самостоятельно. Инициализация скрытого overview при
прямом открытии интерьера остаётся необязательным performance concern:
влияние на время/память NOT_MEASURED, подтверждённого игрового дефекта нет.

По согласованному окну отдельный владелец леса обновил primary до
`548837c484ab17ba9efe1828c8689d9f847b9b1b` / PR147 и сохранил все dirty/untracked
локации, policy, документы и чужие работы. Это не публикация данной slice.
После обновления прочитаны CHANGELOG/CURRENT_PLAN, diff PR147 и сохранённые
place исходники. Итоговый **`scripts/bootstrap.sh` PASS** в чистой копии
этого HEAD плюс только place-depth/desktop-policy изменения:
format/lint/architecture/dead-code/patterns/content92/build/typecheck,
**633 unit checks /47 skipped**, **10000 боёв**, migration smoke и
**14 PostgreSQL checks**. Временная БД очищена; игровая БД не сбрасывалась.
Лог: `/tmp/warwrit-place-depth-bootstrap-548837c.log`. Чужие незакоммиченные
terrain/wildlife/wiki изменения исключены из этого clean gate.

Начальная architecture-проверка до появления PNG FAILED на отсутствующих
imports; после генерации PASS. Первый browser-wrapper запуск FAILED из-за
прав общей npm cache, временная cache исправила запуск. Вход через127.0.0.1
получил400 из-за несовпадения origin; вход через настроенный localhost PASS.
Во время длительной работы dev-процессы остановились и браузер получил
ERR_CONNECTION_REFUSED; восстановлены существующие3193/5293 без изменения
`.env`/данных. Прерывание turn остановило повторный gate на стадии build;
его результат **NOT_COMPLETED**, оставшийся verification-контейнер удалён.
Последующий полный gate на548837c прошёл. Общее чтение ссылок CURRENT_PLAN
нашло три отсутствующих исторических абсолютных пути вне данной slice;
они не изменены. Ссылки новых owning-секций проверяются отдельно.

После обновления main и восстановления dev выполнен новый настоящий вход
на localhost5293, открыт Березняк, подтверждён `data-depth=active` и различие
проекции входа между крайними положениями мыши. Текущий вид:
`final-native-548837c.png` (локально: `output/playwright/place-depth/final-native-548837c.png`).
Браузер оставлен открытым для владельца. Source этой slice совпадает с
прошедшей clean gate копией; scoped links/diff/format/readback PASS.

Настоящий полный поход к старой мельнице, FPS/GPU/RAM и subjective enjoyment
— **NOT_RUN / NOT_MEASURED**. Одно изображение не содержит скрытых стен:
поддерживается проверенный небольшой диапазон перспективы, не свободное
вращение вокруг зданий. Дополнительная геометрия/inpainting сейчас не потребовались.
PR, commit, merge этой slice, deployment и платное производство не выполнялись.

### Исправление чёткости — 2026-10-05

Финальный настоящий вид выявил размытость: при CSS833×555 и DPR1 графический
буфер имел416×277. Причина — ручной `setHardwareScalingLevel(1)` поверх
адаптивного engine: после первоначального DPR2 Babylon сохранял множитель,
и переход к DPR1 давал scale2. Локальное переопределение удалено; политика
общего `canvas-engine.ts` и других рендереров не менялась.

Новый mount при DPR1 рисует833×555. Проверка настоящих браузерных
DPR/viewport-переходов PASS: при DPR2/CSS813×542 буфер1626×1084;
при DPR1/CSS793×529 —793×529; при DPR2/CSS853×569 —1706×1138;
после возврата DPR1/CSS833×555 —833×555. Отдельно выполнен fresh mount
при DPR2 и переход обратно к DPR1. Это проверка разрешения; измерение
производительности не выполнялось. Нейтральный и оба крайних вида сняты
повторно: текущий чёткий вид (локально: `output/playwright/place-depth/final-native-sharp-548837c.png`),
левый (локально: `output/playwright/place-depth/final-native-sharp-left.png`),
правый (локально: `output/playwright/place-depth/final-native-sharp-right.png`).
Предыдущий `final-native-548837c.png` сохраняется как свидетельство дефекта.
Повторный affected critic завершил проверку **DONE**: в новых нейтральном/крайних
видах и декодированных кадрах0/12/23 нового preview нет существенных дефектов
чёткости, совмещения входов, швов, ореолов или разрывов. Предыдущая проверка
стиля/lore/fallback остаётся применима: проекция и активы не менялись.
DPR-assertions выполнил parent, критик не повторял их самостоятельно.
Новый motion preview (локально: `output/playwright/place-depth/depth-motion-sharp-preview.gif`)
собран из24 кадров исправленной версии; его скорость не является измерением FPS.
Повторный **`scripts/bootstrap.sh` PASS** на548837c плюс исправленная slice:
format/lint/architecture/dead-code/patterns/content92/build/typecheck,
**633 passed /47 skipped**, **10000 боёв**, migration smoke и **14 PostgreSQL
checks**. Лог: `/tmp/warwrit-place-depth-bootstrap-resolution-final-548837c.log`.
13 owning source/asset файлов, пять depth registry records и desktop policy
совпадают с проверенной чистой копией; чужие dirty источники исключены.
Временная БД удалена, игровая БД сохранена. Промежуточный запуск на старой
копии отменён после выявленной ошибки пути при копировании; его проверка
не засчитана, инфраструктура очищена до правильного повторного запуска.
Локальный статус и прежние NOT_RUN/NOT_MEASURED границы сохраняются.

### Края переднего плана — 2026-10-05

Владелец заметил обрезанный край изображения у калитки в конечных положениях
мыши. Дефект пропущен предыдущим visual pass: увеличенная амплитуда60/30px
давала переднему плану смещение до42/21px, а старый scale1.035 оставлял
недостаточный запас. Контрольное воспроизведение старого масштаба на настоящей
активной сцене выявило открытые полосы28.8px слева и11.9px сверху.
В браузере временно применялся прежний scale; inline override затем удалён.
До исправления (локально: `output/playwright/place-depth/gate-edge-before-active.png`).

Изменён только `place-scene.css`: активная глубина задаёт foreground scale1.13.
При минимальной панораме768px запас перекрывает весь ход с дополнительными
2.5px по горизонтали. Fallback остаётся scale1.035, reduced motion выключает
transform. Средний слой, проекция входов, амплитуда движения и игровые правила
не менялись.

Native browser checks PASS в32 крайних состояниях: все четыре угла Березняка,
минимальный desktop viewport1215×900, reduced motion, принудительный WebGL
fallback и четыре поселения через настоящий интерфейс. Положительных зазоров
нет; у минимальной панорамы измерен запас2.6px/9.7px. Формат CSS и scoped diff
PASS. Повторная полная game/DB gate **NOT_RUN** для этой CSS-only коррекции;
предыдущий PASS633/47 относится к source до неё. Пятая сцена/мельница и новый
полный поход **NOT_RUN** в этом проходе; FPS/GPU/RAM **NOT_MEASURED**.
Исправленный край (локально: `output/playwright/place-depth/gate-edge-village-bottom-right.png`),
текущий настоящий вид (локально: `output/playwright/place-depth/gate-edge-final-native.png`).
Независимый affected critic завершил проверку **DONE** без существенных
замечаний: крайние village/min-desktop, representative town/river/farm и fallback
виды не имеют открытой прямой полосы; пути, двери и метки читаются, передний
план сохраняет естественное положение. Это source/capture review; native
browser assertions выполнил parent, performance не измерялся.

После остановки прежних dev-процессов5293/API3193 восстановлены из существующей
конфигурации, readiness PASS. До восстановления старая вкладка показывала
ошибки связи; после нового mount и проверки ошибок страницы нет, кроме ожидаемого
предупреждения о принудительной потере WebGL. Игровые данные и чужие сервисы
сохранены. Изменение локальное на `main`/548837c, не опубликовано.

### Publication authorized — 2026-10-05

The owner explicitly requested “approve, merge, update local main”. This
permission covers the location-depth mission, its desktop policy, foreground
corrections, publication and expected-head merge, followed by preservation of
concurrent drafts during the local-main update. Delivery branch:
`codex/place-depth-main`, based on merged navigation main `9ee53d3`.

The isolated change includes only place UI/renderer, five offline depth maps,
the preparation script/provenance, five asset records, desktop policy and owning
documentation. The primary's terrain, wildlife, lore/wiki and other instruction
changes are excluded. Original source paintings and canonical gameplay remain
unchanged. The final foreground correction is included.

Local measured coverage passes on this base; the ordinary commit audit and
PR-head CI provide the publication gate. Previous clean bootstrap and native
journey/corner/DPR evidence above retain their exact scope. Current-head PR CI
and merge are pending; GitHub owns their subsequent facts. FPS/memory and a
complete player journey to the ruined mill remain NOT_MEASURED/NOT_RUN.

Published visual evidence:
[controlled old foreground](../engineering/evidence/PLACE_DEPTH_2026-10-05/before-edge.png),
[corrected extreme](../engineering/evidence/PLACE_DEPTH_2026-10-05/after-edge.png),
[actual native view](../engineering/evidence/PLACE_DEPTH_2026-10-05/native.png).
Older diagnostic captures referenced above are local artifacts, not committed
release evidence. The source-linked preparation workflow is
`uv run --python 3.12 scripts/prepare-place-depth.py`; inference stays offline.

### Isolated candidate verification — 2026-10-05

Final candidate on `codex/place-depth-main`, base `9ee53d3`: local coverage
**639 passed /47 skipped**, focused projection **2/2**, web typecheck, scoped
lint/format and changed-code audit PASS. Initial ordinary audits FAILED CRAP
findings in the effect/render closures. Cohesive mount, draw and interpolation
extraction fixed the findings; the exact interpolation formula, anchors,
render/fallback order and scheduling are retained. No gate was weakened. Coverage
predates that extraction; current-head clean PR CI must verify the final tree.

Fresh isolated web5297 reused the retained API3193 and player session: native
North Yard entrance, Escape/focus, depth-dependent anchor movement, remount and
12 active/reduced-motion/fallback corners PASS at desktop1600×1100. Pointer
look assertions confirm actual extremes; no foreground gap appears. Native
canvas sizing tracks DPR. The first automation attempt timed out on a wrong
interior selector; a later attempt missed corners during viewport/scroll changes.
Those attempts are not accepted checks. Corrected selector, settled viewport
and per-corner bounds passed. Console contains the pre-existing favicon404 and
expected warnings from deliberate WebGL loss, with no new runtime exception.
Player company remains stationary with850 crowns; no database reset or gameplay
write was used. Previous four-settlement/corner and DPR evidence retains its
earlier source scope. Ruin/other night scenes/full mill journey were not repeated here; the final
North Yard capture shows the actual night view.

Current candidate [native view](../engineering/evidence/PLACE_DEPTH_2026-10-05/candidate-native.png)
and [motion preview](../engineering/evidence/PLACE_DEPTH_2026-10-05/candidate-motion.gif)
are captured from this isolated source. GIF has9 resized frames from18 native
captures; timing is illustrative, not measured FPS. Earlier selected edge
captures document the foreground correction. Independent reviewer found no
semantic defect in the bounded refactor; final capture review is pending.
Publication, current-head CI and merge remain pending. FPS/memory remain
NOT_MEASURED; full mill player journey NOT_RUN.
