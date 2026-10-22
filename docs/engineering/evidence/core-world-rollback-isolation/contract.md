## Scope

For #282 (https://github.com/Vovanostm/warwrit/issues/282), restore reliable parallel integration proof before #272 can proceed; players retain existing login/travel behavior and durable route receipts and campaign clocks. This test-only prerequisite adds no player feature.
Out of scope: #272 implementation, production migrator/auth/game rules/schema, released migrations, global worker serialization, timeout increases, new infrastructure and UI/browser work.
Read-only contract, 2026-10-22: dedicated branch `Vovanostm/core-world-rollback-isolation`; clean starting HEAD and live main both `857b04917550ef5fc107a4cca88248628a7db27b`.
`docs/engineering/epics/217/contract.md` is absent here; live #282/#272 and #272's full accepted contract/report govern this bounded prerequisite. No earlier local plan/review exists for this slice.

## Changes

Implementation ownership remains only `apps/server/src/world/routes.integration.test.ts`; this task writes only this local contract. No implementation is authorized by this report itself.
Evidence root: `/Users/vovanostm/orca/workspaces/warwrit/codex-oidc-count-isolation-272/.orca/core-oidc-count-isolation/`.
Read full `contract.md`, `report.md`, `preparation-review.md`, `proof.sh`, and both `attempt-1/parallel-1.log` and `parallel-1.log` there; routine HTTP telemetry was compacted for reading, diagnostics retained.
Observed: both attempts report 59 PASS/1 FAIL, same rollback case at :2188 → `db/migrator.ts:126`; OIDC passes per builder report. Runs 2–5 were NOT_RUN; neither log names the failed migration or competing PostgreSQL backend.
Confirmed source boundary: module `connectionString`/`database` (:49–50), rollback fixture, writer and down client (:2038–2060) all use `WARWRIT_COMPANY_DATABASE_URL`.
The accepted runner also gives that same database to OIDC, company, encounter and continuous-movement files; FIRST HUNT alone already has a separate database.
`runMigrations` (:125–128) executes each entire down SQL in a transaction; it does not coordinate with ordinary application/test transactions.
0008 down explicitly locks clocks → routes → receipts ACCESS EXCLUSIVE; the intentional writer holds route/receipt writes until commit. Preserve that deliberate two-client concurrency.
The later down loop reverses 0014…0008 against shared public tables. 0010 down reads its guards, then ALTERs encounter_receipts → encounter_commands → encounter_participants before dropping runtime tables.
Competing source operations include `verifyEncounterReplay`/`replayMatches` (`encounters/executor.ts`:1336,138,330), reading commands → receipts in one transaction, and `persistTransition` (:736–791), writing commands → receipts.
Continuous-movement `seedScenario`/`cleanupScenario` (:763,813) also transact over routes/receipts/company/clock tables; random world IDs isolate rows, not relation locks or schema lifetime.
Hypothesis, not established incident cause: reverse relation acquisition during down SQL can cycle with these transactions; logs lack the server deadlock DETAIL needed to identify the actual pair and migration. Do not label one candidate as proven.
Plan a finite per-case disposable database on the existing private PostgreSQL server, using existing `pg.Client`, `createDatabase` and `runMigrations('up')`; no schema/search_path workaround because released 0008 SQL explicitly targets public.
Add small local create/dispose helpers: generate `warwrit_rollback_<UUID hex>` with a safely quoted identifier, derive its URL from the supplied company test URL, create only that new database, migrate it, and return its handles. Never clone a live database or adopt a pre-existing name.
Change only the rollback case to use those handles for seed, cleanup, writer, rollback and clock reads. All other cases keep the original shared database and ordinary workers; no process.env rewriting.
If needed, give `makeSyntheticCompany` an optional fixture connection URL defaulting to the existing value, so the isolated actor's config and injected handles agree without changing ordinary callers.
After actor cleanup, seed at least two distinct retained clock rows, with different epoch/tick/timestamp values, beside genesis `main`; keep `readClockRows`' complete ordered serialization including microsecond `updated_at`.
Do not reduce the clock comparison to one row or actor-scoped rows. Preserve route/receipt existence, exact retained identities, migration suffix/status, backup restoration/removal, and fresh-install genesis assertions.
Disposal is test-owned finally cleanup: settle/rollback writer and pending down, close its app, end both clients and destroy its pool, then drop only the successfully created database and close the administrative client.
Use nested finally boundaries so assertion, migration or setup failure still releases later resources; propagate cleanup failures. No shared backend termination, DROP FORCE or shared database cleanup.
Keep lifecycle helpers and rollback/clock/fresh-install phases small. Existing callback is long; complexity/CRAP are NOT_MEASURED, and `.fallowrc.json` health.ignore excludes test files.
Before adding lifecycle branches, use a behavior-preserving extraction commit for those phases, retaining the existing focused test as its proof; then a separate isolation commit. Evaluator owns both checks; no redundant helper tests or audit waiver.
Expected production-source changes: zero; one issue/PR, well below 300 non-test lines. No shared setup/config edit is presently necessary.

## Data

None: no protocol/projection field, canonical serialization, schema definition, replay or production behavior change. Old replays and projections remain compatible without conversion.
Disposable fixture databases receive unchanged existing migrations; only the rollback case owns destructive DDL there. Ordinary OIDC/identity writers share the primary proof database; FIRST HUNT retains its separate database.

