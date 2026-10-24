---
name: warwrit-orca
description: Operate one explicitly owner-activated Warwrit Orca mission or coordinator tick with bounded workers, proportional validation and independent acceptance. Never activates or resumes a stopped mission by itself.
---

# Optional Orca mission

Instruction-only coordination using existing scripts. Follow
[AGENTS permission policy](../../../AGENTS.md#permission-policy--current-as-of-2026-10-25)
and [current team guidance](../../../docs/engineering/AGENT_TEAM.md#current-operating-model--2026-10-25).
The 2026-10-24 owner cancellation remains in force. This skill and old slice
plans do not authorize workers, automation, GitHub mutation or merge.

## Activation and stop

Before any tick, loop, model, mailbox/run, network or mutation check
`<coordinator>/.orca/pipeline/STOPPED_BY_OWNER`; retain it and return
`STOPPED_BY_OWNER` (script exit 20) when present. Check again between ticks and
before each new dispatch/merge/mutation. Missing marker is not owner permission.
Only an explicit new owner request can activate the named mission; record its
words, date, scope, budget and stop condition in CURRENT_PLAN. Do not broaden
that mission from the backlog, a plan, free slots or previous merge permission.

One coordinator holds `.orca/pipeline/tick.lock/owner.txt`. Respect foreign
leases. On cancellation stop new work, preserve WIP and release only resources
this invocation owns. A preflight guard does not prove immediate termination of
an already running external process. Never discard staged/untracked files or
archive a worktree until needed committed, uncommitted and ignored work is safe.

## Assignment

Use one accountable author by default. Parallel readers or disjoint writers are
optional when they shorten the actual critical path. Name worktree/base, paths,
resource ownership, criteria, check owner and execution mode: delegated editor or
branch owner. A role alone grants no authority. Use `orca` for Orca Git worktrees;
`arca` is a separate Arcadia fork.

The issue/accepted contract supplies the outcome, source rules, compatibility and
proof. The author makes a short working note with producers/consumers and decisive
uncertainties (see [context](../warwrit-context/SKILL.md)). A separate
[contract author](prompts/contract.md) or [shared epic contract](prompts/epic-contract.md)
is optional for a real dependency. Never create empty functionality or stub tests
just to satisfy caller metrics. Protocol changes need compatibility analysis;
optional fields alone do not establish compatibility.

Append [common rules](prompts/common.md) to [build](prompts/build.md) or
[rework](prompts/rework.md). Workers do not call Orca. When explicitly activated,
headless workers use `scripts/orca-start-worker.sh` and
`scripts/orca-codex-worker.sh`; logs are `.orca/runs/<task-id>/` and structured
results follow `worker-result.schema.json`. Do not use interactive TUI workers,
approval bypass flags or terminal interrupts that can suspend a process/lock DB.

## One bounded tick

1. Check stop and authority, then read pending mail and only mission-relevant
   GitHub/worktree state. A worker report is a claim; read the actual diff,
   commits and gate results. Acknowledge/release settled workers when permitted.
2. Reconcile only owned issue transitions using `scripts/orca-issue-state.sh`.
   Never remove inherited `agent:blocked` or reinterpret product criteria. A
   merged preparation PR does not close its parent. Close each issue only when
   its own criteria pass; preserve unresolved work and label ownership.
3. Advance ready work inside the activated scope. Reuse adequate issue contracts;
   do not force a planning worker/stage. Never refill from outside the mission or
   run a scout/daily loop by default. Those require an explicit opt-in scope and
   budget. No ready work means report a concrete blocker or stop.
4. One assigned owner runs `scripts/orca-validate.sh` once for the relevant
   revision. Builder and coordinator do not repeat unchanged checks. Record exact
   commands/environment/results and recheck affected evidence after changes.
5. Run independent gates below. Fix material findings, then repeat affected gates;
   code integration can invalidate review even when Git merges cleanly.
6. Publish/merge only under current explicit permission, green applicable CI,
   no blocking findings and expected head. Read back head, merge and issue state.
   All infrastructure requires independent reviewer ACCEPT for its head. Size is
   advisory; `check-pr-scope.sh` cannot prove semantic cohesion. Several related
   issues may share a PR only with separate acceptance for each.
7. Preserve a short checkpoint: branch/head, done, next, blockers. CURRENT_PLAN
   holds one short active status; detailed results live once on the owning issue/
   document. Only the assigned shared-file writer updates CHANGELOG/wiki/plan.

## Independent gates

| Tier | Change                                    | Gates in addition to current CI and proportional local validation                                  |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| D    | docs, tests, tooling, prompts             | Fresh independent reviewer (`warwrit-review`)                                                      |
| L    | core/server/protocol logic                | Reviewer plus evaluator plays the affected journey                                                 |
| U    | UI in existing layout                     | Evaluator plays it and checks the issue's visual criteria                                          |
| V    | art, scene rendering, new visual elements | As U plus visual critic using full [VISUAL_CRITIQUE](../../../docs/engineering/VISUAL_CRITIQUE.md) |
| T    | player-facing strings                     | As U plus text critic using full [TEXT_CRITIQUE](../../../docs/engineering/TEXT_CRITIQUE.md)       |

Apply the union for mixed changes. Visual critics get current images and journey
evidence, not the author's verdict; retain AGENTS' scoring/technique-change rule.
Art-grade close-view/layer proofs do not apply to ordinary D/L/U work. Tooling
acceptance does not imply gameplay acceptance. Gate reports must identify the
checked revision and limitations. `BLOCKED_ENV` and missing proof are not passes
or automatically code defects; obtain missing proof when authorized and feasible.

## Bounded rework and evidence

Record defect, environment and missing-evidence causes separately. Retry only
with a new hypothesis or changed input. A repeated same-cause failure requires a
different technique or a concrete blocker; do not automatically refactor named
functions, invent helper tests, split issues or restart context to reset a count.
For unattended operation the owner/activation brief must supply a finite budget
and stop condition; this skill assigns none. Product/canon/permission questions
go to the owner; engineering decisions inside scope belong to the author.

Reuse source/version pointers and applicable checks. Query only needed fields or
log excerpts, but read the full relevant error when output is incomplete. Report
actual outcome, check gaps and first-result/rework causes. Token/time savings
remain NOT_MEASURED until a real comparable gameplay pilot; no daily metrics or
telemetry framework is required. Historical v3 rules and measurements remain in
[AGENT_TEAM](../../../docs/engineering/AGENT_TEAM.md); they do not reactivate work.
