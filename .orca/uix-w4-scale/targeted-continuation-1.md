# #179 targeted continuation 1 — 2026-10-24

**FAILED / bounded partial candidate; F1 requires a separate composition boundary.**
This is the continuation of the owner-authorized source allocation, not another
round or a reset of original 2/2/supplemental history. Inherited `agent:blocked`,
original AC/DoD, full Tier V, E2 and AC6 remain. No acceptance, publication or merge.

## Scope and source

Started at `32b63fb62dc866d7c66123dfe38e95e1ea0cd008`, branch
`Vovanostm/uix-179-catalogue-integration`, with four dirty prepared files and an
empty index. Read AGENTS, the full local contract/source-preparation brief and
report, catalogue findings, current #209 eval-4/visual-4, art policy/rubric,
ADR-0003/technology handoff, current status/changelog and live #179 comments.
Graph inventory still points to `/Users/vovanostm/learn/warwrit` at `b44f5c1e`,
so actual checkout source/diffs were used. No coordinator/shared-file edits,
Orca commands, agents, dependency changes, pull/rebase/merge/push or bypass.

Preserved and completed the prepared changes in:

- `apps/web/src/combat-lab/sprite-art.ts`: shared `visibleBottomUp`, separate
  from anatomical support; existing sprite scales and catalogue anchors retained.
- `apps/web/src/combat-lab/battle-field-vitals.ts` and `.test.ts`: strip position
  consumes the visible bottom, retaining 32 × 16 CSS px, 4 px padded clearance,
  support/sorting metadata and the existing 30 px classification.
- `apps/web/src/combat-lab/sprite-battle-scene.ts`: propagate the separate bottom;
  figure-only Babylon 9.28.0 image processing replaces multiplicative night tint,
  retaining filled ink shadows/midtones with standard tone mapping/exposure 0.8.
  Terrain, scene exposure, lights, outlines, assets and ground layering are not
  changed by this treatment. Installed typings and actual WebGL2 shader/runtime
  readback supplement the preparation's official version-tagged API evidence.
- Same scene: event labels retain their original anchor and reflow in CSS-pixel
  screen space around utilities/top band/dock/forecast/unit and outcome inspection
  cards, with 4 px HUD clearance. Existing visible body bounds and previously
  placed event labels are reserved. Z-order remains unchanged; ground casualty
  plaques are separate. Camera/native-zoom changes re-evaluate placement.

Cumulative ordinary diff versus actual merge-base
`cf3b2901ddad2fed1c884e7c4c377972049e60e3`: **282/300 source lines**,
218 additions + 64 removals, tests excluded. No battle-layout/terrain edit in this
continuation; their inherited cumulative hunks remain. No framing-policy change.

Source commit: `f9fa1403d7a242ac8ccb7ed646ddc22a4801ce47`, normal hooks PASS;
local only, not pushed. Final receipt is committed separately with the report.

## Focused execution

All check commands were sequential. Logs are under `.orca/uix-w4-scale/`.

- `pnpm exec vitest run --coverage --mode coverage` with the five owned
  vitals/layout/art/scene/terrain test files: **22 passed**, five files;
  `continuation-tests.log`. This is focused coverage feeding the existing audit,
  not full coverage or a full suite.
- `pnpm --filter @warwrit/web typecheck`: prepared repair PASS. The first label
  edit failed with accidental `.eventViewport` property access; corrected to the
  pinned Camera `.viewport` API, subsequent typecheck PASS.
- Scoped `pnpm exec eslint` and `pnpm exec prettier --check` for the five owned
  modules and matching tests: prepared repair PASS. Final checks appended below.
- Initial unpinned audit passed only against the branch upstream; not used as
  cumulative proof. Correct `FALLOW_AUDIT_BASE=cf3b2901... pnpm check:changes`
  exposed CRAP 72 in combined actor/event placement, then CRAP 30 in the first
  event-only helper. The new event responsibility stays separate from the
  existing actor placement; anchor metadata is initialized at label creation,
  removing a needless render-time fallback. Correct-base audit then PASS.
  Failed logs remain; no threshold, ignore rule or hook bypass was introduced.
- Lab launched through `bash scripts/start-sprite-combat.sh`, private ports
  23963/25963, with the script's normal protocol/core startup compilation. No
  production build, verify/stress/migrations, coordinator validate or DB ran.
- Private Chrome 155 Playwright CLI session `uix179cont1`, native Appearance
  Page zoom 100%/125%, physical 1440 × 900 / 1366 × 768. At 125% the effective
  viewport is 1093 × 614 and DPR 1.25, visualViewport.scale 1. Captures are
  untouched CDP compositor PNGs; no CSS-zoom/DPR substitute. The native setting
  control is captured and 100% restored before close.

## Fresh measurements and images

