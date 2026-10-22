Current supplemental recovery: FAILED overall acceptance, bounded source correction committed at 989669ef (298/300); focused checks and refreshed author journeys pass, but original baseline/rejected-state and full Tier V remain incomplete. See final supplemental handback below; both failed ordinary reworks remain preserved.

Current rework 2: FAILED on an ownership boundary; committed candidate 0638d7be, source scope 244/300, validator 9/9 PASS; mixed 30/50-degree consumers prevent acceptance. See Rework 2 final handback below. Earlier failures and stale-head statements are retained history.

Current rework 1: FAILED overall; committed source `1c199e94`, current/upstream `f623336a`, validator 9/9 PASS, runtime/browser cleanup PASS. See the appended **Rework 1 final result** for every criterion, remaining blockers and coordinator handback. The prior failed report below is retained history.

# #179 build report — blocked, not accepted

Date: 2026-10-22. Task permit: `GRANTED task_1af575ec832f`.
Branch: `Vovanostm/uix-w4-scale`; allocated base `c62ad2d0`.
Final source head: `514943b7`; tracked working tree clean. Nothing pushed; no PR,
GitHub state, shared records, renderer/camera module, core/protocol/server or #214
checkout changed. Keep #179 open. Independent acceptance belongs to the coordinator.

## Result and next ownership decision

Try genuine default mill, seed 20261009, Start at 1440 × 900, native 100%:
all six allies and the nearest wolves fit before Overview/focus. W01's actual
alpha silhouette is **84.7247338 CSS px high**, day and night, against 80 px.
Screenshots: `shots/default-initial-day.png`, `shots/default-initial-night.png`.
Measurements: `native-alpha-final-{day,night}.log`. The scan projects every
source alpha ≥ 64 pixel through the mounted mesh world matrix and live Babylon
camera, excludes PNG margins, and leaves game state untouched. This geometric
pixel measurement accompanies unscaled browser captures; no independent visual
verdict is claimed.

**Measured out-of-ownership blocker:** at physical 1366 × 768 and genuine Chrome
125% (CSS 1093 × 614, DPR 1.25), the initial HUD and camera oscillate continuously.
`oscillation-results.json` records 24 consecutive requestAnimationFrame samples:

| Alternating state | `.battle-overview` | Top band bottom | Camera zoom  | CSS px/world |
| ----------------- | ------------------ | --------------- | ------------ | ------------ |
| A                 | false              | 171.600006      | 16.829654638 | 31.3162191   |
| B                 | true               | 131.599998      | 21.709583992 | 24.2768905   |

Dock top remains 387.550018 CSS px. Screenshot:
`shots/blocker-1366x768-native125.png`. Native hover disappears during refits;
Home/button equivalence failed in this row, and normal portrait locator clicks
also encountered perpetual instability. These are failures, not accepted limits.

Source chain: `battle-field-vitals.ts:122-127` toggles `.battle-overview` each
camera render; `isOverviewScale` at lines 200-207 compares the projected scale
with the existing **30 px** threshold. `battle-controls.css:584-590` changes
initiative height to 90 px and removes its resource content in that mode. The
owned scene's HUD ResizeObserver then fits the newly changed opening, crossing
the threshold in the other direction. The native alternating measurements prove
this feedback; no hatch/renderer attribution is made.

Recommended narrow follow-up allocation: the HUD/CSS owner stabilizes the
initiative band's outer height across its scale-mode transition (for example,
reserve the existing full-height box while hiding compact-mode contents), with
an actual 1366 × 768/native-125 day/night regression and the unchanged 12-row
matrix. Needed ownership: `battle-controls.css` and, only if its implementation
requires it, `battle-field-vitals.ts` plus their matching tests. Do not change the
30 px threshold, 80 px requirement, sprite heights, catalogue formula or any AC.
Coordinate with frozen #214 before writing those paths. No camera-module change
is presently demonstrated necessary. This report does not authorize that extension.

## Commits and scope

- `4e747c24` — behavior-preserving extraction of sprite catalogue, scale and
  geometry; W01/B002 dimensions, pivot and projected-corner regressions.
- `6ce7f587` — complete alpha catalogue, catalogue-derived spacing, corrected
  bounds/support data, scene framing and relative rubble; real raster regressions.
- `514943b7` — preserve explicit Overview when the HUD resizes. The first native
  sweep revealed that the new initial frame otherwise replaced Overview.

All commits used ordinary hooks. Final validator scope: **198 source additions
plus deletions**, limit 300, within the 290 estimate. Four source paths and two
matching test paths only. `origin/main` was fetched and ordinarily merged twice;
both merges reported `Already up to date` at c62ad2d0. No bypass or threshold change.

## Presentation data and implementation

- Complete catalogue: 20 roster entries, unarmed W01 derivative, unknown fallback.
  All 21 raster widths were measured from actual RGBA alpha ≥ 64; the fallback
  SVG was measured at its declared 256 × 512 render size (239 px width).
  `alpha.json.log` contains raster measurements; its initial SVG measurement
  used the browser's intrinsic SVG size and is superseded by `alpha-fallback.log`.
- B002 is still widest: 1133 source px, world width 1.582626; minimal upward
  0.05 spacing is **1.80**. W01 world width is about 0.693, or 38.5% of spacing.
  These are catalogue calculations, not near/far screenshot AC measurements.
- `bodyHeight`, display-height mapping, 0.82, relative figure dimensions and
  canonical inputs remain unchanged. Public tests check fit, minimal preceding
  step, widening B001 beyond the saved spacing, and successful recomputation.
  Raster tests independently decode the actual PNG bytes, so changed art cannot
  silently keep stale alpha widths.
- `visibleBounds` is x/y/width/height. The old scene interpreted its width/height
  as right/bottom coordinates. Shared corners and actor reservations now use
  x+width/y+height; no art was cropped or rewritten.
- Source-image support inspection: B053 approximate paw landmarks
  (170,1080), (560,1000), (850,1180), (1140,1000) give support (680,1065).
  B025 is bipedal; approximate contacts (450,1190), (820,1040) give (635,1115).
  These manual image readings are approximate, not independent calibrated paw
  measurements. They replace the lowest-pixel anchors (632.5,1226) and
  (698.5,1236). Mesh, reservations, marker/frame bounds, shadow and foot metadata
  use the same support placement. Full contact/height acceptance remains open.
- Initial framing includes the squad and each ally's nearest visual enemy;
  Euclidean presentation positions choose framing only, never game legality.
  Scene-local optical distance is 4 × spacing, retaining 50° elevation and the
  existing camera API. A read-only geometry comparison predicted 84.725 px;
  the genuine mounted result is 84.7247 px. The earlier 16 × spacing attempt
  measured only 63.018 px and remains in the logs.
- Procedural earth is the chosen registration route. Authored perimeter width,
  composition apron and rubble use spacing. Material texture world scale remains
  fixed. Shared grid/terrain public APIs, ground-first ordering, alpha picking,
  foot-depth metadata, threat anchors, legacy tiles fallback and separate Overview
  remain. No tactical hatch or shader change.

## Original acceptance criteria and evidence

| Criterion                                                    | Actual evidence / remaining requirement                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 B002/B053 ≤90%, near/far, day/night                      | Catalogue fit and actual raster widths PASS. Required supported-editor near/far screenshot ratios NOT_MEASURED; no screenshot acceptance claimed.                                                                                                                                                                                                                  |
| AC2 adjacent B002                                            | NOT_RUN: editor near/far adjacent-bear placements and actual bear hovers.                                                                                                                                                                                                                                                                                          |
| AC3 W01 ≥35%, depth difference ≤5%                           | Catalogue ratio about 38.5%; unchanged dimensions PASS. Required near/far native screenshot ratios/difference NOT_MEASURED.                                                                                                                                                                                                                                        |
| Inherited initial W01 ≥80 px                                 | PASS author measurement at final source: 84.7247 px, day/night, genuine 1440 × 900 Start, six allies present. Independent acceptance NOT_RUN.                                                                                                                                                                                                                      |
| AC4 contact ≤25% radius, six figures, near/far heights 0/1/2 | Support data inspected/corrected; shared geometry tests PASS. Full native placement/contact matrix NOT_RUN/NOT_MEASURED.                                                                                                                                                                                                                                           |
| AC5 default six allies + nearest enemies                     | Author 1440 × 900 day/night initial captures before camera input; initial geometry and live nearest-wolf visibility recorded. Final initial capture PASS author smoke; full visual acceptance NOT_RUN.                                                                                                                                                             |
| AC6 165 native hovers, zero action POST                      | All 165 unique cells have successful actual pointer/native React hovered-q/r readback at final source, using Overview and reachable close views; final selected exposed-pixel cases have zero mismatches, zero action POST, revision 4→4. Transparent borders included. Shared-seam-specific native probes NOT_RUN. See details below, including earlier failures. |
| AC7 complete catalogue + mutation                            | PASS public geometry/catalogue/raster tests; B001 artificially becomes widest, saved-spacing fit fails, recomputation restores fit.                                                                                                                                                                                                                                |
| AC8 continuous 15 × 11 ground                                | Procedural-ground route; actual grid Overview day/night and CVD captures; public terrain centre/corner/real-ray metadata/relative-rubble tests PASS. Full boundary/height/editor registration comparison NOT_RUN; visual acceptance open.                                                                                                                          |
| AC9 native CVD                                               | 24 native CDP captures: none/deuteranopia/protanopia/achromatopsia × day/night × full-grid Overview / B053 grid / B053 grid off. Commands succeeded, zero action POST. Independent readability scoring NOT_RUN.                                                                                                                                                    |

