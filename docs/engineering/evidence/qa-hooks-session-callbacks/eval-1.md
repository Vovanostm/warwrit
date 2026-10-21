VERDICT: ACCEPT a6b3514388828c5d9db79232df03486a2f72b4a2

# Independent Tier U evaluation — #273, round 1

Evaluated 2026-10-22 (Europe/Moscow). No confirmed defect or unmet existing-layout visual criterion was found in this bounded callback extraction. This verdict covers #273 only; it does not close #263, #267, #262 or their remaining proof obligations.

## Source checkpoint and scope

- Gated code SHA: `a6b3514388828c5d9db79232df03486a2f72b4a2`.
- Observed HEAD at entry: the gated SHA. Observed HEAD at closeout: `84789f5bb5153cc0154cba9b75563bf36a89ac62`.
- The later commit changes only `CHANGELOG.md` and `docs/engineering/CURRENT_PLAN.md`. The evaluated source is unchanged. Tracked working-tree status was clean at entry and closeout.
- Read the entire local `contract.md`, current GitHub #273 body/comments, root AGENTS.md, warwrit-review and playwright skills, current plan/changelog checkpoint and technology guidance.
- Reviewed `git diff origin/main...HEAD`, the frozen source diff and affected callers. Frozen diff contains only `CombatLab.tsx`, `controller.ts`, and `controller.test.ts`; `CombatLab.test.tsx` is unchanged. Source additions plus removals: **137** (65 + 72), tests excluded.
- The graph indexes another root, `/Users/vovanostm/learn/warwrit`, at old `b44f5c1e`; it was not used as current-source proof or re-indexed. Direct source reads were used.
- `CombatLab.tsx:167` wires the existing refs/setters into the finite factory. `controller.ts:136–186` returns exactly `applyLatest` and `endBattle`. Comparison with the removed bodies found preserved guards, notices, request URL/header/signal, success/404 ordering and finally cleanup. `applyLatest` reads current refs and uses the unchanged same-session/battle revision filter. The DELETE captures its request signal, then aborts the current controller during successful cleanup.
- Request/action/retry/poll/autoplay bodies and effects remain in CombatLab. Polling remains 750 ms; autoplay remains 550 ms. No rule, protocol, replay-format, renderer, migration, dependency, configuration or other source-owner change was introduced.

## Independent executed checks

`pnpm exec vitest run apps/web/src/combat-lab/CombatLab.test.tsx apps/web/src/combat-lab/controller.test.ts`: **PASS, 2 files / 48 tests**, 12.70 s. Output: `eval-focused.log`.

These tests import the exported production seam. Inspected assertions cover stale generation, absent/foreign session, foreign battle, equal/older/newer views, mutable current refs and retained capability; null/pending/deleting end guards; terminal/lost deletion; held DELETE single-flight; current/captured/absent controller handling; ordered success/404 cleanup; HTTP/JSON/network/abort failures; and restart through the real seam only after confirmed removal. These are Node callback tests, not mounted-effect or SSR acceptance claims.

`git diff --check origin/main...a6b3514388828c5d9db79232df03486a2f72b4a2`: **PASS**. No coordinator validator, audit, coverage run or broad suite was repeated.

## Own mounted player journeys

Runtime: `bash scripts/orca-play.sh start`, `READY http://127.0.0.1:25793/combat-lab`; private API 23793 and web 25793. Own named Playwright browser session `qa273eval`, headed Chrome, **1440 × 900**. Both journeys used the ordinary default mill, seed **20261009**. No builder screenshots were used as playtest evidence.

| Step                    | Day                                                                                         | Night                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Editor → Start          | Actual POST 201; mounted default battle                                                     | Actual POST 201; toggled Night in the mounted scene                             |
| Hover / selection       | Zero action POSTs                                                                           | Zero action POSTs                                                               |
| Legal move              | Selected cell, Move → `{type: move, to: {q: 3, r: 5}}`; revision 4 → 5                      | Same legal move and server update                                               |
| Menu / one-step         | Menu opens; one-step sends exactly one autoplay action                                      | Menu opens; one-step sends exactly one autoplay action                          |
| Replay download         | Real replay GET and browser download                                                        | Real replay GET and browser download                                            |
| Autoplay / Stop         | Real successive action/reply/latest-view updates; stopped control and HUD captured          | Real successive updates; running and stopped HUD captured                       |
| Manual order after Stop | Board keyboard Wait sent exactly once                                                       | Wait button sent a real action; later manual Attack sent once, revision 30 → 31 |
| Restart                 | Held authenticated DELETE 204; no create before release; replacement POST 201 after release | Actual deletion/replacement; Night reselected after scene remount               |
| Editor return → Start   | Actual end request, editor with same seed, fresh start                                      | Actual end request, editor with same seed, fresh start and Night                |
| Finish battle           | **Victory**, round 8, revision 163, `last-side-standing`, winner `human`                    | **Victory**, round 9, revision 168, same reason/winner                          |

