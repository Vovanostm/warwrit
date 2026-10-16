# Static combat roster — owner approval, 2026-10-09

The owner approved the overall mill direction, dark B053 sample and existing
fighter C as the shield-warrior foundation. They selected W01–W10 and the ten
bestiary IDs in the owning battlefield specification. Produce one transparent
static full-body sprite per assigned ID; no animation or sprite sheet.

All artists must personally view the same references before image generation:

- `assets/art/m1/style/unit-c-ink.png`: approved human anatomy, pose, weapon
  proportions and ink rendering; W01 must preserve this foundation.
- `assets/art/m1/places/settlements-v2/staraya-melnitsa.png`: scene materials,
  subdued palette, light and ruined place identity.
- `assets/art/combat/stage1-2026-10-09/keyart/battle-ux-v3.png`: approved overall
  direction, fixed elevated three-quarter projection.
- Creatures additionally view
  `assets/art/combat/stage1-2026-10-09/creature-b053/night-mill-beast-concept-v2.png`
  and read their exact `docs/wiki/bestiary/creatures/bNNN.md` card. B053 also
  views `assets/art/m1/battle/unit-mill-beast.png` and preserves its anatomy.

Use built-in image_gen only. Read its skill. Transparent background must be
true. For reference-based generation, supply inspected local references through
referenced_image_paths and state their roles explicitly. Save the returned file
into your assigned persistent directory as `sprite.png`; save exact tool prompt,
references, returned source path, observed dimensions/alpha and limitations in
`provenance.json`. Do not print base64. No CLI fallback, dependencies or paid
provisioning. One call initially; at most one targeted correction for an actual
cropping/anatomy/alpha failure. Do not keep whole-figure tuning a weapon.

Rendering: irregular dark ink contours, internal hatching, flat wash, strong
shadow masses, matte weathered iron/cloth/leather/wood, muted soot/slate/umber/
ochre with restrained rust. Adult credible anatomy, ordinary practical equipment,
no heraldry or invented symbols, magic, glowing eyes or franchise copying.
Fixed elevated three-quarter view, facing screen upper-right, lit upper-left;
full subject and equipment with margins, grounded feet/paws. Do not mirror baked
light. No ground tile, pedestal, terrain patch, text, border or painted contact
shadow. Parent authors grounding from the actual occupancy later.

At the supported 1440×900 viewport a human occupies 80 px height; larger creatures
are scaled relative to humans, not granted extra occupied cells. Make silhouettes
and weapons readable at this size. W01's sword must match C's visible length and
grip: previous generated W01 v1/v2 failed and are not the reference.

One writer per assigned ID directory. Others are working in the repository;
never revert their changes or edit shared documentation/HTML. Do not commit or
publish. Return saved paths, exact subject observations, dimensions/alpha,
actual checks and remaining concerns. Independent visual acceptance belongs to
the parent and critic; a successful image call is not an ACCEPT.
