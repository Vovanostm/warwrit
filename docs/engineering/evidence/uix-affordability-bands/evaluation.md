VERDICT: ACCEPT f589f94ce16f0f307f460f35c952777aa79bfaf1

2026-10-21. Independent Tier V source/player evaluation, round 3. No reproduced in-scope defect, rule/privacy/replay violation or unmet consumer acceptance criterion was found. B1's supported-layout intersection capture is now supplied; this report does not replace the separately assigned absolute visual critic or hosted CI.

## Revision and source review

Entry checkout was clean on codex/combat-affordability-184 at the assigned frozen f589f94c. During evaluation the coordinator published 51cc05af, changing only CHANGELOG.md and docs/engineering/CURRENT_PLAN.md. Read the receipt and issue comment; `git diff f589f94c..HEAD -- apps packages` is empty. The verdict and image-ready marker name the assigned frozen source, not an independently revalidated later delivery head. origin/main readback: 46fe0c332c6e0bc1d6ab1f0bf6b257aa0903a4ea.

Read AGENTS.md, the full ART_LORE_POLICY and VISUAL_CRITIQUE, issue #184 body and all 19 current comments, both assigned contracts, complete report.md including rework 2/B1, eval-2.md and visual-1.md, warwrit-review and Playwright skills, ADR-0003/technology handoff, current plan/changelog and the V03/V04 combat-layering requirements. Viewed unit-c-ink, staraya-melnitsa and approved combat UI day/night references. The graph index points at the older /Users/vovanostm/learn/warwrit checkout, not this worktree; used the permitted direct-source fallback.

Reviewed origin/main...HEAD and the frozen-source equivalence. Production/test edits stay in the retained web scene, marker, hatch/grid, legend and matching tests. Shared documents and builder report are coordinator/integration records; no additional gameplay implementation is hidden there. No core/server/protocol, cost/admission, RNG, replay, migration or private-state contract changed in this consumer diff.

- sprite-scene-markers.ts:58–91 classifies complete server booleans only; omitted/mixed fields fall back to one generic band, and skill selection suppresses movement.
- BattleGuidance.tsx:24–65 lists present categories. The false-only live states below remove “Дойти и атаковать”.
- sprite-battle-scene.ts:785–821 connects the movement-only style to hatching, preserving marker priorities and the independent #187 reach contour.
- battle-cell-grid.ts clips strips separately to existing fill triangles, interpolates their heights, and adds 0.013 clearance. Nonpickable group-0 hatches use an alpha-blended, depth-write-disabled broken-ink shader. No client range, LOS, cost or legality calculation was introduced.
- Read the matching marker/legend/raised-geometry regressions, including existing skill suppression. They retain generic legacy/mixed behavior and triangle containment rather than inventing a bow cost.

## Ordinary mill journey actually played

Private API 23663 / web 25663; supported editor → untouched “Старая мельница”, seed 20261009, 15×11, six allies/six opponents. No canonical state or server response substitution. Projected cells and server rows located input targets; orders were real pointer/keyboard input.

| Step            | Observed result and owned proof                                                                                                                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening bow     | sprite-prototype-v4, ordinary attack **3 AP**, AP 4/4. Revision 4: **6 true / 33 false**, 39 rows. Both legend entries are honest. opening-day/night.png; eval3-install.js.log and eval3-helpers.js.log. The historical 4 AP/all-false bow setup was not recreated.                                                                    |
| Move and turns  | Right-click `(6,1)` sends a move and advances bow → commander, revision 4→6. Mouse “Завершить ход”, then canvas-focused `4` for spear, reaches sword revision 10.                                                                                                                                                                      |
| Mixed sword     | AP 4/4: **6 true / 29 false**, 35 rows. Received true rows are the six one-AP destinations; classification was read from attackAffordableAfter, not calculated from AP. eval3-sword.js.log.                                                                                                                                            |
| Keyboard move   | Left-click `(3,2)`, canvas `2`: revision 10→11, AP 4→3, **0 true / 29 false**. Only “Только движение” remains. sword-moved-false-only.png; eval3-playfinish.js.log.                                                                                                                                                                    |
| Skill           | Round-2 bow: actual “Прицельный выстрел · ранг 1” selected and cancelled with Escape. Movement cues/legend disappear while selected skill reach remains. selected-skill.png.                                                                                                                                                           |
| Mouse attack    | Select actual wolf through initiative, click “Атаковать”: accepted opponent-1 attack, revision 25→26, AP 4→1; four remaining movement rows are false. eval3-playfinish.js.log.                                                                                                                                                         |
| Finish          | UI autobattle after the manual move/attack. Fresh authenticated reload proves **resolved, human victory, round 11, revision 200**, last-side-standing; four allies active, two dead; five enemies dead, one retreated. **99 action POSTs: 2 move, 5 wait, 1 attack, 91 autoplay.** eval3-terminalfix.js.log and victory-day/night.png. |
| Keyboard parity | Separate normal mill repeat reaches round-2 bow. Selecting the same actual wolf and pressing canvas `1` accepts an attack, revision 25→26, AP 4→1. eval3-keyboardattack.js.log. This repeat is not claimed as another completed battle.                                                                                                |
| Passive input   | Explicit sword hover, ArrowRight/Home and camera interval: revision 10→10, action count 3→3. Native zoom/CVD/viewport matrices: revision 10 and action counts unchanged. Tab focuses the grid control with a visible 2 px outline, revision 26/action count 107 unchanged. Camera drag/wheel in B1 sends no actions.                   |

