# #209 — inherited rework 2/2

**LOCAL / COMMITTED / UNPUBLISHED; acceptance incomplete.** The implementation
and author smoke journey work, but this report does not close the original
U + T + V contract. No further source round is claimed or requested here.

## Commits and ownership

- `83a56ac7`: collapsible aggregate outcome, paired native disclosure controls,
  user-toggle-only focus transfer, separate short status announcement, sceneKey
  reset and projection-only final inspection; focused regressions first.
- `cc197d65993bc04a0569b807d7b093defbdcea56`: outcome-only specificity and border
  correction after browser measurement found 12px summary text / 2.56:1 border.
- The documentation-only commit containing this report and text packet follows
  these source commits; it makes no additional runtime change.
- Base: `origin/main` `25dd9a4828be614eb0d0cda747452365770aa4c3`.
  Starting HEAD `076d0a23` already contained three coordinator record commits.
  Their CHANGELOG/CURRENT_PLAN diff remains untouched by this worker.
- Measured cumulative source scope: **250 additions + deletions**, excluding
  tests: BattleOutcome 173, BattleView mount 9, result CSS 68. Four assigned
  source/test paths only. No #210 roster or #211 menu implementation copied.
- No server, protocol, rules, RNG, admission, migration, scene, vitals, asset,
  script, global config or shared-record edits; no subagents or Orca calls.
  No push, PR or merge.

The graph indexed another root/old b44f5c1, so source discovery used direct reads.
Read contract and retained plan/report/review/evaluator/visual failures; preserve
initial audit failures 18/43.1, recovery failures 18 and 16, consumed D2 allowance,
v2 rework 1 failure and evaluator/visual REWORK. This is the inherited final
rework, not a reset. The earlier contract's read-only allocation was superseded
by the explicit BUILD allocation.

## Observable result and how to try

Start this checkout with `bash scripts/orca-play.sh start`, open its printed URL,
leave the default mill/6 fighters per side/seed 20261009 unchanged, Start, autoplay
until victory, then **Осмотреть поле**. Hover and pin a survivor on the field,
select a casualty through the log, move/zoom the camera, and activate the top
summary to reopen the same result. Stop the lab when finished.

The aggregate counts stay unchanged. Inspection uses the original projected
unit, existing Portrait/status mapping, four available pools and supplied wounds.
Absent observations remain unknown; absent maxima are omitted, valid 0/0 remains
0/0, and explicit empty wounds differ from unknown wounds. No UnitCard/UnitStates,
condition thresholds, stance/penalty calculations or future-turn promises occur
in this terminal fragment. The current main log is in the right 220px lane;
inspection occupies a bounded left lane, preserving both hit areas.

## Acceptance criteria and proof

All artifact paths below are relative to `.orca/uix-outcome-inspection-209/` and
are local evidence, not links to tracked documents. Only `current-*` real matrix
and CVD captures establish the final CSS. Earlier files remain historical.

