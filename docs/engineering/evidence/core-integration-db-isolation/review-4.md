VERDICT: ACCEPT 0ffa146d7032df6c2c03f237fce402599443c3a2

## Findings and verdict boundary

No new reproduced defect or concrete source risk requiring rework was found in
the allocated seven-path diff or the two-path supplemental repair. The previous
global-teardown exit-status finding is addressed at source level and has a
regression at the actual child-CLI boundary. This is **round-4 source-review
ACCEPT only**, not acceptance of #285, fresh PostgreSQL execution, or merge
readiness. Previous verdicts remain historical records.

## Independent scope readback

- Initial and final reviewed HEAD match the allocated full SHA above, on
  `Vovanostm/core-integration-db-isolation`; initial tracked status was clean.
  Reviewed `git diff origin/main...HEAD` using the existing local `origin/main`
  at `ff2f5f965aa4d5977c81e67292cb2c72629517e6`, without fetching. Also inspected
  source commit `b4d033ca` and changes after it. The ordinary main integration
  brings separately owned infrastructure changes; they are absent from this
  issue's diff against origin/main. No incompatible HEAD drift was observed.
- Read AGENTS.md, the complete `warwrit-review` skill, complete slice contract
  including coordinator amendment, complete report, review-3, eval-3,
  global-teardown-probe and committed terminal-effects-diagnosis.md. Read live
  #285 body and comments directly, current plan status/changelog, ADR-0003 and
  technology handoff. `docs/engineering/epics/217/contract.md` is absent.
- The graph inventory exposes Warwrit at another checkout and older head;
  current source and installed pg 8.23.0 / Vitest 4.1.11 source were used.
  No graph reindex was performed. Only root AGENTS.md was found outside private
  evidence/dependencies.
- Reviewed the complete seven-path issue diff and full new scripts/test files. `package.json`
  changes only `test:migrations`; Vitest configuration changes only integration
  lifecycle registration/order. Source additions/deletions excluding tests and
  records total **219/300**. Other issue-diff paths are the separately allocated
  author report, diagnostic Markdown and coordinator CHANGELOG/CURRENT_PLAN.
  No unauthorized implementation path, production logic, released migration,
  dependency, game rule, protocol or replay change was found.

## Supplemental teardown and regression boundaries

- `scripts/integration-global-setup.ts:28-36` awaits `disposeDatabases` before
  deciding the result. Its catch runs only after that helper has attempted every
  ledger target. It establishes exit 1 for unset/numeric-zero/string-zero status,
  preserves an existing nonzero status, and `throw error` rethrows the identical
  caught object. Successful cleanup leaves process status untouched. There is no
  early process exit or change to disposal ordering.
- This repairs the installed CLI boundary: Vitest's `close()` catches global
  teardown rejection and logs it after awaiting teardown
  (`node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js:13998-14026`);
  `startVitest` awaits close in finally, and `exit()` reuses close. The hook's
  status assignment therefore survives the logging-only path. No dependency,
  worker, timeout, retry or assertion workaround is introduced.
- `apps/server/src/db/integration-database.test.ts:290-334` observes the actual
  disposal rejection through a forwarding spy, invokes real disposal against
  read-only PostgreSQL, asserts strict error identity and code 25006, and restores
  process status and the spy before exact cleanup. The spy supplies no synthetic
  rejection or query result. This direct check proves identity at the hook
  boundary; it does not itself prove CLI behavior.
- The separate child cases at `:335-429` and generated wrapper at `:676-742`
  exercise the real CLI. Control performs no failure injection. Failure is
  enabled only after SQL proves both clones absent, no owned sessions, zero
  failed tests and only the migrated template remaining. It changes the child's
  separately owned admin database default through real ALTER DATABASE; it does
  not mutate worker context or `run.sourceUrl`. Subsequent real DROP operations
  reject with 25006. The wrapper records/rethrows the aggregate and sets exit 7
  only for the preservation case; it does not establish exit 1 on the hook's
  behalf. Parent assertions require two file-disposal markers and actual exits
  0/1/7. Recovery resets only that child's admin default and drops its exact ledger.

## Retained lifecycle and assertion boundaries

- `scripts/integration-database.ts:62-71` records each generated exact URL before
  CREATE. A committed CREATE with a lost reply remains in the cleanup ledger.
  Membership validation and escaped identifiers constrain destructive operations;
  cleanup does not scan/delete by prefix or disconnect another run's database.
- `withClient` retains error events through awaited `end()`, adds action/closure
  failures, deduplicates identical objects and selects its result only afterward.
  One error is thrown unchanged; distinct errors are aggregated in observation
  order. Installed pg's idle-error and resolve-only closure paths support the
  need for this retention. Both settled-DROP/FATAL regressions remain, including
  query 25006 followed by distinct 57P01 and backend-absence assertions.
