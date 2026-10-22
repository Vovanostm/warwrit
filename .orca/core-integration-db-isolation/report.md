# #285 build report — 2026-10-22

## Settlement

Local implementation; overall issue acceptance remains **NOT_PROVEN**. No push,
PR, GitHub mutation, deployment or coordinator-record write. Seven allocated
source/test paths only, plus this report. Base `c62ad2d0`; starting head
`955de3a1`; `git fetch origin main && git merge --no-edit origin/main` exited 0,
“Already up to date.” Both histories retained; no rebase/reset/cherry-pick.

Commits: feature commit and final report commit are recorded in the final section
below. Normal pre-commit hooks are required; no bypass or threshold change.

## Implementation

- Explicit PostgreSQL source required; no retained/local fallback. Reject database
  query overrides. Existing pg 8.23.0 / typings 8.23.1 and Vitest 4.1.11 inspected;
  version-pinned official client/globalSetup/sequence documentation read.
- Create a random, empty owned template from template0, apply migrations once,
  close clients, and clone one database per discovered integration test path.
- Global setup provides a serializable path map. Worker setup binds all five URL
  variables before collection. Stack hooks close existing apps/pools first, then
  drop the file clone. Logs name test path and database, never connection URLs.
- Global teardown attempts all clones before the template, including failed
  collection leftovers. Cleanup errors reject; forced session termination targets
  only the run's allocated database URLs. The existing bootstrap Compose trap
  remains responsible for abrupt whole-process interruption.
- Migration smoke wrapper owns a separate empty database, runs unchanged smoke
  code as a child, propagates nonzero exit, and disposes in finally.
- `test:migrations` now selects all eight integration files. Worker limit remains
  2; default file parallelism, existing assertions/timeouts/retries unchanged.
  Normal/coverage modes disable integration hooks. Literal hook paths preserve
  static-tool reachability; extracted config helper keeps complexity below gate.

## Acceptance mapping

| Criterion                             | Actual proof                                                                                                                                                                                                                                                                                                                                                                                      | Remaining limits                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1: migrated database per file       | Real-PG lifecycle tests verify 14 applied migrations / zero pending, distinct clones, clean template and identical independent fixture keys. Global setup test allocates eight distinct path mappings. Native supplies + company-transition run: 2 files / 2 tests PASS in 3.50 s, separate ready/disposed database names.                                                                        | Full native eight-file run NOT_RUN by allocation; current_database/migration status for every native file remains coordinator proof.                                                          |
| AC1: destructive operations confined  | Real down/up plus `DROP SCHEMA public CASCADE` in one clone leaves another clone's schema/data intact; source/unowned URL drops rejected.                                                                                                                                                                                                                                                         | Unchanged migration-smoke wrapper and original #282 nested rollback scenario NOT_RUN; coordinator schedules migration suite.                                                                  |
| AC1: disposal and failure propagation | Real worker probes pass, intentional test failure, intentional collection failure, and intentional cleanup failure; child exits 0/1 as expected and pg_database/pg_stat_activity show no probe leftovers. Real read-only PostgreSQL DROP errors form AggregateError for both owned databases; late global setup failure disposes all clones/template. Pool-close output precedes disposed output. | Abrupt kill containment source-reviewed only, NOT_RUN. Native all-eight disposal not claimed.                                                                                                 |
| AC2: parallelism/assertions           | maxWorkers 2/default file parallelism unchanged. Two generated worker files log ready before either disposal; identical fixture inserts succeed. Native focused two-file logs overlap. No existing test/production/migration source edited.                                                                                                                                                       | CI duration <=20% NOT_MEASURED. Three matched baseline/candidate hosted samples and raw medians remain mandatory.                                                                             |
| AC3: five consecutive full CI runs    | NOT_RUN; no hosted CI scheduled or mutations authorized.                                                                                                                                                                                                                                                                                                                                          | Coordinator schedules five complete non-overlapping final-head runs; any failure breaks streak.                                                                                               |
| AC4: #272/#282 disposition            | Existing #282 world rollback source untouched. #272 accepted unmerged PR #287 source/evidence untouched; not cherry-picked or rewritten.                                                                                                                                                                                                                                                          | No issue closure. Coordinator integrates #272 and decides residual scope from hosted proof. Existing null terminal-effects cause remains UNPROVEN; no production-effects fix.                 |
| Tier L                                | Author lifecycle and two native files proven locally.                                                                                                                                                                                                                                                                                                                                             | Independent reviewer/evaluator, persistent JOIN→move/bow→victory→effects/replay/idempotency and final-head hosted gates remain coordinator-owned NOT_RUN. Combat-lab captures are smoke only. |

