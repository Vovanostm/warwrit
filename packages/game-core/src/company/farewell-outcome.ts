import { FAREWELL_POLICY, farewellOutcomeInput } from './farewell-types.js';
import type { FarewellOutcome } from './farewell-types.js';
import { parseCompanyCommand } from './commands.js';
import { COMPANY_RULES } from './definitions.js';
import { wageAt } from './economy-accrual.js';
import { accountFor, day, economyId, own, requireEconomy } from './economy-state.js';
import { effectiveLeaderId, person } from './lifecycle-state.js';
import type { CompanyCommand } from './commands.js';
import type { CompanyEconomyState, EconomyReceipt } from './economy-types.js';
import type { LifecycleState } from './lifecycle-types.js';

function originalCommand(receipt: EconomyReceipt): CompanyCommand {
  let value: unknown;
  try {
    value = JSON.parse(receipt.requestKey);
  } catch {
    /* Rejected below, not invented history. */
  }
  const parsed = parseCompanyCommand(value);
  requireEconomy(parsed.ok && parsed.command.commandId === receipt.commandId, 'INVALID_SOURCE');
  return parsed.command;
}

/** Latest successfully confirmed choice, including an explicit request with no extra. */
export function selectedFarewell(state: CompanyEconomyState, intentId: string, through?: string) {
  const intent = state.finance.departures.find((d) => d.intentId === intentId);
  requireEconomy(intent, 'INVALID_SOURCE');
  const end =
    through === undefined
      ? state.finance.applied.length
      : state.finance.applied.findIndex((r) => r.commandId === through);
  requireEconomy(end >= 0, 'INVALID_SOURCE');
  for (const receipt of state.finance.applied.slice(0, end + 1).toReversed()) {
    const cmd = originalCommand(receipt);
    if (
      cmd.type !== 'RequestDeparture' ||
      cmd.payload.membershipId !== intent.membershipId ||
      cmd.payload.reason !== intent.reason ||
      cmd.payload.causeId !== intent.causeId
    )
      continue;
    requireEconomy(
      cmd.worldId === state.lifecycle.worldId && cmd.companyId === state.lifecycle.companyId,
      'INVALID_SOURCE',
    );
    if (cmd.payload.farewell)
      requireEconomy(
        cmd.actorRef.kind === 'PLAYER' &&
          intent.reason === 'DISMISSED' &&
          BigInt(cmd.payload.farewell.amountQ) > 0n,
        'INVALID_SOURCE',
      );
    return cmd.payload.farewell;
  }
  return undefined;
}

function grantChoice(state: CompanyEconomyState, cmd: CompanyCommand) {
  return cmd.type === 'GrantFarewell'
    ? cmd.payload
    : cmd.type === 'ExecuteDeparture'
      ? selectedFarewell(state, cmd.payload.intentId, cmd.commandId)
      : undefined;
}

/** The existing payment journal is authoritative; a balance or promise is not a grant. */
export function farewellGrants(state: CompanyEconomyState, membershipId: string, through?: string) {
  const end =
    through === undefined
      ? state.finance.applied.length
      : state.finance.applied.findIndex((r) => r.commandId === through);
  requireEconomy(end >= 0, 'INVALID_SOURCE');
  requireEconomy(
    state.finance.farewells
      .filter((g) => g.membershipId === membershipId)
      .every((g) => state.finance.applied.some((r) => r.commandId === g.commandId)),
    'INVALID_SOURCE',
  );
  const receipts = state.finance.applied.slice(0, end + 1);
  const accepted = new Map(receipts.map((r) => [r.commandId, originalCommand(r)]));
  const grants = state.finance.farewells.filter(
    (g) => g.membershipId === membershipId && accepted.has(g.commandId),
  );
  requireEconomy(new Set(grants.map((g) => g.commandId)).size === grants.length, 'INVALID_SOURCE');
  for (const grant of grants) {
    const command = accepted.get(grant.commandId)!;
    requireEconomy(
      command.companyId === state.lifecycle.companyId &&
        command.worldId === state.lifecycle.worldId &&
        (command.type === 'GrantFarewell' || command.type === 'ExecuteDeparture') &&
        command.payload.membershipId === membershipId &&
        command.campaignTick === grant.atTick &&
        BigInt(grant.amountQ) > 0n &&
        grantChoice(state, command)?.amountQ === grant.amountQ &&
        state.finance.movements.some(
          (m) =>
            m.movementId === economyId(grant.commandId, 'farewell') &&
            m.purpose === 'FAREWELL' &&
            m.amountQ === grant.amountQ &&
            m.atTick === grant.atTick,
        ),
      'INVALID_SOURCE',
    );
  }
  for (const command of accepted.values())
    if (
      (command.type === 'GrantFarewell' || command.type === 'ExecuteDeparture') &&
      command.payload.membershipId === membershipId &&
      grantChoice(state, command)
    )
      requireEconomy(
        grants.some(
          (g) =>
            g.commandId === command.commandId && g.amountQ === grantChoice(state, command)!.amountQ,
        ),
        'INVALID_SOURCE',
      );
  return grants;
}

