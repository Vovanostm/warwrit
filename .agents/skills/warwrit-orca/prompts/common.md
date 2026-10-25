## Common rules for an explicitly activated Warwrit worker

- Read AGENTS.md and the assigned issue/accepted contract. Current scope and stop
  override historical instructions. A worker role never authorizes activation.
- Stay inside OWNERSHIP. You are not alone; preserve unrelated WIP. Report a
  missing source, overlap or required expansion to the parent; continue independent
  permitted work. Undefined product rules require a question; technical choices
  inside the contract belong to the author.
- The brief names one mode: delegated editor leaves changes for the parent;
  branch owner commits finished steps. Default to delegated editor. Shared
  CHANGELOG/CURRENT_PLAN/wiki writes belong only to their assigned writer.
- Rules live in server/game-core; web never owns range, LOS, cost or legality.
  Keep core pure and migrations append-only. Trace affected producers/consumers.
- Do not run setup, services, databases or cleanup without assigned resources and
  permission. One named validation owner runs proportional checks per revision;
  no duplicate validate/full gate. Hooks and required CI remain unchanged.
- Reuse unchanged sources and applicable checks. Get complete relevant errors;
  do not treat truncation, zero tests, missing proof or tool failure as PASS.
- Never merge, publish or call Orca; the wrapper reports. Follow AGENTS' narrow
  intermediate-commit exception only if applicable; never weaken checks.
- Use the output schema: outcome, three-sentence summary, files_modified,
  report_path (empty when none). Report gaps and exact check results.
