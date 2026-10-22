# Changelog

Notable changes to the repository's tooling, gates and delivered behavior. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
project has no released versions yet, so entries stay under _Unreleased_. New
entries include their date, originating branch and actual delivery status; record
the merge date when merged. Earlier history is in the Git log and merged pull
requests.

## Unreleased

### Validate final database closure rework and resume engineering queue — 2026-10-22, PUBLISHED

- `Vovanostm/core-integration-db-isolation`, #285, owner-requested single tick:
  final rework 2/2 source `83372b0b`, report `05bca4f3`, 211/300 source lines.
  Real PostgreSQL regressions reproduce lost shutdown FATAL after settled DROP,
  including prior query failure; helper retains distinct errors through completed
  closure and preserves identity. Author 15/15 real-PG lifecycle checks PASS;
  no production/assertion/worker-count/default-parallelism change.
- Coordinator validator at `05bca4f3`: exit 0, all 9 gates PASS. Related tests
  1 PASS / 14 SKIP without DB are not fresh PG acceptance. Native settlement and
  ordinary source commits verified; all 136 declared PIDs absent, 14 ports clear,
  and labelled Docker inventories empty before exclusive runtime transfer.
- Independent source-only diagnosis is committed at
  .orca/core-integration-db-isolation/terminal-effects-diagnosis.md.
  The previous eight-file 59 PASS / 1 FAIL is retained: null terminal effects at
  unchanged encounter line 4156 remains unexplained. Batch selection, outer guard
  or leadership deferral require the original invocation's branch trace before
  cleanup. Leadership is a lead, not a reproduced cause or authorized fix.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records fresh Tier L round 3
  reviewer/evaluator allocation, exclusive runtime and preserved #272/#282 proof.
  Original hosted <=20% timing NOT_MEASURED and five full CI NOT_RUN remain gates.
  Under 2026-10-21 engineering delegation, #179's process-only recovery question
  is resolved: one supplemental shared-projection correction, total <=300, all
  original AC/DoD and full Tier V; original two failed reworks remain recorded.
  #179 waits #285 cleanup; #214 waits #179, #268 its web turn. No acceptance waiver.
- Published WIP branch only; no #285 PR/merge or player acceptance, 0 merged PRs
  with playable proof this tick. #274/#280 unresolved REWORK still blocks merge.
  Daily work already complete; no duplicate scout/metrics/digest. Coordinator
  browser/full verify/stress/migrations NOT_RUN; hosted timing NOT_MEASURED.
  Documentation format/diff/readback checked. No setup/API/wiki/game-rule,
  protocol/replay/schema/migration/dependency contract changed.

### Retain isolated encounter failure and queue final lifecycle rework — 2026-10-22, PUBLISHED

- `Vovanostm/core-integration-db-isolation`, #285, owner-requested single tick:
  evaluator round 2 REWORK at `0998c1d5`; source `9ea84fcf` unchanged, 200/300.
  Independent 13 real-PG lifecycle tests PASS. SQL confirms eight distinct
  migrated databases, default parallel execution and per-file/global disposal.
- Native migration suite: 59 PASS / 1 FAIL / 0 SKIP. The unchanged encounter
  terminal-effects assertion at line 4156 still fails after victory; later
  terminal proof/root/receipt/idempotency assertions NOT_RUN. Shared-database
  causality and the remaining fixture/clock/batch cause remain UNPROVEN.
  Mill day/night move/bow and round-7 victory are sampled browser evidence only.
- Reviewer round 2 REWORK identifies lost Client error during awaited end();
  source risk UNEXECUTED. Queue final rework 2/2 within the same seven paths,
  retaining all original AC/Tier L, normal audit and <=300 source-line scope.
  Remaining encounter failure needs separately bounded diagnosis; no production
  or assertion change is authorized by this lifecycle allocation.
- Exact evaluator settlement verified and recorded before acknowledgment.
  Coordinator directly checked all 23 recorded PIDs absent, six ports clear,
  and empty project-labelled Docker container/network/volume inventories.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records exclusive runtime
  handoff and queue. Verdict/evidence remain in the dedicated worktree under
  .orca/core-integration-db-isolation/eval-2.md and eval-2-evidence/ (local paths).
- WIP branch publication only; no PR/merge or acceptance. Matched hosted <=20%
  timing NOT_MEASURED; five full CI runs NOT_RUN. #272/#282 evidence retained.
  Coordinator tests/typecheck/validate/browser NOT_RUN this tick; documentation
  format/diff/readback checked before publication. No setup/API/wiki/game rule,
  protocol/replay/schema/migration/dependency change.

### Validate database lifecycle rework and request fresh Tier L — 2026-10-22, PUBLISHED

- `Vovanostm/core-integration-db-isolation`, #285, owner-requested single tick:
  rework 1/2 source `9ea84fcf`, report `2824c81f`, source scope 200/300. Exact
  generated database targets enter the cleanup ledger before CREATE; Client error
  events reject the awaited lifecycle operation; failed cleanup retains both
  original and complete cleanup errors. Four allocated source/test paths changed;
  no production, assertion, worker-count or default-parallelism change.
- Author real PostgreSQL regressions cover committed CREATE with lost reply for
  empty/template/clone allocations, SQL existence before cleanup, absence after,
  another run's surviving database and real cleanup-error identity: 13 PASS.
  These repair the reproduced round-1 findings; fresh independent acceptance is
  still required. Local owning report: core-integration-db-isolation/.orca/
  core-integration-db-isolation/report.md (tracked on this branch).
- Coordinator verified native settlement and clean committed source; validator
  at `2824c81f` exit 0, all 9 gates PASS. Related 1 PASS / 12 SKIP without DB
  supplies no fresh database proof. All 44 declared PIDs absent, all 18 ports
  clear and labelled Compose inventories empty before exclusive slot transfer.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records fresh round-2 Tier L
  review/evaluation allocation. Preserve historical REWORK/eight-file/60-test
  evidence, #272 accepted proof and #282 assertions; hosted <=20% timing remains
  NOT_MEASURED, five full CI runs NOT_RUN. WIP branch checkpoint publication only;
  no PR, merge or player-acceptance claim; 0 merged PRs with playable proof.
  No setup/API/wiki/rule/protocol/replay/schema/migration/dependency change.
  Full local verify/stress/migrations/browser NOT_RUN by coordinator this tick.

### Reproduce database cleanup failure and schedule bounded rework — 2026-10-22, LOCAL

- `Vovanostm/core-integration-db-isolation`, #285: owner-requested single tick
  records independent Tier L evaluator REWORK at `284efd79`. A real PostgreSQL
  CREATE reply dropped by a private TCP proxy reproduced the missing cleanup
  ledger entry and unhandled Client error. This supersedes the earlier source
  risk's UNEXECUTED status; no implementation fix or acceptance claimed here.
- Evaluator ran all eight native integration files / 60 tests and nine lifecycle
  checks successfully, observed migration status, overlap and per-file disposal,
  and played the mill through move/bow and round-7 victory with day/night captures.
  Persistent encounter assertions and browser lab smoke remain separate evidence.
  Local verdict/evidence: core-integration-db-isolation/.orca/
  core-integration-db-isolation/eval-1.md and eval-1-evidence/ (untracked).
- Exact native settlement/result verified, recorded before acknowledgement and
  released. Coordinator independently found 18 owned PIDs absent, seven ports
  clear and empty labelled Compose inventories. First rework 1/2 is allocated
  inside the existing seven-path ownership, preserving exact-name cleanup,
  original errors/assertions, ordinary audit, <=300 source lines and Tier L.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) holds the operational handoff.
  Matched hosted <=20% duration NOT_MEASURED and five full CI runs NOT_RUN remain
  mandatory. Source unchanged `0b0c44eb`; no PR/merge, zero merged PRs with playable
  proof. Coordinator game checks/runtime NOT_RUN; documentation checks only.
  No rule, API, wiki, schema, replay, migration or dependency change. Existing
  #179 cap question, #272/#282 proof, #274/#280 REWORK and daily marker retained.

### Queue isolation rework after independent source review — 2026-10-22, PUBLISHED

- `Vovanostm/core-integration-db-isolation`, #285: fresh Tier L source reviewer
  returned REWORK at `284efd79`. In `scripts/integration-database.ts`, a committed
  CREATE with a failed acknowledgement can escape the cleanup ledger, which is
  updated only after success. This is an independently traced source risk;
  reproduction NOT_RUN. Reserve only exact run-owned targets before CREATE and
  retain original errors in the next bounded rework; no source fix in this tick.
- Exact task/dispatch/sender/result and full verdict were checked, recorded before
  acknowledgement, then released. Local verdict path:
  core-integration-db-isolation/.orca/core-integration-db-isolation/review-1.md.
  Evaluator `task_cf926bbb6c7d` / `ctx_c4c26582a636` remains live with exclusive
  checks/DB/browser/runtime; finding forwarded. Combine all gate findings after
  its settlement and positive cleanup before starting the first rework.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records this one-tick handoff.
  Source remains `0b0c44eb`, scope 176/300; prior validator exit 0 / 9 gates PASS
  is retained evidence. New coordinator game tests/typecheck/validator/runtime
  NOT_RUN. Original full eight-file cleanup/persistent journey, matched hosted
  <=20% timing and five full CI runs remain outstanding; no acceptance waiver.
  No issue-state transition, PR or merge; 0 merged PRs with playable proof.
  #179 recovery cap, #214/#268 queue, #272 failed CI and #274/#280 REWORK retained;
  daily work already complete. No setup/API/wiki/rule/protocol/replay/schema/
  migration/dependency contract changed. Documentation commit publication only.

### Advance file-isolation implementation to independent gates — 2026-10-22, PUBLISHED

- `Vovanostm/core-integration-db-isolation`, #285: source `0b0c44eb`, report
  `9896b585`; branch checkpoint only, no PR or merge. Owner-requested single tick
  verifies exact native settlement and normal commits, records/acknowledges both
  messages and releases the settled builder. Source scope 176/300.
- Four integration lifecycle scripts, integration-only Vitest hooks and
  `test:migrations` now allocate a migrated template, one database per selected
  file and isolated migration smoke. All eight files selected; worker count and
  existing assertions unchanged. No production or released migration changed.
- [Build report](.orca/core-integration-db-isolation/report.md): nine real-PG
  lifecycle checks and two native integration files are author evidence;
  coordinator validator exit 0, 9/9 PASS at `9896b585`. Related test result
  1 PASS / 8 SKIP without a DB is not additional database proof. Direct coordinator
  readback found all 16 reported PIDs absent and three ports clear. SQL cleanup
  raw log missing; independently repeat. Lost-CREATE-reply cleanup advisory
  retained for fresh reviewer, not reproduced or accepted.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) schedules fresh Tier L review
  and exclusive evaluator checks/runtime. Full eight-file/migration and persistent
  victory/effects proof pending; matched hosted <=20% timing NOT_MEASURED and five
  full CI runs NOT_RUN. #272/#282 proofs retained, PR #287 CI failed; #179 remains
  at its existing recovery-cap question. No new issue, duplicate daily work or
  criterion waiver. Zero merged PRs with playable proof; no rule/API/wiki/replay/
  schema/dependency change. Full local verify/stress suites NOT_RUN.

### Accept isolation contract and retain exact CI blocker — 2026-10-22, PUBLISHED

- `Vovanostm/core-integration-db-isolation`: owner-requested single pipeline tick
  accepts #285's complete five-section contract after exact native settlement,
  result and live-issue readback. Contract worker released (`no_owned_resource`).
  Finite proposed lifecycle-script/config/test ownership is recorded in local
  slice overrides; implementation waits for #179 exclusive checks/runtime cleanup.
  Existing CI enables two integration files, proposed isolation enables eight;
  shared-database causality and the <=20% timing target remain unproven.
  All original disposal, parallelism, five full CI and Tier L gates remain.
