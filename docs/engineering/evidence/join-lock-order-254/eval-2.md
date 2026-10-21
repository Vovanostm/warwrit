VERDICT: ACCEPT cd77d1d666f9f2d38c95a793261788ef5b0ca9db

2026-10-21. Independent round-2 evaluation of #254. Source remained read-only.
Resolved and read back HEAD before review and after runtime cleanup:
`cd77d1d666f9f2d38c95a793261788ef5b0ca9db`.
Reviewed `git diff origin/main...HEAD`; local origin/main is
`19b9ed622653efab7618a3d33d15f634df5796ed`. No fetch or ref mutation.

## Findings

None within this gate: no reproduced defect, unmet scoped acceptance criterion,
rule/privacy/replay violation or unauthorized source edit found. This accepts
the bounded JOIN correction, not every possible database schedule or full M1.

## Independent source assessment

Read issue #254 body and comments, AGENTS.md, current JOIN changelog/checkpoint,
the complete current contract/report, inherited `.orca/join254/contract.md`,
tracked JOIN evidence README, and `warwrit-review`. The graph project points to
an older different checkout, so current source and ordinary diffs supplied proof.
Prior source ACCEPT was treated as historical evidence only.

- `apps/server/src/contracts/routes.ts:149`: discovery is unlocked and confers
  no authority; caller plus discovered participant accounts are deduplicated
  and locked in PostgreSQL ID order before any participating company lock.
  The old caller-only account lock is removed.
- `routes.ts:128`: ownership reread requires identical row count, each original
  company/account pair, and caller ownership. Database uniqueness on world/company
  and world/account rules out duplicate rows defeating the set comparison.
  Missing/substituted/reassigned ownership rejects rather than using discovery
  as authorization. Ownership rows themselves remain locked after reread.
- `routes.ts:216`: caller/owner/helper companies are deduplicated and sorted;
  ownership locking precedes these company locks. Existing contract participant
  reread, revision check, transaction rollback, request-key and receipt replay
  remain. No automatic retry, migration, FK weakening or new game rule.
- `apps/server/src/encounters/postgres.integration.test.ts:3632`: the regression
  uses a real competing SQL account→company transaction. `pg_blocking_pids`
  establishes the blocked schedule before the competitor requests the company;
  this is not a sleep-based race. JOIN is an authenticated HTTP injection.
  Assertions cover both completed transactions, one admission/two accounts,
  durable replay, identical exact retry, one receipt and conflicting-body 409.
- Executable diff is restricted to the two assigned source/test paths.
  The full diff also contains the worker report and parent-owned changelog,
  checkpoint and evidence record described by the contract; these were inspected
  and left untouched, rather than mistaken for additional executable scope.

## Executed real-PostgreSQL check

Fresh disposable PostgreSQL 17-alpine, loopback-only random host port, random
password held in memory. Applied existing migrations only to prepare that empty
database; no migration suite or schema edit. Ran once, without coverage:

```text
pnpm exec vitest run apps/server/src/encounters/postgres.integration.test.ts \
  -t 'contract ownership reread|admits JOIN while another participant'
```

PASS: 7 tests (six ownership cases and native forced-contention), 16 filtered
SKIP, 1 passed file; exit 0. Exact retry returned 200 and identical response;
conflicting reuse returned 409/INVALID_COMMAND; all state/receipt assertions passed.
Evidence: `.orca/core-join-lock/eval-runtime.log`.

Also inspected builder logs `related-coverage.log` (64 PASS / 15 SKIP),
`real-pg-related-coverage.log` (7 PASS / 72 SKIP), `audit-related.log`, database
isolation/cleanup logs, and inherited `fail-before.log`. The latter explicitly
records HTTP 500 / PG40P01 and the expected-200 assertion failure. These are
builder/historical executions, not fresh evaluator rerun claims. No source
rollback was performed to recreate the old failure.

## Actual persistent UI journey

