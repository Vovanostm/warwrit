# Painted world-map navigation stand

Status: owner-approved local prototype, PR delivery 2026-10-26.
Owner request: “Review, prepare pr, merge”. Branch `codex/world-map-painted`.
Detailed requirements/history/evidence live in the [owning map page](../wiki/world/map.md).
This delivery contract links that existing record; it does not approve new canon.

## Outcome and boundary

Run `pnpm dev:map` and open `/scripts/world-map/navigation-lab.html?map=atlas`.
The generated 3×3 atlas supports terrain-weighted routes, two real bridges,
continuous onward journeys, smooth wheel zoom, WASD/pan, RMB targets and night view.
There are 34 places and 24 RU/EN contract proposals. Bereznyak/Brod use settlement
areas with passive Enter and explicit Visit intent; return preserves position.
The other places remain point destinations. Quests/rewards are previews only.

Scope: `scripts/world-map/`, generated map art and provenance, map wiki/checkpoint,
package commands, focused test/coverage discovery and the local commit-hook seam.
No game-core/server/protocol/save/migrations/dependency or production API changes.
Previously approved map art is retained under the art policy's historical-assets
clause; current style references from main are preserved without regeneration.

## Acceptance and review

- Public core navigation drives routes/speeds; no copied domain movement rule.
- Visible water remains blocked; crossings use the two intact bridges.
- New journeys start at the current party; stopping/rerouting/visiting do not teleport.
  Route examples choose a destination only. Initial spawn and explicit diagnostic
  Place Start remain deliberate setup controls.
- Passive area availability does not force a visit; a new valid order cancels Visit.
- Current terrain/camera/area scenarios and types pass `pnpm test:map`.
- Independent review accepts source cohesion, correctness and tooling changes.
- Existing visual/text reviews and actual browser limits stay explicit in map wiki.
- Publish one cohesive PR; merge only its verified expected head after CI and scope.

Large authored geography/contract tables and generated assets are one stand's data,
not separate live game features. Size is advisory; review must judge cohesion and
rollback. Runtime/performance balance, human-player preference, server integration
and full M1 acceptance are outside this prototype.

## Delivery status

