# Operational memory index

An on-demand navigation aid, not a second GDD, current plan, permission store or
automatically updated Codex personal memory. Do not load every link into every task.

| Need                                     | Existing owner                                                                | Refresh boundary                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Authority and tests                      | [AGENTS.md](../../AGENTS.md)                                                  | Read applicable instructions when entering scope                                 |
| Active slice, source IDs and writer ACKs | [CURRENT_PLAN](CURRENT_PLAN.md), linked Airtable/GitHub records               | Live readback before activation, shared writes or delivery                       |
| Restore a task                           | [warwrit-context](../../.agents/skills/warwrit-context/SKILL.md)              | Check actual checkout/revision/dirty state and required source edition on resume |
| Technology constraints                   | [technology handoff](AI_TECHNOLOGY_HANDOFF.md), accepted ADRs, lockfile/types | Before using changing library APIs                                               |
| Commands/environment                     | [local development](LOCAL_DEVELOPMENT.md#focused-checks), package scripts     | Before execution in another checkout/toolchain                                   |
| Handoff/evidence fields                  | [warwrit-delivery](../../.agents/skills/warwrit-delivery/SKILL.md#handoff)    | Diff/source changes invalidate affected evidence                                 |
| Role assignment                          | [agent team](AGENT_TEAM.md)                                                   | Verify host support and resource ownership                                       |

## Source-linked operational lessons

Reviewed 2026-09-27 against `a5fb1c0ba42d94ce80f8dce16d04203b9827c02e`.
Historical observations require rechecking when their named source changes.

- Workspace tests can need built public-package exports. Check manifests and the
  existing build order before treating a missing `dist` import as a domain bug.
  Do not bypass the public API with cross-package relative imports.
- Worktrees isolate files, not shared databases or ports. Inspect
  [bootstrap](../../scripts/bootstrap.sh), [SQL smoke](../../scripts/migration-smoke.ts),
  [Compose](../../compose.yaml) and [Vite config](../../apps/web/vite.config.ts) before
  concurrent runs. Since PR #105 the clean gate uses its own disposable Compose
  project and port; `pnpm dev` ports and `pnpm db:up` remain shared.
- Knowledge graphs are derived indexes. Confirm indexed repository/root/revision
  against the assigned checkout; stale or insufficient results require source
  inspection under [AGENTS.md "Code discovery"](../../AGENTS.md#code-discovery),
  not guessed symbol ownership.
- Opt-in integration specs skip silently when their variable is unset. Until
  2026-09-29 CI set only `DATABASE_URL`, so all four encounter PostgreSQL specs
  were skipped (`4 skipped` in the main CI log), as was the OIDC session spec. Check the skip count, not only
  the pass count; `pnpm test:migrations` now runs them on the disposable database.
- Coverage of built exports double-counts functions (source-mapped `dist` plus
  direct `src` tests) and hides testkit coverage from `src`. `pnpm test:coverage`
  runs Vitest in `coverage` mode, which resolves `@warwrit/*` to source. Measured
  coverage can contradict static CRAP estimates; measure before prioritising.
- Generic review helpers conflicted with project test and approval policy and were
  removed on 2026-09-29; see [skills history](../../.agents/skills/README.md#history).

## Admission and maintenance

Add a lesson after a concrete retrieval failure, reproduced pitfall or accepted
decision makes it useful across tasks. Keep claim, source/reproducer pointer,
observed revision/date and refresh trigger together. Label inference and unexecuted
checks. Correct/remove obsolete derivatives when their source changes; preserve
authoritative history at its owner. Parent reviews ordinary repository edits;
children propose lessons in their handoff, never silent writes.

Keep logs/captures in revision-bound evidence artifacts and one detailed handoff;
store only links here. Ignored local artifacts need explicit sharing for another
checkout. Never store secrets, personal data, raw sessions, duplicated game rules
or live PR statuses here. Do not copy this page into global Codex memory.
Persistent-memory quality and token savings remain `NOT_MEASURED`.
