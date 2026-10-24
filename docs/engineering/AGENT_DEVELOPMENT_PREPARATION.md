# Agent development preparation — KISS revision

Status: local workflow implementation, 2026-10-25; independent review pending.
The current amendment below supersedes conflicting historical process advice.
Gameplay pilot NOT_RUN; token/time savings NOT_MEASURED. No publication or restart.
Scope: the owner's review/simplify request, not activation of a gameplay card.
This supersedes the tooling recommendations in the Sept 27 audit, preserving its
observations and evidence. CURRENT_PLAN and canonical sources still own delivery.

Dated amendment, 2026-09-27: the owner subsequently requested native Codex subagent
roles and responsibility boundaries. [AGENT_TEAM](AGENT_TEAM.md) adds three narrow
profiles and a source-linked memory index. This adds no orchestration framework or
hooks and does not complete the two infrastructure repairs below.

Dated amendment, 2026-09-29: PR #105 implemented the verification-database
isolation repair. The cross-workspace relative-import repair is still open. On the
owner's request the harness was hardened: the getsentry `code-review` and
`code-simplifier` helpers were removed (their applicable checks moved to
`warwrit-review`); best-effort command guards were added in `.codex/rules/` and
`.claude/settings.json`; `pnpm check:migrations` runs in pull-request CI; and
`pnpm agent:preflight` records checkout identity. Statements below about installed
helpers and the absence of hooks describe the 2026-09-27 state.

## Current workflow — 2026-10-25

