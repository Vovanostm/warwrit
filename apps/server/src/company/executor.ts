import { randomUUID } from 'node:crypto';
import {
  campaignTick,
  canonicalJson,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  checkFreshCompanyRevision,
  companySourceKey,
  parseCompanyCommand,
  prepareCompanyEconomy,
  preparePartyTravelArrival,
  preparePartyTravelDeparture,
  continuePartyRouteExecution,
  preparePartyRouteExecutionArrival,
  preparePartyRouteExecutionDeparture,
  readCompanyCombatAggregateState,
  publicRevision,
} from '@warwrit/game-core';
import type {
  CompanyCommand,
  CompanyCombatAggregateState,
  EconomyContext,
  PracticeContext,
  TrustedTransitSegment,
  PartyRouteExecution,
} from '@warwrit/game-core';
import type {
  CompanyCommandAcceptedDto,
  CompanyCommandRejectionDto,
  FirstHuntCommandAcceptedDto,
  OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';
import type { Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import {
  findOwnedCompanyId,
  lockCompanyAggregate,
  readCompanyCommandReceipt,
  readCompanySourceReceipt,
  updateCompanyAggregateWithExternalReceipt,
  updateCompanyAggregateWithReceipt,
} from './repository.js';
import type { FirstHuntExternalCompanyTransition } from './repository.js';
import { prepareTravelFoodFacts } from './travel-food.js';
import type { TravelFoodRouteBoundary } from './travel-food.js';
import { readWorldClock } from '../world/clock.js';

const preparedCompanyCommand: unique symbol = Symbol('prepared-company-command');
const worldRequestKeyFields = ['commandId', 'companyId', 'kind', 'requestKey', 'worldId'];

export interface CompanyWorldRequestIdentity {
  readonly kind: 'WORLD_REQUEST';
  readonly worldId: string;
  readonly companyId: string;
  readonly commandId: string;
  /** Canonicalized, authenticated outer request body. It excludes execution time and trusted facts. */
  readonly requestKey: string;
}

export function stableCompanyRequestKey(identity: CompanyWorldRequestIdentity): string {
  validateWorldRequestIdentity(identity);
  return canonicalJson(identity);
}

export type CompanyReceiptLookup =
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'REPLAY'; readonly response: CompanyCommandAcceptedDto }
  | { readonly kind: 'REJECTED'; readonly response: CompanyCommandRejectionDto };

export interface TrustedCompanyCommandInput {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly accountId: string;
  readonly lockedPriorState: CompanyCombatAggregateState;
  readonly command: unknown;
  readonly stableRequestKey: string;
  readonly expectedPublicRevision: string;
  readonly context: EconomyContext & Pick<PracticeContext, 'practiceFacts'>;
  readonly travelMode?: TrustedCompanyTravelEffect['kind'];
  readonly travelFoodRouteBoundary?: TravelFoodRouteBoundary;
}

interface PreparedTrustedCompanyCommand {
  readonly [preparedCompanyCommand]: true;
  readonly accountId: string;
  readonly command: Extract<CompanyCommand, { readonly type: 'AdvanceCampaign' }>;
  readonly stableRequestKey: string;
  readonly expectedPublicRevision: string;
  readonly priorState: CompanyCombatAggregateState;
  readonly nextState: CompanyCombatAggregateState;
  readonly requestKey: string;
  readonly sourceKey: string;
  readonly response: CompanyCommandAcceptedDto;
  readonly events: readonly { readonly eventId: string; readonly event: Readonly<object> }[];
  readonly travelMode: TrustedCompanyTravelEffect['kind'];
  readonly trustedTransitSegments: readonly TrustedTransitSegment[];
}

export type TrustedCompanyTravelEffect =
  | {
      readonly kind: 'DEPARTURE';
      readonly input: Omit<Parameters<typeof preparePartyTravelDeparture>[0], 'root'>;
    }
  | {
      readonly kind: 'ARRIVAL';
      readonly input: Omit<Parameters<typeof preparePartyTravelArrival>[0], 'root'>;
    }
  | {
      readonly kind: 'EXECUTION_DEPARTURE';
      readonly input: Omit<Parameters<typeof preparePartyRouteExecutionDeparture>[0], 'root'>;
    }
  | {
      readonly kind: 'EXECUTION_ARRIVAL';
      readonly input: Omit<Parameters<typeof preparePartyRouteExecutionArrival>[0], 'root'>;
    }
  | {
      readonly kind: 'EXECUTION_CONTINUATION';
      readonly input: Omit<Parameters<typeof continuePartyRouteExecution>[0], 'root'>;
    };

export type TrustedCompanyCommandPreparation =
  | { readonly kind: 'PREPARED'; readonly prepared: PreparedTrustedCompanyCommand }
  | { readonly kind: 'REPLAY'; readonly response: CompanyCommandAcceptedDto }
  | { readonly kind: 'REJECTED'; readonly response: CompanyCommandRejectionDto };

export type OrdinaryCompanyCommandExecution =
  | { readonly kind: 'COMMITTED'; readonly response: CompanyCommandAcceptedDto }
  | {
      readonly kind: 'REJECTED';
      readonly statusCode: number;
      readonly response: CompanyCommandRejectionDto;
    };

/**
 * Execute the two ordinary player commands whose complete durable effects and public readback
 * are currently available. All other V2 command types stay fail-closed.
 */
export async function executeOrdinaryPlayerCompanyCommand(input: {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly accountId: string;
  readonly expectedCompanyId: string | undefined;
  readonly worldId: string;
  readonly request: OrdinaryPlayerCompanyCommandV2Dto;
  readonly requestKey: string;
  readonly now: Date;
}): Promise<OrdinaryCompanyCommandExecution> {
  const rejectRequest = (
    code: CompanyCommandRejectionDto['code'],
    revision = '0',
    statusCode = 409,
  ): OrdinaryCompanyCommandExecution => ({
    kind: 'REJECTED',
    statusCode,
    response: { commandId: input.request.commandId, ok: false, publicRevision: revision, code },
  });

  if (!input.expectedCompanyId || input.requestKey !== canonicalJson(input.request))
    return rejectRequest('INVALID_COMMAND', '0', 400);

  const account = await input.transaction
    .selectFrom('identity_accounts')
    .select('id')
    .where('id', '=', input.accountId)
    .forUpdate()
    .executeTakeFirst();
  if (!account) return rejectRequest('NOT_AUTHORIZED', '0', 401);

  const companyId = await findOwnedCompanyId(input.transaction, input.worldId, input.accountId);
  if (!companyId || companyId !== input.expectedCompanyId)
    return rejectRequest('NOT_AUTHORIZED', '0', 403);

  const previous = await lockCompanyAggregate(input.transaction, input.worldId, companyId);
  if (!previous) throw new Error('Owned company snapshot is unavailable');
  const previousLifecycle = previous.economy.lifecycle;

  // A durable exact retry answers before public freshness or a new clock boundary.
  const existingReceipt = await readCompanyCommandReceipt(
    input.transaction,
    input.worldId,
    companyId,
    input.request.commandId,
  );
  if (existingReceipt) {
    if (existingReceipt.requestKey !== input.requestKey)
      return rejectRequest('IDEMPOTENCY_CONFLICT', previousLifecycle.knowledge.revision);
    const replay = acceptedReceipt(existingReceipt.response, input.request.commandId);
    return replay
      ? { kind: 'COMMITTED', response: replay }
      : rejectRequest('INVALID_COMMAND', previousLifecycle.knowledge.revision);
  }

  const state = previous;
  const lifecycle = state.economy.lifecycle;
  if (input.request.expectedPublicRevision !== lifecycle.knowledge.revision)
    return rejectRequest('STALE_REVISION', lifecycle.knowledge.revision);

  if (input.request.type !== 'RenameCompany' && input.request.type !== 'ChoosePerk')
    return rejectRequest('UNSUPPORTED_ACTION', lifecycle.knowledge.revision);

  const clock = await readWorldClock(input.transaction, input.worldId, input.now, true);
  if (
    state.encounter.active !== null ||
    lifecycle.parties.some((party) => party.location.kind === 'TRANSIT') ||
    (BigInt(clock.tick) > BigInt(lifecycle.campaignTick) &&
      state.learning.tasks.tasks.some((task) => !task.stop && !task.terminal))
  )
    return rejectRequest('UNSUPPORTED_ACTION', lifecycle.knowledge.revision);

  const commandValue = {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: input.request.commandId,
    worldId: input.worldId,
    companyId,
    actorRef: { kind: 'PLAYER', id: input.accountId },
    expectedRevision: publicRevision(input.request.expectedPublicRevision),
    campaignTick: campaignTick(clock.tick),
    rulesetId: COMPANY_RULESET_ID,
    type: input.request.type,
    payload:
      input.request.type === 'RenameCompany'
        ? {
            companyId,
            name: input.request.payload['name'],
            bannerId: input.request.payload['bannerId'],
          }
        : {
            characterId: input.request.payload['characterId'],
            perkId: input.request.payload['perkId'],
            milestone: input.request.payload['milestone'],
          },
  };

  const parsed = parseCompanyCommand(commandValue);
  if (!parsed.ok) return rejectRequest('INVALID_COMMAND', lifecycle.knowledge.revision);

  const context = {
    worldId: input.worldId,
    companyId,
    principal: { kind: 'PLAYER' as const, id: input.accountId },
    publicRevision: lifecycle.knowledge.revision,
    canonicalRevision: lifecycle.revision,
    atTick: campaignTick(clock.tick),
    completeGraph: true,
    contactIds: [],
    facts: [],
    financeFacts: [],
    physicalFacts: [],
    practiceFacts: [],
  };
  const prepared = prepareCompanyEconomy(state.economy, parsed.command, context);
  if (prepared.kind !== 'PREPARED')
    return rejectRequest(mapDomainError(prepared.error), lifecycle.knowledge.revision);
  if (
    prepared.replayed ||
    prepared.receipt.lifecycleReceipt === null ||
    prepared.receipt.events.length === 0 ||
    prepared.receipt.requirements.length !== 0
  )
    return rejectRequest('UNSUPPORTED_ACTION', lifecycle.knowledge.revision);

  let nextState: CompanyCombatAggregateState;
  try {
    nextState = readCompanyCombatAggregateState({ ...state, economy: prepared.next });
  } catch {
    return rejectRequest('INVALID_COMMAND', lifecycle.knowledge.revision);
  }
  const nextLifecycle = nextState.economy.lifecycle;
  const response: CompanyCommandAcceptedDto = {
    commandId: parsed.command.commandId,
    ok: true,
    publicRevision: nextLifecycle.knowledge.revision,
  };
  await updateCompanyAggregateWithReceipt(
    input.transaction,
    lifecycle.revision,
    nextLifecycle.revision,
    nextState,
    {
      command: parsed.command,
      receipt: {
        receiptId: randomUUID(),
        commandId: parsed.command.commandId,
        sourceKey: companySourceKey(parsed.command),
        requestKey: input.requestKey,
        response,
        resultingRevision: nextLifecycle.revision,
      },
      auditEvents: prepared.receipt.events.map((event) => ({
        eventId: event.id,
        revision: nextLifecycle.revision,
        event,
      })),
    },
  );
  return { kind: 'COMMITTED', response };
}

/** Persist a physical proof or settlement effect without inventing an economy command. */
export async function persistFirstHuntCompanyTransition(input: {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly accountId: string;
  readonly previous: CompanyCombatAggregateState;
  readonly next: CompanyCombatAggregateState;
  readonly commandId: string;
  readonly receiptId: string;
  readonly requestKey: string;
  readonly publicRevision: string;
  readonly operation: 'PICKUP' | 'PRESENT';
  readonly itemId: string;
  readonly transition: FirstHuntExternalCompanyTransition;
  readonly rewardQ?: string;
}): Promise<FirstHuntCommandAcceptedDto> {
  const previous = readCompanyCombatAggregateState(input.previous);
  const next = readCompanyCombatAggregateState(input.next);
  const lifecycle = previous.economy.lifecycle;
  if (
    (await findOwnedCompanyId(input.transaction, lifecycle.worldId, input.accountId)) !==
      lifecycle.companyId ||
    input.itemId !== 'proof.raider-standard.old-mill.01' ||
    input.transition.operation !== input.operation ||
    next.economy.lifecycle.worldId !== lifecycle.worldId ||
    next.economy.lifecycle.companyId !== lifecycle.companyId ||
    BigInt(next.economy.lifecycle.revision) !== BigInt(lifecycle.revision) + 1n ||
    BigInt(next.economy.lifecycle.knowledge.revision) !==
      BigInt(lifecycle.knowledge.revision) + 1n ||
    next.economy.lifecycle.campaignTick !== lifecycle.campaignTick ||
    !/^(0|[1-9][0-9]*)$/.test(input.publicRevision)
  )
    throw new TypeError('FIRST HUNT company transition is outside the authenticated root');

  const locked = await lockCompanyAggregate(
    input.transaction,
    lifecycle.worldId,
    lifecycle.companyId,
  );
  if (!locked || canonicalJson(locked) !== canonicalJson(previous))
    throw new Error('Company root changed before FIRST HUNT transition persistence');

  const response: FirstHuntCommandAcceptedDto = {
    schemaVersion: 1,
    commandId: input.commandId,
    ok: true,
    receiptId: input.receiptId,
    publicRevision: input.publicRevision,
  };
  await updateCompanyAggregateWithExternalReceipt(input.transaction, {
    previous,
    next,
    transition: input.transition,
    commandId: input.commandId,
    receiptId: input.receiptId,
    requestKey: input.requestKey,
    response: { ...response },
    eventId: `${input.commandId}:first-hunt-${input.operation.toLowerCase()}`,
    event: {
      schemaVersion: 1,
      type: input.operation === 'PICKUP' ? 'FirstHuntProofPickedUp' : 'FirstHuntProofPresented',
      itemId: input.itemId,
      ...(input.rewardQ === undefined ? {} : { rewardQ: input.rewardQ }),
    },
  });
  return response;
}

/**
 * Call after session authentication and account/company binding, before reading fresh time.
 * Company receipts answer domain/source replay; the world receipt remains the transport replay.
 */
export async function lookupTrustedCompanyCommandReceipt(input: {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly accountId: string;
  readonly identity: CompanyWorldRequestIdentity;
}): Promise<CompanyReceiptLookup> {
  const { transaction, accountId, identity } = input;
  validateWorldRequestIdentity(identity);
  if ((await findOwnedCompanyId(transaction, identity.worldId, accountId)) !== identity.companyId)
    return rejected(identity.commandId, 'NOT_AUTHORIZED');

  const receipt = await readCompanyCommandReceipt(
    transaction,
    identity.worldId,
    identity.companyId,
    identity.commandId,
  );
  if (!receipt) return { kind: 'NOT_FOUND' };
  if (receipt.requestKey !== stableCompanyRequestKey(identity))
    return rejected(identity.commandId, 'IDEMPOTENCY_CONFLICT');
  const response = acceptedReceipt(receipt.response, identity.commandId);
  return response ? { kind: 'REPLAY', response } : rejected(identity.commandId, 'INVALID_COMMAND');
}

/**
 * Prepare only the existing safe-trip AdvanceCampaign subset. This function performs no writes;
 * persistPreparedTrustedCompanyCommand must run in the same caller transaction after the world
 * owner composes its authorized route effect. The caller sends success only after that transaction
 * commits.
 */
export async function prepareTrustedCompanyCommand(
  input: TrustedCompanyCommandInput,
): Promise<TrustedCompanyCommandPreparation> {
  const { transaction, accountId, lockedPriorState, stableRequestKey, context } = input;
  let previous: CompanyCombatAggregateState;
  let command: CompanyCommand;
  try {
    previous = readCompanyCombatAggregateState(lockedPriorState);
    const parsed = parseCompanyCommand(input.command);
    if (!parsed.ok) return rejected(commandIdFrom(input.command), 'INVALID_COMMAND');
    command = parsed.command;
  } catch {
    return rejected(commandIdFrom(input.command), 'INVALID_COMMAND');
  }

  const lifecycle = previous.economy.lifecycle;
  if ((await findOwnedCompanyId(transaction, lifecycle.worldId, accountId)) !== lifecycle.companyId)
    return rejected(command.commandId, 'NOT_AUTHORIZED');
  const lockedState = await lockCompanyAggregate(
    transaction,
    lifecycle.worldId,
    lifecycle.companyId,
  );
  if (!lockedState || canonicalJson(lockedState) !== canonicalJson(previous))
    return rejected(command.commandId, 'STALE_REVISION', lifecycle.knowledge.revision);

  const identity = parseStableCompanyRequestKey(stableRequestKey);
  if (
    !identity ||
    identity.worldId !== lifecycle.worldId ||
    identity.companyId !== lifecycle.companyId ||
    identity.commandId !== command.commandId
  )
    return rejected(command.commandId, 'INVALID_COMMAND', lifecycle.knowledge.revision);

  const byCommand = await readCompanyCommandReceipt(
    transaction,
    lifecycle.worldId,
    lifecycle.companyId,
    command.commandId,
  );
  if (byCommand) {
    if (byCommand.requestKey !== stableRequestKey)
      return rejected(command.commandId, 'IDEMPOTENCY_CONFLICT', lifecycle.knowledge.revision);
    const response = acceptedReceipt(byCommand.response, command.commandId);
    return response
      ? { kind: 'REPLAY', response }
      : rejected(command.commandId, 'INVALID_COMMAND', lifecycle.knowledge.revision);
  }

  if (command.type !== 'AdvanceCampaign')
    return rejected(command.commandId, 'UNSUPPORTED_ACTION', lifecycle.knowledge.revision);
  const sourceKey = companySourceKey(command);
  if (sourceKey === null)
    return rejected(command.commandId, 'INVALID_COMMAND', lifecycle.knowledge.revision);
  const bySource = await readCompanySourceReceipt(
    transaction,
    lifecycle.worldId,
    lifecycle.companyId,
    sourceKey,
  );
  if (bySource)
    return bySource.requestKey === stableRequestKey && bySource.commandId === command.commandId
      ? acceptedReceipt(bySource.response, command.commandId)
        ? {
            kind: 'REPLAY',
            response: acceptedReceipt(bySource.response, command.commandId)!,
          }
        : rejected(command.commandId, 'INVALID_COMMAND', lifecycle.knowledge.revision)
      : rejected(command.commandId, 'IDEMPOTENCY_CONFLICT', lifecycle.knowledge.revision);

  if (context.worldId !== lifecycle.worldId || context.companyId !== lifecycle.companyId)
    return rejected(command.commandId, 'INVALID_COMMAND', lifecycle.knowledge.revision);
  if (
    !isRevision(input.expectedPublicRevision) ||
    input.expectedPublicRevision !== lifecycle.knowledge.revision
  )
    return rejected(command.commandId, 'STALE_REVISION', lifecycle.knowledge.revision);
  if (
    command.actorRef.kind !== 'SYSTEM' ||
    command.actorRef.id !== 'world-travel' ||
    context.principal.kind !== 'SYSTEM' ||
    context.principal.id !== 'world-travel' ||
    context.canonicalRevision !== lifecycle.revision ||
    context.publicRevision !== lifecycle.knowledge.revision ||
    context.atTick !== command.payload.toTick ||
    !checkFreshCompanyRevision(command, context)
  )
    return rejected(command.commandId, 'STALE_REVISION', lifecycle.knowledge.revision);

  const guarded = validateSafeTripInput(command, previous, context);
  if (guarded !== undefined)
    return rejected(command.commandId, guarded, lifecycle.knowledge.revision);

  const food = prepareTravelFoodFacts(
    previous,
    command.payload.toTick,
    command.commandId,
    input.travelFoodRouteBoundary,
  );
  if (food.kind !== 'PREPARED')
    return rejected(
      command.commandId,
      food.reason === 'INSUFFICIENT_ITEMS' ? 'INSUFFICIENT_ITEMS' : 'UNSUPPORTED_ACTION',
      lifecycle.knowledge.revision,
    );

  const prepared = prepareCompanyEconomy(previous.economy, command, {
    ...context,
    physicalFacts: food.facts,
  });
  if (prepared.kind !== 'PREPARED')
    return rejected(
      command.commandId,
      mapDomainError(prepared.error),
      lifecycle.knowledge.revision,
    );
  if (prepared.replayed || prepared.receipt.requirements.length !== 0)
    return rejected(command.commandId, 'UNSUPPORTED_ACTION', lifecycle.knowledge.revision);

  let nextState: CompanyCombatAggregateState;
  try {
    nextState = readCompanyCombatAggregateState({ ...previous, economy: prepared.next });
  } catch {
    return rejected(command.commandId, 'INVALID_COMMAND', lifecycle.knowledge.revision);
  }
  const response: CompanyCommandAcceptedDto = {
    commandId: command.commandId,
    ok: true,
    publicRevision: nextState.economy.lifecycle.knowledge.revision,
  };
  return {
    kind: 'PREPARED',
    prepared: {
      [preparedCompanyCommand]: true,
      accountId,
      command,
      stableRequestKey,
      expectedPublicRevision: input.expectedPublicRevision,
      priorState: previous,
      nextState,
      requestKey: prepared.receipt.requestKey,
      sourceKey,
      response,
      events: prepared.receipt.events.map((event) => ({ eventId: event.id, event })),
      travelMode:
        input.travelMode ??
        ((context.trustedTransitSegments?.length ?? 0) === 1 ? 'ARRIVAL' : 'DEPARTURE'),
      trustedTransitSegments: context.trustedTransitSegments ?? [],
    },
  };
}

/**
 * Persist the prepared company command and caller-composed final root in the caller's transaction.
 * Only the owning world composer may add the route effect; no other changes to the candidate root
 * are accepted. This writes the company snapshot once, then its source receipt and audit atomically.
 */
export async function persistPreparedTrustedCompanyCommand(input: {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly prepared: PreparedTrustedCompanyCommand;
  readonly finalState: CompanyCombatAggregateState;
  readonly travelEffect: TrustedCompanyTravelEffect;
  readonly additionalAuditEvents?: readonly {
    readonly eventId: string;
    readonly event: Readonly<object>;
  }[];
}): Promise<CompanyCommandAcceptedDto> {
  const { transaction, prepared } = input;
  if (prepared[preparedCompanyCommand] !== true)
    throw new TypeError('Unrecognized prepared company command');

  const prior = await lockCompanyAggregate(
    transaction,
    prepared.priorState.economy.lifecycle.worldId,
    prepared.priorState.economy.lifecycle.companyId,
  );
  if (!prior || canonicalJson(prior) !== canonicalJson(prepared.priorState))
    throw new Error('Company root changed before command persistence');
  if (
    (await findOwnedCompanyId(
      transaction,
      prepared.priorState.economy.lifecycle.worldId,
      prepared.accountId,
    )) !== prepared.priorState.economy.lifecycle.companyId
  )
    throw new Error('Company owner changed before command persistence');

  const finalState = readCompanyCombatAggregateState(input.finalState);
  const composition = composePreparedTravelEffect(prepared, input.travelEffect);
  if (canonicalJson(finalState) !== canonicalJson(composition.state))
    throw new TypeError('Final company root does not match the prepared travel composition');
  const movementEventIds = new Set(composition.observationEvents.map((event) => event.id));
  if ((input.additionalAuditEvents ?? []).some((entry) => movementEventIds.has(entry.eventId)))
    throw new TypeError('Movement observation audit events are owned by the executor');
  const publicRevision = finalState.economy.lifecycle.knowledge.revision;
  const response: CompanyCommandAcceptedDto = {
    commandId: prepared.command.commandId,
    ok: true,
    publicRevision,
  };
  const revision = finalState.economy.lifecycle.revision;
  const auditEvents = [
    ...prepared.events,
    ...composition.observationEvents.map((event) => ({ eventId: event.id, event })),
    ...(input.additionalAuditEvents ?? []),
  ].map((entry) => ({ ...entry, revision }));
  await updateCompanyAggregateWithReceipt(
    transaction,
    prepared.priorState.economy.lifecycle.revision,
    finalState.economy.lifecycle.revision,
    finalState,
    {
      command: prepared.command,
      receipt: {
        receiptId: randomUUID(),
        commandId: prepared.command.commandId,
        sourceKey: prepared.sourceKey,
        requestKey: prepared.stableRequestKey,
        response,
        resultingRevision: revision,
      },
      auditEvents,
    },
  );
  return response;
}

function validateSafeTripInput(
  command: Extract<CompanyCommand, { readonly type: 'AdvanceCampaign' }>,
  state: CompanyCombatAggregateState,
  context: EconomyContext & Pick<PracticeContext, 'practiceFacts'>,
): CompanyCommandRejectionDto['code'] | undefined {
  const lifecycle = state.economy.lifecycle;
  const segments = context.trustedTransitSegments ?? [];
  const departure =
    segments.length === 0 && lifecycle.parties.some((party) => party.location.kind === 'AT');
  const arrival =
    segments.length === 1 &&
    segments[0]!.worldId === lifecycle.worldId &&
    segments[0]!.companyId === lifecycle.companyId &&
    segments[0]!.dueTick === command.payload.toTick &&
    lifecycle.parties.some(
      (party) =>
        party.partyId === segments[0]!.partyId &&
        party.location.kind === 'TRANSIT' &&
        party.location.segmentId === segments[0]!.segmentId,
    );
  if (!departure && !arrival) return 'UNSUPPORTED_ACTION';
  if (
    state.learning.tasks.tasks.some((task) => !task.stop && !task.terminal) ||
    state.encounter.active !== null
  )
    return 'UNSUPPORTED_ACTION';
  if (
    context.facts.length !== 0 ||
    context.contactIds.length !== 0 ||
    context.financeFacts.length !== 0 ||
    (context.physicalFacts?.length ?? 0) !== 0 ||
    (context.practiceFacts?.length ?? 0) !== 0
  )
    return 'INVALID_COMMAND';
  return undefined;
}

function composePreparedTravelEffect(
  prepared: PreparedTrustedCompanyCommand,
  effect: TrustedCompanyTravelEffect,
): {
  readonly state: CompanyCombatAggregateState;
  readonly observationEvents:
    | ReturnType<typeof preparePartyTravelDeparture>['observationEvents']
    | ReturnType<typeof preparePartyTravelArrival>['observationEvents'];
} {
  if (effect.kind !== prepared.travelMode)
    throw new TypeError('Travel effect does not match the prepared command mode');
  const physical = prepared.nextState.economy.physical;
  if (!physical) throw new TypeError('Company travel requires physical state');
  const root = {
    lifecycle: prepared.nextState.economy.lifecycle,
    finance: prepared.nextState.economy.finance,
    physical,
  };
  if (effect.kind === 'EXECUTION_DEPARTURE') {
    if (prepared.trustedTransitSegments.length !== 0)
      throw new TypeError('Execution departure cannot use a trusted transit segment');
    const result = preparePartyRouteExecutionDeparture({ root, ...effect.input });
    return {
      state: readCompanyCombatAggregateState({
        ...prepared.nextState,
        economy: { ...prepared.nextState.economy, ...result.root },
      }),
      observationEvents: result.observationEvents,
    };
  }
  if (effect.kind === 'EXECUTION_ARRIVAL') {
    const segment = prepared.trustedTransitSegments[0];
    const party = segment
      ? prepared.priorState.economy.lifecycle.parties.find(
          (entry) => entry.partyId === segment.partyId,
        )
      : undefined;
    if (
      prepared.trustedTransitSegments.length !== 1 ||
      !segment ||
      party?.location.kind !== 'TRANSIT' ||
      !matchesExecutionTransit(
        segment,
        effect.input.execution,
        prepared.priorState.economy.lifecycle.companyId,
        party.location,
      )
    )
      throw new TypeError('Arrival execution does not match the prepared transit segment');
    const result = preparePartyRouteExecutionArrival({ root, ...effect.input });
    return {
      state: readCompanyCombatAggregateState({
        ...prepared.nextState,
        economy: { ...prepared.nextState.economy, ...result.root },
      }),
      observationEvents: result.observationEvents,
    };
  }
  if (effect.kind === 'EXECUTION_CONTINUATION') {
    if (prepared.trustedTransitSegments.length !== 0)
      throw new TypeError('Route continuation cannot use a trusted transit segment');
    const result = continuePartyRouteExecution({ root, ...effect.input });
    return {
      state: readCompanyCombatAggregateState({
        ...prepared.nextState,
        economy: { ...prepared.nextState.economy, ...result.root },
      }),
      observationEvents: result.observationEvents,
    };
  }
  if (effect.kind === 'DEPARTURE') {
    if (prepared.trustedTransitSegments.length !== 0)
      throw new TypeError('Departure cannot use a trusted transit segment');
    const result = preparePartyTravelDeparture({ root, ...effect.input });
    return {
      state: readCompanyCombatAggregateState({
        ...prepared.nextState,
        economy: { ...prepared.nextState.economy, ...result.root },
      }),
      observationEvents: result.observationEvents,
    };
  }

  const segment = prepared.trustedTransitSegments[0];
  const party =
    segment === undefined
      ? undefined
      : prepared.priorState.economy.lifecycle.parties.find(
          (entry) => entry.partyId === segment.partyId,
        );
  if (
    prepared.trustedTransitSegments.length !== 1 ||
    segment === undefined ||
    party?.location.kind !== 'TRANSIT' ||
    !matchesTransitRoute(
      segment,
      effect.input.acceptedRoute,
      prepared.priorState.economy.lifecycle.companyId,
      party.location,
    )
  )
    throw new TypeError('Arrival route does not match the prepared transit segment');
  const result = preparePartyTravelArrival({ root, ...effect.input });
  return {
    state: readCompanyCombatAggregateState({
      ...prepared.nextState,
      economy: { ...prepared.nextState.economy, ...result.root },
    }),
    observationEvents: result.observationEvents,
  };
}

function matchesExecutionTransit(
  segment: TrustedTransitSegment,
  execution: PartyRouteExecution,
  companyId: string,
  location: Extract<
    CompanyCombatAggregateState['economy']['lifecycle']['parties'][number]['location'],
    { readonly kind: 'TRANSIT' }
  >,
): boolean {
  return (
    execution.phase === 'IN_TRANSIT' &&
    execution.segment !== null &&
    segment.worldId === execution.worldId &&
    segment.companyId === companyId &&
    segment.partyId === execution.partyId &&
    segment.segmentId === execution.segment.segmentId &&
    location.segmentId === segment.segmentId &&
    location.from === execution.segment.fromSiteId &&
    location.to === execution.segment.toSiteId &&
    location.startedAt === segment.startedAt &&
    location.arrivalNotBefore === segment.dueTick &&
    segment.routeEpoch === execution.routeEpoch &&
    segment.profileId === execution.profileId &&
    segment.startedAt === execution.segment.startedAt &&
    segment.dueTick === execution.segment.dueTick
  );
}

function matchesTransitRoute(
  segment: TrustedTransitSegment,
  route: Parameters<typeof preparePartyTravelArrival>[0]['acceptedRoute'],
  companyId: string,
  rootLocation:
    CompanyCombatAggregateState['economy']['lifecycle']['parties'][number]['location'] | undefined,
): boolean {
  return (
    rootLocation?.kind === 'TRANSIT' &&
    segment.worldId === route.worldId &&
    segment.companyId === companyId &&
    segment.partyId === route.partyId &&
    segment.segmentId === route.segment.segmentId &&
    rootLocation.segmentId === segment.segmentId &&
    rootLocation.from === route.segment.fromSiteId &&
    rootLocation.to === route.segment.toSiteId &&
    rootLocation.startedAt === segment.startedAt &&
    rootLocation.arrivalNotBefore === segment.dueTick &&
    segment.routeEpoch === route.routeEpoch &&
    segment.profileId === route.travelProfileId &&
    segment.startedAt === route.segment.startedAt &&
    segment.dueTick === route.segment.arrivalNotBefore
  );
}

function validateWorldRequestIdentity(identity: CompanyWorldRequestIdentity): void {
  let request: unknown;
  try {
    request = JSON.parse(identity.requestKey);
  } catch {
    throw new TypeError('Invalid stable world request body');
  }
  if (
    identity.kind !== 'WORLD_REQUEST' ||
    !nonEmpty(identity.worldId) ||
    !nonEmpty(identity.companyId) ||
    !nonEmpty(identity.commandId) ||
    !isCanonicalJson(identity.requestKey) ||
    containsExecutionAuthority(request)
  )
    throw new TypeError('Invalid stable world request identity');
}

function containsExecutionAuthority(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsExecutionAuthority);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      [
        'actorRef',
        'campaignTick',
        'canonicalRevision',
        'toTick',
        'trustedTransitSegments',
      ].includes(key) || containsExecutionAuthority(nested),
  );
}