The night manual Attack selected a server-published legal enemy through its initiative portrait; selecting/hovering the target sent zero action POSTs. Both downloaded files parse as replay schemaVersion 1, seed 20261009, with 7 commands. Evidence: `eval-shots/day-replay.json`, `eval-shots/night-replay.json`. Downloading was exercised; replay re-execution/import is not claimed.

## Mounted transport, guards and lifecycle observations

- **Deleting / restart ordering:** held the real DELETE response after the server returned 204. Exactly one authenticated DELETE was observed; the old board remained mounted; menu closed before completion (`aria-expanded=false`); replay/restart/editor/one-step/autoplay start were disabled; a board command sent no action. Zero replacement creates occurred while held. On release, replacement creation began only after removal. A subsequent held create confirmed the intermediate editor state. Exact synchronous double invocation and cleanup mutation ordering are additionally covered by the executed production-callback tests.
- **Starting / unresolved create:** held a real POST 201 response. `Начинаем бой…`, Reset and the name field were disabled. Returned an evaluator-injected transport 503 instead of that response: Start and Reset stayed disabled and the original uncertainty notice appeared. Removed the resulting owned orphan with the existing authenticated API (204), removed the route, and reloaded to continue. No guessed successful create or automatic retry was counted.
- **Pending / Stop:** held a real accepted action response (server 200). Replay/restart/editor/one-step were disabled, Stop stayed enabled, and manual keyboard input sent no action. Stopped before releasing the response; zero additional action POSTs followed release and a further 1300 ms observation.
- **Uncertain / exact-body retry:** sent a real action accepted by the server (200), but substituted a 503 response. Autoplay stopped (`aria-pressed=false`); replay/restart/editor/one-step/autoplay start were disabled; blocked manual input sent zero actions. Retry sent byte-for-byte identical original JSON, then recovered through the real server reply/latest view.
- **Lost session / 404 end:** removed only the evaluator's idle battle through the existing authenticated API (204). Mounted polling detected 404 and showed the original lost notice. One-step/autoplay start were disabled; replay/restart/editor remained available as in the baseline table. Manual input sent zero actions. Replay GET returned the expected 404; Editor issued DELETE 404 and successfully returned to the editor.
- **550 ms / cancellation:** used the existing Playwright browser clock on the real mounted client: zero autoplay POSTs at 549 ms, exactly one at 550 ms. After Stop, advancing another 2000 ms sent none. This was not a hook runner.
- **Keyboard:** open menu plus board-focused `4` sent zero actions. Shift/Ctrl modifiers plus one initial and one repeated keydown produced only the one ordinary Wait. Editor name-input focus plus Escape/`4` sent zero action requests. Escape from a focused battle control closed/cancelled the active mode.
- **Current skill after rerender:** at revision 39 the server published legal `reach-thrust` targets. Selected `Дальний укол`, toggled Day/Night to force rerenders, and pressed board `4`: zero actions, aim remained selected. Escape from a focused menu button cleared `aria-pressed`. Selected again and enabled autoplay: aim cleared before the 550 ms step; the actual intent was `autoplay`, with no late POST after Stop and another 1500 ms.
- **Session/activation journeys:** restarts and editor/new-session transitions installed the new active actor and normal controls; subsequent orders used current revisions/activations. Session-generation rejection is directly tested at the production seam. Explicit isolation of every reset effect is limited below.
- **Terminal:** real result HUD appeared in both modes; autoplay stopped, start/one-step were disabled, replay stayed available, and board `4` sent zero commands. After night terminal settlement, another 1600 ms produced zero network events. No synthetic terminal view was supplied.

Sanitized mounted request/response timeline, final state, page-error array and final hit tests: `eval-runtime.log`. Request headers/capabilities are not included in that log.

## Tier U existing-layout visual judgment

