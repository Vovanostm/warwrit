import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  SAFE_TRAVEL_ALPHA_V1,
  FIRST_HUNT_INSTANCE_ID,
  FIRST_HUNT_PROFILE_ID,
  accrueFinance,
  assessPhysicalFoodStock,
  acceptedWorldRegion,
  canonicalJson,
  canonicalRevision,
  isEntityId,
  isExactInteger,
  parseCompanyCommand,
  preparePartyTravelArrival,
  preparePartyTravelDeparture,
  preparePartyRouteExecutionDeparture,
  preparePartyRouteExecutionArrival,
  continuePartyRouteExecution,
  enumerateSimpleWorldRouteCandidates,
  publicRevision,
  readCompanyCombatAggregateState,
  type CompanyCombatAggregateState,
  type PreparedPartyRoute,
  type PartyRouteExecution,
  type PartyRouteExecutionArrivalGuard,
  type PartyRouteExecutionContinuationGuard,
  type TrustedTransitSegment,
  type TrustedRouteSupplyAssessment,
  type WorldRegionEdge,
  RoutePreparationError,
  TravelPreparationError,
  WORLD_REGION_VERSION,
  campaignTick,
  trustedTransitSegment,
} from '@warwrit/game-core';
import type { CompanyCommandRejectionDto } from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import type {
  WorldAvailableDepartureDto,
  WorldPartyReadResponseDto,
  WorldPartyReadResponseV2Dto,
  WorldTravelRequestDto,
  WorldTravelResponseDto,
  WorldTravelV2RequestDto,
  WorldTravelV2ResponseDto,
  WorldTravelRejectionDto,
  WorldTravelPreviewResponseDto,
} from '@warwrit/protocol';
import { isWorldTravelPreviewRequest } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { resolveSessionAccount } from '../auth/session.js';
import { readFirstHuntRouteMembership } from '../contracts/repository.js';
import { travelAdvanceSourceEventId } from '../company/travel-food.js';
import type { TravelFoodRouteBoundary } from '../company/travel-food.js';
import type { CompanyRoutesOptions } from '../company/routes.js';
import { findOwnedCompanyId, loadCompanyAggregate } from '../company/repository.js';
import {
  lookupTrustedCompanyCommandReceipt,
  persistPreparedTrustedCompanyCommand,
  prepareTrustedCompanyCommand,
  stableCompanyRequestKey,
} from '../company/executor.js';
import { readWorldClock } from './clock.js';
import { registerWorldSurroundingsRoute } from './surroundings.js';
import {
  readRouteExecutionEnvelope,
  routeArrivalCommandId,
  routeContinuationCommandId,
  storeRouteExecution,
} from './route-execution.js';
import {
  persistWorldTravel,
  readPartyRoute,
  readPartyRouteForCompany,
  readWorldRouteReceipt,
  type StoredPartyRoute,
  type WorldRouteAuditEvent,
} from './repository.js';

const EMPTY_REVISION = publicRevision('0');
type StoredV1TravelResponseDto = Omit<WorldTravelResponseDto, 'availableDepartures'> & {
  readonly availableDepartures?: readonly WorldAvailableDepartureDto[];
};

type CommittedWorldTravelResponse = {
  readonly kind: 'COMMITTED';
  readonly body: string;
};

type RejectedWorldTravelResponse = {
  readonly kind: 'REJECTED';
  readonly statusCode: number;
  readonly body: unknown;
};

class InvalidStoredWorldRouteError extends Error {}

