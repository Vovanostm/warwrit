import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'kysely';
import {
  buildNavigationField,
  compileMovementPlan,
  findTravelPath,
  PAINTED_ATLAS_REGION,
} from '@warwrit/game-core';
import type {
  MapArtifact,
  MapContent,
  MapDocument,
  MapEditorCommand,
  MapEditorResult,
  MapPreview,
} from '@warwrit/protocol';
import { buildApp } from '../app.js';
import { createDatabase } from '../db/database.js';
import { ensureFirstHuntGenesis } from '../contracts/first-hunt-runtime.js';
import { mapTemplates } from './content.js';

const url = process.env['DATABASE_URL'];
const db = createDatabase(url ?? 'postgres://unused/unused');
const retainedWorld = `wlc07-retained-${randomUUID()}`;
const owner = randomUUID(),
  other = randomUUID();
const origin = 'http://127.0.0.1:53507';
const identity = {
  database: db,
  config: {
    issuer: `${origin}/dex`,
    clientId: 'test',
    clientSecret: 'test-only',
    redirectUri: `${origin}/auth/callback`,
    publicOrigin: origin,
    secureCookies: false,
  },
};
const settings = {
  environment: 'test' as const,
  host: '127.0.0.1',
  origin,
  accountIds: [owner, other],
  database: db,
};
const makeApp = () => buildApp({ logger: false, identity, playground: settings });
const app = makeApp();
const headers = { origin, cookie: 'warwrit_session=wlc07-owner-token' };
const base = '/dev/playground/api/maps';
const command = (
  operation: MapEditorCommand['operation'],
  doc?: MapDocument,
  content?: MapContent,
): MapEditorCommand => ({
  commandId: randomUUID(),
  operation,
  ...(doc ? { documentId: doc.id, expectedRevision: doc.revision } : {}),
  ...(content ? { content } : {}),
});
const send = (c: MapEditorCommand) =>
  app.inject({ method: 'POST', url: `${base}/commands`, headers, payload: c });
async function accepted(c: MapEditorCommand) {
  const r = await send(c);
  expect(r.statusCode, r.body).toBe(200);
  return r.json<MapEditorResult>();
}
const preview = (doc: MapDocument, extra: object = {}) =>
  app.inject({
    method: 'POST',
    url: `${base}/${doc.id}/preview`,
    headers,
    payload: { revision: doc.revision, ...extra },
  });
beforeAll(async () => {
  if (!url) return;
  await ensureFirstHuntGenesis(db, retainedWorld);
  for (const [id, token] of [
    [owner, 'wlc07-owner-token'],
    [other, 'wlc07-other-token'],
  ]) {
    await sql`insert into identity_accounts(id,issuer,subject) values(${id},'urn:wlc07:test',${id})`.execute(
      db,
    );
    await sql`insert into identity_sessions(account_id,token_digest,expires_at) values(${id},${createHash('sha256').update(token!).digest()},now()+interval '1 hour')`.execute(
      db,
    );
  }
});
afterAll(async () => {
  await app.close();
  if (url) {
    await sql`delete from world_hunt_states where world_id=${retainedWorld}`.execute(db);
    await sql`delete from contract_instances where world_id=${retainedWorld}`.execute(db);
    await sql`delete from world_first_hunt_state where world_id=${retainedWorld}`.execute(db);
    for (const id of [owner, other]) {
      await sql`delete from playground.map_documents where owner_id=${id}`.execute(db);
      await sql`delete from identity_sessions where account_id=${id}`.execute(db);
      await sql`delete from identity_accounts where id=${id}`.execute(db);
    }
  }
  await db.destroy();
});

