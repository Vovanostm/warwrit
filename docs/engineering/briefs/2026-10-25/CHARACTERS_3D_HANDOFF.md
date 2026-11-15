# Handoff: painterly 3D fighters probe (2026-10-25)

Read first: [AGENTS.md](../../../../AGENTS.md), the owning
[wiki page](../../../wiki/character-3d-pipeline.md) (Russian, owner decisions
quoted), the [tooling README](../../../../scripts/character-3d/README.md) and the
requested task document linked from [ROADMAP](../../ROADMAP.md). Owner-facing replies in Russian.

## Goal

Fighters with swappable weapons, armour and clothing that look like Wartales /
Bannerlord / The Witcher on the existing Babylon battlefield. The owner is the
visual critic for this probe. The next observable outcome: **one rigged W01 on
the mill field playing idle and a sword strike, with sword/axe/spear swap and
day/night, shown to the owner.**

## State

- Branch/checkout: primary `/Users/vovanostm/learn/warwrit`, branch
  `codex/sprite-combat-stage1`, with a lot of other writers' uncommitted WIP.
  This session's files are uncommitted: `scripts/character-3d/**`,
  `docs/wiki/character-3d-pipeline.md`, this handoff, and appended entries in
  `CHANGELOG.md`, `docs/wiki/index.md`, `docs/wiki/log.md`,
  the owning task document; update its roadmap checkbox only when done. Commit only those paths if asked.
- Work directory (git-ignored, persistent): `.claude/worktrees/research-3d/`
  - `concept-a2/`, `concept-b2/`, `concept-a2t/` — Codex concepts (A-pose
    gambeson, A-pose mail + kettle hat, T-pose gambeson).
  - `pixal3d/` raw generations; `finished/` AssetFurnace Finish output
    (~24k triangles); `finished/renders/` comparisons (`all.png`, `a-vs-t.png`).
  - `rig-ready/w01-a2.fbx`, `rig-ready/w01-b2.fbx` — welded, 1.8 m, textures
    embedded; texture PNGs beside them. **These are the files to rig.**
  - `weapons-flat/` Codex side-view sprites; `weapons-3d/` extruded GLBs.
  - `mixamo-in/` — empty inbox for the owner's Mixamo downloads
    (`w01-a2-rigged.fbx`, `w01-b2-rigged.fbx`, `idle/slash/attack/block/hit/death.fbx`).
  - `probe/` — running copy of the Babylon probe with `node_modules` and assets;
    `probe-source-snapshot/` — its source only. Not committed: the commit
    audit flags a standalone TS page outside the pnpm workspace.
    `.claude/launch.json` entry `fighter-probe` serves it on port 5310.
- Older outputs: `clean/` (TRELLIS v1, superseded), `glb-*`, `fbx/` (defective
  first FBX, do not rig), `.claude/worktrees/research-cutout/` (rejected 2D).
- Tools on this Mac: Blender 5.2.3 at
  `~/Library/Application Support/Steam/steamapps/common/Blender/Blender.app/Contents/MacOS/Blender`
  (`/opt/homebrew/bin/blender` is broken); AssetFurnace v0.5.1 at
  `~/image-to-3dlab` with Pixal3D (Metal) and weights; Hugging Face token saved
  (`~/.cache/huggingface/token`); Claude in Chrome was not connected.

## Next steps

1. **Assemble the rig** when `mixamo-in/` has files:
   `"$BLENDER" -b -P scripts/character-3d/assemble_rig.py -- mixamo-in/w01-a2-rigged.fbx mixamo-in .claude/worktrees/research-3d/rig-ready/w01-a2 <out.glb>`.
   Done when a fresh Blender import shows the textured mesh, six named actions
   and correct deformation at two frames of `slash`. Inspect shoulders, armpits
   and the hem near the hands (A-pose risk). If they fail, regenerate the
   concept with arms at 45 degrees (prompt `concept-v2.json`, change the angle)
   rather than tuning weights.
2. **Probe with motion and weapons:** copy the GLB and `weapons-3d/*.glb` into
   `probe/public/assets/`, add the weapons to `config.json` (bone suffix
   `RightHand`; weapon axis +X; set `position`/`rotationDeg` per weapon by
   checking the grip at the extremes of `idle` and `slash`, not one frame).
   Done when the clip and weapon buttons work in day and night at game and
   close scale; capture screenshots for the owner.
3. **Show the owner** (critic) and record the verdict on the wiki page. Only
   after acceptance: propose the ADR-0006 amendment for characters.
4. Then the owner's open choices (ask in one question with a recommendation):
   armour-swap method (recommended: outfit meshes with weights transferred from
   one rig, rigid helmets/shields/weapons on bones, head split at the neck) and
   permission to install MPFB (GPLv3 add-on, CC0 assets) for the body-variation
   experiment (Surface Deform from an MPFB body onto the outfit mesh).

## Permissions

Granted on 2026-10-25: upload concepts to the TRELLIS.2 Space; Mixamo rigging
through the owner's account; local AssetFurnace install and Pixal3D weights.
Not granted: MPFB install, any purchase (asset packs, HF PRO, Meshy), changes
to ADR-0006 or game code for this direction, merge or deployment.

## Pitfalls already hit

- Never decimate a generator mesh before welding UV-seam splits (holes).
- Bake metal through EMIT, not DIFFUSE (DIFFUSE turns metal black).
- Babylon: `instantiateModelsToScene(..., { doNotInstantiate: true })`, else
  clones of an unadded container are invisible; the painted backdrop must not
  write depth; positive root `rotation.x` tilts the figure toward the camera.
- Thin weapons through image-to-3D break; use sprite extrusion.
- In zsh, `set -- $line` does not split words: use the tracked bash scripts.
- `@babylonjs/loaders` is not in the web app; keep the probe standalone unless
  the owner approves adding the dependency through pnpm.
- Show visual results only with screenshots and a verdict path; the owner
  rejected an unreviewed cutout probe.
