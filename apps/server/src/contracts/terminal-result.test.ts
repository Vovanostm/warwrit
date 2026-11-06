import { expect, it } from 'vitest';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { huntTerminalSummary } from './terminal-result.js';

it('discloses terminal knowledge only to a company with this encounter in its own history', () => {
  const fixture = createCompanyCombatAggregateFixture();
  const company = fixture.begun.next;
  const id = company.encounter.active!.binding.setup.battleId;
  const encounter = {
    id,
    state: { status: 'resolved', units: [{ sideId: 'first-hunt-hostiles', status: 'retreated' }] },
  };
  expect(huntTerminalSummary(encounter, null, fixture.state)).toBeUndefined();
  expect(
    huntTerminalSummary({ ...encounter, id: 'another-battle' }, null, company),
  ).toBeUndefined();
  expect(huntTerminalSummary(encounter, null, company)).toEqual({
    effects: 'PENDING',
    hostileRetreated: true,
  });
});
