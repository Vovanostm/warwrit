// Atlas v6 tile placement only. Terrain and roads are owned by the current
// game-core region; historical generation guides are in the WLC-03 archive.
export const atlasTiles = [
  { id: 'nw', column: 0, row: 0 },
  { id: 'n', column: 1, row: 0 },
  { id: 'ne', column: 2, row: 0 },
  { id: 'w', column: 0, row: 1 },
  { id: 'e', column: 2, row: 1 },
  { id: 'sw', column: 0, row: 2 },
  { id: 's', column: 1, row: 2 },
  { id: 'se', column: 2, row: 2 },
] as const;