export function registerWorldRoutes(
  app: FastifyInstance,
  { database, worldId }: CompanyRoutesOptions,
): void {
  registerWorldSurroundingsRoute(app, { database, worldId });
  app.post('/world/travel/preview', { bodyLimit: 2048 }, async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });
    if (!isWorldTravelPreviewRequest(request.body))
      return reply.code(400).send({ error: 'invalid travel preview' });
    const input = request.body;
    const preview = await database.transaction().execute(async (transaction) => {
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (!companyId) return undefined;
      const state = await loadCompanyAggregate(transaction, worldId, companyId);
      if (!state || !state.economy.physical) return undefined;
      const parties = state.economy.lifecycle.parties;
      if (parties.length !== 1) return undefined;
      const party = parties[0]!;
      if (party.location.kind !== 'AT') return undefined;
      const partyLocation = party.location;
      const activeRoute = await readPartyRouteForCompany(transaction, worldId, companyId);
      const routeRow =
        activeRoute ?? (await readPartyRoute(transaction, worldId, companyId, party.partyId));
      if (routeRow && !isValidCompletedRouteForDeparture(routeRow, state)) return undefined;
      const clock = await readWorldClock(transaction, worldId, new Date());
      if (BigInt(state.economy.lifecycle.campaignTick) > BigInt(clock.tick)) return undefined;
      const offerState = await prepareReadOnlyOfferState({
        transaction,
        accountId,
        state,
        worldId,
        companyId,
        partyId: party.partyId,
        location: partyLocation,
        toTick: clock.tick,
      });
      if (!offerState) return undefined;
      const region = requireRegion();
      const matchedEdges = input.edgeIds.map((edgeId) =>
        region.edges.filter((edge) => edge.edgeId === edgeId),
      );
      if (
        matchedEdges.some((matches) => matches.length !== 1) ||
        !isContinuousRoute(
          matchedEdges.map((matches) => matches[0]!),
          partyLocation.siteId,
        )
      )
        return undefined;
      const route = matchedEdges.map((matches) => matches[0]!);
      const isDangerous = route.some((edge) => edge.danger === 'DANGEROUS');
      const membership = isDangerous
        ? await readFirstHuntRouteMembership(transaction, worldId, companyId)
        : undefined;
      if (isDangerous && !membership) return undefined;
      try {
        prepareOfferRouteDeparture({
          state: offerState,
          partyId: party.partyId,
          edgeIds: input.edgeIds,
          edges: route,
          purpose: input.purpose,
          atTick: clock.tick,
          routeEpoch: routeRow?.route_epoch ?? '0',
          ...(membership ? { contractMembership: membership } : {}),
        });
      } catch (error) {
        if (
          !(error instanceof RoutePreparationError) ||
          error.code !== 'KNOWN_DANGEROUS_SUPPLY_SHORTAGE'
        )
          return undefined;
      }
      const dueTick = (
        BigInt(clock.tick) +
        route.reduce((sum, edge) => sum + BigInt(edge.provisionalTravelTicks), 0n)
      ).toString();
      const accrued = accrueFinance(
        offerState.economy.finance,
        offerState.economy.lifecycle,
        campaignTick(dueTick),
      );
      const requirements = accrued.requirements.filter(
        (
          requirement,
        ): requirement is Extract<
          (typeof accrued.requirements)[number],
          { readonly kind: 'FOOD_CONSUMPTION' }
        > => requirement.kind === 'FOOD_CONSUMPTION',
      );
      const containers = followableRouteFoodContainerIds(offerState, party.partyId);
      const stock = assessPhysicalFoodStock(
        offerState.economy.physical!,
        requirements,
        containers,
        companyId,
      );
      const response: WorldTravelPreviewResponseDto = {
        schemaVersion: 1,
        publicRevision: state.economy.lifecycle.knowledge.revision,
        routeEpoch: routeRow?.route_epoch ?? '0',
        atTick: clock.tick,
        purpose: input.purpose,
        edgeIds: input.edgeIds,
        knownShortage: stock.knownShortage,
        assumptions: [
          'SERVER_CLOCK',
          'CURRENT_COMPANY_OWNED_PARTY_STOCK',
          'EXACT_FRACTIONAL_FOOD_CARRY',
        ],
        requiredStockUnits: stock.requiredUnits,
        availableStockUnits: stock.availableUnits,
      };
      return response;
    });
    if (!preview) return reply.code(409).send({ error: 'travel preview unavailable' });
    reply.header('cache-control', 'no-store');
    return preview;
  });

  app.get('/world/party', async (request, reply): Promise<WorldPartyReadResponseDto | unknown> => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });
    const expectedCompanyHeaderPresent = hasExpectedCompanyIdHeader(request.raw.rawHeaders);
    const expectedCompanyId = readExpectedCompanyId(request.raw.rawHeaders);
    if (expectedCompanyHeaderPresent && expectedCompanyId === undefined)
      return reply.code(403).send({ error: 'company context mismatch' });
    const now = new Date();
    return database.transaction().execute(async (transaction) => {
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (companyId === undefined) {
        if (expectedCompanyHeaderPresent)
          return reply.code(403).send({ error: 'company context mismatch' });
        const clock = await readWorldClock(transaction, worldId, now);
        return {
          schemaVersion: 1,
          worldTick: clock.tick,
          publicRevision: EMPTY_REVISION,
          party: null,
          availableDepartures: [],
          route: null,
        };
      }
      if (expectedCompanyId !== undefined && companyId !== expectedCompanyId)
        return reply.code(403).send({ error: 'company context mismatch' });
      const snapshot = await transaction
        .selectFrom('company_snapshots')
        .select('company_id')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .forUpdate()
        .executeTakeFirst();
      if (!snapshot) throw new Error('Owned company snapshot is unavailable');
      const clock = await readWorldClock(transaction, worldId, now);
      const state = await loadCompanyAggregate(transaction, worldId, companyId);
      if (state === undefined) throw new Error('Owned company snapshot is unavailable');
      const activeRoute = await readPartyRouteForCompany(transaction, worldId, companyId);
      const party = selectParty(state, activeRoute);
      const routeRow =
        activeRoute ??
        (party ? await readPartyRoute(transaction, worldId, companyId, party.partyId) : undefined);
      try {
        const contractMembership = await readFirstHuntRouteMembership(
          transaction,
          worldId,
          companyId,
          false,
        );
        const offerParty = party
          ? state.economy.lifecycle.parties.find((entry) => entry.partyId === party.partyId)
          : undefined;
        const offerState =
          offerParty?.location.kind === 'AT'
            ? await prepareReadOnlyOfferState({
                transaction,
                accountId,
                state,
                worldId,
                companyId,
                partyId: offerParty.partyId,
                location: offerParty.location,
                toTick: clock.tick,
              })
            : undefined;
        return projectWorldParty(state, routeRow, clock, contractMembership, offerState);
      } catch (error) {
        if (!(error instanceof InvalidStoredWorldRouteError)) throw error;
        return reply
          .code(409)
          .send(
            rejectedTravelResponse(
              null,
              state.economy.lifecycle.knowledge.revision,
              'INVALID_ROUTE',
            ).body,
          );
      }
    });
  });

  app.post('/world/travel', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });

    if (isRecord(request.body) && request.body['schemaVersion'] === 2) {
      const input = parseV2TravelRequest(request.body);
      if (!input)
        return reply
          .code(400)
          .send(rejectV2(readCommandId(request.body), EMPTY_REVISION, 'INVALID_COMMAND'));
      const result = await executeV2TravelDeparture({
        database,
        worldId,
        accountId,
        expectedCompanyId: readExpectedCompanyId(request.raw.rawHeaders),
        input,
        requestKey: canonicalJson(input),
        now: new Date(),
      });
      if (result.kind === 'COMMITTED')
        return reply.code(200).type('application/json; charset=utf-8').send(result.body);
      return reply.code(result.statusCode).send(result.body);
    }

    const commandId = readCommandId(request.body);
    if (commandId === null) return reject(reply, null, EMPTY_REVISION, 'INVALID_COMMAND');
    const expectedCompanyId = readExpectedCompanyId(request.raw.rawHeaders);
    if (expectedCompanyId === undefined)
      return reject(reply, commandId, EMPTY_REVISION, 'INVALID_COMMAND');
    let requestKey: string;
    try {
      requestKey = canonicalJson(request.body);
    } catch {
      return reject(reply, commandId, EMPTY_REVISION, 'INVALID_COMMAND');
    }

    const input = parseTravelRequest(request.body);
    if (input === undefined) return reject(reply, commandId, EMPTY_REVISION, 'INVALID_COMMAND');
    const now = new Date();
    const result = await database.transaction().execute(async (transaction) => {
      const account = await transaction
        .selectFrom('identity_accounts')
        .select('id')
        .where('id', '=', accountId)
        .forUpdate()
        .executeTakeFirst();
      if (!account)
        return {
          kind: 'REJECTED',
          statusCode: 401,
          body: { error: 'authentication required' },
        } satisfies RejectedWorldTravelResponse;

      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (companyId === undefined || companyId !== expectedCompanyId)
        return rejectedTravelResponse(commandId, EMPTY_REVISION, 'NOT_AUTHORIZED');
      const snapshot = await transaction
        .selectFrom('company_snapshots')
        .select(['canonical_revision', 'public_revision'])
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .forUpdate()
        .executeTakeFirst();
      if (!snapshot) throw new Error('Owned company snapshot is unavailable');

      const previousReceipt = await readWorldRouteReceipt(
        transaction,
        worldId,
        companyId,
        input.commandId,
      );
      if (previousReceipt) {
        if (previousReceipt.account_id !== accountId)
          return rejectedTravelResponse(commandId, snapshot.public_revision, 'NOT_AUTHORIZED');
        if (previousReceipt.request_key !== requestKey)
          return rejectedTravelResponse(commandId, snapshot.public_revision, 'INVALID_COMMAND');
        const response = readStoredResponse(previousReceipt.response, commandId);
        return {
          kind: 'COMMITTED',
          body: canonicalJson(response),
        } satisfies CommittedWorldTravelResponse;
      }

      const previousCompanyReceipt = await lookupTrustedCompanyCommandReceipt({
        transaction,
        accountId,
        identity: { kind: 'WORLD_REQUEST', worldId, companyId, commandId, requestKey },
      });
      if (previousCompanyReceipt.kind !== 'NOT_FOUND')
        return rejectedTravelResponse(commandId, snapshot.public_revision, 'INVALID_COMMAND');

      const state = await loadCompanyAggregate(transaction, worldId, companyId);
      if (state === undefined) throw new Error('Owned company snapshot is unavailable');
      const currentPublicRevision = state.economy.lifecycle.knowledge.revision;
      if (input.expectedPublicRevision !== currentPublicRevision)
        return rejectedTravelResponse(commandId, currentPublicRevision, 'STALE_REVISION');
      const activeRoute = await readPartyRouteForCompany(transaction, worldId, companyId, true);
      const party = selectParty(state, activeRoute);
      if (party === undefined)
        return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_ROUTE');
      const partyState = state.economy.lifecycle.parties.find(
        (entry) => entry.partyId === party.partyId,
      );
      if (!partyState)
        return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_ROUTE');
      const routeRow =
        activeRoute ?? (await readPartyRoute(transaction, worldId, companyId, party.partyId, true));
      const currentRouteEpoch = routeRow?.route_epoch ?? '0';
      if (input.expectedRouteEpoch !== currentRouteEpoch)
        return rejectedTravelResponse(commandId, currentPublicRevision, 'STALE_ROUTE_EPOCH');

      if (input.action.kind === 'DEPART') {
        if (routeRow !== undefined && !isValidCompletedRouteForDeparture(routeRow, state))
          return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_ROUTE');
        if (partyState.location.kind !== 'AT')
          return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_ROUTE');
        const edge = input.action.edgeIds.length === 1 ? input.action.edgeIds[0] : undefined;
        const purpose = input.action.purpose ?? 'NEW';
        if (
          edge !== SAFE_TRAVEL_ALPHA_V1.edgeId ||
          (purpose === 'NEW' && partyState.location.siteId !== SAFE_TRAVEL_ALPHA_V1.fromSiteId) ||
          (purpose === 'RETURN' && partyState.location.siteId !== SAFE_TRAVEL_ALPHA_V1.toSiteId)
        )
          return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_ROUTE');
        const clock = await readWorldClock(transaction, worldId, now, true);
        if (
          state.economy.lifecycle.campaignTick !== state.economy.finance.processedTick ||
          state.economy.finance.processedTick !== state.economy.physical?.processedTick ||
          BigInt(state.economy.lifecycle.campaignTick) > BigInt(clock.tick)
        )
          return rejectedTravelResponse(commandId, currentPublicRevision, 'UNSUPPORTED_ACTION');
        const travelInput = {
          region: requireRegion(),
          partyId: party.partyId,
          intent: {
            kind: 'ROUTE' as const,
            purpose,
            edgeIds: input.action.edgeIds,
          },
          atTick: campaignTick(clock.tick),
          expectedRouteEpoch: currentRouteEpoch,
          currentRouteEpoch,
          segmentId: randomUUID(),
        };
        const commandPreparation = await prepareTravelAdvanceCommand({
          transaction,
          accountId,
          state,
          worldId,
          companyId,
          commandId: input.commandId,
          requestKey,
          expectedPublicRevision: input.expectedPublicRevision,
          toTick: clock.tick,
          trustedTransitSegments: [],
        });
        if (commandPreparation.kind === 'REJECTED')
          return rejectedTravelResponse(
            commandId,
            commandPreparation.response.publicRevision,
            travelCommandError(commandPreparation.response.code),
          );
        if (commandPreparation.kind !== 'PREPARED')
          return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_COMMAND');
        let departed;
        try {
          departed = preparePartyTravelDeparture({
            root: materializedRoot(commandPreparation.prepared.nextState),
            ...travelInput,
          });
        } catch (error) {
          return rejectedTravelResponse(commandId, currentPublicRevision, travelErrorCode(error));
        }
        const nextState = withTravelRoot(commandPreparation.prepared.nextState, departed.root);
        const response = responseFor(
          nextState,
          {
            ...routeRow,
            party_id: party.partyId,
            route_epoch: departed.route.routeEpoch,
            segment_id: departed.route.segment.segmentId,
            profile_id: departed.route.travelProfileId,
            region_version: departed.route.regionVersion,
            status: 'IN_TRANSIT',
            accepted_route: departed.route,
          },
          clock,
          input.commandId,
        );
        const canonicalResponse = canonicalTravelResponse(response);
        const routeEventAudit = routeEvent(
          nextState,
          'WorldTravelDeparted',
          input.commandId,
          departed.route,
        );
        const travelEffect = { kind: 'DEPARTURE' as const, input: travelInput };
        await persistPreparedTrustedCompanyCommand({
          transaction,
          prepared: commandPreparation.prepared,
          finalState: nextState,
          travelEffect,
          additionalAuditEvents: [routeEventAudit],
        });
        await persistWorldTravel({
          transaction,
          worldId,
          companyId,
          accountId,
          commandId: input.commandId,
          requestKey,
          response: canonicalResponse.response,
          route: {
            partyId: party.partyId,
            routeEpoch: departed.route.routeEpoch,
            segmentId: departed.route.segment.segmentId,
            profileId: departed.route.travelProfileId,
            regionVersion: departed.route.regionVersion,
            status: 'IN_TRANSIT',
            acceptedRoute: departed.route as unknown as Readonly<Record<string, unknown>>,
          },
          routeAction: 'DEPART',
        });
        return {
          kind: 'COMMITTED',
          body: canonicalResponse.body,
        } satisfies CommittedWorldTravelResponse;
      }

      const clock = await readWorldClock(transaction, worldId, now, true);
      if (!routeRow || routeRow.status !== 'IN_TRANSIT' || activeRoute === undefined)
        return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_ARRIVAL');
      let acceptedRoute: PreparedPartyRoute;
      try {
        acceptedRoute = readAcceptedRoute(routeRow, state);
      } catch {
        return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_ROUTE');
      }
      if (BigInt(clock.tick) < BigInt(acceptedRoute.segment.arrivalNotBefore))
        return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_ARRIVAL');
      const segment = trustedTransitSegment(materializedRoot(state), acceptedRoute);
      const dueTick = campaignTick(acceptedRoute.segment.arrivalNotBefore);
      const commandPreparation = await prepareTravelAdvanceCommand({
        transaction,
        accountId,
        state,
        worldId,
        companyId,
        commandId: input.commandId,
        requestKey,
        expectedPublicRevision: input.expectedPublicRevision,
        toTick: dueTick,
        trustedTransitSegments: [segment],
      });
      if (commandPreparation.kind === 'REJECTED')
        return rejectedTravelResponse(
          commandId,
          commandPreparation.response.publicRevision,
          travelCommandError(commandPreparation.response.code),
        );
      if (commandPreparation.kind !== 'PREPARED')
        return rejectedTravelResponse(commandId, currentPublicRevision, 'INVALID_COMMAND');
      const acceptedRegion = requireRegion(acceptedRoute.regionVersion);
      const travelInput = {
        region: acceptedRegion,
        candidate: {
          worldId,
          partyId: routeRow.party_id,
          segmentId: routeRow.segment_id,
          regionVersion: acceptedRoute.regionVersion,
          routeEpoch: acceptedRoute.routeEpoch,
          cause: 'ROUTE_ARRIVAL' as const,
          location: {
            kind: 'AT' as const,
            siteId: acceptedRoute.segment.toSiteId,
            areaId: regionAreaId(acceptedRoute.segment.toSiteId, acceptedRegion),
          },
          notBefore: dueTick,
        },
        acceptedRoute,
        currentRouteEpoch,
        trustedNow: campaignTick(clock.tick),
      };
      let arrived;
      try {
        arrived = preparePartyTravelArrival({
          root: materializedRoot(commandPreparation.prepared.nextState),
          ...travelInput,
        });
      } catch (error) {
        return rejectedTravelResponse(commandId, currentPublicRevision, travelErrorCode(error));
      }
      const nextState = withTravelRoot(commandPreparation.prepared.nextState, arrived.root);
      const response = responseFor(
        nextState,
        { ...routeRow, status: 'ARRIVED' },
        clock,
        input.commandId,
      );
      const canonicalResponse = canonicalTravelResponse(response);
      const routeEventAudit = routeEvent(
        nextState,
        'WorldTravelArrived',
        input.commandId,
        acceptedRoute,
      );
      const travelEffect = { kind: 'ARRIVAL' as const, input: travelInput };
      await persistPreparedTrustedCompanyCommand({
        transaction,
        prepared: commandPreparation.prepared,
        finalState: nextState,
        travelEffect,
        additionalAuditEvents: [routeEventAudit],
      });
      await persistWorldTravel({
        transaction,
        worldId,
        companyId,
        accountId,
        commandId: input.commandId,
        requestKey,
        response: canonicalResponse.response,
        route: {
          partyId: routeRow.party_id,
          routeEpoch: routeRow.route_epoch,
          segmentId: routeRow.segment_id,
          profileId: routeRow.profile_id,
          regionVersion: routeRow.region_version,
          status: 'ARRIVED',
          acceptedRoute: acceptedRoute as unknown as Readonly<Record<string, unknown>>,
        },
        routeAction: 'ARRIVE',
      });
      return {
        kind: 'COMMITTED',
        body: canonicalResponse.body,
      } satisfies CommittedWorldTravelResponse;
    });
    if (result.kind === 'COMMITTED')
      return reply.code(200).type('application/json; charset=utf-8').send(result.body);
    return reply.code(result.statusCode).send(result.body);
  });
}

