# Correct usage examples

Read only the example matching the current request. Commands and camera format
are owned by [the golden path](golden-path.md).

## Diagnose an existing location

Request: “Inspect this generated location from every side and identify the next
useful improvement. Keep the active viewer unchanged.”

Run `capture_views.py` with the current GLB into a fresh output folder. Open each
clay/color pair, read the geometry report and inspect the current viewer. State
which visible problem comes from shape, texture registration, density or display
resolution. Name one next action and its observable result. No new neural generation
or UV bake is needed for this diagnosis.

## Improve blurry textures while preserving the whole scene

Request: “Keep the complete generated mill and make its stone and timber readable.”

Inspect registered renders, keep the approved geometry, normalize UV density and
repaint the exact views. Run the retained mill artwork through the 1K recipe,
inspect front/back/sides, then export the selected final budget. Verify the actual
viewer. Report a material pass independently from whole-scene acceptance and
collision/navigation status.

Example factual closeout from the mill: “Registered repaint and display-resolution
correction made stone, shingles and hatch planks readable. Material critique: 2/2.
The final GLB is 16.13 MiB and 115,383 triangles. Nominal texture memory increased.
Full-scene art verdict remains REJECT for rendering language, night hierarchy and
wheel/bank geometry; combat/navigation remain NOT_RUN.” This is historical evidence,
not a promised outcome for another asset.

## Correct one local wall projection

Request: “This rear wall uses the wrong material; the courtyard is already correct.”

Locate the affected face region and its atlas in the actual model. Inspect the
corresponding registered paint and full-scene visibility. Correct that view or
add a bounded surface repair, retaining occlusion. Use `--parts mill` only after
confirming the affected texels belong to that atlas. Keep the prepared UVs and
other painted parts. Pack the candidate, then capture the rear and both adjacent
sides before promoting it to the viewer.

## Prepare a different location

Request: “Use the same workflow for a ruined bridge location.”

Use that place's approved references. Capture the generated bridge mesh, inspect
clay, and define its own material/face groups. Reuse the camera format, registration
check and staged resolution workflow. Create an asset-specific preparation recipe
only where needed. Mill dimensions, world-space masks and spatial split values
remain local to the mill. Record bridge scale and unseen construction as inferred
until supported by source evidence.
