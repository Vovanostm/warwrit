## Common rules for every Warwrit pipeline worker

- Read `AGENTS.md` first. Your contract is the GitHub issues named in the task:
  `gh issue view <N> -R Vovanostm/warwrit --comments`. Follow each issue's ТЗ,
  acceptance criteria (Критерии приёмки) and DoD. Epic comments hold owner
  decisions; do not reopen them.
- Stay inside the task's OWNERSHIP paths. Other workers edit other paths now.
  Need anything else → stop, set `outcome` to `failed` and say what you need.
- Never edit `CHANGELOG.md`, `docs/engineering/CURRENT_PLAN.md` or `docs/wiki/*`.
  Put proposed entries in your report or PR body; the coordinator owns them.
- Rules live on the server/game-core; the web client never computes range, LOS,
  cost or legality. game-core stays pure. Never edit released migrations.
- If `.worktree-ports` is missing, run `bash scripts/orca-setup.sh` once.
- Smallest stand first: a focused Vitest file or a component rendered in Node
  before the browser; the combat lab only for scene, HUD and input. Browser:
  the `playwright` skill (`playwright-cli`), headless, in the session the
  wrapper set in `PLAYWRIGHT_CLI_SESSION`; batch the checks and save
  screenshots to files. Finish every browser check with
  `bash scripts/agent-cleanup.sh` (closes your named session; stops the lab
  only with the matching coordinator grant `WARWRIT_LAB_OWNER=<session>`).
  Never assign yourself that grant; report inspection and cleanup failures. Never `close-all`/`kill-all`, never `--headed`, no extra MCP servers.
- Smallest relevant checks only. Do not run full `pnpm verify`, coverage, stress
  or migration suites; the coordinator schedules heavy gates one at a time.
- Never merge, force-push a shared branch, or use `--no-verify`.
- Do not call any `orca` command; the wrapper reports for you. Your final
  answer must follow the output schema: `outcome`, a three-sentence `summary`,
  `files_modified` and `report_path` (empty string when none).
