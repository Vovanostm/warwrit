import { expect, it } from 'vitest';
import { spriteCatalogue, spriteForUnit, spriteGeometry, spriteScale } from './sprite-art.js';

it.each([
  ['W01', 'sword-shield', 'human', 1.4, 1236],
  ['B002', undefined, 'creature', 1.62, 951],
  ['B053', undefined, 'creature', 1.62, 1206],
  ['W01', 'fists', 'human', 1.4, 1241],
  ['unknown', undefined, 'human', 1.23, 418],
] as const)(
  'preserves dimensions, pivot and padded corners for %s/%s',
  (profileId, weaponId, visualKind, bodyHeight, sourceHeight) => {
    const art = spriteForUnit({ id: profileId, profileId, weaponId, visualKind } as never);
    const scale = (bodyHeight * 0.82) / sourceHeight;
    expect(spriteScale(art)).toBe(scale);
    const geometry = spriteGeometry(art);
    expect(geometry.width).toBe(art.width * scale);
    expect(geometry.height).toBe(art.height * scale);
    expect(geometry.anchorX).toBe((art.footX / art.width - 0.5) * (art.width * scale));
    expect(geometry.footY).toBe((art.footY - art.height / 2) * scale);
    expect(geometry.corners).toHaveLength(6);
    const [left, top, width, height] = art.visibleBounds;
    const right = left + width;
    const bottom = top + height;
    expect(geometry.corners).toEqual([
      { x: (left - art.footX) * scale, up: (art.footY - top) * scale },
      { x: (left - art.footX) * scale, up: (art.footY - bottom) * scale },
      { x: (left - art.footX) * scale, up: 0 },
      { x: (right - art.footX) * scale, up: (art.footY - top) * scale },
      { x: (right - art.footX) * scale, up: (art.footY - bottom) * scale },
      { x: (right - art.footX) * scale, up: 0 },
    ]);
  },
);

it('uses the measured unarmed W01 derivative for a public fists weapon', () => {
  const sprite = spriteForUnit({
    id: 'company.fighter.01',
    name: 'Unarmed fighter',
    profileId: 'W01',
    sideId: 'companies',
    position: { q: 0, r: 0 },
    status: 'active',
    weaponId: 'fists',
    visualKind: 'human',
  } as never);

  expect(sprite).toMatchObject({
    id: 'W01-unarmed',
    width: 1240,
    height: 1269,
    bodyHeight: 1241,
    footX: 639,
    footY: 1207.5,
    visibleBounds: [284, 14, 685, 1249],
  });
  expect(sprite.url).toContain('/roster/w01-unarmed/sprite.png');
});

it('keeps the complete W01 padded rectangle rather than treating its width as an endpoint', () => {
  const art = spriteForUnit({ id: 'W01' } as never);
  expect(art.visibleBounds).toEqual([234, 14, 759, 1251]);
  const factor = spriteScale(art);
  expect(Math.max(...spriteGeometry(art).corners.map(({ x }) => x))).toBe(
    (993 - art.footX) * factor,
  );
});

it('resolves every catalogue profile and preserves public weapon, creature and fallback routing', () => {
  for (const art of spriteCatalogue().filter(({ id }) => /^W\d{2}$|^B\d{3}$/.test(id))) {
    expect(spriteForUnit({ id: art.id } as never)).toEqual(art);
  }
  for (const [unit, id] of [
    [{ id: 'human', visualKind: 'human', weaponId: 'bow' }, 'W05'],
    [{ id: 'human', visualKind: 'human' }, 'unknown-combatant'],
    [{ id: 'human', visualKind: 'human', weaponId: 'unrecognized' }, 'unknown-combatant'],
    [{ id: 'bear', visualKind: 'creature' }, 'B002'],
    [{ id: 'unrecognized', visualKind: 'creature' }, 'B001'],
    [{ id: 'unrecognized' }, 'unknown-combatant'],
    [{ id: 'B053', weaponId: 'fists' }, 'W01-unarmed'],
  ] as const)
    expect(spriteForUnit(unit as never).id).toBe(id);
});
