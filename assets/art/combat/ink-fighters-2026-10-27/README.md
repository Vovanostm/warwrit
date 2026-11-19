# Readable ink fighters — 2026-10-27

## Ordinary-game subset — 2026-10-29

Imported unchanged PNGs from local `hybrid-kit-assets` commit `648830d8`:
`sword.png` and their original prompts. The source generation record below
is historical; unshipped variants and preview modules are named as plain paths,
not links to files in this checkout. The ordinary consumer is
[the current sprite renderer](../../../../apps/web/src/combat-lab/sprite-battle-scene.ts);
[the bounded combat contract](../../../../docs/wiki/battlefield-test-maps.md#обновление-существующей-боёвки--поручение-2026-10-29)
owns current integration, checks and acceptance. No new art was generated or
source pixels changed. Prototype acceptance does not accept the ordinary game.

## Historical generation and preview record

Owner correction: the previous field-style proposals still let fighters merge
with soil. This set replaces the actual three fighter paintings in the local
heightfield preview. It does not replace characters in other game views or add
combat/animation/faction rules.

## Reference and generation

Built-in `image_gen.imagegen`, genuine transparent-background requests. Model
identifier is not exposed. Exact submitted prompts are sibling `*-prompt.txt`.
Inputs, in order:

1. Owner-chosen ink battle (historical source: `../hybrid-references-2026-10-25/b-ink.png`): primary
   composition/rendering language, large clothing pigments and silhouette roles.
2. [Approved unit C](../../m1/style/unit-c-ink.png): adult proportions, worn gear,
   irregular ink craft; not an all-brown color mandate.
3. Owner fighter reference (historical source: `../graphic-novel-probe-2026-10-25/references/fighter-style.png`):
   restrained graphic-novel finish.
4. Sword/bow calls additionally used the inspected new spear as a shared-artist
   reference. Spear was generated/inspected first, then the other two.

| Asset                                                                                       | Inspected size | Source output basename                        | Authored palette                              |
| ------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------- | --------------------------------------------- |
| [sword.png](sword.png) / [prompt](sword-prompt.txt)                                         | 1330×1183 RGBA | exec-e5944008-df44-4742-bf90-bfc17b243969.png | worn ochre coat, rust scarf, dark leather     |
| spear.png (historical source: `spear.png`) / prompt (historical source: `spear-prompt.txt`) | 1536×1024 RGBA | exec-bf3cecb2-cc23-4884-8c07-df4bd68a254d.png | slate-blue coat, flax sleeves/wrap, dull iron |
| bow.png (historical source: `bow.png`) / prompt (historical source: `bow-prompt.txt`)       | 1223×1286 RGBA | exec-fd883128-7713-4da0-b244-2d87dcd84cc8.png | light ochre/flax, muted rust shoulders        |

Saved sources are unchanged; no raster recoloring, blur, outline or extraction
was applied after generation. Alpha extrema are0–255 (spear0–254). Full weapons
and both boots were inspected. Bow's upper limb has only13px of alpha-test margin;
this is not described as a large production-atlas gutter. Color families
separate the drawing's material/role silhouettes, not allies or factions.

## Integration and pivots

Only fighter-art.ts (historical source: `../../../../apps/web/src/heightfield-preview/fighter-art.ts`)
loads this set. Three independent PNGs avoid the old cross-unit atlas crops.
The definitions below are inspected source-pixel landmarks, not derived game
occupancy or combat reach:

| Fighter | Head top | Body to front sole | Foot pivot | Sole contacts      |
| ------- | -------- | ------------------ | ---------- | ------------------ |
| Sword   | y46      | 1096px             | 658,1142   | 312,1141;1004,1037 |
| Spear   | y68      | 905px              | 647,973    | 382,973;912,864    |
| Bow     | y216     | 1041px             | 568,1257   | 276,1256;860,1136  |

The existing104px body-height target, world cell and fixed vertical plane are
retained. The foremost sole anchors to the flat floor; the other authored sole
projects onto that floor for a separate small contact shadow. The fixed camera
supplies that screen/ground projection; no body is tilted or pitched toward it.
Source alpha drives picking and ordinary depth still hides figures behind walls.

New art keeps its authored pigment/value hierarchy through all six environment
styles. It receives the existing day/night tint, not the previous experimental
sprite desaturation/gain or synthetic light inner edge. The actual ink contour
is in the source PNG. `?sprites=legacy` retains the former sprite source/grade
for comparison; default and `?sprites=ink` use this set. Previous PNGs remain
untouched. Environment/height/grid art, geometry and rules remain unchanged.

Current integrated captures, independent critique and actual checks are recorded
in the [owning battlefield page](../../../../docs/wiki/battlefield-test-maps.md).
