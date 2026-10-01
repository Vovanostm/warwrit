import { createHash } from 'node:crypto';

import {
  COMPANY_CATALOGUE,
  FIRST_HUNT_INSTANCE_ID,
  FIRST_HUNT_PROFILE_ID,
  PHYSICAL_POLICY_VERSION,
  SAFE_TRAVEL_ALPHA_V1,
  TRAVEL_RULES,
  COMPANY_RULES,
  assessPhysicalFoodStock,
  acceptedWorldRegion,
  accrueFinance,
  entityId,
  isEntityId,
  isExactInteger,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  FoodFulfillmentEvidence,
  PartyRouteExecution,
  PhysicalContainer,
  WorldRegionEdge,
} from '@warwrit/game-core';

type FoodRequirement = Extract<
  ReturnType<typeof accrueFinance>['requirements'][number],
  { readonly kind: 'FOOD_CONSUMPTION' }
>;

export type TravelFoodPreparation =
  | { readonly kind: 'PREPARED'; readonly facts: readonly FoodFulfillmentEvidence[] }
  | { readonly kind: 'REJECTED'; readonly reason: 'INVALID_STATE' | 'INSUFFICIENT_ITEMS' };

export interface TravelFoodExecutionBoundary {
  readonly kind: 'EXECUTION';
  readonly execution: PartyRouteExecution;
  readonly settledThroughTick: string;
}

export interface TravelFoodDepartureBoundary {
  readonly kind: 'DEPARTURE';
  readonly partyId: string;
  readonly location: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string };
  readonly settledThroughTick: string;
}

export type TravelFoodRouteBoundary = TravelFoodExecutionBoundary | TravelFoodDepartureBoundary;

type FoodAccess =
  | { readonly kind: 'SKIP' }
  | { readonly kind: 'REJECT'; readonly reason: 'INVALID_STATE' | 'INSUFFICIENT_ITEMS' }
  | {
      readonly kind: 'ALLOW';
      readonly location: FoodFulfillmentEvidence['location'];
      readonly containers: readonly PhysicalContainer[];
    };

type FoodAccessResolver = (
  membership: CompanyCombatAggregateState['economy']['lifecycle']['memberships'][number],
  character: CompanyCombatAggregateState['economy']['lifecycle']['characters'][number],
) => FoodAccess;

type FoodFactId = (requirement: FoodRequirement, ordinal: number) => string;

/** Fixed-length, domain-separated IDs for trusted travel-derived commands and facts. */
function travelDerivedId(domain: 'advance' | 'food', parts: readonly string[]): string {
  const digest = createHash('sha256')
    .update(JSON.stringify([`warwrit:safe-travel-alpha-v1:${domain}`, ...parts]), 'utf8')
    .digest('hex');
  return entityId(`world-travel-${domain}-${digest}`);
}

export function travelAdvanceSourceEventId(
  worldId: string,
  companyId: string,
  commandId: string,
): string {
  return travelDerivedId('advance', [worldId, companyId, commandId]);
}