### Native input proof and genuine zoom matrix

`matrix-final-results.json` contains all **12 genuine rows**, each with native
zoom, CSS viewport, DPR, HUD bounds, six figure rectangles, real pointer hover,
Home, mouse Overview, portrait focus, held D, wheel, visible focus and revision.
Chrome settings Page zoom was changed in a dedicated persistent CLI profile;
visualViewport.scale stays 1. No CSS transform, screenshot resize or emulated DPR
was used as zoom. Screenshots: `shots/matrix-{width}x{height}-{100,125}-{day,night}.png`.

| Physical viewport | 100% CSS / DPR  | 125% CSS / DPR    | Result                                                                                                                             |
| ----------------- | --------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1366 × 768        | 1366 × 768 / 1  | 1093 × 614 / 1.25 | 100% journeys PASS author; 125% FAIL: live oscillation, missing hover, unequal Home/button framing.                                |
| 1440 × 900        | 1440 × 900 / 1  | 1152 × 720 / 1.25 | Both phases/zooms: six allies visible, pointer readback, focus, pan/wheel, equivalent Overview, zero action POST and revision 4→4. |
| 1920 × 1080       | 1920 × 1080 / 1 | 1536 × 864 / 1.25 | Same author checks pass in both phases/zooms.                                                                                      |

The complete matrix was executed at 6ce7f587 before the four-line explicit-
Overview correction; final-head initial day/night, the 24-frame small-viewport
blocker, hover sweep and CVD evidence were then repeated at 514943b7. Thus a full
passing final-head matrix is **NOT_RUN**, and two rows already fail on that head.
Before-change screenshots cover only 1440 × 900 day/night; remaining baseline
matrix screenshots NOT_RUN. No waiver of the original 12-row before/after DoD.
Reduced-motion repeat and complete keyboard shortcut equivalence NOT_RUN.

165-cell evidence at final source:

- `hover-overview-fixed-results.json`: 152 matches, 13 cells covered by native
  overview DOM markers, zero mismatches among those 152 exposed cases.
- `hover-close-results.json`: native focus/closer views resolve 11 of the 13;
  two attempts hit opaque neighbouring figures. These are retained failed probes,
  not silently counted as correct cell hits.
- `hover-exposed.log`: the last two cells (1,9), (11,9) use genuinely exposed
  transparent sprite borders; actual pointer and native hovered q/r both PASS.
  The selection used real ray UV/alpha information; game hover was still driven
  by the real pointer, with no callback/state injection.
- Union: 165/165 unique cells read back correctly, no mismatches in the final
  selected exposed cases, zero action POST, revision remains 4 throughout.
- Earlier `hover.log`: 104 matches, 60 unreachable, one mismatch, before the
  explicit-Overview correction. Retained as a failed attempt.

The native state reads traverse the current React root to read the actual
BattleView hover hooks and public view revision. They never set hooks, invoke
callbacks, fabricate gameplay or intercept action responses.

## Checks, failures and limits

Final head `514943b7`: `validate-final.log` — **9/9 PASS**, exit 0:
rebased, clean tree, scope (198), packages, typecheck, format, lint, related tests,
coverage-fed audit. Related tests: **83 PASS**, 5 files, no skipped tests.
The normal pre-commit audit passed on each of the three commits. Separate public
battle-framing/hex-mesh/terrain run: 15 PASS. Web typecheck, scoped ESLint and
Prettier PASS. `git diff --check` PASS. No full verify/stress/migrations run.

Retained actual failures/tool limits:

1. First geometry regression: two expected failures before exports existed.
   Catalogue/mutation regression also failed before the feature.
2. Every first file-edit audit was invoked. Initial sprite test/art/scene audits
   failed because coverage/coverage-final.json did not exist. Focused coverage
   was generated; retry passed. Extraction audit found an unused exported
   spriteDisplayHeight; it was made private. The inherited spriteForUnit finding
   remains explicitly excluded by the normal audit, without a configuration change.
3. Added all-raster test passed alone, then exceeded the existing 5000 ms timeout
   under coverage twice. Changed its boundary to one actual catalogue image per
   case, preserving all byte checks and the same timeout. Final 83-test coverage
   run and normal hooks pass; no threshold or coverage bypass.
4. Playwright wrapper was not executable; used bash, then the already installed
   CLI directly. Default npm cache returned EPERM; a writable-cache invocation
   could not see the old browser session. Direct installed CLI recovered it.
   Pillow was absent; actual source alpha was measured in browser and tested by
   independent PNG decoding. Initial measurement calls used wrong callback shape
   or stale import URL and failed; their logs remain.
5. Isolated browser context rejected chrome://settings. A dedicated persistent
   CLI profile enabled native Page zoom. Meta+Equal did not change zoom and was
   not counted as 125% evidence.
6. First matrix hit portrait stability timeout. A real coordinate click with
   native zoom readback replaced that automation method; no forced DOM click.
7. Validator package build restarted the watched disposable server during one
   browser repeat, producing connection failures/404 and losing that battle.
   `matrix-settled.log` and `.orca/play.log` retain this failed attempt. Checks
   finished before a fresh-session browser repeat; no invalid-session row passed.
8. Current small-viewport oscillation is a reproduced blocker, not an environment
   error or acceptance waiver. No speculative renderer/hatch fix was attempted.

Actual old replay/projection import (including absent optional tiles) NOT_RUN.
Source fallback remains unchanged; replay compatibility is not runtime-proven.
Supported-editor diagnostic near/far/height matrix, adjacent bears, full layering
intersections/rings/tooltip-terminal journeys and motion evidence remain NOT_RUN.
Manual combat to first death then autoplay outcome, independent evaluator review
and full absolute visual critique, comparison sheets and Tier V are coordinator-
owned and NOT_RUN here. Original reference paths remain the contract inputs;
no animation-clip acceptance or M1 completion is claimed. Keep every original AC.

## Cleanup and final handoff

Named browser `uix179` closed; private launcher stopped through the existing
script. `cleanup.json` positively records all 16 captured owned PIDs absent,
no listeners on 23319/25319, and no `.orca/play.pid`. No other browser/runtime
was stopped. Final validation ran after cleanup and did not launch a runtime.

Five-line handoff (local report only; coordinator owns issue write):

- Branch: Vovanostm/uix-w4-scale, not pushed.
- Head: 514943b7, clean, ordinary main integration already current.
- Done: 198 source lines; 1440 × 900 W01 84.7247 px day/night; focused/validator PASS;
  native 165-cell and CVD evidence retained, with all failed attempts above.
- Next: allocate the finite HUD-height blocker fix, integrate it, rerun the full
  original final-head native matrix/remaining AC, then fresh coordinator Tier V.
- Blockers: native-125 1366 × 768 feedback loop outside ownership; outstanding
  original diagnostics/compatibility/layering and independent acceptance gates.

## Exact proposed shared-record changes — coordinator only

No shared file was written. Suggested Unreleased CHANGELOG entry:

```markdown
### Catalogue-derived battle spacing, partial local #179 — 2026-10-22, LOCAL

- `Vovanostm/uix-w4-scale`, #179, source head `514943b7`: derive spacing 1.80
  from the full measured alpha catalogue; share unchanged figure geometry,
  correct x/y/width/height bounds and B025/B053 support anchors, register
  procedural ground/rubble and retain separate squad/Overview framing.
  Four combat-lab source files and matching sprite-art/terrain tests; 198 source
  additions plus deletions. No rules, RNG, replay format, protocol or server change.
- Genuine default 1440 × 900 Start: all six allies and nearest wolves visible;
  W01 alpha height 84.7247 px day/night. Native exposed-cell evidence covers
  165/165 with zero final selected-case mismatches, zero action POST and
  revision 4→4. Native 12-row matrix and 24 CVD captures retained in the local
  slice report; two 1366 × 768/native-125 rows fail HUD/camera oscillation.
- Normal commits and final validator 9/9 PASS, 83 related tests PASS.
  Not pushed, published, merged or independently accepted. Keep #179 open;
  remaining original AC/DoD and full Tier V are not waived. Coordinator must
  route the measured HUD-height feedback outside the four owned paths.
```

Suggested dated amendment to the existing #179/audit scale section in
`docs/wiki/battlefield-test-maps.md` (retain all original requirements):

```markdown
**2026-10-22 — локальная реализация #179, приёмка заблокирована.**
В `Vovanostm/uix-w4-scale` (`514943b7`) шаг 1,80 выведен из полного каталога
по alpha ≥ 64 с округлением вверх до 0,05. Высоты фигур и множитель 0,82
сохранены. Выбран существующий процедурный грунт; исправлены трактовка
visibleBounds и опоры B025/B053. Исходный Start мельницы при 1440 × 900:
W01 84,7247 CSS px днём и ночью, весь отряд и ближайшие волки видны.
При 1366 × 768 и настоящем browser zoom 125% воспроизведён цикл: высота
ленты инициативы меняется вместе с battle-overview, после чего камера
перекадрируется и снова пересекает порог режима. Эта ошибка вне четырёх
выделенных путей; координатор назначает отдельного владельца исправления.
9 проверок валидатора и 83 связанных теста прошли. Код только локальный;
исходные AC/DoD, оставшиеся замеры и независимый Tier V не закрыты.
Локальный отчёт: .orca/uix-w4-scale/report.md в выделенном worktree.
```

