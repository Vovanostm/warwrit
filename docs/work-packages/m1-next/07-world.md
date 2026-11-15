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

## Current result — 2026-11-08

SPECIFIED / LOCAL; complete observer/travel/offline matrix NOT_RUN here.
Painted private atlas and server-owned movement already exist; WLC-08 reports
actual travel/restart, using explicitly accelerated QA time.
Next: inspect actual cartography/surroundings authority and select one missing row.
[Common contract](COMMON.md). [Prompt](prompts/07-world.md).

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