function parseStableCompanyRequestKey(value: string): CompanyWorldRequestIdentity | undefined {
  try {
    const identity = JSON.parse(value) as CompanyWorldRequestIdentity;
    if (
      canonicalJson(identity) !== value ||
      !identity ||
      typeof identity !== 'object' ||
      Array.isArray(identity) ||
      canonicalJson(Object.keys(identity).toSorted()) !== canonicalJson(worldRequestKeyFields)
    )
      return undefined;
    validateWorldRequestIdentity(identity);
    return identity;
  } catch {
    return undefined;
  }
}

function acceptedReceipt(value: unknown, commandId: string): CompanyCommandAcceptedDto | undefined {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    canonicalJson(Object.keys(value).toSorted()) !==
      canonicalJson(['commandId', 'ok', 'publicRevision'])
  )
    return undefined;
  const response = value as Record<string, unknown>;
  if (
    response['commandId'] !== commandId ||
    response['ok'] !== true ||
    !isRevision(response['publicRevision'])
  )
    return undefined;
  return response as unknown as CompanyCommandAcceptedDto;
}

function rejected(
  commandId: string,
  code: CompanyCommandRejectionDto['code'],
  revision = '0',
): { readonly kind: 'REJECTED'; readonly response: CompanyCommandRejectionDto } {
  return {
    kind: 'REJECTED',
    response: { commandId, ok: false, publicRevision: revision, code },
  };
}

function commandIdFrom(value: unknown): string {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)['commandId'] === 'string'
    ? ((value as Record<string, unknown>)['commandId'] as string)
    : '';
}

function mapDomainError(error: string): CompanyCommandRejectionDto['code'] {
  return error === 'INSUFFICIENT_ITEMS' || error === 'INSUFFICIENT_STAMINA'
    ? error
    : error === 'CONTACT_OR_ACCESS_REQUIRED'
      ? error
      : error === 'IDEMPOTENCY_CONFLICT'
        ? 'IDEMPOTENCY_CONFLICT'
        : 'UNSUPPORTED_ACTION';
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isCanonicalJson(value: string): boolean {
  try {
    return canonicalJson(JSON.parse(value)) === value;
  } catch {
    return false;
  }
}