function parseTravelRequest(value: unknown): WorldTravelRequestDto | undefined {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value).sort();
  if (
    canonicalJson(keys) !==
    canonicalJson([
      'action',
      'commandId',
      'expectedPublicRevision',
      'expectedRouteEpoch',
      'schemaVersion',
    ])
  )
    return undefined;
  if (
    value['schemaVersion'] !== 1 ||
    !isEntityId(value['commandId']) ||
    !isExactInteger(value['expectedPublicRevision']) ||
    !isExactInteger(value['expectedRouteEpoch']) ||
    !isRecord(value['action'])
  )
    return undefined;
  const action = value['action'];
  if (action['kind'] === 'ARRIVE' && Object.keys(action).length === 1)
    return value as unknown as WorldTravelRequestDto;
  if (
    action['kind'] === 'DEPART' &&
    (Object.keys(action).length === 2 ||
      (Object.keys(action).length === 3 &&
        (action['purpose'] === 'NEW' || action['purpose'] === 'RETURN'))) &&
    Array.isArray(action['edgeIds']) &&
    action['edgeIds'].length >= 1 &&
    action['edgeIds'].length <= 16 &&
    action['edgeIds'].every(isEntityId)
  )
    return value as unknown as WorldTravelRequestDto;
  return undefined;
}

function parseV2TravelRequest(value: unknown): WorldTravelV2RequestDto | undefined {
  if (!isRecord(value)) return undefined;
  if (
    canonicalJson(Object.keys(value).sort()) !==
      canonicalJson([
        'commandId',
        'edgeIds',
        'expectedPublicRevision',
        'expectedRouteEpoch',
        'purpose',
        'schemaVersion',
      ]) ||
    value['schemaVersion'] !== 2 ||
    !isEntityId(value['commandId']) ||
    !isExactInteger(value['expectedPublicRevision']) ||
    !isExactInteger(value['expectedRouteEpoch']) ||
    (value['purpose'] !== 'NEW' && value['purpose'] !== 'RETURN') ||
    !Array.isArray(value['edgeIds']) ||
    value['edgeIds'].length < 1 ||
    value['edgeIds'].length > 16 ||
    !value['edgeIds'].every(isEntityId)
  )
    return undefined;
  return value as unknown as WorldTravelV2RequestDto;
}

function rejectV2(
  commandId: string | null,
  revision: string,
  code: WorldTravelRejectionDto['code'],
) {
  return { schemaVersion: 2, commandId, ok: false, publicRevision: revision, code } as const;
}

async function executeV2TravelDeparture(input: {
  readonly database: CompanyRoutesOptions['database'];
  readonly worldId: string;
  readonly accountId: string;
  readonly expectedCompanyId: string | undefined;
  readonly input: WorldTravelV2RequestDto;
  readonly requestKey: string;
  readonly now: Date;
}): Promise<CommittedWorldTravelResponse | RejectedWorldTravelResponse> {
  if (!input.expectedCompanyId)
    return {
      kind: 'REJECTED',
      statusCode: 400,
      body: rejectV2(input.input.commandId, EMPTY_REVISION, 'INVALID_COMMAND'),
    };
  return input.database.transaction().execute(async (transaction) => {
    const account = await transaction
      .selectFrom('identity_accounts')
      .select('id')
      .where('id', '=', input.accountId)
      .forUpdate()
      .executeTakeFirst();
    if (!account)
      return { kind: 'REJECTED', statusCode: 401, body: { error: 'authentication required' } };
    const companyId = await findOwnedCompanyId(transaction, input.worldId, input.accountId);
    if (!companyId || companyId !== input.expectedCompanyId)
      return {
        kind: 'REJECTED',
        statusCode: 403,
        body: rejectV2(input.input.commandId, EMPTY_REVISION, 'NOT_AUTHORIZED'),
      };
    const snapshot = await transaction
      .selectFrom('company_snapshots')
      .select(['canonical_revision', 'public_revision'])
      .where('world_id', '=', input.worldId)
      .where('company_id', '=', companyId)
      .forUpdate()
      .executeTakeFirst();
    if (!snapshot) throw new Error('Owned company snapshot is unavailable');
    // Exact transport replay precedes mutable aggregate and route-shape checks.
    const previousReceipt = await readWorldRouteReceipt(
      transaction,
      input.worldId,
      companyId,
      input.input.commandId,
    );
    if (previousReceipt) {
      if (previousReceipt.account_id !== input.accountId)
        return v2Rejected(input.input.commandId, snapshot.public_revision, 'NOT_AUTHORIZED');
      if (previousReceipt.request_key !== input.requestKey)
        return v2Rejected(input.input.commandId, snapshot.public_revision, 'INVALID_COMMAND');
      const replay = readStoredV2Response(previousReceipt.response, input.input.commandId);
      return { kind: 'COMMITTED', body: canonicalJson(replay) };
    }
    const previousCompanyReceipt = await lookupTrustedCompanyCommandReceipt({
      transaction,
      accountId: input.accountId,
      identity: {
        kind: 'WORLD_REQUEST',
        worldId: input.worldId,
        companyId,
        commandId: input.input.commandId,
        requestKey: input.requestKey,
      },
    });
    if (previousCompanyReceipt.kind !== 'NOT_FOUND')
      return v2Rejected(input.input.commandId, snapshot.public_revision, 'INVALID_COMMAND');

    const state = await loadCompanyAggregate(transaction, input.worldId, companyId);
    if (!state) throw new Error('Owned company snapshot is unavailable');
    if (state.economy.lifecycle.parties.length !== 1)
      return v2Rejected(
        input.input.commandId,
        state.economy.lifecycle.knowledge.revision,
        'INVALID_ROUTE',
      );
    const partyState = state.economy.lifecycle.parties[0]!;
    const routeRow = await readPartyRoute(
      transaction,
      input.worldId,
      companyId,
      partyState.partyId,
      true,
    );

    const lifecycle = state.economy.lifecycle;
    const currentRevision = lifecycle.knowledge.revision;
    if (input.input.expectedPublicRevision !== currentRevision)
      return v2Rejected(input.input.commandId, currentRevision, 'STALE_REVISION');
    const currentEpoch = routeRow?.route_epoch ?? '0';
    if (input.input.expectedRouteEpoch !== currentEpoch)
      return v2Rejected(input.input.commandId, currentRevision, 'STALE_ROUTE_EPOCH');
    if (partyState.location.kind !== 'AT' || routeRow?.status === 'IN_TRANSIT')
      return v2Rejected(input.input.commandId, currentRevision, 'INVALID_ROUTE');
    if (routeRow && !isValidCompletedRouteForDeparture(routeRow, state))
      return v2Rejected(input.input.commandId, currentRevision, 'INVALID_ROUTE');
    const clock = await readWorldClock(transaction, input.worldId, input.now, true);
    if (
      lifecycle.campaignTick !== state.economy.finance.processedTick ||
      state.economy.finance.processedTick !== state.economy.physical?.processedTick ||
      BigInt(lifecycle.campaignTick) > BigInt(clock.tick)
    )
      return v2Rejected(input.input.commandId, currentRevision, 'UNSUPPORTED_ACTION');
    const commandPreparation = await prepareTravelAdvanceCommand({
      transaction,
      accountId: input.accountId,
      state,
      worldId: input.worldId,
      companyId,
      commandId: input.input.commandId,
      requestKey: input.requestKey,
      expectedPublicRevision: input.input.expectedPublicRevision,
      toTick: clock.tick,
      trustedTransitSegments: [],
      travelMode: 'EXECUTION_DEPARTURE',
      travelFoodRouteBoundary: {
        kind: 'DEPARTURE',
        partyId: partyState.partyId,
        location: partyState.location,
        settledThroughTick: clock.tick,
      },
    });
    if (commandPreparation.kind === 'REJECTED')
      return v2Rejected(
        input.input.commandId,
        commandPreparation.response.publicRevision,
        travelCommandError(commandPreparation.response.code),
      );
    if (commandPreparation.kind !== 'PREPARED')
      return v2Rejected(input.input.commandId, currentRevision, 'INVALID_COMMAND');
    const region = requireRegion();
    const routeEdges = input.input.edgeIds.map((edgeId) =>
      region.edges.filter((edge) => edge.edgeId === edgeId),
    );
    if (routeEdges.some((matches) => matches.length !== 1))
      return v2Rejected(input.input.commandId, currentRevision, 'INVALID_ROUTE');
    const edges = routeEdges.map((matches) => matches[0]!);
    const isDangerous = edges.some((edge) => edge.danger === 'DANGEROUS');
    const membership = isDangerous
      ? await readFirstHuntRouteMembership(transaction, input.worldId, companyId)
      : undefined;
    if (isDangerous && !membership)
      return v2Rejected(input.input.commandId, currentRevision, 'INVALID_ROUTE');
    const travelInput = {
      region,
      partyId: partyState.partyId,
      routeExecutionId: randomUUID(),
      intent: {
        kind: 'ROUTE' as const,
        purpose: input.input.purpose,
        edgeIds: input.input.edgeIds,
      },
      atTick: campaignTick(clock.tick),
      expectedRouteEpoch: currentEpoch,
      currentRouteEpoch: currentEpoch,
      segmentId: randomUUID(),
      ...(membership
        ? {
            dangerousAuthorization: {
              instanceId: FIRST_HUNT_INSTANCE_ID,
              profileId: FIRST_HUNT_PROFILE_ID,
              termsDigest: membership.termsDigest,
              purpose: input.input.purpose,
              worldId: input.worldId,
              companyId,
              partyId: partyState.partyId,
              canonicalRevision: commandPreparation.prepared.nextState.economy.lifecycle.revision,
              atTick: campaignTick(clock.tick),
              edgeIds: input.input.edgeIds,
            },
          }
        : {}),
      ...(input.input.purpose === 'NEW' && isDangerous
        ? {
            supplyAssessment: makeRouteSupplyAssessment({
              state: commandPreparation.prepared.nextState,
              partyId: partyState.partyId,
              atTick: clock.tick,
              edgeIds: input.input.edgeIds,
              edges,
            }),
          }
        : {}),
    };
    let departed;
    try {
      departed = preparePartyRouteExecutionDeparture({
        root: materializedRoot(commandPreparation.prepared.nextState),
        ...travelInput,
      });
    } catch (error) {
      return v2Rejected(input.input.commandId, currentRevision, travelErrorCode(error));
    }
    const nextState = withTravelRoot(commandPreparation.prepared.nextState, departed.root);
    const response = canonicalV2Response(
      v2ResponseFor(nextState, departed.execution, clock, input.input.commandId),
    );
    await persistPreparedTrustedCompanyCommand({
      transaction,
      prepared: commandPreparation.prepared,
      finalState: nextState,
      travelEffect: { kind: 'EXECUTION_DEPARTURE', input: travelInput },
      additionalAuditEvents: [
        routeEvent(nextState, 'WorldRouteExecutionAccepted', input.input.commandId, departed.route),
      ],
    });
    await persistWorldTravel({
      transaction,
      worldId: input.worldId,
      companyId,
      accountId: input.accountId,
      commandId: input.input.commandId,
      requestKey: input.requestKey,
      response: response.response,
      route: {
        partyId: partyState.partyId,
        routeEpoch: departed.execution.routeEpoch,
        segmentId: departed.execution.segment!.segmentId,
        profileId: departed.execution.profileId,
        regionVersion: departed.execution.regionVersion,
        status: 'IN_TRANSIT',
        acceptedRoute: storeRouteExecution(
          input.accountId,
          departed.execution,
        ) as unknown as Readonly<Record<string, unknown>>,
      },
      routeAction: 'DEPART',
    });
    return { kind: 'COMMITTED', body: response.body };
  });
}

