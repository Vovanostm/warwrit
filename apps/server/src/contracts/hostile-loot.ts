import { createHash } from 'node:crypto';
import {
  campaignTick,
  canonicalJson,
  canPerform,
  COMPANY_CATALOGUE,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  entityId,
  parseCompanyCommand,
  PHYSICAL_POLICY_VERSION,
  prepareCompanyEconomy,
  readCompanyCombatAggregateState,
  type CompanyCombatAggregateState,
  type HuntProfile,
  type ItemAccessEvidence,
  type LootAuthorizationEvidence,
  type PhysicalContainer,
} from '@warwrit/game-core';
import type { CompanyCommand } from '@warwrit/game-core';
import type { HostileLootPickupRequestDto } from '@warwrit/protocol';
import type { FirstHuntHostileState } from './first-hunt-runtime.js';
import { prepareStationaryFoodFacts } from '../company/travel-food.js';

export type HostileLootPickupPreparation =
  | {
      readonly kind: 'PREPARED';
      readonly next: CompanyCombatAggregateState;
      readonly sourceContainer: PhysicalContainer;
      readonly command: CompanyCommand;
    }
  | { readonly kind: 'REJECTED'; readonly code: 'CAPACITY' | 'NOT_AVAILABLE' };

/** Prepare one exact ClaimLoot transfer from terminal gear retained by the hunt world. */
export function prepareHostileLootPickup(input: {
  readonly previous: CompanyCombatAggregateState;
  readonly accountId: string;
  readonly request: HostileLootPickupRequestDto;
  readonly worldId: string;
  readonly profile: HuntProfile;
  readonly hostile: FirstHuntHostileState;
  readonly terminalSourceId: string;
  readonly terminalRevision: number;
  readonly campaignTick: string;
}): HostileLootPickupPreparation {
  const previous = readCompanyCombatAggregateState(input.previous);
  const lifecycle = previous.economy.lifecycle;
  const physical = previous.economy.physical;
  const gear = input.hostile.gear;
  const location = { kind: 'AT' as const, ...input.profile.objectiveLocation };
  if (
    !physical ||
    lifecycle.worldId !== input.worldId ||
    previous.encounter.active !== null ||
    !gear ||
    (input.hostile.currentPools['health'] !== 0 && input.hostile.disposition !== 'surrendered') ||
    gear.terminalSourceId !== input.terminalSourceId ||
    gear.terminalRevision !== input.terminalRevision ||
    gear.items.filter((item) => item.itemId === input.request.itemId).length !== 1 ||
    physical.items.some((item) => item.itemId === input.request.itemId)
  )
    return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  const existingSource = physical.containers.find(
    (container) => container.containerId === gear.container.containerId,
  );
  if (existingSource && canonicalJson(existingSource) !== canonicalJson(gear.container))
    return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };

  const target = physical.containers.find(
    (container) => container.containerId === input.request.toContainerId,
  );
  const activeCharacterIds = new Set(
    lifecycle.memberships
      .filter(
        (membership) => membership.endedAt === null && membership.companyId === lifecycle.companyId,
      )
      .map((membership) => String(membership.characterId)),
  );
  const targetOwned =
    target &&
    ((target.custodian.kind === 'COMPANY' && target.custodian.id === lifecycle.companyId) ||
      (target.custodian.kind === 'CHARACTER' && activeCharacterIds.has(target.custodian.id)));
  const operator = lifecycle.characters
    .filter(
      (character) =>
        character.presence.availability === 'AVAILABLE' &&
        character.presence.encounterBindingId === null &&
        character.presence.location.kind === 'AT' &&
        character.presence.location.siteId === location.siteId &&
        character.presence.location.areaId === location.areaId &&
        activeCharacterIds.has(String(character.identity.characterId)) &&
        canPerform(character, 'travel'),
    )
    .toSorted((left, right) =>
      String(left.identity.characterId) < String(right.identity.characterId)
        ? -1
        : String(left.identity.characterId) > String(right.identity.characterId)
          ? 1
          : 0,
    )[0];
  if (
    !target ||
    !targetOwned ||
    target.access !== 'COMPANY' ||
    target.closed !== null ||
    !['CARRIED', 'PARTY_SUPPLY', 'STATIC'].includes(target.kind) ||
    target.location.kind !== 'AT' ||
    target.location.siteId !== location.siteId ||
    target.location.areaId !== location.areaId ||
    !operator
  )
    return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };

  const item = gear.items.find((entry) => entry.itemId === input.request.itemId)!;
  const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === item.definitionId);
  if (!definition?.enabled) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  const sourceContainer = gear.container;
  const withSource = readCompanyCombatAggregateState({
    ...previous,
    economy: {
      ...previous.economy,
      physical: {
        ...physical,
        containers: existingSource
          ? physical.containers
          : [...physical.containers, sourceContainer],
        items: [...physical.items, item],
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: [
            ...physical.knowledge.containerSnapshots.filter(
              (entry) => entry.containerId !== sourceContainer.containerId,
            ),
            sourceContainer,
          ],
          itemSnapshots: [
            ...physical.knowledge.itemSnapshots.filter((entry) => entry.itemId !== item.itemId),
            item,
          ],
        },
      },
    },
  });
  const sourceEventId = input.terminalSourceId;
  const factHash = createHash('sha256')
    .update(canonicalJson([lifecycle.worldId, sourceEventId, item.itemId, lifecycle.companyId]))
    .digest('hex');
  const evidenceScope = {
    companyId: lifecycle.companyId,
    worldId: lifecycle.worldId,
    revision: lifecycle.revision,
    sourceEventId: entityId(`hostile-loot-item-event:${factHash}`),
    atTick: campaignTick(input.campaignTick),
    ordinal: 0,
    version: PHYSICAL_POLICY_VERSION,
  };
  const access: ItemAccessEvidence = {
    ...evidenceScope,
    sourceEventId: entityId(`hostile-loot-access-event:${factHash}`),
    id: entityId(`hostile-loot-access:${factHash}`),
    kind: 'ITEM_ACCESS',
    operatorId: operator.identity.characterId,
    location,
    containerIds: [sourceContainer.containerId, target.containerId],
    itemIds: [item.itemId],
    purpose: 'LOOT',
  };
  const authorization: LootAuthorizationEvidence = {
    ...evidenceScope,
    id: factHash.slice(0, 24),
    kind: 'LOOT_AUTHORIZATION',
    outcomeId: sourceEventId,
    itemIds: [item.itemId],
    fromContainerIds: [sourceContainer.containerId],
    ownerAfter: { kind: 'COMPANY', id: lifecycle.companyId },
  };
  const food = prepareStationaryFoodFacts(previous, input.campaignTick, input.request.commandId);
  if (food.kind !== 'PREPARED') return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: input.request.commandId,
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    actorRef: { kind: 'PLAYER', id: input.accountId },
    expectedRevision: lifecycle.knowledge.revision,
    campaignTick: campaignTick(input.campaignTick),
    rulesetId: COMPANY_RULESET_ID,
    type: 'ClaimLoot',
    payload: {
      outcomeId: sourceEventId,
      itemQuantities: [{ itemId: item.itemId, quantity: item.quantity }],
      toContainerId: target.containerId,
      accessEvidenceId: access.id,
      claimAuthorizationId: authorization.id,
    },
  });
  if (!parsed.ok) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  const prepared = prepareCompanyEconomy(withSource.economy, parsed.command, {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    principal: { kind: 'PLAYER', id: input.accountId },
    publicRevision: lifecycle.knowledge.revision,
    canonicalRevision: lifecycle.revision,
    atTick: campaignTick(input.campaignTick),
    completeGraph: true,
    contactIds: [operator.identity.characterId],
    facts: [],
    financeFacts: [],
    physicalFacts: [...food.facts, access, authorization],
    practiceFacts: [],
  });
  if (prepared.kind !== 'PREPARED' || prepared.replayed) {
    return {
      kind: 'REJECTED',
      code:
        prepared.kind === 'REJECTED' && prepared.error === 'CAPACITY'
          ? 'CAPACITY'
          : 'NOT_AVAILABLE',
    };
  }
  const next = readCompanyCombatAggregateState({
    ...withSource,
    economy: { ...withSource.economy, ...prepared.next },
  });
  return { kind: 'PREPARED', next, sourceContainer, command: parsed.command };
}
