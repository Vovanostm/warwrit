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
full run and affected rerun. Independent source/visual ACCEPT; normal audit pending.
Post-refactor related coverage996 PASS/61 skipped, four real-PG cases PASS;
final script/server types and scoped lint/format PASS. Native network18/legacy18
and actual SDK reconnect PASS. Optional source-matched engine coverage preserves
the normal audit thresholds; final audit remains pending.
Detailed results and limits belong to the [map page](../wiki/world/map.md#сетевая-лаборатория--реализация-2026-10-26).
