# #268 prerequisite B — FAILED / normal commit blocked

2026-10-22. Branch `Vovanostm/qa-hooks-session-editor`.
Only `CombatLab.tsx` and `CombatLab.test.tsx` were edited; `controller.ts` and
`controller.test.ts` remain unchanged. Shared records were not authored here.
No push, PR, GitHub mutation, Orca command, subagent, DB or deployment operation.

## Commits and blocking boundary

- Started clean at `c62ad2d021c836563da9bef5827003387c29a273`.
- Ordinary fetch + merge origin/main fast-forwarded to
  `65d7466bb5bd34ae04ad0ef8e252b5d8808fa5a0`; read new CHANGELOG entries and
  CURRENT_PLAN. No conflict or source integration change.
- **No implementation commit exists.** Ordinary `git commit -m
'refactor(web): isolate session initialization and editor shell'` failed,
  exit 1, at its normal pre-commit audit (`commit.log`). No bypass was used.
- The prescribed extraction reduces CombatLab from the retained 33/44 to
  **28 cyclomatic / 24 cognitive**. The normal hook reports five findings and
  excludes four inherited findings, leaving the component gate blocked.
  The supported structured audit likewise labels CombatLab `introduced:true`
  and the four transport functions `introduced:false` (`audit.json`). That
  separate structured run used default upstream base c62ad2d0; the actual
  commit hook explicitly used main base 65d7466b. Their web source bases match.
- Candidate remains staged and uncommitted. This is **a failed build** under
  the owner's commit requirement, not delivered implementation. No reset,
  discard, suppression, threshold/config change or coverage manipulation.
- Further menu extraction belongs to #269; transport/poll/retry bodies and
  controller.ts are outside this allocation. Coordinator must reconcile the
  ordinary gate with the B/C allocation before any further source extraction.
  Final component 20/15 remains on BOTH #269 AND #262; #262/#263/#231 stay open.

## Implemented candidate and acceptance proof

| Criterion                                 | Actual proof / limitation                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seven explicit session state pairs        | `useCombatLabSessionState`, unchanged null/false/empty initializers and named returns; existing SSR composition passes. Initial mounted values before effects: NOT_MEASURED.                                                                                                                                                                                                                                              |
| Nine explicit stable ref cells            | `useCombatLabSessionRefs`, original defaults/types and named returns. Mutation/admission sites remain in CombatLab. Mounted identity and same-task double-create/delete guards: NOT_RUN.                                                                                                                                                                                                                                  |
| Catalog hook / restore precedence         | Moved only three states and the catalog effect into `useCombatLabEditorState(sessionRef,setNotice)`. Same mount-only dependencies, abort cleanup, exact failure notice, non-aborted finally, and current `sessionRef.current?.view.battle` precedence. Restore effect remains in CombatLab. Existing focused catalog/restore regressions PASS; controlled mounted completion-order/failure/abort/remount matrix: NOT_RUN. |
| Editor shell / unchanged DOM and strings  | Fragment shell retains heading/help/editor/status order and caller visibility. Two new failing-first tests now pass: exact shell markup versus existing editor, notice/status versus unresolved alert, unchanged props, one Start dispatch and exact default reset. Existing loading/absent/invalid/retained-catalog/starting/unresolved editor cases PASS. No text.md required: Tier U and no wording change.            |
| AC1 replay/restart/editor/step/start-stop | Existing focused regressions PASS. Real ordinary mill, seed 20261009, 1440x900, both lights: replay, one-step, autoplay/stop, editor and genuine result exercised; day also restart. Night step produced exactly one POST 200; night Stop +1100 ms produced zero late action responses. Full disabled-state mounted matrix: NOT_RUN.                                                                                      |
| AC2 manual / keyboard guards              | Existing controller regressions PASS and guard bodies unchanged. Real legal manual move/attack, full focus/modifier/repeat/aimed-skill matrix: NOT_RUN in this smoke. Opponent-view browser row not reached; no projection was fabricated.                                                                                                                                                                                |
| Production callbacks retained             | After normal hook coverage refresh: factory 13 hits, real applyLatest 10, real endBattle 17, JSON fallback 1. Existing consumer tests remain in their original file; controller.ts unchanged.                                                                                                                                                                                                                             |
| Timers / generation / cleanup             | Source retains 550 ms autoplay, 750 ms polling, synchronous refs, dependencies, current callbacks and request bodies. Real night Stop cancellation above. 549+1 timing, stale completion, held requests, lost/uncertain/terminal admission and React-only unmount/remount matrix: NOT_RUN here.                                                                                                                           |
| New/extracted function audit              | None of the four extracted functions appears among normal threshold findings; each hook has one genuine SSR coverage invocation, shell three. Individual numeric complexity/CRAP for these functions: NOT_MEASURED. Overall normal audit FAIL, so no gate acceptance claimed.                                                                                                                                             |
| Scope                                     | Staged source 104 additions +28 removals = **132/300**; tests 35+1. No deferred C extraction or source outside ownership.                                                                                                                                                                                                                                                                                                 |
| Independent acceptance                    | NOT_RUN; no subagents permitted. Parent evaluator retains full Tier U requirements.                                                                                                                                                                                                                                                                                                                                       |

