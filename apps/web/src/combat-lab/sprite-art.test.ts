import { expect, it } from 'vitest';
import { spriteForUnit } from './sprite-art.js';

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