/** Shared deterministic stock allocation for the finite travel and encounter food scopes. */
function prepareStockFoodFacts(
  state: CompanyCombatAggregateState,
  toTick: string,
  requirements: readonly FoodRequirement[],
  resolveAccess: FoodAccessResolver,
  factId: FoodFactId,
): TravelFoodPreparation {
  const { lifecycle, physical } = state.economy;
  if (!physical) return { kind: 'REJECTED', reason: 'INVALID_STATE' };

  const facts: FoodFulfillmentEvidence[] = [];
  const reservedUnitsByContainer = new Map<string, bigint>();
  const carryByMembership = new Map<string, bigint>();
  for (const [ordinal, requirement] of requirements.entries()) {
    const member = lifecycle.memberships.find(
      (entry) => entry.membershipId === requirement.membershipId,
    );
    const character = member
      ? lifecycle.characters.find((entry) => entry.identity.characterId === member.characterId)
      : undefined;
    if (!member || !character) return { kind: 'REJECTED', reason: 'INVALID_STATE' };
    const access = resolveAccess(member, character);
    if (access.kind === 'SKIP') continue;
    if (access.kind === 'REJECT') return { kind: 'REJECTED', reason: access.reason };

    const sources = access.containers
      .toSorted((left, right) =>
        left.containerId < right.containerId ? -1 : left.containerId > right.containerId ? 1 : 0,
      )
      .flatMap((container) => {
        const foodItems = physical.items.filter(
          (item) =>
            item.containerId === container.containerId &&
            item.tombstone === null &&
            COMPANY_CATALOGUE.items.find((definition) => definition.id === item.definitionId)
              ?.foodUnits === 1,
        );
        if (
          foodItems.some(
            (item) => item.owner.kind !== 'COMPANY' || item.owner.id !== lifecycle.companyId,
          )
        )
          return [];
        return [
          {
            containerId: container.containerId,
            availableUnits: BigInt(
              assessPhysicalFoodStock(physical, [], [container.containerId], lifecycle.companyId)
                .availableUnits,
            ),
          },
        ];
      });
    if (sources.length === 0) return { kind: 'REJECTED', reason: 'INSUFFICIENT_ITEMS' };

    const storedCarry = BigInt(
      physical.foodCarry.find((entry) => entry.membershipId === requirement.membershipId)
        ?.tickUnits ?? '0',
    );
    const priorCarry = carryByMembership.get(requirement.membershipId) ?? storedCarry;
    const physicalWithCarry = {
      ...physical,
      foodCarry: [
        ...physical.foodCarry.filter((entry) => entry.membershipId !== requirement.membershipId),
        { membershipId: requirement.membershipId, tickUnits: priorCarry.toString() },
      ],
    };
    const requiredUnits = BigInt(
      assessPhysicalFoodStock(physicalWithCarry, [requirement], [], lifecycle.companyId)
        .requiredUnits,
    );
    const source = sources.find(
      (candidate) =>
        candidate.availableUnits - (reservedUnitsByContainer.get(candidate.containerId) ?? 0n) >=
        requiredUnits,
    );
    if (!source) return { kind: 'REJECTED', reason: 'INSUFFICIENT_ITEMS' };
    reservedUnitsByContainer.set(
      source.containerId,
      (reservedUnitsByContainer.get(source.containerId) ?? 0n) + requiredUnits,
    );
    carryByMembership.set(
      requirement.membershipId,
      (priorCarry + BigInt(requirement.tickUnits)) % BigInt(COMPANY_RULES.ticksPerDay),
    );

    const sourceEventId = factId(requirement, ordinal);
    facts.push({
      id: sourceEventId,
      kind: 'FOOD_FULFILLMENT',
      worldId: lifecycle.worldId,
      companyId: lifecycle.companyId,
      revision: lifecycle.revision,
      sourceEventId,
      atTick: toTick as typeof physical.processedTick,
      ordinal,
      version: PHYSICAL_POLICY_VERSION,
      membershipId: requirement.membershipId,
      fromTick: requirement.fromTick,
      toTick: requirement.toTick,
      channel: 'STOCK',
      location: access.location,
      containerId: source.containerId,
    });
  }
  return { kind: 'PREPARED', facts };
}

