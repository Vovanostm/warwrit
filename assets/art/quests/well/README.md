# «Не уходи» — selected local quest art

Seven distinct frames are used by [the playable Russian text](../../../../apps/web/src/mission-lab/well.ts)
at `/missions-lab`. This is a local authored incident, not a new campaign or undead rule.

## Fixed references and physical continuity

[Cast](references/cast.png) fixes the three front/three-quarter identities.
Prokhor: lean 55-year-old labourer, grey hair/beard, brown torn linen tunic,
grey trousers, short brown boots, waist pressure welt and severed hemp loop.
Kirill: lean 27-year-old, short brown hair/stubble, ochre tunic, charcoal trousers,
grey patch on RIGHT knee, two dark brown mid-calf boots; injured LEFT ankle
never bears weight. Damp excavation clay stays on cuffs, seat and boots.
Dead soldier: sunken earth-grey face, loosened lower lip, earth in mouth,
rotted olive wool and grey rags; no armour, glow or invented burial duration.
Grigory appears only in `wait`: 45, broad, chestnut beard, grey-brown shirt,
olive trousers and brown boots. His dossier is textual; no separate turnaround.

[Continuity](continuity.json) owns the exact cast, materials, old wear and yard.
[Moments](moments.json) owns each selected camera/action instant. The same oak
curb, circular stone shaft, bucket beam, shelter/post, gate and birch persist.
Rope crosses the beam once and anchors to the shelter upright. The corpse
remains pinned below; `anchor` crops the restraint rather than removing it.
The two rescue endings close the well. The refusal ending establishes no fate.
The player stays outside frame: no arbitrary sword placement or new outfit.

## Reusable JSON versus actual execution

`requests/<scene>.brief.json` contains a prospective full scene request;
matching `requests/<scene>.arguments.json` is direct image-tool JSON with
`prompt`, ordered `referenced_image_paths` and `transparent_background`.
They use tracked selected references. Compile again from the checkout root to
resolve local paths:

```sh
node .agents/skills/warwrit-art/scripts/validate-brief.mjs assets/art/quests/well/requests/anchor.brief.json --arguments
```

These regeneration requests have **not** been executed. They are not a claim
that the model will reproduce pixels exactly. Inspect the inputs before use;
generation and any material edit require another image/reader review.

[Execution](execution.json) records all 19 actual calls and selected aliases,
including rejected attempts and exact original arguments. Historical paths
may point to ignored working files/native outputs; those are provenance, not
portable attachments. Earlier root-level `*.brief.json` are historical prepared
requests, superseded by `requests/`; their original staging is not current authority.
The original paint-zone guide under `references/` helped quiet secondary surfaces.

## Review limits

Independent current seven-frame source and 14 source/dim reader-capture review:
**ACCEPT**, all seven applicable criteria 2/3 at 1280×720. Earlier rendering,
restraint, rope and pose findings were corrected or explicitly reconciled with
unsided player prose. The sling behind the body, hidden left foot in depth and
tiny bucket hitch remain `NOT_VERIFIABLE`; illustrations do not certify rescue
engineering. Player enjoyment and owner visual approval remain `NOT_MEASURED`.

Current delivery and executed checks: [mission testing](../../../../docs/wiki/mission-testing.md).