All new artifacts are under `.orca/uix-w4-scale/continuation-1/`; images in
`shots/`. They are author evidence, not independent ACCEPT.

**Visible bottom:** `diagnostics.json`, 36 images `diagnostic-h{0,1,2}-*`.
The retained supported `draft-A-h{0,1,2}.json` files were imported through the
real editor. Six subjects: B002/W01/B053 near and far, day/night at each height.
Diagnostic close focus uses the existing presentation handle, not canonical-state
injection and not claimed as pointer proof. Mounted mesh projection plus actual
source alpha >=64 measured:

- width 31.99999835–32.00000178 CSS px; height 15.99999936–16.00000043;
- padded-bottom clearance 3.99997801–4.00003410 px;
- minimum actual opaque-bottom clearance **4.99935425 px**;
- all 36 strip support vectors equal their figure's retained anatomical support;
- each diagnostic inspection interval revision **0→0**, action POST **0**.

Exact old bear case is now `shots/diagnostic-h1-B002-human-2-night.png` (near
6,2). The strip sits below the paw, unlike retained `bear-vitals-visible.png`;
no support/hex/sorting correction was undone. Far B053 h2 was also viewed full-size.

**Night and initial fit:** `initial.json` / `initial125.json` supply initial,
full-field Overview and real portrait-focused close day/night at both native
configurations (12 compositor images). All original six allies remain in the
initial view. W01 padded height remains **128.12 CSS px** at 1440/100 and
**64.19 CSS px** at 1366/125; these are padded bounds, not a new alpha-height
measurement. Figure scale, initial fit and camera limits are unchanged.

`body-values.json`: 98 W01 interior samples per image, source alpha >=250 at
centre and four 16-source-pixel insets, stride64; projected to untouched PNGs.
Initial median luminance day/night **0.06907/0.05987**, p90 **0.46264/0.32696**;
close median **0.07315/0.06305**, p90 **0.53166/0.37344**. This records filled-body
values, not outline brightness or a universal contrast/visual pass. Scene image
processing remains exposure 1/toneMapping false; only bodies use night exposure 0.8.
The initial alpha 255-only probe returned no samples because the real asset's
opaque interior is predominantly alpha 253; the corrected explicit >=250 method
and earlier empty sample arrays remain distinguishable in the receipts.

**Real journeys:** default Start/autoplay reproduced **victory R8/rev163**;
`victory-result.txt`, `terminal.json`. Manual real Defend/End turn inputs reached
first death `human-6` at **R6/rev92**, then autoplay reached **defeat R15/rev223**;
`manual-retry.json`, `manual-first-death.png`, `manual-outcome.png`. The initial
manual read attempted sessionStorage before it existed and failed; the retry
reads the mounted public projection and records actual UI commands. No fake
canonical state or direct action API command was used.

**F3 partial matched collision:** `label-collision.json` and the two
`label-pan-collision-1366-125-*` images. After the real victory, normal LMB pan
put the retained label anchor at x910.13/y44.18, closely matching evaluator
x910.93/y44.53. Utilities are exactly x844.80–1076.80/y20–60. The upright label
is x827.60–992.66/y64.08–100.81: **zero intersection, 4.08 CSS px clearance**,
readable day/night. Native revision **163→163**, action POST **0**. The original
arrival views also have zero vertical utility overlap at both zooms. The later
body-reservation refinement is checked separately in the final readback below.

## Exact remaining blockers and smallest boundary

1. **F1 is not fixed.** Full-field Overview already uses nearly all available
   width: `framing.json`, real terminal defeat, at native 1366/125 field x12.70
   through 1080.10 within 1093 CSS px; surviving B025 padded height 26.85 px.
   At 1440/100 the field spans x12.00–1428.00 and B025 height 35.57 px. A closer fit
   would crop the full field; enlarging the figure would violate fixed scales.
   No such change was made. The smallest distinct composition route is a useful
   combat-area frame separate from Home/Overview, exposed through the scene
   handle in `battle-hud-scene.ts` and its consumer `BattleView.tsx` / the #209
   `BattleOutcome.tsx` inspection transition. Those paths are outside this grant,
   and #209 is frozen. Coordinator should scope that wiring/interaction explicitly
   (and retain full-field Overview), or provide another explicit resolution of
   this composition requirement; this worker does not reopen game rules or waive
   the critic finding. No new path was edited.
2. **Exact F3 integrated sequence NOT_RUN.** This checkout has the older
   `BattleOutcome.tsx`, with no “Осмотреть поле” action (actual button count 0).
   The frozen #209 source exists only in its separate worktree. No merge, overlay,
   copied outcome implementation, CSS hiding or synthetic inspection state was
   used to pretend otherwise. Native pan collision is supplemental, not the
   requested untouched-arrival → Inspect field → FIELD pin human-2 readback.
   Coordinator integration of #209 is needed before that exact day/night
   1440/100 and 1366/125 check, then independent evaluator/visual gates.
