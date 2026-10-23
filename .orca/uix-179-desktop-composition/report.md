# #293 desktop composition — builder report

2026-10-22 · task `task_711cc23e1267` · run `run_bae7056fac91`.
Branch: `Vovanostm/uix-179-desktop-composition`. Build steps complete;
**player acceptance NOT_ACCEPTED, publication NOT_RUN, merge NOT_RUN**.

Part of #179. Delivers one cohesive desktop presentation boundary: actual HUD
safe opening, initial camera fit and body/ground hierarchy. This issue does not
close or waive any #179 AC/DoD, reset its exhausted reworks, or permit the
rejected #179 parent to merge first. #179 remains open for catalogue sizing,
registration and final integrated Tier V.

## Authority and commits

- Initial clean head: `65d7466bb5bd34ae04ad0ef8e252b5d8808fa5a0`.
- The exact coordinator grant file was absent initially. Source/tests advanced
  without setup, package commands, hooks, commits or runtime. The file later
  contained the correct task and both required true flags, timestamp
  `2026-10-22T11:38:03.180478+00:00`. Only then did setup/checks/commits/runtime run.
  Grant: `/Users/vovanostm/orca/workspaces/warwrit/pipeline-coordinator/.orca/pipeline/grants/task_711cc23e1267.json`.
- Accepted contract: `.orca/uix-179-desktop-composition/contract.md`, read in full;
  live #293/#179 and applicable #217 decisions, retained parent contract and
  full recovery design, ART_LORE_POLICY, VISUAL_CRITIQUE, ADR-0003 and AI handoff.
  Graph root/head were another checkout at `b44f5c1e`; current source was used.
- `94a74a33954f98931ba0ab22a28d507ae36cb7e6`: behaviour-preserving geometry
  extraction with public dimension/pivot/corner regressions. Originally
  `3deaa783`, rewritten only by the required ordinary rebase.
- `ea1c50af0c2d01f8e3bb8c894db00edfbf410b63`: cohesive HUD/initial fit/projection
  feature and focused regressions. Originally `2a10a1c`, ordinarily rebased.
- Rebased without conflict onto fetched `origin/main` = `f5a73f33`. New
  CURRENT_PLAN status and Unreleased entries were read. No game source arrived
  from that integration. Source/checks/captures in this report are at `ea1c50af`;
  the following report commit changes documentation only.
- Both source commits used normal hooks. No bypass, threshold/configuration
  change, push, PR, issue mutation or Orca call. Shared records remain owned by
  the coordinator. #268 and frozen #214/#179 source were untouched.

## Implemented boundary and scope

The initiative strip places unchanged portraits beside their pools in a stable
84 px outer card, independently of the 30 px field classification. Dock outer
spacing is reduced. Foot badges move below their anchors; their existing 20 px
fit reservation covers the 4 px gap and 14 px badge. Initial framing uses all
standing allies plus each ally's nearest standing enemy by presentation-space
distance. Explicit Overview retains the whole field and separate containment;
portrait focus fits complete padded figure bounds. Resize updates full-field
limits while retaining user navigation. The scene supplies 30 degrees coherently
to camera, projected bounds, vitals, scenery and terrain; optional public
presentation inputs retain the 50-degree default.

The unchanged sprite height mapping, 0.82 factor, dimensions, pivots, padded
corners, art/fallback selection, spacing 2.6, rubble size, hatching semantics,
32 × 16 readouts/four-pixel gap and 30 px classification are retained. No rules,
cost, LOS/range/legality, RNG, protocol, replay format, dependencies, migrations,
renderer module, skill selectors or player-facing text changed. No `text.md` is
required for this Tier V slice with unchanged player text.

| Owned source | Additions | Removals |
| --- | ---: | ---: |
| battle-controls.css | 17 | 23 |
| battle-field-vitals.css | 1 | 1 |
| battle-field-vitals.ts | 5 | 2 |
| battle-framing.ts | 11 | 4 |
| battle-scenery.ts | 6 | 2 |
| battle-terrain.ts | 4 | 1 |
| sprite-art.ts | 27 | 0 |
| sprite-battle-scene.ts | 86 | 76 |
| **Against integrated main** | **157** | **109** |

