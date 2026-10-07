---
name: warwrit-characters-3d
description: Build, tune and verify Warwrit's real-time Babylon.js 3D characters (M1-CHARACTERS-3D) from free Quaternius modular parts on the shared UAL skeleton — assembly, character tilt, ink material, weapon sockets, Mixamo gap clips, GLB optimisation and gate evidence. Use for any work on characters.html, character-model.ts or the characters-3d vendor assets.
---

# Warwrit 3D characters

Workflow for the active contract
[M1-CHARACTERS-3D](../../../docs/work-packages/M1-CHARACTERS-3D.md). The contract,
ADR-0006 and AGENTS.md take precedence; this skill grants no permission.

## Start

1. Read the contract checkpoints, its latest owner decisions and the ADR-0006
   character amendments. If the checkout has `docs/wiki/combat.md` (a local wiki
   page, possibly untracked), read its style and equipment sections.
2. View `assets/art/m1/style/unit-c-ink.png` and
   `assets/art/m1/places/bereznyak.png` before changing materials or poses.
3. Original downloads live outside git in
   `~/.codex/asset-sources/warwrit-characters-3d` (Base, Fantasy Outfits,
   UAL 1/2, Fantasy Props). Never work in `/tmp`.

## Owner decisions (2026-10-07)

- Candidate A is the base: Superhero head, Ranger body/arms/boots, Peasant legs,
  and Quaternius hair/eyebrows/beard. B (`warwrit-human.glb`) is dropped from
  runtime.
- **Character tilt approved.** The fixed 50° camera shows the top of the head,
  while the approved reference is drawn near eye level on an upright billboard.
  Tilt the character root toward the camera around the foot pivot. Keep the
  camera, ground, contact shadow, rings and picking on the ground plane.
- Mixamo: approved first for the two clips missing from UAL; extended by the owner
  on 2026-10-07 («Да, расширь») to the free Sword and Shield, Great Sword and
  Longbow packs as the primary combat clip set. UAL remains the source for
  non-combat clips.
- No purchases (Regular/Source packs, Meshy, Tripo, Cascadeur), merge or deploy.

## Skeleton and clips

All parts use Quaternius' UE-mannequin naming (`root`, `pelvis`, `spine_01–03`,
`neck_01`, `Head`, `clavicle_*`, `upperarm_*`, `lowerarm_*`, `hand_*`, `thigh_*`,
`calf_*`, `foot_*`, `ball_*`). UAL clips play directly on it, with no retargeting.

| Need                                                          | Clip (file)                                                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Idle, guard                                                   | `Sword_Idle` (UAL1), `Idle_Shield_Loop` (UAL2; holds the shield flat — check the silhouette) |
| Walk / run                                                    | `Walk_Loop`, `Jog_Fwd_Loop` (UAL1)                                                           |
| One-hand attack                                               | `Sword_Regular_A/B/C` (UAL2), `Sword_Attack` (UAL1)                                          |
| Block                                                         | `Sword_Block`, `Shield_OneShot` (UAL2)                                                       |
| Hit / death                                                   | `Hit_Chest`, `Hit_Head`, `Death01` (UAL1), `Hit_Knockback` (UAL2)                            |
| Combat set (guard, strikes, block, hit, death, two-hand, bow) | Mixamo Sword and Shield / Great Sword / Longbow packs (below)                                |

List the clips of a file with
`node .agents/skills/playcanvas-inspect-glb/scripts/inspect.mjs <file.glb>`.
Browse them in the [UAL viewer](https://quaternius.com/animviewer.html).

## Assembly rules

- One skeleton: bind every skinned part to the body skeleton and dispose the
  imported duplicates. Hair and beard are rigged to `Head`.
- Hide the covered Superhero body in bind space (discard below the neck in the
  material plugin), not with a world-space plane, because poses tilt the head.
- Weapons and shields are rigid: parent them to the `hand_r`/`hand_l`
  `getTransformNode()` through a `grip` node, with one fixed offset per item. Check
  the grip at the extremes of every clip, not on one frame.
- No mesh edits, sculpting, keyframes, F-curves, IK or custom retargeting code.
  If proportions fail, the only allowed fix is one static rest-scale tweak of
  `clavicle_*`/`spine_03`/`upperarm_*` of at most 10 %; otherwise stop and ask.

## Projection and tilt

- Use the game camera convention from `three-quarter-camera.ts` and
  `battle-scene.ts`: azimuth 0, camera on the −z side looking toward +z, world
  +x is screen right and +z is screen up. The first workshop camera at
  `(4, y, 10)` looks from the opposite side, so light, facing and tilt tuned there
  come out mirrored in battle. Fix this before tuning anything else.
- Keep `CAMERA_ELEVATION` (50°) and export one `CHARACTER_TILT_DEG`. The tilt
  axis is horizontal and perpendicular to the view direction, and the pivot sits
  at the feet, so the feet stay on their ground cell.
- A live probe on 2026-10-07 tilted the old workshop root 25–30° toward the
  camera and got an upright, reference-like figure. Recheck the sign after the
  camera fix: the head must move toward the viewer.
- The workshop exposes a manual tilt slider (0–35°) to pick the value. The game
  uses the fixed constant. Player-controlled camera pitch is out of scope because
  places and the map are pre-rendered at one projection.
- After any tilt or camera change, recalibrate the game-scale height (63 CSS px,
  measured from `battle-scene.ts`) on the tilted pose.
- Light is one world direction matching the reference: the lit side is on the
  viewer's left. The contact shadow uses the `map-shadows.ts` offset (world
  +x/+z, screen up-right in the game camera) and does not rotate with the
  character's yaw or tilt.

