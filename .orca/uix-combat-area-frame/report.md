# #310 — rework round 2: local author repair complete

2026-10-24, branch `Vovanostm/uix-combat-area-frame`; start `d0b0c251`, previous
source `f1752045`, base/current origin/main `25dd9a48`. No integration was needed.
Source commit `9bdc109` introduced finite reachable framing/forecast/border repair;
follow-up source commit **`5a5b46e1`** adds enabled live mesh bounds and its
regression. Final source validation passes all nine gates; the final closeout
commit changes this report only.
No push, PR, merge, deployment, paid service, delegation, Orca CLI or shared-record edit.

## Defect results

- **F1 — author PASS.** The action tries the finite below/left/right/above outcome
  openings and accepts only a fit wholly within the existing ordinary full-field
  camera envelope, including minimum/maximum zoom. It does not replace those limits
  with limits computed from the requested opening. An unreachable fit leaves the
  camera unchanged. It includes padded figures plus actual enabled live sprite-plane
  and casualty-plaque world corners; disabled dead figures remain excluded.
  Actual terminal mill seed 20261009, round 10/revision 189: all five survivors and
  retained plaques fit left of the outcome at both viewports, day/night, with zero
  measured HUD intersections or offscreen subjects. All four GET brackets are
  identical and contain zero action POSTs. Evidence: `rework-2/terminal-matrix.log`.
- **F2 — author PASS.** The visible nonzero `.battle-target-forecast` rectangle
  contributes the left safe bound; hidden/zero-area rectangles are ignored.
  Default mill round 2/revision 29, axe/shield active, Wolf 1 pointer-selected without
  attack: all four viewport/light rows have zero HUD intersections/offscreen subjects,
  identical GET state and zero action POSTs. Evidence: `rework-2/forecast.log`.
- **F3 — author PASS.** Only the participants utility boundary changes to `#84918a`.
  At 1920×1080/100%, DPR 1, computed border `rgb(132,145,138)` against fill
  `rgb(39,52,56)` measures **3.914:1**; text remains **10.498:1**, **18 px**,
  line-height 23.4 px. Evidence: `rework-2/contrast.log` and its screenshot.
- **T1 — inventory corrected.** Existing grid TITLE «Сетка» / “Grid” appears in
  screen order in `text.md`. No player-facing wording or localization rewrite.

## Current affected measurements and images

Real encounter GETs and browser-native zoom were used; no mocked server state,
CSS zoom or transform substitution. The two exact affected states were each replayed
across all four rows, rather than claiming four fresh complete encounters. Native
125% readback is 1.25; physical 1366×768 gives CSS 1093×614, canvas 1092.8×614.4,
DPR 1.25 and visualViewport scale 1. The 1440×900/100% rows have DPR 1.

| Case (same bounds day/night) | Actual subject envelope, CSS px: left/right/top/bottom | Result |
| --- | --- | --- |
| Terminal, 1440×900/100% | 28.00 / 494.00 / 316.70 / 651.18 | Clear of outcome x=510–930 and all measured HUD |
| Terminal, 1366×768/125% | 28.68 / 320.69 / 236.51 / 446.39 | Clear of outcome x=336.4–756.4 and all measured HUD |
| Forecast, 1440×900/100% | 292.00 / 1412.00 / 195.93 / 598.07 | Clear of forecast and all measured HUD |
| Forecast, 1366×768/125% | 307.97 / 1044.50 / 121.60 / 386.40 | Clear of forecast and all measured HUD |

Current images are under `rework-2/shots/`: each four-row prefix has
`-terminal-framed.png`, `-default-target-forecast-framed.png`, `-active-home.png`
and `-keyboard-frame.png`; typography is `1920x1080-100-utility-contrast.png`.
They are author evidence for a fresh evaluator/full visual critic, not independent
acceptance. Numeric logs include every projected subject and visible HUD rectangle.
The terminal envelope includes 13 enabled subject meshes (five live planes and
retained rendered plaques); no marker was hidden to improve the composition.

