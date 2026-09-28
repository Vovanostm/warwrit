# Operational memory index

An on-demand navigation aid, not a second GDD, current plan, permission store or
automatically updated Codex personal memory. Do not load every link into every task.

| Need                                     | Existing owner                                                                | Refresh boundary                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Authority and tests                      | [AGENTS.md](../../AGENTS.md)                                                  | Read applicable instructions when entering scope                                 |
| Active slice, source IDs and writer ACKs | [CURRENT_PLAN](CURRENT_PLAN.md), linked Airtable/GitHub records               | Live readback before activation, shared writes or delivery                       |
| Restore a task                           | [warwrit-context](../../.agents/skills/warwrit-context/SKILL.md)              | Check actual checkout/revision/dirty state and required source edition on resume |
| Technology constraints                   | [technology handoff](AI_TECHNOLOGY_HANDOFF.md), accepted ADRs, lockfile/types | Before using changing library APIs                                               |
| Commands/environment                     | [local development](LOCAL_DEVELOPMENT.md), package scripts                    | Before execution in another checkout/toolchain                                   |
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
  concurrent runs. Existing isolation gaps and finite acceptance are in
  [the repair plan](AGENT_DEVELOPMENT_PREPARATION.md#two-immediate-repairs).
- Knowledge graphs are derived indexes. Confirm indexed repository/root/revision
  against the assigned checkout; stale or insufficient results require source
  inspection under AGENTS.md's fallback rules, not guessed symbol ownership.
- Imported review helpers are subordinate to project policy. Preserve independent
  oracles and actual/known-state boundaries; see
  [helper precedence](../../.agents/skills/README.md#project-precedence).

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
