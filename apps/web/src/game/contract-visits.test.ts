import { describe, expect, it } from 'vitest';

import { lookup } from '../i18n/index.js';
import { issuerBuilding, issuerVenue, visitingIssuer } from './contract-visits.js';

describe('T032 quest meeting points', () => {
  it('sends Savva to the Bereznyak elder and labels his source-backed hunt', () => {
    expect(issuerBuilding('ci.m1.not-one-pack.01')).toBe('elder');
    expect(issuerVenue('ci.m1.not-one-pack.01')).toBe('Дом старейшины');
    expect(lookup('contract.ci.m1.not-one-pack.01.title')).toBe('Вожак с рваным ухом');
    expect(lookup('npc.woodland-village-caller.savva-krivonos.01')).toBe(
      'Савва Кривонос, сосед Тихона Бортника',
    );
  });

  it('sends Gordey to the Kamenny Brod watch and shows both sealed scenario findings', () => {
    const instanceId = 'ci.m1.tracks-over-tracks.01';
    expect(issuerBuilding(instanceId)).toBe('watch');
    expect(issuerVenue(instanceId)).toBe('Караульня');
    expect(
      visitingIssuer({ siteId: 'kamenny-brod', building: 'watch' }, instanceId, 'kamenny-brod'),
    ).toBe(true);
    expect(lookup('contract.ci.m1.tracks-over-tracks.01.title')).toBe('Свежие следы на дороге');
    expect(
      lookup('contract.ci.m1.tracks-over-tracks.01.result.tracks-over-tracks.bandits-fresh-traces'),
    ).toContain('подкованные сапоги');
  });
});
