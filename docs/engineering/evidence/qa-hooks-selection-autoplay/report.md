# #267 selection/autoplay extraction — failed build

Date: 2026-10-22. Branch: `Vovanostm/qa-hooks-selection-autoplay`.
Outcome: **FAILED**. The normal commit hook rejected the candidate; no bypass or threshold change was used. Source WIP remains staged for the coordinator. No push, publication, issue mutation, or Orca command was performed.

## Commits and ownership

- Starting/current HEAD: `4d521247c2a0` (`docs: record #267 contract and bounded builder assignment`). Source base: `61a91600afeb33c6195e174d87e687c48416e694`.
- New commits: **none**. Ordinary `git commit -m "refactor(web): isolate combat selection and autoplay hooks (#267)"` exited **1** at the normal pre-commit audit. Therefore this is not a completed source step or delivery.
- Modified only `apps/web/src/combat-lab/CombatLab.tsx` and `apps/web/src/combat-lab/CombatLab.test.tsx`. `controller.ts`, `controller.test.ts`, shared records, dependencies and other source were not changed.
- Candidate source diff against the child source base: **106 additions + 53 removals = 159**, excluding tests. Test diff: 11 additions + 1 removal. Starting coordinator documentation changes are pre-existing and parent-owned.
- Both hooks remain in CombatLab.tsx, with explicit named inputs/returns. Selection owns its four state pairs, current skill ref, hotkey ref and effects. Autoplay owns its state, refs, stop, continuation effect and toggle. The caller retains latest action assignment, admission/transport bodies and unmount guard.

## Acceptance criteria and evidence

| Criterion                                                                               | Actual proof / status                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1: replay/restart/editor/single-step/start-stop and disabled states preserved         | Source diff preserves the existing control predicates, labels, callbacks and lifecycle bodies, delegating only the autoplay toggle. Existing focused editor and replay/restart/controller regressions PASS within 38/38 tests. Runtime journey, replay download and actual restart requests: NOT_RUN. Full AC1 acceptance is not claimed.                                                                                                                    |
| AC2: keyboard/manual guards preserved, focused tests and ordinary mill confirm them     | Existing hotkey, focus/Escape, aimed-skill, manual admission and autoplay policy regressions PASS within 38/38 tests. Source retains consumer authority and synchronous ref mutation sites. Ordinary mill browser confirmation: NOT_RUN. Full AC2 acceptance is not claimed.                                                                                                                                                                                 |
| Selection hook current skill, reset dependencies, Escape and listener cleanup           | Source preserves render-time skill-ref assignment, keydown dependencies `[]`, exact target handling/listener removal, skill-only reset dependencies `[session?.id, session?.view.activation?.id]`. New real React server-render test confirms initial editor composition. Mounted rerender/reset/Escape/listener cleanup: NOT_RUN; server rendering is not lifecycle proof.                                                                                  |
| Autoplay start/stop ordering, latest callback, timeout cancellation and admission       | Source preserves clear skill → ref true → state true; stop ref false → state false; original `[autoplay, session, pending, sessionLost, deleting]` dependencies and 550 ms timeout/ref check/cleanup. Latest callback assignment stays after `act`; unmount guard and 750 ms polling remain in caller. Existing continuation/admission regressions PASS. Mounted 549+1 ms, action-only rerender, held responses, stop/unmount and request counting: NOT_RUN. |
| New/extracted functions meet measured coverage/complexity gate and normal commit passes | **FAIL** overall: ordinary audit and ordinary commit audit exit 1. The audit does not list either extracted hook among its seven threshold findings, and focused V8 coverage records one real server-render invocation of each hook. Individual hook metric/CRAP values were not separately exported: NOT_MEASURED. No mounted-effect coverage or per-function acceptance is claimed.                                                                        |
| Intermediate component measurement; final gate retained on #269 AND #262                | Measured by normal audit: CombatLab cyclomatic **33**, cognitive **44**, CRAP **33.0**. This fails 20/15 and is not final acceptance. The audit's `100% tested` attribution for this outer function comes from server rendering and does not establish browser behavior. Final #269/#262 acceptance remains outstanding.                                                                                                                                     |
| Source cap and boundaries                                                               | Ordinary diff: 159 source additions plus removals, below 300; only two allocated files modified. No B/C extraction, transport/poll/retry move, new dependency or synthetic lifecycle harness. Committed scope-script proof: NOT_RUN because commit failed.                                                                                                                                                                                                   |
| Rebase, validator, 1440×900 seed 20261009 day/night smoke                               | NOT_RUN after the normal gate rejected the candidate, following the task's explicit hard-stop instruction. No screenshots produced; play server never started, so stop was not needed. Independent Tier U remains coordinator-owned and NOT_RUN.                                                                                                                                                                                                             |

## Checks and exact outcomes

