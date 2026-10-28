import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  PHYSICAL_POLICY_VERSION,
  canonicalJson,
  parseCompanyCommand,
  prepareCompanyEconomy,
  skillLevels,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  EconomyContext,
  EconomyReceipt,
  LocalMoneyAccess,
  FoodFulfillmentEvidence,
  QualificationNoticeEvidence,
} from '@warwrit/game-core';
import { payrollEvidenceId, preparePayrollAccess } from './payroll-access.js';
import type { PayrollScope } from './payroll-access.js';

type ObservationInput = PayrollScope & { readonly foodFacts: readonly FoodFulfillmentEvidence[] };
type PayrollObservation =
  | { readonly kind: 'REJECTED'; readonly reason: 'PAYROLL_PREPARATION_FAILED' }
  | {
      readonly kind: 'PREPARED';
      readonly next: CompanyEconomyState;
      readonly access: LocalMoneyAccess;
      readonly context: EconomyContext;
      readonly receipts: readonly EconomyReceipt[];
      readonly events: EconomyReceipt['events'];
      readonly allocations: EconomyReceipt['allocations'];
    };

function contactedPayees(root: CompanyEconomyState, contactIds: readonly string[]) {
  const services = new Set(
    root.finance.accounts
      .filter((account) => account.schedule)
      .map((account) => account.membershipId),
  );
  const subjects = new Set<string>(
    root.lifecycle.memberships
      .filter((member) => services.has(member.membershipId))
      .map((member) => member.characterId),
  );
  return contactIds.filter((id) => subjects.has(id));
}

function currentContext(
  root: CompanyEconomyState,
  scope: ObservationInput,
  access: LocalMoneyAccess,
  contactIds: readonly string[],
): EconomyContext {
  return {
    worldId: scope.worldId,
    companyId: scope.companyId,
    principal: { kind: 'DOMAIN_RECEIPT', id: 'local-payroll' },
    atTick: scope.atTick,
    canonicalRevision: root.lifecycle.revision,
    publicRevision: root.lifecycle.knowledge.revision,
    completeGraph: true,
    contactIds,
    facts: [],
    financeFacts: [access],
    physicalFacts:
      root.finance.processedTick === scope.atTick ? [] : structuredClone(scope.foodFacts),
  };
}

function qualificationNotice(
  root: CompanyEconomyState,
  scope: ObservationInput,
  subjectId: string,
  membershipId: string,
  observationId: string,
): QualificationNoticeEvidence | undefined {
  const character = root.lifecycle.characters.find(
    (entry) => entry.identity.characterId === subjectId,
  );
  const prior = root.lifecycle.knowledge.characters.find(
    (entry) => entry.identity.characterId === subjectId,
  );
  if (!character) return undefined;
  const lifetimeLevel = Math.max(...Object.values(skillLevels(character.skills)), 0);
  const previousLevel = prior
    ? Math.max(...Object.values(skillLevels(prior.skills)), 0)
    : undefined;
  if (previousLevel !== undefined && lifetimeLevel <= previousLevel) return undefined;
  const id = payrollEvidenceId(scope, `qualification:${subjectId}:${membershipId}`);
  return {
    kind: 'QUALIFICATION_NOTICE',
    id,
    worldId: scope.worldId,
    companyId: scope.companyId,
    revision: root.lifecycle.revision,
    atTick: scope.atTick,
    sourceEventId: observationId,
    membershipId,
    lifetimeLevel,
    noticeVersion: observationId,
  };
}

function observation(
  root: CompanyEconomyState,
  scope: ObservationInput,
  subjectId: string,
  ordinal: number,
  context: EconomyContext,
) {
  const id = payrollEvidenceId(scope, `observe:${ordinal}:${subjectId}`);
  const subject = { kind: 'CHARACTER' as const, id: subjectId };
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    rulesetId: COMPANY_RULESET_ID,
    commandId: id,
    sourceEventId: id,
    type: 'Observe',
    worldId: scope.worldId,
    companyId: scope.companyId,
    campaignTick: scope.atTick,
    expectedRevision: root.lifecycle.revision,
    actorRef: context.principal,
    payload: {
      observationId: id,
      factId: id,
      sourceId: id,
      subjectRef: subject,
      observerRef: { kind: 'COMPANY', id: scope.companyId },
    },
  });
  if (!parsed.ok) return undefined;
  const membership = root.lifecycle.memberships.find(
    (entry) => entry.characterId === subjectId && entry.endedAt === null,
  );
  const qualification = membership
    ? qualificationNotice(root, scope, subjectId, membership.membershipId, id)
    : undefined;
  const factScope = {
    id,
    sourceEventId: id,
    worldId: scope.worldId,
    companyId: scope.companyId,
    revision: root.lifecycle.revision,
    atTick: scope.atTick,
  };
  const facts: EconomyContext = {
    ...context,
    facts: [{ ...factScope, kind: 'COMPANY_OBSERVATION', subject }],
    physicalFacts: [
      ...(context.physicalFacts ?? []),
      {
        ...factScope,
        kind: 'PHYSICAL_OBSERVATION',
        version: PHYSICAL_POLICY_VERSION,
        ordinal: 0,
        observerCompanyId: scope.companyId,
        subject,
        itemIds: [],
        containerIds: [],
      },
    ],
    internalGrant: {
      commandId: id,
      sourceEventId: id,
      canonicalRequest: canonicalJson(parsed.command),
    },
  };
  const prepared = prepareCompanyEconomy(root, parsed.command, facts);
  if (prepared.kind === 'PREPARED' || !qualification) return prepared;
  return prepareCompanyEconomy(root, parsed.command, {
    ...facts,
    financeFacts: [...(context.financeFacts ?? []), qualification],
  });
}

/** Only an inseparable draft leaves this boundary; the caller must still prepare payment and persist atomically. */
export function observeLocalPayees(
  root: CompanyEconomyState,
  scope: ObservationInput,
): PayrollObservation {
  const rejected = { kind: 'REJECTED', reason: 'PAYROLL_PREPARATION_FAILED' } as const;
  let next = root;
  let local = preparePayrollAccess(next, scope);
  if (local.kind !== 'PREPARED') return rejected;
  const subjects = contactedPayees(root, local.contactIds);
  const receipts: EconomyReceipt[] = [];
  for (const [ordinal, subjectId] of subjects.entries()) {
    const context = currentContext(next, scope, local.access, local.contactIds);
    const result = observation(next, scope, subjectId, ordinal, context);
    if (result?.kind !== 'PREPARED' || result.replayed || result.receipt.requirements.length > 0)
      return rejected;
    next = result.next;
    receipts.push(result.receipt);
    local = preparePayrollAccess(next, scope);
    if (local.kind !== 'PREPARED') return rejected;
  }
  return {
    kind: 'PREPARED',
    next,
    access: local.access,
    context: currentContext(next, scope, local.access, local.contactIds),
    receipts,
    events: receipts.flatMap((receipt) => receipt.events),
    allocations: receipts.flatMap((receipt) => receipt.allocations),
  };
}
