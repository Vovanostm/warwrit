import { randomUUID } from 'node:crypto';
import {
  canPerform,
  canonicalJson,
  campaignTick,
  COMPANY_CATALOGUE,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  companySourceKey,
  isEntityId,
  parseCompanyCommand,
  readSkillProgress,
  skillLevel,
} from '@warwrit/game-core';
import type { CompanyRetrainingResponseDto } from '@warwrit/protocol';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Transaction } from 'kysely';
import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import type { CompanyRoutesOptions } from './routes.js';
import {
  findOwnedCompanyId,
  lockCompanyAggregate,
  updateCompanyAggregateWithReceipt,
} from './repository.js';
import { prepareStationaryFoodFacts } from './travel-food.js';
import { localCompanyContacts } from './recruitment.js';
import { KAMENNY_BROD_GUARD_RETRAINING, prepareCourseAdvance } from './courses.js';

export function registerCompanyRetrainingRoutes(
  app: FastifyInstance,
  { database, worldId }: CompanyRoutesOptions,
): void {
  app.get('/company/retraining/kamenny-brod', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (!accountId) return reply.code(401).send({ error: 'authentication required' });
    const result = await database.transaction().execute(async (transaction) => {
      if (!(await lockIdentityAccount(transaction, accountId)))
        return reply.code(401).send({ error: 'authentication required' });
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (!companyId) return null;
      const expectedCompanyId = readExpectedCompanyId(request.raw.rawHeaders);
      if (expectedCompanyId !== companyId)
        return reply.code(409).send({ error: 'company scope changed' });
      const lockedState = await lockCompanyAggregate(transaction, worldId, companyId);
      if (!lockedState) throw new Error('Owned company snapshot is unavailable');
      let state: CompanyCombatAggregateState = lockedState;
      const clock = await readWorldClock(transaction, worldId, new Date(), true);
      const party =
        state.economy.lifecycle.parties.length === 1
          ? state.economy.lifecycle.parties[0]
          : undefined;
      const local =
        party?.location.kind === 'AT' &&
        party.location.siteId === KAMENNY_BROD_GUARD_RETRAINING.location.siteId &&
        party.location.areaId === KAMENNY_BROD_GUARD_RETRAINING.location.areaId &&
        localCompanyContacts(state, companyId, KAMENNY_BROD_GUARD_RETRAINING.location).length > 0;
      if (local && BigInt(clock.tick) > BigInt(state.economy.lifecycle.campaignTick)) {
        const advanced = await advanceRetrainingToClock(transaction, state, clock.tick);
        if (advanced) state = advanced;
      }
      return retrainingView(state, companyId);
    });
    return result === null ? reply.code(403).send({ error: 'company required' }) : result;
  });
}

function readExpectedCompanyId(rawHeaders: readonly string[]): string | undefined {
  let expectedCompanyId: string | undefined;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() !== WORLD_EXPECTED_COMPANY_ID_HEADER) continue;
    if (expectedCompanyId !== undefined || !isEntityId(rawHeaders[index + 1])) return undefined;
    expectedCompanyId = rawHeaders[index + 1];
  }
  return expectedCompanyId;
}

async function advanceRetrainingToClock(
  transaction: Transaction<DatabaseSchema>,
  state: CompanyCombatAggregateState,
  toTick: string,
) {
  const active = state.learning.tasks.tasks.filter(
    (task) => task.start.retraining !== undefined && !task.stop && !task.terminal,
  );
  if (active.length !== 1) return undefined;
  const commandId = randomUUID();
  const sourceEventId = randomUUID();
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    rulesetId: COMPANY_RULESET_ID,
    commandId,
    sourceEventId,
    worldId: state.economy.lifecycle.worldId,
    companyId: state.economy.lifecycle.companyId,
    actorRef: { kind: 'SYSTEM', id: 'company-retraining-observation' },
    expectedRevision: state.economy.lifecycle.revision,
    campaignTick: campaignTick(toTick),
    type: 'AdvanceCampaign',
    payload: { toTick, authoritativeInputs: [] },
  });
  if (!parsed.ok || parsed.command.type !== 'AdvanceCampaign') return undefined;
  const food = prepareStationaryFoodFacts(state, toTick, commandId);
  if (food.kind !== 'PREPARED') return undefined;
  const prepared = prepareCourseAdvance({
    state,
    command: parsed.command,
    physicalFacts: food.facts,
  });
  if (prepared.kind !== 'PREPARED') return undefined;
  const next = prepared.next;
  const response = {
    commandId,
    ok: true as const,
    publicRevision: next.economy.lifecycle.knowledge.revision,
  };
  const sourceKey = companySourceKey(parsed.command);
  if (sourceKey === null) return undefined;
  await updateCompanyAggregateWithReceipt(
    transaction,
    state.economy.lifecycle.revision,
    next.economy.lifecycle.revision,
    next,
    {
      command: parsed.command,
      receipt: {
        receiptId: randomUUID(),
        commandId,
        sourceKey,
        requestKey: canonicalJson({ kind: 'RETRAINING_OBSERVATION', commandId, toTick }),
        response,
        resultingRevision: next.economy.lifecycle.revision,
      },
      auditEvents: prepared.events.map((event) => ({
        eventId: (event as { readonly id?: string }).id ?? randomUUID(),
        revision: next.economy.lifecycle.revision,
        event,
      })),
    },
  );
  return next;
}

