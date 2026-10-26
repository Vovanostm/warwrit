import { sql, type Kysely, type Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';

export type WorldLabNpcKind = 'PATROL' | 'BANDITS' | 'WILDLIFE' | 'CREATURE';

export interface WorldLabNpcGroup {
  readonly worldId: string;
  readonly groupId: string;
  readonly kind: WorldLabNpcKind;
  readonly profileId: string;
  readonly mapEdition: string;
  readonly home: Readonly<Record<string, unknown>>;
  readonly state: Readonly<Record<string, unknown>>;
  readonly revision: string;
  readonly nextDecisionMs: string;
}

type SqlDatabase = Kysely<DatabaseSchema> | Transaction<DatabaseSchema>;

interface WorldLabNpcGroupRow {
  readonly world_id: string;
  readonly group_id: string;
  readonly kind: WorldLabNpcKind;
  readonly profile_id: string;
  readonly map_edition: string;
  readonly home: unknown;
  readonly state: unknown;
  readonly revision: string;
  readonly next_decision_ms: string;
}

function readObject(value: unknown, field: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`Invalid saved world lab NPC ${field}`);
  return value as Readonly<Record<string, unknown>>;
}

function fromRow(row: WorldLabNpcGroupRow): WorldLabNpcGroup {
  return {
    worldId: row.world_id,
    groupId: row.group_id,
    kind: row.kind,
    profileId: row.profile_id,
    mapEdition: row.map_edition,
    home: readObject(row.home, 'home'),
    state: readObject(row.state, 'state'),
    revision: row.revision,
    nextDecisionMs: row.next_decision_ms,
  };
}

export async function readWorldLabNpcGroups(
  database: SqlDatabase,
  worldId: string,
): Promise<readonly WorldLabNpcGroup[]> {
  const result = await sql<WorldLabNpcGroupRow>`
    select world_id, group_id, kind, profile_id, map_edition, home, state,
           revision::text as revision, next_decision_ms::text as next_decision_ms
      from world_lab_npc_groups
     where world_id = ${worldId}
     order by group_id
  `.execute(database);
  return result.rows.map(fromRow);
}

/** Inserts a lab's fixed NPC roster without resetting existing lives or routes. */
export async function ensureWorldLabNpcGroups(
  database: SqlDatabase,
  groups: readonly WorldLabNpcGroup[],
): Promise<void> {
  for (const group of groups) {
    await sql`
      insert into world_lab_npc_groups
        (world_id, group_id, kind, profile_id, map_edition, home, state,
         revision, next_decision_ms)
      values
        (${group.worldId}, ${group.groupId}, ${group.kind}, ${group.profileId},
         ${group.mapEdition}, ${JSON.stringify(group.home)}::jsonb,
         ${JSON.stringify(group.state)}::jsonb, ${group.revision}, ${group.nextDecisionMs})
      on conflict (world_id, group_id) do nothing
    `.execute(database);
  }
}

/** Replaces one canonical NPC plan/state under an optimistic revision guard. */
export async function updateWorldLabNpcGroup(
  database: SqlDatabase,
  input: {
    readonly prior: WorldLabNpcGroup;
    readonly state: Readonly<Record<string, unknown>>;
    readonly nextDecisionMs: string;
  },
): Promise<WorldLabNpcGroup> {
  const revision = (BigInt(input.prior.revision) + 1n).toString();
  const result = await sql<WorldLabNpcGroupRow>`
    update world_lab_npc_groups
       set state = ${JSON.stringify(input.state)}::jsonb,
           revision = ${revision},
           next_decision_ms = ${input.nextDecisionMs},
           updated_at = now()
     where world_id = ${input.prior.worldId}
       and group_id = ${input.prior.groupId}
       and revision = ${input.prior.revision}
    returning world_id, group_id, kind, profile_id, map_edition, home, state,
              revision::text as revision, next_decision_ms::text as next_decision_ms
  `.execute(database);
  const row = result.rows[0];
  if (!row) throw new Error('World lab NPC revision changed');
  return fromRow(row);
}
