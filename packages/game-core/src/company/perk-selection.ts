import { COMPANY_CATALOGUE } from './definitions.js';
import { skillLevel } from './skill-progress.js';
import {
  companyMember,
  event,
  person,
  replacePerson,
  requireLifecycle,
} from './lifecycle-state.js';
import type {
  CommandOf,
  LifecycleChange,
  LifecycleContext,
  LifecycleState,
} from './lifecycle-types.js';

function perkDefinition(perkId: string) {
  const perk = COMPANY_CATALOGUE.perks.find((entry) => entry.id === perkId);
  requireLifecycle(perk, 'INVALID_ARGUMENT');
  return perk;
}

/**
 * Select one catalogue perk for one real skill milestone.
 * Effects are deliberately not evaluated here; B02 owns their application.
 */
export function preparePerkSelection(
  state: LifecycleState,
  command: CommandOf<'ChoosePerk'>,
  context: LifecycleContext,
): LifecycleChange {
  const { characterId, perkId, milestone } = command.payload;
  const character = person(state, characterId);
  const perk = perkDefinition(perkId);

  requireLifecycle(companyMember(state, characterId), 'CONTACT_OR_ACCESS_REQUIRED');
  requireLifecycle(perk.milestone === milestone, 'INVALID_ARGUMENT');

  const mastery = character.skills[perk.skillId];
  requireLifecycle(mastery !== undefined && skillLevel(mastery) >= perk.milestone, 'INVALID_ARGUMENT');

  const slotUsed = character.perks.some((selectedId) => {
    const selected = perkDefinition(selectedId);
    return selected.skillId === perk.skillId && selected.milestone === perk.milestone;
  });
  requireLifecycle(!slotUsed, 'INVALID_ARGUMENT');

  const chosen = event(command.commandId, 'PerkChosen', context.atTick, [
    characterId,
    perk.id,
    `${perk.skillId}:${perk.milestone}`,
  ]);
  return {
    next: replacePerson(state, { ...character, perks: [...character.perks, perk.id] }),
    events: [chosen],
    requirements: [],
  };
}
