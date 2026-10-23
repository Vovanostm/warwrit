VERDICT: ACCEPT 0ffa146d7032df6c2c03f237fce402599443c3a2

## Findings and acceptance boundary

No reproduced defect, unmet local journey criterion, ownership violation, rule/privacy/replay violation was found in this independent round. This is **local Tier L evaluator ACCEPT**, not acceptance or closure of #285. The historical eval-2 59 PASS / 1 FAIL at encounter line 4156 remains unresolved; this passing run does not explain or repair that intermittent failure. Its cause remains **UNPROVEN**.

Matched hosted integration duration increase <=20%: **NOT_MEASURED**. Three matched hosted samples and five consecutive complete CI runs: **NOT_RUN**, coordinator-owned, still mandatory. No waiver, extra source allocation or rework-budget reset is inferred.

## Source review

Initial and final checkout: allocated worktree, branch `Vovanostm/core-integration-db-isolation`, full HEAD above; tracked tree clean. Reviewed `git diff origin/main...HEAD` against existing local origin/main `ff2f5f965aa4d5977c81e67292cb2c72629517e6`, without fetching or changing refs. Read root AGENTS.md, complete contract including coordinator amendment, complete build report, review-3/eval-3/global-teardown-probe, committed terminal-effects-diagnosis, live #285 body/comments, current plan/changelog, review and Playwright skills, ADR-0003 and technology handoff. The graph lists another Warwrit checkout/older head; actual source and installed versions were used.

All seven implementation/test paths are allocated. `package.json` changes only test:migrations; Vitest changes only integration hooks. Existing report/diagnosis and coordinator-owned CHANGELOG/CURRENT_PLAN changes have their separately allocated ownership. No production, original integration assertion, released migration, dependency, protocol/replay format, game rule, timeout, retry, worker limit or default file parallelism change. In particular, the encounter and world integration files have an empty diff against origin/main. #272 accepted source remains separate PR #287; it was neither integrated nor rewritten. #282's dedicated nested rollback database and competing-writer/receipt/all-clock-row assertions remain intact.

The exact generated URL enters the ledger before CREATE. Drops require exact ledger membership, attempt every clone before the template and retain cleanup failures. Client errors remain observed through awaited closure; original error objects and distinct shutdown failures are preserved. File setup binds all five inputs before collection; stack ordering closes existing app/pool hooks before disposal. Global cleanup covers remaining clones and now preserves prior nonzero status, establishes failure on cleanup rejection and rethrows the original object. Smoke uses a separately owned empty database and unchanged destructive assertions. Execution below independently confirms these boundaries.

Ordinary source diff and lifecycle test diff are saved in `eval-4-evidence/source.diff` and `lifecycle-source.diff`. No source edit or instrumentation was made.

## Fresh PostgreSQL checks

Resources were declared before creation in `eval-4-evidence/resources.md`: NEW PG17-alpine Compose project **warwrit-285-eval4**, service postgres, container **warwrit-285-eval4-postgres-1**, network **warwrit-285-eval4_default**, volume **warwrit-285-eval4_pgdata**, explicit **127.0.0.1:32887**, 2 CPUs / 1 GiB. Disposable trust authentication and explicit private admin source only; no retained/default database or credential URL logs. Node 24.20.0 / pnpm 11.25.0 / installed Vitest 4.1.11. Heavy commands ran sequentially, before game runtime.

1. Complete unchanged focused lifecycle file: **19 PASS / 0 SKIP**, exit **0**, **10.92 s**. Command: `pnpm exec vitest run apps/server/src/db/integration-database.test.ts --reporter verbose`, explicit private lifecycle source and new evidence directory. Raw separate streams/status: lifecycle.stdout.log, lifecycle.stderr.log, lifecycle.exit.json.
2. All prior regressions ran: real committed empty/template/clone CREATE replies lost over PG wire, SQL existence before cleanup and absence afterward, other-run sentinel survival; settled DROP then real FATAL 57P01, also original 25006 followed by distinct 57P01 and closed backend; identical fixture keys, destructive down/up confinement, unowned-drop rejection, all-target cleanup and partial setup failure. Original error and complete nested cleanup AggregateError identity assertions passed.
3. Real global-only CLI probes independently returned **0 / 1 / 7**. Every child had two passing tests, both real file disposals, zero clone sessions and only its template remaining before any cleanup-only failure. Failure/prior-status cases then produced the real global cleanup AggregateError with **three 25006 errors**, retaining failure status 1 or prior status 7. Strict original rejected-object identity and process status also passed through the direct real-disposal wrapper. Each unique global-probe directory retains child stdout/stderr, actual exit.json, SQL precondition, failure.json and exact-ledger recovery.json. No mock query, transaction or rejection supplies this proof. Original four worker-hook cases pass with expected child exits **0/1/1/1**; their intentional failures are adversarial checks, not native-suite failures.
4. **Exactly ONE complete `pnpm test:migrations`**, exit **0**: unchanged smoke reports `migration.smoke` status `ok`; **8 files / 60 tests PASS / 0 SKIP**, Vitest **62.03 s**. Full actual combined stdout/stderr is test-migrations.log; status is test-migrations.exit and native.exit.json; wrapper streams also retained. No full-suite retry or extra targeted diagnostic invocation. No full verify, bootstrap, stress, coverage or hosted CI.

