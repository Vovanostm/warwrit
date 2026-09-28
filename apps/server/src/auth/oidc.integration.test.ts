import {
  createHash,
  createSign,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  type KeyObject,
} from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'kysely';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const testDatabaseUrl = process.env['IDENTITY_TEST_DATABASE_URL'];
const clientId = 'warwrit-oidc-integration-test';
const clientSecret = 'integration-test-secret';
const publicOrigin = 'http://127.0.0.1:3107';
const redirectUri = `${publicOrigin}/auth/callback`;
const signingKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const invalidSigningKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = signingKeys.publicKey.export({ format: 'jwk' });
const serverRef: { value?: Server } = {};
const codes = new Map<
  string,
  {
    readonly challenge: string;
    readonly nonce: string;
    readonly claims: Readonly<Record<string, unknown>>;
    readonly signingKey: KeyObject;
  }
>();
let issuer = '';
let issuerReady = false;
let issuerError = '';
let database: ReturnType<typeof createDatabase> | undefined;
let app: ReturnType<typeof buildApp> | undefined;

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

async function readForm(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

function makeIdToken(code: NonNullable<ReturnType<typeof codes.get>>, subject: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuer,
      aud: clientId,
      sub: subject,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
      nonce: code.nonce,
      ...code.claims,
    }),
  ).toString('base64url');
  const input = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256')
    .update(input)
    .end()
    .sign(code.signingKey)
    .toString('base64url');
  return `${input}.${signature}`;
}

