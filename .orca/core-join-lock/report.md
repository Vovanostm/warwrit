# core-join-lock — rework round 1

2026-10-21. Branch `codex/join-lock-order-254`; starting HEAD
`faa6ae2239c231adceba2221170a8321a657caf5`. Worker scope: issue #254,
`apps/server/src/contracts/routes.ts`,
`apps/server/src/encounters/postgres.integration.test.ts`, and this report folder.
Parent owns shared records, validation, publication and fresh review/evaluation.
No child delegation, push, PR/label edit, merge/rebase or Orca command.

## Gate finding and fix

Read the full hosted failure in `ci-failed.log` (CI 39519870210,
job 118960794248). Its final audit reports `lockContractAccounts` with
cyclomatic 5, CRAP 30 and 0% measured coverage. It excludes 10 inherited
findings. The remaining route complexity and clone listings do not establish
that those unchanged functions require refactoring.

Extracted the exact ownership-reread comparison into the pure
`contractOwnershipMatches` helper. Six focused tests cover unchanged reordered
pairs, missing/added participants, reassigned accounts, substituted companies,
caller authorization and an empty observation. These tests run without PG,
so the extracted rule has meaningful measured coverage in PG-omitted runs too.
No thresholds, suppressions, hooks, coverage policy, timeout or FK changed.

The ordinary diff retains discovery of the complete account set, caller
inclusion/deduplication, PostgreSQL account-ID ordering and FOR UPDATE, ownership
reread under locks, then sorted company locking. Contract participant recheck,
authorization, CAS, atomic rollback and exact request/receipt replay are unchanged.
The native forced-contention regression itself is unchanged.

## Executed checks and failures

- Repository versions: Node 24.20.0, pnpm 11.25.0; lockfile Fastify 5.12.1,
  Kysely 0.28.17, pg 8.23.0, Vitest/coverage-v8 4.1.11, fallow 3.30.0.
- Server typecheck: PASS, exit 0 (`typecheck.log`). Scoped ESLint: PASS,
  exit 0 (`lint.log`). Scoped Prettier check and `git diff --check`: PASS.
- Pure ownership coverage: PASS, 6 tests / 17 skipped (`ownership-coverage.log`).
  `contractOwnershipMatches` executes 7 times; the PG lock helper executes 0 times.
- `pnpm check:changes` with that PG-omitted coverage: PASS. First invocation
  used the default branch-upstream base (`audit-without-pg.log`); the authoritative
  rerun pins the actual main merge-base, `19b9ed622653efab7618a3d33d15f634df5796ed`,
  using the same `FALLOW_AUDIT_BASE` mechanism as the normal commit hook:
  PASS, no issues in 5 changed files, 10 inherited findings excluded
  (`audit-main-without-pg.log`).
- New isolated PostgreSQL 17 container, random password held only in the runner,
  dynamically allocated loopback port, existing migrations applied for test setup:
  PASS. No retained DB6/DB7 connection or configuration used. Container and its
  anonymous volume removed successfully (`database-isolation.log`,
  `disposable-db-setup.log`, `container-cleanup.log`). This is database preparation,
  not execution of the migration suite.
- Narrow related coverage with test-name filter for ownership and forced
  contention: PASS, 7 tests / 72 skipped, 1 passed file / 11 skipped files
  (`real-pg-related-coverage.log`). Both native transactions complete; the actual
  authenticated helper JOIN returns 200, one encounter admission contains both
  accounts, durable replay verifies, exact retry preserves response/state/one
  receipt, and conflicting reuse returns 409/INVALID_COMMAND. Pure helper:
  4/4 statements and 7/7 branches covered. Lock helper: 8/10 statements and
  2/4 branches covered; early-failure paths are not claimed covered by this run.
- Audit after that narrow PG coverage: FAIL, exit 1 (`audit-real-pg.log`).
  JSON readback (`audit-real-pg.json`) identifies exactly one introduced finding:
  the existing pickup-target arrow at routes line 1021, CRAP 210 / 0% coverage.
  Ordinary diff against main confirms this function is unchanged. Neither JOIN
  helper is above threshold. No inherited pickup refactor was made.
