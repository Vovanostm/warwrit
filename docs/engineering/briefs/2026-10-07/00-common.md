# 00 — Common contract for every brief

Every brief in this folder is executed together with this file. Read both in
full before the first edit. Where a brief is stricter, the brief wins; where
AGENTS.md is stricter than either, AGENTS.md wins.

## 1. Authority and mandatory reading

Read in full, in this order:

1. `AGENTS.md`, `CLAUDE.md`.
2. `docs/wiki/vision.md` — genre, references, MMO fit, REQ-01..19.
3. `docs/wiki/world/index.md`, `docs/wiki/world/porechye.md` — world and region.
4. `docs/engineering/CURRENT_PLAN.md` — the top entries (live status).
5. Every file listed under **Must read** in your brief.

Owner decisions are quoted verbatim in each brief. They outrank any older text.
If two sources disagree and no dated owner decision settles it, stop and ask (§8).

## 2. Workspace

- Base: the commit the parent gives you. Verify with `git log -1` and record it.
- Worktree: `.claude/worktrees/<brief-id>` (Claude Code) or
  `~/.codex/worktrees/<brief-id>` (Codex). Never `/tmp` or `/private/tmp`.
- Branch: `claude/<brief-id>-<slug>` or `codex/<brief-id>-<slug>`.
- Commit every finished step: `<area>: <what> (<brief-id> step N)`, body with
  the checks run. Uncommitted work is not progress. No force-push, no merge,
  no PR unless the parent asks.
- Evidence (screenshots, logs, replays) goes to `output/<brief-id>/` in your
  worktree; it is untracked. Name such files by path in the handoff; do not
  link them from committed documents.

## 3. Hard invariants

- `packages/game-core` is pure: no I/O, no clock, no randomness except explicit
  inputs; deterministic; serializable. Cross-package imports via `@warwrit/*`.
- Commands are validated and rejected without partial mutation. Money is exact
  (bigint Q units). Ownership is unique. Public and private knowledge stay separate.
- Never edit a released migration; add a new ordered up/down pair.
- One writer per path. Touch only your **Allowed paths**. Shared files
  (`CHANGELOG.md`, `docs/engineering/CURRENT_PLAN.md`, `docs/wiki/index.md`,
  `docs/wiki/log.md`, `AGENTS.md`) are the parent's: hand over exact additive text.
- Player strings: your own catalogue pair `apps/web/src/i18n/<area>.ru.ts` and
  `<area>.en.ts`, registered with one spread line each in `ru.ts` and `en.ts`.
  Keys are built from stable game IDs (`<area>.<id>.<part>`). No concatenated
  sentences; parameters only.
- No new runtime dependency, framework, service, Redis or second lockfile
  without asking (§8). Generated files change only through their tool.

## 4. Quality bar

**Code.** Intention-revealing names; one reason to change per module; policy
separate from transport and storage; no speculative abstraction, no dead code.
Tests through public boundaries for determinism, conservation, authorization,
privacy, atomicity and idempotency of what you add. No per-helper tests, no
coverage targets, no snapshot of catalogues.

**Text.** `docs/wiki/world/writing.md` and `docs/wiki/world/literary-style.md`.
Named people with a want and a silence; concrete things; no banned words in
player text; read aloud. English must be natural, not word-for-word.

**Visual.** `AGENTS.md` art policy and `docs/engineering/VISUAL_CRITIQUE.md`:
ink/flat-wash, one projection, credible materials, readable by day and night.

**Gameplay.** The feature is played in the real running game along the journey
named in the brief. A scripted test or a diagnostic screen is not a journey.

## 5. Critique loop

Self-review is required but never acceptance. Use the critics that match what
you changed; every applicable critic must return **ACCEPT**.