## Acceptance / retained proof mapping

All original issue AC and contract Proof rows remain due; the following distinguishes
current affected proof from prior evidence on unchanged boundaries.

| Boundary | Evidence and remaining limits |
| --- | --- |
| AC1 utility, keyboard, Home | Current `rework-2/input.log`: four rows, Tab/Shift+Tab, Enter/Space identical framing, visible focus (2 CSS px at 100%, 1.6 at 125%); pointer/keyboard Home project all 165 terrain cells inside viewport. All GET states identical, zero action POSTs. |
| AC1 terminal arrival | Real manually reached casualty round 4/revision 61 followed by autoplay to round 10/revision 189; `terminal-arrival-2.log` records unchanged arrival camera before any terminal framing. This was at `9bdc109`; the follow-up changes only the explicit action's subject list, not terminal/update/default-fit paths. Gate-1 four-row arrival evidence is also retained on these unchanged paths. Inspect disclosure is still absent and remains #209 integration work. |
| AC2 geometry/clamp/fallback | Current existing tests initialize camera limits from ordinary full-field framing, reject the reviewer's asymmetric unreachable request both with subjects and no-subject full-field fallback, then project an accepted asymmetric request through the real clamped camera without replacing limits. Existing transformed plaque, same-tile, height 0/1/2, W01/B002/B053 and collapsed-opening regressions retained. Added full enabled live-plane boundary case. |
| AC2 visible panels | Current F1/F2 matrix above. At `9bdc109`, real casualty/open log/menu/pinned portrait proof in `casualty-input-proof.log` has zero intersections. After live-plane inclusion, these exact panel compositions were not replayed: NOT_RUN on final source, fresh evaluator must cover them. Gate-1 panel evidence is historical only. |
| AC3 camera intent/state | Current four-row `input.log`: manual pan/wheel retained after settled polling; resize retains zoom without stale fit; Home/input and zero-POST state proof pass. F2 pointer targeting separately exercised. |
| AC3 readiness/reentry | Gate-1 `readiness-2.log`, `reentry.log`, activation logs remain evidence for unchanged `battle-hud-scene.ts` request queue/abort/disposal and unchanged scene activation/resize guards. Those files/paths are identical to `f1752045`; they are not claimed as current affected geometry proof. Current terminal restart exercised once (`restart.log`), but delayed-readiness/reentry/activation matrix NOT_RUN again. |
| AC4 full journey matrix | Gate-1 four independently played casualty-to-terminal rows preserved in `eval-1.md`. This rework reran exact F1/F2 and Home/input four-row matrices; it does not claim the entire original journey matrix was independently repeated. Current active-Home captures are named as such, not initial-state captures. |
| AC5 visual/accessibility | Current F3 and visible keyboard focus measured. Gate-1 CVD/reduced-motion/comparison sheets map to unchanged assets, renderer, sprite size, grounding and UI wording; changed framing/border require fresh affected assessment. Full rubric/independent visual ACCEPT remains coordinator-owned and pending. |
| AC5 text | Inventory T1 repaired; fresh text verdict pending. Existing source wording and order unchanged. |
| Unreached edges | Runtime collapsed-opening safe no-op, no-subject and retreated/surrendered states remain NOT_REACHED/NOT_RUN; source regressions are not runtime proof. Missing E2 archive, parent AC6, #179/#209/#214 gates and budgets unchanged. |

## Checks, source scope and failures

Cumulative source budget **281/300**: prior 186 + first repair commit 82 + follow-up
13 additions/deletions; tests excluded. Only owned `sprite-battle-scene.ts`,
`battle-framing.ts`, `battle-controls.css` and the two existing geometry tests changed
in this round, plus owned report/text. `BattleView.tsx`, `battle-hud-scene.ts` and
`BattleView.test.tsx` are unchanged in this round. No renderer/rules/protocol/server/
migration/parent patch, threshold change, audit suppression or hook bypass.

