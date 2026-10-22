# #272 — OIDC rejection count isolation

Outcome: FAILED acceptance proof; scoped implementation preserved for coordinator continuation. No player behavior change or completed-build claim.

## Scope, authority and implementation

Branch: `Vovanostm/codex-oidc-count-isolation-272`. Starting HEAD: `0e652658d0de4aeba383a135c4469e3392e683bc`, containing integrated main `857b0491`. Initially clean; no earlier source attempt existed. Full issue #272 body/comment, accepted 57-line contract, AGENTS, new CHANGELOG/CURRENT_PLAN entries, ADR-0003 and AI_TECHNOLOGY_HANDOFF read. Graph discovery fell back to local files because the indexed Warwrit project is a different checkout. No game-rule interpretation.

Only `apps/server/src/auth/oidc.integration.test.ts` is changed: 18 additions, 16 removals, all test code. `countTestIdentities` selects accounts owned by the runtime-assigned issuer and its explicit `/wrong` variant; sessions join those accounts through `account_id`. Both rejection snapshots call that one query. Original callback status/cookie assertions, valid concurrent account login, logout, other-session survival, expiry, and the final count-equality assertion remain unchanged. No production auth, schema, migration, dependency or global parallelism changes.

The coordinator's permit first line `GRANTED task_51028a34338a` was observed before all checks, Docker lifecycle and hooks. `.worktree-ports` already existed; setup NOT_RUN. Only task-owned resources were touched. No push, PR, issue mutation, labels, merge, coordinator tick, child delegation or shared-record edit.

## Acceptance criteria and exact proof

| Criterion                                                      | Result and evidence                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Count only this test's rows                                    | Implemented: `countTestIdentities` uses `issuer in (issuer, issuer + /wrong)` and session/account join; ordinary diff contains only that helper and its two callers. Runtime OIDC case passed in both full-suite attempts.                                                                                                                                                       |
| Detect account creation by rejected login                      | PASS mutation: insert a new `identity_accounts` row for `${issuer}/wrong` immediately before the final snapshot. Focused OIDC run exits 1 at the preserved equality assertion: expected `{ accounts: '1', sessions: '2' }`, received `{ accounts: '2', sessions: '2' }`. `mutation-wrong-issuer-account.patch` and `.log`.                                                       |
| Detect session creation                                        | PASS independent mutation: insert a session for `firstSession.json().accountId` immediately before the final snapshot. Focused OIDC run exits 1 at the same equality assertion: expected `{ accounts: '1', sessions: '2' }`, received `{ accounts: '1', sessions: '3' }`. `mutation-session.patch` and `.log`.                                                                   |
| Restore both mutations                                         | PASS: mutation runner restores the exact pre-mutation source in `finally`; final source diff has neither insert. Both probes also ran and restored in the fresh-stack retry.                                                                                                                                                                                                     |
| Five consecutive real parallel server-integration suite passes | FAIL / BLOCKED: two exact-suite attempts each stopped on run 1 with 7 files passed, 1 failed; 59 tests passed, 1 failed, zero skips. Same unrelated world-route rollback test deadlocked in both attempts. Runs 2–5 NOT_RUN after each fail-fast exit. No five-pass claim.                                                                                                       |
| Preserve other assertions and parallelism                      | PASS source inspection: all original assertions preserved; `vitest.config.ts` unchanged (`maxWorkers: 2`); eight accepted integration files invoked together without worker/sequence overrides.                                                                                                                                                                                  |
| Private Compose PostgreSQL, first-hunt isolation, cleanup      | PASS: project `warwrit-oidc-272-20261022`, dynamic loopback bindings `127.0.0.1:32780` then `127.0.0.1:32781`; each fresh stack used `warwrit` plus separate `first_hunt_272`. Existing 14 migrations applied successfully to both databases each attempt. EXIT trap removed only this project. Both `cleanup.log` files confirm container, volume and network remaining `NONE`. |
| Server typecheck and changed-file format                       | PASS, exit 0 each; `typecheck.log`, `format.log`.                                                                                                                                                                                                                                                                                                                                |
| Ordinary source commit and audit                               | PASS: ordinary commit `37f35c6b815324e13e458007a40f96e2a9af0f99`, normal pre-commit focused coverage refresh and audit exit 0; `commit.log`.                                                                                                                                                                                                                                     |
| Fresh Tier L reviewer plus evaluator                           | NOT_RUN by author; coordinator-owned and still required.                                                                                                                                                                                                                                                                                                                         |

## Commands, attempts and failures

