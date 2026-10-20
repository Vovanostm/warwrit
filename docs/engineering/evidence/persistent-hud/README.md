# Persistent commander presentation — #166

2026-10-20, `codex/persistent-hud-166`, base main `1f37cb6a`.
Status: LOCAL; source review and normal audit ACCEPT, playable acceptance and publication pending.
The owner mission authorizes implementation, review and checked merge.

## Scope and authority

Use the real wolf hunt and actual company rosters through the authenticated
encounter controller. Share the existing sprite scene, initiative, cards and
presentation; lab sessions and lab command authority remain separate.
Unknown AP/resource limits stay unknown; allegiance does not grant control
over another company's fighters. Preserve fallback, deadlines, reconnect,
prospective AFK resume and leadership choice.

Owner-approved fists/critical-bleeding rules and the bounded first path are
unchanged. Unmapped abilities remain unavailable; unsupported surrender remains
pending without proof/payment. Autoplay is one requested action, not a continuous
mode. Rescue/transport is undefined. No new terrain content or full-M1 claim.

## Actual first passes

- Initial public projection/types checks passed. Read-only source feedback
  identified lab-only AP/cap assumptions and side-based visual identity;
  the shared web presentation seam now represents these differences explicitly.
  This is not final source review.
- Ordinary owner ACCEPT, helper HELP and both JOIN browser actions admitted a
  real encounter. The first client rejected the otherwise valid public snapshot:
  its strict reader did not allow the newly supplied finite `weaponId`, including
  `fists`. The correction preserves that enum and rejects unknown identifiers.
  Projection/presentation regression12PASS, web typecheck and scoped format PASS.
- That test battle continued behind the failed UI and ended in hostile
  victory118/round12. Both companies lost all six fighters, released/completed
  once; proof0. The original test database is preserved.
- A distinct database repeated ordinary admission and rendered the shared
  scene with six company members and three wolves. No legal player battle action
  was executed before the slow test sequence lost control to the existing AFK
  policy. This proves first rendering only, not playability.
- Independent early visual feedback is BLOCKED: the battle is below the
  settlement page, bodies are unreadable at the resulting overview scale,
  the actor card says “Ваш ход” during another company's activation, and
  roster labels expose UUIDs. Night/close/reference/layering inputs and a
  successful command journey remain missing.
- Independent source diagnosis found no changed axial conversion or sprite
  scale. The small inline viewport leaves a narrow opening between queue and
  dock and triggers existing overview badges. Correct fullscreen layout and
  reframe before changing sprite scale or spacing.

Local ignored evidence in the owning checkout:
.orca/persistent-hud-166/evaluator-prep/failing-battle-projection.png,
.orca/persistent-hud-166/evaluator-prep/corrected-first-render.png,
.orca/persistent-hud-166/evaluator-prep/original-terminal-before-rerun.json,
and .orca/persistent-hud-166/author-checkpoint.md.
These are development fixtures, not retained player accounts or new OIDC proof.

## Frozen-source review — 2026-10-20

The first full BattleView test run reports 24PASS/2FAIL. The health tooltip
changed known-cap slash notation to accessibility prose: this is an introduced
compatibility regression, not an unrelated failure. The map-size assertion
checks a historical lab-only disclaimer rather than this fixture's geometry;
retain lab source metadata without applying that disclaimer to saved battles.

Independent source review also found two realtime projection defects: reflected
Colyseus reach cells need conversion to detached plain coordinates before strict
validation, and weapon identity must survive the HTTP-to-room transition.
These are source findings, not yet reproduced runtime causes of the second
journey. The sole source writer owns corrections and focused regressions;
independent acceptance is pending. Further source review found that target
inspection remained tied to the command actor, and older encounters without
v4 tactical quotes lost their previous movement/attack controls. Both require
correction while retaining authenticated actor authority and server validation.
A resolved snapshot can also arrive without its control grant: deriving viewer
allegiance from that grant falsely renders a victory as defeat. Presentation must
retain established allegiance independently, or show a neutral unknown result.
The contract's icon command row is also required; merely embedding the previous
text/dropdown controls in the shared scene does not complete #166.
Fullscreen/control/name corrections are implemented locally but have not
received a fresh playable or visual pass.

## Corrected candidate — 2026-10-20, LOCAL

