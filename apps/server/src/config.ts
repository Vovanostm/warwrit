import { invariant } from '@warwrit/game-core';

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly databaseUrl?: string;
  readonly combatLabOrigin?: string;
  readonly fixtureEncountersEnabled?: true;
  readonly encounterRealtimePort: number;
  readonly identity?: IdentityConfig;
}

export interface IdentityConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly publicOrigin: string;
  readonly secureCookies: boolean;
}

export function loadServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const portValue = environment['PORT']?.trim() ?? '3000';
  const port = Number(portValue);
  invariant(
    /^\d+$/u.test(portValue) && Number.isInteger(port) && port > 0 && port <= 65_535,
    'PORT must be a valid TCP port',
  );

  const databaseUrl = environment['DATABASE_URL']?.trim();
  const host = environment['HOST']?.trim() || '0.0.0.0';
  const fixtureEncountersEnabled = environment['ENCOUNTER_FIXTURES'] === '1';
  const encounterRealtimePortValue = environment['ENCOUNTER_REALTIME_PORT']?.trim() ?? '3110';
  const encounterRealtimePort = Number(encounterRealtimePortValue);
  invariant(
    /^\d+$/u.test(encounterRealtimePortValue) &&
      Number.isInteger(encounterRealtimePort) &&
      encounterRealtimePort > 0 &&
      encounterRealtimePort <= 65_535,
    'ENCOUNTER_REALTIME_PORT must be a valid TCP port',
  );
  invariant(
    !fixtureEncountersEnabled ||
      (environment['NODE_ENV'] !== 'production' &&
        encounterRealtimePort !== port &&
        (host === '127.0.0.1' || host === '::1') &&
        databaseUrl !== undefined &&
        [
          environment['OIDC_ISSUER'],
          environment['OIDC_CLIENT_ID'],
          environment['OIDC_CLIENT_SECRET'],
          environment['OIDC_REDIRECT_URI'],
          environment['PUBLIC_ORIGIN'],
        ].every((value) => Boolean(value?.trim()))),
    'Encounter fixtures require nonproduction loopback HTTP and realtime listeners with database-backed identity',
  );
  const labEnabled = environment['COMBAT_LAB'] === '1';
  invariant(
    !labEnabled ||
      (environment['NODE_ENV'] !== 'production' && (host === '127.0.0.1' || host === '::1')),
    'Combat lab requires a nonproduction loopback server',
  );
  const combatLabOrigin = environment['COMBAT_LAB_ORIGIN']?.trim() || 'http://127.0.0.1:5173';
  if (labEnabled) {
    const origin = new URL(combatLabOrigin);
    invariant(
      origin.protocol === 'http:' &&
        (origin.hostname === '127.0.0.1' ||
          origin.hostname === 'localhost' ||
          origin.hostname === '[::1]') &&
        origin.origin === combatLabOrigin,
      'COMBAT_LAB_ORIGIN must be an exact local HTTP origin',
    );
  }
  const identityValues = [
    environment['OIDC_ISSUER'],
    environment['OIDC_CLIENT_ID'],
    environment['OIDC_CLIENT_SECRET'],
    environment['OIDC_REDIRECT_URI'],
    environment['PUBLIC_ORIGIN'],
  ].map((value) => value?.trim() ?? '');
  const identityConfigured = identityValues.some(Boolean);
  let identity: IdentityConfig | undefined;
  if (identityConfigured) {
    invariant(identityValues.every(Boolean), 'OIDC identity configuration must be complete');
    invariant(databaseUrl !== undefined, 'OIDC identity requires DATABASE_URL');
    const [issuer, clientId, clientSecret, redirectUri, publicOrigin] = identityValues as [
      string,
      string,
      string,
      string,
      string,
    ];
    const issuerUrl = new URL(issuer);
    const originUrl = new URL(publicOrigin);
    const redirectUrl = new URL(redirectUri);
    const loopbackNames = new Set(['127.0.0.1', 'localhost', '[::1]']);
    const loopback = loopbackNames.has(originUrl.hostname) && loopbackNames.has(issuerUrl.hostname);
    const hostIsLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
    invariant(
      (originUrl.protocol === 'https:' || (loopback && originUrl.protocol === 'http:')) &&
        originUrl.origin === publicOrigin &&
        originUrl.username === '' &&
        originUrl.password === '',
      'PUBLIC_ORIGIN must be an exact HTTPS origin (HTTP only on loopback)',
    );
    invariant(
      (issuerUrl.protocol === 'https:' || (loopback && issuerUrl.protocol === 'http:')) &&
        issuerUrl.username === '' &&
        issuerUrl.password === '' &&
        issuerUrl.search === '' &&
        issuerUrl.hash === '',
      'OIDC_ISSUER must be an HTTPS issuer (HTTP only on loopback)',
    );
    invariant(
      redirectUrl.origin === publicOrigin &&
        redirectUrl.href === redirectUri &&
        redirectUri === new URL('/auth/callback', publicOrigin).href,
      'OIDC_REDIRECT_URI must be the fixed callback under PUBLIC_ORIGIN',
    );
    invariant(
      originUrl.protocol === 'https:' ||
        (hostIsLoopback &&
          (host === '::1' ? originUrl.hostname === '[::1]' : host === originUrl.hostname)),
      'HTTP identity origin requires a matching loopback listener',
    );
    invariant(clientId !== '' && clientSecret !== '', 'OIDC client credentials are required');
    identity = {
      issuer,
      clientId,
      clientSecret,
      redirectUri,
      publicOrigin,
      secureCookies: originUrl.protocol === 'https:',
    };
  }
  return {
    host,
    port,
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(labEnabled ? { combatLabOrigin } : {}),
    ...(fixtureEncountersEnabled ? { fixtureEncountersEnabled: true as const } : {}),
    encounterRealtimePort,
    ...(identity === undefined ? {} : { identity }),
  };
}
