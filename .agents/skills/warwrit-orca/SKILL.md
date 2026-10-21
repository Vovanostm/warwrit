---
name: warwrit-orca
description: Run Warwrit GitHub issues through the Orca game-development workflow (v3) — epic contract first, one issue per PR, single-writer build per lane, deterministic validation, tiered review gates (reviewer, playtesting evaluator, visual critic for art), PR/CI, merge on gates — with headless Codex workers in their own worktrees. Use for one coordinator tick (scripts/orca-pipeline-tick.sh) or when the owner asks to implement issues through Orca.
---

# Warwrit game-development workflow in Orca (v3, 2026-10-19)

[AGENTS.md](../../../AGENTS.md) and [AGENT_TEAM](../../../docs/engineering/AGENT_TEAM.md#workflow-v3--contract-first-one-issue-per-pr-merge-on-gates--2026-10-19)
stay authoritative. Use the `orca` CLI (Orca.app, Git repos); `arca` is a
separate fork for the Arcadia/arc checkout and never manages Warwrit.

Goal: **merged PRs with playable proof per day.** Every rule below serves that
metric; ceremony that does not move a slice toward a merged, played result is
removed. Each tick report states the metric.

## Team

| Role           | Context           | Writes                                                        | Brief                                                  |
| -------------- | ----------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| Coordinator    | one tick, fresh   | labels, briefs, #217 notes                                    | this skill                                             |
| Contract       | fresh, read-only  | `.orca/<slice>/contract.md`                                   | [contract](prompts/contract.md)                        |
| Builder        | one per **lane**  | source, tests, commits                                        | [build](prompts/build.md), [rework](prompts/rework.md) |
| Reviewer       | fresh, read-only  | `.orca/<slice>/review-N.md`                                   | [review](prompts/review.md)                            |
| Evaluator      | fresh, read-only  | `.orca/<slice>/eval-N.md`                                     | [evaluate](prompts/evaluate.md)                        |
| Visual critic  | fresh, read-only  | `.orca/<slice>/visual-N.md`                                   | [visual](prompts/visual.md)                            |
| Scout          | fresh, read-only  | `.orca/scout/<date>/finding-N.md`                             | [scout](prompts/scout.md)                              |
| Epic architect | fresh, one writer | epic contract PR: interfaces, stubs, ownership map, task list | [epic-contract](prompts/epic-contract.md)              |
| Owner          | human             | `## Owner decision` on the epic; `agent:blocked` stops a PR   | —                                                      |

All workers append [common rules](prompts/common.md). Research basis:
[AGENT_TEAM](../../../docs/engineering/AGENT_TEAM.md#workflow-v3--contract-first-one-issue-per-pr-merge-on-gates--2026-10-19).

## Principles

- **One coordinator holds the lease** ([AGENTS.md § Orchestration](../../../AGENTS.md#orchestration)).
  `scripts/orca-pipeline-tick.sh` takes `.orca/pipeline/tick.lock/owner.txt`
  in the coordinator worktree. If another owner (for example a desktop mission)
  holds it, the tick prints that owner and exits; never delete a foreign lease.
  A mission that takes over writes its own `owner.txt` and inherits this
  skill's duties for its queue: labels, reconcile, cleanup, records.
- **The coordinator owns every state transition.** A worker report is a claim;
  advance only after re-reading GitHub (labels, PR, CI), the worktree's commits,
  verdict files and the `scripts/orca-validate.sh` exit code.
- **One writer per lane, parallel readers.** `lanes` in the slice plan cap
  concurrent builders (`web` 1, `core` 1). Contract writers, evaluators and
  critics are read-only and may run ahead or alongside: while one slice builds,
  the next slice's contract is prepared. At most 5 workers at once.
- **Contract, not plan review.** A short contract (what, how proven, function
  shape that passes the audit) replaces plan + plan review. The coordinator
  checks the contract's required sections itself; there is no review round.
- **A build ends in commits.** The builder iterates on `pnpm check:changes`
  inside its session until the normal commit succeeds; staged-but-uncommitted
  work is a failed build.
- **Evaluate the running game.** The evaluator reviews the diff with fresh
  context _and_ plays the changed journey in `pnpm dev:combat`. Tier V diffs (art, scene
  rendering, new visual elements) also get the visual critic, scored with
  [VISUAL_CRITIQUE](../../../docs/engineering/VISUAL_CRITIQUE.md); see Gate tiers.
- **Change technique before asking the owner.** A failure goes through the
  fallback ladder below; `needs-owner` is only for product/rule questions.
- **Owner delegation (2026-10-21):** «У тебя есть все полномочия по реализации -
  не спрашивай по мелочам». Evidence, proof format, process, sequencing,
  splitting and engineering choices are coordinator decisions: decide, write
  `Coordinator decision: …` in at most three lines on the issue, continue.
  `needs-owner` stays for game rules, canon, money, deployment, paid services
  and merges outside this skill.
- **The project never idles.** When a lane is free the coordinator refills it
  from the backlog; once a day it measures the pipeline and sends a scout to
  play main and find the next improvements (below).
- **The coordinator is the single writer of shared records** (`CHANGELOG.md`,
  `docs/engineering/CURRENT_PLAN.md`, wiki) and adds them to the PR branch
  right before merge.
  The `CURRENT_PLAN` status block is rewritten in place, at most 40 non-empty
  lines (`scripts/check-current-plan.sh` in CI); tick logs go to the tick files,
  not there. Its scope line quotes the owner's words (`Owner: «…»`), never the
  tick prompt.
- **Merge after the gates, without waiting for the owner.** Owner decision
  2026-10-19: «зачем мне верифицировать каждый pr? На это есть тесты и агент —
  ревьюер». The coordinator merges a PR when CI is green, `orca-validate.sh`
  exits 0 and the gates of its tier (below) are ACCEPT **for the gated code head** and main's newest `CI` run is green (or the PR closes the main-red `P0`, step 2a)
  (later commits may only add evidence, CHANGELOG/CURRENT_PLAN, or a merge of
  origin/main); one PR at a time, expected head SHA. `agent:blocked` on the PR or
  on any linked issue, or an owner decision, stops it. Scope: PRs the
  coordinator opens for slices and epic contracts. Infrastructure PRs outside
  slices keep the owner gate (`agent:merge-approved`).
- **One issue = one slice = one PR**, about 300 changed lines or less without
  tests. A slice or local override that lists several issues is split before
  its next start; for an open PR already over the limit see the end of the
  fallback ladder.
- **Contract first, then parallel.** A new epic starts with one epic contract
  PR (shared interfaces, optional protocol fields, stubs, file ownership map,
  task list marking parallel `[P]` and sequential issues); story slices start
  after it merges and code against it.
- **Ownership is resolved by the coordinator first** (`ownership_rules` in the
  slice plan): tests of owned modules belong to the slice; a file no active
  slice owns may be added (comment it on the issue); a file owned by an active
  slice is handled by sequencing (`after`).
- **Short records.** Issue and #217 comments are at most 5 lines per slice;
  evidence stays in worktree files referenced by path. Tick scratch files go
  under `.orca/pipeline/ticks/<stamp>/` only; durable coordinator state is
  `checkpoint.json` and `slices-local.json`.

## Inputs

- Backlog: open issues of epic #217 and sprint #161 (#167–#177), then any open
  issue with a `P0`–`P2` label, `agent:triage` findings once triaged.
- Slice plan: [`slices/epic-217.json`](slices/epic-217.json) — `lanes`, and per
  slice wave, name, lane, issues, ownership, `after`, notes and optional
  `tier` (D/L/U/V). A slice that spans tiers gets the union of their gates.
- Owner decisions: #217 comments whose first line starts with
  `## Owner decision`; only those count. Owner and coordinator share one GitHub
  account, so the coordinator never writes that heading.
- Worker briefs: [`prompts/`](prompts/common.md). Fill `{{SLICE}}`, `{{ISSUES}}`
  (with titles), `{{OWNERSHIP}}`, `{{ROUND}}`, `{{FINDINGS}}`, `{{EPIC}}`; always append
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
2. **Reconcile.** List open issues with `agent:*` labels, slice worktrees
   (`orca worktree list --repo id:<repo> --json`), open PRs and their checks.
   GitHub labels win; fix drift by commenting and relabelling, but never remove
   `agent:blocked` that this tick did not set. Every tick also fixes:
   - an issue whose PR merged without closing it: close it when the PR met its
     acceptance criteria, otherwise comment what is left and set [ready];
   - `agent:pr` or `agent:review` with no open PR or live gate worker: set the
     state the files prove (verdicts, commits) and comment once;
   - a slice worktree with staged or modified files and no live worker: record
     `git status --short` on the issue and keep the files for the next builder
     (build brief step 1); never discard them;
   - a merged or closed slice whose worktree still exists: remove it with
     `orca worktree rm` after checking it holds no unpushed commits;
   - an open coordinator-made PR that a merged PR superseded: close it with a
     link to the merged PR.
     Every tick also re-reads each `needs-owner` slice: when its question is not
     a game-rule, canon, money or deployment question, decide it under the owner
     delegation and resume the slice at the state its files prove.
     2a. **Main red first.** Read the newest run of the `CI` workflow on main
     (`gh run list --branch main --workflow CI --limit 1`). If it failed, rerun
     its failed jobs once (`gh run rerun <id> --failed`). If it fails again or
     the log shows a real defect, open or reuse one `P0` issue with the failing
     test, a log excerpt and the suspected cause; it takes the next free lane
     before any other refill. While main is red, merge only the PR that closes
     that `P0`, and hold — do not rework — a PR whose CI fails only on the same
     main-red test.
3. **Refill.** For each lane with no slice in [ready], [planning] or
   [implementing] and a free worker slot, take the highest-priority backlog
   issue that no slice covers and that is not `agent:blocked`/`needs-owner`:
   `P0` before `P1` before `P2`, epic #217 and sprint #161 first, older first.
   Add a one-issue slice to `.orca/pipeline/slices-local.json` (lane `core` for
   game-core/server/protocol work, else `web`; tier by Gate tiers; ownership
   from the contract's `## Changes`) and set [ready]. When the contract says the
   issue needs more than one PR, create the child issues it lists (`Part of
#N`, acceptance criteria copied), slice each, and keep the parent open until
   its children are done.
4. **Advance each slice** whose condition holds (labels in brackets):

| From           | Condition                                                                                                                                              | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ready]        | `after` slices done, worker slot free                                                                                                                  | create the slice's own worktree if missing (never reuse another slice's; `orca worktree create --repo id:<repo> --name <slice> --base-branch origin/main --no-parent --setup run --json`); start the contract writer; → [planning]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| [planning]     | `contract.md` has every required section                                                                                                               | wait for the lane's builder slot; write the build brief; start the builder; → [implementing]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [planning]     | a section is missing or the contract asks an open rule question                                                                                        | one contract revision with the gap; a rule question → `needs-owner`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [implementing] | builder done, new commits on the branch, clean tree                                                                                                    | → [validating]; run `bash scripts/orca-validate.sh <worktree>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [implementing] | builder failed                                                                                                                                         | fallback ladder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [validating]   | exit 0                                                                                                                                                 | start the gates of the slice tier (below) in parallel; → [review]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [validating]   | exit ≠ 0                                                                                                                                               | rework brief with the failing `.orca/validate-*.log` excerpts; → [implementing]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [review]       | every verdict file the tier needs (D: review; L: review + eval; U: eval; V: eval + visual) starts `VERDICT: ACCEPT` and names the current head SHA     | copy small JPEG evidence to `docs/engineering/evidence/<slice>/` and commit it (evidence-only commit after the gated SHA is allowed), push, `gh pr create` (one `Closes #N` per issue, proof, checks, risks); → [pr]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [review]       | any `BLOCKED_ENV`                                                                                                                                      | fix the environment it names (`scripts/orca-play.sh`, ports, missing capture) and re-run only that gate; this does not use the rework budget, but the same `BLOCKED_ENV` twice goes to fallback step 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [review]       | any `REWORK`                                                                                                                                           | rework brief with all findings; → [implementing]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [pr]           | CI failed                                                                                                                                              | rework brief with the failing job log excerpt; → [implementing] (the fix goes through validate and review again)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [pr]           | CI green, tier verdicts ACCEPT for the gated SHA, no `agent:blocked` on PR or issues, main's newest `CI` run green or this PR closes the main-red `P0` | if behind, `git merge origin/main` (no rebase, no force-push), re-run validate (a non-trivial conflict goes back to [review]); run `gh pr view <N> --json body --jq .body > .orca/<slice>/pr-body.md && bash scripts/check-pr-scope.sh origin/main .orca/<slice>/pr-body.md` (exit ≠ 0: fallback ladder step 3); record `pre=$(git rev-parse HEAD)`; add the CHANGELOG/CURRENT_PLAN commit; assert `git diff --name-only <gated-sha>..<evidence-commit>` ⊆ `docs/engineering/evidence/<slice>/` and `git diff --name-only $pre..HEAD` ⊆ {CHANGELOG.md, docs/engineering/CURRENT_PLAN.md}; push, wait CI, `gh pr merge --merge --match-head-commit <sha>`; → [done]; `orca worktree rm --worktree id:<repo>::<path> --run-hooks --json` |

5. **Daily** (once per calendar day; marker `.orca/pipeline/daily/<date>`):
   - `bash scripts/orca-metrics.sh 1 > .orca/pipeline/metrics/<date>.txt`;
     compare with the previous day. If failed worker runs or the REWORK share
     rose two days in a row, open one issue labelled `pipeline` with both
     numbers and one proposed change (pipeline PRs keep the owner merge gate).
   - Scout: when a worker slot is free, start [scout](prompts/scout.md) with
     `{{DATE}}`. On a later tick triage its `finding-N.md` files: skip
     duplicates of open issues, create at most three issues per day with
     their P label and acceptance criteria, and add them to the backlog.
6. **Report.** Comment on the epic only when a slice changes state or a PR
   merges, at most three lines. Once a day post the digest: merged PRs with
   playable proof, open PRs, the output of `bash scripts/orca-metrics.sh 1`,
   at most three owner questions with a recommended answer. Then stop.

`scripts/orca-pipeline-tick.sh` runs the model only when
`scripts/orca-state-digest.sh` differs from the state the last tick left (or
after 3 hours); the snapshot it passes is `.orca/pipeline/digest-before.txt`.

Slices started before v2: `plan.md` with an approving `plan-review-N.md`
counts as the contract, and for those slices only `review-N.md` counts as
`eval-N.md`. A `needs-owner`
slice whose issues are back in `agent:ready` resumes from its existing
worktree, applying the latest owner decision; never recreate the worktree.

Move issue labels only with `bash scripts/orca-issue-state.sh <state> <issues…>`.

## Gate tiers (v3)

| Tier | Change                                               | Gates before merge                                                      |
| ---- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| D    | docs, tests, tooling, prompts                        | CI, validate, fresh reviewer (`warwrit-review`)                         |
| L    | game-core / server logic, protocol (optional fields) | CI, validate, reviewer + evaluator plays the changed journey            |
| U    | HUD / UI in an existing layout                       | CI, validate, evaluator plays it and checks the issue's visual criteria |
| V    | art assets, scene rendering, new visual elements     | as U + visual critic with the full VISUAL_CRITIQUE rubric               |

Close-view sheets, equal-height comparisons and layer proofs belong to tier V;
their absence is never a REWORK reason for tiers D, L or U.

## Epic contract (v3)

For a new epic the coordinator first runs the epic architect
([brief](prompts/epic-contract.md)) as a pseudo-slice `epic-<N>-contract`
through the normal rows with three differences: its state labels live on the
epic issue; `prompts/epic-contract.md` replaces both the contract and the build
brief ([ready] → [implementing]); its PR says `Refs #<epic>` and never
`Closes` a story issue. Tier L; ownership = the shared files it must touch; it
does not start while an active slice owns any of them. Its PR adds the shared
types, optional protocol fields, stubs that compile and visibly do nothing yet,
seams, and the tracked files `docs/engineering/epics/<N>/contract.md` and
`tasks.md` (one line per issue: slice, lane, ownership, tier, `[P]` or
`after:`). When that PR is merged, the coordinator copies each task line into
`slices-local.json` as its own slice and moves its issue to [ready]; story
briefs cite the tracked contract.

## Fallback ladder

Rework rounds per slice: at most 2 (validate, CI and every gate verdict — review, eval,
visual — share the budget; `BLOCKED_ENV` does not count). When a build fails or the budget is spent, take the first step
that applies, once each, before `needs-owner`:

1. **Audit-only failure** (complexity/CRAP/unused code of the slice's own
   code): a fresh builder with a _restructure_ brief — split the named
   functions into sub-components/hooks/pure helpers with their own tests;
   thresholds and hooks are never weakened, `--no-verify` never used.
2. **Finding limited to one issue of the slice:** move that issue to a new
   follow-up slice (same lane, `after` this slice) in the slice plan, record it
   on the issue, and finish the slice without it.
3. **Slice too large** (several unmet criteria across issues): split into
   one-issue slices in the plan and restart from the contract.
4. Otherwise, or for a product/rule question: `needs-owner` with one question
   and a recommended answer, collected into a single `## Owner questions`
   comment on #217 per tick.

An open PR already over the size limit merges only with the owner's
`scope:owner-approved` label (validate then runs with `SCOPE_EXCEPTION=1`) and
passing gates for its head; otherwise its remaining issues become follow-up
slices built from its per-issue commits. Slices reach `done` only through a merged PR. New or split slices go to
`.orca/pipeline/slices-local.json` in the coordinator worktree (same shape as
the slice plan; entries override or extend it) and are listed in the #217
report; the owner folds them into the tracked plan later.

## Known Orca pitfalls (2026-10-18)

- Organization policy forbids `--dangerously-bypass-approvals-and-sandbox` and
  `--ask-for-approval never`; use `codex exec --approve-for-me` only.
- Orca-launched interactive Codex can lose the terminal foreground and stop on
  tty input (`T` state), keeping `~/.codex/logs_2.sqlite` locked so no other
  Codex starts. Never use TUI workers or `terminal send --interrupt` on them.
- Long prompts pasted into terminals can land in zsh. Pass briefs as files.
