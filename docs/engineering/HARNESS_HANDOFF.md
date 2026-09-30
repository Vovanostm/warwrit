# Harness and quality lane: next-session handoff

Status: 2026-09-30 checkpoint of the Claude Code sessions that delivered PRs
#125–#132 and opened #133. It covers only agent tooling, quality gates and their evidence. The M1
product lane (Codex/Luna/Sol) continues from [CURRENT_PLAN](CURRENT_PLAN.md) and
Codex's own session handoff; this page does not assign product work or ownership.

## Start

1. Run `pnpm agent:preflight` and `pnpm agent:status` (the Claude `SessionStart`
   hook does this; confirm its output is in context). Refresh every fact below.
2. The primary checkout `/Users/vovanostm/learn/warwrit` may hold another agent's
   uncommitted work (observed 2026-09-30: Codex planning edits, a new orchestrator
   role, M1 plan and handoff drafts). Never stage, reset or switch branches there;
   use a separate worktree from `origin/main`.
   Create it with an absolute path: `git -C <repo> worktree add ../x` resolves
   `../x` against the process cwd, not `<repo>`.
3. `pnpm agent:preflight` prints `git gate: active` once #133 is merged and the
   clone ran `pnpm run prepare`; `INACTIVE` means commits reach CI unchecked.
