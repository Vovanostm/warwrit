import { randomUUID } from 'node:crypto';

import * as combat from '@warwrit/game-core';
import type { EncounterLeadershipDto } from '@warwrit/protocol';
import { isEncounterId } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Kysely, Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { loadCompanyAggregate } from '../company/repository.js';

const MODES = ['PERMANENT', 'ACTING', 'REGENCY'] as const;
type Mode = (typeof MODES)[number];

/**
 * The owner's view of a dead leader's succession after a resolved encounter: who can be
 * named, and what was already chosen. game-core decides legality when consequences apply.
 */
async function readLeadership(
  transaction: Transaction<DatabaseSchema>,
  accountId: string,
  encounterId: string,
): Promise<
  | {
      readonly worldId: string;
      readonly companyId: string;
      readonly view: EncounterLeadershipDto;
    }
  | undefined
> {
  const encounter = await transaction
    .selectFrom('encounters')
    .select(['world_id', 'status', 'revision', 'state'])
    .where('id', '=', encounterId)
    .executeTakeFirst();
  if (!encounter || encounter.status !== 'resolved') return undefined;
  const admission = await transaction
    .selectFrom('encounter_admissions')
    .select(['effects_applied_at', 'terminal_revision'])
    .where('encounter_id', '=', encounterId)
    .executeTakeFirst();
  if (!admission) return undefined;
  const owned = await transaction
    .selectFrom('company_account_owners')
    .select('company_id')
    .where('world_id', '=', encounter.world_id)
    .where('account_id', '=', accountId)
    .executeTakeFirst();
  if (!owned) return undefined;
  const state = await loadCompanyAggregate(transaction, encounter.world_id, owned.company_id);
  const active = state?.encounter.active;
  if (!state || !active || active.binding.setup.battleId !== encounterId) return undefined;

  const kernel = encounter.state as combat.BattleState;
  const deadUnits = new Set(
    kernel.units.filter((unit) => unit.health === 0).map((unit) => unit.id),
  );
  const ours = active.binding.participants.filter(
    (participant) => participant.companyId === owned.company_id,
  );
  const deadCharacters = new Set(
    ours
      .filter((participant) => deadUnits.has(participant.unitId))
      .map((participant) => participant.projection.characterId),
  );
  const company = state.economy.lifecycle.company;
  const leaderId = company?.actingLeaderId ?? company?.currentLeaderId ?? null;
  const required =
    admission.effects_applied_at === null && leaderId !== null && deadCharacters.has(leaderId);
  const view = combat.projectCompanyLifecycle(state.economy.lifecycle, owned.company_id);
  const members = new Set(
    state.economy.lifecycle.memberships
      .filter((membership) => membership.endedAt === null)
      .map((membership) => membership.characterId as string),
  );
  const candidates = (view?.characters ?? [])
    .filter(
      (character) =>
        members.has(character.characterId) &&
        character.knownStatus !== 'DEAD' &&
        !deadCharacters.has(character.characterId),
    )
    .map((character) => ({ characterId: character.characterId, name: character.name }));
  const chosen = await transaction
    .selectFrom('encounter_leadership_choices')
    .select(['candidate_id', 'mode'])
    .where('encounter_id', '=', encounterId)
    .where('company_id', '=', owned.company_id)
    .executeTakeFirst();
  return {
    worldId: encounter.world_id,
    companyId: owned.company_id,
    view: {
      version: 1,
      encounterId,
      required,
      candidates: required ? candidates : [],
      modes: [...MODES],
      chosen: chosen ? { candidateId: chosen.candidate_id, mode: chosen.mode } : null,
    },
  };
}

export function registerEncounterLeadershipRoutes(
  app: FastifyInstance,
  database: Kysely<DatabaseSchema>,
): void {
  app.get<{ Params: { encounterId: string } }>(
    '/encounters/:encounterId/leadership',
    async (request, reply) => {
      if (!isEncounterId(request.params.encounterId))
        return reply.code(400).send({ error: 'invalid encounter id' });
      const result = await database
        .transaction()
        .execute((transaction) =>
          readLeadership(transaction, request.encounterAccountId, request.params.encounterId),
        );
      if (!result) return reply.code(404).send({ error: 'leadership unavailable' });
      reply.header('cache-control', 'no-store');
      return result.view;
    },
  );

  app.post<{ Params: { encounterId: string }; Body: unknown }>(
    '/encounters/:encounterId/leadership',
    { bodyLimit: 512 },
    async (request, reply) => {
      const body = request.body as Record<string, unknown> | null;
      if (
        !isEncounterId(request.params.encounterId) ||
        body === null ||
        typeof body !== 'object' ||
        Object.keys(body).sort().join(',') !== 'candidateId,mode,version' ||
        body['version'] !== 1 ||
        typeof body['candidateId'] !== 'string' ||
        !MODES.includes(body['mode'] as Mode)
      )
        return reply.code(400).send({ error: 'invalid request' });
      const candidateId = body['candidateId'];
      const mode = body['mode'] as Mode;
      const outcome = await database.transaction().execute(async (transaction) => {
        const current = await readLeadership(
          transaction,
          request.encounterAccountId,
          request.params.encounterId,
        );
        if (!current?.view.required) return 'UNAVAILABLE' as const;
        if (!current.view.candidates.some((candidate) => candidate.characterId === candidateId))
          return 'INVALID' as const;
        await transaction
          .insertInto('encounter_leadership_choices')
          .values({
            world_id: current.worldId,
            encounter_id: request.params.encounterId,
            company_id: current.companyId,
            account_id: request.encounterAccountId,
            command_id: randomUUID(),
            candidate_id: candidateId,
            mode,
          })
          .onConflict((conflict) =>
            conflict.columns(['encounter_id', 'company_id']).doUpdateSet({
              candidate_id: candidateId,
              mode,
              command_id: randomUUID(),
              chosen_at: new Date(),
            }),
          )
          .execute();
        return 'RECORDED' as const;
      });
      if (outcome === 'UNAVAILABLE')
        return reply.code(409).send({ error: 'leadership choice unavailable' });
      if (outcome === 'INVALID') return reply.code(400).send({ error: 'invalid candidate' });
      return reply.code(202).send({ version: 1, recorded: true });
    },
  );
}
