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

## Orca parallel worktrees — 2026-10-18

Owner request: configure Orca so several agents build Warwrit in parallel as
fast as correctness allows. Orca (`orca` CLI, Orca.app; not the Arcadia-only `arca` fork) gives each agent its own Git
worktree, terminals and supervised orchestration runs (Run/Task/Dispatch,
ask/reply, decision gates). The repository part is checked in:

- [`orca.yaml`](../../orca.yaml): setup runs [`scripts/orca-setup.sh`](../../scripts/orca-setup.sh)
  (frozen pnpm install from the global store, protocol/game-core/testkit builds,
  private combat-lab ports in gitignored `.worktree-ports`); the agent waits for
  setup; tabs Agent/Shell; archive runs [`scripts/orca-archive.sh`](../../scripts/orca-archive.sh),
  which stops only that worktree's combat-lab servers; the issue command prints
  the linked GitHub issue.
- [`.worktreeinclude`](../../.worktreeinclude): private copies of `.env` and
  `.claude/settings.local.json`. `node_modules` is never shared: pnpm workspace
  links are relative (`apps/web/node_modules/@warwrit/protocol ->
../../../../packages/protocol`), so a shared tree would compile against the
  primary checkout's packages.
- `pnpm dev:combat` reads `.worktree-ports`; explicit `COMBAT_*_PORT` still wins.
  Campaign `pnpm dev`, PostgreSQL/Dex and OIDC ports stay one shared stack.
- [`warwrit-orca`](../../.agents/skills/warwrit-orca/SKILL.md) is the coordinator
  workflow: waves by file ownership, worker spec, review and merge order.

Orca reads setup and tabs from the **new worktree's** `orca.yaml` (so from
`main` once merged), but `.worktreeinclude` and the archive hook from the
**primary checkout** registered in Orca. While the primary checkout stays on the
WIP branch `codex/sprite-combat-stage1`, `.env` is not copied and archive does
not run; combat-lab work does not need `.env`.

Orca holds a personal local setup hook `pnpm install` for Warwrit. With no
saved command-source choice a nonempty local hook means **Local only**, so the
YAML setup is ignored until Settings → Repository → setup command source is
**orca.yaml only** (or the local hook is cleared). Until then workers run
`bash scripts/orca-setup.sh` themselves when `.worktree-ports` is missing.
Repo base ref in Orca: `origin/main` (set 2026-10-18).

