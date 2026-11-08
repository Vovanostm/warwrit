# Free global-map movement — implementation assignment

Implemented and merged (PR140–PR151, 2026-10-03…05). This page keeps the
contract and owner decisions; the dated cycle journal was removed on
2026-11-09 ([previous edition](https://github.com/Vovanostm/warwrit/blob/87e785d537fc4bf4bbb6856456391015350d235b/docs/work-packages/M1-FREE-MOVEMENT.md)).
The machine-readable contract is [M1-FREE-MOVEMENT.json](M1-FREE-MOVEMENT.json).

## Owner decisions in force

- RMB to any passable point, smooth movement, stop and retarget in transit;
  saved position and accepted order survive re-entry without teleport (2026-10-03).
- POI distances and visible party speed ×3, travel time unchanged; broad
  irregular biomes and varied materials (2026-10-03).
- Wheel over the map zooms smoothly around the cursor; LMB drag pans; roads
  wind naturally (2026-10-03).
- Route: travelled part greyed, remaining part gold and shortening from the
  party (2026-10-03).
- Trail, dirt road and paved road with distinct speeds; search minimises
  arrival time, a slower road is never forced (2026-10-03).
- Hidden hex navigation, search speed prioritised over up to 7.2% longer
  trips (2026-10-05).
- Company marker stays compact; route strokes end at the party (2026-10-04).

## Outcome and acceptance journey

In the existing authenticated game, click a traversable terrain point outside
roads/settlements, see a route and supply/ETA preview, confirm movement, watch
the actual company move, stop between sites, redirect from its actual position,
reach a settlement, and use its existing local interactions. Reload, logout/login
and API restart retain the same company, path/position and consequences.
The result must be playable in the existing Babylon/React shell, not a separate
renderer demo, local animation, fake endpoint or road-only selection renamed free.

## Concrete implementation decisions

1. Keep existing authored region/sites/roads, ink assets and fixed 3/4 Babylon
   camera. Add finite explicit walk bounds and terrain data in the region owner,
   and project that same public data into rendering and navigation. No procedural
   geography, second terrain truth, new content pack or engine migration.
2. Represent free destinations and physical positions with bounded deterministic
   integer/fixed-point coordinates and an explicit region edition. Do not accept
   NaN, Infinity, unsafe integers, unbounded paths or positions outside the map.
   Keep rendering transforms reversible and shared with picking. Inspect exact
   Babylon 9.28.0 typings and official picking documentation before using APIs.
3. The client submits destination/stop intent and revisions, never authority,
   actual position, path cost, trusted time, supply or successful arrival.
   Server/core compute the path from the real current position. Use the simplest
   bounded deterministic path calculation for the authored traversability; fixed
   tie-breaking and no corner/obstacle crossing. An unobstructed path can be
   direct. Do not add a generic navigation framework.
4. One canonical physical location owner: company lifecycle party/member
   location, with retained travel plan/segment facts as execution metadata.
   Account for all location-shape consumers and own observations and carriers.
   A stopped off-road company must have a truthful terrain location; never fake
   a settlement or encode it as “still standing at the departure village.”
   Existing local access must require actual arrival; terrain proximity must
   not grant an issuer, shop, clue, camp/F1 or encounter permission.
5. Persist accepted start/from/to/path, edition, timing/profile and epoch.
   Derive progress deterministically from explicit trusted time; do not write
   on each rendered frame. Pure core has no I/O, clock calls or randomness.
   STOP/REROUTE settle the earned elapsed interval first and retain the physical
   position at that server time. No jumping to source/destination, lost inventory,
   double food/wages/stamina settlement or reused superseded segment.
6. Extend the existing trusted root/executor/effects and PostgreSQL transaction;
   no second canonical snapshot or sidecar position pretending to be authority.
   Authenticate first; ownership before receipt disclosure; exact receipt replay
   before freshness evaluation. Changed body under the same ID must conflict.
   Keep one lock order and one root CAS. Stop, move, worker continuation and
   existing commands must serialize. Publish success only after commit.
7. Add explicitly versioned free-movement protocol/storage semantics. Preserve
   V1/V2 DTOs, stored responses, region editions and in-flight old road routes.
   Never recalculate an old ETA, rewrite history or require resetting the world.
   If compatibility needs a migration, use the new ordered pair only and preserve
   recorded data on rollback. Unknown versions fail closed.
8. Keep existing food, stamina, wages, capability, camp/F1, active encounter and
   learning guards. Movement of people/items must agree. Dangerous location/path
   access and supply checks cannot be bypassed by clicking beside a site or
   crossing off-road. Preserve real safe return semantics; no invented starvation,
   free gear, rescue/carry producer or automatic camp. Request the parent only for
   a concrete new product conflict. Numeric terrain penalties are not approved;
   use existing provisional travel parameters, centrally versioned. Document a
   finite speed calibration without changing Campaign/Light clocks; measure a
   representative trip rather than claim final 20–30 minute contract balance.
9. UI: terrain click selects destination and highlights path; confirm with visible
   ETA/supply preview. Settlement click remains useful. “Остановиться” works during
   travel, a new destination redirects from current position. Drag/pan/zoom must
   not issue a movement command. Show moving/stopped/offline/rejected/unknown
   outcome states with safe exact retry. Abort/ignore stale requests after company
   or session switch; late old success must not replace current movement.
10. Keep the map legible: map boundary, passable/blocked areas where authored,
    chosen point, route and banner position. Reuse current assets; no asset
    generation, copied BB art or cosmetic overhaul before this journey works.

## Acceptance scenarios and proportionate verification

Implement the shortest full journey first; then verify important invariants
through existing public boundaries. No helper-test/count target.

- Move from a settlement to an off-road point, stop mid-path, redirect from
  that actual position, arrive at another settlement and retain normal access.
- Malformed/out-of-bounds/blocked destination rejects atomically. Camp, encounter,
  incapable member and other existing movement blockers remain effective.
- Two simultaneous conflicting movement commands cannot create two active paths.
  Exact retry, changed-body retry and foreign account/company behave correctly.
- Old worker/arrival after stop/reroute cannot resurrect an obsolete path.
  Food/carry, stamina, money, people and containers are preserved/settled once.
- Reload/re-auth/API restart resume accepted movement; stop remains stopped.
  V1/V2 road state and historical response replay still work.
- Ground picking agrees with displayed location; pan/drag does not move; stale
  replies and lost-response retry never display an invented accepted position.

Build affected workspace exports before tests, then use repository commands:
`pnpm --filter @warwrit/game-core build`, protocol/testkit builds as needed;
focused vitest runs for world routes/travel, physical travel, server movement and
web controller; game-core/protocol/server/web typechecks; targeted formatting,
lint and architecture checks. Record command exit and actual results.
Do not run full bootstrap/gate on every edit or change CI to hide failures.
Parent owns final integrated gate and independent review.

Worker owns only local node_modules/dist in this worktree and frozen-lockfile
dependency installation if needed. Parent owns all DB/service/browser lifecycles;
do not use shared ports/DB, default compose project or cleanup existing volumes.
If a real-DB/browser check needs resources, report READY_FOR_RUNTIME with the
exact launch instructions and parent will allocate an isolated stack. Never
replace real transaction/browser evidence with mocks or label skipped tests pass.

## Road speed and types cycle — 2026-10-03

Owner request: update the wiki and implement substantially faster roads with trail,
dirt road and paved road types. The chosen calibration and research rationale are
owned by [the wiki](https://github.com/Vovanostm/warwrit/blob/87e785d537fc4bf4bbb6856456391015350d235b/docs/wiki/m1-spec.md#скорость-дорог-и-пересечённой-местности--2026-10-03)
and JSON revision 3.4.0. This is a tested initial calibration, not measured final
balance or a universal human walking-speed table.

Implementation in retained `free-world-movement` checkout, branch
`codex/free-world-movement-v3`: V4 geography uses V3 speeds (grass 1000, forest 600,
hills/riverbank 800, rock 500, marsh 300; trail 1400, dirt/bridge 1800,
paved 2000, ford 550). Base speed and world clocks are unchanged. Road bank widths
are 96/112/144fp with the retained authored bends and edge variation. Three shared
materials show a narrow earthy trail, rutted dirt and grey paving.

Time costs and the A* lower bound use the selected profile. Smoothing preserves a
beneficial road detour; a slower remote road is not compulsory. The fastest road
wins at a junction, with bridge precedence. Independent review found that the
stationary label initially chose a different overlapping road; the corrected
public comparator now owns the same selection in navigation and the label.
V2 accepted plans, receipts and deadlines retain their original coefficients;
V1–V4 positions remain readable. No migration or data reset.

Actual focused checks: core build; 10 public free-movement specifications
(including beneficial/slower detours, smoothing, overlap order and bridge
precedence, retained/current profile reload and forged-speed rejection);
web/server typechecks and builds; edited-code ESLint/Prettier and ordinary diff
check. Five world/company/food specification files passed against a disposable
PostgreSQL 17 database after all pending migrations applied. No database test
used the existing player database. The full bootstrap/quality gate was not rerun
for this incremental tuning; the previously recorded branch quality limitation
remains outside this slice. No commit/push/merge/deployment.

Actual browser journey through normal Dex login and company creation:

- North Court → Stone Ford followed paving, showed ×2 and restored its moving
  route after page reload, then arrived in the settlement.
- Stone Ford → Quiet Causeway accepted a road route of 66,735,850us vs
  94,423,092us for the straight chord in the same geography/profile; the UI
  showed dirt ×1.8. STOP cleared the line and retained exact terrain coordinates
  `(94318654, -44040192)` in microFp. Reload preserved the stopped point; the next
  accepted route started at exactly that point and arrived in Quiet Causeway.
- Right-clicking the safe trail approach toward Old Mill accepted a 35,712,845us
  route containing trail speed 1400; the daytime UI showed trail ×1.4.

Current screenshots are in the absolute directory
`/Users/vovanostm/.codex/visualizations/2026/10/03/01a10318-def8-76f0-a8a7-a784e3814a52`:
`road-paved-moving.png`, `road-reload-moving.png`, `road-dirt-moving.png`,
`road-stop.png`, `roads-overview-day.png`, `road-trail-moving-day.png`.
Independent read-only road critic reviewed the current source and these six
captures and found no remaining material defect. It did not operate the browser;
journey and SQL observations came from the author. Optional advice: increase
trail/dirt colour distinction at overview scale. Other devices/scales, subjective
speed enjoyment and final game-wide balance remain NOT_MEASURED.

Runtime closeout: after the parallel route-presentation chat became idle, the
existing API was gracefully restarted with its retained configuration; readiness
returned OK. Normal login at `http://127.0.0.1:5287` restored the existing company
and showed the new paved/dirt/trail geography without changing its stopped
position. Main-game capture: `roads-main-overview.png` in the same screenshot
directory. The separate checking API/web processes and their specifically named
Dex/PostgreSQL Compose projects/volume were removed. The player runtime/database
were retained. Try the existing game: right-click a settlement or road; S stops.

## Navigation topology experiment — 2026-10-04

Owner authorized implementation and comparison after the initial hex-map research.
[Owning result, reproduction and limits](https://github.com/Vovanostm/warwrit/blob/87e785d537fc4bf4bbb6856456391015350d235b/docs/wiki/m1-spec.md#эксперимент-и-реализация--2026-10-04)
records the finite matched experiment. Production remains square `polygon-v1`;
static road-edge costs and surface priority preparation now live in the derived
field, not each search. Opt-in six-neighbor hex search uses the same polygons,
roads, clearance, speed profiles and exact endpoints; it is not a new map edition
or accepted world-generation rule. Existing accepted V2/V3 paths/schedules remain
frozen. No migrations, transport changes or clock/balance changes. Local isolated
branch `codex/map-topology-experiments`; no merge/deployment authorization.

Local closeout 2026-10-05: final bootstrap PASS (verify 631,47 skipped; stress 10000;
migration smoke/up and 14 PostgreSQL/auth checks); separate movement PostgreSQL 11
and affected domain 20 PASS. Supplied browser move/STOP/reload/reroute retained
exact endpoints; independent read-only critic found no confirmed navigation defect.
Measured p95 remains above 50ms; VM capacity/FPS/memory and full M1 acceptance are
unproven. Historical failed attempts and unchanged bounds are in the owning wiki.

### Hex route optimization amendment — 2026-10-05

Owner explicitly chose hex search speed after being shown the measured≤7.2%
journey-cost penalty. This supersedes the previous square recommendation for
new polygon-v1 orders in the local isolated branch. Legacy square navigation
and accepted V2/V3 schedules remain; geometry, speeds, clocks and storage stay
unchanged. Compiled sorted neighbors/costs and≤16 exact two-chord detour checks
improve both search variants. [Owning rationale, matched results and checks](https://github.com/Vovanostm/warwrit/blob/87e785d537fc4bf4bbb6856456391015350d235b/docs/wiki/m1-spec.md#почему-гексы-и-оптимизация-маршрутов--2026-10-05)
retain failures and limits. Full any-angle optimality/VM capacity remain unproven;
no merge/deployment. Final bootstrap PASS:633unit/47skip,10000stress,migrations/14DB/auth checks.
Actual RMB/S/reload/reroute/arrival retained exact points; independent source and
supplied-evidence critic found no material defect. Separate movementSQL-suite
NOT_RERUN; overview/close/FPS/VM/full-M1 limits remain in the owning result.
