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
