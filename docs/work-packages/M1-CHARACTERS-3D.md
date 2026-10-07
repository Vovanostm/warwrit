# M1 characters — real-time 3D with swappable equipment (2026-10-06)

Status: **proposed plan, not active.** Step 0 is an owner gate. Written by the
Claude Code session on primary `main 47c60e0` after reviewing Codex thread
`01a10c2a-67d4-75e3-84a3-8cc54891823e` (worktree `skeletal-characters`).

## Why

Owner requirement: weapons, armor, helmets and hair must be swappable. Baked
sprites multiply frames per item (directions × clips × frames); the previous
3D→2D sprite pipeline spent ~31 h without an accepted character and stalled on
hand-written Blender curve code. Real-time 3D in the existing Babylon.js renderer
makes a new item one GLB on one shared skeleton.

## Outcome of the first cycle

On `characters.html` and in the battle scene, one fighter in fixed 3/4 view,
ink-style shading, switches 2 weapons, 2 body armors, helmet on/off and 2 hair
styles, and plays idle, walk and one attack — day and night.

## Hard rules for the agent

1. Use proven assets and tools only. **Do not write keyframe, F-curve, IK-solver
   or retargeting code.** Animations come from libraries (Quaternius UAL, Mixamo)
   or Rokoko retargeting in Blender. Equipment is attached in Babylon.
2. Do not touch `game-core`, `protocol`, server or migrations.
3. No hashes, byte counts, pose/contact counts or pixel-identical re-export
   checks. Check results by screenshots and short video.
4. Commit after every step on the work branch. No merge without owner permission.
5. Time box per step as listed. If a step fails twice or exceeds its box, stop and
   ask the owner one question. Do not invent a workaround pipeline.
6. Paid items (Quaternius Source packs, Meshy/Tripo, Cascadeur) need owner
   permission first. Free CC0 standard packs are allowed.
7. Keep only files actually used in the repository; vendor total ≤ 40 MB.

## Steps

### 0. Owner decision (gate)

Ask the owner to confirm: “Characters render as real-time 3D models in Babylon
under the fixed 3/4 camera with ink/flat-wash shading; world, places and map stay
sprite 2.5D.” Only after an explicit yes, add a dated amendment to
[ADR-0006](../architecture/0006-m1-renderer-babylon.md) quoting the owner and
continue. Otherwise stop.

### 1. Clean start (≤ 30 min)

- Stop the old Codex thread. Create worktree branch `codex/characters-3d` from
  current `main`.
- From the old worktree copy **only** the Babylon workshop:
  `apps/web/characters.html`, `apps/web/src/character-workshop-main.tsx`,
  `apps/web/src/game/CharacterWorkshop.tsx`,
  `apps/web/src/game/character-workshop.css`,
  `apps/web/src/renderer/character-model.ts`, the `characters.html` entry in
  `apps/web/vite.config.ts`, and `assets/art/m1/characters-3d/warwrit-human.glb`
  with its `SOURCES.md`/`licenses/`.
- Do **not** copy sprite pipelines, `scripts/art/`, TextRig, `characters-sprites/`,
  `upstream-pilot-v1`, `grounded-locomotion-v3` or temp folders.
- Done when: `pnpm --filter web dev` opens `characters.html` without console errors.

### 2. Download free assets (≤ 30 min)

From quaternius.com / itch.io (standard, CC0, glTF):
Universal Base Characters, Modular Character Outfits – Fantasy, Universal
Animation Library 1 and 2, a medieval weapons pack. Place used files in
`assets/art/m1/characters-3d/vendor/<pack>/` with `SOURCES.md` (URL, pack
version, download date, CC0). Done when the GLBs load in the workshop.

### 3. Style gate (≤ 2 h) — stop for owner choice

- In the workshop render side by side at game zoom, day and night:
  **A** Quaternius “Regular” body + one fantasy outfit;
  **B** existing MPFB `warwrit-human.glb`.
- Shading in Babylon only: unlit/flat or 2–3 step cel lighting, no gloss
  (roughness 1, no specular), muted slate/soot/umber/ochre textures, dark outline
  (`renderOutline` per mesh or inverted hull). Light direction as in
  `assets/art/m1/places/`.
- Put both next to [`unit-c-ink.png`](../../assets/art/m1/style/unit-c-ink.png)
  and one place scene. Run the independent critic (AGENTS.md style rules: no cute
  rounded silhouettes, adult grounded proportions, readable at small scale).
- Show the owner 3 screenshots; owner picks A or B. Do not continue without it.

### 4. Animations (≤ 2 h)

- Required clips: idle, walk, run, one-hand attack, two-hand attack, block, hit,
  death, bow shot. Pick by name in the
  [UAL viewer](https://quaternius.com/animviewer.html).
- If **A**: UAL shares the rig — no retargeting. Export one
  `animations.glb` (skeleton + clips, no meshes).
- If **B**: retarget UAL clips to the MPFB rig once with Rokoko Retargeting in
  Blender (Blender MCP may drive it); export `animations.glb`. Missing combat
  clips → ask owner about Mixamo, do not keyframe by hand.
- Done when every clip plays in the workshop without feet sliding through the
  ground at normal zoom and shoulders look relaxed.

### 5. Equipment system in Babylon (≤ 3 h)

- Catalogue `apps/web/src/renderer/character-equipment.ts`: per item
  `{ id, slot, glb, kind: 'rigid' | 'skinned', bone?, hides?: slot[] }`.
  Slots: `mainHand`, `offHand`, `helmet`, `hair`, `body`, `legs`, `feet`.
- **Skinned** items (body, legs, feet, hair if skinned): skinned to the full
  skeleton; on load assign the shared skeleton and dispose the imported duplicate.
- **Rigid** items (weapons, shield, helmet): each GLB has an empty `grip` node at
  the handle; parent the item to the hand/head bone `getTransformNode()` and align
  `grip` to it. Two-hand weapons attach to the main hand and rely on two-hand clips.
- Helmet hides hair (`hides: ['hair']`) or uses a short-hair variant.
- First content: 2 weapons (axe, sword), shield, 2 body armors, helmet, 2 hair.
- Done when every combination switches during any clip without pops or offset.

### 6. Game integration (≤ 2 h)

Replace one fighter sprite in the battle scene (`battle-scene.ts`) with the 3D
character using a static equipment preset (presentation only, no game state
changes). Keep targets, paths and labels readable; check 12 fighters at once.

### 7. Critique and owner demo

Independent critic with current day/night, overview and close screenshots plus a
short video of switching and the attack. Fix material findings, repeat once.
Show the owner what to open and click.

### 8. Closeout

Update this file (results, actual checks, `NOT_RUN`/`NOT_MEASURED`), CURRENT_PLAN,
CHANGELOG; open a PR. No merge without explicit permission.

## Tools reference

- Quaternius [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html),
  [Modular Outfits Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html),
  [Universal Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html) — CC0.
- Babylon bones/attachments:
  [docs](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/mesh/bonesSkeletons.md).
- Optional with permission: official Blender Lab MCP (Blender 5.1+), Meshy/Tripo
  image-to-3D + auto-rig for unique items, Cascadeur Indie for combat polish.
