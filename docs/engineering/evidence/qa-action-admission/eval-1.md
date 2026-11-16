VERDICT: ACCEPT a54b65c680d4cfab8e66540b4ffe146a0b887e7d

# #305 independent evaluation — round 1, 2026-10-24

No reproduced #305 defect, unmet child acceptance criterion, ownership violation,
or new rule/privacy/replay violation was found. This accepts only R3a/#305 at the
head above. It does not accept #263, #231, #217, #306/#307, H1/H2, or frozen visual work.

## Scope and source review

- Read AGENTS.md, `warwrit-review`, `playwright`, issue #305 body and comments,
  the complete local contract, and both named parent contracts. Read current
  CURRENT_PLAN/CHANGELOG and the technology/art policies relevant to inspection.
- Branch `Vovanostm/qa-action-admission`; clean tracked tree at entry and exit.
  Actual HEAD matched the allocation. `31d6fa5f..HEAD` changes only coordinator
  CHANGELOG/CURRENT_PLAN records; there were no unexpected source changes.
- Reviewed the complete `origin/main...HEAD` diff, with origin/main at
  `96f5b2b9bf86e6aa92a837186922a338dfad4258`. The source delta is 169 lines:
  CombatLab.tsx +44/-51 and controller.ts +74. The remaining source-adjacent
  changes are controller.test.ts and the explicitly transferred mounted test.
  Shared-record changes are the coordinator's authorized history.
- `CombatLab.tsx:679` retains serialization, authenticated fetch, response
  parsing, refresh, and generation/abort guards. The three controller helpers
  preserve the original admission predicate, synchronous reservation, four
  uncertainty notices, current-ref revision check, selection and autoplay
  effects. `retryAction` still requires uncertain pending state before admission.
  No range/LOS/cost/legality calculation, transport/poll extraction, protocol,
  replay, renderer, dependency or migration change is present.
- Graph lookup did not provide verifiable checkout/head provenance; direct diff
  and source were used as authority. No index or shared record was modified.

## Executed checks

Independent focused run, exit 0: `pnpm exec vitest run
apps/web/src/combat-lab/controller.test.ts
apps/web/src/combat-lab/CombatLab.test.tsx
apps/web/src/combat-lab/CombatLab.mounted.test.tsx` — **88 tests, 3 files PASS**.
Log: `.orca/qa-action-admission/eval-shots/focused-tests.log`.

The existing coordinator validation/audit evidence was inspected, not rerun:
all 9 checks and 115 related tests passed at the unchanged source head; normal
audit reports zero new dead-code/complexity/duplication findings against
`96f5b2b9`. Its type-aware compatibility warning remains in the original log.
The builder's actual hook coverage/metrics record submitAction at 14/14,
83.87% statement coverage and derived CRAP 14.8224. These are retained
measurements, not a new evaluator coverage measurement. Independent typecheck,
lint, coverage, production build, full verify/stress/migrations: NOT_RUN;
no source changed in this evaluation.

## What I played

Real Chrome, isolated session `eval305r1` and profile
`.orca/qa-action-admission/eval-profile`; viewport **1440 × 900**.
Ordinary URL `http://127.0.0.1:25685/combat-lab`, real timers, default mill,
seed **20261009**, six allies versus six opponents. No QA clock, fabricated
projection, direct command injection or server-state mutation was used.

There were four real session creates, each 201: an initial exploratory session,
the complete day journey, the complete night journey, and the separate retry
probe session. The exploratory session tested hover/initiative selection and
one legal move to (1,6); selecting the initiative card recentred the camera.
I restarted through the UI and used the overview consistently for both complete
journeys. That exploratory move is retained in the network evidence, not hidden.

Both complete journeys:

1. Start once; click **Home / Обзор поля**, hover and select the projected cell
   at (581,388). Inspection alone sends **zero action POSTs** (day 1→1 in the
   cumulative trace; night 65→65). The first exploratory inspection also stayed 0→0.
2. Click **Переместиться**: archer moves to axial (3,4), AP 4→3, stamina 100→96.
   The actual serialized command and 200 response are retained.
3. Select the wolf at (854,382); visible legal attack preview says 80%,
   14–22 HP, 3 AP. Click **Атаковать**: Wolf 1 HP **50→31**, morale 80→68;
   Commander becomes the current actor. This is real HP damage, not armor-only.
4. Click **Завершить ход**, start autoplay, capture it running, then stop
   before the result. Day POST count remains **6→6 for 1,101 ms**;
   night remains **70→70 for 1,103 ms**. Counts include prior sessions.
5. Click **Завершить ход** manually after stop; it is accepted. Resume autoplay.
6. Both sessions finish with **round-7 victory, 6 allies standing, 0 allied
   deaths, 6 opponents dead**. Each complete journey sends **64 action POSTs**,
   all with 200 responses. Result screenshots show the actual final counts.

My full-HUD screenshots are under `.orca/qa-action-admission/eval-shots/`:
`day-start.png`, `day-start-overview.png`, `day-selected-overview.png`,
`day-move-overview.png`, `day-attack-preview.png`, `day-attack.png`,
`day-end-turn.png`, `day-running.png`, `day-stopped.png`,
`day-manual-after-stop.png`, `day-result.png`, and corresponding
`night-start/selected/move/attack-preview/attack/end-turn/running/stopped/manual-after-stop/result.png`.
The additional exploratory day captures remain labelled by their filenames.

## Actual-browser retry adapter probes

