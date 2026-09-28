import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const apps: ReturnType<typeof buildApp>[] = [];
const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  await Promise.all(databases.splice(0).map((database) => database.destroy()));
});

describe('OIDC identity HTTP boundary', () => {
  it('requires a live database-backed session for the private session view', async () => {
    const config = loadServerConfig({
      DATABASE_URL: 'postgres://unused:unused@127.0.0.1:55433/unused',
      OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
      OIDC_CLIENT_ID: 'warwrit-local',
      OIDC_CLIENT_SECRET: 'local-only-secret',
      OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
      PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
      HOST: '127.0.0.1',
      PORT: '3107',
    });
    const database = createDatabase(config.databaseUrl!);
    databases.push(database);
    const app = buildApp({
      logger: false,
      identity: { config: config.identity!, database },
    });
    apps.push(app);

    const session = await app.inject({ method: 'GET', url: '/auth/session' });
    const rejectedMutation = await app.inject({ method: 'POST', url: '/auth/logout' });

    expect(session.statusCode).toBe(401);
    expect(session.json()).toEqual({ error: 'authentication required' });
    expect(rejectedMutation.statusCode).toBe(403);
  });
});