function v2Rejected(
  commandId: string | null,
  revision: string,
  code: WorldTravelRejectionDto['code'],
): RejectedWorldTravelResponse {
  const statusCode = code === 'NOT_AUTHORIZED' ? 403 : code === 'INVALID_COMMAND' ? 400 : 409;
  return { kind: 'REJECTED', statusCode, body: rejectV2(commandId, revision, code) };
}

export async function processWorldRouteCandidate(
  database: CompanyRoutesOptions['database'],
  worldId: string,
  candidate: {
    readonly companyId: string;
    readonly partyId: string;
    readonly acceptedByAccountId: string;
  },
  now = new Date(),
): Promise<void> {
  await database.transaction().execute(async (transaction) => {
    const account = await transaction
      .selectFrom('identity_accounts')
      .select('id')
      .where('id', '=', candidate.acceptedByAccountId)
      .forUpdate()
      .executeTakeFirst();
    if (
      !account ||
      (await findOwnedCompanyId(transaction, worldId, account.id)) !== candidate.companyId
    )
      return;
    const snapshot = await transaction
      .selectFrom('company_snapshots')
      .select(['canonical_revision', 'public_revision'])
      .where('world_id', '=', worldId)
      .where('company_id', '=', candidate.companyId)
      .forUpdate()
      .executeTakeFirst();
    if (!snapshot) return;
    const state = await loadCompanyAggregate(transaction, worldId, candidate.companyId);
    if (!state) return;
    const routeRow = await readPartyRoute(
      transaction,
      worldId,
      candidate.companyId,
      candidate.partyId,
      true,
    );
    if (!routeRow) return;
    let envelope;
    try {
      envelope = readRouteExecutionEnvelope(routeRow.accepted_route);
    } catch {
      return;
    }
    try {
      assertStoredExecutionMatchesCompany(routeRow, envelope.execution, state);
    } catch {
      return;
    }
    if (envelope.acceptedByAccountId !== account.id) return;
    const execution = envelope.execution;
    const expectedCommandId =
      execution.phase === 'IN_TRANSIT'
        ? routeArrivalCommandId(execution)
        : execution.phase === 'AT_BOUNDARY'
          ? routeContinuationCommandId(execution)
          : undefined;
    if (!expectedCommandId) return;
    const commandKind = execution.phase === 'IN_TRANSIT' ? 'ROUTE_ARRIVAL' : 'ROUTE_CONTINUATION';
    const requestBody = {
      schemaVersion: 2,
      kind: commandKind,
      principal: { kind: 'SYSTEM', id: 'world-travel' },
      routeExecutionId: execution.routeExecutionId,
      routeEpoch: execution.routeEpoch,
      regionVersion: execution.regionVersion,
      nextEdgeIndex: execution.nextEdgeIndex,
      ...(execution.segment
        ? { segmentId: execution.segment.segmentId, dueTick: execution.segment.dueTick }
        : {}),
    };
    const requestKey = canonicalJson(requestBody);
    const previousReceipt = await readWorldRouteReceipt(
      transaction,
      worldId,
      candidate.companyId,
      expectedCommandId,
    );
    if (previousReceipt) {
      if (previousReceipt.account_id !== account.id || previousReceipt.request_key !== requestKey)
        return;
      try {
        readStoredV2Response(previousReceipt.response, expectedCommandId);
      } catch {
        return;
      }
      return;
    }
    const previousCompanyReceipt = await lookupTrustedCompanyCommandReceipt({
      transaction,
      accountId: account.id,
      identity: {
        kind: 'WORLD_REQUEST',
        worldId,
        companyId: candidate.companyId,
        commandId: expectedCommandId,
        requestKey,
      },
    });
    if (previousCompanyReceipt.kind !== 'NOT_FOUND') return;
    const clock = await readWorldClock(transaction, worldId, now, true);
    const lifecycle = state.economy.lifecycle;
    if (
      lifecycle.campaignTick !== state.economy.finance.processedTick ||
      state.economy.finance.processedTick !== state.economy.physical?.processedTick ||
      BigInt(lifecycle.campaignTick) > BigInt(clock.tick)
    )
      return;

    if (execution.phase === 'IN_TRANSIT') {
      if (
        !execution.segment ||
        routeRow.status !== 'IN_TRANSIT' ||
        BigInt(clock.tick) < BigInt(execution.segment.dueTick)
      )
        return;
      const acceptedRegion = requireRegion(execution.regionVersion);
      const acceptedRoute = preparedRouteForExecution(execution, acceptedRegion);
      const segment = trustedTransitSegment(materializedRoot(state), acceptedRoute);
      const prepared = await prepareTravelAdvanceCommand({
        transaction,
        accountId: account.id,
        state,
        worldId,
        companyId: candidate.companyId,
        commandId: expectedCommandId,
        requestKey,
        expectedPublicRevision: lifecycle.knowledge.revision,
        toTick: execution.segment.dueTick,
        trustedTransitSegments: [segment],
        travelMode: 'EXECUTION_ARRIVAL',
        travelFoodRouteBoundary: {
          kind: 'EXECUTION',
          execution,
          settledThroughTick: execution.segment.dueTick,
        },
      });
      if (prepared.kind !== 'PREPARED') return;
      const arrivalInput = {
        region: acceptedRegion,
        execution,
        expected: execution as PartyRouteExecutionArrivalGuard,
        candidate: {
          worldId,
          partyId: execution.partyId,
          segmentId: execution.segment.segmentId,
          regionVersion: execution.regionVersion as typeof WORLD_REGION_VERSION,
          routeEpoch: execution.routeEpoch,
          cause: 'ROUTE_ARRIVAL' as const,
          location: {
            kind: 'AT' as const,
            siteId: execution.segment.toSiteId,
            areaId: regionAreaId(execution.segment.toSiteId, acceptedRegion),
          },
          notBefore: campaignTick(execution.segment.dueTick),
        },
        currentRouteEpoch: routeRow.route_epoch,
        trustedNow: campaignTick(clock.tick),
      };
      let arrived;
      try {
        arrived = preparePartyRouteExecutionArrival({
          root: materializedRoot(prepared.prepared.nextState),
          ...arrivalInput,
        });
      } catch {
        return;
      }
      const nextState = withTravelRoot(prepared.prepared.nextState, arrived.root);
      const response = canonicalV2Response(
        v2ResponseFor(nextState, arrived.execution, clock, expectedCommandId),
      );
      await persistPreparedTrustedCompanyCommand({
        transaction,
        prepared: prepared.prepared,
        finalState: nextState,
        travelEffect: { kind: 'EXECUTION_ARRIVAL', input: arrivalInput },
        additionalAuditEvents: [
          routeEvent(nextState, 'WorldRouteExecutionArrived', expectedCommandId, acceptedRoute),
        ],
      });
      await persistWorldTravel({
        transaction,
        worldId,
        companyId: candidate.companyId,
        accountId: account.id,
        commandId: expectedCommandId,
        requestKey,
        response: response.response,
        route: {
          partyId: candidate.partyId,
          routeEpoch: routeRow.route_epoch,
          segmentId: routeRow.segment_id,
          profileId: routeRow.profile_id,
          regionVersion: routeRow.region_version,
          status: 'ARRIVED',
          acceptedRoute: storeRouteExecution(account.id, arrived.execution) as unknown as Readonly<
            Record<string, unknown>
          >,
        },
        routeAction: 'ARRIVE',
      });
      return;
    }

    if (
      execution.phase !== 'AT_BOUNDARY' ||
      routeRow.status !== 'ARRIVED' ||
      execution.nextEdgeIndex >= execution.edgeIds.length
    )
      return;
    const acceptedRegion = requireRegion(execution.regionVersion);
    const prepared = await prepareTravelAdvanceCommand({
      transaction,
      accountId: account.id,
      state,
      worldId,
      companyId: candidate.companyId,
      commandId: expectedCommandId,
      requestKey,
      expectedPublicRevision: lifecycle.knowledge.revision,
      toTick: clock.tick,
      trustedTransitSegments: [],
      travelMode: 'EXECUTION_CONTINUATION',
      travelFoodRouteBoundary: { kind: 'EXECUTION', execution, settledThroughTick: clock.tick },
    });
    if (prepared.kind !== 'PREPARED') return;
    const continuationInput = {
      region: acceptedRegion,
      execution,
      expected: {
        routeExecutionId: execution.routeExecutionId,
        regionVersion: execution.regionVersion,
        routeEpoch: execution.routeEpoch,
        nextEdgeIndex: execution.nextEdgeIndex,
        currentSiteId: execution.currentSiteId,
        edgeIds: execution.edgeIds,
      } as PartyRouteExecutionContinuationGuard,
      currentRouteEpoch: routeRow.route_epoch,
      atTick: campaignTick(clock.tick),
      segmentId: randomUUID(),
    };
    let continued;
    try {
      continued = continuePartyRouteExecution({
        root: materializedRoot(prepared.prepared.nextState),
        ...continuationInput,
      });
    } catch {
      return;
    }
    const nextState = withTravelRoot(prepared.prepared.nextState, continued.root);
    const response = canonicalV2Response(
      v2ResponseFor(nextState, continued.execution, clock, expectedCommandId),
    );
    await persistPreparedTrustedCompanyCommand({
      transaction,
      prepared: prepared.prepared,
      finalState: nextState,
      travelEffect: { kind: 'EXECUTION_CONTINUATION', input: continuationInput },
      additionalAuditEvents: [
        routeEvent(nextState, 'WorldRouteExecutionContinued', expectedCommandId, continued.route),
      ],
    });
    await persistWorldTravel({
      transaction,
      worldId,
      companyId: candidate.companyId,
      accountId: account.id,
      commandId: expectedCommandId,
      requestKey,
      response: response.response,
      route: {
        partyId: candidate.partyId,
        routeEpoch: continued.execution.routeEpoch,
        segmentId: continued.execution.segment!.segmentId,
        profileId: continued.execution.profileId,
        regionVersion: continued.execution.regionVersion,
        status: 'IN_TRANSIT',
        acceptedRoute: storeRouteExecution(account.id, continued.execution) as unknown as Readonly<
          Record<string, unknown>
        >,
      },
      routeAction: 'DEPART',
    });
  });
}

