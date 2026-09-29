# Warwrit use boundary

Pinned official PlayCanvas inspect-glb skill; upstream bytes are unchanged and
identified in sources.json. Only this skill was installed, not the whole plugin.

Use it for the assigned licensed asset files before choosing clip names, rig paths,
scale and grounding. The zero-dependency script reads files and prints JSON; no
upstream npm scripts or optional decompression command was run during installation.

The inspector measures default/bind geometry. It does not prove runtime animation
extents, facing, equipment attachment or successful rendering. Its runtime-check
flag covers skins/morphs/decode limitations, but source review found it does not
flag rigid node-TRS animation. Measure actual clip extremes even if that flag is
false. This is a source-level risk, not an executed regression of the upstream tool.

The source package tests PlayCanvas2.22.0; Warwrit pins2.22.4. This parser does not
invoke Engine APIs. Version-sensitive shader/animation guidance still requires the
installed2.22.4 source and types. References to other upstream skills do not mean
those skills are installed; follow Warwrit's own axis, ownership and verification
contracts and check the rendered asset. Additional installs/transcoding need a
concrete asset requirement and an owned scratch path.

Parent smoke: Knight.glb and Rig_Medium_General.glb both parsed; decoded vertex
bounds report bind pose and requiresRuntimeCheck=true. This proves input inspection,
not ART05 baking or pipeline acceptance. Skills discovery may need the next turn
in this worktree; the active writer can read SKILL.md by its explicit path now.
