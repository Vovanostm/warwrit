VERDICT: ACCEPT d553215b946ad937f78aff6144529de889b71905

## Findings

None. No reproduced defect or concrete blocking risk found in the #282 delivery.
Acceptance is for this test-only Tier D slice; it does not accept #272 or a player-visible feature.

## Scope and source verification

Read AGENTS.md, the full warwrit-review skill, local contract.md and report.md,
and live #282/#272 bodies and comments. The epic contract
docs/engineering/epics/217/contract.md is absent. Read the technology baseline,
current records and the complete origin/main...HEAD diff, including the two
coordinator-owned records. No implementation ownership violation found.
The graph index points to another, older checkout; direct source was used.

Initial HEAD was exactly the verdict SHA and the tracked tree was clean.
During review the coordinator advanced HEAD to
65bc34b0337a2cccff87771cc1759b3f9e4cf49a; the ordinary diff from the frozen
candidate changes only CHANGELOG.md and CURRENT_PLAN.md. The reviewed source
is unchanged. Both source commits, 961ff8e3 and 2557e2df, change only
apps/server/src/world/routes.integration.test.ts; only the latter says
Closes #282. Production code, released migrations, auth, worker settings,
timeouts and audit settings are unchanged.

Independently inspected the retained proof checkout at
/Users/vovanostm/orca/workspaces/warwrit/proof-world-rollback-282:
clean tracked tree, HEAD d118029f79bf0744e48036639cda27f1e9f7c055, exactly two
commits above preserved #272 base 37f35c6b815324e13e458007a40f96e2a9af0f99.
That range changes only the owned world-route test; its auth diff is empty.
The proof and frozen candidate world-route files have an empty ordinary diff.
The changes from the proof base to current main are records/instructions and
the separate OIDC test difference, with no intervening production/migration
change affecting this diagnosis.

## Evidence checked against source

All evidence paths below are relative to .orca/core-world-rollback-isolation.
These are reviewed existing executions, not tests executed by this reviewer.

1. **Concrete baseline cycle.** baseline/database.txt records exact base
   37f35c6b and the private loopback server. baseline/run-1.log records
   57 PASS / 3 FAIL, eight files, zero skips. baseline/postgres.log:110–151
   identifies database OID 16384 and PID 125 executing INSERT encounter_commands,
   waiting for RowShareLock on relation 16400 held by PID 165. PID 165 executes
   the complete 0011 down SQL ending in DROP TABLE encounter_leadership_choices,
   waiting for AccessExclusiveLock on relation 16439 held by PID 125.
   baseline/relations.log maps these to warwrit, identity_accounts and encounters.
   The 00:04:36.900 UTC entries in baseline/locks.jsonl independently show both
   granted opposing locks and both ungranted requests, with mutual blockers.
   Source boundaries are db/migrator.ts:125–128 and
   encounters/executor.ts:735–743; 0011 up defines the referenced foreign keys.
   This establishes the shared relation/schema boundary, not merely colliding
   fixture IDs. The observed deadlock victim is the encounter writer. The
   subsequent 0010 refusal at postgres.log:155–156 has PL/pgSQL CONTEXT; the
   deadlock itself has DETAIL/STATEMENT and no emitted CONTEXT. The earlier
   0010 reverse-order hypothesis is not the observed cycle. The precise
   high-level test invocation owning every PID 125 statement is NOT_MEASURED.

2. **Isolation and retained assertions.** routes.integration.test.ts:2041–2066
   routes only this case's fixture, app and SQL through the isolated handles.
   At :2725–2774 the generated UUID-hex name is quoted, CREATE must succeed
   before ownership is marked, the URL derives from the supplied server URL,
   and unchanged migrations run on the new database. There is no environment
   rewrite, clone, shared backend termination or DROP FORCE. Ordinary callers
   keep their existing URL and app registry (:3017–3021, :3107–3121).
   At :2778–2890 the real writer transaction, observed writer-PID blocking,
   post-commit SQLSTATE 55000, table existence and exact route/receipt identities
   remain. At :2053–2056 two distinct retained clocks join genesis main.
   At :2893–3006 the empty travel tables, complete 0014–0008 down/up/status
   suffix, backup lifecycle, all-clock ordered serialization with microsecond
   timestamps, transactional fresh genesis main/tick 0/valid epoch and restored
   full clocks remain. No assertion was lost in extraction.

