# Asset catalogue

## Active combat and atlas revisions (WLC-03)

`manifest.json` is the authoritative active combat/map asset catalogue. It records
runtime consumers, source/licensing metadata and content revisions. Sprite scale
and foot anchors remain owned by `apps/web/src/combat-lab/sprite-art.ts`; world
geometry remains owned by `packages/game-core/src/world/painted-atlas/region.ts`.
Atlas v6 is the only active raster. The persisted atlas-v1 world/directory IDs do
not name an old raster. Current map-icons-v1/fog-paper-v1 and tree atlas suffixes
are independent resources and remain in use.

Historical combat and atlas generation inputs are outside production in the
[versioned archive](https://github.com/Vovanostm/warwrit/releases/tag/wlc-03-history-2026-11-07).
Original prompts and provenance retain exact historical filenames and tool paths;
read those against archive source revision79a6ba02, not as current local imports.
External tool originals were never guaranteed available. The archive includes
the tracked source inputs, original catalogue/licensing and retained metadata.
[Restore instructions and actual checks](../docs/engineering/COMBAT_ASSET_CONSOLIDATION.md).
