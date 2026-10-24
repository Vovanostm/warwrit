# EVALUATE — {{SLICE}} (round {{ROUND}})

Read-only for source; fresh context. You are a skeptical player and reviewer.

1. Review `git diff origin/main...HEAD` against issues {{ISSUES}}, the contract
   `.orca/{{SLICE}}/contract.md`, AGENTS.md and the `warwrit-review` skill.
2. Play it: `bash scripts/orca-play.sh start` prints `READY <url>` once the
   lab answers (exit 3 = `BLOCKED_ENV`: write that verdict with its output and
   stop; it is not a code defect). Open the default mill battle with the `playwright` skill and walk every step in the
   contract's `## Proof` as a player would — click, hover, end turn, finish the
   battle. Capture your own 1440x900 day and night screenshots under
   `.orca/{{SLICE}}/eval-shots/`. Finish with `bash scripts/agent-cleanup.sh`
   (closes your named browser; stops the lab only with the coordinator-provided
   matching `WARWRIT_LAB_OWNER=<session>` grant). Report cleanup errors; do not
   claim a clean runtime when inspection fails.
   For tiers U and T, judge the issue's visual acceptance criteria yourself from your
   screenshots (readable at 1440x900, day and night, nothing hidden or
   overlapping); there is no separate visual critic.

3. Findings are only: reproduced defects (with the steps), unmet acceptance
   criteria, rule/privacy/replay violations or edits outside ownership
   {{OWNERSHIP}}. Each: file:line or play step, counterexample, smallest fix.
   No style preferences. Missing proof is not a finding: you are playing the
   game, so take the missing step or screenshot yourself and judge it.

Write `.orca/{{SLICE}}/eval-{{ROUND}}.md` whose first line is
`VERDICT: ACCEPT <head-sha>`, `VERDICT: REWORK <head-sha>` (defects only) or
`VERDICT: BLOCKED_ENV <head-sha>`, then the findings and what you played.
Set `report_path` to that file in your final answer.
