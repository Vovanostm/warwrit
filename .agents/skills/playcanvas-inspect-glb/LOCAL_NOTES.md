# Warwrit use boundary

Pinned official PlayCanvas inspect-glb parser with a locally adapted instruction
entry as of 2026-11-06. `sources.json` records original installed upstream bytes.
The script and license remain unchanged. Only this skill was installed.

Use it for the assigned licensed asset files before choosing clip names, rig paths,
scale and grounding. The zero-dependency script reads files and prints JSON; no
upstream npm scripts or optional decompression command was run during installation.

The inspector measures default/bind geometry. It does not prove runtime animation
extents, facing, equipment attachment or successful rendering. Its runtime-check
flag covers skins/morphs/decode limitations, but source review found it does not
flag rigid node-TRS animation. Measure actual clip extremes even if that flag is
false. This is a source-level risk, not an executed regression of the upstream tool.

The parser is engine-independent. Warwrit uses Babylon.js under ADR-0006.
The adapted entry removes PlayCanvas-specific compression, culling and facing
assumptions and unavailable neighboring-skill references. Use installed Babylon
loader/decoder support, the owning axis convention and an owned scratch path for
an actual asset requirement. Check the final rendered asset.

Parent smoke: Knight.glb and Rig_Medium_General.glb both parsed; decoded vertex
bounds report bind pose and requiresRuntimeCheck=true. This proves input inspection,
not ART05 baking or pipeline acceptance. Skills discovery may need the next turn
in this worktree; the active writer can read SKILL.md by its explicit path now.