## Checks and observed failures

- First focused test, before helper implementation: FAIL, missing lifecycle module,
  expected red test. Initial first-edit `pnpm check:changes` ran after each of the
  seven files: exit 2, missing coverage file. Later focused real-PG coverage created
  normally; no fake coverage or audit config edits.
- Initial lifecycle attempt: 2 PASS / 1 FAIL (synchronous clone ownership throw);
  changed clone helper to async and reran. Initial hook harness hid passing stdout;
  verbose/direct worker output fixed observability, without changing assertions.
- Scoped server typecheck initially failed TS6059 for static test imports outside
  rootDir. `vi.importActual` with explicit test interfaces keeps tooling scripts
  outside the server compilation root; subsequent server and script typechecks PASS.
- Initial audit found unreachable mode-conditional hook paths and config CRAP 30;
  restructured config/helper and preserved static hook registration; audit PASS,
  zero new dead-code/complexity/duplication findings. No thresholds weakened.
- ESLint initially rejected console calls; switched lifecycle diagnostics to
  process.stdout.write; changed-file lint PASS.
- Latest focused lifecycle: 1 file, **9 PASS / 0 SKIP**, exit 0, 6.02 s.
  Command: `INTEGRATION_LIFECYCLE_DATABASE_URL=<owned disposable PG> pnpm exec
vitest run apps/server/src/db/integration-database.test.ts --coverage --mode
coverage --coverage.include 'scripts/integration*.ts' --coverage.include
'apps/server/src/db/migrator.ts'`. Real measured scope: statements 84.54%
  (93/110), branches 76.92% (20/26), functions 90.32% (28/31), lines 84.15% (85/101).
  Child-process hooks execute for real but their V8 coverage is not aggregated.
- Native focused command: `DATABASE_URL=<owned disposable PG> pnpm exec vitest run
--mode integration apps/server/src/company/supplies.integration.test.ts
apps/server/src/contracts/company-transition.integration.test.ts --reporter
verbose`: exit 0, 2 files / 2 tests PASS, 3.50 s. Both files bound to different
  databases before collection; each emitted disposal.
- `pnpm --filter @warwrit/server typecheck`: PASS. Scoped `tsc --noEmit --strict
--target ES2023 --module NodeNext --moduleResolution NodeNext --skipLibCheck`
  on four scripts plus Vitest config: PASS. Changed-file ESLint and Prettier: PASS.
- Full verify, combat stress, test:migrations, bootstrap, hosted timing, five CI:
  **NOT_RUN / NOT_MEASURED**, deliberately reserved for coordinator.
- First normal commit hook: FAIL, refreshed ordinary coverage scored createDatabaseRun at CRAP 30. Extracted pure source-URL validation and added both override-key cases; focused real-PG rerun 9/9 PASS. No hook or threshold bypass.
- Final hook, validate, browser smoke and cleanup results follow below.

Local untracked evidence (paths, no committed links):
`.orca/core-integration-db-isolation/lifecycle.log`, `native-focused.log`,
`hooks-pass.log`, `hooks-test-failure.log`, `hooks-collection-failure.log`,
`hooks-cleanup-failure.log`. Generated probe fixtures live only in this lane's
`.orca` directory and are removed in test finally; no additional tracked source.

## Owned resources

Declared before start: Compose project `warwrit-285-isolation-builder`, service
`postgres`, container `warwrit-285-isolation-builder-postgres-1`, network
`warwrit-285-isolation-builder_default`, volume
`warwrit-285-isolation-builder_warwrit-postgres`. Allocated loopback port 32797;
PostgreSQL 17-alpine. No unrelated resource belongs to this build.