[PR #327](https://github.com/Vovanostm/warwrit/pull/327) MERGED 2026-10-26 as
`c4e3f27e`, expected head `70ec192f`; the checked/merged trees match. Independent
source/tooling/cohesion ACCEPT at `e2eb5135` after fixing preset continuity;
its successor only records delivery. Twenty map/types, author native reroute,
scoped lint/format and repository format PASS. CI40249250063 and latest
scope40250278331 SUCCESS; full clean-checkout bootstrap/coverage/audit passed.
Migration impact: none. Detailed links/limits are in the owning map page.
This post-merge documentation readback is local; the stand source/art are in main.

## Controls UX amendment — 2026-10-26

Owner requests continued UX improvements, then PR, normal merge and local-main
update. Branch `codex/map-controls-hint` retains the existing stand boundary.
RMB orders immediate travel; LMB previews/pans; Space pauses/resumes only with
map focus. Invalid water orders preserve a paused journey; arrival cannot replay
it. The initial map has no preselected example route. Nearby Enter and the short
controls hint sit outside the canvas. Existing Visit/preset continuity remains.
The [dated result](../wiki/world/map.md#управление-без-перекрытия-карты--2026-10-26)
owns current checks/review/publication status. No core rules or migration impact.

Controls UX delivered in [PR #328](https://github.com/Vovanostm/warwrit/pull/328),
MERGED as `6dbdc00f` from expected head `b24016f7`. CI40294682426 and latest
scope40296349349 SUCCESS; source/visual ACCEPT, focused checks and author native
journeys PASS. Local main and origin/main read back at the merge; primary WIP
preserved. [Detailed readback](../wiki/world/map.md#слияние-улучшений-управления--2026-10-26).
This post-merge documentation update is local; runtime is merged.

## Proposed networked successor — 2026-10-26

Owner asks to study and design own/other-player, patrol, bandit and wildlife
movement. The [owning proposal](../wiki/world/map.md#общая-карта-mmo-движущиеся-отряды--проработка-2026-10-26)
records the inspected server seams, atlas edition mismatch, server/lab ownership,
visibility and finite first-playable journey. This is local design, not a newly
implemented network mode or approval of all NPC/contact/offline parameters.
The delivered single-player stand remains available unchanged.

## Networked first cycle activation — 2026-10-26

Owner: “Implement - delegate subagents.” This authorizes local implementation
and bounded delegation of the proposed first cycle, not new PR/merge/deploy.
Outcome: two authenticated fixture companies and patrol/bandits/wolves/night
creature on one server-owned painted atlas, durable PostgreSQL state and lawful
realtime observations. The separate lab process/database uses the existing
company movement executor with explicit map context. Main game defaults and
retained editions remain compatible. No PvP, dynamic battle admission, rewards,
full offline combat, ecology or population/load acceptance in this cycle.
Map inputs, camera and Enter remain usable; the server validates entry proximity.
Space stops only the player's company. Playback/time/night controls do not alter
one client's world independently. Test-only identity selection is local guarded.
Parent owns integration, DTO/barrel exports, launch/DB resources, shared docs and
validation. Delegated editors own disjoint worktrees/path sets; no publication,
commit, service launch, full checks or child delegation. Existing implementer,
reviewer and visual-critic roles are suitable; no new agent definitions needed.
Frozen seam: packages/protocol/src/world-lab.ts; HTTP /world-lab/session,
/state, /movement and /room-ticket; WS world-lab emits per-client 'world' DTO.
Acceptance: actual two-context MOVE_TO/STOP/reroute; no cross-company command;
water blocked, common map/version; NPC routes persist without viewers/restart;
visibility has no hidden group/path payload; existing local stand preserved.
Parent runs focused types/tests, real isolated-PostgreSQL checks and native
journeys, then independent source and playable/visual critique; no full-MMO claim.

### Integrated result — 2026-10-26

The three delegated slices are integrated; parent owns all source and validation.
Run `pnpm dev:world`, UI5338; API3038/WS3039, separate PostgreSQL65438.
Shared immutable atlas geometry/profile and two visit polygons live in game-core;
old stand artwork/timing and legacy server region defaults remain compatible.
NPC plans/identity/decision deadlines persist in migration0015 tables; no Room
owns simulation. Per-client observations contain visible samples, never AI plans.
The lab has a separate cookie and validates real account/company ownership.
Native two-context commands, water/foreign rejection, exact STOP/visit-return,
35s without viewers, real API restart retaining an active plan, and night-only
creature at the mill PASS. Four real-PG cases PASS from scripts/world-map;
test placement respects the server rootDir without runtime testkit imports.
Focused map20 and core/client9 cases, script/server types PASS. Clean
verify1200/stress10000 PASS; migration smoke + all69 SQL cases PASS across the
full run and affected rerun. Independent source/visual ACCEPT; normal hook/audit PASS at `114028e3`.
Post-refactor related coverage996 PASS/61 skipped, four real-PG cases PASS;
final script/server types and scoped lint/format PASS. Native network18/legacy18
and actual SDK reconnect PASS. Optional source-matched engine coverage preserves
the normal audit thresholds; final normal hook/audit PASS without bypass.
Additional stationary-company/retained-trip regression PASS; latest ordinary-runtime
restart and seven native smoke checks PASS. Code committed locally as `114028e3`;
no publication, merge or production acceptance.
Detailed results and limits belong to the [map page](../wiki/world/map.md#сетевая-лаборатория--реализация-2026-10-26).

## Pursuit amendment — 2026-10-27

Owner: RMB on an enemy must pursue the moving group, not its clicked point.
Local scope: BANDITS/WILDLIFE/CREATURE observed by the existing lab sight policy;
players/patrols stay neutral. Server retains intent and replans only while observed,
using the existing authenticated movement executor and costs/barriers. Space and
successful terrain/site orders cancel intent atomically; rejected/replayed old
orders cannot resurrect/cancel a newer intent. No automatic battle or PvP.
Shared server worker runs independently of rooms. A small explicit lab proximity
threshold ends pursuit at a reachable nearby point; no contact/battle claim.
Owner accepted loss of sight: last observed point, then stop;
no position updates from a hidden target. Parent owns code/docs/resources/checks.
Acceptance: actual moving bandit pursuit changes goal without repeated clicks,
STOP/new ground order wins, hidden/neutral/foreign targets rejected, no terrain
bypass, persistence/restart and old point navigation preserved. Focused real SQL,
client types/native journeys plus independent source/playable critique required.
No new publication/merge/deploy or automation activation.

### Pursuit implementation checkpoint — 2026-10-27

Stable server orderId survives worker replans; the current client sends an
expected pursuit token. Under the owner lock, a new order with a different token
is rejected; exact old receipts remain replayable without changing intent.
A stale revision can be retried once only while the same pursuit order remains.
Optional header preserves original laboratory request compatibility.
Migrations0016/0017 are additive and guard rollback with retained pursuit data.
Seven focused cases,23 actual SQL cases, migration smoke, types/lint and bounded
native pursuit/cancellation/two-window probes PASS. Independent source reviewer
found no material defect. Clean bootstrap verify1204/stress10000/smoke+SQL74 PASS.
After client-only helper/ring edits: focused types/lint and native orders rerun;
server/core gate results remain applicable. Independent visual ACCEPT, six scores2;
critic native replay NOT_RUN, author native checks separate. Source helper readback
ACCEPT; navigation42 PASS; normal hook/audit PASS at `9b2c41a5`, no bypass.
Plain-server restart retained orderId; current native RMB/STOP and visit network
recovery PASS. Local complete; production/full MMO/player enjoyment not accepted.
[Owning result and honest probe limits](../wiki/world/map.md#преследование-видимой-угрозы--2026-10-27).

## Map icon amendment — 2026-10-27

Owner asks to replace marks with icons and continue professionalizing the map.
One local visual slice: own/other parties, patrol/bandits/wildlife/creature,
34 existing POIs and nearby-list keys in the networked laboratory. Reuse the
existing licensed Game Icons silhouette family. No new raster generation,
lore, world categories, protocol or movement rules. Icons describe established
subjects; no new heraldry, religious symbols or change of place condition.
Keep authoritative coordinates, click targets and pursuit/camera controls.
Readable silhouettes, target selection and own-party distinction on overview,
close view, day/night and1050×800. Parent owns all edits/assets/resources/docs;
independent visual critic gets actual screenshots/input journey. Focused script
types/lint and native input/readability checks; retain unaffected server/core gates.
Local commit only; no publication, deployment, automation or main changes.

### Map icon implementation checkpoint — 2026-10-27

24 local SVG symbols (21 pinned Game Icons, three local neutral shapes) drive
party markers, nearby keys and34 stable POIs. Icons keep screen size through
zoom/resize; own noninteractive badge lets enemy input through. No public/private
state, coordinate, navigation, game rule or dependency changes. Source review
corrected pasture and burnt-wagon mismatches and closed its findings.
Focused script types/lint/format/assets and18 native + five night checks PASS.
The normal launcher hit macOS Bash3.2 empty-array/set-u failure; protected optional
argument expansion was syntax/empty/nonempty/actual-start checked. No DB reset.
Independent visual critique and normal commit audit pending. Existing server/core
checks remain applicable; no new full game/SQL gate for this UI-only slice.
[Owning result and actual probe limits](../wiki/world/map.md#иконки-отрядов-и-мест--2026-10-27).

Label acceptance correction: first visual pass REJECT for collisions and excessive
uniform overview emphasis. Added finite anchored placements with marker/label/edge
avoidance, hover/major priority and short leaders; minor overview icons recede.
A camera/resize timing regression from the intermediate native pass is fixed:
viewBox changes bypass the layout throttle; resize forces it after marker updates.
Current native23 and100 WASD frames PASS, day/night and two-window/stale retry
checks repeated. Source concern closed; second absolute visual pass and normal
commit pending. No thresholds, marker anchors or input/routing rules changed.

Final icon result: local code `9dd85bd8`, normal hook/audit PASS without bypass.
Full repeated visual ACCEPT: all seven applicable criteria2/3. True1050×800
NIGHT capture checked rendered light before/after, correcting two mislabeled
intermediate files. Material label/hierarchy/source findings closed. Independent
native input NOT_RUN; human preference/fun NOT_MEASURED. No publication/merge.

## Own-party camera amendment — 2026-10-27

Owner: continue the professional map cycle after icons. One local UI improvement:
optional explicit camera following of the own company using the same rendered
position and bounded map extent. Preserve zoom on center/follow; drag, WASD and
overview release follow. Wheel changes scale while following; a simple map click
does not release it. Follow starts off and resets on session change. Existing
snapshot freshness/interpolation limits apply; no server or movement-rule change.
Parent owns all edits/resources/checks; independent visual critic receives real
day/night, overview/close and moving/start/STOP captures plus native input evidence.
Focused script types/lint/native camera regressions; retain unaffected core gates.
No publication, merge, deployment, automation or new art.

Camera checkpoint: map20/types/scoped lint/format PASS;24 native + seven supplemental
checks PASS. Focused-checkbox WASD source finding reproduced, fixed in shared input
guard and closed on independent readback. Corrected legacy pan probe uses a zoomed
map; native checkbox Space and text-input isolation also PASS. Day/night/desktop
captures verify light before/after;60 moving frames keep own marker centered.
Visual critique/normal commit audit pending; core/server unchanged, retained gates
remain applicable. [Owning result and limits](../wiki/world/map.md#камера-за-своим-отрядом--2026-10-27).

Final camera result: code `5dac02c7`, normal hook/audit PASS without bypass;
independent full visual ACCEPT after inspecting current day/night movement and
overview/desktop views against the references. No material visual finding.
Four retained-branch checks (real stale retry and visit network recovery) PASS.
Independent native replay NOT_RUN; player preference/fun NOT_MEASURED.
Locally complete; no publication, merge, deployment or automation activation.

## Networked atlas PR activation — 2026-10-27

Owner: “pr, merge”. Authorizes one cohesive PR for the current networked-map
branch and normal expected-head merge after independent review and applicable CI.
Includes networked lab, pursuit, icons/labels, follow camera and migrations0015–0017;
the single-player stand and main runtime defaults remain compatible. Main `e4876962`
(mill PR329) is integrated with both documentation histories/config entries retained.
Parent is the sole writer/integrator/validation owner. Independent infrastructure
and integration review required; prior unchanged-code visual/playable evidence is
retained. Publish once to run the existing full clean-checkout PR gates; no duplicate
local bootstrap. No deploy, auto/admin merge, automation or Orca activation.

### Hosted CI correction

PR330 at `0be69678` received independent integration/infrastructure ACCEPT.
CI40549906440 passed the full bootstrap and unit coverage; the audit rejected
unmeasured SQL/browser paths. Retain the same gate and thresholds. Measure the
existing migration/SQL run, execute the existing real-browser journey with
pinned development-only Playwright1.64.1, and merge actual same-run source-checked
browser/server/SQL measurements before the audit. No imported local evidence or
production behavior change. Native repro/review/green CI required for the correction.

Local correction readback: instrumented migration smoke/SQL74, unit1204, real
six-phase Chromium journey and source-checked audit PASS. Visit probe now waits
for the accepted command's later rendered snapshot and a specific network error;
SDK resumption verifies the same room/session, not a new room admission. Unique
runtime folders retain past failures; owned launcher/API/web cleanup waits and
removes only its PID file. Source concerns closed, provisional infrastructure
ACCEPT. Normal commit/exact-head review and hosted CI still pending.

## Raster road continuity amendment — 2026-10-28

Owner requests the two pictured road breaks fixed, tested, published and normally
merged, then cleanup of this task's worktree. Branch `codex/map-road-continuity`.
Retain historical atlas art; repair only the Brod eastern field approach and
Tikhaya southern forest approach. Both lab image consumers use version6; old v5
remains historical. Exact prompts/blend bounds and the road-tracing rule live
beside the asset. Trace through-roads across the whole affected field/forest/tile
join at native/game scale, overview/close, day/night. Fields and hedges must end
at the shoulders; no unexplained road stub. Independent visual critique required.
No movement cost/terrain/server/schema change or deployment authorization.
[Current results and delivery](../wiki/world/map.md#исправление-обрывов-дорог--2026-10-28).

## Road navigation amendment — 2026-10-28

Owner follow-up: retain the worktree; road nodes and pathfinding must work on the
repaired road links. This supersedes the image-only boundary for this correction.
One shared atlas region owns road polygons and authored stations. Both labs and
the server compile their fields from it; no separate client road map or new
pathfinding algorithm. Replace the eastern shortcut through crops, connect the
southern forest approach and use one shared junction with Tikhaya's road.
Use existing dirt-road/trail profiles. Keep map coordinates, water/bridges and
accepted plans' frozen path/speed spans/timing; only new plans/replans use the
corrected field. Geometry is rebuilt on module/process load; old live processes
are not silently updated. No database reset, migrations or deployment.
Acceptance: sampled painted road points resolve to the road overlay; the former
field shortcut loses its road bonus; actual planned routes take the drawn bends
and beat the straight off-road cut. Existing bridge/water/frame tests continue.
Author verifies the two paths in the browser with current captures and an
independent read-only playable/visual critic. Retain the original mission's
PR/normal-merge permission and proportional gates; do not remove the worktree.

### Navigation PR CI correction

CI40676883813 passed verify1206/stress but SQL73/74 failed the bridge-v5 bow
terminal scenario. That test omitted a legitimate successor-selection step,
which adjacent cases already exercise via the real leadership API. Correct only
that test's orchestration; retain terminal/replay/idempotency assertions and all
existing gates. No combat production-policy change. The observed null marker does
not by itself prove the leader's fate; source establishes the unsupported test
assumption. Focused actual isolated PostgreSQL case and independent source review
are required, then current-head hosted CI. Existing map visual evidence remains
applicable because navigation code/art are unchanged by this correction.

Delivery readback2026-10-28: current-head CI40680047382 PASS (verify/coverage1206,
84 unit skips, stress10000, migration smoke, SQL74, actual browser journeys and
normal audit); final scope40681842613 PASS. PR332 merged normally as `caee351b`
with expected head `52bd78253958f0951613e765c24d379f7711749d`. Live PR/main
and merge tree read back; tested and merged trees match. This documentation
checkpoint is local; implementation is merged. Retain this worktree and stand5346;
older running servers need an updated process reload. No deployment performed.

## Road diagnostics amendment — 2026-10-28

Owner: implement the recommended first cycle, preserving agent freedom and avoiding
excess instructions/waste. Add local map-lab inspection of the compiled road-only
graph and checks for the two repaired connections. A disconnected declared link
must fail even when the general planner finds a walkable field bypass. Display
actual nodes/edges and affected check endpoints; ordinary dead ends are permitted.
Do not claim all atlas roads verified from these two expectations. Default overlay
off; map input, day/night and journeys stay usable. No runtime/game-rule change,
new dependency, external publication or deployment. Shorten the art skill to the
required synchronized result and leave implementation/check selection to the author.
Use focused checks and a native journey; independent visual critique remains.

Local result: code `dea28641`; map23/types/scoped lint/format, skill schema and
normal commit audit PASS. Initial broad connectivity accepted an alternate-road
bypass; checking the declared corridor now detects a shifted station despite a
valid free-movement route. Native overlay toggle/Space/day-night/zoom/arrival PASS.
Independent absolute visual ACCEPT, five applicable scores2, after paired evidence
closed the initial missing-input block; independent replay NOT_RUN. Full game/SQL
gates NOT_RUN for this lab-only slice. No publication/deployment; retain worktree.

## Road diagnostics PR activation — 2026-10-28

Owner: «ok, pr, merge». Publish the current cohesive map-diagnostics/skill slice
and normally merge after current-head applicable CI/scope and independent review.
Branch `codex/map-road-diagnostics`, live base `caee351b`. Reuse unchanged code
and visual evidence from `dea28641`; publication documents change no behavior.
Includes source research and the measured field-shortcut explanation, not a new
cropland type, speed change or pathfinder replacement. Retain the worktree; no
deployment, automation, auto/admin merge or database reset. Read back actual PR
head/base before the expected-head merge and record its actual result.
