import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { expect, it } from 'vitest';

import { firstHuntOwnEquipmentRejection } from './routes.js';

it('reports only an incomplete weapon pair on the requesting company, while allowing unarmed members', () => {
  const valid = createCompanyCombatAggregateFixture().state;
  const companyId = valid.economy.lifecycle.companyId;
  const physical = valid.economy.physical;
  if (!physical) throw new Error('company fixture has no physical state');
  const sword = physical.items.find(
    (item) => item.definitionId === 'sword' && item.equipped?.slots.includes('MAIN_HAND'),
  );
  const characterId = sword?.equipped?.characterId;
  if (!characterId) throw new Error('company fixture has no equipped sword');

  const withoutShield = (item: (typeof physical.items)[number]) =>
    item.definitionId === 'shield' && item.equipped?.characterId === characterId;
  const incomplete = {
    ...valid,
    economy: {
      ...valid.economy,
      physical: {
        ...physical,
        items: physical.items.filter((item) => !withoutShield(item)),
        knowledge: {
          ...physical.knowledge,
          itemSnapshots: physical.knowledge.itemSnapshots.filter((item) => !withoutShield(item)),
        },
      },
    },
  };
  expect(firstHuntOwnEquipmentRejection(incomplete, companyId)).toBe('INCOMPLETE_WEAPON_PAIR');

  const noHandGear = {
    ...valid,
    economy: {
      ...valid.economy,
      physical: {
        ...physical,
        items: physical.items.filter(
          (item) =>
            item.equipped?.slots.some((slot) => slot === 'MAIN_HAND' || slot === 'OFF_HAND') !==
            true,
        ),
      },
    },
  };
  expect(firstHuntOwnEquipmentRejection(noHandGear, companyId)).toBeUndefined();

  const foreignCompanyId = 'helper-company' as typeof companyId;
  const foreignCompanyState = {
    ...incomplete,
    economy: {
      ...incomplete.economy,
      lifecycle: { ...incomplete.economy.lifecycle, companyId: foreignCompanyId },
    },
  };
  expect(firstHuntOwnEquipmentRejection(foreignCompanyState, companyId)).toBeUndefined();
});