Worktree setup ran once because `.worktree-ports` was absent: frozen install and
protocol/game-core/testkit builds PASS. Private combat ports 23065 / 25065.
Cleanup proof and exact runtime PIDs are added below before settlement.

## Proposed coordinator records

CHANGELOG Unreleased: “2026-10-22, Vovanostm/core-integration-db-isolation, LOCAL:
#285 adds explicit run-owned migrated-template/per-file PostgreSQL lifecycle,
integration-only Vitest hooks and isolated migration-smoke wrapper; test:migrations
selects all eight files without changing worker count/assertions. Nine real-PG
lifecycle/hook checks and two native integration files pass locally. No production,
released migrations or dependencies changed. Full eight-file/smoke/hosted CI and
<=20% timing remain coordinator gates; root cause of null effects is unproven.”

CURRENT_PLAN/wiki: source implemented locally; preserve #272 and #282, schedule
independent Tier L evaluation and full migration/CI/timing gates after cleanup.
Do not mark original issue acceptance or player acceptance complete.

## Risks / next action

Eight-file selection expands native coverage from two files and may expose
unrelated fixture/clock/batch defects. No causality or runtime saving is claimed;
<=20% remains a real risk. Admin account requires CREATE DATABASE and owned-drop
privileges. Source URL must be explicitly supplied against disposable infrastructure.
Coordinator owns remaining full gates, shared records and publication.

## Final local delivery and cleanup

- Feature commit: `0b0c44eb` — `test: isolate PostgreSQL integration databases per file (#285)`.
  Normal pre-commit refreshed focused coverage with the real-PG allocation and
  passed audit against `c62ad2d0`: zero new dead code, complexity or duplication.
  No `--no-verify`. Final report-only commit follows this feature; source remains
  the feature commit's seven-path implementation.
- `bash scripts/orca-validate.sh`: **exit 0, 9/9 PASS** at `0b0c44eb`: rebased,
  clean-tree, scope, packages, typecheck, format, lint, related-tests, audit.
  Scope **176/300 source additions + deletions**, excluding tests/docs.
  Validation ran after PostgreSQL shutdown and before browser runtime. Its related
  test result was **1 PASS / 8 SKIP**, because real-PG URL was deliberately unset;
  it is not additional database proof. Its ordinary coverage had 0% rounded
  coverage (1/25,858 statements); retain the separate real-PG result above.
- Playwright skill smoke: private URL `http://127.0.0.1:25065/combat-lab`.
  Default “Старая мельница” / “Развалины мельницы” launched with 6 controlled and
  6 opposing units. Set actual viewport 1440×900; saved and visually read both
  `shots/mill-day.png` and `shots/mill-night.png` under this report directory.
  PNG dimensions independently read as 1440×900 for both. Selected night using
  “Ночная сцена”; clicked “Защищаться”, observed archer defence and commander
  activation; clicked “Завершить ход”, observed spearman activation. No win,
  persistent JOIN or terminal-effects acceptance is claimed. Only console error
  observed: favicon.ico 404; Babylon WebGL2 initialized normally. No colour-vision
  emulation requested. These untracked screenshots are ordinary smoke evidence.
- Browser tooling environment: wrapper was not executable, so invoked it with
  `bash`. Default npm cache was unwritable; used this lane's private `.orca`
  npm cache without changing global permissions. Initial runtime returned READY
  but its launcher shell exited and navigation hit connection refused; restarted
  with an attached tail session, then completed the smoke. This was an environment
  lifecycle recovery, not a source change or test retry workaround.
- Database cleanup before validation: explicit SQL returned **owned_databases=0**
  and **owned_sessions=0**. Compose down exited 0 and removed only the declared
  project container, volume and network. Label-filtered inventories subsequently
  returned no containers/volumes/networks. Port 32797 had no listener (lsof exit 1,
  expected absence). No unrelated container was stopped.
