VERDICT: ACCEPT

Independent CI rework evaluation, 2026-10-19. No reproduced in-scope defect, ownership violation, or missing evaluation proof remains. This accepts the local candidate; publication, current-head hosted clean CI and owner-approved merge remain separate coordinator gates.

## Exact scope and authority

- Reviewed clean branch `Vovanostm/uix-w1-projection`, HEAD `9c929955a1f2ebffff05be542e127d2238d348b6`; unchanged at final readback.
- Read AGENTS.md, `warwrit-review` and `playwright` skills, complete current contract, eval-3, appended report section `#180-only rework round 1/2`, published evidence README, current checkpoint/changelog, live #180 body/comments and #217 body/D1/workflow-v2 decisions. D1 permits `threat-not-available` for existing B053 admission and limits privacy acceptance to the all-visible lab. #184/#187/#207 remain excluded.
- Checked graph inventory before source discovery: its Warwrit root is `/Users/vovanostm/learn/warwrit`, recorded HEAD `b44f5c1e0445413b4ed2eb2bf554b248266d73a1`, not this checkout/current HEAD. Used actual Git/source as proof; did not reindex the shared graph.
- Reviewed `git diff origin/main...HEAD`: eight production/test code paths are the contract-owned protocol, core, projector and web validator paths. Additional tracked changes are coordinator publication records and evidence. `git diff a2a7d1d..HEAD` changes **only** `apps/web/src/combat-lab/view-validation.test.ts` (70 insertions / 9 deletions). Compared apps/packages against previously accepted runtime source `fa7f516`, excluding that test: **empty diff**. No transport/controller, dependency, tsconfig, gate, renderer, replay, migration or admission workaround.

## Findings

None. The prior CI import-boundary defect is resolved in scope:

- **Criterion/boundary:** web imports public protocol contracts, not server internals; retain all eight public validator/session-reader regressions. **Prior counterexample:** published `a2a7d1d` test imported server custom-battle/projection; clean web build ran before game-core declarations and failed TS2307 in CI39192938216. **Smallest fix now present:** test lines2–7 import protocol constants/types and the existing local `createEmptyTiles`; lines12–75 return synthetic typed wire data. No package/build-order change.
- All previous test bodies/assertions, from `it('admits new and legacy omissions...')` onward, are **byte-for-byte identical** to `a2a7d1d`. This includes valid/legacy reads, malformed/foreign/allied/unknown/duplicate refusals, forbidden diagnostics, overlap, terminal corruption, NaN and object/string/null attackPreview through exported `isCombatLabView` and actual `readSessionView(Response(JSON))`. Their positive controls pass, so negatives are not all rejecting an already-invalid fixture.
- Fixture review: 165 plain tiles, two unique active opposing IDs, consistent positions/activation/initiative references, optional sprite fields, one nonoverlapping refusal for its active opponent. Synthetic profile/weapon/resource literals are wire test data, not a canonical battle or client admission policy. The test makes no projector-integration claim.
- Real admission/projector/privacy integration remains in unchanged server tests: `projection.test.ts:50` mill partition and nonmutation; `:112` command/resource precedence and rejected-state equality; `:160` exact LOS-only diagnostics; `:175` admitted B053, panic, opponent/terminal/empty partitions; `custom-battle.test.ts:694` authenticated public session reads and replay stability. These tests execute real server/core paths, independently of the synthetic web fixture.

## Fresh checks