function handleIssuerRequest(request: IncomingMessage, response: ServerResponse): void {
  void (async () => {
    const url = new URL(request.url ?? '/', issuer);
    if (!issuerReady) {
      sendJson(response, 503, { error: 'issuer starting' });
      return;
    }
    if (url.pathname === '/issuer/.well-known/openid-configuration') {
      sendJson(response, 200, {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/keys`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
        code_challenge_methods_supported: ['S256'],
      });
      return;
    }
    if (url.pathname === '/issuer/keys') {
      sendJson(response, 200, {
        keys: [{ ...publicJwk, kid: 'test-key', use: 'sig', alg: 'RS256' }],
      });
      return;
    }
    if (url.pathname === '/issuer/token' && request.method === 'POST') {
      const form = await readForm(request);
      const code = form.get('code');
      const authorization = code === null ? undefined : codes.get(code);
      const verifier = form.get('code_verifier') ?? '';
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      const tokenChecks = {
        code: authorization !== undefined,
        client: form.get('client_id') === clientId,
        secret: form.get('client_secret') === clientSecret,
        redirect: form.get('redirect_uri') === redirectUri,
        pkce: authorization !== undefined && challenge === authorization.challenge,
      };
      if (
        authorization === undefined ||
        !tokenChecks.client ||
        !tokenChecks.secret ||
        !tokenChecks.redirect ||
        !tokenChecks.pkce
      ) {
        issuerError = JSON.stringify(tokenChecks);
        sendJson(response, 400, { error: 'invalid_grant' });
        return;
      }
      codes.delete(code!);
      sendJson(response, 200, {
        access_token: randomBytes(16).toString('base64url'),
        token_type: 'Bearer',
        expires_in: 60,
        id_token: makeIdToken(authorization, randomUUID()),
      });
      return;
    }
    sendJson(response, 404, { error: 'not found' });
  })().catch((error: unknown) => {
    issuerError = String(error);
    sendJson(response, 500, { error: 'issuer failure' });
  });
}

function queueCode(
  authorizationUrl: URL,
  claims: Readonly<Record<string, unknown>> = {},
  signingKey: KeyObject = signingKeys.privateKey,
): string {
  const code = randomBytes(24).toString('base64url');
  codes.set(code, {
    challenge: authorizationUrl.searchParams.get('code_challenge') ?? '',
    nonce: authorizationUrl.searchParams.get('nonce') ?? '',
    claims,
    signingKey,
  });
  return code;
}

function cookiePair(response: { readonly headers: Record<string, unknown> }, name: string): string {
  const header = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? header : [header];
  const value = cookies.find(
    (cookie) => typeof cookie === 'string' && cookie.startsWith(`${name}=`),
  );
  if (typeof value !== 'string') {
    throw new Error(`Missing ${name} cookie`);
  }
  return value.split(';', 1)[0] ?? '';
}

function hasSessionCookie(response: { readonly headers: Record<string, unknown> }): boolean {
  const header = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? header : [header];
  return cookies.some(
    (cookie) => typeof cookie === 'string' && cookie.startsWith('warwrit_session='),
  );
}

async function startLogin() {
  const response = await app!.inject({ method: 'GET', url: '/auth/login' });
  if (response.statusCode !== 302) {
    throw new Error(`Login start returned ${response.statusCode}`);
  }
  return {
    authorizationUrl: new URL(response.headers.location!),
    flowCookie: cookiePair(response, 'warwrit_oidc_flow'),
  };
}

async function completeLogin(
  login: Awaited<ReturnType<typeof startLogin>>,
  claims: Readonly<Record<string, unknown>> = {},
  signingKey: KeyObject = signingKeys.privateKey,
  browserCookie = login.flowCookie,
) {
  const code = queueCode(login.authorizationUrl, claims, signingKey);
  const query = new URLSearchParams({
    code,
    state: login.authorizationUrl.searchParams.get('state') ?? '',
  });
  return app!.inject({
    method: 'GET',
    url: `/auth/callback?${query.toString()}`,
    headers: { cookie: browserCookie },
  });
}

describe.skipIf(testDatabaseUrl === undefined)('OIDC over PostgreSQL integration', () => {
  beforeAll(async () => {
    const server = createServer(handleIssuerRequest);
    serverRef.value = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('OIDC test issuer did not bind a TCP port');
    }
    issuer = `http://127.0.0.1:${address.port}/issuer`;
    database = createDatabase(testDatabaseUrl!);
    const config = loadServerConfig({
      DATABASE_URL: testDatabaseUrl,
      OIDC_ISSUER: issuer,
      OIDC_CLIENT_ID: clientId,
      OIDC_CLIENT_SECRET: clientSecret,
      OIDC_REDIRECT_URI: redirectUri,
      PUBLIC_ORIGIN: publicOrigin,
      HOST: '127.0.0.1',
      PORT: '3107',
    });
    app = buildApp({ logger: false, identity: { config: config.identity!, database } });
  });

  afterAll(async () => {
    await app?.close();
    await database?.destroy();
    const server = serverRef.value;
    if (server?.listening) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('retries discovery, validates signed OIDC claims and flow binding, and persists/revokes sessions', async () => {
    const missingOrigin = await app!.inject({ method: 'POST', url: '/auth/logout' });
    expect(missingOrigin.statusCode).toBe(403);

    const unavailableProvider = await app!.inject({ method: 'GET', url: '/auth/login' });
    expect(unavailableProvider.statusCode).toBe(503);
    issuerReady = true;

    const first = await startLogin();
    const second = await startLogin();
    const [firstCallback, secondCallback] = await Promise.all([
      completeLogin(first, { sub: 'parallel-account' }),
      completeLogin(second, { sub: 'parallel-account' }),
    ]);
    expect(firstCallback.statusCode, issuerError).toBe(302);
    expect(secondCallback.statusCode).toBe(302);
    expect(firstCallback.headers.location).toBe(`${publicOrigin}/auth/session`);
    const firstSessionCookie = cookiePair(firstCallback, 'warwrit_session');
    const secondSessionCookie = cookiePair(secondCallback, 'warwrit_session');
    const [firstSession, secondSession] = await Promise.all([
      app!.inject({ method: 'GET', url: '/auth/session', headers: { cookie: firstSessionCookie } }),
      app!.inject({
        method: 'GET',
        url: '/auth/session',
        headers: { cookie: secondSessionCookie },
      }),
    ]);
    expect(firstSession.statusCode).toBe(200);
    expect(secondSession.statusCode).toBe(200);
    expect(firstSession.json().accountId).toBe(secondSession.json().accountId);

    const identityCountsBeforeRejections = await sql<{
      readonly accounts: string;
      readonly sessions: string;
    }>`
      select
        (select count(*)::text from identity_accounts) as accounts,
        (select count(*)::text from identity_sessions) as sessions
    `.execute(database!);
    const replay = await completeLogin(first, { sub: 'parallel-account' });
    expect(replay.statusCode).toBe(400);
    expect(hasSessionCookie(replay)).toBe(false);

    const logout = await app!.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: firstSessionCookie, origin: publicOrigin },
    });
    expect(logout.statusCode).toBe(204);
    expect(
      (
        await app!.inject({
          method: 'GET',
          url: '/auth/session',
          headers: { cookie: firstSessionCookie },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app!.inject({
          method: 'GET',
          url: '/auth/session',
          headers: { cookie: secondSessionCookie },
        })
      ).statusCode,
    ).toBe(200);

    const wrongBrowser = await startLogin();
    const wrongCookie = wrongBrowser.flowCookie.replace(/=.*/u, '=wrong-browser-binding');
    const rejectedBrowser = await completeLogin(
      wrongBrowser,
      { sub: 'wrong-browser' },
      signingKeys.privateKey,
      wrongCookie,
    );
    expect(rejectedBrowser.statusCode).toBe(400);
    expect(hasSessionCookie(rejectedBrowser)).toBe(false);

    const invalidTokens = [
      { claims: { iss: `${issuer}/wrong` }, signingKey: signingKeys.privateKey },
      { claims: { aud: 'another-client' }, signingKey: signingKeys.privateKey },
      { claims: { nonce: 'wrong-nonce' }, signingKey: signingKeys.privateKey },
      { claims: { exp: Math.floor(Date.now() / 1000) - 60 }, signingKey: signingKeys.privateKey },
      { claims: {}, signingKey: invalidSigningKeys.privateKey },
    ];
    for (const { claims, signingKey } of invalidTokens) {
      const login = await startLogin();
      const callback = await completeLogin(login, claims, signingKey);
      expect(callback.statusCode).toBe(400);
      expect(hasSessionCookie(callback)).toBe(false);
    }
    const identityCountsAfterRejections = await sql<{
      readonly accounts: string;
      readonly sessions: string;
    }>`
      select
        (select count(*)::text from identity_accounts) as accounts,
        (select count(*)::text from identity_sessions) as sessions
    `.execute(database!);
    expect(identityCountsAfterRejections.rows[0]).toEqual(identityCountsBeforeRejections.rows[0]);

    const expiredToken = randomBytes(32).toString('base64url');
    const expiredAccountId = randomUUID();
    const expiredAt = new Date(Date.now() - 1_000);
    await database!
      .insertInto('identity_accounts')
      .values({ id: expiredAccountId, issuer, subject: `expired-${randomUUID()}` })
      .execute();
    await database!
      .insertInto('identity_sessions')
      .values({
        token_digest: createHash('sha256').update(expiredToken).digest(),
        account_id: expiredAccountId,
        created_at: new Date(Date.now() - 60_000),
        expires_at: expiredAt,
      })
      .execute();
    const expiredSession = await app!.inject({
      method: 'GET',
      url: '/auth/session',
      headers: { cookie: `warwrit_session=${expiredToken}` },
    });
    expect(expiredSession.statusCode).toBe(401);
  });
});
