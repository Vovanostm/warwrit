import { createHash } from 'node:crypto';

import type { FastifyRequest } from 'fastify';
import { sql, type Kysely } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';

const sessionCookie = 'warwrit_session';

interface SessionAccountRow {
  readonly account_id: string;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export async function resolveSessionAccount(
  request: FastifyRequest,
  database: Kysely<DatabaseSchema>,
): Promise<string | undefined> {
  const token = request.cookies?.[sessionCookie];
  if (token === undefined) return undefined;
  const result = await sql<SessionAccountRow>`
    select account_id
    from identity_sessions
    where token_digest = ${digest(token)}
      and revoked_at is null
      and expires_at > now()
  `.execute(database);
  return result.rows[0]?.account_id;
}
