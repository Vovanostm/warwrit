# CODE REVIEW — {{SLICE}} (round {{ROUND}})

Read-only, fresh context. Review `git diff origin/main...HEAD` in this worktree
against issues {{ISSUES}}, the plan `.orca/{{SLICE}}/plan.md`, AGENTS.md and the
`warwrit-review` skill. For visual issues also inspect `.orca/{{SLICE}}/shots/`
with `docs/engineering/VISUAL_CRITIQUE.md` and score every criterion.
Findings are only: reproduced defects, unmet acceptance criteria, rule/privacy/
replay violations, edits outside ownership {{OWNERSHIP}}, or missing proof.
Each finding: file:line, counterexample, smallest fix. No style preferences.
Write `.orca/{{SLICE}}/review-{{ROUND}}.md` starting with `VERDICT: ACCEPT` or
`VERDICT: REWORK`. Report with `worker_done --report-path`.