Exact reproducible commands live in `proof.sh` and `mutations.py` under this local evidence directory. The proof shell checks the permit, refuses any existing task-project-labelled container/volume/network, uses `POSTGRES_PORT=0 docker compose -p warwrit-oidc-272-20261022 -f compose.yaml`, reads the assigned loopback port once per stack, applies existing migrations, and sets identity/encounter/company URLs to `warwrit` and first-hunt URL to `first_hunt_272`. Compose fixture credentials are local/disposable; no real account data is used.

Each suite invocation was exactly:

```bash
pnpm exec vitest run apps/server/src/auth/oidc.integration.test.ts apps/server/src/company/executor.integration.test.ts apps/server/src/company/routes.integration.test.ts apps/server/src/company/supplies.integration.test.ts apps/server/src/encounters/postgres.integration.test.ts apps/server/src/world/continuous-movement.integration.test.ts apps/server/src/world/routes.integration.test.ts apps/server/src/contracts/company-transition.integration.test.ts
```

- Initial `pnpm check:changes`: exit 2, missing `coverage/coverage-final.json`; no named function finding. `audit-first-edit.log`. No threshold/config bypass. Normal pre-commit hook owns focused coverage refresh.
- Attempt 1: `attempt-1/parallel-1.log`, exit 1, 112.21 s. `world/routes.integration.test.ts` → `serializes rollback against route receipts and preserves all campaign clock rows on down/up` → `runMigrations` → `db/migrator.ts:126`, `client.query(migration.downSql)`: `error: deadlock detected` at test line 2188. OIDC passed. Trap cleanup PASS, `attempt-1/cleanup.log`.
- One unchanged retry on fresh task-owned stack: `parallel-1.log`, exit 1, 67.05 s, same test and same deadlock boundary; OIDC passed. Trap cleanup PASS, `cleanup.log`.
- Ordinary `git commit -m "test(auth): scope OIDC rejection counts to test issuers"`: exit 0, commit `37f35c6b815324e13e458007a40f96e2a9af0f99`. Only the owned test file committed. Normal hook refreshed focused coverage and ran `check:changes`: no new dead-code, complexity or duplication findings; 3 changed files versus integrated main `857b04917550` includes the two pre-existing coordinator document changes. Audit emitted its existing package-entry warnings and a syntactic-attribution fallback warning due to incompatible base/head semantic analysis identities; no thresholds/config/environment overrides were introduced. Hook test stdout is suppressed by its existing script; no extra real-PostgreSQL coverage claim. `commit.log`.
- `git diff --check`: exit 0 before staging; post-commit `git status --short` empty (tracked worktree clean).
- `pnpm --filter @warwrit/server typecheck`: exit 0.
- `pnpm exec prettier --check apps/server/src/auth/oidc.integration.test.ts`: exit 0.
- Full game verify/build/stress/migration suite and browser smoke: NOT_RUN (test-only scope). Applying existing migrations to private proof databases is not a migration-suite pass. Player journey unchanged; player behavior acceptance and performance NOT_MEASURED.

## Proposed CHANGELOG entry (coordinator-owned)

2026-10-22 — `Vovanostm/codex-oidc-count-isolation-272` — LOCAL, acceptance blocked: #272 replaces global OIDC rejection atomicity row counts with one test-owned issuer query, including the attempted wrong issuer and sessions joined through their accounts. Preserves original assertions and ordinary parallel workers; no production behavior/schema/dependency change. Wrong-issuer account and separate session mutations each failed the intended count assertion and were restored; OIDC passed in both real parallel eight-file suite attempts. Both attempts failed the existing world-route rollback migration case with `deadlock detected` (59 passed, 1 failed); required five consecutive suite passes remain unmet. Typecheck, changed-file format and normal commit audit PASS; scoped source committed as `37f35c6b`. Tier L review/evaluation, publication and merge pending.

## Risks and required continuation

The confirmed blocker is outside ownership: `apps/server/src/world/routes.integration.test.ts:2188` and its migration rollback concurrency boundary. Coordinator must assign investigation/fix in a separate owned slice, or provide an already-fixed base/explicit revised contract; this worker did not change that test, migrator, database assignment or parallelism. Do not waive the five-pass requirement or treat the OIDC-only success as full acceptance.

The finite issuer set covers this test's current explicit issuer claims; future invalid cases using additional issuer values must extend the query scope. Fresh independent Tier L reviewer/evaluator and coordinator validation/integration remain required. CHANGELOG/CURRENT_PLAN/wiki are coordinator-owned; proposed entry supplied here instead of editing shared records. Local evidence paths are untracked by repository convention.

