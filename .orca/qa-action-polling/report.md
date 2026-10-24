# #307 build — round 1

Status: **SUCCEEDED, local build and author smoke only**. Source HEAD `67f49bf2`; final report commit follows it. Allocated base `99e513f563d71804903ecd86ebaa820ad5566d7a`, coordinator records `d5c5d611`. No push, PR, independent acceptance or parent closure. Work completed within the single 60-minute allocation.

Read the complete local contract, both original parent contracts, issue #307/body/comments, AGENTS, current source, plan/changelog and technology guidance. The contract records a stale graph for another checkout; current source was authoritative. The allocation explicitly includes the existing mounted harness. No additional ownership was needed.

## Commits and scope

- `4fc012ff` — finite read/continuation callbacks and deferred public-boundary tests; normal audited commit PASS.
- `fb9fa3c2` — actual CombatLab wiring and mounted timing/cleanup regressions; normal audited commit PASS.
- `67f49bf2` — preserve synchronous timeout installation after the continuation decision; normal audited commit PASS. A returned boolean would add an async boundary before React schedules its timeout. The final controller invokes React's scheduling callback within the guarded continuation, without owning timers. A regression checks synchronous scheduling of skipped pending ticks.

Whole branch against allocated base: **197 source additions + deletions**, comprising `CombatLab.tsx` +23/-68 and `controller.ts` +106/-0. Tests excluded, all commits included. `CombatLab.test.tsx` is unchanged and was executed. The only other worker-tracked path is this report; inherited CHANGELOG/CURRENT_PLAN changes belong to the coordinator and were untouched. No UI/player-text, H1/H2, clock, playback, renderer, rules, server/protocol, schema, replay, migration or dependency edits.

## Acceptance evidence

| Criterion | Actual proof |
| --- | --- |
| AC1: shared read/poll extraction | `CombatLab.tsx` creates `createCombatLabReadCallbacks`; both the existing action callbacks and polling use its `refreshLatest`. React retains refs, session-ID effect, timeout creation/cancellation, AbortController installation and identity-safe cleanup. No second read cache or transport implementation. |
| AC2: initial tick, cadence, no overlap | Mounted test: zero GET at 749 ms, first at 750 ms; held fetch and then held JSON each survive 1,500 ms without another GET. Action acknowledgement shares the held poll and stays pending until JSON settles. Next GET occurs only at settlement +749+1 ms. Restored-terminal initial tick remains, then continuation stops. |
| AC2: shared promise/identity | Public callback tests assert exact promise identity, authenticated endpoint/capability/captured signal, normal own-ref clearing and later read admission. Both old success and old failure preserve an explicitly replaced read promise. |
| AC2: read results and notices | Public callback tests use the existing real session projection callback for malformed/foreign session, foreign battle, older revision, 404/lost, status/code fallback and unreadable JSON. Only the two existing transient prefixes clear; unrelated refusal stays. Network/JSON failures preserve later polling eligibility. |
| AC2: stale async boundaries | Deferred fetch, valid/invalid/error JSON and network rejection after generation change produce no projection, notice or lost-state writes. Retained mounted tests independently abort valid/invalid/503 refresh JSON and late transports that ignore abort. |
| AC2: current-ref admission/continuation | Tests cover pending, uncertain, deleting and resumption; lost/stopped/aborted admission; terminal/lost/replaced/removed/stopped/aborted state after awaited reads. Final scheduling callback has no extra await between the guard and React's timeout installation. |
| AC2: lifecycle and terminal retry path | Mounted tests cancel the initial timeout, abort held reads, ignore delayed poll JSON after unmount, reject a deleted session's late read and preserve a live replacement controller after an old 404 completes. Same-session terminal/lost reads stop continuation without aborting the controller. Existing action tests retain authenticated exact-body terminal retry and single-flight admission. |
| AC3: autoplay/stop and action behavior | Retained real mounted 549+1 ms autoplay and stop-before-due-callback tests pass; manual order works afterward. Existing action regressions for uncertainty, stale JSON, acknowledgement validation, refresh failure, selection and historical retries pass unchanged. Real day/night stop/manual/result evidence is below. |
| Gates | 160 focused tests with genuine coverage; web typecheck, scoped ESLint/Prettier, diff check and all three normal commit audits PASS. Coordinator validation, independent Tier L reviewer/evaluator and final CI/scope/merge gates remain NOT_RUN by this worker. |

## Checks, failures and measured functions

Executed sequentially:

- Initial red controller run: **63 passed, 13 failed**, expected missing factory. After helpers: **97 passed** with focused coverage.
- Integrated three-file coverage: **158 passed**. Added mounted replacement case: **23 mounted tests passed**. Final three-file focused coverage: **160 passed**, 3 files, 3.46 s (`final-coverage.log`). Command: `pnpm exec vitest run apps/web/src/combat-lab/controller.test.ts apps/web/src/combat-lab/CombatLab.test.tsx apps/web/src/combat-lab/CombatLab.mounted.test.tsx --coverage --mode coverage`.
- `pnpm --filter @warwrit/web typecheck`: initial helper PASS; integration caught an invalid fixture outcome enum, corrected to existing `last-side-standing`; final PASS.
- Scoped ESLint and Prettier for all four modified source/test files, plus `git diff --check`: PASS.
- `pnpm check:changes` ran immediately after the first edit of each file. Initial test/controller audits could not run without coverage (exit 2). First component/mounted audits failed with stale coverage against moved lines; fresh three-file coverage removed those findings. Base-pinned audit and each normal hook audit passed with zero new dead-code, complexity or duplication findings. The existing syntactic-attribution warning remains; no suppression, threshold change, bypass or `--no-verify` was used.
- Normal hooks refreshed related coverage and pinned the audit to `99e513f5`. Logs: `commit-1.log`, `commit-2.log`, `commit-3.log`, `audit-integrated.log`.

Final per-function metrics from Fallow with genuine coverage (cyclomatic / cognitive / CRAP):

| Function | Metrics |
| --- | --- |
| `createCombatLabReadCallbacks` | 1 / 0 / 1.0 |
| `receiveView` | 3 / 2 / 3.0 |
| selective notice updater | 3 / 2 / 3.0 |
| `readLatest` | 8 / 9 / 8.0 |
| read `isCurrent` | 2 / 1 / 2.0 |
| error-JSON fallback | 1 / 0 / 1.0 |
| `refreshLatest` | 4 / 3 / 4.0 |
| shared-read finalizer | 2 / 1 / 2.0 |
| controller `poll` | 13 / 7 / 13.0 |
| `CombatLab` | 13 / 13 / 13.0 |
| polling effect / cleanup | 2 / 1 / 2.0 each |
| React `poll`, stop getter, scheduling and timeout callbacks | 1 / 0 / 1.0 each |

These functions report 100% matched coverage; this is focused adapter evidence, not whole-game coverage. Diagnostic metric listings used a stricter CRAP display threshold of 1 to show every function; their above-display-threshold exit is not a gate result. The normal audits used unchanged repository limits 20/15/30. An earlier diagnostic threshold of 0 produced no metric details and was not used as proof. Metric logs: `controller-crap-metrics.log`, `component-crap-metrics.log`.

Full suites, production build, stress, migrations, coordinator validation and independent gates: **NOT_RUN**, as allocated. The prescribed private dev starter rebuilt protocol/game-core for startup; no production build ran. Performance: **NOT_MEASURED**.

## Final author smoke at 67f49bf2

Ordinary URL `http://127.0.0.1:25201/combat-lab`, real Chrome and timers, isolated CLI session `qa307-final`, **1440×900**, default mill **6 versus 6**, seed **20261009**. No direct command HTTP calls, mocked transport, QA hooks or clock injection. `author-smoke.js` records the reproducible UI choreography; all evidence paths below are local and untracked.

Two fresh sessions, both HTTP 201, each execute start → hover/select/inspect → move → attack → end turn → autoplay → stop → manual end turn → autoplay → result. Coordinates after “Обзор поля”: hover/target (852,382), selected reachable cell (580,388). Night is enabled through “Ночная сцена” in its own fresh session.

- Inspection POST count: day **0→0**, night **66→66** cumulative.
- Move: AP **4→3**, stamina **100→96**. Attack: Wolf 1 HP **50→31**, morale **80→68**, then Commander is active. This is real HP damage.
- Stop: day **4→4 over 1,274 ms**, night **70→70 over 1,285 ms**; manual order accepted afterward.
- Both results: **round 7 victory**, 6 allies standing, 0 allied deaths, 6 opponents dead. Each sends 66 action POSTs; all **132/132 HTTP 200 and accepted**. Observed **254 successful GET replies** establish live reads/progression; exact 750/550 ms boundaries are the mounted tests' proof.
- Terminal waits: day **66→66 over 1,104 ms**, night **132→132 over 1,102 ms**.
- No new console/page errors. The sole console error is the inherited startup favicon 404, also present in retained #306 evidence.

