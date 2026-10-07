# Warwrit skills

The four `warwrit-*` skills own the project workflow. They are workflows, not a
GDD or a source of authorization; [AGENTS.md](../../AGENTS.md) and the active
contract take precedence.

| Skill              | Use                                                                      |
| ------------------ | ------------------------------------------------------------------------ |
| `warwrit-context`  | Start or resume a slice; resolve source, status or ownership conflicts   |
| `warwrit-domain`   | Implement a bounded game-core change                                     |
| `warwrit-review`   | Invariant review, known defect patterns, general and simplification pass |
| `warwrit-delivery` | Validate, publish, authorized merge, checkpoint and next-task handoff    |

## Character production

Project-local additions, 2026-10-04:

| Skill | Source and use |
| --- | --- |
| [blender-image-to-3d](blender-image-to-3d/SKILL.md) | MIT upstream [blender-game-skills](https://github.com/majidmanzarpour/blender-game-skills/tree/f0ef29385a03de139957e6f700b801cdc00b7e29/skills/blender-image-to-3d), locally scoped for Blender modeling, skinning and GLB export |
| [meshy-3d-generation](meshy-3d-generation/SKILL.md) | Official Meshy-maintained [meshy-3d-agent](https://github.com/meshy-dev/meshy-3d-agent/tree/644fd7058aec61404dc696a6b57e292021f00d81/skills/meshy-3d-generation), CLI 0.4.0; generation, rigging, animation and downloads within an approved budget |
| [mixamo-blender](mixamo-blender/SKILL.md) | Project-authored Adobe/Blender workflow: one skeleton, compatible FBX actions, baked GLB for Babylon.js |
| [warwrit-characters-3d](warwrit-characters-3d/SKILL.md) | Project-authored, 2026-10-07: active M1-CHARACTERS-3D workflow — Quaternius parts on the UAL skeleton, approved character tilt, ink material plugin, sockets, Mixamo gap clips, `scripts/optimize-glb.sh` (glTF-Transform) and gate evidence |

The upstream commits are pinned and their MIT licenses are included. Local
integration notes take precedence over upstream example engines and full-phase
checklists. Mixamo has no installed authenticated connector; its skill is not
Adobe-maintained. Skills provide instructions, not applications, accounts,
credits or accepted character assets. Check current tools before production.
See the [combat record](../../docs/wiki/combat.md#3d-production-skills--2026-10-04).

## Host discovery

Codex discovers `.agents/skills/`. Claude Code discovers `.claude/skills/`, where
each entry is a symlink to the matching directory here; edit only this directory.
Add a symlink when adding a skill.

## History

On 2026-09-27 the pinned getsentry `code-review` and `code-simplifier` skills
(commit `c2f99a5b04b4cd992ec3022d7c2c3e23e938d241`) were installed as optional
helpers. They were removed on 2026-09-29: their Django examples, blanket
test-coverage demand, approval wording and references to a non-existent
CLAUDE.md style guide contradicted project policy, and `code-review` collided
with a built-in Claude Code skill. Their applicable checks now live in
`warwrit-review` (General pass). The originals remain in Git history.
