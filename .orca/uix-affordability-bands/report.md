# #184 — affordability bands, rework 1

2026-10-21. Builder result only; independent evaluator and absolute visual ACCEPT remain future gates.

## Checkpoint and ownership

Started in the exact assigned worktree on `codex/combat-affordability-184`, clean at `c29e4a9572029fb8604283f0f5b1fc7e63246fa3`. Source commit: `25a432f8` (`fix(web): keep movement hatches readable at overview`). Only `apps/web/src/renderer/battle-cell-grid.ts` changed: 4 insertions / 3 deletions. `battle-movement-hatch.ts` does not exist at this base; no new module or scene integration was needed. Other source, shared documentation, evaluator reports, 40 evaluator images and logs were preserved.

Read AGENTS, issue #184 and comments, the current and inherited contracts, complete eval-1/eval-ready, inherited geometry correction/evidence, build steps 3–5, ART_LORE_POLICY, ADR-0003 and technology handoff. Inspected both required art references and all five named evaluator images. The graph index belongs to another, older checkout; used the permitted direct-source fallback. The requested report path did not previously exist, so this records the new rework without replacing evaluator history.

## F1 → change and fresh evidence

**F1 (P2), subpixel overview hatching:** increased full world stroke width from 0.018 to 0.08, separated the strokes by increasing level pitch from 0.22 to 0.42, and changed unlit achromatic stroke tone from 0.16 to 0.68 (alpha remains 0.78). This keeps the individual marks visible against dark ground rather than letting subpixel dark marks disappear into it. This is a bounded material/geometry-parameter adjustment, with no camera machinery or new Babylon API.

The existing finite-strip clipping against cell corners and actual fill triangles, per-triangle height interpolation and +0.013 clearance are unchanged. No cell borders were added. Existing reach contour, fill/target/path priority, selected-skill suppression, legacy fallback and server classification remain under their original owners. No AP/range/LOS/cost/legality calculation, server, protocol, core, RNG, replay or migration changes.

All fresh images are local evidence under `.orca/uix-affordability-bands/rework-1-shots/`, separate from `eval-shots/`:

- `sword-{day,night}-{none,achromatopsia,deuteranopia,protanopia}-{1366x768,1440x900,1920x1080}.png`: 24 ordinary-overview captures at native 100%.
- `sword-native125-{day,night}-{none,achromatopsia,deuteranopia,protanopia}-{1366x768,1440x900,1920x1080}.png`: 24 captures at genuine Chrome 125%, including the exact six-true / 29-false frame.
- `native125-settings.png`: Chrome Appearance → Page zoom 125%. Native readback was inner 1152×720 / DPR 1.25 for 1440×900 output; no CSS zoom, page-scale emulation or fabricated projection.
- `raised-native125-{day,night}-{1366x768,1440x900,1920x1080}.png`, `raised-close-native125-{day,night}.png` and `raised-native100-{day,night}-1440x900.png`: real raised destinations and close conformance checks.
- `selected-skill-native125.png`: actual available aimed-shot selection suppresses movement wash/hatching and movement legend; independent skill reach remains.
- `sword-close-{day,night}-1440x900.png`: close comparison frames after the overview correction.
- `bow-day-1440x900.png`, `sword-day-1440x900.png`, `sword-keyboard-move.png`: ordinary bow, sword overview and accepted keyboard move.

The author inspected the current ordinary/night/monochrome/125% overview, raised and selected-skill images. The outer hatch is visibly separate from the unhatched inner area in these samples. This is author observation, not independent visual acceptance; arbitrary zooms/maps and measured performance are NOT_MEASURED.

## Actual smoke play

Used the installed Playwright CLI and one builder-owned `pnpm dev:combat` on private API 23663 / web 25663 from `.worktree-ports`. Disposable in-memory lab only; evaluator persistent runtime/DB and other services untouched.

Default mill, seed 20261009, 15×11, six allies / six opponents; no draft or roster edits. Initial bow revision 4 supplied 39 false rows. Right-clicked actual projected cell `(6,1)`; the accepted full-AP move advanced to commander. Ended commander with the button and spear with keyboard `4`. Sword revision 10 supplied **6 true / 29 false** rows and both legend categories. Evidence: `rework-1-exact-journey.log` (sanitized observed response summaries).