**266/300 changed source lines** against main, tests excluded. Counting source
additions plus removals separately across both commits gives **272/300**
(92 extraction + 180 feature). No source-budget exception or ownership expansion.
Vitals/scenery tests are attributed reuse of frozen #179 supplemental projection
regressions; terrain reuses only the elevation regression, retaining main's
3-unit rubble width. No rejected mixed parent source commit was copied.

## Executed checks

All deferred first-edit audit coverage was run on the complete 14-file candidate
before the first normal commit. The extraction was then checked independently
before committing, followed by restoration/commit of the checked feature.
Red test execution is NOT_RUN: tests were written before their production
extraction, but execution was explicitly deferred until the grant.

| Check | Actual result |
| --- | --- |
| `bash scripts/orca-setup.sh` | PASS; Node 24.20.0 / pnpm 11.25.0, frozen install and three required workspace builds; private ports 23789/25789 |
| `pnpm --filter @warwrit/web typecheck` | PASS, full candidate and extraction |
| Scoped ESLint | PASS, candidate and extraction |
| Scoped Prettier check | PASS, candidate; extraction formatted before its commit |
| Six focused files, coverage mode | 29/29 PASS; `focused.log` |
| Related tests with coverage, candidate | 78/78 PASS in 8 files; `related.log` |
| Extraction related tests with coverage | 58/58 PASS in 4 files; `extraction-related.log` |
| First deferred `pnpm check:changes` | FAIL: unused `spriteDisplayHeight` export after focus refactoring; `deferred-audit.log` |
| Corrected deferred audit | PASS after making that helper private; zero new dead-code/complexity/duplication findings; `deferred-audit-retry.log` |
| Extraction audit and both normal commit hooks | PASS; `extraction-audit.log`, `extraction-commit.log`, `composition-commit.log` |
| `bash scripts/orca-validate.sh` after rebase | Exit 0, all 9 gates PASS; 78 related tests; `.orca/validate-*.log`, `validate.log` |
| Existing projection/order/bow replay tests | 31/31 PASS in 3 files; `replay-compatibility.log` |
| Full verify/stress/migration suites, production build, DB tests | NOT_RUN, outside this worker's scheduled checks |

The normal audit retained its warning about syntactic base/head attribution and
its CSS advisories. No option was changed to suppress them. Absolute per-function
complexity/CRAP values and performance are NOT_MEASURED; zero new audit findings
does not mean zero complexity.

## Author smoke and acceptance map

Real Chrome through Playwright CLI 0.1.22, normal mounted `/combat-lab`, unchanged
mill 6 × 6, seed 20261009. Chrome's actual `chrome://settings/appearance` Page zoom
combobox selected 100% and 125%. No CSS zoom/transform or deviceScaleFactor
substitute. At native 1366 × 768 / 125%, the page reports 1093 × 614 CSS px,
DPR 1.25 and visualViewport.scale 1. Native screenshots use device scale.

The first launcher returned READY but exited with its tool shell, causing one
ERR_CONNECTION_REFUSED. Relaunching the same prescribed script inside a retained
terminal fixed the runtime; no product source change. An initial isolated
browser refused chrome://settings; it was closed and replaced with a dedicated
persistent Chrome profile. Only console error observed: favicon.ico 404; no
baseline-console comparison was run or inherited-error claim made.

