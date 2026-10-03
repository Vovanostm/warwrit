import { createHash, randomUUID } from 'node:crypto';

import * as combat from '@warwrit/game-core';
import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  campaignTick,
  canonicalRevision,
  canonicalJson,
  parseCompanyCommand,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, EncounterCompanySource } from '@warwrit/game-core';
import type { Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import type { FirstHuntWorldState } from '../contracts/first-hunt-runtime.js';
import { persistFirstHuntBinding } from '../contracts/repository.js';
import { updateCompanyAggregateWithReceipt } from '../company/repository.js';
import { prepareTrustedCompanyCommand, stableCompanyRequestKey } from '../company/executor.js';
import { travelAdvanceSourceEventId } from '../company/travel-food.js';

const HUMAN_DEADLINE_MS = 30_000;
const HUMAN_DEADLINE_POLICY = 'first-hunt-human-deadline-v1';

interface JoinIntent {
  readonly companyId: string;
  readonly accountId: string;
  readonly publicRevision: string;
  readonly campaignTick: string;
}

export interface FirstHuntContractForAdmission {
  readonly world_id: string;
  readonly instance_id: string;
  readonly owner_company_id: string | null;
  readonly helper_company_id: string | null;
  readonly owner_join: unknown | null;
  readonly helper_join: unknown | null;
}

/** Caller owns the sorted company roots, clock, world row and contract row locks. */
export async function admitFirstHuntInTransaction(input: {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly worldId: string;
  readonly contract: FirstHuntContractForAdmission;
  readonly companyStates: ReadonlyMap<string, CompanyCombatAggregateState>;
  readonly world: FirstHuntWorldState;
  readonly atTick: string;
  readonly now: Date;
}): Promise<string | undefined> {
  const { transaction, worldId, contract, companyStates, world, atTick, now } = input;
  const profile = combat.huntProfile(contract.instance_id);
  if (
    !profile ||
    contract.world_id !== worldId ||
    contract.owner_company_id === null ||
    world.worldId !== worldId ||
    world.instanceId !== profile.instanceId ||
    world.profileId !== profile.profileId ||
    world.hostiles.some((hostile) => hostile.currentPools['health'] === 0)
  )
    return undefined;

  const existingAdmission = await transaction
    .selectFrom('encounter_admissions')
    .select('encounter_id')
    .where('world_id', '=', worldId)
    .where('instance_id', '=', contract.instance_id)
    .forUpdate()
    .executeTakeFirst();
  if (existingAdmission) return undefined;

  const joinRows: JoinIntent[] = [];
  const ownerJoin = readJoinIntent(contract.owner_join, contract.owner_company_id);
  if (!ownerJoin) return undefined;
  joinRows.push(ownerJoin);
  if (contract.helper_company_id !== null) {
    const helperJoin = readJoinIntent(contract.helper_join, contract.helper_company_id);
    if (!helperJoin) return undefined;
    joinRows.push(helperJoin);
  }

  const sourceEntries: EncounterCompanySource[] = [];
  const companyAccounts = new Map<string, string>();
  const statesAtTick = new Map<string, CompanyCombatAggregateState>();
  const campaignAdvances: {
    readonly previous: CompanyCombatAggregateState;
    readonly prepared: Extract<
      Awaited<ReturnType<typeof prepareTrustedCompanyCommand>>,
      { readonly kind: 'PREPARED' }
    >['prepared'];
  }[] = [];
  const orderedCompanies = joinRows.toSorted((a, b) => compareCodeUnits(a.companyId, b.companyId));
  for (const join of orderedCompanies) {
    const previous = companyStates.get(join.companyId);
    if (!previous || BigInt(join.campaignTick) > BigInt(atTick)) return undefined;
    const previousLifecycle = previous.economy.lifecycle;
    const previousPhysical = previous.economy.physical;
    if (
      join.publicRevision !== previousLifecycle.knowledge.revision ||
      !previousPhysical ||
      previousLifecycle.worldId !== worldId ||
      previousLifecycle.companyId !== join.companyId ||
      BigInt(previousLifecycle.campaignTick) > BigInt(atTick) ||
      previous.economy.finance.processedTick !== previousLifecycle.campaignTick ||
      previousPhysical.processedTick !== previousLifecycle.campaignTick ||
      previousLifecycle.parties.length !== 1
    )
      return undefined;

    let state = previous;
    if (previousLifecycle.campaignTick !== atTick) {
      const party = previousLifecycle.parties[0]!;
      if (party.location.kind !== 'AT') return undefined;
      const commandId = randomUUID();
      const sourceEventId = travelAdvanceSourceEventId(worldId, join.companyId, commandId);
      const parsed = parseCompanyCommand({
        schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
        commandId,
        sourceEventId,
        worldId,
        companyId: join.companyId,
        actorRef: { kind: 'SYSTEM', id: 'world-travel' },
        expectedRevision: canonicalRevision(previousLifecycle.revision),
        campaignTick: atTick,
        rulesetId: COMPANY_RULESET_ID,
        type: 'AdvanceCampaign',
        payload: { toTick: atTick, authoritativeInputs: [] },
      });
      if (!parsed.ok) return undefined;
      const identity = {
        kind: 'WORLD_REQUEST' as const,
        worldId,
        companyId: join.companyId,
        commandId,
        // The stable key names the request, not its execution time: `toTick` is
        // execution authority and is rejected inside a stable world request key.
        requestKey: canonicalJson({
          kind: 'FIRST_HUNT_JOIN_CATCH_UP',
          instanceId: contract.instance_id,
        }),
      };
      const prepared = await prepareTrustedCompanyCommand({
        transaction,
        accountId: join.accountId,
        lockedPriorState: previous,
        command: parsed.command,
        stableRequestKey: stableCompanyRequestKey(identity),
        expectedPublicRevision: previousLifecycle.knowledge.revision,
        travelMode: 'DEPARTURE',
        travelFoodRouteBoundary: {
          kind: 'DEPARTURE',
          partyId: party.partyId,
          location: party.location,
          settledThroughTick: atTick,
        },
        context: {
          worldId,
          companyId: join.companyId,
          principal: { kind: 'SYSTEM', id: 'world-travel' },
          publicRevision: previousLifecycle.knowledge.revision,
          canonicalRevision: previousLifecycle.revision,
          atTick: campaignTick(atTick),
          completeGraph: true,
          contactIds: [],
          internalGrant: {
            commandId,
            sourceEventId,
            canonicalRequest: canonicalJson(parsed.command),
          },
          facts: [],
          financeFacts: [],
          physicalFacts: [],
          practiceFacts: [],
          trustedTransitSegments: [],
        },
      });
      if (prepared.kind !== 'PREPARED') return undefined;
      state = prepared.prepared.nextState;
      campaignAdvances.push({ previous, prepared: prepared.prepared });
    }

    // JOIN records durable player consent. Its original revision and tick identify that
    // consent; current location, ownership and party eligibility are checked below.
    statesAtTick.set(join.companyId, state);
    const lifecycle = state.economy.lifecycle;
    const physical = state.economy.physical;
    if (
      !physical ||
      lifecycle.campaignTick !== atTick ||
      state.economy.finance.processedTick !== atTick ||
      physical.processedTick !== atTick
    )
      return undefined;

    const party = lifecycle.parties[0]!;
    const location = party.location;
    if (
      location.kind !== 'AT' ||
      location.siteId !== profile.objectiveLocation.siteId ||
      location.areaId !== profile.objectiveLocation.areaId ||
      state.encounter.active !== null
    )
      return undefined;
    const owner = await transaction
      .selectFrom('company_account_owners')
      .select('account_id')
      .where('world_id', '=', worldId)
      .where('company_id', '=', join.companyId)
      .executeTakeFirst();
    if (owner?.account_id !== join.accountId) return undefined;
    companyAccounts.set(join.companyId, owner.account_id);
    sourceEntries.push({
      root: { lifecycle, finance: state.economy.finance, physical },
      context: {
        worldId,
        companyId: join.companyId,
        principal: { kind: 'SYSTEM', id: 'first-hunt-runtime' },
        publicRevision: lifecycle.knowledge.revision,
        canonicalRevision: lifecycle.revision,
        atTick: combat.campaignTick(atTick),
        completeGraph: true,
        contactIds: lifecycle.characters.map((character) => character.identity.characterId),
        facts: [],
      },
    });
  }

  const totalMembers = sourceEntries.reduce((sum, source) => {
    const partyId = source.root.lifecycle.parties[0]!.partyId;
    return (
      sum +
      source.root.lifecycle.characters.filter(
        (character) => character.presence.fieldPartyId === partyId,
      ).length
    );
  }, 0);
  if (totalMembers > profile.alliedSlots.length || totalMembers + world.hostiles.length > 12)
    return undefined;

  const encounterId = randomUUID();
  const bindingId = `first-hunt-binding-${encounterId}`;
  const alliedSideId = combat.sideId('first-hunt-companies');
  const hostileSideId = combat.sideId('first-hunt-hostiles');
  let slotIndex = 0;
  const parties = orderedCompanies.map((join) => {
    const source = sourceEntries.find(
      (entry) => entry.root.lifecycle.companyId === join.companyId,
    )!;
    const party = source.root.lifecycle.parties[0]!;
    const members = source.root.lifecycle.characters
      .filter((character) => character.presence.fieldPartyId === party.partyId)
      .toSorted((a, b) => compareCodeUnits(a.identity.characterId, b.identity.characterId));
    return {
      companyId: join.companyId,
      partyId: party.partyId,
      revision: source.root.lifecycle.revision,
      sideId: alliedSideId,
      members: members.map((character) => ({
        characterId: character.identity.characterId,
        unitId: combat.unitId(character.identity.characterId),
        position: profile.alliedSlots[slotIndex++]!,
      })),
    };
  });
  const worldParticipants = world.hostiles.map((hostile) => ({
    entityId: hostile.entityId,
    sourceId: `first-hunt:${worldId}:${hostile.entityId}:genesis`,
    unitId: combat.unitId(hostile.entityId),
    sideId: hostileSideId,
    position: hostile.position,
    weaponId: firstHuntWeaponId(hostile.weaponId),
    attributes: {
      accuracy: hostile.attributes['accuracy']!,
      armor: hostile.attributes['armor']!,
      defense: hostile.attributes['defense']!,
      health: hostile.attributes['health']!,
      initiative: hostile.attributes['initiative']!,
      morale: hostile.attributes['morale']!,
      stamina: hostile.attributes['stamina']!,
    },
    initialPools: {
      health: hostile.currentPools['health']!,
      armor: hostile.currentPools['armor']!,
      stamina: hostile.currentPools['stamina']!,
      morale: hostile.currentPools['morale']!,
    },
  }));
  const evidence = {
    id: `first-hunt:${worldId}:${encounterId}`,
    sourceEventId: `first-hunt:${worldId}:${profile.instanceId}:activation`,
    version: combat.FIRST_HUNT_WORLD_BINDING_VERSION,
    bindingId,
    worldId,
    atTick: combat.campaignTick(atTick),
    location: {
      kind: 'AT' as const,
      ...profile.objectiveLocation,
    },
    setup: {
      schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION,
      battleId: combat.battleId(encounterId),
      rulesetId: combat.M1_DOMAIN_BRIDGE_V2_RULESET_ID,
      seed: world.seed,
      map: profile.combatMap,
      sides: [
        { id: alliedSideId, retreatHexes: profile.retreatHexes.allied },
        { id: hostileSideId, retreatHexes: profile.retreatHexes.hostile },
      ] as const,
    },
    parties,
    worldParticipants,
  };

  const begun = new Map<string, ReturnType<typeof combat.prepareBeginCombatAggregate>>();
  for (const source of sourceEntries) {
    const state = statesAtTick.get(source.root.lifecycle.companyId);
    if (!state) return undefined;
    const result = combat.prepareBeginCombatAggregate(
      state,
      sourceEntries,
      { bindingId, battleId: combat.battleId(encounterId) },
      evidence,
    );
    if (result.kind !== 'PREPARED') return undefined;
    begun.set(source.root.lifecycle.companyId, result);
  }
  const first = begun.values().next().value;
  if (!first || first.kind !== 'PREPARED') return undefined;
  const binding = first.binding;
  if (
    sourceEntries.some((source) => {
      const result = begun.get(source.root.lifecycle.companyId);
      return (
        result?.kind !== 'PREPARED' ||
        combat.canonicalJson(result.binding) !== combat.canonicalJson(binding)
      );
    })
  )
    return undefined;

  const initial = binding.initial;
  const activation = initial.state.activation;
  if (!activation) return undefined;
  const activatedUnit = initial.state.units.find((unit) => unit.id === activation.unitId);
  if (!activatedUnit) return undefined;
  const activatedHostile = worldParticipants.find((unit) => unit.unitId === activation.unitId);
  const activatedAccount = activatedHostile
    ? undefined
    : sourceEntries
        .flatMap((source) =>
          binding.participants.filter(
            (participant) => participant.companyId === source.root.lifecycle.companyId,
          ),
        )
        .find((participant) => participant.unitId === activation.unitId)?.companyId;
  const accountId = activatedAccount ? companyAccounts.get(activatedAccount) : undefined;
  const deadlineAt = activatedHostile ? null : new Date(now.getTime() + HUMAN_DEADLINE_MS);
  const aiWakeAt = activatedHostile ? now : null;

  await transaction
    .insertInto('encounters')
    .values({
      id: encounterId,
      world_id: worldId,
      schema_version: combat.COMBAT_V2_SCHEMA_VERSION,
      setup: binding.setup,
      state: initial.state,
      revision: initial.state.revision,
      status: initial.state.status,
      activation_id: activation.id,
      activation_epoch: 1,
      deadline_at: deadlineAt,
      ai_wake_at: aiWakeAt,
    })
    .execute();
  for (const join of orderedCompanies) {
    const participant = binding.participants.filter((entry) => entry.companyId === join.companyId);
    await transaction
      .insertInto('encounter_participants')
      .values({
        encounter_id: encounterId,
        account_id: companyAccounts.get(join.companyId)!,
        side_id: alliedSideId,
        unit_ids: JSON.stringify(participant.map((entry) => entry.unitId)),
        admission_source: 'company_binding',
      })
      .execute();
  }
  for (const hostile of world.hostiles) {
    await transaction
      .insertInto('encounter_ai_controllers')
      .values({
        encounter_id: encounterId,
        unit_id: hostile.entityId,
        doctrine: hostile.doctrine,
        admission_source: 'world_hostile',
      })
      .execute();
  }
  for (const [ordinal, event] of initial.events.entries()) {
    await transaction
      .insertInto('encounter_events')
      .values({
        encounter_id: encounterId,
        revision: 0,
        ordinal,
        event_id: `${encounterId}:0:${ordinal}`,
        event,
      })
      .execute();
  }
  await transaction
    .insertInto('encounter_admissions')
    .values({
      encounter_id: encounterId,
      world_id: worldId,
      instance_id: contract.instance_id,
      binding_version: 2,
      binding,
      terminal_revision: null,
      effects_source_id: null,
      effects_applied_at: null,
    })
    .execute();
  if (!activatedHostile) {
    if (!accountId) throw new TypeError('FIRST HUNT opening activation is not participant-owned');
    const timeoutCommandId = firstHuntTimeoutCommandId(
      encounterId,
      activation.id,
      HUMAN_DEADLINE_POLICY,
    );
    await transaction
      .insertInto('encounter_activation_policies')
      .values({
        encounter_id: encounterId,
        activation_id: activation.id,
        activation_epoch: 1,
        account_id: accountId,
        unit_id: activation.unitId,
        policy_version: HUMAN_DEADLINE_POLICY,
        mode: 'HUMAN',
        started_at: now,
        deadline_at: deadlineAt!,
        campaign_tick: atTick,
        timeout_command_id: timeoutCommandId,
      })
      .execute();
  }

  for (const source of sourceEntries) {
    const result = begun.get(source.root.lifecycle.companyId);
    if (result?.kind !== 'PREPARED') throw new TypeError('FIRST HUNT company binding is missing');
    const catchUp = campaignAdvances.find(
      (entry) => entry.previous.economy.lifecycle.companyId === source.root.lifecycle.companyId,
    );
    const stateAtTick = statesAtTick.get(source.root.lifecycle.companyId);
    if (!stateAtTick) throw new TypeError('FIRST HUNT caught-up company root is missing');
    if (catchUp) {
      const prepared = catchUp.prepared;
      await updateCompanyAggregateWithReceipt(
        transaction,
        catchUp.previous.economy.lifecycle.revision,
        stateAtTick.economy.lifecycle.revision,
        stateAtTick,
        {
          receipt: {
            receiptId: randomUUID(),
            commandId: prepared.command.commandId,
            sourceKey: prepared.sourceKey,
            requestKey: prepared.stableRequestKey,
            response: prepared.response,
            resultingRevision: stateAtTick.economy.lifecycle.revision,
          },
          command: prepared.command,
          auditEvents: prepared.events.map((event) => ({
            ...event,
            revision: stateAtTick.economy.lifecycle.revision,
          })),
        },
      );
    }
    await persistFirstHuntBinding(transaction, {
      previous: statesAtTick.get(source.root.lifecycle.companyId)!,
      next: result.next,
      encounterId,
      bindingId,
    });
  }
  return encounterId;
}

function readJoinIntent(value: unknown, companyId: string): JoinIntent | undefined {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).toSorted().join('\0') !==
      ['accountId', 'campaignTick', 'companyId', 'publicRevision'].join('\0')
  )
    return undefined;
  const row = value as Record<string, unknown>;
  return row['companyId'] === companyId &&
    typeof row['accountId'] === 'string' &&
    typeof row['publicRevision'] === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(row['publicRevision']) &&
    typeof row['campaignTick'] === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(row['campaignTick'])
    ? {
        companyId,
        accountId: row['accountId'],
        publicRevision: row['publicRevision'],
        campaignTick: row['campaignTick'],
      }
    : undefined;
}

export function firstHuntTimeoutCommandId(
  encounterId: string,
  activationId: string,
  policyVersion: string,
): string {
  return `timeout-${createHash('sha256')
    .update(
      JSON.stringify([
        'warwrit:first-hunt:timeout-command:v1',
        encounterId,
        activationId,
        policyVersion,
      ]),
      'utf8',
    )
    .digest('hex')}`;
}

function firstHuntWeaponId(value: string): combat.BattleSetupV2['units'][number]['weaponId'] {
  switch (value) {
    case 'bow':
    case 'great-weapon':
    case 'raider':
      return value;
    default:
      throw new TypeError('FIRST HUNT hostile weapon is outside the V2 combat profile');
  }
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
