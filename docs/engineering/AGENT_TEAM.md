# Codex delegation

Project setup, 2026-09-27. [AGENTS.md](../../AGENTS.md) and the active contract
remain authoritative. Profiles reuse existing skills; they do not activate
gameplay cards or introduce another workflow engine.

## Responsibilities

| Owner                 | Responsibility                                                                             | Write boundary                                |
| --------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Parent                | Scope, live authority, dependency order, assignments, integration, final gate and delivery | Authorized task; retains final accountability |
| `warwrit_explorer`    | One source/code question; `warwrit-context`                                                | Read-only findings                            |
| `warwrit_implementer` | One accepted slice; `warwrit-domain` for domain work                                       | Named worktree and explicit paths only        |
| `warwrit_reviewer`    | Independent diff/counterexample review; `warwrit-review`                                   | Read-only; fixes return to the writer         |

Profiles live in [`.codex/agents`](../../.codex/agents). The owner's M1 assignment
pins `warwrit_implementer` to `gpt-6-luna` and `warwrit_reviewer` to `gpt-6-sol`.
Use Sol for plan review as well. Reasoning settings remain inherited. Prompts
prohibit child delegation; the parent assigns every packet.

The primary project config reads `agents.max_threads = 12` under CLI 0.144.5.
The last active-session readback exposed the parent plus two child slots. This is
configured/runtime capacity evidence, not proof that twelve agents are staffed or
that any count is optimal. Each writer still needs a separate worktree, write set
and resource allocation; start only the writers needed for ready packets. Prior
September 29 spawn attempts hit `agent thread limit reached` despite the config.
A completed response is not proof that the host released its slot. Re-read live
agent status and host behavior before assignment; a document change cannot enlarge
the running session. Never create user-owned tasks to evade limits.
See [the current packet queue](PARALLEL_WAVES.md) for dependencies and exact ownership.

## Assignment and scheduling

Use the four-field brief in [the preparation plan](AGENT_DEVELOPMENT_PREPARATION.md#parallel-work-without-a-new-control-plane).
Include a time limit and exact focused checks/resource ownership in that brief.
If a time limit is missing, the parent sets it before dispatch. Reaching it means
reporting partial evidence, never inventing completion.

1. Restore actual cwd, HEAD/tree, dirty changes, live dependencies and source edition.
   Read mandatory contracts in full; give children pointers and relevant context.
2. Keep the critical path local. Delegate an answerable independent question or
   disjoint implementation slice while doing useful non-overlapping work locally.
3. Establish one writer per shared path. Use separate worktrees for writers and
   confirm the child's actual cwd before editing. A spawn does not create isolation.
4. Assign ports/build outputs/DB lifecycle as well as files. Until the documented
   isolation repairs land, shared bootstrap, SQL smoke and dev services stay serial;
   explicitly owned disposable resources are the alternative.
5. Review the frozen diff independently. Compare the reviewed revision and dirty
   delta before applying findings. A changed tree invalidates affected evidence.
6. Parent inspects the union and performs delivery under the existing skill/gate.
   Reuse unchanged-code evidence; successful branches do not prove their union.

Prefer a scoped brief over copying the full conversation when it contains enough
context. Preserve authority, ownership and acceptance; a summary never replaces
mandatory source reading. Do not assign the same broad audit to multiple agents.

Current ownership is in CURRENT_PLAN and its linked ACKs, not reusable profiles.
Missing activity is not an ownership release. A changed shared API, missing source,
overlapping writer or unknown DB owner returns to the parent. Roles grant no merge,
deployment, paid-service or external-message authority. Reuse
[warwrit-delivery's handoff fields](../../.agents/skills/warwrit-delivery/SKILL.md#handoff);
children do not execute its publication/checkpoint steps.

## Loading and host limits

[Official Codex documentation](https://developers.openai.com/codex/multi-agent)
defines project discovery from `.codex/agents/*.toml`. Primary project configuration
now uses the legacy-compatible `agents.max_threads = 12`: the installed primary CLI
0.144.5 rejected `max_concurrent_threads_per_session` and the `default_subagent_*`
keys as role entries. A sanitized `config/read` through that primary CLI confirmed
`max_threads = 12` and all four project role paths. The implementer, reviewer and
orchestrator files explicitly pin Luna, Sol and Astra at high reasoning; TOML parsing
confirmed those values, while `config/read` exposes registration paths rather than
per-role model settings. Explorer has no project default and must be assigned Luna
explicitly at dispatch. This is configuration/readback evidence, not a spawned-role
or capacity test: the running session remains limited to parent plus two children,
and fresh-session capacity is **NOT_RUN**. The user's global config and trust entries
were not changed.

Host/runtime overrides can take precedence. A read-only profile is not proof that
every connector/tool is unable to write. A prompt's no-delegation rule is behavioral,
not a verified tool-level restriction. The two role model choices above implement the owner request; approval settings are unchanged.

`.codex/rules/warwrit.rules` forbids force-push and auto/admin merge by command
prefix (checked with `codex execpolicy check`); it loads only for a trusted project.
Claude Code applies the equivalent `.claude/settings.json` rules and discovers the
same skills through `.claude/skills/` symlinks. Both are best-effort guards.

Example request: “Use `warwrit_explorer` to trace the assigned command's authority
and consumers, read-only, within ten minutes. I will inspect its existing tests.
Return file/source references and unknowns; do not edit or start services.”

If the host exposes only a message/task name with no custom-role selector, read the
selected TOML and pass its complete `developer_instructions` with the bounded brief.
This applies the prompt only; it does **not** load sandbox or other TOML settings.
Report the distinction and obey actual host limits. Do not claim native role loading
from a prompt-only evaluation.

## Memory and evaluation

Use [operational memory](AGENT_MEMORY.md) for source pointers and refresh rules.
Children report candidate lessons; the parent reviews a small source-linked edit
within authorized scope. There is no autonomous memory-writing agent.

[Research and evaluation](research/AGENT_TEAM_RESEARCH.md) explain the choices and limits.
Before adding concurrency or roles, use [the harness evaluation](HARNESS_EVAL.md) to compare representative serial and parallel tasks
with the same acceptance, model and base: correctness, conflicts, parent rework,
wall time and actual token/cost telemetry. Use `NOT_MEASURED` for missing metrics.
Reject a faster run with broken scope or missing proof.
