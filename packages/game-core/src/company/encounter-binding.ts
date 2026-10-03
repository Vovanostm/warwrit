import { startBattleV2 } from '../combat/runtime-v2.js';
import type { BattleSetupV2 } from '../combat/setup-v2.js';
import type { BattleId, Hex, SideId, UnitId } from '../combat/types.js';
import { projectCharacterCombatWithMorale } from './combat-morale.js';
import { canPerform, sameLocation, validateLifecycleGraph } from './lifecycle-state.js';
import type { AtLocation, LifecycleContext } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import {
  itemDefinition,
  ownPhysical,
  physicalContainer,
  physicalVitals,
  requirePhysical,
  validatePhysicalState,
} from './physical-state.js';
import { isEntityId } from './values.js';
import type { CampaignTick, CanonicalRevision } from './values.js';

export const ENCOUNTER_BINDING_VERSION = 's02-encounter-binding-1' as const;
/** Versioned adapter binding for authentic retained world combatants. */
export const FIRST_HUNT_WORLD_BINDING_VERSION = 's02-encounter-binding-2' as const;
export interface EncounterCompanySource {
  readonly root: MaterializedCompanyState;
  readonly context: LifecycleContext;
}
/** Trusted world placement, never deserialized from a player's encounter command. */
interface EncounterPositionEvidenceBase {
  readonly id: string;
  readonly sourceEventId: string;
  readonly bindingId: string;
  readonly worldId: string;
  readonly atTick: CampaignTick;
  readonly location: AtLocation;
  readonly setup: Omit<BattleSetupV2, 'units'>;
  readonly parties: readonly {
    readonly companyId: string;
    readonly partyId: string;
    readonly revision: CanonicalRevision;
    readonly sideId: SideId;
    readonly members: readonly {
      readonly characterId: string;
      readonly unitId: UnitId;
      readonly position: Hex;
    }[];
  }[];
}

/** Authentic non-company combatants, produced from retained world state by the adapter. */
export interface EncounterWorldParticipant {
  readonly entityId: string;
  readonly sourceId: string;
  readonly unitId: UnitId;
  readonly sideId: SideId;
  readonly position: Hex;
  readonly weaponId: BattleSetupV2['units'][number]['weaponId'];
  readonly attributes: BattleSetupV2['units'][number]['attributes'];
  readonly initialPools: BattleSetupV2['units'][number]['initialPools'];
}

/** Legacy evidence bytes remain company-only; world bindings require their own version. */
export type EncounterPositionEvidence = EncounterPositionEvidenceBase &
  (
    | { readonly version: typeof ENCOUNTER_BINDING_VERSION; readonly worldParticipants?: never }
    | {
        readonly version: typeof FIRST_HUNT_WORLD_BINDING_VERSION;
        readonly worldParticipants: readonly EncounterWorldParticipant[];
      }
  );

type FrozenBindingBase = {
  readonly schemaVersion: 1;
  readonly bindingId: string;
  readonly worldId: string;
  readonly sourceId: string;
  readonly sourceEventId: string;
  readonly atTick: CampaignTick;
  readonly location: AtLocation;
  readonly participants: readonly {
    readonly companyId: string;
    readonly partyId: string;
    readonly revision: CanonicalRevision;
    readonly physicalPolicyVersion: string;
    readonly unitId: UnitId;
    readonly sideId: SideId;
    readonly position: Hex;
    readonly projection: ReturnType<typeof projectCharacterCombatWithMorale>;
    readonly vitals: ReturnType<typeof physicalVitals>;
    readonly equipment: readonly ReturnType<
      typeof ownPhysical<MaterializedCompanyState['physical']['items'][number]>
    >[];
  }[];
  readonly setup: BattleSetupV2;
  readonly initial: ReturnType<typeof startBattleV2>;
  readonly lastAppliedRevision: number;
};

export type FrozenEncounterBinding =
  | (FrozenBindingBase & {
      readonly version: typeof ENCOUNTER_BINDING_VERSION;
      readonly worldParticipants?: never;
    })
  | (FrozenBindingBase & {
      readonly version: typeof FIRST_HUNT_WORLD_BINDING_VERSION;
      readonly worldParticipants: readonly EncounterWorldParticipant[];
    });

function claim(ids: Set<string>, id: string): void {
  requirePhysical(isEntityId(id) && !ids.has(id), 'INVALID_SOURCE');
  ids.add(id);
}

