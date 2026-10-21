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