- [PR #287](https://github.com/Vovanostm/warwrit/pull/287) native `c07b88d9`
  remains OPEN/red. Advisory leadership-choice pause is an unproven diagnostic
  lead for the null terminal timestamp, not a diagnosed cause or production fix.
  Preserve the assertion; next owned rerun observes admission/revision/leadership
  state. Original #272 proof and merged #282 rollback regression stay intact.
- Recorded/acknowledged four mailbox messages; forwarded sampled short-desktop
  day/night readability concerns to the sole #179 builder. No final Tier V
  verdict or repeated measurement is claimed. [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md)
  retains all original criteria, exclusive runtime ownership and deferred slices.
  No new worker, issue, label change or daily repeat; 0 merged PRs with playable
  proof. Local game tests/typecheck/build/DB/browser NOT_RUN, performance
  NOT_MEASURED; no setup implementation/API/wiki/game-rule/replay/migration change.
  Initial Markdown format check failed; formatting corrected before commit.
  The pnpm wrapper materialized pinned dependencies automatically during that
  check; no source or lockfile change and no setup/runtime/DB command ran.

### Resume interrupted coordinator checkpoint — 2026-10-22, PUBLISHED

- `Vovanostm/core-integration-db-isolation`: owner-requested single pipeline tick
  completes the interrupted documentation correction below. The new OIDC proof
  link points to unmerged PR #287, where that evidence exists; historical records
  remain intact. [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) retains #285's
  live read-only contract and #179's sole builder/checks/runtime allocation.
- Recorded and acknowledged two #179 advisories before relaying to its existing
  dispatch: possible initial-fit/full-field pan-limit overwrite (sender source
  review; browser NOT_RUN), and provisional ground detail concerns (cause
  unverified). Original full Tier V and size/depth/matrix criteria remain.
  Clean #179 head `514943b7` observed; no evaluator acceptance is claimed.
- Native PR #287 still has failed final-head CI at `c07b88d9`; #274/#280 retain
  REWORK. No PR merged, no duplicate worker or daily work. Markdown format,
  scoped diff and changed-section local links checked; local game tests,
  typecheck, build, DB/browser and full suites NOT_RUN; performance NOT_MEASURED.
  No source, setup/API/wiki/game-rule/replay/schema/migration contract changed.

### Route encounter CI failure to existing isolation issue — 2026-10-22, PUBLISHED

- `Vovanostm/core-integration-db-isolation`: one owner-requested pipeline tick;
  #272 / PR #287 at `c07b88d9` remains unmerged after native CI run
  `39715279402` failed the encounter v5 wolf terminal-effects assertion at
  `postgres.integration.test.ts:4156` (`effects_applied_at` null, 24 pass / 1 fail).
  Existing #285 already reports this exact failure; no duplicate issue and no
  independently proven shared-database cause. OIDC source and Tier L proof remain.
- Coordinator activates #285 as a dedicated Tier L read-only contract, retaining
  every original criterion, including <=20% integration duration and five full
  CI passes. Setup, source, checks and runtime are deferred while #179 owns its
  exclusive slot; contract must establish minimal ownership and shared-script
  sequencing before any implementation. No #285 fix or acceptance is claimed.
- Native #179 builder remains live, feature `6ce7f587` clean at observation.
  Coordinator directs removal of the newly added optional bespoke PNG byte
  decoder through a normal follow-up commit; preserve catalogue fit/upward-step/
  widened-B001/unchanged-height regressions, browser alpha measurements and
  original full Tier V. Existing #214 freeze and #268 queue remain.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records current continuation;
  issue comments read back exactly, mailbox advisory recorded before ack,
  #285 dispatch/worktree/liveness verified. Local game tests, typecheck, builds,
  DB/browser and full suites NOT_RUN; performance NOT_MEASURED. Documentation
  format/diff checks apply; no game-rule/API/wiki/replay/schema/migration change.
  Initial local-link check failed: OIDC evidence exists only on unmerged #287;
  corrected the new status link to that PR. Zero merged PRs with playable proof;
  daily work already complete.

### Publish accepted selection and autoplay extraction — 2026-10-22, PUBLISHED

- `Vovanostm/qa-hooks-selection-autoplay`, [PR #286](https://github.com/Vovanostm/warwrit/pull/286),
  #267: independent Tier U ACCEPT at `de77fa3d`, source frozen `9ccabbd9`.
  Extraction `b2520b1b` and callback regression relocation `cc98765f` preserve
  controls, refs, 550/750 ms timers, guards and transport. Scope 159/300.
- [Contract, complete author history, independent verdict and eleven JPEG captures](docs/engineering/evidence/qa-hooks-selection-autoplay/README.md)
  accompany publication. Coordinator validate exit 0, 9/9 PASS; 49 related tests,
  callback hits 10/17 after ordinary refresh. Evaluator independently passed
  49 focused tests and genuine day/night mill victories, real mounted
  selection/reset, 549+1 timing, React-only unmount/listener cleanup,
  held-response/replacement and reachable failure/admission states.
- Opponent-view browser row unreachable through ordinary synchronous routes:
  current source + existing production-policy regression, per documented
  proof-format decision. Internal ref ordering remains source-only where stated;
  baseline console comparison NOT_RUN, initial favicon 404 retained without
  inherited-error claim. Owned runtime/browser stopped; tracked tree clean.
- Only evidence and coordinator records follow gated head. Hosted final-head CI
  and merge pending; 0 merged PRs with playable proof so far this tick.
  #272 retains mutation/five real parallel-pass/Tier L gates; #214 next web slot.
  #268/#269/#262/#263/#231 remain open; final component 20/15 still required on
  #269 AND #262. Infrastructure #274/#280 unresolved REWORK blocks merge.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records continuation.
  No setup/API/wiki/rule/replay/schema/migration/dependency change; full local
  verify/stress/migrations/build NOT_RUN, performance NOT_MEASURED.

### Retain initial sizing evidence and sequence existing P0 — 2026-10-22, PUBLISHED

- `Vovanostm/qa-hooks-selection-autoplay`: coordinator processed two preparation
  messages for existing [#179](https://github.com/Vovanostm/warwrit/issues/179#issuecomment-6330520609).
  Independent critic reports W01 A 18±5 px / C 19±5 px in the initial 1440×900
  frame against wiki D3 80 px; width ratio about 25±8% is less certain.
  Coordinator checked native evaluator Start/seed/viewport → screenshot → later
  Overview ordering, and current D3 text; pixel measurements were not repeated.
  This is inherited sizing debt, not a claimed #267 extraction regression or
  full visual verdict.
- Under delegated sequencing authority, local pipeline overrides put #179 after
  reserved #214 and before inactive #201/playback owners. No source start,
  numerical spacing decision, new mechanic, ownership expansion or acceptance
  waiver. Original catalogue-derived spacing, AC/DoD and full Tier V remain.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records the queue; the issue
  comment was read back exactly after one write. First comparison incorrectly
  stripped its trailing newline; corrected comparison PASS.
- #267 evaluator remains live with the exclusive checks/runtime slot; #272
  waits next for checks, #214 for the next web result. PRs #274 and #280 have
  green snapshot CI but unresolved REWORK, so neither merges. Daily work was
  already complete; no duplicate scout. This tick: 0 merged PRs with playable
  proof. Game tests/typecheck/runtime NOT_RUN, performance NOT_MEASURED.
  No setup/API/wiki/game-rule/protocol/replay/migration contract changed.

### Validate selection extraction after callback discovery repair — 2026-10-22, PUBLISHED

- `Vovanostm/qa-hooks-selection-autoplay`, #267: normal test commit `cc98765f`
  relocates existing production callback regressions with all assertions intact;
  extraction `b2520b1b` is unchanged. Author focused/related 49 tests, normal
  audit and validator 9/9 PASS; real callback hits 10/17 survive ordinary refresh.
  Source scope 159/300. Mounted timing, admission and day/night victory smoke
  are author evidence; independent Tier U retains all unmeasured cases.
- Ordinary main `00117aa1` integration preserves both changelog histories;
  only the changelog conflicted, no source conflict. Coordinator validation at
  `9ccabbd9`: exit 0, all 9 gates PASS, related 49 tests. Fresh Tier U task
  `task_99c8547e4ba0` / `ctx_a1732d6d1a89` is live; no ACCEPT/PR yet. Local proof:
  `.orca/qa-hooks-selection-autoplay/` in its dedicated worktree.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records queue and gates.
  Final component 20/15 remains on #269 AND #262; #268 follows #267.
  #272 preserves original mutation/five-pass/Tier L after merged #282.
  No setup/API/wiki/rule/migration change; full local suites NOT_RUN,
  performance NOT_MEASURED. Fresh source-only PR #274 review allocated at
  `684b7ba3` settled REWORK: stale main-CI evidence risk and tilde-fence
  status-length bypass. Exact settlement/report recorded, ack/release complete;
  source-only review, runtime NOT_RUN. Existing author fixes before fresh gates.
  #267 proof-format clarification uses current server source and existing policy
  regression for unreachable opponent-view browser state; all reachable mounted
  and day/night criteria retained. Local contract appendix records the decision.
  This tick: 0 merged PRs with playable proof.

### Resume retained extraction with real callback coverage — 2026-10-22, PUBLISHED

- `Vovanostm/qa-hooks-selection-autoplay`, #267: retained 159-line extraction
  committed normally at `b2520b1b` after merged callback and Start prerequisites.
  Focused 49 tests, typecheck, scoped lint/format, normal audit and validator
  9/9 PASS. Required normal-refresh callback proof FAIL: only 10 consumer tests
  selected; production applyLatest/endBattle remain uncovered. Runtime, mounted
  lifecycle, day/night and independent Tier U NOT_RUN; stash and patch retained.
- Coordinator allocates the existing second rework round to relocate real
  callback regressions into the changed consumer test boundary with all assertions
  preserved. No production/tool change or proof waiver; original budgets and
  final #269 AND #262 component 20/15 remain. Full local owning report and
  amendment: `.orca/qa-hooks-selection-autoplay/` in the dedicated worktree.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md): #214 complete contract accepted
  and queued behind #267; #282 CI pending, #272 follows it. PR #274 hosted CI
  fails bridge-v5 terminal effects assertion. No setup/API/wiki contract change.
  Full verify/stress/migrations/build NOT_RUN locally; performance NOT_MEASURED.

### Integrate prerequisites before retained selection extraction — 2026-10-22, PUBLISHED

- `Vovanostm/qa-hooks-selection-autoplay`, #267: ordinary main `df540c2c`
  integration preserves both record histories. Source WIP retained in exact
  named stash `b2aeabd0` and local binary patch, unapplied until merge finishes.
  First resume stopped on shared-record conflicts only; no checks/runtime.
  Coordinator resolved those conflicts; budgets and accepted scope unchanged.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records merged #271 proof,
  #284 revalidation/CI, #214 read-only contract and #267 continuation.
  No extraction acceptance/source delivery yet; source checks/browser NOT_RUN
  on this resumed candidate, no setup/API/wiki change, performance NOT_MEASURED.

### Accept selection/autoplay contract and assign build — 2026-10-22, LOCAL

- `Vovanostm/qa-hooks-selection-autoplay`, [#267](https://github.com/Vovanostm/warwrit/issues/267):
  accepted the complete five-section child A contract under the existing #262
  engineering split. Exact native completed task/dispatch/result/report matched,
  recorded before acknowledgment and release; clean source base `61a91600`.
- Sole web builder assigned only CombatLab.tsx and allocated tests; controller.ts
  stays read-only. Preserve guards, synchronous refs and 550 ms / 750 ms timers;
  estimate 175–215 source additions plus removals, hard stop 300. Candidate
  scope/complexity NOT_MEASURED; code and runtime acceptance NOT_RUN.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records builder/scout tasks,
  current dependencies and daily metrics: 10 rolling-day merges, at least 5 with
  recorded play proof; 0 failed worker runs versus 5 previously, no regression
  trigger. #262 and #231 remain open; #268/#269 and #263–#265 retain sequencing.
  This tick has 0 merges; no new rule, migration, deployment or acceptance waiver.
- Documentation diff/format/link checks accompany the normal commit; game tests,
  coverage, validation, typecheck and browser NOT_RUN by coordinator. No wiki,
  setup or API contract changed. Native dispatch and handoff follow this push.

### Merge visible Start and integrate rollback candidate — 2026-10-22, PUBLISHED

- `Vovanostm/core-world-rollback-isolation`: [PR #283](https://github.com/Vovanostm/warwrit/pull/283)
  merged as `df540c2c` at expected `3a97b679`; #271 closed/done. Final-head CI,
  scope and independent Tier U proof PASS; 1 merged PR with playable proof this tick.
  [Contract/verdict/captures](docs/engineering/evidence/uix-editor-primary-start/README.md)
  remain tracked; local proof retained and fully-pushed clean worktree removed.
- Ordinary merge of that main into [PR #284](https://github.com/Vovanostm/warwrit/pull/284)
  preserves both record histories; only CHANGELOG/CURRENT_PLAN conflicted.
  Accepted #282 test source unchanged. Integrated validator at `5b6a3e6a`
  exit 0, all 9 gates PASS; final-head hosted CI pending;
  #272 keeps its own mutation/five-pass/Tier L gates. #267 WIP/budgets preserved;
  bounded resume task `task_93e6f5312ecf` is live after both prerequisites merged.
  #214 technical ownership ordering moves before inactive #198/#212; dedicated
  read-only retained-contract refresh `task_cfa9df48704d`, no source/runtime.
  Full original issue proof and visual rubric remain; builder waits #267.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records the continuation.
  No setup/API/wiki change; full suites NOT_RUN locally, performance NOT_MEASURED.

### Publish independently reviewed rollback isolation — 2026-10-22, PUBLISHED

- `Vovanostm/core-world-rollback-isolation`, #282: test-only disposable database
  isolates destructive rollback from ordinary concurrent identity/encounter
  writers. Preserve writer/down blocking, SQLSTATE 55000, exact route/receipt
  identities, complete retained clocks and migration/fresh-install assertions.
  Source `961ff8e3` / `2557e2df`; integrated frozen head `d553215b`.
- Fresh Tier D reviewer ACCEPT based on source and retained native evidence;
  reviewer tests/runtime NOT_RUN. Author baseline identifies 0011 DROP versus
  encounter INSERT lock cycle; five ordinary parallel eight-file runs each
  PASS 60/60, zero skips; two deliberate lifecycle failures clean up. Normal
  commits/audits PASS. Coordinator validate exit 0, 9/9 PASS; related tests
  3 PASS/11 SKIP without DB URLs are not database acceptance.
- [Contract, author report and independent verdict](docs/engineering/evidence/core-world-rollback-isolation/README.md)
  accompany publication. Later commits only evidence/coordinator records;
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records hosted-CI/merge gates.
  No merge or player-feature delivery claimed; 0 merged PRs with playable proof
  this tick. #272 retains separate mutation/Tier L gates after #282; #271 waits
  PR #283 CI; #267 WIP/budgets preserved; no duplicate daily work.
- No production/auth/rule/replay/schema/released migration/setup/API change;
  existing wiki contracts unchanged. Full verify/stress/migrations/browser
  NOT_RUN here; performance NOT_MEASURED. Raw native logs remain local in the
  slice worktree under `.orca/core-world-rollback-isolation/`.

### Validate rollback DB isolation and dispatch fresh review — 2026-10-22, PUBLISHED

- `Vovanostm/core-world-rollback-isolation`, [#282](https://github.com/Vovanostm/warwrit/issues/282):
  source commits `961ff8e3` / `2557e2df` extract rollback phases and isolate
  destructive test DDL in one disposable database. Only the owned world-route
  integration test changes; production/auth/released migrations stay unchanged.
  Native baseline identifies 0011 FK-table DROP versus encounter-command INSERT.
- Builder evidence: focused real DB checks, two intentional failure-cleanup
  probes, typecheck/format and both normal audits PASS; five consecutive
  default-parallel eight-file runs each 60/60 PASS, zero skips, combined proof
  `d118029f`. Native URL readback retains shared primary OIDC/company/encounter
  and separate FIRST HUNT; all owned DB/client/container/volume/network cleanup
  recorded. Author evidence does not substitute for the fresh reviewer.
- Ordinary main integration `d553215b` preserves both changelog histories;
  no source conflict. Coordinator validator exit 0, 9/9 PASS, scope 0 non-test
  source lines. Related tests: 3 PASS / 11 SKIP without DB URLs, explicitly
  separate from the builder's actual database runs. Fresh Tier D reviewer
  `task_3458072eeedf` is live on that frozen head; no verdict or PR yet.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records the exact handoff,
  pending #283 final CI, preserved #267 WIP and independent #272 mutation/Tier L
  gates. Local contract/report/proof: `.orca/core-world-rollback-isolation/`
  in the dedicated worktree. Source and records published for continuation;
  no #282 merge or player-feature completion claimed, 0 merges this tick.
  Full verify/stress/migration suite/build/browser NOT_RUN for this Tier D;
  test-helper complexity and performance NOT_MEASURED. No API/setup/wiki change.

### Integrate current main for rollback isolation gates — 2026-10-22, LOCAL

- `Vovanostm/core-world-rollback-isolation`, #282: ordinary merge of main
  `fc5d642d` retains both changelog histories; only the changelog conflicted.
  Accepted source commits `961ff8e3` and `2557e2df` are unchanged.
  Coordinator validation and fresh Tier D review remain pending.

### Accept rollback-isolation contract and preserve runtime ownership — 2026-10-22, PUBLISHED

- `Vovanostm/core-world-rollback-isolation`, [#282](https://github.com/Vovanostm/warwrit/issues/282):
  coordinator accepted the complete read-only contract after exact native
  Task/Dispatch/result readback. Shared destructive-DDL exposure is traced;
  the actual deadlock cycle remains unproven. Local contract is
  core-world-rollback-isolation/.orca/core-world-rollback-isolation/contract.md.
- Proposed change owns only world/routes.integration.test.ts: isolate the
  destructive rollback case, preserve all receipt/clock/locking assertions,
  capture native deadlock diagnosis and require five real parallel passes.
  Source implementation and all new game/DB/validator checks NOT_RUN.
  #282 remains planning until live #271 evaluator releases the checks/runtime
  slot; #272 retains `37f35c6b`, its five-pass requirement and Tier L gates.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records continuation,
  preserved #267 WIP/budget and broader visual discovery on existing
  #179/#201/#188/#189 without adding #271 conditions. Contract worker settled,
  recorded before acknowledgment and released (no owned resource).
  Records only are published; no source, API/setup/wiki contract or migration
  change. No PR/merge; 0 merged PRs with playable proof this tick.
  Daily work already complete and not repeated; visual acceptance unclaimed.

### Revalidate visible Start against current main — 2026-10-22, PUBLISHED

- `Vovanostm/codex-uix-start-action-271`, [PR #283](https://github.com/Vovanostm/warwrit/pull/283):
  ordinary merge of current main `fc5d642d`; changelog-only conflict resolved
  retaining both histories. No source conflict or change to accepted UI code
  `f98040f9`; later changes are evidence, records and the main merge.
- Coordinator revalidation at integrated `98cbb077`: exit 0, 9/9 PASS,
  nine related tests PASS. Scope remains 36 source lines, excluding tests.
  Tier U ACCEPT and independent played proof remain valid for unchanged code.
  Final hosted CI and expected-head merge remain pending; 0 merges this tick.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records #282's clean author
  commits and pending independent Tier D review, #272's separate acceptance,
  and retained #267 WIP. Attributed agent scope expansion is recorded locally
  as unverified authority; no new milestone activated. No API/setup/wiki change.
  Full verify/stress/migrations/build NOT_RUN locally; performance NOT_MEASURED.

### Integrate current merge authority before Start delivery — 2026-10-22, LOCAL

- `Vovanostm/codex-uix-start-action-271`, [PR #283](https://github.com/Vovanostm/warwrit/pull/283):
  merge current main `fc5d642d` by ordinary merge before the expected-head gate.
  Preserve both changelog histories; only the changelog needed conflict resolution.
  No source conflict or change to accepted `f98040f9` UI behavior.
  Revalidation and hosted CI for the integrated candidate remain pending.

### Publish first-viewport combat Start proof — 2026-10-22, PUBLISHED

- `Vovanostm/codex-uix-start-action-271`, #271: the existing Start action and
  readiness/error feedback now precede the editor. Frozen source `f98040f9`,
  36 source additions plus removals excluding tests; launch/reset guards retained.
- Independent Tier U ACCEPT: real round-8 mill and round-10 deserter victories,
  first viewport/default/preset/result return, actual draft/request equality,
  keyboard focus/Enter, invalid and duplicate-pending guards; 1440 × 900 day/night,
  bounded 1366 × 768 fit. Runtime/browser cleanup positively confirmed.
  [Contract, full verdict and evaluator captures](docs/engineering/evidence/uix-editor-primary-start/README.md).
- Coordinator validator exit 0, 9/9 PASS, nine related tests PASS; normal audit
  PASS with five inherited findings retained. No duplicate test rerun this tick.
  Hosted CI and merge pending after publication; 0 merged PRs with playable proof so far.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records sole core/check-slot
  handoff to #282 and preserved #272/#267 dependencies. Full verify/stress/migrations/
  production build NOT_RUN locally; performance NOT_MEASURED. Full scene/art/M1
  acceptance unclaimed. No API/setup/wiki/rule/protocol/replay/renderer change.

### Validate visible editor Start and schedule independent proof — 2026-10-22, PUBLISHED

- `Vovanostm/codex-uix-start-action-271`, [#271](https://github.com/Vovanostm/warwrit/issues/271):
  source `f98040f9` moves the single existing Start/reset/feedback group before
  the long editor, retaining guards, current draft and transport. Guarded ready
  feedback, normal-flow spacing and keyboard focus address first-screen
  discoverability. Only two editor functions, guard assertions and action CSS;
  36 source additions plus removals. No mobile layout or new game rule.
- Coordinator validator exit 0, all 9 gates PASS, 9 related tests PASS, scope 36.
  Normal commit/audit PASS; 5 inherited findings and styling advisories retained.
  Full builder contract/report and clean commit matched exact native settlement
  before acknowledgment and release (no owned resource). Builder default/preset/
  result-return, actual payload, pending/invalid, keyboard and day/night journeys
  are local author evidence; independent Tier U acceptance remains pending.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records evaluator
  `task_b9107798fb76`, frozen source and the serial resource handoff: #272 gets
  exclusive checks/DB while #271 evaluator reads source; its browser permit
  follows exact #272 settlement and cleanup. Contract/report/shots remain local
  under `.orca/codex-uix-start-action-271/` in the dedicated worktree.
  Source and records are published for continuation; PR/merge NOT_RUN and
  0 merged PRs with playable proof this tick. #267 WIP/budgets preserved;
  #269/#262 final 20/15 limits remain. Daily work already complete.
- No protocol, replay, renderer, migration, dependency, setup or API change;
  existing wiki contracts unchanged. Full verify/stress/migrations/build NOT_RUN;
  performance NOT_MEASURED. No independent player acceptance claimed.

### Merge session callbacks and assign visible editor Start — 2026-10-22, PUBLISHED

- `Vovanostm/codex-uix-start-action-271` records the pipeline tick and the
  accepted #271 contract assignment after merging [PR #281](https://github.com/Vovanostm/warwrit/pull/281).
  #273 is MERGED as `857b0491` at expected head `c872eab4`, closed/done.
  Tier U ACCEPT, coordinator validate exit 0 (9/9 PASS), source scope 137,
  final-head clean-checkout CI and PR scope PASS; later commits were evidence
  and shared records only. No unresolved review or blocked label at merge.
- [Owning contract, verdict and played day/night proof](docs/engineering/evidence/qa-hooks-session-callbacks/README.md)
  remain tracked. Local evidence retained; clean fully-pushed worktree removed.
  This tick delivered 1 merged PR with playable proof; it preserves behavior
  and does not claim a new player feature or full-M1 acceptance.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) names #271's bounded sole web
  builder task and P0 #272's disjoint core contract reservation. #271 starts
  from merged main; #272 source/DB work awaits accepted contract and resource
  handoff. #267 staged WIP/budgets and #269 AND #262 final gate are preserved.
  Both implementations and their independent gates remain pending.
- Documentation closeout: ordinary scoped diff, formatting and tracked links
  checked; no setup/API/wiki contract change. No repeated game suite for this
  records-only commit; full verify/stress/migrations/build NOT_RUN locally,
  performance NOT_MEASURED. Daily work is already complete, not duplicated.
  No rules, replay, protocol, renderer, dependency or migration change.

### Owner merge gate removed — 2026-10-21, PUBLISHED

- `claude/owner-gate-off`: owner decision «Давай дальше без моих разрешений - добавь в разрешённые работу с github, работу с pr». AGENTS.md hard rule 1,
  warwrit-orca, warwrit-delivery, AGENT_TEAM and the `.codex/rules` header now
  let every PR merge on gates (green CI with `PR scope`, expected head SHA,
  independent reviewer ACCEPT for infrastructure PRs) without an owner message.
  Auto-merge, admin merge, force-push, deployment and paid services unchanged.

### Publish accepted session callback prerequisite — 2026-10-22, PUBLISHED

- `Vovanostm/qa-hooks-session-callbacks`, [PR #281](https://github.com/Vovanostm/warwrit/pull/281),
  closes only #273 after its gates. Independent Tier U ACCEPT for frozen
  `a6b35143`: 48 focused tests PASS, actual day/night mill victories at 1440×900,
  and session/transport/disabled/keyboard guards. Existing callbacks and player
  behavior preserved; 137 source additions plus removals, tests excluded.
- Coordinator validator exit 0, 9/9 PASS, 75 related tests PASS; scope 137 PASS.
  Normal changed-code audit PASS with five inherited findings retained.
  Exact native evaluator task/dispatch/result/full verdict matched, recorded
  before acknowledgment and release (no owned resource).
- [Owning contract, independent verdict and ten JPEGs](docs/engineering/evidence/qa-hooks-session-callbacks/README.md)
  now tracked; later commits change only evidence and coordinator records.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records publication and
  remaining hosted-CI/exact-head/blocked-label gates. Merge NOT_RUN; 0 merged
  PRs with playable proof this tick. #271 remains next after this merge; #267
  staged WIP/budgets preserved. #269 AND #262 final component limits remain;
  #263/#231 stay open. Daily work already complete, not repeated.
- Independent opponent-pause/root-unmount proof NOT_RUN; full limitations in
  verdict. Full verify/stress/migrations/build NOT_RUN locally; performance
  NOT_MEASURED. No rule, protocol, replay, renderer, dependency, migration,
  setup or API behavior change; existing wiki contracts unchanged.

### Validate finite session callbacks and hand off Tier U — 2026-10-22, PUBLISHED

- `Vovanostm/qa-hooks-session-callbacks`, [#273](https://github.com/Vovanostm/warwrit/issues/273):
  expose existing `applyLatest`/`endBattle` through finite typed ports for real
  production-callback tests before #267. Preserve ref ownership, DELETE/restart
  ordering, notices, retry/poll/autoplay and player controls. Normal source
  commit `a6b35143`: three owned source/test paths, 137 changed source lines.
- Coordinator validator exit 0, 9/9 PASS: ancestry, clean tree, scope, package
  builds, typecheck, format, lint, 75 related tests and ordinary audit. Builder
  also reports 48 focused tests and day/night mill victory; independent Tier U
  acceptance is pending on task `task_840ad97b96c0`, frozen source `a6b35143`.
  Exact native builder settlement and structured result matched the full local
  contract/report before acknowledgment and release (no owned resource).
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records the playable journey,
  evaluator handoff and sequence. Local contract/report and validator logs stay
  in the dedicated worktree under `.orca/`; source and records are published
  for continuation. PR/merge NOT_RUN; this tick has 0 merged PRs with playable
  proof. #271 follows this merge; #267 WIP/budgets and #231 acceptance remain.
  Final CombatLab 20/15 gate stays on #269 AND #262; no waiver or duplicate daily work.
- Full verify/stress/migrations/production build NOT_RUN; performance NOT_MEASURED.
  No migration, rule, replay, protocol, renderer, dependency, setup or API change;
  wiki contracts are unchanged. The branch is published; independent player
  acceptance and full M1 delivery remain unclaimed.

### Publish accepted editor extraction — 2026-10-21, PUBLISHED

- `Vovanostm/qa-hooks-editor`, [#261](https://github.com/Vovanostm/warwrit/issues/261),
  finite R1 child of #231: independent Tier U ACCEPT for frozen `4523f609`.
  Editor/validation/start/reset and feedback priority remain unchanged after
  the bounded extraction; four owned source/test files, 182 source lines.
- Evaluator independently played invalid/reset/start once/day/night/return/reset
  at 1440×900 and ran 42 focused tests PASS. Favicon 404 matches main baseline;
  no introduced console/page error or visual regression found. Coordinator
  validator exit 0, 9/9 PASS, 64 related tests PASS. Exact native settlement,
  result and full verdict matched, recorded, acknowledged and released.
- [Owning contract, verdict and JPEG proof](docs/engineering/evidence/qa-hooks-editor/README.md)
  retained on the PR branch; later commits contain only evidence/shared records.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records review → PR and the
  remaining exact-head CI/scope/blocked-label/merge gates. Hosted CI and merge
  pending; this tick has 0 merged PRs with playable proof. #231 stays open and
  #262–#265 preserve sequencing. No duplicate daily scout/digest.
- Local full verify/stress/migrations/build NOT_RUN; performance NOT_MEASURED.
  No rule, protocol, replay, renderer, dependency, migration or deployment change.
  No wiki/setup/API behavior contract changed; no full-M1 acceptance claim.

### Validate editor extraction and dispatch Tier U — 2026-10-21, PUBLISHED

- `Vovanostm/qa-hooks-editor`, [#261](https://github.com/Vovanostm/warwrit/issues/261):
  behavior-preserving editor/start/reset/validation and feedback-reason extraction
  committed normally as `4523f609`; four owned files, 182 changed source lines.
  Focused builder tests 42 PASS; coordinator validator exit 0, 9/9 gates PASS,
  64 related tests PASS, clean tree and scope PASS. No audit thresholds changed.
- Builder performed invalid/reset/start/return and 1440×900 day/night mill smoke;
  favicon 404 is explicit, independent baseline classification remains pending.
  Exact native task/dispatch/result/report recorded before acknowledgment and
  release (no owned resource). #261 advances to review; fresh Tier U evaluator
  `task_4e10f35af809` / `ctx_b7066392e440` is live on frozen `4523f609`.
- Source WIP and coordinator-only records are pushed for continuation; no PR,
  independent ACCEPT or merge yet. [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md)
  names the next gate and retains prior dispatch history. #231 remains open;
  #262–#265 preserve sequencing. Daily work already complete, no duplicate scout.
  This tick: 0 merged PRs with playable proof. Full verify/stress/migrations/build
  NOT_RUN; performance NOT_MEASURED. No rule, protocol, replay, migration,
  deployment or full-M1 claim. No wiki/setup/API behavior contract changed.

### Start bounded editor extraction — 2026-10-21, PUBLISHED

- `Vovanostm/qa-game-hooks`: coordinator records the accepted five-section
  [#261](https://github.com/Vovanostm/warwrit/issues/261) R1 contract and
  planning → implementing transition in the dedicated `qa-hooks-editor` worktree.
  Estimated 220–275 source lines include removals; actual scope remains pending.
  One web builder owns only CombatLab/controller editor/reason extraction and
  matching tests, preserving behavior, feedback priority and normal audit.
- Exact native contract settlement/result matched, recorded before acknowledgment,
  then released (no owned resource). #231 stays open; #262–#265 retain sequencing.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) names the active builder and
  next validation/Tier U gate. Shared records are the only changes on this branch.
- Contract/clean-base/ownership checks passed; documentation format/link/diff
  checks accompany this commit. Implementation/game tests/audit/typecheck/browser
  checks NOT_RUN by coordinator; no playable acceptance or merge this tick.
  Daily scout/digest already complete. No migration, deployment or rule change.

### Split QA hooks into bounded delivery slices — 2026-10-21, PUBLISHED

- `Vovanostm/qa-game-hooks`: coordinator accepted the five-section #231
  contract and created #261–#265 under the owner engineering delegation.
  Preserve original #231 acceptance; the parent stays open until all child
  proof, including actual paced playback after #190, passes. No rule change.
- Dedicated #261 worktree starts only the read-only editor/reason extraction
  contract. Other children are sequenced to preserve one web writer; actual
  source scope must be measured before widening. Evaluator runner adaptation
  is local only; installed skill and #190 source ownership remain intact.
- Original worker result/native settlement recorded before acknowledgment and
  release. This entry and [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md)
  are coordinator records only; implementation/gameplay/typecheck/production
  checks NOT_RUN, performance NOT_MEASURED. Documentation format/link/diff
  checks accompany the normal commit. This tick: 0 merged PRs with playable
  proof. No migration, deployment, acceptance waiver or full-M1 claim.

### Deliver affordability bands and prepare QA hooks — 2026-10-21

- `codex/combat-affordability-184`, [PR260](https://github.com/Vovanostm/warwrit/pull/260),
  MERGED as `b9dc49fc` at expected `c3772f98`: server-derived solid/hatch bands
  and honest legend delivered for #184. Tier V evaluator/visual ACCEPT,
  every applicable score 2; integrated validator 9/9, 48 tests, scope 272;
  hosted CI `39633442903` and scope `39633442871` SUCCESS. Issue closed/done;
  native evidence retained before worktree removal. Earlier pending entries
  are superseded. [Proof and limits](docs/engineering/evidence/uix-affordability-bands/README.md).
- `Vovanostm/qa-game-hooks`, PUBLISHED: coordinator records delivery and starts
  the dedicated read-only #231 contract from actual merged main, following owner priority.
  No hook implementation or new gameplay verification yet (NOT_RUN).
  Exact post-gate diff passed after narrowing an overly broad assertion that
  included the incoming-main lab README; accepted source/tests stayed unchanged.
  [Current queue](docs/engineering/CURRENT_PLAN.md). No migration or deployment.

### Publish accepted affordability bands — 2026-10-21, PUBLISHED

- `codex/combat-affordability-184`, [#184](https://github.com/Vovanostm/warwrit/issues/184):
  fresh Tier V evaluator and absolute visual ACCEPT for `f589f94c`; every
  applicable visual criterion scores 2. B1 actual silhouette/annotation
  intersection is established by eight stable level/0→1→2 on/off pairs.
  Mill manual move/attack/turn and round 11 victory, viewport/native125/CVD
  proof and earlier failed attempts retain their stated boundaries.
- Main `19d2c296` integrated through normal merge `e0c77057`; only shared status
  documents conflicted, both histories preserved. Normal merge audit PASS;
  coordinator integrated validator exit 0, 9/9 PASS, 48 related tests,
  source scope 272. Accepted web game source/tests unchanged after the gates.
  Evidence commits `39f8c0b2`/`dacbb47b` and this shared-record receipt add no
  game code. [Proof, scored review and JPEGs](docs/engineering/evidence/uix-affordability-bands/README.md).
- Publish one PR closing only #184; final hosted CI and merge remain pending.
  PR259/#249 delivered this tick; #249 closed/done and #218 closed with the
  original decision/implementation links. Finished worktree removed after
  native proof retention and clean/no-unpushed checks. One merged PR with
  playable proof; [live queue](docs/engineering/CURRENT_PLAN.md).
  No deployment, new rule, balance/performance measurement or full-M1 claim.

### Accept affordability evidence and integrate delivered bow — 2026-10-21, LOCAL

- `codex/combat-affordability-184`, #184: independent Tier V evaluator and
  absolute visual critic ACCEPT frozen `f589f94c`; every applicable visual score
  is 2. Supported level/0→1→2 crowds establish actual B1 silhouette/annotation
  intersections with eight verified on/off pairs. Actual mill manual input and
  round 11 victory, viewport/native125/CVD proof and limits are retained in
  [evidence](docs/engineering/evidence/uix-affordability-bands/README.md).
- Evidence-only commit `39f8c0b2` follows shared-record receipts. Integrate merged
  PR259 main `19d2c296` by ordinary merge; only CHANGELOG/CURRENT_PLAN conflicted,
  both histories retained. Incoming main contains the delivered persistent bow;
  accepted #184 game source/tests are unchanged. Normal integrated validator
  and hosted CI are pending; no publication, merge or acceptance waiver here.

### Deliver persistent bow and reconcile the pipeline — 2026-10-21, PUBLISHED

- `codex/combat-affordability-184`: coordinator status-only receipt for
  [PR259](https://github.com/Vovanostm/warwrit/pull/259), #249, now MERGED as
  `19d2c296` from expected head `00c8bbcb`. Final hosted clean-checkout CI
  `39627369734` and PR scope SUCCESS; integrated validator 9/9 PASS,
  671 PASS / 52 SKIP, 239 source lines. Independent Tier L review and playable
  ACCEPT retain their exact gated head and fixture limits. The earlier pending
  entries remain history. No new game check or source change in this receipt.
- #249 is closed/done; decision #218 is closed with the original B decision,
  wiki/CHANGELOG record and separate implementation links. Native evidence is
  retained in coordinator `.orca/pipeline/retained/core-bow-three-ap/`.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records one merged PR with
  playable proof this tick and the still-live #184 Tier V gates. Shared records
  are the only changed paths; accepted game source is frozen. #231 and other
  slices keep their prerequisites; no new milestone or deployment.
- Local bookkeeping assertion compared incompatible ranges and failed; a shell
  command continued to the already-authorized expected-head merge. Corrected
  direct main-parent source equality and evidence/records-only range checks
  PASS, and native GitHub readback confirms the expected merge and closed #249.
  No failed assertion is treated as a pass; all merge gates had passed separately.

### Dispatch fresh affordability gates and settle daily scout — 2026-10-21, PUBLISHED

- `codex/combat-affordability-184`, [#184](https://github.com/Vovanostm/warwrit/issues/184):
  integrated validator `74ea6cc3` passed 9/9, 48 tests, scope 272. Fresh Tier V
  evaluator `task_de4f4b0e9d20` and absolute visual critic `task_e8ed7898463d`
  dispatched on `f589f94c`; B1 evidence remains pending. This receipt changes
  only CHANGELOG/CURRENT_PLAN, preserving the frozen game source and all gates.
- Daily scout completed actual pinned-main `46fe0c33` mill and deserter preset
  journeys with day/night screenshots, both round 7 victories. No new finding
  outside 54 open issues; no new issue created. Report/result/native settlement
  read, recorded/acknowledged/released; browser/runtime cleanup recorded.
  Local timing samples overlap coordinator validation and are not accepted
  performance/capacity measurements. Private proof remains in coordinator
  `.orca/scout/2026-10-21/`; no duplicate report added.
- [PR259](https://github.com/Vovanostm/warwrit/pull/259) remains open at `00c8bbcb`,
  PR scope SUCCESS and final clean-checkout CI running. Merge NOT_RUN;
  0 merged PRs with playable proof this tick. [Current checkpoint](docs/engineering/CURRENT_PLAN.md).
  No migration, deployment, balance or full-M1 acceptance claim.

### Validate affordability evidence continuation — 2026-10-21, PUBLISHED

- `codex/combat-affordability-184`, [#184](https://github.com/Vovanostm/warwrit/issues/184):
  integrate actual main `46fe0c33` as `74ea6cc3`. Only CHANGELOG/CURRENT_PLAN
  conflict; both histories preserved. Source `5599c8f1` is unchanged, scope 272.
  Normal main-based coordinator validator exit 0, 9/9 PASS; fresh Tier V
  evaluator and absolute visual critic are next for the bounded B1 proof attempt.
- Preserve two failed default merge audits (17 CRAP findings): the normal hook
  refreshed only staged incoming-main coverage, omitting retained branch code.
  Manual focused coverage 21 PASS did not repair the hook's next overwrite.
  Normal incoming-main audit against branch parent HEAD PASS; subsequent normal
  validator against origin/main refreshes and audits the complete slice, PASS.
  No hook, threshold, assertion, source or accepted rule was weakened.
- [PR259](https://github.com/Vovanostm/warwrit/pull/259) for #249 is open at
  `00c8bbcb`, fresh Tier L ACCEPT retained; final hosted full CI/merge pending.
  Daily scout plays pinned main; performance during local validation overlap
  is NOT_MEASURED for acceptance. [Current checkpoint](docs/engineering/CURRENT_PLAN.md).
  #184 visual acceptance/CI remain pending; #231 waits. No migration/deployment
  or full-M1 claim. This tick: 0 merged PRs with playable proof.

### Resume affordability evidence under owner delegation — 2026-10-21, PUBLISHED

- `codex/combat-affordability-184`, [#184](https://github.com/Vovanostm/warwrit/issues/184):
  coordinator applies the owner's 2026-10-21 evidence/process delegation to the
  existing B1 question. Retain source `5599c8f1`; resume validation, then one
  bounded read-only supported-layout evidence attempt. No third source rework,
  acceptance waiver, rule or rendering change.
- Current-source validation and fresh Tier V gates remain NOT_RUN; the actual
  silhouette/annotation intersection remains unproven. Earlier gate results
  apply only to `06479a47`. Heavy work queues behind the live #249 evaluator and
  daily main scout. This documentation-only update needs no game tests.
  [Current queue and limits](docs/engineering/CURRENT_PLAN.md).

### Preserve final affordability rework and evidence blocker — 2026-10-21, PUBLISHED

- `codex/combat-affordability-184`, issue #184: rework 2 changes the existing
  terrain-clipped hatch shader to projected-width-capped broken ink with dark
  support. Source `5599c8f1`, report `9e47fd82`; renderer and existing hex-mesh
  regression only. Server classification, costs, replay and layering unchanged.
- Builder reports 21 focused coverage tests, web types, scoped lint/format and
  normal audit PASS; 272 source lines, 71 fresh captures and 12 overlay pairs.
  B1 actual silhouette/annotation intersection in the required level/height-step
  crowd remains unproven. No body-crossing defect is established. Current-source
  coordinator validation and fresh evaluator/visual gates: NOT_RUN.
- Budget 2/2 exhausted; fallback steps 1–3 do not apply to this non-audit,
  one-issue proof gap. Move to needs-owner with a recommended single bounded
  evidence-only evaluator attempt, preserving every acceptance criterion.
  Prior `06479a47` evaluator ACCEPT and visual REWORK are retained history.
  Owning local report: `.orca/uix-affordability-bands/report.md`.
  [Checkpoint](docs/engineering/CURRENT_PLAN.md). No PR, merge or deployment.

### Integrate accepted JOIN and affordability rework — 2026-10-21, LOCAL

- `codex/combat-affordability-184`: ordinary merge of actual main `0adcff2e`
  retains both document histories. [PR255](https://github.com/Vovanostm/warwrit/pull/255)
  is MERGED on 2026-10-21 after CI 39588879033 SUCCESS at `9857d0fa`, fresh
  Tier L gates and validator 9/9 PASS; issue #254 is closed/done. Earlier
  pending/failure entries remain dated history. [JOIN readback](docs/engineering/evidence/join-lock-order-254/README.md).
- #184 source `25a432f8` addresses evaluator F1 in renderer `battle-cell-grid.ts`:
  wider separated achromatic hatches preserve clipping and server classification.
  Builder: 21 focused coverage tests, types/lint/format/normal audit PASS and
  65 current captures. Coordinator validator 9/9 PASS before JOIN integration;
  union validation and fresh Tier V gates remain pending. No visual acceptance,
  #184 publication, migration or deployment claimed. Local report:
  `.orca/uix-affordability-bands/report.md`.

### Correct affordability hatch terrain geometry — 2026-10-21, LOCAL

- `codex/combat-affordability-184`: correct independently reproduced short-chord
  escape/reversal and terrain-height mismatch in `battle-cell-grid.ts`. Clip each
  finite strip to the actual fill triangles and lift each fragment by0.013.
  Existing hex-mesh regression covers translated/raised cells and seam centroids.
  Independent source ACCEPT; focused coverage21/21PASS, web types, format, scoped
  lint, normal audit and diff check PASS. Earlier attempts remain in local
  `.orca/affordability184/correction-checks-2026-10-21.log`; browser/visual acceptance
  pending. [Behavior](docs/wiki/battlefield-test-maps.md).

### Correct movement hatch geometry before acceptance — 2026-10-21, LOCAL / REWORK

- `codex/combat-affordability-184`: independent source scan reproduces escaping
  short strokes and height disagreement with the default stepped surface in
  source49548eb4. The author is correcting clipping/terrain conformance without
  changing costs or canonical geometry. Rendered severity NOT_MEASURED; review
  and visual acceptance remain pending. Earlier author checks are not geometry
  acceptance. DB7 owns the runtime window; correction checks wait for release.

### Deliver canonical pickup targets — 2026-10-21, MERGED

- `codex/representative-hunt-recovery`, [PR251](https://github.com/Vovanostm/warwrit/pull/251)
  merged7b9a1dca; reviewed/tested/main contents match. CI39515766544 SUCCESS:
  937unitPASS/50SKIP,10000stress,17realPG/auth,migrations,coverage/audit.
  Independent source and recovered-save runtime ACCEPT; no impossible targets
  offered, original failed DB6 preserved. Separate DB7 payment/restart follows;
  broader174/177 remain partial. [Record](docs/engineering/evidence/persistent-hud/main-readback.md).

### Distinguish movement affordability — 2026-10-21, LOCAL

- `codex/combat-affordability-184`: solid move+attack and hatched movement-only
  cells use supplied server booleans; incomplete legacy rows use one generic
  band. Legend shows present categories; retain187 reach and other marker cues.
  Initial fixture/hatch test failures corrected; hatch geometry extracted after
  the first audit found introduced complexity. Final focused coverage20/20,
  web typecheck, format, scoped TS/TSX lint and `check:changes` pass. Independent
  gameplay/visual review and publication remain pending.
  [Owning behavior](docs/wiki/battlefield-test-maps.md#movement-affordability-bands--2026-10-21-local).

### Publish persistent bow successor — 2026-10-21, PUBLISHED

- `codex/bow-three-ap-249`, [PR259](https://github.com/Vovanostm/warwrit/pull/259):
  retain fresh source/playable Tier L ACCEPT for `63ce897e`, small day/night
  JPEGs and full reports. Main merge `16cedf56` changes no accepted game source;
  evidence-only `9134029e` and coordinator records preserve the gate boundary.
  Integrated validator 9/9 PASS, 671 PASS / 52 SKIP, scope 239; PR scope SUCCESS.
  Final hosted clean-checkout CI remains pending; merge NOT_RUN.
- #184 integrated main as `74ea6cc3`, status-only conflicts preserved. Two merge
  audits failed because staged incoming-main coverage omitted retained branch
  code; 21 focused tests PASS. Normal incoming-main audit against branch parent
  PASS; normal main-based slice validator is running, with no weakened hook.
  Fresh Tier V proof remains pending. [Current checkpoint](docs/engineering/CURRENT_PLAN.md).
  No migration, deployment, balance measurement or full-M1 claim.

### Accept persistent bow journey and integrate pipeline main — 2026-10-21, LOCAL

- `codex/bow-three-ap-249`, [#249](https://github.com/Vovanostm/warwrit/issues/249):
  independent source and playable Tier L ACCEPT at `63ce897e`. Real rendered
  day/night 4 → 3 → 0 AP, 16-stamina shot, atomic 2 AP refusal, V5 process
  restart/retry, genuine old-active V4 continuation and supported terminal
  settlement/proof/idempotency pass. Finite evaluator checks: 61 PASS; earlier
  failures and synthetic pre-admission fixture limits remain recorded.
- Integrate actual main `46fe0c33` as `16cedf56`; only CHANGELOG conflicted,
  both histories retained, accepted game source/tests unchanged. Integrated
  coordinator validator exit 0, 9/9 PASS, 671 PASS / 52 SKIP; source scope 239.
  Normal merge audit PASS. [Proof](docs/engineering/evidence/core-bow-three-ap/README.md)
  is being retained with review/evaluation and small day/night JPEGs.
- Publish one PR for #249 next; hosted full clean-checkout gate and merge are
  pending. #184 remains validating after evidence/process delegation; fresh
  Tier V gates required. No migration, deployment, new rule, balance measurement
  or full-M1 claim. [Current checkpoint](docs/engineering/CURRENT_PLAN.md).

### Self-driving Orca backlog — 2026-10-21, PUBLISHED

- `claude/orca-self-driving`: owner request «Продолжай. Обнови задачи, настрой
  автоматизацию - необходимо чтобы проект разрабатывался и улучшался,
  оптимизировался!».
- warwrit-orca: lane refill from epic #217, sprint #161 and P-labelled issues;
  large issues split into child issues; owner delegation for evidence/process
  questions and a `needs-owner` recheck; daily metrics with a `pipeline` issue
  on a two-day regression; daily scout (`prompts/scout.md`) that plays main and
  files at most three findings.
- `orca-pipeline-tick.sh --loop` restarts on a newer script and polls every 10
  minutes; the digest includes the date so a new day wakes one tick.
- Rationale and sources: [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#pipeline-evidence-review--2026-10-21).
  Checks: `bash -n`, Prettier. Effect on throughput NOT_MEASURED.

### Validate the persistent bow fixture repair — 2026-10-21, PUBLISHED

- `codex/bow-three-ap-249`, [#249](https://github.com/Vovanostm/warwrit/issues/249):
  round 2 normally commits the explicit wolf revision read and valid bow-leader
  preparation through the public CreateCompany opening producer (`5d87f0e1`),
  then the report (`482f8daa`). The synthetic sword fixture lacked archery
  aptitude; no production guard, rule or assertion was weakened. Add native
  supported-terminal completion/proof/exact-retry assertions. Earlier failures
  remain recorded in the slice report and logs.
- Author isolated PostgreSQL regression 1 PASS / 23 filtered SKIP, related
  current-source coverage 689 PASS / 34 SKIP and normal commit audit PASS.
  Coordinator validator at clean `482f8daa`: exit 0, 9/9 PASS, 671 PASS / 52 SKIP;
  scope 239 source lines. Coordinator PG NOT_RUN; fresh independent evaluator
  owns its disposable database and complete persistent rendered/refusal/terminal
  acceptance. Source reviewer and evaluator round 2 are live; no ACCEPT yet.
- Update [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) and local dispatch
  checkpoint; publish retained commits and records. No new source change in this
  records commit. Full integrated gate/hosted CI/PR/merge remain pending;
  no migration, deployment, balance or full-M1 claim. #184/#231 remain gated.

### Recover persistent bow terminal proof — 2026-10-21, PUBLISHED

- `codex/bow-three-ap-249`, [#249](https://github.com/Vovanostm/warwrit/issues/249):
  round 1 worker failed; preserve staged explicit wolf GET/success test fix and
  report. Both JOINs now succeed; two isolated-PG runs reach move/shot/replay/retry,
  then fail at `apps/server/src/encounters/terminal-evidence.ts:149`. Fixture
  versus production cause remains unestablished; supported terminal proof is open.
- Author server typecheck/lint PASS; normal commit refused after refreshed
  coverage (93 audit findings / 5 clone groups). Earlier audit PASS does not
  supersede this failure. Allocate ordinary round 2 of 2 to root-cause repair
  and legitimate related current-source coverage with isolated PG available to
  the normal hook; no guard, assertion, audit or scope waiver.
- Update [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md); coordinator commits
  only shared records, leaving both staged worker files for the sole successor.
  Scoped formatting/diff/readback checks; coordinator game checks NOT_RUN.
  Fresh validate/Tier L/CI/PR/merge remain pending; no new rule or deployment.

### Consolidate persistent bow gate rework — 2026-10-21, PUBLISHED

- `codex/bow-three-ap-249`, [#249](https://github.com/Vovanostm/warwrit/issues/249):
  evaluator eval-1 REWORK at `cd487a8e` confirms source review's wrong-contract
  revision read (real PG 1 FAIL / 23 filtered SKIP). Both findings share one
  bounded rework round; a single builder task fixes explicit wolf GET/success
  checks and reruns the finite regression without changing production guards.
- Preserve evaluator's native V5 move/shot, restart/retry, genuine old V4
  continuation and seven replay baseline evidence with their limits. Supported
  terminal effects/proof/retry, native 2 AP refusal and complete day/night
  rendered move journeys remain unproven; fresh Tier L gates must finish them.
  Evaluator cleaned its isolated runtime/DB; settlement recorded and released.
- Update [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) and local dispatch
  checkpoint for the one-tick continuation. Documentation-only commit; scoped
  formatting/diff/readback checked, game checks NOT_RUN by coordinator.
  No source change, acceptance waiver, migration, merge or deployment.

### Record persistent bow test rework — 2026-10-21, LOCAL

- `codex/bow-three-ap-249`, [#249](https://github.com/Vovanostm/warwrit/issues/249):
  fresh source review REWORK at `759546e9`; the new encounter PG regression
  reads the default raider revision before a wolf JOIN. Evaluator's isolated
  migrated-PG run fails with 409 / STALE_REVISION (1 FAIL / 23 SKIP), before
  admission. No production defect or persistent acceptance is established.
- Queue the bounded test fix: GET the explicit wolf contract for each actor and
  assert success before JOIN, preserving all revision guards and later checks.
  Evaluator remains live; collect its verdict before dispatching round 1 rework.
  No source changed or rework budget spent. Earlier validator 9/9 PASS remains
  historical; no game checks rerun by this coordinator tick.
- Update [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) with the exact failure,
  ownership and pending gates. Source, persistent restart/old-active/terminal
  proof, PR/CI/merge remain unaccepted; no new rule, migration or deployment.

### Validate persistent bow source and prepare independent gates — 2026-10-21, LOCAL

- `codex/bow-three-ap-249`, [#249](https://github.com/Vovanostm/warwrit/issues/249):
  company projection 5, strict binding/save/receipt consumers and new wolf
  admission use already delivered bridge-v5. Normal main integration preserves
  legacy active rules/replays and JOIN lock order; no new migration or rule.
- Source `0a38a99b` is committed and clean, scope 239 lines. Coordinator
  validator exit 0, 9/9 PASS; related tests 671 PASS / 52 SKIP, audit PASS.
  Builder's native lab step/shot is author proof only. Actual PG attempt failed
  before admission because the disposable DB lacked its existing schema;
  persistent restart/old-active/terminal proof remains NOT_RUN.
- Fresh independent Tier L gates are next, including isolated test-schema setup
  with existing migrations only. Hosted CI/publication/merge remain pending;
  no #249/#218 closure, deployment, balance or full-M1 claim.
  [Current checkpoint](docs/engineering/CURRENT_PLAN.md); owning builder report
  is tracked at `.orca/core-bow-three-ap/report.md`.

### Start persistent bow successor integration — 2026-10-21, LOCAL

- `codex/bow-three-ap-249`, [#249](https://github.com/Vovanostm/warwrit/issues/249):
  consume the fresh five-section contract after merged #256/PR257. Remaining
  company/binding and persistent adapter scope measures 190 source lines before
  integration; final scope, audit and persistent acceptance remain NOT_RUN.
- Begin ordinary integration of main `d8a04196`, preserving retained `e68025b9`.
  Coordinator reconciles both shared-record histories; the sole core builder
  owns outstanding source conflicts and must preserve delivered #256 replay,
  runtime and lab regressions. No reset, rebase, source waiver or new rule.
- Builder task `task_73dc0817b72c` owns normal audited commits and finite persistent
  admission/move/shot/save/restart proof. Coordinator validation, fresh Tier L
  gates, publication and merge remain pending. Documentation readback/diff and
  formatting are the only coordinator checks this tick; game checks NOT_RUN.
  [Current checkpoint](docs/engineering/CURRENT_PLAN.md). No migration/deployment.

### Deliver bow lab and prepare persistent successor — 2026-10-21, PUBLISHED

- `codex/bow-three-ap-249`: record actual merged predecessor
  [PR257](https://github.com/Vovanostm/warwrit/pull/257), merge `d8a04196`;
  final-head CI `39602921979` SUCCESS, integrated validator 9/9 PASS and fresh
  Tier L source/playable ACCEPT for unchanged code `1105189d`. #256 closed/done;
  clean finished worktree removed after local evidence retention.
- This branch retains WIP source `e68025b9`; only coordinator records change here.
  Fresh #249 contract must inspect current main before company/binding and
  persistent admission/save/restart work; that acceptance remains NOT_RUN.
  Earlier WIP audit remains NOT_RUN; no new game test executed for these records.
- [Current checkpoint](docs/engineering/CURRENT_PLAN.md) records #184 needs-owner
  and its existing evidence-only recovery question. No additional attempt,
  migration, deployment or full-M1 claim.

### Deliver canonical pickup targets — 2026-10-21, MERGED

- `codex/representative-hunt-recovery`, [PR251](https://github.com/Vovanostm/warwrit/pull/251)
  merged7b9a1dca; reviewed/tested/main contents match. CI39515766544 SUCCESS:
  937unitPASS/50SKIP,10000stress,17realPG/auth,migrations,coverage/audit.
  Independent source and recovered-save runtime ACCEPT; no impossible targets
  offered, original failed DB6 preserved. Separate DB7 payment/restart follows;
  broader174/177 remain partial. [Record](docs/engineering/evidence/persistent-hud/main-readback.md).

### Integrate bow lab with current pipeline main — 2026-10-21, PUBLISHED

- `Vovanostm/core-bow-lab-256`, [PR257](https://github.com/Vovanostm/warwrit/pull/257):
  integrate actual main `4e83842a` through normal merge `a0dd20c0`; preserve
  both CHANGELOG histories. No game source conflict or new rule. Integrated
  coordinator validator 9/9 PASS; source scope 118 lines, Tier L ACCEPT retained
  for unchanged code `1105189d`. Earlier published-head CI `39598354029` SUCCESS;
  final integrated-head CI and expected-head merge remain pending.
- Correct [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) to the actual #184
  needs-owner state and existing B1 evidence question after rework 2/2; no new
  attempt or acceptance waiver. #249 waits for #256, #231 for #184.
  [Bow proof and limits](docs/engineering/evidence/core-bow-lab/README.md).
  No migration/deployment; persistent activation remains #249, NOT_RUN here.

### Independent bow lab acceptance and publication — 2026-10-21, PUBLISHED

- `Vovanostm/core-bow-lab-256`, issue #256: preserve fresh Tier L source and
  playable ACCEPT plus small day/night JPEG proof. Code `1105189d` is unchanged;
  the later `81328bc` commit changes only CHANGELOG/CURRENT_PLAN. Real editor
  journeys establish AP 4 → 3 → 0, unchanged 16-stamina shot and same activation;
  seven released replay baselines and completed mill replay independently match.
- Existing coordinator validator 9/9 PASS and builder coverage 812 PASS / 51 SKIP
  remain actual executed results; no test rerun for this evidence/docs update.
  [PR257](https://github.com/Vovanostm/warwrit/pull/257) is open; hosted CI
  and merge remain pending. Persistent acceptance remains #249; balance NOT_MEASURED. No migration or deployment.
  [Proof and limits](docs/engineering/evidence/core-bow-lab/README.md).

### Compatible bow core/lab and refreshed gates — 2026-10-21, LOCAL

- `Vovanostm/core-bow-lab-256`, [#256](https://github.com/Vovanostm/warwrit/issues/256)
  split from #249: sprite v4 / bridge v5 ordinary bow costs 3 AP; new lab battles
  select v4. Preserve 16 stamina, range/damage/special actions, released replay
  bytes and existing persistent selectors. Affects combat core, lab projection
  contract/routes, protocol and web view validation. No migration or new rule.
- Builder's real day/night editor → 1 AP step → 3 AP shot has native resource
  and replay readback; focused coverage 812 PASS / 51 SKIP, normal commit audit
  PASS. Coordinator validator 9/9 PASS on `1105189d`; scope 118 source lines.
  Independent Tier L reviewer/evaluator are live; hosted CI, PR and merge are
  NOT_RUN. Persistent activation/restart remains successor #249; balance is
  NOT_MEASURED. [Owning behavior](apps/server/src/combat-lab/README.md#sprite-v4-ordinary-bow--2026-10-21).
- #184 evaluator ACCEPT at `06479a47` does not override visual REWORK:
  rendering-language score 1 and missing tight height-step crowd evidence.
  Second bounded rework is live; fresh gates required. Existing reports and
  earlier failures retained. [Current checkpoint](docs/engineering/CURRENT_PLAN.md).

### Split the bow delivery and checkpoint the tick — 2026-10-21, LOCAL

- `Vovanostm/core-bow-lab-256`: fallback step 3 splits retained #249 WIP
  (305 changed source lines) into [#256](https://github.com/Vovanostm/warwrit/issues/256)
  compatible combat/lab support, then #249 company/binding/persistent adapters.
  Each keeps its own issue/PR and worktree; no scope waiver or source reset.
  The local slice overrides and issue comments own ordering/ownership. Contract
  writer only is active for #256; implementation, replay and playable proof are
  NOT_RUN here. Existing 3 AP owner decision is unchanged.
- [PR255](https://github.com/Vovanostm/warwrit/pull/255) is MERGED as `0adcff2e`
  after exact-head CI 39588879033 SUCCESS, validator 9/9 and fresh Tier L ACCEPT;
  #254 closed/done, finished worktree removed after evidence retention. Earlier
  pending entries remain history. No new runtime test is claimed by this record.
- #184 pushed head `06479a47` integrates actual main with status-only conflicts
  resolved retaining both histories; union validator 9/9 PASS. Fresh evaluator
  and absolute visual critic are live; visual acceptance and CI remain pending.
  [Current checkpoint](docs/engineering/CURRENT_PLAN.md). No migration/deployment.

### Evidence-based Orca pipeline fixes — 2026-10-21, PUBLISHED

- `claude/orca-pipeline-evidence` (stacked on PR252): owner request to improve
  the pipeline by best agentic practice with proof. Baseline, failure causes,
  sources and expected effects are in
  [AGENT_TEAM § Pipeline evidence review](docs/engineering/AGENT_TEAM.md#pipeline-evidence-review--2026-10-21).
- Event-driven coordinator: `scripts/orca-state-digest.sh` + tick skip when the
  state is unchanged (3-hour heartbeat); the mailbox probe recreates a terminal
  that lost its stable pane.
- `scripts/orca-play.sh` starts, health-checks and stops the combat lab and
  kills orphaned servers on the worktree ports; gates report `BLOCKED_ENV`
  outside the rework budget; evaluators take missing proof themselves.
- The pre-commit hook refreshes focused coverage before the audit (local
  `core.hooksPath` reset to the relative `scripts/git-hooks`, so each worktree
  runs its own hook instead of the primary checkout's);
  `scripts/orca-metrics.sh` feeds the daily digest.
- Checks: `orca-play.sh` start/status/stop with ports freed; digest stable on
  two runs; metrics on 4 days of logs; `bash -n`/`sh -n`; Prettier. Effects on
  the next wave NOT_MEASURED.

### Refresh JOIN delivery gates after hosted audit failure — 2026-10-21, LOCAL

- `codex/join-lock-order-254`, [PR255](https://github.com/Vovanostm/warwrit/pull/255):
  separate the exact ownership reread from account locking and cover it without
  PostgreSQL so the hosted audit can measure that rule. Affects
  `apps/server/src/contracts/routes.ts` and its existing encounter integration
  tests; no migration, lock-order, authorization, retry or game-rule change.
- Gated head `cd77d1d6`: normal commit audit and coordinator validator 9/9 PASS;
  builder real-PG related coverage 64 PASS / 15 SKIP. Fresh reviewer and actual
  persistent JOIN evaluator ACCEPT; evaluator real-PG 7 PASS / 16 filtered SKIP,
  four UI commands 200, one admission/two accounts, replay/reload readbacks PASS.
  Old hosted and narrow-coverage audit failures remain recorded. Corrected-head
  hosted CI, publication and merge pending; no deployment or full-M1 claim.
  [Evidence and limits](docs/engineering/evidence/join-lock-order-254/README.md).

### Correct participating-account lock order — 2026-10-21, LOCAL

- `codex/join-lock-order-254`, [issue254](https://github.com/Vovanostm/warwrit/issues/254):
  DB7 helper JOIN deadlocked against an account-before-company transaction.
  Lock the complete discovered account set before company rows and revalidate
  ownership; preserve admission rules, receipts and sorted company locking.
  Old source reproduced500/40P01; corrected real-PG coverage1PASS/16filteredSKIP.
  Independent source ACCEPT; server types/lint/normal audit PASS. Clean integrated
  validator8/8 with realPG58PASS/15SKIP; first PG-omitted audit failure retained.
  Hosted gate pending. No migration/deployment.
  [Evidence](docs/engineering/evidence/join-lock-order-254/README.md).

### One coordinator, one issue per PR — 2026-10-21, PUBLISHED

- `claude/orchestration-governance`, [PR252](https://github.com/Vovanostm/warwrit/pull/252): owner request «Fix issues. Implement» after
  the 2026-10-20 audit. The audit found two coordinators on one queue (a Codex
  desktop mission took the Orca lock on 2026-10-19 while the loop stopped),
  stale `agent:*` labels on #217, merged PRs of 700–3700 lines against the
  300-line slice rule, and contradictory merge rules across AGENTS.md,
  AGENT_TEAM and warwrit-delivery.
- New [AGENTS.md § Orchestration](AGENTS.md#orchestration) and hard rule 8: one
  lease holder, mission scope quoted verbatim, the coordinator owns issue
  state, handover before stopping, a 40-line `CURRENT_PLAN` status block. Hard
  rule 1 no longer accepts an agent's own status entry as permission.
- New [`scripts/check-pr-scope.sh`](scripts/check-pr-scope.sh) and the `PR scope`
  workflow (≤ 300 source lines without tests, one `Closes #N`; owner label
  `scope:owner-approved` for exceptions); `orca-validate.sh` runs it.
- `orca-pipeline-tick.sh` honours a foreign lease and reclaims only a dead
  tick's lock; before, it ran beside the other coordinator after 90 minutes.
  `pnpm agent:status` prints the lease owner.
- warwrit-orca reconcile now closes merged-but-open issues, fixes orphan
  `agent:pr`/`agent:review`, keeps abandoned staged work, removes finished
  worktrees and closes superseded PRs. warwrit-delivery and warwrit-context
  follow the new merge rule and read or write Airtable/Empirical only for rule
  or milestone work.
- The art and lore owner policy moved verbatim to
  [ART_LORE_POLICY](docs/engineering/ART_LORE_POLICY.md) with a pointer in
  AGENTS.md.
- Not done here: rewriting `CURRENT_PLAN` into the status block (the active
  mission owns that file) and relabelling #217 issues (its coordinator's duty).
  Checks: scope script on PR247's range FAIL (3641 lines) as expected; body and
  lease cases tested by hand; `bash -n` and Prettier on changed files.

### Integrate pickup correction with merged range — 2026-10-21, LOCAL

- `codex/representative-hunt-recovery`: c5acd803 combines actual range main
  b0eeb8e8 with unchanged accepted pickup sourcef439db7. Both document histories
  retained; normal auditPASS, clean union validator8/8PASS,41relatedPASS/31SKIP.
  Hosted pickup gate/merge and separate payment journey remain pending.
  [Evidence](docs/engineering/evidence/persistent-hud/main-readback.md).

### Deliver the separate reach boundary — 2026-10-21, MERGED

- `codex/combat-range-187`, [PR250](https://github.com/Vovanostm/warwrit/pull/250)
  merged b0eeb8e8; reviewed/tested/main contents match. Source/playable/absolute
  visual ACCEPT and CI39512315650 attempt2 SUCCESS:937unitPASS/49SKIP,
  10000stress,16PG/auth,migrations,coverage/audit. The first coverage timeout
  in unchanged world movement passed isolated and one unchanged-head retry;
  no test or gate weakened. #184 consumer follows with server-owned bands.
  [Evidence](docs/engineering/evidence/range-187/README.md).

### Separate movement fill and reach boundary — 2026-10-20, LOCAL

- `codex/combat-range-187`, [issue187](https://github.com/Vovanostm/warwrit/issues/187):
  replace weapon/combined fills with the exterior contour of supplied cells.
  Selected skills require current actor/activation/revision/skill geometry;
  absent or stale data never falls back to weapon reach. Remove combined legend;
  keep server legality, costs and replay unchanged.
- Independent source review ACCEPT after mesh-bounds and borderless-fill fixes.
  Initial audit failures led to a cohesive contour lifecycle module and reuse
  of existing grid tests; current focused coverage24PASS. Stale package outputs
  were rebuilt without encounter source changes. Final web types, scoped TS/TSX
  lint and source formatting PASS. Normal audit and parent validator8/8PASS (51related tests); independent browser
  ACCEPT, including actual aimed-shot selection and passive0POST. Absolute visual
  ACCEPT on2026-10-21: all applicable criteria2, motion N/A,62images inspected.
  Hosted CI and merge remain pending. [Current evidence](docs/engineering/evidence/range-187/README.md).
  [Behavior and check history](docs/wiki/battlefield-test-maps.md#range-boundary-consumer--2026-10-20).

### Accept the pickup projection on the recovered save — 2026-10-21, LOCAL

- `codex/representative-hunt-recovery`, issue248: independent source and live
  recovered-DB6 evaluation ACCEPT on f439db7. Both accounts have no impossible
  pickup target/control,0POST,11canonical collections unchanged. Focused real-PG
  coverage2PASS/14filteredSKIP, normal auditPASS, clean validator8/8PASS.
  DB6 stays overloaded; payment/restart and separate DB7 remain unproven.
  Preserve earlier failed checks and captures in the
  [owning record](docs/engineering/evidence/persistent-hud/main-readback.md).

### Preserve retained hunt recovery evidence — 2026-10-20, LOCAL

- `codex/representative-hunt-recovery`: recover DB6 into an isolated durable
  clone after the disposable container disappeared. Native saved identities,
  encounter40, companies, receipts and proof match; original volume untouched.
  Pickup/payment/browser continuation remains pending. Retain the exact food
  regression failure and unresolved terminal settlement in the
  [owning record](docs/engineering/evidence/persistent-hud/main-readback.md).

### Align trophy pickup offers with canonical admission — 2026-10-20, LOCAL

- `codex/representative-hunt-recovery`, [issue248](https://github.com/Vovanostm/warwrit/issues/248):
  a real UI pickup rejected CAPACITY because its offered container had room but
  the party was already overloaded. Reuse existing pure pickup admission for
  the target projection; no carrying-rule or migration change. Frozen source/test
  independent review ACCEPT; final real-PG focused coverage2PASS/14filteredSKIP
  on2026-10-21. Exact fractional food/retry assertions retain unchanged ration
  quantity and one terminal receipt. Normal audit and clean validator8/8PASS (41relatedPASS/31SKIP);
  independent runtime delivery remains pending. Preserve failed DB6 and receipt; a separate valid-load
  fixture must prove its own journey. [Evidence](docs/engineering/evidence/persistent-hud/main-readback.md).

### Deliver the persistent commander and continue the hunt — 2026-10-20

- `codex/persistent-hud-166`, MERGED [PR247](https://github.com/Vovanostm/warwrit/pull/247)
  as7a7f1f18 after current source/playable/absolute visual ACCEPT. Final hosted
  CI39446960412 SUCCESS:932unitPASS/49SKIP,10000stress,16PG/auth,migrations,
  coverage/audit; exact reviewed/tested/merged contents match. #166 CLOSED.
  [Delivery and limits](docs/engineering/evidence/persistent-hud/main-readback.md).
- `codex/representative-hunt-recovery`, LOCAL: activate only the approved
  representative wolf-trophy→payment→restart check for #174/#177 using retained
  DB6. Fixture provenance and broader recovery/content/owner-test gaps remain
  explicit; no full-M1 or deployment claim. Session renewal preserved canonical
  game state; ordinary trophy pickup rejected409/CAPACITY despite the offered
  destination. No partial mutation; payment/restart remain NOT_RUN. Read-only
  diagnosis is active, and main CI39449025408 is now SUCCESS.

### Align persistent HUD integration expectations — 2026-10-20, LOCAL / REWORK

- `codex/persistent-hud-166`, [PR247](https://github.com/Vovanostm/warwrit/pull/247):
  CI39444350305 reaches real PostgreSQL checks after932unitPASS/49SKIP and
  combat stress, then finds two obsolete exact public-shape assertions.
  Correct only the finite approved room/unit expectations in the existing
  integration tests; preserve private-field rejection and durable replay checks.
  Independent actual-diff review ACCEPT; isolated PG17 regression2PASS/13filteredSKIP
  after reproduced failures. Scoped types/format PASS. No production rule
  change or migration. [Evidence](docs/engineering/evidence/persistent-hud/README.md).

### Finish legacy art cleanup after hosted verification — 2026-10-20, PUBLISHED / REWORK

- `codex/persistent-hud-166`, [PR247](https://github.com/Vovanostm/warwrit/pull/247):
  first CI39442491652 fails on unused BATTLE_ART/unitSprite after the legacy
  renderer removal. Remove only their unreachable block/imports in renderer/art.ts;
  preserve live map art and shared sprite presentation. Independent source trace
  confirms consumer boundaries; actual-diff review ACCEPT. Scoped format/web types
  and corrected global dead-code EXIT0; integrated/hosted correction checks and
  merge pending. No gate bypass.
  [Evidence](docs/engineering/evidence/persistent-hud/README.md).

### Connect persistent combat to the shared presentation — 2026-10-20, LOCAL

- `codex/persistent-hud-166`: add finite public rendering fields/readers and a
  web-local adapter for the shared commander scene. Preserve private AP/quotes,
  unknown limits, actual ownership and the separate lab controller.
- Real browser admission exposed a strict-reader rejection of `weaponId`;
  correction12focused tests/types/format PASS. First corrected render exists,
  but fullscreen, readability and turn-label defects remain; no accepted player
  action or independent visual ACCEPT yet. Preserve both failed test journeys.
  Frozen review also identifies realtime reach-list validation, lost weapon
  identity and known-cap tooltip regression. Corrected candidate:51focused
  tests/types/format PASS and independent source review ACCEPT; third-fixture
  runtime proved attack7 with updated UI/native evidence, then status text
  blocked overview. Correct notice/AFK layout and replace the invisible fists
  placeholder with a source-linked W01 derivative; final acceptance remains pending.
  Fourth-fixture move7/attack11 accepted before interrupted harness/AFK loss120.
  Subsequent display-only review confirms compact grid/body-lock corrections;
  Actor HP/armor and a target scroll cue now appear in refreshed display-only
  frames. The unreachable legacy renderer is removed with its consumed-cap
  regression retained in the shared view. Final affected source review ACCEPT
  and normal audit PASS after bounded corrections; retained coverage78PASS,
  author final80PASS report lacks its raw log. No bypass, final gameplay
  acceptance or publication is claimed. Normal source commit1c73d845 completed;
  current lab29-frame and adjacent-crowd capture passes have0combatPOST.
  DB5 defeat117/native replay confirms owner manual/reload/inspection behavior;
  helper/right-click proof remains open after a recorded driver failure.
  Lab absolute visual ACCEPT; final playable review remains pending. Integrated
  validation250PASS/49SKIP and7/8steps PASS; ten format failures corrected by
  the repository formatter without behavior changes. Corrected clean validator
  onb4689ed6 EXIT0/8of8,250PASS/49SKIP. DB6 victory40 confirms both accounts'
  right-click attacks, owner manual end,29accepted commands, exact replay and1proof.
  Final independent playable/absolute visual ACCEPT; publication/CI/merge pending.
  [Evidence and remaining gates](docs/engineering/evidence/persistent-hud/README.md).

### Deliver the bridge and start the persistent commander interface — 2026-10-20

- `codex/tactical-bridge-165`, MERGED [PR246](https://github.com/Vovanostm/warwrit/pull/246)
  as1f37cb6a. Exact-head CI39405429269 SUCCESS:911PASS/49SKIP,10000stress,
  16realDB/auth,migrations,coverage/audit. Independent source/recovery ACCEPT;
  actual-main retained46 replay and both persisted roots match. #165 CLOSED.
  [Readback and limits](docs/engineering/evidence/core-tactical-bridge/main-readback.md).
- Follow-up readback: main CI39406551033 SUCCESS; canonical supporting M1
  Notes now include the dated bridge delivery, with exact native readback and
  existing Purpose/status preserved. This documentation update is local on
  `codex/persistent-hud-166`.
- `codex/persistent-hud-166`, local: activate the approved shared commander
  presentation on that actual main. One coupled writer; parent owns records
  and final gates. Implementation/playable/visual acceptance pending; no new
  combat rules, continuous autoplay, payment or full-M1 claim.

### Accept the integrated persistent bridge — 2026-10-20, LOCAL

- `codex/tactical-bridge-165`, integrated5221ebe3: coordinator validator8/8,
  793PASS/49SKIP and normal audit PASS. Independent source/test and actual
  retained-terminal recovery ACCEPT; PostgreSQL17 regression1PASS/14filteredSKIP.
  Current actor main is retained. Publication, hosted CI and merge pending;
  no full-HUD, payment or full-M1 claim.
  [Evidence](docs/engineering/evidence/core-tactical-bridge/README.md).

### Integrate the accepted bridge correction with current main — 2026-10-20

- `codex/tactical-bridge-165`, local: combine correctiond82d0eb and actor
  main6b5b1b03, preserving additive changelog/plan/wiki histories. No production
  conflict or migration; normal correction audit PASS, independent source/test
  and retained-terminal recovery ACCEPT. Final integrated checks pending.
  [Current plan](docs/engineering/CURRENT_PLAN.md).

### Recover valid terminal effects without a lifecycle increment — 2026-10-20

- `codex/tactical-bridge-165`, local: the company repository accepts an equal
  lifecycle revision while preserving identity, evidence, whole-root locking and
  receipt guards. Independent recovery of retained victory61 saves both exact
  prepared roots, releases/completes both companies and issues one proof.
  Early/terminal retries and another process restart preserve roots/counts.
  Helper1→1 includes five practice facts; no-op/zero-practice wording is corrected.
  Permanent PostgreSQL17 regression1PASS/14filteredSKIP, server types and
  scoped lint/format PASS; final delivery gates pending.
  [Evidence and limits](docs/engineering/evidence/core-tactical-bridge/README.md).

### Persistent recovery finding and actor delivery — 2026-10-20

- `codex/tactical-bridge-165`, local REWORK: independent victory53 proves real
  terminal crash recovery, once-only effects/proof and settled restart. Separate
  victory61 exposes a strict lifecycle-revision guard rejecting valid helper1→1
  settlement. Correct the repository boundary and retain evidence/atomic guards;
  publication/merge pending. [Bridge evidence](docs/engineering/evidence/core-tactical-bridge/README.md).
- `codex/actor-integration-186`, MERGED PR245/6b5b1b03: played/visual ACCEPT,
  CI39399738137 SUCCESS (899PASS/48SKIP,10000stress,15realDB/auth). Actual-main
  marker/inspection/turn/day-night smoke PASS; reload observer failure retained.
  [Readback](docs/engineering/evidence/uix-actor-foundation/main-readback.md).
  Enemy frames remain190; no deployment/full-M1 claim.

### Reaction correction independently reviewed — 2026-10-20, LOCAL

- Branch `codex/tactical-bridge-165`: normal correction `d618b3a9` receives
  independent source ACCEPT. Retained evaluator42 replay and both READY company
  roots, terminal pools, one completion and exact finalize retry verified at the
  pure boundary. Author199PASS/1existingSKIP and normal audit remain attributed.
  Fresh persisted recovery, integrated validation and publication/merge pending.
  [Evidence and limits](docs/engineering/evidence/core-tactical-bridge/README.md).

### Bounded bridge audit and integrated checks — 2026-10-20, LOCAL

- Normal source commit743ae5d closes the four introduced audit findings. Current
  focused coverage197PASS/1existingSKIP; types/lint/format/normal audit PASS.
  Coordinator validation on that clean commit EXIT0/8of8,791PASS/48SKIP.
  Read-only replay of the retained46-command journey matches both final company
  roots. Independent source review REWORK743ae5d reproduced stale reaction skill
  coefficients blocking supported terminal settlement, and rejected implicit
  reaction starts in the full-journal consumer. Independent real wolf victory42
  with5reactions also stays bound/pending after restart, proof0. Its sanitized
  rows are retained; exact runtime cause remains to isolate. Correction,
  publication, CI and merge remain pending. Earlier failed checks retain their history.
  Owner decisions are settled; no new skills, custody, rescue or6v6 rules.
  Branch `codex/tactical-bridge-165`; local.
  [Current record](docs/engineering/CURRENT_PLAN.md).

### Connect the bounded persistent wolf hunt to tactical combat

- 2026-10-20, branch `codex/tactical-bridge-165`, local: implement explicit
  bridge-v4/projection4 across core setup/replay/AI, company profiles/binding/
  consequences, authenticated encounter executor/private protocol and minimal
  persistent consumer. Preserve old versions, fists and condition restrictions;
  unavailable unmapped skills and unsupported disposition stay explicit.
  [Behavior and limitations](docs/wiki/combat.md#persistent-tactical-wolf-hunt--2026-10-20).
- Author real two-company6v3 journey reached victory46, exact retries, active
  process restart12 and once-only effects/one proof. 196focusedPASS/1SKIP;
  normal audit findings are being corrected, no bypass. Independent evaluation,
  integrated gate, publication/merge, payment and final HUD remain pending.
  No migration, dependency or authored world-content change.

### Start the approved persistent tactical bridge after profile delivery

- 2026-10-20, branch `codex/tactical-bridge-165`, local: activate #165 on
  actual merged profile main137faf88, with the owner's bounded wolf-hunt scope.
  One core writer owns the coupled bridge/protocol/executor consumers; actor
  lab-scene work stays separate. Implementation and acceptance pending.
- Delivery readback: [PR241](https://github.com/Vovanostm/warwrit/pull/241)
  merged137faf88 after source ACCEPT,validator8/8 and CI39383402818 SUCCESS:
  893PASS/48SKIP,10000stress,15realDB/auth,coverage/audit. Merged tree matches
  the checked candidate. Main CI39384644400 SUCCESS; real PostgreSQL mixed
  JOIN/retry/reload smoke1PASS/13filteredSKIP; #164 CLOSED. Rescue/transport excluded,
  payment/terminal-browser journey remains downstream.

### Actor backdrop correction and integrated checks — 2026-10-20, LOCAL

- Normal source commit6eb5263 fixes the reproduced ruined-mill/name draw-order
  collision. Current source-reloaded native100/125 day/night Home/close captures
  show the full projected name; diagnostic raised crowd remains separately
  attributed. Coordinator validation EXIT0/8of8,47relatedPASS and auditPASS.
  Prior independent input/geometry ACCEPT47178752 remains attributable to its
  unchanged boundaries; absolute visual ACCEPT6eb5263, all applicable criteria2.
  [Proof and limits](docs/engineering/evidence/uix-actor-foundation/README.md). The builder
  reported a scheduling breach: its passing commit hook ran while the check
  window was WAIT. This is retained as a failed worker obligation, not erased by
  passing checks. Parent subsequently ran integrated validation alone.
  Refs186 only; enemy intermediate-frame agreement remains190. No PR/merge yet.
  Branch `codex/actor-integration-186`; local.
  [Current record](docs/engineering/CURRENT_PLAN.md).

### Record the reproduced backdrop overlap before actor delivery

- 2026-10-20, branch `codex/actor-integration-186`, local REWORK: integrated
  validation8/8 and47related tests pass, but author and fresh independent
  native125 Home images both show the mill obscuring actor name text. Preserve
  the failure and its source ordering lead for a bounded correction; complete
  reference-sheet framing is repaired. [Current plan](docs/engineering/CURRENT_PLAN.md).
  No visual ACCEPT, publication or merge is claimed.

### Integrate the corrected actor marker with the merged company profile

- 2026-10-20, branch `codex/actor-integration-186`, local: preserve actor
  correction bba8d24b while merging actual main137faf88; only additive shared
  records conflicted. Corrected containment has47relatedPASS and author native
  100/125 longer-name proof; independent affected play/absolute visual gates
  remain pending. [Current plan](docs/engineering/CURRENT_PLAN.md).
- PR241 is merged with successful PR/main CI and actual-main mixed-company
  PostgreSQL JOIN/retry/reload smoke (1PASS/13filteredSKIP); rescue/transport
  and downstream payment/browser journey remain unresolved. No deployment.

### Correct the remaining actor placement boundary

- 2026-10-20, branch `codex/actor-integration-186`, local: independent play
  reached final-AP transition, casualty/threat and terminal176/restart; long-name
  actor and representative input proof remain incomplete. Parent's reproduced
  clamp/collision counterexample returns to the original builder. Prior source
  and runtime evidence retained; no live regression, visual ACCEPT or merge
  claimed. [Current scope](docs/engineering/CURRENT_PLAN.md).

### Retain the actor placement review finding

- 2026-10-20, branch `codex/actor-integration-186`, local: source review found
  that final viewport clamping can restore a badge/reservation overlap. The
  public-helper counterexample reproduced; parent live manifestation NOT_RUN.
  Correction and independent affected-play/absolute-visual acceptance remain
  pending. Existing actor checks stay historical evidence, not approval of this
  defect. [Current delivery boundary](docs/engineering/CURRENT_PLAN.md).

### Validate the integrated actor foundation

- 2026-10-20, branch `codex/actor-integration-186`, local source `b38e08b5`:
  the activation-owned ring/name now uses current HUD/vitals/letter reservations
  and full badge bounds in overview/actor fit. Author 21 focused/46 related tests,
  types/lint/format/normal audit PASS; parent validator EXIT0, 8/8 PASS. Native
  100/125 day/night smoke, passive 0 POST and actual final-AP transition passed.
  [Behavior and limits](docs/wiki/battlefield-test-maps.md#маркер-действующего-бойца--2026-10-20).
  Independent played/absolute visual acceptance and publication remain pending;
  Refs186, #190 still owns enemy/frame agreement. No rules or migrations changed.
- Delivery correction: overview main CI39378757951 SUCCESS after PR244 merge;
  [actual-main readback](docs/engineering/evidence/uix-overview-zoom/main-readback.md).

### Integrate the acting-fighter cue with the delivered overview

- 2026-10-20, branch `codex/actor-integration-186`, local: activate preserved
  Refs186 foundation on accepted overview mainfe3bcdb4. One web writer owns
  actor scene/marker/geometry and focused regressions; preserve full-field fit,
  ground-linked letters and bounded HUD while correcting current reservations
  and complete badge bounds. Implementation/integrated acceptance pending;
  #190 still owns enemy/frame agreement. Parent updates CURRENT_PLAN and the
  existing battlefield wiki at result closeout; no game-rule or migration change.
- Delivery correction: [PR244](https://github.com/Vovanostm/warwrit/pull/244)
  mergedfe3bcdb4, #227 CLOSED/agent:done, exact-head CI39377607667 SUCCESS.
  Candidate/merged trees match; normal human6v5 end-turn/reload and actual-main
  reload retained full state/revision3 with0passivePOST and11targets.
  [Evidence and limits](docs/engineering/evidence/uix-overview-zoom/main-readback.md).
  Main CI pending; no full UI/M1, campaign-payment or deployment acceptance.

### Accept the approved company profile on current main

- 2026-10-20, branch `codex/company-profile-164`, local: independent policy
  readback ACCEPTbc4d88e; combined validator EXIT0/8of8,781PASS/48SKIP on
  a9207d76. Profile production is unchanged from the previously reviewed draft;
  current overview main is integrated. [Evidence and retained limits](docs/engineering/evidence/core-company-profile/README.md).
  Publication/fresh CI/merge pending; no new payment or terminal-browser claim.

### Resolve the company-profile policy and bounded bridge scope

- 2026-10-20, branch `codex/company-profile-164`, local: record the owner's
  critical-bleed decision (attack/defence allowed, movement/retreat denied) and
  bounded #165 wolf-hunt scope. Existing projection3 matches the policy; no
  rule-code or migration change. Rescue, skill mapping and unsupported custody
  remain explicit limits. [Source amendment](docs/content/CONTRACTS_M1_DERIVATIVE.md#owner-decision--critical-bleeding-and-first-tactical-bridge-2026-10-20)
  and [wounds wiki](docs/wiki/mechanics/wounds.md) updated. Combined validation,
  independent readback, current CI and PR241 merge remain pending.

### Keep the profile draft compatible with merged overview

- 2026-10-20, branch `codex/company-profile-164`, local: integrate mainfe3bcdb4
  after PR244, preserving both additive documentation histories. Profile source
  and its pending critical-bleed policy are unchanged; no production conflicts,
  migrations or rescue/transport rule. Earlier reviewed profile tests/CI remain
  attributed to their heads; new combined runtime/CI NOT_RUN. Normal integration
  audit PASS after 25 existing initiative-related tests. Initial audit lacked
  current imported HUD coverage; Istanbul combines fresh results with prior
  unchanged-source coverage and discards changed-source entries. No threshold
  or hook bypass. [Current plan](docs/engineering/CURRENT_PLAN.md).
- Overview delivery is merged: PR244/fe3bcdb4, #227 CLOSED, PR39377607667 and
  main39378757951 CI SUCCESS; actual-main6v5 state/revision3 survives reload.
  [Readback and limits](docs/engineering/evidence/uix-overview-zoom/main-readback.md).

### Accept the profile integration test correction

- 2026-10-20, branch `codex/company-profile-164`, local: independent correction
  review ACCEPT0fa34ed after the named real-DB FAIL-before/PASS-after proof;
  preserve both integration reports and executed limits in the
  [profile evidence](docs/engineering/evidence/core-company-profile/README.md).
  Normal audit/server types/lint PASS; existing draft PR241 awaits refreshed CI
  and owner critical-bleed policy. No production rule or migration change.

### Preserve public-field privacy in the merged profile database proof

- 2026-10-20, branch `codex/company-profile-164`, local: independent review of
  mergefbe225a found the second obsolete six-field assertion in the mixed real
  JOIN/reload database regression. The isolated PostgreSQL test failed before
  correction and passed afterward (1 PASS/13 filtered SKIP). Check the exact
  seven public fields including canonical maximumHealth; retain capability and
  foreign-account exclusion, JOIN retry and durable replay proof. No production
  change. Integrated parent validator onfbe225a passed8/8 (784 PASS/48 SKIP);
  correction readback is pending, and critical-bleed policy still blocks merge.
  [Current plan](docs/engineering/CURRENT_PLAN.md).

### Integrate current main into the pending company-profile draft

- 2026-10-20, branch `codex/company-profile-164`, local: integrate main3c934c16
  with HP242 and picker243; production auto-merges, additive plan/changelog
  histories are retained. No policy change: critical-bleed attack/defence still
  awaits the owner, rescue/transport is excluded. Combined validation/review
  pending; the published PR241 head is unchanged at this entry.
  Initial merge audit failed with stale coverage; refreshed related tests found
  one obsolete six-field privacy assertion (783 PASS/48 SKIP). Correct it to the
  exact seven-field public allowlist including accepted maximumHealth, retaining
  capability privacy. Production code is unchanged. Corrected combined related coverage:784 PASS/48 SKIP;
  focused corrected privacy test and lint PASS. Normal audit/commit pending.
- Delivery correction: [PR243](https://github.com/Vovanostm/warwrit/pull/243)
  merged3c934c16; #228 CLOSED, corrected PR/main CI SUCCESS. Actual-main normal
  load/start/end-turn/reload retains the same6v5 session/revision3 with no alerts.
  [Readback and instrumentation limits](docs/engineering/evidence/uix-preset-picker/main-readback.md).
  Earlier CI failure/probe limitations remain; no full-scene or M1 acceptance.

### Preserve the profile reviews and played evidence for publication

- 2026-10-20, branch `codex/company-profile-164`, local: retain bounded source
  reviews, both persistent-play reports and two browser captures in the
  [profile evidence](docs/engineering/evidence/core-company-profile/README.md).
  Reports keep failed attempts and policy/UI/payment limits. No new execution,
  code change, full acceptance or merge is claimed by copying this evidence.

### Recover continuous profile proof and successful local validation

- 2026-10-20, branch `codex/company-profile-164`, local: record recovered
  evaluator3 ACCEPT for the same encounter's 10 fists / 13 armed attacks, terminal
  wounds/practice, exact retries and unchanged persisted rows after restart.
  Post-reboot isolated 41/41 and coordinator validator 8/8 (775 PASS/48 SKIP,
  audit PASS) supersede earlier incomplete proof/timeouts on unchanged source.
  Updated combat/weapons wiki and [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md)
  with payment/terminal-UI NOT_RUN, pending critical-bleed policy and unresolved
  rescue/transport; no source, rule or migration changed. #164 remains open.
  Record independent UI/UX findings for the existing overview rework; no full
  scene, balance or M1 acceptance is inferred. Hosted branch CI remains NOT_RUN.

### Record persistent profile evaluation and remaining acceptance

- 2026-10-20, branch `codex/company-profile-164`, local: record source ACCEPT
  and normal commit `d3975cf`, real mixed admission/attacks/restriction rejection,
  active restart and a separate no-attack terminal/restart. Evaluator2 REWORK
  retains the missing same-journey practice/terminal/combat-retry proof and
  pending critical-bleed policy. The first terminal failure came from the
  fixture's ineligible STATIC food container; a fresh PARTY_SUPPLY fixture
  completed. No game source or rule changed, no failed gate was waived.
  [Exact checks and limits](docs/engineering/CURRENT_PLAN.md).

### Preserve leadership evidence from real unarmed attacks

- 2026-10-20, branch `codex/company-profile-164`, local: fix the confirmed
  fists/leadership coupling in the practice profile and both receipt/effects
  consumers. Retain verified opposing attack evidence independently of weapon
  credit; keep all existing source/time/membership checks and exclude fists
  from weapon XP and weapon start snapshots. One real mixed-subordinate
  regression failed before and passed after the fix, including exact retry.
  28 practice tests, core typecheck and scoped lint/format/diff PASS. Broader
  focused coverage: 133 PASS, one existing mill-label timeout; final source
  audit PASS. Independent review, normal commit and whole-profile playable
  acceptance pending; no gate failure was waived.
  [Owning behavior and remaining limits](docs/wiki/combat.md#company-profile-implementation--2026-10-20).

### Record the fists and leadership evidence defect before delivery

- 2026-10-20, branch `codex/company-profile-164`, local REWORK:
  independent review found fists excluded from leadership evidence along with
  weapon XP, contrary to the existing separate command-cycle admission rule.
  Assign one cohesive correction across profile/receipt/effects in
  `company/combat-practice.ts` and the existing public practice specs. The
  earlier helper extraction passed 133 focused tests but is not acceptance of
  this defect. Source repair, normal commit and playable proof remain pending.
  [Current delivery status](docs/engineering/CURRENT_PLAN.md).

### Separate leadership-cycle calculation from practice profile construction

- 2026-10-20, branch `codex/company-profile-164`, local: combined coverage
  exposed a new complexity finding in `deriveCombatPracticeProfile` after the
  fists restriction. Move the existing sorting/pairing into a private helper,
  preserving qualification, chronology and returned data. Ten relevant test
  files: 117 PASS; game-core typecheck and scoped lint/format PASS. Independent
  source review and normal commit audit pending. No new practice rule.
  [Profile behavior and acceptance limits](docs/wiki/combat.md#company-profile-implementation--2026-10-20).

### Integrate the merged human preset with corrected company profiles

- 2026-10-20, branch `codex/company-profile-164`, local: integrate main
  `eb98dd2` after correction `ba9b146`; preserve both additive documentation
  histories. The five-path compatibility correction matches independent
  review-2 ACCEPT and normal commit audit PASS. Profile integrated/playable
  acceptance remains pending; prior failures and owner-rule gaps stay explicit.
  [Current delivery status](docs/engineering/CURRENT_PLAN.md).
  Integrated related coverage: 771 PASS, 48 SKIP, three timeouts; gate FAIL.
  Initial merge audit failed on imported preset coverage; combined coverage
  refreshed without threshold changes or hook bypass. Final acceptance pending.
- [PR240](https://github.com/Vovanostm/warwrit/pull/240) is MERGED at
  `eb98dd2`, with PR CI39334291071 and main CI39335721903 SUCCESS.
  This corrects older pending receipts; #228 remains OPEN for its picker.

### Keep company capability rules isolated from historical combat

- 2026-10-20, branch `codex/company-profile-164`, local correction: integrated
  validation reproduced a legacy preview crash from an unrelated capabilities
  field and an insufficient schema-1 bridge-v3 setup guard. Restrict capability
  execution/assertion to bridge-v3 and reject bridge rulesets in the old setup
  entrypoint. Existing privacy/setup tests now cover these boundaries, including
  legacy false capabilities that must not alter actions. No approved rule changed.
  Focused 34 tests, core typecheck and scoped lint PASS. Four prior timeout cases
  rerun sequentially: three PASS, unchanged world navigation still times out at
  5 seconds. After browser cleanup, broader checks: 183 PASS, two timeouts
  (world navigation and legacy fixture run); leader-death now PASS. Independent
  staged source delta ACCEPT; whole #164 remains unaccepted. Full integrated gate remains FAIL (766 PASS, six failures initially;
  audit then lacked coverage). No check threshold was increased.
  [Profile behavior and remaining proof](docs/wiki/combat.md#company-profile-implementation--2026-10-20).

### Implement versioned company combat profiles

- 2026-10-20, branch `codex/company-profile-164`, local source9eee0ce:
  implement owner-approved fists and co-located immobile party admission through
  game-core projection/setup/legality/binding/readers/physical/practice, server
  contract and encounter adapters, and private web controls. Fists create no
  gear or weapon XP; malformed equipped loadouts still reject. New nested v3
  dispatch preserves historical rules; no migration/dependency change.
  [Owning behavior and limits](docs/wiki/combat.md#company-profile-implementation--2026-10-20).
  Author152focused tests, affected typechecks, lint/format/audit PASS. Real mixed
  JOIN/reload passed before final corrections; final DB/old terminal reruns,
  independent review, browser and process-restart proof pending. Earlier
  concurrent timeouts remain inconclusive. Critical-bleed attack/defence
  classification and rescue/transport remain explicit gaps; #164 not closed.
  CURRENT_PLAN, m1-spec and local playtest updated with this local status.

### Retain accepted overview proof and current delivery readback

- 2026-10-20, branch `codex/battle-overview-227`, local: retain played eval5 and
  full absolute visual6 ACCEPTff40f304, eleven controlled layer pairs, earlier
  REWORK and runtime-coordination correction in the
  [evidence packet](docs/engineering/evidence/uix-overview-zoom/README.md).
  Main3c934c16 integrated throughbbbc91d without overview source changes;
  parent validator8/8,33relatedPASS,auditPASS; combined223PASS/47SKIP.
  Owning battlefield wiki/CURRENT_PLAN updated; publication/CI/merge pending.
- Delivery correction: picker PR243 merged3c934c16, #228 CLOSED, PR/main CI
  SUCCESS and bounded actual-main6v5/reload smoke passed with explicit probe
  limits. Profile PR241 draft9f18c548 has integration correction ACCEPT and
  CI39374767374 SUCCESS (888/48SKIP,10000stress,15DB/auth,audit); owner policy
  remains pending. No profile merge, full-M1 or deployment acceptance claimed.

### Accept the full-field overview and retained inspection

- 2026-10-20, branch `codex/battle-overview-227`, local: played eval5 and full
  absolute visual6 ACCEPTff40f304. Complete field, grounded letter/queue linkage
  and a bounded scrolling casualty card preserve ten actual survivor selections
  during a real threat; normal battle reached victory149 and retained reload.
  Eleven controlled ground-overlay pairs close the prior missing archer/height
  evidence; no opaque-body crossing was reproduced. Scores2; remaining polish
  and diagnostic/performance limits are retained in the evidence packet.
  Integrate main3c934c16 with additive document reconciliation only; overview
  source is unchanged. Combined validator/hosted CI/publication/merge pending.
  Parent owns shared records and preserves earlier REWORK/interrupted attempts.

### Retain the continuous-play overview blocker before correction

- 2026-10-20, branch `codex/battle-overview-227`, local: evaluator4 reproduced
  #227 wrong-target selection when a retained casualty inspection collapses the
  native125 overview. Source5124298c remains REWORK; log-open checks alone do
  not accept it. Opening12 pointer/keyboard targets, manual move/attack and
  actual victory/reload at revision138 passed in the bounded journey.
  The correction bounds inspection to a scrollable200px right card and keeps
  name/HP/status in its sticky heading, including keyboard access. No rules or
  art change. Author type/lint checks and first continuous casualty-state
  readback pass; independent affected-state and absolute review remain pending.
  Visual3 was stopped without verdict, and fresh affected-state plus absolute
  review remain required. Local reports `.orca/uix-overview-zoom/eval-4.md`
  and eval4-shots retain the failed state. #163 proceeds independently in its
  reserved checkout; #164 owner policy remains pending. No merge claimed.

### Keep overview identities, threats and commands visible together

- 2026-10-20, branch `codex/battle-overview-227`, local `5124298c`: replace
  displaced portrait cards with stable lettered foot markers shared with
  initiative; measure the threat/initiative band, reserve a scrolling log column,
  and constrain forecasts above the dock. Confirmed banner obstruction and
  native125 marker collisions motivated the changes. No art, rules, dependencies
  or migrations changed. Author 33 focused tests, types/lint/format and normal
  audit PASS; four ordinary browser fit/hit samples and manual/passive commands
  recorded. Fresh independent gameplay/absolute visual gates remain pending.
  [Owning behavior and limits](docs/wiki/battlefield-test-maps.md#обзор-и-разделение-пульта--2026-10-20).
- Delivery readback: profile [PR241](https://github.com/Vovanostm/warwrit/pull/241)
  is a published draft at795c842; CI39351771449 PASS (880/48 skipped,10000 stress,
  15 DB,audit). Its policy decision still blocks merge; #164 is needs-owner.

### Make full-field overview inspectable and separate crowded controls

- 2026-10-20, branch `codex/battle-overview-227`, local: source `94c723c2`
  adds existing-art overview portraits tied to unchanged feet, click-to-focus,
  scale-aware resource detail and separate utility/command/skill lanes. This
  addresses #227 evaluator/visual findings after full-field fit alone failed.
  Changes are in combat-lab framing, vitals, scene and controls. Author 33
  focused tests, web types, scoped lint/format and normal audit passed.
  Initial evidence used cache-busting source interception; ordinary-runtime
  independent evaluation and absolute visual acceptance remain pending.
  [Owning behavior and limits](docs/wiki/battlefield-test-maps.md#обзор-и-разделение-пульта--2026-10-20).
- Delivery correction: [PR240](https://github.com/Vovanostm/warwrit/pull/240)
  is merged as `eb98dd2`; PR CI39334291071 and main CI39335721903 succeeded.
  #228 remains open for its picker. Earlier pending receipts are historical.

### Resume the playable fix sequence with field overview

- 2026-10-19, branch `codex/battle-overview-227`, local: owner requested
  implementation, review and merge of the assessed fix sequence. Start #227
  full-field overview before the preserved actor/desk/outcome integration to
  remove an acceptance prerequisite; one web writer, existing work retained.
  Updated [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) with mission scope
  and PR239's verified merge into `b568ee2` (main CI39296247123 successful).
  Camera code, gameplay and new visual acceptance remain NOT_RUN at this entry.

### Accept the picker clean-build correction

- 2026-10-20, branch `codex/preset-picker-228`, published PR243 with local
  correction38c57915: independent correction review ACCEPT; production journey
  acceptance retained, validator8/8 and5tests PASS, no server/core files in web
  compilation inputs. [Review](docs/engineering/evidence/uix-preset-picker/review-ci-1.md).
  CI39369463852 remains FAILED; correction publication/new CI and merge pending.

### Remove the picker test dependency on server implementation

- 2026-10-20, branch `codex/preset-picker-228`, local correction to PR243:
  CI39369463852 failed the clean parallel build because BattleEditor.test
  imported the server catalog and its undeclared game-core dependency into web.
  Use an independent two-fighter DTO fixture for replacement/cloning/guard tests;
  actual six-versus-five catalog behavior remains covered by the accepted browser
  journey. Production code, package dependencies and build gates are unchanged.
  Five focused tests, web types, scoped lint/format/diff PASS; independent
  correction review and integrated validator are pending at this entry.

### Accept the human preset picker and record merged canonical HP

- 2026-10-20, branch `codex/preset-picker-228`, local: independent Tier U ACCEPT
  for049b6cb6; normal catalog loading, saved drafts, native125 and two real human
  battles demonstrate2/1surrenders and an actual withdrawal reaction. Integrate
  main434d4a1a through403193f, preserving both document histories and unchanged
  editor code. Parent validator8/8,5relatedPASS,normal auditPASS. Publication/CI/
  merge pending. [Evidence](docs/engineering/evidence/uix-preset-picker/README.md).
  Update owning battlefield wiki/CURRENT_PLAN; no rules, migrations or dependencies.
- Delivery correction: [PR242](https://github.com/Vovanostm/warwrit/pull/242)
  is merged434d4a1a; #163 CLOSED, PR/main CI SUCCESS. Actual clean-main HP smoke
  ACCEPT/EXIT0; damaged53/60 and38/60 survive fresh/reloaded views with HTTP/bar
  agreement. [Readback](docs/engineering/evidence/core-pools/main-readback.md).
  Earlier FAIL13 is retained. Overview visual5 still needs layer proof; profile
  policy and #165 scope remain pending. No full-M1 or deployment claim.

### Expose the existing human battle preset in the editor

- 2026-10-20, branch `codex/preset-picker-228`, local: #228 now has an explicit
  catalog preset selector/load action in BattleEditor. It validates and clones
  the unsaved draft; mill reset, saved drafts and the normal launch remain.
  No CSS, catalog content, rules, dependencies or migrations changed. Producer
  PR240 is merged at eb98dd2. Five component tests, web types, scoped lint/format
  and diff PASS; initial test-selector/lint failures were corrected. Normal
  commit audit and independent browser acceptance remain pending at this entry.
  [Behavior and proof limits](docs/wiki/battlefield-test-maps.md#пресет-боя-с-людьми--2026-10-20).

### Accept canonical persistent HP through reconnect and restart

- 2026-10-20, branch `codex/health-cap-163`, local source74b22f8:
  independent source and playable reviews ACCEPT #163. Real company38/60 and
  ally53/60 retain matching HTTP/room values and consumed bars across existing,
  fresh, reloaded, reconnected and application-reopened views at revision35.
  Parent validator8/8 PASS,208 tests PASS/47 SKIP,audit PASS. Final evaluator
  assertions passed before deadline; its runner later exited13 during obsolete
  SDK cleanup, retained as FAIL. Hosted CI/publication/merge pending.
  [Evidence, compatibility and limits](docs/engineering/evidence/core-pools/README.md).
  Updated the existing battlefield wiki/CURRENT_PLAN; no migrations, rules,
  replay or dependencies changed. New reader/producer rollout must be coordinated.

### Make the health-cap transport proof observe the real AI worker

- 2026-10-20, branch `codex/health-cap-163`, local: independent review R1
  found a race in the new DB regression, not a production HP defect. The test
  now observes the app worker and chooses a damaged human-turn checkpoint
  without a due AI wake; all comparisons finish before its normal deadline.
  A rejected WebSocket close code caused the first run to fail; the pinned
  reconnect code fixes it. Final isolated PostgreSQL/SDK test PASS (1 test,
  12 unrelated skipped): revision8, raider67/70, two clients, HTTP, actual
  reconnect, app/DB reopen and replay. Earlier failures remain recorded.
  Original source be263a3 passed normal audit/commit and33 focused tests/types;
  corrected test commit/re-review and browser acceptance remain pending.
  Producer/new-reader rollout must be coordinated: old strict HTTP readers
  reject the extra field. No deployment or merge claimed.

### Preserve canonical health ratios when joining an ongoing encounter

- 2026-10-20, branch `codex/health-cap-163`, local: #163 fixes the renderer's
  client-history denominator. Protocol/HTTP/Colyseus carry only canonical
  maximumHealth; absent/invalid caps remain unknown. The persistent bar and
  health text consume the same snapshot. Projection/room/connection/scene
  regressions pass:33 focused tests, protocol/server/web types, scoped lint/format
  and diff. Old-renderer negative control fails as expected; the corrected
  renderer passes. One lint import-style error was fixed. Normal audit/commit
  and real DB/reconnect/browser/independent gates remain pending (runtime
  NOT_RUN). Rules,
  replay history, migrations and combat-lab are unchanged. No merge claimed.
  [Owning behavior and limits](docs/wiki/battlefield-test-maps.md#максимум-здоровья-в-постоянном-бою--2026-10-20).

### Add the human-opponent preset producer and playable evidence

- 2026-10-20, branch `codex/human-battle-228`, local: implement #228 catalog
  presets in server `custom-battle.ts` and optional protocol metadata. The new
  human band demonstrates existing morale/surrender/withdrawal behavior;
  defaults, rules, AI and replay formats remain unchanged. Independent source
  review and played evaluation ACCEPT9534bf7;17focused tests and prior
  coordinator validate8/8PASS. Two UI seeds surrendered2/1 opponents, manual
  withdrawal reaction and3downloaded replay checks passed; default reset and
  restoration passed. [Evidence and remaining picker](docs/engineering/evidence/core-preset-deserters/README.md).
  Integrated validator 8/8 PASS at ce45df4 (179 tests passed, 47 skipped); hosted CI pending; no whole#228/scene acceptance.
  Updated battlefield wiki and CURRENT_PLAN; no migrations or dependencies.
- Dated correction: documentation PR178 is MERGED at1b1e088; PR CI39324349645
  and main CI39326177324 SUCCESS. Earlier pending receipts remain historical.
  #227 visual/playable REWORK and #164 classifier/rescue limits stay explicit.

### Record the approved bounded profile policy

- 2026-10-20, branch `codex/combat-wiki-checkpoint-20261017`, local:
  record the direct owner answer for #164 in CURRENT_PLAN/M1_PRODUCTION_PLAN:
  provisional fists range1/damage6/2AP/8stamina, no penetration or weapon XP;
  immobile members cannot independently move/retreat, assisted transport unresolved.
  [Decision](https://github.com/Vovanostm/warwrit/issues/164#issuecomment-6277245952)
  was published and read back exactly. Implementation remains pending.
  Prior documentation head `95069eb` independently ACCEPTED; validate5/5,
  scoped format/diff and53new links/anchors PASS. PR178 exact-head CI pending.

### Reconcile the M1 queue with delivered combat changes

- 2026-10-19, branch `codex/combat-wiki-checkpoint-20261017`, local correction
  for [PR178](https://github.com/Vovanostm/warwrit/pull/178): owner authorized
  implementation, review and merge of the assessed fix sequence. Preserve the
  original task queue and dated receipts while correcting PR160/PR239 delivery
  and the closed #162 gate in CURRENT_PLAN, M1_PRODUCTION_PLAN and wiki navigation.
  The remaining persistent-combat and recovery work is not declared delivered.
  [Queue amendment](docs/engineering/M1_PRODUCTION_PLAN.md#current-amendment--2026-10-19).
  Scoped formatting/diff checks PASS; new relative targets PASS. Five inherited
  absolute evidence links are unavailable and unchanged. Merge hook initially
  failed on missing coverage; one inherited zero-AP route test ran with coverage
  (1 PASS, 15 SKIP) to satisfy that hook. Independent review pending; full gate
  and browser NOT_RUN. No code, migrations or deployment.

### Prepare accepted unarmed and immobile company combat

- 2026-10-20, branch `codex/company-profile-164`, local: owner authorized
  implementation/review/merge and approved provisional fists plus independent
  mobility restrictions. Append source amendment to CONTRACTS_M1_DERIVATIVE and
  link it from combat/weapons wiki; reserve the cohesive #164 implementation in
  CURRENT_PLAN. [Accepted source](docs/content/CONTRACTS_M1_DERIVATIVE.md#owner-decision--provisional-fists-and-independent-retreat-2026-10-20).
  Condition-to-incapacitated mapping still pending; rescue/transport unresolved.
  Source/docs only at this checkpoint; code/tests/browser/acceptance NOT_RUN.

### Prepare a human-opponent battle preset

- 2026-10-19, branch `codex/human-battle-228`, local: owner requested
  implementation, review and merge of the playable fix sequence. The #228
  contract reuses current human profiles and S4 morale/escape/reaction rules,
  preserves the mill default and adds compatible server catalog presets before
  the sequential editor picker. Implementation and gameplay checks NOT_RUN.
  Parent coordinates shared records; no rule or lore change is authorized here.

### Stage names producer merge and retain actor-foundation REWORK

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, published
  [PR239](https://github.com/Vovanostm/warwrit/pull/239), merge stage:
  head `902d2e8` has successful clean-checkout CI39290710765; branch contains
  current main `073a02b`, no integration needed. Tier L reviewer/evaluator
  ACCEPT for gated `f5803e5` and coordinator validate8/8 remain applicable:
  later commits contain evidence and these shared records only. No blocking
  labels or unresolved review threads observed. This record needs exact-head
  CI before expected-head merge; it does not claim that merge has happened.
  #207 stays OPEN for visible captions, terminal cards and inherited layout
  limits; [producer proof](docs/engineering/evidence/uix-w1-names/README.md).
  #186 visual1 now settled REWORK/BLOCKED on `c60fd5e`: missing native125,
  loaded layering/input, marker comparison and contrast proof, plus inherited
  overview scene-integration score1. Combined proof rework1 is next; inherited
  readability/safe-area/terminal/tooltip allocations remain unaccepted and
  cannot be waived by the foundation split. Updated CURRENT_PLAN; no mechanics,
  setup or wiki behavior change. New local full gate/playtest/deploy NOT_RUN;
  performance/balance NOT_MEASURED.

### Publish stable fighter-label and replay-presentation producer proof

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, published producer
  `796fa52` in [PR239](https://github.com/Vovanostm/warwrit/pull/239), CI/merge
  pending, refs #207. Server/protocol retain detached
  full-roster duplicate labels and optional replay presentation metadata; canonical
  replay/history/RNG/rules and authorization unchanged. Tier L reviewer1 and
  played evaluator1 ACCEPT for `f5803e5`; coordinator validate8/8 PASS,
  178PASS/47SKIP,auditPASS. Evaluator36 focusedPASS,72 matched before/after
  captures across three desktop sizes and genuine125%, day/night; real manual
  first death then autobattle to R10/rev171 and downloaded-only reconstruction
  match live/baseline canonical results. Evidence-only commit `a40d901` retains
  reports and28 small JPEGs. [Proof and limits](docs/engineering/evidence/uix-w1-names/README.md).
  #207 remains OPEN: field captions, terminal inspection and inherited HUD/log
  clipping belong to sequenced consumer/layout owners. Actor foundation #186
  evaluator1 REWORK: missing native125/matched crowd, full layering/input,
  contrast and manual/AP0/reconstruction proof; no new source defect established.
  Combined rework waits for its live visual critic; no concurrent source writer.
  Updated CURRENT_PLAN; mechanics/setup/wiki contracts unchanged by this producer
  receipt. Hosted full gate pending; new local full suite/deploy NOT_RUN,
  numeric contrast/performance/balance/capacity NOT_MEASURED.

### Advance names and actor foundation to independent tier gates

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, local
  coordinator receipt for names producer `796fa52` and scene foundation
  `c60fd5e` on `Vovanostm/uix-w1-scene`, refs #207/#186 without closure.
  After exact scene worker settlement, coordinator validators ran sequentially:
  names EXIT 0 / 8 of 8 (178 relatedPASS/47SKIP), scene EXIT 0 / 8 of 8 (35PASS);
  both audits PASS and tracked trees clean. This supersedes the interrupted
  names validation status below; worker smoke is not independent acceptance.
  Names advances to Tier L reviewer/evaluator; scene to Tier V evaluator/visual
  critic. Full desktop/native125, contrast and applicable layered-scene proof
  remain gate work, not a waived requirement. Captions/terminal naming and
  inherited scene/tooltip findings retain their existing owners and sequencing.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records the gate handoff;
  no PR/publication/merge/deployment or full-issue acceptance in this receipt.
  Local contracts/reports remain under each slice's ignored `.orca/` directory;
  wiki behavior is unchanged pending delivery. Today three merged playable
  producers (#229/#237/#238); this tick zero merges.

### Route names consumer gaps without claiming full issue acceptance

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, local source
  `796fa52`, refs [#207](https://github.com/Vovanostm/warwrit/issues/207):
  server-owned duplicate labels and optional replay presentation metadata are
  committed; full-contract builder outcome is FAILED, not acceptance.
  Builder reports focused36PASS, related178PASS/47SKIP and validator 8/8;
  these are worker claims, not coordinator gates. Builder played the default
  mill to R11/rev177 and reconstructed the downloaded replay with all12 labels.
  Visible field captions and terminal fighter inspection are sequenced into
  `uix-w1-name-consumers` (Tier V, after names/range-outline/outcome) in local
  `.orca/pipeline/slices-local.json`; producer PR must use Refs, never Closes.
  Native125% and the complete baseline matrix still need independent proof.
  Coordinator validation was interrupted after six checks to respect the scene
  worker's existing serial reservation; related-tests/audit did not complete,
  so no validation pass is claimed. Fresh validate and Tier L review/evaluation
  wait for scene settlement. No PR, merge, deployment or full-issue acceptance.
  Updated [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md); wiki behavior is
  unchanged pending delivery. Local report: `.orca/uix-w1-names/report.md`.

### Record PR238 merge and release single-issue successors

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, local receipt of
  merged [PR238](https://github.com/Vovanostm/warwrit/pull/238): expected
  head `3377996`, merge/main `073a02b`, exact-head CI39271231939 SUCCESS.
  Tier L reviewer1 and played evaluator1 ACCEPT for `3ea21b0`; coordinator
  validate8/8,732PASS/47SKIP,auditPASS; later evidence/shared-record paths PASS.
  #187 remains OPEN for its rendered contour. Names #207 may plan on merged
  main; the former scene #186/#187 scope is split before its next start under
  workflow v3, preserving its old plan and all assigned integration findings.
  [Existing proof](docs/engineering/evidence/uix-w1-skill-reach/README.md) is
  reused; new main playtest/game gates/deployment NOT_RUN.

### Supply current learned-skill geometry for the scene consumer

- 2026-10-19, originating branch `Vovanostm/uix-w1-skill-reach`, published
  producer implementation `3ea21b0`, refs #187; PR/CI pending.
  Pure core query shares existing spatial admission checks; optional protocol,
  server projection and web validation carry all learned skill shapes with
  current actor/activation/revision. Legacy omission/empty geometry supported;
  rules, costs, RNG, replay schemas and visual source preserved.
  Fresh Tier L reviewer and played evaluator ACCEPT; coordinator validate EXIT0,
  8/8,732PASS/47SKIP,auditPASS; evaluator69 focusedPASS and actual baseline/candidate
  mill victory/replay checks. Fresh15 baseline-saved streams match canonical
  state, complete events and accepted counts across schemas1/2 and five rulesets.
  [Evidence and limits](docs/engineering/evidence/uix-w1-skill-reach/README.md).
  Updated CURRENT_PLAN; wiki mechanics unchanged. #187 remains open for rendered
  outline/legend/CVD and integrated scene findings. Hosted full gate pending;
  no merge/deploy or performance/balance measurement claimed.

### Merge the affordability producer and start skillReach planning

- 2026-10-19, originating branch `Vovanostm/uix-w1-skill-reach`, local receipt
  of merged [PR237](https://github.com/Vovanostm/warwrit/pull/237): merge/main
  `0c4b98d`, expected head `ca28ebd`, exact-head CI39257227488 SUCCESS.
  Tier L reviewer/evaluator ACCEPT on `c055e9a`, integrated validate8/8 PASS;
  later source unchanged, merged-tree diff empty, no blocking labels/threads.
  #184 remains open for scene bands/legend/CVD/legacy rendering. Starts only
  the dependent #187 skillReach producer contract; scene/names remain sequenced.
  [Proof](docs/engineering/evidence/uix-w1-affordability/README.md).
  New game checks/main playtest NOT_RUN; no deployment. Local reports retained
  before removing the completed worktree with archive hooks.

### Reconcile PR237 with the latest slice plan before merge

- 2026-10-19, originating branch `Vovanostm/uix-w1-affordability`, published
  producer PR [237](https://github.com/Vovanostm/warwrit/pull/237), merge pending.
  Prior head `7c05b14` passed CI39253806343. Normal main integration
  `1b364d3` includes `06b32bb` (PR236 slice plan); the only conflict was
  additive CHANGELOG entries, both retained. Gated apps/packages are unchanged
  from `c055e9a`; Tier L reviewer1 and played evaluator1 ACCEPT remain applicable.
  Fresh coordinator validator on `1b364d3`: EXIT0,8/8,709PASS/47SKIP,auditPASS.
  Evidence-only and shared-record path checks PASS. New-head hosted CI must pass
  before expected-head merge; no deployment or new playtest claimed.
  #184 stays open for the downstream bands/legend/CVD/legacy scene consumer.
  [Proof and limits](docs/engineering/evidence/uix-w1-affordability/README.md).

### Restore the post-movement attack affordability producer

- 2026-10-19, originating branch `Vovanostm/uix-w1-affordability`, published
  implementation, refs #184 (producer subset only).
  Core derives optional `movementPreview[].attackAffordableAfter` through shared
  admission/resource policy; protocol/server expose it and the web validates its
  shape, including legacy omission. Six owned source/test paths; no command,
  rules/RNG/replay/migration or visual changes. Independent reviewer1 and
  evaluator1 ACCEPT on `c055e9a`; evaluator62 focusedPASS,29 live boundaryPASS,
  96 matched before/after captures with native125%, real move/end-turn and
  UI-autobattle victory R10/rev182 (93 accepted orders; terminal0 extra).
  Main `f365f60` integrated by normal merge `59af0ab`; only additive shared-doc
  conflicts resolved, both histories retained, gated apps/packages unchanged.
  Coordinator integrated validate EXIT 0 / 8 of 8,709PASS/47SKIP,auditPASS.
  Fifteen baseline-saved replay streams on schemas1/2 and five rulesets produce
  identical canonical states, complete events and accepted-command counts.
  Paired 10,000-battle stress matches every deterministic output (duration excluded);
  20 deterministic reruns/100 replay checks PASS. Final hosted clean-checkout CI
  pending before merge.
  #184 stays open for bands/legend/CVD/rendered legacy fallback in uix-w2-scene;
  baseline-only zoom-readback anomaly retained in evaluator provenance.
  [Independent proof](docs/engineering/evidence/uix-w1-affordability/README.md).
  No deployment; performance/balance/capacity NOT_MEASURED.

### Record PR229 merge and start the affordability producer contract

- 2026-10-19, originating branch `Vovanostm/uix-w1-affordability`, local
  receipt of merged [PR229](https://github.com/Vovanostm/warwrit/pull/229)
  from `Vovanostm/uix-w1-projection`: expected head `2508eb6`, merge/main
  `1665527`, owner `agent:merge-approved` present, exact-head
  [CI39243122114](https://github.com/Vovanostm/warwrit/actions/runs/39243122114)
  SUCCESS, no blocking review threads; ordinary merged-tree diff empty.
  #180 is CLOSED / `agent:done`; evaluator4 ACCEPT and existing played proof
  are reused, not rerun. No new game checks or main playtest: NOT_RUN.
  Pipeline tick starts only the #184 producer contract on this branch;
  bands/legend/visual acceptance and issue closure remain with uix-w2-scene.
  Updated CURRENT_PLAN, owning wiki and
  [proof receipt](docs/engineering/evidence/uix-w1-projection/README.md).
  Projection worktree removed with archive hooks after preserving local reports;
  desk/outcome REWORK and successor dependencies remain. No deployment.

### Slices for playtest findings and QA hooks

- 2026-10-19, branch `claude/slices-227-228-235`, studio director: added
  one-issue slices to the Orca plan — #228 as producer `core-preset-deserters`
  (core, Refs) and consumer `uix-preset-picker` (web, closes it), #227
  `uix-overview-zoom` (web, tier V) and #235 `qa-game-hooks` (web) — each
  sequenced with `after` behind every slice that owns the same files (reviewer
  REWORK fixed); `core-melee-connect` tier L; `uix-w4-bow` lane corrected to core.

### Orca workflow v3: contract first, one issue per PR, merge on gates

- 2026-10-19, branch `claude/orca-workflow-v3`, published: owner removed the
  per-PR owner merge gate («На это есть тесты и агент — ревьюер»), asked for one
  issue per PR and a shared contract before parallel work. `warwrit-orca` now
  merges on CI + validate + tier gates (D/L/U/V; art-grade visual critique only
  for art and scene), splits multi-issue slices, starts new epics with an epic
  contract PR ([prompt](.agents/skills/warwrit-orca/prompts/epic-contract.md)),
  reports state changes plus a daily digest; tick prompt updated. Diagnosis of
  v2 and sources in [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#workflow-v3--contract-first-one-issue-per-pr-merge-on-gates--2026-10-19).

### Integrate current main before the approved PR229 merge

- 2026-10-19, originating branch `Vovanostm/uix-w1-projection`, local
  integration for [PR229](https://github.com/Vovanostm/warwrit/pull/229).
  The live `agent:merge-approved` label enables the merge stage. Integrated
  main `6f1fbae` with a normal merge to preserve published commits and avoid
  force-push; resolved only additive CHANGELOG/CURRENT_PLAN conflicts,
  retaining both histories. Main changes are documentation/plan/skill only;
  game source remains the evaluator4-accepted candidate. Prior CI39196517767
  SUCCESS applies to `35c117e`. Fresh coordinator validate on integration
  `128fcb0` PASS8/8 (702 tests PASS/47 SKIP, audit PASS); scoped
  format/diff/added-link checks PASS. Publication and exact-head CI pending.
  No game rule, replay, migration or renderer change; merge NOT_RUN.
  [Current proof](docs/engineering/evidence/uix-w1-projection/README.md).

### Repair the web validator fixture after PR229 CI failure

- 2026-10-19, originating branch `Vovanostm/uix-w1-projection`, published
  correction for [PR229](https://github.com/Vovanostm/warwrit/pull/229):
  CI39192938216 exposed server imports in the web validator regression fixture.
  Commit `9c92995` replaces them with protocol-shaped synthetic data in
  `apps/web/src/combat-lab/view-validation.test.ts`, preserving all eight
  regression bodies and the separate real server integration tests. Production
  code is unchanged from accepted `fa7f516`. Coordinator validation8/8,
  702PASS/47SKIP and normal45-file audit PASS; fresh evaluator4 ACCEPT,
  25 focused tests, web typecheck/input-boundary and day/night smoke PASS.
  The initial audit with validator-only coverage failed; focused server
  coverage restored the normal audit. Historical bootstrap/matrix/replay proof
  remains attributed below; new-head hosted CI and owner-approved merge pending.
  [Proof and limits](docs/engineering/evidence/uix-w1-projection/README.md).

### Publish ordinary attack refusal projection for UIX-01a

- 2026-10-19, originating branch `Vovanostm/uix-w1-projection`, published in
  [PR229](https://github.com/Vovanostm/warwrit/pull/229): #180 and owner D1 require one optional server-owned
  refusal or preview per active public enemy. Core admission is shared by
  execution and projection; protocol/server publish sanitized refusal facts,
  and the web boundary rejects malformed previews before overlap traversal.
  Paths: `packages/game-core/src/combat/`, `packages/protocol/src/combat-lab.ts`,
  `apps/server/src/combat-lab/`, `apps/web/src/combat-lab/view-validation{,.test}.ts`.
  #184 was extracted by normal revert for reuse in its own slice; #187/#207
  remain downstream. No rules/RNG/replay/migration change. Independent eval3
  ACCEPT, validator 8/8 and clean bootstrap PASS (833PASS/47SKIP,10kstress,
  14DB); paired stress and15 saved replay streams equal. Native125% and all
  three day/night source pairs captured. CI/merge pending; privacy is limited
  to the all-visible lab. [Proof and limits](docs/engineering/evidence/uix-w1-projection/README.md).

### Studio operating model, mechanics reconciled with S4, art lane, melee slice

- 2026-10-19, branch `claude/studio-operating-model`, published (PR pending
  owner merge label): owner «продолжай работать автономно, ты — директор
  студии и отвечаешь за качество продукта». Added the
  [studio operating model](docs/engineering/AGENT_TEAM.md#studio-operating-model--2026-10-19)
  (decision rights, cells/lanes, daily digest, quality bar, retro, order of
  work). Director's audit found the mechanics wiki behind the code: zone of
  control, morale/flight/surrender, telegraphed intent and height/mud/fire are
  already in sprite S4 (PR157) — pages and the index now say so with source
  links; melee-always-connects (owner 2026-10-07) is still not implemented.
  Added the [warwrit-art](.agents/skills/warwrit-art/SKILL.md) skill with
  `scripts/composite.py` (crop/paste/diff; smoke PASS). Opened issue #225 and
  slice `core-melee-connect` (lane core, after `uix-w1-names`;
  `uix-w4-bow` now after it). Director playtest of the combat lab (main
  `8486177`, 1440×900): no battlefield overview at max zoom-out (#227);
  default scenario has only beasts/creatures, so morale/flight/surrender never
  show — human «deserter band» preset requested (#228); autobattle 8 rounds,
  5:0, deterministic seed (noted on #173). Docs/plan only; no game code changed.

### Switch the Orca pipeline to game-development workflow v2

- 2026-10-19, originating branch `claude/orca-workflow-v2`, local/PR pending:
  owner asked to prepare the agent team and a working development workflow
  after the first pipeline day produced no commit or PR. The `warwrit-orca`
  skill now defines roles (coordinator, contract writer, lane builder,
  evaluator, visual critic), replaces plan + plan review with a short contract,
  caps writers to one per lane (`web`, `core`), requires builds to end in
  commits, has a fresh evaluator play the changed journey in `pnpm dev:combat`
  plus a VISUAL_CRITIQUE-scored critic for visual diffs, and adds a fallback
  ladder (restructure, split a one-issue finding, split oversized slices)
  before `needs-owner`. Slice plan: `lanes`, `lane` per slice, #207 split into
  `uix-w1-names`, `uix-w4-text` now waits for `uix-w2-log`. PR223 (audit before
  commit, wall-clock loop) MERGED bf0ce5b 2026-10-19. Paths:
  `.agents/skills/warwrit-orca/`, `docs/engineering/AGENT_TEAM.md`,
  `docs/engineering/CURRENT_PLAN.md`. Checks: prettier; skill/prompt readback;
  live tick under v2 NOT_RUN until merge.

### Run the commit audit before workers commit

- 2026-10-18, originating branch `claude/orca-audit-early`, local/PR pending:
  owner review of the running pipeline. `uix-w1-desk` and `uix-w1-outcome`
  exhausted both recoveries because workers first met the pre-commit
  `pnpm check:changes` audit (cyclomatic/cognitive complexity, CRAP) when the
  commit was rejected. Worker plan/implement briefs now require shaping code for
  that audit and running it before each commit; `scripts/orca-validate.sh` runs
  the same audit. The skill records the owner's one-extra-recovery allowance for
  audit-only blockers and how a `needs-owner` slice resumes from its existing
  worktree after an owner decision on #217; decisions are #217 comments headed
  `## Owner decision`, because owner and coordinator share one GitHub account.
  The `--loop` mode of `scripts/orca-pipeline-tick.sh` now holds `caffeinate -i`,
  counts its interval in wall-clock time (macOS `sleep` stalled the loop from
  16:02 to 22:23 while the Mac slept) and ticks early when a worker reports.
  Paths: `.agents/skills/warwrit-orca/` (SKILL.md, prompts),
  `scripts/orca-validate.sh`, `scripts/orca-pipeline-tick.sh`.

### Let the pipeline coordinator resolve slice ownership

- 2026-10-18, originating branch `claude/orca-ownership-rules`, local/PR pending:
  the second coordinator tick stopped `uix-w1-outcome` and `uix-w1-log` with
  `needs-owner` because the slice plan omitted tests, gave `CombatLab.tsx` to two
  slices and lacked historical morale facts for #204. Slices now own their
  tests; outcome owns the autoplay/terminal part of `CombatLab.tsx`; the log
  slice moves to wave 2 after projection/outcome/desk and owns additive morale
  event facts. The coordinator extends ownership itself when no active slice
  owns a file and sequences otherwise. Merged PR221 recorded (585af1f).

### Make the Orca pipeline run headless Codex workers

- 2026-10-18, originating branch `claude/orca-headless-workers`, local/PR pending:
  owner asked to make agent auto-execution work under the organization Codex
  policy. Workers and the coordinator run `codex exec --approve-for-me` from
  plain Orca terminals with non-injected Dispatches (`orca-start-worker.sh`,
  `orca-codex-worker.sh`, result schema); `orca-pipeline-tick.sh` runs one
  coordinator tick or a visible loop; `slices/epic-217.json` covers all 39
  issues; skill and prompts rewritten for headless reporting. Merged as
  [PR221](https://github.com/Vovanostm/warwrit/pull/221) (585af1f). Smoke: setup,
  sandboxed commit, worker_done, orca/gh/git-push probe PASS; first full tick
  NOT_RUN at commit time.
  [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#issue-pipeline-in-orca--2026-10-18).

### Run issues through an Orca pipeline

- 2026-10-18, originating branch `claude/orca-issue-pipeline`, local/PR pending:
  owner decision to implement issues only through Orca orchestration with Codex
  workers. `warwrit-orca` now defines the plan → plan review → implement →
  validate → review → PR/CI → owner-approved merge → docs state machine with
  GitHub `agent:*` labels; worker prompt templates; deterministic
  `scripts/orca-validate.sh` and `scripts/orca-issue-state.sh`. First wave
  launch failures and prerequisites recorded in
  [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#issue-pipeline-in-orca--2026-10-18).
  Validate gate PASS on its own branch; end-to-end run NOT_RUN.
  Merged 2026-10-18 with owner approval: [PR220](https://github.com/Vovanostm/warwrit/pull/220),
  merge `e001c25`, CI PASS.

### Configure Orca for parallel agent worktrees

- 2026-10-18, originating branch `claude/orca-parallel-setup`, local/PR pending:
  owner asked to configure Orca for maximum safe agent parallelism. Added
  `orca.yaml` (setup/archive hooks, wait-for-setup, Agent/Shell tabs, issue
  command), `.worktreeinclude`, `scripts/orca-setup.sh` (frozen install, package
  builds, private combat-lab ports) and `scripts/orca-archive.sh`;
  `pnpm dev:combat` reads `.worktree-ports`; new `warwrit-orca` coordinator skill.
  Research and limits in [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#orca-parallel-worktrees--2026-10-18).
  Setup, dual-port combat lab and archive cleanup PASS on a fresh worktree;
  Orca hook execution and a supervised run NOT_RUN until merged.
  Merged 2026-10-18 with owner approval: [PR219](https://github.com/Vovanostm/warwrit/pull/219),
  merge `0763bc4`, CI Verify clean checkout PASS.

- 2026-10-17, originating branch `codex/combat-readability` → `main`, merged:
  owner-authorized [PR160](https://github.com/Vovanostm/warwrit/pull/160),
  reviewed1bb92aa/merge94bfe2558ec7ad48a2b3e2b596796131c0caacae,
  ordinary reviewed-to-merge tree diff empty. Deliver whole sharp portraits/
  figures, vitals below portraits/feet, larger shared cells and readable ink
  terrain/banks for edited/generated battles, preserving rules and navigation.
  Full independent visual ACCEPT, source reviews DONE; cleanCI39051364869
  SUCCESS820unit/47SKIP/10kstress/20determinism/100replay/14DB/coverage/66fileaudit
  (8inherited excluded). Actual main5336/3036 day-night/navigation/geometry/
  move/endturn/autobattleR9rev163/terminal/restart PASS. Primary dirty WIP and
  other stand preserved. This receipt changes only Markdown; game tests NOT_RUN
  for it. Retain failures/history, nonblocking rut/fire polish and finite limits.
  [Merged result and provenance](docs/wiki/battlefield-test-maps.md#поставка-pr160-в-main--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local follow-up after
  73a4d40 CI39048861412 FAIL at boundaryCRAP30: build the common emphasized-ID
  list once per marker refresh and reuse it in per-unit outline application.
  Same source membership/visibility/colors; independent source readback confirms
  freshness and equivalence, types/lint/markers4/browser day-night-day PASS.
  Fresh local coverage820PASS/47SKIP and pinned-main66-file audit PASS
  (8inherited excluded); first upstream-only1fileaudit was repeated with main.
  No gate/test limits or visual changes. Current visual ACCEPT retained;
  new-head CI/merge pending. [Owning result](docs/wiki/battlefield-test-maps.md#авторские-материалы-и-узкий-связный-уступ--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local correction after published
  ee3103a CI39046615446 FAIL: factor the same active/night/emphasis condition
  in `sprite-battle-scene.ts` to remove a fresh-coverage cyclomatic6/CRAP42
  regression. Independent source readback confirms all8 boolean states;
  types/lint/markers4 PASS. No visual/command behavior change or gate suppression.
  Record full ee3103a absolute visual ACCEPT (21images+2references, game all2,
  close3/3/2/2/2/2/2), normal66-file audit PASS, clean reload and remaining polish
  in the existing wiki/index/log/current plan. New-head CI/merge pending.
  [Result and CI boundary](docs/wiki/battlefield-test-maps.md#авторские-материалы-и-узкий-связный-уступ--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local technique correction
  after d185b71 full visual REJECT: replace fine uniform earth with original
  ink-yard-earth, classify authored plate stone/soil masses into fixed-scale
  materials, attach real-field UV to physical slopes, narrow connected banks
  around deterministic0.78–0.88radius plateaus, and show inked exposed earth.
  Add original alpha ruined-yard fringe/provenance outside canonical field and
  as art for existing blocked cells; no new obstacles or rules. Preserve centres,
  shared corners/grid/picks/feet, spacing/height, sprites/bars/night and camera.
  Affects combat-lab terrain/scenery, shared renderer surface/test and assets.
  Independent source review DONE; types/lint/content114/geometry5 and fresh
  all-profile/generated-map/day-night/desktop/geometry/navigation/combat/terminal/
  restart browser checks PASS. Full absolute visual review PENDING; no current
  publication/CI/merge claimed. [Owning result](docs/wiki/battlefield-test-maps.md#авторские-материалы-и-узкий-связный-уступ--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local documentation update at
  owner request: record completed d185b71 full visual REJECT (all21images and
  both references; game2/2/1/2/2/2/1, close3/3/1/2/2/2/1) in the existing
  battlefield wiki, index, log and CURRENT_PLAN. Night improves to2; ground
  composition/material language and visible elevations remain blockers requiring
  a technique change. Separate disputed target-occlusion observation from
  confirmed findings. Record normal61-file audit PASS, live draft PR160 head
  793ebd3/maina934355 and unexecuted current-head CI/publication/merge.
  Documentation-only diff/format/local-link readback; game tests NOT_RUN for
  this edit. Earlier results retained.
  [Current result](docs/wiki/battlefield-test-maps.md#цельный-рисунок-поля-и-светотень-высот--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local correction after full
  793ebd3 visual REJECT (game2/2/1/1/2/2/1,close3/3/1/1/2/2/1) despite clean
  CI39034184313 SUCCESS. Add an original full-field ground plate/provenance,
  fixed-world-size paving/soil and a finite yard/path blend (direct plate
  stretching rejected in previews), actual surface-normal relief lighting,
  brighter night key forms/neutral
  silhouette edges and varied existing fire scales/placements. Preserve
  connected geometry, spacing/height, camera bounds, picking/feet and rules.
  Explicit0/1/2-unit captures/bar geometry PASS on published version; relief
  writer scoped types/lint/format PASS. Fix confirmed steep-bank normal gating
  and shared outline texture disposal; independent source readback DONE.
  Fresh maps/desktop/day-night/bars/picks/layers/navigation/extremes/explicit
  height captures/scoped types/lint/content112/real combat/terminal/restart/
  shared-outline cache lifecycle and clean reload PASS. Focused16 PASS after
  isolated repeat of an initial concurrent browser-load timeout; limits
  unchanged. Full visual review was running at this commit (completed REJECT
  in the dated correction above); CI/publication/merge pending. Refresh owner-requested wiki/index/log/current plan with
  actual CI and scored rejection; preserve earlier failures and asset limits.
  [Result and technique](docs/wiki/battlefield-test-maps.md#цельный-рисунок-поля-и-светотень-высот--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local courtyard correction and
  owner-requested wiki refresh: quiet fine earth replaces recognizable rut
  repeats; a finite authored courtyard connects the extracted mill scenery,
  with detailed cobbles at close zoom. New assets/prompts/provenance and
  combat terrain/shader/scene/manifest updated; canonical geometry/rules and
  camera bounds unchanged. Independent source review DONE; fresh maps/desktop/
  day-night/layers/geometry/navigation/extremes/real move/all3pools/terminal/
  restart/clean console PASS; types/lint/content110/format PASS. Full visual
  review pending; current CI/merge/main journey NOT_RUN.
  Preserve prior visual REJECT and historical CI outcomes. Wiki/index/current
  plan and wiki log distinguish the local stand from published1b47872/PR160
  and actual main. Mandatory main-based56-file commit audit PASS,8 inherited
  findings excluded; no audit bypass.
  [Current result and asset limits](docs/wiki/battlefield-test-maps.md#композиция-двора-и-мелкий-грунт--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local correction after full
  1b47872 visual REJECT despite successfulCI39024500756: extract true-alpha
  mill scenery with source/provenance, remove rectangular authored-floor sampling
  and zoomfade, register field/apron textures to one projected ground plane,
  use hashed source/phase ink patches and explicit texture gradients. Actual
  terrain geometry/picking/feet/rules unchanged. Source/types/lint/content108
  PASS; fresh GPU geometry/maps/layers/navigation/extremes/actual combat and
  clean-browser launch/reload PASS. Full critique REJECT game rendering/integration1,
  closeall2; nextsite-wide composition/currentCI pending. Original assets
  preserved; no migrations/deployment.
  [Owning correction](docs/wiki/battlefield-test-maps.md#scenery-cutout-and-shared-projected-ground--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local terrain correction:
  add a dedicated seamless3-source ink-earth shader,2original ground variants
  with prompts/provenance and a zoom-dependent authored-yard blend; restore
  ordinary world sampler behavior. Normalize optional ground sampling once,
  removing2new complexity findings without changing thresholds. Addresses
  published16c2811 visual REJECT and CI audit FAIL. Affects combat-lab terrain,
  scene/material wiring and asset manifest; rules/picking/foot geometry retained.
  Source review/types/lint/content107 and actual maps/desktop/layers/geometry/
  movement/pools/terminal/restart PASS. Full visual/currentCI/merge pending.
  [Result and limits](docs/wiki/battlefield-test-maps.md#layered-ink-earth-correction--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local documentation update at
  owner request: refresh wiki landing/index and current plan for published game
  candidate16c2811/PR160; replace stale leading PR157 status with current behavior,
  actual checks, previous visual rejection and remaining acceptance/CI/merge.
  Preserve dated delivery history and distinguish candidate stand from main.
  Markdown format/local-path/anchor/diff checks PASS; game tests NOT_RUN
  for the documentation edit. Record full16c2811 visual REJECT and CI audit FAIL,
  plus local normalization of authored-ground inputs that removes the two new
  complexity findings; types/lint/strict45-file audit PASS, newCI pending.
  Document the local3-source ink-earth/zoom fade correction separately:
  source readback/types/lint/content107/audit PASS. First browser attempt
  NOT_RUN (closed session); reopened shader/maps/desktop/day-night/bars/picks/
  extreme bounds and actual move/pools/terminal/restart PASS. Full critic/CI
  pending. Local stand differs from published head.
  [Current wiki](docs/wiki/battlefield-test-maps.md#текущее-состояние--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local visual technique revision:
  full b5a193c/08c2800 critique REJECT(2/2/1/1/2/2/1) exposed a rectangular
  mill edge, low-detail ground and mismatched night lighting. Add irregular
  backdrop alpha, registered authored-yard sampling on the shared cell surface,
  an original rutted earth asset/provenance with preserved directional ink, and
  coordinated near/far night values. Canonical terrain/picking/rules unchanged.
  Types/lint/content105/main-based audit and fresh shader/browser captures PASS;
  current full critic/CI/merge pending. [Owning result](docs/wiki/battlefield-test-maps.md#authored-ground-composition--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local final bound correction:
  source review confirmed projected physical bounds could exceed the finite
  camera-facing apron at extreme pan. Clamp to its reference-image rectangle;
  generated15×11 edge cells remain reachable. Four extreme drag corners/
  full-viewport apron/0POST and23camera/types PASS. Previous b5a193c cleanCI SUCCESS
  (820/47SKIP,10kstress,14DB,41-file audit); new-head verification pending.
  [Owning result](docs/wiki/battlefield-test-maps.md#combined-perspective-and-readability--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local integration of main
  a934355/PR159 into PR160: retain perspective/bounds and connected surfaces;
  share2.6spacing/.28height across grid/picking/feet; derive field strips in
  perspective screen pixels. Replace discrete banks and hex-edged surface
  patches with connected geometry and irregular material blending; keep quiet
  terrain extension behind the bounded painting. Preserve both branches' history.
  820coverage/47SKIPPED,27camera/geometry/types and main-based52audit PASS before
  final shader delta; actual12bar32×16/4px and0ground-pick errors PASS.
  Initial import/shader/audit failures corrected, recorded in the
  [owning result](docs/wiki/battlefield-test-maps.md#combined-perspective-and-readability--2026-10-17).
  Fresh absolute critique/currentCI/merge pending.

### Combat readability and reusable terrain

- 2026-10-17, branch `codex/combat-readability`, local correction to
  [PR160](https://github.com/Vovanostm/warwrit/pull/160): frame deployed forces
  instead of empty map margins; retain fixed authored mill scale; use near/far
  unit sampling and night presentation; add two original fire variants with
  provenance. Addresses c50ba37 absolute visual REJECT while retaining its
  accepted native sprite detail. Source readback DONE; framing5/content104/
  types/lint/main-based44-file audit PASS. Full visual/current-head CI/merge
  pending. [Owning result](docs/wiki/battlefield-test-maps.md#forces-overview-and-distance-sampling--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local correction to
  [PR160](https://github.com/Vovanostm/warwrit/pull/160): full-resolution unit
  sampling, clearer night values and a nonpickable feathered terrain margin
  address absolute visual REJECT on6a63481 despite its green cleanCI. Vary fire
  footprint placement without mirroring. Fix reviewed margin winding;2geometry/
  types/lint/main-based40-file audit PASS. New reference sheet uses actual
  native close/game GPU captures, correcting the earlier enlarged gamecrop.
  Full repeat visual/currentCI/merge pending; owning wiki retains prior results.

- 2026-10-17, branch `codex/combat-readability`, published draft
  [PR160](https://github.com/Vovanostm/warwrit/pull/160), local correction:
  backdrop-off GPU probe exposed culled bank faces; fix Babylon winding and
  upward lip normals. Blend two continuous world texture scales to reduce
  motifs without stretching ink. Initial cleanCI bootstrap PASS but coverage
  timed out on512outline; optimize exact boundary stamping, retain5s limit and
  add independent pixel oracle. Current full815coverage/47SKIP/types/lint PASS,
  source review DONE. Previous visual timebox BLOCKED; current full absolute
  review/newCI/merge pending. Owning wiki preserves failures and evidence.

- 2026-10-17, branches `codex/combat-terrain-banks` → `codex/combat-readability`,
  local: integrate deterministic segmented earth banks and narrow soil lips
  under raised hexes, preserving canonical tops/grid/picking; new ink earth
  asset/provenance and cell-wide charred fire footprint replace rejected
  materials. Root fixes reviewed bank UV seams and inward-corner sign with
  signed regression. Focused30/types/lint, content102assets and strict38-file
  audit PASS before final lip correction; final geometry check PASS. Full
  visual re-review/CI/merge pending; owning wiki records initial check failures.

- 2026-10-17, branch `codex/combat-readability`, local visual correction active:
  full independent78e80c6 visual REJECT on box-shaped heights, grainy ground
  and undersized fire footprint; portraits/field bars/dense focus intact.
  Change technique to natural banks, ink ground and cell-wide fire; current
  source78e80c6/pool/move/terminal/delayed-focus checks recorded in the owning
  wiki. Final re-review, CI and merge pending.

- 2026-10-17, branch `codex/combat-readability`, local integration correction:
  physical presentation spacing2.6 replaces1.4 after two independent dense
  reviews found foreground beasts hiding rear foot strips. Preserve figure
  size, canonical coordinates/occupancy/range/AP/LOS/replay. Start focused on the
  actor at zoom4.8; portrait/log selection focuses a unit, Home returns the
  overview, and new activations follow the actor. Resize uses the HUD opening;
  deliberate pan/zoom is retained. Source review exposed Home focus, inactive
  selection and an async focus race; fixes retain pending intent and handle Home across
  non-editable battle controls without moving keyboard focus. Bar32×16 and portrait inset integrated. Strict main-based34-file audit
  PASS after correcting a failed key-handler complexity check, without gate
  suppression. Source readback DONE; navigation/keyboard0POST and29focused/
  types/lint/format PASS; combined visual/clean CI/merge pending.
  [Current integration](docs/wiki/battlefield-test-maps.md#shared-spacing-and-action-camera--2026-10-17).

- 2026-10-17, branch `codex/compact-foot-bars`, local: owner rejects connector
  arms and requires narrow tracks directly under battlefield figures. Preserve
  width32 and fixed4px foot gap; raise the three-row strip from12 to16px with
  clearer fill contrast after independent critic found weak overview/night row
  separation. No callouts, horizontal shifts, rule changes or input targets.
  Web types/scoped lint and27 existing focused tests PASS; full813unit/47SKIP
  coverage PASS before the bounded observer cleanup. Current DPR1/2 geometry
  captures cover1280/1440/1920 and maxzoom2.2. Real pools/texture, heights,
  terminal and restart probes PASS. Source reviewer found
  no defect in the frozen module diff. Dense large-creature occlusion remains
  a shared-scene integration blocker; no final visual ACCEPT or merge claimed.
  Manual main-based audit FAIL only in unchanged inherited road/terrain
  functions (`createRoadMaterial`, `setNight`); no bar-module finding remains.
  Initial local checkpoint used the work-branch exception (normal hook
  NOT_RUN); superseding isolated audit with `FALLOW_AUDIT_BASE=aa71d46`
  PASS for the two changed files. The final local checkpoint runs the normal
  commit hook against that same slice base. Common PR integration still requires
  strict main-based audit; inherited findings must be fixed before publication.
  No gate/config suppression is introduced. Second absolute visual review REJECT
  on dense-creature occlusion (scene integration1; remaining criteria2, motionN/A);
  the common owner must validate the larger shared spacing before acceptance.
  [Owner correction and shared delivery](docs/wiki/battlefield-test-maps.md#owner-correction-compact-foot-strips-no-callouts).

- 2026-10-17, branches `codex/combat-portrait-fit` → `codex/combat-readability`,
  local integration: give every portrait a4CSSpx art inset while preserving
  the full measured silhouette/aspect and 130px cards. All20 profiles across
  3desktop sizes passed72bounds checks (minimum5px including frame); actor,
  forecast, inspection and actualDPR2 also passed with0actionPOST. Independent
  narrow source/visual review ACCEPT. Also ignore modifier shortcuts when
  preserving user camera navigation; full integrated critique/CI/merge pending.

- 2026-10-17, branch `codex/combat-readability`, local: integrate the owner's
  explicit rejection of callout arms; compact32×12 foot-sorted tracks remain
  directly4px under sprites. Record isolated bar/portrait ownership and the
  superseded placement experiment. Correct camera resize after click jitter:
  a deliberate pan uses the same5px threshold as the camera, zero wheel delta
  does not suppress reframing. Actual click-jitter/resize and pan/resize with
  0actionPOST,17focused tests, web types/lint PASS. Final integration acceptance,
  clean CI and merge pending; [owning result](docs/wiki/battlefield-test-maps.md#общая-интеграция--2026-10-17-local--acceptance-pending).

- 2026-10-16, branch `codex/combat-readability`, local implementation under review:
  measured 20-profile portrait bounds/B037 pivot; selective high-resolution
  outlines; larger shared hex layout; common pool rows in queue and field;
  reusable canonical-cell terrain with the world's natural sampler. Primary
  research and first source/visual REJECT recorded in the owning wiki. Camera,
  rubble order/UV, footer and dense-field placement defects are being corrected.
  Focused37 checks/types/lint and809-unit coverage PASS; first complexity audit
  FAIL, strict visual acceptance/publication/merge pending. No rule/schema change.

- 2026-10-16, branch `codex/combat-readability`, local activation: owner rejects
  current softness/terrain ambiguity/cramped hexes/cropped portraits and asks
  for health/armor/morale bars below queue icons and field figures, reusable
  map rendering, stronger research and independent critique. Existing owning
  wiki amended; primary WIP preserved, HUD writer isolated. Implementation and
  current acceptance NOT_RUN; previous scoped ACCEPT does not accept this cycle.

### Publish evidence-backed autonomous M1 tasks

- 2026-10-17, branch `codex/combat-wiki-checkpoint-20261017`, local docs / published tasks:
  owner requested a fresh implementation/gap/quality audit and GitHub tasks.
  [Epic161](https://github.com/Vovanostm/warwrit/issues/161) plus16issues162–177
  now own finite scopes, pinned evidence, dependencies, DoD and mandatory wiki
  closeout; issue payloads read back exactly. Existing #8/#6 and PR134/160/129
  are reconciled without duplicating work or treating historical gates as current.
  Wiki M1/index/log, CURRENT_PLAN and M1_PRODUCTION_PLAN updated; stale absolute
  c06 readiness link replaced with tracked local document. Source links/DoD/DAG,
  Markdown/diff and local-link checks PASS. Game code/runtime/player DB unchanged;
  new game/full-gate/visual checks NOT_RUN, FPS/enjoyment NOT_MEASURED.
  [Owning queue](docs/engineering/M1_PRODUCTION_PLAN.md#current-github-execution-queue--2026-10-17).

### Reconcile combat wiki with verified delivery

- 2026-10-17, branch `codex/combat-wiki-checkpoint-20261017`, local:
  owner requested memory/wiki update after review and main readback.
  Existing battlefield page, wiki index/log and CURRENT_PLAN now distinguish
  merged PR157/158/159 from draft PR160 at16c2811 (CI39019195821 FAILURE,
  current visual acceptance pending). Verified clean local/remote main a934355;
  no game code, migrations or other writers' WIP changed. Scoped Markdown
  formatting, relative-link/readback and diff checks PASS; gameplay/full gate/
  new visual critique NOT_RUN for this documentation-only amendment.
  [Owning dated checkpoint](docs/wiki/battlefield-test-maps.md#сверка-поставки--2026-10-17).

### Match battle grid and figures to painted perspective

- 2026-10-17, originating branch `codex/battle-camera-bounds`, merged:
  [PR159](https://github.com/Vovanostm/warwrit/pull/159), reviewed6533ae7 →
  main2285c85 with identical tree. Perspective field/figures, full-viewport map
  bounds and connected height surface delivered. Full independent visual ACCEPT
  (all7game/close2/2). CleanCI39006743444 SUCCESS:810unit/47SKIPPED,
  10kstress/20determinism/100replay,14disposableDB,coverage/strict15-file audit.
  Actual main5344:12figures/day-night/keys-drag-wheel/no void/ratio1.421176/
  stablepositions/0navigationPOST; real defence200/1POST/nextactor PASS.
  No canonical rules/protocol/migrations/deploy change; this closeout Markdown only.
  [Merged result](docs/wiki/battlefield-test-maps.md#поставка-перспективы-и-границ-камеры-в-main--2026-10-17).

- 2026-10-17, branch `codex/battle-camera-bounds`, local connected terrain:
  full5b88278 visual review rejected separate hex plinths (integration1).
  Shared-corner slopes now join canonical cell centres; ground/fill/grid/picking
  share one surface. Removed obsolete walls/banks/level-plane seam picker.
  Focused26/types/lint/format PASS;810coverage+47SKIPPED before seam-helper
  extraction. Real editor0/1/2/crowded/day-night/4widths/165picks/hover-pin/0POST
  PASS. Initial matrix/winding/audit failures fixed; strict15-file audit PASS.
  Full same-critic absolute visual ACCEPT(all7game/close2/2); new CI/merge pending.
  [Owning result](docs/wiki/battlefield-test-maps.md#связная-поверхность-вместо-отдельных-тумб--2026-10-17).

- 2026-10-17, branch `codex/battle-camera-bounds`, local height correction:
  top UV now lifts its ground footprint; continuous earth-side UV/vertex shade
  replaces repeated dark strips. Shared display height0.28 keeps tops, figures,
  grid and picking aligned; canonical height/rules unchanged. Focused27/types/
  lint/format/coverage811+47SKIPPED/audit14files PASS. Real editor0/1/2 archers,
  165ground hits/body hover-pin/0POST PASS. Earlier numeric expectation failed,
  corrected. Full current visual/new-head CI/merge pending; prior874dc2f CI SUCCESS.
  [Owning result](docs/wiki/battlefield-test-maps.md#читаемая-высота-и-непрерывная-земля--2026-10-17).

- 2026-10-17, branch `codex/battle-camera-bounds`, local technique correction:
  repeat visual integration1 rejected the wire lip. Real non-pickable earth
  banks now show exposed height volume; original canonical top/vertical pick
  faces retained. Hex-mesh geometry regression covers default/banked variants.
  Prior close comparison accidentally upscaled a game crop; replaced by native
  minZoom229px crop/reference-downscale evidence.22focused/types/lint/
  coverage811+47SKIPPED/audit PASS. Same-critic full repeat/new-head CI/merge
  pending; CI38997076787 SUCCESS covers intermediate132156b, not this geometry.

- 2026-10-17, branch `codex/battle-camera-bounds`, local review correction:
  CI38991283029 SUCCESS on1907d8c; full visual REJECT exposed weak height
  boundary/oversized hard contact ovals. Actual height transform confirmed;
  exposed upper-lip ink/stronger earth sides and compact vertex-alpha contact
  wash improve ground integration. No canonical height/rule/picking changes.
  Web types/lint/coverage811+47SKIPPED/audit PASS; full same-critic repeat and
  new-head clean CI/merge pending. Prior critic timed out/incomplete, not PASS.

- 2026-10-17, branch `codex/battle-camera-bounds`, local: owner reported the
  orthographic grid/figures against a perspective background. Fixed pinhole
  reference plus off-axis pan/zoom now governs field and figures; projected
  raised-ground UV/wheel anchors preserve registration, map bounds retained.
  GitHub Three.js/Babylon/fSpy mechanisms inspected; no dependency added.
  Camera18/web types/lint/coverage811+47SKIPPED/strict audit PASS.
  Actual4sizes/day-night/pan-zoom registration/165ground hits/body inspection
  with0POST PASS; independent visual/current-head clean CI/merge pending.
  Prior PR159 bb55f5b CI SUCCESS covers only the superseded bounds candidate.
  [Owning research/result](docs/wiki/battlefield-test-maps.md#перспектива-сетки-и-фигур--2026-10-17).

### Confine the battle camera to the painted map

- 2026-10-16, branch `codex/battle-camera-bounds`, local: owner requested
  removal of black space beyond the battle map and authorized review/merge.
  Optional shared camera bounds constrain the whole viewport through keys,
  drag, zoom, fit and resize; sprite scene supplies actual projected backdrop
  edges. Other camera consumers retain existing behaviour. Camera15, web
  types/lint, coverage808+47SKIPPED and strict changed-file audit PASS.
  Initial typecheck prerequisite/test typing failures fixed; actual browser
  4desktop sizes/day-night/keys-drag-wheel-resize/0POST/stableunits PASS.
  Author source review no concrete findings; independent visual/clean PR CI/merge
  pending. No domain, protocol or migration changes.
  [Owning result](docs/wiki/battlefield-test-maps.md#ограничение-камеры-областью-карты--2026-10-16).

### Live initiative queue and reduced combat HUD

- 2026-10-16, branch `codex/live-combat-ux`, merged:
  [PR158](https://github.com/Vovanostm/warwrit/pull/158) at main5c0b7eb,
  reviewed source e784608 with identical merge tree. Live canonical queue and
  current-state forecast replace the unknown-order placeholder; edge-aware
  arrows expose the full strip. Decision prices/risks stay visible; duplicate
  actor/neutral copy and obsolete terminal dock are removed. Draft A selected.
  Clean CI38922603699 PASS:806unit/47SKIPPED,10kstress,14disposableDB,
  coverage/audit29files. Independent source review no concrete findings;
  final absolute visual ACCEPT(all7scores2, motionN/A), after correcting
  overflow/terminal findings and replacing a timed-out repeat critic.
  Merged-main browser restart12units/scroll/inspection0POST/day-night/accepted
  defend+canonical queues PASS. Source/game rules/schema remain scoped as
  recorded in the owning wiki; balance/FPS/fullM1 NOT_MEASURED. This dated
  receipt supersedes the activation/local-pending status below.
- 2026-10-16, branch `codex/live-combat-ux`, local implementation: canonical
  core order function now projects the next round through the optional lab DTO.
  Web renders remaining/current portraits and a distinct forecast, removes the
  unknown-order placeholder/duplicate actor and retains decision costs/risks.
  Two raster drafts and exact provenance are tracked; A is selected.
  Core/protocol/server/web types and48focused checks PASS;805unit/47SKIPPED
  coverage PASS. Real4desktop-size/inspection0POST/guard-refresh PASS.
  Source review found no concrete issue. First visual REJECT exposed missing
  scroll affordance and obsolete terminal panels; visible arrows and active-only
  dock correct both, repeat critique pending. Main8f7ad25 includes PR157;
  current48focused/types/audit PASS. Clean PR gate/publication/merge pending.
- 2026-10-16, branch `codex/live-combat-ux`, local: owner authorizes raster
  drafts, implementation with subagents, PR/review and merge to default main.
  Existing [UX research and approved queue behaviour](docs/wiki/battlefield-test-maps.md#проверка-текстов-и-избыточности-ux--2026-10-16)
  retained in the owning wiki. Separate worktree starts from integrated
  e87a379 including sprite-outline repair; primary and other active worktrees
  untouched. Parent owns web/shared docs; separate pure-forecast author and
  image-draft author have disjoint paths/checkouts. Checks and delivery pending
  at activation; no campaign writes, deployment or paid services.

### Resume sprite combat as an isolated, deliverable improvement cycle

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: owner requested
  worktree/subagent development, current wiki, merge and main validation.
  Main-based isolated snapshot integrates the existing sprite combat code,
  editor, art and approved history while preserving primary WIP and excluding
  unrelated SupplyShop/launch edits. A fail-closed V1 projection invariant is
  retained for the sprite-only surrendered status; no historical DTO widening. Existing unit coverage
  755PASS/47SKIPPED; playable5330/API3030 starts. Initial audit missingcoverage
  ERROR then covered FAIL on complexity/duplication; intermediate snapshot
  precommit audit NOT_RUN under AGENTS work-package exception because later
  steps replace failing modules. No bypass permitted on published/main/merge
  heads. Module cleanup, skills editor, current visual/gameplay review and
  full clean delivery gate remain required. CURRENT_PLAN owns sequencing.

### Editable technique ranks and shared combat phases

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: per-unit sandbox
  technique ranks/default/empty presets, metadata from the canonical skill
  catalogue, and warnings preserving incompatible learned ranks. No campaign XP
  or new perk tree. Protocol catalogue, server custom setup, editor and
  SkillLoadout affected. Focused22 checks PASS; initial server typecheck exposed
  missing V1 projection narrowing, now retained as a fail-closed invariant.
- Core move/reaction/fire, warning, panic, wound and AI phases share existing
  admission and damage-preview rules without changing policy/replay/RNG ordering.
  Core93 focused checks, lint/format/typecheck PASS; scoped core complexity and
  clone findings zero. Independent source review of both slices found no material
  findings; it did not run browser/DB checks. Intermediate integration hooks
  NOT_RUN under the existing package exception; whole-union audit/full gate and
  fresh visual acceptance pending. See [current combat page](docs/wiki/battlefield-test-maps.md).

### Battle controls, initiative and missing-session recovery

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: HUD presentation,
  scene lifecycle and projection are cohesive modules; current/acted/waiting
  initiative labels derive from server turnIndex. Controller separates session
  transport, public-view admission, field command confirmation and availability;
  same-ID retry/auth/Escape semantics preserved. Missing temporary session now
  explicitly points to restart/editor instead of claiming a completed battle.
- Worker HUD18 and controller28 focused checks PASS. Integrated web types first
  FAIL on optional test data; corrected, then web types/UI40 PASS. Server types
  and public V1 projection rejection regression PASS. Source-only independent
  review found no material findings; fresh integrated visual/journey and final
  delivery gate pending. Intermediate hooks NOT_RUN, attempted main audits FAIL
  on other owned prototype code; no published/main bypass allowed.
- Historical galleries share immutable metadata without changing approved art or
  layouts. Worker syntax/lint/format/diff PASS; its audit used a relaxed CRAP
  threshold and is not the actual gate. Missing coverage blocked normal commit;
  automatic review rejected bypass. Parent integrated the staged patch for
  ordinary coverage/audit before committing. Browser console acceptance pending.
  Current wiki removes superseded 3D production instructions while retaining
  useful map/XCOM links and dated authority; research/progression boundaries
  are explicit in [the owning page](docs/wiki/battlefield-test-maps.md).

### Integrated sprite renderer and checked delivery candidate

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: padded silhouette
  outline fixes clipped crown/edge while preserving original body/pick mask;
  renderer separates terrain, figures, feedback, marker planning and picking.
  Thirteen finite renderer checks preserve legal-preview/inspection priorities,
  alpha thresholds and bounded geometry. Editor immutable actions/atomic imports
  and controller lifecycle/keyboard/autoplay close initial snapshot audit debt.
- Fixed catalogue completion erasing missing-session notice, denied storage getter
  restoration, disabled editor keyboard mutation and ambiguous skill refusal copy.
  Moved HUD props to remove a real architecture cycle. Actual integrated types,
  lint/architecture/pattern/content and795unitPASS/47SKIPPED; ordinary main-based
  audit PASS with zero new blocking findings. First failed checks retained in
  owning result; advisory styling findings remain. No gate/config weakening.
- Independent source reviewer finding corrected/read back. Independent real UI
  battle manualR1–2 thenauto endedR8/6alliedsurvivors; inspected damage agreed
  with previews, invalid skill refused, no repeated movement destination within
  activation. Strategy comparison/fun NOT_MEASURED. Final absolute visual review
  and clean PR/DB/stress/main journey pending.
  [Owning result](docs/wiki/battlefield-test-maps.md#результат-интеграции-и-игровые-проверки--2026-10-16).

### Keep the combat delivery scoped

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: final diff review
  excludes the separate live-map agent-review/consultation document and its
  checkpoint/history imports. Original primary and prior branch retain that
  work; this combat PR does not publish it. No combat code or evidence changed.
  Markdown format/local references checked; no game retest required.

### Reserve prepared-threat badges before accepted events

- 2026-10-16, branch `codex/combat-cycle-20261016`, local correction to
  published draftPR157: independent visual critic rejected overlapping
  preparation/movement labels (FEEDBACK-02). Scene now creates current threat
  labels before placing events and reserves their bounds alongside figures.
  Added a dense neighbouring-badge spacing regression;8focused/web types/
  lint/format PASS, freshcoverage796PASS/47SKIPPED. Independent source review
  found no material issues. Same-critic absolute visual recheck/newheadCI pending.
  Previous head87c5c6a CI38909754401 PASS includes clean bootstrap,10k stress,
  14 PostgreSQL checks and strict audit; not claimed for this source correction.
  Owning wiki records rejected image/reproduction and scoped outline proof;
  index no longer calls the working sprite sandbox unimplemented.

### Sprite sandbox merged and exercised from main

- 2026-10-16, delivery receipt on `main` for `codex/combat-cycle-20261016`,
  merged through [PR157](https://github.com/Vovanostm/warwrit/pull/157):
  reviewed2c1ac2a -> merge2072a64; whole-tree diff empty. Exact-head
  CI38915129341 SUCCESS:796unit/47skip,10kstress/20determinism/100replay,
  14realPostgreSQL,coverage and strict232-file audit PASS. No bypass on final
  source commit or merge. Initial visual REJECT corrected; first repeat timed
  out without verdict, fresh independent full static packet ACCEPT(all7criteria
  > =2, motionN/A, criticowninputNOT_RUN).
- Clean main stand5330/API3030: editor/default/start, actual right-click1AP
  movement(AP4->3), guard, autobattleR9/rev161 victory5survivors, restart and
  return-to-editor/recreate PASS. New12active/R1/rev4/AP4 left playable.
  Primary WIP preserved; no deployment/migration/campaign XP. Wiki/index/current
  plan reconciled with actual merge and measured limits; doc-only closeout
  does not change reviewed game code. Full gate not rerun for documentation.
  [Owning receipt](docs/wiki/battlefield-test-maps.md#поставка-в-main-и-проверка-после-слияния--2026-10-16).

### Battle camera menu helper

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner-authorized
  camera coordination supplied separate reviewed camera module and scene
  panButtons[0,1] adapter; camera SSOT remains the shared module. Adapter
  author types/lint/format/diff PASS, own browser journey NOT_RUN after context
  loss; camera author13 focused/source-review PASS. Root updated only two existing CombatLab menu
  labels for LMB drag/WASD camera control; buttons/cards/layout unchanged.
  Root scoped lint/format/menu copy/fit PASS; camera author5322 journey
  key/drag/click/combinedwheel/blur/HUD/daynight0POST/revision4 stable PASS.
  Initial runner synchronization/offcanvas failures preserved. Independent
  camera appearance now scoped ACCEPT after supplied missinginputs;7criteria2/3,
  own critic input NOT_RUN. Separate module PR/main delivery completed as
  confirmed in the merge receipt below; sprite integration remains local.
  [Owning helper](docs/wiki/battlefield-test-maps.md#подсказка-управления-камерой--2026-10-13),
  CURRENT_PLAN/web README updated; quick-use text reconciles short LMB
  inspection with held WASD/arrows, LMB/MMB drag and wheel zoom. A follow-up
  documentation correction replaces superseded stacked-border/AP-only-shot
  wording with one coloured grid and passive weaponReach versus legal current
  attackPreview; existing implementation and rules unchanged.
  Separate camera-owner publication verified: draftPR156/head64b49ee3 and
  same-head CI38404171166 success;5camera/test/own-doc files only. First camera
  visual BLOCKED missing inputs superseded by same-critic full ACCEPT. Current
  GitHub PR156 OPEN/READY/head54f7da890/CI38407349732 IN_PROGRESS; old CI
  success was not current-head PASS. Superseding2026-10-13 live receipt:
  PR156 MERGED reviewedhead54f7da890/merge86c1da055; finalCI38407349732
  SUCCESS samehead. Root verified camera worktree main clean,HEAD/main/originmain
  match86c1da055 and finalhead-to-merge ordinarydiffempty. Primarycodexbranch/
  HEADb44f5c1/WIP retained. Only module/test/own-docs merged, not sprite integration.
  This sprite branch/helper remains local; no root commit/publication/merge/deploy.

### One coherent desktop battle-control family

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner rejected
  inconsistent/unpolished controls. Unified command/skill/utility/text sizes,
  frame/state palette and typography in battle-controls.css; removed conflicting
  control styling and editor leakage. Compact console236->179.4 clears default
  lower figures; auto start/stop moves to utility and step to menu. Skill overflow
  and explicit tooltip input mode stabilize selection/focus; rank/shortcut costs
  and public view authority retained. BattleView/CombatLab/test assertion,
  battle-view/combat-lab/combat-icons CSS affected; README/CURRENT_PLAN and
  [owning result](docs/wiki/battlefield-test-maps.md#единый-боевой-интерфейс--2026-10-13)
  updated, wiki top current pointer reconciled without erasing dated rejects.
  Web noEmit/lint/format/UI16 PASS; three desktop layouts/0POST inspection,
  stable aim/overflow/Esc/menu and real auto stop PASS. Follow-up UI17 PASS;
  first HUD critic REJECT (command tooltip covered feet), corrected by anchoring
  above the actual actor card;1366/1440 custom+dense tooltip bounds PASS.
  Terminal stance badges now require active status; resolved next-round hidden.
  Initial brittle class/
  expanded-name probe/hover focus/overlarge console findings corrected.
  Scoped HUD appearance ACCEPT, seven criteria2/3; own critic input NOT_RUN,
  terminal initial exclusion followed by fresh own5321 autoR8/rev151 terminal
  1366/1440 actualUI/HTTP PASS,0inspectionPOST,stable36px/radius6 outcome buttons;
  terminal critic ACCEPT7criteria2/3, own input/runtime NOT_RUN. Captured before
  separate camera integration; camera not accepted by this HUD verdict.
  Failed original metadataSecurityError/mainlaunchquota
  preserved, freshbattle not labelled originalR9. Terrain/height separate, full game/DB gate NOT_RUN,
  general AAA/fun/FPS not claimed. Inherited audit blocks broader closeout,
  no commit bypass/publication/merge/deploy.

### Finite renderer/core readback and prior-fire forecast correction

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: collaborating
  owners corrected field topology/material occlusion and PREVIEW-04 late
  reaction HP cap after prior fire. Final546/444 supersedes588/402; opaque
  projected mill tops supersede rejected dirt top. Author UV/depth/focused21
  (geometry4+UI17)/types/lint/format/diff PASS. Frozen field visual ACCEPT
  scores3/2/2/2/3/2/2,motionN/A; critic input/tests/build NOT_RUN. Fresh integrated
  post-HUD day/night narrow readback PASS by same critic: full field ACCEPT
  retained, no material regression; unchanged renderer. Core43/build/types/read-only/replay PASS by
  author; mainAPI runtime correction PENDING, unchanged3022. Isolated3023/5321
  actualUI/HTTP/readback PASS:10HP/fire5thenreaction5 matchesHUD5, revision31,
  no state injection; initial pan/nativeconfirmation runner timeouts recorded.
  Actual manual summary read: R9/revision149,76orders,5survivors,errors0;
  oldAPI journey does not prove live corrected preview. Owning wiki/preview/
  CURRENT_PLAN updated; wiki top/frontmatter now point to the scoped current
  field/HUD/terminal acceptance with remaining main runtime limits,
  preserving historical PENDING/reject sections; [finite result](docs/wiki/battlefield-test-maps.md#согласованное-поле-и-проверка-прогноза--2026-10-13).
  Full/DB gates NOT_RUN here, balance NOT_MEASURED; inherited audit/WIP open,
  no bypass/commit/publication/merge/deploy.

### Height occlusion reopened after owner review

- 2026-10-13, branch `codex/sprite-combat-stage1`, local documentation:
  parallel owner review reports lower-grid lines showing through +1 terrain.
  Recorded translucent-top/depth hypothesis and bounded opaque tile/continuous
  UV/exposed cliff proposal, not accepted asset production or rule change.
  [Owning defect](docs/wiki/battlefield-test-maps.md#перекрытие-нижней-сетки-высотой--новый-defect-2026-10-13)
  and CURRENT_PLAN updated; renderer author owns repair. Current fix/terrain
  visual PENDING, reproduction and code fix NOT_RUN by this shared-doc writer.
  Historical captures remain history; no broad visual approval inferred.

### One colour grid replaces stacked tactical contours

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner instructed
  one grid with colour states. Parallel renderer/geometry author integrated
  165 stable fills, one tactical-grid, 588 physical edges/402 shared and removed
  legacy/inset contours. Canonical previews/inspection/input and entity outlines
  retained, ground remains below figures. Its HUD intersection legend transferred
  to this shared writer. Renderer/battle-cell-grid/geometry tests/HUD CSS affected;
  [owning result](docs/wiki/battlefield-test-maps.md#единая-цветовая-сетка--2026-10-13),
  web README and CURRENT_PLAN updated. Author reports geometry+UI20/20/noEmit/
  lint/format PASS after corrected initial TS/Float32 checks; root noEmit PASS.
  Private 6v6 stable identities/canonical cells/0POST unchanged revision PASS.
  New grid visual PENDING; previous double/inset ACCEPT remains historical,
  superseded. Full game/DB gate NOT_RUN; inherited audit open, no commit bypass/
  publication/merge/deploy.

### Battle command icons and selected weapon inspection

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner rejected
  homemade command glyphs. Replaced commands/five skills with ten local
  CC BY 3.0 Game Icons, preserving input/tooltips and adding shortcut/rank
  readability plus author/source/adaptation credit. CombatIcon, icon CSS/assets,
  CombatLab/BattleView and combat-lab README affected.
  [Icon result](docs/wiki/battlefield-test-maps.md#иконки-команд-и-приёмов--2026-10-13):
  scoped lint/16 UI tests/browser hover-keyboard-disabled guard PASS;
  web noEmit PASS before/after shared-grid fix; available aim/selected/Esc/rally
  tooltip PASS with unchanged revision. Scoped icon visual ACCEPT (all applicable scores 2/3); critic pointer/revision
  binding NOT_RUN. Initial overlong review stopped without verdict; fresh bounded
  critic completed. Grid/height acceptance remains separate.
- Same date/branch, local integration record for collaborating weapon-reach
  author: pure detached units[].weaponReach, independent inspection and
  attackPreview admission, selected-unit caption/legend. Core/protocol/projection
  and HUD present; 46 focused tests/builds/checks reported PASS on that version;
  actual bow45/halberd18/shield6/LOS/resource refresh/halberd2 attack PASS.
  [Owning result](docs/wiki/battlefield-test-maps.md#дальность-выбранного-оружия--2026-10-13),
  melee/ranged, both README and CURRENT_PLAN updated. Saved visual captures
  ACCEPT >=2; the parallel new grid supersedes current integration acceptance,
  now PENDING. Full game/DB gate NOT_RUN for this narrow closeout; inherited
  branch audit remains open. No commit bypass/publication/merge/deploy.

### Weapon reach remains readable where movement overlaps

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner screenshot
  showed the archer's weak range wash hidden by movement. Strengthened ochre
  fill/ink-backed outer boundary; overlapping cells now use one fill with an
  inner cyan movement cue. Kept full grid/input geometry, server range/attack
  admission, targets and ground-before-figure layers. Scene/README and
  [owning result](docs/wiki/battlefield-test-maps.md#контраст-области-оружия--исправление-2026-10-13),
  CURRENT_PLAN affected. Web noEmit/lint/format and 16 UI tests PASS; actual
  45 canonical cells / 38 overlaps/target forecast/unchanged revision PASS, 6v6
  day/night/close/grid/reference captures. Independent scoped visual ACCEPT (all applicable scores >=2); critic
  browser input/full game/DB gate NOT_RUN. Previous branch audit remains open;
  no commit bypass/publication/merge/deploy or domain/protocol/server changes.

### Occupied cell creature hover

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner reported
  that hovering an uncovered part of an occupied hex did not highlight its
  creature. Unified sprite/ground target resolution with active occupancy and
  opaque-sprite priority; hover/inspection/canonical action targeting now agree.
  Added uniform muted silhouette/ground-ring hover emphasis and empty-cell
  clearing without promoting ground effects over figures. Scene and combat-lab
  README affected; [owning fix/evidence](docs/wiki/battlefield-test-maps.md#наведение-на-занятую-клетку--исправление-2026-10-13),
  CURRENT_PLAN updated. Actual wolf body/cell mismatch reproduced and corrected
  after reload;90occupied-cell points across11figures PASS, hover0POST and
  unchanged actor/revision, day/night/grid captures. Web typecheck/scoped
  lint/format and14BattleView tests PASS; independent scoped visual/source
  critic ACCEPT (all applicable scores>=2, its own input NOT_RUN). No rule/
  protocol/server/migration change; full gate NOT_RUN. Inherited branch audit
  still prevents closeout/commit; no hook bypass/publication/merge/deploy.

### Combat rubble occupies a readable single cell

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner screenshot
  showed rubble overlapping several cells with unclear blocked footprint.
  Uniformly resized the existing art and aligned its measured visible centre
  to the owning hex; added persistent non-pickable ochre/ink ground borders
  and blocked hover/pin explanation. Scene/BattleView/UI regression, README,
  [owning wiki result](docs/wiki/battlefield-test-maps.md#завалы-принадлежат-одному-гексу--2026-10-13)
  and CURRENT_PLAN updated; canonical geometry/rules/replay unchanged.
  Web noEmit/scoped lint/format, UI 14/14 and actual blocked-cell no-order journey
  PASS; 12,575 visible-art samples stayed inside projected hex. Current day/night/
  close/equal-height captures ready; independent absolute visual ACCEPT, all applicable scores >=2
  (owning cell/neighbor/HUD3), critic input
  NOT_RUN. Full game/DB gate NOT_RUN for this visual/HUD fix; prior branch
  audit still blocks commit, no bypass or publication/merge/deploy.

### Combat v3 scene, learned skills and autoplay

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner requested
  subagent implementation of combat rendering/heights, enemy AI, skills and
  autobattles. Integrated semantic ground-before-figure layers, matching stable
  alpha picking/entity order, textured exposed height faces and sparse empty-cell
  height labels; canonical v3 skill ranks/commands/previews, skill-aware tactical
  AI and pure/server/HUD autoplay with visible stop. Five finite skills are
  brace/pressure/reach/aimed/rally, editor ranks0–3, four slots plus overflow.
  Historical v1/v2 replay semantics retained; v3 overkill reports actual HP loss.
  Removed web runtime core dependency via optional server ruleHints/public
  guard percentage; server owns connectivity admission with draft-preserving
  visible rejection. Added public boundary/regression checks, updated combat
  READMEs/ability/opponent pages and CURRENT_PLAN.
  [Owning result and proof limits](docs/wiki/battlefield-test-maps.md#реализация-тз-sprite-v3--2026-10-13).
  UI skills/autoplay/full mill/editor/reload/invalid-import/closed-map retry PASS;
  terrain identity74points and alpha/HUD input PASS. V3 matrix12battles/2085commands
  resolved R8–11 without unlawful commands/cycles/replay divergence. Isolated
  verify PASS737tests/47skipped; baseline stress10000battles/100replay PASS.
  Independent source boundary review passed its finite scope; full absolute
  visual ACCEPT for supplied current scenes, every applicable criterion >=2.
  Actual browser125%/critic pointer execution NOT_RUN; threat caption moved
  above victim/deduplicated and recaptured after full reload, repeat isolated
  verify PASS on affected source. Full Docker/PostgreSQL gate
  NOT_RUN; branch audit FAIL130complexity/17clones after49 inherited exclusions,
  no check weakened or hook bypass. Existing gallery JS/CSS registered as
  legitimate HTML entrypoints/browser globals, no new runtime dependency.
  No campaign progression/twenty unique ability sets/poison or burning status
  engine; general balance/fun/performance NOT_MEASURED. Local WIP, no commit,
  publication, merge or deployment; full DoD closeout not claimed.

### Combat specification and reopened visual acceptance

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner rejected
  a selected hex drawn across a character and requested a full specification
  first. Added the [complete combat technical specification](docs/wiki/battlefield-test-maps.md#полное-техническое-тз-пошагового-боя--2026-10-13):
  semantic layers/alpha/depth, hex picking, fullscreen HUD/initiative/statuses,
  ability slots, previews, path/LOS/reactions/AI, battle/map editors, command
  authority/replay and acceptance matrix. Inspected pinned Honeycomb,
  Babylon9.28.0 and Floating UI GitHub sources; retained existing engine/core,
  no dependency installation or source copying. Reopened scene acceptance as
  REJECT: ground-ring group2 after actor group1 violates RENDER-01; fix NOT_RUN.
  Supersedes earlier visual ACCEPT for integration, preserves historical
  gameplay evidence. Added mandatory combat layering scenarios to the visual
  critique rubric so a reproduced overlap forces REJECT. Updated wiki navigation/log, turn semantics and
  CURRENT_PLAN. New numerical UX targets/effects/dependencies remain proposals.
  Documentation-only pass; game tests/full gate NOT_RUN, performance
  NOT_MEASURED. Independent specification review findings resolved for picking
  versus legality and proposed action-catalogue status. Markdown format,
  new-section local links and diff checks PASS. Existing branch audit remains
  open; no commit/publication/merge/deploy.

### Combat v2 improvement cycle

- 2026-10-12, checked 2026-10-13, branch `codex/sprite-combat-stage1`, local:
  owner requested a finished combat prototype through an executed improvement loop.
  Sprite v2 integrates tactical targets/approach, guard/fatigue, finite reactions,
  panic/escape/human-only surrender, one-retarget declared strikes, AP0 scheduling
  and static-map admission, preserving historical rules/replays. Fixed heavy
  reversal, sequential reaction forecasts, false-safe origin escape and false
  control by bow/spent reactions. HUD uses smaller proportional figures,
  foreground active markers, correct defeat text and no command tooltip over
  terminal controls. Core/replay, lab server/protocol, editors/renderer/HUD,
  their READMEs, mechanic pages/wiki index and CURRENT_PLAN affected.
  [Owning loop/parameters/checks](docs/wiki/battlefield-test-maps.md#алгоритм-доведения-боёвки--2026-10-12).
  Actual UI/replay: rush R8/147 victory, safety-fixed hold R14/187 defeat,
  human surrender R5/89 with two surrenders; finite independent source/playable
  ACCEPT. Absolute day/night visual and final hold/surrender readback ACCEPT
  (text/layout 3, inactive readability 2); critic browser input NOT_RUN.
  Fresh mill left playable at web5320; format/scoped links/diff PASS.
  Latest safety 37 focused tests, UI 12, affected typechecks/build/lint PASS;
  failed first fixture typecheck/lint and tooltip probe corrected and rerun.
  Historical stress/disposable PostgreSQL checks PASS; full verify formatting
  FAIL, owned formatting fixed, unrelated WIP preserved, later stages NOT_RUN.
  Existing branch audit blocks commit. Abilities/progression/captive campaign,
  general balance/fun/performance remain outside measured delivery. No commit
  bypass, publication, merge or deployment.

### Reachable battle movement contrast

- 2026-10-11, branch `codex/sprite-combat-stage1`, local: owner reported
  movement cells blending into terrain. Separate slate-teal fill, pale borders
  and ink backing make canonical movement destinations visible; hover/pin remain
  on top, shot-area style unchanged. Updated combat-lab renderer and README.
  [Owning amendment](docs/wiki/battlefield-test-maps.md#контраст-доступной-зоны-движения--исправление-2026-10-11).
  Web typecheck/scoped lint PASS; browser 39 destinations with matching borders,
  day/night/grid on-off, pin-hover and actual 4AP move/AP0 removal PASS.
  Absolute visual ACCEPT, all applicable scores ≥2; critic input NOT_RUN.
  Format/scoped links/diff PASS; game tests/full gate NOT_RUN for this visual fix.
  Existing branch audit blocks commit. No publication/merge/deployment.

### Aligned battle hex grid and overlays

- 2026-10-11, branch `codex/sprite-combat-stage1`, local: owner screenshot
  exposed rotated hex borders/inset fills missed by the previous input checks.
  Shared pointy-top radius/centres and mesh helpers align grid, movement/shot
  zones, hover/selection and hex unit bases. Honeycomb GitHub sources inspected
  at pinned commit; no new dependency, gameplay, protocol or server change.
  [Owning amendment/research](docs/wiki/battlefield-test-maps.md#геометрия-сетки-и-совпадение-маркеров--исправление-2026-10-11).
  11 focused tests/web typecheck/scoped lint PASS; browser165 cells/444 shared
  edges/45shot borders aligned,150edge+180corner probes without dead zones,
  pinned/hover/near-edge rightclick3AP PASS. Source review cleared;
  absolute visual ACCEPT, all applicable scores ≥2; geometry/pinned-hover score3,
  critic browser input NOT_RUN. Format/scoped links/diff PASS.
  Full gate NOT_RUN; existing branch audit blocks
  commit. No publication/merge/deployment.

### Continuous battle hex picking

- 2026-10-11, branch `codex/sprite-combat-stage1`, local: owner reported
  boundary dead zones and missing selected-cell highlight. Sprite ground picks
  cover full hexes; cube-rounded fallback fills internal height seams and rejects
  missing/perimeter cells. Shared inverse in web renderer preserves old scene
  math. Hover and pinned selection have distinct persistent markers.
  [Owning amendment](docs/wiki/battlefield-test-maps.md#непрерывный-выбор-гекса--исправление-2026-10-11).
  Ten scoped tests/web typecheck/lint and 140 edge/180 corner browser points,
  border right-click/persistent selection PASS. Source findings fixed;
  240 height-edge points/perimeter rejection/pan/zoom PASS. Absolute visual
  ACCEPT for inspected day/night/height-test states, all applicable scores≥2;
  critic input execution NOT_RUN, extreme camera framing not accepted.
  Format/scoped links/diff PASS; full gate NOT_RUN. Existing branch audit
  blocks commit; no publication/merge/deployment.

### Approved command desk battle HUD

- 2026-10-11, branch `codex/sprite-combat-stage1`, local: owner approved
  concept 01 Command desk. Live fullscreen HUD implemented in web
  combat lab: portrait initiative, mirrored cards, icon commands, reserved skills,
  canonical previews/states and editor menu. Scene framing and W09 portrait
  crop corrected; hover field takes priority over retained portrait focus.
  Selected movement wins over pinned-target forecast, with pinned inspection
  retained; selecting a unit clears the path. Muted shot grid, AP spend/remaining
  segments, side shapes and upper-left forecast preserve field readability.
  [Owning decision](docs/wiki/battlefield-test-maps.md#пять-концептов-полноэкранного-боя--2026-10-10).
  Web typecheck/scoped lint/nine UI tests and actual shot/AP0/pending/move/
  round/restart/hover/target-path-target/menu/editor journeys PASS, three viewport fills PASS.
  Final absolute integrated visual ACCEPT for inspected 2v2/6v6 day/night
  and three desktop sizes, all applicable scores ≥2 (motion N/A); guarding badge
  checked in real browser. Format/scoped links/diff PASS. Full gate NOT_RUN
  this UI cycle; arbitrary dense formations and broader player acceptance unmeasured.
  Last branch-wide commit audit FAIL: 4 static-gallery entrypoint findings, 99
  complexity findings, 15 clone groups across 159 changed files; not bypassed. No publication, merge or deployment.

### Five fullscreen battle UI proposals and approval gate

- 2026-10-10, branch `codex/sprite-combat-stage1`, local proposals: owner
  requested five desktop-only full-viewport battle overlays and a stop before
  choosing the live UX. Added `assets/art/combat/stage1-2026-10-09/ui-fullscreen-concepts-v2/`:
  native interactive layouts, captures/comparison and owner references.
  Mirrored actor/target cards, icon-only actions with hover/focus tooltips;
  later owner amendment adds Olden Era-like TOP round-separated initiative,
  portrait effects and four demonstration ability slots from skill progression.
  Effects/abilities are proposals, not engine semantics. Gamedev GPT-6.1 Sol
  taxonomy reviewed. [Owning comparison and boundaries](docs/wiki/battlefield-test-maps.md#пять-концептов-полноэкранного-боя--2026-10-10)
  and CURRENT_PLAN updated. Later owner rejection of crude UI led to shared
  component refinement: typography/numeric hierarchy, resource bars, chance
  ring, damage channels, AP infographic, distinct ability icons/states.
  Tooltip layers and forecast occlusion findings corrected. Syntax and
  refreshed five-layout browser journey/three viewport fills PASS, errors[]/
  writes[]; full independent visual re-review PENDING. Corrected prior four-concept final verdict to ACCEPT/history.
  Live UI delegate stopped; isolated work retained without integration.
  Production source/API/rules/AI/replay/dependency/migration unchanged;
  game/full/integrated gates NOT_RUN. Owner choice OPEN; previous prototype
  commit audit NOT_DONE; no publication, merge or deployment.

- 2026-10-11, same branch, local continuation: restored the five-concept web
  viewer and rechecked the final browser journeys. Selected abilities now have
  an explicit pressed state; A/B shot tooltips keep actor values visible.
  Five journeys, selected-skill captures, syntax/format/scoped links/diff PASS.
  First full independent GPT-6.1 Sol visual review ACCEPT (all applicable
  scores ≥2). Follow-up selected-skill state exposed C/E figure occlusion
  (REJECT); stable left inspection placement fixed it. Final absolute
  visual re-score ACCEPT for all five; all four C/E ability-tooltip states
  avoid figures/cards/commands in the browser. Owner selection OPEN;
  live/integrated-game acceptance NOT_RUN. Existing prototype commit audit
  remains NOT_DONE. No publication/merge/deployment.

### Four alternative battle UI concepts

- 2026-10-10, branch `codex/sprite-combat-stage1`, local proposals: owner
  rejected the current screen's overall UI/UX and requested four concepts
  closer to Heroes/Wartales/Battle Brothers. Added native interactive
  `assets/art/combat/stage1-2026-10-09/ui-concepts-2026-10-10/` gallery,
  four 1440×900 day captures/comparison and reference provenance. Compact
  console, floating controls, actor dossier and target inspector share approved
  sprites/mill art and an explicitly illustrative state; no gameplay/API/rules/
  replay/dependency/migration changes. Gamedev GPT-6.1 Sol advised; visual
  GPT-6.1 Sol found C initiative cropping and A night label, corrected.
  Final historical four-concept re-review ACCEPT (all applicable scores ≥2);
  later owner five-fullscreen brief supersedes this choice. [Owning comparison](docs/wiki/battlefield-test-maps.md#четыре-концепта-боевого-интерфейса--2026-10-10)
  and CURRENT_PLAN updated; A recommended, owner selection OPEN. Browser
  four-tab/actions-fit/inspect/mode/grid/day-night/fullscreen checks, syntax,
  format/scoped links/diff PASS. Production game/full/integrated acceptance
  NOT_RUN. Shared prototype commit audit remains NOT_DONE; no publication,
  merge or deployment.

### Combat target contrast and action dock

- 2026-10-10, branch `codex/sprite-combat-stage1`, local: owner's four
  UI requests implemented with gamedev GPT-6.1 Sol. Strengthened canonical
  bow cells/all legal target silhouettes and markers, unit/ground contrast,
  and a below-field actor/AP/action dock with canonical prices/disabled reasons.
  Updated web BattleView/CombatLab/scene/CSS/tests, declared existing public
  game-core workspace dependency with pnpm, added a four-view screenshot
  [UI reference](assets/art/combat/stage1-2026-10-09/ui-reference-v1.html).
  After full mill visual REJECT for overlapping diagonal, server default
  new drafts use two columns/three spaced ranks; accepted/imported setups,
  rules and old replays unchanged. Earlier rush/hold evidence uses former start.
  [Owning result](docs/wiki/battlefield-test-maps.md#читаемость-целей-и-панель-действий--2026-10-10),
  lab README and CURRENT_PLAN updated. Web/server typecheck/scoped ESLint,
  five UI/four custom-battle tests, actual shot/end-turn/target checks and
  four-tab reference PASS. Independent source review found no concrete defect;
  final day/night bow/melee/revised mill visual ACCEPT, applicable scores ≥2,
  motion N/A. Documentation format/scoped links/diff PASS. Full gate NOT_RUN
  after this UI amendment; later dense positions/new deployment balance
  NOT_MEASURED. Existing complexity audit still blocks ordinary commit,
  NOT_DONE. No external dependency/migration/publication/merge/deployment.

### Combat AI effectiveness and user-facing playtest

- 2026-10-10, branch `codex/sprite-combat-stage1`, local: owner requested
  dev restart, actual fights and tactical-depth/routine analysis. Reopened
  the isolated stand; five completed UI battles plus four partial probes
  record state/replay outcomes. Same mill start: rush round9/one death,
  hold round22/five deaths. Sword hit+back preserves80HP/36armor vs38HP/0armor
  without retreat; heavy AI never attacks the kiting actor. Disconnected wall
  repeats120 defends to round60. ID-driven targeting and spear step-to100%
  reproduced. Gamedev and independent gameplay critic GPT-6.1 Sol found
  current depth insufficient. [Owning assessment](docs/wiki/battlefield-test-maps.md#игровая-проверка-ai-и-тактической-глубины--2026-10-10),
  opponents/fatigue wiki and CURRENT_PLAN record priorities and evidence
  boundaries. No gameplay source, rules, dependency or migration changed.
  Documentation format/diff and added local links PASS; whole-document link
  scan FAIL on five unrelated historical absolute paths. New game/full/visual
  gates NOT_RUN; human
  enjoyment/general balance/AI compute NOT_MEASURED. Existing shared commit
  audit blocker remains NOT_DONE. No publication/merge/deployment.

### Archer shot area and overhead damage forecast

- 2026-10-10, branch `codex/sprite-combat-stage1`, local: owner requested
  archer shot-area highlight and damage/miss above hovered targets, implemented
  with gamedev GPT-6.1 Sol. Core provides affordable bow range/LOS cells and
  on-hit health/armor loss ranges using the unchanged execution calculation.
  Additive optional lab projection fields feed rust shot cells and an overhead
  forecast; geometry avoids figures/results and a connector identifies the
  target. No hover RNG, command, dependency, migration or replay change.
  [Owning contract](docs/wiki/battlefield-test-maps.md#рабочий-прототип-и-редакторы--2026-10-09),
  ranged/preview wiki, lab README and CURRENT_PLAN updated. Focused parent
  tests 7 files/44 PASS; build/typechecks/scoped ESLint PASS. Browser forecast
  2–4 health/12–18 armor, miss25%; actual shot3/16; blocked target and AP0
  excluded. Final v3 visual ACCEPT, all seven applicable criteria 2 (motion
  N/A), explicitly checks all three bodies and target connector. Source
  readback has no remaining blocker; full gate NOT_RUN after
  amendment. Existing complexity audit blocks ordinary commit, NOT_DONE.
  No publication/merge/deployment.

### Battle hover preview and right-click controls

- 2026-10-10, branch `codex/sprite-combat-stage1`, local: owner requested
  route/AP preview on hover and right-click movement/attack. Battle scene
  and HUD use canonical previews without commands on hover; left-click
  inspects, middle-button drag pans, wheel zooms. Paths now include the
  actor origin even for one-step moves. Shared field/button dispatch checks
  latest view and retains fire confirmation. Invalid/friendly targets do
  not submit commands; navigation/revision/leave clears old hover and native
  context menus are suppressed. [Owning contract](docs/wiki/battlefield-test-maps.md#рабочий-прототип-и-редакторы--2026-10-09),
  preview wiki, lab README and CURRENT_PLAN updated. Browser command/AP,
  hover-only, fire cancel/accept and navigation checks PASS; web typecheck,
  scoped ESLint and 12 focused tests PASS. Independent GPT-6.1 Sol source
  review has no remaining controls blocker. Initial visual review REJECT
  for thin route contrast; stronger ochre stroke/ink border implemented,
  fresh day/night re-review ACCEPT, all applicable scores 2 (motion N/A).
  Full gate NOT_RUN after this amendment;
  earlier prototype gate remains historical evidence. Existing audit debt
  still blocks ordinary commit, NOT_DONE. No publication/merge/deployment.

### Playable sprite combat and editors

- 2026-10-09, branch `codex/sprite-combat-stage1`, local: owner requested
  implementation with subagents and a working static-sprite prototype.
  Added the isolated `pnpm dev:combat` stand, custom battle/map editors,
  twenty visual profiles, JSON/local drafts, static Babylon scene and battle
  controls. Versioned prototype core adds dual-budget movement, heights,
  mud/fire, bow LOS, trained adjacent melee, fire/death morale and detour AI;
  old M0/M1 replay behavior remains separate. Protocol/server validate custom
  drafts before allocation, advance opponent commands within accepted receipts
  and export capability-protected replay. No campaign database, migration or
  runtime dependency added. [Owning contract](docs/wiki/battlefield-test-maps.md#рабочий-прототип-и-редакторы--2026-10-09)
  records actual verification, scope and remaining preset mechanics;
  CURRENT_PLAN and combat-lab setup docs updated. Integrated core/server/editor
  focused tests: 62 PASS. Browser editor/play/terminal/replay journeys PASS;
  static v10 visual ACCEPT and final GPT-6.1 Sol source review passed within
  its bounded scope. Added authored mill painting/provenance, alpha-aware
  picking, separate actor/night grading, silhouette edges and collision-aware
  overhead text; custom restart preserves accepted setup after reload and
  checks catalog availability before deleting. Action availability uses pure
  command dry-runs, disabling unavailable defense/retreat. Removed unused
  lab exports. Full gate initially stopped on unrelated untracked launch JSON,
  then unused exports and three analyzer false positives in SupplyShop props;
  annotated those directly used props without behavior changes. Final clean
  bootstrap gate PASS: 666 tests (47 skipped), 10,000 stress battles,
  migration smoke and 14 encounter/OIDC checks. Separate change audit FAIL
  on introduced complexity/duplication; ordinary commit blocked, NOT_DONE.
  Owner's 2026-10-10 model amendment restricts
  further delegates to GPT-6.1 Sol / GPT-6 Luna.
  No publication, merge or deployment.

### Combat reuse deeper recheck

- 2026-10-09, branch `codex/sprite-combat-stage1`, local: owner requested
  deeper verification and better reuse choices. [The revised combat contract](docs/wiki/battlefield-test-maps.md#углублённая-перепроверка-и-более-простой-поиск--2026-10-09)
  supersedes mandatory ngraph adaptation with one bounded Dijkstra field
  inspired by Athena Crisis; keeps existing hex/AI/initiative/RNG/replay and
  starts with a linear frontier, TinyQueue only if integration measurements
  justify it. Added independent AP/stamina labels, shared preview preparation,
  canonical-route/versioning boundaries, pinned candidate comparison and probe
  limits; linked [preview requirements](docs/wiki/mechanics/preview.md) and
  updated CURRENT_PLAN. Reproduced ngraph blocked-goal/callback/tie-order cases
  and abstract-astar decrease-key failure. Six new repo queries/13 families;
  three new deep candidates, old ngraph/TinyQueue rechecked. Existing combat
  14/14 and server lab 7/7 tests PASS; isolated prototypes matched independent
  scalar/resource oracles on the recorded corpus. Documentation format,
  scoped tracked links and diff PASS. New game integration/browser journey
  NOT_RUN; production performance/capacity/time savings NOT_MEASURED.
  No foreign source copied into production, package installed, game behavior
  changed, migration, publication, merge or deployment. Earlier research
  remains below as dated history.

### Combat modules and algorithm reuse research

- 2026-10-09, branch `codex/sprite-combat-stage1`, local: owner requested
  ready GitHub modules/algorithms in the combat specification. Added
  [the reuse matrix and adaptation contract](docs/wiki/battlefield-test-maps.md#повторное-использование-готового-кода--2026-10-09),
  linked it into S2–S4 and the mind map, and updated CURRENT_PLAN. Inspected
  pinned ngraph.path, ROT.js and boardgame.io sources/licenses/tests/issues;
  recommends MIT/ISC weighted-search source adaptation with blocked-goal,
  direction, AP/stamina and deterministic-preview checks. Reuses existing
  core/AI/replay; complete framework adoption rejected, MCTS deferred.
  Eight repository queries/18 families; sequential-thinking MCP used.
  Documentation format, scoped tracked links and diff checks PASS.
  Candidate execution/integration/game checks NOT_RUN; performance/time
  savings NOT_MEASURED. No foreign source copied into production, package
  installed, game behavior changed, migration, publication, merge or deployment.

### Sprite-combat specification and visual agreement

- 2026-10-09, branch `codex/sprite-combat-stage1`, local: owner returned combat
  character production to sprites and confirmed Battle Brothers' positioning,
  weapons, fatigue and morale, 6×6, opponent selection and two samples before
  twenty separate asset tasks. Extended [the owning battlefield page](docs/wiki/battlefield-test-maps.md#спрайтовая-боёвка-тз-этапа-1--2026-10-09)
  with a decision matrix, ten selected warrior/ten bestiary profiles, five locations,
  UX, lore mind map, source-pinned GitHub research and a versioned real-lab plan.
  Added the local approval board and generated concepts/prompts under
  `assets/art/combat/stage1-2026-10-09/`; two samples were revised after critique.
  Updated ADR-0006, combat/wiki navigation and CURRENT_PLAN without changing
  Babylon or game rules. Source/format/JavaScript/JSON/links and desktop board
  journeys PASS. Independent concept findings and corrections are recorded in
  the owning page; integrated day/night/gameplay acceptance BLOCKED; motion out of current scope.
  Full game checks NOT_RUN, performance NOT_MEASURED. No production code,
  migration, dependency, publication, merge or deployment; style/remaining
  balance/implementation await the real stand. D1–D12, roster and style are now
  approved: 80 px/15×11, four AP, no ZOC movement lock, human escape/surrender,
  one retarget with new warning/response activation, heights/mud/fire and static
  full figures only. Approved C replaces rejected W01 as foundation. Twenty
  individual asset tasks under `roster/` completed after style agreement; all
  twenty generated PNG/provenance pairs saved. Primary gallery uses nineteen new
  figures plus existing B001 after alpha failures; rejected variants retained.
  B023 benign tethered variant omits source loop, exact generation rejection
  recorded. Linked mechanics/vision/bestiary amendments preserve old proposals.
  Updated matrix/all-image loading and80/220px gallery interactions PASS;
  first static critic found body-scale/B030 silhouette/B037 lore gaps. Corrected
  human body/foot scaling and B030/B037 v2; absolute re-review pending,
  integrated acceptance still BLOCKED.

- 2026-10-09, same branch, local correction: after the repeated absolute static
  review, replaced B030's mound with a fresh upright folded silhouette (`v3`)
  and restored B023's empty loop on a rooted stationary anchor (`v2`). Updated
  the gallery, visible B030 height and owning specification/checkpoint; exact
  prompts, rejected attempts and earlier variants retained. B023's scene
  fixtures still require separation before gameplay. Revised all-image loading,
  80/220 px, backdrop/console, embedded JS, provenance JSON and local HTML links
  PASS. Full static art/lore scores reached ≥2; B023 composition scored 1,
  so two bounded edits separated the creature (`v3`) and stationary tree/loop
  (`fixture.png`). Gallery selects the creature only; runtime tether/occupancy
  remain future requirements. Final absolute static review: all twenty figures
  score ≥2 on six isolated-art criteria; split/complete toes confirmed,
  clear night80 capture inspected. Narrow B023 bottom margin remains a
  preparation risk. Agreed stage 1 scope complete locally; integrated battle
  acceptance remains BLOCKED. No game-source change,
  publication, merge or deployment.

### World review, Porechye close view via Codex, gamedev skills

- 2026-10-09, branch `claude/world-review-porechye-detail`, merged: owner asked
  to analyse the map and world, use Codex for images and find gamedev skills.
  Added the second map/world analysis and an improvement plan to
  [map](docs/wiki/world/map.md#второй-анализ-карты-и-мира--2026-10-09) (lore
  mismatches at close view: stone Karaulny bridge, castle-like Kamenny Brod,
  missing Tikhaya Gat platforms; no visible war, lairs or wilderness).
  Generated a Porechye close-view sheet with Codex built-in `image_gen`
  (`assets/art/world/porechye-v1/`, prompts and provenance). Visual critic:
  pass 1 REJECT, pass 2 REJECT with props/lore 1→2 and layout fidelity 1
  twice; owner chose per-region edits («a») and plain grave posts: v3 built by
  region compositing — pass 3 ACCEPT as a standalone concept (all applicable
  criteria 2); v4 polish (Kamenny Brod matching its visit painting, Tikhaya
  Gat on the south bank, mill wheel in its race) — pass 4 ACCEPT, materials 3;
  v5: antler banner kept, gibbet-like post replaced by a lantern (owner) —
  pass 5 ACCEPT; in-game use BLOCKED, remaining polish listed in map.md.
  Published as PR #155; merged on the owner's «merge». Installed the
  `openai-develop-web-game` skill after code review (Trail of Bits port;
  local Playwright 1.63; smoke test PASS). Added
  [GAMEDEV_SKILLS](docs/engineering/GAMEDEV_SKILLS.md): installed skills,
  how to call Codex imagegen, candidates (none installed). Game views NOT_RUN.

### Mechanics wiki with cross-links

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner asked to
  describe everything at once as a full wiki with cross-linked mechanics.
  Added [docs/wiki/mechanics/](docs/wiki/mechanics/index.md): 18 combat pages
  (turn and action points, fatigue, melee, armour, weapons, ranged, preview,
  zone of control, morale, telegraphed intent, retreat, formations,
  displacement, terrain, wounds, opponents, talents, pressure) and 10 world
  pages (world turn, place state, attached places, contracts, relations,
  armies, game master, crisis and season, ambitions, chronicle), each with
  status, rule or proposal, player view, cross-links, reference and mistake.
  Core numbers are quoted from `packages/game-core/src/combat/rules.ts`; new
  rules are candidates without numbers. Linked from benchmarks, DESIGN_COMPASS,
  vision, combat, wiki index and SCHEMA. Local links and anchors PASS;
  implementation NOT_RUN.

### Game benchmarks, mistakes to avoid and world game master

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner asked to
  analyse the world map, compare highly rated similar games and save which
  references Warwrit takes and which mistakes it avoids. Added
  [benchmarks](docs/wiki/benchmarks.md) (reviews of ten games, Battle Brothers
  world systems, mistake table, three-layer world proposal, first cycle,
  lore proposals) and linked it from the wiki index, world page and log.
  Recorded owner decisions as REQ-21 (mercenary band that does not command
  armies; duchy armies march and fight parallel battles so the world lives;
  a game master sets the war — direction, design not approved) and
  REQ-22 (test 10–20 players, target 200–1000 bands) and REQ-23 (focus on
  making the current world interesting and on deep, high-quality combat with
  many mechanics; new worlds/regions only after success) in
  [vision](docs/wiki/vision.md). Revision the same day: the report was rewritten
  in detail (world, story and combat per game, mistakes, good/bad examples) and
  a compact agent digest [DESIGN_COMPASS](docs/engineering/DESIGN_COMPASS.md)
  was added to the brief reading list. Owner: some army battles are decided by
  the game master, some by simple rules without tactical battle; REQ-19 and
  brief B9 (second region after M1) are cancelled. The owner then accepted the
  recommendations: first combat mechanics are zone of control, morale with
  flight/surrender and telegraphed creature intent; the game master decides
  battles that change a town's owner or turn the crisis, simple rules decide
  skirmishes, ambushes and small sieges. Documentation only; implementation NOT_RUN,
  server capacity NOT_MEASURED.

### Global world atlas concept

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner requested
  a generated world map consistent with Warwrit's lore. Added the standalone
  ink atlas, exact built-in imagegen prompt and provenance in
  `assets/art/world/stozhar-v1/`, plus [the owning design](docs/wiki/world/map.md)
  and wiki links. Existing north/south/west/east duchies, crown domain and
  disputed Porechye are retained; geometry, drainage and roads are proposals.
  First image generated at 1536×1024. Initial critique REJECT (castle-like
  Kamenny Brod and blue Mutnya); corrected still-image pass ACCEPT. Owner then
  rejected the small scale and requested more cities/villages, varied marshes
  and places damaged by war. Expanded design and exact prompt in
  `assets/art/world/stozhar-v2/`: 24 urban nodes, village networks, three river
  basins and ten distinct districts. Expanded generation/review pending;
  renderer integration and gameplay checks NOT_RUN.

- 2026-10-08 follow-up, `codex/world-map`, merged 2026-10-08: owner required tens of hours,
  more than 100 POIs and coherent geography. Added the desktop zoomable
  `assets/art/world/stozhar-v3/atlas.html`, 128 unique proposed places in
  `places.json`, five image iterations with exact prompts/provenance, and
  REQ-20 in [vision](docs/wiki/vision.md). Corrected the crown river loop,
  water-dependent landmarks, crossing/settlement anchors and Vyasov bypass;
  fields, woods, marsh and working/ruined sites follow their terrain. Initial
  v3 critic rejected misplaced city/crossing/waterwork markers; repeated style
  failures led to graphic ink reconstruction with low roof groups. Final
  standalone atlas ACCEPT at overview scale (six applicable scores 2); close
  rendering/materials remain 1 at 3× and require higher-resolution authored
  detail. Catalogue/embedded JSON/JS syntax/local links/diff, desktop atlas
  journeys and change audit PASS. Expanded v2 is complete but failed minor-label
  readability; v3 supersedes it. [Owning result](docs/wiki/world/map.md).
  Game integration/day/night NOT_RUN; play duration NOT_MEASURED.

### Wave 1 agent results: company book, cache investigation, bestiary

- 2026-10-08, branch `claude/wave1-docs` from `main` (`b7ffefc`), published;
  owner «Ok, merge prs, update main». Integrates the accepted, owner-approved
  parts of the wave-1 Codex briefs (documentation only, no code):
  - **B8 company book** (`codex/b8-company-book` at `5b943aa`): Codex variants
    A/B were REJECT after three text-critic rounds; on the owner's decision
    Claude rewrote the book as «Казна» and «Щит»; both ACCEPT in round 3.
    Owner chose «Щит», third person without the chronicler's «мы».
    [Text and rounds](docs/wiki/onboarding-book.md#b8--новая-редакция-казна-и-щит--2026-10-07).
  - **B4 «Кто выдал тайник»** (`codex/b4-story-missions` at `88590bd`): story
    revision 6 (patched-sack clue instead of the tally stick, owner decision)
    text-critic ACCEPT and owner «Одобряю»; runtime contract
    [M1-STORY-MISSIONS](docs/work-packages/M1-STORY-MISSIONS.md). Reward
    decision (40 crowns from Kondrat's existing funds) is recorded on the
    working branch, not yet here.
  - **B7 bestiary and quest decisions** (`codex/b7-content-revision` at
    `ef0008e`): 30 selected creatures, all 60 IDs retained; creature names
    text-critic ACCEPT; 60 quest editorial decisions. The rewritten quest
    drafts (REJECT) are not included.
    Checks: prettier on changed docs. Game, CI-only checks per PR. Code parts
    of B1/B3/B4 remain on their working branches.

### Pending local work published

- 2026-10-07, branch `claude/world-lore-and-briefs` from `main` (`47c60e0`),
  published: on the owner's «Да, всё закоммить» all pending local work on the
  primary checkout was committed in topical commits and opened as a pull
  request — the contract texts and i18n catalogue, world/vision/briefs docs,
  critics and 3D skills, terrain ink materials and the wiki research drafts
  written by earlier sessions. Local evidence (`output/`, `.playwright-cli/`)
  and agent worktrees (`.claude/worktrees/`) are now ignored, not committed.
  Merge is not authorized.
- 2026-10-07 correction: merged on the owner's «Yes» as
  [PR #152](https://github.com/Vovanostm/warwrit/pull/152) (`b7ffefc`).

### Work package: melee always connects (combat ruleset v3) — proposal

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner asked for
  a full specification with acceptance criteria, self-verification and a
  code-quality test for the accepted melee rule. Added
  [M1-MELEE-CONNECT](docs/work-packages/M1-MELEE-CONNECT.md), linked from
  [combat](docs/wiki/combat.md#урон-в-ближнем-бою--решение-владельца-2026-10-07).
  It specifies:
  - new ruleset `m1-domain-bridge-v3` with melee/ranged weapon kinds and
    `meleeTraining` per unit;
  - a one-roll quality model (precise/solid/glancing, miss only for recruits and
    ranged) with a provable always-damage invariant;
  - an optional `quality` on `attack.resolved`, leaving v1/v2 byte-identical;
  - practice mapping that keeps the SUCCESS rate;
  - a pure `previewAttack` exposed only in the combat lab;
  - seven time-boxed steps, 15 acceptance criteria, a test plan, a
    self-verification pass, a code-quality gate, and open decisions D1–D3.

  Grounded in the current engine, rules, setup-v2, practice, admission and
  protocol code. An independent `warwrit-critic` pass on revision 1 found 7
  confirmed gaps (M0-only combat lab, three v1/v2-only server checks,
  exact-field aggregate validators, the replay digest field, a missing schema 2
  stress runner, the D1 default, preview rejection codes). All are fixed in
  revision 2, together with a public `recentAttacks` battle line for a
  player-visible result. Documentation only; implementation NOT_RUN.

### Contract texts and string catalogue

- 2026-10-07, originating branch `main`, local: owner asked to split the briefs
  into separate files with acceptance criteria and critique. Added
  `docs/engineering/briefs/2026-10-07/` (README, 00-common, B1–B9), the text
  critique rubric [TEXT_CRITIQUE.md](docs/engineering/TEXT_CRITIQUE.md) and the
  `warwrit-text-critic` / `warwrit_text_critic` agents; removed the single
  AGENT_BRIEFS file. The i18n catalogue is split per area
  (`contracts.ru.ts`, `contracts.en.ts`) to avoid shared-file conflicts. Web
  typecheck, `vitest run apps/web/src` 80/80, eslint and prettier PASS.

- 2026-10-07, originating branch `main`, local: on the owner's «Да, перепиши»
  the eight M1 contracts use the rewritten Porechye texts (named issuers,
  briefs, steps, findings, completion facts; hunt briefs shown at the issuer).
  Strings moved to the new `apps/web/src/i18n` module (`ru.ts`, `en.ts`,
  `lookup`/`t`; `?lang=en`), with a type that requires a complete English
  catalogue; no new dependency. Mechanics, steps and rewards unchanged.
  Affected: `ContractBoard.tsx`, `contract-visits.ts`, `FirstHunt.tsx`,
  `ContractBoard.test.tsx` (two expected literals), world docs. Checks: web
  typecheck, `vitest run apps/web/src` 80/80, eslint and prettier PASS; browser
  NOT_RUN (local `.env` database port mismatch, not changed).
- 2026-10-07, originating branch `main`, local: detailed agent briefs B1–B9 for
  the remaining vision decisions in
  [briefs/2026-10-07](docs/engineering/briefs/2026-10-07/README.md) (split later the same day).
  Not dispatched.

### Game direction: Battle Brothers rules, XCOM presentation, melee always damages

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner answered
  «Да, давай дух Battle Brothers и взял у XCOM только подачу» and set the rule
  «Урон в ближнем бою должен быть всегда (кроме новобранцев или боя с
  призраками) — игра должна быть логичнее xcom в этом плане». Recorded in:
  - [m1-spec §18](docs/wiki/m1-spec.md#18-battle-brothers-направление-и-этапы--2026-10-03);
  - [combat](docs/wiki/combat.md#урон-в-ближнем-бою--решение-владельца-2026-10-07),
    with a proposed reading for confirmation: hit quality instead of miss,
    shield/armor damage counts, recruit threshold, incorporeal exception that
    adds no creature, ranged keeps its miss chance;
  - [battlefield-test-maps](docs/wiki/battlefield-test-maps.md): no cover or
    flanking, melee preview shows strike strength.

  The current core still rolls `hitChance` for every attack. The change needs a
  new combat rules version and a compatibility analysis, and V1 replays stay
  unchanged. Implementation NOT_RUN. The canonical Airtable record was not
  updated (no access in this session): NOT_RUN.
  Same day: the owner confirmed the proposed reading («Да»), which is now
  recorded as accepted in the spec, combat and battlefield pages. Open item: the
  recruit skill threshold.

### Game vision page

- 2026-10-07, originating branch `main`, local: owner confirmed autobattle with
  AI retreat and possible deaths, an order to travel to a settlement and log out
  with auto-resolved battles on the way, and a second region right after M1.
  Vision REQ-18/19, M1-spec §7 and CURRENT_PLAN updated. Documentation only.

- 2026-10-07, originating branch `main`, local: owner decided offline
  behaviour (field camp with slower upkeep, terrain hunting/gathering,
  autobattle when attacked, safer logout in settlements) and crises (duchy war
  with settlement capture first, monster waves next). Vision REQ-12/18 and
  sections, M1-spec §7/§18 and bestiary world-rules amended; the old camp rule
  is superseded. Documentation only.

- 2026-10-07, originating branch `main`, local: owner amendment — no battle
  time budget, contracts of varying length, more repeatable and new contracts,
  combat-free visual-novel and detective missions. Updated vision REQ-09/11,
  added REQ-17 and a proposed mission-format section with three candidates;
  M1-spec tempo answer and CURRENT_PLAN amended. Documentation only.

- 2026-10-07, originating branch `main`, local: owner restated the genre and
  references (Battle Brothers, Wartales, The Witcher, XCOM) and asked whether
  the MMO fits and whether it is recorded. Added
  [docs/wiki/vision.md](docs/wiki/vision.md): owner decision, pillars, what to
  take from each game, MMO-fit table, REQ-01..16 summary with sources, open
  decisions and plan refinements; linked from M1-spec §1, wiki index and
  CURRENT_PLAN. Web sources on Wartales, BB crises, Dofus/Wakfu and Foxhole are
  cited. Documentation only; game code unchanged.

### Battlefield look and test maps — proposal

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner asked that the
  battlefield look like Battle Brothers / Disciples / Wartales and for several
  maps to test combat, character display and animations. Added
  [battlefield-test-maps](docs/wiki/battlefield-test-maps.md), linked from the
  [wiki index](docs/wiki/index.md). It covers:
  - what to take from each reference and what not to copy;
  - shared battlefield acceptance targets (field, grid, camera scale options,
    unit base and bars, occlusion, night/local light, honest rules);
  - six diagnostic maps T0–T5 on existing places, bestiary and weapon profiles;
  - a minimal implementation path (serverless display stand first, combat-lab
    scenarios later);
  - open owner decisions (unit size, field size, elevation/cover).

  Grounded in the current core: hexes plus `blocked` only, spear range 1–2, and
  no line-of-sight rule. Documentation only; implementation NOT_RUN.
  Same day: added an XCOM-quality section covering six presentation pillars,
  the state/visualization split (an XCOM 2 `X2Action`-style client sequencer
  over the existing combat events), animation blending and contact-frame sync,
  and the rule decisions it needs (attack preview function, line of sight,
  ZOC/height/cover).

### World of warring duchies and writing rules

- 2026-10-07, originating branch `main`, local: owner found «Совет опекунов»
  odd and asked for a literary style after Lermontov, Tolkien and others.
  Renamed it to the Boyar Duma; read «Тамань», «Капитанская дочка» ch. II,
  «Бежин луг», part of «Севастополь в декабре месяце» and «Страшная месть»;
  added [literary-style.md](docs/wiki/world/literary-style.md) with borrowed
  devices, narrative voices, name phonology per duchy and five Porechye samples.
  Tolkien, Sapkowski and Glen Cook are summarized from memory, not re-read.
  Samples are review drafts; game text unchanged.

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner decided that
  Warwrit is an MMO with a large world of several duchies at war (Witcher
  analogy). Added [docs/wiki/world/](docs/wiki/world/index.md): realm, four
  duchies and the regency council, the succession war, Seroe Porechye in the war
  with named issuers and rewritten texts for the eight M1 contracts, anti-slop
  [writing rules](docs/wiki/world/writing.md) and a
  [localization design](docs/wiki/world/localization.md); analysis tables in
  `docs/content/world/*.csv`. AGENTS.md lore ban amended for the duchies. Cause:
  the lore review found constraints without history, power or people, and
  bureaucratic player text. Names, dates and texts are review drafts; game code
  and in-game text are unchanged. Checks: CSV column validation and local links;
  game tests NOT_RUN (documentation only).

### Characters 3D: Mixamo scope extended to combat packs

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner answered «Да,
  расширь». Mixamo use for `codex/characters-3d` now covers the free Sword and
  Shield, Great Sword and Longbow packs as the primary combat clip set. The
  cause: the visual rubric REJECT on `1687b19` traced pose and attack defects to
  the UAL clips. Updated the
  [warwrit-characters-3d](.agents/skills/warwrit-characters-3d/SKILL.md) and
  [mixamo-blender](.agents/skills/mixamo-blender/SKILL.md) skills: one pack per
  weapon family, root travel removed before the bake, and no runtime procedural
  position correction. The branch agent recorded the decision in its contract
  and adopted the skills (`def9fd6`); the primary copies remain uncommitted.

### Visual critic with a scored reference rubric

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner reported
  that `codex/characters-3d` results were still not acceptable after its critic
  passed them. Cause: visual passes used the diff reviewer (`warwrit_reviewer`),
  which re-checked only the author's fixes and had no reference rubric. Added
  [VISUAL_CRITIQUE.md](docs/engineering/VISUAL_CRITIQUE.md) (author inputs,
  first-look test, 8 scored criteria, ACCEPT only when every criterion is ≥ 2,
  a convergence rule that forces a technique change, and a calibration example on
  `1687b19`). Also added the Codex `warwrit_visual_critic` agent (registered in
  `.codex/config.toml`), the Claude `warwrit-visual-critic` agent, an
  [AGENTS.md](AGENTS.md#independent-playable-critique) policy bullet and the
  critique step in the `warwrit-characters-3d` skill. Check: an independent run
  of the rubric on the `1687b19` captures, without the calibration section,
  returned REJECT with the same gaps (pose, rendering language, night value,
  shield material, attack clip) and a convergence note. Prettier and link checks
  PASS; TOML parses. The branch agent copied the files into `codex/characters-3d`
  (`def9fd6`); the primary copies remain uncommitted.

### Skills: 3D character workflow and GLB optimisation

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner reviewed
  Codex thread `01a112ef-4c1f-7591-be7d-0fd49504ebee` (`codex/characters-3d`,
  style gate v2) and approved the character tilt toward the camera and Mixamo for
  clips missing from UAL. Added the
  [warwrit-characters-3d](.agents/skills/warwrit-characters-3d/SKILL.md) skill.
  It covers the skeleton and clip map, the tilt rule, ink-material value matching
  against the reference, lore limits (no emblems), the Mixamo retarget path, an
  evidence workflow, and `scripts/optimize-glb.sh` (glTF-Transform 4.5.1:
  dedup/prune/resize/WebP). Linked the skill from the
  [skills README](.agents/skills/README.md) and
  [mixamo-blender](.agents/skills/mixamo-blender/SKILL.md). Checks: the script
  ran on copies of `ranger.glb` (9.7 → 1.9 MB) and `Shield_Wooden.glb`
  (5.9 → 0.3 MB); both loaded in Babylon 9.28 with textures ready. A live tilt
  probe (−25…−30°) in the branch workshop gave an upright, reference-like figure.
  Corrections on the same day: the camera convention (the workshop views from +z,
  the battle camera from −z), the contact-shadow direction (screen up-right in
  the game camera) and plain-path references to the untracked `combat.md`. At the
  owner's request the review session copied both skills into `codex/characters-3d`
  with the owner decisions and next-cycle brief (commit `3f4fc06`, audit NOT_RUN
  under the branch exception). The primary copies remain uncommitted.

### Agent rules: work-package step discipline

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner asked to
  prevent repeats of the defects found in the review of Codex thread
  `01a112ef-4c1f-7591-be7d-0fd49504ebee` (`codex/characters-3d` step 1:
  worktree and downloads in `/private/tmp`, production build and coverage run
  in parallel for a load-only step, timeouts reported without isolated rerun,
  audit blocker not asked, hand-edited lockfile, link to an untracked
  screenshot). Owner chose: intermediate work-branch commits may use
  `--no-verify` with the audit recorded `NOT_RUN`, passing before the PR.
  Added [AGENTS.md § Work-package steps](AGENTS.md#work-package-steps) and a
  sequential-checks rule under Proportional verification; cross-linked from
  [LOCAL_DEVELOPMENT](docs/engineering/LOCAL_DEVELOPMENT.md). Documentation only;
  game checks not applicable. Not committed/published/merged.

### Characters: real-time 3D plan with swappable equipment — proposal

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner asked for a
  precise agent plan after reviewing the stalled Codex sprite-pipeline thread.
  [M1-CHARACTERS-3D](docs/work-packages/M1-CHARACTERS-3D.md) proposes real-time
  3D characters in Babylon (CC0 Quaternius bodies/outfits/animations, bone
  attachments) in eight time-boxed steps. Step 0 is an owner gate to amend the
  ADR-0006 sprite direction; nothing is activated. Documentation only; code,
  assets and checks NOT_RUN. Not committed/published/merged.

### Progression research and candidate balance correction

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner requested
  continued modern-game/review research and concrete skill balance.
  [20-game overview](docs/wiki/progression-research.md),
  [source editions/limits](docs/wiki/progression-research-sources.md) and
  [B1 profile](docs/wiki/character-balance.md) compare tactics, practice,
  injuries and hybrid tradeoffs. Candidate future XP rates/course pace/physical
  bounds added; earlier whole-turn shot/armor prices corrected, attack reactions
  prepaid and eight hybrids priced. 13 disciplines/52 perks retained.
  Affected: owning progression/ability pages, combat cross-links, wiki index/log
  and CURRENT_PLAN. All new rules remain review-draft; accepted source policies,
  code/contracts/migrations/assets/player state unchanged. Actual documentary
  and arithmetic checks recorded in [owning results](docs/wiki/character-progression.md#исследование-и-поправка-b1--2026-10-06);
  gameplay/UI/simulation/playtest/independent playable critique NOT_RUN,
  actual balance/pace/course economy NOT_MEASURED. Not committed/published/merged.

### Character skills and hybrid abilities — design proposal

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner requested
  skill trees, warrior/archer classes, hybrids and injury-related development.
  [Owning design](docs/wiki/character-progression.md) adds 13 discipline descriptions,
  eight roles and strength/health/pain/courage rules;
  [catalogue](docs/wiki/character-abilities.md) proposes 52 perks/eight hybrids.
  Retain actual-practice/finite-study/discipline-choice policies; damage alone
  does not award XP or increase HP/strength. Five added disciplines and all
  new ability/physical balance remain review-draft. Affected: two owning wiki
  pages, combat cross-links, wiki index/log and CURRENT_PLAN; source/contracts,
  migrations and player state unchanged. Documentation format/local-links/
  choice structure/readback/scoped diff-check PASS, recorded in owning design;
  implementation/game/browser/independent playable critique
  NOT_RUN, learning pace/balance NOT_MEASURED. Not committed/published/merged.

### Living-world merged / local-main synchronization

- 2026-10-05, originating branch `codex/living-world-main`, merged:
  owner requested merge/update main. [PR151](https://github.com/Vovanostm/warwrit/pull/151)
  (`f9d300d`) merged as `47c60e0`; primary/origin/GitHub main match, reviewed
  tree unchanged. Four-biome fauna/reactions, local synthesized ambience,
  bounded place work, lawful observations and known-work notes delivered.
  Web presentation/assets/registry/owning docs affected; no domain/protocol,
  migration or player-data change. Exact-head PR CI attempt2 SUCCESS (643/47,
  10000 stress,14 SQL/auth, coverage/audit); attempt1 navigation coverage
  timeouts retained. Independent critic READY_WITH_LIMITS; local typecheck,
  diff/readiness/native reload PASS. Scoped recovery preserves unrelated drafts,
  company/North Yard/850 crowns and original DB/Dex. Main CI IN_PROGRESS;
  actual new travel NOT_RUN, FPS/RAM/audio quality NOT_MEASURED.
  [Owning results and recovery](docs/wiki/m1-spec.md#слияние-и-обновление-main--2026-10-05).
  This dated closeout is local/uncommitted; no deployment.

### Living-world commit-audit correction

- 2026-10-05, originating branch `codex/living-world-main`, local: the ordinary commit audit rejected eight introduced complexity findings. Extract cohesive habitat/population/animation, sound and background UI functions without changing behavior or any gate. Corrected audit, focused7, typecheck/lint and temporary90-second exact fauna comparison PASS; initial diagnostic path failure retained. Earlier full coverage643/47 and bootstrap remain pre-extraction evidence; final PR CI is pending. [Owning validation](docs/wiki/m1-spec.md#проверка-изолированной-поставки--2026-10-05). No canonical state or migration change.

### Living-world delivery authorized

- 2026-10-05, originating branch `codex/living-world-main`, local: owner requested “merge, update local main”. Isolate the reviewed habitat/reaction/audio/place-activity/lawful-observation slice from unrelated primary drafts. Include its original wildlife assets/provenance and registry; canonical state, migrations and player data unchanged. Prior clean bootstrap PASS and independent capture review retained; exact PR CI and merge pending. [Owning behavior/checks](docs/wiki/m1-spec.md#реализация-живой-среды--2026-10-05).

### Living-world presentation implementation

- 2026-10-05, originating branch `main` (`f3d214c`), local: owner authorized
  implementation of the biome/living-world discussion. Habitat-specific four
  species now use actual flowers/trees and react to the company; opt-in local
  synthesized ambience, bounded day/night settlement work, lawful current map
  observations and company-known completed-work notes are integrated. Affected:
  web renderer/game presentation; owning [implementation and checks](docs/wiki/m1-spec.md#реализация-живой-среды--2026-10-05).
  No protocol, canonical state, migration or player-data change. Focused7,
  web typecheck/lint/format/architecture and representative native/component
  desktop/sound checks PASS after documented corrections. Independent affected
  source/capture critique found no remaining material defect after frog/bird
  scale correction; forest flight remains visually unproven. Clean final bootstrap
  PASS:643/47 skipped,10000 stress battles, migration smoke/14 PostgreSQL/auth
  checks; temporary DB removed. Real new journey, FPS and audible sound quality
  unverified.
  Actual moving patrols need unavailable route/observation state; no invented
  traffic, new species, seasons, paid art, publication, merge or deployment.

### Living-world layers beyond fauna — design follow-up

- 2026-10-05, originating branch `main`, local: owner's follow-up asks whether
  fauna is sufficient. [Owning recommendation](docs/wiki/m1-spec.md#достаточно-ли-фауны-для-живого-мира--2026-10-05)
  adds priorities for shared environmental motion, place-specific sound,
  settlement work, local reactions, actual world traffic and fact-bound
  consequences. Existing motion remains acknowledged; moving traders/caravans
  are not activated in M1. Documentation-only review-draft; no code/assets/audio
  or player-state change. Formatting/local links/readback checked; gameplay
  and browser acceptance NOT_RUN, appeal/production cost NOT_MEASURED.

### Biome-specific ambient wildlife proposal

- 2026-10-05, originating branch `main` (`f3d214c`), local: owner requested
  distinct biome fauna instead of hares/butterflies everywhere.
  [Owning matrix and next cycle](docs/wiki/m1-spec.md#20-биомы-и-живая-природа--2026-10-05)
  compare actual geography and four current wildlife forms with live WORLD/lore
  Notes/Purpose and inspected art. Propose habitat-based distribution, quiet
  forest/rock areas, dragonflies/ducks next, and later forest/night/domestic life.
  Real contract wolves/mill beast remain separate from ambient decoration.
  Only wiki/checkpoint/changelog documentation changed; runtime, assets and
  player state unchanged. Initial new-table formatting failure corrected;
  repeated formatting/local-link/readback checks PASS. Implementation, new
  browser journey/game tests/independent playable critique NOT_RUN; density/FPS
  NOT_MEASURED. Review-draft, not committed/published/merged.

### Company opening after reading Russian classics

- 2026-10-05, originating branch `main`, local: owner again rejected the
  compressed origin as non-literary and requested Lermontov, Dostoevsky and
  Tolstoy. Read the opening of Bela, Crime and Punishment I.1 and Caucasian
  Prisoner I–II; [sources and reading limits](docs/wiki/onboarding-references.md#классическая-проза--2026-10-05).
  Replaced the [five-page sample](docs/wiki/onboarding-book.md) with one
  third-person scene: proposal, questions, hesitation, paid hiring and arrival
  next morning. Miron is only a sample name for the player-selected leader.
  [Owning history and checks](docs/wiki/onboarding-lore.md) retains prior
  rejections. This sample covers two companions only; background mapping and
  first-job availability remain unresolved. M1 contracts/supplies/code unchanged.
  New prose is review-draft, not accepted or published; UI/art/playtest NOT_RUN.

### Company opening revised after owner rejection

- 2026-10-05, originating branch `main`, local: supersedes the military-opening
  recommendation below. Owner rejected its prose and fit with Warwrit, authorized
  a new origin, then requested clearer language and believable motives. Earlier
  rank correction and D&D reading remain historical research. The current
  [five-page book](docs/wiki/onboarding-book.md) follows a completed escort job,
  known companions and paid hiring from savings;
  [owning comparison](docs/wiki/onboarding-lore.md) records rejections and scope,
  [references](docs/wiki/onboarding-references.md) retain actual reading limits.
  Existing backgrounds, world contracts and supplies are unchanged. Navigation,
  wiki log and CURRENT_PLAN corrected after the shared writer completed.
  Formatting/local-link/readback checks PASS; UI/art/playtest NOT_RUN.
  New prose remains review-draft, without owner acceptance; not published/merged.

### Place motion merged closeout

- 2026-10-05, originating branch `codex/place-motion-sync`, merged:
  [PR150](https://github.com/Vovanostm/warwrit/pull/150), reviewed2c271ce,
  merged asf3d214c. PR CI37318286511 SUCCESS: bootstrap639/47 skipped,
  10000 stress battles, migrations/14 PostgreSQL checks, coverage and audit.
  Independent source/current-capture review found no material defect. Local
  main updated to the same remote commit; only two shared documents required
  scoped recovery, preserving all other drafts/player data and both histories.
  Integrated typecheck/diff/readiness PASS; existing local5293 runtime restored
  without data reset/migration. Main CI37319767204 IN_PROGRESS, new logged-in
  journey NOT_RUN; no deployment. Supersedes earlier local/pending motion entries.
  [Owning closeout](docs/work-packages/M1-LIVING-PLACES.md#motion-synchronization-merged-closeout--2026-10-05).

### Synchronized place motion

- 2026-10-05, originating branch `codex/place-motion-sync`, local: owner
  authorized merge/local-main update of the timing correction. Reapplied on
  PR149/main `793ce7e`, retaining its mount/draw extraction. `PlaceScene.tsx`,
  `place-scene.css` and `place-depth-scene.ts` drive painting, doors/smoke and
  outer layers from the same smoothed look, including startup/pointer leave,
  with no second active CSS transition. Assets/depth/amplitudes, fallback,
  reduced motion and player data retained. Earlier focused/browser review is
  historical; fresh typecheck/projection2/coverage639/47 skipped/audit and
  desktop360-frame/input/reduced-motion/fallback PASS, source review clear;
  fresh capture review/PR CI/merge pending. No migration/deployment.
  [Owning behavior, checks and limits](docs/work-packages/M1-LIVING-PLACES.md#motion-synchronization-delivery--2026-10-05).

### Location depth isolated validation

- 2026-10-05, originating branch `codex/place-depth-main`, local: final
  navigation-base candidate passes coverage639/47skipped, focused projection2/2,
  web typecheck, scoped lint/format and ordinary audit. Initial CRAP findings
  were corrected by cohesive mount/render/interpolation extraction with the
  same behavior and unchanged gate. Fresh isolated desktop native entrance,
  Escape/focus, movement, remount and12 actual extreme/fallback/reduced-motion
  states pass. Failed automation attempts and current evidence are retained in
  [owning verification](docs/work-packages/M1-LIVING-PLACES.md#isolated-candidate-verification--2026-10-05).
  Source scope and desktop policy above remain; PR CI/merge pending, FPS/memory
  NOT_MEASURED, full mill journey NOT_RUN.

### Location depth delivery authorized

- 2026-10-05, originating branch `codex/place-depth-main`, local: owner
  approved publication, merge and local-main update of the existing depth slice.
  Isolated branch starts at navigation main9ee53d3 and retains the reviewed DPR
  and foreground-edge corrections plus desktop policy. Scope and selected
  current visual evidence in
  [owning delivery record](docs/work-packages/M1-LIVING-PLACES.md#publication-authorized--2026-10-05).
  Local coverage and ordinary audit are recorded there; current-head PR CI,
  publication and merge remain pending. Unrelated primary drafts/player data
  preserved; no new migration or canonical gameplay change.

### Synchronized place motion

- 2026-10-05, originating branch `main`, local: owner-reported place image/
  parallax timing mismatch corrected in `PlaceScene.tsx`, `place-scene.css`
  and `place-depth-scene.ts`. Active outer layers now use the painting's
  smoothed look in the same render frame, including startup and pointer leave;
  remove their independent450ms CSS delay. Existing assets/depth/amplitudes,
  entrances/smoke, reduced motion, fallback and player state retained. Focused
  source checks and360-frame desktop component-browser/input checks PASS;
  independent source/seven-capture critic found no material defect; full
  journey/game/DB gate NOT_RUN.
  Local/uncommitted/unpublished, no migration or deployment.
  [Owning behavior, checks and limits](docs/work-packages/M1-LIVING-PLACES.md#синхронизация-движения-слоёв--2026-10-05).

### PR148 merged and primary main updated

- 2026-10-05, originating branch `codex/map-topology-experiments`, merged
  [PR148](https://github.com/Vovanostm/warwrit/pull/148) as `9ee53d3`; local-main
  closeout on `main` after the owner's explicit merge/update request. PR and main
  CI SUCCESS. Coordinated primary/doc write freezes, scoped six-document recovery
  and safe fast-forward retained all local source, assets, lore/forest/place/wildlife
  histories and player data. HEAD, origin/main and GitHub main match `9ee53d3`.
  Core build, core/web typecheck, diff and5287 proxied readiness PASS; normal
  browser reload restores the rendered map and original stationary850-crown company.
  No new travel or full integrated gameplay gate was run in this update; retained
  starvation limitation remains. Recovery stash retained; unrelated drafts remain
  uncommitted. No migration, deployment or player reset.
  [Owning closeout](docs/wiki/m1-spec.md#слияние-и-обновление-primary-main--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, published:
  [PR148](https://github.com/Vovanostm/warwrit/pull/148) delivers the owner-selected
  hex default, cached exact route edges and bounded terrain detours. Independent
  source/playable review and focused checks pass; current-head clean CI and the
  explicitly authorized merge remain pending. Primary main is at PR147 with
  concurrent drafts preserved. GitHub owns subsequent CI/merge facts.
  [Owning delivery record](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

### Company origins and illustrated opening — design proposal

- 2026-10-05, originating branch `main`, local: owner requested lore, MMO
  consistency, literary/Slavic references and a credible illustrated opening.
  [Owning comparison](docs/wiki/onboarding-lore.md),
  [ten-page book and late entry](docs/wiki/onboarding-book.md) and
  [sources/quest motifs](docs/wiki/onboarding-references.md) compare four origins
  and propose one shared military catastrophe with distinct witnesses, followed
  by later arrivals with other histories. Name/appearance precede the book;
  company naming follows it. Dragon, war, biographies and legal procedure remain
  proposals; existing M1 contracts, starting supplies and accepted private-world
  scope are preserved. Documentation fields/local links/formatting checked;
  initial formatting and link-parser issues corrected in owning results.
  Navigation and CURRENT_PLAN updated after parallel writers completed.
  No code/art implementation, publication or merge; gameplay/CI/independent
  playable critique NOT_RUN, reading time/appeal/capacity NOT_MEASURED.

### Ambient map wildlife

- 2026-10-05, originating branch `main`, local: owner-requested hares and
  butterflies animate on the global map. `map-wildlife.ts`, its regression,
  four continuous-map lifecycle additions, original `wildlife-v1` atlas/provenance
  and two asset registrations implement seeded safe habitats, bounds/rest,
  irregular winged flight and night response without targets or canonical NPC
  state. Future parties/traders/enemies remain separate scope. The independent
  integrated critic's butterfly readability finding was corrected and repeated
  desktop capture review found no remaining material defect. Focused checks,
  final primary typecheck/lint/format, architecture and content validation PASS;
  initial clean bootstrap PASS (632/47 skipped, 10,000 stress battles, migrations/
  14 PostgreSQL tests), corrected-source final bootstrap PASS with the same counts
  and temporary infrastructure removed. Pan/zoom and
  day/night motion inspected; retained company stayed stationary with 850 crowns.
  FPS/memory/enjoyment NOT_MEASURED; wildlife travel/STOP/reload NOT_RUN by this chat.
  Not committed/published/merged; no migration, player reset or deployment.
  [Owning results and limits](docs/work-packages/M1-FREE-MOVEMENT.md#ambient-map-wildlife--2026-10-05).

### Forest main/runtime closeout

- 2026-10-05, originating branch `codex/forest-diversity-main`, merged PR147
  `548837c`; local runtime/integration closeout on `main`: owner requested normal
  sign-in, verification, writer coordination and working primary main. Both active
  primary authors paused writes; safe fast-forward retained all drafts and both
  histories, with recovery stash kept. Restored5287/API3187/realtime3188 and matched
  PUBLIC_ORIGIN/OIDC callback without changing the other author's .env/services
  or retained player DB. Wildlife consumes the merged polygon-edge helper; its
  source/atlas remain the other local slice. Scope: forest integration/runtime,
  `M1-FREE-MOVEMENT`, `CURRENT_PLAN` and this entry. PR/main CI SUCCESS, integrated
  web typecheck/diff/readiness PASS; actual normal-UI opening, movement/S/reroute,
  reload/arrival, purchase and pan/zoom/day/night proof in separate test DB.
  Final independent forest critic PASS, including fully rendered settled reload
  at1365×900; old-company starvation recovery remains outside
  accepted rules. No deployment, player reset, new migration or full-M1 claim.
  [Actual result and limits](docs/work-packages/M1-FREE-MOVEMENT.md#primary-main-integration-and-actual-journey--2026-10-05).

### Tree diversity on current main

- 2026-10-05, branch `codex/forest-diversity-main`, local: owner requested the
  working 14-form forest in main. Continue PR146's composed curved crowns and
  original atlas style, with age/species silhouettes and deterministic natural
  pockets/clearings; preserve relief, input, routes and gameplay. Scope: web tree
  forms/geometry/placement/geography/mount and owning docs. Prior whole-sprite
  attempt and primary unrelated drafts/player data remain preserved. Four focused
  geometry/placement checks, typecheck/build/lint/content pass;
  independent source and day/night art critic READY_WITH_LIMITS. Full local
  coverage FAILED two unchanged navigation timeouts (629 pass/47 skip); normal
  PR CI/merge pending, authenticated journey NOT_RUN after automatic login
  rejection. Shared picking decoder/terrain validation and site-assembly extraction retain
  projection, material, alpha and input guards; final unchanged audit passes
  with current focused coverage.
  Active primary location-depth writer prevents overlapping shared-file writes;
  no deployment or new migration.
  [Owning scope/results](docs/work-packages/M1-FREE-MOVEMENT.md#tree-diversity-on-current-main--2026-10-05).

### Desktop target

- 2026-10-05, originating branch `main`, local: owner specified desktop as
  the supported game version, with landscape-only mobile viewing of the same
  interface at a smaller scale. [AGENTS.md](AGENTS.md#desktop-viewport-and-mobile-orientation)
  records the shared layout/acceptance target and excludes a separate mobile
  or portrait UX. Existing adaptations are retained; this changes instructions,
  not the UI. Current place work follows the updated scope. Documentation
  readback, formatting and scoped diff/link checks completed at closeout;
  no game tests needed for this policy-only change. Not published or merged.

### Location depth implementation

- 2026-10-05, originating branch `main`, local (not committed or published):
  owner requested optimal method selection, implementation, review and testing.
  Five offline Depth Anything V2 Small maps drive an original Babylon.js
  perspective shader; doors and smoke share the depth projection. Existing
  paintings, distant/foreground layers and game actions are preserved. Scope:
  `PlaceScene`, place layout/CSS, new `place-depth-*` renderer modules/tests,
  `prepare-place-depth.py`, `places/depth-v1`, additive asset registry and
  [owning result](docs/work-packages/M1-LIVING-PLACES.md#location-depth-implementation--2026-10-05).
  Focused projection tests, web build/typecheck, architecture and content97
  PASS. Independent repeated source/visual critique found no open material
  defect in five scenes/day/night/extremes; corrected the reproduced GPU-fallback
  edge strip by retaining the original static parallax range and resetting look.
  Final clean bootstrap at `548837c` plus this slice PASS:633/47skipped,
  10000-battle stress, migrations/14 PostgreSQL checks. Native entrance/Escape,
  remote-access and reduced-motion/fallback/lifecycle assertions PASS; harness
  and motion-frame proof limits are recorded in the owning document. Earlier
  final-source attempt was interrupted during build, not counted as a pass.
  Unrelated dirty work and retained player data preserved. No migration,
  publication of this slice, merge, deployment or paid provisioning. Forest PR147
  was integrated separately by its authorized writer with this dirty slice retained.

- 2026-10-05, originating branch `main`, local sharpness correction: native
  final view exposed a half-size canvas after a DPR2→1 transition. Removed the
  place renderer's manual hardware scaling override; shared Babylon adaptive
  scaling now retains full DPR resolution. Fresh DPR1/DPR2 mounts and repeated
  viewport/DPR changes PASS; new neutral/extreme/motion captures and affected
  independent critic show no material defect. Corrected clean bootstrap on
  `548837c` plus this slice PASS:633/47skipped,10000 battles,migrations/14PG.
  Prior cancelled stale-copy attempt is not counted. Updated source and
  [correction/evidence](docs/work-packages/M1-LIVING-PLACES.md#исправление-чёткости--2026-10-05);
  other authors' forest closeout preserved. FPS NOT_MEASURED; remains uncommitted.

- 2026-10-05, originating branch `main`, local gate-edge correction: owner
  reported clipped foreground edges at mouse extremes, missed by the previous
  visual pass. Active CSS foreground overscan increased to1.13 to cover the
  full42/21px travel; fallback/reduced-motion behavior retained. Native32-corner
  checks across four settlements/minimum desktop/fallback/reduced motion and
  scoped CSS format/diff PASS; affected critic DONE, no material finding. Full game/DB gate
  NOT_RUN for this CSS-only followup, FPS NOT_MEASURED. Scope: place CSS and
  [owning correction](docs/work-packages/M1-LIVING-PLACES.md#края-переднего-плана--2026-10-05);
  retained data/other writers untouched; uncommitted/unpublished.

### Location depth research

- 2026-10-05, originating branch `main`, local (not committed or published):
  owner requested modern simple methods and ready workflows for perspective
  inside location paintings. [Owning comparison](docs/work-packages/M1-LIVING-PLACES.md#location-depth-methods--2026-10-05)
  records source-checked tools, model/license/device limits and a proposed
  depth-shader-first prototype with selective occlusion repair. Updated only
  `M1-LIVING-PLACES`, `CURRENT_PLAN` and this entry; existing dirty work retained.
  Documentation readback, formatting, scoped diff and local links checked.
  No game/asset change; tool execution, integration and playable critique
  NOT_RUN, quality/performance NOT_MEASURED. No publication/merge/deployment.

### Terrain implementation

- 2026-10-04, branch `main`, local (not committed or published): owner requested
  implementation of [terrain-art](docs/wiki/terrain-art.md#13-реализация--2026-10-04)
  with subagents. First five original ink terrain/road PNGs and exact provenance
  use existing material slots; asset registry preserves historical resources.
  Removed the legacy 38% flat meadow tint so authored earth/grass washes survive.
  Scope: `assets/art/m1/terrain-ink-v1`, `assets/manifest.json`, renderer `art.ts`
  and `terrain-material.ts`; unrelated dirty route/docs preserved. Focused web
  typecheck, content validation, production build and lint/format passed. Independent
  source/raster critic found no established defect, but current integrated views
  and movement remain NOT_RUN after expired login and rejected test sign-in.
  Explicit sign-in/trip approval pending. Remaining five materials, full visual
  acceptance and candidate performance NOT_RUN/NOT_MEASURED; no merge/deployment.

### Added

- 2026-10-05, branch `codex/map-topology-experiments`, local (started 2026-10-04): owner-requested
  implemented comparison of square and six-neighbor hex navigation over the same
  exact geometry, roads and speed policy. Static road-edge costs and surface
  priority preparation are retained per field. At this stage, production kept
  square search and hex was opt-in; the later owner decision under Changed
  supersedes that default. Persisted V2/V3 plans remain unchanged.
  101 cases × 3 interleaved repeats: optimized square keeps 297/297 successful
  paths/durations, p95 175.96→100.09ms; hex p95 90.96ms but mean/worst travel
  duration +1.32%/+9.32%. Adds the finite reproduction script and measured case
  evidence; extends existing road-detour/thin-bridge specifications.
  [Owning results and limits](docs/wiki/m1-spec.md#эксперимент-и-реализация--2026-10-04).
  Final bootstrap PASS (verify 631/47 skipped, stress 10000, migrations/auth 14);
  separate movement PostgreSQL 11 and domain 20 PASS. Move/STOP/reload/reroute
  inspected independently from captures/response evidence; no confirmed new
  navigation defect. Historical failed attempts/limits remain in the owning page.
  Adds `experiment:navigation` in package.json. No migrations, deployment or
  merge; local uncommitted isolated checkout only, primary writers preserved.

- 2026-10-04, originating branch `main` at `bcc30f5`, local: owner-requested
  [global-map topology research and proposal](docs/wiki/m1-spec.md#19-гексы-устройство-глобальной-карты-и-генерация--2026-10-04)
  compares hex authoring, exact movement, terrain blending, current weighted
  search and future generation using current source and primary references.
  Recommends keeping continuous movement/exact roads and measuring search before
  changing topology; updates `CURRENT_PLAN` and wiki log. 100-goal source probe:
  98 paths/2 blocked goals / 0 errors, p95 1014.78ms under concurrent local builds;
  isolated performance/hex benefit NOT_MEASURED, game tests/browser/critic NOT_RUN.
  Documentation readback, local links and scoped diff checked. Changes are only
  in an isolated documentation checkout due to primary shared-file writers;
  NOT_INTEGRATED, uncommitted/unpublished. No game or save changes.

- 2026-10-04, originating branch `main`, local: owner-requested
  [terrain art specification](docs/wiki/terrain-art.md) for fields, marshes and
  roads coherent with existing ink town/village art. Defines shared inspected
  references, ten target materials, transitions, road-direction constraints,
  staged production and integrated visual/gameplay acceptance. Preserves the
  owner's example under `docs/wiki/references/`; updates wiki navigation/log and
  `CURRENT_PLAN`. Production details and numerical targets remain proposals.
  Documentation readback, links, formatting and scoped diff checked; new textures,
  game/runtime acceptance NOT_RUN, performance NOT_MEASURED. No publication/merge.

- 2026-09-29, #125: fallow (`pnpm check:dead-code` in `pnpm verify`,
  `pnpm check:changes` on pull requests, `pnpm report:quality`) and ast-grep
  code-shape rules with rule tests (`pnpm check:patterns`).
- 2026-09-29, #128: `pnpm test:coverage` (v8, no threshold) as evidence for
  `fallow health --coverage`; specifications for encounter HTTP authorization,
  the encounter command guard and duty-change learning settlement.

- 2026-09-29: `pnpm agent:status` prints live main, CI, open pull requests,
  active unmerged branches with their paths and the next migration number from
  git and gh, replacing hand-written status readback.
- 2026-09-30, #133: Git `pre-commit` and `pre-merge-commit` hooks run
  `pnpm check:changes` for every agent and terminal, not only Claude; Markdown-only
  commits skip. `pnpm install` (or `pnpm run prepare` in an existing clone) sets
  `core.hooksPath`, and `pnpm agent:preflight` reports it. Codex rules prompt on
  `git commit --no-verify`.

### Fixed

- 2026-10-05, originating branch `codex/component-forest-integration`, merged:
  [PR146](https://github.com/Vovanostm/warwrit/pull/146), reviewed `2ed5f08`,
  merged as `917644a`; supersedes pending entries below. Dark map art, composed
  trees, grounded contacts, alpha picking and labels retain main roads/supplies/
  unmasked routes. PR CI37234733636 SUCCESS: bootstrap628/47 skipped,10000 battles,
  migrations/14 PostgreSQL checks, coverage and unchanged audit. Primary main
  updated; both histories and five local terrain-ink slots preserved, restore
  conflicts resolved and recovery retained. Main push CI37235532971 IN_PROGRESS.
  Bounded critic approval; combined-route recapture/post-merge browser refresh
  NOT_RUN after URL-policy rejection. Local drafts remain outside PR art acceptance.
  [Owning result/limits](docs/work-packages/M1-FREE-MOVEMENT.md#component-forest-merged-closeout--2026-10-05).
  Primary typecheck/content92/format/diff PASS; Airtable checkpoint read back.
  Empirical event FAILED (storage limit), recorded in owning closeout.
  No migration, player-data reset, deployment or full-M1/performance claim.

- 2026-10-05, branch `codex/component-forest-integration`, published PR146:
  integrated newer main `4a82c36` (merged PR145) after concurrent route delivery.
  Preserved full unmasked route/goal annotations and both dated documentation
  histories; resolved only the React import and changelog insertion conflict.
  Final PR-head CI remains required. Browser refresh/capture via the in-app tool
  was blocked by its URL policy; no alternate browser workaround attempted.

- 2026-10-04, branch `codex/component-forest-integration`, local: owner-requested
  dark-fantasy map correction ports approved original terrain/settlement art and
  composed trunk/crown trees onto current main relief. Entrance/root pivots,
  alpha-aware targets and measured labels preserve a shared isometry and natural
  contacts. Scope: web map renderer/labels, original map-dark assets/provenance
  and manifest; roads, supplies, visits and canonical movement retain current main.
  [Owning integration](docs/work-packages/M1-FREE-MOVEMENT.md#component-forest-integration--2026-10-04)
  records actual checks and limits; exact-head PR CI/merge pending.

  Independent source/playable critique and native journey/input pass; original
  audit regressions corrected by bounded assembly/projection/measurement helpers
  and shared deterministic hash/obstacle primitives. One meaningful assembled-tree
  geometry regression added; final coverage628/47skip and audit pass. Exact-head
  PR CI/merge pending; primary concurrent drafts/writers preserved.

- 2026-10-05, originating branch `codex/route-visibility-fix`, merged:
  main push CI37233985843 completed SUCCESS at `4a82c36`, superseding the
  in-progress status below. Live remote main, origin/main and primary main match;
  route files have no local diff. Dev5293 restored the retained company (800
  crowns); readiness and documentation format/diff checks passed. Unrelated
  local terrain/art/wiki/skill work remains preserved. No deployment.

- 2026-10-04, branch `codex/route-visibility-fix`, merged:
  [PR145](https://github.com/Vovanostm/warwrit/pull/145), reviewed head `988eea2`,
  merged as `4a82c36`. PR CI37233180326 passed full bootstrap627/47 skipped,
  10000-battle stress, migration smoke/14 PostgreSQL checks, coverage and audit.
  This supersedes the local/pending entries below. Primary main updated to
  origin/main; scoped documentation restore retained both histories and all
  unrelated terrain/art/wiki/skill work. Main push CI37233985843 is in progress;
  dev5293 and player data retained. Actual merge/results are recorded in
  [the owning closeout](docs/work-packages/M1-FREE-MOVEMENT.md#route-visibility-merged-closeout--2026-10-04).

- 2026-10-04, branch `codex/route-visibility-fix`, local: owner authorized
  publication and merge of the reviewed route visibility correction. Isolated
  delivery includes only the three map files and owning movement/checkpoint/
  changelog records, preserving unrelated terrain/art/docs and retained player
  data. Clean PR CI/publication/merge pending; scoped source and playable results
  are recorded in [the owning contract](docs/work-packages/M1-FREE-MOVEMENT.md#route-visibility-delivery--2026-10-04).

- 2026-10-04, branch `main`, local: owner-authorized normal-UI testing now
  supersedes the permission-pending route correction status below. Town/village
  paths and complete site/ground diamonds were inspected at day/night and
  close/overview scales; S and arrival clear annotations, and reload restores
  the moving route with map art loaded. Independent moving-capture critique found
  no material defect, including the corrected settled-reload capture. Final return
  arrived in Kamenny Brod with overlay cleared; retained company has 800 crowns.
  Existing focused source checks apply to unchanged code; full gate NOT_RUN.
  [Actual journey and limits](docs/work-packages/M1-FREE-MOVEMENT.md#playable-verification-after-owner-authorization--2026-10-04).

- 2026-10-04, branch `main`, local (not committed or published): owner screenshots
  exposed cropped destination markers and missing route sections near settlements.
  Removed SVG clipping by full settlement sprite rectangles, including transparent
  margins; route annotations stay above the map while terrain-draped geometry,
  party junction, label avoidance and input remain unchanged. Affected paths:
  `ContinuousMapCanvas.tsx`, `renderer/route-overlay.ts`,
  `renderer/continuous-map-scene.ts`. Web typecheck, scoped ESLint/Prettier and
  diff checks passed. Live DOM has no route masks and retains `pointer-events: none`.
  Moving visual acceptance is pending permission to move the retained company;
  independent source critique confirmed the fix's cause/scope; no current moving
  visual verdict, new full gate, publication or merge. See
  [route visibility correction](docs/work-packages/M1-FREE-MOVEMENT.md#settlement-route-visibility-correction--2026-10-04).

- 2026-10-04, `codex/supplies-delivery`, merged: [PR144](https://github.com/Vovanostm/warwrit/pull/144)
  merged as `bcc30f5`; this supersedes the published status below. Final-head
  CI passed bootstrap, stress, migrations, coverage and changed-code gates.
  Primary main updated; main push CI37213517376 also passed. Unrelated owner
  drafts/skills and player data retained.

- 2026-10-04, branch `codex/supplies-delivery`, published (not yet merged):
  supplies can be bought through the local bazaar/granary with finite merchant
  stock, exact cash and retained retry receipts; future companies start with
  thirty rations and 800–850 crowns after hiring. Opening forms survive definitive
  rejection and refresh expired options before new requests. The proportionate
  party sprite, terrain-grounded ring and draped route share their foot junction.
  Independent review corrected legacy first-POST initialization, remote-cash
  quotes, carried ration ownership, malformed pending purchases, incomplete
  receipts and GAME_OVER purchase controls. A new ordered 0014 migration retains
  shop state and refuses destructive rollback. Scope: company core/protocol/server,
  web opening/shop/map and party art; owner request and actual checks/limits are in
  [M1-SUPPLIES](docs/work-packages/M1-SUPPLIES.md#delivery-amendment--2026-10-04).
  Local verify627/47 skipped, coverage/audit and sequential PostgreSQL17 checks
  passed; independent source/visual critique found no remaining material defect
  in inspected evidence. Final PR CI/merge pending; expired-form browser creation
  remains NOT_RUN. Existing saves and unrelated drafts are retained.

- 2026-09-29, #128: combat initiative ties, AI targets and canonical replay order
  no longer depend on the host locale (`compareCodeUnits`); stress digest
  unchanged for existing ids.
- 2026-09-29, #128: CI now runs the encounter and OIDC PostgreSQL specifications
  in `pnpm test:migrations`; they were skipped because only `DATABASE_URL` was set.

### Changed

- 2026-10-05, branch `codex/map-topology-experiments`, local committed:
  integrated main `548837c` (PR147) with current trees and route visibility,
  preserving both histories in three documentation conflicts. Navigation source
  remains reviewed. Combined build/typecheck and normal desktop fixture
  move/STOP/reload/reroute/arrival PASS with exact retained points; current-head
  full PR CI and merge remain pending. No migrations, deployment or player-data reset.
  [Owning integration results and limits](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, local: final review fixes
  changed-code audit blockers by separating grid preparation and bounded exact
  shortcut selection and sharing the identical legacy span-duration rule in
  `continuous-movement.ts`. Independent revision review found no defect;
  202 exact route/outcome/duration comparisons, 22 focused coverage tests and
  unchanged audit PASS. Earlier loaded-host timeouts remain documented failures;
  PR-head CI and integrated browser acceptance are pending.
  [Owning delivery record](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, local: owner authorized
  review, publication, merge and local-main update for the measured hex default
  and routing optimization. Preserve current main's renderer improvements and
  concurrent primary drafts; final review/PR CI/merge remain pending.
  [Delivery checkpoint](docs/engineering/CURRENT_PLAN.md).

- 2026-10-05, branch `codex/map-topology-experiments`, local: owner chose hex
  search speed after disclosure of measured ≤7.2% longer trips. New polygon-v1
  orders default to hex; legacy grids and frozen accepted V2/V3 plans remain.
  Compile sorted neighbors/exact costs once and check ≤16 exact terrain-detour
  candidates before accepting direct smoothing. Eleven of 99 hex routes improve,
  none regress against previous hex; case 51 saves 22.85s. Matched 101×3 typical
  search 29.61→27.24ms, p95 essentially unchanged 219.85→217.97ms under variable host
  load. Updates existing movement specs to public exact-surface queries and adds
  a two-topology terrain regression. Core/tests/experiment and owning docs only;
  no migrations, publication, merge or deployment. JSON spec 3.5.1 records the
  owner decision with historical topology retained. Final bootstrap: 633 tests,
  47 skipped, 10,000 stress battles and migrations/14 DB checks PASS; normal STOP/reload/reroute/arrival
  and independent supplied-evidence critique pass within inspected scope.
  [Results, checks and limits](docs/wiki/m1-spec.md#почему-гексы-и-оптимизация-маршрутов--2026-10-05).

- 2026-10-04, branch `codex/supplies-playtest`, local (not committed or merged):
  [AGENTS.md](AGENTS.md#required-changelog-and-change-awareness) requires agents
  to record substantive changes and their reasons in this changelog before
  closeout/commit/publication, and read incoming entries with `CURRENT_PLAN`
  after resuming, changing branches or integrating changes. Owner requested
  this to prevent agents from confusing branch-specific work and missing new
  decisions. Entries identify affected paths, delivery status and source links;
  integration preserves both branches' history. This entry covers only the
  instruction change and changelog format clarification. Verification: scoped
  diff, readback and local link check; game tests `NOT_RUN` (documentation only).
- 2026-09-29: local containers run on colima; see
  [LOCAL_DEVELOPMENT.md](docs/engineering/LOCAL_DEVELOPMENT.md#container-runtime-colima).
- 2026-09-29, #125: seven internal-only game-core exports removed; `ajv` and
  `fast-check` declared by testkit, which imports them.
- 2026-09-29, #128: encounter routes authenticate in one encapsulated Fastify
  hook; `protocol` owns the encounter id format.
