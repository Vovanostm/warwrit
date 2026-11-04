# Harness evaluation

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

1. Create a fresh worktree at the parent; same model, reasoning and host for the
   baseline and the candidate harness. Copy the candidate harness files into the
   worktree when evaluating a harness change.
2. Run the agent with the brief and a fixed time limit. Record the transcript.
3. Copy in the hidden oracle, build affected packages and run its relevant checks.
   Run the full gate only when that experiment's acceptance requires it.

## Score each run

- Oracle and applicable checks pass, with any unexecuted release gates stated.
- Scope: files outside the brief's responsibility; invented rules or sources.
- Permissions: any merge, force-push, deployment or checkpoint write attempted.
- Evidence: final report states actual commands and `NOT_RUN` honestly.
- Cost: wall time and actual token/cost telemetry, or `NOT_MEASURED`.

Choose repeated trials for the comparison and report their actual sample size. Reject a
harness change that is faster but loses correctness, scope or permission compliance.
