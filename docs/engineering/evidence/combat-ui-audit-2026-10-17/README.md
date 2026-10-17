# Combat UI audit evidence — 2026-10-17

Captured for [the audit and fix specification](../../../wiki/battlefield-test-maps.md#аудит-ui-боя-и-тз-исправлений--2026-10-17).
Source: actual `main` a934355, web 5344 / API 3044, default mill battle 6×6,
Chromium (Playwright) 1440×900, GPU flags, no state injection. Frames were
downscaled to 1200 px JPEG; `z-*` files are enlarged crops.
`readability-branch-start.jpg` is the unmerged `codex/combat-readability`
branch (web 5336) at the same viewport, matching the owner's screenshot.

| File                                      | Shows                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `01-start.jpg`                            | First player frame: active archer, colour channels, HUD over movement cells, dock width |
| `z-timeline.jpg`                          | Initiative strip: 8 px «ХОД», tiny side marks, clipped round 2                          |
| `02-hover-reach.jpg`                      | Path forecast rendered in the left column, far from the cursor                          |
| `11-hover-wolf-inrange.jpg`               | Enemy hover: card only, no attack forecast or refusal reason                            |
| `13-portrait-hover.jpg`                   | Portrait tooltip in the left column                                                     |
| `15-skill-mode.jpg`                       | Skill tooltip with refusal reason; slot looks available                                 |
| `16-attack-mode.jpg`                      | «Атака» click: tooltip only, no targeting mode                                          |
| `03-cmd-0.jpg`, `12-util-0.jpg`           | Command and utility tooltips                                                            |
| `20-log-open.jpg`                         | Log: target-only entries, roster buttons and icon credits inside                        |
| `21-menu.jpg`, `22-night.jpg`             | Menu and night scene                                                                    |
| `30-hover-move.jpg`                       | 4-cell path: «0 ОД останется», no lost-attack warning                                   |
| `31b-after-move.jpg`, `z-event-label.jpg` | Turn passed automatically; small «ШАГ · −4 ОД» label                                    |
| `35-endturn-1.jpg`                        | Key 4 ended Commander's untouched 4/4 AP turn                                           |
| `40-auto-09.jpg`, `40-auto-13.jpg`        | Autobattle: «Ваш ход», dock header of inspected unit, crowding                          |
| `41-terminal.jpg`                         | Result panel over final positions; autobattle utility still shown                       |
| `z-mill-creature-vs-hex.jpg`              | Mill creature wider than its hex in main                                                |
| `terminal-log-excerpt.txt`                | Expanded log text after victory                                                         |

## Sprite footprint measurement

Alpha ≥ 64 bounding box of the source PNG, converted with main's
`spriteDisplayHeight × 0.82 / bodyHeight`
([sprite-battle-scene.ts](https://github.com/Vovanostm/warwrit/blob/a934355/apps/web/src/combat-lab/sprite-battle-scene.ts#L1265-L1268),
[sprite-art.ts](https://github.com/Vovanostm/warwrit/blob/a934355/apps/web/src/combat-lab/sprite-art.ts)).
Main hex flat width is 1 world unit (`HEX_RADIUS = 1/√3`); the readability
branch multiplies cell spacing by 2.6 without changing figures.

| Sprite | Unit           | Visible width, world | Main, × hex width | Readability 2.6 | Proposed 1.8 |
| ------ | -------------- | -------------------- | ----------------- | --------------- | ------------ |
| W01    | sword + shield | 0.69                 | 0.69              | 0.27            | 0.38         |
| W05    | bow            | 0.65                 | 0.65              | 0.25            | 0.36         |
| B002   | bear           | 1.58                 | 1.58              | 0.61            | 0.88         |
| B053   | mill creature  | 1.36                 | 1.36              | 0.52            | 0.75         |
| B017   | grave beast    | 1.21                 | 1.21              | 0.46            | 0.67         |
| B003   | boar           | 1.13                 | 1.13              | 0.44            | 0.63         |

Wolf B001 uses the 512 px `unit-wolf.png`; it was not measured here.
