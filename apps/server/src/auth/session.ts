import { createHash } from 'node:crypto';

import { fastifyCookie } from '@fastify/cookie';
import type { FastifyRequest } from 'fastify';
import { sql, type Kysely } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';

const sessionCookie = 'warwrit_session';

interface SessionAccountRow {
  readonly account_id: string;
  readonly token_digest: Buffer;
}

export interface ActiveSessionPrincipal {
  readonly accountId: string;
  readonly tokenDigest: string;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export async function resolveSessionAccount(
  request: FastifyRequest,
  database: Kysely<DatabaseSchema>,
): Promise<string | undefined> {
  return (await resolveSessionPrincipalFromCookieHeader(request.headers.cookie, database))
    ?.accountId;
}

export async function resolveSessionPrincipalFromCookieHeader(
  cookieHeader: string | undefined,
  database: Kysely<DatabaseSchema>,
): Promise<ActiveSessionPrincipal | undefined> {
  if (cookieHeader === undefined) return undefined;
  const token = fastifyCookie.parse(cookieHeader)[sessionCookie];
  if (token === undefined) return undefined;
  const result = await sql<SessionAccountRow>`
    select account_id, token_digest
    from identity_sessions
    where token_digest = ${digest(token)}
      and revoked_at is null
      and expires_at > now()
  `.execute(database);
  const row = result.rows[0];
  return row === undefined
    ? undefined
    : { accountId: row.account_id, tokenDigest: row.token_digest.toString('hex') };
}

export async function isSessionTokenActive(
  database: Kysely<DatabaseSchema>,
  principal: ActiveSessionPrincipal,
): Promise<boolean> {
  const result = await sql<{ readonly active: boolean }>`
    select exists (
      select 1 from identity_sessions
      where token_digest = ${Buffer.from(principal.tokenDigest, 'hex')}
        and account_id = ${principal.accountId}
        and revoked_at is null
        and expires_at > now()
    ) as active
  `.execute(database);
  return result.rows[0]?.active === true;
}
