# Dark fantasy map art and composed trees

The continuous map consumes this bounded set through
`apps/web/src/renderer/art.ts`. Art authority: ADR-0006, original
`assets/art/m1/style/unit-c-ink.png`, matching original `places/` scenes and
weathered building art. All selected PNGs are unchanged original built-in
image_gen outputs. Generation/edit prompts and author measurements remain
verbatim in `provenance/`; historical source paths describe authoring history.
They are not runtime dependencies or proof of current game acceptance.

Selected cutouts: city-v4, village-v1, river-village-v1, farmstead-v4 and mill-v1.
The old mill remains a dangerous ruin with broken roof/rafters/wheel; inhabited
places retain their canonical identity. Source dimensions, alpha bounds and
entrance pivots preserve the authored aspect and grounded approaches.
Selected overhead materials: meadow, woodland, shore, rock and water-grim-v2.
Current main's three road materials and proportional party remain in their
own asset families.

The reference master-grim-v1's historical 2:1 prompt line is superseded by
runtime orthographic E35.2643897/A45, axes ±30°, square diamond √3:1.
No projected sprite is squashed again or mirrored with its baked light.

The forest uses trunk-atlas-v1 (three deciduous bodies plus one pine) and
foliage-atlas-v3 (two leaf fragments plus left/right pine boughs). Shared
curved near/middle/far cards, opaque fork overlaps and deterministic per-part
scale/roll/frame choices vary silhouette and depth. No primitive bark tubes
or rejected whole-tree prototypes are consumed. Tree roots and soft contact
wash sample current main's actual relief; trees never capture map targets.
Painted props share one depth pass after terrain so foreground masonry below
an entrance pivot is retained. Local wet contacts ground the existing stilt
settlement and ruined wheel; they add no navigable water.

Exact atlas recipes, source paths, alpha39 bounds and producer attachment
measurements live in `provenance/tree-parts/`. Runtime opaque-overlap pivots
mask cut caps without rewriting producer metadata. Earlier standalone
prototype approval is historical; current integrated review and actual
journey evidence belong to
[the owning work package](../../../../docs/work-packages/M1-FREE-MOVEMENT.md#component-forest-integration--2026-10-04).