1. Checkout/status: clean starting tree; branch and HEAD read back. `pnpm agent:status` PASS; origin/main `61a91600`, separate pipeline coordinator lease observed. The available graph belongs to another root/head, so source inspection was used.
2. `pnpm check:changes` after first source edit: FAIL, missing `coverage/coverage-final.json`; log `audit-first-source.log`.
3. `pnpm check:changes` after first test edit: FAIL, same missing coverage file; log `audit-first-test.log`.
4. `pnpm exec vitest run apps/web/src/combat-lab/CombatLab.test.tsx apps/web/src/combat-lab/controller.test.ts`: PASS, **2 files / 38 tests**, 45.24 s.
5. `pnpm --filter @warwrit/web typecheck`: PASS, exit 0. Later source change only removed the unused caller destructuring binding described below; final-head repeat: NOT_RUN after the audit hard stop.
6. Scoped ESLint first run: FAIL, unused `setAutoplay` caller binding. Removed that binding; hook still returns the required setter. Scoped ESLint rerun: PASS, exit 0.
7. Scoped Prettier on the two modified files: PASS. `git diff --check` / staged diff check: PASS.
8. `pnpm exec vitest run apps/web/src/combat-lab/CombatLab.test.tsx apps/web/src/combat-lab/controller.test.ts --coverage --mode coverage`: PASS, **2 files / 38 tests**, 23.19 s; log `coverage.log`. Whole-project denominator: statements 2.18%, branches 2.36%, functions 2.12%, lines 2.15%; this is a focused run, not whole-game coverage. Individual mounted effects remain unexecuted.
9. Covered `pnpm check:changes`: **FAIL, exit 1**, 116.14 s; log `audit-covered.log`. Default base was upstream `4d521247`; seven complexity findings, five inherited exclusions.
10. Ordinary commit hook refreshed related-test coverage and pinned `FALLOW_AUDIT_BASE=61a91600afeb33c6195e174d87e687c48416e694`: **FAIL, exit 1**, audit 114.79 s; log `commit.log`. The hook redirects its related-test results; no exact related-test count is claimed. No focused-test-failure warning appeared. The normal commit was not created.
11. Rebase / `bash scripts/orca-validate.sh` / committed `scripts/check-pr-scope.sh`: NOT_RUN because no source commit could pass the normal gate.
12. `bash scripts/orca-play.sh start`, browser smoke, screenshots and `stop`: NOT_RUN because the task explicitly requires stopping when the normal audit cannot pass within scope.
13. Full verify/build/stress/migrations: NOT_RUN, prohibited for this focused worker. Performance: NOT_MEASURED.

### Normal commit audit findings

| Function     | Line | Cyclomatic | Cognitive |  CRAP | Audit coverage attribution |
| ------------ | ---: | ---------: | --------: | ----: | -------------------------: |
| CombatLab    |  147 |         33 |        44 |  33.0 |                       100% |
| submitAction |  375 |         26 |        24 | 702.0 |                         0% |
| poll         |  313 |         13 |         7 | 182.0 |                         0% |
| act          |  460 |         11 |         6 | 132.0 |                         0% |
| request      |  259 |         10 |        10 | 110.0 |                         0% |
| endBattle    |  516 |          9 |        10 |  90.0 |                         0% |
| applyLatest  |  247 |          5 |         4 |  30.0 |                         0% |

The text report says `audit gate excluded 5 inherited findings`; it does not identify which five, so this report does not assign the two remaining gate failures to particular functions. Both runs also warn that base/head semantic identities differ and the comparison uses syntactic attribution. No configuration or attribution override was applied. Fixing the listed component/transport bodies would enter explicitly deferred B/C/#263 work; the bounded build stops instead of widening its allocation.

## Proposed CHANGELOG entry (coordinator-owned; not applied)

2026-10-22 — `Vovanostm/qa-hooks-selection-autoplay`, #267, LOCAL / BLOCKED: prepared same-file selection and autoplay hook extraction in CombatLab.tsx, preserving dependencies, synchronous refs and 550 ms / 750 ms timers. Focused 38-test regressions, web typecheck and scoped formatting/lint passed as recorded above; normal measured-coverage audit and commit failed. Candidate remains staged, uncommitted and undelivered; browser/Tier U proof NOT_RUN. Report: `.orca/qa-hooks-selection-autoplay/report.md`. #262 remains open; final component 20/15 belongs to #269 AND #262.

## Risks and next boundary

- **Blocking:** no normal source commit; this build is failed under the owner's completion rule. Preserve staged candidate and audit logs for coordinator diagnosis/reallocation.
- Mounted selection freshness, lifecycle cleanup, actual action counts, held-response cancellation and day/night appearance have not been verified.
- No claim of gameplay acceptance, final component compliance, production safety, publication or merge.
- Shared documentation remains parent-owned; only the proposed entry above was prepared. No setup/API/wiki contract changed.

## Fallback 1 — fresh bounded classification, 2026-10-22

This is the first and only restructure attempt under the fresh #267 assignment,
not a continuation of the settled failed task. Outcome is **FAILED / BLOCKED** after the ordinary commit readback below. No new source or test edit was made:
the measured evidence does not establish a genuine extraction-induced function
regression that this allocation permits repairing. Both original staged paths
are preserved; no reset, discard, bypass, threshold/config/suppression/filter
change, B/C extraction or transport/lifecycle edit was attempted.

### Exact base/candidate classification

Read the entire accepted child, parent and R2 contracts, #267 body/comments and
#262 body/comments, existing report and both requested audit logs. Current branch
and HEAD match the assignment: `Vovanostm/qa-hooks-selection-autoplay`,
`4d521247c2a01716e5ced87e3f0b3d9be17487e7`; source base
`61a91600afeb33c6195e174d87e687c48416e694`. Graph discovery confirmed the available
Warwrit index belongs to `/Users/vovanostm/learn/warwrit` at `b44f5c1e`, so current
source is used. `pnpm agent:status` could not fetch (FETCH_HEAD permission denied)
and displayed last-fetched origin/main `61a91600`; fresh remote-main readback is
NOT_RUN. This worker neither takes the coordinator lease nor mutates issue state.

The supported structured audit command, with the same normal gate and coverage,
was run before any source mutation:

`pnpm exec fallow audit --coverage coverage/coverage-final.json --changed-since 61a91600afeb33c6195e174d87e687c48416e694 --format json --output-file .orca/qa-hooks-selection-autoplay/fallback-audit.json`

Result: **FAIL, exit 1**, seven findings, **two introduced / five inherited**.
The JSON provides the exact per-finding `introduced` flag missing from the old
human logs (four changed paths includes the two existing coordinator documents).
It retains the semantic-identity warning and normal syntactic attribution; no
attribution option was changed.

| Function     | CC / cognitive / CRAP | introduced | Gate classification                        |
| ------------ | --------------------- | ---------- | ------------------------------------------ |
| CombatLab    | 33 / 44 / 33          | false      | inherited, excluded by normal policy       |
| submitAction | 26 / 24 / 702         | false      | inherited, excluded by normal policy       |
| poll         | 13 / 7 / 182          | false      | inherited, excluded by normal policy       |
| act          | 11 / 6 / 132          | false      | inherited, excluded by normal policy       |
| request      | 10 / 10 / 110         | false      | inherited, excluded by normal policy       |
| endBattle    | 9 / 10 / 90           | true       | **gates**, CRAP only, 0% measured coverage |
| applyLatest  | 5 / 4 / 30            | true       | **gates**, CRAP only, 0% measured coverage |

