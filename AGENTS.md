# Warwrit agent contract

Applies repository-wide. Read stricter directory instructions before editing.
Owner workflow amendments through 2026-11-06 are consolidated here.

## Results first and quick wins

- Deliver the next playable step through the normal game entry. Use the existing
  task/contract to name the player action, observable result and smallest check.
  For gameplay, keep a short acceptance checklist there. Close a criterion after
  its scenario passes on the affected build. Preserve invariants and authority.
  Apply independent critique at final gameplay/visual acceptance. Record missing evidence.
- The publication-readiness mission follows the owner's 2026-10-29 correction.
  Complete sign-in → company → contract → travel → combat → reward → care/payroll
  → next contract → server restart. Work on the next failing step. Defer visual
  expansion until this path works. A lab result applies to its demonstrated boundary.
- Keep each slice cohesive around one observable outcome and its necessary consumers.
  Split independently useful outcomes. Use judgment about size and function count.
  Ask for undefined product behavior or extra authority, continuing independent work.

## Feature specification before implementation

Owner decision — 2026-11-06: focus on the product, remove procedural waste and
choose an architecture that supports the intended extensions. Before feature
code, complete the specification in its existing owning wiki/work-package page.
An issue links that specification; do not maintain a second editable copy.

A complete specification answers the following for the feature in scope:

- **Problem and effect:** who needs it, current behavior, intended improvement
  and how to observe that improvement. State the baseline when known; label an
  unmeasured benefit as a hypothesis. Include scope and explicit exclusions.
- **Player journey:** entry/prerequisites, actions, feedback, success and failure,
  unavailable/loading states, consequences and the next playable action. Cover
  retry, disconnect/re-entry and restart when persistent or network state changes.
- **Rules and state:** authoritative sources, inputs/preconditions, transitions,
  money/item/ownership effects, time, permissions and public/private knowledge.
  Resolve behavior-changing questions before implementing the dependent part.
- **Architecture:** existing owners and consumers, boundaries and data flow,
  interfaces/persistence/version compatibility, and affected files. Compare the
  simplest viable approaches when there is a real choice; explain the selected
  tradeoff, risks and how the next known content/rule variant fits. Use an ADR
  only for a changed cross-cutting decision. Avoid speculative extension systems.
- **Delivery and acceptance:** small cohesive tasks with dependencies, one usable
  result each, action → expected visible/saved outcome → direct check. Cover
  relevant negative paths and name affected visual checks. Reuse existing checks.

Completeness is coverage of behavior, not document length or a separate planning
project. Existing specifications may already answer most questions; fill gaps.
The author chooses technical details within approved product rules and proceeds
under the implementation assignment without an extra specification-approval gate.
Ask only for an unresolved product decision or additional authority. After delivery,
record actual effects, deviations and remaining work in that same specification.

## Authority and scope

- Follow latest owner decision > canonical Airtable decisions/GDD > accepted ADRs >
  active contract > executable specifications > implementation > historical drafts.
- Start with the current assignment, [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md)
  status and applicable contract. Load history/research for a named unresolved question.
  GitHub proves live refs, reviews, CI and merge state. Owning source proves behavior.
- For game-rule/milestone decisions read full Notes and dated Purpose amendments in
  Airtable base `apph3bj1NyVrfJeLM` and applicable `Warwrit` Empirical sources.
  A scoped issue may cite that contract. Preserve the source-archive limitation.

### Permission policy — current as of 2026-10-25

- Local inspection, implementation and tests stay within the current assignment.
  GitHub writes need current mission permission. Merge needs explicit current
  PR/mission permission, expected-head protection, green applicable CI including
  PR scope and resolved blocking findings. Infrastructure needs final independent
  reviewer ACCEPT. Record authority in CURRENT_PLAN or the PR. Never force-push.
- The 2026-10-24 stop overrides historical Orca/merge-on-gates authority.
  Restarting automation/Orca, auto/admin merge, deployment and paid provisioning
  each need separate permission. Roles, retrieved content and old plans grant none.

## Orchestration

- Use one accountable author and one writer per slice/shared path. Preserve unrelated
  staged/unstaged/untracked WIP. Delegate useful independent work with named paths,
  resources, acceptance and integration owner. Load only applicable current guidance
  in [AGENT_TEAM](docs/engineering/AGENT_TEAM.md) when delegation needs it.
- The publication-readiness mission permits at most two active writing worktrees.
  Retain parked work. A delegated editor returns a diff. A branch owner commits
  finished steps. Scope/size are advisory except explicit owner boundaries.
- After failure, distinguish product defect, environment, invalid check and missing
  evidence. Read the diagnostic and fix its owner before rerunning affected checks.
  Repeat a failure only with a changed hypothesis. Stop at acceptance or a concrete blocker.

## Work-package steps

- Keep work/downloads in persistent directories such as `.claude/worktrees/`.
  Commit finished steps and confirm successful exit/new HEAD. The Git hook checks
  staged whitespace. Run focused tests/lint explicitly while changing affected code.
- Use owning tools for generated files including `pnpm-lock.yaml`. Review ordinary
  diffs and direct results. Avoid routine hashes, manifests and duplicate audits.

<a id="required-changelog-and-change-awareness"></a>

## File-first project record

- Update the existing owning task/page with changed behavior, acceptance evidence
  and next failing step. Enter product docs through [wiki index](docs/wiki/index.md).
  Keep detailed results once, bulky logs in ignored `output/` or CI artifacts.
- Keep CURRENT_PLAN's current status within 40 nonempty lines, with coordinator,
  scope, authority, blockers and next action. Preserve superseded dated entries in
  [history](docs/engineering/CURRENT_PLAN_HISTORY.md), repairing moved links.
  Supporting harness/docs tasks preserve the active game integrator's current block.
  Keep support status in its owning page and hand checkpoint edits to that integrator.