## Executed checks

1. Required first-edit `pnpm check:changes`, after each of the two files:
   **FAIL exit 2**, missing coverage/coverage-final.json. Logs
   `audit-first-test.log`, `audit-first-source.log`.
2. First test attempt: runner failed resolving unbuilt workspace exports,
   zero tests. Required `bash scripts/orca-setup.sh`: **PASS exit 0**; ordinary
   pinned dependencies/workspace outputs/private ports prepared, no tracked
   dependency/config change (`setup.log`).
3. Failing-first focused shell test after setup: **FAIL exit 1**, 22 passed /
   2 failed, missing CombatLabEditorShell (`test-red.log`). Then implemented.
4. `pnpm exec vitest run apps/web/src/combat-lab/CombatLab.test.tsx
apps/web/src/combat-lab/controller.test.ts`: **PASS exit 0**, 2 files /
   **51 tests**, 1.59 s (`test-green.log`).
5. `pnpm --filter @warwrit/web typecheck`: **PASS exit 0** (`typecheck.log`).
6. Scoped ESLint: **PASS**; the subsequent staged commit ran only after this
   command succeeded. Scoped Prettier check: **PASS exit 0** (`format.log`).
   Ordinary and staged `git diff --check`: **PASS exit 0**.
7. Normal commit hook: refreshed ordinary related coverage, no focused-test
   failure warning; **FAIL exit 1** at audit, 13.49 s (`commit.log`). Exact
   redirected related-test count is not separately available. Coverage was
   neither edited nor replaced with browser coverage.
8. Structured `fallow audit --coverage coverage/coverage-final.json --format
json`: **FAIL exit 1** (`audit.json`), five complexity findings, one introduced.
   Supported read-only `fallow inspect --file .../CombatLab.tsx --format json`:
   **PASS exit 0** (`inspect.json`); this is not a passing commit gate.
9. `bash scripts/orca-validate.sh`: **FAIL exit 1** (`validate.log`): rebased,
   scope, packages and typecheck PASS; clean-tree FAIL. Since no code commit
   exists, its HEAD-based format/lint/related-tests/audit branches did not run:
   **NOT_RUN**, and its scope PASS does not measure the staged candidate.
   No retry can fix this known boundary without changing the blocked candidate.
10. Full verify/stress/migrations/full coverage/production build: **NOT_RUN**.
    Only setup/validator/runtime-owned workspace package builds ran.
    Performance and independent acceptance: **NOT_MEASURED / NOT_RUN**.

## Real browser smoke and resources

Playwright skill; preinstalled CLI session `qa268`, Chrome PID 76001.
`orca-play.sh start` printed READY at http://127.0.0.1:25492/combat-lab.
Initial detached launcher exited with its shell; a persistent terminal then
owned launcher 76558, API listener 76788 / port 23492 and web listener 76749 /
port 25492. No database was opened. First navigation consequently got
ERR_CONNECTION_REFUSED; retry after persistent launch succeeded. One wrapper
call failed on npm cache EPERM, so subsequent calls used the already-installed
CLI directly; no tool/dependency was added. Two initial run-code scaffolding
errors are retained in smoke-step/smoke-day logs; they are not product failures.

- `day-journey.log`: genuine round-8 victory, five allied survivors, one ally
  dead, six enemies dead; 78 POST action 200 responses. Two DELETE 204 responses
  recorded during restart/editor return. Its URL filter missed create URLs,
  so exact day create count/order is **NOT_MEASURED**, not inferred.
