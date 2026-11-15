import { PAINTED_ATLAS_SITES } from '@warwrit/game-core';
import { describe, expect, it } from 'vitest';

import { emptyWatchFordMarkerSnapshot } from './cartography.js';

describe('empty-watch atlas knowledge', () => {
  it('pins the learned old-ford direction to the authored Kamenny Brod contact without making a route target', () => {
    const marker = emptyWatchFordMarkerSnapshot();
    const contact = PAINTED_ATLAS_SITES.find((site) => site.siteId === 'kamenny-brod')!;
    expect(marker).toEqual({
      siteId: 'quest.m1.empty-watch-record.old-ford',
      name: 'Старый брод у ив · примерное направление',
      icon: 'bridge',
      point: {
        xMicroFp: String(contact.anchorFp.xFp * 65_536),
        zMicroFp: String(contact.anchorFp.zFp * 65_536),
      },
    });
    expect(PAINTED_ATLAS_SITES.some((site) => site.siteId === marker.siteId)).toBe(false);
  });
});
