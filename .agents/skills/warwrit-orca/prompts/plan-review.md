# PLAN REVIEW — {{SLICE}} (round {{ROUND}})

Read-only. Review `.orca/{{SLICE}}/plan.md` against issues {{ISSUES}},
AGENTS.md and current main. Flag only: a missed acceptance criterion, a rule
computed on the client, a change outside ownership {{OWNERSHIP}}, a replay or
protocol compatibility break, an unproven acceptance item, or needless scope.
Write `.orca/{{SLICE}}/plan-review-{{ROUND}}.md` starting with `VERDICT: APPROVE`
or `VERDICT: REVISE` and a numbered list of required changes. Style preferences
are not findings. Report with `worker_done --report-path`.
