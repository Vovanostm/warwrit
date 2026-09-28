import { canonicalJson } from './input.js';
import { projectCharacterCombatWithMorale } from './combat-morale.js';
import { validateCombatReceiptJournal } from './combat-receipts.js';
import type { CombatReceiptJournal } from './combat-receipts.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { physicalVitals, requirePhysical, validatePhysicalState } from './physical-state.js';

export interface PreparedCombatPhysicalEffects {
  readonly status: 'PREPARED';
  readonly root: MaterializedCompanyState;
  readonly bindingId: string;
  readonly companyId: string;
  readonly worldId: string;
  readonly sourceReceiptIds: readonly string[];
  readonly sourceEventIds: readonly string[];
  readonly proposedLastAppliedRevision: number;
}

function validateCompanyBinding(root: MaterializedCompanyState, journal: CombatReceiptJournal) {
  const { binding, companyId } = journal;
  requirePhysical(
    root.lifecycle.companyId === companyId &&
      root.lifecycle.worldId === binding.worldId &&
      root.lifecycle.campaignTick === binding.atTick &&
      root.finance.processedTick === binding.atTick &&
      root.physical.processedTick === binding.atTick,
    'INVALID_SOURCE',
  );
  validatePhysicalState(root);

  const participants = binding.participants.filter((entry) => entry.companyId === companyId);
  requirePhysical(participants.length > 0, 'INVALID_SOURCE');
  const characterIds = new Set<string>();
  const partyIds = new Set<string>(participants.map((entry) => entry.partyId));
  for (const partyId of partyIds) {
    const party = root.lifecycle.parties.find((entry) => entry.partyId === partyId);
    const actualMembers = root.lifecycle.characters
      .filter((entry) => entry.presence.fieldPartyId === partyId)
      .map((entry) => entry.identity.characterId)
      .sort();
    const boundMembers = participants
      .filter((entry) => entry.partyId === partyId)
      .map((entry) => entry.projection.characterId)
      .sort();
    requirePhysical(
      party &&
        actualMembers.length > 0 &&
        canonicalJson(actualMembers) === canonicalJson(boundMembers),
      'INVALID_SOURCE',
    );
  }
  const unitIds = new Set<string>();
  const itemIds = new Set<string>();
  for (const participant of binding.participants) {
    requirePhysical(!unitIds.has(participant.unitId), 'INVALID_SOURCE');
    unitIds.add(participant.unitId);
    const unit = binding.setup.units.find((entry) => entry.id === participant.unitId);
    requirePhysical(
      unit &&
        unit.sideId === participant.sideId &&
        canonicalJson(unit.position) === canonicalJson(participant.position) &&
        unit.weaponId === participant.projection.weapon.profileId &&
        canonicalJson(unit.attributes) === canonicalJson(participant.projection.attributes) &&
        canonicalJson(unit.initialPools) === canonicalJson(participant.projection.current),
      'INVALID_SOURCE',
    );
    for (const item of participant.equipment) {
      requirePhysical(!itemIds.has(item.itemId), 'INVALID_SOURCE');
      itemIds.add(item.itemId);
    }
  }

  for (const participant of participants) {
    const characterId = participant.projection.characterId;
    requirePhysical(!characterIds.has(characterId), 'INVALID_SOURCE');
    characterIds.add(characterId);
    const character = root.lifecycle.characters.find(
      (entry) => entry.identity.characterId === characterId,
    );
    requirePhysical(
      character?.presence.fieldPartyId === participant.partyId &&
        participant.revision === root.lifecycle.revision &&
        participant.physicalPolicyVersion === root.physical.policyVersion &&
        canonicalJson(projectCharacterCombatWithMorale(root, characterId)) ===
          canonicalJson(participant.projection) &&
        canonicalJson(physicalVitals(root.physical, characterId)) ===
          canonicalJson(participant.vitals),
      'INVALID_SOURCE',
    );
    const equipment = root.physical.items
      .filter((item) => item.tombstone === null && item.equipped?.characterId === characterId)
      .toSorted((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0));
    requirePhysical(
      canonicalJson(equipment) === canonicalJson(participant.equipment),
      'INVALID_SOURCE',
    );
  }
}