- `night-journey.log`: same genuine result in a fresh battle, 78 POST action
  200, 147 GET session 200, authenticated GET replay 200, one POST session 201
  and one preceding DELETE 204. One-step exactly one POST 200, Stop +1100 ms
  zero further action responses. Returned to editor before closing.
- Twelve 1440x900 screenshots in `shots/`: day/night editor, closed, open,
  running, stopped and result. Viewed both result images directly. Dedicated
  loading/invalid/start-or-unresolved captures: **NOT_RUN**; initial loading
  is present in the CLI snapshot. Editor has no night lighting of its own.
- `console.log`: one favicon.ico HTTP 404, zero console warnings. No pageerror
  event listener or same-base runtime comparison: **NOT_RUN**. Do not call this
  an inherited baseline error or claim zero runtime errors.
- Browser closed, `bash scripts/orca-play.sh stop` **PASS**, persistent terminal
  ended. `resources.json` and `cleanup.json` identify all 15 recorded owned
  browser/runtime PIDs: **all absent**, both ports have **no listener**, and
  `.orca/play.pid` is absent. No resource remains owned by this build.

## Proposed CHANGELOG entry — coordinator-owned, not applied

2026-10-22 — `Vovanostm/qa-hooks-session-editor`, #268, LOCAL/BLOCKED:
prepared explicit session state/ref hooks, catalog-only editor hook and fragment
editor shell in CombatLab.tsx, preserving strings, DOM and transport/admission
sites. Focused 51 tests, web typecheck/lint/format and genuine day/night mill
victories recorded; source 132/300. Normal commit audit fails at CombatLab 28/24,
so candidate is staged, uncommitted and undelivered; validator clean-tree fails.
Full mounted/Tier U proof and final #269 AND #262 20/15 remain outstanding.
No setup/API/rule/replay/schema/dependency contract changed.

## Rework1 — bounded audit-only fallback 1, 2026-10-22

Fresh builder preserved both staged files at `65d7466bb5bd34ae04ad0ef8e252b5d8808fa5a0`
on `Vovanostm/qa-hooks-session-editor`; the complete original failed report,
`commit.log`, `audit.json` and smoke records above remain unchanged.
Read complete AGENTS, contract including the amendment, original report and
failed logs, current #268/body/comments, decision 6338431498 and #269 boundary.
The graph index points to another root/head; direct source/diffs were used.
No source outside the three allocated paths, shared records, GitHub state,
Orca commands, memory, dependencies, configuration or thresholds were changed.

### Finite source change and first gate

Moved only the existing `installSession`, cleanup effect and restore effect
unchanged into `useCombatLabSessionLifecycle` in the same TSX, with nine explicit
named inputs and named `installSession` return. Catalog hook still registers
before the lifecycle hook, and cleanup still registers before restoration.
Original `[]` dependencies, closure values, aborts, generation/ref/storage writes
and all `installSession` call sites remain. Transport/poll/retry/admission and
menu controls remain in CombatLab; controller.ts and both test files received
no additional rework edit. Existing staged shell tests and callback regressions
remain in CombatLab.test.tsx.

Actual candidate versus slice main base 65d7466b: source **142 additions + 28
removals = 170/300**; inherited test changes remain 35 additions + 1 removal.
First-edit `pnpm check:changes`: **FAIL exit 1**
(`rework1-first-source-audit.log`), CombatLab **28 cyclomatic / 23 cognitive**.
This first run still used pre-rework coverage and the upstream c62ad2d0 default;
it is not final coverage evidence. The unchanged bodies cannot remove the
remaining component threshold finding. No adjacent extraction is permitted.

### Build prompt steps 3–6

- Step 3: first-edit audit above; focused 2 files / **51 tests PASS**
  (`rework1-tests.log`, 1.51 s), web typecheck **PASS**
  (`rework1-typecheck.log`), scoped ESLint **PASS** (`rework1-lint.log`).
  Normal commit attempt and fresh hook coverage result recorded below.
- Step 4: no rebase/integration was attempted during this failed bounded
  recovery; validator performed its ordinary read-only origin/main fetch and
  rebased check. No implementation commit exists; validator result follows below.
- Step 5: new browser/runtime/screenshot refresh **NOT_RUN** after the concrete
  audit blocker; the explicit STOP rule prevents broadening recovery. Original
  day/night smoke remains historical evidence, not proof of this new candidate.
- Step 6: player-facing strings are unchanged; no new text inventory is required
  and text.md was not created. All original text assertions remain intact.

