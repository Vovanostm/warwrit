# Ten distinct ink fighters — 2026-10-27

## Ordinary-game subset — 2026-10-29

Imported unchanged PNGs from local `hybrid-kit-assets` commit `648830d8`:
`spear-veteran.png, bow-youth.png` and their original prompts. The source generation record below
is historical; unshipped variants and preview modules are named as plain paths,
not links to files in this checkout. The ordinary consumer is
[the current sprite renderer](../../../../apps/web/src/combat-lab/sprite-battle-scene.ts);
[the bounded combat contract](../../../../docs/wiki/battlefield-test-maps.md#обновление-существующей-боёвки--поручение-2026-10-29)
owns current integration, checks and acceptance. No new art was generated or
source pixels changed. Prototype acceptance does not accept the ordinary game.

## Historical generation and preview record

Owner request: at least ten different characters after the preceding three
fighters shared similar faces. This is a static visual roster for the local
heightfield preview, not a canonical hero catalogue or combat equipment change.

## Sources and generation

Built-in `image_gen.imagegen`, one independent genuine-transparent-background
call per PNG. The tool does not expose a model identifier. Exact submitted
prompts are sibling `*-prompt.txt`. Reference images, in order:

1. Owner-selected ink battle (historical source: `../hybrid-references-2026-10-25/b-ink.png`):
   drawing language, adult forms and worn equipment.
2. [Approved unit C](../../m1/style/unit-c-ink.png):
   irregular ink craftsmanship.
3. [Existing ochre swordsman](../ink-fighters-2026-10-27/sword.png):
   ink/wash, projection and light only; prompts explicitly prohibit copying his
   face, hair, beard or equipment.

Nine new independent PNGs join the retained original ochre swordsman, making
**ten distinct source drawings**, each used once on the default mill field.
The prior similar spear/bow drawings remain intact but are no longer loaded by
the default set. No recoloring, cropping, extraction or outline is baked into
the saved generated PNGs; original alpha is retained.

## Visual identities

- Ochre swordsman: dark short hair, beard, rust scarf and round shield (retained).
- Spear veteran: grey swept hair, grey mustache, narrow face and blue coat.
- Young archer: copper curls, clean-shaven youthful face, light sleeves/rust vest.
- Axe fighter: bald head, broad face/build, ochre jack and axe.
- Crossbow fighter: woman with long black braid, angular face and blue vest.
- Mace fighter: older round face, balding white hair/goatee, flax coat.
- Second spear fighter: dark skin, cropped hair, clean-shaven, slender rust coat.
- Sword fighter: older woman, short uneven silver hair, ochre/blue clothing.
- Second archer: woman with olive hood, light coat and lower bow guard.
- Falchion fighter: shoulder-length black curls, mustache, shaved chin, blue/ochre.

These descriptions are art differentiation, not biographies, factions or rules.
All use the existing104px preview body-height target; actual character
heights/statistics have not been introduced.

## Inspected integration landmarks

Head Y/body height, central foot pivot and two sole points are source pixels.
Soles were located from the source alpha then visually checked against the
boots. They guide fixed vertical cards and contact shadows, not occupancy,
weapon reach or movement.

| Asset                                                        | Exact prompt                                            | Tool output basename                          | Head Y / body | Foot pivot | Soles               |
| ------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------- | ------------- | ---------- | ------------------- |
| [spear-veteran.png](spear-veteran.png)                       | [prompt](spear-veteran-prompt.txt)                      | exec-f9ef5082-db1d-4902-9ea8-8afedbf6f5a6.png | 70 / 1039     | 555,1109   | 208,1109; 902,998   |
| [bow-youth.png](bow-youth.png)                               | [prompt](bow-youth-prompt.txt)                          | exec-3575525e-dca1-4a58-8dad-b8d5c9496e56.png | 200 / 1065    | 563,1265   | 211,1265; 914,1234  |
| axe-bald.png (historical source: `axe-bald.png`)             | prompt (historical source: `axe-bald-prompt.txt`)       | exec-68da9702-f2bc-4c2a-938a-99cf5fa21821.png | 61 / 1084     | 704,1145   | 360,1145; 1048,1030 |
| crossbow-braid.png (historical source: `crossbow-braid.png`) | prompt (historical source: `crossbow-braid-prompt.txt`) | exec-c9380a4a-e4d9-40f6-87ef-224e1a4a9937.png | 39 / 1119     | 650,1158   | 360,1158; 939,1043  |
| mace-grey.png (historical source: `mace-grey.png`)           | prompt (historical source: `mace-grey-prompt.txt`)      | exec-91431d43-f6a6-4fb0-84c7-c7522a219101.png | 38 / 1126     | 675,1164   | 300,1164; 1049,1074 |
| pike-tall.png (historical source: `pike-tall.png`)           | prompt (historical source: `pike-tall-prompt.txt`)      | exec-8eabd13e-c533-4d29-a7fa-3dc8b1585980.png | 109 / 1181    | 492,1290   | 184,1290; 800,1113  |
| sword-grey-bob.png (historical source: `sword-grey-bob.png`) | prompt (historical source: `sword-grey-bob-prompt.txt`) | exec-06a5395e-9a4d-463f-a5ab-d41e2c0d7f80.png | 67 / 1255     | 617,1322   | 246,1322; 987,1192  |
| bow-hood.png (historical source: `bow-hood.png`)             | prompt (historical source: `bow-hood-prompt.txt`)       | exec-657d8dbe-e413-4e5c-9a36-d3096851b0c8.png | 91 / 1150     | 604,1241   | 254,1241; 954,1159  |
| falchion-curly.png (historical source: `falchion-curly.png`) | prompt (historical source: `falchion-curly-prompt.txt`) | exec-f0ac0852-fd00-46e2-982c-aae6ff2345c1.png | 41 / 1112     | 688,1153   | 324,1153; 1051,1069 |

The retained sword's metadata/provenance is in its
[original README](../ink-fighters-2026-10-27/README.md).
`fighter-art.ts` owns all ten explicit URLs and drawing landmarks.
`terrain-scene.ts` places each once on the same96-cell source field; seven
existing positions plus three free earth cells. The same vertical axis,
source-alpha picking, depth occlusion, day/night tint and authored palette apply.
Legacy rendering and T0–T3 remain available; only the mill gets ten placements.

Current integrated review/checks and limits belong to the
[owning battlefield page](../../../../docs/wiki/battlefield-test-maps.md).

## Ordinary female selection — 2026-10-29

The unchanged `sword-grey-bob.png` and `bow-hood.png` and their original prompts
are also retained here from the same source648830d8. Original built-in output
basenames: exec-06a5395e-9a4d-463f-a5ab-d41e2c0d7f80.png and
exec-657d8dbe-e413-4e5c-9a36-d3096851b0c8.png. Input roles/order match the original
roster: ink battle, unit C, ochre swordsman (style only). Sword canvas1145×1374,
body1255, pivot617,1322; hood bow1225×1284, body1150, pivot604,1241.
These figures are selected only from observer-known sex and a matching weapon.
They are art archetypes, not canonical faces or biographies. No face editor or
height rule is introduced; integrated acceptance remains pending.