4. Containers run on colima ([LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#container-runtime-colima)).

## Delivered (merged to main)

| PR   | Result                                                                                                                                                                                                                                                                                                                     | Evidence                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| #125 | fallow: whole-tree dead code in `pnpm verify`; `pnpm check:changes` (audit, new findings only) in PR CI; `pnpm report:quality`. ast-grep rules with rule tests (`pnpm check:patterns`)                                                                                                                                     | CI green; gates green on main                                                                                                             |
| #128 | `pnpm test:coverage` (v8, `coverage` mode resolves `@warwrit/*` to source); encounter + OIDC PostgreSQL specs in `pnpm test:migrations` (CI had skipped them); encounter auth hook; `isEncounterId` owned by protocol; locale-independent combat ordering (`compareCodeUnits`); duty-change learning settlement regression | Main CI run 36600043705: OIDC 1 and encounter 4 specs pass; stress digest `f7bb6816…abbae` unchanged; each new spec kills its hand mutant |
| #130 | colima runtime docs; `CHANGELOG.md`; `.prettierignore` for personal Claude settings                                                                                                                                                                                                                                        | CI green                                                                                                                                  |
| #131 | `pnpm agent:status`: live main, CI, open PRs, active writer branches, next migration                                                                                                                                                                                                                                       | Unauthenticated path prints `NOT_AVAILABLE`                                                                                               |
| #132 | Claude `SessionStart` status hook; fallow commit/push gate (`PreToolUse`); agents `warwrit-critic` (read-only, role from `.codex/agents/warwrit_reviewer.toml`) and `warwrit-scribe` (docs only)                                                                                                                           | Gate probe in a temporary worktree: unused file → exit 2, `verdict: fail`; clean change passes (~18 s)                                    |

Open: #133 (branch `chore/git-push-gate`), handoff item 1. Tracked Git
`pre-commit` and `pre-merge-commit` hooks run `pnpm check:changes` against the
merge-base with `origin/main` for every agent; `prepare` sets `core.hooksPath`;
Markdown-only commits skip; Codex rules prompt on `git commit --no-verify`/`-n`.
Evidence in the PR body: unused file rejected from `env -i /bin/sh`, clean merge
with an unused file rejected, full gate green. Merge needs owner permission.
The owner clone's shared `.git/config` already has
`core.hooksPath=scripts/git-hooks` (inert in worktrees without that directory).

Main at this checkpoint: `47c26c4`, tree `bc06495`, CI success (run 36628079931).

## Not yet proven

- Hooks and agents loading in a fresh Claude Code session: `NOT_RUN` (owner action).
- Harness effect on delivery quality ([HARNESS_EVAL](HARNESS_EVAL.md)): `NOT_RUN`.
- Canonical Airtable/Empirical checkpoint for #125–#132: `NOT_RUN` (no Airtable
  access in that session).

## Next work: agent-ready briefs

Each brief is self-contained. Owner selection is still required; "Writes" is
the only path set the writer may touch, and two briefs with disjoint writes may
run in parallel. Acceptance is the observable result, not a document saying so.

### H1. Remove the duplicate Claude gate (after #133 merges)

- Why: with the Git hook active, the Claude `PreToolUse` fallow gate reruns the
  same audit on every Claude commit (~10 s). One gate, one owner.
- Writes: `.claude/settings.json`, `.claude/hooks/fallow-gate.sh`, `CHANGELOG.md`.
  The auto-mode classifier blocks Claude from editing its own hook settings, so
  the owner applies it, or a Codex writer does in a PR the owner approves.
- Change: delete the `PreToolUse` Bash hook and the script; add
  `Bash(git commit --no-verify*)`, `Bash(git commit * --no-verify*)` and
  `Bash(git commit -n*)` to `permissions.ask`.
- Accept: a Claude `git commit` of an unused file is rejected once (by the Git
  hook), and `git commit --no-verify` asks the owner.
- Precondition: `pnpm agent:preflight` shows `git gate: active` in the checkouts
  Claude uses; without it the Claude gate is the only local gate.

### H2. Measured coverage in the audit (CI and local)

- Why: the audit scores CRAP from static estimates; #129's false positive came
  from that. If only CI gets coverage, the local hook becomes stricter than CI
  and agents learn to bypass it.
- Writes: `.github/workflows/ci.yml`, `scripts/git-hooks/pre-commit`,
  `.fallowrc.jsonc`, `docs/engineering/LOCAL_DEVELOPMENT.md`, `CHANGELOG.md`.
- Change: CI runs `pnpm test:coverage` and passes
  `--coverage coverage/coverage-final.json` to `pnpm check:changes`. Decide and
  document the local rule (e.g. static CRAP locally with the same threshold, or
  use coverage only when it is newer than every changed file); do not use stale
  coverage silently.
- Accept: CI time delta recorded from two runs; an untested trivial function
  no longer fails CI; the local hook verdict on the same change is documented.

### H3. Run HARNESS_EVAL E1–E4

- Writes: `docs/engineering/HARNESS_EVAL.md` results table only; runs happen in
  disposable worktrees, never the primary checkout.
- Baseline = task parent commit as is; current = parent plus today's
  `AGENTS.md`, skills, `.claude/`, `.codex/` and `scripts/git-hooks/`. Two runs
  each, same model.
- Accept: scored table with real token/time telemetry, or `NOT_MEASURED`.

### H4. Canonical checkpoint for #125–#133

- Needs Airtable access (base `apph3bj1NyVrfJeLM`, Empirical tag `Warwrit`);
  until then `NOT_RUN`. Record merged PRs, main SHA and CI run with readback.

### H5. Refresh the Codex `pb*` worktrees (their writers, not this lane)

- `codex/pb-lab-union`, `pb02`, `pb03`, `pb04` were 56–58 commits behind main on
  2026-09-30, predate fallow (#125) and have no `node_modules`: no local gate.
- Each writer merges `main` and runs `pnpm install`; `pnpm agent:preflight`
  must then print `git gate: active`.

### H6. Optional: enforce `warwrit-scribe` write scope

- `PreToolUse` hook on Edit/Write limited to the scribe's documented paths.
  Same owner-applied constraint as H1.

Parallel-safe now: H2 with H3 (disjoint writes), H4, H5. H1 waits for #133.

## Known inherited signals (leads, not defects)

- ast-grep: 10 `double-cast` warnings in game-core company code.
- fallow: health 75 (B); `prepareEconomyCandidate` cyclomatic 102 but measured
  coverage 94.9%, so refactoring is low priority; duplication ~2.6% after #126.
  Consolidate only after `warwrit-review` confirms one shared rule.
- PR #129 (Codex art pilot) failed `check:changes` before #128; merging main clears
  it (verified in a temporary worktree). Its writer owns that merge.

## Constraints learned

- The auto-mode classifier blocks the agent from editing its own permission and
  hook settings ("Self-Modification"); prepare copy-paste commands for the owner.
- Merges run only with owner permission recorded on the PR; the owner's local
  `.claude/settings.local.json` allows `gh pr merge * --squash --match-head-commit *`.
  Always pass the full head SHA and read back the main tree.
- When merging main into a branch, resolve conflicts only after proving each
  discarded side is already contained (compare blob hashes).