Mounted defaults/ref identities, held create/action/DELETE, full catalog/restore
order/failure/abort/remount, focus/keyboard and exact timer rows remain
**NOT_RUN for rework1**. SSR exercises hook initialization only, not effects;
focused transport/callback tests are not mounted proof. Independent evaluator
acceptance remains NOT_RUN. Final 20/15 remains required at BOTH #269 AND #262.

### Resources / cleanup

Coordinator's positive 15-PID/two-port cleanup authorized this exclusive slot.
This recovery started no browser, server, DB or runtime and owns no persistent
process. Original resources.json/cleanup.json remain preserved. No screenshot
was overwritten; all original shots remain available for evaluator comparison.

### Proposed shared-record correction (coordinator-owned, not applied)

2026-10-22 — `Vovanostm/qa-hooks-session-editor`, #268, LOCAL/BLOCKED:
audit-only fallback1 moves only the three authorized initialization lifecycle
bodies, source 170/300; focused 51 tests/typecheck/lint pass. Component remains
28/23 in the first audit; normal commit result below determines final failure.
No behavior/text/setup/API/rule/replay/schema/dependency contract changed.
No publication, merge or player acceptance; original proof gaps remain.

### Rework1 final readback — FAILED, staged candidate retained

- Scoped Prettier **PASS exit 0** (`rework1-format.log`); ordinary and staged
  `git diff --check` **PASS**. No formatter mutation was necessary.
- One normal `git commit -m 'refactor(web): isolate session initialization
lifecycle and editor shell'` **FAIL exit 1**, after fresh ordinary related
  coverage; exact log `rework1-commit.log`. Audit pinned slice main base
  **65d7466b** and measured **CombatLab 28 cyclomatic / 23 cognitive**. Five
  findings, four inherited exclusions; the component remains blocking. New
  lifecycle hook has no threshold finding. Individual numeric hook CRAP is
  **NOT_MEASURED**; no claim of full hook effect coverage or acceptance.
- Fresh normal coverage readback (`rework1-coverage-readback.json`): state,
  refs, editor and lifecycle hooks each **1** SSR invocation; shell **3**;
  real production callback factory **13**, applyLatest **10**, endBattle **17**,
  error-JSON fallback **1**. Tests remain in their discovered production consumer;
  coverage JSON was read only, never edited, replaced or fabricated.
- `bash scripts/orca-validate.sh` **FAIL exit 1**
  (`rework1-validate.log`): rebased/scope/packages/typecheck **PASS**, clean-tree
  **FAIL** because the normal commit was blocked. Validator's HEAD-based
  format/lint/related-tests/audit branches **NOT_RUN** (no committed source diff);
  the separately executed focused checks/commit audit above cover the candidate.
  Scope gate itself evaluates HEAD; actual staged source size **170/300** is
  from `git diff 65d7466b --numstat`, not the validator's empty HEAD diff.
- No rebase was needed: validator's rebased gate PASS. No retry, bypass,
  suppression, threshold/config change, extra extraction, push/PR/merge or
  GitHub-run mutation was attempted. **No implementation commit exists**;
  HEAD remains `65d7466bb5bd34ae04ad0ef8e252b5d8808fa5a0`, with both source/test
  files staged and no unstaged source edits. controller.ts and controller.test.ts
  remain unchanged. This is failed recovery, not delivered implementation.
- Fresh cleanup readback (`rework1-cleanup.json`): all original **15 PIDs absent**,
  **23492/25492 have no listener**, `.orca/play.pid` absent; rework started no
  persistent resource. No runtime/browser needed cleanup or screenshot refresh.
- New mounted matrix, day/night smoke, screenshots and independent evaluator
  **NOT_RUN**, per the explicit bounded STOP on remaining ordinary audit failure.
  Original smoke/captures remain preserved and cannot discharge new-candidate
  mounted proof. Full suite/build/stress/migrations **NOT_RUN**; performance
  **NOT_MEASURED**. Validator alone built existing workspace library outputs.

**Concrete blocker for coordinator:** the sole authorized lifecycle extraction
still leaves CombatLab **28/23** under the normal commit audit, within source
scope **170/300**. Further extraction would cross the explicit amendment boundary
(menu controls belong to #269; transport/poll/retry/admission remain read-only for
this move). Return this failed candidate and both original/new logs; coordinator
must resolve that allocation before another build. Final 20/15 at BOTH #269 AND
#262 and all original mounted/Tier U requirements remain unchanged.

