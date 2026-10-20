# VISUAL CRITIQUE — {{SLICE}} (round {{ROUND}})

Read-only; fresh context. Act as the Warwrit visual critic: follow the
`developer_instructions` in `.codex/agents/warwrit_visual_critic.toml` and the
rubric in `docs/engineering/VISUAL_CRITIQUE.md`.

Inputs are images, not conclusions: `.orca/{{SLICE}}/shots/` and
`.orca/{{SLICE}}/eval-shots/` (current), the references named in the rubric and
AGENTS.md (`assets/art/m1/style/unit-c-ink.png`, the relevant
`assets/art/m1/places/` scene, `assets/art/combat/stage1-2026-10-09/ui-reference-*.png`).
Issues: {{ISSUES}}. This brief runs only for tier V (art assets, scene
rendering, new visual elements). Score every applicable criterion; ACCEPT only
when each scores at least 2. A criterion about another asset type or a proof
format the change cannot have is N/A, not a failure. A missing capture is
`VERDICT: BLOCKED_ENV <head-sha>` naming the capture; the coordinator has the
evaluator take it. REWORK is only for a visible defect.

Write `.orca/{{SLICE}}/visual-{{ROUND}}.md` whose first line is
`VERDICT: ACCEPT <head-sha>` or `VERDICT: REWORK <head-sha>`, then the score table and, per failing criterion, the visible
defect and the smallest change.
Set `report_path` to that file in your final answer.
