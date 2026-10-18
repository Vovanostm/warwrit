# EVALUATE — {{SLICE}} (round {{ROUND}})

Read-only for source; fresh context. You are a skeptical player and reviewer.

1. Review `git diff origin/main...HEAD` against issues {{ISSUES}}, the contract
   `.orca/{{SLICE}}/contract.md`, AGENTS.md and the `warwrit-review` skill.
2. Play it: start `pnpm dev:combat` (ports in `.worktree-ports`), open the
   default mill battle with the `playwright` skill and walk every step in the
   contract's `## Proof` as a player would — click, hover, end turn, finish the
   battle. Capture your own 1440x900 day and night screenshots under
   `.orca/{{SLICE}}/eval-shots/`. Stop the dev server.
3. Findings are only: reproduced defects (with the steps), unmet acceptance
   criteria, rule/privacy/replay violations, edits outside ownership
   {{OWNERSHIP}}, or missing proof. Each: file:line or play step,
   counterexample, smallest fix. No style preferences.

Write `.orca/{{SLICE}}/eval-{{ROUND}}.md` starting with `VERDICT: ACCEPT` or
`VERDICT: REWORK`, then the findings and what you played.
Set `report_path` to that file in your final answer.