| #293 criterion | Executed evidence and remaining gate |
| --- | --- |
| AC1: short native Start, six readable allies/nearest threats, no HUD/body obstruction, independent integration ≥2 | Author 1366/125 day/night images before camera input; all 6 allied alpha bounds and selected nearest threat inside actual opening. W01 alpha height **36.93 CSS px**; opening top 115.60 / bottom 417.55 CSS px. Geometric containment is PASS; equipment readability, badge/body hierarchy and scene integration score are **NOT_ACCEPTED**, requiring independent full visual review. |
| AC2: complete stable desktop composition; Overview/focus/pan/zoom/resize | All 12 rows: 60 consecutive frames each with identical HUD/card/zoom readings; Home and mouse Overview equal, portrait focus zooms in, user pan/wheel work, resize retains zoom exactly and logical pan within 0.000001 world units. Four inspection/log rows retain all visible dock controls inside viewport; portrait Enter equals click focus. Every existing control/cost/pool path and terminal overlap still needs full independent evaluator coverage. |
| AC3 / original #179 AC5: initial squad/threats and ≥80 px W01 at base 1440 | Initial 1440/100 day/night W01 **83.284896 CSS px**, measured from source alpha ≥64 projected through actual mesh/camera. Six allies and nearest selected threat fit without camera input. Same geometry helper tested near/far and heights 0/0.2/0.4; relative sizes unchanged. Independent numerical readback remains required. |
| AC4: native matrix, mouse/key/focus, no action POST/revision change | **12/12 author candidate rows** captured: 1366/1440/1920 × native 100/125 × day/night. Camera/selection produced 0 action POST, revision 4 retained. Direct opaque-body clicks pinned all six allies in 1440/100 and 1366/125 day/night (24 successful selections). Some hover samples cleared before readback: hover coverage is partial, never inferred from selection. Canvas keyboard focus has solid outline; reduced-motion preference and camera interaction exercised with 0 action POST. Exact original before matrix and full independent input journey remain open. |
| AC5: preserved hatching/state/layering/readouts/projection/compatibility; E1/E2/full absolute review | Source diff, 29 focused tests, 31 replay/projection tests and mounted captures support the bounded implementation. Vitals tests retain 32 × 16 / 4 px gap and 30 px switch at default/explicit elevations; scenery roots and terrain axes tested. **E1/E2/E3, full independent Tier V and absolute visual criterion scores remain unresolved**. No overlays-off, reconstructed archive or badge/zoom-only acceptance claim. |

Author matrix W01 alpha heights (day/night identical), CSS px:

| Physical viewport | Native 100% | Native 125% |
| --- | ---: | ---: |
| 1366 × 768 | 61.51 | 36.93 |
| 1440 × 900 | 83.28 | 54.37 |
| 1920 × 1080 | 112.98 | 77.47 |

Machine results and exact failures: `.orca/uix-179-desktop-composition/matrix-results.json`,
`input-results.json`, `reduced-motion.log`; reproducible author probes in
`measure.js`, `matrix.js`, `input.js` in that directory. These are untracked local
evidence, not linked tracked publications or independent acceptance.

Required 1440 × 900 captures:
`.orca/uix-179-desktop-composition/shots/initial-1440-day.png` and
`.orca/uix-179-desktop-composition/shots/initial-1440-night.png`.
Full candidate matrix: `shots/initial-{1366x768,1440x900,1920x1080}-{100,125}-{day,night}.png`.
Additional actual Overview/focus captures: `shots/{overview,focus}-1440x900-{100,125}-{day,night}.png`.
Inspection/log: `shots/inspection-log-{100,125}-{day,night}.png`.
All captures are author evidence at the source head, never original before rows.

## Unresolved proof, limits and next owner

- **E1 NOT_RUN**: full all-ground-overlays ON/OFF pairs on the normal mounted
  scene require the coordinator-allocated diagnostic. No blanket ground hide
  or grid-off surrogate was used.
- **E2 BLOCKED_ENV / retrieval NOT_RUN here**: exact original rejected image
  `codex-clipboard-6235d07a-f2cb-4ea9-80c9-4aa77ed53945.png` and complete archived
  state/setup remain unavailable in this allocation. No recreation substitutes.