function readCommandId(value: unknown): string | null {
  if (!isRecord(value) || !isEntityId(value['commandId'])) return null;
  return value['commandId'];
}

function readExpectedCompanyId(rawHeaders: readonly string[]): string | undefined {
  const values: string[] = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() === WORLD_EXPECTED_COMPANY_ID_HEADER)
      values.push(rawHeaders[index + 1] ?? '');
  }
  return values.length === 1 && isEntityId(values[0]) ? values[0] : undefined;
}

function hasExpectedCompanyIdHeader(rawHeaders: readonly string[]): boolean {
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() === WORLD_EXPECTED_COMPANY_ID_HEADER) return true;
  }
  return false;
}

function selectParty(
  state: CompanyCombatAggregateState,
  route: StoredPartyRoute | undefined,
): { readonly partyId: string } | undefined {
  if (route)
    return state.economy.lifecycle.parties.some((party) => party.partyId === route.party_id)
      ? { partyId: route.party_id }
      : undefined;
  if (state.economy.lifecycle.parties.length !== 1) return undefined;
  const party = state.economy.lifecycle.parties[0];
  return party ? { partyId: party.partyId } : undefined;
}

function projectWorldParty(
  state: CompanyCombatAggregateState,
  routeRow: StoredPartyRoute | undefined,
  clock: Awaited<ReturnType<typeof readWorldClock>>,
  contractMembership?: { readonly termsDigest: string },
  offerState?: CompanyCombatAggregateState,
): WorldPartyReadResponseDto {
  if (routeRow) {
    try {
      if (isStoredV2Route(routeRow.accepted_route)) {
        const execution = readRouteExecutionEnvelope(routeRow.accepted_route).execution;
        assertStoredExecutionMatchesCompany(routeRow, execution, state);
        if (execution.phase === 'COMPLETE') {
          if (routeRow.status !== 'ARRIVED') throw new TypeError();
        } else {
          return projectV2WorldParty(state, execution, clock);
        }
      } else {
        readAcceptedRoute(
          routeRow,
          state,
          routeRow.status === 'ARRIVED' ? 'ARRIVED' : 'IN_TRANSIT',
        );
      }
    } catch {
      throw new InvalidStoredWorldRouteError();
    }
  }
  const response = responseFor(state, routeRow, clock, '', contractMembership, offerState ?? null);
  return {
    schemaVersion: response.schemaVersion,
    worldTick: response.worldTick,
    publicRevision: response.publicRevision,
    party: response.party,
    availableDepartures: response.availableDepartures ?? [],
    route: response.route,
  };
}

function projectV2WorldParty(
  state: CompanyCombatAggregateState,
  execution: PartyRouteExecution,
  clock: Awaited<ReturnType<typeof readWorldClock>>,
): WorldPartyReadResponseV2Dto {
  const response = v2ResponseFor(state, execution, clock, '');
  return {
    schemaVersion: response.schemaVersion,
    worldTick: response.worldTick,
    publicRevision: response.publicRevision,
    party: response.party,
    availableDepartures: [],
    execution: response.execution,
  };
}

function responseFor(
  state: CompanyCombatAggregateState,
  routeRow: StoredPartyRoute | undefined,
  clock: Awaited<ReturnType<typeof readWorldClock>>,
  commandId = '',
  contractMembership?: { readonly termsDigest: string },
  offerState: CompanyCombatAggregateState | null = state,
): WorldTravelResponseDto {
  let activeRoute: PreparedPartyRoute | undefined;
  let activeExecution: PartyRouteExecution | undefined;
  if (routeRow?.status === 'IN_TRANSIT') {
    try {
      activeExecution = readRouteExecutionEnvelope(routeRow.accepted_route).execution;
      assertStoredExecutionMatchesCompany(routeRow, activeExecution, state);
      if (activeExecution.phase !== 'IN_TRANSIT' || !activeExecution.segment)
        throw new TypeError('Stored active execution has no segment');
    } catch {
      activeExecution = undefined;
      activeRoute = readAcceptedRoute(routeRow, state);
    }
  }
  const activePartyId =
    (activeRoute || activeExecution) && routeRow ? routeRow.party_id : undefined;
  const party = activeRoute
    ? state.economy.lifecycle.parties.find((entry) => entry.partyId === activePartyId)
    : state.economy.lifecycle.parties.length === 1
      ? state.economy.lifecycle.parties[0]
      : undefined;
  const memberIds = party
    ? state.economy.lifecycle.characters
        .filter((character) => character.presence.fieldPartyId === party.partyId)
        .map((character) => character.identity.characterId)
        .sort()
    : [];
  const availableDepartures =
    offerState &&
    party?.location.kind === 'AT' &&
    routeRow?.status !== 'IN_TRANSIT' &&
    !activeRoute &&
    !activeExecution
      ? listAvailableDepartures(
          offerState,
          party.partyId,
          party.location.siteId,
          routeRow,
          clock.tick,
          contractMembership,
        )
      : [];
  return {
    schemaVersion: 1,
    commandId,
    worldTick: clock.tick,
    publicRevision: state.economy.lifecycle.knowledge.revision,
    party: party
      ? {
          partyId: party.partyId,
          location: party.location.kind === 'AT' ? party.location.siteId : party.location.from,
          memberIds,
          routeEpoch: routeRow?.party_id === party.partyId ? routeRow.route_epoch : '0',
        }
      : null,
    availableDepartures,
    route:
      activeExecution && routeRow
        ? {
            routeEpoch: activeExecution.routeEpoch,
            segmentId: activeExecution.segment!.segmentId,
            edgeIds: [...activeExecution.edgeIds],
            regionVersion: activeExecution.regionVersion,
            profileId: activeExecution.profileId,
            startedAt: activeExecution.segment!.startedAt,
            dueTick: activeExecution.segment!.dueTick,
            remainingTicks:
              BigInt(activeExecution.segment!.dueTick) > BigInt(clock.tick)
                ? (BigInt(activeExecution.segment!.dueTick) - BigInt(clock.tick)).toString()
                : '0',
            canArrive: BigInt(clock.tick) >= BigInt(activeExecution.segment!.dueTick),
          }
        : activeRoute
          ? {
              routeEpoch: activeRoute.routeEpoch,
              segmentId: activeRoute.segment.segmentId,
              edgeIds: activeRoute.route.map((edge) => edge.edgeId),
              regionVersion: activeRoute.regionVersion,
              profileId: activeRoute.travelProfileId,
              startedAt: activeRoute.segment.startedAt,
              dueTick: activeRoute.segment.arrivalNotBefore,
              remainingTicks:
                BigInt(activeRoute.segment.arrivalNotBefore) > BigInt(clock.tick)
                  ? (BigInt(activeRoute.segment.arrivalNotBefore) - BigInt(clock.tick)).toString()
                  : '0',
              canArrive: BigInt(clock.tick) >= BigInt(activeRoute.segment.arrivalNotBefore),
            }
          : null,
  };
}

function listAvailableDepartures(
  offerState: CompanyCombatAggregateState,
  partyId: string,
  fromSiteId: string,
  routeRow: StoredPartyRoute | undefined,
  clockTick: string,
  contractMembership?: { readonly termsDigest: string },
): readonly WorldAvailableDepartureDto[] {
  const root = materializedRoot(offerState);
  const atTick = root.lifecycle.campaignTick;
  if (clockTick !== atTick) return [];
  if (root.finance.processedTick !== atTick || root.physical.processedTick !== atTick) return [];

  const region = requireRegion();
  const currentRouteEpoch = routeRow?.route_epoch ?? '0';
  const candidates = enumerateSimpleWorldRouteCandidates(region, fromSiteId);
  const departures: WorldAvailableDepartureDto[] = [];
  for (const candidate of candidates) {
    for (const purpose of ['NEW', 'RETURN'] as const) {
      let dangerous = false;
      try {
        const edges = candidate.edgeIds.map((edgeId) =>
          region.edges.filter((edge) => edge.edgeId === edgeId),
        );
        if (edges.some((matches) => matches.length !== 1)) continue;
        const routeEdges = edges.map((matches) => matches[0]!);
        dangerous = routeEdges.some((edge) => edge.danger === 'DANGEROUS');
        const departure = prepareOfferRouteDeparture({
          state: offerState,
          partyId,
          edgeIds: candidate.edgeIds,
          edges: routeEdges,
          purpose,
          atTick,
          routeEpoch: currentRouteEpoch,
          ...(contractMembership ? { contractMembership } : {}),
        });
        departures.push({
          purpose,
          edgeIds: departure.execution.edgeIds,
          fromSiteId,
          toSiteId: candidate.toSiteId,
        });
      } catch (error) {
        if (
          purpose === 'NEW' &&
          dangerous &&
          error instanceof RoutePreparationError &&
          error.code === 'KNOWN_DANGEROUS_SUPPLY_SHORTAGE'
        ) {
          // Keep the route visible so the player can inspect the exact shortage and choose to try.
          departures.push({
            purpose,
            edgeIds: [...candidate.edgeIds],
            fromSiteId,
            toSiteId: candidate.toSiteId,
          });
        }
      }
    }
  }
  return departures;
}

