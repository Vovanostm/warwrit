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

The project allows three child threads, excluding the parent: up to two independent
Luna writers and one Sol reviewer. This is a bounded capacity trial, not a measured
optimum or an instruction to fill idle slots. Each writer needs a separate worktree,
write set and resource allocation. Start fewer when only one packet is ready.
Two Luna writers have previously worked in distinct worktrees. In the restored
September 29 session, however, spawning a new Luna returned `agent thread limit
reached` after the retained Sol reviewer had completed; resuming an older archived
Luna returned the same error. The available pair is currently one Luna and one Sol.
Reuse these agents with explicit ownership transfers. A completed response is not
proof that the host released its thread slot. Recheck actual host behavior before
claiming additional capacity; changing this file cannot enlarge the running
session. Never create user-owned tasks to evade limits.
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
defines project discovery from `.codex/agents/*.toml`. Explicit registrations in
`.codex/config.toml` also support the installed CLI. `max_threads` is the documented
legacy alias: the older CLI 0.144.5 rejected `max_concurrent_threads_per_session` during
configuration readback. CLI 0.146.0 `codex features list` exits successfully and the TOML files parse;
this does not prove that this untrusted worktree loaded the project settings or
that a running session has three child slots. The primary project remains trusted;
no global trust entry was changed. Start a fresh trusted project session after changes and
verify the actual host exposes the named roles. Do not change global trust silently.

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