Shared-record proposal above is superseded only as to pending results: focused
51 tests, scoped format/lint and web typecheck PASS; ordinary fresh-coverage
commit audit FAIL 28/23 and validator clean-tree FAIL; staged, uncommitted,
LOCAL/BLOCKED. No text inventory or shared documentation was edited.

## Rework2 — ordinary round 2, 2026-10-22 — committed build

This section supersedes the failed delivery status above only for the current
candidate; all original/rework1 reports, logs, proof contract and screenshots
remain preserved. Read the complete repaired contract, preserved original proof,
#268 body/comments and current allocation amendment before editing. The accepted
allocation is exactly the two pure units; fallback1 stays consumed. No third
boundary, scope exception, suppression, threshold change or bypass was used.

### Fix and commit

- Normal commit **`973e036a`**, `refactor(web): isolate session editor state and
pure menu controls`. Both earlier staged files were retained in full.
- Added `CombatLabAutoplayToggle`: readonly autoplay/disabled/onToggle props,
  identical button/SVG/path/classes/ARIA/title/callback and all three original
  ternaries. No wrapper, state, effects or new strings.
- Added `combatLabMenuDisabled`: exactly four original boolean outputs and five
  current disabled uses. Replay/editor share replayDisabled; restart retains
  starting/unresolved; step retains autoplay/control/pending/deleting; running
  Stop remains enabled. hasPending is exactly `pending !== null` at the caller.
- All staged B hooks, editor shell and lifecycle move remain; effect registration
  order, dependencies, stable cells, synchronous mutations, transport/poll/retry/
  admission bodies and callbacks are unchanged. Whole menu/panel, close callbacks
  and final acceptance remain on #269 AND #262.
- Only CombatLab.tsx and CombatLab.test.tsx have tracked changes. controller.ts
  and controller.test.ts are unchanged. No source writes outside ownership, shared-record/GitHub/Orca writes,
  dependency/config/threshold changes, subagents, DB, deployment, push or PR.
- Formatted source against **65d7466b**: **211 additions + 45 removals = 256/300**;
  tests **90 + 1**, excluded. Ordinary scope gate confirms 256. Total commit
  including tests is 301 additions / 46 removals; that is not the source budget.
- Ordinary `git fetch origin main` + **`git merge --no-edit origin/main`**:
  **PASS**, already up to date (`rework2-merge.log`). No rebase or conflict.

### Audit and focused verification — exact results

1. After first test-file edit, `pnpm check:changes`: **FAIL exit 1**, retained
   CombatLab 28/23 with pre-edit coverage (`rework2-first-test-audit.log`).
2. Failing-first test run: **FAIL exit 1**, **24 passed / 11 failed**, missing
   the two new exports (`rework2-test-red.log`). The new tests are eight finite
   state-table rows and three exact button markup/callback cases.
3. First source-edit audit: **FAIL exit 1**, measured **CombatLab 14 cyclomatic /
   14 cognitive** and helper **11 / 5** (`rework2-first-source-audit.log`). Its
   coverage was still the previous source layout: CRAP findings included the
   changed component/helper and shifted editor. This was recorded, not called a
   pass and not repaired by editing coverage.
4. `pnpm exec vitest run apps/web/src/combat-lab/CombatLab.test.tsx
apps/web/src/combat-lab/controller.test.ts`: **PASS exit 0**, **2 files /
   62 tests**, 1.94 s (`rework2-tests.log`). Existing callback/restart and
   controller manual/hotkey/skill/autoplay/catalog/restore/create/replay cases
   remain in their original discovered files.
5. Web typecheck, scoped ESLint, scoped Prettier check, ordinary and staged
   `git diff --check`: **PASS exit 0** (`rework2-typecheck.log`,
   `rework2-lint.log`, `rework2-format.log`). Prettier changed only test formatting;
   the first source edit was already formatted.
6. **Normal commit PASS exit 0**, after its ordinary focused coverage refresh;
   `rework2-commit.log` says **No issues in 2 changed files**, with only four
   inherited transport findings excluded. No failed-focused-tests warning.
   Changed/new functions have no normal 20/15/CRAP>=30 finding after real refresh;
   this proves their required threshold bounds, not full behavioral coverage.
   Exact individual numeric post-refresh CRAP values are **NOT_MEASURED** by the
   standard threshold-only output; no precise numbers are invented.