## Ink material

Use one `MaterialPluginBase` on the imported PBR materials, which keeps skinning.
Add no npm dependency.

- Lambert lighting in 3 bands (about .45/.72/1.0) with soft edges. No specular,
  environment, fresnel, gloss or bloom.
- Match values to the reference by measurement, not by eye. Sample the mean
  luminance of lit cloth, shadow cloth, skin and boots in `unit-c-ink.png` and
  in the close render (canvas `getImageData`), and keep each within about ±10 %.
  Lit cloth must not read as near-black at game scale.
- Weathering without retexturing: darken and warm the boots and lower legs by
  bind-space height (mud), add a faint hatch or grain in the shadow band (≤ 8 %),
  and avoid pristine flat colours.
- Outline: soot colour, about 1.5 px at game scale and 2.5 px close. Divide the
  width by the root scale and add slight noise so it reads as ink, not as a
  vector stroke.
- Lore: no emblems, sigils or heraldry. Make decorative boss plates plain iron
  and tint bronze to worn iron. Keep plain rural gear: quilted gambeson
  (стёганка), belt, boots, axe, knife, bow, round wooden shield. Never imitate
  chainmail by recolouring cloth.
- Night uses the same bands with a cooler, darker key light. The figure must
  still separate from the stage and from the Bereznyak strip.

## Mixamo combat packs

Follow [mixamo-blender](../mixamo-blender/SKILL.md) with these limits:

1. The owner signs in to Mixamo in the browser; never ask for or type passwords.
   Use Mixamo's stock character and pick _In Place_ where offered. Download FBX
   **without skin** at 30 fps and save it to the source cache. Prefer one pack
   per weapon family so guard, strikes and reactions share one manner: a compact
   guard with the shield in front of the torso and a forward strike arc.
2. Retarget once in Blender 4.5 onto the UAL armature with a free retargeting
   add-on, for example Rokoko Studio Live. Check its current Blender support and
   whether it needs a free account; the owner signs in to any account. Map
   `mixamorig:*` bones to the UE names above, then bake.
3. Export an animations-only GLB with the same joint names. Check the feet, the
   grip, both hands on the bow and on the two-hand haft at contact frames.
4. Fix residual root travel with the In Place download or by removing horizontal
   hips travel in Blender before the bake (see mixamo-blender). Do not add runtime
   procedural position or bone correction.

## GLB optimisation

```sh
.agents/skills/warwrit-characters-3d/scripts/optimize-glb.sh in.glb out.glb [1024]
```

The script runs glTF-Transform 4.5.1 (MIT, through npx): dedup → prune (keeps
empty socket nodes) → texture resize → WebP. Geometry, skin and animation stay
untouched. On 2026-10-07 the 4096² `ranger.glb` went from 9.7 MB to 1.9 MB and
`Shield_Wooden.glb` from 5.9 MB to 0.3 MB; both loaded in Babylon 9.28 with their
textures ready. Use 1024 for characters and 512 for props, then confirm the close
view keeps its texture detail. Keep the originals in the source cache. Check the
vendor total (≤ 40 MB) with `du`.

## Evidence and checks

- Capture with the Playwright session. Wait for `scene.whenReadyAsync()` and for
  the loading message to disappear. Hidden or background panes throttle rendering
  (about 1 fps observed), so call `scene.render()` before each capture.
- For Babylon probes, import the exact loaded `/@babylonjs_core.js?v=` URL.
- Required images go in `docs/work-packages/assets/characters-3d/`: day game,
  night game, day close, a pose sheet, and a tilt comparison while the tilt value
  is open.
- Step checks: `pnpm --filter web typecheck`, scoped ESLint and a browser console
  with zero errors and warnings. No build, coverage or full suites before
  contract step 8. Branch commits may use `--no-verify` with the audit recorded
  as NOT_RUN; the audit must pass before the PR.
- Critique with `warwrit_visual_critic` (Claude: `warwrit-visual-critic`) and
  [the rubric](../../../docs/engineering/VISUAL_CRITIQUE.md), not with the diff
  reviewer. Build a side-by-side sheet of the candidate and `unit-c-ink.png` at
  equal height (close and game scale), and add the day/night Bereznyak strips and
  per-clip motion frames. Pass image paths only and send the change list after
  scoring. Continue only on ACCEPT; a REJECT with a convergence note means change
  the technique.

## Free tools

| Tool                                                                                                                | Use                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Blender 4.5.9 LTS (existing binary from the contract checkpoint)                                                    | Import, export, inspection, Mixamo retarget/bake                                                          |
| glTF-Transform CLI 4.5.1                                                                                            | `inspect`, `dedup`, `prune`, `resize`, `webp`                                                             |
| `playcanvas-inspect-glb/scripts/inspect.mjs`                                                                        | Joints, clips and bounds metadata                                                                         |
| Babylon Inspector, optional (`scene.debugLayer.show()` loads the 9.28.0 bundle from CDN; dev only, never committed) | Live material, bone and node inspection; the panel did not open in a hidden pane, so use a visible window |
| Quaternius UAL viewer, Mixamo                                                                                       | Picking clips; gap clips only                                                                             |