- **E3 BLOCKED_ENV / NOT_RUN here**: ten original `c62ad2d0` before rows remain
  unrecovered; this candidate's twelve rows cannot replace them.
- Fresh independent evaluator and **full absolute** visual critic remain
  coordinator-owned and NOT_RUN for this candidate. All applicable criteria
  must score ≥2; no prior parent verdict is borrowed. Required references were
  personally inspected: unit-c-ink, buildings/mill and all four stage1 UI
  references. Equal-height current/reference sheets and required E1/E2 inputs
  are still needed before the critic can accept anything.
- Manual combat to first death → autoplay outcome, movement start/arrival/end,
  terminal Restart → Editor → reentry, complete hover linkage, crowded/height/
  large-creature/long-weapon/CVD views, tooltip overlap and mounted absent-tiles
  compatibility remain **NOT_RUN** by this author. Full evaluator owns them.
- Original #179's nine AC/DoD, original failed rounds and supplemental history
  remain intact. #214 stays frozen until accepted #179 integration. This report
  closes or waives none of those requirements.

Runtime cleanup is positive: Playwright session `build293` closed;
`bash scripts/orca-play.sh stop` returned STOPPED; all **16 recorded owned PIDs
absent**, ports 23789/25789 have no listeners, `.orca/play.pid` absent. Evidence:
`.orca/uix-179-desktop-composition/cleanup.json`. Retained server terminal exited.
No worker/subagent was launched; no resource lease/checkpoint/grant was modified.

Next: coordinator consumes the committed source candidate and cleanup evidence,
updates shared records, allocates missing proof and fresh full independent Tier V.
Do not publish or merge this candidate on author checks alone. A later child PR
uses `Closes #293` only, with the exact Part of #179 relationship above.

## Proposed coordinator documentation entries

**CHANGELOG / Unreleased — proposed, not written:**

2026-10-22, `Vovanostm/uix-179-desktop-composition`, LOCAL, #293 / Part of #179:
compact stable desktop initiative/dock composition, initial squad/nearest-threat
fit separated from full Overview and user resize state, complete figure bounds
and coherent 30-degree presentation with legacy defaults. Owned combat-local
source paths above; unchanged geometry/0.82/spacing/rules/replay/art. Source head
`ea1c50af`, 266 source lines (272 cumulative), normal hooks and validator 9/9
PASS; related 78 and replay/projection 31 tests PASS. Author 12-row native matrix,
stable 60-frame samples and zero-POST selection/navigation recorded. Base W01
83.28 CSS px; short native 125% W01 36.93 CSS px. Equipment readability and full
independent Tier V NOT_ACCEPTED; E1/E2/E3 unresolved, original before rows and
full journeys still required. No publication/merge or #179/#214 acceptance.

**CURRENT_PLAN status — proposed, not written:**

#293 source committed at `ea1c50af`, rebased onto main `f5a73f33`; validator 9/9,
266/300 source lines, author native matrix and input smoke recorded. Explicit
grant followed positive #268 cleanup; author runtime now positively clear.
Next allocate full evaluator/absolute critic and E1/E2/E3 proof; short native
body/equipment readability has no independent score. #179 original gates/history
and #214 freeze retained; no PR/merge/player acceptance claimed.

**Owning wiki ТЗ — proposed dated implementation note, not written:**

In `docs/wiki/battlefield-test-maps.md`, record #293's local desktop composition
candidate, try unchanged mill 6 × 6 / seed 20261009 → Start before camera input;
actual HUD and native matrix measurements above. Source is presentation only,
with unchanged figure dimensions, spacing and accepted #184 semantics. Initial
1440 W01 author measurement exceeds 80 px, but the short-native readability
criterion and full independent visual/evaluator/E1/E2/E3 gates remain open. Keep
all original #179 numerical/catalogue/registration/hover/CVD AC and #214 gates.

Shared files were not edited, per the coordinator's exclusive ownership. This
owned report is the documentation closeout and was read back against the scoped
diff and executed logs before its normal documentation commit.