- Required unfiltered related coverage on a second newly created disposable PG
  container: PASS, 64 tests / 15 skipped, 9 passed files / 3 skipped files
  (`related-coverage.log`). Command:
  `pnpm exec vitest related --run --coverage --mode coverage apps/server/src/contracts/routes.ts apps/server/src/encounters/postgres.integration.test.ts`.
  The unchanged native contention regression passes again. Pure helper:
  4/4 statements and 7/7 branches covered; lock helper: 8/10 statements and
  2/4 branches covered. Both disposable containers were removed with their
  anonymous volumes (exit 0); no retained database was touched.
- Normal audit with that related coverage, pinned to the actual main merge-base:
  PASS, exit 0, no issues in 5 changed files, 7 inherited findings excluded
  (`audit-related.log`). The narrow-coverage failure above is retained as a
  limitation of that invocation, not erased or counted as a pass.
- Source diff versus actual main: 64 additions / 7 deletions in `routes.ts`
  (71 changed source lines, below the 300-line limit). This round alone changes
  24 additions / 12 deletions in that source file and adds 34 test lines.

## Inherited proof and remaining gates

The tracked [JOIN evidence](../../docs/engineering/evidence/join-lock-order-254/README.md)
records old-source fail-before HTTP 500/40P01, corrected-source real-PG success,
and the prior integrated 8/8 validator with 58 related tests / 15 skipped.
The local contract and bounded source ACCEPT are `.orca/join254/contract.md`
and `.orca/join254/review.md`. Those are inherited results, not rerun claims
or acceptance of this new source revision.

Rebase/merge: NOT_RUN, per assignment; coordinator already integrated main as
`faa6ae22`. Coordinator validator and full verify/stress/migration suites: NOT_RUN,
parent-owned. Tier L persistent JOIN smoke-play and day/night screenshots: NOT_RUN;
combat-lab would not demonstrate the changed persistent JOIN journey. There is
no changed rendered surface to recapture here. Fresh reviewer/evaluator and
hosted gate remain parent-owned; no playable acceptance or merge is claimed.

## Proposed shared-record update for parent

2026-10-21, `codex/join-lock-order-254`, LOCAL: resolve #254 hosted audit failure
by separating the ownership-reread rule from account locking and covering it
without PG; retain complete sorted account locks before sorted company locks,
authorization/CAS/retry and the real forced-contention regression. Affected paths
are the two owned source/test files. No migration or deployment. Append final
check/commit results below to the existing JOIN evidence and changelog entry;
the worker did not edit shared records.

## Committed result and handoff

Source and initial report committed normally as
`d9918b544bda84d74c8831034ecdd599e7c164f3`
(`fix(contracts): separate and test JOIN ownership reread`). The unmodified
pre-commit hook ran its audit against actual main and passed: no issues in
6 changed files, 7 inherited findings excluded (`commit-source.log`).

Before committing this final report update, refreshed focused related coverage
on that committed source with all three database URL variables explicitly unset:
6 PASS / 73 filtered or database-dependent SKIP, 1 passed file / 11 skipped
(`committed-ownership-coverage.log`). Command: the related-coverage command above
with `-t 'contract ownership reread'`. Normal audit pinned to actual main then
PASSed again, no issues in 6 changed files, 10 inherited findings excluded
(`committed-audit-without-pg.log`). This supplies current committed-source proof
that the fix survives the hosted gate's PG-omitted coverage condition; it does
not replace the two real-PG executions recorded above.

The remaining change after the source commit is this report only. Local report
links, scoped diff and whitespace were read back. Logs named here are local
untracked evidence in `.orca/core-join-lock/`; no credentials were retained.
Next: parent validates this committed result, schedules fresh reviewer/evaluator,
and supplies the tier L persistent JOIN playable gate. No publication or merge
has been performed by this worker.