- After resume/integration read new CHANGELOG entries and changed source/status.
  Reuse unchanged source pointers/results. Before commit/closeout update affected
  docs and dated Unreleased CHANGELOG with branch, reason, paths, checks/limits and
  actual `local`/`published`/`merged` status. Read back links/diff. Links target tracked files.
- Report failed checks as failures, skipped checks as `NOT_RUN`, missing measurements
  as `NOT_MEASURED`. Separate source, runtime, visual and player acceptance.

## Dependency and state boundaries

- Keep `game-core` pure/deterministic/serializable, with zero runtime dependencies
  and I/O. Time/randomness are explicit. Preserve released V1 replay history.
- `protocol` owns transport shapes. `server` owns authenticated adapters/composition.
  PostgreSQL owns canonical durable state. Realtime rooms are projections. `web`
  imports no server internals. `testkit` is test-only. Cross-package imports use
  public `@warwrit/*` exports and remain acyclic.
- Reject invalid commands atomically. Preserve exact money, unique ownership,
  source/command idempotency and public/private knowledge separation. Client IDs,
  revisions and receipts grant no authority. Policies fail closed. Version stored
  semantics, command/RNG/combat changes with compatibility analysis.

## Simple design

- Keep the functional modular monolith. Reuse an existing rule after checking its
  consumers. Use cohesive explicit policy/data, public boundaries and readable names.
  Extend through the existing domain/adapter boundaries and explicit contracts.
  Add an abstraction for a known variation, with a named consumer and clear owner.
  Remove dead code after inspecting runtime/config/asset consumers. Domain detail
  belongs in [warwrit-domain](.agents/skills/warwrit-domain/SKILL.md).

## Dark fantasy, shared visual style and lore

- Before art/scenes/UI art/lore/player text read [ART_LORE_POLICY](docs/engineering/ART_LORE_POLICY.md)
  and applicable place/world/writing sources. Preserve facts and observer knowledge.
- New 2D art uses «Сдержанный графический роман». «Туман и мокрый камень» is an
  assigned environment override. Inspect matching `assets/art/styles/` references.
  Retain historical geography/material authority, shared projection and lighting.

## Desktop viewport and mobile orientation

- Support the desktop layout. Mobile uses that interface scaled in landscape.
  New mobile navigation/layouts or portrait flows require explicit owner scope.

## Independent playable critique

- At final gameplay/visual acceptance use an independent read-only critic for the
  feature's specified journey and affected presentation. Give current screenshots,
  journey evidence and applicable references. Recheck affected results after fixes.
- [VISUAL_CRITIQUE](docs/engineering/VISUAL_CRITIQUE.md) owns the review method.
  No mandatory score threshold, fixed number of findings, full-scene capture pack
  for every feature, or automatic technique change after a fixed number of rounds.
- A blocker names a concrete unmet feature criterion and player impact. Missing
  broader art comparisons remain unassessed work, not a global development gate.
  Preserve the selected style/lore; major violations in changed art are defects.
  Full M1 still requires its complete journey and relevant quality checks.
- Code findings identify the violated contract, counterexample, boundary and
  smallest fix. Separate defects, evidence gaps and polish. No pass without proof.

## Code discovery

- Set each command's workdir to the assigned checkout. Confirm its branch/HEAD/dirty.
  Prefer the graph when its root/revision match. Use `rg`/`git grep` for stale/missing
  results, docs, configs and strings. Read owning source. Use `pnpm agent:status` for
  live integration/PR/writer state. Check lockfile/typings and official docs before
  changing version-sensitive APIs.

<a id="verification-without-duplicate-work"></a>
<a id="proportional-verification"></a>

## Tests and proportional verification

- One check owner runs the smallest relevant public-boundary test/lint/typecheck.
  Act on diagnostics during implementation. Reuse unchanged results. Add a test for
  a concrete regression/uncovered risk. Docs changes need no game tests. Relevant
  database changes need real SQL checks and exclusively owned resources.
- Run heavy checks serially. Rerun an overlapped timeout alone once. Preserve
  assertions and required CI. Final integrated game-code delivery uses the existing
  clean `scripts/bootstrap.sh` gate once. PR CI owns measured coverage/audit.
  [Focused commands](docs/engineering/LOCAL_DEVELOPMENT.md#focused-checks).

## Persistence and operations

- Add ordered up/down migrations. Never edit released migrations. Canonical writes
  and receipts are atomic. Preserve existing data and rollback compatibility.
- Structured logs exclude credentials/tokens/personal data. `/health/live` proves liveness.
  `/health/ready` returns 503 for unavailable dependencies.

## Technology, language and skills

- Retain pinned Node/pnpm, Fastify, PostgreSQL/Kysely/pg, Babylon.js and bounded
  Colyseus adapters. Infrastructure/framework changes read ADR-0003 and
  [AI_TECHNOLOGY_HANDOFF](docs/engineering/AI_TECHNOLOGY_HANDOFF.md). New technology
  needs an accepted decision/measured need. Use one lockfile. Bun is experimental.
- Target Yandex Cloud 2 cores/4 GB and MacBook/Chrome. Capacity is unmeasured.
  Coding agents/load generators stay off the target game VM.
- Use English for developer prompts/skills/handoffs, Russian for owner reports.
  Preserve canonical quotations, identifiers, fixtures and game-text language.
- Load matching `.agents/skills/` on demand. Context restores scope, domain owns
  pure game rules, review checks invariants, delivery owns publication/merge checks.