3. **Focused checks and lifecycle failures.** Reviewed extraction/run-1.log
   and isolation/run-1.log: each records one selected real-DB test PASS and
   13 name-filtered skips. Their typecheck.log, format.log and normal commit
   logs show successful checks and both source commits, with existing audit
   warnings retained. Read failure-probes.py/log and both failure directories:
   setup fails immediately after successful CREATE, before clients connect;
   race fails after the blocking assertion and before writer commit. Each exits
   1 at its exact injected error, not a timeout. Source finally paths settle
   writer/down, restore when needed, clean the actor, close the local app,
   close clients/pool and drop the owned database. Nested finally blocks attempt
   later releases and propagate cleanup failures. Both saved native cleanup
   queries show no rollback database and zero other client backends before stack
   removal. These probes were restored; the final source contains neither error.

4. **Five ordinary parallel passes.** Read proof.sh, acceptance/commands.log,
   all five acceptance/run-N.log summaries, database.txt, url-readback.json and
   readback/monitor source. Every invocation uses the exact eight-file command
   without concurrency/timeout overrides; unchanged vitest.config.ts sets
   maxWorkers: 2. Each run records eight files / 60 tests PASS, with no failures
   or skips, at combined proof head d118029f. Durations are 87.00, 43.66, 40.13,
   42.32 and 48.96 seconds. Script exports keep OIDC/company/encounter on
   primary warwrit, with FIRST HUNT on first_hunt_282; sanitized native
   current_database() readback agrees. This readback checks the configured
   destinations, not each worker's environment independently. The acceptance
   lock log observes five distinct rollback databases and preserves deliberate
   writer/down blocking there; acceptance/postgres.log has no deadlock.
   The preserved OIDC countTestIdentities (:210–223 in the proof checkout)
   includes runtime issuer plus /wrong, and joins sessions through those
   accounts. Other ordinary world/company/encounter identity writers remain on
   primary; their concurrency has not been hidden by isolating OIDC.

5. **Disposal and validator boundaries.** Read database-cleanup.log and
   cleanup.log for baseline, extraction, isolation, both failure probes and
   acceptance: only primary, FIRST HUNT and standard databases remain, no other
   client backends; each task-specific container/volume/network reports NONE.
   proof.sh confines removal to its unique Compose project and captures logs
   first. Acceptance process-cleanup.log is empty. The two failure snapshots
   contain the still-running Codex controller, not a Vitest/tsx runtime;
   baseline/extraction/isolation have no separate process snapshot. Normal
   Vitest exits, native backend absence and task-stack disposal support cleanup;
   no broader process-absence measurement is claimed. Read all nine
   .orca/validate-*.log files: package build, typecheck, format, scope and audit
   outputs agree with the coordinator-reported exit 0 / nine PASS gates at
   d553215b. Rebased/clean-tree/lint logs are empty. Related-tests explicitly
   records only 3 PASS / 11 SKIP without DB URLs and is not database proof.

## Limits and parent documentation update

Reviewer execution: read-only Git/source/log/issue inspection and log parsing.
Tests, DB/runtime/probes, builds, broad gates, browsers and coverage were
NOT_RUN by this reviewer, as assigned. Additional cleanup-operation fault
combinations, helper complexity and performance are NOT_MEASURED. No concrete
uncovered risk requiring another execution was found for #282. Hosted CI,
publication/merge status and #272's own fresh mutation/Tier L acceptance are
outside this verdict; five combined author passes do not accept #272.

Coordinator proposal for existing CHANGELOG/CURRENT_PLAN: record fresh Tier D
ACCEPT for frozen d553215b, source 961ff8e3 / 2557e2df, based on independent
source/evidence review; retain the distinction between author real-DB proof,
coordinator validator's DB-skipped related tests and reviewer NOT_RUN runtime.
Keep #272 mutation/Tier L gates and all publication/CI/merge steps explicit.
No wiki, setup, API, schema, replay or player-facing contract changes are needed.
Shared records and all source remain untouched by this reviewer.
