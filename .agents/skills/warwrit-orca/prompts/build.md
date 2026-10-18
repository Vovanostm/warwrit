# BUILD — {{SLICE}}

Issues: {{ISSUES}}
Ownership: {{OWNERSHIP}}
Contract: `.orca/{{SLICE}}/contract.md`.

You are the only writer in this lane. Finish with commits; uncommitted or
staged-only work counts as a failed build.

1. If staged or modified files already exist in this worktree, they are an
   earlier attempt: keep what fits the contract and continue from it.
2. Implement issue by issue, smallest player-visible step first. Write the
   failing focused test first when the contract names one.
3. Before every commit refresh focused coverage
   (`pnpm exec vitest related --run --coverage --mode coverage <changed files>`)
   and run `pnpm check:changes`. If the audit names a function, restructure it
   (extract a sub-component, hook or pure helper and test it) and retry. Commit
   normally after each issue; never `--no-verify`, never weaken thresholds.
4. Rebase onto origin/main, then run `bash scripts/orca-validate.sh` until it
   passes.
5. Smoke-play the changed journey: `pnpm dev:combat` (private ports in
   `.worktree-ports`), default mill battle, with the `playwright` skill. Save
   1440x900 day and night screenshots under `.orca/{{SLICE}}/shots/` (plus
   colour-vision emulation when an issue asks for it). Stop the dev server.
6. Write `.orca/{{SLICE}}/report.md`: commits, every acceptance criterion with
   its proof, checks with exact results (NOT_RUN where skipped), proposed
   CHANGELOG entry, risks. Do not push or open a PR.
   Set `report_path` to `.orca/{{SLICE}}/report.md` in your final answer.