Using the installed TypeScript parser, compared each complete variable declaration
from `git show 61a91600:apps/web/src/combat-lab/CombatLab.tsx` with the candidate.
`applyLatest` (base line 168 → candidate 247), `endBattle` (437 → 516),
`submitAction` (296 → 375), `poll` (234 → 313), `act` (381 → 460), and `request`
(180 → 259) are **text-identical declarations**, including bodies. Thus
`introduced: true` for the first two is the audit's finding classification,
not evidence that their branching or behavior was introduced by extraction.
Do not describe all seven as new regressions or assume CombatLab gates this run.

Installed Fallow 3.30.0 output contract defines `introduced` by membership of the
finding structural key in the base snapshot. Its pinned upstream implementation
(`fallow-rs/fallow`, tag `v3.30.0`, `crates/api/src/audit_keys.rs:3201`) keys
complexity by path, function name and exceeded metric, explicitly excluding lines.
`crates/engine/src/health/scoring.rs:1246` documents named and nearby anonymous
coverage matching; relocated coverage supports distant unambiguous names.
The actual V8/Istanbul records for candidate `applyLatest` and `endBattle` are
`(anonymous_27)` at 247 and `(anonymous_52)` at 516, each zero invocations.
Their old locations have no nearby candidate coverage declaration. This limits
coverage comparability; the exact base-side matched coverage and CRAP are
**NOT_MEASURED**, so a specific base misattribution or tool bug is not claimed.
No cache, coverage or source rewrite was used to alter classification.

Neither extracted hook appears among normal threshold findings. Exact per-hook
CC/cognitive/CRAP remains **NOT_MEASURED**: normal health and file inspect outputs
list threshold findings only, and no threshold override was used to force export.
Fresh real focused coverage invokes each hook once through React server render;
this does not establish mounted effect, timer, rerender or cleanup coverage.
Final CombatLab ≤20/15 remains mandatory on **#269 AND #262**; 33/44 is only the
honest intermediate measurement and does not satisfy that criterion.

### Fresh focused checks

- Focused unit command from the accepted contract: **PASS**, 2 files / 38 tests,
  12.59 s; `fallback-tests.log`. Existing transport regressions retained unchanged.
- Web typecheck: **PASS**, exit 0; `fallback-typecheck.log`.
- ESLint on all three allocated files: **PASS**, exit 0; `fallback-lint.log`.
- Prettier check on all three allocated files: **PASS**, exit 0;
  `fallback-format.log`. Ordinary and staged `git diff --check`: **PASS**.
- Focused coverage command from the contract: **PASS**, 2 files / 38 tests,
  19.65 s; `fallback-coverage.log`. Statements 2.18%, branches 2.36%, functions
  2.12%, lines 2.15% of the configured project denominator. This is focused
  coverage, not a full suite. Hooks each have one server-render invocation;
  both gating callbacks have zero. Real mounted lifecycle proof remains NOT_RUN.
- Standalone diagnostic normal health: exit 1, same seven findings;
  `fallback-health.json` / `fallback-health.log`. File inspect with supported
  stdout JSON: PASS as a query, same threshold findings, no acceptance claim;
  `fallback-inspect.json`. Initial inspect attempt with `--output-file` was
  rejected with exit 2 because that command does not support the flag; retried
  using stdout redirection without changing analysis settings.

### Scope and stop boundary

Source is still **106 additions + 53 removals = 159** against `61a91600`, below 300. Test diff is still 11 additions + 1 removal. Only the original
`CombatLab.tsx` and `CombatLab.test.tsx` are staged; `controller.test.ts` and
`controller.ts` are unchanged. This fallback added **zero source/test lines**.
The normal gate cannot be declared passed. Splitting a hook merely to change
line positions, renaming untouched functions or changing their coverage
attribution would not repair a demonstrated source defect and was not done.

Coordinator next step: resequence the immutable `applyLatest`/`endBattle` coverage
boundary with its owning transport/lifecycle allocation and the unchanged normal
audit. Keep B/C and the final #269/#262 component gate intact. No owner question,
waiver or out-of-scope implementation is needed from this worker.

Post-commit origin/main integration, `bash scripts/orca-validate.sh`, committed
scope-script check, `bash scripts/orca-play.sh`, browser smoke and 1440×900
day/night screenshots: **NOT_RUN** because ordinary committed success has not
been obtained. No owned service was started; service stop is not applicable.
Playwright skill/browser work was not activated past that prerequisite.
Independent Tier U is coordinator-owned and NOT_RUN. Full verify/build/stress/
migrations NOT_RUN as prohibited; performance NOT_MEASURED. No push, PR, label,
merge, Orca command or child agent was used. Shared records remain untouched.

### Revised proposed CHANGELOG entry (coordinator-owned; not applied)

2026-10-22 — `Vovanostm/qa-hooks-selection-autoplay`, #267, LOCAL / BLOCKED:
preserved the staged 159-line selection/autoplay extraction after the one bounded
fallback investigation. Fresh focused 38-test run and coverage, web typecheck,
scoped lint/format and diff checks PASS. Structured normal audit identifies
`endBattle` and `applyLatest` as its two gating CRAP findings; both declarations
are unchanged from `61a91600`, while five findings are inherited. No authorized
extraction-induced source regression was established or changed. Normal commit
and runtime acceptance remain blocked; mounted lifecycle/Tier U and day/night
proof NOT_RUN, exact hook metrics NOT_MEASURED. #262 stays open; final 20/15
remains mandatory on #269 and #262. Report:
`.orca/qa-hooks-selection-autoplay/report.md`.

### Final normal gate and handoff readback

