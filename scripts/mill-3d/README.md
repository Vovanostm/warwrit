# Complete mill battlefield from images

The owner selected a standalone inspection scene, rejected the mixed neural
mill/authored courtyard and requested that image-to-3dlab build the **whole
battlefield**. The current refinement uses two views of the complete scene and
one generated GLB. No authored terrain, walls, trees or water are added.

## Open

With the repository-pinned Node/pnpm toolchain:

```bash
pnpm install --frozen-lockfile
WEB_PORT=5416 pnpm --filter @warwrit/web dev
```

Open `http://127.0.0.1:5416/mill.html`. Drag to orbit, wheel to zoom, right-drag
to pan. Day/night, close/reset, 0–45° elevation and the front-source comparison
are inspection controls. Combat, collision and navigation are not implemented.

## Inputs and installation

[Source and brief](../../assets/art/combat/mill-3d-2026-10-26/asset-brief.md),
[front prompt](../../assets/art/combat/mill-3d-2026-10-26/prompts.json), and the
rear image/prompt beside those assets. Hidden architecture and metre scale remain
inferred. The first single-view prototype is saved in commit `79c8f564`.

AssetFurnace v0.5.1/Pixal3D Metal was already installed. The owner approved the
additional 5.9 GB multiview flows, installed with upstream
`scripts/bootstrap_pixal3d.py --multiview --yes`. No weights are stored here.
Set `ASSETFURNACE_DIR` to that installation and `BLENDER_BIN` to the working
Blender executable (Steam Blender 5.2.3 on the inspected Mac).

## Reproduce the current two-view path

Upstream's front/back helper assumes horizontal cameras for upright subjects.
`generate_battlefield.py` supplies the references' 35° elevation before calling
the installed pipeline. It does not edit upstream files. Both cameras remain
opposite and aimed at the origin. The initial horizontal-camera attempt was
stopped before completing its shape.

```bash
mkdir -p output/mill-3d/multiview/{raw,finish-native,native-preview,finish-calibrated,candidate}
"$ASSETFURNACE_DIR/.venv/bin/python" scripts/mill-3d/generate_battlefield.py \
  --assetfurnace "$ASSETFURNACE_DIR" --elevation 35 \
  assets/art/combat/mill-3d-2026-10-26/source-battlefield.png \
  output/mill-3d/multiview/raw/battlefield.glb \
  --back assets/art/combat/mill-3d-2026-10-26/source-battlefield-back.png \
  --res 1024 --seed 42 --steps 12 --no-matte

"$ASSETFURNACE_DIR/.venv/bin/python" "$ASSETFURNACE_DIR/scripts/retopo_repaint.py" \
  output/mill-3d/multiview/raw/battlefield.glb \
  assets/art/combat/mill-3d-2026-10-26/source-battlefield.png \
  output/mill-3d/multiview/finish-native/battlefield.glb \
  --faces 120000 --skip-paint --atlas 4096 --texture-size 4096 \
  --native-dump output/mill-3d/multiview/raw/battlefield.post.bin \
  --steps-dir output/mill-3d/multiview/finish-native/steps --blender "$BLENDER_BIN"

"$BLENDER_BIN" -b --python-exit-code 1 -P scripts/mill-3d/prepare_battlefield.py -- \
  output/mill-3d/multiview/finish-native/battlefield.glb \
  output/mill-3d/multiview/native-preview

"$ASSETFURNACE_DIR/.venv/bin/python" scripts/mill-3d/calibrate_views.py \
  output/mill-3d/multiview/raw/battlefield.svviews \
  output/mill-3d/multiview/native-preview/battlefield-geometry.json \
  output/mill-3d/multiview/paint-ground-frame

"$ASSETFURNACE_DIR/.venv/bin/python" "$ASSETFURNACE_DIR/scripts/retopo_repaint.py" \
  output/mill-3d/multiview/raw/battlefield.glb \
  assets/art/combat/mill-3d-2026-10-26/source-battlefield.png \
  output/mill-3d/multiview/finish-calibrated/battlefield.glb \
  --faces 120000 --skip-paint --atlas 4096 --texture-size 4096 \
  --views output/mill-3d/multiview/paint-ground-frame --no-nudge \
  --native-dump output/mill-3d/multiview/raw/battlefield.post.bin \
  --steps-dir output/mill-3d/multiview/finish-calibrated/steps --blender "$BLENDER_BIN"

"$BLENDER_BIN" -b --python-exit-code 1 -P scripts/mill-3d/prepare_battlefield.py -- \
  output/mill-3d/multiview/finish-calibrated/battlefield.glb \
  output/mill-3d/multiview/candidate
```

Inspect the candidate before copying its GLB, Blender master and geometry report
into the asset directory. The current run reused the identical native retopology
stage for the final Finish pass; the commands above recompute that cheap stage.

The generated ground did not preserve the requested camera frame. Applying
Pixel Match directly produced a false second bridge and courtyard paint across
the rear wall. `calibrate_views.py` rotates the photo-camera rig into the measured
courtyard frame; pictures and mesh remain unchanged. `--no-nudge` alone did not
fix the defect. The corrected projection was inspected front/back in the browser.

`prepare_battlefield.py` estimates the central upward courtyard plane, rotates
the **whole mesh**, sets inferred width to 25 m, makes materials matte, packs
textures and exports GLB/Blender. It adds no geometry and does not flatten the
terrain. The underside is too irregular to serve as a ground reference. The
export is reimported to check meshes, finite vertices, UVs and embedded images.

