# #318 build report — ordinary intent/result seams

2026-10-24. Branch: `Vovanostm/wages-command-seams-318`.
Source base: `6a58517953766f0381f04f870c074c10f49c3b97`.
Status: SUCCEEDED, committed local implementation. No publication; independent
Tier L and player acceptance remain coordinator-owned.

## Inherited attempt and recovery

Preserved history: report-only commit `1a96bc5ba9d457a38f452fe3b3d18a0c74e8e30b`
failed before source edits because `DATABASE_URL` was absent; integration setup
exited 1 without executing tests, and the documented loopback probe returned
`ECONNREFUSED`. That failure was environmental, not an executor regression.
The coordinator supplied an isolated PostgreSQL 17 environment for this attempt.
The unchanged focused executor integration run initialized and passed all 6 tests
(exit 0); the runner disposed its isolated database.

## Implementation and acceptance proof

- `ordinary-command.ts` exports only `ordinaryCommandIntent` and
  `ordinaryCommandSucceeded`. Both are synchronous and use public type-only
  package imports. The input excludes BuySupplies locally. Five explicit intent
  cases preserve company/access/site/agreement IDs and EndFieldCamp maps to
  EndMaintenance with reason LEAVE.
- The result selector preserves replay/residual rejection and the original
  equipment, camp and lifecycle predicates. Ordinary real-core/PG scenarios
  exercise lifecycle, equipment and camp success. Invalid intent, missing item,
  inaccessible stock, incompatible equipment slot and unavailable/duplicate camp
  transitions return existing codes/status 409 without aggregate/receipt/audit
  changes. Replay/residual guards are additionally preserved by source comparison;
  individual synthetic prepared-draft branches are not claimed as runtime proof.
- Rename and perk tests read the actual saved name/banner/perks plus receipts and
  audit. Equipment starts unequipped, then persists the requested character/slot.
  Camp tests read the same agreement's start/end, endedAt/knownEndedAt and saved
  core command with EndMaintenance/LEAVE, plus public revision and camp audit.
- Exact ordinary retry returns the original saved response after its public
  revision is stale and trusted input time advances by a day. Saved root, receipt
  and audit remain unchanged as parsed values. Changed-body collision is
  IDEMPOTENCY_CONFLICT; foreign receipt access is NOT_AUTHORIZED/status 403, with
  all domain persistence unchanged.
- Authorization, account/root locks, parser, common envelope, receipt-before-
  freshness ordering, time, due movement, evidence/context, error mapping and all
  persistence remain in executor. BuySupplies and all finance/protocol/migration
  owners are unchanged. Existing six travel/rollback/race regressions are intact.
- Inherited payment-mode/funds/debit/rounding/history/browser AC portions remain
  with later children and #167. This lane proves ordinary access/ownership and
  durable retry only; it does not deliver payroll or close #167.
- Independent Tier L reviewer/evaluator: NOT_RUN here, coordinator-owned.
  Runtime/player acceptance and 1440×900 day/night screenshots: NOT_RUN by the
  explicit allocation. No player-facing text changed; text.md is not applicable.

## Checks and exact outcomes

1. `pnpm exec vitest run --mode integration apps/server/src/company/executor.integration.test.ts`:
   baseline PASS, exit 0, 6/6 tests; new-test first run FAIL, exit 1, 9 passed/2
   failed because test expectations incorrectly assumed a command DB column and
   a different inaccessible-ration code. Expectations corrected from current
   storage/core contracts, without changing production behavior.
2. Same focused command before extraction: PASS, exit 0, 11/11 tests. After
   extraction: PASS, exit 0, 11/11 (5 ordinary + 6 inherited), zero skips.
3. `pnpm --filter @warwrit/server typecheck`: PASS, exit 0.
4. `pnpm exec eslint apps/server/src/company/executor.ts apps/server/src/company/ordinary-command.ts apps/server/src/company/executor.integration.test.ts`:
   PASS, exit 0.
5. Required `pnpm check:changes` immediately after first editing each of the three
   files: all three attempts FAIL, exit 2, inherited absent
   `coverage/coverage-final.json`. No threshold or audit configuration changed;
   the normal commit hook owns focused coverage refresh and final audit.