All checks serial; detailed logs under `rework-2/`:

- First-edit `pnpm check:changes` for every changed code file: PASS; audits report
  no new dead code, complexity or duplication issue. CSS advisories retained.
- Three focused existing test files: final **64 tests PASS** (`focused-final.log`).
- `pnpm --filter @warwrit/web typecheck`: PASS (`typecheck-mesh.log`).
- Scoped eslint and prettier: PASS (`lint-final.log`, `format-final.log`).
- Normal commit `9bdc109` hook/audit: PASS (`commit.log`). Validator on that source:
  **9/9 PASS**, including related tests/coverage (`validate.log`).
- Follow-up normal commit **`5a5b46e1`** hook/audit: PASS (`commit-mesh.log`),
  with one inherited finding excluded by the existing audit gate; no bypass or
  threshold change. Final-source `bash scripts/orca-validate.sh`: **9/9 PASS**,
  including **5 files / 105 related tests** and focused coverage; `validate-final.log`.
  Detailed final validator logs copied to `rework-2/validator/`.
- Final report-only closeout: scoped prettier and diff checks PASS; normal
  documentation commit (no source change).
- No full verify, stress, migrations, production build or whole-suite coverage run.
  The required validator and private launcher own their existing package builds and
  focused related coverage; no new CI or PR scope claim beyond local validator.

Preserved failures/diagnostics: first typecheck failed because cameraLimits lacked
minZoom; its existing 2.2 value is now shared with the camera. `red.log` is an early
passing focused run, not evidence of a red regression. Initial terminal attempt had
~4 px of full commander plane behind outcome at 1440; actual live meshes were added
instead of tuning padding. Vite retained the old mounted scene once; page reload
then measured the final implementation. `terminal-matrix-attempt-1.log`,
`terminal-before-remount.log`, `forecast-attempt-1.log` and `attempt-1/` images remain.
The first terminal polling window ended at round 8; the next reached the real result.
No failed measurement is presented as a pass. Browser console: favicon 404, no
observed application exception. Initial restricted `ps` failed; approved read-only
process inspection supplied cleanup evidence.

## Private resources and cleanup

Only in-memory lab API **23278**, web **25278**, `DATABASE_URL=''`,
`ENCOUNTER_FIXTURES=0`; Playwright session **rework310r2**, private profile
`rework-2/browser-profile`. No campaign DB or another runtime.
`browser-close.log` and `lab-stop.log` record shutdown. Stop left three positively
identified owned pnpm/tsx ancestors **82318, 82321, 82375**, terminated with TERM.
Direct final `ps` traversal finds **zero recorded PIDs or descendants** present;
both private-port lsof calls return exit 1/no listeners. The private profile was
removed only after browser absence was verified; direct filesystem readback shows
profile and `.orca/play.pid` absent. Evidence: `cleanup-processes-final.json`,
`processes-before-stop.json`, `processes-after-stop.json`, `cleanup-files.json`,
`port-23278-final.log`, `port-25278-final.log`. No residual process or unrelated kill.

## Proposed coordinator documentation update / next step

“2026-10-24, Vovanostm/uix-combat-area-frame, LOCAL: #310 rework 2/2 repairs terminal
framing under ordinary camera limits, includes visible forecast and full live-plane
bounds, and raises only the participants border to 3.91:1. Author exact F1/F2 four-row
and Home/input/state proof passes; T1 inventory corrected; cumulative source 281/300.
Private runtime/browser fully stopped. Fresh reviewer/evaluator/full visual/text gates
remain required; parent freezes, missing E2, original AC/Proof rows and budgets retained.”

Coordinator owns shared CHANGELOG/CURRENT_PLAN/wiki and fresh independent gates.
Review final source plus repaired images above; do not convert author proof or
unchanged-boundary evidence mapping into independent/player acceptance.

---

## Historical round 1 report (preserved)

# #310 — rework round 1: FAILED (ownership blocker)

