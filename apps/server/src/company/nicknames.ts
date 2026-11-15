import { createHash } from 'node:crypto';
import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  canonicalJson,
  campaignTick,
  parseCompanyCommand,
  prepareCompanyLifecycle,
} from '@warwrit/game-core';
import type {
  BattleState,
  CompanyCombatAggregateState,
  LifecycleContext,
  NicknameDeedEvidence,
} from '@warwrit/game-core';

const RESILIENT_TEXT_KEY = 'nickname.resilient';
const RESILIENT_REASON_KEY = 'nickname.reason.survived_near_death';
const RESILIENT_DEED_KIND = 'SURVIVED_NEAR_DEATH';

/**
 * Propose the established «Живучий» epithet for eligible company fighters.
 * The caller supplies a verified final battle state and the before/after roots
 * retained by the encounter receipt path; no player input can supply evidence.
 */
export function proposeResilientNicknames(input: {
  readonly before: CompanyCombatAggregateState;
  readonly after: CompanyCombatAggregateState;
  readonly finalState: BattleState;
  readonly atTick: string;
}): { readonly state: CompanyCombatAggregateState; readonly sourceEventIds: readonly string[] } {
  const { before, finalState } = input;
  let state = input.after;
  const companyId = before.economy.lifecycle.companyId;
  const initialLifecycle = state.economy.lifecycle;
  const binding = before.encounter.active?.binding;
  const winnerSideId = finalState.outcome?.winnerSideId;
  if (
    finalState.status !== 'resolved' ||
    !winnerSideId ||
    finalState.battleId !== binding?.setup.battleId ||
    companyId !== initialLifecycle.companyId ||
    initialLifecycle.company?.runStatus !== 'ACTIVE'
  )
    return { state, sourceEventIds: [] };

  const sourceEventIds: string[] = [];
  for (const participant of binding.participants) {
    if (participant.companyId !== companyId || participant.sideId !== winnerSideId) continue;
    const unit = finalState.units.find((entry) => entry.id === participant.unitId);
    const lifecycle = state.economy.lifecycle;
    const character = lifecycle.characters.find(
      (entry) => entry.identity.characterId === participant.projection.characterId,
    );
    const vitals = state.economy.physical?.vitals.find(
      (entry) => entry.characterId === participant.projection.characterId,
    );
    if (
      !unit ||
      unit.status === 'dead' ||
      !character ||
      character.presence.availability === 'DEAD' ||
      !vitals ||
      !Number.isSafeInteger(participant.vitals.maximumHealth) ||
      participant.vitals.maximumHealth <= 0 ||
      unit.health * 4 > participant.vitals.maximumHealth
    )
      continue;

    const characterId = character.identity.characterId;
    const sourceEventId = stableId('nickname-deed', finalState.battleId, characterId);
    const proposalId = stableId('nickname-proposal', finalState.battleId, characterId);
    const commandId = stableId('nickname-command', finalState.battleId, characterId);
    if (
      (state.economy.lifecycle.nicknameProposals ?? []).some(
        (proposal) => proposal.sourceEventId === sourceEventId,
      ) ||
      state.economy.lifecycle.applied.some((receipt) => receipt.commandId === commandId)
    )
      continue;

    const tick = campaignTick(input.atTick);
    const commandValue = {
      schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
      rulesetId: COMPANY_RULESET_ID,
      commandId,
      sourceEventId,
      type: 'ProposeNickname',
      worldId: lifecycle.worldId,
      companyId,
      campaignTick: tick,
      expectedRevision: lifecycle.revision,
      actorRef: { kind: 'DOMAIN_RECEIPT', id: sourceEventId },
      payload: {
        proposalId,
        characterId,
        sourceEventId,
        textKey: RESILIENT_TEXT_KEY,
      },
    };
    const parsed = parseCompanyCommand(commandValue);
    if (!parsed.ok || parsed.command.type !== 'ProposeNickname')
      throw new Error('Unable to construct trusted resilient nickname command');

    const deed: NicknameDeedEvidence = {
      id: sourceEventId,
      sourceEventId,
      worldId: lifecycle.worldId,
      companyId,
      revision: lifecycle.revision,
      atTick: tick,
      kind: 'NICKNAME_DEED',
      characterId,
      cultureId: character.identity.birthCultureId,
      deedKind: RESILIENT_DEED_KIND,
      reasonKey: RESILIENT_REASON_KEY,
      textKey: RESILIENT_TEXT_KEY,
    };
    const canonicalRequest = canonicalJson(parsed.command);
    const context: LifecycleContext = {
      worldId: lifecycle.worldId,
      companyId,
      principal: { kind: 'DOMAIN_RECEIPT', id: sourceEventId },
      publicRevision: lifecycle.knowledge.revision,
      canonicalRevision: lifecycle.revision,
      internalGrant: { commandId, sourceEventId, canonicalRequest },
      atTick: tick,
      completeGraph: true,
      contactIds: [],
      facts: [deed],
    };
    const prepared = prepareCompanyLifecycle(lifecycle, parsed.command, context);
    if (prepared.kind !== 'PREPARED')
      throw new Error(`Resilient nickname proposal rejected: ${prepared.error}`);
    state = {
      ...state,
      economy: { ...state.economy, lifecycle: prepared.next },
    };
    sourceEventIds.push(sourceEventId);
  }
  return { state, sourceEventIds };
}

function stableId(kind: string, battleId: string, characterId: string): string {
  const digest = createHash('sha256').update(`${kind}\0${battleId}\0${characterId}`).digest('hex');
  return `${kind}-${digest}`;
}
