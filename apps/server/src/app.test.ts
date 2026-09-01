import { PassThrough } from 'node:stream';

import { PROTOCOL_VERSION } from '@warwrit/protocol';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import { createLogger } from './logger.js';

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe('server foundation', () => {
  it('exposes distinct liveness and readiness endpoints', async () => {
    const app = buildApp({ logger: false });
    apps.push(app);

    const live = await app.inject({ method: 'GET', url: '/health/live' });
    const ready = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(live.statusCode).toBe(200);
    expect(live.json()).toEqual({
      protocolVersion: PROTOCOL_VERSION,
      service: 'warwrit-server',
      status: 'ok',
    });
    expect(ready.statusCode).toBe(200);
  });

  it('fails readiness closed when a required dependency is unavailable', async () => {
    const app = buildApp({
      logger: false,
      readinessProbe: async () => {
        throw new Error('database unavailable');
      },
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: 'unavailable' });
  });

  it('emits structured JSON with a stable service field', async () => {
    const stream = new PassThrough();
    let output = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
      output += chunk;
    });

    const app = buildApp({ logger: createLogger(stream) });
    apps.push(app);
    await app.ready();

    const entries = output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'server.ready',
          service: 'warwrit-server',
        }),
      ]),
    );
  });
});