2026-10-24. Started from coordinator record `b6afb49d`, source `81e28fe7`,
report `c218f733`; branch `Vovanostm/uix-combat-area-frame`, base `25dd9a48`.
Source repair committed normally as **`f1752045`**. No push, PR, merge, labels,
delegation, Orca call, shared-record edit or parent-source copy.

## Repair and exact blocker

`battle-controls.css` now reserves a shared **420 px utility lane**, with **12 px**
separation from initiative, and sets only its direct full-text action to **18 px**
with an unbroken full label. Utility icon buttons cannot shrink. Existing control
order, native markup, colors, focus styling, portraits and camera code are retained.
No z-index change, clipping/hiding workaround, mobile layout or typography redesign.
Cumulative production budget: **186/300** (174 prior + 11 additions + 1 deletion).
The graph index points to another checkout, so current source was read directly.

The demonstrated overlap and typography findings have a committed source repair;
**their rendered resolution is NOT_MEASURED**, not accepted. Original failures and
all prior evidence are preserved below.

`bash scripts/orca-validate.sh` on `f1752045` failed **only** its format gate:
`[warn] docs/engineering/CURRENT_PLAN.md`. This file belongs to the coordinator and
is explicitly excluded from this task. `git diff b6afb49d HEAD --
docs/engineering/CURRENT_PLAN.md` is empty: the formatting failure is inherited
from the supplied coordinator records, not introduced by this CSS repair.

Per the explicit missing-ownership stop rule, the worker stopped before starting
browser/runtime proof. **Smallest next action:** coordinator formats and commits
its own `docs/engineering/CURRENT_PLAN.md`, then allocates continuation of validation
and the unchanged playable Proof rows. No broader CSS/source allocation or product
question is needed. No acceptance waiver or budget reset is proposed.

## Rework acceptance readback

These rows supplement, rather than replace, every original Proof row below.
Historical browser results are not evidence for this source head.

| Contract row | Actual rework evidence / remaining limit |
| --- | --- |
| AC1 native utility / unchanged contracts | Existing native markup, accessible full label and Home retained; existing tests pass. Pointer, Tab/Shift+Tab, Enter/Space, visible focus and actual initiative/portrait hit targets on repaired source NOT_RUN. |
| AC1 terminal / Inspect | No camera/event code changed. Terminal arrival NOT_RUN; Inspect disclosure absent on this main-based source and remains #209 integration work. |
| AC2 public subjects / opening / clamping | Existing geometry regressions pass, including actual plaque corners and asymmetric opening; source unchanged. Runtime casualty bounds, pinned inspection, closed/open menu/log and collapsed-opening no-op NOT_RUN. |
| AC3 readiness / cleanup / latest intent | Existing request regressions pass. Delayed readiness, frame→Home, Home→frame, frame→portrait, restart-before-ready, exit/reentry, pan/zoom→hover/poll/activation→resize runtime sequences NOT_RUN. |
| AC3 state boundary | Repaired-source GET bracketing, zero-POST proof and ordinary targeting/selection NOT_RUN. Original revision 4 proof below belongs to the previous head. |
| AC4 1440×900 / 100% day | Initial, real casualty-arrival, combat-area, open-panels and Home captures NOT_RUN on repaired source. |
| AC4 1440×900 / 100% night | Same five captures and full journey NOT_RUN on repaired source. |
| AC4 1366×768 / native 125% day | Same five captures, viewport/DPR/native zoom and full journey NOT_RUN/NOT_MEASURED. No CSS-transform substitute. |
| AC4 1366×768 / native 125% night | Same five captures, viewport/DPR/native zoom and full journey NOT_RUN/NOT_MEASURED. |
| AC4 journey / terminal | Manual real casualty, Home 165-cell runtime measurement, navigation/readiness/resize, terminal arrival and restart/reentry remain NOT_RUN. |
| AC5 commands | Focused 57 tests, normal audits and related 98 tests PASS; validator 8/9 PASS, inherited shared-document formatting FAIL. Exact commands below. |
| AC5 reviewer / evaluator | Fresh independent gates NOT_RUN, coordinator-owned; no author acceptance. |
| AC5 visual critic | NOT_RUN; required references/comparison sheets and all original visual rows remain. Font source is 18 px; computed 1080p size, contrast, CVD and reduced-motion results NOT_MEASURED. |
| AC5 text critic | NOT_RUN, coordinator-owned. `text.md` retains actual unchanged order, label, accessible name and RU/EN review meaning. |
| Retained boundaries / DoD | #310 only; #179/#209/#214 frozen, F1/F2/F3, E2 archive, AC6 and original independent gates unchanged. |

