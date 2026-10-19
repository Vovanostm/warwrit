# REVIEW — {{SLICE}} (round {{ROUND}})

Read-only; fresh context. Use the `warwrit-review` skill.

Review `git diff origin/main...HEAD` against issues {{ISSUES}}, the slice
contract `.orca/{{SLICE}}/contract.md`, the epic contract
`docs/engineering/epics/{{EPIC}}/contract.md` when it exists, and AGENTS.md.
Findings are only reproduced defects or concrete risks with file:line,
counterexample and smallest fix: rule, privacy, replay or determinism
violations, missing tests for changed behaviour, edits outside ownership
{{OWNERSHIP}}. No style preferences.

Write `.orca/{{SLICE}}/review-{{ROUND}}.md` whose first line is
`VERDICT: ACCEPT <head-sha>` or `VERDICT: REWORK <head-sha>` (`git rev-parse HEAD`),
then the findings. Set `report_path` to that file in your final answer.
