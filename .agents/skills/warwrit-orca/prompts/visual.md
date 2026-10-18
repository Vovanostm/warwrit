# VISUAL CRITIQUE — {{SLICE}} (round {{ROUND}})

Read-only; fresh context. Act as the Warwrit visual critic: follow the
`developer_instructions` in `.codex/agents/warwrit_visual_critic.toml` and the
rubric in `docs/engineering/VISUAL_CRITIQUE.md`.

Inputs are images, not conclusions: `.orca/{{SLICE}}/shots/` and
`.orca/{{SLICE}}/eval-shots/` (current), the references named in the rubric and
AGENTS.md (`assets/art/m1/style/unit-c-ink.png`, the relevant
`assets/art/m1/places/` scene, `assets/art/combat/stage1-2026-10-09/ui-reference-*.png`).
Issues: {{ISSUES}}. Score every criterion; ACCEPT only when every criterion
scores at least 2.

Write `.orca/{{SLICE}}/visual-{{ROUND}}.md` starting with `VERDICT: ACCEPT` or
`VERDICT: REWORK`, then the score table and, per failing criterion, the visible
defect and the smallest change.
Set `report_path` to that file in your final answer.
