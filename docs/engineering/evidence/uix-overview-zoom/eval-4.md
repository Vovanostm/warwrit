VERDICT: REWORK 5124298cd3cfe6a0b0dcd0b8c366ecb76b3bcb53

# Independent played evaluation — #227 second rework, 2026-10-20

One material blocker remains in the actual fight: retained casualty inspection collapses the overview opening enough for live unit markers to overlap and select another unit. This is bounded #227 identification/input acceptance, not a full UI-epic verdict or absolute visual score. Parent owns source, shared records and separate visual gate. Only this report and `eval4-shots/` are evaluator-owned; no agents, Orca, source/asset/shared-doc/memory edits, commits, remote writes, builds, coverage or suites ran.

## F1 — P1: casualty inspection makes overview targets overlap; selecting A opens J

- Contract: full-field participants must remain individually understandable and targetable at physical1280×800/native125; DESIGN_COMPASS requires visible target/cell/action correspondence. Inherited inspection cannot waive that result.
- Real sequence: default mill seed20261009; inspect every opening target, move archer(2,5)→(3,5), End turn, UI autobattle to round2, select/attack Wolf1, continue UI autobattle, stop on the creature's announced attack at round4/revision75. Wolf1 has died while its existing inspection remains pinned. Press Overview with log closed.
- Actual CSS1024×640. Top band including threat ends186.60. The tall casualty inspection drives `.battle-action-dock` top to319.90; the projected165-tile field is x392.81–631.19/y202.60–291.90, only89.30CSSpx high. All ten active markers exist, but A and J fail centre hit tests. A(5,6) rect x508.425/y224.125/w16/h14 intersects J(5,7) rect x514.300/y217.281/w16/h14. Additional nearby opponent markers cover their centres. This is actual input ambiguity, not just tiny art.
- Next actual action in `dense-matrix.js` requests a pointer click at A's measured centre. `dense-close-125-day.png` and its night/full-grid siblings show **Могильный сторож**, J, in inspection instead of requested **Меч + щит**, A. The active actor remains archer C. Thus the camera focuses an unintended target without issuing a combat command.
- Evidence: `dense.txt` first record, `dense-1280-125-overview-day.png`, `dense-close-125-day.png`, `dense-close-fullgrid-125-day.png`. Opening log replaces the inspection and raises the usable field height to213.70CSSpx; all ten marker centres then hit themselves (`dense-1280-125-log-{day,night}.png`). This explains why log-open-only evidence misses the failure.
- Smallest owning fix: constrain/scroll casualty inspection within the existing right column so it cannot collapse the dock/field opening, or deliberately clear that inspection when entering overview. Verify all crowded marker rectangles and actual centre selections with the casualty card both present and replaced by log. If the allowed opening still produces collisions, retain individual access through a bounded non-overlapping representation. Do not shrink letters or alter combat rules/art.
- Boundaries: current framing reads actual `.battle-action-dock` top in `sprite-battle-scene.ts` cameraOpening; right inspection contributes to that dock. Marker centres are projected feet in `battle-field-vitals.ts`. Keep this fix in the existing #227 presentation dependency.
- `reproduce.txt` is a **non-reproduction** after ordinary reload: reload cleared the pinned casualty selection; the subsequent log-roster action did not restore its tall card. That sample has the normal field x258.75–765.25 and all ten hits. It does not invalidate the earlier captured continuous-fight state or prove that the casualty state is fixed.

## Identity and method

Read repository AGENTS, warwrit-review/playwright skills, DESIGN_COMPASS, live issue227 body and owner comment, full local contract including parent amendment, author report-rework-2, complete eval3/visual2, visual rubric, current plan/changelog tops. Personally viewed approved unit-C, ruined mill and melee/night UI references, current opening, close archer/polearm/creature/height1, crowded threat, terminal and comparison images. Configured model retained; no subagents.

Initial and final checkout HEAD: `c650e9a36c03ed633922c0ea982f086fe1293b4e`, branch `codex/battle-overview-227`; tracked status clean. Ordinary diff from gated5124298 to HEAD contains only CHANGELOG, CURRENT_PLAN and battlefield-test-maps documentation; apps/packages diff empty. Parent API23420 PID36064 and web25420 PID19983 have cwd apps/server and apps/web in this checkout. Services never restarted/stopped.