1. Fresh ordinary `pnpm check:changes`: **FAIL, exit 1**, 88.00 s,
   `fallback-check-changes.log`; seven findings / five inherited exclusions.
2. Ordinary `git commit -m "refactor(web): isolate combat selection and autoplay hooks (#267)"`:
   **FAIL, exit 1** at its unchanged pre-commit hook; `fallback-commit.log`.
   The hook refreshed related-test coverage normally, then pinned the base to
   `61a91600` and failed the audit (8.60 s). Related-test count NOT_MEASURED
   because the hook redirects that output; no test-failure warning appeared.
   No new commit SHA exists. HEAD remains
   `4d521247c2a01716e5ced87e3f0b3d9be17487e7`.
3. Because the commit refresh changed the coverage artifact, repeated only the
   structured normal audit against that artifact to read final attribution:
   **FAIL, exit 1**, `fallback-final-audit.json` / `fallback-final-audit.log`.
   Final metrics and flags are exactly the seven-row table above:
   **endBattle and applyLatest introduced; all other five inherited**.
4. Final `git status` / staged path readback: both original candidate paths
   remain staged, no unstaged tracked source; tree is **not clean** and source
   step is **not committed**. No candidate source/test edits were made by this
   fallback; the report and local diagnostic logs are the only new work.
5. Required resequencing evidence is complete; normal-commit success and all
   dependent delivery checks remain blocked. No source fix is claimed, and
   no audit finding was waived. The coordinator owns the next allocation.

## Resume task_93e6f5312ecf — stopped at shared-document conflicts, 2026-10-22

**Latest outcome: FAILED / coordinator integration required.** This continuation did not reset rework round 1 or used fallback step 1. No new prerequisite, recovery, tooling change, waiver, suppression, B/C or R3 work was attempted.

### Preservation and exact repository state

- Before mutation, read the actual staged diff, full contract.md, contract-resequence.md, retained r2-contract.md/parent-contract.md, prior report including both failed audits/fallback, and current #267/#262 bodies/comments. Initial HEAD: `4d521247c2a01716e5ced87e3f0b3d9be17487e7`, branch `Vovanostm/qa-hooks-selection-autoplay`.
- Initial staged WIP: CombatLab.tsx, 106 additions + 53 removals = **159 source lines**; CombatLab.test.tsx, 11 additions + 1 removal. This remains WIP, not delivery.
- Saved ordinary `git diff --binary HEAD -- <three owned paths>` to `.orca/qa-hooks-selection-autoplay/resume-preserved.patch` before stashing.
- Named stash: `task_93e6f5312ecf resume preserved selection autoplay WIP`; exact stash commit **b2aeabd0bd4b87b5394b8d857ee59371f089ea40**, currently `stash@{0}`. Only the two modified owned paths are in it. Stash remains intact, **not applied and not dropped**.
- Permit initially WAITING; wrote resume-waiting.md and polled. Proceeded only after first line became exactly `GRANTED task_93e6f5312ecf`.
- Ordinary `git merge origin/main`: **FAIL, exit 1**, shared-document conflicts only. HEAD remains **4d521247c2a01716e5ced87e3f0b3d9be17487e7**; MERGE_HEAD is **df540c2c779646ac0d3318d55c4ce53275ed0ba1**. Merge is still in progress; no merge commit or source commit exists.
- Exact unresolved paths: **UU CHANGELOG.md**, **UU docs/engineering/CURRENT_PLAN.md**. Both retain index stages 1/2/3. Full combined conflict diff saved to `.orca/qa-hooks-selection-autoplay/resume-merge-conflicts.diff`.
- All other main changes auto-merged into the index normally, including merged #273 callback factory/ports/tests and #271 Start order/guards/tests/CSS. No source conflict occurred. The source in the merge index remains main's source, pending WIP reapplication; no old callback bodies were reintroduced.
- Per the explicit stop instruction, did not edit or resolve shared documents, apply the stash into an unresolved merge, abort the merge, reset, discard, rebase or force-push.

### Checks, acceptance and cleanup

- Staged diff inspection, stash path/stat readback, HEAD/MERGE_HEAD/unmerged-index readback: **PASS** for preservation and exact stop state. These are not implementation acceptance.
- No new source/test edit, pnpm command, dependency setup, audit, coverage run, typecheck, lint, formatter, merge hook or ordinary source commit ran in this continuation: **NOT_RUN** after the merge stop. Prior results above remain historical, not current-head proof.
- Refreshed focused coverage reaching merged production callback tests, introduced-findings audit, committed 300-line scope check and orca-validate: **NOT_RUN**. Exact candidate function metrics: **NOT_MEASURED**. Final #269 AND #262 component 20/15 criterion remains mandatory.
- AC1 replay/restart/editor/step/start-stop/disabled states and AC2 keyboard/manual guards: **NOT_RUN** on an integrated candidate. Mounted timer/ref/cleanup tests, ordinary seed-20261009 mill journey, 1440x900 day/night screenshots and independent Tier U: **NOT_RUN**. No builder or independent ACCEPT claimed.
- No browser/server/DB/build/test process was started. Positive cleanup readback: `.orca/play.pid` absent; `lsof -nP -iTCP:23253 -iTCP:25253 -sTCP:LISTEN` produced no listeners (exit 1, expected for no matches). No owned runtime resource requires stopping. Full suites/build/stress/migrations: **NOT_RUN**, prohibited.
- No subagent, Orca call, push, PR or issue mutation. Shared documentation changes are solely ordinary merge output, unresolved and untouched by this worker.

### Coordinator next action and proposed record

Coordinator must resolve the two shared-document conflicts in this dedicated worktree and finish the ordinary merge. Then apply (do not drop) exact stash `b2aeabd0bd4b87b5394b8d857ee59371f089ea40`, preserving #273 callback wiring and #271 Start order/guards, and continue existing #267 budget under an exclusive permit. Keep stash until an ordinary source commit succeeds.

