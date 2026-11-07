# WLC-07 — Unified Map Editor

2026-11-08; owner assignment, P1; dependencies WLC-03/PR421 and WLC-05/PR426
are merged in base `fdbb0dc2`. Writer: `codex/wlc-07-map-editor`.
Implementation and standalone PR authorized; merge/deployment are not authorized.

## Journey and contracts

An authenticated allowlisted developer opens `/dev/playground/maps`, chooses
World Map or Battle Map, creates a draft from the current atlas v6 or existing
combat catalogue, edits geometry/properties, saves, validates and previews.
Errors identify selectable objects on the map. Saving any edit returns the
document to Draft. Validation errors retain the saved draft for correction.
Clone and versioned import always create independent Draft documents. Reload
and server restart read persisted documents without altering a game world.
Lost command replies retain the exact request for retry; stale revisions refuse
overwrites. Unsaved changes block validation/export/preview and switching maps.

World authoring uses the existing NavigationRegion, buildNavigationField,
findTravelPath and compileMovementPlan. Road stations own derived navigation
nodes/links; there is no separately editable competing graph. Surface IDs and
movement costs remain the current game-core speed profile. Blockers constrain
movement; site anchors retain existing content IDs. Required places and road
connections are fixed compatibility checks, not removable validation switches.
World preview overlays the server-compiled graph and routes on atlas-v6.png.

Battle authoring reuses BattleEditor, CombatLabBattleConfig, isCustomBattle,
createCustomBattleFixture and the existing Babylon BattleView. The current
rules support 15×11 hexes, terrain plain/mud/fire, elevation 0–2 and blockers.
Participants are spawn points; deployment metadata must contain their side's
spawns on walkable cells. Cover/visibility and arbitrary movement-cost overrides
are not current editable rules. Scene metadata stays in the existing battle map.

## Persistence and delivery

Extend the existing protected Playground scope, not its combat scenario schema.
Dedicated `playground.map_documents` and `map_receipts` persist authoring work;
no canonical world tables are writable. Migration 0023 avoids WLC-06's in-flight 0022. Commands serialize revision changes and exact receipts atomically.
Documents persist independently of sandbox TTL (64 per account, including
deleted tombstones; 1024 commands per document). Exact retries remain readable.
Draft metadata and immutable publication artifacts live in the same transaction.
Documents are bounded per account; draft shape is checked before storage and
semantic validation invokes current rules on the server.

Draft → Validated → Exported → Published are server-owned states. The authoring
command endpoint refuses publish. The separate Content delivery screen at
`/dev/playground/maps?delivery=1` requires an exported revision and explicit
PUBLISH acknowledgement. Its own API revalidates current rules and registers
that exact exported artifact as immutable, with a `new-worlds-only` policy.
Published documents are frozen; clone starts a new editable Draft. A publication
is read from its atomic receipt, not reconstructed from mutable draft metadata.
Choosing an artifact for a new game-world launch remains a separate configuration
step; no automatic world assignment, deployment or live-world migration is added.
Artifacts include schema/content revisions, source document/revision and a
compatibility declaration requiring new-world or explicit world-revision review.
Import checks these versions and revalidates; an exported artifact is never
automatically selected by gameplay or assigned Published status. Existing world
references/editions and saved plans remain unchanged.

## Parity and acceptance

- Retain current atlas v6, camera pan/zoom, geometry and road diagnostics.
- Reuse the combat tile/participant editor rather than adding another painter.
- Remove standalone map import/export controls from the reusable BattleEditor;
  existing battle presets and local battle saves remain intact. Map artifacts
  now have one versioned lifecycle. WLC-06 separately owns standalone Combat Lab
  retirement (PR428 remains open; it is not a dependency of this delivery).
- Retire the standalone navigation lab entry after transferring road diagnostics
  and server route preview. World Lab remains a multiplayer/cartography test,
  not an alternative content editor. Combat Lab retains scenario controls.
- Check world: edit a road station/blocker, save, see an object-linked error,
  correct, validate, request server route, export/import/reload.
- Check battle: paint terrain/elevation/blocker, place participants/deployment,
  save, validate, preview with current assets, export/import/reload.
- Check authorization, owner isolation, stale revision/exact retry, version
  refusal, export gates, persistence and unchanged canonical world rows.

## Try the two editor journeys

Use the existing [Playground authentication/allowlist setup](DEVELOPER_PLAYGROUND.md),
apply migrations with `pnpm db:migrate:up`, start the normal development API/web
stand and open `/dev/playground/maps` (`pnpm dev:map` opens the web entry).
Full atlas bytes are served by the authenticated API; the ordinary game Vite
origin continues to deny direct atlas file access.

