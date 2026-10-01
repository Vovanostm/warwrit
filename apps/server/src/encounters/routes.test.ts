import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app.js';
import { createDatabase } from '../db/database.js';

// Nothing listens on this port: any database access would surface as a 500.
const unreachableDatabase = 'postgres://unused:unused@127.0.0.1:9/unused';
const encounterId = '11111111-1111-4111-8111-111111111111';
const apps: ReturnType<typeof buildApp>[] = [];
const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  await Promise.all(databases.splice(0).map((database) => database.destroy()));
  vi.unstubAllEnvs();
});

function encounterApp() {
  const database = createDatabase(unreachableDatabase);
  databases.push(database);
  const roomTicketIssuer = vi.fn();
  const app = buildApp({
    logger: false,
    encounters: { database, fixtureAdmission: true, roomTicketIssuer },
  });
  apps.push(app);
  return { app, roomTicketIssuer };
}

const command = {
  version: 1,
  encounterId,
  commandId: 'command-1',
  expectedRevision: 0,
  activationId: '1:human-shield',
  actorId: 'human-shield',
  intent: { type: 'wait' },
};

type Route =
  | { readonly method: 'GET'; readonly url: string }
  | { readonly method: 'POST'; readonly url: string; readonly payload: object };

const routes: readonly Route[] = [
  { method: 'POST', url: '/encounters/fixtures', payload: { version: 1 } },
  { method: 'GET', url: '/encounters/active' },
  {
    method: 'POST',
    url: `/encounters/${encounterId}/resume`,
    payload: { version: 1, encounterId },
  },
  { method: 'GET', url: `/encounters/${encounterId}` },
  { method: 'GET', url: `/encounters/${encounterId}/projection` },
  { method: 'POST', url: `/encounters/${encounterId}/room-ticket`, payload: { version: 1 } },
  { method: 'POST', url: '/encounters/commands', payload: command },
];

// A valid body and a forged one: authentication precedes body validation.
function requests(route: Route) {
  const headers = { origin: 'http://127.0.0.1:3107' };
  return route.method === 'GET'
    ? [{ method: route.method, url: route.url, headers }]
    : [route.payload, { forged: true }].map((payload) => ({
        method: route.method,
        url: route.url,
        headers,
        payload,
      }));
}

describe('encounter HTTP authorization', () => {
  it.each(routes)('rejects $method $url without a session before any effect', async (route) => {
    const { app, roomTicketIssuer } = encounterApp();

    for (const request of requests(route)) {
      const response = await app.inject(request);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'authentication required' });
    }
    expect(roomTicketIssuer).not.toHaveBeenCalled();
  });

  it('mounts authenticated production access without enabling fixture creation', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const database = createDatabase(unreachableDatabase);
    databases.push(database);
    const app = buildApp({ logger: false, encounters: { database } });
    apps.push(app);
    await app.ready();

    const routes = app.printRoutes();
    expect(routes).toContain('active');
    expect(routes).toContain('projection');
    expect(routes).not.toContain('fixtures');
  });
});