The full native command used external read-only SQL observation and Node's loopback inspector; all original inputs, choices, assertions, worker count/default parallelism and timeouts remained unchanged. Debugger pause/observation overhead means this local duration is **not** a hosted performance comparison or uninstrumented timing sample.

### Eight-file SQL evidence

For every ready event, actual `current_database()` and schema_migrations were queried: **eight distinct names, 14 applied and zero pending each**. After every disposed event, pg_database and pg_stat_activity returned **[] / []** for that exact clone. Maximum observed active files: **2**, initially encounters plus world routes. Evidence: sql-observation.jsonl and sql-summary.json.

| File under apps/server/src/                      | Actual current_database()                       | Ready UTC    | Disposed UTC |
| ------------------------------------------------ | ----------------------------------------------- | ------------ | ------------ |
| encounters/postgres.integration.test.ts          | ww_integration_18affd04ee7041c386cdb4b53b3d7b26 | 09:42:58.916 | 09:44:00.267 |
| world/routes.integration.test.ts                 | ww_integration_6ea01c94e50c41eca25a2378d6371821 | 09:42:58.917 | 09:43:06.565 |
| world/continuous-movement.integration.test.ts    | ww_integration_9990321ffa4c4eb79db3b184cf5fe19e | 09:43:06.714 | 09:43:11.239 |
| company/supplies.integration.test.ts             | ww_integration_c9cae2bf806f42fc818f93cafd645b53 | 09:43:11.369 | 09:43:13.339 |
| company/executor.integration.test.ts             | ww_integration_b4c94a25154d4727b900a1a6a6bb8242 | 09:43:13.471 | 09:43:15.364 |
| company/routes.integration.test.ts               | ww_integration_0556c9af0b144cfda8c2e762b4c61a57 | 09:43:15.497 | 09:43:18.289 |
| auth/oidc.integration.test.ts                    | ww_integration_13c011a554bc48d0b8b12d1c4887bc3a | 09:43:18.467 | 09:43:21.304 |
| contracts/company-transition.integration.test.ts | ww_integration_bf2e048e1a09494d92fa4f83fd44d58c | 09:43:21.479 | 09:43:22.018 |

SQL also recorded smoke database **ww_integration_3b540e017b22476b9071089f8c40a3de** appearing before migration smoke and absent at 09:42:57.856, before template creation. Template **ww_integration_b97cc11692a745c19bee2f152c95c524** survived file disposals and disappeared during global teardown at 09:44:00.375. Dedicated #282 rollback database **warwrit_rollback_b6c6965676aa4259a5c6a4c506be6092** appeared at 09:43:04.723 and disappeared at 09:43:05.394 while other clones/template survived. Session samples and final SQL are retained. Polling observed one **3D000** race after encounter disposal at 09:44:00.263; this is a retained observer limitation, not a source defect or a failed native assertion. All eight ready/disposed SQL proofs and final cleanup SQL succeeded.

### Persistent journey and original effects invocation

The original native wolf case passed authenticated JOIN -> actual move/bow -> reopened pool/durable retry/one shot receipt -> genuine resolved victory -> replay -> non-null effects -> proof, both company roots and terminal receipts -> idempotent reapplication and unchanged final rows. No later assertions were skipped or blocked.

External inspector evidence is native-inspector.jsonl; compact selected-batch/company readback is native-inspector-summary.json. The **original invocation before finally cleanup** selected encounter **a143cc88-930b-45a7-b90d-bddd68dd6fd8**, world **118d04c3-93e9-4df4-9cd4-2818b89dc39c**, revision **42**, limit 16, in the encounter clone above. Both companies returned **READY**: **5764d7c0-d3d5-45b3-b9b2-87dd93136cac** and **6c4a5839-3155-47e4-97ef-c1a5c7e57557**. Its idempotency invocation selected an empty batch. This is a passing invocation, not the historical failure's cause. Read-only guard evaluations rejected by throwOnSideEffect are preserved as EvalError observations; they are not game exceptions or proof of a false guard. Other original tests exercised leadership-finalization paths, but their state must not be attributed to this wolf invocation. No additional diagnostic, injected choice, rerolled seed, state change or production fix was attempted.

