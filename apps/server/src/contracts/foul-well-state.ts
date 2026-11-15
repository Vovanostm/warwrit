import { ordinaryContractProfile, readOrdinaryContractState } from '@warwrit/game-core';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';

export const FOUL_WELL_CHAPEL_BASE_PRICE_Q = '5000000';

export interface FoulWellOutcome {
  readonly companyId: string;
  readonly atTick: string;
  readonly sourceEventId: string;
  readonly slotId: 'foul-well-truth-reported' | 'foul-well-aghafya-accused';
}

/** Canonical saved ending shared by quest, chapel service, herbalist shop and later offers. */
export async function readFoulWellOutcome(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<FoulWellOutcome | undefined> {
  const profile = ordinaryContractProfile('ci.m1.foul-well.01');
  if (!profile) return undefined;
  const row = await transaction
    .selectFrom('ordinary_contracts')
    .select(['profile_id', 'state'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', profile.instanceId)
    .executeTakeFirst();
  if (!row || row.profile_id !== profile.definitionId) return undefined;
  const state = readOrdinaryContractState(profile, row.state, row.profile_id);
  if (!state.outcome) return undefined;
  const fact = state.facts.find(
    (entry) =>
      entry.companyId === state.outcome!.companyId &&
      entry.sourceEventId === state.outcome!.sourceEventId &&
      entry.atTick === state.outcome!.atTick &&
      (entry.slotId === 'foul-well-truth-reported' || entry.slotId === 'foul-well-aghafya-accused'),
  );
  return fact
    ? {
        companyId: state.outcome.companyId,
        atTick: state.outcome.atTick,
        sourceEventId: state.outcome.sourceEventId,
        slotId: fact.slotId as FoulWellOutcome['slotId'],
      }
    : undefined;
}

export function foulWellHerbalistRemoved(outcome: FoulWellOutcome | undefined, worldTick: string) {
  return Boolean(
    outcome?.slotId === 'foul-well-aghafya-accused' &&
    BigInt(worldTick) >= BigInt(outcome.atTick) + 7000n,
  );
}

export function foulWellCarePriceQ(outcome: FoulWellOutcome | undefined, companyId: string) {
  return outcome?.slotId === 'foul-well-truth-reported' && outcome.companyId === companyId
    ? (BigInt(FOUL_WELL_CHAPEL_BASE_PRICE_Q) * 2n).toString()
    : FOUL_WELL_CHAPEL_BASE_PRICE_Q;
}
