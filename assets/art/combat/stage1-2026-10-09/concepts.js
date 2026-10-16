// Shared immutable metadata for the historical UI concept galleries.
globalThis.WarwritCombatGalleryData = (() => {
  const artRoot = '../';
  const unitArt = Object.freeze({
    W01: Object.freeze({
      url: `${artRoot}roster/w01/sprite.png`,
      width: 1240,
      height: 1269,
      body: 1236,
      foot: 1207.5,
    }),
    W02: Object.freeze({
      url: `${artRoot}roster/w02/sprite.png`,
      width: 1254,
      height: 1254,
      body: 1196,
      foot: 1163,
    }),
    W03: Object.freeze({
      url: `${artRoot}roster/w03/sprite.png`,
      width: 1254,
      height: 1254,
      body: 1171,
      foot: 1153.5,
    }),
    W04: Object.freeze({
      url: `${artRoot}roster/w04/sprite.png`,
      width: 1254,
      height: 1254,
      body: 825,
      foot: 1044.5,
    }),
    W05: Object.freeze({
      url: `${artRoot}roster/w05/sprite.png`,
      width: 1254,
      height: 1254,
      body: 1177,
      foot: 1162.5,
    }),
    W06: Object.freeze({
      url: `${artRoot}roster/w06/sprite.png`,
      width: 1254,
      height: 1254,
      body: 1173,
      foot: 1149,
    }),
    W08: Object.freeze({
      url: `${artRoot}roster/w08/sprite.png`,
      width: 1254,
      height: 1254,
      body: 1115,
      foot: 1140.5,
    }),
    B001: Object.freeze({
      url: '../../../m1/battle/unit-wolf.png',
      width: 512,
      height: 512,
      body: 293,
      foot: 491,
    }),
    B003: Object.freeze({
      url: `${artRoot}roster/b003/sprite.png`,
      width: 1254,
      height: 1254,
      body: 1024,
      foot: 1164,
    }),
    B019: Object.freeze({
      url: `${artRoot}roster/b019/sprite.png`,
      width: 1145,
      height: 1374,
      body: 1260,
      foot: 1327,
    }),
    B025: Object.freeze({
      url: `${artRoot}roster/b025/sprite.png`,
      width: 1254,
      height: 1254,
      body: 1204,
      foot: 1236,
    }),
    B053: Object.freeze({
      url: `${artRoot}roster/b053/sprite.png`,
      width: 1254,
      height: 1254,
      body: 1206,
      foot: 1226,
    }),
  });
  const units = Object.freeze(
    [
      { id: 'shield', art: 'W01', name: 'Меч + щит', q: 2, r: 2, side: 'human' },
      { id: 'arbalest', art: 'W08', name: 'Арбалет', q: 5, r: 2, side: 'human' },
      { id: 'spear', art: 'W04', name: 'Копьё', q: 2, r: 6, side: 'human' },
      { id: 'archer', art: 'W05', name: 'Лучник', q: 5, r: 6, side: 'human' },
      { id: 'great', art: 'W03', name: 'Двуручный топор', q: 2, r: 10, side: 'human' },
      { id: 'knife', art: 'W06', name: 'Нож', q: 5, r: 10, side: 'human' },
      { id: 'wolf', art: 'B001', name: 'Волк', q: 8, r: 6, side: 'enemy', legal: true, size: 48 },
      { id: 'target', art: 'W02', name: 'Топор + щит', q: 9, r: 3, side: 'enemy', legal: true },
      { id: 'boar', art: 'B003', name: 'Дикий вепрь', q: 10, r: 7, side: 'enemy', size: 61 },
      { id: 'warden', art: 'B019', name: 'Могильный сторож', q: 12, r: 3, side: 'enemy', size: 86 },
      { id: 'reed', art: 'B025', name: 'Камышник', q: 10, r: 10, side: 'enemy', size: 82 },
      { id: 'mill', art: 'B053', name: 'Мельничная тварь', q: 13, r: 7, side: 'enemy', size: 106 },
    ].map((unit) => Object.freeze(unit)),
  );
  const turnOrder = Object.freeze([
    'archer',
    'wolf',
    'arbalest',
    'spear',
    'target',
    'great',
    'boar',
    'knife',
    'mill',
    'shield',
    'warden',
    'reed',
  ]);
  return Object.freeze({ unitArt, units, turnOrder });
})();
