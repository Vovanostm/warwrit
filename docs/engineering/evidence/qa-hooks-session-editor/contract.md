## Scope

[#268](https://github.com/Vovanostm/warwrit/issues/268), B: preserve the editor → mill battle → replay/restart/editor journey while isolating session initialization and the editor shell. Recommend allocating only the pure autoplay button and menu disabled predicates from inactive C to B so the original result can pass normal audit in one PR.
[#269](https://github.com/Vovanostm/warwrit/issues/269), C: subsequently finish menu composition with identical replay/restart/editor/step/start-stop controls, disabled states and keyboard/manual guards; retain final component acceptance on BOTH #269 AND #262.
Out: changed player behavior/text/DOM/styles/rules, transport/poll/retry/admission changes, controller.ts edits, QA feature hooks, dependencies, replay/projection/server/migrations. No active slice owns C; this is a proposal pending coordinator readback, not permission to build or close C.
2026-10-22: branch `Vovanostm/qa-hooks-session-editor`, HEAD/main `65d7466bb5bd34ae04ad0ef8e252b5d8808fa5a0`; two staged files, no unstaged source diff or implementation commit. Candidate/evidence remain intact.
Sources: actual staged diff, full local `contract-before-allocation-repair.md` and `report.md` (initial + rework1), #268/#269 and [amendment 6338431498](https://github.com/Vovanostm/warwrit/issues/268#issuecomment-6338431498). Local evidence paths here are relative to `.orca/qa-hooks-session-editor/`.
Graph has another root/head; direct source is authority, no re-index. No local plan/review or `docs/engineering/epics/` contract exists; retained original contract carries epic #217 and aggregate #231 proof/source pointers.

## Changes

This pass writes only this file. Future allocation concerns `apps/web/src/combat-lab/CombatLab.tsx`, `CombatLab.test.tsx`, `controller.test.ts` only; all source is read-only in this pass.
Keep the entire staged B candidate: `useCombatLabSessionState`, `useCombatLabSessionRefs`, `useCombatLabEditorState`, `CombatLabEditorShell` and amendment-authorized `useCombatLabSessionLifecycle`; no replacement/discard needed.
Keep seven state pairs/nine stable cells/defaults, named returns, consumers and synchronous mutations. Catalog retains current `sessionRef.current?.view.battle ?? loaded.defaultBattle`; catalog effect registers before cleanup/restore with unchanged dependencies, abort/generation/storage operations and installSession calls.
Recommended exact additional boundary: extract only CombatLab's autoplay utility `<button>` (staged lines 726–738; main 616–628) into `CombatLabAutoplayToggle`, and its five menu disabled sites into `combatLabMenuDisabled`, in the same TSX.
`CombatLabAutoplayToggle` inputs: readonly `autoplay: boolean`, `disabled: boolean`, `onToggle: () => void`; output: identical button/SVG/path, classes, ARIA, title and click callback, without wrapper/state/effects. Its three existing ternaries move verbatim.
`combatLabMenuDisabled` inputs: readonly booleans `autoplay`, `controlling`, `hasPending`, `deleting`, `starting`, `startUnresolved`; `hasPending` is exactly `pending !== null` at caller. Output: four named booleans using existing expressions:

- `replayDisabled = deleting || hasPending`; use for replay AND editor (staged lines 757, 776).
- `restartDisabled = deleting || hasPending || starting || startUnresolved` (765).
- `stepDisabled = autoplay || !controlling || hasPending || deleting` (788).
- `autoplayDisabled = !autoplay && (!controlling || hasPending || deleting)` (732); running Stop stays enabled.

Call this pure function once after existing controlling/commonReason computation; replace only those disabled expressions and the utility button invocation. No legality calculation, cached state, ref access or transport authority enters either unit.
Keep menuOpen/visibility, toggle, panel/buttons/help, all close-order/download/step callbacks, BattleView busy/commonReason and autoplayAction.current assignment in CombatLab. C finishes those boundaries; no whole-menu move in B.
Actual retained staged size: source +142 / −28 = 170; tests +35 / −1 excluded. Static additional estimate: +70–90 / −21–25 = 91–115; total source +212–232 / −49–53 = 261–285, including ALL current B code. Measure formatted final diff against 65d7466b; hard stop 300.
Historical normal audit: initial 28/24; fresh rework1 28/23 (`rework1-commit.log`), five findings with four unchanged transport findings. Lifecycle relocation removed no remaining cyclomatic sites; repeating it cannot fix the gate.
Static rationale: five disabled sites contain 11 logical operators (3+1+3+1+3); button has three ternaries. Moving these sites removes about 14 cyclomatic and nine cognitive increments from CombatLab: roughly 14/14 estimated, NOT measured or audit PASS.
Helper: ten logical operators across four independent outputs, estimated 11 cyclomatic / 5 cognitive; button: three ternaries, estimated 4/3. Finite units fit 20/15 structurally; actual metrics and measured CRAP <30 require legitimate focused coverage and normal audit.
`CombatLab.test.tsx`: retain staged shell tests and production callback/restart regressions in their discovered consumer; add a focused table through real extracted exports for five disabled uses, both toggle states, exact markup and single callback forwarding. No copied implementation as oracle.
`controller.test.ts`: preserve existing catalog/restore/create/replay/restart/manual/hotkey/skill/autoplay regressions; extend only for a real moved-behavior gap. controller.ts, transport/poll/retry/admission bodies and thresholds remain untouched.
Completed B is the behavior-preserving restructure commit with its own focused tests and normal audit before #264's feature commit. No suppression, exclusions, fabricated coverage, scope exception, new technology or bypass proposed.

## Data

none. No protocol/projection/replay/storage contract changes; old projections/replays and optional-field fallbacks remain compatible. Client gains no range/LOS/cost/legality authority.

## Proof

Full original proof is retained by explicit local source pointer `contract-before-allocation-repair.md`, entire `## Proof` including parent/epic obligations; no row is waived. Original report/logs/shots and rework1 records remain untouched. This mapping adds proof for the proposed pure boundary only.
This pass executed source/issue/evidence reads only. Setup/dependencies/audit/coverage/build/test/browser/server/DB/runtime: NOT_RUN; proposed size/complexity are static estimates; measured resulting size/metrics/CRAP/performance: NOT_MEASURED. Historical 51 tests/typecheck/lint/format PASS do not accept this proposal; ordinary audit remains FAIL.

- #268 AC1 / #269 AC1: focused editor/replay/restart/step/start-stop regressions plus pure state table: idle/opponent/pending/deleting/starting/unresolved/lost/terminal/running autoplay. Assert exact disabled outputs and running Stop availability; repeat genuine journey below with actual accepted requests.
- #268 AC2 / #269 AC2: controller manual/focus/modifier/repeat/aimed-skill/Escape tests plus actual mounted board/menu/input hotkeys. Inspection/selection/Escape send zero actions; single-step one accepted action; blocked manual states zero. SSR never replaces gameplay proof.
- B defaults/ref identity: actual React mount before effects, all seven state/nine ref/three editor defaults; real rerenders retain cell `===` identity. Hold genuine create/action/DELETE for double-start/pending/deleting/lost guards and stale generation/session rejection; retain production callback success/404/failure/restart tests.
- B catalog/lifecycle: genuine catalog/restore responses in BOTH orders, restored precedence/default fallback/absent optional battle, failure/404/stale completion, loading/notice/abort and React-only unmount/remount/replacement. Preserve registration/cleanup/ref/storage order; internal ordering stays explicitly source proof where not observed.
- B shell: loading/absent/invalid/valid/retained-catalog/starting/unresolved/notice tests; exact fragment DOM/status-versus-alert, forwarding/reset/one Start. Toggle markup/table tests prove only pure rendering/props, never effects/timers/admission.
- Preserve #267 mounted selection/current skill/action/reset/Escape/listener/cleanup proof; 549+1 ms autoplay, pending pause, no late POST after Stop/unmount/lost/uncertain/terminal. Poll stays 750 ms; no synthetic hook runner, mocked hooks, fabricated projections or new mounting dependency.
- Independent Tier U: ordinary mill seed 20261009, 1440x900 DAY AND NIGHT: editor → Start once → inspect/select → legal manual move/attack → menu → one-step → authenticated replay → autoplay → blocked manual order → Stop/no late POST → manual order → restart (confirmed DELETE then one create) → editor → Start → autoplay to genuine result.
- Full-HUD day/night screenshots: editor/loading, valid/invalid/start-or-unresolved, menu closed/open, running/stopped/result; actual network outcomes/mounted traces and console/page errors versus same-base behavior. Historical smoke is not fresh proposal proof; accepted unreachable opponent-view row stays source + existing policy test, explicitly unreachable at runtime.
- Future sequential commands after allocation: `pnpm exec vitest run apps/web/src/combat-lab/CombatLab.test.tsx apps/web/src/combat-lab/controller.test.ts`; `pnpm --filter @warwrit/web typecheck`; scoped lint/format; real ordinary staged-related coverage and `pnpm check:changes` through normal commit audit. Read refreshed changed-function metrics/CRAP and real callback hits; no browser-coverage substitution.
- Measure additions PLUS removals against slice base, excluding tests: <=300, one PR, only `Closes #268`. Normal audit PASS, changed/new functions <=20/15 and measured CRAP <30 required; this static contract cannot certify them.
- #269 final acceptance AND #262 AC3: remeasure CombatLab <=20 cyclomatic AND <=15 cognitive with ordinary audit/real coverage after C, before feature hooks; earlier B measurement cannot discharge C/parent gates. #262/#263/#231 remain open/gated.
- All remaining #231/#217 proof stays exactly as preserved: #263/#264 clock/text/privacy/HUD, #265/#190 paced-playback/runner/README/production absence/repeatability, epic viewport/zoom/day-night journey/visual critic/final integrated gates/shared-record closeout. B closes none of these obligations.

## Questions

Product/rule questions: none. Estimated allocation fits one B PR; no additional issue split indicated by this source pass.

- Outside ownership: coordinator reads back and records the narrow B/C reallocation before scheduling implementation; recommend the exact two pure units above, retaining the candidate. Proposal does not supersede amendment 6338431498 until that readback.
- Residual #269: after B, extract CombatLabMenu/CombatLabMenuPanel using the existing toggle/helper, share close-before-restart/editor callbacks with BattleView, retain menuOpen in A, step via current autoplayAction, download/step leaving menu open, DOM/help and commonReason/busy priority. C retains its own <=300 scope measurement, state/close-order tests, full mounted/Tier U and final 20/15 on BOTH C and #262.
- Coordinator sequencing/records: #267 → B/#268 → C/#269 AND #262 final acceptance → #263 → #264; #265 follows #190. Proposed shared-record correction: local allocation proposal only; staged 170/300 candidate uncommitted, normal audit FAIL 28/23, no publication/acceptance. Preserve fallback1 consumed and remaining rework budget 1; task_9aecfc25a843 settled/released. This pass is neither fallback reuse nor rework2 and schedules no worker.

## Coordinator execution checkpoint — 2026-10-22

Allocation accepted in issue amendment 6338799403; rework2 committed as 973e036a, source 256/300. Ordinary main merge 46514ddb contains no game source changes. Coordinator validation all nine gates PASS; builder resources: 30 recorded PIDs absent, ports 23492/25492 clear, no play.pid. Fresh independent Tier U is next; author proof is not acceptance. Final #269 AND #262 and full original proof remain required.