**PASS** for #273 at 1440 × 900 in both Day and Night: battle HUD, active unit/resources, command/skill controls, menu text and terminal results are readable; controls used in the journey are reachable. The menu and result controls were also checked with actual element-center hit testing: all six were inside the viewport and unobstructed. No material clipping or overlapping control defect was found. Unit inspection uses the existing scroll cue/panel; this is not a redesigned layout or Tier V art/layer acceptance.

Own full-viewport screenshots under `eval-shots/`:

- Required Day: `day-closed.png`, `day-open.png`, `day-running.png`, `day-stopped.png`, `day-result.png`; also `day-result-open.png`.
- Required Night: `night-closed.png`, `night-open.png`, `night-running.png`, `night-stopped.png`, `night-result.png`; also `night-result-open.png`.
- Additional exercised states: `day-deleting.png`, `day-uncertain.png`, `starting-controls.png`, `unresolved-create.png`, `lost-session.png`, `night-attack-preview.png`, `night-aim.png`.
- `day-inspection-running.png` shows an inspected unit during autoplay, not an aim-guard proof. `day-starting.png` is the initial editor viewport during a held create; `starting-controls.png` captures the actual disabled start controls.

## Console baseline and environment

Initial successful mounted baseline contained React DevTools info and Babylon WebGL2 startup logging, no console errors or warnings. Across subsequent normal journeys there were **zero page errors**. The complete retained console log (`eval-console.log`) contains two deliberate 503 resource errors (action/create failure injection) and three expected 404 resource errors (read/replay/delete of the deliberately removed session). Those are named test stimuli, not unexplained application regressions. A separate origin/main runtime console comparison was NOT_RUN; no normal-path console defect needed baseline attribution.

The first launch printed READY but its children died after the short-lived execution shell exited; browser navigation then returned `net::ERR_CONNECTION_REFUSED`. Retried the unchanged launcher while keeping its terminal alive; READY and HTTP 200 remained available throughout play. No launcher edit was made, and no launch returned exit 3. The wrapper file itself was not executable, so it was invoked with `bash`. A diagnostic `ps` command was denied by the sandbox; cleanup uses the available launcher and lsof checks below. Two exploratory browser attempts used a stale/changed label or off-screen marker, and one earlier aim attempt overlapped an autoplay command; they are not counted as successful proof. The final skill and attack checks above were repeated sequentially on observed current controls.

## Explicit limits / ownership

- Coordinator typecheck/lint/format/normal-commit audit, hook-generated coverage/CRAP and scope validator: **NOT_RUN independently**, intentionally not duplicated. Evaluator does not certify their quantitative output from builder reports. Independent executed checks are listed above.
- Full verify, coverage, combat stress, migrations and production build: **NOT_RUN**, as instructed. Performance and other devices/viewports: **NOT_MEASURED**.
- A stable opponent-controlled activation was not obtained in the ordinary returned mill projections. A separate mounted opponent-pause state was **NOT_RUN**; no fabricated opponent view was injected. The unchanged policy and focused tests do not become mounted opponent proof.
- Isolated React-root unmount with a held response, exact listener-count removal, and each selected-skill session/activation-reset permutation: **NOT_RUN independently**. Existing UI supports editor/scene transitions and document reload, not an isolated CombatLab root-unmount control; no synthetic hook runner or test-only API was added. Source cleanup effects are unchanged, and late-generation behavior is exercised by the real callback tests. SSR is not used to claim those mounted effects passed.
- This ACCEPT neither waives missing original #267/#262 obligations nor accepts final CombatLab complexity. Final component **cyclomatic ≤20 AND cognitive ≤15** remains deferred conjunctively to **#269 AND #262** before feature hooks; remaining #263 stays with its original owner.
- No source/tests/dependency/config/shared-record change, commit, push, PR write, label change, merge, deployment or orca command was made by this evaluator. Coordinator retains shared documentation/publication ownership; this report is the evaluator's documentation closeout.

## Cleanup

**PASS:** owned browser `qa273eval` closed; `bash scripts/orca-play.sh stop` returned `STOPPED`; subsequent status returned `DOWN`; `lsof -nP -iTCP:23793 -iTCP:25793 -sTCP:LISTEN` found **no listeners**. The held launcher terminal was released and exited 0. See `eval-cleanup.log` and `eval-listeners.log` (empty because no listener was found). All response routes had been removed before browser closure, and the deliberately uncertain-create orphan was deleted before runtime shutdown.

## Findings

None. No automatic source rework requested. The limits above describe unexecuted proof boundaries, not reproduced defects.