6. First normal implementation commit attempt: blocked, exit 1, by two introduced
   audit findings: ordinaryCommandIntent CRAP 42 and ordinaryCommandSucceeded
   CRAP 90 (coverage-mode integration cases are skipped). The hook refreshed its
   focused coverage successfully; its output excluded 20 inherited findings.
   Restructured the two selectors into finite camp selection, complete-draft and
   requested-effect predicates; real PG scenarios test their actual effects.
   `pnpm check:changes` after restructuring: PASS, exit 0, no new findings;
   inherited findings remain reported, without config/threshold changes.
7. After audit-required restructuring, focused real PG integration: PASS, exit 0,
   11/11 tests, zero skips; server typecheck, scoped ESLint/Prettier and diff:
   PASS, exit 0. Final normal implementation commit retry: PASS, exit 0; normal hook refreshed
   focused coverage and passed its audit with no new findings, excluding the same
   20 inherited findings. No hook bypass, suppression or threshold change.
   `bash scripts/check-pr-scope.sh`: PASS, exit 0, 184/300 changed source lines.
   No PR body exists, so the PR-body issue-closure check is NOT_RUN here.
8. Rebase, coordinator validation, game/browser runtimes, full verify, standalone
   coverage/stress/migration suites, install/setup/build: NOT_RUN, outside this
   allocation. No built-export prerequisite failed.

Audit warns that base/head semantic identities differ, so new-only comparison
uses syntactic attribution while retaining head type-aware refinement. This is
reported as a limitation; no configuration was changed to silence it.

The graph indexes another checkout at old head b44f5c1e; current source is proof.
All checks ran sequentially. No production database was accessed; no credentials
or connection strings are retained in evidence.

## Cleanup

All five focused integration processes exited and reported their file databases disposed;
its global teardown also removes the migrated template. Ordinary scenarios remove
world clocks in finally, then existing cleanup removes snapshots, owners, receipts,
audit and account fixtures with empty-table assertions. The file afterAll closes
the database pool. No background child process, server, browser or container was
started by this worker. Both normal commit-hook focused-test processes also
exited; coverage mode does not allocate integration databases and its PostgreSQL
cases are skipped, so it is not the real-PG proof above. Coordinator retains the exact Compose project/container
`warwrit-pipeline-318` and owns its later removal; it was not stopped here.

## Commits and proposed coordinator records

- `1a96bc5ba9d457a38f452fe3b3d18a0c74e8e30b`: inherited report-only failure,
  preserved without rewriting history.
- `c017d1b16984bc882ce11a868bc3e2711ad86fb2`: normal implementation commit,
  “Выделены намерения и проверки результата обычных команд #318”; source, tests
  and the working report. Normal hook PASS.
- Report-only successor: “Зафиксированы результаты сборки обычных команд #318”.
  Records the final source commit, checks and cleanup; inspect final branch HEAD
  for its ID. Its normal Markdown-only hook skips the source audit by design;
  the implementation head's executed normal audit above remains the evidence.

No push, PR, merge or publication was performed.
CHANGELOG/CURRENT_PLAN/wiki remain untouched under coordinator ownership.

Proposed CHANGELOG entry:
2026-10-24, branch `Vovanostm/wages-command-seams-318`, LOCAL, #318:
extracted ordinary intent selection and prepared-result predicates into
`apps/server/src/company/ordinary-command.ts`, retaining executor authority,
transaction and durable retry boundaries for later payroll composition.
Real PostgreSQL regressions preserve rename/perk/equip/camp effects, atomic
refusals and exact retry/body-conflict/foreign-account behavior. Payroll/API,
finance rules, protocol and migrations unchanged. Independent Tier L and
player/browser acceptance remain pending with coordinator/#167.

## Risks and next step

Behavior-preserving source extraction only; no new wage path. Coordinator must
review/evaluate this head, integrate shared records and run its allocated delivery
gates before publication. Original source-archive limitation is inherited and
unchanged. No new product-rule or source-ownership blocker was found.