The source writer froze the corrected candidate atop `f351af3b`. It retains
lab-only provenance, restores known-cap tooltips, normalizes reflected reach
coordinates, carries weapon identity through realtime, separates inspection
from command authority, preserves legacy unquoted actions and renders unknown
allegiance neutrally. The persistent icon desk uses matching server quotes and
the existing authenticated submit/retry path; one-step autoplay is unchanged.

Author checks: web/server typechecks PASS; six focused files51PASS (projection,
presentation, selection, command desk, BattleView and room); scoped formatting
and diff checks PASS. This supersedes the earlier24PASS/2FAIL result only for
the corrected source. Independent frozen source review ACCEPT: no remaining
material finding in the reviewed boundaries. The reviewer ran no checks.

A third separate legal fixture is prepared and ordinary browser evaluation is
running. No accepted action, runtime result or new visual verdict is claimed
until native readback completes. The unarmed fallback still lacks visual
acceptance. Original failed databases remain preserved.

## Third-fixture actual action and visual rework

DB3 ordinary admission reached an accepted requested one-step attack at revision7
within9.8seconds of the final JOIN. Native receipt/events and exact retained
journal replay confirm the attack; displayed AP4→1, stamina80→68 and target
health40→25/armor10→0 confirm that the client updated. The obsolete harness
assertion for a visible numeric revision failed because fullscreen hides that
legacy text; it is not an action rejection or proof of revision display.

The next ordinary overview-button click failed: the connected-status span
intercepted the pointer for30seconds. No force-click was used. The interrupted
browser harness subsequently lost its session. Only the first player action
was accepted; real AFK/timeouts continued to hostile victory120. Both companies
released/completed once, proof0. Manual/reconnect/full visual acceptance remains
incomplete. The independent critic also observed overlapping top-left notices,
an AFK panel covering the queue, and an almost invisible unarmed placeholder.

The same source writer now owns layout corrections. Parent produced a W01
unarmed derivative with actual transparent background; source and exact prompt
are retained with the [candidate asset](../../../../assets/art/combat/stage1-2026-10-09/roster/w01-unarmed/README.md).
The asset is not yet visually accepted in scene. DB3 remains preserved; a
separate fourth fixture is being prepared, with no new policy or deadline rule.
Local evidence: .orca/persistent-hud-166/evaluator-prep/fast-2026-10-20T11-43-57.649Z/inspection-target.png
and the same directory's first-native-observed/terminal-native records and
followon.jsonl. No successful later journey is inferred from the first attack.

## Fourth-fixture result — LOCAL / REWORK

The source now maps fists to the W01 unarmed derivative. Independent close-asset
review finds no material style/lore defect, but integrated visual acceptance
remains pending. Status/AFK notices moved into a dedicated lane. Secondary
commands gained a wrapped row. The fullscreen uncertain-command retry was then
moved into the same pointer-enabled lane, preserving its original command and
all AFK branches; focused3tests/types/format PASS and affected source ACCEPT.
An initial adapter typing/fixture failure and initially omitted AFK branches
were corrected before this accepted source state.

DB4 started after pre-admission navigation timeouts (no command/state reset).
Admission used ordinary focused Enter; HUD commands used actual pointer clicks.
Native account commands move7 and attack11 were accepted. The helper leaked a
900ms utility timeout into later page waits; continuation did not obtain a
manual end-turn before AFK/timeout progression. Final native result is hostile
victory120/all six company fighters dead. This is not a successful complete
journey, and the specific control/transport timeline is still being diagnosed.

Current owned-turn images expose a real layout defect: raw child paragraphs
participate in the shared display-contents grid, making its max-content column
very wide and squeezing skills/path text into a narrow column. The orders panel
becomes about500px tall and leaves too little field space at1024px. Parent and
independent critic both observed this. The same writer owns the finite grid-slot
correction; no sprite-scale workaround. FullPage images include content beyond
the configured viewport, so those footer pixels alone do not prove an in-viewport
leak; actual body-scroll behavior still needs readback.

Evidence directory: .orca/persistent-hud-166/evaluator-prep/fast-2026-10-20T12-17-22.871Z/,
including owned-turn-1600.png, owned-turn-1024.png and hud-after-click.png.
DB4 is preserved. No new fixture is admitted until layout and harness diagnosis
complete. Final integrated validation/publication/merge are still NOT_RUN.