| Contract criterion / DoD                                 | Executed proof and remaining boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1: victory → Inspect field exposes survivors and ПОГИБ | Real untouched default mill victory R8/rev163, five survivors/seven dead. `current-smoke.log`, `current-matrix100.log`, `current-matrix125.log`; current full 1440×900 day/night field images. FIELD hover → pin → pointer away and casualty log selection pass. `camera.log` independently matches five survivor mesh hexes and seven ground death-marker positions to projection. Marker/scene visual acceptance still requires V.                                                                                                                      |
| AC2: reopen same result; restart/editor available        | Mouse and Enter/Space reopen identical panel content/round/counts and transfer focus back to Inspect field; hidden footer is absent from accessible controls. `lifecycle.log`: held DELETE disables restart/editor, disabled editor sends no extra DELETE, injected 503 preserves original battle, real restart creates new session/R1, next actual R8 victory starts expanded while canvas keeps focus, real editor continuation succeeds. Lifecycle was executed before the CSS-cache restart; JSX/callback source is identical in both source commits. |
| Post-battle inspection, camera and log                   | `camera.log`: held W/ArrowRight, LMB drag, wheel and Home change projection/FOV, frame count advances, canvas/scene/engine identity remains. Current matrix checks field pin, casualty inspection, log separation and menu operation. Camera proof ran on identical JS with earlier CSS; no renderer changes. Grid remained mounted; an explicit grid-toggle/reduced-motion test is NOT_RUN.                                                                                                                                                              |
| 1366×768, 1440×900, 1920×1080; 100%/true 125%; day/night | Both current real matrix logs pass all 12 configurations, expanded → field pin → log/menu → reopened; panel/footer fit with no panel scroll. Chrome Appearance Page zoom set 1/1.25, `shots/native125-settings.png`; no CSS zoom/DPR substitution. At 125%, CSS viewports are 1093×614, 1152×720 and 1536×864. Current 1366/125 log and inspection are separated by over 400 CSS px.                                                                                                                                                                      |
| Before/after evidence                                    | Current candidate after matrix exists. Fresh current-main before matrix: NOT_RUN. The retained baseline at sibling `uix-proof-baseline-8486177/.orca/uix-shared-main-before/report.md` supplies 12 configurations/62 PNG at 8486177, correcting old evaluator F2; it is not a current 25dd9a48 comparison or independent ACCEPT.                                                                                                                                                                                                                          |
| Keyboard / focus / announcement                          | Current matrix covers mouse/Enter/Space paired toggles. `current-access.log` records native Tab and Shift+Tab, visible focus and hidden footer exclusion in collapsed state. Short status text is separate from inspection. Full expanded/menu keyboard cycle and actual screen-reader speech: NOT_RUN. No automatic focus capture on second real victory in lifecycle proof.                                                                                                                                                                             |
| CVD / contrast / font                                    | `shots/current-cvd-{day,night}-{deuteranopia,protanopia,achromatopsia}-{summary,expanded}.png`: 12 fresh images. `current-contrast.json`: changed control/inspection font 18px, minimum text/fill 10.4978:1, border/fill 4.0316:1. These are finite computed opaque-fill measurements, not all composed ground-adjacent focus/portrait boundaries; remaining composed minima NOT_MEASURED.                                                                                                                                                                |
| Read-only inspection / no rule change                    | Current real matrices: GET163→163, zero action POST, separately from intentional lifecycle writes. Current fixture matrices: zero action POST, intercepted revision163 unchanged; client-dispatch proof only. Removing interception reads the real victory/rev163 again (`current-fixture-removed.log`). Scoped diff is UI-only.                                                                                                                                                                                                                          |
| Exact guarded round-limit counterexample                 | `current-fixture-start.log`, `current-fixture100.log`, `current-fixture125.log`: active survivor with HP19/75, armor3/20, stamina10/40, morale25/90, minor/severe/minor, guarding true, shieldBraceRank1, panicking false, original 25/25%/10 hints. All 12 field-hover/pin/pointer-away/reopen branches retain exact pools/wounds without derived conditions/stance/future promises. Rendering fixture, not an actual round-limit battle.                                                                                                                |
| Partial/legacy presentation                              | `current-partial.log`, `shots/partial-unknown.png`, `shots/partial-zero-and-absent-max.png`: direct BattleView presentation fixture, unknown viewer, missing name/profile/maxima/wounds and empty pools. Correct ID fallback/unknown observations, then health19 without invented max, armor0/0, explicit no wounds; sceneKey change restores expanded result. This is not server gameplay.                                                                                                                                                               |
| Replay compatibility                                     | UI downloaded `mill-replay.json`; `replay.log`: existing public replayCombat + projectCombatLabView consumes 163 commands and deep-equals all of `mill-projection.json`, R8/rev163. Separate rendering of the downloaded replay projection: NOT_RUN. No new replay implementation.                                                                                                                                                                                                                                                                        |
| Epic manual-first-death journey                          | Current candidate manual play until first death then autoplay: NOT_RUN. Retained evaluator2 did it on older 6467fae (defeat R9/rev158); not reused as current acceptance. Real victory path above is independently executed here.                                                                                                                                                                                                                                                                                                                         |
| Absolute U + T + V gates                                 | Fresh independent evaluator/text critic/visual critic: NOT_RUN, explicitly coordinator-owned; no subagents permitted. `text.md` supplies ordered Russian/English text and facts. Equal-height current reference sheet and full opaque crowd/archer/height/overlay packet: NOT_RUN here. #179's frozen scene findings remain BLOCKED outside ownership; no waiver or new source round. Motion clips N/A because none changed.                                                                                                                              |
| Ready, publication, documentation                        | Current main, sole writer and owned runtime confirmed; normal commits and validate pass. Publication/CI/PR/merge NOT_RUN by explicit prohibition. Shared docs unchanged; proposed entry below goes to coordinator. Original issue remains open pending gates.                                                                                                                                                                                                                                                                                             |

