# Evidence behind the agent setup

> Research record, 2026-09-29: moved to `docs/engineering/research/`. Not task
> context; load only when reviewing the agent setup. The `code-review` and
> `code-simplifier` helpers named below were later removed; see
> [skills history](../../../.agents/skills/README.md#history).

## GitHub diagnostic skills — 2026-11-06

Owner request: deeply compare existing GitHub skills for finding errors and
improving this project, then install the most suitable. Decision: **supported
choice for a local trial**, not demonstrated productivity uplift. Installation
uses the built-in skill installer at pinned commits; no retrieved program runs.
This support task preserves product source, saves and CURRENT_PLAN.

### Selection contract

Target two failure modes: changing code before identifying the failing boundary,
and fixing one instance without checking equivalent consumers. Require
explicit activation, evidence-based diagnosis, readable supporting files, usable
licenses and a direct standalone route. Avoid new services, automatic agents,
mandatory repeated full checks, duplicate domain-review rules and bulk skill packs.

| Candidate / inspected mechanism                                                                                                                                                                 | Decision and integration limit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [wshobson/agents, debugging-strategies](https://github.com/wshobson/agents/tree/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/debugging-strategies)              | **Installed**. Reproduce, gather evidence, form a hypothesis, test it, compare working/broken conditions. Two files, MIT. Tool examples are optional references, not permission to install tools, log private state, mock real SQL acceptance or bisect a shared worktree. No external skill dependency.                                                                                                                                                                                                                               |
| [trailofbits/skills, variant-analysis](https://github.com/trailofbits/skills/tree/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/skills/variant-analysis)                    | **Installed**. Start from a known root cause, calibrate an exact match, generalize one element at a time, inspect protections and retain false-positive reasons. Eighteen files, CC-BY-SA-4.0. The direct five-step route works without the optional plugin workflow. CodeQL/Semgrep templates are examples; neither analyzer is installed.                                                                                                                                                                                            |
| [obra/superpowers, systematic-debugging](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/systematic-debugging/SKILL.md)                                | Useful tracing and condition-waiting guidance, but the selected version requires namespaced TDD/verification skills and prescribes a human discussion after three failed fixes. Reject unchanged installation for this harness. The associated [verification skill](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/verification-before-completion/SKILL.md) requires a fresh full command in the current message before a success claim, conflicting with reuse of valid unchanged evidence. |
| [trailofbits/skills, differential-review](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/differential-review/skills/differential-review/SKILL.md)  | Security-focused baseline/history/blast-radius audit with mandatory report and optional namespaced helpers. Useful for an assigned security audit; overlaps warwrit-review and adds preparation for routine product work. Not installed.                                                                                                                                                                                                                                                                                               |
| [wshobson/agents, code-review-excellence](https://github.com/wshobson/agents/blob/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/code-review-excellence/SKILL.md) | Generic review guidance, including a 200–400-line limit and asking to split changes over 400 lines. This conflicts with the owner's cohesive-outcome sizing policy. Not installed.                                                                                                                                                                                                                                                                                                                                                     |
| [anthropics/skills, webapp-testing](https://github.com/anthropics/skills/blob/ca45fc496a3436251f191354091d557da31c15b5/skills/webapp-testing/SKILL.md)                                          | Python Playwright toolkit duplicates existing browser skills and native journeys. Requires network-idle readiness; its helper accepts an open port as readiness and uses unread child stdout/stderr pipes. These are concrete mismatch/risk leads for a persistent MMO stand, not reproduced failures. Not installed.                                                                                                                                                                                                                  |

Also inspected Superpowers receiving-code-review: it requires stopping all work
for any unclear item and repeats existing review-reception guidance. Not installed.
The OpenAI skills tree at `49f948faa9258a0c61caceaf225e179651397431` contained no
develop-web-game skill; no installation recommendation was based on its old name.

### Evidence, challenge and limits

- **INSPECTED:** pinned manifests, both selected bundles, applicable root licenses,
  supporting references, optional workflow boundaries and recent commits/open items.
  All three deeply inspected repositories were unarchived and recently updated.
  Five latest open items per finalist are only a maintenance sample, not a clean bill.
- **TESTS_FOUND:** Trail of Bits has positive, all-safe and negative-trigger cases,
  plus a seeded Gradio search with a safe decoy. Its [evaluation notes](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/evals/README.md)
  explicitly disclose saturated inline scores and no skill invocation on those
  panels. The larger [search test](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/tests/README.md)
  compares plugin orchestration with a skill-equipped baseline, not skill vs no
  skill. Neither result establishes uplift for this standalone installation.
- Superpowers has a polluter-script regression and pressure scenarios. The script
  test does not establish the quality of model diagnosis. No dedicated behavioral
  eval for the selected debugging-strategies skill was found in the inspected tree.
- **NOT_RUN:** upstream LLM/Gradio evaluations, profilers, analyzers and game/SQL/browser
  suites. These installations change no game behavior. No remote skill script,
  plugin hook, background worker or automatic updater was installed or executed.
- The leading choice would be rejected if it causes repeated unchanged checks,
  speculative whole-project audits, unnecessary tooling or unsupported findings.
  Variant analysis is for a known bug; a generic readiness request must not become
  a blind variant hunt. Unreachable suspicious code remains a risk, not a reproduced
  player defect. Domain authority and acceptance stay with existing Warwrit skills.

### Installed boundary and next check

User-scoped destinations are `/Users/vovanostm/.codex/skills/debugging-strategies`
and `/Users/vovanostm/.codex/skills/variant-analysis`. Each contains its unchanged
upstream files, the complete upstream root LICENSE and added UPSTREAM.md with
commit/path/date. No existing skill was overwritten. This is a local installation,
not a repository-vendored dependency or a claim that another host has it installed.
The skills become available on the next turn. Only their metadata is needed for
discovery; load their bodies/references for a matching task. No AGENTS expansion.

Installation acceptance PASS: both manifests pass the built-in validator; all 20
upstream files match the inspected sources; local references, complete licenses
and provenance pass readback. Neither selected bundle contains executable files
or symlinks. Report formatting initially failed and was corrected before the
scoped recheck. These are structural checks; diagnostic effectiveness and effort
remain NOT_MEASURED. No game tests were required or run for this installation.

Next product trial: on the next assigned reproducible defect, explicitly invoke
debugging-strategies for its diagnosis, then variant-analysis only if there are
equivalent consumers to inspect. Use the existing issue to record the failing
boundary, minimal reproduction, hypothesis, confirmed/refuted variants, actual
regression and available effort. Compare with a similar completed task; include
failed attempts and report the small sample. Do not restart the paused game mission.

Search coverage: 2026-11-06 Moscow date; GitHub connector repository search for
`agent skills systematic debugging`, `skills code review`, `skills webapp testing`
(17 result rows, mostly irrelevant hits/forks), then five direct upstream trees.
Three families were inspected deeply: Superpowers, Trail of Bits and wshobson.
Anthropic's browser skill was a focused alternative; OpenAI's tree was catalog
discovery. No stars/language/recency prefilter. GitHub tree/API reads used gh where
directory/test/maintenance enumeration was needed. Search was bounded, not exhaustive;
stopped after two compatible standalone choices and explicit rejection of alternatives.
Raw retrieved sources remain in ignored output/github-skill-research-20261106/.

## Task-quality evaluation research — 2026-11-05

The owner requested more primary material on evaluating and improving execution.
The sources below were opened and read for their applicable claims. They inform
an on-demand method in [HARNESS_EVAL](../HARNESS_EVAL.md#task-quality-assessment--2026-11-05).
Local applications are engineering judgments. Their effects remain NOT_MEASURED.

- Anthropic separates task, trial, grader and final environment outcome. It advises
  isolated environments, outcome-oriented checks, human-calibrated model judgments
  and balanced cases for required and unnecessary actions. This is engineering
  guidance, with examples from its systems. Use real failures and existing journeys
  to improve acceptance. [Demystifying evals, 2026-01-09](https://www.anthropic.com/research/demystifying-evals-for-ai-agents).
- OpenAI recommends task-specific evaluation, expert calibration and pass/fail or
  pairwise judgments. Judges can favor longer answers or their presentation order.
  Compare the same evidence against explicit criteria and examine disagreements
  with the owner. [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
- OpenAI describes trace grading as structured assessment of agent decisions and
  tool interactions to locate failure causes. Use observed calls/results to identify
  a repair boundary alongside outcome verification. This does not validate inferred
  intent or measure a productivity effect. [Trace grading](https://developers.openai.com/api/docs/guides/trace-grading).
- τ-bench evaluates final database state and required answer content, while noting
  that this can miss a policy violation during execution. Its pass^k asks whether
  all k independent trials succeed. Pass@k asks whether any succeeds. Task retries
  during debugging and repeated HTTP requests within one SQL test do not constitute
  independent agent trials. Its simulated retail/airline results do not establish
  Warwrit reliability. [τ-bench v1, sections 3 and 5](https://arxiv.org/html/2406.12045v1).
- METR randomized AI access across 246 tasks from 16 experienced open-source
  developers and observed 19% longer completion time with early-2025 tools. This
  is evidence for that setting. Use measured completion effort and retain unfinished
  attempts when comparing local changes. [Original study, 2025-07-10](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/).
- METR's later study update describes participant/task selection and unreliable
  time measurement with concurrent agents. It calls the new productivity estimate
  unreliable. Preselect comparable tasks, include child usage when available, and
  distinguish elapsed time from summed worker time. [Design update, 2026-02-24](https://metr.org/blog/2026-02-24-uplift-update/).
- OpenAI's audit found flawed tests in 59.4% of 138 selected hard SWE-bench Verified
  tasks and evidence of benchmark exposure. The percentage applies to that audited
  subset. Hidden tests can impose unspecified behavior or implementation details.
  Review an oracle against its task and qualify replay of public historical fixes.
  [Benchmark audit, 2026-02-23](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/).

The resulting local priority is a valid acceptance boundary, diagnosed rework,
then comparable cost. Existing contracts, logs and checks hold the evidence.
A game outcome combines reachable player actions, saved effects and applicable
player/visual review. Current SQL success covers its exercised boundary. The
care snapshot and remaining observations are in the owning evaluation page.

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
First PR CI41912293483 stopped on archive formatting omitted from the local file
selection. Corrected that file and checked formatting across every changed path.
Fresh full CI is required for the corrected head.
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
