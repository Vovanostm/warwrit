import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { sql, type Kysely } from 'kysely';
import type {
  MapArtifact,
  MapDocument,
  MapDeliveryCommand,
  MapEditorCommand,
  MapEditorResult,
} from '@warwrit/protocol';
import type { DatabaseSchema } from '../db/database.js';
import { PlaygroundRefusal } from '../playground/store.js';
import {
  combatLabCatalog,
  inspectMap,
  isMapContent,
  mapPoint,
  mapTemplates,
  previewMapRoute,
} from './content.js';

const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(v);
function command(v: unknown): v is MapEditorCommand {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const c = v as Record<string, unknown>;
  const operation = c['operation'];
  const keys = [
    'commandId',
    'operation',
    ...(operation === 'create' ? [] : ['documentId', 'expectedRevision']),
    ...(['create', 'save'].includes(String(operation)) ? ['content'] : []),
  ];
  return (
    Object.keys(c).length === keys.length &&
    keys.every((k) => Object.hasOwn(c, k)) &&
    uuid(c['commandId']) &&
    ['create', 'save', 'clone', 'validate', 'export', 'delete'].includes(String(operation)) &&
    (operation === 'create' ||
      (uuid(c['documentId']) &&
        Number.isSafeInteger(c['expectedRevision']) &&
        Number(c['expectedRevision']) >= 0)) &&
    (!['create', 'save'].includes(String(operation)) || isMapContent(c['content']))
  );
}
function artifact(document: MapDocument): MapArtifact {
  return {
    format: 'warwrit-map',
    artifactVersion: 1,
    source: { documentId: document.id, revision: document.revision },
    compatibility: 'explicit-world-revision-review-required',
    content: document.content,
  };
}
function isMapArtifact(v: unknown): v is MapArtifact {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const a = v as Record<string, unknown>;
  const s = a['source'] as Record<string, unknown> | undefined;
  return (
    Object.keys(a).length === 5 &&
    a['format'] === 'warwrit-map' &&
    a['artifactVersion'] === 1 &&
    a['compatibility'] === 'explicit-world-revision-review-required' &&
    !!s &&
    Object.keys(s).length === 2 &&
    uuid(s['documentId']) &&
    Number.isSafeInteger(s['revision']) &&
    Number(s['revision']) >= 0 &&
    isMapContent(a['content'])
  );
}
async function executeMapCommand(
  db: Kysely<DatabaseSchema>,
  owner: string,
  c: MapEditorCommand | MapDeliveryCommand,
): Promise<MapEditorResult> {
  return db.transaction().execute(async (tx) => {
    await sql`select pg_advisory_xact_lock(57007, 7)`.execute(tx);
    const prior = (
      await sql<{
        response: MapEditorResult;
        same: boolean;
      }>`select response, request = ${JSON.stringify(c)}::jsonb as same from playground.map_receipts where owner_id=${owner} and command_id=${c.commandId}::uuid`.execute(
        tx,
      )
    ).rows[0];
    if (prior) {
      if (!prior.same) throw new PlaygroundRefusal('COMMAND_CONFLICT', 409);
      return prior.response;
    }
    let source: MapDocument | undefined;
    if (c.operation !== 'create') {
      source = (
        await sql<MapDocument>`select id,revision,status,content,issues from playground.map_documents where id=${c.documentId}::uuid and owner_id=${owner} and not deleted for update`.execute(
          tx,
        )
      ).rows[0];
      if (!source) throw new PlaygroundRefusal('NOT_FOUND', 404);
      if (source.revision !== c.expectedRevision)
        throw new PlaygroundRefusal('STALE_REVISION', 409);
      const n = (
        await sql<{
          n: number;
        }>`select count(*)::int as n from playground.map_receipts where document_id=${source.id}::uuid`.execute(
          tx,
        )
      ).rows[0]!.n;
      if (n >= 1024) throw new PlaygroundRefusal('COMMAND_LIMIT', 409);
    }
    const creating = c.operation === 'create' || c.operation === 'clone';
    if (creating) {
      const n = (
        await sql<{
          n: number;
        }>`select count(*)::int as n from playground.map_documents where owner_id=${owner}`.execute(
          tx,
        )
      ).rows[0]!.n;
      if (n >= 64) throw new PlaygroundRefusal('MAP_LIMIT', 409);
    }
    if (source?.status === 'Published' && c.operation !== 'clone')
      throw new PlaygroundRefusal('PUBLISHED_CONTENT_FROZEN', 409);
    const content = ('content' in c ? c.content : undefined) ?? source!.content;
    if (!isMapContent(content)) throw new PlaygroundRefusal('CONTENT_REVISION_MISMATCH', 409);
    const issues =
      c.operation === 'validate' || c.operation === 'export' || c.operation === 'publish'
        ? inspectMap(content).issues
        : [];
    if (c.operation === 'export' && (source?.status === 'Draft' || issues.length))
      throw new PlaygroundRefusal('VALIDATED_MAP_REQUIRED', 409);
    if (c.operation === 'publish' && (source?.status !== 'Exported' || issues.length))
      throw new PlaygroundRefusal('EXPORTED_MAP_REQUIRED', 409);
    const document: MapDocument = {
      id: creating ? randomUUID() : source!.id,
      revision: creating ? 0 : source!.revision + 1,
      status:
        c.operation === 'publish'
          ? 'Published'
          : c.operation === 'export'
            ? 'Exported'
            : c.operation === 'validate' && !issues.length
              ? 'Validated'
              : 'Draft',
      content,
      issues,
    };
    if (creating)
      await sql`insert into playground.map_documents(id,owner_id,revision,status,content,issues) values(${document.id}::uuid,${owner},${document.revision},${document.status},${JSON.stringify(content)}::jsonb,${JSON.stringify(issues)}::jsonb)`.execute(
        tx,
      );
    else
      await sql`update playground.map_documents set revision=${document.revision},status=${document.status},content=${JSON.stringify(content)}::jsonb,issues=${JSON.stringify(issues)}::jsonb,deleted=${c.operation === 'delete'} where id=${document.id}::uuid and owner_id=${owner}`.execute(
        tx,
      );
    const response: MapEditorResult = {
      commandId: c.commandId,
      document,
      ...(c.operation === 'export'
        ? { artifact: artifact(document) }
        : c.operation === 'publish'
          ? { artifact: artifact(source!) }
          : {}),
    };
    await sql`insert into playground.map_receipts(owner_id,command_id,document_id,request,response) values(${owner},${c.commandId}::uuid,${document.id}::uuid,${JSON.stringify(c)}::jsonb,${JSON.stringify(response)}::jsonb)`.execute(
      tx,
    );
    return response;
  });
}
/** Called only inside the existing authenticated/allowlisted dev scope. */
export function registerMapEditor(scope: FastifyInstance, db: Kysely<DatabaseSchema>) {
  const read = async (owner: string, id: string) => {
    if (!uuid(id)) throw new PlaygroundRefusal('NOT_FOUND', 404);
    const doc = (
      await sql<MapDocument>`select id,revision,status,content,issues from playground.map_documents where id=${id}::uuid and owner_id=${owner} and not deleted`.execute(
        db,
      )
    ).rows[0];
    if (!doc) throw new PlaygroundRefusal('NOT_FOUND', 404);
    if (!isMapContent(doc.content)) throw new PlaygroundRefusal('CONTENT_REVISION_MISMATCH', 409);
    return doc;
  };
  scope.get('/dev/playground/api/maps/delivery', async (req) => ({
    publications: (
      await sql<{
        artifact: MapArtifact;
      }>`select response->'artifact' as artifact from playground.map_receipts
      where owner_id=${req.playgroundAccountId} and request->>'operation'='publish' order by command_id`.execute(
        db,
      )
    ).rows.map((r) => r.artifact),
  }));
  scope.post('/dev/playground/api/maps/delivery', { bodyLimit: 2048 }, async (req, reply) => {
    const c = req.body as MapDeliveryCommand | null;
    if (
      !c ||
      Object.keys(c).length !== 6 ||
      !uuid(c.commandId) ||
      c.operation !== 'publish' ||
      !uuid(c.documentId) ||
      !Number.isSafeInteger(c.expectedRevision) ||
      c.expectedRevision < 0 ||
      c.compatibility !== 'new-worlds-only' ||
      c.acknowledgement !== 'PUBLISH_VERSIONED_CONTENT'
    )
      return reply.code(400).send({ code: 'EXPLICIT_DELIVERY_REVIEW_REQUIRED' });
    return executeMapCommand(db, req.playgroundAccountId, c);
  });
  scope.get('/dev/playground/api/maps', async (req) => ({
    accountId: req.playgroundAccountId,
    templates: mapTemplates(),
    catalog: combatLabCatalog(),
    documents: (
      await sql<MapDocument>`select id,revision,status,content,issues from playground.map_documents where owner_id=${req.playgroundAccountId} and not deleted order by id`.execute(
        db,
      )
    ).rows,
  }));
  scope.get('/dev/playground/api/maps/atlas-v6.png', async (_req, reply) =>
    reply
      .type('image/png')
      .send(
        await readFile(
          new URL('../../../../assets/art/world/porechye-atlas-v1/atlas-v6.png', import.meta.url),
        ),
      ),
  );
  scope.post('/dev/playground/api/maps/commands', { bodyLimit: 512 * 1024 }, async (req, reply) => {
    if (!command(req.body)) return reply.code(400).send({ code: 'MAP_OR_COMMAND_INVALID' });
    return executeMapCommand(db, req.playgroundAccountId, req.body);
  });
  scope.post('/dev/playground/api/maps/import', { bodyLimit: 512 * 1024 }, async (req, reply) => {
    const b = req.body as { commandId?: unknown; artifact?: unknown } | null;
    if (!b || Object.keys(b).length !== 2 || !uuid(b.commandId) || !isMapArtifact(b.artifact))
      return reply.code(400).send({ code: 'ARTIFACT_VERSION_OR_CONTENT_INVALID' });
    const validation = inspectMap(b.artifact.content);
    if (validation.issues.length)
      return reply
        .code(400)
        .send({ code: 'ARTIFACT_VALIDATION_FAILED', issues: validation.issues });
    return executeMapCommand(db, req.playgroundAccountId, {
      commandId: b.commandId,
      operation: 'create',
      content: b.artifact.content,
    });
  });
  scope.get<{ Params: { id: string } }>('/dev/playground/api/maps/:id', (req) =>
    read(req.playgroundAccountId, req.params.id),
  );
  scope.post<{ Params: { id: string } }>(
    '/dev/playground/api/maps/:id/preview',
    { bodyLimit: 2048 },
    async (req, reply) => {
      const doc = await read(req.playgroundAccountId, req.params.id);
      const body = req.body as Record<string, unknown> | null;
      if (!body || !Number.isSafeInteger(body['revision']) || body['revision'] !== doc.revision)
        return reply.code(409).send({ code: 'STALE_REVISION' });
      const result = inspectMap(doc.content);
      if (body['from'] !== undefined || body['to'] !== undefined) {
        if (!mapPoint(body['from']) || !mapPoint(body['to']))
          return reply.code(400).send({ code: 'INVALID_ROUTE_POINTS' });
        try {
          const route = previewMapRoute(doc.content, body['from'], body['to']);
          if (!route) return reply.code(422).send({ code: 'NO_PATH' });
          return { ...result, ...route, revision: doc.revision };
        } catch {
          return reply.code(422).send({ code: 'NO_PATH' });
        }
      }
      return { ...result, revision: doc.revision };
    },
  );
}
