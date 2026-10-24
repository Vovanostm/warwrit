VERDICT: ACCEPT 6485ed800ee699c2591f2cde1897137f27d589d6

# #307 independent evaluation — round 1, 2026-10-24

## Findings

None. No reproduced defect, unmet #307 acceptance criterion, source ownership
violation, or new rule/privacy/replay violation was found. Acceptance applies
only to this Tier L extraction at the unchanged verdict HEAD. It does not close
#263/H1/H2, #231 or #217, reset consumed budgets, or release any existing hold
on #179/#209/#310/#297.

## Reviewed source and contract

- Read AGENTS.md first; read warwrit-review and playwright, issue #307 body and
  comments (including mounted-test allocation), the full local contract and both
  named absolute-path parent contracts. Read CURRENT_PLAN, relevant CHANGELOG,
  ADR-0003, technology handoff, author report and retained #306 evaluation.
- Entry: clean tracked tree on `Vovanostm/qa-action-polling`. Read HEAD once with
  `git rev-parse HEAD`: the verdict SHA. Base is `origin/main` at `99e513f5`.
  The later checkpoint contains authorized coordinator records; source is frozen
  at `67f49bf2`. Exit head readback matches the verdict SHA.
- The graph lists `/Users/vovanostm/learn/warwrit` at old head `b44f5c1e`, not
  this checkout. Reviewed current files and `git diff origin/main...HEAD`
  directly; no shared graph index was changed.
- Source scope: CombatLab.tsx +23/-68 and controller.ts +106/-0,
  **197/300** source lines. Test changes are controller.test.ts and the explicitly
  allocated CombatLab.mounted.test.tsx. CombatLab.test.tsx is unchanged.
  Author report and CHANGELOG/CURRENT_PLAN are authorized delivery records,
  not an additional source allocation.
- No changes to rules, renderer, player text, API/protocol, server/game-core,
  replay, schema, dependencies or client legality calculations.

| Contract boundary                   | Source and executed evidence                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared read used by actual UI       | CombatLab.tsx:541 creates the controller callbacks; the same `refreshLatest` feeds action handling and polling. controller.ts:456 owns the one React-held promise and identity-checked finalizer. Concurrent callers get the same promise; old success/failure cannot clear its replacement.                                                                                                                                                 |
| Initial and post-settlement cadence | CombatLab.tsx:556–583 keeps the effect keyed by session ID, initial timeout, rescheduling and cleanup. Mounted test at :529 proves 749+1 ms, holds fetch for 1,500 ms, then JSON for another 1,500 ms while action acknowledgement waits on that same read; no overlap and next GET only after JSON settlement plus 749+1 ms.                                                                                                                |
| Read response safety                | controller.ts:419–453 checks generation/abort after fetch, after successful/error JSON, and in catch. Actual callbacks preserve authenticated endpoint/captured signal, 404 lost state, malformed/foreign-session notice, older/foreign-battle rejection via real applyLatest, error-code fallback and selective transient-notice clearing. Deferred generation and real mounted abort/unmount cases pass.                                   |
| Poll admission and continuation     | controller.ts:469 reads pending/deleting/lost refs at invocation and active session/stop/abort/lost after settlement. Public tests skip pending, uncertain and deleting reads and resume eligible polling; lost/stopped/aborted suppress continuation. Late terminal/replaced/removed sessions cannot reschedule. A paused poll installs its next timeout synchronously.                                                                     |
| React cleanup and terminal retry    | Cleanup stops, clears timeout, aborts and clears the ref only by controller identity. Mounted tests cancel the initial tick on unmount, ignore late JSON and deleted-session responses, preserve a replacement controller, and preserve the initial restored-terminal tick without further polling or same-session abort. Existing action tests retain byte-identical authenticated terminal historical retry and synchronous single-flight. |
| Autoplay and manual control         | Existing mounted 549+1 ms and stop-before-due-callback regressions pass. Uncertain/lost/deleting/terminal admission tests pass. Both ordinary journeys below prove stop followed by a successful manual order and eventual result.                                                                                                                                                                                                           |

The executed mounted harness replaces WebGL and controls transport; it exercises
real CombatLab effects, menu/commands, controller callbacks and cleanup. It is
adapter/timer evidence, distinct from real-browser gameplay below. Terminal
historical retry is source/test evidence, not a claim that it occurred live.

## Independent checks

Executed sequentially, each exit 0:

```text
pnpm exec vitest run apps/web/src/combat-lab/controller.test.ts
98 tests PASS
pnpm exec vitest run apps/web/src/combat-lab/CombatLab.test.tsx
39 tests PASS
pnpm exec vitest run apps/web/src/combat-lab/CombatLab.mounted.test.tsx
23 tests PASS
git diff --check
PASS
```

Logs: `.orca/qa-action-polling/eval-evidence/{controller,component,mounted}-tests.log`.
Total **160 tests**; no test/check process survives. Coordinator validation,
coverage/audit/typecheck/lint were not rerun. Their supplied pass remains
coordinator evidence. Independent complexity/CRAP and performance:
**NOT_MEASURED**. Full suites, production build, stress and migrations:
**NOT_RUN**. The prescribed dev starter rebuilt protocol/game-core for startup;
this was not a production build. No installs, source edits, commits, pushes,
Orca commands or delegation were performed.

## Played: two fresh ordinary mill journeys

`bash scripts/orca-play.sh start` returned exactly:

```text
READY http://127.0.0.1:25201/combat-lab
```

