---
name: mixamo-blender
description: Acquire humanoid animations from Mixamo, verify skeleton compatibility in Blender, and export a shared-skeleton GLB for Warwrit's Babylon.js characters. Use for Mixamo rigging, FBX import, retargeting, in-place motion, and modular armor or weapon attachment.
---

# Mixamo → Blender → Babylon.js

Project-authored workflow, not an Adobe plugin or an authenticated service.
Read the current character scope in the active contract and, when present, the
local wiki page `docs/wiki/combat.md`.
Keep Babylon.js and the approved ink/flat-wash style; this skill does not change
combat rules, the renderer, or asset ownership.

## Inputs and access

- Reuse the selected local model and existing clips before acquiring new ones.
  Save the source `.blend`/FBX separately from the delivery copy.
- [Adobe's Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
  describes free use with a supported Adobe ID and royalty-free use in games.
  Check current restrictions when acquiring assets. This is not a license for
  unrelated third-party models or standalone asset redistribution.
- Use the available browser tools on [Mixamo](https://www.mixamo.com/) when a
  session is available. Login, CAPTCHA or an account requirement stays with the
  owner; do not request passwords or invent an unofficial API/download endpoint.
  No browser session means acquisition is NOT_RUN; local asset work can continue.
- Resolve and test the actual Blender executable. A PATH shim alone is not proof
  of installation. Blender CLI is sufficient; a Blender MCP server is optional.

## Active 3D character pipeline (2026-10-07)

For the Quaternius/UAL characters in
[warwrit-characters-3d](../warwrit-characters-3d/SKILL.md), Mixamo supplies the
combat set: the free Sword and Shield, Great Sword and Longbow packs (owner
approval 2026-10-07); UAL keeps the non-combat clips. Keep the UAL skeleton as the
export skeleton: download clips without skin, retarget once onto the UE-named
UAL bones with a maintained Blender add-on, bake, and export animations only.
Do not auto-rig or re-skin the assembled character.

## One export skeleton

1. Inspect the mesh in neutral T/A pose: connected humanoid silhouette,
   distinguishable limbs, scale, transforms and provenance. For auto-rigging,
   export a clean character copy without weapons, cameras, helper rigs or large
   obstructing accessories. Keep the editable source intact.
2. Choose one deformation skeleton. Either use the returned Mixamo rig as the
   base, or retarget and bake onto the selected author rig. Do not auto-rig each
   armor set or animation independently.
3. Download the rigged character once with skin. Acquire additional animations
   for that same character without skin where available. Inspect actual imported
   clip names and time ranges; filenames do not define clip identity.
4. Compare hierarchy, rest/bind transforms, axes, bone lengths and scale before
   assigning an imported action to the base armature. Matching names or removing
   a `mixamorig:` prefix does not establish compatibility. For an incompatible
   rig, retarget in Blender and bake the evaluated deformation to the export rig.
5. After action assignment, verify the mesh at two distinct times. Inspect NLA,
   constraints and Action Slots when the current Blender version uses them.
   Select the slot compatible with the target armature, not blindly the first.
6. Bind all deforming body/armor parts to that same armature. Test weights at
   shoulders, elbows, knees and cloth joins. Rigid pieces may follow a bone;
   flexible mail/cloth must deform. Attach weapons through hand sockets and
   check the grip through the whole clip. A bow needs two hand contacts and
   separate string/arrow motion; a generic clip does not supply those automatically.

## Motion and export

- For in-place locomotion, inspect the actual root trajectory even if the download
  says In Place. Remove intended horizontal travel while retaining vertical body
  movement and gait sway. Do not delete the entire hips translation track.
  Gameplay position and action outcomes remain owned by the existing game state.
- Keep original clip duration, source FPS and loop intent in the asset's existing
  provenance record. Inspect foot contact, loop seams, grip and clipping at
  contact frames and motion extremes; a single posed screenshot is insufficient.
- Keep the control rig in the authoring file. Bake IK/constraints to the single
  deformation rig: Blender constraints and procedural shaders are not runtime
  glTF behavior. Use portable material textures for the approved visual style.
- Export only the character, compatible equipment, attachment nodes and selected
  baked actions. Check the installed Blender export operator and current
  [glTF documentation](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html)
  before choosing parameters. Verify coordinate conversion in the actual loader;
  do not guess an axis flip or mirror baked lighting.
- Reimport the GLB in a fresh Blender scene. Before integration, use the existing
  format-level [inspector script](../playcanvas-inspect-glb/scripts/inspect.mjs):

  ```sh
  node .agents/skills/playcanvas-inspect-glb/scripts/inspect.mjs path/to/character.glb
  ```

  Read `aabb`, `dims`, `boundsSource`, `boundsPose`, `requiresRuntimeCheck`,
  `nodePaths`, `clips`, `joints` and `animationTargets` as GLB metadata. Bind-pose
  bounds do not establish animated grounding. Confirm placement, facing,
  compression support and animated bounds in the installed Babylon.js loader;
  do not apply the neighboring PlayCanvas skill's engine-specific rules.

## First acceptance

Prove one body, two compatible armor appearances, a held knife and one clip on
one exact export skeleton in Babylon.js before expanding the library. Inspect
normal/close views, facing and day/night on the current field, then obtain the
independent playable critique required by AGENTS.md. Record executed results in
the active contract; missing acquisition, retargeting, playback or measurements are
NOT_RUN/NOT_MEASURED, not successful integration.

## Sources

This workflow was authored for Warwrit on 2026-10-04 using the Adobe FAQ above
and Blender's [animation](https://www.blender.org/features/animation/) and glTF
documentation. It includes no redistributed Mixamo models or animations.
