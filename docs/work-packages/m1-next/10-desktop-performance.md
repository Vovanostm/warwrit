# N10 — Coherent desktop presentation and measured performance

## Current result — 2026-11-08

SPECIFIED / LOCAL. WLC-08's measured native viewport 568×853 does not prove the
target desktop layout. FPS/RAM/heap/server capacity remain NOT_MEASURED.
Next: reserve the actual MacBook/Chrome device or name the missing target input.
[Common contract](COMMON.md). [Prompt](prompts/10-desktop-performance.md).

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
