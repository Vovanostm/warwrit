# REVIEW — {{SLICE}} (round {{ROUND}})

Read-only; fresh context. Use the `warwrit-review` skill and AGENTS.md.

Review the assigned revision/diff against issues {{ISSUES}} and their accepted
criteria. Use `.orca/{{SLICE}}/contract.md` or an epic contract only when assigned
or present and applicable; neither a slice file nor a `## Proof` heading is
required. Do not manufacture a contract to replace adequate issue criteria.
Inspect dirty changes in delegated-editor mode; name the reviewed HEAD and dirty
delta so a HEAD-only verdict cannot imply acceptance of different code.

Findings are reproduced defects or concrete risks with file:line, counterexample
and smallest fix: rule/privacy/replay/determinism violations, important missing
regressions or edits outside ownership {{OWNERSHIP}}. No style preferences.
If required sources/criteria or the assigned revision are unavailable, return a
non-passing BLOCKED_ENV result identifying the gap; do not infer acceptance.
This is diff review, not gameplay/visual acceptance. Do not start/stop services,
acquire resources or change source to obtain proof outside this assignment.

Write `.orca/{{SLICE}}/review-{{ROUND}}.md` whose first line is
`VERDICT: ACCEPT <head-sha>`, `VERDICT: REWORK <head-sha>` or
`VERDICT: BLOCKED_ENV <head-sha>`, then findings, checked revision/dirty delta and
limitations. Set report_path to that file in your structured final answer.
