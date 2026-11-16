import type { Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import type { FirstHuntWorldState } from '../contracts/first-hunt-runtime.js';

/** The caller holds the contract lock when using this result to accept JOIN. */
export async function readHuntAttempt(
  transaction: Transaction<DatabaseSchema>,
  world: FirstHuntWorldState,
) {
  const admission = await transaction
    .selectFrom('encounter_admissions as a')
    .innerJoin('encounters as e', 'e.id', 'a.encounter_id')
    .select([
      'a.encounter_id',
      'a.attempt_no',
      'a.terminal_revision',
      'a.effects_source_id',
      'a.effects_applied_at',
      'e.status',
      'e.revision',
    ])
    .where('a.world_id', '=', world.worldId)
    .where('a.instance_id', '=', world.instanceId)
    .where('a.is_current', '=', true)
    .executeTakeFirst();
  if (!admission) return { admission, joinAttemptNo: 1, repeatAvailable: false };

  const proof = await transaction
    .selectFrom('world_proof_claims as p')
    .innerJoin('encounter_admissions as a', 'a.encounter_id', 'p.encounter_id')
    .select('p.item_id')
    .where('a.world_id', '=', world.worldId)
    .where('a.instance_id', '=', world.instanceId)
    .executeTakeFirst();
  const repeatAvailable =
    admission.status === 'resolved' &&
    admission.terminal_revision === admission.revision &&
    admission.effects_applied_at !== null &&
    admission.effects_source_id ===
      `first-hunt-terminal:${admission.encounter_id}:${admission.terminal_revision}` &&
    proof === undefined &&
    world.hostiles.some((hostile) => hostile.currentPools['health']! > 0);
  return {
    admission,
    repeatAvailable,
    joinAttemptNo: repeatAvailable ? admission.attempt_no + 1 : undefined,
  };
}