Real Chrome, named private Playwright CLI session **qa307-eval1**, **1440×900**,
ordinary URL without QA mode, real timers. Default mill: **6 allies versus
6 opponents**, editor seed **20261009**. Day uses “Начать бой”; night uses
“Начать заново” after the day result and enables “Ночная сцена”. Two distinct
session-create replies were HTTP 201. No direct action HTTP calls, interception,
injected projections, game-state mutation or clock patch substituted for play.

Both journeys followed this sequence:

1. Start and click “Обзор поля”. Hover Wolf 1 at (852,382), select reachable
   cell (580,388), inspect the one-cell movement cost. Action POST counts stay
   **0→0 day**, **66→66 night** (cumulative).
2. Click “Переместиться”: AP **4→3**, stamina **100→96**.
3. Select Wolf 1 at (852,382): preview **80%**, **14–22 HP**, **3 AP**.
   Click “Атаковать”: Wolf 1 HP **50→31**, morale **80→68**; Commander becomes
   active. This is HP loss, not armor-only damage.
4. Click “Завершить ход”, start autoplay, observe one action, stop before result.
   Wait **1,202 ms** in each journey: POST count stays **4→4 day**, **70→70 night**.
5. Click manual “Завершить ход”: accepted, counts become **5 day**, **71 night**.
   Resume autoplay through the actual UI and wait for visible “Победа”.
6. Both reach **round 7 victory**, **6 allies standing**, **0 allied deaths**,
   **6 opponents dead**. Each journey sends 66 action POSTs. Terminal waits:
   day **66→66 for 1,102 ms**, night **132→132 for 1,101 ms**.

Network observation recorded **132/132 HTTP 200 accepted action replies** and
**369 GET replies**, demonstrating live reads/progression. Exact 550/750 ms
boundaries are established by the focused timer tests, not browser wall time.

Own full-HUD captures: `.orca/qa-action-polling/eval-shots/` contains day/night
start, hover, selected, move, attack-preview, attack, end-turn, autoplay, stopped,
manual-after-stop and result; day also has overview. **23 PNGs**, all 1440×900.
Sanitized method/category/time/status/revision observations and visible checkpoint
text are in `.orca/qa-action-polling/eval-evidence/browser-evidence.json`;
individual step logs are in that same evidence directory. No credentials,
headers, raw action bodies or command identities were persisted.

## Visual/console assessment and limits

Directly compared my day-attack and night-result screenshots with retained
current-base #306 captures under `docs/engineering/evidence/qa-action-transport/`.
HUD composition, target HP, command availability and result agree. Active actor,
AP, movement/attack preview, autoplay stop and result remain readable and usable
in both lighting modes. No new obstruction or overlap was observed.

Existing clipped initiative resources, scrollable target details, small overview
figures and camera changes remain baseline limitations. The retained day-attack
image already shows the same clipping/layout. This is Tier L regression judgment;
no scored visual acceptance or frozen visual hold is claimed. **Fresh live-main
comparison NOT_RUN**, as it was not allocated.

No page exception or new console error/warning occurred. The sole startup error
is favicon.ico HTTP 404, also documented in retained #306 evidence. The listener
was installed after initial load; startup output is retained separately in
`eval-evidence/console-2026-10-24T06-19-10-595Z.log`.

Missing controller, uncertain retry, deletion-in-flight, lost/404, terminal
historical retry, stale generation/replacement and transport ignoring abort were
**NOT_REACHED in ordinary play**. They have the focused source/test evidence
described above; no live reproduction is fabricated. No H1 text/clock/runner or
production-absence proof, H2 actor playback, broader epic viewport/accessibility,
or full-M1 acceptance is provided or waived.

## Private resource cleanup

- Ports **23201 API / 25201 web** were unoccupied before startup. Existing
  `.worktree-ports` required no setup. Runtime pidfile: `.orca/play.pid`.
- Launcher **17448**; API **17913**, Vite **17907**. Browser daemon **19013**,
  Chrome **19014**, named session **qa307-eval1**. Exact parentage for all
  **17 owned PIDs** is in `eval-evidence/owned-processes.json`.
- Browser profile:
  `/var/folders/3_/b3csk_7s18s244ynz8dt2tvm0000gn/T/playwright_chromiumdev_profile-0ImGCx`.
- Closed only `qa307-eval1`, then `bash scripts/orca-play.sh stop` returned
  **STOPPED**. Released held runtime terminal 77976. No global process kills.
- `eval-evidence/cleanup.json`: **all 17 PIDs absent**, both ports unused
  (`lsof` exit 1, empty output), pidfile absent, profile absent, no surviving
  checks. All focused checks were completed foreground processes; their
  transient individual PIDs were NOT_MEASURED.
- Tooling limitations: initial sandbox `ps` was denied; targeted read-only
  escalation supplied parentage/cleanup proof. Skill wrapper lacked executable
  permission, so invoked via bash; a later npm-cache EPERM was avoided by using
  the already-installed Playwright CLI directly, without cache repair/install.
  One incorrectly shell-quoted screenshot invocation failed and was corrected
  before capture. These are tooling failures, not game defects or passed checks.
- Moved only this evaluator's generated CLI snapshots/console file into its
  evidence directory. Source, tests, shared records and the parallel reviewer's
  artifacts were untouched; tracked working tree remains clean.

## Proposed coordinator record update

Record evaluator **ACCEPT at 6485ed800ee699c2591f2cde1897137f27d589d6**:
160 focused tests, two independent day/night round-7 victories, zero POST after
stop/terminal beyond 550 ms, baseline comparison and verified private cleanup.
No code correction is proposed. Keep independent source review, final CI/PR
delivery and all parent/blocked acceptance separate. Coordinator alone updates
CHANGELOG/CURRENT_PLAN; this evaluator does not edit shared documents.
