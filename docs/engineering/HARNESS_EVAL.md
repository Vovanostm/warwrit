# Harness evaluation

## Task-quality assessment — 2026-11-05

Use this section for a defined harness evaluation. Record findings in the existing
slice contract or this page. The [research record](research/AGENT_TEAM_RESEARCH.md#task-quality-evaluation-research--2026-11-05)
contains the primary sources and their limits.

### Outcome, evidence and effort

Judge the assigned result against its accepted contract and affected revision.
Keep critical criteria separate so that speed or presentation cannot compensate
for incorrect state, an authority violation or unsupported completion claims.

| Dimension                   | Evidence to inspect                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requested outcome           | Player action through the normal entry, visible response and saved effect where applicable. Keep passed substeps and the next failing step visible.              |
| Correctness and regressions | Applicable invariants and the previously working affected path, using the smallest public-boundary checks.                                                       |
| Evidence validity           | Actual scenario, environment, revision and result. Distinguish source review, SQL execution, browser journey and independent acceptance.                         |
| Player quality              | Applicable journey and visual critic findings. Owner/player observations establish comprehension and enjoyment. Automated success alone leaves these unmeasured. |
| Rework                      | First submitted result versus eventual acceptance, with material correction causes. Failed setup, broken check and product defect have different repair owners.  |
| Effort                      | Elapsed start-to-acceptance, review/correction work and available parent/child usage. Separate waiting and concurrent worker effort when available.              |

Use the same acceptance boundary for both variants. Separate cases used to tune
instructions from held-out cases used to estimate benefit. Retain failed, abandoned and
unfinished assignments in the comparison with their observed effort and status.
Report the preselected task count, accepted count and unaccepted count alongside
costs. A cost-per-accepted-result calculation includes observed effort across all
assigned attempts and states the observation cutoff. Separate first-submission
acceptance from eventual acceptance. Repaired iterations remain one task attempt.
Repeated isolated agent trials can measure reliability. SQL request retries test
application idempotency. Keep these observations distinct.

### Validate the evaluator when its result is disputed

Map each disputed assertion to an accepted requirement. Check that setup reaches
the intended command and that the check can distinguish its required outcomes.
For a changed grader, use a known-valid result and a relevant known-bad case when
available. Preserve the original failed log, correction and affected rerun result.
A fixture repair needs source review to establish that assertions retain their
meaning. An unrelated helper name, exact tool-call sequence or unrequested feature
cannot become a hidden requirement. Assess any genuine contract change explicitly.

For subjective judgments, give the critic the same current images/journey and
explicit rubric. Compare verdicts with owner-labeled examples when available.
Check presentation-order effects in pairwise trials. Record disagreements and
missing observations. An independent model opinion remains distinct from owner
or player acceptance. Apply this calibration when judging the harness, using the
existing critic workflow for ordinary game delivery.

### Current care observation

The chat `01a182d5-a42b-7f71-be34-149cf554d19a` began its care turn at
2026-11-05 01:44:08 Moscow time. The inspected snapshot was still in progress at
02:12:12. The author reused retained care work and moved it to
`codex/game-care-delivery`. At readback, HEAD was `30c7c4a8` with uncommitted care
changes. This identifies an evolving worktree, not a frozen acceptance candidate.

The existing local `output/painted-delivery/close-20261104/care-sql.log` records
2 failed checks and 11 skipped. Both failures occur in `withCareState` setup,
through invalid tick/physical-state construction. The later `care-sql-current.log`
records 2 passed and 11 skipped, taking 3.84 seconds. This confirms recovery of the
targeted SQL run. The test names cover care/stabilization and retries. Assertion
semantics and the fixture diff were not independently reviewed in this assessment.
The author reports client/server types passed. That claim was not rerun here.

The snapshot also shows two browser-control failures followed by a reset and a
successful current API connection. This is tool-session recovery evidence. Browser
care completion and independent playable acceptance were not demonstrated in that
snapshot. The next observation is treatment through the ordinary company screen
and its visible/saved result. The live task remains active. Elapsed-to-acceptance,
first-submission acceptance rate and comparative quality/cost are NOT_MEASURED.

Research/documentation delivery is LOCAL on `codex/harness-task-quality`.
CURRENT_PLAN remains owned by the game integrator. This assessment changes the
on-demand evaluation method. It adds no runtime gate or routine game report.
Scoped formatting and diff checks PASS. All three added local links/anchors target
tracked files and resolve. An initial whole-document anchor probe failed on the
pre-existing CHANGELOG link to `M1-SUPPLIES.md#delivery-amendment--2026-10-04`.
Its target text is a plain paragraph at line 115. That historical link is outside
this change. Independent read-only review of the method and cited claims ACCEPT,
including care log readback. Game tests are NOT_RUN for this assessment.

## Rollout and checkpoint ownership follow-up — 2026-11-05

The owner requested continued investigation and concrete optimization. The next
chat snapshot extends the earlier 492-item snapshot to 538 items, adding 15 commands.
The map writer now contains PR345 (`e31c5a56`) and the 163-line/9,759-byte root.
It integrated main at `dcaf84a6`, obtained explicit owner merge permission and
passed CI41922441689 for that combined head. [PR344](https://github.com/Vovanostm/warwrit/pull/344)
merged on 2026-11-05 at 01:27:56 Moscow time. This completes the tested atlas
delivery boundary. This supersedes the earlier snapshot's partial-adoption
finding. Actual future role behavior and cost benefit remain NOT_MEASURED.

A confirmed friction came from this supporting harness lane too. PR345 changed
CURRENT_PLAN, its history and CHANGELOG while the game delivery was active. The
map author resolved conflicts in those shared documents, then ran combined-head
CI. The required integrated checks retain their value. Overlapping ownership of
the current-game status was avoidable. The earlier c5c794fc local-only auxiliary
status addition has been removed from the candidate. The game integrator owns
that shared block, and support work records its result here.

The current bounded correction updates `scripts/agent-preflight.sh` to show
upstream instruction/role/hook paths changed since the branch fork, using the
selected local ref. It establishes upstream changes, including any already
ported separately. The author compares actual content before deciding integration.
Comparisons are read-only and use local refs. Default output keeps checkout/dirty
state and removes the full other-worktree inventory. The root record policy now
routes supporting status to its existing owning page and hands game-checkpoint
changes to the active integrator.

The existing Node regression runner covers equal refs, ordinary upstream code,
changed upstream guidance/configuration/delegation, missing base and the
updated-base state. It also checks
that the default output omits the full worktree inventory. Local Node 4/4, Bash
syntax, scoped ESLint/format and diff checks PASS. Independent frozen-head
static readback found no findings at `a6890305`. The reviewer also confirmed
PR344 merge/CI through GitHub. The candidate is integrated with main `ee03f4ee`
and preserves its CURRENT_PLAN content exactly. The ordinary CHANGELOG conflict
retained both writers' entries. Four regressions and scoped checks passed again.
[Delivery issue346](https://github.com/Vovanostm/warwrit/issues/346) owns PR/CI and
merge status for this continued harness mission.
The run changes were tested with isolated local Git fixtures. Native Codex/Claude
session reload and improved gameplay throughput remain NOT_RUN/NOT_MEASURED.
Startup-log capture remains a separate follow-up. Confirm the launch script's
current writer before editing.

## Observed delivery follow-up — 2026-11-05

Owner requested an effectiveness check of chat «Оценить готовность игры к публикации»,
`01a182d5-a42b-7f71-be34-149cf554d19a`. Observed window is 2026-11-04
22:56:30 through 2026-11-05 00:50:20 Moscow time, plus live PR/CI readback.
Source is the chat API, timestamped command/token records in its local rollout,
the writer's actual checkout and GitHub. Local transcript path is
`/Users/vovanostm/.codex/sessions/2026/10/28/rollout-2026-10-28T17-06-41-01a182d5-a42b-7f71-be34-149cf554d19a.jsonl`.
Only command/message/usage records informed this review.

### Result and intervention coverage

There is concrete delivery progress. The atlas became committed, the normal
entry/company/map/movement/STOP/reload journey was demonstrated, and
[PR344](https://github.com/Vovanostm/warwrit/pull/344) was published. At this
readback, head `2a63e830` is OPEN. CI41918700198 SUCCESS includes both world-lab
and ordinary painted-map journeys, coverage and the quality audit. That accepts
the tested map boundary. The full contract/combat/reward/care/restart journey
remains open.

PR342 is present in the writer's branch. Three older commit invocations took
207, 770 and 486 seconds including hidden coverage/audit work. After integrating
PR342, staging plus the normal integration commit took about 1.5 seconds and the
checked-out hook contains only the staged whitespace check. This directly
confirms removal of that delay. Workloads differed across those invocations.

The newer PR345 commit `e31c5a56` is absent from the writer's ancestry. Its root
AGENTS remains 199 lines/12,783 bytes, versus 163/9,759 on main. The complete newer
role/context intervention has therefore not reached this checkout. Native
instruction refresh is also unmeasured. The partial adoption cannot support a
causal verdict about the entire new harness.

The window contains 147 shell commands. Parent usage is 38,373,937 input tokens,
including 37,800,320 cached, and 129,695 output tokens. Last-call input was 225,028.
These are cumulative request inputs with cache reuse. Parent telemetry excludes
child usage and provides no billing total.
Token/cost or success-rate improvement against a matched baseline is NOT_MEASURED.
The prior 103-minute/176-command observation used a different task state and
includes different waits. Treat that comparison as descriptive only.

### Errors and smallest systemic controls

1. **Guidance reaches main before the active branch.** PR342 was noticed at
   23:44 Moscow time, while the older coverage-bearing commit finished at 23:52.
   The new hook entered the branch at 23:59. At the next bounded work step, check
   relevant upstream instruction/role/hook changes and record the writer's actual
   adopted revision. Preserve exclusive ownership and review any integration.
   Main publication alone establishes availability.
2. **Fresh-boundary defects surface serially in full CI.** Confirmed repairs were
   Vite `?url` resolution in the architecture checker, camera types depending on
   authored navigation/game-core, and Dex private storage owned by the wrong UID.
   Before publication, exercise the changed import/type/startup boundary with its
   smallest check on fresh inputs. A local run reusing existing Dex exercises a
   different launch path from CI's new container. The author already fixed these
   three defects in PR344.
3. **Failed startup loses its cause.** Current `check-painted-game-ci.sh` starts
   Dex with `--rm` and removes owned resources in cleanup. It neither retains Dex
   logs nor prints them when discovery readiness fails. Capture stdout/stderr and
   container state before removal, expose a bounded failure excerpt, and attach
   focused startup evidence. This is a separate narrow tooling follow-up. Confirm
   the launch script's current writer before implementation.
4. **Long-lived context remains expensive.** Use a concise checkpoint for each
   accepted slice and consult detailed history for an identified question. Compare
   actual request/uncached/output usage and delivered acceptance on subsequent work.
   Preserve the full evidence externally. Extra root prose alone cannot establish
   a reduction in the already-large live prompt.

This is an observational review with source/CI readback. New gameplay execution,
controlled A/B, dollar cost and player enjoyment measurements are NOT_RUN or
NOT_MEASURED. Proposed controls above are recommendations, with the current author's
three concrete fixes and PR342 adoption recorded separately as actual changes.

## Current use — 2026-11-04

Use this on demand for a defined harness hypothesis. Routine game work follows
its existing acceptance and proportional checks. The priority is the next
playable result. A harness experiment must have a bounded question and completion
condition before consuming game-development time.

For the current change, the direct regression is visible failure diagnostics
from the existing local checker. Prompt loading and source/format checks establish
configuration only. Subsequent already-authorized gameplay work can record
acceptance per player action, first playable result, substantial rework/cause and
available elapsed/token telemetry. Reuse the issue or owning page for those data.
Missing observations are NOT_RUN or NOT_MEASURED.

For a comparative experiment change one harness variable, keep task/base/model/
reasoning/environment and acceptance comparable, and state the sample and uncertainty.
A shorter instruction file or faster failed attempt alone establishes no benefit.
Choose additional trials according to the question and actual budget.
The [research correction](research/AGENT_TEAM_RESEARCH.md#research-correction-and-application--2026-11-04)
explains source scope. No gameplay or cost/adherence comparison has been run for it.

## Historical replay procedure — 2026-09-29

The catalogue below is an optional controlled benchmark. It remains historical
until its contracts/oracles are checked against the selected task. It is separate
from the ordinary implementation/acceptance path. Apply relevant focused checks
during trials. Full release gates follow the actual final-delivery contract.

## Tasks

Each task replays a merged delivery from its parent commit. The agent receives
only the brief below plus the repository at the parent; it must not read the
merged commit. The merged PR's specification is the hidden acceptance oracle.

| ID  | Parent    | Brief (give verbatim)                                                                                            | Hidden oracle (apply after the run)                        |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| E1  | `16dfa43` | A valid company root with a long `finance.sourceEffects` history must prepare learning backing like a fresh root | `learning-cost.spec.test.ts` from `b69d881`                |
| E2  | `9d6c7cb` | Implement C05-FIN exact retained learning cost arithmetic per its Airtable card; no debit or reservation         | `learning-cost.spec.test.ts` from `1beeea2`                |
| E3  | `626291a` | Implement W01/W02 finite region topology and exact Campaign Day / Light clocks per the WORLD record              | `world-clock.spec.test.ts` from `b657d41`                  |
| E4  | `b657d41` | Settle earned book learning when the book is transferred, atomically with the item move (C06 book transfer)      | `company-learning-composition.spec.test.ts` from `accbec8` |

Add a task only from a merged PR with a public-boundary specification. Review the
set when those specifications change.

## Procedure

1. Before a replay, validate that every hidden assertion follows from the brief
   and its available accepted sources. Confirm that the known fix passes and that
   the original defect fails in the selected environment. Repair or exclude an
   invalid task before comparison. Public merged fixes may have been seen during
   model training, so qualify replay results and include fresh tasks for a broader
   claim.
2. Use fresh agent sessions and isolated baseline/candidate worktrees at the same
   parent with equivalent data/resources and model/reasoning settings. Apply only
   the candidate harness change. Keep hidden solutions and other trials
   inaccessible. Alternate or
   randomize run order when comparing variants and state any environment drift.
3. Run the agent with the validated brief and the same time limit. Record actual
   tool calls/results, final state and available usage. Include unfinished trials.
4. Copy in the hidden oracle, build affected packages and run its relevant checks.
   Run the full gate only when that experiment's acceptance requires it.

## Score each run

- Oracle and applicable checks pass, with any unexecuted release gates stated.
- Scope: files outside the brief's responsibility; invented rules or sources.
- Permissions: any merge, force-push, deployment or checkpoint write attempted.
- Evidence: final report states actual commands and `NOT_RUN` honestly.
- Cost: wall time and actual token/cost telemetry, or `NOT_MEASURED`.

Choose repeated trials for the comparison and report their actual sample size. Reject a
harness change that is faster but loses correctness, scope or permission compliance.
