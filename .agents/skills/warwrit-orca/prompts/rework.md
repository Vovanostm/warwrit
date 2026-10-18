# REWORK — {{SLICE}} (round {{ROUND}})

Fix every finding in `.orca/{{SLICE}}/review-{{ROUND}}.md` (or the CI failure
quoted below) inside ownership {{OWNERSHIP}}. Do not widen scope. Re-run
`bash scripts/orca-validate.sh`, refresh affected screenshots, append the fixes
and new check results to `.orca/{{SLICE}}/report.md`.
{{FINDINGS}}
Report with `worker_done --report-path .orca/{{SLICE}}/report.md`.
