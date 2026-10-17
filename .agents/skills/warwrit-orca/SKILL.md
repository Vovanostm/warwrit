---
name: warwrit-orca
description: Coordinate parallel Warwrit work in Orca — plan conflict-free waves from GitHub issues, start supervised workers in their own worktrees, review and integrate one PR at a time. Use when the owner asks to parallelize, fan out issues or run an epic with several agents; not for a single-writer task.
---

# Parallel Warwrit work in Orca

[AGENTS.md](../../../AGENTS.md) and [AGENT_TEAM](../../../docs/engineering/AGENT_TEAM.md#orca-parallel-worktrees--2026-10-18)
stay authoritative. Use the `orca` CLI (Orca.app, Git repos); `arca` is a
separate fork for the Arcadia/arc checkout and never manages Warwrit. Load
Orca's own guides first: `orca skills get orchestration`
(supervised runs) or `orca skills get orca-cli` (worktrees, handoffs).

## Rules that make parallel work fast

- **Writes stay single-threaded per slice.** One writer per worktree, branch and
  path set. Extra agents add intelligence (exploration, review, critique), not
  concurrent edits to the same files.
- **Plan waves by file ownership, not by issue count.** Two issues that edit the
  same hot file go into one writer or into consecutive waves.
- **Coordinator owns shared records.** Workers never edit `CHANGELOG.md`,
  `docs/engineering/CURRENT_PLAN.md` or shared wiki pages; they put the entry
  text in the PR body and `worker_done` report. The coordinator integrates.
- **Capacity on the owner's Mac (12 CPU, 36 GB):** at most 5 concurrent writer
  worktrees running dev servers or tests; read-only reviewers are extra. Full
  `pnpm verify`, coverage, stress and migration gates run one at a time —
  concurrent suites time out (seen 2026-10-17).
- **Merge one PR at a time** with owner permission, re-verify the next branch
  on the new main. A green branch does not prove the union.

## Hot files (one writer per wave)

| Area                | Files                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Combat scene        | `apps/web/src/combat-lab/sprite-battle-scene.ts`, `sprite-scene-markers.ts`, `battle-layout.ts` |
| Combat HUD shell    | `BattleView.tsx`, `CombatLab.tsx`, `battle-controls.css`, `battle-view.css`                     |
| Combat projection   | `packages/protocol/src/combat-lab.ts`, `apps/server/src/combat-lab/projection.ts`               |
| Rules               | `packages/game-core/src/combat/*` (versioned rulesets, replay)                                  |
| Lockfile/migrations | `pnpm-lock.yaml` (pnpm only), `apps/server/migrations/*` (never edit released)                  |

## Coordinator loop

1. Read the epic and its issues (`gh issue view <n>`). Owner decisions listed in
   the epic block the matching issues until answered or accepted.
2. Build waves: list each ready issue's files, group non-overlapping sets, keep
   dependency chains ≤ 3 deep. Projection/protocol changes go first.
3. `orca orchestration run-create --objective "<epic>"`, then one
   `orca orchestration worker-start --spec "<spec>" --worktree new-child
--name <issue-slug> --agent claude --setup run` per writer. Setup installs
   dependencies, builds workspace packages and assigns private combat-lab ports
   (`.worktree-ports`); the agent waits for it (`wait-for-setup`).
4. Worker spec = the issue's Target / Change / Constraints / Ownership /
   Acceptance, plus: "work only in this worktree; commit each step; open a PR
   with `Closes #<n>`; put CHANGELOG/plan text in the PR body; never merge".
5. While writers run, start read-only reviewers on finished PRs:
   `warwrit-critic` for diffs, `warwrit-visual-critic` for screenshots.
6. `orca orchestration check --wait --types worker_done,escalation,question`;
   answer questions, release settled workers, start the next wave.
7. Integrate: owner-approved merges one at a time, shared records updated once,
   then `orca worktree rm --worktree <id> --run-hooks` (the archive hook stops
   that worktree's dev servers).

## Stop conditions

Stop and ask the owner when two ready issues need the same hot file in one
wave, when a worker needs a rule/protocol change outside its issue, or when a
shared resource (PostgreSQL, campaign `pnpm dev` ports) would be used by two
writers at once.
