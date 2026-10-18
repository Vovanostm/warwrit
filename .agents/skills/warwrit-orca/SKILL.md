---
name: warwrit-orca
description: Run Warwrit GitHub issues through the Orca issue pipeline — plan, plan review, implement, deterministic validation, independent review, PR/CI, owner-approved merge and shared docs — with Codex workers in their own worktrees. Use when the owner asks to implement issues or an epic through Orca orchestration, or for one pipeline tick of the scheduled automation.
---

# Warwrit issue pipeline in Orca

[AGENTS.md](../../../AGENTS.md) and [AGENT_TEAM](../../../docs/engineering/AGENT_TEAM.md#issue-pipeline-in-orca--2026-10-18)
stay authoritative. Use the `orca` CLI (Orca.app, Git repos); `arca` is a
separate fork for the Arcadia/arc checkout and never manages Warwrit. Read
`orca skills get orchestration` once per session for the exact flag set.

## Principles

- **The coordinator owns every state transition.** A worker report is a claim;
  advance only after re-reading GitHub (labels, PR, CI), the worktree diff and
  `scripts/orca-validate.sh` exit code.
- **Writes stay single-threaded per slice.** One Codex writer per worktree and
  path set; planners and reviewers are read-only and use fresh contexts.
- **Bounded loops.** Plan review ≤ 2 rounds, code review/rework ≤ 2 rounds, CI
  rework ≤ 2 rounds; then `agent:needs-owner` with the evidence.
- **Coordinator is the single writer of shared records** (`CHANGELOG.md`,
  `CURRENT_PLAN.md`, wiki). It adds them to the PR branch just before merge.
- **Merge only with `agent:merge-approved`** on the PR (set by the owner) or an
  owner decision recorded in the PR/epic; one PR at a time, expected head SHA.
- **Capacity:** ≤ 5 writers at once on this Mac; heavy gates one at a time.

## Slices

A slice is one writer's work: one or more issues with disjoint ownership,
taken from the epic's wave table (issue #217 comments). Slice name:
`uix-<wave>-<area>`, worktree `~/orca/workspaces/warwrit/<slice>`, branch from
`origin/main`. Track state on every issue in the slice with
`scripts/orca-issue-state.sh <state> <issues…>`.

## State machine

| State                     | Who                                         | Exit condition (coordinator checks)                           |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `ready`                   | owner/coordinator labels the issues         | worktree created, `planning` set                              |
| `planning`                | Codex planner → fresh plan reviewer         | `plan-review-N.md` says `VERDICT: APPROVE`                    |
| `implementing`            | Codex writer                                | `worker_done` succeeded **and** report present                |
| `validating`              | coordinator runs `scripts/orca-validate.sh` | exit 0; else rework (back to `implementing`)                  |
| `review`                  | fresh reviewer (Claude or Codex)            | `review-N.md` says `VERDICT: ACCEPT`; else rework             |
| `pr`                      | coordinator pushes, opens PR, CI runs       | CI green **and** `agent:merge-approved`; CI red → rework      |
| `done`                    | coordinator merges, writes shared docs      | PR merged, issues closed, worktree removed with `--run-hooks` |
| `blocked` / `needs-owner` | anyone                                      | owner answer or unblocking change; comment says why           |

## Commands (coordinator)

Run inside an Orca terminal, or export `ORCA_TERMINAL_HANDLE=<mailbox handle>`.
Prompt templates live in [`prompts/`](prompts/); fill `{{SLICE}}`, `{{ISSUES}}`,
`{{OWNERSHIP}}`, `{{ROUND}}`, `{{FINDINGS}}` and append `prompts/common.md`.

```bash
orca orchestration run-create --objective "<epic/wave>" --json
orca worktree create --repo id:<repoId> --name <slice> --base-branch origin/main --no-parent --setup run --json
orca orchestration task-create --spec "<plan prompt>" --task-title "<slice> plan" --json
orca orchestration task-create --spec "<plan-review prompt>" --task-title "<slice> plan review" --deps '["<plan task>"]' --json
orca orchestration worker-start --task <id> --worktree id:<repoId>::<path> --agent codex --json
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
bash scripts/orca-validate.sh <path>
orca orchestration gate-create --task <merge task> --question "Merge PR #N?" --options '["yes","no"]' --json
```

Writers: `--agent codex`. Reviewers: `--agent claude` or a second Codex with
the `warwrit_reviewer` profile model, always a new terminal (fresh context).
Reuse the writer's terminal for its rework (`worker-start --task <rework>
--terminal <handle>`), release planners/reviewers after their report.

## PR and merge

1. `git push -u origin <branch>`; `gh pr create` with one `Closes #N` per
   issue, the report's acceptance proof, checks and risks. Commit only small
   JPEG evidence under `docs/engineering/evidence/<slice>/`.
2. Wait for CI through the app/`gh pr checks`; failure → rework task with the
   failing log excerpt.
3. With CI green and `agent:merge-approved`: rebase on `origin/main` if needed,
   add the CHANGELOG/CURRENT_PLAN/wiki entries as one coordinator commit, wait
   for CI again, `gh pr merge --merge --match-head-commit <sha>`, then
   `scripts/orca-issue-state.sh done …` and `orca worktree rm --worktree <id>
--run-hooks`.

## Known Orca pitfalls (2026-10-18)

- `terminal send --interrupt` suspends a Codex TUI (process state `T`) instead
  of interrupting it; a suspended Codex keeps `~/.codex/logs_2.sqlite` locked
  and every new Codex fails to start. Never interrupt agents; quit them.
- A Codex update prompt blocks Orca's readiness (`agent-update-prompt`). Keep
  the Codex CLI on PATH current before a wave.
- Long prompts pasted into a non-ready terminal land in zsh. Use `worker-start`
  (it waits for readiness) instead of `terminal send` for task text.