Selected actual sword destination `(3,2)` and pressed `2`: revision 10→11, sword AP 4→3. Ended ordinary controlled turns to round 2 bow; selected/cancelled its actual available aimed-shot, then right-clicked `(9,0)`. Ended subsequent ordinary turns to round 3 bow, revision 46. Its server rows included six false raised destinations `(10,0)`, `(10,1)`, `(10,2)`, `(11,0)`, `(11,1)`, `(12,0)`. Evidence: `rework-1-raised.log`, with 11 real action POSTs (two moves, nine waits), plus the captures above. Different revision 46 from evaluator's 45 follows the additional sword move; no server values were fabricated.

The final native100 and native125 sword matrices each stayed revision 10→10, **0 action POSTs**, 35 rows / six true (`rework-1-native100.log`, `rework-1-native125.log`). Raised passive hover/arrow camera/Home, lighting and screenshots stayed revision 46→46, **0 action POSTs** (`rework-1-passive-raised.log`). Native100 readback after restoring zoom: 1440×900, DPR 1 (`rework-1-native-reset.log`). There are 65 fresh PNG captures; evaluator evidence remains unchanged.

## Checks and actual limits

Executed serially for source validation:

1. `pnpm exec vitest run --coverage --mode coverage apps/web/src/combat-lab/sprite-scene-markers.test.ts apps/web/src/combat-lab/BattleGuidance.test.tsx apps/web/src/renderer/hex-mesh.test.ts` — **3 files / 21 tests PASS**, focused v8 coverage only (`rework-1-coverage.log`). Existing marker/legend/legacy/skill priority and translated/raised hatch containment/triangle-height regressions all pass; no tests changed.
2. `pnpm check:changes` — **PASS**, zero new dead-code/complexity/duplication findings (`rework-1-audit.log`). The normal commit hook repeated its audit against origin/main's merge base: **PASS**, 12 inherited changed paths, zero new findings, existing CSS advisories (`rework-1-commit.log`). No bypass or thresholds changed.
3. `pnpm --filter @warwrit/web typecheck` — **PASS** (`rework-1-types.log`).
4. `pnpm exec eslint apps/web/src/renderer/battle-cell-grid.ts` — **PASS** (`rework-1-lint.log`).
5. `pnpm exec prettier apps/web/src/renderer/battle-cell-grid.ts --check` — **PASS** (`rework-1-format.log`).
6. `git diff --check` — **PASS** before source commit.

No full coverage/full suite, second validator, stress, database, migration, rebase, push, PR, merge or deployment: **NOT_RUN**, by assignment. Coordinator owns `orca-validate` on the committed result. Live legacy substitution/replay reconstruction and a new complete-battle run: **NOT_RUN**; existing focused regressions and the preserved evaluator's completed-battle proof retain their separate boundaries.

Tool issues, not product findings: wrapper file needed `bash`; persistent Chrome launch initially hit sandbox Mach/Crashpad restrictions and succeeded with the authorized isolated launch. An initial over-advanced smoke attempt was restarted normally; a transient missing sword portrait and an incorrect day-toggle label timed out. The first matrix completed its 24 captures but its final unauthenticated observation GET returned no movement rows; this was replaced by observing actual authenticated UI restore responses. No API response or canonical state was substituted. Only browser console error seen was favicon 404.

## Proposed shared-record entry (coordinator owns integration)

2026-10-21, `codex/combat-affordability-184`, LOCAL: fix #184 evaluator F1 by widening and separating achromatic movement-only hatch strokes and increasing their ground contrast. Retain existing triangle clipping, reach/marker priority, selected-skill suppression and legacy server-only classification. Normal source commit `25a432f8`; 21 focused coverage tests, web types, scoped lint/format and normal audit pass. Fresh default mill exact 6/29 day/night/native100/native125/CVD matrix and real raised/selected-skill images retained in the rework report. Independent evaluator/absolute visual ACCEPT, coordinator validator and publication remain pending; no merged or player-accepted claim.

## Handoff

Branch: `codex/combat-affordability-184`; source head `25a432f8`.
Done: F1 rendering correction, normal source commit, focused gates and fresh in-context evidence.
Next: coordinator validator, independent evaluator/visual critic against committed source and new captures.
Blockers: none established by the builder; independent gates remain pending.

Cleanup: native zoom restored to 100% and DPR 1, vision emulation reset to none, only browser session `rework184` closed, builder runtime stopped with SIGINT (exit 130 expected). Neither assigned port has a listener (`rework-1-stopped-ports.log` is empty). Removed only the builder-created disposable profile after closing it; evaluator profiles/evidence and all other runtimes remain untouched.

# Rework 2 — 2026-10-21, local author result

