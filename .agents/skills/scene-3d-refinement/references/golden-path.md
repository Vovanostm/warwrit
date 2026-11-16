# Golden path: one scene, cheap probes, one final export

Run from the Warwrit repository root. Use the existing local tools; resolve
`BLENDER_BIN` to the installed Blender executable and `ASSETFURNACE_DIR` to the
installed image-to-3dlab checkout. The tested combination is Blender 5.2.3 and
AssetFurnace v0.5.1. Keep the asset, references and outputs in persistent folders.
No package installation or new image generation is needed to replay the mill probe.
Run each command only after the preceding command succeeds. For unattended shell
execution, use `set -euo pipefail` in a Bash script. A refusal is a stop, not a
reason to continue with an older candidate in the same folder.

## 1. Establish a source and inspect shape

For an existing model, preserve its source and current viewer asset. For a new
location, first inspect the approved style and place references, generate one
complete-scene image with the available image-generation skill, retain its exact
prompt, and run the installed image-to-3dlab pipeline. Use a second registered
reference only if hidden geometry needs it. The repository's existing
`scripts/mill-3d/README.md` owns the tested neural-generation commands; do not
regenerate a usable mesh to fix only paint.

```bash
skill_dir=.agents/skills/scene-3d-refinement
mill_asset=assets/art/combat/mill-3d-2026-10-26
mill_run=output/mill-3d/skill-replay
mkdir -p "$mill_run"
"$BLENDER_BIN" -b --python-exit-code 1 -P "$skill_dir/scripts/capture_views.py" -- \
  "$mill_asset/battlefield.glb" "$mill_run/inspection" --size 512
```

Open `inspection/index.html` or the fourteen individual PNGs: seven clay and seven
albedo views, plus `geometry.json` and reusable `views.json`. Auto cameras fit the
whole bounding sphere (front/back/left/right/low/top/underside); their directions
are inferred. Use 1024 or 2048 captures and registered closer cameras for small
material/contact defects; a 512 overview is a cheap shape scan. They are diagnostic
views, not a replacement for the actual game camera. For a specific framing,
pass `--views path/to/views.json`; existing bounded repair entries are excluded
from capture. Each camera is a column-major glTF camera-to-world matrix,
right-handed Y-up, local -Z forward, with square-image FOV in radians.
The script checks pixel registration against Blender's camera projection.

Inspect every clay frame before repainting. Fix confirmed shape problems locally;
then capture again. The script writes an empty output folder and never saves over
the input GLB. It supports opaque imported Principled materials; it is not a
transparent/transmissive-material renderer. Its albedo renders intentionally
remove lighting and tangent normal detail. Clay uses a camera-relative inspection
light so lower surfaces remain readable. In-game lighting is checked later.

## 2. Prepare registered artwork and surface ownership

Use the color render `front-before.png` as the edit input; save the approved paint
as `front-paint.png` beside `views.json`. Repeat only for views that need new paint.
Read the imagegen skill before invoking image generation. Reuse one inspected
style/place reference and the same scale, light convention and palette.

Working prompt example:

> Repaint only the visible materials of this exact rendered ruined watermill.
> Preserve every silhouette, opening, beam, wheel, bank, ground height and camera
> position. Keep the existing transparent background. Draw weathered soot-grey
> masonry, dark timber grain, muted earth and restrained ochre vegetation, with
> irregular ink contours and broad shadow masses matching the supplied reference.
> Keep water confined to the visible channel. Keep stone, timber and water boundaries
> aligned with the rendered surfaces. Return the same square framing. Add no objects,
> symbols, people, labels or architecture. Surface detail is painted interpretation.

Inspect the generated image for alignment before projection. Save the exact
request and actual returned dimensions. If image editing moves architecture,
correct that image or use a geometry-constrained painting method before transfer.

For a new asset, explicitly identify material/face groups in Blender. Repeated
stone/timber may use tiles or trims; unique details use unique UV space. Export
transform-applied parts in one shared coordinate frame and retain the complete
mesh for occlusion. Verify source triangles are assigned exactly once. Any new
partition needs its own inspected recipe. The mill scripts below accept its
original one-mesh/one-material source and use spatial texture-budget groups;
those groups do not separate water from stone. Bounded wall repairs in its
`views.json` are specific to this mesh and are not copied to a different location.

## 3. Replay a cheap, real mill probe

Use the exact source that the retained artwork was painted against. The current
three-material delivery asset is the result, not the one-material preparation input.
Use the retained one-material source in a fresh run folder:

```bash
mill_source="$mill_asset/source-geometry.glb"
PYTHONPATH="$ASSETFURNACE_DIR" "$ASSETFURNACE_DIR/.venv/bin/python" \
  scripts/mill-3d/project_texture_views.py "$mill_source" \
  "$mill_asset/texture-repaint/views.json" "$mill_run/probe" --check-only
"$BLENDER_BIN" -b --python-exit-code 1 -P scripts/mill-3d/repack_battlefield.py -- \
  prepare "$mill_run/probe" --source "$mill_source" \
  --texture-size 1024 --underside-size 256
PYTHONPATH="$ASSETFURNACE_DIR" "$ASSETFURNACE_DIR/.venv/bin/python" \
  scripts/mill-3d/project_texture_views.py "$mill_source" \
  "$mill_asset/texture-repaint/views.json" "$mill_run/probe" --view-size 512
"$BLENDER_BIN" -b --python-exit-code 1 -P scripts/mill-3d/repack_battlefield.py -- \
  pack "$mill_run/probe"
"$BLENDER_BIN" -b --python-exit-code 1 -P "$skill_dir/scripts/capture_views.py" -- \
  "$mill_run/probe/battlefield.glb" "$mill_run/probe-review" \
  --views "$mill_asset/texture-repaint/views.json" --size 512
```

Inspect all probe-review clay/color frames as a batch. At 1K judge registration,
material boundaries and seams; fine-detail sharpness belongs to the final budget.
The source/camera matrices remain unchanged when resolution changes. The 512-pixel
view inputs also reduce the depth-rasterization work; omit `--view-size` for final
quality. This diagnostic downsampling is not a new painted reference. The probe
must not replace the current runtime asset. Keep full-scene depth occlusion for
all parts and repairs. With AssetFurnace 0.5.1, `edge_px=1` keeps a binary silhouette
mask; `inner_edge=0` disables interior erosion for inspected repair regions.

An image-only correction affecting the mill atlas can reuse preparation:

```bash
PYTHONPATH="$ASSETFURNACE_DIR" "$ASSETFURNACE_DIR/.venv/bin/python" \
  scripts/mill-3d/project_texture_views.py "$mill_source" \
  "$mill_asset/texture-repaint/views.json" "$mill_run/probe" --view-size 512 --parts mill
"$BLENDER_BIN" -b --python-exit-code 1 -P scripts/mill-3d/repack_battlefield.py -- \
  pack "$mill_run/probe"
```

Select every atlas touched by the changed image or mask; a camera can see several
parts. `--parts` preserves the other painted GLBs and their measured report entries.
Initial projection must cover all three parts before packing. Geometry, UV,
coordinate-frame or source changes require fresh preparation and captures.
Projection updates selected candidate parts in place. An interrupted run leaves
`projection-pending.json`; `pack` refuses that unfinished batch. Rerun all parts
listed in the marker (or all three), then pack again and capture into a fresh
review folder. The successful projection removes the marker. Keep it until then.

## 4. Promote once, then prove the actual viewer

After the probe's scoped visual check, repeat prepare/project/pack into a fresh
`final` directory with `--texture-size 4096 --underside-size 1024`. Use the same
source, inspected views and masks, and omit `--view-size` to use full-size artwork. The default sizes reproduce the existing
runtime budget. Recheck seams at final resolution; export success is not art acceptance.
Inspect before copying the candidate GLB, lossless Blender master and geometry
report into the consuming asset directory. Repacked UVs need a rebaked tangent
normal map; the mill's explicit matte variant uses mesh normals.

Use the established viewer at `mill.html` (start it with `WEB_PORT=5416 pnpm
--filter @warwrit/web dev` if stopped). The existing code uses Babylon.js;
keep the renderer. Check real loading, orbit/zoom/pan, day/night, source/3D,
close/reset and visible errors. Save overview day/night, close, low, rear and
both sides. Build equal-height close and game-scale comparisons to the approved
reference. Send images and actual journey evidence to the visual critic before
a change list. Static scenes have motion N/A. Respect the current AGENTS.md gate.

Report elapsed calculation per stage, download size, nominal decoded texture
memory and actual FPS separately. The mill's 4K budget is 132 MiB of RGBA8 without
mipmaps, approximately 176 MiB with mipmaps; driver/shadow memory is additional.
Only measured values are performance evidence. Commit/publication follows the
repository workflow and current authorization; historical one-time waivers do
not authorize another bypass.