/** Derive only the exact food intervals produced by the finance owner for this command. */
export function prepareTravelFoodFacts(
  state: CompanyCombatAggregateState,
  toTick: string,
  commandId: string,
  routeBoundary?: TravelFoodRouteBoundary,
): TravelFoodPreparation {
  const { lifecycle, finance, physical } = state.economy;
  if (
    !physical ||
    !isEntityId(commandId) ||
    lifecycle.campaignTick !== finance.processedTick ||
    finance.processedTick !== physical.processedTick
  )
    return { kind: 'REJECTED', reason: 'INVALID_STATE' };

  let executionFoodAccess:
    { readonly partyId: string; readonly sites: ReadonlySet<string> } | undefined;
  let departureFoodAccess: TravelFoodDepartureBoundary | undefined;
  let departurePartyMemberIds: ReadonlySet<string> = new Set();
  if (routeBoundary) {
    if (
      !isExactInteger(routeBoundary.settledThroughTick) ||
      routeBoundary.settledThroughTick !== toTick ||
      BigInt(routeBoundary.settledThroughTick) < BigInt(lifecycle.campaignTick)
    )
      return { kind: 'REJECTED', reason: 'INVALID_STATE' };
    if (routeBoundary.kind === 'DEPARTURE') {
      const matches = lifecycle.parties.filter((entry) => entry.partyId === routeBoundary.partyId);
      const party = matches.length === 1 ? matches[0] : undefined;
      const partyMembers = lifecycle.characters.filter(
        (character) => character.presence.fieldPartyId === routeBoundary.partyId,
      );
      if (
        !isEntityId(routeBoundary.partyId) ||
        !party ||
        party.location.kind !== 'AT' ||
        !sameAtLocation(party.location, routeBoundary.location) ||
        partyMembers.length === 0 ||
        partyMembers.some(
          (character) =>
            character.presence.location.kind !== 'AT' ||
            !sameAtLocation(character.presence.location, routeBoundary.location),
        )
      )
        return { kind: 'REJECTED', reason: 'INVALID_STATE' };
      departureFoodAccess = routeBoundary;
      departurePartyMemberIds = new Set(
        partyMembers.map((character) => character.identity.characterId),
      );
    } else {
      const { execution } = routeBoundary;
      const region = acceptedWorldRegion(execution.regionVersion);
      const party = lifecycle.parties.find((entry) => entry.partyId === execution.partyId);
      if (
        !region ||
        execution.worldId !== lifecycle.worldId ||
        execution.companyId !== lifecycle.companyId ||
        !isEntityId(execution.routeExecutionId) ||
        !isExactInteger(execution.routeEpoch) ||
        (execution.phase === 'IN_TRANSIT'
          ? !execution.segment ||
            party?.location.kind !== 'TRANSIT' ||
            party.location.segmentId !== execution.segment.segmentId ||
            execution.segment.dueTick !== toTick
          : execution.phase !== 'AT_BOUNDARY' ||
            execution.segment !== null ||
            party?.location.kind !== 'AT' ||
            party.location.siteId !== execution.currentSiteId)
      )
        return { kind: 'REJECTED', reason: 'INVALID_STATE' };
      const edges = execution.edgeIds.map((edgeId) =>
        region.edges.filter((edge) => edge.edgeId === edgeId),
      );
      const dangerous = edges.some(
        (matches) => matches.length === 1 && matches[0]!.danger !== 'SAFE',
      );
      if (
        edges.some((matches) => matches.length !== 1) ||
        (dangerous
          ? !validFirstHuntExecution(
              execution,
              edges.map((matches) => matches[0]!),
            )
          : execution.dangerousAuthorization !== undefined)
      )
        return { kind: 'REJECTED', reason: 'INVALID_STATE' };
      executionFoodAccess = {
        partyId: execution.partyId,
        sites: new Set(edges.flatMap((matches) => [matches[0]!.fromSiteId, matches[0]!.toSiteId])),
      };
    }
  }

  let accrual: ReturnType<typeof accrueFinance>;
  try {
    accrual = accrueFinance(finance, lifecycle, toTick as typeof finance.processedTick);
  } catch {
    return { kind: 'REJECTED', reason: 'INVALID_STATE' };
  }

  const requirements = accrual.requirements.filter(
    (requirement): requirement is FoodRequirement => requirement.kind === 'FOOD_CONSUMPTION',
  );
  return prepareStockFoodFacts(
    state,
    toTick,
    requirements,
    (_member, character) => {
      const location = character.presence.location;
      if (location.kind === 'TRANSIT') return { kind: 'SKIP' };
      const partyRouteSiteAllowed =
        location.kind === 'AT' &&
        ((executionFoodAccess?.partyId === character.presence.fieldPartyId &&
          executionFoodAccess.sites.has(location.siteId)) ||
          (departureFoodAccess?.partyId === character.presence.fieldPartyId &&
            sameAtLocation(location, departureFoodAccess.location)));
      const safeV1SiteAllowed =
        location.kind === 'AT' &&
        (location.siteId === SAFE_TRAVEL_ALPHA_V1.fromSiteId ||
          location.siteId === SAFE_TRAVEL_ALPHA_V1.toSiteId);
      if (location.kind !== 'AT' || (!partyRouteSiteAllowed && !safeV1SiteAllowed))
        return { kind: 'REJECT', reason: 'INSUFFICIENT_ITEMS' };

      const containers = physical.containers.filter(
        (container) =>
          (container.kind === 'PARTY_SUPPLY' ||
            container.kind === 'STATIC' ||
            container.kind === 'CARRIED') &&
          container.closed === null &&
          container.access === 'COMPANY' &&
          container.custodian.kind === 'COMPANY' &&
          container.custodian.id === lifecycle.companyId &&
          container.location.kind === 'AT' &&
          container.location.siteId === location.siteId &&
          container.location.areaId === location.areaId &&
          (container.kind === 'STATIC' ||
            (container.kind === 'PARTY_SUPPLY' &&
              container.carrier?.kind === 'PARTY' &&
              container.carrier.id === character.presence.fieldPartyId) ||
            (container.kind === 'CARRIED' &&
              container.carrier?.kind === 'CHARACTER' &&
              (container.carrier.id === character.identity.characterId ||
                (partyRouteSiteAllowed && departurePartyMemberIds.has(container.carrier.id))))),
      );
      return { kind: 'ALLOW', location, containers };
    },
    (requirement, ordinal) =>
      travelDerivedId('food', [
        lifecycle.worldId,
        lifecycle.companyId,
        commandId,
        requirement.membershipId,
        requirement.fromTick,
        requirement.toTick,
        String(ordinal),
        PHYSICAL_POLICY_VERSION,
      ]),
  );
}

