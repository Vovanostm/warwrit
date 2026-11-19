# Changelog

Notable changes to the repository's tooling, gates and delivered behavior. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
project has no released versions yet, so entries stay under _Unreleased_. New
entries include their date, originating branch and actual delivery status; record
the merge date when merged. Earlier history is in the Git log and merged pull
requests.

## Unreleased

### Integrate painted map with ordinary company authentication

- 2026-10-29, branch `codex/game-painted-map`, local source implementation,
  player acceptance pending. Reuse v6 plus existing cartography in the ordinary
  shell and one server-selected atlas world; keep legacy saves/routes unchanged.
  Private scoped raster/knowledge, exact retry and mill alias authority tested
  with actual PostgreSQL1 PASS; source reviews ACCEPT after six client fixes
  and one backend bypass fix. Types/lint and relevant9/30 checks PASS.
  [Results, failures and limits](docs/work-packages/WORLD-MAP-NAVIGATION-LAB.md#ordinary-integration-checkpoint--2026-10-29).
  Unified existing vision/map/fog/combat/quest wiki owners. Native login awaits
  explicit fixture permission after auto-review rejection; no visual/game
  completion, PR/main merge/deployment.

### Activate painted atlas in ordinary game

- 2026-10-29, branch `codex/game-painted-map`, local integration under owner's
  map/combat/wiki request. Reuse current main's v6/roads and existing local fog
  implementation, preserving both branch histories.
  [Active result boundary](docs/work-packages/WORLD-MAP-NAVIGATION-LAB.md#ordinary-game-painted-map-activation--2026-10-29):
  ordinary login/company/map/move/reload, one region/cartography owner, old
  coordinates/routes retained. Implementation and acceptance pending; no main
  merge, publication or deployment yet.

### Authoritative company cartography in the shared-world lab

- 2026-10-28, branch `codex/world-map-fog-design`, local implementation:
  owner requested implementation with subagents. Added migration0018 for frozen
  chart editions/grants, company exploration chunks, place observations and
  progression cursors. Server sight uses authored terrain and a provisional
  immutable light/weather profile. HTTP/realtime omit hidden groups; movement
  rejects unknown routes uniformly and explicit reachable entry records visits.
  The world client loads authenticated, byte-masked PNG tiles and lawful sites;
  its Vite origin denies private source/raw artwork. Unknown terrain has an
  opaque non-geographic surface; chart knowledge, exploration and live sight
  remain distinct. [Owning result](docs/wiki/world/fog-of-war.md#серверная-реализация-стенда--2026-10-28).
  Clean verify1222/stress10000/migration smoke PASS; full SQL78 PASS and the
  one outdated migration-list case fixed and separately PASS. Native privacy,
  movement/visit/input/session and real API recovery PASS. Third full visual
  ACCEPT (eight criteria2); initial source/privacy review ACCEPT. Final quality
  refactor: isolated SQL10/native9 + actual restart, related1007/71 skipped,
  types/lint/format and unchanged source-matched audit PASS. Bounded source
  readback found no concrete defect; no thresholds or suppressions changed.
  Local source commit `a2388f57`, normal hook/audit PASS without bypass.
  Existing persistent lab data retained. No merchant pricing/payment UI,
  production rollout, PR/merge, Orca or automation activation; load/fun NOT_MEASURED.

### Personal cartographic persistence proposal

- 2026-10-28, branch `codex/world-map-fog-design`, local documentation:
  owner confirmed visit-based place discovery and asked how personal map/fog
  knowledge should persist. [Owning proposal](docs/wiki/world/fog-of-war.md#предлагаемое-хранение--postgresql-и-знание-компании)
  specifies one shared world, company-scoped immutable map grants, sparse
  exploration bitmaps, observed/visited-place evidence and region revisions.
  Live FOV remains server-derived; purchases preserve their actual information
  coverage. Reviewed current PostgreSQL/world knowledge seams; no schema/runtime
  mutation. Markdown format/local links/new anchor/scoped diff PASS;
  SQL/game/browser/load NOT_RUN/NOT_MEASURED.

### Merchant chart content correction

- 2026-10-28, branch `codex/world-map-fog-design`, local documentation:
  corrected the author's mistaken city-street-plan interpretation. Owner means
  merchant maps with different information coverage: a whole region, cities
  only, one location or another stated subset, all enriching the company atlas.
  [Owning rule](docs/wiki/world/fog-of-war.md#карты-городов-мест-и-квестовые-наводки--решение-владельца-2026-10-28)
  now requires per-map content/coverage grants rather than region IDs alone.
  Wiki only; Markdown format/local links/scoped diff PASS. Runtime/purchasing
  unchanged; game/browser/SQL NOT_RUN.

### City/place charts and quest location clues

- 2026-10-28, branch `codex/world-map-fog-design`, local wiki update: owner
  added city and individual-place maps, and distinguished explicit quest marks
  from approximate verbal directions without a map point. The [owning rule](docs/wiki/world/fog-of-war.md#карты-городов-мест-и-квестовые-наводки--решение-владельца-2026-10-28)
  and quest wiki preserve chart coverage and live-visibility boundaries; verbal
  clues do not automatically gain a search area or hidden coordinate payload.
  Documentation only; Markdown format/local links/new anchors/scoped diff PASS. Game/browser/SQL
  NOT_RUN; runtime and existing quest cards unchanged.

### Company home-region atlas

- 2026-10-28, branch `codex/world-map-fog-design`, local: owner clarified that
  a company starts with its home-region chart only. Further regional maps must
  be acquired or land explored personally. Updated the [owning specification](docs/wiki/world/fog-of-war.md),
  example09 labels and chart projection, excluding towns of unacquired regions.
  Map ownership, personal exploration and live observation stay separate;
  economic/server implementation and prices remain outside this design correction.
  Seven model cases/types/lint/format,20 native states and source-checked audit
  PASS; affected example09 visual ACCEPT (four criteria2). Independent input
  replay and production regional-map purchasing/privacy NOT_RUN.

### Fog of war design and examples

- 2026-10-27, branch `codex/world-map-fog-design`, local: owner requested a
  specification and ten visual/code examples for authoritative sight, public map
  knowledge and gradual exploration. Added an isolated synthetic before/after
  gallery with real optical examples, remembered terrain, last-seen pursuit,
  approximate rumours, overview and paired-hidden-world projection. The
  [owning specification](docs/wiki/world/fog-of-war.md) records game references,
  current source seams, authenticated map assets, transport/route privacy and
  server implementation acceptance. Six model cases, types/lint/architecture,20
  native states, metadata/keyboard/1050 and source-checked audit PASS. First visual
  REJECT fixed source/age and terrain cues; full repeat ACCEPT, four criteria2.
  No production server/core/SQL or
  public-map behavior changes; server fog/load/fun NOT_RUN/NOT_MEASURED.

### Networked atlas merged

- 2026-10-27, branch `codex/world-map-mmo-design`, merged in
  [PR330](https://github.com/Vovanostm/warwrit/pull/330) as `5ecb4eb3` from
  expected head `74e4a584`. Includes the networked lab, observed pursuit,
  icons/labels, own camera and migrations0015–0017. Independent exact-head
  integration/infrastructure ACCEPT; CI40557403570 and latest scope40560485057
  SUCCESS, no blocking reviews/threads. Merged/checked trees match; local main
  and origin/main read back at `5ecb4eb3`, primary WIP preserved. CI fixed missing
  SQL/browser measurements without changing thresholds; first failed run retained
  below. Earlier local/pending source statuses are superseded by this delivery.
  This documentation readback is local; no deployment/automation.
  [Owning result](docs/wiki/world/map.md#слияние-сетевого-атласа--2026-10-27).