These are explicitly injected transport/acknowledgement failures, separate
from the two genuine gameplay runs. Only `/api/dev/combat-lab/*/actions`
was intercepted. All interception was removed after each probe.

| Probe                                                                           | Observed uncertainty                                                                                                                                     | Real retry outcome                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Abort the first autoplay POST before delivery                                   | Original «Доставка неизвестна…» notice; autoplay stops; manual order disabled; no second POST during 1,100 ms                                            | Repeated mouse clicks on retry plus a competing manual click produce exactly one in-flight retry; byte-identical body/request ID and same nonempty capability; real server 200; pending clears and manual control returns |
| Fulfill the first autoplay POST with HTTP 503                                   | Original «Сервер не подтвердил результат…» notice; autoplay stops; one request remains one during 700 ms                                                 | Double click sends one retry; identical body and capability; real server 200; pending clears                                                                                                                              |
| Forward a real end-turn order, then replace only its acknowledgement request ID | Real server accepted at revision 8; UI refresh advances from Commander (`human-6`) to Spear; original «Ответ на действие не подтвержден…» notice remains | Double click retries the original historical body and capability, despite the new actor; one retry, real server 200; pending and notice clear                                                                             |

During each held retry the retry control is absent, preventing another retry;
the original synchronous ref guard also rejects the competing manual click.
Only boolean capability-presence/equality results were saved. No credential
or request headers were recorded. Probe screenshots:
`probe-network-uncertain.png`, `probe-network-retry-inflight.png`,
`probe-5xx-uncertain.png`, `probe-unmatched-uncertain.png`.

One evaluator automation call initially asked `isDisabled()` of the retry button
after it had disappeared and timed out at 30 seconds. Direct inspection showed
exactly two requests total (original failure plus held retry). I recorded the
absent control, released that same request and verified settlement; no source
change or fabricated response was used to overcome the probe-script mistake.

## Baseline, visual and console comparison

- Compared the source with origin/main and inspected available #303 baseline
  proof in `../eval-269-main-cf3b2901/.orca/eval-269/`: day/night journey JSON,
  day HUD and night stopped screenshots, plus the issue's accepted baseline
  comparison with `690d140b`. Production combat-lab code between `cf3b2901`
  and origin/main is unchanged; only the mounted test was added there.
- The initial day HUD matches that baseline composition. In my day/night
  captures the action controls, AP, selected-target HP, uncertainty notice,
  retry control and result are readable and usable without new obstruction.
  Existing close-camera framing, small overview figures and scrollable target
  detail panel are not newly introduced #305 changes. This is a Tier L
  regression judgment, not full visual acceptance for #179/#209 or the epic.
- The earlier baseline used a different manual path, extra waits and restarts,
  and finished in round 8. I do not equate that outcome with an identical-order
  replay comparison. Current day/night used the same path and each finished
  in round 7; no new behavioral regression was observed.
- Ordinary play: one favicon 404, also present in baseline proof; no page
  exception or additional ordinary-play console error. The adapter probes add
  the expected `net::ERR_FAILED` and injected 503 messages. They are not game
  defects. Complete sanitized evidence: `eval-shots/browser-evidence.json`
  and `eval-shots/browser-console.log`.

## Explicit limits

Missing-controller, lost-session/404, deletion-in-flight, terminal historical
retry and late generation replacement were NOT_REACHED as ordinary live
gameplay. Focused tests cover the relevant existing/helper/mounted boundaries;
the browser probes above prove only the states actually described. Rejected
reply/selection effects are focused-test and source evidence, not a live
server-rejection claim. Parent exact fake-timer/shared-read/lifecycle proof,
#306/#307, H1 text/clock/runner/production absence, H2 playback and epic viewport
acceptance remain assigned to their owners and are not waived by this verdict.

## Runtime and cleanup

- `bash scripts/orca-play.sh start` returned
  `READY http://127.0.0.1:25685/combat-lab`. Initial short-lived launch shells
  were followed by connection refusals because their child runtime exited;
  keeping the launch shell alive resolved this environment lifetime issue.
  No start returned exit 3, no dependency was installed, and no shared DB was used.
- Final launcher PID **96819**; API **97137** on **23685**, web **97131** on
  **25685**; isolated browser daemon **96085**, Chrome **96087**. All 17
  owned launcher/browser descendant PIDs are recorded in
  `eval-shots/owned-processes.json`.
- Closed only `eval305r1`, then ran `bash scripts/orca-play.sh stop` → **STOPPED**.
  The first readback briefly saw pnpm/tsx watchers 97044/97046/97100; all had
  exited before a targeted TERM attempt (each returned “no such process”).
  Final direct readback: **all 17 PIDs absent**, both private ports unused
  (`lsof` exit 1, empty output), `.orca/play.pid` absent. See `eval-shots/cleanup.json`.
  Removed the closed isolated profile to discard its volatile session capability;
  retained this browser's snapshots/log only under the private eval-shots directory.
- No source/test edits, staging, commits, pushes, refs, shared records, labels,
  merges, dependency changes or Orca commands. Only private evaluator evidence
  and this report were authored. Final HEAD remains the accepted SHA above.

Coordinator record proposal: #305 independent evaluator ACCEPT at a54b65c6;
88 focused tests PASS, own day/night round-7 victories and three actual-browser
retry probes PASS, cleanup verified. Independent reviewer/CI/merge remain
separate gates; parent and retained H1/H2 acceptance stays open.