## Exact checks and failures

All checks ran sequentially. No full verify, stress, migration or whole-suite coverage.
Local evidence paths below are untracked; no links to untracked files are introduced.

- `pnpm agent:status`: PASS; origin/main `25dd9a48`, main CI success, no integration change.
- First-edit `pnpm check:changes`: PASS, CSS advisory findings only;
  `rework-audit-first.log`. Existing broader CSS advisories were not refactored.
- `pnpm exec vitest run apps/web/src/combat-lab/battle-framing.test.ts apps/web/src/combat-lab/sprite-battle-scene.test.ts apps/web/src/combat-lab/BattleView.test.tsx`:
  **3 files / 57 tests PASS**, `rework-focused.log`.
- `pnpm --filter @warwrit/web typecheck`: PASS, `rework-typecheck.log`.
- `pnpm exec eslint` on the four original owned production TypeScript files and
  their three existing tests: PASS, `rework-lint.log`. CSS is covered by format/audit.
- `pnpm exec prettier --check apps/web/src/combat-lab/battle-controls.css`:
  PASS, `rework-format.log`; `git diff --check`: PASS.
- First `git add` invocation reported ignored `.orca`; explicit force-add of only
  the already-owned tracked report/text paths succeeded. No ignored evidence bulk-added.
- Normal source commit hook: PASS, related coverage/audit refreshed by the hook;
  `rework-commit.log`. No bypass, new test, suppression or weakened gate.
- `git rebase origin/main`: already up to date.
- `bash scripts/orca-validate.sh`: **FAIL, 8/9 gates PASS**;
  `rework-validate.log`, `.orca/validate-format.log`. Rebased, clean tree, scope,
  packages, typecheck, lint, related tests and audit PASS; format fails only the
  coordinator-owned CURRENT_PLAN. Related tests: **5 files / 98 tests PASS**.
- Browser matrix, 1080p measurement and fresh independent gates: **NOT_RUN**.
- Final report/text scoped prettier and normal documentation commit: recorded in
  `rework-closeout-format.log` and `rework-closeout-commit.log`.

## Resources and cleanup

No runtime or browser was launched in this rework: owned browser/session/profile,
PIDs and listeners **none**. Reserved private ports remain API **23278**, web **25278**.
No campaign DB, another worktree runtime or #297 candidate script was used.
Direct `lsof` found neither port listening; `.orca/play.pid` and prior
`.orca/uix-combat-area-frame/browser-profile` are absent. Initial sandbox `ps` was
denied; the authorized read-only retry found no matching frame310/private runtime
processes. No cleanup kill was needed. Prior build's cleanup record remains below.

## Proposed coordinator changelog amendment

2026-10-24 — `Vovanostm/uix-combat-area-frame` — LOCAL, NOT ACCEPTED, #310:
`f1752045` reserves utility space and sets the full participants label to 18 px in
allocated `battle-controls.css`; cumulative source 186/300. Focused 57 tests and
normal audits pass; validate passes 8/9 with 98 related tests but fails inherited
CURRENT_PLAN formatting. Coordinator must format its shared record before worker
continuation. Rendered repair and original casualty/native-125% matrix NOT_RUN;
fresh reviewer/evaluator/visual/text gates and parent boundaries remain open.

---

# #310 — bounded build result: FAILED