Representative final captures directly viewed by author: current 1440 day
expanded, current 1440 night field, current 1366/125 night log. Outcome controls
and inspection are legible and separate; the distant night fighters remain a
scene-readability acceptance concern, not a new scored visual verdict. Approved
unit-c-ink and ruined-mill references were viewed. No image editing was performed.

## Exact checks and preserved failures

| Check                                          | Result / artifact                                                                                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Test first, BattleView.test.tsx                | 3 FAIL / 26 PASS, `test-red.log`; expected missing disclosure assertions. Shell tail wrapper returned 0, runner failed.                                                                                                                    |
| First edit audit: test file                    | pnpm exit 2, missing local coverage; `audit-test-first.log`. Shell tail wrapper returned 0.                                                                                                                                                |
| Genuine local focused coverage of red tests    | exit 1 with the same 3 failing assertions; `test-red-coverage.log`; generated audit input, not a passing test claim.                                                                                                                       |
| First edit audits: outcome, mount, CSS         | Each exit 0: `audit-outcome-first.log`, `audit-mount-first.log`, `audit-css-first.log`.                                                                                                                                                    |
| Focused BattleView test after implementation   | exit 0, 29 PASS, `test-green.log`.                                                                                                                                                                                                         |
| Web typecheck                                  | First exit 2 (required outcome deletion), second exit 2 (readonly sides deletion); corrected test omission. Third exit 0, `typecheck-final-2.log`. Earlier logs retained.                                                                  |
| Scoped ESLint / Prettier / diff                | exit 0, `lint.log`, `format.log`, final CSS format and ordinary diff readback.                                                                                                                                                             |
| Normal commits                                 | Both exit 0, `commit.log`, `commit-contrast.log`; normal hook refreshes focused coverage. No bypass or thresholds/config edits.                                                                                                            |
| Rebase                                         | `git fetch origin main`, `git rebase origin/main`: already up to date. Initial agent:status fetch had sandbox denial; later direct fetch succeeded. New checkpoint/changelog sections read back.                                           |
| Standard validate, sequential                  | Both runs exit 0, 9/9: rebased, clean-tree, scope, packages, typecheck, format, lint, related-tests, audit. Final `validate-final.log`; `.orca/validate-related-tests.log` records 68 PASS / 2 files. Final validated source head cc197d6. |
| Replay consumption                             | exit 0, `replay.log`, 163 commands / exact final projection equality.                                                                                                                                                                      |
| Full verify / stress / migrations / full suite | NOT_RUN, forbidden worker scope. Validate's prerequisite package builds and focused coverage only.                                                                                                                                         |

The first standalone audit and first red-test process briefly overlapped, contrary
to sequential allocation. No further heavy checks overlapped. This procedural
failure is retained rather than described as fully serialized execution.

Runtime/probe failures preserved: initial background lab died after READY and
browser navigation got ERR_CONNECTION_REFUSED; retained PTY fixed lifetime.
Initial field-hover oracle ran before Home settled; waiting 500ms fixed the
coordinate probe without source changes. Access probe timed out at browser-chrome
focus, then a harness edit had a syntax error; document.activeElement readback
fixed both. Partial fixture initially used the wrong Vite default export for
createRoot; corrected harness passed. Favicon404 is unrelated to gameplay.

