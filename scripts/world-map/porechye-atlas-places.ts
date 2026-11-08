// Retained center-tile annotations for atlas v6; geometry lives in game-core.
// A local geography proposal, not a canonical world edition. Physical distances
// describe the drawing only; canonical movement lives in game-core.
// Five place identities: places.csv/porechye.md. Additional atlas proposals:
// war-13, war-14, nature-08 in stozhar-v3/places.json. All positions are retained drafts.
export const places = [
  {
    name: 'Березняк',
    at: [195, 220],
    label: [195, 166],
    description:
      'Лесная деревня с травницей. Дворы выходят к дороге, за ними — огороды и лесные тропы.',
  },
  {
    name: 'Северный Двор',
    at: [700, 185],
    label: [700, 139],
    description:
      'Хлебный хутор среди полос пашни на северном берегу. Дорога связывает его с лесной деревней и Бродом.',
  },
  {
    name: 'Каменный Брод',
    at: [1125, 365],
    label: [1100, 278],
    description:
      'Рынок, караульня и единственная каменная переправа для телег. Здесь сходятся дороги обоих берегов.',
  },
  {
    name: 'Тихая Гать',
    at: [1390, 800],
    label: [1385, 865],
    description:
      'Жилое речное село на сухом южном берегу. Настилы ведут к воде; местные перевозчики знают Мутню.',
  },
  {
    name: 'Старая мельница',
    at: [810, 620],
    label: [810, 688],
    description:
      'Сгоревшая мельница у реки. Опасная руина: она не работает и не восстанавливается.',
  },
  {
    name: 'Караульный мост',
    at: [315, 441],
    label: [380, 385],
    description:
      'Деревянный настил на старых опорах. Действующий обход разрушенной Вязовской переправы.',
  },
  {
    name: 'Вязов · разрушен',
    at: [210, 475],
    label: [150, 494],
    description:
      'Средний пролёт обрушен. Подойти можно с сухого южного берега; перейти здесь нельзя.',
  },
  {
    name: 'Земляные редуты',
    at: [440, 120],
    label: [510, 95],
    description: 'Низкие старые земляные укрепления у речного подхода.',
  },
  {
    name: 'Братские ямы',
    at: [975, 623],
    label: [995, 690],
    description:
      'Неглубокие погребения у сгоревшей мельницы и вдоль берега. Память о Бродской сече.',
  },
  {
    name: 'Глинистый берег',
    at: [510, 430],
    label: [550, 398],
    description:
      'Серый берег Мутни со следами подходов к переправе. Река здесь остаётся непроходимой.',
  },
] as const;
