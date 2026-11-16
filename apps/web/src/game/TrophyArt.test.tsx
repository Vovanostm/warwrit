// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { TrophyArt } from './TrophyArt.js';
import { itemLabel } from './format.js';

let root: Root | undefined;
let host: HTMLDivElement | undefined;

async function render(definitionId: string) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<TrophyArt definitionId={definitionId} />));
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  host?.remove();
  host = undefined;
});

it.each([
  ['beast-claw-trophy', 'beast-claw-v1.png'],
  ['raider-standard-trophy', 'raider-standard-v1.png'],
])('shows art for known carried trophy %s', async (definitionId, filename) => {
  await render(definitionId);
  expect(host?.querySelector('img')?.getAttribute('src')).toContain(filename);
  expect(host?.querySelector('img')?.getAttribute('alt')).toBe('');
});

it('leaves unknown item art and labels on the existing fallback', async () => {
  await render('unregistered-item');
  expect(host?.querySelector('img')).toBeNull();
  expect(itemLabel('unregistered-item')).toBe('unregistered-item');
  expect(itemLabel('beast-claw-trophy')).toBe('Коготь зверя');
});
