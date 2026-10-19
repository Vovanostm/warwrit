# EPIC CONTRACT — epic #{{EPIC}}

Issues: {{ISSUES}}

You are the only writer. Goal: let several builders work on these issues in
parallel without inventing shared contracts independently.

1. Read every issue, the owner decisions on the epic and the owning wiki pages.
2. Write `.orca/epics/{{EPIC}}/contract.md` (about 100 lines): player outcome of
   the epic; shared types and function signatures; protocol changes (optional
   fields only) and replay compatibility; UI layout slots or seams that let
   issues edit different files; file ownership map per issue.
3. Implement only the shared skeleton: types, optional fields, stubs that
   compile and visibly do nothing yet, and seams (extract a module or slot so
   two issues no longer edit the same function). No feature behaviour.
4. Write `.orca/epics/{{EPIC}}/tasks.md`: one line per issue — slice name,
   lane, ownership, `[P]` or `after: <slice>`, tier (D/L/U/V), expected size.
   Any issue larger than about 300 changed lines is split into two lines.
5. Commit with focused coverage and `pnpm check:changes`, run
   `bash scripts/orca-validate.sh`, write `.orca/epics/{{EPIC}}/report.md`.
   Set `report_path` to the report in your final answer.
