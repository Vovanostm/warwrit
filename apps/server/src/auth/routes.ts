import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import cookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { sql, type Kysely } from 'kysely';
import * as oidc from 'openid-client';

import type { IdentityConfig } from '../config.js';
import type { DatabaseSchema } from '../db/database.js';
import { resolveSessionAccount } from './session.js';

const sessionCookie = 'warwrit_session';
const flowCookie = 'warwrit_oidc_flow';
const flowLifetimeSeconds = 5 * 60;
const sessionLifetimeSeconds = 30 * 24 * 60 * 60;

interface OidcFlow {
  readonly browser_digest: Buffer;
  readonly code_verifier: string;
  readonly nonce: string;
  readonly expires_at: Date;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

function sessionCookieOptions(config: IdentityConfig) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.secureCookies,
    maxAge: sessionLifetimeSeconds,
  };
}

function flowCookieOptions(config: IdentityConfig) {
  return {
    path: '/auth',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.secureCookies,
    maxAge: flowLifetimeSeconds,
  };
}

function exactOrigin(request: FastifyRequest): string | undefined {
  const origin = request.headers.origin;
  return typeof origin === 'string' ? origin : undefined;
}

async function createOidcConfiguration(config: IdentityConfig): Promise<oidc.Configuration> {
  const execute = [oidc.enableNonRepudiationChecks];
  if (config.issuer.startsWith('http://')) {
    execute.push(oidc.allowInsecureRequests);
  }
  return oidc.discovery(
    new URL(config.issuer),
    config.clientId,
    { client_secret: config.clientSecret },
    oidc.ClientSecretPost(config.clientSecret),
    { execute },
  );
}

export interface IdentityRoutesOptions {
  readonly config: IdentityConfig;
  readonly database: Kysely<DatabaseSchema>;
}

export function registerIdentityRoutes(app: FastifyInstance, options: IdentityRoutesOptions): void {
  const { config, database } = options;
  let oidcConfiguration: Promise<oidc.Configuration> | undefined;
  const getOidcConfiguration = () => {
    if (oidcConfiguration === undefined) {
      const pending = createOidcConfiguration(config).catch((error: unknown) => {
        if (oidcConfiguration === pending) {
          oidcConfiguration = undefined;
        }
        throw error;
      });
      oidcConfiguration = pending;
    }
    return oidcConfiguration;
  };

  app.register(cookie);
  app.addHook('preHandler', async (request, reply) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      exactOrigin(request) !== config.publicOrigin
    ) {
      return reply.code(403).send({ error: 'request origin rejected' });
    }
  });

  app.get('/auth/login', async (_request, reply) => {
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const browserBinding = randomToken();
    try {
      const client = await getOidcConfiguration();
      const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
      const authorizationUrl = oidc.buildAuthorizationUrl(client, {
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      await sql`delete from identity_oidc_flows where expires_at <= now()`.execute(database);
      await database
        .insertInto('identity_oidc_flows')
        .values({
          state_digest: digest(state),
          browser_digest: digest(browserBinding),
          code_verifier: codeVerifier,
          nonce,
          expires_at: new Date(Date.now() + flowLifetimeSeconds * 1000),
        })
        .execute();
      reply.setCookie(flowCookie, browserBinding, flowCookieOptions(config));
      return reply.redirect(authorizationUrl.href);
    } catch {
      return reply.code(503).send({ error: 'identity provider unavailable' });
    }
  });

  app.get('/auth/callback', async (request, reply) => {
    const rawUrl = request.raw.url ?? '';
    const query = new URL(rawUrl, 'http://callback.invalid').searchParams;
    const state = query.get('state');
    const browserBinding = request.cookies[flowCookie];
    if (state === null || state.length > 256 || browserBinding === undefined) {
      reply.clearCookie(flowCookie, {
        path: '/auth',
        secure: config.secureCookies,
        sameSite: 'lax',
      });
      return reply.code(400).send({ error: 'identity callback rejected' });
    }

    const consumedFlow = await database.transaction().execute(async (transaction) => {
      const result = await sql<OidcFlow>`
        delete from identity_oidc_flows
        where state_digest = ${digest(state)}
        returning browser_digest, code_verifier, nonce, expires_at
      `.execute(transaction);
      return result.rows[0];
    });
    if (
      consumedFlow === undefined ||
      consumedFlow.expires_at.getTime() <= Date.now() ||
      !timingSafeEqual(consumedFlow.browser_digest, digest(browserBinding))
    ) {
      reply.clearCookie(flowCookie, {
        path: '/auth',
        secure: config.secureCookies,
        sameSite: 'lax',
      });
      return reply.code(400).send({ error: 'identity callback rejected' });
    }

    try {
      const client = await getOidcConfiguration();
      const callbackUrl = new URL(
        `${config.redirectUri}${new URL(rawUrl, 'http://callback.invalid').search}`,
      );
      const tokens = await oidc.authorizationCodeGrant(client, callbackUrl, {
        pkceCodeVerifier: consumedFlow.code_verifier,
        expectedState: state,
        expectedNonce: consumedFlow.nonce,
      });
      const claims = tokens.claims();
      if (
        claims === undefined ||
        claims.iss !== config.issuer ||
        typeof claims.sub !== 'string' ||
        claims.sub.length === 0
      ) {
        return reply.code(400).send({ error: 'identity callback rejected' });
      }

      const newSessionToken = randomToken();
      await database.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('identity_accounts')
          .values({ id: randomUUID(), issuer: claims.iss, subject: claims.sub })
          .onConflict((conflict) => conflict.columns(['issuer', 'subject']).doNothing())
          .execute();
        const account = await transaction
          .selectFrom('identity_accounts')
          .select('id')
          .where('issuer', '=', claims.iss)
          .where('subject', '=', claims.sub)
          .executeTakeFirst();
        if (account === undefined) {
          throw new Error('identity account unavailable');
        }

        const oldToken = request.cookies[sessionCookie];
        if (oldToken !== undefined) {
          await transaction
            .updateTable('identity_sessions')
            .set({ revoked_at: new Date() })
            .where('token_digest', '=', digest(oldToken))
            .where('revoked_at', 'is', null)
            .execute();
        }
        await transaction
          .insertInto('identity_sessions')
          .values({
            token_digest: digest(newSessionToken),
            account_id: account.id,
            expires_at: new Date(Date.now() + sessionLifetimeSeconds * 1000),
          })
          .execute();
      });

      reply.clearCookie(flowCookie, {
        path: '/auth',
        secure: config.secureCookies,
        sameSite: 'lax',
      });
      reply.setCookie(sessionCookie, newSessionToken, sessionCookieOptions(config));
      return reply.redirect(`${config.publicOrigin}/auth/session`);
    } catch {
      reply.clearCookie(flowCookie, {
        path: '/auth',
        secure: config.secureCookies,
        sameSite: 'lax',
      });
      return reply.code(400).send({ error: 'identity callback rejected' });
    }
  });

  app.get('/auth/session', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) {
      reply.clearCookie(sessionCookie, sessionCookieOptions(config));
      return reply.code(401).send({ error: 'authentication required' });
    }
    return { accountId };
  });

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[sessionCookie];
    if (token !== undefined) {
      await database
        .updateTable('identity_sessions')
        .set({ revoked_at: new Date() })
        .where('token_digest', '=', digest(token))
        .where('revoked_at', 'is', null)
        .execute();
    }
    reply.clearCookie(sessionCookie, sessionCookieOptions(config));
    return reply.code(204).send();
  });
}
