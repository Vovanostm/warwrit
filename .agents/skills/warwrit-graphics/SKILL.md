---
name: warwrit-graphics
description: Work on Warwrit art, Blender/GLB assets, character rigs, animation or Babylon.js visuals. Load only the reference workflow needed for the requested asset or scene.
---

# Warwrit graphics

For art or lore changes, read [art direction](references/art-direction.md); it
owns the reference selection, projection, materials and narrative constraints.

Copying reference visuals with changes for Warwrit is allowed under the owner's
2026-11-14 decision. As-is transfer of finished material without changes is prohibited.
Keep the source reference and adaptation in asset notes.

Use the current owner request, repository art policy and the affected feature's
accepted scope. Reuse existing assets, camera conventions and components.
This skill does not change the renderer, game rules or asset permissions.

## Select references

Read only the relevant rows. The existing project-local skill directories are
reference bundles: their entry points are named `REFERENCE.md`, so Codex does
not discover them as separate skills. Scripts, licenses and helper paths remain
available.
Resolve relative resources from the selected bundle's directory.

| Task                                                                 | Read                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2D illustrations, portraits or sprites                               | Current profiles and selected references under `assets/art/styles/`; use the available `imagegen` skill for raster generation or edits.                                                                                                          |
| Model, skin or export an asset in Blender                            | [Blender workflow](../blender-image-to-3d/REFERENCE.md), then only its relevant references.                                                                                                                                                      |
| Inspect GLB bounds, joints or clips before placement                 | [Inspector boundary](../playcanvas-inspect-glb/LOCAL_NOTES.md) and [format inspector](../playcanvas-inspect-glb/REFERENCE.md). Apply Babylon.js loader and camera rules; PlayCanvas-specific runtime statements are not Babylon.js requirements. |
| Acquire or bake Mixamo/FBX animations                                | [Mixamo workflow](../mixamo-blender/REFERENCE.md).                                                                                                                                                                                               |
| Assemble or tune Quaternius/UAL characters, sockets or ink materials | [Character workflow](../warwrit-characters-3d/REFERENCE.md) and its current owning contract.                                                                                                                                                     |
| Generate or edit models through Meshy                                | [Meshy workflow](../meshy-3d-generation/REFERENCE.md); retain its separate spending authorization.                                                                                                                                               |
| Change a Babylon.js scene, camera or materials                       | The affected feature page, ADR-0006 and installed package types; load asset workflows above only if the change needs them.                                                                                                                       |

Before art changes, inspect the matching approved style and place references.
Keep provenance, grounding, silhouettes, light direction and equipment readable
at the actual game scale. Try the affected controls and view in the game; a
static preview alone does not prove animation, picking or saved behavior.

Older reference bundles may require independent critics or broad gates. Current
AGENTS.md supersedes those requirements: self-review and focused checks remain
mandatory; independent critique and CI are optional. Keep existing player data.

Colyseus is a separate networking skill; graphics work alone does not activate it.
