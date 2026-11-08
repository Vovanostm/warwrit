> 2026-11-08, WLC-07: standalone Navigation Lab is retired. Use
> [Unified Map Editor](../engineering/UNIFIED_MAP_EDITOR.md) and `pnpm dev:map`
> on the authenticated Playground stand. Historical commands/results below
> describe the former tool; atlas v6 and navigation rules are preserved.

# Painted world-map navigation stand

Dated cycle journal removed 2026-11-09 ([previous edition](https://github.com/Vovanostm/warwrit/blob/87e785d537fc4bf4bbb6856456391015350d235b/docs/work-packages/WORLD-MAP-NAVIGATION-LAB.md)). Owner map decisions live in [the map page](../wiki/world/map.md) and [fog of war](../wiki/world/fog-of-war.md).

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

Current integration readback — 2026-11-05. Full CI42000045363 and scope42000045335
PASS at3374894b. Main then advanced through documentation-only PR356 to6c525840.
Retain both changelog entries; no gameplay source changed. PR353 owns the latest
integration CI. Merge permission remains required.

Merged objective-marker readback — 2026-11-05. Owner explicitly approved normal
PR353 merge atb9f150ba after green applicable CI. Full CI42003635623 and
scope42003688757 PASS, no review threads/blockers. Merge81e7931b is on main and
its tree matches the approved candidate. This closes the finite marker slice;
the inherited whole-atlas art limitations above remain open.
