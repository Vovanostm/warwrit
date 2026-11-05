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

### Networked delivery readback — 2026-10-27

[PR330](https://github.com/Vovanostm/warwrit/pull/330) MERGED as `5ecb4eb3`,
expected head `74e4a584`, base `e4876962`. Independent infrastructure/integration
ACCEPT on clean expected head. CI40557403570 SUCCESS (full bootstrap/stress/SQL,
unit coverage, installed browser, six real native journeys, source-checked merge
and unchanged audit); latest scope40560485057 SUCCESS. No blocking reviews/threads.
Actual merged tree equals checked head; local main/origin main both `5ecb4eb3`.
Earlier source/pending statuses above are historical and superseded by delivery.
Post-merge main CI40560746226 was still running at readback; no duplicate gate.
This documentation closeout is local; source changes are merged. Primary WIP and
persistent lab data preserved; no deployment, automation or full-MMO acceptance.

## Fog design amendment — 2026-10-27

Owner asks for server-authoritative visibility shaped by terrain/weather/light, a public
strategic chart and progressive company exploration. This cycle's DoD is specification
and ten paired visual/executable-code examples. [Owning proposal](../wiki/world/fog-of-war.md).
Branch `codex/world-map-fog-design`; parent owns all source/docs/resources/validation.
Write scope: dedicated `scripts/world-map/fog-design/`, focused model tests, discovery
configuration and owning records. No production core/server/protocol/SQL or map controls.
Synthetic public fixtures cannot demonstrate protected production transport; the spec
requires private asset delivery as well as entity filtering. Preserve persistent lab DB.
Try on5338 at `/scripts/world-map/fog-design/index.html`; both phases of all ten scenes
must match their named rule, with actual browser evidence and independent visual critique.
No new art, paid services, publication/merge, deployment, Orca or automation activation.

Design checkpoint: ten pairs/20 native states and six model cases PASS; types/lint,
architecture/format and source-checked changed-code audit PASS. First visual pass
rejected missing provenance/age and unclear terrain cues; full repeated critique
ACCEPT after fixes (four applicable scores2). Independent input replay NOT_RUN.
DoD complete for local specification/examples only; server fog, private chunks,
SQL/offline/reconnect integration and performance remain NOT_RUN/NOT_MEASURED.

## Company home-region amendment — 2026-10-28

Owner: the company starts with a chart of its home region only; many regions
exist, and further charts must be purchased or the land explored personally.
This supersedes the globally public strategic-chart proposal above. Acquired
chart coverage, personal exploration and live observation remain separate.
Scope: update the owning fog specification and example09, plus one meaningful
regional-projection regression; no economic/server/world-content implementation.
Parent remains sole writer/validator, current branch `codex/world-map-fog-design`.
Unacquired regions must not reveal towns via the atlas, search, routes or assets;
border crossing only reveals observed terrain. Prices/trade details remain open.
No publication/merge/deploy or automation activation.

Home-region correction: seven model cases, both script typechecks, scoped lint/format,
20 native states and source-checked audit PASS. Affected example09 visual ACCEPT,
four applicable scores2; independent input replay and actual server purchases NOT_RUN.
Local requirement/example correction complete; production integration remains separate.

## Cartography implementation activation — 2026-10-28

Owner: “Implement with subagents”. Local implementation of company cartographic
knowledge and authoritative fog. Source/owner rules: current fog specification,
home-region starting chart, purchased information subsets, personal visit discovery,
quest MARK/TEXT separation, observed-hostile last-place pursuit. No new prices,
merchant transaction UI or external services are invented; durable trusted grants
are the producer seam for a separately priced merchant implementation.

Done: server terrain/light/weather sight, personalized visible groups and known
places, durable sparse exploration/visit records, restart/reconnect retention,
masked authenticated map imagery and closed private source/asset paths on the
world-lab origin. Preserve movement/STOP/pursuit/input controls and existing saves.
No client full atlas/POI catalogue; no hidden target data through movement errors,
nearby, static files, bitmap gutters or stale-session state. Existing authored
terrain owns sight inputs; no inferred geometry from image pixels.

Three delegated editors in separate persistent worktrees: new pure sight module,
new cartography store/migration0018, client rendering/state. Parent owns protocol,
server integration/producers, raster/Vite access, shared docs and all execution.
Frozen state v2/cartography DTO: packages/protocol/src/world-cartography.ts.
Parent runs focused types/core/real SQL/native, one full existing final game gate,
independent diff and visual/playable critique before declaring locally complete.
Persistent lab database must be preserved; no PR/merge/deploy/Orca activation.

### Cartography local result — 2026-10-28

Server-authoritative observation, company chart/explored chunks and explicit visit
records are integrated. The client receives lawful sites and authenticated,
byte-masked PNG tiles, with no private source/raw atlas on the world-lab origin.
Known-area fit, soft paper reveal, preserved map controls and session/stale cleanup
are usable on5338. Three delegated slices and the final quality refactor retain
one parent integration/validation owner. [Detailed result and checks](../wiki/world/fog-of-war.md#серверная-реализация-стенда--2026-10-28).
Clean verify1222/stress10000/migration smoke PASS; full SQL78 PASS, old migration-list
case corrected and separately PASS. Third absolute visual ACCEPT, eight criteria2;
independent input replay NOT_RUN. Final refactor: isolated SQL10, native9 plus
actual API restart, related1007/71 skipped, types/lint/format and source-matched
normal audit PASS. Bounded source readback found no concrete defect; no gate
thresholds or suppressions changed. Local source commit `a2388f57`; normal hook/audit PASS, no bypass.
One-time owner-approved fixture ration top-up retained positions/discoveries/money.
No merchant economy UI, multi-region travel, production rollout or new PR/merge.

## Ordinary game painted-map activation — 2026-10-29

Owner explicitly requests the existing game's map use the fully painted atlas
from thread01a172f4-f5d7-7b33-b107-c8d3a73702a0, update existing combat and
unify wiki/docs. Preliminary mapv6/combat-heightfield/graphic-novel images were
shown; this cycle implements the first actual map path in the ordinary shell.
No merge/deployment/paid/Orca authority. Preserve original databases and WIP.

One observable result: ordinary OIDC → company → painted map → nearby movement
→ arrival/reload, existing Company/Place/encounter entry preserved. Map image
v6, geography/road definitions from current main48d8a2ae; reuse fog source
974a87e1/a2388f57 (local lab only until this integration is accepted). Source
worktree game-painted-map/codex/game-painted-map integrates both histories.

Existing V5 worlds, terrain locations and accepted routes retain their frame
and frozen schedules. A server-owned explicit painted world/cohort is selected
for the first integration; it must never reinterpret old world data. Thread one
region context through surroundings, movement GET/POST and route worker, using
existing atlas profile, real clock and existing ordinary company/place/contract
commands. No fixture identity, laboratory timeScale, resource grant or synthetic
position. Extra atlas POIs do not acquire invented services or aliases.

Use the existing versioned cartography store, trusted home grant, exploration
and server-masked raster, authenticated company binding and private no-store
transport. Do not send the full authored terrain/catalogue as a fallback. New
ordinary surroundings has optional map.cartography, existing cartography DTO
plus explicit mapEdition; legacy map.continuous remains legacy-only. Tile route
/world/cartography/tiles/:revision/:x/:y.png uses ordinary login/company scope.
All art consumers usev6; no raw atlas/source-route access on game origin.
Acquired chart, explored and live visible masks remain distinct; existing
provisional sight/weather coefficients stay provisional, no new balancing.

Parent owns server/protocol/region integration, docs, resources and all checks.
One isolated delegated UI editor owns web PaintedMapCanvas/renderer and finite
shared cartography/camera seams, GameShell selection, scoped CSS and necessary
lab import adjustments. UI consumes only lawful DTOs, derives no hidden POIs.
Keep current movement display interpolation including planVersion3; game S/Space
stop mapping is coherent and camera listeners/tiles dispose across remount.

Parent validates frozen union: types/lint, meaningful existing core/map plus
actual SQL/auth privacy/retry and browser normal journey. Independent source
and absolute visual critic use current images. Existing full gate runs once
for final integrated delivery, not per editor. New acceptance NOT_RUN.

### Ordinary integration checkpoint — 2026-10-29

Ordinary server chooses one immutable world/region context across surroundings,
movement and worker. No prior coordinate/route migration. map.cartography
contains only lawful knowledge; private authenticated v6 tiles replace full
authored terrain transport. Existing Company/Place/encounter slots retained.
Client shares cartography, symbols, camera and exact V3 display interpolation
with existing owners; no second simulation or fixture login.

Parent fixed projection return/destructuring and receipt import after initial
type failures. Initial SQL assertion incorrectly required JSON object-key order;
full semantic payload/state equality now preserves every returned value. Added
known-mill fixture originally omitted its name via navigation-only site data;
corrected to the named catalogue, no production rule/test weakening.
Final ordinary PG1 PASS/14 filtered SKIP, including SITE/exact-TERRAIN gate
and no mutation. Source backend ACCEPT with explicit empty-danger-polygons limit.
Client review found painted V3 parser rejection, capture stealing click, same-
revision live fog staleness, missing major-label metadata, viewport ratio reset
and resize-during-zoom race. All six source fixes independently ACCEPT.
Web types/client-map-state30/scoped lint PASS. Server types/protocol/core/
testkit builds and config/cartography9 PASS. First web build PASS with old
large-chunk warning, before final six UI fixes; no private atlas/catalogue
markers matched its JS/maps. New source invalidates affected build acceptance.

Runtime QA: API3228/realtime3229/UI5228/Dex5618, PostgreSQL32787 database
warwrit_painted_gameqa_20261029; validation ww_integration_painted_game_20261029.
Both newly created18migration databases; old stands/volumes retained.
Native ordinary login blocked twice by automatic approval review for lack of
explicit fixture-credential submission permission. Owner question pending;
no browser/visual/input acceptance or workaround. Local code only, no PR/main
merge/deployment. Next: approved ordinary native journey, visual critique,
normal commit and applicable hosted gate, then existing combat integration.

### Native ordinary journey and refinement — 2026-10-29

The owner explicitly approved the named local Dex fixture login. An old auth
flow failed after the API had restarted; a fresh ordinary login succeeded.
Normal company opening (one companion), known terrain MOVE_TO, actual arrival,
reload, S stop, reroute, home arrival and Place/Company access PASS. The own badge
initially intercepted the current settlement click; pointer-inert presentation
corrected it and the same native click exposed actual available entrances.
A controlled restart of only this stand's verified API watcher retained an
accepted active route. At re-entry the company had arrived at its original
accepted goal exactly (`2305.1428571428573,1218` rendered map pixels); this is
process restart/arrival evidence, not a hard-crash or full-game acceptance.
Space stop also passed. Actual ~6minute travel to Bereznyak completed and its
ordinary wolf contract/enemy list became available, without time or position edits.

Native desktop map exposed unnecessary404 requests for a tile touching a known
cell boundary. Shared cartography now computes direct grid edges and the same
integer-pixel intervals as the server, avoiding centre/half-cell cancellation.
An exhaustive source-backed probe matched42336cells against14155776server pixel
samples. Fresh reload/zoom/drag showed no map warning. Known bounds share one
owner; laboratory fallback remains own position and ordinary fallback sheet
centre. Shared Vite request decoding keeps each origin's access policy separate.

First absolute integrated visual review REJECT: hard square reveal edges, despite
accepted painted material/readability and honest unknown coverage. Replace the
SVG blur/displacement with a cached, inward-only irregular alpha transition on
known cells. Unknown reveal alpha stays zero; server bytes remain masked.
The one privacy/interior invariant, web/script types and scoped lint PASS.
Fresh integrated day/night/overview/close critique remains pending; prior rejection
is retained. These later UI changes invalidate affected earlier visual/build claims.

The first clean bootstrap failed a protocol source cycle. Shared point DTOs now
live in world-point.ts and are re-exported compatibly. The corrected clean gate
PASS:1228unit tests/90SKIP,10000stress battles and80actual PostgreSQL checks.
It predates the later fog refinement and separate combat port. Additional V8
measurement ran76SQL assertions PASS/4timeouts and1227unit PASS/1timeout; the
isolated ordinary measured case still takes13s at its first read versus the
unchanged5000ms runner limit. This is failed instrumented evidence, not a new
functional pass. No timeout, assertion, quality threshold or baseline was changed.
Old-source coverage merge first rejected an invalid end line; a fresh source
report then merged actual SQL measurements. Audit remains FAIL:43introduced
complexity findings and one Vite clone before its subsequent shared extraction.
No normal commit or publication yet; no hook bypass. Raw failures/checks/native
captures are retained under output/painted-map-integration/ (local untracked data).

The existing M1§17 now owns current publication gaps; M1_LOCAL_PLAYTEST separates
this actual ordinary journey from its historical legacy steps and withdraws the
old destructive reset recipe. Payroll/transfer/reader remain separate open PRs;
care remains frozen. Main, old databases, stands and WIP are preserved.

### Painted-map acceptance and ordinary combat handoff — 2026-10-29

The current v3 inward-only reveal received full absolute visual ACCEPT: all
seven applicable criteria scored2 at overview and close, with actual day/night
headers and equal-height comparisons against selected references. The faint
visibility dash is polish; unknown coverage follows the approved privacy rule.
Independent input replay remains NOT_RUN; author input/restart evidence above
is retained. The atlas image itself is unchangedv6, so no geography revision or
new navigation rebuild is claimed by this compositor correction.

The instrumented first-read timeout was traced to rebuilding the immutable atlas
navigation field separately in observation and movement. Both now share the
same WeakMap owner in `apps/server/src/world/navigation-field.ts`; independent
source ACCEPT. The same unchanged5s ordinary check passed at3.60s and all15world
route SQL cases under V8 passed. Earlier timeout runs remain failed history;
no timeout, assertion, baseline or quality threshold was weakened.

QA3 retained normal accepted travel across an unexpected environment stop and
Docker's port reassignment32787→32768. Its company `Дозор тракта` completed
HUNT02 with actual manual attacks/endturns and two explicit single-action auto
commands: round5 victory, all3members alive,3wolves dead. Actual trophy pickup,
presentation,80crown payment and page reload retained880crowns and injuries.
This is one-company HUNT02 evidence, not all contracts/two-company/fullM1 proof.
Prior QA1/QA2 losses remain preserved in their separate databases; missed author
deadlines do not establish balance. Combat appearance and remaining gaps belong
to the existing battlefield page, not a second map specification.

Raw captures32–39 and comparison-v3/combat-current sheets are local untracked
files under output/painted-map-integration/native/. Normal audit/commit/PR and
final current clean gate are pending. No main merge, deployment or Orca.

### Map-only delivery candidate — 2026-10-29

The accepted map is being prepared on `codex/game-painted-delivery` from48d8a2ae
plus fog974a87e1. The original `codex/game-painted-map` source and the client
worktree's initial stashed integration remain preserved. This candidate includes
ordinary server-selected atlas context, company-private cartography/migration0018,
shared field/cache/camera/compositor, lawful web map and owning documentation.
Unaccepted combat source/art stays in the parent branch; the battle page labels
that separate local state explicitly. Full game and combat objectives remain active.

A finite isolated CI journey owns a disposable PostgreSQL Compose project and
Dex container, real OIDC/company opening, painted tiles, zoom/drag/keys, known-site
movement/STOP, Company/Place and reload. It collects actual browser/Node source-
checked measurements. Local explicit reuse may use only the already approved
Dex5618; old campaign and shared-world databases/volumes are never reset. Current
script/source review and runtime checks are pending. No thresholds/baselines or
assertions are reduced to pass the audit. Final current clean gate and ordinary
commit/PR remain pending; no main merge, deploy, paid or Orca operation.

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

CI40703225465 correction: bootstrap passed, but coverage timed out the negative
road test at7793ms against the unchanged5000ms budget. Reuse the already compiled
real atlas field and remove one existing bidirectional road edge in a copied map.
Keep the actual grid/terrain, public planner bypass assertion, continuity failure,
missing-anchor case and DOM toggle checks; assert the removed edge existed both
ways. No timeout increase or production change. Focused V8 coverage3 PASS with
37ms test bodies locally; independent test correction SOURCE ACCEPT. New hosted
CI required before merge. Prior visual/native evidence remains applicable.

#### Current delivery checks — 2026-10-29

Current delivery source: web/server types and scoped ESLint PASS; fresh measured
unit run1003PASS/72SKIP. First web typecheck lacked built workspace packages;
normal package builds fixed the environment. The isolated ordinary browser run
now PASS: approved Dex5618 login, normal one-companion company opening, scoped
painted tiles, zoom/drag/native keys, exact selected SITE MOVE_TO, exact STOP,
Company/Place and reload of the same company; page errors0. Actual browser/API/
Vite/driver measurements merged304current scripts without modifying counters.
Evidence local untracked: `output/painted-game-ci/1793306576-12773-14084/` and
`output/painted-delivery/` in the delivery worktree.

Retained failed attempts: occupied realtime port (moved only own new stand),
missing pinned Chromium (installed), premature unloaded-tile assertion, and
incorrect scripted assumptions about home-place overlay and the selected-place
card's active tab. Actual screenshots and hidden-card text established the UI
behavior; the final run opens the selected place's tab explicitly. No game UI,
command semantics, assertion thresholds or server data were changed to pass.
Infrastructure source review ACCEPT after CSS-wrapper filtering, correct web
source-root mapping and exact MOVE_TO/SITE/STOP assertions. Separate world-lab
CI launcher now owns disposable PostgreSQL/PIDs, preserving original persistent
lab data; independent source ACCEPT, runtime still pending. Final clean gate,
audit/normal commit/PR remain pending; no main merge/deployment.

#### Integrated gate and measurement-resource correction — 2026-10-30

Current candidate verify PASS:1229unit/90SKIP, types/build/lint/architecture/content
and dead-code checks; stress10000PASS. The full bootstrap wrapper is retained
as FAIL because measured PostgreSQL finished78PASS/2timeouts at the unchanged
5000ms deadline. Both exact failing cases then passed under V8 when file workers
were serialized (2PASS/37filteredSKIP); no assertion or in-test concurrent command
was removed. Coverage-only migration runner now uses one file worker; ordinary
runs retain their existing two. Independent source ACCEPT; complete80case serial
measurement is active, not yet a pass. Previous failed coverage/report/logs remain.

Earlier gate stops were formatting of the map helper, its leftover unused eager
legacy field, and placing the browser driver under the web package despite its
existing root-only Playwright dev dependency. Corrected without new dependencies:
`painted-game.browser.mjs` now lives under `scripts/world-map/`; matched launcher
and explicit entry point. The helper is formatted; immutable region fields remain
lazy/shared. Fresh affected runtime measurement is pending; old source measurements
will not stand in for it. Normal hook/audit/commit/PR and actual hosted gate pending.

Cold-start correction,2026-10-30: serialized V8 still timed out four earlier
movement cases (76PASS/4timeouts), disproving file concurrency as a sufficient
explanation. Removing the unused legacy `field` binding had also removed its
startup warmup. Actual isolated field probe measured1919.78ms cold versus0.0027ms
cached. Restore the original module-startup call without a binding; the shared
cache remains its only owner. All six exact previously failing cases now PASS
under V8 with unchanged5000ms deadlines (6PASS/44filteredSKIP). Full80case warm
serial rerun is active. Keep earlier failures and source measurements as history;
this is not a full-gate pass yet. Actual game-command rules and routes unchanged.

#### Shared observation-clock correction — 2026-10-30

A fresh isolated browser run reproduced visit HTTP500/`TRUSTED_TIME_UNAVAILABLE`:
an NPC worker committed a plan after the own observation time, then the reader
loaded that newer plan and projected it into the past. Other-player route reads
had the same ordering risk. Capture unlocked NPC and player inputs before the
own snapshot samples its trusted clock; project the captured inputs, sight,
weather and light at that one timestamp. Keep sequence equal to own server time
and retain fixed-past rejection. No clock clamp, new locks or replay/rule change.

Independent source review ACCEPT. Actual separate-pool PostgreSQL regression
PASS: a real later player/NPC commit preserves captured observations; a fresh
fixed-past read rejects and a later read sees both moving. Server types/scoped
lint PASS. Fresh measured SQL now81/81 PASS; migration Inspector report regenerated.
Earlier complete warmup-only run80/80 PASS; original full bootstrap wrapper
remains FAIL history, not retrospectively green. One measurement attempt refused
an existing report (`EEXIST`); preserve it and regenerate under its owned path.

The next actual world-lab run passed two-context observation, visit/interrupted
visit recovery, movement/STOP/camera and reconnect with zero page errors, then
a local stale-input guard refused a click before any POST. A subsequent run
exposed the same driver timing at STOP. Wait for a newly accepted visible UI
snapshot immediately before native input; keep the two-second freshness rule,
existing deadlines and exact409→200 assertions. Final browser/runtime/audit/PR
results remain pending. Raw logs remain under output/painted-delivery/ and
output/world-lab-ci/runtime-23210/ (local untracked evidence).

#### STOP arrival-boundary correction — 2026-10-30

The later browser run sent two real409responses and ended at STALE_REVISION;
this is different from earlier locally refused/no-POST clicks. Source exposed
an independent defect: guardedMove read/settled own arrival before the core
mover checked submitted revisions, invalidating a STOP through its own read.
In the delivery candidate, only MOVE_TO now loads cartography; STOP enters
the same unchanged core mover directly. Ownership/company/pursuit-token guards,
receipt replay, genuine stale rejection and atomic pursuit clearing remain.
Independent source ACCEPT. Real PG exact-arrival regression1PASS/5filteredSKIP,
including later exact receipt replay and no mutation for truly stale tokens.
Fresh complete measured SQL82/82PASS; migration smoke/Inspector regenerated;
server types/scoped lint PASS. One mistaken name filter skipped6tests; recorded
as NOT_RUN, followed by the correctly selected actual case above.

Driver now takes marker coordinates from the synchronous fresh-snapshot
predicate, waits for a new visible observation before each native STOP, and
awaits captured actual response bodies/tokens. Independent source ACCEPT;
latest runtime after this source correction NOT_RUN. One retry can still
legitimately lose to another worker commit; no retry count, deadline, rule or
exact409→200 assertion has been relaxed. Full current runtime/audit/commit/PR
remains pending. Logs: output/painted-delivery/stop-arrival-current.log and
output/painted-delivery/sql-stop-sequential.log (local untracked).
The STOP source/test delta is in the delivery candidate; transfer to the
retained unfinished combat tree is pending. Full game objective stays ACTIVE.

#### Full world journey and authoring-origin separation — 2026-10-30

The corrected runtime-9970 reached real pursuit/STOP409→200 with zero page
errors, but the legacy-control test requested authoring HTML on private5338
and correctly received no editor. No private allowlist was relaxed. Restore
the existing authoring workflow through a dedicated loopback5326 Vite config
without an API proxy; `dev:map` and the CI helper share it. CI collision-checks,
readiness-checks, captures and cleans only its own authoring PID. New entrypoint
declaration is explicit; no dependency/audit suppression or threshold change.

Fresh complete world browser journey PASS: two independent authenticated
contexts observe one another; real visit/interrupted-request recovery;
movement/STOP/follow/WASD/zoom/drag/resize; real Colyseus drop/reconnection;
actual pursuit then delayed STOP409→retry200 and null pursuit; legacy
checkbox-focused WASD on5326; session switch/re-entry and zero page errors.
Current Inspector/browser/SQL/migration reports merged347+2current scripts.
Evidence: output/world-lab-ci/runtime-26256/ and
output/painted-delivery/world-lab-authoring-origin.log (local untracked).
Independent infrastructure/driver SOURCE ACCEPT; shell syntax, JS parse and
scoped lint PASS. Current ordinary browser, normal audit/commit/PR remain
pending. Earlier failed attempts remain recorded; no main merge/deployment.

Live main readback now5c2b3cd7 (PR340 quick-entry/current-place, green mainCI
40967775902), ahead of this candidate base48d8a2ae. Integrate normally after
finishing the current fog merge; revalidate affected ordinary entry/place
behavior before publication. Do not overwrite that accepted work.

Current ordinary runtime after both server fixes: all8checkpoints PASS with
zero page errors. Approved Dex5618 OIDC → normal empty account/company opening
→ company-private painted tiles → Company/Place → wheel/drag/keys → exact
known-SITE MOVE_TO and STOP → reload of the same company. Real browser/API/
Vite/driver313scripts merged, output/painted-game-ci/1793314417-34536-12559/.
Together with full world journey/currentSQL82 and migration measurements,
source-matched combined runtime input is prepared for the normal commit hook.
No hosted CI or latest-main ordinary acceptance is claimed yet.

Current checkpoint,2026-10-30: the owner narrowed delivery to one campaign journey
and paused visual expansion; CURRENT_PLAN owns that finite scope. Internal pursuit
moves now reuse the observation captured under their existing transaction locks;
submitted revisions remain unchanged. Actual PostgreSQL pursuit6/6 PASS. Current
world browser and ordinary OIDC/map/movement/STOP/reload journeys PASS, pageerrors0.
Vite measurement uses its module runner and checkout-owned absolute source URLs;
exact source checks remain enabled. The world wrapper retained a stale collector
from the earlier migration report and failed collection after gameplay passed;
fresh migration capture plus replay of the unchanged current reports merged341
scripts successfully. Raw output stays in output/painted-delivery/, not a new
tracked evidence packet. Normal commit/audit and main integration remain pending.

The next normal commit attempt was refused for an unused point-helper export;
keep that helper private to its existing target predicate. The hook also reported
three failed V8 files; all23checks passed alone with unchanged deadlines. Coverage
mode now serializes files, retaining two workers for ordinary runs and all actual
in-scenario concurrency. The next hook has no failed test files, but retained one cognitive finding
in PaintedMapCanvas. Its route overlay now has a dedicated component with
unchanged projection, DOM layer and visibility; web types/scoped lint PASS.
The same cartography refresh is now a helper; static paper import avoids Vite
asset-URL rewriting that shifted generated lines without updating the dev map.
Actual source-map probe now resolves the camera function to its exact original
line78; web types/lint and current ordinary browser PASS. Normal commit/audit pending.

Delivery checkpoint — 2026-11-04. The retained candidate now groups its DOM,
camera and cartography refs in one stable map instance. The ordinary browser
collector saves the executed interaction before reloading the page. The raw
pre-reload context-menu count is1 and the post-reload count is0. Web types,
scoped lint and all8ordinary journey checkpoints PASS. The changed-file audit
PASS has zero introduced dead-code, complexity or duplication findings. The
remaining CSS findings are advisories. Output is kept locally under
output/painted-delivery/close-20261104/. Normal commit and current-main integration
are pending. ROADMAP/PROMPTS outside the repository remain owner-review drafts.

The source step was committed as `d9c0f303` with normal hooks. Resolved integration
with main`5c2b3cd7` preserves PR340 quick entry and binds Place to confirmed actual
presence for painted maps too. The shared arrival regression runs for continuous
and painted projections. Integrated web/server types,15 focused tests and8 native
ordinary checkpoints PASS. Independent final source review ACCEPT covers the
resolved source and the pinned CI artifact step. The integration audit PASS uses
target main`5c2b3cd7`, matching the prospective PR base. CI now retains sanitized
ordinary journey JSON and map screenshots for7days. Hosted execution is NOT_RUN.
Local outputs are under output/painted-delivery/close-20261104/. Normal integration
commit and publication are pending.

The normal PR340 integration commit completed as `7903a587`; its audit PASS used
existing observation tests measured separately (7PASS) after the hook replaced
that coverage. The hook's broad related run reported an editor test-file failure.
An isolated V8 rerun of the unchanged custom-battle suite is FAIL with15PASS and
3timeouts at the existing5000ms deadline. Its import took114s on this local run.
This remains failed local evidence; hosted clean CI must establish its result.

Main advanced to `b89bed3e` through PR342 during delivery. The second normal merge
preserves its explicit-check hooks and concise CURRENT_PLAN with dated history
in CURRENT_PLAN_HISTORY. Game production source is unchanged by this merge.
The CI composition retains main's hook regression plus the map artifact step.
A separate retained preview at http://127.0.0.1:5228 uses a new database named
warwrit_painted_preview_20261104 on the existing local PostgreSQL service.
Actual quick company entry and painted atlas rendering PASS in the owner's
browser. Original campaigns remain preserved. No new game balance or rewards
were added for this preview. Current-head publication/hosted gates are pending.

The second integration is committed as `0d52c37b` with the current normal hook.
Final affected source review ACCEPT covers the composed CI and history resolution.
The same editor suite without V8 instrumentation passed18/18; its earlier V8
rerun remains FAIL. The machine load was23.93 at diagnostic readback. No other
process was stopped and no test timeout changed. Current clean hosted coverage
is still required. Scoped format, plan-limit and whitespace checks PASS.

Hosted correction — 2026-11-05. [PR344](https://github.com/Vovanostm/warwrit/pull/344)
is published at`49d4ca4e`; scope41912099860PASS. CI41912100206 failed architecture
resolution of the actual paper.png?url import after format/lint passed. Later
game/coverage/browser gates were NOT_RUN. Resolve the exact trailing ?url before
normal file lookup. Ordinary architecture485files, missing-asset rejection,
scoped lint/format and independent source review PASS. No asset existence or
dependency/cycle rule was skipped. Corrected-head hosted gates remain pending.

Second hosted correction — 2026-11-05. CI41913320457 passed architecture but
web compilation resolved the camera's Pixel type through authored navigation,
which requires game-core's dist declarations before they finish building.
Move the unchanged tuple to map-camera.ts and retain its navigation re-export.
Camera/input now depend only on that shared module. Final affected source review
ACCEPT. Web types PASS; its compiler inputs contain neither game-core nor authored
navigation. Three existing camera checks PASS/17filtered SKIP; scoped lint/format
PASS. Runtime camera
logic is unchanged. Later hosted game/coverage/browser gates remain NOT_RUN.

Third hosted correction — 2026-11-05. At`5bbf6110`, CI41914938844 passed the
clean bootstrap, measured unit suite and complete world-lab browser journey.
The ordinary launcher failed before app/browser startup because its bare tmpfs
was root-owned while pinned Dex runs as1001:1001. Matched actual containers
reproduced the SQLite startup failure and then returned OIDC discovery200 with
uid=1001,gid=1001,mode=0700. Both probe containers were removed; the existing Dex
and campaign resources were preserved. Shell syntax/diff and independent source
review PASS. Shell Prettier check was unsupported because no shell parser is
installed. No game source, ports, credentials or fixture rules changed.
Corrected-head ordinary browser/audit and actual preview artifact upload remain pending.

Hosted delivery readback — 2026-11-05. At`2a63e830`, CI41918700198 PASS with
1237unit/93SKIP,10000stress battles,83actual SQL cases, measured unit coverage,
both browser journeys and unchanged quality audit. Scope41918852420 PASS.
Artifact13365629608 contains3,143,437bytes of journey summaries/map previews.

Ordinary map acceptance at that head uses the existing eight-checkpoint driver.

- OIDC entry and ordinary company opening produce the persisted company — PASS.
- The company-private painted atlas loads its authenticated masked tiles — PASS.
- Selecting a known remote marker retains the actual settlement on Place — PASS.
- Wheel/drag/keys, real MOVE_TO and STOP complete through ordinary commands — PASS.
- Reload restores the same company — PASS.

Current-head ordinary server restart, all-contract outcomes, care/payroll loop
and human first-hour/fun acceptance remain separate incomplete campaign criteria.
During CI, main advanced to`e31c5a56` through PR345. Integrate its documentation
and harness changes without changing game production source. Preserve both dated
histories and current authority. Final affected source review ACCEPT covers the
CI/history resolution. Format, plan-limit and diff checks PASS; merged-head CI
is pending. No additional local game suite was run for this documentation/harness merge.

## Accepted hunt objective markers — 2026-11-05

Owner decision in this chat is «Показывать метку цели, путь разведывать».
Branch `codex/contract-objective-markers` is independently based on main92c0f534.
Observable outcome is accepting an ordinary battle contract and seeing its named
destination on the painted atlas while the road still needs exploration.

Use the existing immutable map edition and company `QUEST_MARKER` grant with
zero terrain coverage. HUNT01–HUNT03 ACCEPT/HELP grant the objective in the same
transaction as participation and its receipt. Normal cartography reads reconcile
still-participating accepted saves from server-owned matching profile/terms. Grants retain
learned locations after departure. Map source remains the existing CHART view;
stored grant provenance distinguishes the quest source. Optional DTO questMarker
is derived from that grant and keeps the existing name label visible at overview,
including after an observed-site merge. Older readers ignore the additive field. Other quest modes retain
their source rules. No database schema, replay or combat-rule change.

Acceptance uses the ordinary entry and the existing PostgreSQL world-route tests.

- Accepted destination is present, unvisited, with unchanged charted/explored bits.
- Exact command retry creates one grant; rejected acceptance grants nothing.
- Another company remains unaware until HELP; its granted marker survives LEAVE.
- Known destination through unknown terrain still rejects without a new order.
- An accepted old save without a grant repairs it on the next ordinary map read.
- Native acceptance, named-label input and server-restart readback PASS.

Local real PostgreSQL checks for both ordinary painted-cartography scenarios PASS.
The accepted/helper/leave and isolation assertions also PASS on independent main92c0f534.
Server types and scoped ESLint PASS. Initial type errors selected an unnamed
navigation site and used untyped cartography tables through the typed query API;
both were corrected. The first SQL run found an invalid test request using the
nested revision instead of the response revision. Correcting that fixture made
the actual acceptance scenario pass. The branch transfer initially retained built
protocol types from care; rebuilding protocol/core restored a passing main-based
typecheck. [PR353](https://github.com/Vovanostm/warwrit/pull/353) is published as a
draft and owns current-head hosted CI. Source/native acceptance above remains applicable.
Full-game and care acceptance remain open under their existing owners.

Native check uses a separate ordinary world, warwrit_objective_native_20261105.
Quick-entry Company1 travelled to Brod, accepted «Знамя Харитона Обуха» and
returned to the map. The mill marker appeared over unknown terrain. Actual saved
QUEST_MARKER contains one site and zero coverage. Day/night, close/overview,
page reload and an owned server restart retain that unvisited destination.
RMB on the named label sent SITE/staraya-melnitsa and returned the actual422
MAP_INFORMATION_REQUIRED. The route and company position remained unchanged.
The earlier retained-world HELP attempt returned NOT_AVAILABLE; its prior shared
contract and all original care saves were retained. No new battle was started.
This supplies functional acceptance, with first-hour/balance acceptance NOT_MEASURED.
Captures, actual relay response and journey record remain in ignored
output/company-care/20261105/objective/.

Main lacked the already-reviewed care branch's actionable-label pointer fix.
Reuse that four-line CSS rule here so the visible objective name accepts input.
Render MAP_INFORMATION_REQUIRED with an explicit exploration instruction.
The first hot-reload capture retained the old hook message; the fresh ordinary
reload displayed the new message after the actual rejection. Web types,
scoped lint/format and the affected native input PASS. Source review ACCEPT
at8ba246ee covers marker production/SQL evidence. Final affected source review
ACCEPT includes provenance metadata, label priority, pointer input and messaging.
The visual critic first found the overview icon unnamed. Keeping its existing
label visible resolved that finding. Revised real day/night overview and close
captures pass finite marker readability/integration, all applicable scores2.
Full-atlas artistic acceptance remains open, with inherited fog/rendering gaps
and missing equal-height art comparison sheets. The current slice adds no art assets. The branch's GitHub PR
owns hosted CI and publication status. No migration or new art assets.

Main e809d0ad / PR352 is integrated before publication. Its changes are confined
to the existing harness/docs and early plan check. Marker production source and
applicable native/SQL/type results remain unchanged. Scoped plan/diff/format PASS.

Full CI41995393942 and scope41995393909 PASS at63271add, including both browsers
and the quality audit. Main then advanced through PR355 tofc130c1b, introducing
a changelog-only conflict. Preserve both entries and its accepted scoped-CI
harness. Game source remains unchanged. PR353 owns the new integrated-head CI.
