// Art archetypes only: no name, biography, canonical age or physical-height rule.
// Bounds use source-pixel [x, y, width, height] with a six-pixel safety margin.
export const FEMALE_SPRITES = {
  W01: {
    id: 'W01F',
    url: new URL(
      '../../../../assets/art/combat/ink-roster-2026-10-27/sword-grey-bob.png',
      import.meta.url,
    ).href,
    width: 1145,
    height: 1374,
    bodyHeight: 1255,
    footX: 617,
    footY: 1322,
    visibleBounds: [185, 61, 862, 1267] as const,
  },
  W04: {
    id: 'W04F',
    url: new URL(
      '../../../../assets/art/combat/ink-fighters-2026-10-29/female-spear-v1.png',
      import.meta.url,
    ).href,
    width: 1375,
    height: 1144,
    bodyHeight: 1012,
    footX: 581,
    footY: 1107,
    visibleBounds: [57, 85, 1303, 1029] as const,
  },
  W05: {
    id: 'W05F',
    url: new URL(
      '../../../../assets/art/combat/ink-roster-2026-10-27/bow-hood.png',
      import.meta.url,
    ).href,
    width: 1225,
    height: 1284,
    bodyHeight: 1150,
    footX: 604,
    footY: 1241,
    visibleBounds: [201, 18, 1002, 1230] as const,
  },
} as const;
