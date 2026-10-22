# Changelog

Notable changes to the repository's tooling, gates and delivered behavior. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
project has no released versions yet, so entries stay under _Unreleased_. New
entries include their date, originating branch and actual delivery status; record
the merge date when merged. Earlier history is in the Git log and merged pull
requests.

## Unreleased

### Publish accepted OIDC test isolation — 2026-10-22, PUBLISHED

- `Vovanostm/codex-oidc-count-isolation-272`, #272: replace global rejection
  counts with one finite test-owned issuer query, including the attempted
  wrong issuer and sessions joined to owned accounts; original assertions and
  ordinary parallelism remain. No production authentication change.
- [Contract, author history, independent verdicts and day/night proof](docs/engineering/evidence/core-oidc-count-isolation/README.md):
  reviewer ACCEPT `72b6e4eb`, evaluator ACCEPT `6db7dd20`; source `37f35c6b`
  unchanged. Author account/session mutations fail the preserved equality and
  restore; five consecutive real PostgreSQL parallel runs PASS 60/60 each.
  Evaluator inspected those logs and independently played mill to round-8
  victory; independent OIDC auth runtime NOT_RUN.
- Ordinary main `c62ad2d0` integration `30a38904` conflicts only in coordinator
  records; both histories retained. Validator exit 0, 9/9 PASS; related OIDC
  skips without DB and does not replace author proof. Positive browser PID/port
  cleanup confirmed. This commit is being published; final CI/merge pending; no waiver.
- [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records #179 next sole web
  allocation and frozen #214. Complete ignored native proof is retained in the
  coordinator before cleanup. No setup/API/wiki/rule/replay/schema/migration/
  dependency change; full local integrated suites NOT_RUN, performance NOT_MEASURED.
- Record-update automation initially could not locate the merged history marker;
  conflict resolution had succeeded, but the status rewrite was NOT_RUN then.
  This entry and the new status block correct that record before publication.

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
