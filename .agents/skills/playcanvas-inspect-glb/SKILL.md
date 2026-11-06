---
name: inspect-glb
description: Inspect assigned GLB assets offline for bounds, grounding, clips, joints and hierarchy before Babylon.js placement or animation. Use the bundled engine-independent parser.
license: MIT
---

# Inspect GLBs before placement

Locally adapted on 2026-11-06 from the pinned PlayCanvas skill. Read
[LOCAL_NOTES.md](LOCAL_NOTES.md) for provenance and limitations. The directory name
is retained for existing callers.

Resolve the bundled script relative to this skill directory. Shortlist the
assigned assets before running it.

```sh
node <skill-directory>/scripts/inspect.mjs <asset.glb>
```

The output includes `aabb`, `dims`, `center`, `groundOffset`, `boundsSource`,
`boundsPose`, `boundsNotes`, `requiresRuntimeCheck`, node paths, clips, joints and
animation targets. Uniform scale follows dimensions. The grounding offset places
the base in Y. Account for the horizontal center offset when choosing a wrapper
pivot. Confirm facing in the consuming scene.

## Interpret geometry precision

- `vertices` means decoded geometry at the reported pose.
- `accessor-minmax` means a fallback local box transformed into world space.
  Rotation can overestimate the visible extent. Read `boundsNotes` for the cause.
- `incomplete` or null bounds leave placement measurements unresolved.
- Static/default-morph bounds describe the default pose. Bind bounds precede
  animation. Check skin, morph and rigid node-animation extremes at runtime.
  `requiresRuntimeCheck=false` alone cannot exclude rigid animation motion.

Global bounds support planar grounding and broad spacing. For a weapon grip,
non-planar support or another attachment, inspect authored mount points and the
actual animated result.

## Compressed or external geometry

Read the decode limitation first. If the assigned asset needs decompression,
use available glTF-Transform on an owned scratch copy with its lossless `copy`
operation, then inspect the copy. Preserve the source asset. Inspect installed
loader/decoder support before proposing a production transcode.

Use Babylon's existing camera, axes, loader and resource ownership. Runtime
culling boxes may differ from decoded geometry. Record the pose, scale, pivot
and grounding with the asset result and confirm the visible placement in the
consuming application.
