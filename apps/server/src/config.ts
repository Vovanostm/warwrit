import { invariant } from '@warwrit/game-core';

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly databaseUrl?: string;
}

export function loadServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number.parseInt(environment['PORT'] ?? '3000', 10);
  invariant(Number.isInteger(port) && port > 0 && port <= 65_535, 'PORT must be a valid TCP port');

  const databaseUrl = environment['DATABASE_URL']?.trim();
  return {
    host: environment['HOST']?.trim() || '0.0.0.0',
    port,
    ...(databaseUrl ? { databaseUrl } : {}),
  };
}