- Browser/runtime cleanup: `playwright-cli -s=warwrit-285 close` exited 0;
  `bash scripts/orca-play.sh stop` exited 0 / STOPPED. Attached tail session
  explicitly ended with Ctrl-C (exit 130). Runtime launcher PID 13891; node
  descendants 14014, 14015, 14054, 14084 (web), 14090 (API), 14099 (esbuild).
  Initial detached launcher PID 12790 was already absent. Owned Playwright daemon
  PID 13298; Chrome/helper descendants 13302, 13343, 13344, 13348, 13363, 13528, 14502. Read-only process-tree checks captured executable names only; final exact
  PID check returned **0 of these 16 PIDs present**, and ports 23065, 25065 and
  32797 had no listeners. No owned active runtime remains. Local cache/evidence
  files remain in this persistent worktree; no database volume remains.
- Shared CHANGELOG, CURRENT_PLAN and wiki stayed read-only for this worker;
  proposed records above are ready for the coordinator. No publication performed.
  Full eight-file/migration smoke, timings, five hosted CI runs and independent
  Tier L gates remain **NOT_RUN / NOT_MEASURED** and mandatory.

## Rework 1/2 — 2026-10-22 (task_247470b6567e)

This section supersedes the original implementation's cleanup claim for ambiguous
CREATE acknowledgements. Starting HEAD `1c11cbba`; feature source was `0b0c44eb`.
Both complete verdicts at `284efd79`, accepted contract, original report and live
#285 body/comments were read. Fetch plus ordinary merge of origin/main completed
with “Already up to date”; current CHANGELOG/CURRENT_PLAN were read afterward.
The graph indexes another checkout/head, so current source is the authority.
No shared records, original evaluator evidence, #272 source or #282/assertions
were edited. The latest allocation supersedes the old build task ID.

### Reproduction and fix

- Reused the private evaluator reproducer as a lead, implementing a small test-only
  TCP relay with Node's existing net API. It forwards real PG17 wire messages and
  drops precisely the CREATE CommandComplete after PostgreSQL commits. No driver,
  query, transaction or assertion is faked; no dependency or proxy framework.
- First red run: 3 failed / 9 selected-out, 2 uncaught Client errors. Its clone
  fixture initially crossed run ownership and was corrected before judging that
  path. Corrected red run: all 3 allocation cases failed, 3 unhandled Client errors.
  `red.log`, `red-corrected-fixture.log` and `red-orphans.sql.log` retain the actual
  failures. The red-run orphan databases were contained by removal of this new
  disposable Compose project, then it was freshly recreated; no name/prefix sweep.
- Generated exact URLs now enter the run ledger before CREATE and remain there
  after ambiguous transport failure. Existing exact-membership DROP IF EXISTS
  cleanup removes them; other runs' databases remain untouched.
- Client error events reject the awaited lifecycle operation, with their listener
  retained through client.end(). Connection/action sequencing has its own small
  helper. Original transport errors reach callers; no process-level error observer
  or suppression was added.
- Global setup and the migration wrapper share failure cleanup: successful cleanup
  rethrows the original object; failed cleanup throws AggregateError containing
  the original object first and the complete cleanup failure second (also cause).
  Successful smoke-child exit handling remains unchanged.
- Tests cover empty/template/clone committed CREATE with lost reply, SQL existence
  before disposal and database/session absence afterward, plus another run's
  surviving database. A real read-only PG cleanup failure retains code 25006,
  the original error identity and the full nested cleanup error.
- Hook evidence can use an explicit test-only directory, preserving the original
  author's/evaluator's logs. Only four allocated source/test paths changed in
  rework; aggregate issue source scope is 200/300 lines per the validator.

### Executed checks before commit

- First-edit check:changes after each edited file: test PASS; helper FAIL for its
  temporarily unused disposeAfterFailure export before consumers were edited;
  global setup and migration-wrapper audits PASS. No thresholds changed.
- Focused new regressions: 4 PASS / 9 selected-out, exit 0. Full lifecycle coverage:
  13 PASS / 0 SKIP, exit 0, 7.31 s; final cause-field revision rerun: 13 PASS / 0
  SKIP, exit 0, 6.75 s. Final measured statements 85.34% (99/116), branches 76.92%
  (20/26), functions 91.17% (31/34), lines 84.90% (90/106). Child hooks run for real;
  their coverage is not aggregated. Logs: rework-1-evidence/lifecycle-coverage*.log.