/** Prepare only company-owned rations within the still-active encounter's frozen party. */
export function prepareEncounterFoodFacts(
  state: CompanyCombatAggregateState,
  toTick: string,
  commandId: string,
): TravelFoodPreparation {
  const { lifecycle, finance, physical } = state.economy;
  const active = state.encounter.active;
  const binding = active?.binding;
  if (
    !physical ||
    !binding ||
    !isEntityId(commandId) ||
    !isExactInteger(toTick) ||
    !isEntityId(lifecycle.worldId) ||
    !isEntityId(lifecycle.companyId) ||
    lifecycle.company?.runStatus !== 'ACTIVE' ||
    binding.worldId !== lifecycle.worldId ||
    binding.location.kind !== 'AT' ||
    lifecycle.campaignTick !== finance.processedTick ||
    finance.processedTick !== physical.processedTick ||
    BigInt(toTick) < BigInt(lifecycle.campaignTick)
  )
    return { kind: 'REJECTED', reason: 'INVALID_STATE' };

  const boundParticipants = binding.participants.filter(
    (participant) => participant.companyId === lifecycle.companyId,
  );
  const partyIds = new Set(boundParticipants.map((participant) => participant.partyId));
  if (boundParticipants.length === 0 || partyIds.size !== 1)
    return { kind: 'REJECTED', reason: 'INVALID_STATE' };
  const partyId = boundParticipants[0]!.partyId;
  // A participant who already died in this encounter eats nothing and has left the party.
  const isDead = (characterId: string) =>
    lifecycle.characters.find((character) => character.identity.characterId === characterId)
      ?.presence.availability === 'DEAD';
  const companyParticipants = boundParticipants.filter(
    (participant) => !isDead(participant.projection.characterId),
  );
  if (companyParticipants.length === 0) return { kind: 'PREPARED', facts: [] };
  const matchingParties = lifecycle.parties.filter((party) => party.partyId === partyId);
  const party = matchingParties.length === 1 ? matchingParties[0] : undefined;
  const participantIds = new Set(
    companyParticipants.map((participant) => participant.projection.characterId),
  );
  const currentPartyMembers = lifecycle.characters.filter(
    (character) =>
      character.presence.fieldPartyId === partyId && character.presence.availability !== 'DEAD',
  );
  if (
    participantIds.size !== companyParticipants.length ||
    !party ||
    party.location.kind !== 'AT' ||
    !sameAtLocation(party.location, binding.location) ||
    currentPartyMembers.length !== participantIds.size ||
    currentPartyMembers.some(
      (character) =>
        !participantIds.has(character.identity.characterId) ||
        character.presence.location.kind !== 'AT' ||
        !sameAtLocation(character.presence.location, binding.location),
    )
  )
    return { kind: 'REJECTED', reason: 'INVALID_STATE' };

  const boundMembershipIds = new Set<string>();
  for (const participant of companyParticipants) {
    const matching = lifecycle.memberships.filter(
      (membership) =>
        membership.characterId === participant.projection.characterId &&
        membership.companyId === lifecycle.companyId &&
        membership.endedAt === null,
    );
    if (matching.length !== 1) return { kind: 'REJECTED', reason: 'INVALID_STATE' };
    boundMembershipIds.add(matching[0]!.membershipId);
  }

  let requirements: FoodRequirement[];
  try {
    requirements = accrueFinance(
      finance,
      lifecycle,
      toTick as typeof finance.processedTick,
    ).requirements.filter(
      (requirement): requirement is FoodRequirement =>
        requirement.kind === 'FOOD_CONSUMPTION' && boundMembershipIds.has(requirement.membershipId),
    );
  } catch {
    return { kind: 'REJECTED', reason: 'INVALID_STATE' };
  }

  return prepareStockFoodFacts(
    state,
    toTick,
    requirements,
    (membership, character) => {
      if (
        membership.companyId !== lifecycle.companyId ||
        !boundMembershipIds.has(membership.membershipId) ||
        !participantIds.has(character.identity.characterId) ||
        character.presence.fieldPartyId !== partyId ||
        character.presence.location.kind !== 'AT' ||
        !sameAtLocation(character.presence.location, binding.location)
      )
        return { kind: 'REJECT', reason: 'INVALID_STATE' };
      const containers = physical.containers.filter(
        (container) =>
          (container.kind === 'PARTY_SUPPLY' || container.kind === 'CARRIED') &&
          container.closed === null &&
          container.access === 'COMPANY' &&
          container.custodian.kind === 'COMPANY' &&
          container.custodian.id === lifecycle.companyId &&
          container.location.kind === 'AT' &&
          sameAtLocation(container.location, binding.location) &&
          ((container.kind === 'PARTY_SUPPLY' &&
            container.carrier?.kind === 'PARTY' &&
            container.carrier.id === partyId) ||
            (container.kind === 'CARRIED' &&
              container.carrier?.kind === 'CHARACTER' &&
              participantIds.has(container.carrier.id))),
      );
      return { kind: 'ALLOW', location: binding.location, containers };
    },
    (requirement, ordinal) => {
      const sourceEventId = createHash('sha256')
        .update(
          JSON.stringify([
            'warwrit:first-hunt-encounter-food-v1',
            binding.bindingId,
            lifecycle.worldId,
            lifecycle.companyId,
            commandId,
            requirement.membershipId,
            requirement.fromTick,
            requirement.toTick,
            String(ordinal),
            PHYSICAL_POLICY_VERSION,
          ]),
          'utf8',
        )
        .digest('hex');
      return entityId(`encounter-food-${sourceEventId}`);
    },
  );
}

