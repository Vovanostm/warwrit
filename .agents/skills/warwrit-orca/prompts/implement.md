# IMPLEMENT — {{SLICE}}

Issues: {{ISSUES}}
Ownership: {{OWNERSHIP}}
Approved plan: `.orca/{{SLICE}}/plan.md` (+ accepted review notes).

1. Implement the plan in small commits on this worktree's branch. Write the
   failing focused test first when a test is in the plan.
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
   Report with `worker_done --report-path .orca/{{SLICE}}/report.md`.
