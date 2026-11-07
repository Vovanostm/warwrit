# WLC-03 — Combat assets and atlas consolidation

2026-11-07; branch `codex/wlc-03-assets`; base `79a6ba02` (WLC-01 merged).
Owner request authorizes implementation in an isolated worktree, review, PR and
merge. No deployment, real-save writes or coordinate migration is authorized.
WLC-02 owns renderer-spike/PlayCanvas; this slice does not touch that experiment.
The graph index belongs to the dirty primary checkout at7841632a, not this
worktree. Tracked files and resolved literal references are used as source proof.
No canonical game rule or Airtable decision changes.

## Player goal and unchanged behavior

The player opens the normal company map, selects a reachable destination, travels,
stops/resumes and reloads with the same saved location and accepted route. The
painted world continues to show atlas v6, its two repaired road connections and
no former field shortcut. Water remains blocked except at the existing bridges.
A normal encounter uses the existing sprite Command desk HUD, with selection,
movement/attack input, day/night presentation and terminal feedback preserved.
The editor opens only v6; old query parameters cannot select historical maps.
An unreachable goal retains the existing refusal; retry and saved consequences
remain server-owned. Existing legacy worlds retain their own geometry/readers:
selecting painted content does not convert a legacy company's coordinates.

## Implementation boundary

- Keep all currently referenced sprites, B023 fixture, unarmed fallback, terrain,
  UI icons, style references and public map symbols/fog.
- Archive superseded combat sprites, HUD concepts/galleries and old atlas raster/
  authoring generations outside the production distribution, with source revision,
  per-file checksums and restoration instructions. Preserve original metadata.
- Decouple editor data/types from the historical regional/navigation geometry;
  keep current core geometry, IDs, coordinates, versions and serialization intact.
- Use `assets/manifest.json` as the authoritative catalogue for active combat/map
  revisions and consumers. Retain other current catalogue entries.

## Active content and asset audit

[Authoritative manifest](../../assets/manifest.json):130 catalogue entries,
including41 active combat files (21 moving/fallback sprites, B023 fixture,
nine terrain/scenery textures and ten command icons) and three atlas/map files.
The existing `sprite-art.ts` selector/scale/foot metadata and all current HUD
components are unchanged. Unknown combatant fallback is inline SVG. The manifest
records consumers, current revisions, licensing and original provenance. Existing
`validate:content` now checks finite combat imports against that catalogue and
checks active provenance/consumer existence. This is not a general dynamic-loader
liveness proof or a stale-entry detector for future changes.

| Retired family                                           | Paths removed |
| -------------------------------------------------------- | ------------: |
| Stage1 sprite/HUD/gallery images                         |            40 |
| Superseded terrain exports and metadata                  |            12 |
| Early battle images and metadata (current wolf retained) |            24 |
| Historical map/atlas raster, guides and generation files |           121 |
| Historical editor navigation/regional geometry modules   |             2 |

Atlas v6 remains4608×3072. Current fog/map symbols and style/reference assets
are retained. Raster v5 and older Porechye/Stozhar art are absent; intermediate
v1–v4 full atlases were already absent from the base. The editor has one atlas,
34 retained destinations and no version selector. `?map=v5` now resolves v6.
Its center-place data and eight tile positions match the original source;
unused historical terrain/road generation arrays were removed. The editor uses
the current core region. Client/server map IDs, coordinates, road geometry,
movement profiles, serialization and released migrations have no change.
Existing legacy-world readers remain; no compatibility conversion is necessary.

The new atlas place module initially returned200 through the game development
origin. The existing private-atlas deny rule now includes all current atlas
editor modules: direct place-module and full-raster requests return404. The
separate authoring origin still loads v6. Historical documentation links now
pin the original source revision; current entry instructions point to v6.
WLC-01's inventory remains an immutable historical audit, not a current deletion
list. Five already-missing local evidence links in CURRENT_PLAN_HISTORY remain
historical limitations; no new missing local document link was introduced.

## Versioned archive and restoration