## What I played

`bash scripts/orca-play.sh start`: **exit 0**, **READY http://127.0.0.1:25065/combat-lab**. Own named real Playwright CLI session **warwrit-285-eval4**, actual **1440x900** viewport. Default **Старая мельница / Развалины мельницы**, unchanged seed **20261009**, roster/map, six controlled and six opposing units.

1. Clicked **Начать бой**, inspected the active archer, AP/resources, orders and initiative.
2. Hovered Wolf 1 marker G; captured day. Clicked G to inspect it, clicked **Ночная сцена**, captured night. Personally opened both images. Active resources/orders, initiative, target identity/health and tested controls are readable and unobstructed; lower target details have the explicit panel scroll cue. This Tier L slice has no changed presentation or separate U/T/V visual criterion; no art-sheet/whole-visual-matrix acceptance is claimed.
3. Clicked **Обзор поля**, clicked adjacent canvas cell **593,387**, then **Переместиться**. Archer **(2,5)->(3,5)**, AP **4->3**, stamina **100->96**. One initial CLI run-code attempt returned SyntaxError before executing; retained in mill-cell.log. Used actual mouse move/down/up afterward; this was a tooling correction, not a game failure or state injection.
4. Clicked Wolf 1 on canvas **797,407**, then **Атаковать**. Wolf health **50->31**, morale **80->68**; commander became active. Own after-shot screenshot/DOM saved.
5. Hovered and clicked **Завершить ход**; spearman became active. Own DOM confirms the transition.
6. Clicked **Начать автобой**, observed intermediate round 3 and genuine **round 7 / Победа**: allies **6 in formation / 0 dead**, enemies **0 in formation / 6 dead**. Opened and judged own final victory image. Intermediate capture preserved separately as mill-autobattle.png.

Own screenshots are under **eval-4-shots/**: mill-day.png, mill-night.png, mill-overview.png, mill-after-shot.png, mill-autobattle.png and mill-victory.png. All six PNG headers independently confirm **1440x900**. Action/DOM/console logs and private .playwright-cli artifacts are under **eval-4-evidence/**. Babylon 9.28.0/WebGL2 initialized; the only console error was favicon.ico 404, unrelated to changed ownership and not an acceptance defect. Browser lab is in-memory play evidence; durable acceptance comes from the separate real-PG journey above.

## Cleanup, limits and handoff

SQL **before Compose removal**: **databases [] / sessions []**, covering all non-system databases except this allocation's explicit admin source and all other database sessions. Saved sql-cleanup.json. Compose down exited 0 and removed only the declared container/network/volume. Final project-labelled Docker container/network/volume inventories: each **exit 0 / empty**.

Named browser close **exit 0**; `bash scripts/orca-play.sh stop` **exit 0 / STOPPED**. Exact owned keepalive **13098** was verified as tail and terminated; attached runtime shell settled exit 0. Initial runtime launcher **12759**, shell **12405**, Playwright daemon **13240**, Chrome **13251**, and their sampled descendants are recorded. Final native readback in final-cleanup.json: **950/950 recorded PIDs absent** (includes short-lived process-sampling children; unsampled historical descendants are not claimed exhaustively recorded). All **21 recorded ports** have no listener, lsof exit 1/empty: **23065,25065,32887,50867,50883,50897,50916,50925,51565,51569,51572,51578,51598,51618,51620,51965,52155,52250,52345,52479,52607**. The Docker namespace PID is identified separately in container-identity.log, not counted as a macOS host PID. No unrelated resource was stopped. Private logs/cache/images remain; no owned running DB/proxy/browser/game runtime remains.

Only this new verdict and private eval-4-evidence/eval-4-shots were written. No tracked source/test/config/contract/shared-record edit, commit/push, GitHub mutation, branch switch, fetch/merge, Orca call or agent spawn. Other readers and all previous evidence are preserved. This report is documentation closeout; coordinator owns shared records and publication.

Proposed coordinator checkpoint: fresh local evaluator ACCEPT at this exact head; 19 lifecycle PASS, actual global-only child exits 0/1/7, one native 60/60 PASS with eight migrated clones/default overlap/disposal and original persistent wolf assertions, own mill day/night/manual move/bow/end-turn/round-7 victory, positive SQL/resource cleanup. Retain historical null-effects cause UNPROVEN, all original #285 AC/Tier L and #272/#282 disposition, hosted <=20% timing NOT_MEASURED and five full CI NOT_RUN. Do not close #285 or infer issue acceptance from this local gate.
