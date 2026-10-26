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

Local integrated review and hosted CI pending. Migration impact: none.
The workflow's clean-checkout bootstrap owns full verification; do not run duplicate
full gates locally and remotely. Focused local checks remain proportional.
