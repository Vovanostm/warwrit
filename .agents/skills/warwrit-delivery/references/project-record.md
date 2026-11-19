# Substantive change record

Owner amendment — 2026-11-08. Follow [AGENTS.md](../../../../AGENTS.md) for
permissions, advisory checks and review. This replaces the older requirements
to read/update CURRENT_PLAN or write detailed changelog reports.

## One owner for task details

Enter through [ROADMAP](../../../../docs/engineering/ROADMAP.md) and open only
the requested task's document. Keep its current status, decisions, next action,
blockers, checks and delivery state there. Reuse an existing work package/wiki
page; do not create a second plan or append a session diary.
See [navigation rules](../../../../docs/engineering/roadmap/README.md).

## Change awareness

After resume, branch/worktree switch, pull, merge, rebase or cherry-pick:

- Confirm actual checkout, branch and dirty changes; preserve unrelated WIP.
- Read the small roadmap and affected task sections. Read at most the first
  50 changelog lines; find a specific older change with a bounded regexp query.
- Compare applicable decisions/results with actual source/diff and live GitHub
  state when needed. Historical reports do not prove current implementation.
- Use [warwrit-changelog](../../warwrit-changelog/SKILL.md) for reading and writing;
  never read the changelog in full or work around the limit by paging it.

## Documentation closeout

Before final response, commit or publication for a substantive change:

- Update the owning task document with actual behavior, outcomes, checks/failures,
  limits and local/published/merged state. Include branch/revision or permission
  pointers only where relevant; mark skipped checks NOT_RUN and absent
  measurements NOT_MEASURED. Do not claim player acceptance from a code check.
- Update the roadmap checkbox only when its linked done criterion changes.
- Add one concise Unreleased changelog entry linking the task document. Keep
  detailed commands, test lists and branch data out of the changelog entry.
- Preserve dated decisions, historical evidence, unrelated edits and one writer
  per shared path. Delegate proposed records to the owning writer if needed.
- Review the scoped diff and edited sections; verify affected local links.
  Link the owning result in the final report without duplicating the full record.

Trivial replies need no filing. CURRENT_PLAN and its archive are not update
or startup-read targets. Game tests are unnecessary for docs-only changes.
