# Living places — 2026-10-04

Active owner request: make cities, villages and visited landmarks feel alive,
with parallax, highlighted entrances and at least ten building types with two
or three visual variants each, in one coherent style.

Parent `/root` is the sole writer on `codex/living-locations` in the primary
checkout, based on main `9c86605`. Existing player database and API are retained.
The independent visual critic is read-only. No merge or deployment permission.

## Observable outcome

Select a place on the map, open **Место**, explore its layered ink/wash scene,
hover or keyboard-focus a building and enter it when the party is physically
there. Return to the map without sending a movement command. Remote places
are previews, with entrance access disabled.

## Finite scope and decisions

- Ten types, each with rural, river and town variants: market, forge, elder's
  house, inn, chapel, herbalist, stable, guardhouse, mill and granary.
- Original transparent building sheets, three silhouettes per type. Shared
  black ink, weathered wood/stone, moss, ochre and rust palette under ADR-0006.
- Authored sets for Kamenny Brod, Bereznyak, Tikhaya Gat, Severny Dvor and the
  old mill. Existing painted landscapes supply the distant layer; buildings,
  foreground vegetation, smoke and night illumination supply depth and life.
- A building opens an illustrated place panel. The elder's house exposes the
  existing contract UI, forge links to the existing company equipment UI.
  Other interiors are descriptive visits; this cycle does not invent shops,
  healing, wages, recruits, goods or new NPC facts. Available existing contracts
  remain accessible from the place sidebar.
- Client presentation only. Actual movement mode/site controls entrance
  eligibility. No server, protocol, domain, migration or dependency changes.
- Native buttons, visible keyboard focus, Escape/return, touch selection,
  reduced-motion support and scoped pointer handling. No camera/game command
  on parallax or entrance selection.

## Owning files and checks

`apps/web/src/game/{GameShell,PlaceScene,place-buildings}` and place-scene CSS;
`assets/art/m1/places/buildings`, existing art manifest; this contract, current
plan and the existing wiki specification. No second source writer.

Focused web typecheck/build, changed-file lint/format, architecture check and
real authenticated browser journey (city/village/landmark, remote preview,
entrance, return, keyboard, reduced motion and narrow viewport). Independent
critic receives current captures and actual journey evidence before completion.
No full-M1 acceptance claim.

## Result

Implemented 2026-10-04. Ten transparent sheets contain three original variants
each. City, village, river settlement, farm and ruined mill use authored visual
sets. Persistent gold entrance labels distinguish actual access from disabled
remote previews. Layered pointer parallax, smoke, night shading, keyboard entry,
Escape and touch selection are available. The old mill retains its ruined
watermill image and one yard entrance; intact settlement mills have no local
contracts shortcut.

- Final `scripts/bootstrap.sh`: PASS, exit 0. Format/lint, architecture,
  dead-code, content, build/typecheck and unit checks passed: 604 checks,
  46 skipped. Combat stress: 10,000 battles. Migration/auth/encounter checks:
  14 passed, disposable PostgreSQL removed. Earlier interrupted run ended143
  and is not a pass. Existing player storage was not replaced.
- Final changed-code audit: PASS, three inherited findings excluded by the
  existing gate; no suppression or hook bypass. The action simplification made
  during the bootstrap is additionally checked through focused web typecheck,
  lint and authenticated browser readback.
- Actual browser: village visits for all ten entrances, elder/contracts and
  forge/equipment links, Enter/Escape with restored entrance focus, map return,
  city/river/ruin remote previews and 390px layout. Pointer motion gives distinct
  distant/building/foreground transforms. Final narrow width equals content
  width390. Current village scene fits1440×1000 with all ten entrances visible.
- Independent read-only critic inspected current source and fresh captures;
  reported no remaining established material issue after fixes for focus,
  persistent access labels, ruined-mill art, remote contract context and layout.
  Critic did not operate the browser or measure motion.
- NOT_RUN/NOT_MEASURED: live reduced-motion override, physical old-mill entry,
  device/performance matrix, subjective enjoyment and full M1 acceptance.
  Commerce, healing, repair, recruitment and new NPC services are unavailable;
  these visits are descriptive panels and links to existing actions.

Local playtest: `http://127.0.0.1:5287`, select a map place, then **Место**.
Enter a highlighted building where the party is present; **← Карта** returns.
Diagnostic captures remain local under `output/playwright/living-places`.
Published [PR139](https://github.com/Vovanostm/warwrit/pull/139), implementation
commit `584497b`, normal commit audit passed. GitHub CI pending at publication;
local checks do not prove its result. Canonical Airtable/Empirical publication
checkpoint NOT_UPDATED; repository files and PR own this delivery record.
NOT_MERGED; no deployment authorization.
