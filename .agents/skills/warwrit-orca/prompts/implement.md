# IMPLEMENT — {{SLICE}}

Issues: {{ISSUES}}
Ownership: {{OWNERSHIP}}
Approved plan: `.orca/{{SLICE}}/plan.md` (+ accepted review notes).

1. Implement the plan in small commits on this worktree's branch. Write the
   failing focused test first when a test is in the plan.
   Before each commit refresh focused coverage
   (`pnpm exec vitest related --run --coverage --mode coverage <changed files>`)
   and run `pnpm check:changes`: the pre-commit audit (complexity, CRAP, unused
   code against origin/main). Keep each new or changed function
   within its limits while writing — split by responsibility and cover the
   branches — instead of discovering the limits from a rejected commit.
2. Run the smallest relevant checks while working, then
   `bash scripts/orca-validate.sh` until it passes (rebase onto origin/main first).
3. For visible changes start `pnpm dev:combat` (private ports in
   `.worktree-ports`), default mill battle, and save before/after screenshots
   at 1440x900 day and night under `.orca/{{SLICE}}/shots/` (plus colour-vision
   emulation when the issue asks for it). Stop the dev server afterwards.
4. Write `.orca/{{SLICE}}/report.md`: what changed, every acceptance criterion
   with its proof, checks run with exact results (NOT_RUN where skipped),
   proposed CHANGELOG entry, risks.
   Do not push or open a PR; the coordinator does that after review.
   Set `report_path` to `.orca/{{SLICE}}/report.md` in your final answer.
