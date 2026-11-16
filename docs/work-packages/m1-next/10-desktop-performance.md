# N10 — Coherent desktop presentation and measured performance

## Current result — 2026-11-17

IN_PROGRESS / LOCAL. The latest untraced Babylon engine control completed
30-second day/night samples with all 36 sprites active, minimum 97/99 completed
frames per second at DPR 2. The traced samples and production settlement's
first-scroll dip remain documented below. Whole-route 60-FPS compliance and human
acceptance are open. The owner agreed to a local playtest on 2026-11-17, with
entry prepared under [N09](09-player-experience.md#owner-playtest-preparation--2026-11-17).

The 36-figure Playground was inspected by day/night at
1200×757 CSS px, DPR 2. Canvas CSS bounds were 1136×740 and document scroll width
matched the 1200px viewport. Home overview, all three side markers and initiative
were visible. Screenshots are retained under `output/playwright/m1-multiside-*`.

The autoplay tab crashed after its last observed revision199. Ordinary re-entry
loaded the same sandbox at revision305. The console records a Chromium page
crash, with no renderer stack. Source review found repeated terminal-status label
texture/material/mesh allocation and complete diagnostics serialization on every
revision, even with the panel closed. Marker reconciliation has a passing six-test
NullEngine lifecycle regression. Live diagnostics now return a bounded recent
history and mount JSON only while open. Replay export reads every command.
A real SQL 130-command regression proves the 128-record inspection boundary, the
complete 130-command replay and the exact historical retry.

The resumed native autoplay completed at revision513, round11, winner south.
The normal Replay button reported MATCH. Native replay export retains all 513
commands. Revision330 proves that north and south continue after middle is
eliminated, with all three side identities retained. The editor's native scenario
file roundtrip also preserves the entire 36-figure scenario after save/reload.

These are partial diagnostic results. The complete DESK route remains open.
The retained campaign also reached Old Mill through ordinary movement and API
restart. Its place view was captured at 1200×757 CSS px, DPR 2, Chrome157 on the
local Mac browser, development build. Document width was 1200px. The browser
reported 883,442,960 bytes used JS heap and 957,210,780 bytes total heap, with the
existing Playground tab still open. These browser-reported values include that
context and are a provisional sample. A 120-frame requestAnimationFrame sample
over 1014.1ms had median 8.3ms and p95 10.2ms. It measures callback pacing in the
place view, with no claim about battle render time or the target performance
budget. Capture is `output/playwright/m1-old-mill-owner-before-battle-20261115.png`.
Comparable whole-journey load/resource measurements and server capacity remain
NOT_MEASURED. The owner budget accepted on 2026-11-16 is recorded below;
compliance with it remains unmeasured.

## SVG map-marker anchor correction — 2026-11-16

FIXED / LOCAL, P2. In the ordinary QA atlas, label placement changed each SVG
marker group's bounding box. Scaling a fill-box reference shifted site icons away
from their public map coordinates. Native screen-matrix comparison found up to
52.77 CSS pixels of displacement among nine sites. A controlled quest-marker SVG
using the same stylesheet also shifted 34.65px horizontally and 31.67px vertically.

Both painted-site and painted-quest-target now use the SVG view-box reference
and origin 0,0. Nine native markers match their public projected coordinates within
0.00002 CSS pixels at the initial scale, zoomed-in scale and returned scale. The
actual quest-marker stylesheet fixture has zero displacement on both axes. A
normal known-ground right-click still produces its actual TERRAIN command and
accepted travel; unknown-route refusals retain their observed masked response.

The native sample used 1070×757 CSS pixels, DPR 2, visual scale 1. The additional
960×540 landscape emulation used DPR 1, had document width 960 and nine markers
within 0.000008 CSS pixels. The QA browser subsequently returned to 1070×757 CSS
pixels and reports DPR 1; subsequent measurements must record that current density.
The PaintedMapCanvas label/date/control component tests pass 2/2, Prettier and diff
checks pass. The related place-worker body/hammer transform origins are deliberate
animation pivots. The narrow transform-box/origin search found the two confirmed
map cases above.

Evidence is output/m1-map-marker-anchors-{before,after}-20261116.log,
output/m1-map-quest-anchor-{diagnostic,after}-20261116.log,
output/m1-map-marker-landscape-after-20261116.log and
output/m1-map-marker-component-20261116.log. These are geometry and control checks.
Complete DESK-1–DESK-6, whole-route 60-FPS compliance, loading/resource comparison
and agreed-player acceptance remain open. This correction alone leaves T028 open.

## Measurement setup follow-up — 2026-11-17

LOCAL. System reads identify Mac15,6, Apple M3 Pro (18 GPU cores), 36 GiB RAM,
macOS 26.7.1 (25G241) and the internal 3024×1964 display, scaled to 1512×982 at
120 Hz. Chrome reports 157.0.8103.51. WebGL2 uses ANGLE Metal on Apple M3 Pro.
The active owner browser measures 1070×757 CSS px, DPR 1 and visual scale 1,
including after clearing the CDP device-metrics override. Its document is visible.

A five-second development trace confirms that Chrome exposes DrawFrame,
Display::FrameDisplayed, compositor submission/presentation and dropped-frame
events. Its idle scene skips unchanged frames, so a count of presented frames
alone would misstate the interactive frame rate. This was a capture-tool probe.
No foreground interaction workload or production performance pass is claimed.
The system display was reported asleep during device inspection. Target capture
still requires recorded display/foreground conditions and ordinary input.
GPU timing and whole-route minimum FPS remain NOT_MEASURED.

Sanitized device data is `output/m1-device-displays-20261117.json`; browser/GPU
metadata and probe are `output/m1-native-device-browser-20261117.log` and
`output/m1-frame-trace-tool-probe-20261117.log`. T028 remains open.

## Production atlas and terminal samples — 2026-11-17

LOCAL / PARTIAL. The compiled `index-CFWbcjwC.js` ran on the Mac/Chrome/ANGLE
configuration above at 1070×757 CSS px, DPR 1, visual scale 1, on AC power.
Chrome marked the target document visible. A bounded `caffeinate -du` request
held the measurement window active; later system display inspection returned no
display row, so physical display state is unverified. Other retained QA browsers
remained open. This is the actual automation viewport and workload.

CDP traces identify the page's renderer process through its root frame, bracket
samples with clock-sync events and retain unique DrawFrame sequence IDs. The
minimum uses complete one-second bins. These are Chromium renderer frame events.
GPU-query timing remains NOT_MEASURED.

| Workload                                                                     | Duration | Unique drawn frames | Minimum complete 1s FPS | Dropped frame events | Frame interval p50 / p95 |
| ---------------------------------------------------------------------------- | -------- | ------------------- | ----------------------- | -------------------- | ------------------------ |
| HUNT-01 terminal result, six living allies and one defeated beast            | 30.002s  | 3601                | 119                     | 0                    | 8.328 / 9.165ms          |
| Atlas, actual company travel with Senka/claw and continuous native left-drag | 30.003s  | 3597                | 117                     | 3                    | 8.327 / 9.228ms          |
| Gat panorama, first recorded wheel-scroll window                             | 30.036s  | 3317                | 45                      | 562                  | 8.412 / 10.942ms         |
| Gat panorama, repeated scroll with 5s after tracing startup                  | 30.010s  | 3455                | 90                      | 217                  | 8.460 / 10.612ms         |

Atlas input delivered 110–120 pointer moves per complete second, with no input
error. Its 30 renderer bins and the terminal sample exceed the accepted 60-FPS
floor. Gat's first window starts at 45/82/96 FPS; later bins have a minimum of 86. This first-second value is below the floor. The repeated night sample stays
at 90 or above. These two place captures use `index-DBR1Y_I3.js`, actual wheel
input and the full observed 0–145px horizontal range. The repeat explicitly
separates tracing startup from its measured window. It is a warmed repeat of the
same source, with a different startup condition. The first-scroll cause remains
unattributed. MainFrame.Draw CPU p50/p95 in the first sample is 0.217/0.318ms;
those CPU events alone do not establish GPU/shader or asset-decode cost.
The result sample has two canvases and 130.9 MB used JS heap; after ordinary
return/reload the atlas has zero canvases and 101.2 MB. DOM counters are retained
in the exports. Different scene heaps establish observations only. Engine mesh/
material/texture counts and a matched performance-fix comparison remain absent.

Raw frame exports and independently recomputed bins are
`output/m1-production-{beast-terminal,atlas}-frames-20261117.log` and
`output/m1-production-{beast-terminal,atlas}-frame-summary-20261117.json`.
Place raw frames, summaries and scripts use `output/m1-production-place-*` and
`output/m1-production-place-warm-*`. These intervals cover a terminal
six-survivor scene, moving atlas and settlement panning. Active combat, the
36-figure workload were outside those captures. The separate 36-figure control
follows below. A continuous whole-journey capture remains NOT_MEASURED.
T028 and whole-route target acceptance stay open.

## Actual 36-figure engine controls — 2026-11-17

LOCAL / PARTIAL. A separate saved sandbox was created through the normal imported
scenario path, using `output/playwright/m1-scenario-roundtrip.json`. Sandbox
`3d673f6c-f60f-45b9-9ec3-4798595326b5` has 36 units, three sides of 12 and
four parties (6+6+12+12). The two player parties obey the six-person cap. NPC
parties use their accepted larger profile. Encounter
`6658e3b2-f89a-4c5c-b8d9-81b94acdfce3` remained manual at revision 0.
The saved command count remained zero throughout these measurements.

The real browser used the Mac/Chrome device identified above, 1200×757 CSS px,
DPR 2, scale 1. Canvas backing is 2272×1480, CSS 1136×740. This is the Vite
DEV source runtime on port 5331, confirmed by `/@vite/client` and `/src/main.tsx`.
An earlier agent message named the DHU production artifact, then corrected that
claim after inspecting loaded scripts. These controls measure the development
runtime. Production up-to-36 combat remains NOT_MEASURED.

Initial CDP traces recorded minima 51/50/48 drawn frames per second over three
30-second windows. They emitted approximately 1.35–4.98 million trace events per
window. The trace volume raised a measurement-overhead question. The parent then
pressed the normal «Обзор поля» control and attached lightweight observers to the
already loaded Babylon engine's `onBeginFrameObservable`/`onEndFrameObservable`.
Observers store timestamps and CPU wall durations, and are removed after 30s.
The exact loaded Babylon module was reused, so only the live engine was observed.
Tracing was disabled for these controls.

| View           | Duration | Completed engine frames | Minimum complete 1s FPS | Frame interval p50 / p95 | Engine CPU wall p50 / p95 |
| -------------- | -------- | ----------------------- | ----------------------- | ------------------------ | ------------------------- |
| Day overview   | 30.001s  | 3550                    | 97                      | 8.3 / 9.3ms              | 1.8 / 3.2ms               |
| Night overview | 30.002s  | 3417                    | 99                      | 8.6 / 10.8ms             | 2.7 / 3.7ms               |

Both controls report 36 sprite meshes and 36 active sprite meshes. Native day and
night overview captures show the full three-row arrangement, unit letters/numbers,
initiative and current-unit action panels. The canvas was then scrolled fully
into the viewport at x32/y16.96. Different trace method, overview state and
background-canvas conditions prevent a causal before/after speedup claim.
These are completed engine-frame rates. GPU timing and presented-frame pacing
for the untraced controls remain NOT_MEASURED.

Before these controls, both matrix companies had actually returned to idle atlas
views with zero canvases. Attempts to minimize their windows did not establish
successful minimization. A later camera-motion control was NOT_RUN when the
original named browser session became unavailable. Its saved sandbox and evidence
remain intact. Renderer source stayed at the existing implementation during
these controls.

The source investigation found per-frame marker reservation/layout serialization
in `sprite-battle-scene.ts` and repeated vitals projection/style updates in
`battle-field-vitals.ts`. Their measured contribution is NOT_MEASURED. React
updates and texture creation remain in their existing event/revision paths.

Evidence is `output/m1-36-{frame,frame-repeat,frame-control}-*20261117.*`,
`output/m1-36-provenance-20261117.log`,
`output/m1-36-engine-{control,night-control}-20261117.log`, their summary JSONs
and `output/playwright/m1-36-{overview-visible,night-overview-visible}-20261117.png`.
The public observer script is `output/m1-36-engine-control-20261117.js`.
T028 remains open for the representative whole route with active combat,
settlement first-scroll investigation, remaining presentation/input checks and
target acceptance. The owner budget stays minimum 60 FPS.

## Player goal and trial

Map, place, battle, result and re-entry remain readable, controllable and responsive
on the supported desktop. Try ordinary entry → the single global atlas →
place → day/night → persistent battle/result → return to map → re-entry.
Inspect actual viewport rather than trusting an attempted automation override.

## Sources, dependencies and constraints

N01; existing #175/#400; [graphics entry](../../../.agents/skills/warwrit-graphics/SKILL.md),
[art/lore](../../../.agents/skills/warwrit-graphics/references/art-direction.md),
[ADR0006](../../architecture/0006-m1-renderer-babylon.md),
[terrain](../../wiki/terrain-art.md), [M1](../../wiki/m1-spec.md).
Use actual selected references and current named location overrides.
Default new 2D style is «Сдержанный графический роман»; «Туман и мокрый камень»
requires the accepted explicit location override. No renderer competition or full
3D conversion. Target one desktop UI; no separate portrait/mobile redesign.

## Full scenarios and measurements

- D1 Layout records actual viewport/DPR/zoom and device/browser versions. Check
  the global atlas, place, battle and result by day/night, including UI text and
  disabled/pending states. Critical buttons, tactical cells,
  selected-unit information and results remain visible, usable and not overlapped.
- D2 Lifecycle: repeat actual map↔place↔battle navigation, exit/re-entry and
  scene teardown. Record blank canvas/context-loss/duplicate input if reproduced;
  inspect cleanup/resources before proposing a renderer rewrite.
- D3 Performance: record observed frame-time/FPS behavior, load time, memory
  and renderer/resource counts for the selected representative journey, with
  device/build/dataset/method. A browser emulator is labelled provisional.
- D4 Fix: profile one reproduced blocking/expensive path, fix in its owner,
  repeat the same workload and report before/after with functional result.
  No speedup claim from different scenes or unrecorded hardware.

The owner accepted a minimum of 60 FPS on MacBook + Chrome on 2026-11-16 for
the atlas, settlements and battles up to 36 figures. Measure the representative
whole journey against that budget. Load-time, memory and capacity thresholds
remain unset; record those observations without inventing additional limits.
A broad load campaign belongs to N12, not the game VM running coding agents.

## Scope and architecture

Candidate paths: affected web game/encounter layout and Babylon renderer scene/
camera/assets/resource disposal; existing source assets only through owning tools;
no unrelated art catalogue or general optimization. Reserve exact components and
render resources per finding. Reuse code-native/vector assets where appropriate.
If PR337 matches an actually reproduced current scene-construction leak, inspect
and reuse its maintained correction; its old green CI is not current acceptance.
Privacy/persistence/economy do not change as a presentation optimization.

## Work plan

1. Record device/viewport/build/scene and current accepted presentation references.
2. Capture the representative ordinary path with actual controls by day/night.
3. Reproduce a concrete layout/lifecycle defect or measure a specific bottleneck.
4. Trace resource/input ownership; change the smallest affected path.
5. Repeat same route/scene/load and cleanup; compare measurements and saved state.
6. Review affected art/lore/readability and ordinary control use; independent
   criticism optional, concrete critical defects still require correction.
7. Record missing target input/budgets and supply one practical follow-up.

## Acceptance / DoD

- [ ] DESK-1 Supported actual desktop/device, viewport, build and measurement method
      are identified; provisional captures are not presented as target acceptance.
- [ ] DESK-2 Map/place/day/night/battle/result/re-entry have readable usable
      controls with no known critical overlap, blank scene or blocked input.
- [ ] DESK-3 Reproduced navigation/resource defects are corrected and affected
      teardown/reopen behavior is directly checked; no second renderer is introduced.
- [ ] DESK-4 Relevant frame/time/memory observations have comparable baseline/
      after evidence for any claimed improvement; absent values stay NOT_MEASURED.
- [ ] DESK-5 Current scene follows selected style/lore/reference and desktop
      interaction; optional aesthetic review is not replaced by asset counts.
- [ ] DESK-6 Target acceptance/budget limits are explicit; no invented device,
      FPS, capacity, heap-leak or subjective-quality PASS.

## Checks and remaining decisions

Focused renderer/component regressions only for concrete defects plus actual
browser/device measurements. Without the named device, complete code fixes and
provisional evidence, then mark target-device rows NOT_RUN/READY_FOR_OWNER_TEST.
Do not buy a device/service or change platform scope to obtain a PASS.

## Additional source Place sample — 2026-11-16

LOCAL / provisional. A second executor measured the owner's ordinary Place tab
at Северный Двор in the current development runtime. Viewport was 1200×757 CSS
pixels, DPR 2; body/document width both 1200. The user agent reported Chrome
157.0.0.0 on macOS 10.15.7. Shared-context `performance.memory` reported 77.3 MB
used, 143.7 MB total and 4.40 GB limit. The session also retained an inactive
combat Playground tab. Across 120 requestAnimationFrame callbacks (119 intervals),
median callback spacing was 8.3 ms, p95 10.2 ms, range 6.4–16.8 ms.

These are callback-pacing and shared-context heap samples. The earlier Old Mill
sample had a different scene and context workload, so no before/after memory or
rendering improvement is claimed. Whole-journey production performance,
renderer-resource counts, target-device acceptance and compliance with the
accepted 60-FPS budget remain NOT_MEASURED/NOT_RUN under DESK-1–DESK-6.

## Performance budget — owner decision 2026-11-16

The owner selected «Минимум 60 FPS» for M1 on MacBook in Chrome, covering the
atlas, settlements and combat with up to 36 figures. This is the accepted
performance requirement for T028, DESK-6 and SC-009. Previous short callback
samples and development-context heap values do not establish compliance.

Next: record the actual MacBook/browser, production build, viewport and workload,
measure the comparable complete atlas → place → battle/result → re-entry path,
and check the 60-FPS minimum. Frame callbacks alone do not measure battle render
time. A failed or absent measurement keeps acceptance open; no lower threshold
is implied. Current whole-journey compliance is NOT_MEASURED.

### Actual host identification — 2026-11-16

Read-only host queries identify a MacBook Pro, model `Mac15,6`, Apple M3 Pro,
36 GB RAM and macOS 26.7.1, confirmed through `sysctl`, `sw_vers` and
`system_profiler SPHardwareDataType -json`. The earlier browser samples report
Chrome 157.0.0.0 and its user-agent
OS string. This names the local target hardware. GPU/browser rendering mode,
production whole-journey performance and 60-FPS compliance remain unmeasured.
