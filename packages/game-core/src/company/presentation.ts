import { financeFact, recordSource } from './economy-state.js';
import {
  activeMembership,
  lifecycleId,
  person,
  replacePerson,
  sameLocation,
} from './lifecycle-state.js';
import { payPhysicalProvider } from './physical-payments.js';
import { requirePhysical } from './physical-state.js';
import type { EconomyContext } from './economy-types.js';
import type { CommandOf } from './lifecycle-types.js';
import { PRESENTATION_SCHEMA_VERSION } from './lifecycle-types.js';
import type { MaterializedCompanyState, PhysicalChange } from './physical-root-types.js';
import { isEntityId, isExactInteger } from './values.js';

/** F02-v1 is intentionally narrow: S-02 explicitly approved hair/barber changes, not a face editor. */
export const PRESENTATION_SERVICE_ID = 'BARBER_HAIR' as const;
export const PRESENTATION_SERVICE_VERSION = 's02-barber-hair-1' as const;

function requestedHairStyle(command: CommandOf<'ChangePresentation'>): string {
  const patch = command.payload.appearancePatch;
  const keys = Object.keys(patch);
  requirePhysical(keys.length === 1 && keys[0] === 'hairStyleId', 'INVALID_ARGUMENT');
  const hairStyleId = patch['hairStyleId'];
  requirePhysical(typeof hairStyleId === 'string' && isEntityId(hairStyleId), 'INVALID_ARGUMENT');
  return hairStyleId;
}

/**
 * One atomic local service: trusted quote + real provider + real purse -> visible presentation.
 * Identity, kinship, conditions and scar history are never members of this patch surface.
 */
export function changePresentation(
  root: MaterializedCompanyState,
  command: CommandOf<'ChangePresentation'>,
  context: EconomyContext,
): PhysicalChange {
  const characterId = command.payload.characterId;
  const hairStyleId = requestedHairStyle(command);
  const character = person(root.lifecycle, characterId);
  const membership = activeMembership(root.lifecycle, characterId);
  const known = root.lifecycle.knowledge.characters.find(
    (entry) => entry.identity.characterId === characterId,
  );
  requirePhysical(
    membership?.companyId === root.lifecycle.companyId &&
      context.contactIds.includes(characterId) &&
      known !== undefined &&
      character.presence.availability === 'AVAILABLE' &&
      character.presence.encounterBindingId === null &&
      character.presence.location.kind === 'AT',
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  requirePhysical(character.presentation?.hairStyleId !== hairStyleId, 'INVALID_ARGUMENT');

  const fact = financeFact(context, 'PRESENTATION_SERVICE', command.payload.serviceEvidenceId);
  requirePhysical(
    command.sourceEventId !== undefined &&
      fact.sourceEventId === command.sourceEventId &&
      fact.characterId === characterId &&
      fact.providerId !== characterId &&
      fact.serviceId === PRESENTATION_SERVICE_ID &&
      fact.serviceVersion === PRESENTATION_SERVICE_VERSION &&
      isExactInteger(fact.expiresAt) &&
      BigInt(fact.expiresAt) >= BigInt(context.atTick) &&
      isExactInteger(fact.priceQ) &&
      BigInt(fact.priceQ) > 0n &&
      fact.allowedHairStyleIds.length > 0 &&
      fact.allowedHairStyleIds.every(isEntityId) &&
      new Set(fact.allowedHairStyleIds).size === fact.allowedHairStyleIds.length &&
      fact.allowedHairStyleIds.includes(hairStyleId) &&
      sameLocation(character.presence.location, fact.location),
    'INVALID_SOURCE',
  );

  const recorded = recordSource(root.finance, fact);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  const finance = payPhysicalProvider({ ...root, finance: recorded.finance }, context, {
    poolId: fact.poolId,
    providerWalletId: fact.providerWalletId,
    moneyAccessEvidenceId: fact.moneyAccessEvidenceId,
    providerId: fact.providerId,
    location: fact.location,
    amountQ: fact.priceQ,
    movementId: lifecycleId(command.commandId, characterId, 'presentation-payment'),
    purpose: 'PRESENTATION',
  });

  const presentation = {
    schemaVersion: PRESENTATION_SCHEMA_VERSION,
    hairStyleId,
  } as const;
  let lifecycle = replacePerson(root.lifecycle, { ...character, presentation });
  lifecycle = {
    ...lifecycle,
    knowledge: {
      ...lifecycle.knowledge,
      characters: lifecycle.knowledge.characters.map((entry) =>
        entry.identity.characterId === characterId ? { ...entry, presentation } : entry,
      ),
    },
  };
  return { lifecycle, finance, physical: root.physical, requirements: [] };
}