Proposed CHANGELOG entry, coordinator-owned and not applied: “2026-10-22 — Vovanostm/qa-hooks-selection-autoplay, #267, LOCAL/BLOCKED: preserved 159-line source WIP in named stash and binary patch; ordinary merge of df540c2c stopped only on CHANGELOG/CURRENT_PLAN conflicts. No source commit or refreshed audit/runtime acceptance; retained rework/fallback budgets and final #269/#262 20/15 unchanged.” No setup/API/wiki behavior changed; this report is the local owning closeout record.

## Continuation task_34d3ef40b58d — integrated candidate, 2026-10-22

Append-only continuation under the same #267 contract and retained rework/fallback budgets. Starting branch `Vovanostm/qa-hooks-selection-autoplay`, clean HEAD `7d27f45a0acb3302de3bda51a893998735fb893a`. Read all four retained contracts and complete historical report. Coordinator integration is already committed/pushed; no worker merge or shared-record edit is needed or performed.

Applied exact stash `b2aeabd0bd4b87b5394b8d857ee59371f089ea40` with `git stash apply`, without dropping it. Both owned paths auto-merged cleanly. Candidate diff against integrated base: CombatLab.tsx 106 additions + 53 removals = **159 source lines**, CombatLab.test.tsx 11 additions + 1 removal. No new source rework. Merged `createCombatLabSessionCallbacks` ports/imports and production callback tests retained; controller.ts/controller.test.ts unchanged. #271 Start ordering/guards and tests retained. No old applyLatest/endBattle body restored. Latest action assignment, synchronous ref writes, unmount guard and 550/750 ms timers preserved.

### Pre-commit checks

- Required `pnpm check:changes` immediately after stash application (first edit of both files): **FAIL exit 1**, six findings/five inherited, using pre-existing integration coverage; CombatLab attributed 0%, CombatLabEditorActions CRAP 56.3. Log `continuation-first-edit-audit.log`. No source/config/coverage manipulation in response.
- Focused vitest CombatLab.test.tsx/controller.test.ts: **PASS exit 0, 2 files/49 tests**, 1.59 s, `continuation-tests.log`. Includes real imported production callback tests.
- Web typecheck, scoped ESLint (all three owned files), Prettier check: **PASS exit 0**; `continuation-typecheck.log`, `continuation-lint.log`, `continuation-format.log`. Ordinary diff whitespace check PASS.
- Real focused coverage with existing `--coverage --mode coverage`: **PASS exit 0, 49/49**, 2.28 s, `continuation-coverage.log`. Configured denominator statements 2.35%, branches 2.48%, functions 2.19%, lines 2.31%; this is not whole-game coverage or mounted proof.
- Refreshed normal `pnpm check:changes`: **PASS exit 0**, five inherited findings, no introduced issue, 5.09 s; `continuation-covered-audit.log`. No suppression, changed threshold, coverage import or inherited-finding waiver. Intermediate CombatLab remains 33/44; final #269 AND #262 20/15 criterion remains required.
- Normal source commit and builder runtime proof follow below; until their readback they remain NOT_RUN. Independent Tier U is coordinator-owned and NOT_RUN here. Full suites/stress/migrations/production build NOT_RUN; performance NOT_MEASURED.

Proposed coordinator CHANGELOG entry (not applied): “2026-10-22 — Vovanostm/qa-hooks-selection-autoplay, #267, LOCAL: reapply retained 159-line same-file selection/autoplay extraction after merged #273/#271 prerequisites; preserve production callback ports/tests, visible Start, refs, guards and 550/750 ms timers. Focused 49 tests, web typecheck, scoped lint/format and refreshed normal audit PASS; ordinary commit/runtime result appended below. Final #269 AND #262 component 20/15 and independent Tier U remain required.” No setup/API/wiki or shared-record change.

### Final continuation outcome: FAILED — required normal-refresh callback proof absent

Ordinary source commit **b2520b1bc594b217e818dab29b876dc614df774c** succeeded (exit 0), message `refactor(web): isolate combat selection and autoplay hooks (#267)`. Log `continuation-commit.log`: hook refreshed related coverage without a test-failure warning, normal audit PASS, five inherited findings. Source step is committed locally; no push or PR. The exact retained stash remains intact and applied, not dropped, even after this successful source commit. The local binary patch backup is untouched.

`bash scripts/check-pr-scope.sh 7d27f45a`: **PASS**, 159 changed source lines/300. `bash scripts/orca-validate.sh`: **PASS exit 0, all 9 gates** (rebased, clean-tree, scope, packages, typecheck, format, lint, related-tests, audit); `continuation-validate.log` and `.orca/validate-*.log`. No new main integration was performed; coordinator's ordinary integration already contains merged main. Validator fetched origin/main and confirmed no missing main commits. Package builds are the validator's existing focused prerequisite builds, not a production build or full suite.

**Blocking evidence:** the ordinary hook's coverage immediately after commit records factory `createCombatLabSessionCallbacks` invoked once (SSR), but callback `applyLatest` (controller.ts:138–144) **0 invocations** and `endBattle` (146–185) **0 invocations**. Validator independently refreshes the same related coverage and reports **1 file / 10 tests**, only CombatLab.test.tsx; controller.test.ts's real callback tests are not discovered from the changed CombatLab source/test paths. Final coverage direct readback is in `continuation-hook-callback-coverage.log`: factory 1, applyLatest 0, endBattle 0; other controller production policies tested only in controller.test.ts also have zero hits. The explicit 49-test focused run passed, but its coverage was ordinarily replaced by the hook, as required; it cannot be substituted for the final normal-refresh evidence.

This violates the accepted contract-resequence Proof requirement: “#267's ordinary hook refresh must discover the seam tests via CombatLab → controller imports, retain real callback coverage and pass again.” A green audit/validator alone does not satisfy this conjunction. No coverage was imported, patched, relabelled, merged or retained by overriding the hook; no test dependency/import, source name, thresholds, tooling or config was altered merely to affect discovery. No new recovery allowance or prerequisite is inferred. Stop and return exact evidence under retained budgets.

### Acceptance readback at committed candidate

