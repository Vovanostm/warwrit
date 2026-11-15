import { describe, expect, it } from 'vitest';

import { readCompanyCombatAggregateState } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import {
  KAMENNY_BROD_GUARD_COURSE,
  courseProviderWalletId,
  ensureCourseProvider,
} from './courses.js';

describe('company course source', () => {
  it('materializes only the canonical guard contact and an empty company tuition wallet', () => {
    const initial = readCompanyCombatAggregateState(createCompanyCombatAggregateFixture().state);
    const once = ensureCourseProvider(initial);
    const twice = ensureCourseProvider(once);
    const providerId = KAMENNY_BROD_GUARD_COURSE.providerId;
    const walletId = courseProviderWalletId(
      initial.economy.lifecycle.worldId,
      initial.economy.lifecycle.companyId,
    );
    const provider = twice.economy.lifecycle.characters.filter(
      (character) => character.identity.characterId === providerId,
    );
    const wallet = twice.economy.finance.wallets.filter((entry) => entry.walletId === walletId);

    expect(provider).toHaveLength(1);
    expect(provider[0]?.presence.location).toEqual(KAMENNY_BROD_GUARD_COURSE.location);
    expect(wallet).toHaveLength(1);
    expect(wallet[0]).toMatchObject({
      owner: { kind: 'CHARACTER', id: providerId },
      location: KAMENNY_BROD_GUARD_COURSE.location,
      cashQ: '0',
    });
    expect(twice.economy.lifecycle.characters).toHaveLength(
      once.economy.lifecycle.characters.length,
    );
    expect(twice.economy.finance.wallets).toHaveLength(once.economy.finance.wallets.length);
  });
});
