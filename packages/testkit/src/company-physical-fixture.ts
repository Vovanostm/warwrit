import { createCompanyPhysicalState } from '@warwrit/game-core';
import type { CompanyEconomyState, PhysicalEvidence } from '@warwrit/game-core';
import { cash, physicalScope, place, tick } from './company-economy-fixture.js';

/** Explicit loaded occurrences, not a condition reducer or an implicit legacy migration. */
export function withLoadedConditions(
  state: CompanyEconomyState,
  definitionsByCharacter: Readonly<Record<string, readonly string[]>>,
  sourceId: string,
): CompanyEconomyState {
  const lifecycle = {
    ...state.lifecycle,
    characters: state.lifecycle.characters.map((character) => ({
      ...character,
      conditionIds:
        definitionsByCharacter[character.identity.characterId] ?? character.conditionIds,
    })),
  };
  const bindings = lifecycle.characters.flatMap((character) =>
    character.conditionIds.map((definitionId, ordinal) => ({
      characterId: character.identity.characterId,
      definitionId,
      conditionId: `${sourceId}-${character.identity.characterId}-${ordinal}`,
      sourceEventId: sourceId,
      causeId: sourceId,
      onsetTick: lifecycle.campaignTick,
      ...(definitionId === 'critical-bleed'
        ? { deadlineTick: tick(BigInt(lifecycle.campaignTick) + 250n) }
        : {}),
    })),
  );
  const loaded = createCompanyPhysicalState(lifecycle, {
    conditionBindings: bindings,
    knownConditionBindings: state.physical!.knowledge.conditionSnapshots.map(
      ({ deadlineTick, ...binding }) => ({
        ...binding,
        ...(deadlineTick === null ? {} : { deadlineTick }),
      }),
    ),
  });
  return { ...state, lifecycle, physical: { ...state.physical!, conditions: loaded.conditions } };
}

/** Only scenarios that explicitly request a qualified external receiver get this fixture. */
export function withCareProvider(state: CompanyEconomyState): CompanyEconomyState {
  const qualify = (characters: CompanyEconomyState['lifecycle']['characters']) =>
    characters.map((character) =>
      character.identity.characterId === 'provider'
        ? {
            ...character,
            skills: { ...character.skills, medicine: 20 },
            aptitudeBySkill: { ...character.aptitudeBySkill, medicine: 10000 },
          }
        : character,
    );
  return {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      characters: qualify(state.lifecycle.characters),
      knowledge: {
        ...state.lifecycle.knowledge,
        characters: qualify(state.lifecycle.knowledge.characters),
      },
    },
  };
}

export function careHandover(
  state: CompanyEconomyState,
  characterId: string,
): Extract<PhysicalEvidence, { kind: 'CARE_HANDOVER' }> {
  const id = `handover-${characterId}-${state.lifecycle.revision}`;
  return {
    ...physicalScope(state, id),
    kind: 'CARE_HANDOVER',
    handoverId: id,
    characterId,
    receiverId: 'provider',
    location: place,
    poolId: 'local',
    providerWalletId: 'wallet-provider',
    moneyAccessEvidenceId: 'money-access',
    amountQ: cash(1),
  };
}