## Verification

Run scoped ESLint and web typecheck; a fresh checkout needs protocol declarations
first (`pnpm --filter @warwrit/protocol build`). Browser QA covers actual model
load, day/night/day, source/3D, close/reset, orbit, zoom, pan, 0°/45° and desktop
fit at 1440×900 and 1366×768. A missing model must show a visible error and source
fallback. Capture both page errors and console shader errors. Independent visual
critique remains separate from functional checks. Results and limitations belong
to the [owning record](../../docs/wiki/mill-3d-scene.md#3d-мельница-и-двор--отдельная-сцена-2026-10-26).

## Texture refinement on the existing mesh (2026-10-26)

The current asset retains the complete generated scene. Five unlit, registered
views of checkpoint `fbc0ce62` were repainted with imagegen: front, back, yard and
two sides. The input renders (2048 square), actual generated images (1254 square),
exact prompts and Babylon camera matrices are in
[texture-repaint](../../assets/art/combat/mill-3d-2026-10-26/texture-repaint/prompts.json).
The images introduce inferred surface detail; they do not measure hidden construction.

The material pass welds coincident vertices, preserves the original UV charts,
normalizes their scale and packs three texture budgets: mill 4096, yard 4096,
downward faces 1024. The mill/yard split at Blender Y=4.5 is an inferred texture
allocation boundary, not a game-region or navigation contract. Normal maps from
the old tangent basis are removed; this matte painted variant uses mesh normals.
New normal-map baking is NOT_RUN.

Projection uses AssetFurnace v0.5.1 rasterization and visibility against the
**entire original scene**, including when painting one atlas. It selects the
best-resolved visible view instead of averaging differently painted mortar joints.
Occluded and grazing regions retain their previous paint. Masonry repair views are bounded in glTF world space to the elevated gable: X -9.3..-6.5,
Y 7..12, Z -11.5..-3.5; the side seam uses X -10.2..-8.2, Y 7..11.4,
Z -10..-5.5, with 0.2 m edge feathering. These manually inspected wall regions
retain full-scene depth occlusion but disable silhouette and inner-edge erosion;
those fades had retained erroneous water on the narrow wall edges. When repair weights tie,
the later side-wall patch takes precedence over the rear patch. This corrects water wrongly
painted onto the building without repainting the channel. The region was located
by ray/triangle hits in the inspected rear view; it is an asset-specific mask,
not a semantic rule for other models. No additional scenery
or displacement is generated. The packed Blender source remains lossless; the
runtime GLB embeds JPEG color at quality 95.

```bash
mkdir -p output/mill-3d/texture-rebuild
mill_source=assets/art/combat/mill-3d-2026-10-26/source-geometry.glb
mill_output=output/mill-3d/texture-rebuild/final
"$BLENDER_BIN" -b --python-exit-code 1 -P scripts/mill-3d/repack_battlefield.py -- \
  prepare "$mill_output" --source "$mill_source"
PYTHONPATH="$ASSETFURNACE_DIR" "$ASSETFURNACE_DIR/.venv/bin/python" \
  scripts/mill-3d/project_texture_views.py "$mill_source" \
  assets/art/combat/mill-3d-2026-10-26/texture-repaint/views.json "$mill_output"
"$BLENDER_BIN" -b --python-exit-code 1 -P scripts/mill-3d/repack_battlefield.py -- \
  pack "$mill_output"
```

Execute each command after the previous one succeeds; for a Bash script use
`set -euo pipefail`. Keep the source outside the empty `prepare` destination.
After every successful projection run `pack` to refresh the exported GLB; the
expensive UV preparation is reused for image-only corrections. Interrupted
projection leaves `projection-pending.json`, and packing stays blocked until all
listed parts have been successfully reprojected. Keep the marker until recovery.

Inspect before copying the three `battlefield.*` result files into the asset
folder. `prepare_battlefield.py` belongs to the earlier neural-generation stage;
do not run it again on this already grounded material-refinement output.

Runtime: 115,383 triangles, three materials, 16.13 MiB. Median density is
73.7 px/m on mill charts, 68.5 on yard charts and 25.4 on downward faces.
The smaller download is **not** lower GPU texture memory: nominal RGBA8 storage
without mipmaps grows from 80 to 132 MiB (with mipmaps about 107 to 176 MiB),
excluding shadows and driver overhead. Actual VRAM and game FPS are NOT_MEASURED.
The scene remains an inspection prototype, without collision or navigation.

## Fast refinement workflow (2026-10-27)

Use [scene-3d-refinement](../../.agents/skills/scene-3d-refinement/SKILL.md) for
registered clay/color captures, the executable mill probe and correct examples.
`prepare --texture-size 1024 --underside-size 256` creates a cheap candidate in
a fresh output directory; defaults retain the final 4096/1024 budget. Preparation
requires the original one-mesh/one-material source. Existing prepared directories
are preserved; use a new directory after geometry, UV or budget changes.

`project_texture_views.py --check-only` validates source, images and rigid cameras
without writing. `--view-size 512` downsamples input views for a diagnostic probe;
omit it for final quality. `--parts mill` updates only that painted atlas and its
report row after an image-only correction. Select every affected part; first
projection covers all three. Timings and actual view sizes are recorded per part.
These switches do not copy a candidate into the viewer or imply visual acceptance.