[Release](https://github.com/Vovanostm/warwrit/releases/tag/wlc-03-history-2026-11-07)
contains [wlc-03-history.tar.gz](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/wlc-03-history.tar.gz)
and [per-file manifest](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/archive-manifest.json),
source revision `79a6ba025bba236dfe4be0665aece98d1c8c4353`.
199 retired paths plus61 original catalogue/source/metadata context paths are
retained. Each original path is represented once in the tar; no
temporary exports are retained in the active set. Original generator arguments,
license/source records and rejected history remain recoverable. Local tool-output
paths inside provenance are historical; external generator originals remain
unverified as before.

The separately retired atlas layout guide is
[porechye-atlas-layout-source.ts](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/porechye-atlas-layout-source.ts),
with its [source/checksum record](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/atlas-layout-source.json).
Active provenance links that exact original rather than the simplified current
layout. These release assets are source archives, not a game release/deployment.

Download the tar and manifest with `gh release download wlc-03-history-2026-11-07
--repo Vovanostm/warwrit --dir <separate-directory>` (select the tar/manifest with
`--pattern` as desired). Verify each manifest `files[].sha256`, then extract
into a separate directory. Never unpack over a live checkout or player database.
The original catalogue/context is included; use the pinned Git revision to
recover any surrounding application code. Download the supplemental layout and
its manifest to recover the historical generation guide.

Actual restore check: the published tar was downloaded, every one of199 entries
matched recorded size/SHA-256, and the whole archive was extracted separately
before deleting any tracked resource. The supplemental original was also
downloaded and checked. No archive binary is tracked or imported by production.

## Actual verification and limits

- PASS: protocol/core/testkit prerequisite builds; editor/server/web types;
  scoped ESLint/Prettier and ordinary diff checks; `validate:content`130 entries.
  A known-bad catalogue omitting active W01 was correctly rejected; the valid
  manifest was restored unchanged. First editor typecheck lacked built testkit declarations; after building that
  existing prerequisite it passed. No dependency/lockfile change.
- PASS:40 focused tests across eight files (sprite selection, shared battle
  presentation/scene, v6 core/editor road/arrival, raster and stored-route reader).
  After simplifying the last historical layout, the20 affected map/core tests
  were repeated. These preserve both repaired connections, road cost advantage,
  no field shortcut, water/bridge rules and reachability of all34 editor points.
- PASS:11 actual PostgreSQL continuous-movement regressions on an owned disposable
  container, including exact retained older terrain coordinates and receipt/
  settlement behavior. No existing world or real save was readjusted/reset.
- PASS: ordinary painted-game browser journey before and after deletion, using
  a new disposable database, existing local Dex, `WORLD_LAB=0`, `COMBAT_LAB=0`,
  `ENCOUNTER_FIXTURES=0`: OIDC → empty account/company creation → v6 tiles →
  company/place tabs → map controls → known site → server MOVE/STOP → reload.
  No game-response fulfillment or game-state SQL setup. This route ends at map
  persistence; it is not a full contract/combat/reward journey.
- PASS: editor v6 loads with old query parameters,34 places/no version selector;
  Bereznyak → Kamenny Brod arrives; overview/close day/night captured.
  Shared sprite HUD stand: fresh battle → selection/right-click movement
  (AP4→3) → defend/end-turn → server autoplay → victory result; day/night captures.
  This is the actual shared HUD with disposable in-memory combat, not ordinary
  campaign encounter/save/reward acceptance. A source rebuild reset the volatile
  lab once; a fresh battle supplied the final captures. No real save affected.
- PASS: production web build;179 emitted files contain no retired image stems or
  archive payloads. Existing large-chunk warning retained; no performance claim.
  The initial audit erroneously treated retired gallery `index.html` as an image
  stem; restricting the audit to image extensions fixed the audit, not product.
- Independent read-only diff review: no material defect; final affected readback
  ACCEPT for private authoring restrictions and exact tile-position preservation.
  Reviewers did not run product tests or independently replay author inputs.
- Independent scoped visual critique: ACCEPT on implementation7e1f6b69 after
  viewing equal-height baseline/current and asset/reference game/close sheets.
  Applicable preservation scores2–3/3; motion N/A (no clips changed). No
  WLC-03 visual defect found. Existing detailed terrain and dark-night character
  treatment remain outside this consolidation; no broader art approval claimed.
- Hosted checks on implementation7e1f6b69: [CI42392581792](https://github.com/Vovanostm/warwrit/actions/runs/42392581792)
  FAILED at Prettier on unchanged `apps/web/src/encounter/connection.test.ts`.
  [Scope42392581955](https://github.com/Vovanostm/warwrit/actions/runs/42392581955)
  reports2159 source lines (primarily deleted old geometry), then FAILS because
  its restricted issue/contract pattern does not accept this engineering contract.
  Actual failed logs were read. No product check ran after that formatter stop;
  no rerun or unrelated quality-gate fix is part of WLC-03. CI remains advisory.
- Local full suite/coverage/stress/full M1/new ordinary campaign battle: NOT_RUN.
  Performance, enjoyment and broader scene-art acceptance: NOT_MEASURED.
  CI is advisory. No deployment or real-save migration.

## Visual evidence

[Equal-height comparison sheets](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/comparisons.png)
render unaltered images side by side in a local HTML page; no screenshot or art
pixels were generated/retouched. Current captures are release assets outside production:
[shared HUD day](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/hud-after-day.png),
[night](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/hud-after-night.png),
[victory](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/hud-result.png),
[editor overview day](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/editor-overview-day.png),
[night](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/editor-overview-night.png),
[editor arrival day](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/editor-v6-day.png),
[night](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/editor-v6-night.png),
[ordinary company after reload](https://github.com/Vovanostm/warwrit/releases/download/wlc-03-history-2026-11-07/painted-map-after-reload.png).
Local raw captures/logs are under `output/wlc-03` and
`output/painted-game-ci/1794068769-26439-6833`, untracked evidence paths.

## Delivery

PUBLISHED implementation `7e1f6b69` in
[PR421](https://github.com/Vovanostm/warwrit/pull/421). Independent source and scoped
visual reviews are complete. The owner's WLC-03 request explicitly authorizes
review, PR and merge; no deployment. Final documentation-only changes preserve
the checked implementation. Supply the actual final head to the merge operation;
GitHub owns the actual merge receipt.
