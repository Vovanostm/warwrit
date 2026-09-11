import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  entityId,
  prepareCompanyEconomy,
  prepareCompanyLifecycle,
} from '@warwrit/game-core';
import type { CompanyEconomyState, LifecycleState } from '@warwrit/game-core';
import { command, context, economy, prepared, tick } from './company-economy-fixture.js';

function character(state: CompanyEconomyState, characterId = 'worker-0') {
  return state.lifecycle.characters.find((entry) => entry.identity.characterId === characterId)!;
}

function setSkills(
  state: CompanyEconomyState,
  values: Readonly<Record<string, number>>,
  characterId = 'worker-0',
) {
  const target = character(state, characterId);
  Object.assign(target, { skills: { ...target.skills, ...values } });
  return state;
}

function choose(
  state: CompanyEconomyState,
  perkId: string,
  milestone: 25 | 60,
  characterId = 'worker-0',
  id = `choose-${perkId}`,
) {
  const cmd = command(state, 'ChoosePerk', { characterId, perkId, milestone }, id);
  return { cmd, ctx: context(state, cmd) };
}

function rejectUnchanged(
  state: CompanyEconomyState,
  cmd: unknown,
  ctx: ReturnType<typeof context>,
  error: string,
) {
  const before = canonicalJson(state);
  expect(prepareCompanyEconomy(state, cmd, ctx)).toMatchObject({
    kind: 'REJECTED',
    state,
    error,
  });
  expect(canonicalJson(state)).toBe(before);
}

describe('B01 — profile perk selection', () => {
  it('selects at the exact target-skill milestone, records history, and replays once', () => {
    const state = economy([1n, 1n]);
    const input = choose(state, 'leadership-25-a', 25);
    const result = prepared(prepareCompanyEconomy(state, input.cmd, input.ctx));

    expect(character(result.next).perks).toEqual(['leadership-25-a']);
    expect(result.receipt.lifecycleReceipt?.events).toEqual([
      expect.objectContaining({
        type: 'PerkChosen',
        subjectIds: ['worker-0', 'leadership-25-a', 'leadership:25'],
      }),
    ]);
    expect(result.next.lifecycle.company?.chronicleIds).toContain(
      result.receipt.lifecycleReceipt?.events[0]?.id,
    );

    const replay = prepared(
      prepareCompanyEconomy(result.next, input.cmd, context(result.next, input.cmd)),
    );
    expect(replay.replayed).toBe(true);
    expect(canonicalJson(replay.next)).toBe(canonicalJson(result.next));
  });

  it('rejects a second option for the same skill milestone without mutation', () => {
    const state = economy([1n, 1n]);
    const first = choose(state, 'leadership-25-a', 25, 'worker-0', 'perk-first');
    const selected = prepared(prepareCompanyEconomy(state, first.cmd, first.ctx)).next;
    const second = choose(selected, 'leadership-25-b', 25, 'worker-0', 'perk-second');

    rejectUnchanged(selected, second.cmd, second.ctx, 'INVALID_ARGUMENT');
  });

  it('requires mastery in the perk discipline rather than a foreign high skill', () => {
    const state = setSkills(economy([1n, 1n]), { leadership: 24, archery: 60 });
    const input = choose(state, 'leadership-25-a', 25);

    rejectUnchanged(state, input.cmd, input.ctx, 'INVALID_ARGUMENT');
  });

  it('requires an active company membership', () => {
    const state = economy([1n, 1n]);
    const input = choose(state, 'leadership-25-a', 25, 'provider');

    rejectUnchanged(state, input.cmd, input.ctx, 'CONTACT_OR_ACCESS_REQUIRED');
  });

  it('keeps the used milestone on the character across leave and re-hire', () => {
    const state = economy([1n, 1n]);
    const first = choose(state, 'leadership-25-a', 25, 'worker-0', 'before-rehire');
    const selected = prepared(prepareCompanyEconomy(state, first.cmd, first.ctx)).next;
    const previous = selected.lifecycle.memberships.find(
      (entry) => entry.characterId === 'worker-0' && entry.endedAt === null,
    )!;
    const rehired: LifecycleState = {
      ...selected.lifecycle,
      memberships: [
        ...selected.lifecycle.memberships.map((entry) =>
          entry.membershipId === previous.membershipId ? { ...entry, endedAt: tick(1000) } : entry,
        ),
        {
          membershipId: entityId<'Membership'>('service-worker-0-rehire'),
          characterId: previous.characterId,
          companyId: previous.companyId,
          basis: 'FAMILY',
          startedAt: tick(1000),
          endedAt: null,
          wageScheduleId: null,
        },
      ],
    };
    const shell = { ...selected, lifecycle: rehired };
    const second = choose(shell, 'leadership-25-b', 25, 'worker-0', 'after-rehire');
    const result = prepareCompanyLifecycle(rehired, second.cmd, context(shell, second.cmd));

    expect(result).toMatchObject({ kind: 'REJECTED', state: rehired, error: 'INVALID_ARGUMENT' });
    expect(character(shell).perks).toEqual(['leadership-25-a']);
  });

  it('rejects a loaded graph with two choices in one discipline milestone', () => {
    const state = economy([1n, 1n]);
    Object.assign(character(state), {
      perks: ['leadership-25-a', 'leadership-25-b'],
    });
    const cmd = command(
      state,
      'RenameCompany',
      { companyId: state.lifecycle.companyId, name: 'Still Invalid', bannerId: 'banner' },
      'validate-loaded-perks',
    );

    expect(prepareCompanyLifecycle(state.lifecycle, cmd, context(state, cmd))).toMatchObject({
      kind: 'REJECTED',
      state: state.lifecycle,
      error: 'INVALID_STATE',
    });
  });
});