2026-10-24. Branch `Vovanostm/uix-combat-area-frame`, main/base `25dd9a4828be614eb0d0cda747452365770aa4c3`.
The camera candidate is committed and validated, but browser proof found a concrete
layout/typography defect outside this lane's CSS ownership. No independent acceptance.
No push, PR, merge, labels, delegation, Orca command, shared record or parent-source edits.

## Commits and scope

- `3fa3a27b`: camera action, measured opening, real plaque bounds, pending request precedence,
  explicit camera intent, focused regressions. Normal pre-commit coverage/audit PASS.
- `81e28fe7`: use the existing standard control class so the full label fits its own button;
  normal pre-commit audit PASS. This fixes the square-button text overflow, not HUD overlap.
- Report/text closeout accompanies a final documentation-only normal commit.

Production budget: 174 cumulative additions + deletions across the two source commits
(168 + 6); final diff 164. Tests excluded. No budget reset, suppression or bypass.
Only four owned production files and three existing test files changed. Local evidence
is under `.orca/uix-combat-area-frame/`; no #179/#209 patches copied.

## Concrete blocker and recommended allocation

At 1440 × 900, 100%, DPR 1, the new full-text button occupies
x=1114.35–1228, y=22–58. The existing «Следующие ходы» button occupies
x=1133–1161, y=30–102. At its upper hit point (1147,38), `elementFromPoint`
returns **Участники боя**, not the initiative navigation. Home also shifts into the
right edge of the last visible initiative portrait. Existing top-band reservation is
268 px; adding a text utility exceeds that reservation. This violates unobstructed input.

At 1920 × 1080, 100%, DPR 1, the new label computes to **12 px**, line-height
15.6 px, below #217's 18 px typography requirement. No CSS override was introduced.
Evidence: `browser-proof.log`, `label-final.log`, `typography.log`,
`shots/1440x900-100-day-label-final.png`, `shots/1920x1080-100-night-type.png`.

Recommendation: allocate a bounded follow-up ownership of
`apps/web/src/combat-lab/battle-controls.css` plus the existing owned `BattleView.tsx`
to reserve non-overlapping utility space and style the label to the required size.
Retain all #310 AC, the cumulative source budget and fresh gates; do not accept this
candidate or waive typography/layout. This builder stops at that ownership boundary.

## Acceptance and Proof rows