| What changed                       | Critic (Claude / Codex)                              | Give it                                                                                         |
| ---------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Code (any)                         | `warwrit-critic` / `warwrit_reviewer`                | Frozen diff `base..HEAD`, the brief, the AC list, test commands and outputs                     |
| Player-facing text                 | `warwrit-text-critic` / `warwrit_text_critic`        | Full text in player order ru+en with speaker/screen; mechanics facts; `TEXT_CRITIQUE.md`        |
| Anything visible (UI, art, scenes) | `warwrit-visual-critic` / `warwrit_visual_critic`    | Images per `VISUAL_CRITIQUE.md`: references, side-by-side, in-game day and night, motion frames |
| Played journey                     | `warwrit-critic` / `warwrit_reviewer` (journey mode) | Step-by-step journey log with screenshots, the AC list, the owner decisions                     |

Rules:

1. Give inputs, not conclusions; send your change list only after scoring.
2. Fix every confirmed material finding; re-run the **full** review, not a
   readback of the fixes.
3. Maximum three rounds per critic. A criterion stuck at 1 or below for two
   rounds requires an approach change, not more tuning. After three rounds
   without ACCEPT, stop and report to the parent with the scores (§8).
4. Owner-taste questions go to the handoff; they never offset a failing score.
5. Record each round: critic, revision, verdict, scores, findings, what changed.

## 6. Verification commands

Run the smallest set that covers your change, one at a time.

| Change                | Command                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| game-core             | `pnpm vitest run packages/game-core/src/<area>`                             |
| server                | `pnpm vitest run apps/server/src/<area>`                                    |
| web                   | `pnpm --filter @warwrit/web typecheck` and `pnpm vitest run apps/web/src`   |
| any TS                | `pnpm exec eslint <changed paths>` and `pnpm exec prettier --check <paths>` |
| migrations            | `pnpm test:migrations` (needs the local PostgreSQL from `pnpm db:up`)       |
| combat rules or AI    | `pnpm test:combat:stress`                                                   |
| docs only             | `pnpm exec prettier --check <paths>`; local links resolve                   |
| final, before handoff | `pnpm typecheck` and `pnpm vitest run` once                                 |

Running the game: `docs/engineering/LOCAL_DEVELOPMENT.md` (`pnpm db:up`,
`pnpm db:migrate:up`, `pnpm dev`, fixture accounts). If the stack cannot start,
report it as a blocker; never mark a journey PASS without playing it.

A failed or skipped check is `NOT_RUN` or `FAIL`, never PASS. A test that timed
out next to another heavy job is rerun alone once before being reported.

## 7. Definition of done

All of these, with evidence:

1. Every acceptance criterion (AC) of the brief is met; each has its evidence
   (test name, command output, screenshot path, journey step).
2. Every applicable critic returned ACCEPT in the last round.
3. Checks from §6 pass on the final commit.
4. The owning work-package page (named in the brief) records behaviour,
   decisions, numbers, checks and remaining limits; dated, preserving history.
5. Exact additive text for `CHANGELOG.md` and `CURRENT_PLAN.md` is in the handoff.
6. All work is committed on the branch; the worktree is clean.

Partial completion is reported as partial: which AC pass, which do not, why.

## 8. Stop and ask

Stop and send the parent **one** message with every open blocker, each with
options and a recommended option, when:

- an owner decision is needed (new canon, balance numbers outside the brief,
  scope change, new dependency);
- sources conflict without a dated decision;
- a hard invariant would have to bend;
- a critic did not accept after three rounds;
- the time box is reached.

Do not guess, do not widen scope, do not replace the question with reasoning.

## 9. Handoff

Use the delivery skill's template (`.agents/skills/warwrit-delivery/SKILL.md#handoff`)
and add:

```text
Brief / base / branch / final commit:
AC table: AC-n | PASS/FAIL/NOT_RUN | evidence
Critic rounds: critic | revision | verdict | key scores
Checks: command | result
Docs updated: paths
CHANGELOG entry (exact text):
CURRENT_PLAN entry (exact text):
Owner questions (with recommendation):
One next step:
```
