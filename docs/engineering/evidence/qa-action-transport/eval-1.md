VERDICT: ACCEPT 090843b5b477c345c0587df17d99b09ffcbc51cf

# #306 independent evaluation — round 1, 2026-10-24

No reproduced #306 defect, unmet child acceptance criterion, ownership violation,
or new rule/privacy/replay violation was found. Acceptance is limited to R3b/#306
at this HEAD. #263, #307, H1/H2, #231/#217 and original #179/#209/#310/#297
acceptance and consumed recovery history remain open and unchanged.

## Scope and source findings

- Clean tracked tree at entry and exit on `Vovanostm/qa-action-transport`.
  Actual HEAD is the verdict SHA; `origin/main` is
  `1d6df3af66f323a5701ceaed0643f6e314e93bcc`. The difference from source
  `804d5983a76e93bcb66f5cb659be88664fd93a0c` is coordinator records only.
- Read AGENTS.md, warwrit-review, playwright, issue #306 body and comments,
  the complete accepted local contract/allocation and report.md, both named
  parent contracts, current plan/changelog, ADR-0003 and technology handoff.
  Reviewed the complete scoped source/test diff and retained #305 review/evaluation.
- Graph metadata identifies a different checkout and old HEAD. Current source
  and `git diff origin/main...HEAD` are the review authority; no index was changed.
- Source changes are only CombatLab.tsx (+13/-108) and controller.ts (+124):
  **245/300 source lines**. Matching tests change only controller.test.ts and
  the explicitly allocated CombatLab.mounted.test.tsx. CombatLab.test.tsx is
  unchanged and was run. CHANGELOG/CURRENT_PLAN differences are the authorized
  coordinator records, not an unauthorized builder edit.
- No changed player strings, renderer, server/game-core, API/protocol, replay,
  schema/migration, dependency, configuration or client legality calculation.

| Acceptance                                                         | Independent assessment                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1: finite callbacks used by the actual UI                        | CombatLab.tsx:665 delegates to `createCombatLabActionCallbacks`; controller.ts:272 owns submit/act/retry. Field, menu, hotkey and autoplay wiring continue to use these callbacks. No parallel submit implementation remains.                                                                                                                                              |
| AC2: current refs and authentication                               | controller.ts:276/351/376 reads current admission/session/activation/revision/skill/autoplay refs; POST uses current capability and captured session signal. The executed test constructs callbacks before replacing these refs and verifies the actual request. Blocked states cause no request or pending/notice mutation.                                               |
| AC2: exact retry and synchronous single-flight                     | controller.ts:278 reuses synchronous admission; retry requires uncertain pending and passes the original serialized body/description. Controller and mounted tests cover network/missing-controller/503/unreadable/malformed/foreign replies, unchanged bytes after terminal projection, and competing calls. Three independent real-browser fault probes below also pass. |
| AC2: selection, pending and autoplay settlement                    | Actual callback tests hold refresh, change current revision, then settle. Accepted/new revision clears selection and pending without stopping valid autoplay; accepted/unchanged revision stops it; rejected retains selection and displays the existing refusal. Uncertain replies preserve body/description/selection and stop autoplay.                                 |
| AC3: late POST and refresh cannot change replacement/aborted state | controller.ts:296/336/338/315/341 checks generation and abort after fetch, after JSON, after refresh and in catch. Executed callback cases independently defer fetch, 503/404 JSON, refresh/failure and network rejection, with replacement-state sentinels and no stale effects.                                                                                          |
| AC3: nested refresh is itself safe                                 | CombatLab.tsx:563/568 adds post-JSON guards inside the actual read callback. Mounted tests exercise real CombatLab fetch/JSON/refresh for invalid 200, newer valid 200 and 503 bodies after abort, late POST ignoring abort, and delayed POST/refresh JSON after actual unmount. These are not solely harmless refresh stubs.                                              |
| Retained timing/lifecycle                                          | Executed mounted tests prove 549+1 ms autoplay, 749+1 ms initial poll, shared in-flight GET, no overlapping read during 1,500 ms, and the next read only at settlement+750 ms. Stop suppresses the already scheduled callback and permits a manual order. Poll extraction/full continuation remains #307.                                                                  |

## Executed checks and evidence boundary

Toolchain: Node **v24.20.0**, pnpm **11.25.0**.

Executed sequentially, exit 0:

```text
pnpm exec vitest run apps/web/src/combat-lab/controller.test.ts apps/web/src/combat-lab/CombatLab.test.tsx apps/web/src/combat-lab/CombatLab.mounted.test.tsx
118 tests PASS, 3 files, 2.24 seconds

git diff --check
PASS
```

