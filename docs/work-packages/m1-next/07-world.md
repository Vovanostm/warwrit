# N07 — Lawful world knowledge and durable travel

## Accepted presentation — 2026-11-13

The owner selected distinct unknown, explored and currently visible terrain on
the single global M1 atlas, with dated old markers. Source and age remain tied
to authorized knowledge. [Owning map rule](../../wiki/world/map.md#знание-на-глобальном-атласе--решение-2026-11-13).

For W1, observe a place, leave its visibility, then inspect its retained marker
and date while a second lawful observer supplies a changed current state.
Return to view and verify the refreshed authorized observation. Check unknown,
explored and visible terrain by day/night and confirm an old marker keeps its
last known position. Fresh browser/SQL conformance checks are NOT_RUN.

## Current result — 2026-11-16

IN_PROGRESS / LOCAL; N07 observer, travel and offline acceptance remains open.
The dated marker projection is implemented, and a native owner route now covers
reroute, S-key STOP, a new route from the stopped position, tab close/reopen and
arrival. T025's remote-selection place boundary is demonstrated. The full
two-observer/native day-night journey remains open. Focused PostgreSQL checks,
including the obsolete-arrival worker regression, are recorded below.
Continue with the accepted observation → leave visibility → changed second
observer → return and refresh scenario.

### Known-route search — 2026-11-16

LOCAL — movement path search now accepts an optional authorized segment rule.
Painted cartography supplies the authenticated company's decoded charted and
explored knowledge before route preparation; physical walkability and the final
known-plan check remain in force. Exact replay and saved route execution keep
their existing behavior.

PASS — a focused regression reproduces the faster unseen paved-road detour and
confirms both exact and legacy search choose the slower fully known route when
given the segment rule. The 13-test free-movement suite, game-core typecheck,
server typecheck and diff check PASS. Native journey and database checks are
NOT_RUN; full N07 acceptance remains open.

### World-lab known-route adapter — 2026-11-16

LOCAL — authenticated world-lab ground orders now pass their observer's known
segment rule into route search, matching the ordinary painted-map adapter. The
final plan knowledge check remains as a safeguard. This prevents a faster
unexplored road from rejecting an otherwise valid known route.

PASS — known-route regression, server typecheck and diff check. The grouped
free-movement run had 12 passes and one existing road-junction timeout under
load; rerunning that case alone passed. Native and database checks are NOT_RUN;
N07 acceptance remains open.

### Prior checkpoint — 2026-11-08

SPECIFIED / LOCAL; complete observer/travel/offline matrix NOT_RUN here.
Painted private atlas and server-owned movement already exist; WLC-08 reports
actual travel/restart, using explicitly accelerated QA time.
[Common contract](COMMON.md). [Prompt](prompts/07-world.md).

### Dated marker presentation — 2026-11-16

LOCAL — the authorized cartography DTO now carries optional current visibility
and a campaign day/tick derived from each stored `lastObservedAt`. Observations
before world genesis retain their original timestamp instead of failing the
map projection or receiving an invented campaign day. Chart grants remain
chart-sourced and undated. Stale observed markers show their last-seen date and
keep their accessible site name; chart markers identify the map as their source.
The existing map hint now names wheel zoom.

PASS — focused cartography and rendered-markup tests (6 tests); core/protocol
builds, server-projection and web type checks; Prettier and `git diff --check`.
Full server typecheck was attempted but could not resolve missing `pngjs` and
testkit packages in the available dependency tree. Two-observer/native day-night
acceptance and fresh browser/SQL conformance remain NOT_RUN; N07 remains open.

Parent integration passes both server/web typechecks and seven focused tests.
A cached campaign-date response without its new tag caused an observed renderer
error during the development update. The renderer now accepts that prior shape,
with a regression. The visible map hint includes wheel zoom. Native inspection
also found dates overlapping site names. Dates now share the measured label
layout with their site, including its full height and per-line width; actionable
places retain overview labels. The retained owner map shows its saved observation
dates after ordinary retry/reload. The complete paired-observer matrix remains
open. Captures are in `output/playwright/m1-dated-atlas-*20261116.png`.

## Player problem and result

### Native movement checkpoint — 2026-11-15

The retained N01 company issued a normal Old Mill MOVE_TO, then stopped with S.
STOP returned ACCEPTED, retained terrain point
`88122332/-5948799` in micro-fixed-point coordinates and changed movement epoch
33 to 34. A full page reload retained stationary terrain mode. A new right-click
on Old Mill accepted a route from that position. This demonstrates the normal
STOP/reload/new-path controls. Old-arrival replay, exact retry and the complete
offline/observer matrix remain NOT_RUN here.

The independently created helper received the real refusal for an Old Mill
route crossing unexplored terrain, then accepted a nearby visible-frontier
movement order. The destination marker alone did not disclose the intervening
route. The complete three-state/dating/two-observer acceptance remains open.

### Native reroute, STOP and return — 2026-11-16

The retained N02 owner issued MOVE_TO Gat at epoch 49, campaign tick 82963,
from `81920000/33751040`. A reroute to North at tick 82968 advanced to epoch 50
from the then-current position `88879953/19418612`. Pressing S at tick 82976
returned ACCEPTED, advanced to epoch 51 and left the company stationary at
terrain point `73389256/59117948`. A new North route at tick 82977 used that exact
point as `plan.from`, targeted `-15597568/75038720`, and recorded duration
`344159593` microseconds. This demonstrates that reroute and STOP retain the
actual traversed position and that the next route starts there.

The game tab closed at 05:06:55 UTC and reopened at 05:23:02 UTC; no QA-clock
advance was applied while it was closed. On reopening, ordinary arrival at North
retained `438.71`; the Scout and RoadTracks were paid. The return report spans
campaign ticks 82928–83025 (97 ticks, including prior play), records `1.94` in
wages and zero ration units. Separate API-process restart evidence for a saved
in-flight route at epoch 61 is recorded in
[N11 DUR-2](11-durability.md).

PASS — this native owner control sequence covers reroute → STOP → new route from
the stopped point → tab close/reopen → arrival and the associated return report.
No speed/profile change or Light-phase boundary was recorded. This does not
claim a stale-arrival or exact-retry attempt; N07's paired-observer/day-night
journey and those stale-arrival/exact-retry checks remain open. No stale-arrival
run was performed here.

The player must distinguish what a map describes, where the company has been,
what it sees now, and what someone merely reported. A chosen route must stop,
change and resume predictably without teleporting or revealing hidden entities.
Try: two ordinary accounts → compare lawful map/entity knowledge → travel →
STOP/reroute → disconnect → reconnect at actual persisted position.

## Owning sources and dependency

N01; [world foundation](../M1-WORLD-FOUNDATION.md),
[travel](../M1-WORLD-TRAVEL.md), [movement](../M1-FREE-MOVEMENT.md),
[knowledge](../../engineering/K01-WORLD-KNOWLEDGE.md),
[vision/offline amendments](../../wiki/vision.md), [M1](../../wiki/m1-spec.md).
Existing#388–#391/#177; actual map-context/cartography/clock/route producers.
Newer dated decisions outrank older safe-route drafts; preserve released behavior.

## Leaves and full behavior

- W1/#389: server distinguishes chart/grant provenance, explored terrain, current
  observations and source/time-qualified rumour/last-seen data. No exact current
  location inferred from a rumour. An already public overview map is not made
  retroactively secret. Two companies may lawfully know different things.
- W2/#390: preview explains route/cost/supply assumptions without mutating state;
  confirmation revalidates actual position/party/capability/edition/revision.
  STOP and reroute retain real position and invalidate obsolete arrival; retry
  cannot resurrect an old segment or consume food twice.
- W3/#391: accepted continuation/offline policy and independent Campaign/Light
  clocks persist through restart. Apply ONLY source-defined camp, AI travel,
  attack/autobattle and supply effects with actual producers. State what occurs
  on logout, return and missing mandatory effect; never call unsupported offline
  combat safe. Ambiguous camp rates/hunting outputs require a bounded decision.
- W4/#388: where required, owner plus exactly the accepted helper participate
  physically with fresh opt-in terms, own people/knowledge and lawful admission.
  Seeing/joining another company never teleports it or mints a second bounty.

On invalid/new dangerous departure apply accepted supply rules and truthful
feedback. Preserve valid return/camp exceptions only under their actual authority;
do not manufacture a safe escape. Missing carrier/custody/camp producer means
no successful placeholder movement. Read/reload itself cannot advance a command
except through the existing authorized settlement path.

## State and architecture

One world-clock owner; canonical server route/executor owns company position,
route edition/cursor/receipt and real elapsed effects. Web/Colyseus are projections.
Keep chart/exploration/current knowledge separate in authorized output.
Preserve exact saved route/version/due-time and released replay/receipt semantics.

Candidate scopes: server `world/cartography.ts`, `map-context.ts`,
`surroundings.ts`, `continuous-movement*`, `route-*`, clock/repository only
for the selected row; narrowly required encounter admission; web WorldMap/
PaintedMapCanvas/TravelPanel/FreeMovementPanel and authorized DTOs; core owning
route/knowledge definitions. Reserve exact files and one clock writer.
OUT: new region, rebuilt atlas, global NPC simulation, new clock or renderer.

## Work plan

1. Map actual trusted inputs and authorized output for two lawful companies.
2. Select one missing W-row; write its transition/refusal/offline table from
   current source, explicitly isolating unresolved policy.
3. Reproduce it through ordinary map/travel controls and observe actual receipts.
4. Fix the smallest leak, stale-route or missing authorized consumer; maintain
   one canonical transaction and compatibility.
5. Exercise reload/STOP/reroute, delayed old arrival/exact retry and real restart.
   Use real SQL for changed race/position/food atomicity.
6. Test paired observer histories: equal authorized observations should not differ
   solely because hidden company/entity state differs.
7. Record actual clocks/time acceleration, route/provider limits and per-row result.

## Acceptance / DoD

- [ ] WORLD-1 Chart, exploration, current entities and rumours retain distinct
      authority/provenance; two-account API and UI reveal only permitted facts.
- [ ] WORLD-2 Preview is non-mutating; departure/STOP/reroute are lawful and old
      arrival/retry cannot move a new route, duplicate food or partially advance.
- [ ] WORLD-3 Accepted offline continuation and Campaign/Light behavior recover
      after real restart with same edition/cursor/time and required real effects.
- [ ] WORLD-4 Actual owner/helper presence/consent and separate company identity/
      property/knowledge survive admission, refusal and reconnect.
- [ ] WORLD-5 Supply/carrier/encounter/camp refusals follow current accepted rules;
      unsupported material offline effects remain explicitly unactivated.
- [ ] WORLD-6 Saved location, knowledge, resources, route and receipts persist;
      source, normal-time and accelerated observations are distinguished.

## Checks and blockers

Browser two-account journey, existing focused knowledge/travel tests and real DB
for changed route authority/races. Do not run a broad performance campaign here.
A missing accepted offline producer/policy leaves WORLD-3's affected subcase open;
complete safe known rows and report the recommended bounded decision.

### Marker hit area correction — 2026-11-16

Two native helper terrain clicks near `(32,-160)` and `(-32,-160)` posted
`SITE staraya-melnitsa` because the multiline label bounding box intercepted
them. Marker groups and labels now pass pointer input through to the map.
The explicit circular hit area still selects the place, and keyboard selection
remains available. After reload the same helper clicked terrain beside the Mill label. The actual
`TERRAIN (20,-153)` request returned HTTP 200 ACCEPTED, revision 100, epoch 43,
with a 41-second route. Full Old Mill arrival remains pending. LOCAL.

## Focused travel persistence and remote-place boundary — 2026-11-16

LOCAL. Five selected PostgreSQL regressions passed on disposable per-file clones
(25 unrelated cases skipped): concurrent STOP/MOVE_TO admits one intent, a due
STOP settles once with site-anchor classification, a V2 itinerary continues and
completes after offline boundaries, masked cartography respects company scope and
exact movement replay, and accepted hunt grants expose the destination without
its hidden road. Both clones were disposed. The output is retained at
`output/m1-travel-focused-20261116.log` in the integration worktree. These cases
do not submit an obsolete arrival candidate after a reroute.

For T025, the ordinary map selected distant Каменный Брод while the company
remained camped at Северный Двор. The Path panel named the selected destination;
opening Место still showed «Локация: Северный Двор», «Ваш отряд здесь» and the
actual local entrances. No movement command was sent and cash remained 438.71.
Captures are `.playwright-cli/page-2026-11-16T05-57-47-344Z.png` and
`.playwright-cli/page-2026-11-16T05-58-09-652Z.png`. Three focused GameShell cases
also passed for distant selection and arrival disagreement. This closes T025's
bounded ordinary local-access check. Building entry remains a client-side
context under its existing contract.

T023's remaining direct Campaign/Light reentry observation follows below.
T024's paired changed-observation sequence remains open; the separate
post-reroute stale-arrival worker result follows below. No speed-selection control is required by the
accepted MOVE_TO/STOP interface.

## Independent clocks across ordinary re-entry — 2026-11-16

LOCAL. The helper's normal logout/login showed Campaign Day 85 tick 154 before
logout and tick 158 after login. Light remained at night, its countdown moving
from 4:04 to 2:50. No Light-phase boundary was crossed. The return report covered
its own longer saved absence window (0.012 campaign days), recording zero ration
units, 0.12 crowns newly accrued wages and 1.41 unpaid. That report interval is
not identical to the two captured UI timestamps.

The same saved company, local position, Ratko's FIELD membership, 715.86 crowns
and inactive service were retained. This directly observes independent Campaign
and Light progression through normal re-entry, complementing the earlier owner
STOP/reroute/offline-arrival and saved-route restart evidence. T023's bounded
movement/time journey is complete. N07's complete paired-observer/day-night
matrix retains its own open rows. The obsolete-arrival worker check follows.

## Obsolete arrival candidate after reroute — 2026-11-16

LOCAL. The new focused public-executor PostgreSQL regression starts movement,
retains its worker candidate and original arrival time, stops partway and
reroutes to a later destination. Processing the earlier candidate at its former
due time leaves the company snapshot, complete current route row and receipt
count unchanged. The worker rereads the current route rather than applying the
previous segment. This closes the specific stale-arrival regression gap without
adding a transport action or changing production behavior.

The selected case passed 1/1 (13 unrelated cases skipped); its per-file clone
was disposed. Output is retained at `output/m1-stale-arrival-20261116.log`.
Scoped ESLint, Prettier, server typecheck and diff checks passed.
The earlier five-case movement/privacy union remains applicable. N07's broader
preview, paired-observer and day/night criteria remain separately open.
