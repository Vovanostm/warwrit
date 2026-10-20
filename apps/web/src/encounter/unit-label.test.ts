import { expect, it } from 'vitest';
import { encounterUnitLabel } from './unit-label.js';

const uuid = '9434760c-5462-4f7f-9862-a3c1001c0001';

it('keeps company names, hides UUID-valued fixture names, and labels others truthfully', () => {
  expect(encounterUnitLabel({ id: 'owned-1', sideId: 'companies' }, { 'owned-1': 'Ратибор' })).toBe(
    'Ратибор',
  );
  expect(
    encounterUnitLabel(
      { id: 'owned-2', sideId: 'companies' },
      {
        'owned-1': uuid,
        'owned-2': uuid,
        'owned-3': uuid,
      },
    ),
  ).toBe('Боец вашей компании 2');
  expect(encounterUnitLabel({ id: 'ally-1', sideId: 'first-hunt-companies' }, {})).toBe(
    'Боец второй компании',
  );
  expect(encounterUnitLabel({ id: 'unknown-1', sideId: uuid }, {})).toBe(
    'Участник без открытого имени',
  );
});
