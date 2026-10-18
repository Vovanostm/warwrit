# PLAN — {{SLICE}}

Issues: {{ISSUES}}
Ownership: {{OWNERSHIP}}

Read-only task: do not edit source. Write `.orca/{{SLICE}}/plan.md` with:

1. Files and functions to change (current main; issue links point to an older
   commit), with the reason for each. Shape new UI logic into small functions
   that pass the commit audit (`pnpm check:changes`: complexity and CRAP).
2. Data contract changes (optional projection fields), compatibility with old
   replays/projections.
3. Test plan: which existing tests change, which focused tests are added and why
   (defect or important uncovered risk only).
4. Acceptance mapping: every acceptance criterion of every issue → how it will be
   proven (test, command output, screenshot at 1440x900 day/night).
5. Risks, open questions, anything outside ownership.
   Set `report_path` to `.orca/{{SLICE}}/plan.md` in your final answer.
