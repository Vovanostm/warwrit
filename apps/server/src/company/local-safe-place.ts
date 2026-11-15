import { HUNT_PROFILES } from '@warwrit/game-core';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import { readHuntWorldState, selectHuntWorldRow } from '../contracts/first-hunt-runtime.js';

/** Any living hostile of a hunt standing at this site makes a local service unsafe. */
export async function localSiteHasHostiles(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  siteId: string,
): Promise<boolean> {
  for (const hunt of HUNT_PROFILES) {
    if (hunt.objectiveLocation.siteId !== siteId) continue;
    const row = await selectHuntWorldRow(transaction, worldId, hunt, false);
    if (!row) continue;
    if (
      readHuntWorldState(worldId, hunt, row).hostiles.some(
        (hostile) => (hostile.currentPools['health'] ?? 0) > 0,
      )
    )
      return true;
  }
  return false;
}