Fresh evaluator-owned persistent headed Chrome session `eval4227`, ordinary127.0.0.1:25420/combat-lab loads/reloads. `initial.txt` records HTTP200 normal Vite modules containing current ground anchoring/title and measured top-band code. Natural Vite timestamps retained. No request routing/source interception, gameplay-state injection, DOM `.click()`, locator-click player substitution or API automation for actions. Locator boxes feed native mouse coordinates; keyboard sends native events. Scene/projection and DOM reads are measurements only. Network listeners observe game-issued requests and authorized ordinary GET responses; no evaluator API GET or POST supplies player proof.

Chrome Appearance `#zoomLevel` read back1 and1.25; `chrome-setting.txt`, `native125.txt`, `chrome125-setting.png`. Actual CSS1440×900 /1280×800 at100,1152×720 /1024×640 at125; DPR1/1.25 and visualViewport.scale1. Zoom is genuine browser page zoom, not DPR substitution. Physical dimensions here mean configured page viewport before native page zoom, excluding browser chrome; no OS display-resolution claim.

## Opening, controls and navigation

`matrix100.txt`/`matrix125.txt`: ordinary restored opening before Home, settled resize1440↔1280, Home and extreme positive wheel-out; both lights. Every sampled opening has165 ground meshes,12 unit meshes and12 distinct marker targets. Foot/marker positions, complete sprite-plane bounds and sampled control hit results retained.

| Physical/native | CSS      | Top-band bottom / dock top | Projected full field x / y    |
| --------------- | -------- | -------------------------- | ----------------------------- |
| 1440×900/100    | 1440×900 | 132 /675.96                | 52.72–1387.28 /148–647.96     |
| 1280×800/100    | 1280×800 | 132 /579.96                | 100.85–1179.15 /148–551.96    |
| 1440×900/125    | 1152×720 | 131.60 /500.35             | 142.57–1009.43 /147.60–472.35 |
| 1280×800/125    | 1024×640 | 131.60 /420.35             | 185.34–838.66 /147.60–392.35  |

All12 starting markers were actually pointer selected (`targets-final.txt`), correct identity/side/cell accessible labels, zoom4.8 and matching inspection; selecting current archer correctly uses actor card rather than a duplicate inspection. Current-actor initiative return was used repeatedly. Fresh post-terminal normal Restart, then **all12** markers reached through Tab and activated by Enter (`keyboard-all.txt`); matching inspection/current actor and zoom recorded. This final corrected pass owns keyboard proof, not the earlier unsuccessful harness loops.

Actual LMB drag shifts archer projection +100,+40CSSpx. W/A/S/D moves it respectively +82.16y/+78.85x/−80.73y/−80.51x after an interior D pan (`navigation.txt`). Final settled wheel at actual archer foot: zoom4.8→3.96158, drift0.23394CSSpx (`keyboard-all.txt`). Earlier generic-ray navigation wheel sample is not the anchoring proof. Canvas-focused Home returns overview; subsequent day/night leaves identical zoom26.59259. Passive inspection/day-night/grid updates do not silently refocus the camera in these samples.

`layers.txt`: all five utilities, five commands and archer skill centre-hit true and individually hovered; commander two skills hovered after End turn (`contact.txt`). Actor versus inspected-unit panels, full creature heading, command/skill costs, menu disclosure, log disclosure/scrolling and terminal buttons inspected. No threat/initiative/commands collision reproduced on the new measured top band. F1 remains a separate participant collision. All skills were not executed, and no generic accessibility-standard certification is claimed for16×14px markers.

## One real fight and observed requests

Session `3fe14f98-6b08-4cca-9709-753ebf837d4a`, default mill seed20261009. Exactly62 combat-action POSTs:59 `autoplay`,1move,1wait,1attack; accepted HTTP200. No fabricated terminal or reset within this fight.