7. `bash scripts/orca-validate.sh`: **PASS exit 0, all 9 gates**: rebased,
   clean-tree, scope, packages, typecheck, format, lint, related-tests, audit
   (`rework2-validate.log`; copied per-gate logs `rework2-validate-*.log`).
   Related-test refresh legitimately discovers **1 file / 35 tests PASS**,
   1.70 s; the separate two-file focused run above is 62. The audit again reports
   no new findings and four inherited exclusions, without any waiver.
8. Ordinary refreshed coverage readback `rework2-coverage-readback.json`:
   session state/ref/editor/lifecycle hooks each **1** initialization invocation,
   shell **3**, toggle **3**, menu predicate **9**; production factory **13**,
   actual applyLatest **10**, endBattle **17**, JSON fallback **1**. Hooks' static
   coverage is SSR initialization only. Mounted proof below is separate and was
   never substituted into coverage/coverage-final.json.
9. Full verify/stress/migrations/full coverage/production build: **NOT_RUN**;
   only the validator/runtime's ordinary workspace package builds ran.
   Performance **NOT_MEASURED**. No DB requirement for this slice.

### Fresh mounted proof at committed source

Playwright CLI session `qa268r2`, real Chrome and React 19. Browser-only local
harness routes the app entry to a real createRoot/render of exported production
CombatLab. The DevTools commit callback observes its real linked hook cells;
no hook is mocked, no lifecycle interpreter or mounting dependency is added.
Initial snapshot is taken at commit before passive effects. Holds fetch genuine
server replies; induced failures abort requests, never fabricate projections.
Only sanitized state/ref/response summaries are emitted; capabilities are not
written into evidence. Scripts and exact outputs are local `rework2-*.js` /
`rework2-*.log` files here.

| Original proof row                                         | Current executed evidence                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Seven session, nine ref, three editor defaults             | `rework2-mounted-result.log`: exact initial `[null,false,false,false,null,"",false]`; generation 0, starting/deleting/lost refs false, five nullable refs null; editor `[null,null,true]`, selected skill null. All nine cells compare `===` through catalog, edit, selection, create and pending rerenders.                                                                               |
| Editor shell, validation/reset/forwarding                  | Focused markup/fragment/status/alert/callback tests PASS; mounted invalid Start disabled, exact default reset and held create display PASS. Current loading/invalid/starting/unresolved/failure captures retained.                                                                                                                                                                         |
| Same-task create and pending guards                        | Genuine create held: direct repeated actual DOM onClick produces one POST. Genuine action held: repeated current autoplayAction produces one action. Pending disables all five uses; one-step exactly one accepted POST and leaves menu open. `rework2-mounted-result.log`.                                                                                                                |
| Catalog and restore in both orders                         | `rework2-lifecycle-retry.log`: genuine catalog/read held and released catalog-first and restore-first. Distinct restored draft wins in both orders; catalog-first initially installs default, then restored draft. Refs stay identical. No incidental create.                                                                                                                              |
| Stale generation, unmount/remount and abort                | Same log: held saved read cannot replace a newly created generation/session. React-only unmount increments generation, stops autoplay; fresh root uses nine fresh cells and ignores old held completions. `rework2-uncertain-unmount.log` also proves held genuine create AND action abort on unmount and cannot install/pollute replacement editor state.                                 |
| Failure/loading/restore404                                 | Isolated non-aborted catalog failure ends loading with exact notice. Lost genuine create response sets unresolved; duplicate real onClick sends no second POST, edit/reset/Start blocked. `rework2-restore-errors.log`: restore network failure preserves credentials; actual DELETE204 followed by genuine restore GET404 clears them and shows original notice.                          |
| Optional absent battle / invalid restore / failed deletion | Existing focused regressions and unchanged source PASS; server ordinary path always returns battle, so legacy absent-battle browser row is **NOT_REACHED**, not fabricated. Production callback tests retain success/404/failure/restart-only-after-confirmed-delete coverage.                                                                                                             |
| Selection/current aimed skill/hotkeys/Escape               | `rework2-timers-guards.log`: genuine server-published manual move accepted; aimed skill and current ref survive rerender, ordinary command key blocked while aimed, Escape resets state/ref; autoplay clears selection. `rework2-mounted-result.log`: real board inspect/hover/select/Escape send zero actions; actual input-focus button, Shift/Ctrl/Alt/Meta/repeat send zero.           |
| 550 ms autoplay and pending pause                          | `rework2-timers-guards.log`: real mounted clock 549 ms zero POST, +1 ms exactly one; hold genuine reply, advance 1000 ms, no duplicate POST/manual callback. Stop remains enabled while pending. Stop is synchronous; held completion +1100 ms sends zero late actions. Poll remains 750 ms.                                                                                               |
| Deleting / restart order                                   | Same log: invoke current restart twice, held genuine DELETE gives one DELETE and no early create; all five menu uses disabled. Release204, then exactly one POST201.                                                                                                                                                                                                                       |
| Unmount/lost/uncertain/terminal cancellation               | Same log: root.unmount aborts session signal, increments generation and stops autoplay, +2000 ms zero late POST. Genuine server DELETE then poll404 marks lost, +1100 ms zero actions. `rework2-uncertain-unmount.log`: lost genuine action response becomes uncertain, stops autoplay, +1100 ms sends no further action. Ordinary day/night terminal checks below also show no late POST. |
| Opponent-view runtime guard                                | **NOT_REACHED** through ordinary synchronous opponent advancement; existing production-policy tests plus unchanged source remain the accepted proof format. No projected state was invented.                                                                                                                                                                                               |
| Internal effect/ref/storage ordering                       | Direct staged-versus-base source proof: catalog effect registration before lifecycle cleanup/restore, original cleanup-before-restore registration/dependencies and original installSession/ref/storage statements. Mounted observations above do not purport to prove each internal statement's order.                                                                                    |