Used this checkout's persistent server entry point and Vite web entry point,
COMBAT_LAB=0 and ENCOUNTER_FIXTURES=0. Used `.worktree-ports`: API 23033,
web 25033; separately checked free realtime port 23034. Installed Chrome,
1440×1000, two independent ephemeral browser contexts; no existing profile.

Test setup only: existing
`.orca/persistent-hud-166/evaluator-prep/rerun6/fixture.ts` seeded two synthetic
accounts, authenticated sessions and companies at Bereznyak in the new empty
database. Fixture also establishes the clock, carried provisions and owner
condition. No contract participant, JOIN intent or battle was pre-admitted for
the UI journey; all four contract commands below came from visible buttons.
External OIDC, company creation and travel are not proven by this setup.

1. Owner: **Место → Волчья тропа / Поговорить →** elder's house, review HUNT-02
   terms, **Договориться и взять поручение**. Actual ACCEPT 200, revision 1.
2. Helper, separate context: same issuer, **Вступить добровольным помощником**.
   Actual HELP 200, revision 2; UI shows helper role and occupied slot.
3. Owner: refresh contract, **Выйти на площадь и продолжить →**, **Вступить в бой**.
   Actual JOIN 200, revision 3; UI shows ready and waits for admission.
4. Reload owner, reopen **Место**: ready intent survives. Contract POST count
   remains 3; native admission count remains 0. No automatic duplicate JOIN.
5. Helper: refresh, return to square, **Вступить в бой**. Actual JOIN 200,
   revision 4. Both pages discover and render the shared persistent battle.
6. Native readback: exactly one admission, encounter
   `41f32ce9-6f1d-464b-a815-fd4eeee1f75e`, exactly two participant accounts
   matching the seeded owner/helper; `verifyEncounterReplay` returns true.
7. Reload both pages: both return to active battle; same encounter, one
   admission, contract POST count stays 4. One receipt for each JOIN command.
   No HTTP 500 observed throughout the journey.

Evidence directory: `.orca/core-join-lock/eval-shots/`.
Screenshots and matching text: `01-owner-initial` through
`15-helper-refreshed-battle`; key accepted-state captures are
`04-owner-accept`, `09-owner-join`, `10-owner-refresh-ready`, `12-helper-join`,
`13-owner-admitted`, `14-owner-refreshed-battle`, `15-helper-refreshed-battle`.
`06-helper-help` was captured before its asynchronous refresh completed; the
subsequent helper state and recorded 200 establish completion.
`http-results.json`, `pre-helper-join.json`, `native-readback.json` and
`refresh-readback.json` hold the actual request outcomes and database checks.
No credentials, cookies, session tokens or browser storage were exported.

This ordinary UI smoke does not force lock contention. The separate native PG
test does. UI saved-request retry was NOT_RUN because every command succeeded
and no retry control was offered; exact retry/body-conflict guarantees were
executed in the native regression, not misrepresented as browser clicks.

## Runner failures, cleanup and limits

Initial browser launch requested an unavailable cached Chromium executable;
that attempt cleaned up its services/container. Switched to installed Chrome.
A subsequent noninteractive launcher received stdin EOF and cleaned up; final
interactive run completed the journey above. One evaluator readback queried a
nonexistent participant `company_id` column; corrected the read-only query to
`encounter_id/account_id` and obtained the successful native results above.
None of these runner failures is counted as a product pass or defect.

All three evaluator-created containers and anonymous volumes were removed.
Final checks show no owned container and no listener on 23033/25033/23034.
Browser contexts closed; credentials existed only in process memory. DB6/DB7,
other containers, profiles and services were not opened or reset. Final
`git diff --exit-code` and `git diff --cached --exit-code` both pass; HEAD is
unchanged. Only assigned untracked verdict/evidence was written.

Full suites, coverage, stress, migration suites, hosted CI, publication, merge,
deployment, battle completion/payment and process-crash recovery: NOT_RUN by
this evaluator and outside this gate. Backend-only change: no visual critic or
day/night matrix required. No shared documentation was edited; this report is
the assigned durable evaluation record.