| Criterion                                                      | Current evidence and limitation                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #267 AC1 replay/restart/editor/step/start-stop/disabled states | Existing focused editor/controller tests **49/49 PASS**. Ordinary scoped diff preserves labels, predicates, callback ports and #271 Start order/guards. Actual mill requests/journey **NOT_RUN**; full AC1 not accepted.                                                                                                                         |
| #267 AC2 keyboard/manual guards                                | Existing focus/Escape/manual/skill/autoplay policy regressions PASS in the explicit focused run. Mounted skill freshness/reset, input-focus Escape, listener cleanup and actual POST counts **NOT_RUN**; full AC2 not accepted.                                                                                                                  |
| Original mounted autoplay/lifecycle proof                      | All retained requirements remain: clear-skill/start order, synchronous stop, latest callback/session on rerender, 549+1 ms, dependency cleanup, stop/unmount/held-response behavior and pending/opponent/uncertain/lost/deleting/terminal guards. Browser execution **NOT_RUN**; SSR does not prove them. No original proof removed or weakened. |
| Production callback coverage through normal refresh            | **FAIL**: applyLatest/endBattle zero hits after ordinary commit hook and validator refresh. Explicit 49-test coverage is separate historical evidence for this candidate, not final normal-refresh coverage.                                                                                                                                     |
| Extracted function metrics and normal audit                    | Normal commit/audit and validator audit PASS without introduced findings. Exact individual hook numeric metrics/CRAP **NOT_MEASURED** by threshold-only output; neither hook appears as a threshold finding. Mounted hook bodies remain unexecuted in Node coverage.                                                                             |
| Intermediate/final component complexity                        | Current normal audit CombatLab **33 cyclomatic / 44 cognitive / CRAP 33**, SSR attribution 100%; final **20/15 remains outstanding on #269 AND #262**, never waived by five inherited findings.                                                                                                                                                  |
| Ownership/scope                                                | Only CombatLab.tsx and CombatLab.test.tsx changed from 7d27f45a; 159 source lines plus tests. controller.ts and controller.test.ts unchanged. No B/C/R3 work, source reconciliation beyond automatic exact-stash application, shared-record edit or new prerequisite.                                                                            |
| Ordinary source commit / runtime acceptance                    | Local source commit PASS; overall continuation **FAILED** on proof prerequisite above. Smoke/day/night screenshots and independent Tier U **NOT_RUN** after this explicit stop. No player/gameplay acceptance claimed.                                                                                                                           |

### Cleanup and coordinator handoff

No builder server/browser/DB process was launched, so start/stop and screenshots are **NOT_RUN**. Private listener/PID absence and clean tree are checked below. Full suites, stress, migrations and production build **NOT_RUN**; performance **NOT_MEASURED**. No subagent, Orca command, shared-record write, issue mutation, push, PR, reset/discard/rebase or force push.

Branch `Vovanostm/qa-hooks-selection-autoplay`; local source head `b2520b1bc594b217e818dab29b876dc614df774c`; base `7d27f45a0acb3302de3bda51a893998735fb893a`. Retained stash `b2aeabd0bd4b87b5394b8d857ee59371f089ea40` and `resume-preserved.patch` remain available. Coordinator owns next allocation under unchanged budgets; this worker does not request or perform another source rework, tooling repair or scope expansion.

Superseding proposed CHANGELOG entry (coordinator-owned; not applied): “2026-10-22 — Vovanostm/qa-hooks-selection-autoplay, #267, LOCAL/BLOCKED: retained 159-line extraction committed normally as b2520b1b after integrated #273/#271. Focused 49 tests, typecheck/lint/format, normal commit audit and validator 9/9 PASS. Required ordinary-refresh production callback proof FAIL: related tests discover only 10 CombatLab tests; applyLatest/endBattle have zero hits. Stash/backup retained; runtime/mounted/day-night/Tier U NOT_RUN. Retained budgets and final #269 AND #262 20/15 unchanged.” No setup/API/wiki change; report is append-only local closeout, shared records remain coordinator-owned.

Final direct readback: git status --short empty (clean tracked tree); HEAD b2520b1bc594b217e818dab29b876dc614df774c; ordinary diff --check PASS; exact two committed paths confirmed. `.orca/play.pid` absent; `lsof -nP -iTCP:23253 -iTCP:25253 -sTCP:LISTEN` returned no listeners (exit 1, expected no matches). No owned runtime resource remains. Report continuation sections read back; historical failures preserved.

## Rework round 2 — callback test placement, 2026-10-22

Started from clean `b2103b1ff023c518cfe49360663fce5759b4f0c9`, preserving production extraction `b2520b1bc594b217e818dab29b876dc614df774c`, integrated main `df540c2c` and exact retained stash/patch. No stash application/drop, production source edit, tooling/config/dependency/threshold change, source-identity trick, duplicate regression, synthetic hook runner or coverage manipulation. Graph remains at another checkout/head; direct source is proof. Coordinator retains shared records, publication and independent Tier U.

Moved the existing production callback group unchanged from controller.test.ts to CombatLab.test.tsx: six declarations expand to 11 cases, with **50 unchanged expect calls**. Necessary fixtures `view`, `battleDraft`, `lifecycleCatalog`, `sessionCallbacks` and global-fetch cleanup accompany the group. Shared fixtures remain in controller.test.ts for its other regressions; moved tests have no originals left there. Coverage exercises the real imported factory/applyLatest/endBattle, not a copied implementation. Cases preserve current generation/session refs, foreign/equal/older views, immutable inputs, stop-before-admission, held single-flight DELETE, success/404 cleanup order, optional/current abort controller, valid/invalid/network/abort failures and real-endBattle restart admission. Existing editor/#271 Start, hotkey/manual/admission/skill/autoplay, catalog/restore/create/replay regressions remain.