## Proof

Everything below is evaluator/coordinator-owned future proof, NOT_RUN here; this worker ran no checks, setup, install, formatter, audit, tests, runtime or DB lifecycle.
#282 criterion 1, concrete operations/current main: before fixing, evaluator repeats the accepted eight-file command on main `857b0491` plus preserved #272 commit `37f35c6b` in private PostgreSQL.
Retain failing migration/statement and PostgreSQL deadlock DETAIL/CONTEXT with both backend statements, relation names and lock modes from that task's server log (`docker compose -p <owned-project> -f compose.yaml logs --no-color postgres`). Map both statements to source and database ownership.
Capture this before destroying the stack; if default logs omit it, evaluator obtains bounded pg_stat_activity/pg_locks/blocker evidence on that private stack. Existing Vitest stacks alone do not establish the cycle; unresolved reproduction remains explicit, not waived.
#282 criterion 2, minimal isolation/rollback invariants: evaluator runs `pnpm exec vitest run apps/server/src/world/routes.integration.test.ts -t 'serializes rollback against route receipts and preserves all campaign clock rows on down/up'` with the real private company DB URL.
Require actual blocking by writer PID before commit, SQLSTATE 55000 after commit, both tables and exact route/receipt identities retained, empty route tables after fixture cleanup, complete 0014…0008 down/up/status results and backup lifecycle.
Require all seeded clocks plus main identical before/after down/up and after the fresh-install transaction rolls back; fresh install still yields exactly main, tick 0 and a valid epoch. No assertion deletion or skipped DB case.
#282 criterion 3, five consecutive parallel runs: evaluator reuses #272's exact accepted command below, sequentially five times, each invocation with unchanged default workers (`vitest.config.ts` maxWorkers 2), zero failures/skips and no suite/timeout override.
`pnpm exec vitest run apps/server/src/auth/oidc.integration.test.ts apps/server/src/company/executor.integration.test.ts apps/server/src/company/routes.integration.test.ts apps/server/src/company/supplies.integration.test.ts apps/server/src/encounters/postgres.integration.test.ts apps/server/src/world/continuous-movement.integration.test.ts apps/server/src/world/routes.integration.test.ts apps/server/src/contracts/company-transition.integration.test.ts`
Use existing compose.yaml with a unique evaluator-owned project and dynamic loopback port; apply existing migrations to primary and separate FIRST HUNT databases as in accepted proof.sh. The rollback test creates/disposes its own third database; do not reuse FIRST HUNT's.
#282 criterion 4, preserve #272's risk: IDENTITY_TEST_DATABASE_URL, WARWRIT_COMPANY_DATABASE_URL and WARWRIT_ENCOUNTER_DATABASE_URL remain the same primary database; only the destructive rollback case moves. Retain native URL/database-name readback without credentials.
#282 criterion 5, scope/invariants: ordinary diff confirms only the owned test changes, no released migration/production/auth/rule/schema/config/timeout/parallelism/audit-threshold edit; one `Closes #282`, separate from #272.
#272 retained criterion 1: preserve `37f35c6b815324e13e458007a40f96e2a9af0f99` unchanged; inspect `countTestIdentities` covering runtime issuer and /wrong, with sessions joined through owned accounts. This checkout does not yet contain that commit.
#272 retained criterion 2: builder report records wrong-issuer account mutation failing at accounts 2 vs 1 and separate session mutation at sessions 3 vs 2; both restored. Fresh Tier L evaluator repeats those existing probes on the combined candidate, then restores before five-pass proof.
#272 retained criteria 3–4: the same five real eight-file passes, unchanged callback/cookie/login/logout/expiry assertions and default concurrency above; OIDC-only success is insufficient.
Smallest ancillary checks, later by evaluator: server typecheck, changed-file format check, ordinary `pnpm check:changes` with its existing coverage prerequisite and normal commit audit. Record exits and findings; do not weaken gates or claim inherited reports as fresh passes.
Disposal proof: success and failure paths leave no owned test clients/pool/app or rollback database; private stack EXIT cleanup removes only the evaluator's Compose project/container/volume/network, preserving all unrelated resources. Capture logs before disposal.
Tier D applies to test-only #282; #272 retains its own Tier L reviewer/evaluator. Full verify/build/stress/migration suite and browser/day-night screenshots are NOT_RUN and unnecessary for this non-visual contract; no gameplay acceptance claim.

## Questions

No unanswered product/rule question and no additional source path requested.
Outside ownership: coordinator accepts the contract and later integrates the preserved #272 commit with #282 for proof; evaluator currently owns ALL checks/DB/runtime lifecycle for #271. Recommended: keep this task read-only until the coordinator explicitly transfers that slot; no concurrent checks.
Outside ownership: CHANGELOG.md/CURRENT_PLAN/wiki, live issue/PR state and publication belong to coordinator. Proposed record: 2026-10-22, `Vovanostm/core-world-rollback-isolation`, LOCAL read-only #282 contract; shared destructive-DDL boundary traced, exact deadlock cycle still unproven, finite per-case isolation proposed, all new proof NOT_RUN; no source/production change.
Production migrator change is not justified by current evidence. If isolation cannot satisfy acceptance, stop: proposed runtime path would be `apps/server/src/db/migrator.ts`, requiring concrete deadlock evidence and coordinator ownership/Tier L amendment before implementation; released SQL remains immutable.