/** One accepted policy owner; gift quote eligibility and its monetary maximum remain distinct. */
export function farewellTerms(state: CompanyEconomyState, membershipId: string, intentId: string) {
  const member = state.lifecycle.memberships.find((m) => m.membershipId === membershipId);
  const intent = state.finance.departures.find((d) => d.intentId === intentId);
  requireEconomy(member && intent?.membershipId === membershipId, 'INVALID_SOURCE');
  const atTick = member.endedAt ?? state.finance.processedTick;
  const recognitionQ = (
    BigInt(wageAt(accountFor(state.finance, membershipId), atTick).dailyWageMilli) * day
  ).toString();
  const eligible =
    intent.reason === 'DISMISSED' &&
    member.basis === 'PAID' &&
    BigInt(atTick) - BigInt(member.startedAt) >=
      BigInt(COMPANY_RULES.economy.significantServiceTicks) &&
    BigInt(recognitionQ) > 0n;
  return { member, intent, eligible, recognitionQ };
}

/** Internal finalization only, after the actual physical and financial owners succeeded. */
export function prepareFarewellOutcome(
  before: LifecycleState,
  state: CompanyEconomyState,
  command: Extract<CompanyCommand, { type: 'ExecuteDeparture' }>,
): FarewellOutcome {
  const { member, intent, eligible, recognitionQ } = farewellTerms(
    state,
    command.payload.membershipId,
    command.payload.intentId,
  );
  const previous = before.memberships.find((m) => m.membershipId === member.membershipId);
  requireEconomy(
    previous?.endedAt === null &&
      member.endedAt === command.campaignTick &&
      intent &&
      intent.membershipId === member.membershipId &&
      intent.cancelledAt === null,
    'INVALID_SOURCE',
  );
  const target = person(state.lifecycle, member.characterId);
  requireEconomy(
    target.presence.fieldPartyId === null &&
      target.presence.assignment === 'NONE' &&
      target.presence.encounterBindingId === null,
    'INVALID_SOURCE',
  );
  const leaderId = effectiveLeaderId(before);
  const grants = farewellGrants(state, member.membershipId);
  return own({
    policy: FAREWELL_POLICY.version,
    factId: economyId(before.worldId, before.companyId, member.membershipId, 'farewell-outcome'),
    worldId: before.worldId,
    companyId: before.companyId,
    membershipId: member.membershipId,
    personId: member.characterId,
    leaderId,
    sourceEventId: command.sourceEventId ?? command.commandId,
    atTick: member.endedAt,
    eligible,
    recognitionQ,
    givenQ: grants.reduce((sum, g) => sum + BigInt(g.amountQ), 0n).toString(),
    observerIds: before.memberships
      .filter((m) => m.endedAt === null && m.characterId !== leaderId)
      .map((m) => m.characterId),
  });
}

/** Private source lookup. Missing legacy outcomes remain unknown, never inferred as NONE. */
export function readFarewellOutcome(state: CompanyEconomyState, membershipId: string) {
  const receipts = state.finance.applied.filter(
    (r) => r.farewellOutcome?.membershipId === membershipId,
  );
  requireEconomy(receipts.length <= 1, 'INVALID_SOURCE');
  const receipt = receipts[0];
  if (!receipt) return undefined;
  const outcome = receipt.farewellOutcome;
  requireEconomy(farewellOutcomeInput.read(outcome), 'INVALID_SOURCE');
  const command = originalCommand(receipt);
  requireEconomy(command.type === 'ExecuteDeparture', 'INVALID_SOURCE');
  const { member, eligible, recognitionQ } = farewellTerms(
    state,
    membershipId,
    command.payload.intentId,
  );
  requireEconomy(
    command.type === 'ExecuteDeparture' &&
      command.payload.membershipId === membershipId &&
      command.companyId === outcome.companyId &&
      command.worldId === outcome.worldId &&
      outcome.companyId === state.lifecycle.companyId &&
      outcome.worldId === state.lifecycle.worldId &&
      outcome.personId === member.characterId &&
      outcome.atTick === member.endedAt &&
      outcome.atTick === command.campaignTick &&
      outcome.sourceEventId === (command.sourceEventId ?? command.commandId) &&
      outcome.factId ===
        economyId(outcome.worldId, outcome.companyId, membershipId, 'farewell-outcome') &&
      outcome.observerIds.includes(member.characterId) &&
      !outcome.observerIds.includes(outcome.leaderId),
    'INVALID_SOURCE',
  );
  person(state.lifecycle, outcome.leaderId);
  for (const observerId of outcome.observerIds) person(state.lifecycle, observerId);
  requireEconomy(
    outcome.recognitionQ === recognitionQ && outcome.eligible === eligible,
    'INVALID_SOURCE',
  );
  const grants = farewellGrants(state, membershipId, receipt.commandId);
  requireEconomy(
    outcome.givenQ === grants.reduce((sum, g) => sum + BigInt(g.amountQ), 0n).toString(),
    'INVALID_SOURCE',
  );
  return own(outcome);
}