Starting checkpoint: clean `codex/combat-affordability-184` at
`06479a473bf26c998243e83fd27563c78e0d8256`. Sole web writer; coordinator owns
shared records. Read AGENTS, both complete contracts, full `visual-1.md` and
`eval-2.md`, issue #184 body/comments, ART_LORE_POLICY, ADR-0003 and technology
handoff. Viewed the named sword overview/close/night-monochrome and raised-night
images, the critic's close comparison, approved unit/mill and day/night UI references.
Graph index points at another older checkout; used the permitted source fallback.

## F1 change and unchanged boundaries

`battle-cell-grid.ts` now shades the existing clipped hatch strips with a static
achromatic ink shader. Screen derivatives cap the light core at close scale
(0.55 pixel half-width plus a 0.5 pixel antialias transition); a wider dark support
separates it from earth. Staggered broken marks and varying ink weight replace the
uniform pale bars. Overview geometry retains its original 0.08 world width and
0.42 pitch; this is not a global opacity reduction. The geometry/shader share one
pitch constant. Extracting that constant after captures generates the same GLSL
numeric literals; final coverage/types/lint/format/audit were rerun afterwards.

Existing cell/fill-triangle clipping and height interpolation, +0.013 clearance,
nonpickable ground/group 0, disabled depth writes and figure/group 1 ownership
remain unchanged. No scene wiring, figures, HUD, independent ochre reach, marker
classification/priority, selected-skill suppression or legacy fallback changed.
No client rule arithmetic, server/core/protocol, migrations or dependencies changed.
`hex-mesh.test.ts` now checks the hatch shader's alpha/depth/culling contract;
existing translated/raised containment and triangle-height checks remain intact.
`battle-movement-hatch.ts` still does not exist; no extra module was necessary.

## Fresh visual and native evidence

All 71 fresh PNGs are under `.orca/uix-affordability-bands/rework-2-shots/`.
Every earlier report, log and image is preserved. Current authoritative F1 frames:

- `sword-overview-native{100,125}-{day,night}-{none,achromatopsia}-{1366x768,1440x900,1920x1080}.png`:
  24 overview frames, all three output dimensions, day/night and monochrome.
- `sword-detail-native{100,125}-{day,night}-{none,achromatopsia}.png`: eight genuine
  close frames. These supersede the earlier exploratory files named `sword-close-*`,
  whose camera could return to overview during HUD changes; those files remain.
- `native125-settings.png` visibly shows Chrome Appearance / Page zoom 125%.
  Actual native readbacks: 1093 x 614, 1152 x 720, 1536 x 864 / DPR 1.25 for
  output 1366 x 768, 1440 x 900, 1920 x 1080 respectively. No CSS/page-scale zoom.
  Settings, matrices and close readbacks: `rework-2-native125-settings.log`,
  `rework-2-native{100,125}-matrix.log`, `rework-2-close.log`.

Two ordinary untouched-mill journeys each used real right-click bow movement to
(6,1), mouse commander End Turn and canvas-focused spear `4`. Each reached sword
revision 10, **6 true / 29 false**, AP 4/4. Six total real action POSTs across the
two default battles; visual intervals add zero. Sword matrices and final close
matrix retain revision 10 and unchanged POST count. Logs:
`rework-2-sword-retry.log`, `rework-2-sword-second-journey.log`, matrix/close logs.
This repeats the affected visual boundary, not eval-2's complete round-12 victory.
That earlier gameplay proof is preserved and is not relabelled as fresh execution.

Author inspection: final close frames replace broad pale bars with fine broken
strokes; night/monochrome overview retains the patterned/unpatterned distinction.
No absolute visual ACCEPT is claimed. Final native renderer readback reports
ShaderMaterial ready=true, alpha blending=true, disableDepthWrite=true and every
hatch nonpickable/group 0 (`rework-2-readback.json`, `rework-2-final-readback.log`).

## B1 — partial new evidence; mandatory overlap/intersection remains open

Through supported editor buttons/selects and cell Enter controls, removed the
original roster, cleared terrain and placed 12 actors on adjacent cells:
allies bow (6,4), halberd (6,5), sword (7,4), great axe (5,5), spear (7,5),
commander (5,4); opponents mill creature (6,6), bear (5,6), grave guard (7,6),
halberd (8,4), spear (8,3), great axe (7,3). Started the level-zero battle normally.
Then used actual Height 1/2 brushes: q6, r2..7 = 1; q7/q8, r2..7 = 2; q5 remains 0.
Started that actual 0 -> 1 -> 2 battle normally. Both stayed revision 0 with no
battle action POSTs. Draft exports and exact editor/native readbacks:
`rework-2-{level,steps}-draft.json`, `rework-2-editor-{level,steps}.log`,
`rework-2-level-start.log`, `rework-2-step-pairs.log`.