Independent test log: `.orca/qa-action-transport/eval-evidence/focused-tests.log`.
The mounted harness replaces WebGL only; the real menu, CommandDesk, CombatLab,
action callbacks, asynchronous reads and cleanup execute against controlled
transport. This is adapter/lifecycle proof, not simulated gameplay acceptance.

Inspected existing coordinator logs, not rerun: 145 related tests, typecheck,
normal audit and 245/300 scope pass. The audit reports no new dead-code,
complexity or duplication findings, with its existing syntactic-attribution
fallback warning. Author prerequisite/normal-hook and function-health evidence
remains author evidence. Independent lint/typecheck/audit/coverage: NOT_RUN;
complexity/CRAP remeasurement: NOT_MEASURED. No builds, installs, full suites,
coverage/stress/migration gates, commits, pushes, Orca calls or agents were used.

## Two independent ordinary player journeys

Real Chrome, isolated named Playwright CLI session **qa306-eval1**, viewport
**1440×900**, ordinary URL `http://127.0.0.1:25544/combat-lab`, real timers.
Default mill, **6 allies versus 6 opponents**, seed **20261009** read from the
editor. Day starts with “Начать бой”; night starts a new session using
“Начать заново”, then enables “Ночная сцена”. Each journey has its own 201
session-create response and complete move/attack/stop/manual/result sequence.
A third session is solely for the separately labelled fault probes.

Both completed journeys:

1. Start, Home/“Обзор поля”, hover wolf around (852,382), select the reachable
   cell at (580,388), inspect the displayed movement cost. No action POST:
   day **0→0**, night **66→66** cumulative.
2. Click “Переместиться”: one-cell movement, AP **4→3**, stamina **100→96**.
3. Select Wolf 1 at (852,382), inspect **80%**, **14–22 HP**, **3 AP** preview;
   click “Атаковать”. Wolf 1 HP falls **50→31**, morale **80→68**;
   Commander becomes active. This is actual HP loss, not armor-only damage.
4. Click “Завершить ход”, start autoplay, observe its accepted action and stop
   before result. Day POST count **4→4 over 1,175 ms**; night **70→70 over
   1,185 ms**. Both exceed 550 ms without another action POST.
5. Click manual “Завершить ход” after stopping: accepted in both sessions.
   Resume autoplay through actual UI and wait for the visible victory result.
6. Both finish **round 7, victory, 6 allies standing, 0 allied deaths, 6 opponents
   dead**. Each sends **66 action POSTs**, all HTTP 200 / accepted. A further
   **1,002 ms** terminal wait leaves day **66→66**, night **132→132**.

No direct HTTP command, fabricated projection, QA clock or injected game state
substituted for any journey action. Full-HUD screenshots are in
`.orca/qa-action-transport/eval-shots/`: day/night start, hover, selected,
move, attack-preview, attack, end-turn, autoplay, stopped, manual-after-stop,
result; day also includes the initial close camera and overview.
Sanitized observations and commands are in `eval-evidence/day-*.log`,
`night-*.log`, and `browser-evidence.json` under the same task directory.

An intermediate day sample was taken while autoplay was still in round 6;
its initial terminal label was corrected to `mid-autoplay-not-terminal` in
browser-evidence.json, and the original log is retained with the correction
as `day-mid-autoplay.log`. Only the subsequent visible-victory sample in
`day-terminal.log` establishes terminal proof.

## Browser fault-injection adapter probes

These are transport probes on the third real session, not ordinary gameplay.
Only `**/dev/combat-lab/*/actions` was intercepted; each route was removed
before the next probe. Commands and retries still originate from UI clicks.
Only body/capability equality booleans were persisted; credentials, raw headers
and original command identity bodies were not recorded.

| Injection                                                 | Observed result                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Abort first autoplay POST before delivery                 | “Доставка неизвестна…”; autoplay stops, manual command disabled, count remains 1 for 800 ms. Double-click retry plus forced competing mouse click on disabled end-turn yields exactly one held retry (2 requests total); byte-identical body and same nonempty capability. Retry button disappears while held. Real server accepts retry; pending clears and manual control returns. |
| Fulfill first autoplay POST with HTTP 503                 | “Сервер не подтвердил результат…”; count remains 1 for 800 ms. Double-click retry gives one held retry, same body and capability. Real server accepts, uncertainty clears.                                                                                                                                                                                                           |
| Forward end-turn, replace only acknowledgement request ID | Real server accepted at revision 8; actual refresh changes actor **Commander→Spear**, but foreign acknowledgement leaves uncertainty. Double-click retry sends the original historical bytes and capability once; real server returns 200/accepted, pending clears and manual control returns.                                                                                       |

