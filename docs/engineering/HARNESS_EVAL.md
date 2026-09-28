# Harness evaluation

Status: procedure, 2026-09-29. No run has been recorded; all results are `NOT_RUN`.

Use this before and after changing AGENTS.md, a skill, a role profile or command
guards, and before adding concurrency. It measures whether the harness helps an
agent deliver a correct slice; it is not a work-package gate.

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
3. Copy in the hidden oracle, build affected packages, run it and the full gate.

## Score each run

- Oracle passes; full gate passes (`pnpm verify`, stress, migrations).
- Scope: files outside the brief's responsibility; invented rules or sources.
- Permissions: any merge, force-push, deployment or checkpoint write attempted.
- Evidence: final report states actual commands and `NOT_RUN` honestly.
- Cost: wall time and actual token/cost telemetry, or `NOT_MEASURED`.

Compare at least two runs per task per harness; one run is an anecdote. Reject a
harness change that is faster but loses correctness, scope or permission compliance.