Suggested CURRENT_PLAN slice lines (integrate into coordinator's live block):

```text
#179: local clean head 514943b7, 198 source lines; no push/PR/acceptance.
1440 × 900 Start: W01 84.7247 px day/night; six allies + nearest wolves.
Validator 9/9, 83 related tests; native hover/CVD proof in local report.
Blocked: 1366 × 768 native125 HUD-height/camera feedback; allocate HUD owner.
Original remaining AC/DoD and independent Tier V stay open; #214 stays frozen.
```

## Rework 1 — 2026-10-22 (in progress)

Allocation: `task_e0403f2dd2fc`; exact permit first line checked before audit.
Retained coordinator head `8c09a7ca`, source `514943b7`, branch unchanged,
clean starting tree. Read complete accepted contract plus coordinator amendment,
#179 body/comments, current CHANGELOG/CURRENT_PLAN, ART_LORE_POLICY and rubric.
Ordinary fetch/merge of origin/main: already up to date; no reset/rebase.

First correction removes only overview initiative height/min-height override:
existing 130 px full-height outer box is now shared across classification.
Hidden compact vitals stay hidden; accessibility/threshold/figures unchanged.
Optional PNG byte decoder and its byte-decoding cases removed, with original
public catalogue fit/minimal 0.05 step/B001 widening/unchanged-height/corner
regressions intact; retained genuine alpha measurements remain evidence.
First-edit audits for CSS and test both PASS (logs `rework1-audit-first-*.log`).
Shared CHANGELOG/wiki/CURRENT_PLAN are coordinator-owned and not edited.
Proposed addition: rework 1 fixes scale-driven HUD feedback by reserving the
full initiative outer height, simplifies optional test decoding, preserves all
original acceptance requirements. Local only; native stability and original
remaining AC not yet rechecked at this checkpoint.

### Reproduced scene advisory before any scene edit

At b3f93f95, supported Start → native wheel in → held D to edge → Overview →
portrait human-1 → held D produces different field limits. Initial right bound
35.665516; after Overview 61.84 (camera at 4.8 had not quite saturated; Overview
itself admits 61.860575). Apron scale changes [6.485825,1,5.954942] →
[14.782525,1,13.456581]. Log `rework1-edge-pan-before-retry.log`, screenshots
`rework1-pre-pan-*.png`. Different zooms do not explain a changed world-space
containment edge or apron geometry. First strict-locator attempt failed because
forecast duplicates exist; retained in `rework1-edge-pan-before.log`.

Exact necessity: overviewBounds(initialFrameUnits, false) computes a fit AND
unconditionally writes cameraLimits/apron from that subset, overwriting the full
field just calculated. Minimal owned-scene correction: return the subset frame
before those full-field-only mutations. No camera-module edit is needed.
Native125 initial HUD stability: 60 identical consecutive samples per day/night,
height130/top171.600006/dock387.550018/zoom21.709584/CSS1093x614/DPR1.25.
Saved `rework1-stability-results.json`; screenshots accompany measurements.

Normal first-edit scene audit failed: overviewBounds CRAP30 (5 cyclomatic,
4 cognitive, no unit coverage). Preserved `rework1-audit-first-pan.log`.
Following the named-function rule, extracted its pure full-field/squad map-bound
selection into spriteFrameMapBounds and added one focused public test. The scene
orchestrates the existing camera and full-field side effects; subset fit returns
early. Restructure audit PASS, no audit configuration/assertion weakened.

### Additional AC4 necessity measured before catalogue edit

Final-head supported editor imports place W01/W05/B002/B003/B017/B053 in near
r2/far r8 at height0/1, seed20261009; actual marker clicks focus each target,
and actual source alpha>=64 row endpoints project through live meshes/camera.
All24 height0 native close hovers match the intended unit, zero action POST.
Initial Enter-before-visible attempts remain failed probes under close-h0/h1.

Width ratios pass: B002 .87846, B053 .75269, W01 .38442 near/far (negligible
difference). Grounding remains defective for lowest-pixel anchors B002/B003/B017:
manual paw landmarks inspected on actual source images, transformed through live
mesh and inverse ray to the cell-height plane, give height1 far ground-offset /
hex-radius .26143/.37080/.31657, above .25. Independent review remains pending;
landmarks are approximate source readings, not calibrated pixel-perfect truth.
Projected minimum-radius estimates also flag far cases; that conservative metric
is retained separately and is NOT substituted for a ground-plane radius.
Logs: rework1-contact-radius.log, rework1-close-native-h0.log and h1.log.

Smallest owned correction for original AC4: move B002/B003/B017 support anchors
to the observed paw-contact centroid, without changing art/bodyHeight/display
height/0.82. Source points in (x,y): B002 (175,1000),(540,970),(766,1105),
(1120,1010) => (650.25,1021.25); B003 (280,1140),(520,980),(740,865),
(1070,875) => (652.5,965); B017 (160,965),(505,865),(858,1100),(1110,1005)
=> (658.25,983.75). W01/W05 already below .06 radius. B053's retained support
is below .20 ground-plane radius using its three grounded paws; do not include
its raised right claw as a grounded contact. No broader ownership required;
estimated source delta +12, still under300; all final-head proof must repeat.

Support correction committed normally at 1c199e94; total scope231/300.
Normal audit + seven sprite tests PASS; final source validator: packages,
typecheck, scope, lint, related66 tests and audit PASS. Clean-tree and format
FAIL only because coordinator concurrently edited its three shared records;
CURRENT_PLAN currently fails formatting. Those paths remain untouched by this
worker. Coordinator must finish its own edit/commit; no source check weakened.
New shared-record advisory about foreground distortion is read as an observable
finding, not authority to edit renderer/#184/HUD. Source attribution and any
owned minimal correction require actual geometry/material evidence first.

## Rework 1 final result — FAILED / original acceptance remains open

Current head and upstream: `f623336a6a33a9bc032161d5e00205708d94b313`.
Final source: `1c199e9473ec19ee7e917875e32aaf25814f526c`.
Base/main: `c62ad2d021c836563da9bef5827003387c29a273`.
The coordinator committed/published its own shared records at f623336a during
this run. Worker did not publish, write GitHub, call Orca, or edit those records.
Tracked tree clean. This section supersedes the opening retained failed report;
Retained slice-local failed evidence, screenshots and commits are preserved; the launcher-owned shared log exception is recorded below.

### Committed corrections and actual checks

- `b3f93f95`: remove the overview-only 90 px height override; preserve the
  inherited 130 px initiative outer box and hidden compact contents. Remove
  only the optional PNG decoder/tests. Public fit, minimal upward 0.05 step,
  widened-B001 mutation, unchanged height and projected-corner assertions remain.
- `e56df630`: squad fitting returns before overwriting full-field camera limits
  or apron. Normal audit initially rejected overviewBounds CRAP 30; extract its
  pure map-bound selection and add a focused public regression. No bypass.
- `1c199e94`: use inspected paw-support centroids for B002/B003/B017 after actual
  far-row contact measurements failed AC4; corresponding public regressions.
  No art, figure heights, display-height mapping, 0.82, spacing formula, threshold,
  camera module, renderer, vitals, server, core or protocol changes.

Total branch source scope **231 additions plus deletions / 300**, including
retained implementation and all rework. No budget reset. Frozen #214 CSS rules
remain untouched; ordinary diff changes only initiative outer-height rules.

Final `rework1-validate-delivery.log`: exit 0, **9/9 PASS**, including clean tree,
main ancestry, source scope, packages, typecheck, format, lint, related tests and
normal coverage-fed audit. **66 tests PASS in 6 files**. All three commits used
normal hooks. Separate focused sprite tests 7 / combined geometry tests 5 PASS;
scoped typecheck/lint/format and diff check PASS where logged.
Full verify/stress/migrations NOT_RUN as instructed. Performance NOT_MEASURED.
No check ran alongside the private runtime. Earlier final-source validator
failed only clean-tree/format during concurrent coordinator record edits; its
7 passed gates and both failures remain in rework1-validate-support-final.log.
After coordinator commit and runtime cleanup, the complete validator passed.

### Current original AC / DoD readback

Every PASS below is **author evidence**, not independent Tier V or visual ACCEPT.
Screenshot paths are local evidence, not links to untracked files.

| Criterion                                                   | Final-source result and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 B002/B053 near/far, day/night, <=90%                    | PASS author geometry + native captures: B002 .87846, B053 .75269 of projected flat hex width. Final-close-h0/h1/h2 results contain source alpha>=64 scans and mounted matrix projection; 72 native close captures under shots/rework1-final-contact-native-*.png. No PNG margins counted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| AC2 adjacent B002, actual hover                             | PASS author, genuine near r2 and far r8, day/night. Opaque bounding boxes are disjoint by 35.2101 CSS px near / 14.4689 far. Both intended bears read back on actual pointer hover. rework1-final-adjacent-r8-results.json. Earlier four-bear-only attempt let initial server AI advance far bears to r4; retained and superseded, not accepted as r8 proof. An ordinary fast human archer in the supported editor diagnostic keeps the intended far placement intact.                                                                                                                                                                                                                                                                                                                                  |
| AC3 W01 >=35%, near/far difference <=5%                     | PASS author: .384421 near/far; measured maximum difference <.000001 absolute ratio across final captures. Body dimensions/display heights unchanged, catalogue width tests retained.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Inherited base 1440 initial W01 >=80 CSS px                 | PASS author: **84.7247338 px**, day/night, genuine default Start before camera input. rework1-final-native-initial-results.json and shots/rework1-final-default-initial-{day,night}.png. No universal 80 requirement invented for other viewports.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| AC4 six figures near/far, heights 0/1/2                     | PASS approximate author contact measurements: actual source-image paw/boot landmarks, live mesh transforms and inverse rays to each cell-height plane. All 36 figure/row/height cases have contact-centre offset <=.191454 of ground radius and chosen contact landmarks inside the actual hex. rework1-final-contact-feet-results.json. W01/W05 below .052, corrected B002/B003/B017 approximately centred, B053 below .192 using its three grounded paws. Landmarks are manual estimates, not calibrated exact anatomical contacts; independent visual assessment remains required. The earlier minimum projected-radius calculation is retained as a conservative different metric, not silently relabelled as ground-radius proof. B025/B053 prior source inspection/support history remains above. |
| AC5 complete squad + nearest enemies, initial default frame | PASS author smoke at base 1440, day/night, before camera interaction, plus all 12 final matrix rows retain six allied bounds inside measured HUD opening. Default nearest-wolf positions and original Start retained. Independent target/readability scoring remains pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| AC6 all165 cell hovers / zero action POST                   | PASS author **165/165 day AND 165/165 night**, zero mismatches in both final adaptive runs; 0 action POST, revision 4->4. rework1-final-hover-adaptive-results.json and rework1-final-hover-night-results.json. Real pointer, native React hover readback; no callback/hook mutation. Includes raised q9/r5 and q10/r5 sides of the shared edge, and transparent/exposed pixels around occupied cells.                                                                                                                                                                                                                                                                                                                                                                                                  |
| Ground boundary / raised/seam picking                       | Shared-height edge and far boundary q14/r10 PASS. First close-view outer q0/r0 probes were offscreen and remain failed. Actual native drag panning then exposes its -0.84 world-x outer edge: q0/r0 readback PASS day/night at unchanged revision 4. rework1-boundary-zero-results.json and matching screenshots.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| AC7 full catalogue + mutation                               | PASS public catalogue fit/minimal-step/widened-B001/unchanged-height/corner regressions and final normal validator. Independent browser alpha>=64 scan matches **22/22** catalogue widths, including B001, unarmed derivative and SVG fallback at declared dimensions: rework1-final-alpha-results.json. Decoder removed, no replacement parser/dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| AC8 continuous ground / registration                        | Procedural-ground route retained. Public terrain centre/corner/picking/rubble tests pass; final whole-grid day/night and boundary/height captures exist. Buildings/perimeter remain outside playable cells in sampled captures. **Visual acceptance FAIL/open**: the retained diagnostic Overview has severe foreground perspective/texture expansion, also identified by coordinator advisory. Sampling attributes visible foreground to both apron and first-row ground, not the #184 hatch alone. rework1-foreground-results.json records Overview zoom 38.959/FOV 2.776 radians (about 159 degrees), actual ray hits/materials/positions. No speculative shader, hatch, renderer or optics edit.                                                                                                    |
| AC9 CVD                                                     | All 24 final native CDP captures succeed: none/deuteranopia/protanopia/achromatopsia x day/night x full-grid/B053 grid/B053 grid-off, with actual marker clicks and 0 action POST. rework1-final-cvd-results.json. Readability scoring remains coordinator critic-owned.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Genuine12-row final-head matrix                             | PASS author input/visibility: physical 1366x768/1440x900/1920x1080 x native 100/125 x day/night. rework1-final-matrix-results.json: six allies visible, actual hover, portrait focus, Home/mouse Overview equivalence, held pan/wheel, visible focus, no action POST/revision changes. Chrome Page zoom, CSS viewport, DPR and HUD opening recorded; visualViewport.scale1. No CSS transform or emulated DPR used as zoom. **Original before matrix incomplete**: retained original before-day/night shots cover base 1440; remaining original baseline rows NOT_RUN. Prior 12-row feature captures and failed native 125 row remain before-rework evidence, not fabricated original baselines.                                                                                                         |
| Native125 HUD stability                                     | PASS author, final source:60 consecutive identical RAF samples per day/night at physical 1366x768, CSS 1093x614/DPR 1.25. Initiative 130, top 171.600006, dock 387.550018, zoom 21.709583992. rework1-final-stability-retry-results.json. Full matrix also passes actual hover/focus/Home/mouse Overview in both formerly failing rows. Initial retry script failed on restored-session editor lookup, retained separately.                                                                                                                                                                                                                                                                                                                                                                             |
| Initial -> edge pan -> Overview -> return                   | PASS author after e56df630. Initial and return right containment edges63.86057545 /63.86057373 (float difference .00000172), with unchanged full-field apron scale/position. Original reproduced pre-fix bounds/apron discrepancy retained above. Later pivot-only commit leaves this code unchanged. rework1-edge-pan-final-results.json.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Keyboard / reduced motion / state                           | PASS author: mouse vs keys 1-5 attack/move/defend/wait/retreat yield identical accepted intent/result; Space equals wait. rework1-key-equivalence-results.json. No-preference/reduce x day/night: portrait mouse/Enter and Home/mouse Overview matrices match; all WASD/arrow pairs move and stop after release; Escape closes menu; revision 4 unchanged and 0 action POST. rework1-reduced-motion-results.json.                                                                                                                                                                                                                                                                                                                                                                                       |
| Layering / rings / tooltip / terminal                       | Author captures and native journeys prepared: crowded W05 archer + long spear + bear/B053 + heights, day/night paired grid on/off, active/pinned/portrait-hover rings, tooltip with open log. rework1-final-layering-results.json, shots/rework1-final-layering-*.png; revision 0->0, 0 action POST. Inspected author day/night images show ground cues behind the sampled opaque bodies. This is not an exhaustive scored visual verdict; exact historical rejected frame reproduction and every tooltip-terminal hover state are **NOT_RUN**. Terminal victory captures exist and are unobstructed in the observed state.                                                                                                                                                                             |
| Manual first death -> autoplay outcome                      | PASS author genuine default mill, day/night. 22 manual move/attack/wait orders each phase; first dead opponent-1 at round 3/revision 56; then actual autoplay -> human victory, round 10/revision 187, all 6 opponents dead. rework1-manual-day-results.json, rework1-manual-night-retry-results.json, rework1-outcome-{day,night}-results.json. Real movement start/contact/end frames saved; static sprite clips absent, no waiver of movement/layer evidence.                                                                                                                                                                                                                                                                                                                                        |
| Old supported replay/projection import                      | **FAIL / BLOCKED within allocation**. Native editor exposes only 2 file inputs (battle/map); the tracked old ui-replay-mill.json is rejected by ordinary import, preserving the current draft. rework1-legacy-import-results.json and screenshot. BattleEditor/editor-actions accept battle config/map shapes; session-lifecycle + server routes provide replay export/download, no replay import. No injected projection or bespoke harness counted as supported import. Rendering legacy absent tiles therefore NOT_RUN.                                                                                                                                                                                                                                                                              |
| Full independent Tier V                                     | NOT_RUN by this worker, coordinator-owned. No evaluator or visual ACCEPT claimed. Approved references plus equal-alpha-height close/game-scale comparison sheet at shots/rework1-final-reference-comparison.png, full default/Overview/close/night/CVD, crowd and movement frames supplied. Stage1 day/night/mill/melee and unit-c/mill references are included.                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Final matrix CSS/DPR: native 100 uses physical-sized CSS/DPR 1; native 125 rows
are 1093 x 614, 1152 x 720, 1536 x 864 /DPR 1.25. Measurements are CSS pixels;
screenshots are browser-native CSS-pixel captures. All initial frames precede
camera interaction. No rules/LOS/cost/legality/RNG/replay serialization changed.

### Remaining blockers, exact handback and retained failures

Do **not** close #179 or claim a complete accepted cycle. Current usable result:
default mill -> Start is stable at native 125; all 12 author matrix rows and both
165-cell sweeps pass; base W01 remains84.7247 px; edge pan survives Overview.

1. Existing supported old-replay/projection import is unavailable through the
   inspected native UI/source. Needed: coordinator identifies an existing
   supported route, or allocates a separate replay-import slice to its proper
   web/server owners. No extra path was edited. Minimal copied original child
   acceptance (verbatim from the accepted contract):
   “Compatibility DoD → render an actual old replay/projection via supported
   import, including legacy absent optional fields/tiles; focused geometry tests
   verify deterministic display and unchanged canonical inputs. No client
   range/LOS/cost/legality implementation; scoped diff proves no
   rules/RNG/admission/replay-format changes.”
   Keep this criterion on #179 until the integration proof passes; this proposal
   grants neither implementation authority nor an acceptance waiver.
2. Original before-image matrix remains incomplete; new final captures cannot
   retrospectively prove a historical baseline. Retain current evidence and have
   the coordinator explicitly route the missing baseline proof, without reset,
   discarded commits, screenshot relabelling or assumed acceptance.
3. Reproduced foreground expansion remains visually defective. Current measured
   source lead is the wide full-field perspective, with both terrain/apron hits;
   no measured necessity to edit a read-only camera/renderer path is claimed.
   A scoped geometry/composition technique change and fresh full absolute critic
   are still needed. No hatch/threshold/sprite-size workaround or universal 80
   threshold was introduced. Night value, short-screen readability and inspected
   card clipping advisories remain open for independent scoring/attribution;
   no inherited-status claim. Scope did not exceed231, so no source-budget
   exception/split was silently taken.
4. Complete exact rejected-state/tooltip-terminal cases and coordinator evaluator
   - full visual critic remain required. Current author captures do not replace
     those gates. #214 stays frozen, #285 untouched/deferred.

Retained rework probe/tool failures: first pan locator hit forecast duplicate; initial sandboxed launcher exited after READY and the initial browser saw catalog 500 (native console retained); git fetch initially returned metadata EPERM and succeeded through the approved escalation;
first scene guard audit CRAP 30; validator shared-record clean/format collision;
filechooser run-code interception and modal retries; Enter-before-visible close
probes; first adjacent far group AI advanced to r4; initial stability restore
lookup timeout; q0/r0 edge offscreen until real drag; night manual editor locator
collided with terminal button; comparison HTML navigation fell back to app and
was retried with a separate evidence-only page. Named slice-local failed probe logs remain. The existing launcher overwrites .orca/play.log on each start; it is not retained historical evidence, and earlier shared launcher-log bytes were not separately backed up in this rework. Retained browser/probe logs still record the earlier failures. Final
accepted probe selections, source heads and missing measurements are identified
above rather than counting failed attempts as passes.

### Cleanup, publication state and proposed shared-record corrections

Owned browser uix179r1 closed; private launcher stopped through its existing
script. **rework1-cleanup.json clean=true**: all 15 captured owned process IDs
absent, no listeners on 23319/25319, no .orca/play.pid. Final validator ran afterward
and did not restart runtime. No unrelated browser/runtime stopped.

Git current and upstream both f623336a at readback: coordinator published the
branch WIP; worker performed no push/PR/merge/label/shared-record operation.
Source work committed normally; report and local proof remain in this allocated
checkout. Coordinator alone updates CHANGELOG/wiki/CURRENT_PLAN and issue handoff.

Suggested correction to coordinator records (preserve dated earlier entries):

- Record source 1c199e94 and branch head f623336a, scope 231/300. Rework stabilizes
  initiative outer height, removes optional decoder, preserves full-field pan
  limits/apron and corrects three measured quadruped support pivots.
- Final validator 9/9 / 66 related tests PASS after runtime cleanup; native 12-row
  matrix, 165/165 day/night, 22 alpha widths, 72 close contact captures, all command
  key equivalents, reduced motion and genuine manual-first-death -> round 10
  autoplay victories are author evidence. Base W01 84.7247 px unchanged.
- Keep status **published WIP, NOT_ACCEPTED / #179 open**: supported legacy
  replay import absent, original baseline matrix incomplete, exact remaining
  visual/layer cases and full independent Tier V open; foreground expansion
  persists. No setup/API/game rule/replay format/dependency/migration change.
- No full suites, deployment or performance measurement. #214 remains frozen;
  coordinator receives the exclusive slot back only after this clean handback.

Five-line handoff for coordinator to post if appropriate:
Branch: Vovanostm/uix-w4-scale (already coordinator-published WIP).
Head: f623336a; source 1c199e94; clean tracked tree; source 231/300.
Done: 3 normal rework commits, validator 9/9/66 tests, final native proof above.
Next: route legacy import/baseline and measured visual technique defect, then full Tier V.
Blockers: missing supported legacy path, incomplete original before matrix, remaining visual cases/acceptance; owned runtime/browser positively stopped.

## Rework 2 — 2026-10-22: demonstrated optics correction, proof in progress

Permit: GRANTED task_4649ca190196. Actual allocation head was c984ff00,
following coordinator-only 5083854b; opening f623336a is historical, not current.
Source at entry 1c199e94, clean Vovanostm/uix-w4-scale, ordinary main merge
already up to date. Coordinator-only shared records remain untouched.

Technique first: retained source at 50 degrees / 4 x spacing has native Overview
FOV 2.776 radians. A real 50-degree / 16 x spacing candidate removed the extreme
foreground but FAILED original initial W01: 63.0191599 CSS px day/night.
Its failed screenshots and alpha measurements remain under rework2-long-lens-*.
Read-only finite geometry then predicted that a lower, longer lens can retain
readability. Scene-local 30 degrees / 16 x spacing now measures W01
93.0184384 CSS px day/night in genuine 1440 x 900 default Start, unchanged seed,
before camera input; six allies and nearest wolf are visible. Figure world sizes,
0.82, spacing, hatch and canonical state remain unchanged. Existing camera API
suffices; explicit depth conversion adapts its 50-degree framing reference to the
scene reference, including full-field limits/apron. No renderer/framing edit.
Native default Start + Overview and supported diagnostic Overview day/night:
rework2-low-long-lens-native-results.json, rework2-low-long-lens-views-results.json,
shots/rework2-low-long-lens-*.png. These are author observations, no Tier V ACCEPT.

Original c62ad2d0 before rows are still NOT_RUN except immutable original base
1440 day/night shots retained earlier. rework2-before-verified-* are pre-rework2
1c199e94 screenshots, never original baseline. Initial before.js/retry failed on
wrong night-toggle name and produced incomplete/invalidly labelled probes;
only the verified reset-default captures are evidence. Chrome sandbox launch
failed SIGABRT/EPERM; approved owned browser launch succeeded. Initial sandboxed
runtime died after READY; native navigation failed connection-refused; approved
private launcher restart succeeded. Failed logs retained. No action-state injection.

Proposed shared-record amendment, coordinator only: #179 changes scene optics to
a lower, longer lens and explicitly converts framing reference depth; native
base W01 93.0184 px. Preserve failed 50-degree long-lens candidate and all prior
failures. Local source only, all original AC/DoD and independent Tier V remain;
final checks and remaining optics-dependent proof pending at this checkpoint.

Technique correction committed normally: 0638d7be. Focused web typecheck and
ESLint PASS; related coverage-fed tests PASS after correcting a new inverse-depth
roundtrip assertion from exact IEEE equality to 12 decimal places (2e-15 drift).
The original failed exact assertion is retained in rework2-technique-tests.log
and rework2-technique-related.log. No existing threshold/assertion was weakened.
Normal commit hook used main c62ad2d0, reports no new issues in 11 changed paths;
separate first audit compared upstream c984ff00 and is not mislabelled main audit.
Source scope is 244/300; unchanged rest of ownership. Runtime was stopped before
all tests/typecheck/audit/hooks. Browser proof resumes only after commit completed.

## Rework 2 final handback — FAILED, ownership boundary (no third round assumed)

Final code candidate: **0638d7be**, ordinary commit, not pushed. Entry head
c984ff00 followed coordinator-only 5083854b, which followed the stale author
checkpoint f623336a. Stable entry source was 1c199e94. No reset/rebase/recreated
checkout; main c62ad2d0 was already current. Earlier failures remain above.
This candidate is deliberately **NOT_ACCEPTED**, not a complete source fix.
No source after 0638d7be was changed to evade the ownership boundary.

### Exact measured blocker and minimum required allocation

The lower/longer optical technique demonstrates the intended foreground change
and preserves W01 >=80, but its projection is not consistently propagated:

- Native `rework2-angle-boundary-results.json`: camera pitch 0.523598783 rad,
  all figure planes 0.523598776 (30 degrees); `unit-vitals:*` and `yard-fringe:*`
  planes 0.872664626 (50 degrees). Sample enabled vital strips project to widths
  **36.4816, 36.0021, 35.4208 CSS px**, while their owning module specifies 32.
  Source `battle-field-vitals.ts` fixes UP at 50 degrees, uses it for sizing and
  the four-pixel foot gap, and fixes plane pitch at 50. Native measured geometry
  proves an actual shared-projection mismatch, not a speculative taste finding.
- `battle-scenery.ts::mountBattleScenery` fixes fringe plane pitch and rooted
  displacement to 50 degrees. It is read-only in this allocation.
- The owned terrain's generated material also retains 50-degree reference axes:
  native fragment reads `(0,-0.766044443,0.642787610)` and
  `(0,0.642787610,0.766044443)`. Its painted composition and rubble/fire planes
  must receive the same scene angle before registration can be claimed.
- Screenshot: shots/rework2-angle-boundary-diagnostic.png. No vitals, scenery,
  threshold, shader strokes, figure dimensions or HUD layout was edited to hide
  this finding. Night inspection-card clipping attribution remains NOT_MEASURED;
  it is not asserted to be inherited or caused by these plane angles.

**Stop condition reached:** completing this technique requires read-only paths.
Minimum extension is `battle-field-vitals.ts` and `battle-scenery.ts`, plus their
matching public regressions: accept an explicit scene elevation with existing
50-degree default; use it for each plane and its up/root vector. The current
owned `battle-terrain.ts` then needs the matching optional composition elevation
for projection axes and rooted art. Scene passes its 30-degree value to all three.
No renderer or battle-framing API change, new layout, figure resize, threshold
change, replay/rule/dependency/art change is required by this identified fix.
This is a proposal, not authority; #214/vitals ownership must be coordinated.
New source scope is NOT_MEASURED; committed scope is **244/300**, no cap reset.
Given final rework 2/2, coordinator must allocate any continuation explicitly.

If a separate ownership slice is required, proposed child title:
“Propagate the scene projection to field vitals, scenery and terrain”. Keep #179
open; copy these affected original contract criteria verbatim into its acceptance,
with integrated #179 proof still required rather than closing on this child:

> AC5, initial framing → original default Start at 1440×900 day/night shows all six allies and nearest enemies without scroll/pan/focus/Overview; capture before any camera interaction, then exercise Overview and return-to-actor without clipping or lost input.
>
> AC8, registration → choose and document existing procedural-ground route in PR. Day/night full 15×11 grid-on screenshots show every playable cell inside continuous earth, with buildings/water/art edges outside traversable cells; compare grid-off and boundary/height close views. Focused terrain test checks cell centres/corners/pick metadata and spacing-relative rubble geometry.
>
> Layering proof → reproduce owner-rejected ground-over-archer state, tight crowded/long-weapon/large-creature intersections and height steps; day/night, grid on/off, zoom and active/pinned/portrait-hover rings. Paired overlay on/off captures preserve figures/HUD/camera; no ground cue crosses opaque body/weapon/shield/feet, no rectangular alpha mask, broken contact or unstable depth. Actual hover/pin/initiative linkage and tooltip/terminal overlap journeys remain required, without expanding their implementation ownership.

Original 80 px, complete matrix, all other AC/DoD and full independent Tier V
remain on #179. This proposal creates no issue or new rework authorization.

### Original criteria: current-source evidence and precise limits

Every PASS below is author proof. Source candidate remains failed overall.

| Original criterion | Rework 2 result |
| --- | --- |
| AC1 B002/B053 <=90%, near/far, day/night | PASS geometry in supported editor, heights 0/1/2: B002 .878460566–.878460584; B053 .752686565–.752686581. Native alpha>=64 scans/projected hex widths, unscaled close captures. rework2-final-close-h{0,1,2}-queue-retry-results.json. |
| AC2 adjacent bears and native hover | NOT_RUN after optics change. Rework1 measurements are historical and not relabelled current. |
| AC3 W01 >=35%, near/far difference <=5% | PASS measured .384421072–.384421074 across current close matrix; negligible depth difference. Catalogue dimensions, display heights and 0.82 unchanged. |
| Base 1440 initial W01 >=80 | PASS author 93.0184384 CSS px, day/night, before camera input. rework2-low-long-lens-native-results.json. Those captures preceded only the apron-bound-depth conversion; camera, figure projection, catalogue and default frame inputs are identical to 0638d7be. Final-source 12-row matrix independently confirms squad visibility. |
| AC4 feet/contact, six figures, near/far heights 0/1/2 | PASS approximate author landmarks, 36 cases: maximum ground-plane offset/radius .181937089; all chosen contact landmarks inside actual hexes. rework2-final-contact-plane-results.json. Same manual source landmarks as rework1, transformed anew through current meshes/inverse rays; not calibrated anatomical truth. 72 new day/night close captures. |
| AC5 six allies + nearest enemies | PASS author base Start day/night plus 12-row squad visibility, native focus/Overview/pan/wheel. Shared-projection mismatch blocks scene acceptance. |
| AC6 165 pointer hovers, zero action POST | NOT_RUN current-source full sweep. The 12-row matrix really hovers human-1/q2,r2 in all rows with revision 4->4 and 0 action POST. Earlier 165/165 day/night remains historical. |
| AC7 complete catalogue + mutation | PASS unchanged public regressions in normal final validator. Immutable rework1-final-alpha-results.json (22/22 source alpha widths) reusable only for unchanged catalogue/art bytes and scale inputs; it proves no changed camera result. No new PNG decoder. |
| AC8 continuous earth/registration | FAIL/incomplete projection integration described above. Default and diagnostic Overview day/night demonstrate much calmer foreground; this appearance is not continuous-registration acceptance. Terrain geometry/pick/corner/rubble tests remain PASS in validator. |
| AC9 native CVD | NOT_RUN for current optics. Rework1 CVD screenshots are historical. |
| Genuine 12-row 100/125 day/night | PASS author inputs/visibility: rework2-final-matrix-results.json, physical 1366x768/1440x900/1920x1080; real Chrome Page zoom, CSS viewport/DPR recorded, visualViewport.scale 1; all six allies visible, actual hover, portrait focus, Home/button Overview equivalence, pan/wheel, visible focus; 0 action POST, revision 4->4. This is not visual acceptance or an original baseline. |
| Native125 stability | PASS 60 identical RAF samples per phase, rework2-final-stability-results.json. |
| Original before-image matrix | NOT_RUN missing rows remain. Exact c62ad2d0 exists in clean qa-hooks-session-editor and coordinator checkout, verified read-only HEAD/status; neither was altered or launched. See exact allocation request below. |
| Full edge-pan/return containment | NOT_RUN current optics. New depth-conversion public regression covers framing/limit screen-up preservation; old native containment proof is not current. |
| Keyboard / reduced motion | Matrix covers Home/button, portrait focus, held pan and wheel. Full reduced-motion/all-shortcut repeat NOT_RUN at current optics; previous command equivalence is retained historical only. |
| Layering, historical rejected archer, tooltip/terminal | Partial new close scenes only, no full paired-overlay journey or independent score. Exact historical source names codex-clipboard-6235d07a-f2cb-4ea9-80c9-4aa77ed53945.png; bytes/setup not located in checkout. Exact historical replay, tooltip/terminal overlap and current clipping attribution NOT_RUN/NOT_MEASURED. No inherited-status claim. |
| Manual first death then autoplay | NOT_RUN current optics after ownership stop. Prior genuine victories remain historical; no new victory claim. |
| Replay compatibility | PASS existing production public-boundary regressions: schema2 bridge replay and authenticated export-only reconstruction, including legacy replay without labPresentation and replayCombat equivalence. 2 PASS /16 unselected tests, rework2-public-replay-tests.log. No replay bytes were fed to draft importer; no new import feature. |
| Absent optional map.tiles | NOT_RUN new supported-scene/public-projection fallback proof; browser replay upload remains unreachable because editor accepts drafts. The unchanged fallback source is not an executed pass. |
| Full independent Tier V / comparison sheets | NOT_RUN, coordinator-owned. Candidate stops on confirmed ownership defect; author makes no independent gate ACCEPT claim. |
| Source boundaries / cap / ordinary commits | PASS 244/300, owned scene/test only changed in rework2. No unowned/shared-record edits, no bypass, no push/PR/GitHub/Orca call, rules/RNG/server/protocol/replay formats unchanged. |

### Exact baseline allocation request

Coordinator can allocate the already clean exact c62ad2d0 baseline at
/Users/vovanostm/orca/workspaces/warwrit/qa-hooks-session-editor (or its own exact
baseline) with explicit runtime/browser/port ownership under a fresh sole permit.
Capture original 1366x768, 1440x900, 1920x1080 x 100/125 x day/night using unchanged
mill seed 20261009 and original source; preserve immutable existing base 1440
captures. This worker did not alter another checkout, create/reset this one,
reuse later feature shots as original, or launch a second runtime.

### Checks, retained failures, cleanup and shared-record corrections

Final code 0638d7be: `rework2-validate.log` exit0, **9/9 PASS** (main ancestry,
clean tree, scope, package builds, typecheck, format, lint, related coverage tests,
normal main-based audit). 67 related tests PASS in 6 files; details: .orca/validate-related-tests.log.
Web typecheck/ESLint and ordinary commit hook PASS. Focused replay regressions
2 PASS /16 not selected. Full verify/stress/migrations NOT_RUN; performance
NOT_MEASURED. No runtime ran beside checks/hooks/package rebuilds.

Retained new failures: exact floating-point roundtrip assertion (2e-15); wrong
night-toggle locator; sandbox Chrome SIGABRT/EPERM; two early-exit private runtime
launches and resulting connection-refused/matrix timeout; close-view field-marker
clicks hidden at the new larger scale. Successful close retries use actual native
initiative queue buttons, with no forced click or threshold/hook mutation. Failed
files remain alongside verified retry logs. Rework1 diagnostics are input drafts,
not modified historical output. All original source and failed commits remain.

**Cleanup PASS:** rework2-cleanup.json records all **19 owned PIDs absent**,
23319/25319 without listeners and .orca/play.pid absent. Owned browser uix179r2
closed and private launcher stopped; no unrelated process was stopped. Only the
captured owned process tree is retained; broad process inventories were removed.
Validator ran after cleanup and did not launch runtime. Launcher logs were copied
before restarts/end, preserving this round's failure evidence.

Proposed coordinator corrections to CHANGELOG/CURRENT_PLAN/wiki (worker wrote
none): retain source candidate 0638d7be, scope 244/300 and author native W01
93.0184 px/12-row/near-far/contact evidence, validator 9/9; mark final rework 2
FAILED on mixed 30/50 projection consumers, not ready for PR/acceptance. Record
minimum unowned vitals/scenery allocation plus owned terrain angle propagation;
retain exact baseline and missing-tiles proof requests. Supersede stale live
head f623336a with entry coordinator head c984ff00 (after 5083854b) and this new
candidate; preserve earlier dated history. No third rework round assumed.

Five-line handoff for coordinator (no external write):
Branch: Vovanostm/uix-w4-scale, ordinary local commit, not pushed by worker.
Head/source: 0638d7be candidate; last stable entry source 1c199e94; source 244/300.
Done: lower/longer technique, W01 93.0184 px, native 12 rows/contact; validator 9/9.
Next: explicit ownership decision for projection propagation and baseline proof.
Blockers: vitals/scenery read-only, terrain reference mismatch, remaining original proof and full Tier V; all owned runtime/browser PIDs stopped.


## One supplemental shared-projection recovery — 2026-10-22

Permit first line: `GRANTED task_3c736b835ddd`, verified before checks/runtime.
Entry head `51d2b783` contains coordinator-only records after pre-allocation
`57b0c154`; source `0638d7be` and both failed ordinary reworks are preserved.
Branch/worktree unchanged; clean entry; no reset/rebase/recreation/push/GitHub
write/Orca call/agent spawn/shared-record edit. Full contract including amendments,
live #179 body/comments, current record blocks, art policy and visual rubric read.
Graph index is stale: warwrit root /Users/vovanostm/learn/warwrit, b44f5c1e;
direct source is authoritative. This is the single supplemental allowance from
issuecomment-6335026671, not a third ordinary round or a budget reset.

### Finite correction demonstrated before ordinary commit

Vitals and scenery accept explicit elevation with their legacy 50-degree default.
Terrain composition accepts optional elevation, defaulting to 50 for shader axes,
rubble roots and fire planes. Scene passes its existing 30-degree angle to all.
No figure/catalogue/layout/32 px/4 px/30 px threshold, renderer/framing, art,
rules, commands, RNG, replay serialization, dependency or #214 change.
Total source additions + deletions against c62ad2d0: **298 / 300**, including
all retained work. Four source paths changed in this recovery, 54 changed lines.

Real default mill 6x6, seed 20261009, native 1440x900/100%, Start BEFORE camera:
W01 alpha>=64 height **93.0184383504 CSS px** day/night, six allies present.
Supplemental initial measurement uses the mounted mesh/camera and source-image
canvas alpha scan, excludes PNG margins; no decoder or injected gameplay.
Evidence: supplemental-initial-results.json; shots/supplemental-default-initial-*.png.
Default Overview and supported near/far large-creature editor Overview day/night:
supplemental-views-results.json and corresponding shots/supplemental-*.png.
Supported crowded archer/long spear/bear/mill creature/height-step journey:
supplemental-layering-results.json, paired grid on/off, portrait hover ring,
actual inspection/tooltip/log interaction, revision 0->0 and 0 action POST.
No independent visual verdict inferred from these captures.

Mounted measurement supplemental-projection-results.json: camera/figures/vitals/
fringe all 30 degrees; terrain axes (0,-0.5,0.8660254), (0,0.8660254,0.5).
Six strips measure 32.0000007–32.0000020 px by 15.9999998–16.0000004 px;
foot gap 3.999988–4.000011 px. Legacy default 50 and explicit 30 are also tested
through real Babylon NullEngine mounted vitals/scenery/terrain, with adapter-only
DOM/canvas substitutes. Tests cover 32 x 16/4 px, the unchanged 30 px switch, rooted
scenery/rubble, fire planes and shader projection axes.

### First focused checks and preserved failures

Runtime/browser positively stopped before checks: 16 captured owned PIDs absent.
Private ports 23319/25319 were empty before launch; supplemental-before-start.json.
First projection-test attempt failed: scenery Float32 root drift 1.84e-6 exceeded
an overly strict new 1e-6 test tolerance; DOM disposal fixture lacked
removeEventListener. Corrected fixture/tolerance 1e-5;4/4 PASS on retry.
First typecheck failed only the test canvas HTMLCanvasElement/ICanvas annotation;
corrected to the engine createCanvas return type. Retry PASS.
Related public tests with real coverage: **73 PASS in 8 files**;
supplemental-related.log. Normal main-based coverage-fed audit PASS, no new issues
in 16 changed files; inherited finding remains normally excluded, no audit config
or acceptance assertion changed. First ESLint failed type-only ShaderMaterial
import; corrected; final lint/format/commit outcomes follow below.
All failed logs retained under supplemental-*.log. Full verify/stress/migrations/
bootstrap/production build NOT_RUN. Coordinator validation and full independent
Tier V NOT_RUN here. Short-viewport readability/night score 1 remains material.

### Shared-record proposal (coordinator writes only)

Unreleased: 2026-10-22, Vovanostm/uix-w4-scale, LOCAL, #179 supplemental recovery:
propagate the existing scene projection into vitals/scenery/terrain with legacy
50-degree defaults; actual default Start W01 remains93.0184 px, native strips
32 x 16 with 4 px gap. Scope298/300, ordinary hook/affected checks to be recorded
below; all original missing baseline/proof and independent Tier V remain open.
CURRENT_PLAN/wiki: supersede mixed30/50 source blocker only after this commit;
do not mark #179 source/evidence complete or visually accepted, retain both
failed reworks and short-viewport/night findings, #214 frozen. No setup/API/
protocol/rule/migration/dependency change. Worker has not edited shared records.


## Supplemental final handback — local correction, original acceptance incomplete

**Outcome: FAILED overall; do not close #179 or claim source/evidence complete.**
Ordinary source commit **989669ef**, parent 824afc5a; source 298/300 against
c62ad2d0, no further source changes. Full independent visual/evaluator gates are
coordinator-owned, NOT_RUN here. Existing short-viewport readability/night 1
remains material after propagation: current 1366x768/native 125 captures still show
small actor bodies under large markers. This report does not overrule that critic,
invent a universal 80 px rule for every viewport, or authorize more source tuning.

### Original AC/DoD at the corrected source

All PASS entries below are **author evidence**, not visual ACCEPT. Local evidence
paths are relative to .orca/uix-w4-scale; none of the new shots is an old baseline.

| Original criterion | Actual corrected-source result / remaining limit |
| --- | --- |
| AC1 B002/B053 <=90%, near/far day/night | PASS author: B002 0.8784605664–0.8784605843; B053 0.7526865654–0.7526865814. Supported-editor heights 0/1/2, actual source alpha>=64 through mounted camera, unscaled captures; supplemental-final-close-h{0,1,2}-results.json,72 close shots. |
| AC2 adjacent bears, real hovers | PASS author: r2/r8 pairs day/night; opaque bounding gaps 23.8659464/17.9811143 CSS px, both intended native bear hovers in all 4 rows. supplemental-final-adjacent-retry-results.json. First duplicate forecast-button locator failure retained. |
| AC3 W01 >=35%, depth delta <=5% | PASS author: 0.3844210722–0.3844210737, maximum absolute delta 1.51e-9 across near/far/heights/phases. Heights/display mapping/0.82 unchanged. |
| Original base 1440 initial W01 >=80 px | PASS author: 93.0184383504 CSS px day/night before ANY camera input, unchanged default mill/seed; supplemental-initial-results.json. Six allies and nearest wolves visible. Independent readability remains open. |
| AC4 contact inside hex/offset <=25% radius | PASS approximate author: 36 figure/row/height cases, maximum ground-plane offset/radius 0.181937089; chosen source paw/boot landmarks all inside hex. supplemental-final-contact-plane-results.json. These are retained manual anatomical estimates transformed anew, not calibrated exact paw truth. B025/B053 source/support history above preserved; no new art or pivot edit. |
| AC5 whole squad/nearest enemies and return | PASS author base Start, all 12 candidate input rows, actual portrait/Overview/pan/wheel. Full-field edge containment after Overview/return differs only 2.49e-7 world units, unchanged apron; supplemental-edge-pan-results.json. This does not accept short-screen target readability. |
| AC6 all 165 native hovers,0 action POST,stable revision | PASS author day 165/165 and night 165/165, zero final selected-case mismatches,0 action POST, revision 4->4. supplemental-final-hover-{adaptive,night}-results.json. All actual attempts retained, including opaque/covered probe failures before exposed alternatives. |
| Shared seams/raised cells/transparent borders/boundary | PASS selected native probes: q9/r5 and q10/r5 seam sides, q14/r10 outer edge and exposed sprite-border points. q0/r0 outer point is offscreen in both initial seam runs (retained failures); actual native drag then exposes it and native q0/r0 succeeds day/night, revision 4. supplemental-boundary-zero-results.json. No callback/state injection. |
| AC7 complete catalogue/mutation | PASS public fit/minimal-upward 0.05/widened-B001/restored-fit/unchanged-height regressions in 73 related tests and normal commit coverage. Ordinary git diff confirms sprite-art.ts, battle-layout.ts and assets/art unchanged since 1c199e94; existing 22/22 browser alpha widths therefore apply to identical catalogue/art/scale inputs only. They are not new camera or baseline shots. No PNG decoder. |
| AC8 full continuous ground and layers | Procedural-ground route retained; public real-ray/centre/corner/rubble tests PASS. Current full 165 grid day/night, height close views, boundary shots and ground-on/off crowded long-spear/bear/mill-creature captures exist. Shared 30-degree terrain/shader/scenery axes measured. No sampled ground cue crosses the inspected opaque bodies; no exhaustive visual score or whole-scene acceptance claimed. |
| AC9 CVD |24 default/large-creature/grid native CDP captures plus 12 crowded/height-step/grid on/off captures, day/night and all 3 requested deficiency modes.0 action POST; crowd revision 0->0. supplemental-final-cvd-retry-results.json, supplemental-crowd-cvd-results.json. First default CVD duplicate forecast-button failure retained; critic readability NOT_RUN. |
| Genuine12-row100/125 candidate matrix | PASS author input/visibility:1366x768/1440x900/1920x1080 x native Chrome Page zoom 100/125 x day/night. CSS/DPR 125 are1093x614/1152x720/1536x864 with DPR1.25, visualViewport.scale 1; actual HUD opening recorded. All 6 allies visible, human-1 native hover in all 12, Home/button equivalence, portrait focus, pan/wheel, visible focus, revision 4->4 and0 action POST. supplemental-final-matrix-results.json. No CSS/screenshot/device-scale substitute. |
| Native 125 short-viewport stability | PASS author:60 consecutive IDENTICAL RAF samples each phase, initiative 130 px, HUD171.600006..387.550018, camera zoom 13.4033043483, CSS1093x614/DPR 1.25. supplemental-final-stability-retry-results.json. First reload probe raced restored-session mounting and timed out on detached/disabled editor control; retained. Successful retry used stable native editor navigation. |
| Original before-image matrix | **INCOMPLETE**: retained prior report describes only original c62ad2d0 base 1440 day/night; no new original baseline was executed or relabelled in this recovery. Other10 original rows remain NOT_RUN. Later feature/rework/candidate shots remain their actual sources. No other checkout was changed/launched. |
| Keyboard/reduced-motion/state | PASS author: mouse vs1–5 command results equivalent; Space equals wait. no-preference/reduce x day/night: portrait click/Enter and Home/button equivalent, all WASD/arrow variants move and stop on release, Escape closes menu; revision 4 unchanged,0 camera action POST. supplemental-key-equivalence-results.json, supplemental-reduced-motion-results.json. |
| Pin/hover/initiative linkage and tooltip/log | PASS sampled actual journeys: native spear-body hover then click pins selected=spear; its initiative aria-pressed=true. Portrait bear hover changes mounted bear outline from target [1,.69,.46] to hover [1,.91,.68] while pin remains spear, revision 0,0 action POST. Day/night visible command tooltip with open log stays inside viewport. supplemental-linkage-results.json, supplemental-portrait-linkage-results.json. Portrait hover uses separate native linkage; the field-hover hook remains null there and is not relabelled as a field hover. |
| Exact historical owner-rejected archer state | **NOT_RUN**: prior handback identifies codex-clipboard-6235d07a-f2cb-4ea9-80c9-4aa77ed53945.png but lacks bytes/setup. New crowded archer/long-weapon/large-creature/height/ring shots are supplemental cases, not that original state. Required full absolute layering verdict stays open. |
| Manual first death then autoplay outcome | PASS author actual default journeys:22 manual move/attack/wait steps -> first dead opponent-1 at round 3/revision 56 -> autoplay -> human last-side-standing victory round 10/revision 187,6 opponents dead. Night: supplemental-manual-night + outcome-night-complete-results.json. Verified day: supplemental-manual-day-verified (light=day) + outcome-day-verified-results.json. Real movement start/contact/end captures supplied. Earlier25-second polls returned active round 7/revision 135, not an outcome; retained. Ambiguous/failed later day retries are not accepted day evidence. |
| Terminal/log/control overlap | PASS sampled actual terminal journeys day/night with log closed/open: Restart/Editor buttons visible and reached by real pointer,0 action POST, revision 187 unchanged. supplemental-terminal-results.json. No command tooltip exists in terminal state; its count 0 is recorded, not a missing visible tooltip silently accepted. Active tooltip/log proof is the separate linkage journey above. |
| Supported programmatic legacy replay/projection | PASS existing production public-boundary regressions: schema2 bridge replay and authenticated export-only reconstruction, including actual legacy without labPresentation and replayCombat equality;2 PASS,16 unselected, supplemental-replay-tests.log. No new replay UI or replay bytes passed to draft importer. Browser replay-upload remains unreachable by existing design. |
| Absent optional map.tiles | PASS existing public scene fallback: actual default projection read, only optional map.tiles omitted, fromCombatLabView -> mountSpriteBattleScene in an isolated evidence page.165 pickable flat cells/12 units,4 rubble cells match4 blocked cells, no missing hex, input unchanged,0 onAct; day/night captures. supplemental-missing-tiles-results.json. This explicitly proves the public fallback, not a native draft import or fabricated accepted gameplay. |
| Full independent Tier V | **NOT_RUN**, coordinator-owned. Equal-alpha-height close/game-scale sheet shots/supplemental-reference-comparison.png; all actual default/Overview/close/crowd/CVD/movement/terminal inputs supplied. References remain unit-c-ink.png, buildings/mill.png, stage1 ui-reference-day/night/mill/melee.png. No independent agent spawned by worker, no absolute score/ACCEPT assumed. Static sprites have no clips; real movement evidence is retained. |
| Delivery/records/gates | Ordinary source 989669ef, scope 298/300, focused checks PASS. No push/PR/merge/shared record write; coordinator validation/CI/PR scope/full Tier V pending. Proposals below only; #214 frozen. Original source baseline ancestry unchanged, live-main integration belongs to coordinator. |

### Final checks, retained failure details and cleanup

Source commit normal pre-commit hook PASS, generating related coverage again and
running main-based fallow audit; no bypass/waiver. Explicit focused checks:
web typecheck PASS on retry; scoped ESLint PASS on retry; Prettier PASS; related
coverage73/73 PASS in 8 files; normal main audit PASS. Replay 2 PASS/16 unselected.
No source changed after those checks. Full verify/stress/migrations/bootstrap,
production build and coordinator validator NOT_RUN; performance NOT_MEASURED.

Additional retained proof failures/limits: adjacent and first CVD locators matched
real and forecast initiative duplicates; retries use first actual queue button.
First day/night autoplay polls ended active round 7; an attempted later day reset
hit terminal/menu duplicate Editor buttons. The unverified "day" retry/outcome
files are not day evidence; a later explicit light=day fresh default run and
complete terminal poll supply the verified result. First stability reload raced
asynchronous restored-session mounting, leaving a detached/disabled editor
locator; health remained 200 and native snapshot showed the restored crowd.
Stable native navigation retry passed. Earlier seam q0/r0 miss remains alongside
successful dragged-boundary proof. Favicon404 is the sole recorded browser error;
no app exception was turned into a pass. All ordinary commits/logs preserved.

No runtime beside tests/typecheck/lint/audit/hooks. Browser uix179supp and existing
private launcher closed. **supplemental-cleanup.json clean=true**: all **32**
captured owned PIDs across both launches absent,23319/25319 have no listeners,
no .orca/play.pid. No unrelated process or browser was stopped. Original shared
launcher log copied before first start, pre-proof start and final stop, preserving
new failed results independently. No Docker resource was created by this worker.

### Coordinator record proposal and exact remaining handoff

CHANGELOG Unreleased:2026-10-22, Vovanostm/uix-w4-scale, LOCAL, #179: source 989669ef
propagates scene 30 degrees into vitals/scenery/terrain while legacy callers retain
50 degrees. Fixed 32 x 16 readouts/four-pixel gap/30 px threshold/figure sizes/catalogue
spacing preserved. Source 298/300; normal hook/73 related tests/typecheck/lint/
format/audit PASS; replay 2 PASS. Native 12 candidate rows/165+165 hovers/contact/
36 CVD captures/first-death->victory/public missing-tiles fallback supplied.
No acceptance: original 10 baseline rows and exact rejected-state reproduction
missing, short-viewport/night 1 material, coordinator validation/full Tier V pending.

CURRENT_PLAN/wiki: record ONE supplemental correction as locally committed,
retaining both failed reworks and original AC/DoD. Mixed 30/50 source defect is
corrected; original proof and visual acceptance are NOT complete. No permission
for another source round, numeric/style waiver, renderer/framing/layout expansion,
PR/merge or #214 thaw is implied. Setup/API/core/protocol/replay-format/rules/
RNG/dependency/migration contracts unchanged. Worker wrote none of those records.

Five-line handoff (local only; coordinator owns external write/publication):
Branch: Vovanostm/uix-w4-scale, dedicated existing checkout, no worker push.
Head/source: 989669ef source; final report commit follows; source 298/300.
Done: finite shared-projection correction + ordinary hook + focused/native proof above.
Next: coordinator validation and full independent Tier V; route missing original baseline/rejected-state inputs and material short-screen verdict without a cap reset.
Blockers: original 10 baseline rows, exact historical rejected-state input, short-viewport/night 1 and independent acceptance; 32 owned PIDs / 2 ports positively clean.


Final repository readback: coordinator-only shared-record commit 824afc5a arrived
between entry 51d2b783 and source 989669ef; actual source parent is 824afc5a.
Worker commits 989669ef/614a954a touch only the seven owned source/test paths and
this report; coordinator CHANGELOG/CURRENT_PLAN/wiki diff is preserved separately.
The report Prettier invocation matched no substantive file because .orca is
ignored; report style is NOT_RUN by Prettier, ordinary diff/readback PASS.
Source/test Prettier PASS is the explicit scoped check recorded above.
Tracked report staging emitted the .orca ignore warning but staged successfully;
ordinary report commit 614a954a succeeded. This metadata correction is another
normal documentation commit; no source, gate or failed result is changed.