| Contract row | Actual evidence / remaining limit |
| --- | --- |
| AC1 native utility / unchanged contracts | Native `type=button`, visible/accessibility name «Участники боя», existing standard control class. SSR regression retains Home and grid. Real pointer activation, Home→Tab→Enter and Space executed; Tab reaches the action. Shift+Tab NOT_RUN. Initial fitting/overview source mechanisms retained. Input overlap FAIL as above. |
| AC1 terminal / Inspect | No terminal trigger added; explicit callback only. Terminal arrival NOT_RUN. Main has no Inspect disclosure; #209 integration remains open. |
| AC2 public subject geometry | Focused tests cover active/dead/retreated/surrendered mix, same-tile live/plaque, transformed rotated/scaled ground plaques at terrain offsets 0/0.2/0.4, disabled markers, empty subjects/full-field fallback. Existing W01/B002/B053 near/far padded-silhouette tests retained. No dead silhouettes or hidden inference. |
| AC2 opening / real camera clamping | Added asymmetric horizontal safe-bounds case through Babylon NullEngine camera, collapsed-horizontal rejection; existing omitted-option, full-field, 165-cell and vertical-collapse regressions pass. Runtime 12-live-subject measurement in `initial-bounds.log` places x bounds 27.9999–1412, y bounds 252.61–554.14 at 1440×900. It predates only the label-class correction; geometry source unchanged. This is not casualty or open-panel proof. |
| AC2 visible HUD / casualty | Finite slots measure heading, top band, utilities, outcome, dock, log summary, open log/menu and inspected card; hidden/zero-area elements excluded. Unit tests cover panel borders and unusable space. Real first casualty, pinned inspection, open menu/log, plaque overlap and unusable-opening runtime proof NOT_RUN after concrete ownership blocker. |
| AC3 request lifecycle | Existing test file exercises pending frame→Home, Home→frame, immediate frame→portrait, clearing on scene replacement, single consumption. Existing receiveScene abort/destroy behavior retained. Real delayed readiness, restart-before-ready, exit/reentry/listener-count proof NOT_RUN. No mounted-hook acceptance inferred from helper tests. |
| AC3 latest intent | Explicit frame clears stale focus and guards default resize/activation fitting; Home/portrait supersede it. Tested activation target policy. Actual pan/zoom→hover/poll/activation→resize sequence NOT_RUN. |
| AC3 state boundary | `browser-proof.log`: actual session GET before/after frame/Home/day-night/keyboard sequence, revision **4→4**, complete JSON state identical, **zero POSTs**. Default real mill 6×6 seed 20261009; no mocked state. Ordinary targeting/selection/portrait runtime proof NOT_RUN. |
| AC4 1440×900 / 100% day | Actual CSS viewport 1440×900, DPR 1. Final-label initial view `shots/1440x900-100-day-label-final.png`; explicit frame and Home captures present. No casualty-arrival/open-panels image. All 165 cells in runtime Home NOT_MEASURED (test coverage is separate). |
| AC4 1440×900 / 100% night | Explicit frame and Home captures present. Independent night initial, casualty-arrival, open-panels NOT_RUN. |
| AC4 1366×768 / native 125%, day/night | NOT_RUN; CSS viewport/DPR/native zoom NOT_MEASURED. No CSS-transform substitute. |
| AC4 journey / terminal | Start default mill, frame, Home, keyboard, day/night completed. Manual play to first casualty, terminal arrival and restart/reentry matrix NOT_RUN. Stop was early on a demonstrated out-of-ownership defect, not expiry. |
| AC5 commands | Focused tests, web typecheck, lint/format, related coverage, normal audit, rebase and final source validate PASS (details below). CI and PR scope on a published PR NOT_RUN; local scope gate PASS. |
| AC5 reviewer | NOT_RUN, coordinator-owned. Needs actual main diff, clamping, cleanup and cumulative-scope review. |
| AC5 evaluator | NOT_RUN, coordinator-owned. Full independent four-row matrix, reduced motion, CVD, contrast and input acceptance remain open. Runtime typography measured FAIL; contrast ratios NOT_MEASURED. |
| AC5 full visual critic | NOT_RUN, coordinator-owned. Required reference comparisons, equal-height sheets, crowd/weapon/height/zoom and overlay pairs are NOT_RUN/NOT_MEASURED. No parental reference reconstruction or reused verdict. |
| AC5 text critic | NOT_RUN, coordinator-owned. `text.md` gives actual label/order, RU and EN review translation, mechanics. No #209 text acceptance reused. |
| Retained boundaries / DoD | #310 only. #179/#209 F1/F2/F3, E2 archive, AC6, original visual/journey gates, inherited budgets and later combined Inspect integration remain open and unchanged. |

Earlier `*-initial.png`, `*-first-frame.png`, `*-combat-area-live.png` and
`*-label-layout.png` captures show the superseded square-button class. Use the final-label,
`*-combat-area.png` and `*-home.png` captures for the final source candidate.

## Executed checks and failures

All check jobs ran sequentially; no full verify, coverage suite, stress or migrations.
Focused coverage was used only for the normal audit.

- Baseline `fallow health ... --max-cyclomatic 0 --max-cognitive 0 --format json`:
  diagnostic exit 1 by deliberately reporting all functions; `baseline.json`.
  Baselines: BattleView 11/10, useBattleScene 1/15, battleFrameBounds 9/5,
  mountSpriteBattleScene 3/2, followActivation 4/2 (cyclomatic/cognitive).
- `pnpm check:changes` ran after the first edit of every changed file;
  `audit-first-*.log`. Initial runs failed because coverage was absent (exit 2).
  Generated owned focused coverage, then continued. Temporary unconsumed export failed
  while its opening tests were pending. No gate weakened.