### Fresh ordinary smoke — both lights, 1440 × 900

After normal commit and validator, restored the ordinary app entry. Used default
mill seed **20261009**, actual canvas mouse input, native keys/menu buttons and
genuine API responses. A native movement target is located from the server's
published movementPreview and its existing rendered ground mesh; the probe
projects that mesh to pixels, then sends a real right-click. It computes no game
legality and calls no replacement command implementation.

- Day: `rework2-day-journey-retry.log`, **14/14 rows PASS**. **82 action POST200**,
  3 create POST201, 2 DELETE204, replay GET200, 145 session GET200. Inspection /
  selection / Escape zero actions; real right-click move accepted; replay;
  one-step exactly one POST with menu retained; autoplay blocks manual key;
  Stop +1100 ms zero late actions; subsequent native manual wait accepted;
  restart exactly DELETE204 then POST201; editor → Start → genuine round-8
  victory, 5 allied survivors / 1 death / 6 enemy deaths. Terminal +1100 ms no
  late actions. **Zero console errors and zero pageerrors** for successful run.
- Night: `rework2-night-journey-retry.log`, same **14/14 PASS**, **82 action
  POST200**, 3 create POST201, 2 DELETE204, replay GET200, 147 session GET200;
  same genuine round-8 victory and cancellation. **Zero console errors and zero
  pageerrors** for successful run.
- Current `shots/rework2-day-*.png` and `shots/rework2-night-*.png`: editor,
  invalid, loading, closed/open menu, running, stopped and result; day starting
  and catalog failure, night unresolved. All **1440 × 900**, full viewport/HUD.
  Editor/loading/unresolved have no lighting mode themselves; day/night names
  associate them with the corresponding evidence journey. Directly viewed day
  stopped and night result; day result readback follows below.
- No player-facing wording changed: **no Tier T change**, no text.md invented.
  Exact button and shell strings remain tested. Colour-vision emulation is
  **NOT_RUN**, not requested for this behavior-preserving Tier U slice.

### Probe/environment failures — retained, separate from product evidence

- Initial sandboxed Chrome daemon failed before navigation; authorized ordinary
  local browser launch succeeded with the required browser permission. Initial
  navigation also raced the detached runtime and got CONNECTION_REFUSED; the
  persistent launcher then printed READY. Runtime needs the persistent terminal.
- Initial local harness used an incomplete DevTools hook and CJS named imports:
  forEach/ESM-export errors. Fixed only the local probe (renderers Map/default
  imports). One unnecessary function-invocation wrapper produced `__fn__ is not
a function`; normal CLI function form is the retained runner. These are probe
  errors, not product errors. Successful mounted probes record zero pageerrors.
- Initial lifecycle probe remounted before DELETE completion; cleanup invalidated
  that completion, leaving a saved read which then returned actual404 and won the
  notice race against catalog failure. Corrected the probe to await actual editor
  return; isolated failure row passes. No source change. Later APIRequestContext
  cleanup used a relative URL without baseURL; fixed local probe to absolute URL,
  and completed restore-error rows separately. Both failed logs remain.