1. World Map → New draft → select a road in the object inspector. Edit stations
   and apply properties, save and Validate. Select an error to focus its object;
   fix the corridor, save/validate, then Preview. Select route start/end on the
   map and request the server route. Wheel zooms; drag pans. Export artifact v1,
   import it and reload: an independent saved Draft is selected.
2. Battle Map → New draft → paint terrain/elevation/blockers and place participants
   using the existing palette. Edit deployment zones or derive them from spawns.
   Save/Validate, select any error to highlight its hex, correct and Preview.
   The editing board uses wheel zoom and Alt-drag pan; camera actions do not paint.
   Babylon preview retains its day/night, grid, overview and camera controls.
   Export/import creates another Draft, without starting a game encounter.

## Results — 2026-11-08, PUBLISHED

- 52 focused tests PASS across six files, including 3 real PostgreSQL editor
  scenarios, current atlas regression, road diagnostics and existing battle
  editor/HUD tests. The world journey exercises a real retained hunt genesis
  (wallet, hostiles, revision and IDs), whose canonical row remains unchanged
  through authoring and explicit artifact publication. No player-owned save used.
- PostgreSQL scenarios cover simultaneous exact retry/conflict, stale revision,
  owner/origin/session isolation, private atlas access, broken road continuity,
  invalid corridor object coordinates, deployment/spawn errors, server route and
  exact duration equality with gameplay functions, export/import/version refusal,
  publication acknowledgement/freeze, clone independence and app reconstruction.
- Chromium1440×1000: World road error → focused marker → correction → validation
  → server graph/route → day/night → zoom → export/import/reload PASS. Battle
  invalid deployment → marked hex → correction → terrain/elevation/blocker paint
  → validation → current Babylon assets/day/night/overview → export/import PASS.
  Both editor cameras and battle reset checked; pan/zoom did not paint.
- Separate Content delivery: disabled without acknowledgement → PUBLISH → exact
  exported revision registered → Published frozen in editor → import as Draft PASS.
  Two real saves lost their server replies; reload/exact retry retained one
  revision increment per save (final revision2), cleared pending and blocked new
  commands while uncertain. This used an exclusively owned local test identity/DB.
- Frozen dependency install, shared library builds, server/web types, scoped
  ESLint, architecture, migration0023 up → down → up and production builds PASS.
  Production server artifact returns404 for map/delivery/atlas APIs; browser
  artifact contains no Map Editor implementation. Existing chunk-size warning
  remains. Ordinary server source still guards production registration independently.
- Self-review caught generic corridor errors without object markers; existing
  pure geometry errors now carry object IDs while preserving RangeError messages
  and caught causes. Native checks exposed passive-wheel page scroll and zoomed
  battle SVG intercepting toolbar input; corrected listener/viewport clipping and
  repeated the affected input checks. Dirty drafts warn before navigation/close.
  Intermediate browser probes also used an unsupported CLI callback signature,
  an incorrect light-button selector and a relative API URL; corrected probes
  above distinguish harness failures from product defects. Transitional HMR
  errors were cleared by a fresh page load; final mounted source types/lint pass.

Self-review and documentation readback accompany the commit. CI, full suite,
full M1, broad art acceptance, hosted operation and automatic game-world content
activation NOT_RUN. Capacity/heap/FPS/enjoyment NOT_MEASURED. No merge/deployment
or retained-player-world writes. Publication here describes a test artifact in
an isolated preparation catalogue, not a game-world rollout.

[World error](evidence/wlc07/world-error.png) ·
[World editor](evidence/wlc07/world-editor.png) ·
[Battle preview](evidence/wlc07/battle-preview.png) ·
[Content delivery](evidence/wlc07/content-delivery.png).

## Publication — 2026-11-08

PUBLISHED [PR429](https://github.com/Vovanostm/warwrit/pull/429), implementation
`82cb5994fcd8a15d1d73f12a360039ae378d5284`, base `fdbb0dc2`. Both reproducible
editor journeys, SQL evidence and screenshots accompany the PR. Self-review,
changed-file formatting/local links and scoped whitespace PASS. CI is advisory;
hosted completion is not awaited and no hosted PASS is claimed. No merge or
world rollout is authorized. Owned browser/API33507/web53507 and the exclusively
owned PostgreSQL54507 container/volume were removed; other stands and saves remain.
This documentation receipt changes no executable source; repeated game checks NOT_RUN.