Final artifacts under `.orca/qa-action-polling/`: `browser-evidence.json` (sanitized method/path/time/status/intent/revision and visible checkpoints; no credentials or raw command identity bodies), `final-smoke.log`, `browser-console.log`, `final-editor.log`, and `shots/{day,night}-{start,hover,selected,move,attack-preview,attack,end-turn,autoplay,stopped,manual-after-stop,result}.png`. Every final screenshot was captured on `67f49bf2`. Earlier `intermediate-browser-evidence.log` and individual day logs describe the pre-ordering-fix run and are not final-head proof.

Direct visual comparison used retained, tracked `docs/engineering/evidence/qa-action-transport/day-attack.jpg` and `night-result.jpg` against the final captures. The same HUD, target damage and result layout remain usable; existing clipped resource/target details remain baseline limitations. A fresh live-main runtime comparison was **NOT_RUN**. This is author smoke, not independent or scored visual acceptance.

Missing-controller, uncertain retry, deletion-in-flight, lost-session, terminal historical retry, late replacement and abort were **NOT_REACHED in ordinary live play**; the focused callback/mounted tests cover them. No H1/H2 or broader epic acceptance is supplied or waived.

## Exact resource handback

Used `bash scripts/orca-play.sh start/stop` twice, only private ports **23201 API / 25201 web**, pidfile `.orca/play.pid`, log `.orca/play.log`. Existing `.worktree-ports` needed no setup. Held tool terminal sessions 74085 and 77637 were released. No shared campaign stack, global process cleanup or paid service was used.

- First run: launcher **71885**, API **72268**, Vite **72216**, browser daemon **72446**, Chrome **72449**. Entire owned PID set: **71885, 72182, 72183, 72186, 72187, 72216, 72242, 72262, 72268, 72270, 72446, 72449, 72560, 72561, 72562, 72576, 72577, 72578**. Profile `/var/folders/3_/b3csk_7s18s244ynz8dt2tvm0000gn/T/playwright_chromiumdev_profile-aZ8WUx`. Exact parentage in `owned-processes.json`.
- Final run: launcher **88208**, API **88584**, Vite **88546**, browser daemon **89660**, Chrome **89661**. Entire owned PID set: **88208, 88503, 88504, 88505, 88506, 88546, 88577, 88584, 88585, 89660, 89661, 89668, 89669, 89670, 89672, 89673, 89674**. Profile `/var/folders/3_/b3csk_7s18s244ynz8dt2tvm0000gn/T/playwright_chromiumdev_profile-YBpgHd`. Exact parentage in `owned-final-processes.json`.
- Closed only named sessions `qa307-author` and `qa307-final`; both private stops returned **STOPPED**. `cleanup-final.json` confirms **all 35 owned PIDs absent**, both ports unused (lsof exit 1, empty output), pidfile absent, both profiles absent and no matching check processes. All focused checks were foreground commands and reaped; their transient OS PIDs were NOT_MEASURED, with tool completion and process readback establishing no surviving checks.
- Tooling failures, not game failures: status fetch could not update FETCH_HEAD; skill wrapper executable permission/npm cache EPERM required `bash` then the existing installed CLI; initial evidence storage on `globalThis` did not persist across CLI calls, so final listeners use a captured record on the Playwright page; initial sandbox `ps` needed approved read-only escalation. A final sandboxed Chrome launch failed on Crashpad access (daemon **89206**, Chrome **89207**); both were confirmed absent, and the approved isolated launch succeeded. No approval rejection, dependency install or cache repair occurred.

## Coordinator handoff / proposed shared records

Proposed CHANGELOG entry: **2026-10-24, `Vovanostm/qa-action-polling`, LOCAL #307** — shared authenticated reads and polling continuation extracted into `controller.ts`, wired into CombatLab while preserving initial/post-settlement 750 ms polling, 550 ms autoplay, exact-body retries and stale-response/cleanup guards. 197 whole-branch source lines; 160 focused tests, typecheck/lint/format and normal audits pass. Final day/night author journeys at `67f49bf2` reach round-7 victory with stop/terminal network evidence and verified private cleanup. Independent Tier L/validation/CI/publication remain pending. No game-rule, schema or API change.

Proposed CURRENT_PLAN update: #307 builder settled locally; coordinator next verifies clean commits and cleanup, runs its allocated validation/scope gate, then independent Tier L reviewer/evaluator. Keep #263/H1/H2 open, all consumed recovery/rework budgets unchanged, and #179/#209/#310/#297 holds intact. No parent closure, budget reset or additional milestone allocation.