- Failing-first framing test: **2 failed / 12 passed**, then passed with implementation.
  Subject and request/label failing-first files also failed before their implementations.
- Normal audit then found followActivation CRAP **42.0** (untested complexity 6).
  Extracted and tested activationCameraTarget; retry PASS. `overviewBounds` and its
  existing suppression unchanged. Final exact per-function CRAP scores NOT_MEASURED.
- `pnpm exec vitest run --coverage --mode coverage` on the three owned test files:
  **3 files / 57 tests PASS**, `focused.log`. No whole-suite coverage claim.
- `pnpm --filter @warwrit/web typecheck`: PASS, repeated after label correction.
- Scoped `pnpm exec eslint`, `pnpm exec prettier --check`, `git diff --check`: PASS.
  Label-only focused test/lint/format also PASS.
- `git fetch origin main`, `git rebase origin/main`: PASS; branch already current.
  Initial agent:status fetch hit sandbox FETCH_HEAD denial; authorized elevated fetch
  subsequently succeeded. No auto-review rejection.
- Both source commits used normal hooks and refreshed related coverage/audit: PASS.
- `bash scripts/orca-validate.sh` at `3fa3a27b`: all 9 gates PASS.
- Final source `81e28fe7`: same validator **9/9 PASS**, **5 related files / 98 tests PASS**;
  `validate-final-source.log`, `.orca/validate-related-tests.log`. Scope, clean tree,
  packages, all package typechecks, format, lint, related coverage and audit PASS.
- Browser launcher wrapper required `bash` (file not executable) and a private npm cache
  (default cache denied). First navigation preceded runtime readiness and failed connection;
  retried after READY. One unauthenticated measurement GET returned NOT_FOUND; the recorded
  state proof instead used the actual browser request's session headers only in memory.
  An unversioned Babylon import failed duplicate registration; reloaded and used the exact
  loaded module URL. Vite retained old transformed button source until runtime restart;
  final screenshots/measurements followed restart and source readback.

## Owned resources and cleanup

Private API **23278**, web **25278**; in-memory combat runtime, DATABASE_URL empty,
ENCOUNTER_FIXTURES=0. No campaign DB or another worktree runtime used.
Launcher PIDs: 82696 (initial short-lived launch), 83913, 95406.
Observed web/API listeners: 84220/84228, then 95711/95760.
Chrome CLI daemon 84115, browser 84116, GPU 84122; named session `frame310`.
Dedicated profile: `.orca/uix-combat-area-frame/browser-profile` (removed after close).

Ran `playwright-cli -s=frame310 close` and `bash scripts/orca-play.sh stop`.
The stop script left watcher chains visible briefly; closing the two held launcher PTYs
removed them before the subsequent TERM attempt (which returned no-such-process, exit 6).
Final direct `ps` checks found **no owned runtime/browser PIDs**, `lsof` found **no listeners**
on either port, `.orca/play.pid` absent, profile removed. `cleanup.json` records this.
The validator and the worker itself were excluded from runtime cleanup, not killed.

## Proposed CHANGELOG — coordinator writer

2026-10-24 — `Vovanostm/uix-combat-area-frame` — LOCAL, NOT ACCEPTED, #310:
committed explicit «Участники боя» camera framing of public live silhouettes and actual
retained casualty plaques, measured HUD opening and latest-request cleanup. Four owned
combat-lab production files and three existing tests; no rules, protocol, replay, migration,
CSS or parent-source changes. Focused 57 tests and final validate 9/9 (98 related tests) pass.
Bounded real day/night frame/Home proof preserves revision 4 and sends zero POSTs.
Build blocked: utility overlaps initiative input; label is 12 px at 1080p. Needs a bounded
CSS ownership allocation, remaining casualty/native-125% matrix and fresh reviewer,
evaluator, visual and text gates. #179/#209 acceptance boundaries remain unchanged.