- Server typecheck and scoped strict NodeNext tsc for the four lifecycle scripts
  plus Vitest config PASS. Changed-file ESLint initially rejected cause pointing
  to the original error inside the cleanup catch; corrected cause to the caught
  cleanup error, preserving both errors and asserting their identities; lint and
  Prettier then PASS. Final ordinary audit against main PASS, zero new dead-code,
  complexity or duplication findings. The audit reports its existing syntactic
  attribution warning; no tool configuration changed.
- Normal commit/hook, validator, smoke and final cleanup are recorded below once
  executed. New check evidence is private under rework-1-evidence/; no URLs or
  credentials are printed in those logs.

### Acceptance and limits retained

AC1: new real-PG failure-boundary proof above supplements the original lifecycle
and evaluator's historical eight-file/60-test disposal evidence; it does not make
that evaluation fresh at the replacement head. AC2: worker limit 2, default
parallelism, timeouts/retries and all existing assertions unchanged; matched
hosted <=20% duration is still NOT_MEASURED (three matched samples required).
AC3: five consecutive complete hosted CI runs NOT_RUN, coordinator-owned and
mandatory. AC4: #272 remains outside this branch; original accepted evidence and
#282's nested rollback/competing-writer/clock/receipt assertions remain intact.
The prior evaluator persistent JOIN → move/bow → victory → effects/replay/
idempotency journey and 60 tests are historical proof only. Fresh independent
Tier L review/evaluation are required at the new head. No full verify, stress,
bootstrap, test:migrations or hosted run is allocated or run in this rework.
No production, migration, auth, replay, game rule, dependency or UI change.

### Proposed coordinator documentation update (not a shared-file write)

CHANGELOG: 2026-10-22, Vovanostm/core-integration-db-isolation, LOCAL, #285 rework:
reserve exact database targets before CREATE, await Client transport errors and
retain original plus cleanup failures; three real committed/lost-reply cases and
real cleanup-error retention pass with all existing lifecycle probes (13 total).
No production/assertion/parallelism change; new-head Tier L and hosted AC pending.
CURRENT_PLAN/wiki: replace the source-fix blocker with the committed replacement
head after handoff; retain both historical REWORK verdicts, all #272/#282 proof,
<=20% timing and five full CI requirements; do not declare overall acceptance.

### Rework settlement

- Commit `9ea84fcf` — `test: retain ambiguous database allocations and await client
errors (#285)` — includes the four-path fix/regressions and this report's rework
  record. Normal pre-commit refreshed related coverage against the explicit private
  disposable PG and passed the main-based audit (zero new findings). No hook bypass.
  Original report was already tracked despite git's ignored-directory warning;
  commit readback confirmed all five intended paths. No unrelated path staged.
- `bash scripts/orca-validate.sh`: exit 0, all 9 gates PASS at `9ea84fcf`: ancestry,
  clean tree, scope **200/300**, packages, typecheck, format, lint, related tests,
  audit. PostgreSQL was stopped/removed before validation. Its related-tests count
  was 1 PASS / 12 SKIP without DB and rounded 0% ordinary coverage; that is not new
  DB proof. Retain the separate 13/13 real-PG focused result above. Private validator
  output is rework-1-evidence/validate.log; normal `.orca/validate-*.log` detail.
- Brief Playwright smoke at the private combat-lab URL, default mill, 6 controlled
  / 6 opponents: started battle, selected actual Night Scene, defended with the
  archer (commander became active), ended commander turn (spearman became active).
  New screenshots preserve all prior images: shots/rework1-mill-day.png and
  shots/rework1-mill-night.png, both visually read and independently checked as
  1440×900 PNGs. HUD and tested inputs were readable/usable. No visual change or
  full visual acceptance claimed; no fresh persistent or victory/effects proof.
  Only console error: favicon.ico 404. Browser close exit 0; play stop exit 0 / STOPPED.