Browser measurement exposed 12px summary and 2.5579:1 border at 83a56ac. Fix
cc197d6 passed normal audit/validate, but Vite's transformed CSS cache still
served the old selectors despite reload; direct ?direct CSS showed new source.
Earlier `matrix*-final.log` and `access-current.log` therefore do NOT prove final
CSS. The owned lab was stopped/restarted; transformed CSS was then read back and
`current-smoke.log` confirms actual 18px / rgb(132,148,139). Only the subsequent
`current-matrix*`, `current-access`, `current-contrast` and `current-fixture*`
receipts are used for the final CSS claims. Earlier images/logs are preserved.

## Runtime ownership and direct cleanup proof

- Private ports 23618/25618 from existing .worktree-ports; setup NOT_RUN/unneeded.
  Main script ownership read before start; candidate #297 scripts never run.
- Initial transient launcher 22851; retained launcher 25663 with web25956/API26006;
  cache-refresh launcher 61092 with web61417/API61422. Full recorded descendants
  in `resources.json` and `resources-current.json`.
- Named Playwright session **209-build-r2**, daemon24683/Chrome24684, profile only
  inside this task's `browser-profile`. Failed fixture tab was owned and closed
  with the session. No borrowed lab/profile or sibling cleanup.
- CLI close exit 0 (`browser-close.log`), current main `orca-play.sh stop` exit 0
  (`runtime-stop-final.log`), retained terminal released. Escalated read-only ps
  and lsof were required because sandbox ps was denied; no auto-review rejection.
- `cleanup.json`: **all 27 recorded PIDs absent**, no matching browser/profile
  process, both ports have no listeners (lsof exit1, empty stdout AND stderr),
  `.orca/play.pid` absent. Only after process absence, the exact owned browser
  profile was removed; profileExists=false. No capability values retained in
  report/projection/replay evidence. Runtime grant is released by this proof.

## Proposed shared-record entry and finite next step

Coordinator CHANGELOG Unreleased proposal: “2026-10-23,
Vovanostm/uix-outcome-inspection-209, LOCAL / committed 83a56ac + cc197d6:
#209 adds collapsible aggregate outcome and projection-only final inspection;
sceneKey resets disclosure, unknown observations remain unknown, no combat rules
change. Four owned web/test/CSS paths, 250 source lines. Normal audits and
9/9 validation PASS (68 related tests); actual default mill victory R8/rev163,
12-config current after matrix, guarded/partial fixtures, lifecycle and replay
proof recorded. Current-main before/manual-first-death/composed accessibility
limits and independent U + T + V remain pending; #179 scene blockers retained.
No push, PR, merge or player acceptance.”

Apply the same actual status to existing CURRENT_PLAN/wiki, without overwriting
history. This worker was forbidden from editing those shared paths.

Recommended finite coordinator follow-up: freeze these source commits, allocate
current-main baseline plus the listed remaining evaluator/accessibility/replay
rendering proof, route opaque-layering/terminal scene findings to #179's owner
under an explicit allocation, then obtain fresh independent U/T/V verdicts.
Do not reimplement #209, copy #210/#211, reset the exhausted history, or present
this author smoke as independent acceptance. Overall worker outcome remains
**failed for incomplete mandatory proof**, with usable committed implementation
and no uncommitted source work or owned runtime left behind.

Documentation closeout initially hit sandbox `index.lock: Operation not permitted`
(exit128); the same scoped add/normal commit was retried with filesystem elevation.
This is an environment failure, not a hook bypass or automatic-review rejection.

## Owner-authorized targeted contrast repair 1 — 2026-10-24 Moscow

**LOCAL; source repair and author proof complete, independent acceptance pending.**
This is the one additional CSS allocation from owner «Разрешить адресные
исправления», native reply `msg_01a16acb-2962-7543-ba3c-7b4afcca410b`, as recorded
by coordinator commit `e3f089c661bc`. Original 2/2, consumed supplemental history,
evaluator-3 F1 and visual-3 findings remain recorded above and in their reports;
this section supersedes neither their verdicts nor the full U/T/V contract.
Starting checkout was clean at e3f089c6; no rebase, push, PR or shared-record edit.

