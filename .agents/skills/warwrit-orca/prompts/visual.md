# VISUAL CRITIQUE — {{SLICE}} (round {{ROUND}})

Read-only; fresh context. Act as the Warwrit visual critic: follow the
`developer_instructions` in `.codex/agents/warwrit_visual_critic.toml` and the
rubric in `docs/engineering/VISUAL_CRITIQUE.md`.

Inputs are images, not conclusions: `.orca/{{SLICE}}/shots/` and
`.orca/{{SLICE}}/eval-shots/` (current), the references named in the rubric and
AGENTS.md (`assets/art/m1/style/unit-c-ink.png`, the relevant
`assets/art/m1/places/` scene, `assets/art/combat/stage1-2026-10-09/ui-reference-*.png`).
Issues: {{ISSUES}}. Use this brief for substantive visual results under AGENTS.md,
including tier V and substantive visuals in U/T. Tier labels do not waive scored
visual acceptance. Score every applicable criterion; ACCEPT only
when each scores at least 2. A criterion about another asset type or a proof
format the change cannot have is N/A, not a failure. A missing capture is
`VERDICT: BLOCKED_ENV <head-sha>` naming the capture. The coordinator may assign
an evaluator to obtain it only with explicit permitted resource ownership;
unavailable proof stays non-passing. Never start/stop unassigned services.
REWORK is only for a visible defect.

Write `.orca/{{SLICE}}/visual-{{ROUND}}.md` whose first line is
`VERDICT: ACCEPT <head-sha>`, `VERDICT: REWORK <head-sha>` or
`VERDICT: BLOCKED_ENV <head-sha>`, then the score table and, per failing criterion, the visible
defect and the smallest change.
Set `report_path` to that file in your final answer.
