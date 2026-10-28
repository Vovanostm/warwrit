---
name: warwrit-art
description: Produce or fix a Warwrit raster asset (map sheet, place scene, concept) with Codex built-in image_gen and region compositing, provenance and visual critique. Every map image update includes synchronizing zones and rebuilding road nodes and navigation. Use for generated art in assets/art/** and map image revisions; not for 3D characters (warwrit-characters-3d) or code-native UI.
---

# Warwrit art lane

[ART_LORE_POLICY](../../../docs/engineering/ART_LORE_POLICY.md), [VISUAL_CRITIQUE](../../../docs/engineering/VISUAL_CRITIQUE.md)
and the studio [decision rights](../../../docs/engineering/AGENT_TEAM.md#decision-rights)
govern. Worked example with all five passes:
[Porechye close view](../../../docs/wiki/world/map.md#крупный-план-поречья-через-codex--2026-10-09)
and its [provenance](../../../assets/art/world/porechye-v1/provenance.json).

## Inputs before the first prompt

1. View `assets/art/m1/style/unit-c-ink.png` and the place's approved scene in
   `assets/art/m1/places/`. A place looks the same on the map and in its visit.
2. Read the place facts: `docs/wiki/world/porechye.md`, `docs/wiki/world/map.md`,
   `docs/content/world/places.csv`, `assets/art/world/stozhar-v3/places.json`.
3. Write `prompt.txt` beside the future asset: inputs with roles (layout,
   style, material), places with positions, world rules, style, avoid list,
   format. No text in images; labels are overlays.

## Generate (Codex built-in image_gen)

`-i` takes several files and swallows a positional prompt, so pass the task on
stdin. Use the configured model (`gpt-6.1-sol`); on «model at capacity» wait a
minute and retry once.

```bash
printf '%s' "<task: read prompt.txt, one image, save to <path>, print path, size, exact prompt>" \
  | codex exec -m gpt-6.1-sol -s workspace-write -C <repo> -i <layout> -i <style> -i <material> -- -
```

## Fix by region, never by whole-image text edit

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
   2× yourself, then send the full sheet to the critic.

Python with Pillow: run the script with `python3 -I` from an interpreter that
has Pillow (pyenv on the director's Mac); it is a tool, not game runtime.

## Every map revision: rebuild zones and navigation

Owner requirement — 2026-10-28: after **every map image update**, regenerate
the zones and navigation before declaring the map complete. Replacing the PNG
alone is incomplete, including for a local crop repair.

1. Match the new image to its owning coordinate frame and region. For the painted
   atlas, update [region.ts](../../../packages/game-core/src/world/painted-atlas/region.ts):
   retrace affected terrain, blocking/water shapes, road overlays and stations,
   and settlement entry zones/anchors. Remove obsolete geometry. Road surface
   and graph stations must follow the same traced centreline. Keep one shared
   source for client and server; preserve unchanged geometry and approved rules.
2. Rebuild the navigation grid and road graph with `buildNavigationField` from
   the updated region; rebuild package outputs used by consumers. Even a purely
   cosmetic revision requires a rebuild and confirmation that the zones still
   match. Reload the task's local map consumers/server so validation uses this
   field. Do not restart unrelated stands or deploy without authorization; report
   any running consumer that still uses the old field.
3. Recalculate fresh routes through each changed connection and adjoining junction.
   Inspect actual zone/road-node/path overlays on the current image at game scale.
   Check surface/speed classification, connected junctions, entry-zone reachability
   and affected bridge/water boundaries. A removed road must lose its road bonus;
   the planner must take the corrected bends when their travel cost is lower.
   Use new orders: already accepted plans retain their frozen path and timing.
4. Run focused geometry/routing regressions (atlas entry:
   [region.test.ts](../../../packages/game-core/src/world/painted-atlas/region.test.ts))
   and try affected journeys to arrival in the browser. Pass current image,
   geometry overlays and journey evidence to the required independent visual
   critic. Record the image revision, regenerated field, checks and runtime limits
   together in the owning map result; image-only acceptance cannot close the task.

## Record and gate

- Save every version as a sibling file (`-v2`, `-v3`); never overwrite.
- `provenance.json`: tool and model, inputs with roles, each iteration with its
  prompt file, operation, regions and the critic verdict.
- Visual critic (`warwrit-visual-critic`): pass images, not conclusions; full
  absolute review each pass; ACCEPT needs every applicable criterion ≥ 2.
  A standalone concept ACCEPT is not in-game acceptance.
- Update the owning wiki page and CHANGELOG; open questions go to the owner
  only for canon (faith, factions, history), otherwise the director decides.
