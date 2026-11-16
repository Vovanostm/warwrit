import { sql, type Kysely } from 'kysely';
import type { WorldLabPursuitDto } from '@warwrit/protocol';
import type { DatabaseSchema } from '../db/database.js';

export async function readWorldLabPursuit(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  companyId: string,
): Promise<WorldLabPursuitDto | null> {
  const result = await sql<WorldLabPursuitDto>`
    select order_id::text as "orderId", target_id as "targetId", target_name as "targetName", last_point as "lastPoint",
           status, movement_epoch::text as "movementEpoch"
      from world_lab_pursuits where world_id = ${worldId} and company_id = ${companyId}
  `.execute(database);
  return result.rows[0] ?? null;
}

export async function storeWorldLabPursuit(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  companyId: string,
  pursuit: WorldLabPursuitDto,
): Promise<void> {
  await sql`
    insert into world_lab_pursuits
      (world_id, company_id, order_id, target_id, target_name, last_point, status, movement_epoch)
    values (${worldId}, ${companyId}, ${pursuit.orderId}, ${pursuit.targetId}, ${pursuit.targetName},
            ${JSON.stringify(pursuit.lastPoint)}::jsonb, ${pursuit.status}, ${pursuit.movementEpoch})
    on conflict (world_id, company_id) do update set
      order_id = excluded.order_id, target_id = excluded.target_id, target_name = excluded.target_name,
      last_point = excluded.last_point, status = excluded.status,
      movement_epoch = excluded.movement_epoch
  `.execute(database);
}

export async function clearWorldLabPursuit(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  companyId: string,
): Promise<void> {
  await sql`delete from world_lab_pursuits
    where world_id = ${worldId} and company_id = ${companyId}`.execute(database);
}
