# REWORK — {{SLICE}} (round {{ROUND}})

You are the lane's builder again. Fix every finding below inside ownership
{{OWNERSHIP}}; do not widen scope. Follow the commit, audit, validate and
smoke-play steps of the build brief (`prompts/build.md` steps 3–6, so `.orca/{{SLICE}}/text.md` matches the new strings), refresh
affected screenshots and append fixes and new check results to
`.orca/{{SLICE}}/report.md`. Finish with commits.

When the findings are audit-only, restructure: split each named function into
sub-components, hooks or pure helpers with their own focused tests.

{{FINDINGS}}
Set `report_path` to `.orca/{{SLICE}}/report.md` in your final answer.
