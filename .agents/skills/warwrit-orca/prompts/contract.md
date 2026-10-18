# CONTRACT — {{SLICE}}

Issues: {{ISSUES}}
Ownership: {{OWNERSHIP}}

Read-only: do not edit source. Write `.orca/{{SLICE}}/contract.md`, at most
about 80 lines, with exactly these sections:

1. `## Scope` — per issue, the player-visible result in one or two sentences,
   and what is explicitly out of scope.
2. `## Changes` — files and functions to change on current main (issue links
   may point to older commits), each with a reason. Shape new logic as small
   functions, hooks and sub-components so each stays within the commit audit
   (`pnpm check:changes`: cyclomatic/cognitive complexity, CRAP).
3. `## Data` — protocol/projection changes (optional fields only) and
   compatibility with old replays and projections; "none" if none.
4. `## Proof` — every acceptance criterion of every issue → how it is proven:
   focused test, command output, or the playtest step and screenshot
   (1440x900 day and night) the evaluator will repeat.
5. `## Questions` — only product/rule questions the issues and owner decisions
   do not answer, each with a recommended answer; "none" if none. Anything
   outside ownership is listed here too.

If `.orca/{{SLICE}}/plan.md` or earlier review files exist, reuse them and fix
what they flagged instead of starting over.
Set `report_path` to `.orca/{{SLICE}}/contract.md` in your final answer.
