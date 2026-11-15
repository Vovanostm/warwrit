import { describe, expect, it } from 'vitest';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import type { BattleState } from '@warwrit/game-core';

import { proposeResilientNicknames } from './nicknames.js';

function resolvedBattle(
  state: ReturnType<typeof createCompanyCombatAggregateFixture>['state'],
  mutate: (unit: BattleState['units'][number]) => BattleState['units'][number] = (unit) => unit,
  winningSide?: BattleState['sides'][number]['id'],
): BattleState {
  const binding = state.encounter.active?.binding;
  if (!binding) throw new Error('fixture encounter is not active');
  const participant = binding.participants[0];
  if (!participant) throw new Error('fixture has no bound company fighter');
  const winner = winningSide ?? participant.sideId;
  const basis = binding.initial.state as BattleState;
  return {
    ...basis,
    status: 'resolved',
    outcome: { reason: 'last-side-standing', winnerSideId: winner },
    units: basis.units.map((unit) => (unit.id === participant.unitId ? mutate(unit) : unit)),
  } as BattleState;
}

describe('resilient nickname producer', () => {
  it('proposes once for a living winner at or below one quarter health', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const before = fixture.begun.next;
    const participant = fixture.begun.binding.participants[0]!;
    const maximumHealth = participant.vitals.maximumHealth;
    const finalState = resolvedBattle(before, (unit) => ({
      ...unit,
      health: Math.floor(maximumHealth / 4),
    }));

    const first = proposeResilientNicknames({ before, after: before, finalState, atTick: '1000' });
    expect(first.sourceEventIds).toHaveLength(1);
    expect(first.state.economy.lifecycle.nicknameProposals).toHaveLength(1);
    expect(first.state.economy.lifecycle.nicknameProposals?.[0]).toMatchObject({
      characterId: participant.projection.characterId,
      textKey: 'nickname.resilient',
      resolution: 'PENDING',
    });

    const retry = proposeResilientNicknames({
      before,
      after: first.state,
      finalState,
      atTick: '1000',
    });
    expect(retry.sourceEventIds).toEqual([]);
    expect(retry.state.economy.lifecycle.nicknameProposals).toHaveLength(1);
  });

  it('retains proposals for every eligible fighter and supports living zero-health retreaters', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const before = fixture.begun.next;
    const binding = fixture.begun.binding;
    const candidates = binding.participants.filter(
      (participant) =>
        participant.companyId === before.economy.lifecycle.companyId &&
        participant.sideId === binding.participants[0]?.sideId,
    );
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const winningSideId = candidates[0]!.sideId;
    const finalState = {
      ...binding.initial.state,
      status: 'resolved' as const,
      outcome: { reason: 'last-side-standing' as const, winnerSideId: winningSideId },
      units: binding.initial.state.units.map((unit) =>
        candidates.some((participant) => participant.unitId === unit.id)
          ? { ...unit, health: 0, status: 'retreated' as const }
          : unit,
      ),
    };

    const first = proposeResilientNicknames({
      before,
      after: before,
      finalState,
      atTick: '1000',
    });
    expect(first.sourceEventIds).toHaveLength(candidates.length);
    expect(first.state.economy.lifecycle.nicknameProposals).toHaveLength(candidates.length);

    const retry = proposeResilientNicknames({
      before,
      after: first.state,
      finalState,
      atTick: '1000',
    });
    expect(retry.sourceEventIds).toEqual([]);
    expect(retry.state.economy.lifecycle.nicknameProposals).toHaveLength(candidates.length);
  });

  it('does not propose for a defeated side, a dead fighter, or health above one quarter', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const before = fixture.begun.next;
    const participant = fixture.begun.binding.participants[0]!;
    const maximumHealth = participant.vitals.maximumHealth;
    const losingSide = fixture.begun.binding.setup.sides.find(
      (side) => side.id !== participant.sideId,
    )?.id;
    if (!losingSide) throw new Error('fixture has no opposing side');
    const cases = [
      resolvedBattle(before, undefined, losingSide),
      resolvedBattle(before, (unit) => ({ ...unit, health: 0, status: 'dead' })),
      resolvedBattle(before, (unit) => ({ ...unit, health: Math.floor(maximumHealth / 4) + 1 })),
    ];
    for (const finalState of cases) {
      const result = proposeResilientNicknames({
        before,
        after: before,
        finalState,
        atTick: '1000',
      });
      expect(result.sourceEventIds).toEqual([]);
      expect(result.state.economy.lifecycle.nicknameProposals ?? []).toHaveLength(0);
    }
  });

  it('does not propose when the after-effects root records death', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const before = fixture.begun.next;
    const participant = fixture.begun.binding.participants[0]!;
    const finalState = resolvedBattle(before, (unit) => ({ ...unit, health: 1 }));
    const physical = before.economy.physical!;
    const after = {
      ...before,
      economy: {
        ...before.economy,
        lifecycle: {
          ...before.economy.lifecycle,
          characters: before.economy.lifecycle.characters.map((character) =>
            character.identity.characterId === participant.projection.characterId
              ? { ...character, presence: { ...character.presence, availability: 'DEAD' as const } }
              : character,
          ),
        },
        physical: {
          ...physical,
          vitals: physical.vitals.map((vital) =>
            vital.characterId === participant.projection.characterId
              ? { ...vital, currentHealth: 0 }
              : vital,
          ),
        },
      },
    };
    const result = proposeResilientNicknames({ before, after, finalState, atTick: '1000' });
    expect(result.sourceEventIds).toEqual([]);
  });

  it('does not submit a nickname command to an ended company', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const before = fixture.begun.next;
    const finalState = resolvedBattle(before, (unit) => ({ ...unit, health: 1 }));
    const after = {
      ...before,
      economy: {
        ...before.economy,
        lifecycle: {
          ...before.economy.lifecycle,
          company: { ...before.economy.lifecycle.company!, runStatus: 'GAME_OVER' as const },
        },
      },
    };
    const result = proposeResilientNicknames({ before, after, finalState, atTick: '1000' });
    expect(result.sourceEventIds).toEqual([]);
    expect(result.state.economy.lifecycle.nicknameProposals ?? []).toHaveLength(0);
  });
});