### Scope and technique

Only `apps/web/src/combat-lab/battle-view.css` outcome summary/inspection selectors
change: two opaque outer strokes, 2px pale `#c1c4b5` over 5px dark `#080d0e`;
keyboard-focused summary extends the dark backing to 8px behind its existing
3px focus outline. Box shadows do not enlarge layout or pointer hit areas.
Existing border, fill, typography, positioning, strings, TS/TSX and scene stay
unchanged. This adds 11 CSS lines; cumulative source scope is **261** additions
plus deletions against 25dd9a48, excluding tests (BattleOutcome 173, BattleView 9,
CSS 79). No new product rules, dependencies, assets or migrations.

All new evidence is under local path
`.orca/uix-outcome-inspection-209/targeted-repair-1/`; these local proof paths are
not links to tracked files. `capture.js` reuses the existing evaluator's browser
journey and read-only projection/scene-coordinate probes. No runtime CSS/game
state injection, screenshot retouching, new fixture or scene modification.

### Fresh affected proof

- Untouched default mill, 6 × 6, seed 20261009, UI Start/autoplay: actual victory
  **R8/rev163**, five survivors/seven dead (`victory-result.json`). Before-edit
  captures are retained; the initial live-arrival summary was at y30 because of
  the existing tooltip safe-top observer. After a normal retained-session reload,
  summary x633.46/y144 matches evaluator F1's left-mid-edge y164 composition.
  The historical `eval-shots/after-close-day-grid-off.png` remains the exact old
  failing comparator; the new arrival image is not falsely called that baseline.
- `capture100-result.json` and `capture125-result.json`: 28 final full-viewport
  captures, day/night, overview/close, ordinary/keyboard-focused summary and
  inspection, log/menu/reopened result. 1440×900 at 100%; physical 1366×768 at native
  Chrome 125%, effective 1093×614/DPR 1.25. `native-zoom125-visible.png` and
  `finish-browser.log` record the actual Appearance control and restoration 100%.
- FIELD hover → click/pin → pointer away resolves human-1 in all four affected
  light/viewport rows; supplied health 44/80, armor 0/36, stamina 52/100,
  morale 46/100, one minor wound remain. Native Tab reaches summary; Enter reopens
  identical result; Space collapses again. Camera overview/wheel, light, log and
  menu remain reachable. Both intervals are real GET 163→163 with **0 action POST**;
  canvas/scene/engine identities remain equal. No lifecycle writes in this packet.
- Inspection/log minimum gap **400.8 CSS px**, before decorative stroke extent;
  even the 5px backing leaves 395.8px. Expanded footer stays visible and unchanged.
  Author viewed final day close ordinary, night close focus, 1366/native125 night
  log and reopened result against unit-c-ink, ruined-mill and day/night references.
  No new input obstruction was observed; scene-readability defects remain #179.

### Raster contrast, including actual terrain

`contrast.json`, produced by `measure.py`, records all **128** exact edge sample
pairs across 16 affected captures (four mid-edges × two components), RGB values,
coordinates, ordinary/focused state and both individual tone-to-terrain ratios.
This measures the visible two-tone perimeter against actual adjacent terrain;
its reported composite ratio is the more distinct of the two visible tones at
that location, not the old border-to-own-fill ratio. Finite samples do not prove
every camera, every antialiased corner or unrelated icon/portrait boundaries.

- Minimum composite perimeter/terrain: **3.4169:1**; minimum pale stroke/dark
  backing: **11.0131:1**; focus/backing: **14.1710:1**.
- Exact worst sample: `shots/after-1440-100-day-close-ordinary.png`, summary left,
  pale(632,164)=193/196/181, backing(629,164)=8/13/14,
  terrain(626,164)=118/94/71. Pale/terrain **3.4169:1**, backing/terrain **3.2231:1**.
  Both sides of the new perimeter independently exceed 3:1 at the reported F1 area.
