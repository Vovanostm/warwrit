# Verification contract

## Success specification

- Outcome: a repeatable local route from a generated scene to registered captures,
  a cheap material candidate, a final export and explicit viewer acceptance.
- Process: geometry precedes paint, cameras stay registered, projection sees the
  complete source mesh, and atlas-only updates preserve unrelated parts.
- Style: concise English instructions, Russian owner reports, inspected project
  references, correct examples only. Runtime assets and examples are distinct.
- Efficiency: one preparation per geometry/UV/budget revision; 1K before 4K;
  rerun only changed parts. Record actual times rather than promise a speedup.
- Failure boundary: fail on incompatible source/material layout, malformed cameras,
  missing images or non-square paint before texture writes. Preserve prior output.
- Stop boundary: diagnose one affected stage before another expensive run; two
  non-converging attempts require an approach decision. No automatic paid calls,
  downloads, publish, audit bypass or game-readiness claim.

## Executable checks

Use the skill-creator `quick_validate.py` for structure. It does not validate
behavior. Run Python syntax and scoped Ruff on changed scripts. Run the golden
path against the retained mill source/artwork in a fresh output directory:

1. Capture seven default cameras, including top/underside, and inspect all clay/color PNGs.
2. Capture with the retained camera file; pixel registration must be below 0.01 px.
3. Validate the original GLB and seven retained artwork views with `--check-only`.
4. Prepare 1024/256, project all parts with 512-pixel view inputs, pack and roundtrip. Check emitted texture
   dimensions, finite geometry, unchanged bounds and actual triangle count.
5. Update only the mill atlas. Observe unchanged yard/underside modification times
   and retained report rows, then pack all three parts again.
6. Reuse an occupied capture/preparation directory: refusal preserves its contents.
   Feed the existing three-material result to mill preparation: refusal explains
   the original-source requirement. These are runtime invariants, not prompt examples.
7. In a disposable copy of the prepared candidate, interrupt projection after its
   first atlas. Packing must refuse without replacing the last exported GLB.
   Resume all pending parts, then pack and verify roundtrip. A subsequent single-atlas
   update must still preserve the other atlases and their report entries.

Use ordinary file inspection, not hashes or an evidence-manifest framework.
The existing 4K scene stays active during skill verification. Re-running neural
inference and purchasing generation are outside these local checks.

## Positive behavioral cases

Each request is a valid invocation. Evaluate the agent's selected next action and
artifacts, not whether its prose repeats a heading. These are task prompts only;
no failed demonstrations or negative examples are included in the skill context.

| Request                                                     | Observable outcome                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Inspect this existing location before changing it.          | Clay/color captures; one source-backed next action; input preserved.      |
| Improve blurry materials while keeping the generated scene. | Registered images, a 1K probe and scoped material verdict.                |
| Prepare a cheap preview with the retained mill artwork.     | Original source, 1024/256 output, three parts, roundtrip.                 |
| Correct only this wall's paint.                             | Identified surface/atlas; occlusion retained; affected sides checked.     |
| Reuse the approved front/back cameras.                      | Matrices/FOV retained; numerical registration check.                      |
| Make the ground and building equally detailed.              | Measured UV density and explicit atlas allocation tradeoff.               |
| Set a smaller texture-memory budget for this location.      | Estimates based on pixels/mipmaps, then a measured candidate.             |
| Prepare the final export after this probe is approved.      | One final-resolution export and lossless source; viewer readback.         |
| Give an honest acceptance report for this static scene.     | Material, full-art, runtime and navigation results separated.             |
| Apply the workflow to a different ruined location.          | New place references and its own partition/masks; reusable cameras/tools. |

Review the entrypoint's scope against its adjacent character/rigging and domain
skills as a routing contract, without adding unrelated request examples.

## Forward test

Give an independent agent only a realistic request, this skill and the raw model
or artwork paths. Assign a fresh `output/` directory; source, viewer and shared
documents are read-only. Set a bounded run budget and disallow new paid generation.
Inspect the artifacts and decisions before fixing only demonstrated defects.
Keep dated results in the owning project page, not in the reusable instructions.

## Risks to inspect

Camera convention/aspect drift; repainting moved architecture; water/stone
ownership; thin back faces; stale cached atlases after geometry edits; incompatible
tangent normals; memory increases hidden by JPEG size; model URLs unavailable after
local server stops; historical acceptance or waiver copied into a new task.
