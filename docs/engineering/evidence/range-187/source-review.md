# Issue #187 independent source review

Date: 2026-10-20. Reviewer: bridge_correction_review. Verdict: **ACCEPT (source only)**.

## Baseline and inspected scope

Checkout: `/Users/vovanostm/orca/workspaces/warwrit/codex-tactical-bridge-165`.
Branch: `codex/combat-range-187`; base HEAD: `7a7f1f1841958ebe74a4c9cc632a6a5ea88fb61d`.
Reviewed the uncommitted #187 implementation against that HEAD, including the final lifecycle extraction into the then-untracked `apps/web/src/combat-lab/sprite-reach-contour.ts` and its test. This verdict does not establish any later committed SHA.

Inspected implementation and regression scope:

- `apps/web/src/combat-lab/sprite-battle-scene.ts`: contour material and construct/setCells/dispose integration; removed shot/combined cell fills and edges.
- `apps/web/src/combat-lab/sprite-reach-contour.ts` and `.test.ts`: cached cells, terrain conversion, mesh replacement/clearing, observer, width/bounds and disposal.
- `apps/web/src/combat-lab/sprite-scene-geometry.ts` and `.test.ts`: exterior hex-union sides and corner order.
- `apps/web/src/combat-lab/sprite-scene-markers.ts` and `.test.ts`: weapon/selected-skill reach identity and movement styling.
- `apps/web/src/renderer/battle-cell-grid.ts` and `hex-mesh.test.ts`: nullable borders and existing filled movement regression.
- Guidance/legend removal in `BattleGuidance.tsx`, its test and `battle-controls.css` was part of the earlier full #187 source pass. Parent owns documentation validation.

## Findings and corrections read back

1. Earlier contour geometry retained origin bounds because vertex updates disabled bounds refresh. Corrected helper calls `updateVerticesData(PositionKind, vertices, true, false)`, including translated terrain geometry. Babylon 9.28.0 source was inspected to confirm the update-extents behavior.
2. Earlier movement styling retained grid edges while full grid was off. Corrected marker styling uses a null movement border; renderer ignores null-border candidates and emits transparent absent borders. Full grid/path/target/threat retain their explicit edges. Regression now uses an existing fill material on one borderless cell.

No outstanding material source finding in the final inspected extraction.

## Final extraction assessment

The helper deduplicates and sorts coordinate keys, retaining the same mesh for reordered cells. Exterior sides use the approved terrain-corner mapping; shared internal sides are omitted. Replacing or clearing reach disposes the prior mesh while preserving its shared material. Width updates use current camera zoom and canvas CSS height, validate positive finite inputs and refresh mesh bounds. One helper-owned render observer is removed on explicit disposal before scene disposal. The mesh is nonpickable. Scene integration owns construction, current cells and disposal only.

Selected skill reach still requires actor, activation, revision and skill identity. Missing, stale or empty selected-skill evidence suppresses the weapon fallback. No legality, cost, RNG or domain-rule mutation was introduced in this reviewed scope.

The expanded NullEngine test describes translated two-cell geometry (40 vertices), reorder reuse, camera/viewport width changes, empty clearing and observer disposal. These are source observations, not executed test results.

## Proof limits and next gate

Reviewer ran **no tests, services or browser**. Revised lifecycle test: **NOT_RUN by this reviewer**. The latest author-reported five-file focused coverage run passed24/24 and includes this extraction and revised test; this is author execution, not reviewer execution.

Source ACCEPT does not prove the actual projected contour meets the >=2 CSS-pixel floor, integrated readability, passive zero-action POST/revision stability, native browser 125% behavior or day/night and vision-deficiency acceptance. Those remain the prepared browser evaluation and independent absolute visual critic gates. Runtime work remains paused until parent supplies the frozen committed SHA and validation result/window.

## Frozen source stamp

Parent committed the reviewed slice as `be8efd51709983b62733fa0436d02d975bc3eae5`; current HEAD read back at that SHA with clean tracked state before browser activation. Parent reports normal commit hook/audit PASS and integrated validator EXIT 0, all eight steps PASS (`.orca/range187/integrated-validation.log`). Correction to the earlier attribution above: the latest author five-file focused coverage run, 24/24 PASS, includes the final lifecycle extraction and revised regression. The earlier 24-test result was a separate prior run. The reviewer did not execute either run. Browser evaluation activated by parent after this frozen stamp.

Runtime continuation completed at the same frozen SHA; see `.orca/range187/browser-evaluation.md` for bounded ACCEPT, captures, measurements and limitations. The earlier pause statement above records the source-review checkpoint.
