import { COMPANY_RULES } from './definitions.js';
import { farewellGrants, readFarewellOutcome } from './farewell-outcome.js';
import { FAREWELL_POLICY } from './farewell-types.js';
import { parseCompanyCommand } from './commands.js';
import { economyId, own, requireEconomy } from './economy-state.js';
import {
  array,
  canonicalJson,
  choice,
  id,
  natural,
  object,
  unsigned,
  type ValueOf,
} from './input.js';
import { recordLearnedFact, type SocialState } from './social.js';
import type { EconomyResult } from './economy-types.js';

const noticeInput = object({
  worldId: id,
  companyId: id,
  membershipId: id,
  personId: id,
  sourceCommandId: id,
  sourceEventId: id,
  learnedAt: unsigned,
  channel: choice('EXPERIENCE', 'WITNESS', 'REPORT'),
  salience: natural(),
});
/** Adapter-verified individual knowledge, never a player payload or inferred roster broadcast. */
export type FarewellNotice = ValueOf<typeof noticeInput>;

/** Authenticated parent preparation first; finance and E01/E02 remain the only owners. */
export function bindFarewellNotices(
  social: SocialState,
  prepared: Extract<EconomyResult, { kind: 'PREPARED' }>,
  values: readonly FarewellNotice[],
): SocialState {
  if (prepared.replayed) return social; // Historical acceptance cannot acquire fresh notices.
  const notices = own(values);
  requireEconomy(array(noticeInput).read(notices), 'INVALID_SOURCE');
  const state = prepared.next;
  let candidate = social;
  for (const notice of notices) {
    requireEconomy(
      notice.worldId === state.lifecycle.worldId && notice.companyId === state.lifecycle.companyId,
      'INVALID_SOURCE',
    );
    const outcome = readFarewellOutcome(state, notice.membershipId);
    requireEconomy(outcome && outcome.observerIds.includes(notice.personId), 'INVALID_SOURCE');
    const receipts = state.finance.applied;
    const sourceIndex = receipts.findIndex((r) => r.commandId === notice.sourceCommandId);
    const exitIndex = receipts.findIndex((r) => r.farewellOutcome?.factId === outcome.factId);
    requireEconomy(sourceIndex >= exitIndex && exitIndex >= 0, 'INVALID_SOURCE');
    const grants = farewellGrants(state, outcome.membershipId);
    const parsed = parseCompanyCommand(JSON.parse(receipts[sourceIndex]!.requestKey));
    requireEconomy(
      parsed.ok &&
        parsed.command.commandId === notice.sourceCommandId &&
        (parsed.command.sourceEventId ?? parsed.command.commandId) === notice.sourceEventId,
      'INVALID_SOURCE',
    );
    const source = parsed.command;
    requireEconomy(
      (sourceIndex === exitIndex
        ? source.type === 'ExecuteDeparture'
        : source.type === 'GrantFarewell' &&
          grants.some((g) => g.commandId === source.commandId)) &&
        (source.type === 'ExecuteDeparture' || source.type === 'GrantFarewell') &&
        source.payload.membershipId === outcome.membershipId,
      'INVALID_SOURCE',
    );
    requireEconomy(
      BigInt(notice.learnedAt) >= BigInt(source.campaignTick) &&
        notice.learnedAt === state.finance.processedTick,
      'INVALID_TIME',
    );
    // Validate the complete retained history, then follow journal order, not equal tick values.
    let given = 0n;
    let remedyAt: string | undefined;
    for (const receipt of receipts.slice(0, sourceIndex + 1)) {
      const grant = grants.find((g) => g.commandId === receipt.commandId);
      if (!grant) continue;
      given += BigInt(grant.amountQ);
      if (remedyAt === undefined && given >= BigInt(outcome.recognitionQ)) remedyAt = grant.atTick;
    }
    if (!outcome.eligible || BigInt(outcome.givenQ) >= BigInt(outcome.recognitionQ)) continue;
    const remedy = sourceIndex > exitIndex;
    if (remedy && remedyAt === undefined) continue; // Partial top-ups create no second penalty.
    const factId = remedy ? economyId(outcome.factId, 'compensated') : outcome.factId;
    const fact = {
      memoryId: economyId(factId, notice.personId, 'social'),
      personId: notice.personId,
      otherId: outcome.leaderId,
      factId,
      sourceEventId: notice.sourceEventId,
      happenedAt: remedy ? remedyAt! : outcome.atTick,
      learnedAt: notice.learnedAt,
      // Legacy cause identifier means inadequate recognition; positive givenQ is not "no payment".
      factType: remedy ? 'VeteranFarewellCompensated' : 'VeteranDismissedNoFarewell',
      channel: notice.channel,
      salience: notice.salience,
      emotionalDelta: {
        friendship: 0,
        fear: 0,
        rivalry: 0,
        respect: remedy ? 0 : FAREWELL_POLICY.respectDelta,
      },
      decayTicks: remedy ? '0' : COMPANY_RULES.socialMemoryDecayTicks,
      ...(remedy
        ? { resolvedFarewell: { factId: outcome.factId, happenedAt: outcome.atTick } }
        : {}),
    };
    const learned = recordLearnedFact(candidate, fact);
    requireEconomy(
      canonicalJson({
        ...learned.value,
        channel: fact.channel,
        salience: fact.salience,
        learnedAt: fact.learnedAt,
        sourceEventId: fact.sourceEventId,
      }) === canonicalJson(fact),
      'IDEMPOTENCY_CONFLICT',
    );
    candidate = learned.state;
  }
  return candidate;
}
