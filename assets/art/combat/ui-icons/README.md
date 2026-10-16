# Combat command icons

Local SVG subset from [Game Icons](https://game-icons.net), inspected at
[game-icons/icons revision 82d9488](https://github.com/game-icons/icons/tree/82d948812bfe3f269ef8f731dcdb07b08160edc4).
Icons made by Lorc, Delapouite and Sbed. Licensed under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); upstream attribution
and terms are preserved in [license.txt](license.txt). Credit also appears in
the battle log. No endorsement by the authors is implied.

| Use            | Upstream path / author                    |
| -------------- | ----------------------------------------- |
| Attack         | `lorc/crossed-swords.svg` — Lorc          |
| Move           | `lorc/walking-boot.svg` — Lorc            |
| Defend         | `sbed/shield.svg` — Sbed                  |
| End turn       | `lorc/hourglass.svg` — Lorc               |
| Retreat        | `lorc/run.svg` — Lorc                     |
| Shield brace   | `delapouite/shield-bash.svg` — Delapouite |
| Armor pressure | `lorc/hammer-drop.svg` — Lorc             |
| Reach thrust   | `lorc/barbed-spear.svg` — Lorc            |
| Aimed shot     | `lorc/arrow-scope.svg` — Lorc             |
| Rally          | `lorc/tattered-banner.svg` — Lorc         |

Adaptation: removed only the opaque square background from each SVG, retaining
the foreground silhouette. CSS masks apply the existing interface colour and
disabled/selected states. No raster generation, sprite modification or runtime
dependency was needed. Decorative icons inherit their meaning from the named
button and its existing tooltip, cost, shortcut and refusal reason.

Selection scope: one game-specific family, ten inspected source SVGs and its
license. Generic thin-line icons would retain the owner-rejected visual idiom;
generated bitmaps would require another consistency pass. The decisive check is
actual readability at command/skill size in the desktop scene, not catalogue
appearance.
