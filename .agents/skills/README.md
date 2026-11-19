# Warwrit skills

The `warwrit-*` workflow skills own the project workflow. They are workflows, not a
GDD or a source of authorization; [AGENTS.md](../../AGENTS.md) and the active
contract take precedence.

| Skill               | Use                                                                      |
| ------------------- | ------------------------------------------------------------------------ |
| `warwrit-context`   | Start or resume a slice; resolve source, status or ownership conflicts   |
| `warwrit-changelog` | Read at most 50 lines, find changes by regexp and write short entries    |
| `warwrit-domain`    | Implement a bounded game-core change                                     |
| `warwrit-review`    | Invariant review, known defect patterns, general and simplification pass |
| `warwrit-delivery`  | Validate, publish, authorized merge, checkpoint and next-task handoff    |
| `warwrit-writer`    | Russian-only quest/player text in plain modern Russian; rare-word check  |

## Compact root instructions — 2026-11-08

[AGENTS.md](../../AGENTS.md) keeps the always-applicable rules. Read conditional
[art direction](warwrit-graphics/references/art-direction.md) for graphics/lore,
[review rules](warwrit-review/references/review-rules.md) for review/simplification,
and [project records](warwrit-delivery/references/project-record.md) for substantive
change documentation. The matching skills route to the same files; do not load
all references for unrelated work. Older root section links remain valid.

## Project-scoped discovery — 2026-11-08

Owner requested a smaller Warwrit startup catalog. Use
[warwrit-graphics](warwrit-graphics/SKILL.md) for graphics work. It routes to only
the required existing reference bundle below. The five 3D entry points are now
`REFERENCE.md`, so they add no standalone skill metadata; their scripts, licenses
and support files remain in their existing directories. `colyseus` stays a
separate project-local networking skill. The Claude discovery link points to the
same graphics entry point.

[Project config](../../.codex/config.toml) disables Documents/style matching,
Figma, Airtable, Pages, Sites, plugin management, Defense Factory, Pets, Vercel
and the standalone `security-best-practices` skill only for Warwrit. Other
project/global defaults remain intact. Plugin selectors cover the installed
curated marketplace identities; skill-name selectors also cover plugin cache
version updates. A separately configured Figma MCP connection is not a skill
and is outside this skill-scoping change.

The three portfolio skills already live in
`~/learn/tinvest-chatgpt-gateway/.agents/skills/`. Removed only their global
`~/.codex/skills/` symlinks. T-Invest still discovers all three; Warwrit does not.
No account connection or global plugin installation was removed.

Restart Codex to refresh the catalog. Existing chats retain already-loaded
instructions and tool results. Local CLI 0.163.0 `skills/list` confirms the single
graphics entry point and portfolio isolation. Its unqualified list reports
startup-level skill enablement even when `config/read(cwd=...)` resolves project
exclusions; loading those resolved exclusions into a separate inspection process
confirms filtering of the security skill. Project config readback confirms the
service plugin exclusions. The desktop app's post-restart catalog and remote
connector availability are NOT_RUN; they are not established by the CLI check.
The new skill validator, scoped links and self-review pass; game tests and CI
NOT_RUN (instructions/configuration only). No latency or token savings measured.

Configuration references: [skill discovery](https://learn.chatgpt.com/docs/build-skills)
and [project plugin configuration](https://developers.openai.com/plugins/build/plugins).

## Character production

Project-local additions, 2026-10-04:

| Reference                                                   | Source and use                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [blender-image-to-3d](blender-image-to-3d/REFERENCE.md)     | MIT upstream [blender-game-skills](https://github.com/majidmanzarpour/blender-game-skills/tree/f0ef29385a03de139957e6f700b801cdc00b7e29/skills/blender-image-to-3d), locally scoped for Blender modeling, skinning and GLB export                   |
| [meshy-3d-generation](meshy-3d-generation/REFERENCE.md)     | Official Meshy-maintained [meshy-3d-agent](https://github.com/meshy-dev/meshy-3d-agent/tree/644fd7058aec61404dc696a6b57e292021f00d81/skills/meshy-3d-generation), CLI 0.4.0; generation, rigging, animation and downloads within an approved budget |
| [GLB inspector](playcanvas-inspect-glb/REFERENCE.md)        | Pinned format-level bounds, joint and clip inspection; use [Warwrit boundary notes](playcanvas-inspect-glb/LOCAL_NOTES.md) for Babylon.js integration.                                                                                              |
| [mixamo-blender](mixamo-blender/REFERENCE.md)               | Project-authored Adobe/Blender workflow: one skeleton, compatible FBX actions, baked GLB for Babylon.js                                                                                                                                             |
| [warwrit-characters-3d](warwrit-characters-3d/REFERENCE.md) | Project-authored, 2026-10-07: active M1-CHARACTERS-3D workflow — Quaternius parts on the UAL skeleton, approved character tilt, ink material plugin, sockets, Mixamo gap clips, `scripts/optimize-glb.sh` (glTF-Transform) and gate evidence        |

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