The first “Завершить ход 4” locator attempt timed out after the valid bow move; the actual button name is “Завершить ход”. Corrected supported input completed the journey. Two early files named terminal-* were captured before resolution; use **victory-*** and the resolved readback, not those attempts. The initial observer required movementPreview and missed the terminal response; a fresh UI reload with a terminal-capable read-only observer supplied the actual resolved response.

## B1: genuine supported-layout intersection

One bounded evidence-engineering attempt, with legal layout refinements, no source rework. Supported editor buttons/selects and cell Enter placement only. The first closed ring around the bow had zero movement rows. Moving the allied halberd from `(5,3)` to `(4,2)` through the editor opened a legal flank; it yielded **1 true / 11 false** rows at level zero and actual hatch/silhouette intersections.

Final twelve-actor layout:

- Allies: bow `(6,3)`, halberd `(4,2)`, spear `(7,3)`, sword `(5,2)`, great axe `(6,2)`, commander `(7,2)`.
- Opponents: bears `(6,4)` and `(5,4)`, mill creature `(7,4)`, halberd `(8,3)`, spear `(4,3)`, grave beast `(8,2)`.
- Level case: all terrain height 0. Step case: actual Height 1 brush on row 3, Height 2 on rows 4–7, q2–10; row 2 stays 0. The group therefore spans real **0→1→2**, not height labels on a flat map. Native editor labels are retained in eval3-steps.js.log and eval3-level-final.js.log.
- Step projection supplies **1 true / 4 false** movement rows, including raised hatch cells `(3,4)`, `(4,4)`, `(3,5)`, `(4,5)`. Costs/reaction quotes are recorded as server facts, not recomputed.

Opaque source-alpha sampling (alpha ≥200, stride 3), transformed through the **existing** sprite mesh/world/camera and projected hatch/contour triangles, locates real overlap. This is read-only geometry evidence, not a silhouette or annotation modification:

| Case                                  | Actual intersecting regions                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Level, framed close                   | Bear `(5,4)` back/head around screen **x551–626, y313–338**, hatch `(5,5)`; bear `(6,4)` x710–732, y322–333; opponent spear `(4,3)` tip x370–385, y425–436 against hatch `(4,4)`. eval3-level-intersections.log.                                                                                                                       |
| Steps, stable close before upward pan | Bear `(5,4)` x555–626, y379–399 intersects hatch `(4,5)` and the reach contour; bear `(6,4)` and mill creature `(7,4)` intersect the contour; opposing halberd `(8,3)` also intersects it. eval3-steps-intersections.log. The final group framing pans this unchanged scene upward by about 110 screen pixels using ordinary LMB drag. |

Opened the full-size day/night on/off group images and inspected the bear backs/heads, spear/halberd tips, opaque torsos/feet and transparent margins. At those **actual intersections**, hatches/contour disappear behind opaque figures; no pale line or rectangular alpha curtain crosses them. Figures retain interior ink, opacity and ground contact. Raised hatches follow the visible raised/sloping fills without a visible triangle escape; the ochre contour retains its separate shape/channel. The group frames show all twelve figures and their feet above the command dock.

**Primary B1 set, 8 pairs / 16 original 1440×900 images:** eval3-images-ready.json. Paths are under eval3-shots/:

| Pair stem; both -on.png / -off.png exist | What is visible                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| level-overview-day-grid-off              | Full group and separated movement wash/hatch/reach; off removes ground annotations only.                    |
| level-overview-night-grid-on             | Same level group in night, full ground grid; off retains figures/HUD.                                       |
| level-group-day-grid-off                 | Fully framed bears/creature/polearms, with hatch behind the bear backs and spear tip; off retains ink/feet. |
| level-group-night-grid-on                | Same inspectable night group and grid; bodies/long weapons remain opaque.                                   |
| steps-overview-day-grid-off              | Real three-height group, small raised hatch region and independent reach footprint.                         |
| steps-overview-night-grid-on             | Night/grid version, same ground/figure order.                                                               |
| steps-group-day-grid-off                 | Full group at heights 0/1/2, raised hatch and reach crossing projected bear silhouettes from behind.        |
| steps-group-night-grid-on                | Night/grid version; all figures and feet clear, contours remain ground cues.                                |

