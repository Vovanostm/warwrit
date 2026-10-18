---
name: warwrit-orca
description: Run Warwrit GitHub issues through the Orca issue pipeline — plan, plan review, implement, deterministic validation, independent review, PR/CI, owner-approved merge and shared docs — with headless Codex workers in their own worktrees. Use for one coordinator tick (scripts/orca-pipeline-tick.sh) or when the owner asks to implement issues through Orca.
---

# Warwrit issue pipeline in Orca

[AGENTS.md](../../../AGENTS.md) and [AGENT_TEAM](../../../docs/engineering/AGENT_TEAM.md#issue-pipeline-in-orca--2026-10-18)
stay authoritative. Use the `orca` CLI (Orca.app, Git repos); `arca` is a
separate fork for the Arcadia/arc checkout and never manages Warwrit.

## Principles

- **The coordinator owns every state transition.** A worker report is a claim;
  advance only after re-reading GitHub (labels, PR, CI), the worktree diff,
  verdict files and the `scripts/orca-validate.sh` exit code.
- **Writes stay single-threaded per slice.** One writer per worktree; planners
  and reviewers run in fresh contexts and do not edit source.
- **Bounded loops.** Plan review ≤ 2 rounds, code review/rework ≤ 2, CI rework
  ≤ 2; then label `agent:needs-owner` and comment the evidence. Exception
  (owner, 2026-10-18): when the only remaining blocker is the commit audit
  (complexity/CRAP of the slice's own functions), allow one more bounded
  recovery — structural simplification plus real coverage, normal commit; never
  weaken thresholds or hooks.
- **Resume after an owner decision.** A `needs-owner` slice whose issues are
  back in `agent:ready` resumes from its existing worktree and records, applying
  the latest owner decision on #217 (plan → planner revision and the next review
  round; implementation → the allowed recovery). Do not recreate the worktree.
- **The coordinator is the single writer of shared records** (`CHANGELOG.md`,
  `docs/engineering/CURRENT_PLAN.md`, wiki) and adds them to the PR branch
  right before merge.
- **Merge only with `agent:merge-approved`** on the PR, set by the owner; one PR
  at a time, expected head SHA. Without it, stop at `agent:pr`.
- **Ownership is resolved by the coordinator first.** Apply `ownership_rules`
  in the slice plan: tests of owned modules belong to the slice; a file no
  active slice owns may be added (comment it on the issue); a file owned by an
  active slice is handled by sequencing (`after`). Only what sequencing cannot
  solve, or a product/rule question, becomes `agent:needs-owner`.
- **Capacity:** ≤ 5 slices in `planning`/`implementing`/`review` at once;
  `orca-validate.sh` and PR CI one slice at a time.

## Inputs

- Slice plan: [`slices/epic-217.json`](slices/epic-217.json) — wave, slice name,
  issues, ownership, `after` dependencies, notes. Owner decisions are in issue
  #217 comments; only those count as decisions.
- Worker briefs: [`prompts/`](prompts/common.md). Fill `{{SLICE}}`, `{{ISSUES}}`
  (with titles), `{{OWNERSHIP}}`, `{{ROUND}}`, `{{FINDINGS}}`; always append
  `prompts/common.md`; add the slice `note`.
- Worker result schema: [`worker-result.schema.json`](worker-result.schema.json).

## Workers are headless Codex

Organization MDM policy allows Codex approvals `untrusted`/`on-request` and
sandboxes `read-only`/`workspace-write` only; interactive Codex TUIs launched
by Orca also lose the terminal foreground. Every worker therefore runs
`codex exec --approve-for-me` through two scripts:

```bash
# from the slice worktree; brief file lives in that worktree
bash scripts/orca-start-worker.sh <run> <task-id> <worktree-path> .orca/tasks/<name>.md
```

It opens a plain Orca terminal, binds a Dispatch to it and runs
`scripts/orca-codex-worker.sh`, which sends `worker_done` with the structured
result. Logs: `<worktree>/.orca/runs/<task-id>/`. Briefs must say "do not call
`orca`"; the wrapper reports.

## One tick (what to do, in order)

Environment: `ORCA_TERMINAL_HANDLE` is the coordinator mailbox; the run id and
repo id are in the tick prompt. Work from the coordinator worktree.

1. **Mail.** `orca orchestration check --run <run> --json` (no wait). For each
   message: record it on the slice, then `--ack` the delivery and
   `orca orchestration worker-release --dispatch <id>` for settled workers.
2. **Reconcile.** List open issues with `agent:*` labels
   (`gh issue list -R Vovanostm/warwrit --search 'label:"agent:…"'`), slice
   worktrees (`orca worktree list --repo id:<repo> --json`), open PRs and their
   checks. GitHub labels win; fix drift by commenting and relabelling.
3. **Advance each slice** whose condition holds:

| From           | Condition                                                           | Action                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none)         | issues labelled `agent:ready`, `after` slices `done`, capacity free | `orca worktree create --repo id:<repo> --name <slice> --base-branch origin/main --no-parent --setup run --json`; write plan brief; start planner; state `planning`                                                                           |
| `planning`     | planner done, `plan.md` exists                                      | start plan reviewer (fresh terminal) with round N                                                                                                                                                                                            |
| `planning`     | `plan-review-N.md` starts `VERDICT: APPROVE`                        | write implement brief; start writer; state `implementing`                                                                                                                                                                                    |
| `planning`     | `VERDICT: REVISE`, N < 2                                            | planner revises with the findings; new review round                                                                                                                                                                                          |
| `implementing` | writer `worker_done` succeeded and `report.md` exists               | state `validating`; run `bash scripts/orca-validate.sh <worktree>`                                                                                                                                                                           |
| `validating`   | exit 0                                                              | start reviewer (fresh); state `review`                                                                                                                                                                                                       |
| `validating`   | exit ≠ 0                                                            | rework brief with the failing `.orca/validate-*.log` excerpts; state `implementing`                                                                                                                                                          |
| `review`       | `review-N.md` starts `VERDICT: ACCEPT`                              | copy small JPEG evidence to `docs/engineering/evidence/<slice>/`, commit, push branch, `gh pr create` (one `Closes #N` per issue, report proof, checks, risks); state `pr`                                                                   |
| `review`       | `VERDICT: REWORK`, N < 2                                            | rework brief; state `implementing`                                                                                                                                                                                                           |
| `pr`           | CI failed, rounds < 2                                               | rework brief with the failing job log excerpt; then push again                                                                                                                                                                               |
| `pr`           | CI green and PR has `agent:merge-approved`                          | rebase on origin/main if behind (re-run validate), add CHANGELOG/CURRENT_PLAN entry commit, push, wait CI, `gh pr merge --merge --match-head-commit <sha>`; state `done`; `orca worktree rm --worktree id:<repo>::<path> --run-hooks --json` |
| any            | loop limit reached or a rule/ownership conflict                     | state `needs-owner` (or `blocked`) with an issue comment naming the evidence                                                                                                                                                                 |

4. **Report.** If anything changed, post one short comment on epic #217
   (slice → state, PR links). Then stop.

Move issue labels only with `bash scripts/orca-issue-state.sh <state> <issues…>`.

## Known Orca pitfalls (2026-10-18)

- Organization policy forbids `--dangerously-bypass-approvals-and-sandbox` and
  `--ask-for-approval never`; use `codex exec --approve-for-me` only.
- Orca-launched interactive Codex can lose the terminal foreground and stop on
  tty input (`T` state), keeping `~/.codex/logs_2.sqlite` locked so no other
  Codex starts. Never use TUI workers or `terminal send --interrupt` on them.
- Long prompts pasted into terminals can land in zsh. Pass briefs as files.