- Changed text remains 18px; computed solid foreground against sampled raster fill
  minimum **10.4978:1**. This is not a claim about every antialiased glyph pixel;
  expanded text is unchanged and evaluator-3's finite 7.601:1 remains historical.

The first candidate (2px existing border plus dark stroke) failed terrain samples;
its PNGs/measurements remain in `candidate-1/`. Its first sample implementation
also rounded fractional right-edge coordinates onto antialiasing; final sampling
uses the pixel containing the stated stroke-centre coordinate (floor), for both
sides. Final explicit pale+dark outer strokes retain original component geometry.
No further tuning or new source allocation is claimed.

### Checks, failures and cleanup

Node 24.20.0/pnpm 11.25.0. Sequential focused checks: `pnpm check:changes` exits 0
(`audit.log`, `audit-final.log`, `audit-final-stroke.log`); scoped Prettier exits 0
(`format-css.log`, `format-final-css.log`); web typecheck exits 0 (`typecheck.log`).
No standalone BattleView test was needed for the CSS-only repair. Full verify,
stress and migrations NOT_RUN. Normal commit and post-commit standard validate
results are appended below; no audit bypass or coverage/config manipulation.

Tool/probe failures retained: initial navigation raced lab readiness and returned
ERR_CONNECTION_REFUSED, then normal navigation succeeded; first post-reload
Home-key/hover probe timed out; a diagnostic used visible text Home instead of
accessible name «Обзор поля» and timed out. Final UI overview-button click plus
settled coordinate probe succeeded. No failed probe counted as PASS. Sandbox ps
required read-only elevation; no approval rejection. Source audit had only
inherited advisory styling findings, no blocking issue.

Cleanup: `resources.json`, `cleanup.json`, `cleanup.log`. Owned launcher 89840,
web 90333 / API 90339, Playwright session `repair209t1` daemon 89995 / Chrome 90004,
profile `targeted-repair-1/browser-profile`; **all 18 recorded PIDs absent**.
Normal browser close and lab stop exited 0; three exact recorded server-wrapper
survivors 90260/90270/90301 received SIGTERM, then absence was verified. Ports 23618
and 25618: lsof exit 1, empty stdout/stderr; `.orca/play.pid` absent; no matching
session/profile processes. Profile removed only after absence checks; retained
launcher terminal exited. No sibling process or resource was stopped.

### Unchanged evidence and retained holds

Evaluator-3 `eval-3/matrix-after100.json`, `matrix-after125.json`,
`before-after-state.json`, `lifecycle-manual-result.json`, `replay.log` and
`presentation-result.json` support unchanged JS/replay/lifecycle behavior only;
they do not accept this new composition. No unchanged 12-row matrix, fixture,
replay/lifecycle or manual-first-death journey was rerun. Text strings are
unchanged; text packet provenance is refreshed for the eventual independent critic.

Fresh independent U/T/V: **NOT_RUN / coordinator-owned**. Prior text 3 ACCEPT is
not a new-head verdict. #179/E2 exact rejected-archer archive/state, full opaque
layering/crowd/height packet, terminal-defeat comparison, night readability and
tooltip overlap remain held. Screen-reader speech, full menu keyboard traversal,
unrelated icon/portrait contrast and frame-by-frame reduced motion retain their
prior NOT_RUN/NOT_MEASURED limits. No full original AC/DoD acceptance or merge.

Coordinator shared-record proposal: “2026-10-24, Vovanostm/uix-outcome-inspection-209,
LOCAL: owner-authorized #209 targeted repair 1 adds opaque pale/dark outer strokes
to summary/inspection; cumulative 261 source lines. Actual mill victory R8/rev163,
affected day/night 100%/native 125% proof and finite raster minimum 3.4169:1 against
terrain; no action POST or input overlap regression observed. Focused checks PASS,
owned runtime fully cleaned; original failed rounds, #179/E2 and fresh independent
U/T/V holds retained. No publication, PR or merge.” Coordinator owns integration
into CHANGELOG/CURRENT_PLAN/wiki; those paths are untouched.
