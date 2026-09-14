import { COMPANY_RULES } from './definitions.js';
import { canonicalJson } from './input.js';
import { economyId, requireEconomy } from './economy-state.js';
import { person } from './lifecycle-state.js';
import { recordLearnedFact } from './social.js';
import { isExactInteger } from './values.js';
import type { LearnedFact, SocialState } from './social.js';
import type { EconomyResult, WageCommunicationEvidence } from './economy-types.js';

export interface FinancialSocialKnowledge {
  readonly sourceEventId: string;
  readonly personId: string;
  readonly channel: LearnedFact['channel'];
  readonly salience: number;
}
/** Internal candidate only: commit with its parent; E05 owns public disclosure. */
export function bindFinancialSocialConsequences(
  social: SocialState,
  prepared: Extract<EconomyResult, { kind: 'PREPARED' }>,
  knowledge: readonly FinancialSocialKnowledge[],
) {
  const { next: state, receipt } = prepared;
  const saved = state.finance.applied.find((r) => r.commandId === receipt.commandId);
  const matches = saved && canonicalJson(saved) === canonicalJson(receipt);
  requireEconomy(matches, 'INVALID_SOURCE');
  let candidate = social;
  for (const requirement of receipt.requirements) {
    if (requirement.kind !== 'INFORMED_SOCIAL_CONTRIBUTION') continue;
    person(state.lifecycle, requirement.characterId);
    if (requirement.cause === 'FAREWELL') {
      const grant = state.finance.farewells.find((g) => g.commandId === receipt.commandId);
      const member = state.lifecycle.memberships.find(
        (m) => m.membershipId === grant?.membershipId,
      );
      requireEconomy(
        grant &&
          member?.characterId === requirement.characterId &&
          requirement.sourceId === economyId(member.membershipId, 'farewell') &&
          state.finance.movements.some(
            (m) =>
              m.movementId === economyId(grant.commandId, 'farewell') &&
              m.purpose === 'FAREWELL' &&
              m.amountQ === grant.amountQ &&
              m.atTick === grant.atTick,
          ),
        'INVALID_SOURCE',
      );
      // Funded gift history is not VeteranDismissedNoFarewell and grants no XP/loyalty reward.
      continue;
    }
    const episode = state.finance.arrears.find((e) => e.episodeId === requirement.sourceId);
    const member = state.lifecycle.memberships.find(
      (m) => m.membershipId === episode?.membershipId,
    );
    requireEconomy(episode && member?.characterId === requirement.characterId, 'INVALID_SOURCE');
    if (!requirement.communicationSourceId)
      throw new Error('LEGACY_WAGE_COMMUNICATION_BINDING_REQUIRED');
    const key = canonicalJson([
      'WAGE_COMMUNICATION',
      requirement.communicationSourceId,
      member.membershipId,
    ]);
    const archived = state.finance.sourceEffects.find((e) => e.key === key);
    requireEconomy(archived, 'INVALID_SOURCE');
    const communication = JSON.parse(archived.requestKey) as WageCommunicationEvidence;
    requireEconomy(
      communication.kind === 'WAGE_COMMUNICATION' &&
        communication.sourceEventId === requirement.communicationSourceId &&
        communication.companyId === state.lifecycle.companyId &&
        communication.worldId === state.lifecycle.worldId &&
        communication.membershipId === member.membershipId &&
        isExactInteger(communication.atTick) &&
        BigInt(communication.atTick) >= BigInt(episode.firstDueAt) &&
        BigInt(communication.atTick) <= BigInt(state.finance.processedTick),
      'INVALID_SOURCE',
    );
    person(state.lifecycle, communication.leaderId);
    if (requirement.cause === 'FINAL_WARNING') {
      requireEconomy(
        episode.warning?.sourceId === communication.sourceEventId &&
          episode.warning.atTick === communication.atTick &&
          episode.warning.leaderId === communication.leaderId &&
          canonicalJson(episode.warning.relation) === canonicalJson(communication.relation),
        'INVALID_SOURCE',
      );
      continue; // Same wage episode, not a second penalty or a new leave reason.
    }
    requireEconomy(
      requirement.cause === 'WAGE_COMPLAINT' && episode.complaintAt === communication.atTick,
      'INVALID_SOURCE',
    );
    const known = candidate.chronicle.find(
      (m) => m.personId === member.characterId && m.factId === episode.episodeId,
    );
    const observations = knowledge.filter(
      (k) => k.sourceEventId === communication.sourceEventId && k.personId === member.characterId,
    );
    requireEconomy(observations.length <= 1 && (known || observations[0]), 'INVALID_SOURCE');
    const fact = {
      memoryId: economyId(episode.episodeId, member.characterId, 'social'),
      personId: member.characterId,
      otherId: communication.leaderId,
      factId: episode.episodeId,
      sourceEventId: communication.sourceEventId,
      happenedAt: episode.firstDueAt,
      learnedAt: communication.atTick,
      factType: 'WageDelayed',
      channel: (known ?? observations[0]!).channel,
      salience: (known ?? observations[0]!).salience,
      emotionalDelta: {
        friendship: 0,
        fear: 0,
        rivalry: 0,
        respect: COMPANY_RULES.wageDelayRespectDelta,
      },
      decayTicks: COMPANY_RULES.socialMemoryDecayTicks,
    };
    const learned = recordLearnedFact(candidate, fact);
    requireEconomy(canonicalJson(learned.value) === canonicalJson(fact), 'IDEMPOTENCY_CONFLICT');
    candidate = learned.state;
  }
  return {
    economy: state,
    social: candidate,
    requirements: receipt.requirements.filter((r) => r.kind !== 'INFORMED_SOCIAL_CONTRIBUTION'),
  };
}