/** G05: one detached candidate; no locks, root writes, settlement or public activation. */
export function prepareEncounterBinding(
  sources: readonly EncounterCompanySource[],
  request: { readonly bindingId: string; readonly battleId: BattleId },
  position: EncounterPositionEvidence,
): FrozenEncounterBinding {
  const evidence = ownPhysical(position);
  requirePhysical(
    (evidence.version === ENCOUNTER_BINDING_VERSION ||
      evidence.version === FIRST_HUNT_WORLD_BINDING_VERSION) &&
      isEntityId(evidence.id) &&
      isEntityId(evidence.sourceEventId) &&
      isEntityId(evidence.worldId) &&
      isEntityId(request.bindingId) &&
      evidence.bindingId === request.bindingId &&
      evidence.setup.battleId === request.battleId &&
      evidence.location.kind === 'AT',
    'INVALID_SOURCE',
  );
  const companies = new Map<string, EncounterCompanySource>();
  for (const source of sources) {
    const { root, context } = source;
    validateLifecycleGraph(root.lifecycle, context);
    validatePhysicalState(root);
    requirePhysical(
      !companies.has(root.lifecycle.companyId) &&
        root.lifecycle.worldId === evidence.worldId &&
        root.lifecycle.company?.runStatus === 'ACTIVE' &&
        context.canonicalRevision === root.lifecycle.revision &&
        context.atTick === evidence.atTick &&
        root.lifecycle.campaignTick === evidence.atTick &&
        root.finance.processedTick === evidence.atTick,
      'INVALID_SOURCE',
    );
    companies.set(root.lifecycle.companyId, source);
  }
  const parties = new Set<string>();
  const characters = new Set<string>();
  const units = new Set<string>();
  const items = new Set<string>();
  const usedCompanies = new Set<string>();
  const participants = evidence.parties.flatMap((entry) => {
    claim(parties, entry.partyId);
    const source = companies.get(entry.companyId);
    requirePhysical(source, 'INVALID_SOURCE');
    const { root } = source;
    usedCompanies.add(entry.companyId);
    const party = root.lifecycle.parties.find((candidate) => candidate.partyId === entry.partyId);
    requirePhysical(
      party &&
        entry.revision === root.lifecycle.revision &&
        sameLocation(party.location, evidence.location),
      'INVALID_SOURCE',
    );
    const members = root.lifecycle.characters.filter(
      (character) => character.presence.fieldPartyId === entry.partyId,
    );
    requirePhysical(
      members.length > 0 && members.length === entry.members.length,
      'INVALID_SOURCE',
    );
    return members.map((character) => {
      const characterId = character.identity.characterId;
      claim(characters, characterId);
      const placements = entry.members.filter((member) => member.characterId === characterId);
      requirePhysical(placements.length === 1, 'INVALID_SOURCE');
      const placement = placements[0]!;
      claim(units, placement.unitId);
      // V2 has no immobile profile; retain the whole party or reject the candidate.
      requirePhysical(canPerform(character, 'travel'), 'INCOMPATIBLE_ACTIVITY');
      const projection = projectCharacterCombatWithMorale(root, characterId);
      const equipment = root.physical.items.filter(
        (item) => item.tombstone === null && item.equipped?.characterId === characterId,
      );
      for (const item of equipment) {
        claim(items, item.itemId);
        const definition = itemDefinition(item);
        const container = physicalContainer(root.physical, item.containerId!);
        const expected = definition.hands === 2 ? ['MAIN_HAND', 'OFF_HAND'] : [definition.slot];
        const slots = item.equipped!.slots;
        requirePhysical(
          slots.length === expected.length &&
            new Set(slots).size === slots.length &&
            expected.every((slot) => slot !== undefined && slots.some((s) => s === slot)) &&
            sameLocation(container.location, party.location),
          'INVALID_STATE',
        );
      }
      return {
        companyId: entry.companyId,
        partyId: entry.partyId,
        revision: entry.revision,
        physicalPolicyVersion: root.physical.policyVersion,
        unitId: placement.unitId,
        sideId: entry.sideId,
        position: placement.position,
        projection,
        vitals: physicalVitals(root.physical, characterId),
        equipment: Object.freeze(equipment.toSorted((a, b) => (a.itemId < b.itemId ? -1 : 1))),
      } as const;
    });
  });
  requirePhysical(usedCompanies.size === companies.size, 'INVALID_SOURCE');
  participants.sort((a, b) => (a.unitId < b.unitId ? -1 : 1));
  const worldParticipants = (
    evidence.version === FIRST_HUNT_WORLD_BINDING_VERSION ? evidence.worldParticipants : []
  ).map((participant) => {
    claim(characters, participant.entityId);
    claim(units, participant.unitId);
    requirePhysical(
      isEntityId(participant.sourceId) && participant.entityId === participant.unitId,
      'INVALID_SOURCE',
    );
    return ownPhysical(participant);
  });
  requirePhysical(
    evidence.version !== FIRST_HUNT_WORLD_BINDING_VERSION || worldParticipants.length > 0,
    'INVALID_SOURCE',
  );
  const companyUnits = participants.map((participant) => ({
    id: participant.unitId,
    sideId: participant.sideId,
    position: participant.position,
    weaponId: participant.projection.weapon.profileId,
    attributes: participant.projection.attributes,
    initialPools: participant.projection.current,
  }));
  const worldUnits = worldParticipants.map((participant) => ({
    id: participant.unitId,
    sideId: participant.sideId,
    position: participant.position,
    weaponId: participant.weaponId,
    attributes: participant.attributes,
    initialPools: participant.initialPools,
  }));
  const setup: BattleSetupV2 = {
    ...evidence.setup,
    units: [...companyUnits, ...worldUnits].toSorted((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
  };
  // G02 validates the whole setup and applies current pools BEFORE ordering initiative.
  const initial = startBattleV2(setup);
  const fields = {
    bindingId: request.bindingId,
    worldId: evidence.worldId,
    sourceId: evidence.id,
    sourceEventId: evidence.sourceEventId,
    atTick: evidence.atTick,
    location: evidence.location,
    participants: Object.freeze(participants),
    setup,
    initial,
    lastAppliedRevision: initial.state.revision,
  } as const;
  return evidence.version === FIRST_HUNT_WORLD_BINDING_VERSION
    ? ownPhysical({
        schemaVersion: 1,
        version: FIRST_HUNT_WORLD_BINDING_VERSION,
        ...fields,
        worldParticipants: Object.freeze(worldParticipants),
      })
    : ownPhysical({
        schemaVersion: 1,
        version: ENCOUNTER_BINDING_VERSION,
        ...fields,
      });
}
