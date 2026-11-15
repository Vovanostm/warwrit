// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { NpcPortrait } from './NpcPortrait.js';

let root: Root | undefined;
let host: HTMLDivElement | undefined;

async function render(actorId: string) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<NpcPortrait actorId={actorId} />));
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  host?.remove();
  host = undefined;
});

it.each([
  ['ULITA', 'ulita-tkachikha-v1.png'],
  ['KONDRAT', 'kondrat-ovsyanik-v1.png'],
  ['SENKA', 'senka-v1.png'],
  ['npc.city-watch-contact.kamenny-brod.01', 'gordey-lapa-v1.png'],
  ['npc.woodland-village-caller.bereznyak.01', 'tikhon-bortnik-v1.png'],
  ['npc.local-warning-keeper.tikhaya-gat.01', 'frol-zvonar-v1.png'],
])('uses the approved portrait for %s', async (actorId, filename) => {
  await render(actorId);
  expect(host?.querySelector('img')?.getAttribute('src')).toContain(filename);
  expect(host?.querySelector('.npc-portrait')?.getAttribute('aria-hidden')).toBe('true');
});

it('keeps a plain initial fallback for unknown speakers', async () => {
  await render('UNKNOWN');
  expect(host?.querySelector('img')).toBeNull();
  expect(host?.querySelector('.npc-portrait-fallback')?.textContent).toBe('U');
});