Twelve on/off pairs are retained in `rework-2-readback.json`. The diagnostic pauses
rendering and changes only overlay visibility, then restores it and the render
loop. Every pair compares figure position/scale/rotation/material ID/depth/alpha/
visibility/group, HUD and camera view/projection unchanged; revision/POST boundaries
also match. Canonical state, figure materials/depth/position were never modified.
Representative useful frames for **each** of `crowd-level` and `crowd-steps`:

- `*-overview-day-grid-off-{on,off}.png` and `*-overview-night-grid-on-{on,off}.png`;
- `*-group-day-grid-off-{on,off}.png` and `*-group-night-grid-on-{on,off}.png`.

The `group` frames show all 12 adjacent actors at a closer inspectable scale.
Earlier `crowd-level-close-*` attempts returned to overview; `crowd-steps-detail-*`
are too tightly cropped. Preserve them as attempts; use `group` for the group view.

**Exact remaining gap:** these layouts still show separated opaque silhouettes;
I did not establish a long weapon/large opaque silhouette genuinely intersecting
a projected hatch/ground contour. Therefore they do not close B1's required tight
*overlapping* group / intersection proof, and no body-crossing defect is claimed.
The editor rejects occupied-cell placement (actual notice retained in
`rework-2-editor-steps.log`); `editor-model.ts:56` / `editor-actions.ts:57` enforce
one actor per hex. It exposes no subcell positioning, presentation spacing, scale
or camera-rotation controls. Existing presentation is fixed at spacing 2.6,
50-degree camera elevation and 0.82 sprite scale; no such source was changed to
manufacture overlap. This bounded supported-editor attempt did not supply the
intersection; impossibility for every possible legal layout is NOT_PROVEN.
Parent must supply a stronger supported layout or explicitly settle a different
fixture boundary before claiming B1 or visual acceptance.

## Checks, reservation, scope and limits

The required core startup marker was read before any package runtime build/test/
coverage/audit. It reported SUCCESS at 11:56:36 UTC; the core evaluator had completed
startup builds and released the slot. Checks ran serially in this worktree only.

- Final three-file focused v8 coverage: **21/21 PASS**, `rework-2-final-coverage.log`.
- Web typecheck, scoped two-file ESLint and Prettier: **PASS**,
  `rework-2-final-{types,lint,format}.log`.
- Fresh `pnpm check:changes`: **PASS**, zero new findings; inherited CSS advisories
  and syntactic-attribution notice retained in `rework-2-final-audit.log`.
- Ordinary diff check: **PASS**. Full branch source scope including this rework:
  **272 / 300 changed lines excluding tests** before normal commit. No exception.
- Full suites, parent validator, stress, migration checks, fresh live legacy/replay
  substitution, fresh complete victory, independent evaluator and absolute visual
  re-run: **NOT_RUN**, intentionally parent-owned or unaffected retained evidence.
  Fresh deuteranopia/protanopia matrix: **NOT_RUN**; previous accepted captures
  remain, current monochrome captures address the affected F1 risk.
  FPS/performance and exhaustive opaque-pixel occlusion: **NOT_MEASURED**.

Tool/attempt limits preserved: initial wrapper npm cache EPERM (used installed CLI
without changing cache ownership), observer timing before first response, incorrect
End Turn/grid labels, one local helper syntax error and exploratory camera framing.
The corrected helpers/matrices/readbacks supersede failed attempts, not their logs.
No source gate was weakened. No delegation, Orca command, external writes,
push/PR/merge/rebase/reset/deploy or shared-record edits occurred.

Cleanup: Chrome zoom restored to 100%, vision emulation to none, native readback
1440 x 900 / DPR 1. Owned persistent browser (including Settings tab) closed;
private API 23663 / web 25663 runtime stopped with SIGINT (expected exit 130).

## Proposed coordinator-owned record update

2026-10-21, codex/combat-affordability-184, LOCAL: replace broad uniform movement
stripes with projected-width-capped, broken achromatic ink and dark support inside
unchanged terrain-clipped geometry. 21 focused coverage tests, web types, lint,
format and fresh audit pass; total source scope 272 / 300. Retain 71 fresh frames,
exact 6/29 journeys, real 125% settings/native readbacks and 12 unchanged on/off
pairs. B1 has new real adjacent level/0->1->2 editor evidence but still lacks an
actual overlapping silhouette/annotation intersection. Parent evaluator/absolute
critic gates and publication remain pending; do not record visual ACCEPT or close
#184 from this author result. F2/F3 polish deliberately remains outside this fix.
