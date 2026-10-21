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
Final source commit `7f3568a6f4dfbde48cc96cc4fced1fa7edcd3caa` passes the
clean integrated validator8/8 with the dedicated PG database:58relatedPASS,
15unrelatedSKIP, normal auditPASS. Initial validator7/8 omitted the database
connection, skipped real-PG tests and failed audit on missing coverage; its logs
are retained as `integrated-validation-without-pg.log`. The unchanged-source rerun
is `integrated-validation-pg.log`. Final Promise-barrier regression also passes
coverage1/16filteredSKIP. No gate was weakened. Hosted gate and merge pending.

## Fresh pipeline gates and audit correction — 2026-10-21, LOCAL

Gated head `cd77d1d666f9f2d38c95a793261788ef5b0ca9db`, source correction
`d9918b54`, includes actual main `19b9ed62`. Hosted failures on prior heads
remain failures; this corrected head still requires fresh hosted CI.
The account-lock helper now delegates the exact ownership comparison to a
pure helper with six independent cases that also run when PostgreSQL is absent.
Authorization, complete sorted account locks, sorted company locks, contract
CAS, replay and atomic exact retries are preserved. No migration or rule change.

- Normal source/report commits and changed-code audit PASS. Builder related
  real-PG coverage: 64 PASS / 15 SKIP. A narrower coverage invocation failed
  audit on an unchanged pickup function; unfiltered related coverage and audit
  passed. The original hosted missing-coverage failure is retained.
- Coordinator clean validator: 9/9 PASS on the gated head, including scope.
  Current scope: 71 changed source lines without tests, one `Closes #254`.
- Fresh [source review](review-2.md): ACCEPT for the gated head. Reviewer
  runtime checks were NOT_RUN.
- Fresh [persistent evaluation](eval-2.md): ACCEPT for the same head.
  Seven real-PG ownership/contention tests PASS / 16 filtered SKIP. Through
  visible controls, owner ACCEPT, helper HELP and both JOIN commands returned 200. One battle admitted exactly two accounts; durable replay and reload
  readbacks passed without duplicate JOIN or admission. Parent inspected the
  [owner ready state](09-owner-join.jpg) and
  [helper battle after reload](15-helper-refreshed-battle.jpg).
- UI retry was NOT_RUN because no retry control was offered; native exact retry
  and conflicting-body rejection passed. Synthetic accounts, sessions, company
  and starting location are test setup: external OIDC, creation and travel are
  not proven. Battle completion, payment and crash recovery were NOT_RUN here.
- Evaluator services, disposable databases/volumes and contexts were cleaned up.
  Retained DB6/DB7 were untouched. Backend-only correction requires Tier L;
  no visual critic is required. Full M1 and absence of every possible deadlock
  are not claimed. Current corrected-head hosted CI and merge remain pending.

Original full-resolution screenshots, native readbacks and runtime logs remain
local in `.orca/core-join-lock/`; the two JPEGs and verdicts above are the small
tracked proof packet. No credentials, cookies or session data are published.