describe.skipIf(!url)('Map Editor: authoritative isolated PostgreSQL authoring', () => {
  it('world journey: save broken road, locate error, correct, validate, server route, export/import, restart and exact retry', async () => {
    const before = (await sql`select * from world_first_hunt_state order by world_id`.execute(db))
      .rows;
    const template = mapTemplates().find((t) => t.kind === 'world')!;
    if (template.kind !== 'world') throw new Error('world template');
    const create = command('create', undefined, template);
    const [a, b] = await Promise.all([send(create), send(create)]);
    expect(a.statusCode).toBe(200);
    expect(b.json()).toEqual(a.json());
    let doc = a.json<MapEditorResult>().document;
    expect(
      (await send({ ...create, content: { ...template, name: 'Конфликт ID' } })).statusCode,
    ).toBe(409);
    expect((await send(command('export', doc))).statusCode).toBe(409);
    const broken = {
      ...template,
      region: {
        ...template.region,
        overlayShapes: template.region.overlayShapes.filter(
          (s) => !s.shapeId.startsWith('center-center-east-edge-'),
        ),
      },
    };
    doc = (await accepted(command('save', doc, broken))).document;
    doc = (await accepted(command('validate', doc))).document;
    expect(doc.status).toBe('Draft');
    expect(doc.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ROAD_CONTINUITY',
          objectId: 'center-center-east-edge-',
          point: expect.any(Object),
        }),
      ]),
    );
    const corridor = {
      ...template,
      region: {
        ...template.region,
        overlayShapes: template.region.overlayShapes.map((s) =>
          s.shapeId === 'center-center-east-edge-0'
            ? { ...s, stations: [{ xFp: -2000, zFp: 1000 }, ...s.stations!.slice(1)] }
            : s,
        ),
      },
    };
    doc = (await accepted(command('save', doc, corridor))).document;
    doc = (await accepted(command('validate', doc))).document;
    expect(doc.issues).toContainEqual(
      expect.objectContaining({
        objectId: 'center-center-east-edge-0',
        code: 'ROAD_TRAVERSABILITY',
        point: expect.any(Object),
      }),
    );
    doc = (await accepted(command('save', doc, template))).document;
    doc = (await accepted(command('validate', doc))).document;
    expect(doc.status).toBe('Validated');
    expect(doc.issues).toEqual([]);
    const from = template.region.sites[0]!.anchorFp,
      to = template.region.sites[2]!.anchorFp;
    const r = await preview(doc, { from, to });
    expect(r.statusCode, r.body).toBe(200);
    const result = r.json<MapPreview>();
    const field = buildNavigationField(PAINTED_ATLAS_REGION);
    const route = findTravelPath(field, from, to)!;
    expect(result.route).toEqual(route);
    expect(result.durationUs).toBe(
      compileMovementPlan({
        field,
        path: route,
        movementEpoch: '0',
        startedAtMs: '0',
        planId: 'gameplay-comparison',
      }).totalDurationUs,
    );
    expect(result.nodes!.length).toBeGreaterThan(0);
    expect(result.edges!.length).toBeGreaterThan(0);
    const exported = await accepted(command('export', doc));
    doc = exported.document;
    expect(doc.status).toBe('Exported');
    const artifact = exported.artifact!;
    expect(artifact.compatibility).toBe('explicit-world-revision-review-required');
    expect(artifact.source.revision).toBe(doc.revision);
    const imported = await app.inject({
      method: 'POST',
      url: `${base}/import`,
      headers,
      payload: { commandId: randomUUID(), artifact },
    });
    expect(imported.statusCode, imported.body).toBe(200);
    const clone = imported.json<MapEditorResult>().document;
    expect(clone.status).toBe('Draft');
    expect(clone.content).toEqual(template);
    expect(clone.id).not.toBe(doc.id);
    expect((await send(command('save', clone, { ...template, name: 'Копия' }))).statusCode).toBe(
      200,
    );
    expect(
      (await app.inject({ url: `${base}/${doc.id}`, headers })).json<MapDocument>().content,
    ).toEqual(template);
    const save = command('save', doc, { ...template, name: 'Сохранено до потери ответа' });
    const saved = await accepted(save);
    expect(saved.document.status).toBe('Draft');
    const restarted = makeApp();
    try {
      const again = await restarted.inject({
        method: 'POST',
        url: `${base}/commands`,
        headers,
        payload: save,
      });
      expect(again.json()).toEqual(saved);
      expect(
        (await restarted.inject({ url: `${base}/${doc.id}`, headers })).json<MapDocument>(),
      ).toEqual(saved.document);
    } finally {
      await restarted.close();
    }
    expect((await send(command('save', doc, template))).statusCode).toBe(409);
    expect(
      (await sql`select * from world_first_hunt_state order by world_id`.execute(db)).rows,
    ).toEqual(before);
  }, 60000);
  it('battle journey: paint, invalid spawn/deployment, correction, current renderer projection, clone and import validation', async () => {
    const retained = (
      await sql`select * from world_first_hunt_state where world_id=${retainedWorld}`.execute(db)
    ).rows;
    expect(retained).toHaveLength(1);
    const template = mapTemplates().find((t) => t.kind === 'battle')!;
    if (template.kind !== 'battle') throw new Error('battle template');
    let doc = (await accepted(command('create', undefined, template))).document;
    const spawn = template.battle.units[0]!.position;
    const broken = {
      ...template,
      battle: {
        ...template.battle,
        map: {
          ...template.battle.map,
          tiles: template.battle.map.tiles.map((t) =>
            t.q === spawn.q && t.r === spawn.r ? { ...t, blocked: true } : t,
          ),
        },
      },
    };
    doc = (await accepted(command('save', doc, broken))).document;
    doc = (await accepted(command('validate', doc))).document;
    expect(doc.status).toBe('Draft');
    expect(doc.issues.some((i) => i.hex?.q === spawn.q && i.hex.r === spawn.r)).toBe(true);
    expect((await preview(doc)).json<MapPreview>().view).toBeUndefined();
    const edited = {
      ...template,
      battle: {
        ...template.battle,
        map: {
          ...template.battle.map,
          tiles: template.battle.map.tiles.map((t) =>
            t.q === 0 && t.r === 0 ? { ...t, terrain: 'mud' as const, height: 2 as const } : t,
          ),
        },
      },
    };
    doc = (await accepted(command('save', doc, edited))).document;
    doc = (await accepted(command('validate', doc))).document;
    expect(doc.status).toBe('Validated');
    const projected = (await preview(doc)).json<MapPreview>();
    expect(projected.view!.battle!.map.tiles[0]).toMatchObject({ height: 2, terrain: 'mud' });
    expect(projected.view!.viewRevision).toBe(0);
    const cloned = (await accepted(command('clone', doc))).document;
    expect(cloned.content).toEqual(edited);
    expect(cloned.status).toBe('Draft');
    const exported = await accepted(command('export', doc));
    const artifact = exported.artifact!;
    const publish = {
      commandId: randomUUID(),
      operation: 'publish',
      documentId: exported.document.id,
      expectedRevision: exported.document.revision,
      compatibility: 'new-worlds-only',
      acknowledgement: 'PUBLISH_VERSIONED_CONTENT',
    };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/delivery`,
          headers,
          payload: { ...publish, acknowledgement: 'skip-review' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: 'POST', url: `${base}/commands`, headers, payload: publish }))
        .statusCode,
    ).toBe(400);
    const published = await app.inject({
      method: 'POST',
      url: `${base}/delivery`,
      headers,
      payload: publish,
    });
    expect(published.statusCode, published.body).toBe(200);
    expect(published.json<MapEditorResult>().document.status).toBe('Published');
    expect(published.json<MapEditorResult>().artifact).toEqual(artifact);
    expect(
      (
        await app.inject({ method: 'POST', url: `${base}/delivery`, headers, payload: publish })
      ).json(),
    ).toEqual(published.json());
    expect(
      (await send(command('save', published.json<MapEditorResult>().document, edited))).statusCode,
    ).toBe(409);
    expect(
      (await accepted(command('clone', published.json<MapEditorResult>().document))).document
        .status,
    ).toBe('Draft');
    const deliveries = await app.inject({ url: `${base}/delivery`, headers });
    expect(deliveries.json().publications).toContainEqual(artifact);

    for (const bad of [
      { ...artifact, artifactVersion: 2 },
      { ...artifact, content: { ...artifact.content, contentRevision: 'old' } },
      { ...artifact, compatibility: 'publish-immediately' },
    ])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/import`,
            headers,
            payload: { commandId: randomUUID(), artifact: bad },
          })
        ).statusCode,
      ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/import`,
          headers,
          payload: { commandId: randomUUID(), artifact: artifact satisfies MapArtifact },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await sql`select * from world_first_hunt_state where world_id=${retainedWorld}`.execute(db))
        .rows,
    ).toEqual(retained);
  });
  it('guards account/origin/private atlas, unsupported writes and unknown content IDs', async () => {
    expect((await app.inject(base)).statusCode).toBe(401);
    expect((await app.inject(`${base}/atlas-v6.png`)).statusCode).toBe(401);
    const create = command('create', undefined, mapTemplates()[1]!);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/commands`,
          headers: { cookie: headers.cookie },
          payload: create,
        })
      ).statusCode,
    ).toBe(403);
    const doc = (await accepted(create)).document;
    expect(
      (
        await app.inject({
          url: `${base}/${doc.id}`,
          headers: { ...headers, cookie: 'warwrit_session=wlc07-other-token' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (await send({ ...command('validate', doc), operation: 'publish' as never })).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/${doc.id}/preview`,
          headers,
          payload: { revision: 99 },
        })
      ).statusCode,
    ).toBe(409);
    const atlas = await app.inject({ url: `${base}/atlas-v6.png`, headers });
    expect(atlas.statusCode).toBe(200);
    expect(atlas.headers['content-type']).toContain('image/png');
    const world = mapTemplates()[0]!;
    if (world.kind !== 'world') throw new Error('world');
    const invalid = {
      ...world,
      region: {
        ...world.region,
        sites: world.region.sites.map((s, i) => (i === 0 ? { ...s, areaId: 'nonexistent' } : s)),
      },
    };
    let w = (await accepted(command('create', undefined, invalid))).document;
    w = (await accepted(command('validate', w))).document;
    expect(w.issues.some((i) => i.code === 'CONTENT_ID')).toBe(true);
    expect(
      (
        await send(
          command('save', w, {
            ...world,
            region: { ...world.region, speedProfileId: 'arbitrary' as never },
          }),
        )
      ).statusCode,
    ).toBe(400);
  }, 30000);
});