## Timeline diagnosis and current source correction

Direct inspection of hud-after-click.png proves eventual move7 UI refresh:
AP4→3, stamina80→76 and the moved actor match native state. The300ms text sample
was merely stale. Native readback/replay then consumed about9seconds and the
screenshot finished after helper timeout8; later manual probes followed actual
AFK while the next actor belonged to that helper. The owner driver also exited
on transient discovering; the helper exited on a short missing-button timeout.
Missing raw grant/frame traces mean no new transport defect is established.
Do not attribute all failures to game code or claim complete live continuity.

The current frozen source removes raw auto-placed hint/quote paragraphs and
uses the shared full-width feedback row. Fullscreen overflow locks restore
previous styles on cleanup. Terminal AFK/resume notices are gated by active
battle status; pending same-command retry remains available. Author web types,
31focused UI tests then3lane tests, format and diff checks PASS. Independent
affected source review ACCEPT; no reviewer checks executed.

Next: an ignored display-only fixture using actual rendering components and
retained battle data checks sizing before any new live battle. It is explicitly
not gameplay, authentication or command evidence. The next real sequence moves
expensive native replay/readback after terminal and keeps drivers alive through
transient loading states. Previous fixture data and failures remain preserved.

## Display-only layout review — 2026-10-20

Eight viewport-only captures cover target/no-target,1600×1000/1024×768 and
day/night using the current components and retained DB4 states. The enlarged
orders-panel defect is absent and no settlement footer appears inside the
viewport. This fixture supplies synthetic same-side control and no-op commands:
it proves rendering only, not authentication, control authority or gameplay.
Evidence: .orca/persistent-hud-166/evaluator-prep/layout-display/.

Target-card wheel input reveals armor10, stamina74 and morale80, with scrollTop
0→161 and no scene zoom or document scroll. The independent critic withdraws
inaccessibility but requires a discoverable scroll cue or compact resource fit.
At1024px, actor HP/armor are absent while initiative values are hidden; this
remains a material readout defect assigned to the same source writer.

Focused unarmed day/night views receive2 for silhouette, pose, rendering, palette,
materials and props/lore; the opaque figure has no visible ground-overlay crossing
in these inspected frames. This is partial art evidence. Full layering scenarios,
equal-visible-height reference comparison and actual input/reconnect/terminal
journey remain required; overall visual verdict is BLOCKED. No fifth gameplay
fixture has started. The revised driver is syntax-checked only and moves expensive
native correlation after terminal instead of spending active-turn deadlines.

## Compact resource correction — 2026-10-20, LOCAL

The frozen candidate now reuses observed health/armor vitals in the actor card,
keeps unknown maxima explicit, adds a target-card scroll cue and avoids splitting
command labels inside words. Author web types,27BattleView tests, scoped format
and diff checks PASS. Independent affected source review ACCEPT; no reviewer
checks. Refreshed display evidence and integrated acceptance are pending.

The parent focused coverage batch reports76PASS/1FAIL across13files: the public
projection test's exact key list omitted the deliberately published weaponId.
The source writer corrected the finite key list and asserted the actual
sword-shield identity; the focused access test1PASS, format and diff checks PASS.
No production code changed. The failed batch is not claimed as a successful
gate; current coverage and normal commit audit remain pending.

## Refreshed display evidence — 2026-10-20

The clean serial capture set is retained at
.orca/persistent-hud-166/evaluator-prep/layout-display/refresh-20261020-clean/.
An earlier overlapping capture attempt timed out and its partial directory is
marked invalid. Parent directly inspected current target1024/1600 day frames:
actor health60/armor12 and the target scroll cue are visible; the compact dock
fits. Evaluator reports eight viewport images, close unarmed day/night/grid
views, wheel sequence and corrected body-height comparison. Document/viewport
sizes match with scrollY0; target scrollTop0→178. These remain display-only
observations; independent complete review and real gameplay are pending.

Independent absolute review of the complete refreshed display set and corrected
320/102px body-height sheet now scores2 for silhouette, pose, rendering, palette,
materials, props/lore and scene/HUD integration; motion is N/A. The actor resource,
scroll affordance and label findings are resolved. Bounded DISPLAY-ONLY fit/art
ACCEPT does not establish live control or full layering acceptance. Overall
substantive verdict remains BLOCKED pending actual journey and required crowded,
archer, long-weapon/large-creature, height and overlay comparison cases.