Every primary pair has exact native equality of figure transforms/material IDs/alpha/depth/grouping/visibility, camera position/view/projection and HUD, plus revision 0→0 and cumulative action count 99→99. Masking changes only ground-annotation visibility, restores exact visibility and resumes the render loop. No sprite scale/position/material/depth, renderer geometry, canonical battle state or response was changed. See eval3-final-readback.json. Hatch material ready=true, alpha blending=true, **disableDepthWrite=true**, nonpickable/group 0; figures alpha=1/group 1.

Two earlier steps-close-* pairs caught camera settling and returned equality=false. They are preserved attempts and excluded from the primary set; stable replacements and fully framed group pairs return true. Geometry sampling counts projected opaque/annotation-triangle samples, not unique screen pixels or an exhaustive pixel-perfect shader proof. Appearance was judged from the actual paired screenshots as well.

## Current visual and accessibility readback

Fresh ordinary sword day/night at **1366×768, 1440×900 and 1920×1080**, native 100% and genuine Chrome 125%: sword-current-<size>-native<100|125>-<day|night>.png. Fresh 1440×900 overview achromatopsia/deuteranopia/protanopia, day/night at both zooms: sword-current-1440x900-native<zoom>-<vision>-<light>.png. Reviewed all these frames through four contact sheets and opened critical full-size close views. The original full-resolution PNGs remain authoritative.

Native125-settings.png visibly shows **125%**. Native browser readbacks: 1093×614 / 1152×720 / 1536×864 CSS pixels, DPR 1.25, for the three physical screenshot sizes. No CSS zoom or page-scale substitute. Final native readback restores 1440×900, DPR 1. Actual portrait-focused close views are **sword-native125-framed-detail-day/night.png**; earlier exploratory “detail” filenames that zoomed toward empty ground are not credited as actor close views.

Own visual judgment: solid/unhatched and broken-hatch bands remain distinguishable by shape at overview and close, including night, monochrome and both CVD modes. Labels and controls remain readable and usable; no new hidden control, ground-over-body line or overlay input interception was reproduced. The separate ochre reach contour is legible, not a third combined movement category. Compared with the approved ink/place/UI references, the affected hatch language, value/palette and scene integration each read at least **2** for this static-cue scope; no new body/pose/prop/animation production is assigned. The absolute visual critic retains its independent gate.

Unaffected dated producer and legacy boundaries remain those of PR237 and earlier executed focused regressions. Live legacy/mixed-field response substitution and old-replay reconstruction: **NOT_RUN** here. Fresh fatigue-admission execution: **NOT_RUN**; inherited producer proof is not relabelled as current browser execution. No artificial all-false bow or client attack-cost rule was introduced to satisfy historical wording.

## Execution limits and closeout

No source/test/fixture/shared-record/ref edits, delegation, Orca command, commit/push/PR/merge, production DB, deployment or paid service. Full suites, coverage, audit, parent validator and fresh focused test runs: **NOT_RUN**, as assigned; existing executed regression results were read, not claimed as evaluator execution. Performance/player enjoyment/exhaustive pixel occlusion: **NOT_MEASURED**. No added animation clip requires motion frames.

Startup printed READY on the assigned ports. Its first detached session exited before browser connection; restarting in a retained local session restored the lab. It did not return exit 3, and no source defect is inferred. The only browser console error observed was the favicon 404; no in-scope runtime failure was reproduced.

Documentation closeout is this report and owned proof only. CHANGELOG/CURRENT_PLAN/wiki remain coordinator-owned. Suggested coordinator record: Tier V evaluator ACCEPT on frozen f589f94c; actual sprite-v4 6/33 bow and 6/29 sword, manual move/attack/turn, round-11 victory/revision 200, current viewport/native125/CVD captures, and supported actual level/0→1→2 B1 intersections with eight checked primary pairs. Separate absolute visual acceptance and delivery gates remain parent-owned.

Cleanup executed: Chrome zoom/CVD restored (1440×900, DPR 1), owned eval3184 browser including Settings closed, only eval3-profile removed, and `bash scripts/orca-play.sh stop` returned **STOPPED**. `orca-play.sh status` returns **DOWN**; eval3-stopped-ports.log is empty (neither private port has a listener). Other runtimes were not stopped. Final tracked Git status is clean; coordinator receipt tip remains 51cc05af with frozen app/package source unchanged.
