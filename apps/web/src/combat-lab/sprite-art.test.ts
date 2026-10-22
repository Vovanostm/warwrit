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

it.each(['W01', 'B002'])(
  'preserves %s canvas dimensions, pivot and projected corners',
  async (id) => {
    const { spriteCatalogue, spriteGeometry, spriteScale } = await import('./sprite-art.js');
    const { projectCameraPoint } = await import('../renderer/camera-projection.js');
    const { CAMERA_ELEVATION } = await import('../renderer/three-quarter-camera.js');
    const art = spriteCatalogue().find((entry) => entry.id === id)!;
    const legacyScale = ((id === 'W01' ? 1.4 : 1.62) * 0.82) / art.bodyHeight;
    const geometry = spriteGeometry(art);
    expect(spriteScale(art)).toBe(legacyScale);
    expect(geometry.width).toBe(art.width * legacyScale);
    expect(geometry.height).toBe(art.height * legacyScale);
    expect(geometry.anchorX).toBeCloseTo((art.footX / art.width - 0.5) * geometry.width, 14);
    expect(geometry.footY).toBe((art.footY - art.height / 2) * legacyScale);
    const reference = { targetX: 10, targetZ: 5, distance: 41.6 };
    const [left, top, width, height] = art.visibleBounds;
    const right = left + width,
      bottom = top + height;
    const expected = [left, right].flatMap((x) =>
      [top, bottom, art.footY].map((y) => ({
        x: (x - art.footX) * legacyScale,
        up: (art.footY - y) * legacyScale,
      })),
    );
    const project = ({ x, up }: { x: number; up: number }) =>
      projectCameraPoint(
        {
          x: 4 + x,
          y: 0.56 + up * Math.cos(CAMERA_ELEVATION),
          z: 3 + up * Math.sin(CAMERA_ELEVATION),
        },
        reference,
        CAMERA_ELEVATION,
      );
    expect(geometry.corners.map(project)).toEqual(expected.map(project));
  },
);

it('derives the minimal upward 0.05 spacing from every catalogue silhouette and detects widening', async () => {
  const { spriteCatalogue, spriteScale } = await import('./sprite-art.js');
  const { BATTLE_LAYOUT, catalogueSpacing } = await import('./battle-layout.js');
  const catalogue = spriteCatalogue();
  const fits = (entries: typeof catalogue, spacing: number) =>
    entries.every((a) => a.alphaWidth * spriteScale(a) <= 0.9 * spacing);
  expect(catalogue.map((a) => a.id)).toContain('B001');
  expect(catalogue.map((a) => a.id)).toContain('W01-unarmed');
  expect(fits(catalogue, BATTLE_LAYOUT.spacing)).toBe(true);
  expect(fits(catalogue, BATTLE_LAYOUT.spacing - 0.05)).toBe(false);
  expect(BATTLE_LAYOUT.spacing / 0.05).toBeCloseTo(Math.round(BATTLE_LAYOUT.spacing / 0.05), 12);
  const widened = catalogue.map((a) =>
    a.id === 'B001' ? { ...a, alphaWidth: a.alphaWidth * 4 } : a,
  );
  expect(fits(widened, BATTLE_LAYOUT.spacing)).toBe(false);
  expect(fits(widened, catalogueSpacing(widened))).toBe(true);
  for (const a of catalogue)
    expect((spriteScale(a) * a.bodyHeight) / 0.82).toBeCloseTo(
      a.id.startsWith('W')
        ? 1.4
        : (({ B001: 0.73, B002: 1.62, B053: 1.62 } as Record<string, number>)[a.id] ?? 1.23),
      12,
    );
});