/** G07 physical pool/armor candidate only; G08-G10 own conditions, outcomes and cursor. */
export function prepareCombatPhysicalEffects(
  initialRoot: MaterializedCompanyState,
  journal: CombatReceiptJournal,
): PreparedCombatPhysicalEffects {
  // This history check assumes journal provenance was authenticated by the G06 adapter/storage boundary.
  const validated = validateCombatReceiptJournal(journal);
  requirePhysical(validated.receipts.length > 0, 'INVALID_SOURCE');
  // The canonical root is validated below; share its unaffected immutable state rather than
  // imposing the external-evidence serializer's per-value size limit on the whole root.
  const root = initialRoot;
  validateCompanyBinding(root, validated);

  const finalState = validated.receipts.at(-1)?.transition.state ?? validated.binding.initial.state;
  const participantByUnit = new Map(
    validated.binding.participants
      .filter((participant) => participant.companyId === validated.companyId)
      .map((participant) => [participant.unitId, participant]),
  );
  let physical = root.physical;
  for (const [unitId, participant] of participantByUnit) {
    const unit = finalState.units.find((entry) => entry.id === unitId);
    requirePhysical(unit, 'INVALID_SOURCE');

    const characterId = participant.projection.characterId;
    const vitals = physicalVitals(physical, characterId);
    physical = {
      ...physical,
      vitals: physical.vitals.map((entry) =>
        entry.characterId === characterId
          ? { ...entry, currentHealth: unit.health, currentStamina: unit.stamina }
          : entry,
      ),
    };

    const initialArmor = participant.projection.current.armor;
    const armorLoss = initialArmor - unit.armor;
    requirePhysical(armorLoss >= 0, 'INVALID_SOURCE');
    let remainingLoss = armorLoss;
    const armor = participant.projection.armor
      .filter((entry) => entry.slot === 'BODY' || entry.slot === 'HEAD')
      .toSorted((a, b) => (a.slot === b.slot ? 0 : a.slot === 'BODY' ? -1 : 1));
    const replacements = new Map<string, number>();
    for (const entry of armor) {
      const item = physical.items.find((candidate) => candidate.itemId === entry.itemId);
      requirePhysical(
        item &&
          item.tombstone === null &&
          item.equipped?.characterId === characterId &&
          item.equipped.slots.length === 1 &&
          item.equipped.slots[0] === entry.slot &&
          item.definitionId === entry.definitionId &&
          item.maximumCondition === entry.maximumArmor &&
          item.currentCondition === entry.currentArmor,
        'INVALID_SOURCE',
      );
      const loss = Math.min(item.currentCondition, remainingLoss);
      replacements.set(item.itemId, item.currentCondition - loss);
      remainingLoss -= loss;
    }
    requirePhysical(remainingLoss === 0, 'INVALID_SOURCE');
    if (replacements.size) {
      physical = {
        ...physical,
        items: physical.items.map((item) => {
          const currentCondition = replacements.get(item.itemId);
          return currentCondition === undefined ? item : { ...item, currentCondition };
        }),
      };
    }
    // `vitals` is read above to ensure every bound character has a canonical pool.
    requirePhysical(
      unit.health <= vitals.maximumHealth && unit.stamina <= vitals.maximumStamina,
      'INVALID_SOURCE',
    );
  }

  const candidate = Object.freeze({ ...root, physical });
  validatePhysicalState(candidate);
  const sourceReceiptIds = Object.freeze(
    validated.receipts.map((entry) => entry.request.payload.receiptId),
  );
  const sourceEventIds = Object.freeze(validated.receipts.flatMap((entry) => entry.sourceEventIds));
  return Object.freeze({
    status: 'PREPARED' as const,
    root: candidate,
    bindingId: validated.binding.bindingId,
    companyId: validated.companyId,
    worldId: validated.binding.worldId,
    sourceReceiptIds,
    sourceEventIds,
    proposedLastAppliedRevision: validated.proposedLastAppliedRevision,
  });
}
