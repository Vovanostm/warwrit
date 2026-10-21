## Scope

[#273](https://github.com/Vovanostm/warwrit/issues/273), accepted allocation 2026-10-22: preserve the ordinary mill battle (seed `20261009`), including latest-view updates, ending/restarting, selection, Escape, manual orders, one-step and autoplay. Expose only the existing production `applyLatest` and `endBattle` callbacks for real Node tests before #267.
This is the sole finite #263 prerequisite before #267; remaining #263 stays after #262. Final CombatLab cyclomatic ≤20 AND cognitive ≤15 remains on #269 AND #262 before feature hooks; #267 budgets and its retained 159-source-line candidate are unchanged.
Out: other callback/body extraction, hooks/features, UI/art/rules, server/protocol/renderer, dependencies, audit/config changes, synthetic hook runners, generic lifecycle frameworks, acceptance waivers and another #267 recovery.
This pass writes only this contract; no source, tests, services, commits, shared records or other worktrees are touched.

## Changes

Checked clean branch `Vovanostm/qa-hooks-session-callbacks`, HEAD/live main `61a91600afeb33c6195e174d87e687c48416e694` on 2026-10-22; #273 body/comments match `issue-273.md` (no comments).
Reuse `allocation-source.md`; no earlier plan/review exists here. `docs/engineering/epics/217/contract.md` is absent. Graph points to another root/old `b44f5c1e`; direct current-source readback used without re-indexing.
All future source paths below are under `apps/web/src/combat-lab/`; exclusive ownership is limited to these four files.

- `CombatLab.tsx`, `CombatLab`: replace only the `applyLatest` (168–174) and `endBattle` (437–476) declarations with explicit factory wiring, so production and tests execute the same callbacks.
- `controller.ts`: export `createCombatLabSessionCallbacks`, returning exactly named `applyLatest` and `endBattle`, with finite named port types. Reuse `latestCombatLabView`, `ActiveSession`, `messageFor` and `responseCode`; keep callback names/behavior rather than moving functions solely for audit identity.
- Ports reference current generation/session/controller/pending/deleting/lost refs and the existing install/stop/setter/notice callbacks plus API base. Type only each required operation/value; retain ref identities and sole mutable ownership in CombatLab, never copy factory-time state or introduce a generic state bag.
- `controller.test.ts`: test the exported production seam with mutable current-state ports and controlled fetch, including the existing restart boundary using real `endBattle` instead of only a stub.
- `CombatLab.test.tsx`: retain existing regressions; add only a necessary wiring regression supported by existing tests. SSR does not exercise mounted effects; no synthetic React lifecycle harness.

Make #273 a behavior-preserving restructure commit with its production-callback tests before the later #267 feature commit. Keep factory/callbacks small; add only finite local functions if required to meet cyclomatic ≤20, cognitive ≤15 and measured CRAP <30 through the ordinary audit.
Retained analysis reports callback complexity 5/4 and 9/10 but zero-coverage CRAP 30/90; those are historical findings, not this candidate's measured verdict. Do not rename/reposition to hide findings or claim final CombatLab acceptance from this intermediate extraction.
Keep all other bodies, effects, initializers, mutation sites, UI and timers unchanged: especially installSession/startBattle/restartBattle/downloadReplay, refreshLatest/action/request/poll/retry and 550 ms autoplay/750 ms polling.
Estimate 160–205 source additions PLUS removals, tests excluded; measure against the issue base and stop at 300. Do not widen ownership or absorb deferred #263 work to fill that allowance.

## Data

None. No protocol/projection fields, replay formats, serialization, RNG or migration changes; old replays/projections and existing optional-field fallbacks remain compatible. Client callbacks coordinate existing state/transport and compute no range, LOS, cost or legality.

## Proof

These are future builder/evaluator obligations; this contract is not implementation or acceptance proof.

- #273 / copied #263 AC1, intervals/exact-body retry/single-flight: ordinary source diff proves unchanged action/retry/poll/autoplay bodies and intervals; retain existing admission/reply/retry regressions. Hold DELETE unresolved, call end twice, and assert one authenticated request, deleting admission set synchronously before awaiting, and no premature install/clear/replacement create.
- #273 / copied #263 AC2, latest view: invoke real `applyLatest` with stale generation, absent/foreign session, foreign battle, equal/older/newer revision. Rejected reads never install; newer same-battle reads install once, retain session identity/capability and leave inputs unchanged. Mutate ref contents between calls to prove current-state lookup; generation changes after replacement/unmount reject late views.
- AC2, end/stop guards: stop autoplay before every early return; null session returns true; pending/deleting returns false with no DELETE. Preserve URL, capability header, captured controller signal when present, omitted signal when absent, and boolean outcome. Terminal/lost sessions remain deletable when otherwise unblocked.
- AC2, success/404: assert exact order generation increment → abort CURRENT controller → install null → mark removed → lost ref false → lost state false → pending ref null → pending state null → original notice. Cover controller absent/present/replaced while awaiting; request signal stays captured while cleanup aborts the current controller.
- AC2, failure/abort: rejected HTTP with valid/invalid error JSON, network rejection and aborted DELETE rejection return false; retain session, generation, pending/lost state, preserve original notices and stop autoplay. Finally always clears deleting ref before deleting state; success/404 returns true. Add no new stale-completion/abort policy absent from current endBattle.
- AC2, restart: real seam plus `restartSessionBattle` proves invalid/blocked restart makes no request, failed or unresolved removal makes no create, and confirmed success/404 allows create only after cleanup. Retain create/restore/replay/manual-admission regressions.
- #273 / copied #263 AC3, audit/boundaries: focused production-callback tests, typecheck, scoped lint/format, unchanged hook-generated coverage and ordinary `pnpm check:changes` prove the restructure before later feature hooks; diff proves no server/protocol/renderer changes.
- Copied #267/#262 AC1, replay/restart/editor/one-step/start-stop/disabled states: retain focused regressions and repeat Tier U journey below; assert labels, ARIA, menu-close order, actual request outcomes and reason precedence match baseline.
- AC1 disabled matrix: replay/editor blocked by deleting/pending; restart additionally starting/unresolved; one-step additionally autoplay/not controlling; autoplay start blocked by not controlling/pending/deleting, stop available while running. Exercise idle/opponent/pending/deleting/starting/unresolved/lost/terminal/running; markup alone does not prove requests.
- Copied #267/#262 AC2, keyboard/manual guards: focused existing tests plus mounted Escape (also input focus), board focus/modifier/repeat/menu/aim guards, current skill after rerender, session/activation reset and listener cleanup. Hover/selection/Escape send zero actions, one-step sends once, blocked manual states send none.
- Preserve mounted autoplay: skill clears before enabling; synchronous refs/current action after rerender, 549+1 ms, dependency cancellation and stop/unmount cleanup. Pending/opponent pauses; uncertain/lost/deleting/terminal stops; releasing held response after stop causes no late POST. These remain Tier U/#267 proof, not SSR claims.
- Copied #262 AC3: #273 ordinary audit must pass with real callback coverage and no introduced finding; final CombatLab ≤20/15 is still required conjunctively on #269 AND #262 before feature hooks. Inherited findings do not satisfy that final gate.

Future builder gates run sequentially, never concurrent heavy checks:

1. `pnpm exec vitest run apps/web/src/combat-lab/CombatLab.test.tsx apps/web/src/combat-lab/controller.test.ts`.
2. `pnpm --filter @warwrit/web typecheck`, then scoped ESLint and Prettier for the four owned files.
3. Stage only the owned candidate; reproduce the existing pre-commit `vitest related --run --coverage --mode coverage --passWithNoTests` command with actual staged code paths; inspect real callback coverage and every introduced complexity/CRAP finding.
4. Run unchanged `pnpm check:changes`, scope check and normal commit (whose hook refreshes coverage again); inspect actual final results. No imported coverage, attribution overrides, suppressions, lowered thresholds or bypass.
5. After coordinator integration, #267's ordinary hook refresh must discover these production seam tests through CombatLab → controller imports and pass again; no saved/imported coverage substitution.

Independent Tier U evaluator repeats ordinary mill seed `20261009` at 1440x900 in BOTH day and night: editor → start → selection → legal move/attack → menu → one-step → replay download → autoplay → stop → legal manual order → restart → editor return → start → autoplay to terminal result.
Capture full HUD screenshots in each lighting mode with menu closed/open, running/stopped autoplay and result; retain actual mounted/network/lifecycle evidence and compare console/page errors with baseline. Confirm unobstructed input and unchanged disabled/keyboard/manual behavior; audit success cannot replace this playtest.
Current pass: issue/main/source readback completed; contract headings, length, scope and whitespace checked. Source implementation, focused tests, typecheck, lint, hook audit/coverage, commit and Tier U are NOT_RUN; candidate metrics/runtime are NOT_MEASURED. Full suites/builds remain coordinator-owned.

## Questions

Product/rule questions: none.
Outside ownership: coordinator owns issue/dependency state, shared CHANGELOG/CURRENT_PLAN/wiki records, publication/integration and evaluator assignment; recommended follow accepted allocation, preserve #267 staged WIP and all budgets, and close only #273 when its gates pass.
Sequence remains #273 → #267 → #268 → #269 AND #262 final gate → remaining #263 → #264; #265 waits #190. No merge/deploy/paid-service permission is granted here.
Coordinator record proposal: 2026-10-22, `Vovanostm/qa-hooks-session-callbacks`, local #273 five-section contract based on clean/live `61a91600`; finite callback proof planned, implementation/audit/Tier U NOT_RUN, final #269/#262 gate unchanged.
No size split is currently indicated by the estimate. If additions PLUS removals exceed 300 source lines excluding tests, stop and return the measured bounded split to the coordinator rather than extending this slice.