| Check                                                                                                                                                                 | Actual result                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm exec vitest run apps/web/src/combat-lab/view-validation.test.ts apps/server/src/combat-lab/projection.test.ts apps/server/src/combat-lab/custom-battle.test.ts` | EXIT0, **25 PASS / 3 files**: 8 web regressions + 17 server tests. `eval-shots/ci-r1-focused-tests.log`.                                                                                                                                   |
| `pnpm --filter @warwrit/web typecheck`                                                                                                                                | EXIT0. `eval-shots/ci-r1-web-typecheck.log`.                                                                                                                                                                                               |
| Web `tsc --listFilesOnly` input inspection                                                                                                                            | 3,309 inputs, owned test included, **0 server/game-core paths**. `eval-shots/ci-r1-input-boundary.log`. This is dependency-boundary evidence, not hosted clean-build proof.                                                                |
| `git diff --check origin/main...HEAD`                                                                                                                                 | EXIT0.                                                                                                                                                                                                                                     |
| Coordinator final validation readback                                                                                                                                 | `../pipeline-coordinator/.orca/pipeline/tick-20261019T0630/projection-validate.log` ends with **PASS rebased / clean-tree / packages / typecheck / format / lint / related-tests / audit**. Read as coordinator execution; not rerun here. |

The builder's first main-based audit with validator-only coverage **failed** because server/core coverage was absent. The retained report then records focused three-file coverage25PASS and normal main-based audit PASS. The earlier failure remains history; this evaluator did not rerun coverage/audit or weaken gates.

## What I played

Started my own `pnpm dev:combat` after confirming no listeners on private API23845/web25845; its normal startup built protocol/core exports. Opened isolated headed Playwright session `uix-ci-r1-eval` at `/combat-lab`; used normal **Начать бой**, without modifying the editor. Untouched «Развалины мельницы», seed20261009, six per side, 165 cells. Actual viewport **1440×900**, DPR1.

1. At settled first human activation, real response **revision4**, actor **human-3/Лук**, 4/4AP, `attackPreview:[]`. Exactly six `out-of-range` refusals for opponents1–6, distances **5/7/9/11/12/14**, minimum1/maximum4; each living enemy occurs exactly once in preview/refusal partition. `eval-shots/ci-r1-initial.log`.
2. Hovered and clicked a wolf forecast entry, pressed Escape, then hovered/clicked the wolf in the rendered field. Used Home, W and Home on the battlefield; switched night then day. Camera framing changed, inspection remained usable. Passive fetch observation recorded **0 action POST**, **revision4 only**, same six refusals. No response mocks, API-order bypass, capability/header capture or source changes. Observer forwards the original fetch unchanged and records only response facts/counts. `eval-shots/ci-r1-passive.log` and wolf/passive snapshots.
3. Captured and personally viewed fresh **1440×900 day and night** screenshots at overview framing with wolf inspection. Files: `eval-shots/ci-r1-day-1440x900.png`, `eval-shots/ci-r1-night-1440x900.png`. These are current-head smoke evidence, not renewed visual acceptance or a native zoom matrix.
4. Clicked normal **Завершить ход** once. Exactly **1 action POST**, accepted activation-ended/started events, **revision4→5**, actor **human-3→human-6**. `eval-shots/ci-r1-command.log`.
5. Console: favicon404 only, zero warnings, no runtime/Babylon exception (`eval-shots/ci-r1-console.log`). Closed only my browser session and interrupted only my own dev exec session (EXIT130); final lsof shows **no listeners on23845/25845**. Other workers/services untouched. Runtime log: `eval-shots/ci-r1-dev.log`.

Tool-only limitations: wrapper help initially worked; later npx encountered an npm-cache EPERM. Used the already-installed Playwright CLI entrypoint directly, without changing cache ownership or installing anything. One stale lighting-button ref was rejected after its label/ref changed; fresh snapshot supplied the correct ref and continuation passed. Initial lsof syntax was corrected before the free-port check. These are tooling failures, not game defects. Auto-generated browser snapshots/console files from only this session were renamed to owned `ci-r1-*` paths.

## Reused proof and remaining gates

Production is unchanged from accepted `fa7f516`; reuse is explicitly attributed to eval2/eval3 and `docs/engineering/evidence/uix-w1-projection/README.md`, not claimed as new execution:

- F1 real-module malformed-boundary proof; source-before/source-after day/night at three viewports and genuine native Chrome125% readback/reset.
- Full mill journey through accepted move, mouse/key end-turn and UI completion at round9/revision160/human victory, 74 action POST; stable terminal inspection.
- Coordinator clean integrated bootstrap and paired deterministic stress equality; 15 baseline-saved replay streams with equal canonical state, complete events and accepted command counts across documented rulesets/schemas. Finite generated cases, not a historical replay archive or universal compatibility proof.

**NOT_RUN here:** battle completion, zoom/source matrix, full verify/build, stress, migrations, coverage/audit, publishing, PR writes, current-head hosted CI, commit/push/merge/deploy. **NOT_MEASURED:** performance, balance, capacity. No real fog-of-war or downstream rendering/wording acceptance is claimed. No new visual critic is required for this test-only delta.

Final live PR readback: PR229 OPEN, published head still `a2a7d1d3f0a305e421c5bd6e3d37b5eec1cfa15d`; its `Verify clean checkout` check is FAILURE. That is the prior CI failure, **not a failed or passed hosted run on9c92995**. Coordinator must publish the evaluated head and obtain its clean CI before delivery/merge.

## Proposed shared-document delta — coordinator only

Record that CI39192938216's web/server fixture import boundary is fixed at9c92995, all eight existing regressions remain unchanged, fresh evaluator25PASS/web typecheck/input-boundary and short mill smoke PASS, coordinator validation8/8 PASS, evaluation4 ACCEPT. Preserve the too-narrow coverage/audit failure as history. Prior accepted runtime/matrix/replay proofs apply to unchanged production; current-head hosted CI and owner-approved merge remain pending. Update owning CHANGELOG/CURRENT_PLAN/wiki/public evidence status at publication with actual results, without relabeling historical proofs as fresh.

Only this report and small `eval-shots/ci-r1-*` evidence were written. No source/shared records, refs, commits, PRs, other agents' files or services were changed; no Orca commands or subagents were used.
