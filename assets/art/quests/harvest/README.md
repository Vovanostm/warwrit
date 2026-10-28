# «Полудница» — selected local quest art

Eight distinct frames accompany [the playable Russian adaptation](../../../../apps/web/src/mission-lab/harvest.ts)
of B02, `docs/content/visual-novels/service.md` at historical commit `8de22870`.
One local creature/incident does not establish a species-wide magic rule.

## Fixed cast and place

[Humans](references/humans.png): Rada 31, angular working face, brown braid under
ochre headscarf; charcoal linen shirt with RIGHT elbow patch, brown wool skirt,
flax apron, brown boots. Split lower lip and dusty hem/hands persist. RIGHT hand
holds the simple dark iron/ash sickle unless it is explicitly laid on the cart;
LEFT protects the lip. Luka 49 has thinning grey-brown hair/beard, flax shirt,
dark umber sleeveless tunic, charcoal trousers, calf boots and narrow leather belt.
Timosh 19 has short dark hair, no beard, clay-beige rolled-sleeve shirt, grey
trousers, brown boots and rope belt. The recent dead worker has a slit brown
shirt; dark cap covers face, then plain linen covers body on cart. No invented
decay or moving corpse. Sheets cover front/three-quarter identity, not rear/grips.

[Creature](references/creature.png): tall narrow figure, long connected arms,
matte clay-grey skin, matted hair over face, weathered hanging flax garment.
No antlers, glow, extra limb, weapon or pleasant portrait pose. It threatens
from standing rye; contact boundaries follow the specific observed encounter.

[Continuity](continuity.json) supplies full descriptions, scene instants,
material states and amendments. Road/cart remain west, standing rye east,
alder grove/cloud behind. Cart moves back after inspection. Two ROUND timber
shields are present from arrival; the first is gouged at `edge`, neither repairs
itself. Shared early/late `leave` conceals the variable edge behind shroud/cart.
Luka's warning belt is removed from his waist. Body and sheaves have separate
cart space. Later dusk warmth follows actual elapsed work; no rain or wet reset.

## JSON generation and provenance

`requests/<scene>.brief.json` is a prospective scene request; matching
`requests/<scene>.arguments.json` is direct tool JSON. Ordered tracked references
have explicit identity/style/layout scope. Each request describes only its own
moment and keeps fixed identities separate from observed facts.

```sh
node .agents/skills/warwrit-art/scripts/validate-brief.mjs assets/art/quests/harvest/requests/terms.brief.json --arguments
```

Recompile in the destination checkout for absolute attachment paths. These
requests are **not executed history**, and do not promise deterministic pixels.
[Execution](execution.json) retains actual initial/corrective calls, original
arguments/native output paths and current aliases. Some historical input paths
are ignored local working files; do not mistake them for portable references.
Original paint/pose diagrams under `references/` are guides, not final palettes.

First human/creature/opening and complete eight-frame/16 source+dim reader
review ACCEPT at 1280×720, all seven applicable criteria 2/3. In `edgeHarvest`
the still cart waits for division BEFORE the share is placed aboard; `terms`
keeps Timosh's hands empty. Full sequence/production amendments are recorded in the
[owning result](../../../../docs/wiki/mission-testing.md).
Tiny lip-corner laterality and occluded grips remain `NOT_VERIFIABLE`;
player enjoyment and owner acceptance remain `NOT_MEASURED`.
