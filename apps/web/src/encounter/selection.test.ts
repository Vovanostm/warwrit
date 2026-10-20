import { expect, it } from 'vitest';
import { inspectEncounterUnit } from './selection.js';

it('pins an inspected enemy without changing the authorized actor selection', () => {
  expect(inspectEncounterUnit('enemy', new Set(['enemy']), 'company-unit')).toEqual({
    inspectedUnitId: 'enemy',
    targetUnitId: 'enemy',
    commandUnitId: undefined,
  });
});

it('updates command selection only for a controllable owned unit', () => {
  expect(inspectEncounterUnit('company-unit', new Set(), 'company-unit')).toEqual({
    inspectedUnitId: 'company-unit',
    targetUnitId: undefined,
    commandUnitId: 'company-unit',
  });
});

it('does not replace the active actor when another owned unit is inspected', () => {
  expect(inspectEncounterUnit('other-company-unit', new Set(), 'active-company-unit')).toEqual({
    inspectedUnitId: 'other-company-unit',
    targetUnitId: undefined,
    commandUnitId: undefined,
  });
});