Checks so far (sequential): first-edit pnpm check:changes on each test file PASS, logs `r2-first-consumer-audit.log` / `r2-first-controller-audit.log`; focused real V8 coverage PASS, **2 files / 49 tests** (`r2-focused-coverage.log`); web typecheck PASS (`r2-typecheck.log`); initial scoped lint FAIL due to now-unused restartSessionBattle import, removed that import and reran scoped lint PASS (`r2-lint-final.log`); scoped Prettier PASS (`r2-format.log`); ordinary diff whitespace PASS. No tests/assertions changed to address lint. Production CombatLab.tsx and controller.ts diff against b2520b1b is empty; source cap remains **106 + 53 = 159 / 300** against child integration base 7d27f45a. Normal commit/refresh, validator, smoke and cleanup results follow below. Full suites/stress/migrations/production build NOT_RUN; performance NOT_MEASURED.

### Round 2 final checks and commits

**Builder outcome: SUCCEEDED for the allocated test-placement fix and smoke; independent Tier U acceptance remains pending.** This supersedes the preceding builder failure only for the ordinary-refresh discovery finding; historical failures and all original proof obligations remain intact.

- Retained production commit: `b2520b1bc594b217e818dab29b876dc614df774c`.
- New normal commit: **`cc98765f4e512d4f0aaa0ad31c085a1a16bf41bb`**, `test(web): place session callback regressions at combat consumer (#267)`; hook exit 0, no bypass/test-failure warning. Only CombatLab.test.tsx/controller.test.ts changed: 297 additions + 257 removals, all tests/imports/fixtures. Production CombatLab.tsx/controller.ts have an empty diff against b2520b1b. The test relocation preserves every callback assertion byte-for-byte.
- Immediately AFTER the ordinary hook, direct actual coverage JSON readback (`r2-hook-coverage.log`): factory **13 hits**, real **applyLatest 10 hits**, real **endBattle 17 hits**, JSON-error fallback 1 hit. Selection/autoplay hooks each have 1 SSR invocation; their mounted effect bodies have 0 Node invocations. Browser proof below is separate and was never imported into audit coverage.
- `bash scripts/orca-validate.sh`: **PASS exit 0, 9/9 gates**, `r2-validate.log`; related-tests now discovers **2 files / 49 tests**, including the moved callback group. Packages/typecheck/format/lint/scope/audit all PASS. Only validator-owned dependency package builds ran; no production build or full suite. Origin/main is still integrated `df540c2c`; missing-main count 0, so no further merge/rebase was needed. No shared-record conflicts.
- Immediately AFTER validator, direct actual JSON readback (`r2-validator-coverage.log`): factory **13**, **applyLatest 10**, **endBattle 17**, fallback **1**. Actual callback statements are **9/9** and **29/29** covered (`r2-callback-statements.log`). No copied/imported/merged/patched coverage or discovery trick.
- Structured normal audit after validator: **PASS**, `r2-audit.json` / `r2-audit.log`, thresholds unchanged at **20 cyclomatic / 15 cognitive / CRAP 30**. All 69 analyzed functions in changed production source are measured with Istanbul coverage. Neither extracted hook nor its callbacks is a threshold finding: the emitted evidence establishes measured bounds **CC ≤20, cognitive ≤15, CRAP <30**, not exact individual numeric scores. Exact below-threshold per-function scores are **NOT_MEASURED individually** because ordinary output emits findings only; no threshold override was used to force export. This bound does not establish mounted Node coverage.
- Preserved inherited findings (CC / cognitive / CRAP): CombatLab **33 / 44 / 33**, submitAction **26 / 24 / 702**, poll **13 / 7 / 182**, act **11 / 6 / 132**, request **10 / 10 / 110**. All five are `introduced:false`; source and audit policy unchanged. CombatLab **33/44 fails the final 20/15 criterion**; final numerical acceptance remains conjunctive on **#269 AND #262**, never waived by the normal inherited-findings policy.
- `bash scripts/check-pr-scope.sh 7d27f45a`: **PASS, 159/300 source additions plus removals**, tests excluded. Validator scope against origin/main also **PASS 159/300**. No wider allocation/B/C/R3 source work.

### Actual mounted smoke and screenshots

`bash scripts/orca-play.sh start` served the private ordinary URL `http://127.0.0.1:25253/combat-lab`; disposable in-memory server, no campaign DB. Playwright CLI session `qa267r2`, **1440×900**, default **mill seed 20261009**. Used the installed CLI through the Playwright skill. Initial wrapper executable permission error was resolved by invoking it with bash; its later npm-cache EPERM was avoided using the already-installed CLI binary, without installing/changing any dependency. The first detached terminal's servers stopped on terminal teardown; retained an owned TTY for the actual journey. The initial late-installed clock attempt had slow settlement and was reset via ordinary reload; the actual 549+1 proof used a fresh browser context with the clock installed BEFORE the real React page mounted. These are runner limitations, not source/tool defects or gate passes.

Actual journey: editor → one create → inspect/hover/select/Escape → select cell and legal manual move → menu/replay → one-step → autoplay/stop → legal manual end-turn → autoplay with held real response → stop/release → night controls → restart → editor return → start → autoplay → legal manual attack → night autoplay to victory → day result. Actual action replies and state were observed, not fabricated. One continuous journey used both lights; a separate fresh full journey in each light remains the independent evaluator's retained obligation.

