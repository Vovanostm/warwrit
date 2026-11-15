import {
  campaignTickAt,
  createCampaignClock,
  ordinaryContractProfile,
  readOrdinaryContractState,
  type StoryCompanyState,
  type StoryEligibilitySource,
  type StoryWorldState,
  storyCompanyGenesis,
  storyWorldGenesis,
  readStoryCompanyState,
  readStoryWorldState,
  STORY_MISSION_ID,
} from '@warwrit/game-core';
import { sql, type Selectable, type Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import type { WorldClockReading } from '../world/clock.js';
import { readWorldLight, WORLD_LIGHT_CYCLE_MS } from '../world/clock.js';

type StoryWorldRow = Selectable<DatabaseSchema['story_world_states']>;
type StoryCompanyRow = Selectable<DatabaseSchema['story_company_states']>;
type OrdinaryRow = Selectable<DatabaseSchema['ordinary_contracts']>;
const millWorkerInstanceId = 'ci.m1.mill-worker.01' as const;

export interface StoryDeliveryEvidence {
  readonly identity: Pick<
    StoryEligibilitySource,
    'contractId' | 'companyId' | 'sourceEventId' | 'deliveredAtTick'
  >;
  readonly source: StoryEligibilitySource | undefined;
  readonly ordinaryRow: OrdinaryRow;
}

export function resolveStoryDeliveryTimeMs(
  receiptCreatedAtMs: number,
  simulationAtMs: string | null,
  qaOffsetMs: string,
): string | undefined {
  if (!/^(0|[1-9][0-9]*)$/u.test(qaOffsetMs))
    throw new TypeError('QA campaign clock offset is invalid');
  if (simulationAtMs !== null) {
    if (!/^(0|[1-9][0-9]*)$/u.test(simulationAtMs))
      throw new TypeError('Ordinary contract delivery simulation time is invalid');
    return simulationAtMs;
  }
  if (BigInt(qaOffsetMs) !== 0n) return undefined;
  if (!Number.isSafeInteger(receiptCreatedAtMs) || receiptCreatedAtMs < 0)
    throw new TypeError('Ordinary contract delivery receipt time is invalid');
  return String(receiptCreatedAtMs);
}

export function legacyDeliveryHasGuaranteedNightEnd(
  receiptCreatedAtMs: number,
  currentRealMs: string,
): boolean {
  if (
    !Number.isSafeInteger(receiptCreatedAtMs) ||
    receiptCreatedAtMs < 0 ||
    !/^(0|[1-9][0-9]*)$/u.test(currentRealMs)
  )
    throw new TypeError('Legacy story delivery time is invalid');
  return BigInt(currentRealMs) - BigInt(receiptCreatedAtMs) >= BigInt(WORLD_LIGHT_CYCLE_MS);
}

/** Requires an already completed ordinary rescue and its retained command receipt. */
export async function readStoryDeliveryEvidence(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  clock: WorldClockReading,
  qaOffsetMs: string,
): Promise<StoryDeliveryEvidence | undefined> {
  const profile = ordinaryContractProfile(millWorkerInstanceId);
  if (!profile) return undefined;
  const row = await transaction
    .selectFrom('ordinary_contracts')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('instance_id', '=', profile.instanceId)
    .executeTakeFirst();
  if (!row) return undefined;
  const state = readOrdinaryContractState(profile, row.state);
  if (!state.outcome) return undefined;
  if (
    row.profile_id !== profile.definitionId ||
    row.revision !== state.revision ||
    row.wallet_id !== profile.walletId ||
    !/^(0|[1-9][0-9]*)$/u.test(row.wallet_q)
  )
    throw new TypeError('Mill-worker issuer state is inconsistent');
  const outcome = state.outcome;
  const delivery = state.facts.find(
    (fact) =>
      fact.slotId === 'mill-worker-delivery' &&
      fact.companyId === outcome.companyId &&
      fact.sourceEventId === outcome.sourceEventId &&
      fact.atTick === outcome.atTick,
  );
  if (!delivery) throw new TypeError('Mill-worker success has no matching delivery fact');
  const commandPrefix = `ordinary-contract:${profile.instanceId}:`;
  if (!outcome.sourceEventId.startsWith(commandPrefix))
    throw new TypeError('Mill-worker delivery source is not a command receipt');
  const commandId = outcome.sourceEventId.slice(commandPrefix.length);
  const receipt = await transaction
    .selectFrom('ordinary_contract_receipts')
    .select(['command_id', 'response', 'created_at', 'simulation_at_ms'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', outcome.companyId)
    .where('instance_id', '=', profile.instanceId)
    .where('command_id', '=', commandId)
    .executeTakeFirst();
  if (
    !receipt ||
    typeof receipt.response !== 'object' ||
    receipt.response === null ||
    Array.isArray(receipt.response) ||
    (receipt.response as Record<string, unknown>)['ok'] !== true ||
    (receipt.response as Record<string, unknown>)['commandId'] !== commandId
  )
    throw new TypeError('Mill-worker delivery receipt is missing or inconsistent');

  const deliveryMsText = resolveStoryDeliveryTimeMs(
    receipt.created_at.getTime(),
    receipt.simulation_at_ms,
    qaOffsetMs,
  );
  const identity = {
    contractId: millWorkerInstanceId,
    companyId: outcome.companyId,
    sourceEventId: outcome.sourceEventId,
    deliveredAtTick: outcome.atTick,
  } as const;
  const availabilityBasis =
    deliveryMsText === undefined ? 'LEGACY_FULL_CYCLE_ELAPSED' : 'EXACT_SIMULATION_TIME';
  let source: StoryEligibilitySource | undefined;
  if (deliveryMsText === undefined) {
    const currentRealMs = (BigInt(clock.nowMs) - BigInt(qaOffsetMs)).toString();
    if (legacyDeliveryHasGuaranteedNightEnd(receipt.created_at.getTime(), currentRealMs)) {
      // Without an old offset journal, the exact historical night end is unknown.
      // Anchor the first proven-eligible read; world state keeps that tick immutable.
      source = { ...identity, availableAtTick: clock.tick, availabilityBasis };
    }
  } else {
    const deliveryMs = BigInt(deliveryMsText);
    const eventLight = readWorldLight({ ...clock, nowMs: deliveryMsText });
    const currentPhaseEnd =
      deliveryMs + BigInt(eventLight.phaseMs) - BigInt(eventLight.msIntoPhase);
    const nightEndMs =
      eventLight.phase === 'NIGHT'
        ? currentPhaseEnd
        : (() => {
            const night = readWorldLight({ ...clock, nowMs: currentPhaseEnd.toString() });
            if (night.phase !== 'NIGHT') throw new TypeError('Campaign light did not enter night');
            return currentPhaseEnd + BigInt(night.phaseMs);
          })();
    const availableAtTick = campaignTickAt(
      createCampaignClock(clock.epochMs, clock.startingTick),
      nightEndMs.toString(),
    );
    source = { ...identity, availableAtTick, availabilityBasis };
  }
  return {
    ordinaryRow: row,
    identity,
    source,
  };
}

export async function lockStoryWorld(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  source: StoryEligibilitySource,
): Promise<{ readonly row: StoryWorldRow; readonly state: StoryWorldState }> {
  await transaction
    .insertInto('story_world_states')
    .values({
      world_id: worldId,
      mission_id: STORY_MISSION_ID,
      definition_version: 1,
      revision: '0',
      state: storyWorldGenesis(source),
    })
    .onConflict((conflict) => conflict.columns(['world_id', 'mission_id']).doNothing())
    .execute();
  const row = await transaction
    .selectFrom('story_world_states')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('mission_id', '=', 'sm.m1.cache-disclosure.01')
    .forUpdate()
    .executeTakeFirst();
  if (!row) throw new Error('Story world state could not be locked');
  const state = validateStoryWorldRow(row, source, source);
  return { row, state };
}

function validateStoryWorldRow(
  row: StoryWorldRow,
  identity: StoryDeliveryEvidence['identity'],
  source?: StoryEligibilitySource,
): StoryWorldState {
  const state = readStoryWorldState(row.state);
  if (
    row.definition_version !== state.definitionVersion ||
    row.revision !== state.revision ||
    state.eligibilitySource.contractId !== identity.contractId ||
    state.eligibilitySource.companyId !== identity.companyId ||
    state.eligibilitySource.sourceEventId !== identity.sourceEventId ||
    state.eligibilitySource.deliveredAtTick !== identity.deliveredAtTick ||
    (state.eligibilitySource.availabilityBasis !== undefined &&
      source !== undefined &&
      (state.eligibilitySource.availabilityBasis !== source.availabilityBasis ||
        (source.availabilityBasis === 'EXACT_SIMULATION_TIME' &&
          state.eligibilitySource.availableAtTick !== source.availableAtTick)))
  )
    throw new TypeError('Story world row does not match its trusted rescue source');
  return state;
}

export async function readStoryWorldIfPresent(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  identity: StoryDeliveryEvidence['identity'],
  source?: StoryEligibilitySource,
): Promise<StoryWorldState | undefined> {
  const row = await transaction
    .selectFrom('story_world_states')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('mission_id', '=', STORY_MISSION_ID)
    .executeTakeFirst();
  return row ? validateStoryWorldRow(row, identity, source) : undefined;
}

export async function lockStoryCompany(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  world: StoryWorldState,
): Promise<{ readonly row: StoryCompanyRow; readonly state: StoryCompanyState }> {
  await transaction
    .insertInto('story_company_states')
    .values({
      world_id: worldId,
      mission_id: world.missionId,
      company_id: companyId,
      definition_version: world.definitionVersion,
      revision: '0',
      state: storyCompanyGenesis(companyId, world),
    })
    .onConflict((conflict) =>
      conflict.columns(['world_id', 'mission_id', 'company_id']).doNothing(),
    )
    .execute();
  const row = await transaction
    .selectFrom('story_company_states')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('mission_id', '=', world.missionId)
    .where('company_id', '=', companyId)
    .forUpdate()
    .executeTakeFirst();
  if (!row) throw new Error('Story company state could not be locked');
  const state = readStoryCompanyState(row.state);
  if (
    row.definition_version !== state.definitionVersion ||
    row.revision !== state.revision ||
    state.companyId !== companyId
  )
    throw new TypeError('Story company row does not match its authenticated company');
  return { row, state };
}

export async function saveStoryStates(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly worldId: string;
    readonly companyId: string;
    readonly world: StoryWorldState;
    readonly company: StoryCompanyState;
    readonly previousWorldRevision: string;
    readonly previousCompanyRevision: string;
  },
): Promise<void> {
  const worldUpdated = await transaction
    .updateTable('story_world_states')
    .set({ revision: input.world.revision, state: input.world, updated_at: sql<Date>`now()` })
    .where('world_id', '=', input.worldId)
    .where('mission_id', '=', input.world.missionId)
    .where('revision', '=', input.previousWorldRevision)
    .executeTakeFirst();
  if (Number(worldUpdated.numUpdatedRows) !== 1) throw new Error('Story world CAS failed');
  const companyUpdated = await transaction
    .updateTable('story_company_states')
    .set({ revision: input.company.revision, state: input.company, updated_at: sql<Date>`now()` })
    .where('world_id', '=', input.worldId)
    .where('mission_id', '=', input.company.missionId)
    .where('company_id', '=', input.companyId)
    .where('revision', '=', input.previousCompanyRevision)
    .executeTakeFirst();
  if (Number(companyUpdated.numUpdatedRows) !== 1) throw new Error('Story company CAS failed');
}
