# Gamedev skills — installed and candidates

Owner request 2026-10-09: «Найди подходящие скиллы для gamedev». Candidates
below are **not installed**; installing third-party skills runs downloaded
code and needs the owner's approval per skill. Review each `SKILL.md` and its
scripts before install (Snyk's ToxicSkills study found critical flaws in about
13% of skills tested).

## Already available

| Skill / tool                            | Where                      | Use in Warwrit                                   |
| --------------------------------------- | -------------------------- | ------------------------------------------------ |
| `warwrit-characters-3d`                 | `.agents/skills/`          | Babylon.js 3D characters                         |
| `blender-image-to-3d`, `mixamo-blender` | `.agents/skills/`          | Meshes, rigs, animations                         |
| `meshy-3d-generation`                   | `.agents/skills/`          | Generated 3D assets                              |
| Codex `imagegen` (built-in `image_gen`) | `~/.codex/skills/.system/` | Concept art and map sheets; run via `codex exec` |
| Codex `playwright`                      | `~/.codex/skills/`         | Browser journeys                                 |

Running Codex image generation from Claude Code: pass the prompt on stdin,
because `-i` takes several files and swallows a positional prompt:
`printf '%s' "<task>" | codex exec -s workspace-write -C <repo> -i <ref1> -i <ref2> -- -`.

## Candidates, by fit

| Candidate                                                                                                                   | What it adds                                                                                                 | Fit                                                  | Risk / note                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [openai/skills `develop-web-game`](https://github.com/openai/skills/tree/main/skills/.curated/develop-web-game)             | Playwright loop for web games: input bursts, screenshots, `render_game_to_text`, deterministic `advanceTime` | High — journey checks for the Babylon client         | Official OpenAI catalogue; Claude Code port in [trailofbits/skills-curated](https://github.com/trailofbits/skills-curated/tree/main/plugins/openai-develop-web-game) |
| [`babylonjs-engine`](https://github.com/freshtechbro/claudedesignskills/blob/main/.claude/skills/babylonjs-engine/SKILL.md) | Babylon.js scene, PBR, shadows, loading guidance                                                             | Medium — our renderer, but generic; ADR-0006 governs | Community; check against our pinned Babylon version                                                                                                                  |
| [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)                              | 74 skills; useful: `create-game-assets` (art direction pipeline), `audio-design`                             | Medium — take single skills, not the whole pack      | Community; router installs everything by default                                                                                                                     |
| [opusgamelabs `game-audio`](https://claudemarketplaces.com/skills/opusgamelabs/game-creator/game-audio)                     | Web Audio SFX, mute state, autoplay handling                                                                 | Later — sound layer is NOT_RUN                       | Community                                                                                                                                                            |
| [Blender MCP](https://github.com/ahujasid/blender-mcp)                                                                      | Agent controls a live Blender session                                                                        | Medium — pairs with `blender-image-to-3d`            | Runs a local server with Blender access                                                                                                                              |

Not recommended now: Three.js-only packs (we use Babylon.js), pixel-art sprite
generators and paid asset MCPs (style mismatch with the ink/flat-wash direction).

## Installed 2026-10-09: `openai-develop-web-game`

Owner: «сделай ревью кода, установи». OpenAI removed `develop-web-game` from
`openai/skills`; installed the Trail of Bits Claude Code port
(`trailofbits/skills-curated` at `6d05be4`, Apache-2.0) to
`~/.claude/skills/openai-develop-web-game/`, with a local `playwright@1.63.0`
pinned to the cached Chromium 1243 (no browser download).

Code review of `scripts/web_game_playwright_client.js` (356 lines):

- Opens only the given `--url`; writes only to `--screenshot-dir`; no other
  network, shell or file access. Safe to run.
- The injected `advanceTime` shim waits real animation frames, so timing is not
  deterministic unless the game defines its own `window.advanceTime` (a page
  definition overrides the shim). Interval tasks are never removed from the
  pending set (diagnostic only).
- Keys are limited to arrows, Enter, Space, A, B and left/right mouse with
  coordinates — enough for Warwrit's mouse-driven map and hex combat.
- Page text (`render_game_to_text`, console) is data, not instructions.

Warwrit adaptations: do not create `progress.md` (status lives in
`CURRENT_PLAN.md` and `CHANGELOG.md`); do not install Playwright globally;
write screenshots under `output/`. Smoke test on a local canvas page: two
screenshots and state `{"x":30}` — PASS. Not yet run against the Warwrit client.