Evidence: `eval-evidence/probe-network-start.log`, `probe-network-retry.log`,
`probe-503.log`, `probe-foreign.log`, sanitized aggregate `browser-evidence.json`;
screenshots `probe-network-uncertain.png`, `probe-network-retry-inflight.png`,
`probe-503-uncertain.png`, `probe-foreign-uncertain.png`.

## Baseline, visual and console assessment

Compared current source against origin/main and read the retained accepted
#305 evaluation/review in `docs/engineering/evidence/qa-action-admission`.
Directly compared its day-attack and night-result images with my captures.
This is source plus retained accepted baseline evidence; a fresh live main
runtime comparison was NOT_RUN and is not claimed.

At 1440×900 day and night, active-actor/AP information, attack target HP,
command controls, autoplay stop, uncertainty/retry and result are readable
and usable. No new #306 obstruction or overlap was observed. Existing close
camera movement/transitions, small overview figures, clipped initiative
resources and scrollable target details remain visible baseline limitations;
the identical baseline attack composition already contains the latter layout.
The transient ground-centred autoplay capture does not establish a new camera
regression: camera/renderer/wiring source is unchanged, and subsequent captures
show the actor. This is Tier L regression acceptance, not Tier V or closure of
any frozen visual criterion.

Ordinary browser play: no page exceptions or new console errors/warnings.
There is one startup favicon 404, also recorded in accepted #305 evidence.
Probes add the expected `net::ERR_FAILED` and injected HTTP 503 console errors.
`eval-evidence/browser-console.log` is sanitized; the aggregate listener was
installed after startup, so the startup favicon is recorded in that console
log rather than its `errors` array.

## Explicit limits

- Missing controller, lost-session/404, deletion-in-flight, terminal historical
  retry, late replacement and abort were **NOT_REACHED in ordinary live play**.
  Executed callback/mounted tests cover the relevant action and actual nested
  read boundaries; the historical browser retry exercised a changed activation,
  not terminal state. Rejected-reply selection effects are test/source proof.
- Exact 550/750 ms boundaries are fake-timer mounted evidence; browser evidence
  establishes actual progression and no post-stop action beyond 550 ms.
- No H1 text/clock/runner/production absence, H2 actor playback, future #307
  extraction, broader epic viewport/accessibility, performance or full visual
  acceptance is supplied or waived. Performance is **NOT_MEASURED**.

## Runtime cleanup and direct handback

`bash scripts/orca-play.sh start` returned
`READY http://127.0.0.1:25544/combat-lab`; no exit 3 occurred. A held PTY kept
its launcher alive. `.worktree-ports` already existed; setup was unnecessary.

- Launcher **57490**; API **57725** on **23544**; Vite **57720** on **25544**;
  named browser daemon **58335**, Chrome **58336**.
- All **17** owned server/browser process IDs and descendants were recorded in
  `eval-evidence/owned-processes.json`, excluding other workers.
- Closed only `qa306-eval1`, then `bash scripts/orca-play.sh stop` → **STOPPED**;
  released the held PTY. The focused-check process had already exited 0.
- Direct process/port/profile readback in `eval-evidence/cleanup.json`:
  **all 17 PIDs absent**, no matching private runtime/browser daemon,
  both ports unused (`lsof` exit 1, empty output), `.orca/play.pid` absent,
  temporary browser profile absent. No other runtime was stopped.
- Initial sandbox `ps` was denied; the targeted escalated read succeeded.
  The skill wrapper subsequently hit npm-cache EPERM; I used its already
  installed Playwright CLI directly, without installation or cache mutation.
  One initial guessed CLI entry path and one non-function run-code invocation
  failed; corrected invocations supplied all evidence above. These tooling
  failures were not counted as game defects or successful checks.
- Only this report, evaluator screenshots and sanitized evidence were retained;
  CLI-generated snapshots were moved into the owned evidence directory.
  Source/shared records were not modified. Final tracked tree is clean and
  HEAD remains the verdict SHA.

Coordinator documentation proposal: record independent evaluator ACCEPT at
090843b5, 118 focused tests, two separate round-7 day/night victories, three
browser retry probes and verified private-runtime cleanup. Reviewer verdict,
final CI/PR/merge and parent acceptance remain separate coordinator gates.