## Continuation — 2026-10-22, task_f24f4df0dbf0: fresh acceptance PASS

This section supersedes the earlier FAILED acceptance status for the resumed original proof only; every earlier failure and the original report above remain unchanged. Historical root logs, patches, scripts, permit, report and attempt-1 are also preserved in `.orca/core-oidc-count-isolation/20261022-before-task-f24f4df0dbf0/`. Fresh native evidence is in `.orca/core-oidc-count-isolation/20261022-task-f24f4df0dbf0/`; none of its results are reused from the earlier attempts.

### Checkout, authority and retained source

- Branch `Vovanostm/codex-oidc-count-isolation-272`; starting and final HEAD `c8b6c308627a97dddbe4e4de3e3e10ee8d7a248b`. Clean tracked/index state on entry and completion. Ordinary coordinator integration includes merged #282/main `00117aa1`; scoped OIDC source still exactly matches ordinary source commit `37f35c6b815324e13e458007a40f96e2a9af0f99` (`git diff 37f35c6b -- apps/server/src/auth/oidc.integration.test.ts` empty).
- Read full #272 body and comments, accepted contract, complete original report and actual proof/mutation scripts before execution; read AGENTS, integration CHANGELOG/CURRENT_PLAN entries, ADR-0003 and AI_TECHNOLOGY_HANDOFF. Graph project list identifies a different Warwrit root/old head, so current files were read directly. `.worktree-ports` already present; setup NOT_RUN.
- Permit readback: first line exactly `GRANTED task_f24f4df0dbf0`. This Dispatch exclusively owned local checks/DB/runtime. No other builder or runtime was started. Only the owned OIDC file was temporarily mutated; no lasting tracked source changes. No application, tooling, config, shared record or other test edits; no empty commit, push, PR, labels, merge, Orca commands or subagents.
- Existing finite account scope remains runtime issuer plus its `/wrong` claim; sessions join through owning accounts. All original equality/status/cookie/valid concurrent login/logout/other-session survival/expiry assertions remain unchanged. Ordinary `maxWorkers: 2` remains unchanged, with no worker or sequence overrides.

### Exact fresh execution and resource setup

Updated only ignored `proof.sh` task permit/project/output references and `mutations.py` output-directory selection. Snapshots of actual executed scripts and permit are in the fresh directory. The command was:

```bash
bash .orca/core-oidc-count-isolation/proof.sh > .orca/core-oidc-count-isolation/20261022-task-f24f4df0dbf0/proof.log 2>&1
```

Exit 0. Node `v24.20.0`, pnpm `11.25.0`. Task project `warwrit-oidc-272-f24f4df0dbf0` refused any pre-existing labelled containers/volumes/networks, then used `POSTGRES_PORT=0 docker compose -p warwrit-oidc-272-f24f4df0dbf0 -f compose.yaml up -d --wait postgres`. Assigned loopback binding `127.0.0.1:32788`; `DATABASE_URL` used disposable Compose credentials and database `warwrit`. `IDENTITY_TEST_DATABASE_URL`, `WARWRIT_ENCOUNTER_DATABASE_URL`, `WARWRIT_COMPANY_DATABASE_URL` all targeted that owned database. `WARWRIT_FIRST_HUNT_ISOLATED_DATABASE_URL` targeted separate owned database `first_hunt_272`, created with the same Compose service's `createdb -U warwrit first_hunt_272`. Existing migrations applied with `pnpm exec tsx apps/server/src/db/migrate.ts up` to each DB: all 14 applied, pending empty, exit 0 each. This is proof setup, not a migration-suite pass.

The merged world rollback test was unmodified: its existing `createRollbackDatabase` / `disposeRollbackDatabase` lifecycle creates and drops its own disposable database during each normal suite run. No shared DB or shared stack lifecycle was used.

### Fresh mutations and restoration

`python3 .orca/core-oidc-count-isolation/mutations.py` ran two separate focused `pnpm exec vitest run apps/server/src/auth/oidc.integration.test.ts` processes before any of the five suite runs:

| Mutation                                                                   | Native assertion failure                                                                                         | Result                                                                |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Wrong-issuer account inserted before final snapshot                        | Expected accounts `1`, sessions `2`; received accounts `2`, sessions `2`; preserved equality at mutated line 354 | Expected exit 1, PASS; `mutation-wrong-issuer-account.patch` / `.log` |
| Session inserted for `firstSession.json().accountId` before final snapshot | Expected accounts `1`, sessions `2`; received accounts `1`, sessions `3`; preserved equality at mutated line 359 | Expected exit 1, PASS; `mutation-session.patch` / `.log`              |

