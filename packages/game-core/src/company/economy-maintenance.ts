import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import {
  activeMembership,
  canPerform,
  effectiveLeaderId,
  person,
  sameLocation,
} from './lifecycle-state.js';
import {
  accountFor,
  actualOwedQ,
  closeEpochs,
  economyId,
  financeFact,
  own,
  poolWallet,
  requireEconomy,
  requirePoolAccess,
  validateFinanceFact,
} from './economy-state.js';
import { reservePreEntry } from './economy-payments.js';
import type { CommandOf } from './lifecycle-types.js';
import type {
  CompanyEconomyState,
  CompanyFinance,
  EconomyContext,
  FinanceChange,
  MaintenanceAgreement,
  SafeServiceOffer,
} from './economy-types.js';

function actualParty(state: CompanyEconomyState, partyId: string, context: EconomyContext) {
  const party = state.lifecycle.parties.find((p) => p.partyId === partyId);
  requireEconomy(party?.location.kind === 'AT', 'CONTACT_OR_ACCESS_REQUIRED');
  const people = state.lifecycle.characters.filter((p) => p.presence.fieldPartyId === partyId);
  requireEconomy(
    people.length > 0 &&
      people.length <= COMPANY_RULES.partyHardMax &&
      people.every(
        (p) =>
          p.presence.availability === 'AVAILABLE' &&
          !p.presence.encounterBindingId &&
          ['FIELD', 'RECOVERY'].includes(p.presence.assignment) &&
          sameLocation(p.presence.location, party.location) &&
          context.contactIds.includes(p.identity.characterId),
      ),
    'INCOMPATIBLE_ACTIVITY',
  );
  return { party, people };
}
function endMode(
  finance: CompanyFinance,
  agreementId: string,
  atTick: EconomyContext['atTick'],
  known: boolean,
): CompanyFinance {
  return closeEpochs(
    {
      ...finance,
      maintenance: finance.maintenance.map((m) =>
        m.agreementId === agreementId
          ? { ...m, endedAt: m.endedAt ?? atTick, knownEndedAt: known ? atTick : m.knownEndedAt }
          : m,
      ),
    },
    atTick,
  );
}
export function beginFieldCamp(
  state: CompanyEconomyState,
  command: CommandOf<'BeginFieldCamp'>,
  context: EconomyContext,
): FinanceChange {
  const { party, people } = actualParty(state, command.payload.partyId, context);
  const site = financeFact(context, 'CAMP_SITE', command.payload.siteEligibilityId);
  requireEconomy(
    site.partyId === party.partyId &&
      sameLocation(site.location, party.location) &&
      site.stationary &&
      !site.conflict,
    'INVALID_SOURCE',
  );
  requireEconomy(
    people.some((p) => canPerform(p, 'basicWork')),
    'INCOMPATIBLE_ACTIVITY',
  );
  requireEconomy(
    !state.finance.maintenance.some((m) => m.endedAt === null && m.partyId === party.partyId),
    'INCOMPATIBLE_ACTIVITY',
  );
  const mode: MaintenanceAgreement = {
    agreementId: economyId(command.commandId, 'field-camp'),
    kind: 'FIELD_CAMP',
    partyId: party.partyId,
    location: own(site.location),
    beneficiaryIds: people.map((p) => p.identity.characterId).sort(),
    startedAt: context.atTick,
    endedAt: null,
    knownEndedAt: null,
    sourceId: site.sourceEventId,
    providerId: null,
    termsVersion: null,
  };
  return {
    finance: { ...state.finance, maintenance: [...state.finance.maintenance, mode] },
    requirements: [],
    allocations: [],
  };
}
function verifyOffer(
  state: CompanyEconomyState,
  offer: SafeServiceOffer,
  ids: readonly string[],
  context: EconomyContext,
  continuing: boolean,
) {
  validateFinanceFact(offer, context);
  const { party, people } = actualParty(state, offer.partyId, context);
  const actual: string[] = people.map((p) => p.identity.characterId).sort();
  requireEconomy(
    JSON.stringify(actual) === JSON.stringify([...ids].sort()) &&
      actual.includes(effectiveLeaderId(state.lifecycle)),
    'INCOMPATIBLE_ACTIVITY',
  );
  requireEconomy(
    offer.safe &&
      offer.inhabited &&
      offer.accessible &&
      BigInt(offer.expiresAt) > BigInt(context.atTick) &&
      offer.offerRevision === state.lifecycle.knowledge.revision &&
      sameLocation(offer.location, party.location) &&
      actual.every((id) => offer.permittedBeneficiaryIds.includes(id)),
    'INVALID_SOURCE',
  );
  const provider = person(state.lifecycle, offer.providerId);
  requireEconomy(
    !actual.includes(offer.providerId) &&
      sameLocation(provider.presence.location, party.location) &&
      canPerform(provider, 'basicWork'),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  // This is the admission rule, not a recurring ability check of an already accepted group.
  if (!continuing)
    requireEconomy(
      people.some((p) => canPerform(p, 'basicWork')),
      'INCOMPATIBLE_ACTIVITY',
    );
  requireEconomy(
    people.every(
      (p) =>
        !p.conditionIds.some(
          (id) => COMPANY_CATALOGUE.conditions.find((c) => c.id === id)?.category === 'CRITICAL',
        ),
    ),
    'INCOMPATIBLE_ACTIVITY',
  );
  return { party, people };
}
function preEntry(
  finance: CompanyFinance,
  state: CompanyEconomyState,
  ids: readonly string[],
  poolId: string,
  context: EconomyContext,
): CompanyFinance {
  requirePoolAccess({ ...state, finance }, poolId, context);
  const location = poolWallet(finance, poolId).location;
  for (const id of ids) {
    const member = activeMembership(state.lifecycle, id);
    requireEconomy(member, 'INVALID_STATE');
    const account = accountFor(finance, member.membershipId);
    requireEconomy(
      account.confirmedAt === context.atTick &&
        account.known &&
        !account.knownDeath &&
        !account.knownPaused,
      'CONTACT_OR_ACCESS_REQUIRED',
    );
    for (const claim of finance.claims.filter((c) => c.membershipId === member.membershipId)) {
      if (BigInt(claim.dueAt) <= BigInt(context.atTick))
        requireEconomy(actualOwedQ(claim) === 0n, 'UNPAID_OBLIGATIONS');
      else {
        requireEconomy(
          sameLocation(poolWallet(finance, claim.poolId).location, location),
          'CONTACT_OR_ACCESS_REQUIRED',
        );
        requirePoolAccess({ ...state, finance }, claim.poolId, context);
        finance = reservePreEntry(finance, claim, context.atTick);
      }
    }
  }
  return finance;
}
export function acceptSafeService(
  state: CompanyEconomyState,
  command: CommandOf<'AcceptSafeService'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload,
    offer = financeFact(context, 'SAFE_SERVICE_OFFER', p.offerId);
  requireEconomy(
    p.partyId === offer.partyId && p.quoteRevision === state.lifecycle.knowledge.revision,
    'STALE_REVISION',
  );
  const { party } = verifyOffer(state, offer, p.beneficiaryIds, context, false);
  requireEconomy(
    !state.finance.maintenance.some((m) => m.kind === 'SAFE_SERVICE' && m.endedAt === null),
    'INCOMPATIBLE_ACTIVITY',
  );
  requireEconomy(
    sameLocation(poolWallet(state.finance, p.fundingPoolId).location, party.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  let finance = preEntry(state.finance, state, p.beneficiaryIds, p.fundingPoolId, context);
  for (const m of finance.maintenance.filter(
    (m) => m.partyId === party.partyId && m.endedAt === null,
  ))
    finance = endMode(finance, m.agreementId, context.atTick, true);
  const mode: MaintenanceAgreement = {
    agreementId: economyId(command.commandId, 'safe-service'),
    kind: 'SAFE_SERVICE',
    partyId: party.partyId,
    location: own(offer.location),
    beneficiaryIds: [...p.beneficiaryIds].sort(),
    startedAt: context.atTick,
    endedAt: null,
    knownEndedAt: null,
    sourceId: offer.sourceEventId,
    providerId: offer.providerId,
    termsVersion: offer.termsVersion,
  };
  return {
    finance: { ...finance, maintenance: [...finance.maintenance, mode] },
    requirements: [],
    allocations: [],
  };
}
export function amendSafeService(
  state: CompanyEconomyState,
  command: CommandOf<'AmendSafeService'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload;
  const old = state.finance.maintenance.find(
    (m) => m.agreementId === p.agreementId && m.kind === 'SAFE_SERVICE' && m.endedAt === null,
  );
  requireEconomy(old && p.quoteRevision === state.lifecycle.knowledge.revision, 'STALE_REVISION');
  const offer = financeFact(context, 'SAFE_SERVICE_OFFER');
  requireEconomy(
    offer.partyId === old.partyId && offer.providerId === old.providerId,
    'INVALID_SOURCE',
  );
  const sameCohort = p.beneficiaryIds.every((id) => old.beneficiaryIds.includes(id));
  verifyOffer(state, offer, p.beneficiaryIds, context, sameCohort);
  let finance = state.finance;
  const additions = p.beneficiaryIds.filter((id) => !old.beneficiaryIds.includes(id));
  if (additions.length) {
    const member = activeMembership(state.lifecycle, additions[0]!)!;
    finance = preEntry(
      finance,
      state,
      additions,
      accountFor(finance, member.membershipId).poolId,
      context,
    );
  }
  finance = endMode(finance, old.agreementId, context.atTick, true);
  const amended: MaintenanceAgreement = {
    ...old,
    agreementId: economyId(command.commandId, 'safe-service'),
    beneficiaryIds: [...p.beneficiaryIds].sort(),
    startedAt: context.atTick,
    endedAt: null,
    knownEndedAt: null,
    sourceId: offer.sourceEventId,
    termsVersion: offer.termsVersion,
  };
  return {
    finance: { ...finance, maintenance: [...finance.maintenance, amended] },
    requirements: [],
    allocations: [],
  };
}
export function endMaintenance(
  state: CompanyEconomyState,
  command: CommandOf<'EndMaintenance'>,
  context: EconomyContext,
): FinanceChange {
  const p = command.payload;
  const mode = state.finance.maintenance.find(
    (m) => m.agreementId === p.agreementOrCampId && m.endedAt === null,
  );
  requireEconomy(mode, 'INVALID_SOURCE');
  if (p.reason === 'LEAVE') actualParty(state, mode.partyId, context);
  else {
    const fact = financeFact(context, 'MAINTENANCE_BOUNDARY');
    requireEconomy(
      fact.agreementId === mode.agreementId &&
        fact.sourceEventId === command.sourceEventId &&
        fact.reason === p.reason,
      'INVALID_SOURCE',
    );
  }
  return {
    finance: endMode(state.finance, mode.agreementId, context.atTick, true),
    requirements: [],
    allocations: [],
  };
}
export { endMode as closeMaintenance };
