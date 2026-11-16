# N10 — Coherent desktop presentation and measured performance

## Current result — 2026-11-15

IN_PROGRESS / LOCAL. The 36-figure Playground was inspected by day/night at
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
NOT_MEASURED. Performance acceptance awaits the owner budget.

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

No numerical FPS/memory/capacity target is invented here. Existing accepted
thresholds, if present in the owning feature, remain binding. If absent, provide
the measured baseline and propose a player-impact target for owner adoption;
baseline collection can finish without it, a performance acceptance claim cannot.
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
renderer-resource counts, target-device acceptance and the owner-selected budget
remain NOT_MEASURED/NOT_RUN under DESK-1–DESK-6.
