import { invariant } from '@warwrit/game-core';

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly databaseUrl?: string;
  readonly combatLabOrigin?: string;
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
  return {
    host,
    port,
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(labEnabled ? { combatLabOrigin } : {}),
  };
}
