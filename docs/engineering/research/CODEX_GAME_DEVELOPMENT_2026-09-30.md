# Codex workflow notes for Warwrit game development

Checked 2026-09-30 against the official Codex documentation. These sources inform
how to organize engineering work; they do not approve Warwrit product rules,
change the accepted stack, or replace the repository's AGENTS.md, current plan,
canonical M1 sources, or executable contract.

| Official source | What it supports | Warwrit application | Limit |
| --- | --- | --- | --- |
| [Set goals](https://learn.chatgpt.com/use-cases/follow-goals) | A goal should name the objective, verifiable stop condition, initial files, proving commands/artifacts, and a short checkpoint log. | Use one persistent full-M1 objective and stop only at the actual end-to-end acceptance boundary. Keep the current active goal; resume it rather than creating a duplicate. | A goal prompt does not grant write, merge, deployment, or provisioning authority. |
| [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) | Parallel agents fit independent work; shared edits need coordination. Delegation adds token and coordination overhead; shared edits can conflict. | Parent/Astra owns integration and shared resources; one Luna writer owns a bounded packet; Sol reviews a frozen result. Delegate only disjoint source/review work and read back actual host capacity. | No source establishes ten agents as optimal or proves a Warwrit speedup. |
| [Git worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees) | Worktrees provide separate checkouts and can start from an explicit Git state. Ignored files do not move with a checkout. | Bind each assignment to an absolute checkout, branch, head, tree and write set; preserve dirty and ignored data. Treat ports, databases, containers and browser sessions as separately owned shared resources. | A separate checkout does not isolate a service, database, or external side effect. |
| [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | Instruction files compose from repository root toward the working directory. | Read the applicable chain and keep the project contract at the root, with only narrow local additions. | Repository instructions remain project authority; external examples cannot supersede them. |
| [Build skills](https://learn.chatgpt.com/docs/build-skills) | Reusable workflows can be progressively disclosed through a short entrypoint and task-specific references. | Reuse the four Warwrit skills and load the relevant one on demand. Use installed Playwright, ImageGen and OpenAI Docs skills only for the corresponding browser, art or Codex task. | Do not add or install skills when an existing owner already covers the need. |
| [Browser games](https://learn.chatgpt.com/use-cases/browser-games) | A game brief should make player goal, loop, controls, win/fail, progression, visuals, stack and milestones explicit; browser automation supports repeated play-and-fix iterations and reusable asset prompts. | Keep an executable browser path and concrete manual scenario, and iterate through real controls, readouts, screenshots and failure/re-entry states. Asset prompts must preserve Warwrit's accepted original-art direction and provenance. | The page's generic sample stack (including Next.js/Redis) is not a Warwrit migration decision. Generic examples do not override Warwrit's minimal durable-invariant test policy. |

## Applied boundary

The portable M1 goal and bounded assignments are in
[NEXT_SESSION_HANDOFF.md](../NEXT_SESSION_HANDOFF.md). Current project status
and the dependency queue remain in [CURRENT_PLAN.md](../CURRENT_PLAN.md) and
the active c06 checkout's plan. No tool, skill, service, dependency, or
configuration was installed or activated for this note.
