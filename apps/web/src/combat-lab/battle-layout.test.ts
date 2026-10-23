import { expect, it } from 'vitest';
import { spriteCatalogue, spriteScale } from './sprite-art.js';
import {
  BATTLE_HEX_RADIUS,
  BATTLE_LAYOUT,
  battleHexToWorld,
  catalogueSpacing,
} from './battle-layout.js';

it('fits every exported sprite at the minimal upward 0.05 step without changing figure heights', () => {
  const catalogue = spriteCatalogue();
  expect(catalogue.some(({ id }) => id === 'W01-unarmed')).toBe(true);
  expect(catalogue.some(({ id }) => id === 'unknown-combatant')).toBe(true);
  expect(new Set(catalogue.map(({ id }) => id)).size).toBe(catalogue.length);
  for (const sprite of catalogue) {
    const resolved = sprite.id.startsWith('W')
      ? 1.4
      : ({ B001: 0.73, B002: 1.62, B053: 1.62 }[sprite.id] ?? 1.23);
    expect(spriteScale(sprite)).toBe((resolved * 0.82) / sprite.bodyHeight);
    expect(sprite.alphaWidth * spriteScale(sprite)).toBeLessThanOrEqual(
      0.9 * BATTLE_LAYOUT.spacing,
    );
  }
  const widest = Math.max(...catalogue.map((sprite) => sprite.alphaWidth * spriteScale(sprite)));
  expect(widest).toBeGreaterThan(0.9 * (BATTLE_LAYOUT.spacing - 0.05));
  expect(BATTLE_LAYOUT.spacing / 0.05).toBeCloseTo(Math.round(BATTLE_LAYOUT.spacing / 0.05), 12);
  expect(BATTLE_LAYOUT.heightStep).toBe(0.28);
  expect(BATTLE_HEX_RADIUS).toBe(BATTLE_LAYOUT.spacing / Math.sqrt(3));
  const a = battleHexToWorld({ q: 3, r: 2 });
  const b = battleHexToWorld({ q: 4, r: 2 });
  expect(b.x - a.x).toBeCloseTo(BATTLE_LAYOUT.spacing, 12);
  expect(b.z).toBe(a.z);
});

it('detects a widened catalogue entry against saved spacing and recomputes its fit', () => {
  const catalogue = spriteCatalogue();
  const wider = catalogue.map((sprite) =>
    sprite.id === 'B001' ? { ...sprite, alphaWidth: sprite.alphaWidth * 4 } : sprite,
  );
  const fits = (spacing: number) =>
    wider.every((sprite) => sprite.alphaWidth * spriteScale(sprite) <= 0.9 * spacing);
  expect(fits(BATTLE_LAYOUT.spacing)).toBe(false);
  expect(fits(catalogueSpacing(wider))).toBe(true);
  expect(catalogueSpacing(catalogue)).toBe(BATTLE_LAYOUT.spacing);
});

it('never rounds below an exact or just-over-boundary fit', () => {
  const art = spriteCatalogue()[0]!;
  for (const width of [0.9, 1.62, 1.620000000000001]) {
    const catalogue = [{ ...art, alphaWidth: width / spriteScale(art) }];
    const spacing = catalogueSpacing(catalogue);
    const measured = catalogue[0]!.alphaWidth * spriteScale(art);
    expect(measured).toBeLessThanOrEqual(0.9 * spacing);
    expect(measured).toBeGreaterThan(0.9 * (spacing - 0.05));
  }
});
