---
name: warwrit-art
description: Produce or fix a Warwrit raster asset (map sheet, place scene, concept) with Codex built-in image_gen and region compositing, provenance and visual critique. Every map image update includes synchronizing zones and rebuilding road nodes and navigation. Use for generated art in assets/art/** and map image revisions; not for 3D characters (warwrit-characters-3d) or code-native UI.
---

# Warwrit art lane

Follow [ART_LORE_POLICY](../../../docs/engineering/ART_LORE_POLICY.md),
[VISUAL_CRITIQUE](../../../docs/engineering/VISUAL_CRITIQUE.md) and current AGENTS.
Historical worked example with five passes:
[Porechye close view](../../../docs/wiki/world/map.md#крупный-план-поречья-через-codex--2026-10-09)
and its [provenance](../../../assets/art/world/porechye-v1/provenance.json).

## Inputs before the first prompt

1. Select the current new-2D profile under `assets/art/styles/` and view its
   matching `references/` images. The default is `graphic-novel.json`.
   `fog-wet-stone.json` applies to an explicitly assigned environment override.
   Use older M1/style-C images for place identity, geography and materials under
   ART_LORE_POLICY. Preserve the place across map and visit views.
2. Read the place facts: `docs/wiki/world/porechye.md`, `docs/wiki/world/map.md`,
   `docs/content/world/places.csv`, `assets/art/world/stozhar-v3/places.json`.
3. Write `prompt.txt` beside the future asset: inputs with roles (layout,
   style, material), places with positions, world rules, style, avoid list,
   format. No text in images; labels are overlays.

## Generate (Codex built-in image_gen)

Use the available image-generation tool with the inspected references and the
saved prompt. Set a transparent background for a sprite/cutout and preserve alpha
when editing one. Record the tool's actual output and provenance. If generation
is unavailable, retain the prepared brief and report the missing capability.

## Fix by region, never by whole-image text edit

The bundled `scripts/composite.py` crop/paste workflow converts images to RGB.
Use it on opaque map/place art. For transparent sprites, use the image-editing
tool with alpha preservation and inspect the edge against light/dark backgrounds.

Whole-image edits move places that were not meant to change (Porechye pass 2
lost Bereznyak and added a creek; a boxed edit removed the lower river).
After two critic passes with a criterion at 1, switch to regions:

1. Cut a crop around one problem, upscale 3–4×
   (`scripts/composite.py crop`). Keep crop borders on plain dry ground; a
   border through water or a bank needs the edit to redraw an inked bank.
2. Ask Codex for one edit per crop; the brief says to keep the outer 15%.
   Draw a guide line on the crop for geometry (bridge axis, stream course).
3. Paste back only the inner region with a feathered mask
   (`scripts/composite.py paste`), or restore a region from an earlier version.
4. Confirm the changed area with `scripts/composite.py diff`, inspect seams at
   2× yourself. Submit the integrated sheet at final acceptance under the current
   repository critic timing policy.

Python with Pillow: run the script with `python3 -I` from an interpreter that
has Pillow (pyenv on the director's Mac); it is a tool, not game runtime.

## Every map revision: rebuild zones and navigation

Owner requirement — 2026-10-28: after **every map image update**, regenerate
zones, road nodes and paths from the shared geometry and check that they match
the current image. Image-only delivery is incomplete. Preserve the coordinate
frame, approved movement rules and already accepted plans; name any consumer
still using an old field. Choose the simplest useful method and proportional
checks for the affected area; this is an outcome requirement, not a fixed recipe.

Atlas geometry: [region.ts](../../../packages/game-core/src/world/painted-atlas/region.ts).
The map lab's optional road overlay and `pnpm test:map` help inspect declared
connections; they do not establish correctness of every road or zone.

## Record and gate

- Save every version as a sibling file (`-v2`, `-v3`); never overwrite.
- `provenance.json`: tool and model, inputs with roles, each iteration with its
  prompt file, operation, regions and the critic verdict.
- At final visual acceptance, pass the current integrated images and references
  to `warwrit-visual-critic` for the affected art and player result under
  VISUAL_CRITIQUE. Evidence and acceptance follow the feature scope.
- Update the owning wiki page and CHANGELOG. Resolve new lore or product rules
  with the owner. The author owns technical choices within the assigned contract.