function prepareOfferRouteDeparture(input: {
  readonly state: CompanyCombatAggregateState;
  readonly partyId: string;
  readonly edgeIds: readonly string[];
  readonly edges: readonly WorldRegionEdge[];
  readonly purpose: 'NEW' | 'RETURN';
  readonly atTick: string;
  readonly routeEpoch: string;
  readonly contractMembership?: { readonly termsDigest: string };
}) {
  const root = materializedRoot(input.state);
  const dangerous = input.edges.some((edge) => edge.danger === 'DANGEROUS');
  const dangerousAuthorization =
    dangerous && input.contractMembership
      ? {
          instanceId: FIRST_HUNT_INSTANCE_ID,
          profileId: FIRST_HUNT_PROFILE_ID,
          termsDigest: input.contractMembership.termsDigest,
          purpose: input.purpose,
          worldId: root.lifecycle.worldId,
          companyId: root.lifecycle.companyId,
          partyId: input.partyId,
          canonicalRevision: root.lifecycle.revision,
          atTick: campaignTick(input.atTick),
          edgeIds: input.edgeIds,
        }
      : undefined;
  const supplyAssessment =
    dangerous && input.purpose === 'NEW' && dangerousAuthorization
      ? makeRouteSupplyAssessment({
          state: input.state,
          partyId: input.partyId,
          atTick: input.atTick,
          edgeIds: input.edgeIds,
          edges: input.edges,
        })
      : undefined;
  return preparePartyRouteExecutionDeparture({
    root,
    region: requireRegion(),
    partyId: input.partyId,
    routeExecutionId: 'world-offer-route',
    intent: { kind: 'ROUTE', purpose: input.purpose, edgeIds: input.edgeIds },
    atTick: campaignTick(input.atTick),
    expectedRouteEpoch: input.routeEpoch,
    currentRouteEpoch: input.routeEpoch,
    segmentId: 'world-offer-segment',
    ...(dangerousAuthorization ? { dangerousAuthorization } : {}),
    ...(supplyAssessment ? { supplyAssessment } : {}),
  });
}

async function prepareReadOnlyOfferState(input: {
  readonly transaction: Parameters<typeof prepareTrustedCompanyCommand>[0]['transaction'];
  readonly accountId: string;
  readonly state: CompanyCombatAggregateState;
  readonly worldId: string;
  readonly companyId: string;
  readonly partyId: string;
  readonly location: Extract<
    CompanyCombatAggregateState['economy']['lifecycle']['parties'][number]['location'],
    { readonly kind: 'AT' }
  >;
  readonly toTick: string;
}): Promise<CompanyCombatAggregateState | undefined> {
  const { state } = input;
  const { lifecycle, finance, physical } = state.economy;
  if (
    !physical ||
    !isExactInteger(input.toTick) ||
    BigInt(lifecycle.campaignTick) > BigInt(input.toTick)
  )
    return undefined;
  if (
    lifecycle.campaignTick === input.toTick &&
    finance.processedTick === input.toTick &&
    physical.processedTick === input.toTick
  )
    return state;

  const commandId = randomUUID();
  const prepared = await prepareTravelAdvanceCommand({
    transaction: input.transaction,
    accountId: input.accountId,
    state,
    worldId: input.worldId,
    companyId: input.companyId,
    commandId,
    requestKey: canonicalJson({ kind: 'READ_ONLY_OFFER', commandId }),
    expectedPublicRevision: lifecycle.knowledge.revision,
    toTick: input.toTick,
    trustedTransitSegments: [],
    travelMode: 'DEPARTURE',
    travelFoodRouteBoundary: {
      kind: 'DEPARTURE',
      partyId: input.partyId,
      location: input.location,
      settledThroughTick: input.toTick,
    },
  });
  return prepared.kind === 'PREPARED' ? prepared.prepared.nextState : undefined;
}

function isValidCompletedRouteForDeparture(
  routeRow: StoredPartyRoute,
  state: CompanyCombatAggregateState,
): boolean {
  try {
    if (isStoredV2Route(routeRow.accepted_route)) {
      const execution = readRouteExecutionEnvelope(routeRow.accepted_route).execution;
      assertStoredExecutionMatchesCompany(routeRow, execution, state);
      return execution.phase === 'COMPLETE';
    }
    readAcceptedRoute(routeRow, state, 'ARRIVED');
    return true;
  } catch {
    return false;
  }
}

function isStoredV2Route(value: unknown): boolean {
  return isRecord(value) && ('acceptedByAccountId' in value || 'execution' in value);
}

function readAcceptedRoute(
  routeRow: StoredPartyRoute,
  state: CompanyCombatAggregateState,
  position: 'IN_TRANSIT' | 'ARRIVED' = 'IN_TRANSIT',
): PreparedPartyRoute {
  const value = routeRow.accepted_route;
  if (
    !isRecord(value) ||
    !hasExactObjectKeys(value, [
      'kind',
      'worldId',
      'regionVersion',
      'partyId',
      'routeEpoch',
      'travelProfileId',
      'purpose',
      'route',
      'segment',
      'memberMoves',
      'carrierFollow',
      'assumptions',
      'residuals',
    ]) ||
    routeRow.status !== position ||
    !isRecord(value['segment']) ||
    !Array.isArray(value['route']) ||
    !Array.isArray(value['memberMoves']) ||
    !Array.isArray(value['carrierFollow']) ||
    !isStringArray(value['assumptions']) ||
    !isStringArray(value['residuals'])
  )
    throw new TypeError('Stored world route is invalid');
  const regionVersion = value['regionVersion'];
  const region = typeof regionVersion === 'string' ? acceptedWorldRegion(regionVersion) : undefined;
  const purpose = value['purpose'];
  if (
    !region ||
    regionVersion !== routeRow.region_version ||
    value['kind'] !== 'PREPARED_PARTY_ROUTE' ||
    value['worldId'] !== state.economy.lifecycle.worldId ||
    value['partyId'] !== routeRow.party_id ||
    value['routeEpoch'] !== routeRow.route_epoch ||
    value['travelProfileId'] !== routeRow.profile_id ||
    routeRow.profile_id !== SAFE_TRAVEL_ALPHA_V1.profileId ||
    (purpose !== 'NEW' && purpose !== 'RETURN')
  )
    throw new TypeError('Stored world route scope is invalid');
  const edgeIds = value['route'].map((edge) => (isRecord(edge) ? edge['edgeId'] : undefined));
  if (edgeIds.length !== 1 || edgeIds[0] !== SAFE_TRAVEL_ALPHA_V1.edgeId)
    throw new TypeError('Stored world route edge is invalid');
  const edges = region.edges.filter((edge) => edge.edgeId === edgeIds[0]);
  const segment = value['segment'];
  if (
    edges.length !== 1 ||
    segment['segmentId'] !== routeRow.segment_id ||
    !isEntityId(segment['segmentId']) ||
    !isExactInteger(segment['startedAt']) ||
    !isExactInteger(segment['arrivalNotBefore']) ||
    segment['fromSiteId'] !==
      (purpose === 'NEW' ? SAFE_TRAVEL_ALPHA_V1.fromSiteId : SAFE_TRAVEL_ALPHA_V1.toSiteId) ||
    segment['toSiteId'] !==
      (purpose === 'NEW' ? SAFE_TRAVEL_ALPHA_V1.toSiteId : SAFE_TRAVEL_ALPHA_V1.fromSiteId) ||
    BigInt(segment['arrivalNotBefore']) - BigInt(segment['startedAt']) !==
      BigInt(edges[0]!.provisionalTravelTicks)
  )
    throw new TypeError('Stored world route segment is invalid');
  const party = state.economy.lifecycle.parties.find(
    (entry) => entry.partyId === routeRow.party_id,
  );
  const positionMatches =
    position === 'IN_TRANSIT'
      ? party?.location.kind === 'TRANSIT' &&
        party.location.segmentId === routeRow.segment_id &&
        party.location.startedAt === segment['startedAt'] &&
        party.location.arrivalNotBefore === segment['arrivalNotBefore'] &&
        party.location.from === segment['fromSiteId'] &&
        party.location.to === segment['toSiteId']
      : party?.location.kind === 'AT' && party.location.siteId === segment['toSiteId'];
  if (!party || !positionMatches)
    throw new TypeError('Stored route does not match company position');
  return { ...value, route: edges } as unknown as PreparedPartyRoute;
}

function assertStoredExecutionMatchesCompany(
  routeRow: StoredPartyRoute,
  execution: PartyRouteExecution,
  state: CompanyCombatAggregateState,
): void {
  const party = state.economy.lifecycle.parties.find(
    (entry) => entry.partyId === execution.partyId,
  );
  if (
    execution.worldId !== state.economy.lifecycle.worldId ||
    execution.companyId !== state.economy.lifecycle.companyId ||
    execution.partyId !== routeRow.party_id ||
    execution.routeEpoch !== routeRow.route_epoch ||
    execution.profileId !== routeRow.profile_id ||
    execution.regionVersion !== routeRow.region_version ||
    !party ||
    (execution.phase === 'IN_TRANSIT'
      ? routeRow.status !== 'IN_TRANSIT' ||
        !execution.segment ||
        routeRow.segment_id !== execution.segment.segmentId ||
        party.location.kind !== 'TRANSIT' ||
        party.location.segmentId !== execution.segment.segmentId ||
        party.location.from !== execution.segment.fromSiteId ||
        party.location.to !== execution.segment.toSiteId ||
        party.location.startedAt !== execution.segment.startedAt ||
        party.location.arrivalNotBefore !== execution.segment.dueTick
      : routeRow.status !== 'ARRIVED' ||
        execution.segment !== null ||
        party.location.kind !== 'AT' ||
        party.location.siteId !== execution.currentSiteId)
  )
    throw new TypeError('Stored route execution does not match its company root');
}

