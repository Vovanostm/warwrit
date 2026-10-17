import type { CombatLabView } from '@warwrit/protocol';

export interface StaticSpriteArt {
  readonly id: string;
  readonly url: string;
  /** Gallery measurements in source pixels. Body height excludes weapons and canvas margin. */
  readonly width: number;
  readonly height: number;
  readonly bodyHeight: number;
  readonly footX: number;
  readonly footY: number;
  /** Opaque art bounds plus a small source-pixel safety margin; UI never crops anatomy. */
  readonly visibleBounds: readonly [number, number, number, number];
}

// For unanchored creatures, alpha bounds at >=25% opacity provide a provisional
// comparative body height and foot baseline; in-game creature scale remains unmeasured.
const art = {
  W01: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w01/sprite.png',
      import.meta.url,
    ).href,
    width: 1240,
    height: 1269,
    bodyHeight: 1236,
    footX: 641.75,
    footY: 1207.5,
    visibleBounds: [234, 14, 759, 1251],
  },
  W02: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w02/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1196,
    footX: 642,
    footY: 1163,
    visibleBounds: [256, 22, 749, 1210],
  },
  W03: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w03/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1171,
    footX: 642.75,
    footY: 1153.5,
    visibleBounds: [297, 43, 931, 1185],
  },
  W04: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w04/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 825,
    footX: 526,
    footY: 1044.5,
    visibleBounds: [122, 164, 1034, 928],
  },
  W05: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w05/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1177,
    footX: 660.75,
    footY: 1162.5,
    visibleBounds: [233, 32, 708, 1191],
  },
  W06: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w06/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1173,
    footX: 656.5,
    footY: 1149,
    visibleBounds: [326, 33, 621, 1186],
  },
  W07: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w07/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1157,
    footX: 658,
    footY: 1155,
    visibleBounds: [320, 50, 650, 1170],
  },
  W08: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w08/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1115,
    footX: 617,
    footY: 1140.5,
    visibleBounds: [297, 81, 889, 1128],
  },
  W09: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w09/sprite.png',
      import.meta.url,
    ).href,
    width: 1145,
    height: 1374,
    bodyHeight: 958,
    footX: 556.75,
    footY: 1190.5,
    visibleBounds: [135, 152, 929, 1092],
  },
  W10: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/w10/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1161,
    footX: 641,
    footY: 1163.5,
    visibleBounds: [287, 49, 819, 1174],
  },
  B001: {
    url: new URL('../../../../assets/art/m1/battle/unit-wolf.png', import.meta.url).href,
    width: 512,
    height: 512,
    bodyHeight: 293,
    footX: 259,
    footY: 491,
    visibleBounds: [43, 192, 432, 304],
  },
  B002: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b002/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 951,
    footX: 634.5,
    footY: 1121,
    visibleBounds: [62, 163, 1146, 964],
  },
  B003: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b003/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1024,
    footX: 635.5,
    footY: 1164,
    visibleBounds: [53, 133, 1164, 1037],
  },
  B017: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b017/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 950,
    footX: 641,
    footY: 1134,
    visibleBounds: [66, 177, 1150, 963],
  },
  B019: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b019/sprite.png',
      import.meta.url,
    ).href,
    width: 1145,
    height: 1374,
    bodyHeight: 1260,
    footX: 674.5,
    footY: 1327,
    visibleBounds: [290, 60, 769, 1274],
  },
  B023: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b023/sprite-v3.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1243,
    footX: 690.5,
    footY: 1253,
    visibleBounds: [285, 3, 812, 1251],
  },
  B025: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b025/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1204,
    footX: 698.5,
    footY: 1236,
    visibleBounds: [335, 26, 727, 1217],
  },
  B030: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b030/sprite-v3.png',
      import.meta.url,
    ).href,
    width: 1222,
    height: 1287,
    bodyHeight: 1192,
    footX: 613.5,
    footY: 1241,
    visibleBounds: [32, 43, 1163, 1204],
  },
  B037: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b037/sprite-v2.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 804,
    footX: 688.5,
    footY: 1175,
    visibleBounds: [228, 364, 921, 818],
  },
  B053: {
    url: new URL(
      '../../../../assets/art/combat/stage1-2026-10-09/roster/b053/sprite.png',
      import.meta.url,
    ).href,
    width: 1254,
    height: 1254,
    bodyHeight: 1206,
    footX: 632.5,
    footY: 1226,
    visibleBounds: [11, 13, 1243, 1220],
  },
} satisfies Record<string, Omit<StaticSpriteArt, 'id'>>;

type SpriteId = keyof typeof art;

const byWeapon: Readonly<Record<string, SpriteId>> = {
  'sword-shield': 'W01',
  raider: 'W02',
  'great-weapon': 'W03',
  spear: 'W04',
  bow: 'W05',
};

const creatureNames: ReadonlyArray<readonly [RegExp, SpriteId]> = [
  [/wolf|волк/i, 'B001'],
  [/bear|медвед/i, 'B002'],
  [/boar|вепр/i, 'B003'],
  [/grave.?beast|могильн.*звер/i, 'B017'],
  [/grave.?warden|могильн.*сторож/i, 'B019'],
  [/hanging|висельн/i, 'B023'],
  [/reed|камыш/i, 'B025'],
  [/shore|берегов/i, 'B030'],
  [/hollow.?voice|пустоголос/i, 'B037'],
  [/mill|мельнич/i, 'B053'],
];

export function spriteForUnit(unit: CombatLabView['units'][number]): StaticSpriteArt {
  const identity = `${unit.profileId ?? ''} ${unit.name ?? ''} ${unit.id}`;
  const token = identity.toUpperCase().match(/\b(?:W\d{2}|B\d{3})\b/)?.[0] as SpriteId | undefined;
  const id =
    token && token in art
      ? token
      : unit.sideId === 'human'
        ? (byWeapon[unit.weaponId] ?? 'W01')
        : (creatureNames.find(([pattern]) => pattern.test(identity))?.[1] ?? 'B001');
  return { id, ...art[id] };
}
