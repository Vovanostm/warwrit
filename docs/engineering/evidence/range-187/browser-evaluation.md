# Issue #187 independent browser evaluation

Date: 2026-10-20. Frozen source: `be8efd51709983b62733fa0436d02d975bc3eae5`.
Checkout: `/Users/vovanostm/orca/workspaces/warwrit/codex-tactical-bridge-165`.

**VERDICT: ACCEPT (bounded evaluated #187), frozen `be8efd51709983b62733fa0436d02d975bc3eae5`. Independent absolute visual critic remains a separate gate.** No confirmed material runtime defect was reproduced. This is not the mandatory scored visual ACCEPT.

## Method and baseline

Used the Playwright skill and a fresh persistent headed Chrome profile. Private API64960/web64961 were free before launch. Started existing direct development entries against current dist; no rebuild, test, database or production edit. Parent supplied integrated validator EXIT0/all eight steps PASS before activation.

Opened `/combat-lab`, changed no draft field, and clicked Start. Actual response records `Старая мельница`, ruined-mill map, seed20261009, six human and six opponent units. Initial current actor human-3, activation1:human-3, viewRevision4. Source baseline and tracked clean state were read before launching. Evidence: `start.json`, `start.log`, `battle-snapshot.log`.

## Untouched baseline passive matrix

29 images and observations: `observations.json`, screenshots in `output/playwright/range187`.

- Captured overview day/night for1366x768,1440x900,1920x1080 at100% and genuine native Chrome125%.
- Used visible Settings → Appearance → Page zoom combobox; selected/read back125%, retained viewport across each zoom pair, then restored100%. `native-settings-125.png` / `native-settings-100.png` show the control. No CSS zoom or substituted device scale factor.
- At100%, actual inner content sizes matched the requested sizes, DPR1. At125%, inner became1093x614/1152x720/1536x864, DPR1.25. Native outer was1200x844 throughout: these are requested **content viewport** captures, not claims of physical window dimensions.
- Captured day/night grid on/off, archer close, wheel in/out, left-drag pan and overview recovery, spear hover/away.
- Captured CDP `achromatopsia` (grayscale/achromatopsia), `deuteranopia` and `protanopia`, each day/night. These are browser visual emulations, not clinical measurements.
- Request listener recorded **0 POST** throughout the matrix. Initial response revision4; the first subsequent accepted end-turn request used expectedViewRevision4. This supports unchanged canonical revision through the passive interval. No action was sent by hover, inspection, lighting, grid or camera controls.

Observed exterior ochre boundary distinct from cyan movement wash, no combined legend, and no weapon-area internal cell edges with grid off. Grid toggle restores deliberate full grid. Perimeter remained present when returned to overview after close/pan/wheel; close framing naturally puts portions outside the viewport. No whole-contour origin-culling disappearance reproduced. Representative screenshots were visually opened; the independent visual critic must assess the complete set.

Baseline aimed-shot is genuinely unavailable: aria-disabled=true, pointer click leaves aria-pressed=false, tooltip reports no suitable target in2–4. This is recorded in `skill-selection.log`; no false claim of baseline selected-skill proof.

## Separate lawful selected-skill continuation

From the same unchanged draft/seed, used18 ordinary UI End Turn actions; no injected state, draft edits, forced skill selection or attack command. Natural hostile turns advanced revision4→56 and round4 current actor human-3/activation4:human-3. Selected aimed-shot through its now-enabled actual button; aria-pressed=true. No action POST was needed to select it.

Evidence: `continuation.json` (first16 end turns), `skill-journey.json` (next2 and response views). The latter records exact skillReach identity actor human-3, activation4:human-3, revision56, aimed-shot, minimum2/maximum4,43cells. Selection visibly replaces the radius1–4 bow area with the2–4 area and its inner exclusion contour. Actual enemy target preview and skill prompt are visible; no skill was fired.

Captured before-select bow/after-select day/night, plus selected skill all three viewport/native125/day-night pairs (`selected-*.png`). Additional selected-skill CVD day/night captures are `selected-vision-*.png`. Selected matrix listener:0 POST, response revisions56 only, aria-pressed remains true (`selected-observations.json`, `selected-vision.log`). This is separate from the baseline passive0POST assertion.

Current ordinary continuation crowd/long-weapon/height-step evidence: `continuation-crowd-medium-{day,night}.png`, `continuation-spear-height2-{day,night}.png`, `continuation-halberd-height0-{day,night}.png`, `continuation-crowded-wolf-{day,night}.png`. These show the actual round4 formation and existing height2 spear, not a fabricated crowd fixture. The radius reaches the formation; the close screenshots retain real occlusion and HUD. These do not claim a line crosses every weapon silhouette.

## Reference comparison

Opened approved `assets/art/m1/style/unit-c-ink.png` and `assets/art/m1/places/staraya-melnitsa.png`, and current baseline/continuation captures. `reference-sheet.png` follows the existing evaluator's neutral equal whole-image-height320px method without cropping/recolouring. `reference-sheet.html` embeds the original pixels; `reference-sheet.log` records natural/display dimensions. This is a display comparison, not a thickness measurement or equal character-scale claim. Original full-size screenshots remain the acceptance input.

Corrected equal-BODY-height comparison: `body-height-reference-sheet.png` pairs the inspected current baseline archer body crop with the approved unit at300px head-to-foot height and separately at the actual current105px native body height. Crop coordinates, manual body brackets and scaling are recorded in `body-height-reference-sheet.json`; normalized crops use nearest-neighbour scaling, no recolouring/masking. The native current crop preserves its1:1 pixels. The whole integrated frame is retained separately and as a labelled thumbnail. This corrects the whole-image-height sheet's limitation; different weapons remain an explicit comparison limit.

## Thickness evidence and limits

Read actual PNG pixels (no image modification), retaining sample rows in `width-samples.json`. Representative far top baseline boundary at1440x900/day, x620, has two bright ochre raster rows y212–213 plus antialiasing. At1366x768/native125/night, x620, it has three bright rows y245–247, equivalent to2.4CSS pixels along that vertical sample before edge-angle correction. These are representative samples only; threshold choice, antialias coverage and edge angle matter.

Source-grounded projection analysis additionally accounts for fixed elevation50degrees, actual perspective distance41.6/optical center, actual averaged terrain-corner heights and normal-to-edge angle. `projection-width.mjs`/`.json` evaluate baseline56 exterior sides and selected68 exterior sides at endpoints/midpoints (168/204 samples). Full normal ribbon width is derived as `4 * abs(det(projectedSide, projectedEdge)) / length(projectedEdge)`, using the actual pinhole projection derivative. Minimum is approximately **2.2504 CSS pixels** for both states (q0,r9 side1), maximum5.2383. Terrain slopes are included. The flat orthographic4*sin50≈3.064 bound alone would have overstated the perspective minimum.

Together, actual raster samples and inspected projection support the **>=2 CSS-pixel floor for these inspected default-scene states**. CSS viewport/zoom factors cancel in this formula and the optical center remains fixed during pan/zoom; native125 changes raster/DPR, not this CSS width conclusion. This is proportionate source-plus-raster evidence, not a live per-pixel measurement of every segment. Arbitrary terrain, other camera elevation/optical placement and exhaustive raster coverage remain NOT_MEASURED; they are not invented additional acceptance gates for this bounded change.

Stale/missing/empty selected-skill suppression was source-reviewed; no live response substitution was used to fabricate those cases. Runtime cases: NOT_RUN.

## Diagnostic errors and teardown

A separate unauthenticated diagnostic GET during the first continuation returned404 NOT_FOUND (missing capability); it is retained in `continuation.json` and **not used as revision proof**. The first continuation therefore did not recognize its planned selection checkpoint; it executed16 end turns. The next2 legal end turns and normal UI selection supplied actual response evidence. No hidden mutation was used to repair the measurement.

Chrome initially logged missing favicon404; no gameplay error was attributed to that. A file:// reference-sheet navigation was blocked, then the same local HTML was served by the already-running Vite `/@fs/` path and successfully captured. Standalone system Python lacked Pillow, so PNG samples used a local read-only Node decoder; no package installed.

Browser closed; own API/web processes stopped after capture. Runtime window released to parent before static review. No production/source/shared-document edits. Only owned `.orca/range187` and `output/playwright/range187` artifacts written. Parent owns durable documentation integration and independent visual critic coordination.
