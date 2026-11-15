import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { WorldLabCartographyDto } from '@warwrit/protocol';
import { PaintedMapCanvas } from './PaintedMapCanvas.js';

const sheet = { width: 1600, height: 900, fpPerPixel: 10 };
const point = { xMicroFp: '65536', zMicroFp: '-65536' };
const cartography: WorldLabCartographyDto & { readonly mapEdition: string } = {
  schemaVersion: 1,
  revision: '1',
  regionId: 'seroe-porechye',
  gridEdition: 'test',
  mapEdition: 'test',
  weather: 'CLEAR',
  sheet,
  grid: { columns: 1, rows: 1, cellSizeFp: 64, origin: { xFp: 0, zFp: 0 } },
  charted: 'AA==',
  explored: 'AA==',
  visible: 'AA==',
  sites: [
    {
      siteId: 'old-place',
      name: 'Старая застава',
      point,
      icon: 'village',
      source: 'OBSERVED',
      visited: true,
      currentlyVisible: false,
      lastObservedAt: { campaignDay: '4', tick: '230' },
    },
    {
      siteId: 'charted-place',
      name: 'Соседний двор',
      point,
      icon: 'village',
      source: 'CHART',
      visited: false,
      currentlyVisible: false,
    },
    {
      siteId: 'visible-place',
      name: 'Текущий двор',
      point,
      icon: 'village',
      source: 'OBSERVED',
      visited: false,
      currentlyVisible: true,
      lastObservedAt: { campaignDay: '4', tick: '230' },
    },
  ],
  imageTileSize: 384,
};

it('shows dates only for stale observed markers and preserves map controls and site labels', () => {
  const markup = renderToStaticMarkup(
    <PaintedMapCanvas
      companyId="company-1"
      cartography={cartography}
      sites={cartography.sites.map(({ siteId, name }) => ({
        siteId,
        name,
        kind: 'VILLAGE' as const,
        q: 0,
        r: 0,
        danger: 'SAFE' as const,
      }))}
      current={null}
      clock={{ serverMs: 0, receivedAt: 0 }}
      night={false}
      onMove={() => undefined}
      onSelectSite={() => undefined}
    />,
  );

  expect(markup).toContain('aria-label="Старая застава"');
  expect(markup).toContain('Последнее наблюдение: день 4 · такт 230');
  expect(markup).toContain('Видели: день 4 · такт 230');
  expect(markup).toContain('По карте: Соседний двор');
  expect(markup).toContain('По наблюдению: Текущий двор');
  expect(markup.match(/class="site-last-seen"/gu)).toHaveLength(1);
  expect(markup).toContain('колесо мыши меняет масштаб');
  expect(markup).toContain('data-visible="false"');
  expect(markup).toContain('data-visible="true"');
});