Both failures were `AssertionError: expected` at `identityCountsAfterRejections.rows[0]`, not setup failures. The runner restored original source in `finally` after each mutation and printed `Both mutations restored.` Final ordinary Git diffs confirm no mutation remains.

### Five consecutive ordinary parallel runs

Each invocation was exactly the original eight-file command; runs were sequential, files used ordinary parallel workers:

```bash
pnpm exec vitest run apps/server/src/auth/oidc.integration.test.ts apps/server/src/company/executor.integration.test.ts apps/server/src/company/routes.integration.test.ts apps/server/src/company/supplies.integration.test.ts apps/server/src/encounters/postgres.integration.test.ts apps/server/src/world/continuous-movement.integration.test.ts apps/server/src/world/routes.integration.test.ts apps/server/src/contracts/company-transition.integration.test.ts
```

| Fresh run | Start UTC | Files    | Tests     | Failed / skipped | Duration | Exit / evidence     |
| --------- | --------- | -------- | --------- | ---------------- | -------- | ------------------- |
| 1         | 01:50:52  | 8 passed | 60 passed | 0 / 0            | 40.96 s  | 0, `parallel-1.log` |
| 2         | 01:51:33  | 8 passed | 60 passed | 0 / 0            | 38.79 s  | 0, `parallel-2.log` |
| 3         | 01:52:12  | 8 passed | 60 passed | 0 / 0            | 45.10 s  | 0, `parallel-3.log` |
| 4         | 01:52:58  | 8 passed | 60 passed | 0 / 0            | 42.32 s  | 0, `parallel-4.log` |
| 5         | 01:53:41  | 8 passed | 60 passed | 0 / 0            | 40.98 s  | 0, `parallel-5.log` |

Fresh total: five suite invocations, 40 file executions, 300 tests passed; zero failed or skipped. The two expected mutation failures are separate and do not count toward the five passes. No retry, weakened assertion, suite serialization or redesign was needed.

### Focused checks, cleanup and limits

- `pnpm --filter @warwrit/server typecheck`: exit 0, `typecheck.log`.
- `pnpm exec prettier --check apps/server/src/auth/oidc.integration.test.ts`: exit 0, `format.log`.
- Normal `pnpm check:changes`: exit 0, `audit.log`, no bypass or threshold changes. Native scope was **0 changed files** versus current remote branch merge-base `c8b6c308`; this is not a fresh audit of the original source diff. Original ordinary source commit/hook audit remains the prior evidence; final coordinator validation stays parent-owned.
- Shell EXIT trap ran `POSTGRES_PORT=0 docker compose -p warwrit-oidc-272-f24f4df0dbf0 -f compose.yaml down --volumes`: exit 0. Then queried `docker ps -aq`, `docker volume ls -q`, `docker network ls -q`, each filtered by `label=com.docker.compose.project=warwrit-oidc-272-f24f4df0dbf0`. All returned empty: `container remaining: NONE`, `volume remaining: NONE`, `network remaining: NONE` in `cleanup.log`. Proof process exited 0 after cleanup.
- `git diff --check`, `git diff --exit-code`, `git diff --cached --exit-code`: exit 0; `git status --short` empty. No lasting source edit required, so original commit retained and no new commit manufactured. All actual continuation changes are ignored evidence only.
- Final integrated validation and fresh Tier L reviewer/evaluator remain coordinator-owned, NOT_RUN here. No acceptance waiver; author proof does not replace independent gates. Browser/game/full verify/stress/migration-suite/build NOT_RUN as instructed. Performance NOT_MEASURED; no player-visible behavior change claimed.

### Proposed coordinator CHANGELOG update (do not edit shared records here)

2026-10-22 — `Vovanostm/codex-oidc-count-isolation-272` — LOCAL fresh acceptance proof at integrated `c8b6c308`: after merged #282/main `00117aa1`, retain original OIDC test source `37f35c6b` unchanged. Fresh wrong-issuer-account and owned-account-session mutations each fail the original count equality and restore. Five consecutive ordinary parallel runs of the exact eight integration files pass 60/60 each, zero skips, on task-private real PostgreSQL with separate FIRST HUNT database; merged rollback case retains its own disposable DB. Server typecheck and changed-file format pass; normal audit exits 0 with no new changed files. Positive cleanup confirms no task containers/volumes/networks. No production auth/schema/migration/dependency/config/shared-record changes or new source commit. Coordinator validation and independent Tier L gates remain; no PR/merge claim.

Next: coordinator copies ignored evidence into its tracked record, validates the retained source and schedules fresh Tier L review/evaluation. No current author blocker.