The owner accepted A–D and first-correct-result guidance from the workflow review,
then requested «Хорошо. Запусти Sol 6.1 subagent for implement improvements and
another subagent after for review skils, agents.md and grade them with best practices».
This is local tooling/instruction implementation, not gameplay activation. It
explicitly amends earlier mandatory contract/stub, one-issue/300-line, fixed-rework,
refill/scout and push-before-stop policies. The 2026-10-24 owner stop supersedes
previous broad merge/automation permission; [AGENTS](../../AGENTS.md#authority-and-scope)
owns current authority. Existing domain invariants, independent playable/visual
acceptance, required CI, commit hooks and audit thresholds remain effective.

### Work and context

Use one accountable author and the shortest cohesive result. Delegate only an
independent useful question/slice with explicit file/resource ownership and an
integration owner. A contract is the existing issue/accepted source plus decisive
criteria; a separate contract agent/epic PR is optional for a real dependency.
Preparatory interfaces must have a named current consumer/migration and verifiable
behavior. Never add empty functionality or tests to satisfy caller counts.

Before nontrivial implementation extract a compact working note: player outcome;
decisive criteria/regressions; source and code owner of each rule; producers and
consumers; base/write boundary; feasible verification. No extra document when the
issue already supplies this. Read only uncertainties that can change the solution:
which code runs, where the rule lives, existing analogues and whether the scenario
can be reproduced. Use targeted reading or a safe probe before generating code.
Unavailable product authority is a blocker; routine technical choices are owned
by the author. Continue independent permitted work while a question is pending.

Read mandatory sources fully once, then retain source/version pointers and the
short decision. Recheck changing head, permission, dirty state, configuration and
environment. Query exact symbols/consumers and narrow tool fields; obtain complete
relevant error context after truncation. Keep one active prompt/artifact, not
repeated translations or copied histories. Handoffs give source pointers, ownership,
findings and remaining proof; the reviewer independently inspects source.

### Risk, iteration and verification

The author self-reviews scope and affected consumers. Independent review applies
at established risk/result boundaries; infrastructure needs reviewer ACCEPT,
visual/gameplay work retains integrated playable and visual criteria. Size is an
advisory review signal, never automatic ACCEPT. Several related issues may share
a cohesive PR only when every issue retains its own acceptance and closure.

Classify rework as requirement/assumption, code defect, environment or missing
proof. Retry after a new hypothesis/change; the same cause recurring requires a
technique change or concrete blocker. Never split issues to reset a count. An
unattended mission needs explicit activation, budget and stop condition. A single
integrated art sample must pass the approved reference comparison before a batch;
retain the existing visual technique-change rule.

One named owner runs local validation per relevant revision. The updated
[local routing](LOCAL_DEVELOPMENT.md#proportional-local-validation) treats pure docs
separately, checks consumers of shared contracts and routes executable/config/lock/
unknown paths conservatively. Deleted/renamed paths cannot disappear. Missing
related tests is not proof. Coverage-dependent audit stays in existing hooks/CI;
bootstrap, CI and thresholds are unchanged. Record checked code, command/environment,
outcome and limits. Rerun affected checks on changed inputs; preserve applicable
unaffected results. Do not create a second runner/cache/telemetry framework.

### Implemented controls and remaining acceptance

- A: current authority, explicit editor/branch-owner modes and compact source/
  first-result guidance in AGENTS, team/context/delivery skills and worker prompts.
  Historical decisions remain dated and explicitly superseded where conflicting.
- B: tick checks STOPPED_BY_OWNER before loop/caffeinate/network/mutation/model,
  between ticks and before model launch. Exit 20 ends the loop. It retains the
  marker and releases only its own loop/lease resources. This is a preflight/
  dispatch boundary, not proof of instant interruption of external processes.
- C: size/top-file report is advisory; issue/contract linkage and a meaningful
  description remain required when checking a PR body. Read/base/diff failures
  fail closed. Existing workflow/job identity is retained (`PR scope` / `One issue
per pull request`). Parent live readback on 2026-10-25 found main unprotected and
  no branch rules; repo-required checks still apply. No labels were changed.
- D: proportional local routing with one check owner. No hooks/thresholds,
  `scripts/bootstrap.sh` or `.github/workflows/ci.yml` changes. Broad CI optimization
  remains a separate measured task.

Local fixture and actual check results are recorded below at closeout. Independent
review pending; gameplay pilot E NOT_RUN. For the next real gameplay pilot record
available total agent input/output tokens (cache separately), time to acceptance,
substantial rework count/causes, first-submitted acceptance and later regressions.
Missing data is NOT_MEASURED. Compare comparable tasks; one pilot cannot prove
universal speedup, and a cheap failed attempt may cost more in total.

### Local implementation checks — 2026-10-25

Base: `1c793e1676a463d8ea750a890ccb493065ffb04e`; branch
`codex/agent-workflow-improvements`. No gameplay/source-rule changes.

- `bash scripts/tests/agent-workflow-fixtures.sh`: PASS. Isolated local Git and
  stubbed external commands cover stop at single/loop entry, after a tick and
  while waiting; no-marker dispatch reaches only the stub model. Routing covers
  docs, CSS, server, core, protocol, deletion, rename, scripts/CI, lockfile, config
  and unknown paths. Command assertions cover consumer checks, broad fallback and
  zero-tests failure. Scope covers small/large/multiple issue refs and missing
  linkage/description/body/invalid base/diff failures. No actual Orca/network used.
- `bash -n` on the three changed scripts and fixture: PASS.
- `bash scripts/check-current-plan.sh`: PASS, 11 nonempty current status lines.
- Python `tomllib` parse of the implementer profile: PASS.
- Pinned `pnpm install --frozen-lockfile --offline --ignore-scripts`: PASS;
  dependencies reused from local store; no dependency/lockfile changes.
- Scoped Prettier, added local Markdown links (24 targets exist) and ordinary
  `git diff --check`: PASS. Manual read-through covers all 16 proposal counterexamples:
  WIP/old-branch/stop authority; large/multi-issue acceptance; docs/executable/
  protocol routes; environment failure; visual acceptance; changed-main evidence;
  interrupted sessions; source reuse; decisive probes; truncated errors; stale pass.
- Normal commit-hook audit on implementation commit `1346ea49`: PASS, 21 changed
  files, no new dead-code/complexity/duplication findings; no bypass. Fallow warned
  that base/head semantic identities differ, so comparison used syntactic
  attribution (head type-aware findings still apply). This is not full semantic
  proof. The subsequent results-only Markdown commit uses the unchanged hook's
  documentation-only skip. No hook/threshold changes.
  Full bootstrap, game suites, browser/visual acceptance and pilot E NOT_RUN for
  this tooling-only slice. Independent review pending; savings NOT_MEASURED.

### Source basis and limits

[Google small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
supports cohesive reviewable changes rather than a universal line cap.
[Anthropic best practices](https://code.claude.com/docs/en/best-practices) and
[context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
support concise persistent guidance, targeted inputs and retained decisions.
[OpenAI AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
supports scoped instructions; [effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
supports durable progress and actual user journeys. These are principles, not
measured Warwrit savings. Local rules and script fixtures are the acceptance
contract here; no new evaluator framework or score target is introduced.

## Historical preparation — 2026-09-27/29

The sections below preserve the original proposal and dated corrections. They do
not create fresh prerequisites; current source and the amendment above control.

## Keep the existing workflow

Use `warwrit-context`, `warwrit-domain`, `warwrit-review` and `warwrit-delivery`.
Two optional review helpers are installed in `.agents/skills`: `code-review` and
`code-simplifier`. Their [provenance and project precedence](../../.agents/skills/README.md)
are recorded locally. They add no runtime dependencies or executable hooks.

Use Git worktrees, a bounded assignment and the existing gate. A new orchestration
framework, ownership database, three agent-management scripts and lifecycle hooks
are not prerequisites for the next bounded development task.

## Two immediate repairs

| Change                                      | Existing owner / write scope                                                                 | Evidence                                                                                                  | Acceptance                                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reject cross-workspace relative imports     | `scripts/check-architecture.mjs` and focused fixture test                                    | The unchanged checker accepts web→server relative imports; equivalent named import fails                  | Internal relative and allowed public imports pass; forbidden relative, deep, undeclared and cyclic imports fail                                             |
| Isolate verification PostgreSQL and cleanup | `scripts/bootstrap.sh`, `scripts/migration-smoke.ts`, minimal test infrastructure definition | Fixed 5432/shared Compose lifecycle; smoke defaults to application DB; status can write before assertions | Two owned disposable jobs coexist; failure/interrupt A preserves B and an audit-owned persistent-like fixture; missing smoke target fails before connection |

Keep developer `db:up` persistent. Give verification its own resources and clean
up only resources created by that invocation. Do not add test records to valued
developer databases. Preserve the real migration up/down/idempotency checks.
Do not replace the architecture checker or add a general process supervisor.
For isolation, run two real migration/lifecycle jobs with failure and signal
cases; do not duplicate the full build/unit/combat gate merely to test DB ownership.

The prior estimates for these two repairs total 8–16 engineering hours. This is
an unvalidated scope estimate, not elapsed agent time or measured savings.
The earlier 27–53 hours included optional and later work; it is not a prerequisite
budget for beginning development. Scope PRs by cohesive, independently reviewable
responsibility and include the necessary tests and docs. Treat diff size as a review
signal; split only work that can be verified independently.

## Parallel work without a new control plane

The parent assigns work and verifies the combined result. Use separate worktrees
for writers and separate build/service resources when needed. Subagent creation
alone does not isolate files. Read-only review can run alongside useful local work.

Each assignment needs only:

1. One outcome and non-goals, with the applicable source/contract pointers.
2. Verified base, branch/worktree and required merged predecessors.
3. Allowed paths, existing writer ACKs and any exclusive service resources.
4. Observable acceptance, focused checks and a bounded stopping condition.

Each handoff reports changed paths, exact revision, command outcomes/log pointers,
findings and unfinished work. Reuse the delivery skill's existing template; do not
create a second receipt format. Dirty changes must be inspected before attributing
evidence to a committed tree. A stale or missing source is unknown, not permission.

One writer owns each shared path. The existing C05-FIN reservation remains with
its author until an explicit release. No new local JSON registry overrides it.
Start with one independent worker only when it can run alongside useful parent
work; add concurrency when there are further disjoint tasks, not to fill slots.

The parent reviews the union and uses the existing exact-tree gate once. Individual
green branches do not prove their union. No worker acquires merge authority from
its role, successful CI, a skill or this proposal.

## Add tooling only at the relevant boundary

| Trigger                                                 | Smallest next change                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent UI/server work                               | Explicit web port/API origin and strict port failure; verify two actual lanes before relying on them                                |
| QA00 / runnable PB path                                 | Single-lane health UI verification can start without parallel-lane infrastructure; add real PB journeys when implemented            |
| Delivery enforcement                                    | Configure a narrowly scoped GitHub rule requiring the existing CI check; verify effective policy without merging a negative-test PR |
| A demonstrated recurring preflight/coordination failure | Automate that specific check in an existing owner; add a hook only if the supported host provides measurable benefit                |
| Realtime or accepted renderer work                      | Load the previously researched official engine skill at the ADR-defined stage, checking exact versions and local API types          |

Do not introduce SessionStart/SubagentStart/PostToolUse/Stop pipelines, a custom
agent registry or a new orchestration skill now. Hook availability and absence
of configuration do not establish a problem. Keep GitHub enforcement separate
from local hooks: bypassable local checks cannot replace remote required checks.
Clarify the PR template by linking the single gate owner rather than adding
another command list. Do not rename bootstrap interfaces merely for symmetry.

## Evidence and limits

The local original audit (`artifacts/agent-readiness-2026-09-27/REPORT_RU.md`, Git-ignored)
retains scripts, hashes, positive/negative fixtures and baseline execution on
`a5fb1c0ba42d94ce80f8dce16d04203b9827c02e`. The
KISS review (`artifacts/agent-readiness-review-2026-09-27/REVIEW_RU.md`, Git-ignored)
records selection and simplification reasoning. These ignored artifacts are local
evidence; share the accompanying archive if another checkout needs them.

This change installs review guidance and refines the plan. It does not fix the
checker, isolate the existing bootstrap, enforce GitHub policy, or prove agent
speedup. No throughput/token/cost improvement is claimed. Existing product source,
browser/device, SQL race/crash and original-archive evidence boundaries remain.