async function prepareTravelAdvanceCommand(input: {
  readonly transaction: Parameters<typeof prepareTrustedCompanyCommand>[0]['transaction'];
  readonly accountId: string;
  readonly state: CompanyCombatAggregateState;
  readonly worldId: string;
  readonly companyId: string;
  readonly commandId: string;
  readonly requestKey: string;
  readonly expectedPublicRevision: string;
  readonly toTick: string;
  readonly trustedTransitSegments: readonly TrustedTransitSegment[];
  readonly travelMode?: Parameters<typeof prepareTrustedCompanyCommand>[0]['travelMode'];
  readonly travelFoodRouteBoundary?: TravelFoodRouteBoundary;
}) {
  const lifecycle = input.state.economy.lifecycle;
  const sourceEventId = travelAdvanceSourceEventId(input.worldId, input.companyId, input.commandId);
  const command = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: input.commandId,
    sourceEventId,
    worldId: input.worldId,
    companyId: input.companyId,
    actorRef: { kind: 'SYSTEM', id: 'world-travel' },
    expectedRevision: canonicalRevision(lifecycle.revision),
    campaignTick: input.toTick,
    rulesetId: COMPANY_RULESET_ID,
    type: 'AdvanceCampaign',
    payload: { toTick: input.toTick, authoritativeInputs: [] },
  });
  if (!command.ok)
    return {
      kind: 'REJECTED' as const,
      response: {
        commandId: input.commandId,
        ok: false as const,
        publicRevision: lifecycle.knowledge.revision,
        code: 'INVALID_COMMAND' as const,
      },
    };
  const identity = {
    kind: 'WORLD_REQUEST' as const,
    worldId: input.worldId,
    companyId: input.companyId,
    commandId: input.commandId,
    requestKey: input.requestKey,
  };
  return prepareTrustedCompanyCommand({
    transaction: input.transaction,
    accountId: input.accountId,
    lockedPriorState: input.state,
    command: command.command,
    stableRequestKey: stableCompanyRequestKey(identity),
    expectedPublicRevision: input.expectedPublicRevision,
    ...(input.travelMode === undefined ? {} : { travelMode: input.travelMode }),
    ...(input.travelFoodRouteBoundary === undefined
      ? {}
      : { travelFoodRouteBoundary: input.travelFoodRouteBoundary }),
    context: {
      worldId: input.worldId,
      companyId: input.companyId,
      principal: { kind: 'SYSTEM', id: 'world-travel' },
      publicRevision: lifecycle.knowledge.revision,
      canonicalRevision: lifecycle.revision,
      atTick: campaignTick(input.toTick),
      completeGraph: true,
      contactIds: [],
      internalGrant: {
        commandId: input.commandId,
        sourceEventId,
        canonicalRequest: canonicalJson(command.command),
      },
      facts: [],
      financeFacts: [],
      physicalFacts: [],
      practiceFacts: [],
      trustedTransitSegments: input.trustedTransitSegments,
    },
  });
}

function travelCommandError(
  code: CompanyCommandRejectionDto['code'],
): WorldTravelRejectionDto['code'] {
  if (code === 'STALE_REVISION') return 'STALE_REVISION';
  if (code === 'NOT_AUTHORIZED') return 'NOT_AUTHORIZED';
  if (code === 'INSUFFICIENT_ITEMS' || code === 'INSUFFICIENT_STAMINA') return code;
  if (code === 'INVALID_COMMAND') return 'INVALID_COMMAND';
  if (code === 'IDEMPOTENCY_CONFLICT' || code === 'CONTACT_OR_ACCESS_REQUIRED')
    return 'UNSUPPORTED_ACTION';
  return 'UNSUPPORTED_ACTION';
}

function materializedRoot(state: CompanyCombatAggregateState) {
  if (!state.economy.physical) throw new TypeError('Company physical state is unavailable');
  return {
    lifecycle: state.economy.lifecycle,
    finance: state.economy.finance,
    physical: state.economy.physical,
  };
}

function withTravelRoot(
  state: CompanyCombatAggregateState,
  root: ReturnType<typeof preparePartyTravelDeparture>['root'],
): CompanyCombatAggregateState {
  return readCompanyCombatAggregateState({
    ...state,
    economy: { ...state.economy, lifecycle: root.lifecycle, physical: root.physical },
  });
}

function routeEvent(
  state: CompanyCombatAggregateState,
  type: string,
  commandId: string,
  route: PreparedPartyRoute,
): WorldRouteAuditEvent {
  return {
    eventId: randomUUID(),
    revision: state.economy.lifecycle.revision,
    event: {
      type,
      commandId,
      partyId: route.partyId,
      routeEpoch: route.routeEpoch,
      segmentId: route.segment.segmentId,
      edgeIds: route.route.map((edge) => edge.edgeId),
      regionVersion: route.regionVersion,
      profileId: route.travelProfileId,
      startedAt: route.segment.startedAt,
      dueTick: route.segment.arrivalNotBefore,
    },
  };
}

function travelErrorCode(error: unknown): WorldTravelRejectionDto['code'] {
  if (error instanceof RoutePreparationError) {
    if (error.code === 'INVALID_ARRIVAL') return 'INVALID_ARRIVAL';
    if (error.code === 'STALE_ROUTE_EPOCH') return 'STALE_ROUTE_EPOCH';
    if (error.code === 'PARTY_MEMBER_TRAVEL_UNSUPPORTED') return 'UNSUPPORTED_ACTION';
    return 'INVALID_ROUTE';
  }
  if (error instanceof TravelPreparationError && error.code === 'TRAVEL_ROOT_NOT_SETTLED')
    return 'INVALID_COMMAND';
  return 'UNSUPPORTED_ACTION';
}

function requireRegion(version: string = WORLD_REGION_VERSION) {
  const region = acceptedWorldRegion(version);
  if (!region) throw new Error('Accepted world region is unavailable');
  return region;
}

function preparedRouteForExecution(
  execution: PartyRouteExecution,
  region: ReturnType<typeof requireRegion>,
): PreparedPartyRoute {
  if (!execution.segment || execution.profileId !== SAFE_TRAVEL_ALPHA_V1.profileId)
    throw new TypeError('Route execution has no supported active segment');
  const edges = execution.edgeIds.map((edgeId) => {
    const matches = region.edges.filter((edge) => edge.edgeId === edgeId);
    if (matches.length !== 1) throw new TypeError('Stored route edge is unavailable');
    return matches[0]!;
  });
  return {
    kind: 'PREPARED_PARTY_ROUTE',
    worldId: execution.worldId,
    regionVersion: execution.regionVersion as typeof WORLD_REGION_VERSION,
    partyId: execution.partyId,
    routeEpoch: execution.routeEpoch,
    travelProfileId: execution.profileId as typeof SAFE_TRAVEL_ALPHA_V1.profileId,
    purpose: execution.purpose,
    route: edges,
    segment: {
      segmentId: execution.segment.segmentId,
      fromSiteId: execution.segment.fromSiteId,
      toSiteId: execution.segment.toSiteId,
      startedAt: campaignTick(execution.segment.startedAt),
      arrivalNotBefore: campaignTick(execution.segment.dueTick),
    },
    memberMoves: [],
    carrierFollow: [],
    assumptions: [],
    residuals: [
      'WORLD_ROUTE_EPOCH_PERSISTENCE',
      'PHYSICAL_CARRIER_FOLLOW_APPLICATION',
      'ACTUAL_SUPPLY_AND_FATIGUE_EFFECTS',
      'INCAPACITATED_OR_CARRIED_MEMBER_TRAVEL_PRODUCER',
      'TRUSTED_RETURN_OR_CAMP_AUTHORIZATION_PRODUCER',
    ],
  };
}

function regionAreaId(siteId: string, region = requireRegion()): string {
  const areaId = region.sites.find((site) => site.siteId === siteId)?.areas[0]?.areaId;
  if (!areaId) throw new TypeError('Accepted route destination has no authored area');
  return areaId;
}

function readStoredResponse(value: unknown, commandId: string): StoredV1TravelResponseDto {
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
    value['commandId'] !== commandId ||
    typeof value['worldTick'] !== 'string' ||
    typeof value['publicRevision'] !== 'string'
  )
    throw new TypeError('Stored world travel receipt is invalid');
  const partyValue = value['party'];
  const party =
    partyValue === null
      ? null
      : isRecord(partyValue) &&
          typeof partyValue['partyId'] === 'string' &&
          typeof partyValue['location'] === 'string' &&
          isStringArray(partyValue['memberIds']) &&
          typeof partyValue['routeEpoch'] === 'string'
        ? {
            partyId: partyValue['partyId'],
            location: partyValue['location'],
            memberIds: partyValue['memberIds'],
            routeEpoch: partyValue['routeEpoch'],
          }
        : undefined;
  const routeValue = value['route'];
  const route =
    routeValue === null
      ? null
      : isRecord(routeValue) &&
          typeof routeValue['routeEpoch'] === 'string' &&
          typeof routeValue['segmentId'] === 'string' &&
          isStringArray(routeValue['edgeIds']) &&
          typeof routeValue['regionVersion'] === 'string' &&
          typeof routeValue['profileId'] === 'string' &&
          typeof routeValue['startedAt'] === 'string' &&
          typeof routeValue['dueTick'] === 'string' &&
          typeof routeValue['remainingTicks'] === 'string' &&
          typeof routeValue['canArrive'] === 'boolean'
        ? {
            routeEpoch: routeValue['routeEpoch'],
            segmentId: routeValue['segmentId'],
            edgeIds: routeValue['edgeIds'],
            regionVersion: routeValue['regionVersion'],
            profileId: routeValue['profileId'],
            startedAt: routeValue['startedAt'],
            dueTick: routeValue['dueTick'],
            remainingTicks: routeValue['remainingTicks'],
            canArrive: routeValue['canArrive'],
          }
        : undefined;
  const availableDepartures =
    value['availableDepartures'] === undefined
      ? undefined
      : isAvailableDepartures(value['availableDepartures'])
        ? value['availableDepartures']
        : undefined;
  if (
    party === undefined ||
    route === undefined ||
    (value['availableDepartures'] !== undefined && availableDepartures === undefined)
  )
    throw new TypeError('Stored world travel receipt is invalid');
  return {
    schemaVersion: 1,
    commandId,
    worldTick: value['worldTick'],
    publicRevision: value['publicRevision'],
    party,
    route,
    ...(availableDepartures === undefined ? {} : { availableDepartures }),
  };
}