| Journey                                          | Revision / observed outcome                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Opening/resize/targets/layers/navigation         | 4→4; passive0POST                                                                                      |
| Manual move                                      | 4→5; archer(2,5)→(3,5), AP4→3, stamina100→96; request4bcc01bd-ce63-43d9-b32b-84ec8f3e131f              |
| End turn                                         | 5→6; human-3→human-6; one wait                                                                         |
| UI autobattle/pause                              | 6→25, round2;8autoplay POSTs                                                                           |
| Manual attack Wolf1                              | 25→32 including ordinary opponent turns; one attack requestd4094a7b-47e5-4b3b-9339-719246d3c8e0        |
| UI autobattle/pause on real announced threat     | 32→75, round4;16autoplay POSTs                                                                         |
| Dense Home/log/selection/day-night/grid/resize   | 75→75;0POST                                                                                            |
| Resume same UI fight                             | 75→138;35autoplay POSTs; round7 human victory, last-side-standing, allies6active/0dead, opponents6dead |
| Terminal both sizes/zooms/lights/log/Home/reload | 138→138;0POST                                                                                          |

Actual attack preview:80% hit,14–22health,0armour,4AP/16stamina. `attack-resolution.txt` records revision26's real hit for19health/0armour, consistent with preview; subsequent wound/AI effects are not misreported as direct attack damage. Move receipt, attack receipt, threat text and full views/events are retained in move/attack/contact/threat-run/dense/terminal-run sidecars. Post-terminal Restart is an explicit setup, excluded from passive counters; its new opening stays revision4→4 with0combatPOST in keyboard-all. No fun, balance, FPS, capacity or exhaustive combat-rule claim.

## Compact visual packet and limits

Image-only handoff list is `eval4-shots/packet.md`; send that and references before this report's conclusion to the separate absolute visual critic. No rubric scores are supplied by this played evaluator. Main originals: eight opening/overview matrix images; archer/long/creature/height1 day/night; selected archer/creature grid pairs; actual crowded wolf pairs; dense threat close/overview, both zooms and log; eight real terminal matrix images and terminal log. Repeated measurements do not imply additional independent scenarios.

`unit-c-comparison.png`/comparison.html are labelled derivatives of actual shield-day-125 screenshot crop(602,271–674,379) and approved unit-C: approximately384px equal-height enlargement plus108px game-scale row. The actual game crop is108px high, not a native384px render; terrain/pixelation retained. No new/generated art. Current mill/UI comparison uses the original integrated screenshots alongside approved ruined mill and UI references.

Inspected opaque archer/body/weapon/creature/paws and current crowded ground treatments did not establish a ground-line-through-opaque-body or rectangular masking violation. This is finite pixel inspection, not all-layer acceptance. Actual map has height0/1; height2 is unavailable. UI full-grid/local-grid pairs retain selection/movement/shot/threat overlays: **all-overlays-off comparison unavailable**, no state fabricated. Exact historical rejected archer waist/leg frame was not provided/recreated. Other outcomes, exhaustive skill execution, historical border matrix, quantitative contrast/performance/enjoyment: NOT_RUN/NOT_MEASURED. Full absolute visual gate remains separate.

## Tooling, cleanup and shared-record handoff

First Chrome launch failed before navigation with Mach/Crashpad permission denial and SIGABRT; permitted launch retry succeeded. This is tooling, not game failure. Early target script waited for an inspection card on the current actor and timed out; a later loop queried markers while still close and returned an empty set. `targets-final.txt` owns12pointer targets; `keyboard-all.txt` supersedes failed keyboard loops. Python lacked Pillow; browser-rendered labelled comparison replaced it without installing dependencies. Initial console error was favicon.ico404 (read from the CLI historical log), unrelated to combat. Final console query reports0errors, and runtime pageerror list is empty. CLI automatically emitted its normal ignored snapshot/console sidecars; no tracked source/shared path was edited.

Parent should integrate F1, actual journey, unchanged source identity and pending visual gate into owning shared records; evaluator cannot edit them. No publication/merge acceptance implied. Browser closure/profile removal and final source/service readback are appended below.

Final receipt: evaluator browser `eval4227` closed (`eval4-shots/browser-close.txt`); its sole private `eval4-shots/profile/` removed. Final HEADc650e9a36c03ed633922c0ea982f086fe1293b4e, tracked status clean, apps/packages diff from5124298 empty. API23420 health/live200 and web25420 combat-lab200; parent services retained. Report/image packet remain local and untracked under the authorized evidence paths.