function retrainingView(
  state: CompanyCombatAggregateState,
  companyId: string,
): CompanyRetrainingResponseDto {
  const { lifecycle } = state.economy;
  const location = KAMENNY_BROD_GUARD_RETRAINING.location;
  const party = lifecycle.parties.length === 1 ? lifecycle.parties[0] : undefined;
  const local =
    party?.location.kind === 'AT' &&
    party.location.siteId === location.siteId &&
    party.location.areaId === location.areaId &&
    localCompanyContacts(state, companyId, location).length > 0;
  const tasks = state.learning.tasks.tasks.filter(
    (task) =>
      task.start.retraining !== undefined &&
      task.start.quote.sourceVersion === KAMENNY_BROD_GUARD_RETRAINING.sourceVersion,
  );
  const active = tasks.find((task) => !task.stop && !task.terminal);
  const completed = tasks.find((task) => task.terminal?.kind === 'GOAL_REACHED');
  const lastTask = [...tasks].reverse().find((task) => task !== active && task !== completed);
  const visibleTask = active ?? completed ?? lastTask;
  const otherLearning = state.learning.tasks.tasks.some(
    (task) => !task.stop && !task.terminal && task !== active,
  );
  const learners =
    !local || active || completed || otherLearning
      ? []
      : lifecycle.characters.flatMap((character) => {
          const characterId = character.identity.characterId;
          const member = lifecycle.memberships.some(
            (entry) =>
              entry.characterId === characterId &&
              entry.companyId === companyId &&
              entry.endedAt === null,
          );
          if (
            !member ||
            character.presence.fieldPartyId !== party?.partyId ||
            character.presence.location.kind !== 'AT' ||
            character.presence.location.siteId !== location.siteId ||
            character.presence.location.areaId !== location.areaId ||
            !canPerform(character, 'study')
          )
            return [];
          const perkPair = KAMENNY_BROD_GUARD_RETRAINING.perkPairs.find((pair) => {
            const oldPerk = COMPANY_CATALOGUE.perks.find((perk) => perk.id === pair.oldPerkId);
            const newPerk = COMPANY_CATALOGUE.perks.find((perk) => perk.id === pair.newPerkId);
            const skill = character.skills[KAMENNY_BROD_GUARD_RETRAINING.skillId];
            const progress = skill === undefined ? 0 : readSkillProgress(skill);
            const level = typeof progress === 'number' ? progress : skillLevel(progress);
            return (
              oldPerk !== undefined &&
              newPerk !== undefined &&
              character.perks.includes(pair.oldPerkId) &&
              !character.perks.includes(pair.newPerkId) &&
              level >= oldPerk.milestone
            );
          });
          return perkPair
            ? [
                {
                  characterId,
                  masteredPerkId: perkPair.oldPerkId,
                  replacementPerkId: perkPair.newPerkId,
                },
              ]
            : [];
        });
  const status = active
    ? 'IN_PROGRESS'
    : completed
      ? 'COMPLETE'
      : local && learners.length > 0
        ? 'AVAILABLE'
        : 'UNAVAILABLE';
  return {
    publicRevision: lifecycle.knowledge.revision,
    retraining: {
      courseId: KAMENNY_BROD_GUARD_RETRAINING.id,
      providerId: KAMENNY_BROD_GUARD_RETRAINING.providerId,
      skillId: KAMENNY_BROD_GUARD_RETRAINING.skillId,
      durationTicks: KAMENNY_BROD_GUARD_RETRAINING.durationTicks,
      costQPerDay: KAMENNY_BROD_GUARD_RETRAINING.costQPerDay,
      status,
      ...(status === 'UNAVAILABLE'
        ? {
            unavailableReason: !local
              ? ('NOT_LOCAL' as const)
              : otherLearning
                ? ('OTHER_LEARNING' as const)
                : ('NO_ELIGIBLE_LEARNER' as const),
          }
        : {}),
      learners,
      ...(visibleTask
        ? {
            progress: {
              taskId: visibleTask.start.taskId,
              learnerId: visibleTask.start.command.payload.characterId,
              oldPerkId: visibleTask.start.retraining!.oldPerkId,
              newPerkId: visibleTask.start.retraining!.newPerkId,
              acceptedTicks: visibleTask.completedTicks,
              remainingTicks: (
                BigInt(KAMENNY_BROD_GUARD_RETRAINING.durationTicks) -
                BigInt(visibleTask.completedTicks)
              ).toString(),
              chargedQ: (state.economy.finance.learningEffects ?? [])
                .filter((effect) => effect.taskId === visibleTask.start.taskId)
                .reduce((sum, effect) => sum + BigInt(effect.transferQ), 0n)
                .toString(),
            },
          }
        : {}),
    },
  };
}
