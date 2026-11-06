---
name: babylonjs
description: Diagnose or implement Warwrit Babylon.js scene loading, resource lifetime, rendering readiness and measured rendering failures. Use for renderer code, GLB integration or an observed canvas problem.
license: Apache-2.0
metadata:
  upstream: TerminalSkills/skills
  upstream-ref: 0abb852010feb21984fa40f0bf52352a440ae6d4
---

# Work inside the existing Babylon renderer

Adapted from TerminalSkills on 2026-11-06. Source and modification details are in
[PROVENANCE.md](PROVENANCE.md).

## Locate the failing boundary

Read the assigned scene, caller and cleanup owner. Check the installed
`apps/web/package.json`, lockfile and exact typings for version-sensitive calls.
Keep the existing camera, ink materials, React UI and `game-core` boundary under
[ADR-0006](../../../docs/architecture/0006-m1-renderer-babylon.md).

Distinguish asset fetch/decode, scene readiness, presentation, input and network
state. A blank canvas alone cannot identify which failed. Follow one observed
failure through its normal entry, collecting the relevant console/network or
scene observation when runtime access is assigned.

## Preserve resource ownership

Find who acquires, shares, cancels and releases each engine, scene, render loop,
listener and loaded container. Warwrit's `canvas-engine.ts` owns a per-canvas
engine with delayed release for quick React remounts. Scene cleanup uses that
owner's release function. Direct disposal requires sole ownership.

For asynchronous loading, inspect what happens when the view closes or a newer
load wins before resolution. Dispose a late result only through its actual owner.
An `AssetContainer` can group imported resources for attachment and later cleanup.
Check shared textures/materials before disposing or caching them.

Use the installed module-level loading API and the project's loader registration.
In Babylon 9, inspect `ImportMeshAsync` / `LoadAssetContainerAsync` typings before
changing an older `SceneLoader` call. Deep imports need the side-effect registrations
used by that feature. Choose them for a demonstrated loading/bundle concern.

For GLB geometry, use the existing
[inspect-glb](../playcanvas-inspect-glb/SKILL.md) on assigned asset files. Its
bind/default bounds and clip names guide placement. Confirm animated extremes,
ground contact and final facing in the consuming scene.

## Check the visible result

`scene.whenReadyAsync()` covers scene readiness. For a screenshot or gameplay
claim, also observe the intended rendered frame, relevant textures, overlays and
input readiness. A loading label disappearing alone leaves these open. Preserve
the normal animation/timing path when assessing playability.

Use available development inspection when a concrete failure needs it. Inspect
local tooling before adding a package. Measure a representative session before
changing picking, shadows, texture size, active-mesh updates or rendering backend.
Read [art policy](../../../docs/engineering/ART_LORE_POLICY.md) for visual changes.

Return the observed failure or supported source conclusion, owning boundary,
smallest fix and actual check. Mark unavailable browser/device/performance evidence
explicitly. The final visual/game acceptance follows the repository critic policy.