## Normal commit gate — 2026-10-20, REWORK

The corrected focused coverage batch passes77/77 across13files. The normal
precommit audit then fails: BattleField.tsx is newly unreachable after switching
to the shared scene, the legacy renderer contains a duplicate, and added
complexity crosses the existing gate. Its report lists40complexity findings,
with24inherited findings excluded; only actual-new findings belong to this
correction. Log: .orca/persistent-hud-166/precommit-audit.log.

The author isolated one new unused-file finding and14introduced complexity
errors. The legacy battle scene is reached only by the unused component and its
dedicated test; map-scene remains live. A subsequent existing seven-file53PASS
coverage run overwrote the ignored coverage report with a subset; the parent's
77PASS log remains retained, but the latest coverage file is not that batch.

No commit or bypass is claimed. The sole source writer owns bounded cleanup of
unreachable renderer code and cohesive simplification of the affected new
responsibilities. Existing warnings/coverage totals do not authorize unrelated
refactoring or test-count targets. Independent read-only review confirms the legacy renderer is unreachable and
map rendering is unaffected. Its consumed-bar regression must be retained in
the shared-view tests: health20 with cap60→80→unknown→60 must render the actual
ratios and unknown state. Transport-only assertions do not cover that consumer.
The fresh live fixture stays paused until source freeze and the normal commit
gate pass.

## Corrective source review and fresh coverage — 2026-10-20

The dead legacy renderer is removed. Finite projection, room application,
presentation, forecast and threat responsibilities are separated without new
mechanics. Independent affected source review ACCEPT confirms strict rejections,
private quote ownership and behavior. The consumed health-cap regression now
runs through the persistent adapter and shared UnitVitals and passes. An earlier
reviewer's missing-test report was corrected after reading its actual location,
encounter/battle-presentation.test.ts.

A proposed lifecycle-hook extraction added complexity and was reverted. Parent
identified redundant normalization: BattleView already supplies the normalized
presentation, so useBattleScene now accepts that type directly. No broad scene
or closure redesign is required. Prior audit reports used stale subset coverage
for newly extracted functions; they do not justify further speculative splits.

Fresh parent coverage78PASS across13files leaves four real gate blockers:
room applyUnits complexity, primary command click dispatch, the new conditional
old-mill environment setup, and uncovered active AFK notice branches. Size is
not a blocking new finding. Logs: .orca/persistent-hud-166/refactor-coverage.log
and refactor-audit.json. The same source writer owns those bounded corrections;
no gate override or commit yet. Prepared lab editor retains the existing6v6
ruined-mill roster and one ordinary height2 edit; no battle or fifth persistent
fixture has started.

## Final source freeze — 2026-10-20, LOCAL

All four bounded audit corrections are complete. Room serialization retains
finite resources/conditions/threats/reach with clear/reset behavior; buttons use
one finite command for enablement and dispatch; old-mill environment setup is
cohesive; active AFK/resume branches are covered. Independent affected source
review ACCEPT, including environment geometry, lifecycle and disposal. The
reviewer ran no checks. No thresholds, ignores or hook bypass were introduced.

Normal audit EXIT0 against main1f37cb6a,59changed files,0new dead code,
0introduced complexity,0duplication;17inherited complexity findings and32styling
advisories remain non-blocking. Retained logs: .orca/persistent-hud-166/final-audit.log
and final-audit.json, with corresponding stderr files. Author reports final
13-file coverage80PASS and web/server types/format/lint PASS, but the raw80-test
log was not retained; parent-confirmed persisted coverage remains78PASS/13files.
This evidence distinction is preserved until the clean integrated validator.
Source is frozen for a normal commit; no fresh playable acceptance is claimed.

## Remaining acceptance

Execute a fast
ordinary browser admission and legal HUD action before the unchanged deadline.
Follow with current frozen-source review, independent real input/reconnect/
terminal evaluation and absolute visual review. Final integrated validation,
publication, hosted CI, merge and actual-main readback are NOT_RUN for #166.
The [bridge recovery evidence](../core-tactical-bridge/README.md) retains its
separate scope and cannot substitute for these HUD checks.