3. Exact E2 archive/setup remains unavailable and was not searched or fabricated;
   strict AC6 remains PARTIAL. Full all-overlay/native matrix/replay/accessibility,
   fresh integrated source review and the full scored Tier V visual criterion set
   are not discharged by this finite author packet. No agents were launched.

## Proposed shared-record update — coordinator only

2026-10-24, branch Vovanostm/uix-179-catalogue-integration, LOCAL bounded partial
#179 repair under the existing targeted allocation: separate visible-bottom
readouts, figure-only night tone mapping and HUD-aware upright event-label
placement. Source 282/300; focused checks and finite native browser measurements
recorded here. F1 needs separate useful-combat-area interaction while preserving
full-field Overview; exact #209 collapse/pin readback cannot run before integration
of its frozen source. Retain inherited blocked status, original 2/2/supplemental,
all AC/DoD, E2/AC6 and independent full Tier V. #297 stays queued until positive
resource handback. No publication/merge/deployment; shared records untouched.


## Final source readback and capture limits

The final event-label version additionally reserves each active figure's padded
visible body rectangle, so downward HUD avoidance cannot put the label across
another body. This deliberately supersedes the earlier 4.08 px-only placement:
`label-collision-final.json` / `label-final-readback.json`, native 1366/125,
retain anchor x910.13/y44.18 but put the label at x827.60–992.66,
y242.77–279.50, clear of both the utilities and the figures. Day/night remain
readable; revision 163→163 and action POST 0. The larger displacement is visible
in `shots/final-label-pan-collision-1366-125-{day,night}.png` and needs integrated
critic review; it is not asserted to be an ideal composition or exact #209 proof.
A temporary three-horizontal-candidate variation was discarded without changing
other WIP; the committed version uses the verified vertical placement.

`terminal-final.json` repeats the real R8/rev163 arrival with the body
reservations. Its native 125% rows are correct; its filenames
`final-terminal-arrival-1440-100`, and the later supplemental filenames
`label-final-1440-100` / `label-final-native-1440-100`, actually measured 1366×768
CSS at native 100% and are **not 1440 proof**: after the comparison tab, Chrome
reported 1440×987 window bounds but retained a 1366×855 outer window. Explicit
window-target retry also retained those actual dimensions; both receipts are
kept (`viewport-restore-result.txt`, `explicit-window-result.txt`). Earlier
1440×900 compositor initial/overview/close and terminal rows have correct native
bitmap/CSS dimensions; the mislabeled later rows do not replace them.

`shots/reference-comparison.png` was directly viewed: equal-height close and
game-scale W01 day/night beside approved unit-c-ink, plus candidate/reference
night scenes. Originals were not edited. The first comparison URL hit the app
fallback; `reference-comparison-route-error.png` preserves that failed capture.
The retry renders the authored comparison HTML with its actual image inputs.
This is an author viewing aid, not a visual verdict.

**Cleanup PASS:** `continuation-1/cleanup.json`. Private browser closed normally;
Ctrl+C ended the owned lab launcher. All 19 recorded owned PIDs are absent,
23963/25963 have no lsof listeners (exit 1, empty stdout/stderr), TCP connectEx 61,
`.orca/play.pid` absent and the exact owned `continuation-1/profile` removed only
after process/port absence. No post-stop SIGTERM was needed. The older retained
profiles, sibling processes and worktrees were untouched. Browser Page zoom was
restored to 100%. No private runtime remains owned by this continuation.

## Final focused gates — before normal commit

- `continuation-tests-final.log`: six focused public test files, **30/30 PASS**,
  coverage mode; adds the existing scene-geometry regression set to the five
  initial module tests. No full suite or coverage target.
- `continuation-typecheck-final.log`: web typecheck **PASS**.
- `continuation-lint-final.log`: five owned modules and matching tests **PASS**.
- `continuation-format-check-final.log`: same scoped format check **PASS**.
- `continuation-audit-complete.log`: correct merge-base audit **PASS**, no new
  dead code/complexity/duplication findings. Its existing syntactic-attribution
  warning is retained; no audit mode/threshold was changed.
- `git diff --check`: **PASS**. Ordinary cumulative source remains **282/300**;
  this continuation adds/removes **123 source + 23 test lines** versus starting
  HEAD, including preserved preparation. No shared record is part of this diff.

Normal pre-commit hooks refreshed their existing related coverage and the
correct-base audit: **PASS**, commit **f9fa1403d7a242ac8ccb7ed646ddc22a4801ce47**
(`continuation-commit.log`, exit 0). Hook test output is intentionally suppressed
by the existing hook, so no extra test count is invented. No bypass was used.
A companion documentation-only normal commit records this receipt; source stays
unchanged. No push, external issue update, shared-record write or merge ran.