- Owned PG17 project `warwrit-285-rework1` and exact resources were declared in
  rework-1-evidence/resources.md before launch. Final SQL (before Compose removal)
  returned **owned_databases=0, owned_sessions=0, remaining_admin_sessions=0**.
  Raw SQL is retained in rework-1-evidence/sql-cleanup.log. Compose down removed
  its container/network/volume; final project-labelled inventories are empty.
  No unrelated resource stopped and no retained/default database used.
- Normal-check descendant inventory: 28 PIDs; runtime/browser plus attached
  keepalive: 16 PIDs. Final exact readback: **44/44 absent**. Owned keepalive PID
  2500 was identified against the pre-browser snapshot and explicitly terminated
  after play stop; attached session exited 143. All 18 recorded ports absent:
  23065, 25065, 32805, 54232, 54235, 54245, 54618, 54632, 54637, 55834, 55847,
  55860, 56322, 56334, 56349, 57553, 57565, 57577. lsof exit 1 with empty output
  for each. `final-cleanup.json` retains exact PIDs/ports/readback. Earlier short
  test process PIDs were not measured; no claim of exhaustive historical PID
  tracking. One direct shell ps call was denied; Python subprocess ps readback
  succeeded and supplied the final native observations.
- Final documentation closeout only follows this source commit; source and
  validator-tested behavior remain unchanged. Report readback/diff/format checked;
  normal report commit finishes the rework. Shared files remain coordinator-owned.

Handoff: branch Vovanostm/core-integration-db-isolation, source `9ea84fcf`, local
only; both gate findings addressed with real-PG regressions, audit and validator
PASS; all owned runtime settled. Next: fresh independent Tier L gates at replacement
head, then coordinator-hosted matched timing and five complete CI runs. Original
#285 AC remain mandatory and NOT_PROVEN overall; publication/merge NOT_RUN.

Explicit report formatting check initially flagged one multiline inline-code
indentation in the new settlement paragraph; corrected with Prettier, final PASS.

## Final rework 2/2 — 2026-10-22 (task_aa091f52cfec)

Starting HEAD `7765c0f7`, source `9ea84fcf`; clean dedicated persistent worktree.
Read AGENTS, complete contract/report, review-2 and eval-2, live #285 and comments,
ADR-0003 and technology handoff. Context/delivery skills applied. The MCP graph
indexes another checkout and older head; installed dependencies and current files
are the source authority. Fetch plus ordinary merge origin/main exited 0, already
up to date; current CHANGELOG/CURRENT_PLAN read after integration. No rebase.
Only the assigned lifecycle helper, its tests and this append-only report change;
all previous evidence and coordinator-owned records are preserved.

### Reproduction boundary and minimal repair

Installed pg 8.23.0 client.js `_handleErrorMessage` / `_handleErrorEvent` emits idle
FATAL separately; `end()` awaits connection end with a resolve-only promise.
connection.js sends Terminate and half-closes its writable stream. Inspected
installed typings and retained official Client documentation as well.

The new real-PG relay holds only frontend Terminate, then uses a separate real
admin connection to `pg_terminate_backend` the exact BackendKeyData PID. It forwards
unmodified actual PostgreSQL messages, including FATAL 57P01. DROP CommandComplete
(or the actual query ErrorResponse) followed by ReadyForQuery and then Terminate
establishes query settlement before shutdown. No driver, query, transaction,
production code or dependency is mocked or replaced.

- First harness attempt (`red.log`) failed its own FATAL-boundary assertion: the
  relay's default half-close behavior closed the response side too early. This is
  not evidence for the claimed defect. No implementation was changed on that basis.
- Corrected half-open relay (`red-boundary.log`): 2 FAIL, 13 selected-out. Actual
  FATAL boundary reached in both cases. After successful DROP, helper returned
  success despite FATAL. After read-only DROP failed with actual PG 25006, it
  returned only 25006 and lost the distinct 57P01. No failed acknowledged DROP or
  orphan is claimed; the reproduced defect is lost shutdown error reporting.
