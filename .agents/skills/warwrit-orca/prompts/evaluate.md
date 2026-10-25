# EVALUATE — {{SLICE}} (round {{ROUND}})

Read-only for source; fresh context. You are a skeptical player and reviewer.
Follow AGENTS.md and the current assignment's scope, stop and resource ownership.

1. Review the assigned revision/diff against issues {{ISSUES}} and their accepted
   criteria, using `warwrit-review`. A slice/epic contract is optional: use it only
   when assigned or present and applicable. No mandatory `contract.md` or `## Proof`
   heading. Name HEAD and any assigned dirty delta in delegated-editor mode.
   Missing authoritative criteria/source is a non-passing blocked result.
2. Before any service command, require explicitly assigned private runtime/ports,
   lifecycle owner and permitted journey. Use an assigned existing runtime only
   as authorized. Start `orca-play.sh` only when this invocation is assigned its
   lifecycle; stop only resources established as owned by this invocation. Never
   start/stop another agent's resources or acquire unassigned resources for proof.
   Without ownership/permission, report BLOCKED_ENV before any service command.
3. Play the actual affected acceptance journey with the assigned browser/runtime;
   do not substitute the default mill battle when it does not cover the criteria.
   Capture required current desktop/day/night evidence under
   `.orca/{{SLICE}}/eval-shots/`. Exit 3 from `orca-play.sh` is BLOCKED_ENV; any
   unavailable required browser, screenshot or unexecutable criterion also leaves
   acceptance incomplete, even without a reproduced code defect.
4. Check the issue's visual criteria. Substantive visual results require the
   independent visual critic and full applicable VISUAL_CRITIQUE scoring under
   AGENTS.md, including existing-layout U and text/UI T changes. Evaluator-only
   evidence never substitutes for that gate. Apply required text critique too.
5. Findings are reproduced defects, unmet criteria, rule/privacy/replay violations
   or edits outside {{OWNERSHIP}}: file:line/play step, counterexample, smallest
   fix. Separate missing proof/environment from code defects. Obtain missing proof
   only when authorized, feasible and inside assigned resources. Otherwise return
   non-passing BLOCKED_ENV naming the gap; never claim ACCEPT for incomplete proof.

Write `.orca/{{SLICE}}/eval-{{ROUND}}.md` whose first line is
`VERDICT: ACCEPT <head-sha>`, `VERDICT: REWORK <head-sha>` (confirmed defects) or
`VERDICT: BLOCKED_ENV <head-sha>` (missing source/resource/evidence included).
Record checked revision/dirty delta, what was actually played, independent gates
and limitations. Set report_path to that file in your structured final answer.
