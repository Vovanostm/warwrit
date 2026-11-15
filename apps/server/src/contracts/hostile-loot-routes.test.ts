import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/session.js', () => ({
  resolveSessionAccount: vi.fn().mockResolvedValue(undefined),
}));

import { registerHostileLootRoutes } from './hostile-loot-routes.js';

describe('hostile loot routes', () => {
  const apps: ReturnType<typeof Fastify>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('requires an authenticated company for availability and pickup', async () => {
    const app = Fastify();
    apps.push(app);
    registerHostileLootRoutes(app, { database: {} as never, worldId: 'world' });

    const availability = await app.inject({
      method: 'GET',
      url: '/company/hostile-loot/ci.m1.wolf-trail.01',
    });
    const pickup = await app.inject({
      method: 'POST',
      url: '/company/hostile-loot/ci.m1.wolf-trail.01/pickup',
      payload: {},
    });

    expect(availability.statusCode).toBe(401);
    expect(pickup.statusCode).toBe(401);
  });
});