function canonicalTravelResponse(response: WorldTravelResponseDto): {
  readonly response: WorldTravelResponseDto;
  readonly body: string;
} {
  const allowedResponse: WorldTravelResponseDto = {
    schemaVersion: 1,
    commandId: response.commandId,
    worldTick: response.worldTick,
    publicRevision: response.publicRevision,
    party:
      response.party === null
        ? null
        : {
            partyId: response.party.partyId,
            location: response.party.location,
            memberIds: [...response.party.memberIds],
            routeEpoch: response.party.routeEpoch,
          },
    availableDepartures: response.availableDepartures.map((departure) => ({
      purpose: departure.purpose,
      edgeIds: [...departure.edgeIds],
      fromSiteId: departure.fromSiteId,
      toSiteId: departure.toSiteId,
    })),
    route:
      response.route === null
        ? null
        : {
            routeEpoch: response.route.routeEpoch,
            segmentId: response.route.segmentId,
            edgeIds: [...response.route.edgeIds],
            regionVersion: response.route.regionVersion,
            profileId: response.route.profileId,
            startedAt: response.route.startedAt,
            dueTick: response.route.dueTick,
            remainingTicks: response.route.remainingTicks,
            canArrive: response.route.canArrive,
          },
  };
  const body = canonicalJson(allowedResponse);
  return { response: JSON.parse(body) as WorldTravelResponseDto, body };
}

function v2ResponseFor(
  state: CompanyCombatAggregateState,
  execution: PartyRouteExecution,
  clock: Awaited<ReturnType<typeof readWorldClock>>,
  commandId: string,
): WorldTravelV2ResponseDto {
  const party = state.economy.lifecycle.parties.find(
    (entry) => entry.partyId === execution.partyId,
  );
  if (!party) throw new TypeError('Route execution party is unavailable');
  const memberIds = state.economy.lifecycle.characters
    .filter((character) => character.presence.fieldPartyId === execution.partyId)
    .map((character) => character.identity.characterId)
    .sort();
  return {
    schemaVersion: 2,
    commandId,
    worldTick: clock.tick,
    publicRevision: state.economy.lifecycle.knowledge.revision,
    party: {
      partyId: party.partyId,
      location: party.location.kind === 'AT' ? party.location.siteId : party.location.from,
      memberIds,
      routeEpoch: execution.routeEpoch,
    },
    availableDepartures: [],
    execution: {
      routeExecutionId: execution.routeExecutionId,
      purpose: execution.purpose,
      regionVersion: execution.regionVersion,
      edgeIds: [...execution.edgeIds],
      phase: execution.phase,
      nextEdgeIndex: execution.nextEdgeIndex,
      currentSiteId: execution.currentSiteId,
      activeSegment: execution.segment
        ? { segmentId: execution.segment.segmentId, dueTick: execution.segment.dueTick }
        : null,
    },
  };
}

function canonicalV2Response(response: WorldTravelV2ResponseDto): {
  readonly response: WorldTravelV2ResponseDto;
  readonly body: string;
} {
  const body = canonicalJson(response);
  return { response: JSON.parse(body) as WorldTravelV2ResponseDto, body };
}

function readStoredV2Response(value: unknown, commandId: string): WorldTravelV2ResponseDto {
  if (
    !isRecord(value) ||
    (!hasExactObjectKeys(value, [
      'commandId',
      'execution',
      'party',
      'publicRevision',
      'schemaVersion',
      'worldTick',
    ]) &&
      !hasExactObjectKeys(value, [
        'availableDepartures',
        'commandId',
        'execution',
        'party',
        'publicRevision',
        'schemaVersion',
        'worldTick',
      ])) ||
    value['schemaVersion'] !== 2 ||
    value['commandId'] !== commandId ||
    !isExactInteger(value['worldTick']) ||
    !isExactInteger(value['publicRevision'])
  )
    throw new TypeError('Stored V2 travel receipt is invalid');
  const body = value as unknown as WorldTravelV2ResponseDto;
  if (body.availableDepartures !== undefined && !isAvailableDepartures(body.availableDepartures))
    throw new TypeError('Stored V2 travel departure offers are invalid');
  const party = body.party;
  const execution = body.execution;
  if (
    !party ||
    !hasExactObjectKeys(party, ['partyId', 'location', 'memberIds', 'routeEpoch']) ||
    !isEntityId(party.partyId) ||
    !isEntityId(party.location) ||
    !isStringArray(party.memberIds) ||
    !party.memberIds.every(isEntityId) ||
    !isExactInteger(party.routeEpoch) ||
    !execution ||
    !hasExactObjectKeys(execution, [
      'routeExecutionId',
      'purpose',
      'regionVersion',
      'edgeIds',
      'phase',
      'nextEdgeIndex',
      'currentSiteId',
      'activeSegment',
    ]) ||
    !isEntityId(execution.routeExecutionId) ||
    (execution.purpose !== 'NEW' && execution.purpose !== 'RETURN') ||
    !isEntityId(execution.regionVersion) ||
    !isStringArray(execution.edgeIds) ||
    !execution.edgeIds.every(isEntityId) ||
    !['IN_TRANSIT', 'AT_BOUNDARY', 'COMPLETE'].includes(execution.phase) ||
    !Number.isSafeInteger(execution.nextEdgeIndex) ||
    !isEntityId(execution.currentSiteId) ||
    (execution.activeSegment !== null &&
      (!hasExactObjectKeys(execution.activeSegment, ['segmentId', 'dueTick']) ||
        !isEntityId(execution.activeSegment.segmentId) ||
        !isExactInteger(execution.activeSegment.dueTick)))
  )
    throw new TypeError('Stored V2 travel receipt is invalid');
  const canonical = canonicalV2Response(body);
  return canonical.response;
}

function hasExactObjectKeys(value: object, keys: readonly string[]): boolean {
  return canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isAvailableDepartures(value: unknown): value is WorldAvailableDepartureDto[] {
  return (
    Array.isArray(value) &&
    value.every(
      (departure) =>
        isRecord(departure) &&
        hasExactObjectKeys(departure, ['purpose', 'edgeIds', 'fromSiteId', 'toSiteId']) &&
        (departure['purpose'] === 'NEW' || departure['purpose'] === 'RETURN') &&
        isStringArray(departure['edgeIds']) &&
        departure['edgeIds'].length > 0 &&
        departure['edgeIds'].length <= 16 &&
        departure['edgeIds'].every(isEntityId) &&
        isEntityId(departure['fromSiteId']) &&
        isEntityId(departure['toSiteId']),
    )
  );
}

function reject(
  reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } },
  commandId: string | null,
  revision: string,
  code: WorldTravelRejectionDto['code'],
) {
  const result = rejectedTravelResponse(commandId, revision, code);
  return reply.code(result.statusCode).send(result.body);
}

function rejectedTravelResponse(
  commandId: string | null,
  revision: string,
  code: WorldTravelRejectionDto['code'],
): RejectedWorldTravelResponse {
  const status = code === 'NOT_AUTHORIZED' ? 403 : code === 'INVALID_COMMAND' ? 400 : 409;
  return {
    kind: 'REJECTED',
    statusCode: status,
    body: { schemaVersion: 1, commandId, ok: false, publicRevision: revision, code },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isContinuousRoute(edges: readonly WorldRegionEdge[], fromSiteId: string): boolean {
  let currentSiteId = fromSiteId;
  for (const edge of edges) {
    if (edge.fromSiteId === currentSiteId) currentSiteId = edge.toSiteId;
    else if (edge.toSiteId === currentSiteId) currentSiteId = edge.fromSiteId;
    else return false;
  }
  return true;
}

function makeRouteSupplyAssessment(input: {
  readonly state: CompanyCombatAggregateState;
  readonly partyId: string;
  readonly atTick: string;
  readonly edgeIds: readonly string[];
  readonly edges: readonly WorldRegionEdge[];
}): TrustedRouteSupplyAssessment {
  const root = materializedRoot(input.state);
  const party = root.lifecycle.parties.find((entry) => entry.partyId === input.partyId);
  if (!party || party.location.kind !== 'AT')
    throw new TravelPreparationError('TRAVEL_ROOT_NOT_SETTLED');
  const dueTick = (
    BigInt(input.atTick) +
    input.edges.reduce((sum, edge) => sum + BigInt(edge.provisionalTravelTicks), 0n)
  ).toString();
  const accrued = accrueFinance(
    input.state.economy.finance,
    input.state.economy.lifecycle,
    campaignTick(dueTick),
  );
  const requirements = accrued.requirements.filter(
    (
      requirement,
    ): requirement is Extract<
      (typeof accrued.requirements)[number],
      { readonly kind: 'FOOD_CONSUMPTION' }
    > => requirement.kind === 'FOOD_CONSUMPTION',
  );
  const containers = followableRouteFoodContainerIds(input.state, input.partyId);
  const stock = assessPhysicalFoodStock(
    root.physical,
    requirements,
    containers,
    root.lifecycle.companyId,
  );
  return {
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    partyId: input.partyId,
    canonicalRevision: root.lifecycle.revision,
    atTick: campaignTick(input.atTick),
    edgeIds: input.edgeIds,
    knownShortage: stock.knownShortage,
    assumptions: ['CURRENT_COMPANY_OWNED_PARTY_STOCK', 'EXACT_FRACTIONAL_FOOD_CARRY'],
  };
}

function followableRouteFoodContainerIds(
  state: CompanyCombatAggregateState,
  partyId: string,
): readonly string[] {
  const root = materializedRoot(state);
  const parties = root.lifecycle.parties.filter((entry) => entry.partyId === partyId);
  const party = parties.length === 1 ? parties[0] : undefined;
  if (!party || party.location.kind !== 'AT')
    throw new TravelPreparationError('TRAVEL_ROOT_NOT_SETTLED');
  const partyLocation = party.location;
  const partyMembers = new Set<string>(
    root.lifecycle.characters
      .filter((character) => {
        const location = character.presence.location;
        return (
          character.presence.fieldPartyId === partyId &&
          location.kind === 'AT' &&
          location.siteId === partyLocation.siteId &&
          location.areaId === partyLocation.areaId
        );
      })
      .map((character) => character.identity.characterId),
  );
  return root.physical.containers
    .filter((container) => {
      const location = container.location;
      return (
        (container.kind === 'PARTY_SUPPLY' || container.kind === 'CARRIED') &&
        container.closed === null &&
        container.access === 'COMPANY' &&
        container.custodian.kind === 'COMPANY' &&
        container.custodian.id === root.lifecycle.companyId &&
        location.kind === 'AT' &&
        location.siteId === partyLocation.siteId &&
        location.areaId === partyLocation.areaId &&
        ((container.kind === 'PARTY_SUPPLY' &&
          container.carrier?.kind === 'PARTY' &&
          container.carrier.id === partyId) ||
          (container.kind === 'CARRIED' &&
            container.carrier?.kind === 'CHARACTER' &&
            partyMembers.has(container.carrier.id)))
      );
    })
    .map((container) => container.containerId)
    .toSorted();
}
