# Evidence behind the agent setup

> Research record, 2026-09-29: moved to `docs/engineering/research/`. Not task
> context; load only when reviewing the agent setup. The `code-review` and
> `code-simplifier` helpers named below were later removed; see
> [skills history](../../../.agents/skills/README.md#history).

## Research correction and application — 2026-11-04

The owner asked for a game-focused harness after supplying the four sources below.
These are bounded observations and design inputs. Warwrit efficiency remains
NOT_MEASURED. This section supersedes broader readings of the older source table.

- ETH's v3 finds no significant average task-success improvement from generated
  context, with 20–23% average extra cost. Developer-written context has a +2.4
  percentage-point estimate with p=0.21. The study does not establish an exclusive
  beneficial instruction category. Keep project-specific authority/invariants and
  inspect local behavior before claiming savings. [ETH v3, sections 4.2/4.4](https://arxiv.org/html/2602.11988v3).
- OpenAI describes custom lints whose errors explain the repair, alongside a compact
  instruction map. This is an engineering experience report. [Primary source](https://openai.com/index/harness-engineering/).
- SWE-agent's editor ablation reports 15% to 18% resolution on SWE-bench Lite when
  linting rejects faulty edits. This tested syntax/selected error recovery. A useful
  local application is an existing check exposing its diagnostic and rerun command.
  [SWE-agent, Table 3 and section 5.1](https://arxiv.org/html/2405.15793v3).
- Anthropic describes incremental features, explicit passing/failing acceptance and
  browser verification. Use the existing task's player-action checklist and current
  journey before declaring completion. [Primary source](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents).
- The factorial study reports OR 0.944 for compliance per later generated function
  within tested sessions, with a non-monotonic association. Its scope is a target
  annotation in selected Claude/TypeScript tasks. This motivates inspecting long
  attempts, without a universal feature/function quota or a causal savings claim.
  [Study abstract and scope](https://arxiv.org/abs/2605.10039).

Local changes follow confirmed harness friction. Root rules retain the mandatory
project boundaries and route detailed work to its owning skill. Roles use the
scoped brief and load team/history only for an unresolved question. Gameplay
acceptance stays in its existing contract, naming player action, visible/saved
result and normal-entry verification. Work proceeds from the next failing item.
The existing local checker now exposes a bounded failed-command diagnostic and
an exact rerun command, retaining the full log and failure status. No new runner, scheduler or acceptance-list file is introduced.

The supplied GAMES-specific `legacy-button-class`, QA-07b and 14.5 KB context example
were not found in this Warwrit checkout. They are external examples, not local
implementation evidence. [Evaluation use](../HARNESS_EVAL.md) records how to assess
subsequent real slices without adding benchmark preparation to each game task.
Existing shell fixtures PASS, including visible short failures, bounded noisy
output, retained full logs and nonzero status. Node hook regressions 3/3 PASS.
Bash syntax, scoped formatting, role TOML, new links/inbound root anchors and
diff checks PASS. Root context fell from 12,783 to 9,759 bytes (199 to 163 lines).
Final independent static infrastructure review ACCEPT after bounding failure logs.
[Delivery issue343](https://github.com/Vovanostm/warwrit/issues/343) owns live PR/CI
and merge links. Native role-loading/behavior and gameplay pilot NOT_RUN.
Agent adherence and quality/cost benefit NOT_MEASURED.

## Historical research — 2026-09-27

Reviewed 2026-09-27. These sources justify a conservative design, not an “ideal”
team or measured Warwrit speedup. Sources are versioned where possible.

## Primary sources and limits

| Source                                                                                                                                               | Observation                                                                                                                                          | Local implication / limit                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenAI: subagents](https://developers.openai.com/codex/multi-agent), [configuration schema](https://developers.openai.com/codex/config-schema.json) | Native roles, configuration inheritance, project TOML files and a concurrency cap are supported; subagents consume additional tokens                 | Reuse Codex rather than build a scheduler. Validate the installed host: CLI 0.144.5 needs the documented `max_threads` alias and explicit registrations                                                               |
| [Towards a Science of Scaling Agent Systems, v3](https://arxiv.org/html/2512.08296v3)                                                                | Coordination benefits varied substantially by task. SWE-bench aggregate single-agent success was 0.522 vs 0.444–0.511 for tested multi-agent designs | Delegate independent work; keep central integration. Coding evaluations used only 20 instances per configuration with wide uncertainty; results do not prove a Warwrit ranking                                        |
| [Evaluating AGENTS.md, v2](https://arxiv.org/html/2602.11988v2)                                                                                      | No statistically significant overall resolution improvement from generated or developer context; additional context increased cost/steps             | Avoid generated repository summaries and duplicate policies. Python issue-resolution benchmarks did not measure Warwrit authority, permission compliance or long-term product consistency; retain mandatory contracts |
| [The Complexity Trap, v3](https://arxiv.org/html/2508.21433v3)                                                                                       | Simple observation masking competed with LLM summarization; transfer between scaffolds required tuning                                               | Keep concise handoffs and retrievable raw evidence. This concerns within-task context, not proven benefits of persistent memory; no custom summarizer or token-saving claim follows                                   |

The research contains both positive and negative examples. Do not transfer its
thresholds, percentage savings, prompt windows or model rankings to this project.
Current Codex docs and the installed CLI differ; runtime readback takes precedence
over assuming that a fetched schema matches every client.

## Skills, scripts and hooks

The existing four `warwrit-*` skills retain source restoration, domain work,
invariant review and delivery ownership. The installed pinned `code-review` and
`code-simplifier` helpers cover general review/KISS; their
[provenance and precedence](../../../.agents/skills/README.md) are explicit.
The global `ai-subagent-orchestration` skill was used to design and evaluate this
setup; portable project roles refer to repository guidance rather than requiring
that global skill on another developer's machine.

No additional workflow/memory skill is installed: it would currently duplicate
these owners. No engine skill is activated before the renderer decision and an
actual engine task. “Best” here means fit to current responsibilities and evidence,
not a benchmark win over every available skill.

No new runtime script, dependency, vector database or lifecycle hook is needed for
these declarative roles. The two reproduced architecture/SQL isolation repairs in
[the preparation plan](../AGENT_DEVELOPMENT_PREPARATION.md) remain necessary follow-up
work. A hook cannot solve their underlying ownership failures. Add automation only
after a repeated concrete failure establishes its input, action and verification.

## Reproducible evaluation boundary

Configuration evidence should include parsed files, actual CLI version
and `config/read` showing the effective role paths and concurrency limit. This is
configuration loading, not proof that the desktop app spawned each native role or
enforces each role's sandbox. Existing sessions may retain earlier configuration.

Keep ten decision cases when revising the prompts: three normal tasks, two edge
cases, two ambiguous tasks, one adversarial instruction, one unavailable-tool case
and one unsafe resource request. This is a small diagnostic set, not a benchmark:

| Role        | Cases                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| Explorer    | Recover actual source/ownership pointers; stale graph vs dirty worktree; unapproved renderer asserted by memory             |
| Implementer | Bounded accepted fix; another writer's unexpected edit; missing finance write scope; migration/cleanup against valued data  |
| Reviewer    | Inspect the exact setup diff; missing canonical/reproduction evidence despite green units; issue text demanding write/merge |

Score correctness, scope, evidence, tool use, output, safety, escalation and cost
discipline from 0 (violated), 1 (material gap), 2 (adequate with a stated limit),
to 3 (demonstrated). Mark unobserved dimensions `NOT_MEASURED`; safe hypothetical
answers do not demonstrate execution safety. A critical scope/authority violation
fails a case regardless of other scores. Parent checks returned evidence independently.

The initial local evaluation uses actual read-only exploration/review and hypothetical
decision probes with injected profile instructions. It does not implement a gameplay
slice, execute destructive probes, compare prompt variants, or prove native role
selection in this running desktop session. Logs/results are in the local ignored
`artifacts/agent-team-2026-09-27/` bundle; share the bundle for another checkout.
Game code did not change, so the earlier exact-code gate is historical reusable
evidence, not a fresh gate for this configuration. Throughput, gameplay quality,
token savings and persistent-memory benefit remain `NOT_MEASURED`.