**Research basis.** [Orca orca.yaml reference](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/model/orca-yaml.mdx)
and [worktrees](https://www.onorca.dev/docs/model/worktrees);
[Claude Code best practices](https://code.claude.com/docs/en/best-practices)
(a check the agent can run, fresh-context reviewer, writer/reviewer split);
Cognition [«Don't build multi-agents»](https://cognition.com/blog/dont-build-multi-agents)
and its [2026 follow-up](https://cognition.com/blog/multi-agents-working):
parallel agents with partial context make incompatible decisions, so writes stay
single-threaded and extra agents contribute review and research;
[parallel agents with Git worktrees (DEV)](https://dev.to/andrea_schiona/running-coding-agents-in-parallel-with-git-worktrees-4cnk)
and [Augment: multi-agent workspace](https://www.augmentcode.com/guides/how-to-run-a-multi-agent-coding-workspace):
worktrees move conflicts to merge time, semantic conflicts merge cleanly but
regress, review becomes the bottleneck, practical laptop ceiling is about four
to five active agents; [METR 2025](https://simonwillison.net/2025/Jul/12/ai-open-source-productivity/)
shows perceived speed-up is not measured speed-up (experienced developers 19%
slower in its early-2025 setting; METR now calls it historical).

**Operating limits on this Mac (12 CPU, 36 GB, ~184 GB free on 2026-10-18):**
up to five writer worktrees with dev servers/tests; read-only reviewers extra;
full gates, coverage, stress and migration checks one at a time. 39 Codex
worktrees use 31 GB; clean up released ones before large waves.

Checks 2026-10-18: setup on a fresh `main` worktree PASS (install + three
package builds, ports 23426/25426); `pnpm dev:combat` served `/combat-lab` and
proxied `/api/dev/combat-lab/catalog` on those ports; archive stopped launcher,
server and Vite with no leftover process. Orca's own hook execution and a
supervised run end-to-end: NOT_RUN until `orca.yaml` is on `main`. Measured
throughput of parallel waves: NOT_MEASURED.

## Game-development workflow v2 — 2026-10-19

Owner request: prepare the agent team and a working game-development workflow.
Evidence from the first day of the 2026-10-18 pipeline: about 11 hours, five
wave-1 slices, no commit and no PR. Time went to plan → plan review → revision
rounds, recovery attempts that discovered the commit audit only on a rejected
commit, and `needs-owner` stops; five parallel writers also contended for the
same combat-lab files. v2 keeps Orca, GitHub labels, headless Codex and the
owner merge gate and changes the flow
([`warwrit-orca`](../../.agents/skills/warwrit-orca/SKILL.md)):

- **Metric:** merged PRs with playable proof per day, reported each tick.
- **Team:** coordinator; contract writer, evaluator and visual critic are fresh
  read-only contexts; one builder per lane (`web`, `core`) writes.
- **Contract instead of plan review:** one short file — scope, changes shaped
  for the audit, data compatibility, proof per acceptance criterion, questions.
- **Build ends in commits:** focused coverage + `pnpm check:changes` before each
  commit; `orca-validate.sh` runs the same audit.
- **Evaluate the running game:** the evaluator reviews the diff and plays the
  journey in `pnpm dev:combat` with Playwright; visual diffs also get the
  VISUAL_CRITIQUE-scored visual critic, in parallel.
- **Fallback ladder before the owner:** restructure for audit-only failures,
  split a one-issue finding into a follow-up slice, split oversized slices; only
  product/rule questions reach the owner, batched per tick.

Sources: Cognition, [Multi-Agents: What's Actually Working](https://cognition.com/blog/multi-agents-working)
(parallel writer swarms fragment code; single-threaded writes, parallel reads,
clean-context reviewer); Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
(planner → generator → skeptical evaluator that plays the live app; sprint
contracts; remove harness parts that stop being load-bearing; a retro game
maker was playable only with the evaluator) and
[Effective harnesses for long-running agents](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents)
(one feature at a time, end-to-end browser testing before claiming done);
[METR, 2026 update](https://metr.org/blog/2026-02-24-uplift-update/) (perceived
speed-up is unreliable, so measure merged results). This section supersedes
the plan-review stage and the parallel-writer capacity of the 2026-10-18
pipeline below; its state, ownership and merge rules still apply.

## Issue pipeline in Orca — 2026-10-18

Owner decision: implement issues only through Orca orchestration — plan,
implement, review, test, update docs, merge — with Codex agents as the main
workers. The [`warwrit-orca`](../../.agents/skills/warwrit-orca/SKILL.md) skill
is the coordinator procedure; its [`prompts/`](../../.agents/skills/warwrit-orca/prompts/common.md)
are the worker briefs.

- **State lives on GitHub.** Labels `agent:ready → planning → implementing →
validating → review → pr → done`, plus `blocked` / `needs-owner`, set only by
  [`scripts/orca-issue-state.sh`](../../scripts/orca-issue-state.sh). Orca
  Run/Task/Dispatch records attempts; GitHub records the issue's state.
- **The coordinator owns transitions.** Worker output is a claim. Advancing needs
  the plan/review verdict file, the worktree diff,
  [`scripts/orca-validate.sh`](../../scripts/orca-validate.sh) exit code
  (rebased, clean tree, package builds, typecheck, prettier/eslint on changed
  files, `vitest related`) and green PR CI.
- **Fresh read-only contexts** plan-review and code-review; one Codex writer per
  slice reuses its terminal for bounded rework (≤ 2 rounds per loop, then
  `needs-owner`).
- **Docs and merge.** The coordinator is the single writer of CHANGELOG,
  CURRENT_PLAN and wiki and adds them to the PR right before merge. Merge needs
  the owner's `agent:merge-approved` label on that PR (AGENTS hard rule 1),
  green CI and the expected head SHA; one PR at a time.
  _Superseded for pipeline slice PRs by [workflow v3](#workflow-v3--contract-first-one-issue-per-pr-merge-on-gates--2026-10-19)
  (merge on gates); infrastructure PRs keep this label gate._
- **Automation.** An Orca automation "Warwrit pipeline tick" (created disabled)
  runs one coordinator tick with the skill when a precheck finds issues in a
  pipeline state.

Sources: [Issue-Orchestrator](https://dev.to/brucebgordon/issue-orchestrator-a-software-engineering-control-plane-for-coding-agents-11ii)
(orchestrator owns state; agent output is a claim),
[Sortie](https://blog.serghei.pl/posts/how-i-taught-my-issue-tracker-to-dispatch-coding-agents/)
(label-driven states reconciled each poll),
[OpenCode issue workflow](https://gist.github.com/ppries/f07fd6316bbd45807dd7a1896555b05b)
(plan → review → implement → review with convergence limits),
[Addy Osmani, The Code Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/)
(verification is the bottleneck),
[Augment: open-source orchestrators](https://www.augmentcode.com/tools/open-source-agent-orchestrators)
(automated merge-conflict resolution mostly fails → serial merges), Orca
[orchestration](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/cli/orchestration.mdx)
and [automations](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/cli/automations.mdx).

**First attempt, 2026-10-18 — failures retained.** Five Codex workers for epic
#217 wave 1 did not start: the Codex CLI 0.146 update prompt blocked Orca
readiness; `terminal send --interrupt` suspended a Codex process that then held
`~/.codex/logs_2.sqlite` and blocked every other Codex; prompts pasted into
non-ready terminals reached zsh (interrupted, no command ran, worktrees clean);
the Claude Code auto-mode classifier refused coordinator-launched Codex with
approvals/sandbox bypass, and a sandboxed Codex still asked for approvals.
Organization MDM policy forbids Codex `never` approvals and full access, so
Orca's YOLO launch flag is unusable; workers run sandboxed (`workspace-write`,
`on-request` with the owner's `auto_review`) with the repository `.git`, pnpm
store and Playwright cache writable via `.codex/config.toml`. Codex 0.163 is on
PATH since 2026-10-18 (`~/.local/bin/codex` → Node 24.20 install). Prerequisites
for the next wave: Orca Settings → Agents with YOLO off for Codex, Orca's own
launcher (`worker-start --agent codex`) as the only launch path. Run `run_6c8d2ba11d09` tasks are blocked
and superseded.

**Headless workers — 2026-10-18 (supersedes the TUI launch path above).**
Orca-launched interactive Codex lost the terminal foreground (`node codex`
in its own process group, TPGID = zsh) and stopped on tty input, which also
kept the Codex log DB locked. Workers now run `codex exec --approve-for-me`
(workspace-write sandbox, approvals by automatic review — allowed by the MDM
policy) via [`scripts/orca-start-worker.sh`](../../scripts/orca-start-worker.sh)
and [`scripts/orca-codex-worker.sh`](../../scripts/orca-codex-worker.sh): a plain
Orca terminal, a non-injected Dispatch, a brief file, a JSON-schema result and
a `worker_done` sent by the wrapper. The coordinator is the same headless Codex
run by [`scripts/orca-pipeline-tick.sh`](../../scripts/orca-pipeline-tick.sh)
(one tick, lock, self-healing Run/mailbox; `--loop N` repeats in a visible Orca
terminal). The epic's slices are in
[`slices/epic-217.json`](../../.agents/skills/warwrit-orca/slices/epic-217.json).
A launchd schedule was refused by the Claude Code safety classifier and is not
used; the Orca automation stays disabled because it launches a TUI.

Smoke evidence 2026-10-18 (run `run_e48b73b5c4eb`): fresh Orca worktree from
the branch ran `orca.yaml` setup (ports 23447/25447, package builds); headless
worker typechecked web and committed `b5d6c03` into the shared `.git` from the
sandbox, `worker_done` succeeded reached the mailbox. A capability probe from
the sandbox ran `orca status`, `orca orchestration task-list`, `gh pr list`,
`gh issue view` and `git push --dry-run` with exit 0. First attempt failed on
`--approve-for-me` + `--sandbox` (mutually exclusive) and was fixed.

Checks 2026-10-18: `orca-validate.sh` on this branch PASS (rebased, clean,
packages, typecheck, format; a formatting failure was caught first);
`vitest related` and eslint invocations PASS on a sample file; state script
rejects unknown states. End-to-end pipeline run: NOT_RUN.

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

## Studio operating model — 2026-10-19

Owner, 2026-10-19: «Да, продолжай работать автономно, ты — директор студии и
отвечаешь за качество продукта». This section turns the Orca v2 code pipeline
into a studio. It adds no new engine: cells are lanes and briefs on the same
pipeline, and the owner merge gate stays.

### Decision rights

| Decision                                                           | Who decides                     | How it is recorded                        |
| ------------------------------------------------------------------ | ------------------------------- | ----------------------------------------- |
| Deploy, paid services, external messages; merge policy             | Owner                           | `agent:merge-approved` / explicit message |
| New canon: factions, faith, magic, history, rulers, era name       | Owner                           | `## Owner decision` on the epic or wiki   |
| Which mechanic or feature comes next; slice order                  | Studio director                 | slice plan + CURRENT_PLAN entry           |
| Mechanic details inside an owner-chosen direction (rules, numbers) | Studio director, owner may veto | owning wiki page, «director decision»     |
| Art and text details inside approved style, lore and references    | Director; critics must ACCEPT   | provenance / text critic record           |
| Code structure, tests, tooling inside AGENTS limits                | Builder; evaluator must ACCEPT  | PR                                        |

The owner gets one daily digest on the active epic: merged PRs with playable
proof, open PRs, and at most three owner
questions, each with a recommended answer.

### Cells

| Cell          | Lane in the slice plan | Writer                     | Gate                                                                                |
| ------------- | ---------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| Production    | —                      | Director                   | Board in CURRENT_PLAN top entry; daily digest                                       |
| Game design   | — (contract input)     | Director → contract writer | Contract cites the owning [mechanics page](../wiki/mechanics/index.md)              |
| Engineering   | `core`, `web`          | One builder per lane       | `orca-validate.sh`, evaluator plays the journey                                     |
| Art           | `art`                  | One art builder            | [warwrit-art](../../.agents/skills/warwrit-art/SKILL.md) loop, visual critic ACCEPT |
| Narrative     | `text`                 | One text builder           | Text critic ACCEPT ([TEXT_CRITIQUE](TEXT_CRITIQUE.md))                              |
| QA / playtest | — (read-only)          | Evaluator, playtest agent  | Regression journeys; bugs become issues, not chat                                   |

Art and text lanes write disjoint paths (`assets/art/**`, `apps/web/src/i18n/**`)
and may run beside `core` and `web` without raising the five-worker ceiling.

### Quality bar the director enforces

- Docs must match code. A mechanic page states what the current ruleset does,
  with links to the source; a proposal that differs is history, not status.
  First reconciliation 2026-10-19: zone of control, morale/flight/surrender,
  telegraphed intent and height/mud/fire were already in S4 (PR157) while the
  mechanics wiki still called them candidates.
- Every slice ends in a played journey; screenshots are evidence, not the claim.
- After each wave a five-line retro on the epic: lead time per slice, rework
  rounds, critic first-pass ACCEPT rate, what changed in a skill or brief.

### Order of work

1. Prove the pipeline: merged PRs with playable proof per day on #217.
2. Next core slice: [melee always connects](../work-packages/M1-MELEE-CONNECT.md),
   owner-decided 2026-10-07 and still not implemented.
3. Art lane with the region-compositing technique proven on the
   [Porechye sheet](../wiki/world/map.md#крупный-план-поречья-через-codex--2026-10-09).
4. QA hooks (`render_game_to_text`, `advanceTime`) for regression journeys with
   the installed [develop-web-game](GAMEDEV_SKILLS.md) skill.
5. Retro and metrics after each wave.

## Workflow v3 — contract first, one issue per PR, merge on gates — 2026-10-19

Owner, 2026-10-19: «Я уже сформировал план и идеи — зачем мне верифицировать
каждый pr? На это есть тесты и агент — ревьюер», «Давай уменьшать срезы —
один issue — один pr», «надо сначала создавать общий контракт, идею, потом
параллелить». This is a mission-level merge permission for pipeline PRs
(AGENTS hard rule 1) and supersedes the owner-label merge gate above.

**Why v2 did not deliver** (about 36 hours, #217): no product PR merged; the one
green PR (#229, 48 files) waited hours for the owner label; the desk slice went
through four REWORK rounds because the art-grade visual critic required
close-view and equal-height proofs for a UI change; slices bundled several
issues because the audit issues all edit the same large files and there was no
shared contract, so file ownership forced grouping and long `after` chains
behind one core slice; six PRs went to pipeline infrastructure.

**v3** ([warwrit-orca](../../.agents/skills/warwrit-orca/SKILL.md)):

- **Merge on gates:** CI, `orca-validate.sh` and the tier verdicts for the
  gated code head (later commits only evidence, CHANGELOG/CURRENT_PLAN or a
  merge of origin/main); the coordinator merges PRs it opened for slices and epic
  contracts; a CI fix goes back through review; `agent:blocked` on the PR or a
  linked issue, or an owner decision, stops a PR. Infrastructure PRs outside
  slices keep the owner gate (`agent:merge-approved`).
- **Tiers:** D docs/tests → reviewer; L logic → reviewer + evaluator plays it;
  U UI → evaluator judges the issue's visual criteria; V art/scene → plus the
  full visual critic. Art proofs never block D/L/U.
- **One issue = one slice = one PR**, about 300 changed lines without tests.
- **Epic contract first:** one writer lands shared types, optional protocol
  fields, stubs, seams and a task list with `[P]`/`after`; then each issue runs
  as its own slice in parallel up to the lane limits.
- **Reports:** state changes only, plus one daily digest.

**Amendment — 2026-10-21, one coordinator.** An audit found that a Codex desktop
mission took the coordinator lock on 2026-10-19 23:41 and ran sprint #161 while
the Orca loop stopped, so nobody reconciled #217 labels and PRs of 700–3700 lines
merged. [AGENTS.md § Orchestration](../../AGENTS.md#orchestration) now owns the
rules: one lease holder, mission scope quoted verbatim, one issue per PR checked
by [`check-pr-scope.sh`](../../scripts/check-pr-scope.sh), handover before
stopping. The tick script now honours a foreign lease; before, it ignored the lock after
90 minutes and could run beside the other coordinator.

Sources: GitHub [Spec Kit](https://github.com/github/spec-kit/blob/main/spec-driven.md)
(constitution → specify → plan → tasks with `[P]` → implement → converge);
[BMAD method](https://dev.to/bspann/bmad-method-ai-driven-agile-development-that-actually-works-part-1-core-framework-36n1)
(architect shards the plan into self-contained story files; one story at a
time; adversarial QA review; fresh context per workflow);
[Anthropic multi-agent research system](https://simonwillison.net/2025/Jun/14/multi-agent-research-system/)
(each worker needs objective, output format, tools and clear boundaries);
[parallel Claude Code agents](https://www.aakashx.com/blog/parallel-claude-code-agents/)
and [Codex multi-agent coordination](https://freeacademy.ai/lessons/codex-multi-agent-coordination)
(define shared contracts before parallel work; stubs; merge in dependency
order); [stacked PRs for agents](https://zylos.ai/research/2026-05-21-stacked-prs-ai-agent-collaboration/)
(small PRs under about 200 lines, sequence tasks that share files).

## Pipeline evidence review — 2026-10-21

Owner request 2026-10-21: improve the pipeline by best agentic practice, every
change proven with sources. Baseline from `scripts/orca-metrics.sh 4` and the
coordinator/worker logs under `~/orca/workspaces/warwrit/` (untracked), measured
2026-10-21 for 2026-10-17 to 2026-10-21:

| Measure                    | Value                                            |
| -------------------------- | ------------------------------------------------ |
| Merged PRs (all writers)   | 25                                               |
| Coordinator ticks          | 91, 128.2M input tokens (mean 1.4M per tick)     |
| Worker runs                | 111: 85 succeeded, 20 failed, 6 without a result |
| Worker input tokens        | 622.3M                                           |
| Gate verdicts              | 25 REWORK, 12 ACCEPT                             |
| Input tokens per merged PR | 30.0M (desktop-mission tokens NOT_MEASURED)      |

Sampled failure causes: the commit audit (cognitive complexity/CRAP of
`CommandDesk` and `BattleOutcome`, and a missing `coverage/coverage-final.json`)
blocked builders at least seven times; evaluators could not reach the lab
(refused ports, a busy shared gate) and returned REWORK for missing proof; gate
findings were often missing evidence matrices rather than product defects.

| Change                                                                                                 | Failure it addresses                                                                                                                               | Source                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orca-state-digest.sh`: the tick runs the model only on changed state, heartbeat 3 h                   | 1.4M tokens per tick, also when nothing could advance                                                                                              | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) (2024-12-19): simplest solution, deterministic workflows for fixed steps                                                                                                         |
| Tick gets a state snapshot and re-reads only what it changes                                           | each tick re-reads GitHub and Orca in full                                                                                                         | [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (2025-09-29): context is a finite resource; keep references and load just in time                                                                          |
| Pre-commit hook refreshes focused coverage                                                             | audit failed on a missing coverage file (reproduced)                                                                                               | measured failure; [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (2025-11-26): leave a clean, committable state each session                                                                |
| `orca-play.sh` boots, health-checks and stops the lab; exit 3 = `BLOCKED_ENV`                          | refused ports; orphaned node servers kept ports after stop (reproduced)                                                                            | Effective harnesses: an init script plus a basic end-to-end check at session start; test as a human user would with browser automation                                                                                                                                        |
| Evaluator takes missing proof itself; REWORK only for defects; `BLOCKED_ENV` outside the rework budget | 25 REWORK vs 12 ACCEPT, many for proof gaps                                                                                                        | Effective harnesses: verify end to end before marking a feature passing; [multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) (2025-06-13): clear objective, output format and boundaries per subagent                            |
| Contract plans a behaviour-preserving restructure commit before touching complex functions             | repeated complexity/CRAP commit failures                                                                                                           | measured failure; Effective harnesses: one feature at a time with commits that can be reverted                                                                                                                                                                                |
| `orca-metrics.sh` in the daily digest                                                                  | no measurement of whether a pipeline change helped                                                                                                 | multi-agent research system: token usage explained about 80% of performance variance; start evaluation with small samples; Building effective agents: add complexity only when it demonstrably improves outcomes                                                              |
| `core.hooksPath` set back to the relative `scripts/git-hooks` (local Git config, not tracked)          | the shared config pointed every worktree at the primary checkout's hook, 185 commits behind main, so hook fixes never reached workers (reproduced) | measured failure; [git-config `core.hooksPath`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-corehooksPath): a relative path is taken relative to where hooks run, and [githooks](https://git-scm.com/docs/githooks) runs them from the working-tree root |
| Mailbox probe recreates a terminal that lost its stable pane                                           | `orchestration check` failed with `stable_pane_required` (reproduced)                                                                              | measured failure                                                                                                                                                                                                                                                              |

Headless workers keep using `codex exec --json` with `--output-schema` and
`-o`; its `turn.completed` events carry the token usage the metrics read
([Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)).
Expected effect, to be re-measured with `orca-metrics.sh` after the next wave:
fewer coordinator tokens per merged PR, fewer failed builder runs, and a lower
REWORK share. Until then these are hypotheses, not results.

**Amendment — 2026-10-21, self-driving backlog.** Owner: «Продолжай. Обнови
задачи, настрой автоматизацию - необходимо чтобы проект разрабатывался и
улучшался, оптимизировался!». After the takeover the coordinator escalated an
evidence question on #184 to the owner and sprint #161 (#167–#177) had no
pipeline labels, so lanes could fall idle with work open. The skill now:
refills a free lane with the highest-priority uncovered issue and splits large
issues into child issues ([Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents):
each session picks the highest-priority unfinished feature from a tracked list);
decides evidence and process questions itself under the owner's delegation;
runs a daily scout that plays main and files at most three findings (same
source: test as a human user would with browser automation); and records daily
metrics, opening a `pipeline` issue when failures rise two days in a row
([Building effective agents](https://www.anthropic.com/engineering/building-effective-agents):
add complexity only when it demonstrably improves outcomes). The loop restarts
itself when a tick checks out a newer tick script, and polls every 10 minutes
because an unchanged state costs only the digest.