- Reverse ledger disposal attempts all clones before the template, collecting
  every failure. Partial setup cleanup preserves the original object after
  successful disposal, or retains original plus complete cleanup aggregate on
  failure. All three lost-CREATE cases and other-run-survival checks remain.
- Global setup migrates one empty template, closes its migration client and
  creates path-specific clones. Installed Vitest runs setup files before test
  module collection, and `expect.getState().testPath` reads the worker filepath.
  File setup binds all five URL inputs before pools/configs are constructed,
  including reopened pools. Stack afterAll ordering puts existing app/pool
  cleanup before clone disposal; global cleanup covers failed collection and
  remaining clones. The unchanged outer bootstrap owns abrupt-run containment.
- The smoke wrapper allocates a separate empty database, invokes unchanged smoke
  assertions, preserves child nonzero exit and awaits disposal. The supported
  integration command selects all eight current files. `maxWorkers: 2`, default
  file parallelism, existing assertions, timeouts and retries remain unchanged;
  normal/coverage modes disable the integration hooks.
- Explicit diffs of all eight existing integration files, migration-smoke,
  bootstrap and lockfile against origin/main are empty. Read back the original
  encounter replay/effects/proof/root/receipt/idempotency assertions at
  `encounters/postgres.integration.test.ts:4148-4200` and #282's separately empty
  nested rollback database lifecycle. #272 accepted source remains separate on
  PR #287; this slice neither integrates nor rewrites it.

## Saved evidence inspected; no fresh execution

Paths below are under `.orca/core-integration-db-isolation/`. These are saved
author/evaluator artifacts, independently read here, **not newly executed checks**.

- `supplemental-evidence/red-global.{stdout,stderr}.log` and exit JSON retain the
  failed pre-repair regression. Its child `global-probe-1-4AZezx` has two passing
  files, completed file disposal, three real 25006 errors and actual exit 0.
  The parent first fails on the missing recorded exitCode field; the separate
  raw child exit establishes the CLI failure independently of that assertion.
- `green-global.stdout.log` records 4 PASS / 15 selected-out, exit 0. Read the
  full child stdout/stderr and SQL/exit/recovery JSON for the corresponding
  control `global-probe-0-VPRhgc`, failure `global-probe-1-jSy2BU` and prior-status
  `global-probe-7-0fQlH1`: exits **0/1/7**, each with two passing tests and two
  disposals. Failure artifacts retain all three 25006 errors and status 1/7;
  recovery records no remaining owned databases/sessions. The generated wrapper
  matches the tracked harness's relevant boundary.
- `lifecycle-focused.stdout.log`, stderr and exit JSON record **19 PASS / 0 SKIP**,
  exit 0, 9.52 s, including the identity test and all prior regressions. This
  supports the author's claim at its source revision; it is not fresh exact-HEAD
  PostgreSQL acceptance by this reviewer. `global-results.json` retains all
  twelve child artifact sets, including the red result, without erasing history.
- Read `rework-2-evidence/red-boundary.log` and `green-boundary.log`: the corrected
  relay reaches both FATAL-boundary assertions before red fails, and both cases
  pass after repair. These relays forward actual local TCP PostgreSQL traffic;
  they do not establish arbitrary TLS/network behavior.
- Saved final SQL and final-cleanup.json record empty database/session results,
  145 sampled PIDs absent, six clear ports and empty labelled Docker inventories.
  No current resource-absence check or runtime operation was performed here.

## Remaining limits and coordinator handoff

- Setup/install/build/checks/tests/coverage/PostgreSQL/browser/runtime:
  **NOT_RUN by this source-only reviewer**. Fresh evaluator proof remains a
  separate gate; related 1 PASS / 18 SKIP without DB is not PostgreSQL proof.
- Historical eval-2's unchanged encounter line 4156 failure remains unresolved,
  cause **UNPROVEN**. Eval-3's saved passing run and diagnostic invocation do not
  explain the failing invocation. No new production/fixture correction or source
  round is justified by this review. Original failed 2/2 and supplemental allowance
  history remain intact.
- Matched hosted <=20% timing: **NOT_MEASURED**. Three matched hosted samples and
  five consecutive complete CI runs: **NOT_RUN here**, still coordinator-owned
  mandatory criteria. No whole-issue acceptance, waiver, closure or publication
  conclusion follows from this local source verdict.
- Only this new round-4 report was written. No source/shared-record edit,
  commit/push, branch/ref mutation, GitHub write, Orca call, agent spawn or memory
  update. This report is the documentation closeout; shared-record updates belong
  to the coordinator. Proposed checkpoint: source-review round 4 ACCEPT at the
  exact SHA above; retain fresh evaluator, encounter diagnosis and hosted gates.
