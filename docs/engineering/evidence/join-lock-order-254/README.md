# JOIN participant account lock order — #254

2026-10-21. Branch `codex/join-lock-order-254`, base actual main
`7b9a1dcaf23c8a08fe16783ae910bd42113ef6a2`. LOCAL; publication and merge pending.
Owner mission “Implement, review, merge” authorizes this correction after gates.

## Defect and correction

During the bounded DB7 wolf hunt, helper JOIN returned500/PostgreSQL40P01.
It held both company rows before participant foreign keys requested another
account's KEY SHARE lock; a competing transaction held that account FOR UPDATE
and waited for its company. Native database logs establish the cycle; the exact
competing HTTP route was not captured. Rollback preserved earlier owner consent
and left no encounter/admission. One offered saved-request retry then completed
the journey; that recovery did not repair the lock order.

The command now discovers the finite participating account set, acquires all
accounts in deterministic order, locks and revalidates exact ownership pairs,
then takes the existing sorted company locks. Caller-only locking is removed.
The later contract participant recheck, authorization, atomic rollback and
receipt replay remain. No rule, schema, migration, automatic retry or weakened
foreign-key change. Existing terminal-effects locking is the closest analogue.

## Executed evidence

- Old production source with the new real-PG regression: FAIL as intended,
  HTTP500/40P01 at the expected200 assertion;1failed/16filtered skipped.
- Corrected production source: focused coverage1PASS/16filtered skipped.
  The same native blocking schedule completes both transactions, yields one
  admission/two participant accounts and a valid durable replay. Exact retry
  preserves its response, receipt, companies and contract; changed body rejects.
- Source review independently ACCEPTed the correction and test boundary;
  reviewer ran no tests. Local report `.orca/join254/review.md`.
- Server types, scoped lint and normal changed-code audit PASS. Initial types
  failed because the configured TS library does not declare Promise.withResolvers;
  the test now uses ordinary Promise constructors, preserving the same barriers.
- The first disposable database migration attempt raced container startup and
  failed before tests. Readiness plus a second migration succeeded. No retained
  DB6/DB7 state was touched.

Local logs: `.orca/join254/fail-before.log`, `pass-after-coverage.log`,
`pass-after-final-coverage.log`, `typecheck-final.log`, `lint.log`, `audit.log`.
Private database configuration is excluded from publication.

The competitor is a real SQL account→company transaction, not a second HTTP GET.
The JOIN itself uses the authenticated HTTP route. Native `pg_blocking_pids`
provides the scheduling barrier; no mocked SQL or random-delay race is used.
This proves the reported cycle, not absence of all possible database deadlocks.
Integrated validator, hosted gate and merge remain pending.