- Initial native-target probe used resource timing after its buffer had filled,
  so import URL was undefined. Corrected to read the current served module's
  actual import URL; then both native right-click journeys pass.
- First night attempt got create409 after genuine held-create/unmount probes
  consumed the disposable server's session limit. Restarted **only this lane's
  local runtime**, with no DB, and repeated the full night journey successfully.
  Failed409 and all induced request errors remain in their original logs.

### Remaining acceptance and coordinator-owned records

This is a locally committed builder result, **not independent Tier U ACCEPT**,
publication or merge. No subagent was launched per the explicit builder grant.
#269 retains whole-menu/panel/shared-close work and its own full proof plus final
20/15 on BOTH #269 AND #262; #262/#263/#231 remain open. #264 clock/text/privacy
and #265/#190 paced-playback/runner/production-absence obligations, epic viewports /
zoom / visual critic / final integrated gates and shared-record closeout remain
exactly as preserved in contract-before-allocation-repair.md. No parent criterion
is closed by these author results.

Proposed CHANGELOG correction for coordinator, **not applied**: 2026-10-22,
`Vovanostm/qa-hooks-session-editor`, #268, LOCAL: commit 973e036a retains the staged
session/ref/editor/lifecycle restructure and adds only pure autoplay toggle and
four menu disabled outputs. Source 256/300; focused 62, normal refreshed commit
audit and validator 9/9 PASS; genuine mounted timing/guards and current day/night
victories recorded. Strings/DOM/transport/rules unchanged. Independent Tier U and
residual #269 AND #262 gates remain; no publication/merge. No setup/API/rule/
protocol/replay/schema/migration/dependency contract changes. Shared CHANGELOG,
CURRENT_PLAN and wiki are coordinator-owned and were not edited.

### Final readback — rework2 complete, local builder evidence

- Same-base live comparison **PASS** (`rework2-baseline.log`): actual
  `git show 65d7466b:apps/web/src/combat-lab/CombatLab.tsx` bytes, with imports
  redirected only so the existing Vite can serve this local evidence module.
  Same current unchanged dependencies/API, real React createRoot without StrictMode,
  default mill; replay/step/Start/Stop then night autoplay to genuine round-8
  victory. **78 accepted actions, zero console errors, zero pageerrors**.
  Comparison uses the same isolated-root method as the mounted probes; ordinary
  current app additionally passed both complete journeys. No claim that failed
  probe errors were inherited from baseline, and no pixel-identity claim.
- Actual window keyboard-listener lifecycle **PASS**
  (`rework2-listeners.log`): one listener after real mount, zero after React-only
  unmount, one after remount; keys while unmounted send zero POST; zero pageerrors.
  This observes the original functions via add/remove wrappers, without mocking
  hooks or replacing their callbacks. The extra page/root was closed.
- Directly viewed **both** current result images and day stopped capture. PNG
  dimensions read directly: **20 new rework2 captures, all 1440 × 900**,
  including the same-base night result. No pre-rework2 shot was overwritten.
- Playwright session **closed**, `bash scripts/orca-play.sh stop` **PASS exit 0**
  (`rework2-close-browser.log`, `rework2-stop.log`); both persistent launcher
  terminals ended. `rework2-resources.json` / `rework2-cleanup.json`: **all 15
  recorded current browser/runtime PIDs absent**, all 15 original PIDs absent,
  **23492 and 25492 have no listener**, `.orca/play.pid` absent. No DB was used.
- Final tracked tree **clean**; `git diff --check` **PASS**; branch head remains
  **973e036a**, sole local commit above main **65d7466b**. No source changes after
  the normal commit, validator or browser proofs. Evidence/report remain local
  under `.orca/qa-hooks-session-editor/`; no force-add of ignored evidence,
  publication, push, PR, coordinator-state edit or merge of a PR.
- Build brief steps 3–6 are complete with the explicit ordinary-merge override:
  measured first-edit audits, normal successful commit, up-to-date main,
  validator 9/9, fresh mounted and ordinary day/night proof, stopped resources,
  **no Tier T change**. Independent Tier U acceptance is **NOT_RUN by this builder**
  and remains coordinator/evaluator-owned, together with all preserved residual
  and parent gates above. No remaining local implementation or commit blocker.