function sameAtLocation(
  left: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string },
  right: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string },
): boolean {
  return left.siteId === right.siteId && left.areaId === right.areaId;
}

function validFirstHuntExecution(
  execution: PartyRouteExecution,
  edges: readonly WorldRegionEdge[],
): boolean {
  const authorization = execution.dangerousAuthorization;
  const edge = edges.length === 1 ? edges[0] : undefined;
  const fromSiteId = execution.purpose === 'NEW' ? 'tikhaya-gat' : 'staraya-melnitsa';
  const toSiteId = execution.purpose === 'NEW' ? 'staraya-melnitsa' : 'tikhaya-gat';
  return Boolean(
    execution.profileId === TRAVEL_RULES.profileId &&
    execution.edgeIds.length === 1 &&
    execution.edgeIds[0] === 'tikhaya-gat-staraya-melnitsa' &&
    authorization?.instanceId === FIRST_HUNT_INSTANCE_ID &&
    authorization.profileId === FIRST_HUNT_PROFILE_ID &&
    /^[0-9a-f]{64}$/.test(authorization.termsDigest) &&
    edge?.danger === 'DANGEROUS' &&
    edge.edgeId === 'tikhaya-gat-staraya-melnitsa' &&
    ((edge.fromSiteId === fromSiteId && edge.toSiteId === toSiteId) ||
      (edge.fromSiteId === toSiteId && edge.toSiteId === fromSiteId)) &&
    execution.phase === 'IN_TRANSIT' &&
    execution.segment?.fromSiteId === fromSiteId &&
    execution.segment.toSiteId === toSiteId,
  );
}

/**
 * Food a stationary party ate between its company's last settled tick and `toTick`,
 * from its own stock. Commands executed "now" on a lagging root include these facts.
 */
export function prepareStationaryFoodFacts(
  state: CompanyCombatAggregateState,
  toTick: string,
  commandId: string,
): TravelFoodPreparation {
  const lifecycle = state.economy.lifecycle;
  if (BigInt(toTick) <= BigInt(lifecycle.campaignTick)) return { kind: 'PREPARED', facts: [] };
  const party = lifecycle.parties.length === 1 ? lifecycle.parties[0] : undefined;
  if (party?.location.kind !== 'AT') return { kind: 'REJECTED', reason: 'INVALID_STATE' };
  return prepareTravelFoodFacts(state, toTick, commandId, {
    kind: 'DEPARTURE',
    partyId: party.partyId,
    location: party.location,
    settledThroughTick: toTick,
  });
}
