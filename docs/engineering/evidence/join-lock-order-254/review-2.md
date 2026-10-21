VERDICT: ACCEPT cd77d1d666f9f2d38c95a793261788ef5b0ca9db

No concrete material findings in this bounded source review.

## Scope and authority

Independently reviewed `git diff origin/main...HEAD`; resolved HEAD twice as
`cd77d1d666f9f2d38c95a793261788ef5b0ca9db`, with local `origin/main` at
`19b9ed622653efab7618a3d33d15f634df5796ed`. Tracked working tree was clean.
Read AGENTS.md, warwrit-review, issue #254 body and both current comments,
the complete current contract/report, inherited `.orca/join254/contract.md`,
tracked JOIN evidence, and the current CHANGELOG/CURRENT_PLAN entries.
`docs/engineering/epics/217/contract.md` does not exist in this checkout.
The available graph indexes a different checkout/revision; source reads were used.
The earlier ACCEPT was not used as acceptance of this revision.

Production/test changes are confined to the two owned paths:
`apps/server/src/contracts/routes.ts` and
`apps/server/src/encounters/postgres.integration.test.ts`.
The remaining diff consists of the existing slice report and delivery records
(CHANGELOG, CURRENT_PLAN and JOIN evidence); no additional source, migration,
dependency or rule change is present. This review changed none of those records.

## Reviewed boundaries

- **Authorization and complete lock set:** routes.ts:108–118 authenticates the
  session before dispatch. Lines 209–224 discover the caller company and the
  observed owner/helper company union without first locking only the caller.
  Lines 156–173 require an owner for every discovered company, include/deduplicate
  the caller account, and acquire the entire account set with SQL
  `ORDER BY id ASC FOR UPDATE` before any company lock.
- **Exact reread:** routes.ts:174–182 locks ownership rows in company order;
  lines 128–145 require equal counts, the caller's exact company/account pair,
  and every exact observed pair. The existing unique company constraint and
  account primary key in migration 0006 exclude duplicate rows that could
  otherwise undermine a membership comparison. Missing, added, reassigned or
  substituted participants fail closed. Lines 227–229 preserve sorted company
  locking. Lines 277–298 then lock the contract, recheck owner/helper identities
  and enforce the expected revision before participation changes.
- **Atomicity and retry:** routes.ts:250–258 preserves exact request-key receipt
  replay and rejects conflicting reuse. Lines 666–736 retain admission, revision
  CAS and receipt persistence inside the same command transaction.
  `apps/server/src/db/command-transaction.ts:15–23` rolls back rejected results
  and propagates SQL failures; no automatic retry or partial-commit path was
  added. Admission rechecks consent ownership against the locked owner rows
  (`encounters/admission.ts:205–212`) before participant FK inserts at lines
  382–394. No changed projection exposes private state or changes replay rules.
- **Regression boundary:** postgres.integration.test.ts:54–86 supplies six pure
  ownership cases, including equal-size reassignment/substitution and caller
  authorization. Lines 3678–3726 use a real account-locking SQL competitor,
  `pg_blocking_pids` and explicit barriers before releasing its company-lock
  request. Polling observes native contention rather than guessing a delay.
  Both transactions must succeed and the authenticated helper JOIN must return 200. Lines 3727–3802 assert one admission, both participant accounts, durable
  replay, identical exact-retry response, one receipt, conflicting-body rejection
  and unchanged snapshots/contract/admission after retry. Existing rejection
  coverage at lines 1517–1621 checks rollback of catch-up and prior consent.

## Evidence and NOT_RUN boundaries

Read existing logs; these are author-run evidence, not executions by this reviewer:

- `.orca/join254/fail-before.log`: native FK lock deadlock `40P01`, HTTP 500,
  failed expected-200 assertion under the controlled regression.
- `.orca/core-join-lock/real-pg-related-coverage.log`: 7 passed / 72 skipped;
  JOIN and exact retry return 200, conflicting reuse returns 409.
- `.orca/core-join-lock/related-coverage.log`: 64 passed / 15 skipped, with the
  same contention journey succeeding; report retains the separate narrow-audit
  failure and subsequent related-audit pass without presenting them as one run.
- `.orca/core-join-lock/committed-ownership-coverage.log`: 6 passed / 73 skipped
  under the recorded PG-omitted condition. Existing isolation/cleanup records
  identify a disposable PG17 container and successful removal.

Reviewer execution: tests, PostgreSQL regression, typecheck, lint, coverage,
full suites, migrations, browser/playable evaluation and hosted CI are all
**NOT_RUN**. No database connection, retained DB6/DB7 mutation, migration,
service operation, source edit, commit, publication or merge was performed.
Acceptance is for this frozen source/test correction only; fresh runtime,
playable and delivery gates remain coordinator-owned. This does not establish
absence of every possible database deadlock.
