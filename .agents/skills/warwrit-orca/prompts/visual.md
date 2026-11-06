# VISUAL CRITIQUE — {{SLICE}} (round {{ROUND}})

Read-only. Follow AGENTS.md, the owning feature specification, the role in
`.codex/agents/warwrit_visual_critic.toml` and `docs/engineering/VISUAL_CRITIQUE.md`.
Issues: {{ISSUES}}. Inspect current `.orca/{{SLICE}}/shots/` and
`.orca/{{SLICE}}/eval-shots/` evidence for the affected result and applicable
references from ART_LORE_POLICY. Do not require unrelated capture packs or scores.

Report observed defects, missing required checks and polish separately. Missing
whole-scene comparisons do not block another feature. Never control unassigned
services. Recheck affected results after corrections.

Write `.orca/{{SLICE}}/visual-{{ROUND}}.md`. Preserve the worker protocol:
`VERDICT: ACCEPT <head-sha>` for passed scoped criteria,
`VERDICT: REWORK <head-sha>` for a concrete defect, or
`VERDICT: BLOCKED_ENV <head-sha>` for missing evidence required by that scope.
Then give scope/revision, image/region or journey step, player impact and next action.
Set `report_path` to that file in your final answer.