- `withClient` now records error objects through completed closure, records the
  caught action or end rejection, then determines its outcome. One retained error
  is rethrown unchanged; distinct errors form AggregateError in observation order.
  Set identity deduplicates the same error seen through both event and await.
  `end()` remains awaited before return/rethrow, preserving template clone/drop
  ordering. Exact-name ledger-before-CREATE and cleanup membership are unchanged.
- Corrected boundary regression: 2 PASS / 13 selected-out. It expects 57P01 alone
  or the original query failure 25006 followed by distinct 57P01, checks uniqueness,
  and queries pg_stat_activity after return to verify the targeted backend is gone.
  Final cleanup confirms every exact owned database/session absent. Existing
  lost-CREATE empty/template/clone and other-run-survival regressions remain intact.

### New-head author checks

Fresh evidence directory: `.orca/core-integration-db-isolation/rework-2-evidence/`.
Resource declaration `resources.md` preceded creation of NEW private PG17 project
`warwrit-285-rework2`, exact container/network/volume named there. Loopback PG port
32803. No retained/default database, URLs or secrets were used in logs.

- First-edit audit after test edit PASS (upstream-based audit); first helper edit
  audit against origin/main PASS, zero new findings. Final main-based audit below
  uses the fresh real-PG focused coverage; no audit configuration weakened.
- A process-sampling wrapper was denied `ps` before its first coverage invocation
  produced output. That invocation is NOT_RUN, empty log retained; read-only native
  process inspection confirmed no surviving test descendants. The wrapper now
  records process-sampling limits instead of abandoning its child. No test failure
  or passing coverage is inferred from that runner failure.
- Final full focused lifecycle file: **15 PASS / 0 SKIP**, exit 0, 6.73 s, including
  both new shutdown cases and all prior lifecycle/hook/lost-reply regressions.
  Command: explicit private INTEGRATION_LIFECYCLE_DATABASE_URL and fresh evidence
  directory; `pnpm exec vitest run apps/server/src/db/integration-database.test.ts
  --coverage --mode coverage --coverage.include 'scripts/integration*.ts'
  --coverage.include 'apps/server/src/db/migrator.ts' --reporter verbose`.
  Real V8 coverage: statements 85.71% (108/126), branches 80% (24/30), functions
  88.88% (32/36), lines 85.96% (98/114). Real child hook coverage is not aggregated.
- Typecheck/lint/format/audit, normal commits, validation, day/night smoke and
  positive final resource cleanup are recorded in the settlement below after run.

### Acceptance limits and proposed coordinator records

Assigned lifecycle shutdown rework is locally repaired with real-PG evidence;
**#285 is not accepted**. Eval-2's independent 13 PASS and eight migrated databases,
default parallelism/disposal, native **59 PASS / 1 FAIL** are historical evidence,
not new-head acceptance. Its unchanged encounter assertion at line 4156 still
blocks acceptance: effects_applied_at was null after victory; subsequent terminal
proof/root/receipt/idempotency assertions were NOT_RUN. Cause, including shared-DB
attribution, remains UNPROVEN. No encounter/auth/production/migration/assertion,
timeout, retry, worker-count, parallelism or extra source path change is made.
No additional test:migrations/full verify/stress/bootstrap/hosted CI was run.
Separate coordinator-owned diagnosis must settle the encounter boundary before
any correction. No diagnostic agent was launched or runtime shared by this worker.
All original AC and Tier L remain; matched hosted <=20% timing NOT_MEASURED and
five consecutive full CI NOT_RUN, coordinator-owned. #272 and #282 proof retained.

Proposed CHANGELOG Unreleased (coordinator-only): “2026-10-22,
Vovanostm/core-integration-db-isolation, LOCAL, #285 final rework: reproduce and
retain real Client FATAL through completed closure, including prior action error,
without duplicating identical errors; 15 focused real-PG lifecycle checks PASS.
No production/assertion/parallelism change. Encounter null-effects acceptance
blocker and original hosted timing/five-CI/Tier L requirements remain unresolved.”
Proposed CURRENT_PLAN/wiki: record replacement source head and fresh author
shutdown proof, preserve both previous rounds, request independent new-head review,
and retain separately owned encounter diagnosis. Shared records remain read-only.