| Retained criterion                                                  | Current proof and limits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #267 AC1: replay/restart/editor/step/start-stop and disabled states | Existing focused 49 tests PASS, #271 Start guards retained. Live replay download `Старая мельница.json` completed with no download failure. One-step sent exactly **1 action POST**. Restart sent **DELETE then exactly one create POST**; editor return and subsequent Start likewise sent one DELETE and one create; editor seed stayed 20261009. Source preserves all predicates/labels/ARIA and callback order. Complete idle/opponent/pending/deleting/starting/unresolved/lost/terminal/running disabled-state matrix is **NOT_RUN in browser**, retained for Tier U.                                         |
| #267 AC2: keyboard/manual guards                                    | Hover/select enemy + Escape sent **0 POSTs**. Legal manual move sent **1 POST**, archer moved to **(4,4)** with AP **4→2** (`r2-manual-move.log`). Manual order after stop sent **1 POST**. A legal manual attack sent **1 POST**, target HP **50→31** (`r2-manual-attack.log`). Same native browser task starts autoplay then dispatches key 4 before React rerender: **0 manual POSTs**. Focused menu key 4: **0 POSTs**; Escape closes it (`aria-expanded=false`). Full modifier/repeat/input-focus matrix stays **NOT_RUN in browser**, existing controller regressions retained.                               |
| Real mounted timing/rerender/cancellation                           | Fresh mounted React context with Playwright clock: start → advance 300 ms → actual selection rerender → +249 ms gives **0 calls at 549 ms**, +1 ms gives **1 call at 550 ms**. Stop then +1100 ms gives **0 further calls** (`r2-clock.log`). Real session restart after 300 ms cancels old timeout: +800 ms after replacement gives **0 old action POSTs** (`r2-mounted-admission.log`). Selection-only rerender does not restart the timer. Direct internal ref identity and proof distinguishing old/new callback functions are **NOT_MEASURED**; no private hook instrumentation or synthetic runner was added. |
| Start/stop synchronous admission and held-response cleanup          | Same-task start blocks a hotkey before rerender as above. Ordinary stop yields **0 late POSTs over 1150 ms**. Held actual HTTP **200** action response, pending manual key 4 → **0 POSTs**; stop then release and wait 1400 ms → **0 follow-up POSTs** (`r2-held-response.log`). Pending pauses/single-flight are observed at this boundary. Stop's exact internal ref→state assignment ordering and clear-skill-before-enable remain source facts, **NOT_MEASURED directly in browser**.                                                                                                                           |
| Unmount/remount and session lifetime                                | Held actual HTTP **200** action response across whole-document navigation, release, +1100 ms → **0 late POSTs**; remount/restore +1100 ms → **0 late POSTs** (`r2-unmount.log`). This is browser document disposal/remount proof, **not React-only listener removal or activation/session skill-reset proof**. Those exact mounted hook effects remain **NOT_RUN** for Tier U; current skill ref after immediate rerender is **NOT_MEASURED directly**.                                                                                                                                                             |
| Pending/opponent/uncertain/lost/deleting/terminal guards            | Focused real production/policy regressions PASS. Pending/stop evidence above; terminal key 4 +1150 ms gives **0 POSTs**. Full real mounted opponent/uncertain/lost/deleting transitions are **NOT_RUN**, retained for Tier U. No fake response state or synthetic outcome was supplied.                                                                                                                                                                                                                                                                                                                             |
| Ordinary mill completion / result                                   | Genuine **human victory**, **round 8**, `last-side-standing`; five allies survive, all six opponents dead. Main observed journey: **82 HTTP 200 action responses**, 3 HTTP 201 creates, 2 HTTP 204 deletes, 468 HTTP 200 reads at final snapshot (`r2-result-final.log`). Poll counts are observations, not a performance claim. This is continuation/result proof, **not #190 paced enemy playback**.                                                                                                                                                                                                              |
| Console/errors/base comparison                                      | **0 page errors** in ordinary and controlled contexts. One observed console resource error: initial `/favicon.ico` **404**; initial launcher teardown also logged Vite connection loss. No further console errors in the retained session log. Separate baseline runtime run/comparison **NOT_RUN**, so no claim that the favicon or any visual issue is inherited. No production source changed this round.                                                                                                                                                                                                        |
| Independent acceptance / full parent gate                           | Builder smoke only; independent Tier U **NOT_RUN / coordinator-owned**. Remaining direct ref/skill/reset/listener/input/full-state cases above are expressly handed to it, not passed by SSR or audit. Final #269 AND #262 20/15 and original #231/#190 proof remain unchanged.                                                                                                                                                                                                                                                                                                                                     |

All screenshots are actual full viewport captures at 1440×900 under `.orca/qa-hooks-selection-autoplay/shots/`: `r2-day-closed.png`, `r2-day-open.png`, `r2-day-running.png`, `r2-day-stopped.png`, `r2-day-result.png`, and corresponding `r2-night-{closed,open,running,stopped,result}.png`. Viewed day-closed and night-result images directly. Initial day-result capture used an incorrect button locator (`Дневная сцена`); that call timed out, then fresh snapshot identified the actual `Дневной свет` label and `r2-result-final.log` records successful capture. No product change for this runner correction. Full runtime logs and scripts are local evidence paths, not tracked links.

### Positive cleanup and final handoff

Controlled browser context closed; CLI `qa267r2` closed; `bash scripts/orca-play.sh stop` **PASS / STOPPED**; owned TTY released. `r2-cleanup.log`: **no listeners on 23253 or 25253**, **owned browser PID 38530 absent**, **.orca/play.pid absent**, **tracked tree clean**. Exact stash **b2aeabd0bd4b87b5394b8d857ee59371f089ea40** and `resume-preserved.patch` remain intact. No push/PR/issue/Orca write, subagent, shared-record edit, rebase/reset/discard or stash operation in round 2. The ignored local report/screenshots remain available to the coordinator; no extra source files were introduced.

Proposed CHANGELOG/CURRENT_PLAN record (coordinator-owned, **not applied**): “2026-10-22 — Vovanostm/qa-hooks-selection-autoplay, #267, LOCAL: production b2520b1b unchanged; normal test commit cc98765f relocates all 11 real callback cases/50 assertions to the changed CombatLab consumer tests. Focused/ordinary-related 49 tests, web typecheck/lint/format, ordinary audit and validator 9/9 PASS; applyLatest/endBattle retain 10/17 hits after both normal refreshes; source 159/300. Mounted 549+1, same-task start admission, stop/held-response/replacement and day/night victory smoke recorded; owned browser/servers stopped and tracked tree clean. Independent Tier U must resolve the explicitly unmeasured cases; intermediate CombatLab 33/44 and final #269 AND #262 20/15 remain.” No setup/API/wiki contract changed; this append-only report is the affected owning record.
