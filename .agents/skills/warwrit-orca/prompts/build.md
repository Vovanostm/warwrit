# BUILD — {{SLICE}}

Issues/accepted contract: {{ISSUES}}
Ownership: {{OWNERSHIP}}
The assignment must name execution mode, resource and validation owners.

1. Inspect actual base/branch/dirty state. Existing changes may belong to someone
   else; establish ownership before continuing them. Never reset or overwrite WIP.
2. Extract outcome, decisive criteria/regressions, source/rule owner, producers/
   consumers, write boundary and verification from the existing issue/contract.
   Resolve only solution-changing uncertainties by reading source or a safe probe.
   Do not add a contract agent/document when inputs already suffice.
3. Implement the shortest cohesive result. Reuse existing regressions; add a test
   for a real defect or important uncovered risk. No stub/caller-count tests or
   automatic refactor triggered only by metrics. Audit findings need a confirmed
   cause and a minimal owning fix; hooks/thresholds remain effective.
4. The assigned check owner runs focused checks/proportional `orca-validate.sh`.
   Preserve applicable results; rerun affected checks after code/config/environment
   changes. Branch owner commits finished steps; delegated editor returns the diff.
5. For gameplay/visual work, play the actual affected journey with explicitly
   assigned private resources. Capture required desktop/day/night evidence and
   stop only your resources. Tooling/docs work needs no invented game journey.
6. For changed player text prepare `.orca/{{SLICE}}/text.md`: lines in player
   order, screen/speaker, required localizations and established mechanic facts.
7. Write `.orca/{{SLICE}}/report.md`: criteria and proof, revision/dirty delta,
   commands/environment/outcomes (NOT_RUN when skipped), risks and proposed shared
   doc entries. Include rework causes and actual available token/time data;
   missing measurements are NOT_MEASURED. Do not push or open a PR.

Set report_path to `.orca/{{SLICE}}/report.md` in the structured final answer.
