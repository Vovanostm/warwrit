# Five Old Mill display directions — 2026-10-27

## Ordinary-game subset — 2026-10-29

Imported unchanged PNGs from local `hybrid-kit-assets` commit `648830d8`:
`slate-ground-v2.png` and their original prompts. The source generation record below
is historical; unshipped variants and preview modules are named as plain paths,
not links to files in this checkout. The ordinary consumer is
[the current sprite renderer](../../../../apps/web/src/combat-lab/sprite-battle-scene.ts);
[the bounded combat contract](../../../../docs/wiki/battlefield-test-maps.md#обновление-существующей-боёвки--поручение-2026-10-29)
owns current integration, checks and acceptance. No new art was generated or
source pixels changed. Prototype acceptance does not accept the ordinary game.

## Historical generation and preview record

Local owner-requested style proposals for `heightfield.html`, not five approved
production styles. All use the same authoritative 96-cell geometry, fixed vertical
fighter cards, source alpha, camera, depth and picking. No combat rules changed.

## Art and provenance

Generated with the built-in `image_gen.imagegen` tool. Each opaque image is
1536×1024 and covers the same 25×16m ground UV region. Exact submitted prompts
are the sibling `*-prompt.txt` files. Inputs for every call were the approved
[unit](../../m1/style/unit-c-ink.png) and
[Old Mill](../../m1/places/staraya-melnitsa.png) as **style references**, not
geometry guides or edit targets. Original reference art is not overwritten.

| Direction             | Asset / exact prompt                                                                                                     | Built-in output basename                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| A · Ink and wash      | ink-ground.png (historical source: `ink-ground.png`) / prompt (historical source: `ink-prompt.txt`)                      | exec-e4bc2cfe-4342-468a-add9-ebccb35990ca.png |
| B · Slate and ochre   | [slate-ground-v2.png](slate-ground-v2.png) / [prompt](slate-v2-prompt.txt)                                               | exec-ef60c3f7-c221-485a-b20b-bade12a5832d.png |
| C · Dry engraving     | woodcut-ground.png (historical source: `woodcut-ground.png`) / prompt (historical source: `woodcut-prompt.txt`)          | exec-b7bdd86e-9891-4e90-915b-a406068794d5.png |
| D · Ash gouache       | gouache-ground-v3.png (historical source: `gouache-ground-v3.png`) / prompt (historical source: `gouache-v3-prompt.txt`) | exec-b0cc1642-36a7-44ac-a783-364bba917104.png |
| E · Charcoal and rust | ember-ground.png (historical source: `ember-ground.png`) / prompt (historical source: `ember-prompt.txt`)                | exec-200c8e95-26cc-4fd7-8c83-6479b57ef998.png |

B/D v2 are targeted built-in edits after the first independent critique. Their
input order is: previous B/D ground as edit target; A ground as material reference;
approved Old Mill and unit as style references. The original B/D PNGs and their
original prompts remain as superseded local history. Initial built-in outputs:
B `exec-0f882e73-9d1c-4fb1-9bcc-1d30fde8f3d7.png`,
D `exec-f1a583a7-a734-4ef5-a745-58ac2e78d09a.png`.

D v3 switches the edit target to **A's actual inked soil drawing**, using D v2 only
as opaque-wash palette guidance, followed by the approved place/unit references.
This replaces the smooth-wash starting technique after two failed absolute
reviews; it preserves the connected ink soil structure beneath the pigment.
D v2 output was `exec-f2cfc939-0577-484e-bea2-609ce3baa30f.png`.
The runtime additionally draws broken ground-contact accents and blends the same
A ink substrate at the mill, willow and cart feet on existing ground surfaces.
The quieter central battle area receives none of those contact masks. This
D-only layer adds no picking surface or gameplay rule.

The first sample was inspected before producing the remaining four. The generator
still drew more pigment detail than requested: actual scene captures, not the
90% quiet-fill prompt, determine whether a proposal reads well. No raster blur,
posterization or recoloring was baked into these outputs after generation.

## Integration

visual-style.ts (historical source: `../../../../apps/web/src/heightfield-preview/visual-style.ts`)
owns six presets: five proposals and `original`. URL `?style=ink|slate|woodcut|gouache|ember|original`
selects the same live style as the buttons. Switching retains camera, selected
cell, night and debug layer; a reload restores the style from the URL.

- Each proposal replaces the ground and apron painting together. These are broad
  patches, not guaranteed seamless textures: ground-only mirrored addressing
  avoids hard rectangular value seams outside the tactical patch. No sprite or
  baked architectural projection is mirrored.
- The existing mill, vegetation, water, masonry, slopes and fighter PNGs are
  reused. They receive a shared ink/value/chroma treatment with different roles:
  compressed quiet earth, stronger scenery shadow masses, readable fighter cloth
  and metal. This is renderer stylization of the existing art, **not newly drawn
  mill or fighter atlases**. Sources/pivots/alpha silhouettes remain intact.
- Ordinary fighter mip filtering reduces minification speckle without extra blur;
  picking continues to use original source pixels. The five-style treatment does
  not expand silhouettes or affect grid/selection colors.
- An early high-mip-bias experiment looked soft and was discarded. Early Vite
  dynamic-URL discovery exposed missing-texture placeholders; explicit URLs and
  image decoding now load all five real images before starting the preview.
- `original` uses the prior ground and identity tonal parameters; the shared
  layout and ordinary fighter minification fix remain enabled.

Current captures, critique, actual checks and limits belong to the
[owning battlefield page](../../../../docs/wiki/battlefield-test-maps.md).
