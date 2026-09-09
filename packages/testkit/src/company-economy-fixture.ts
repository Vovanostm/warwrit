import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  PHYSICAL_POLICY_VERSION,
  PHYSICAL_RULES,
  birthTick,
  campaignTick,
  canonicalJson,
  canonicalRevision,
  createCompanyEconomyState,
  createCompanyPhysicalState,
  entityId,
  moneyQ,
  prepareCompanyEconomy,
  publicRevision,
} from '@warwrit/game-core';
import type {
  ActorKind,
  AtLocation,
  CompanyCommandType,
  CompanyEconomyState,
  EconomyContext,
  EconomyResult,
  FinanceEvidence,
  LifecycleCharacter,
  LifecycleEvidence,
  LifecycleState,
  PhysicalEvidence,
} from '@warwrit/game-core';

export const place: AtLocation = { kind: 'AT', siteId: 'village', areaId: 'square' };
export const tick = (n: bigint | number | string) => campaignTick(String(n));
export const cash = (n: bigint | number | string) => moneyQ(String(n));

export function person(id: string, inParty = true): LifecycleCharacter {
  return {
    identity: {
      characterId: entityId(id),
      birthName: id,
      sex: 'male',
      birthCultureId: entityId('north'),
      birthplaceId: entityId('village'),
      originId: entityId('broken-company'),
      speciesId: entityId('human'),
      bornAt: birthTick('-10000000'),
    },
    presence: {
      characterId: entityId(id),
      location: place,
      assignment: inParty ? 'FIELD' : 'NONE',
      availability: 'AVAILABLE',
      fieldPartyId: inParty ? entityId('party') : null,
      encounterBindingId: null,
    },
    skills: { leadership: 25 },
    aptitudeBySkill: { leadership: 10000 },
    perks: [],
    conditionIds: [],
  };
}

function fixturePhysical(lifecycle: LifecycleState) {
  const supply = {
    containerId: 'fixture-supply',
    kind: 'STATIC' as const,
    location: place,
    custodian: { kind: 'COMPANY' as const, id: lifecycle.companyId },
    carrier: null,
    capacityG: 200000,
    access: 'COMPANY' as const,
    closed: null,
  };
  const rations = [0, 1].map((ordinal) => ({
    itemId: `fixture-rations-${ordinal}`,
    definitionId: 'ration',
    owner: { kind: 'COMPANY' as const, id: lifecycle.companyId },
    containerId: supply.containerId,
    quantity: 100,
    currentCondition: PHYSICAL_RULES.defaultConditionMaximum,
    maximumCondition: PHYSICAL_RULES.defaultConditionMaximum,
    contentRevision: '1',
    provenance: { sourceId: 'fixture-stock', parentItemId: null, ordinal },
    equipped: null,
    tombstone: null,
  }));
  return createCompanyPhysicalState(lifecycle, {
    containers: [supply],
    knownContainers: [supply],
    items: rations,
    knownItems: rations,
  });
}

/** A loaded, explicit local economy; small tariffs are intentional arithmetic examples. */
export function economy(
  rates: readonly bigint[] = [1n, 3n],
  balance = 100n,
  at = 1000,
): CompanyEconomyState {
  const ids = ['leader', ...rates.map((_, i) => `worker-${i}`)];
  const members = ids.map((id, i) => ({
    membershipId: entityId<'Membership'>(`service-${id}`),
    companyId: entityId<'Company'>('company'),
    characterId: entityId<'Character'>(id),
    basis: i === 0 ? ('FOUNDER' as const) : ('PAID' as const),
    startedAt: tick(0),
    endedAt: null,
    wageScheduleId: i === 0 ? null : entityId<'WageSchedule'>(`rate-${id}`),
  }));
  const characters = [...ids.map((id) => person(id)), person('provider', false)];
  const lifecycle: LifecycleState = {
    schemaVersion: 1,
    worldId: entityId('world'),
    companyId: entityId('company'),
    campaignTick: tick(at),
    revision: canonicalRevision('0'),
    company: {
      companyId: entityId('company'),
      worldId: entityId('world'),
      homeLocationId: entityId('village'),
      currentLeaderId: entityId('leader'),
      actingLeaderId: null,
      designatedHeirId: null,
      founderId: entityId('leader'),
      name: 'Company',
      bannerId: 'banner',
      householdIds: [],
      regencyHeirId: null,
      runStatus: 'ACTIVE',
      chronicleIds: [],
    },
    characters,
    memberships: members,
    parties: [{ partyId: 'party', location: place }],
    kinship: [],
    bypasses: [],
    applied: [],
    knowledge: {
      revision: publicRevision('0'),
      leaderId: entityId('leader'),
      designatedHeirId: null,
      runStatus: 'ACTIVE',
      characters: structuredClone(characters),
      candidateIds: [],
      eventIds: [],
    },
  };
  const state = createCompanyEconomyState(
    lifecycle,
    [
      {
        walletId: 'purse',
        owner: { kind: 'COMPANY', id: 'company' },
        location: place,
        cashQ: cash(balance),
      },
      ...ids.map((id) => ({
        walletId: `wallet-${id}`,
        owner: { kind: 'CHARACTER' as const, id },
        location: place,
        cashQ: cash(0),
      })),
      {
        walletId: 'wallet-provider',
        owner: { kind: 'CHARACTER' as const, id: 'provider' },
        location: place,
        cashQ: cash(0),
      },
    ],
    [{ poolId: 'local', walletId: 'purse' }],
  );
  const finance = {
    ...state.finance,
    accounts: members.map((m, i) => ({
      membershipId: m.membershipId,
      poolId: 'local',
      recipient: { kind: 'CHARACTER' as const, id: m.characterId },
      known: true,
      confirmedAt: tick(at),
      actualPaused: false,
      knownPaused: false,
      knownDeath: false,
      death: null,
      schedule:
        i === 0
          ? null
          : {
              scheduleId: m.wageScheduleId!,
              agreedAt: tick(0),
              agreedDailyWageMilli: String(rates[i - 1]),
              rates: [
                { minimumLevel: 0, dailyWageMilli: String(rates[i - 1]) },
                { minimumLevel: 25, dailyWageMilli: String(rates[i - 1]! * 2n) },
              ],
              notices: [],
            },
    })),
  };
  return { ...state, finance, physical: fixturePhysical(lifecycle) };
}

export function claims(
  state: CompanyEconomyState,
  weights: readonly bigint[],
): CompanyEconomyState {
  return {
    ...state,
    finance: {
      ...state.finance,
      claims: weights.map((weight, i) => ({
        claimId: `claim-${i}`,
        membershipId: `service-worker-${i}`,
        poolId: 'local',
        rateVersion: `rate-worker-${i}`,
        dueAt: tick(1000),
        fromTick: tick(999),
        toTick: tick(1000),
        dailyWageMilli: String(weight),
        maintenanceId: null,
        earned: [
          {
            fromTick: tick(999),
            toTick: tick(1000),
            dailyWageMilli: String(weight),
            maintenanceId: null,
          },
        ],
        paidQ: cash(0),
        reportedQ: cash(weight),
        reportedCoveredQ: cash(0),
      })),
    },
  };
}

export function command(
  state: CompanyEconomyState,
  type: CompanyCommandType,
  payload: unknown,
  id = `${type}-${state.lifecycle.revision}`,
  actor: ActorKind = 'PLAYER',
  at = state.finance.processedTick,
) {
  return {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: id,
    type,
    payload,
    worldId: state.lifecycle.worldId,
    companyId: state.lifecycle.companyId,
    actorRef: { kind: actor, id: 'principal' },
    campaignTick: at,
    expectedRevision:
      actor === 'PLAYER' ? state.lifecycle.knowledge.revision : state.lifecycle.revision,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId: `source-${id}`,
  };
}

export function scope(state: CompanyEconomyState, id: string, at = state.finance.processedTick) {
  return {
    id,
    companyId: state.lifecycle.companyId,
    worldId: state.lifecycle.worldId,
    revision: state.lifecycle.revision,
    sourceEventId: `source-${id}`,
    atTick: at,
  };
}

export function physicalScope(
  state: CompanyEconomyState,
  id: string,
  at = state.finance.processedTick,
  ordinal = 0,
) {
  return {
    ...scope(state, id, at),
    ordinal,
    version: PHYSICAL_POLICY_VERSION,
  };
}

function addBoundary(
  points: Set<bigint>,
  value: string | null | undefined,
  from: bigint,
  to: bigint,
) {
  if (value == null) return;
  const tickValue = BigInt(value);
  if (tickValue > from && tickValue < to) points.add(tickValue);
}

function automaticFoodFacts(
  state: CompanyEconomyState,
  cmd: ReturnType<typeof command>,
): readonly PhysicalEvidence[] {
  if (cmd.type !== 'AdvanceCampaign') return [];
  const from = BigInt(state.finance.processedTick);
  const to = BigInt((cmd.payload as { toTick: string }).toTick);
  if (to <= from) return [];
  const points = new Set<bigint>([from, to]);
  for (let boundary = (from / 1000n + 1n) * 1000n; boundary < to; boundary += 1000n)
    points.add(boundary);
  for (const membership of state.lifecycle.memberships) {
    addBoundary(points, membership.startedAt, from, to);
    addBoundary(points, membership.endedAt, from, to);
  }
  for (const account of state.finance.accounts) {
    addBoundary(points, account.death?.atTick, from, to);
    for (const notice of account.schedule?.notices ?? [])
      addBoundary(points, notice.effectiveAt, from, to);
  }
  for (const maintenance of state.finance.maintenance) {
    addBoundary(points, maintenance.startedAt, from, to);
    addBoundary(points, maintenance.endedAt, from, to);
    addBoundary(points, maintenance.knownEndedAt, from, to);
    for (const end of maintenance.beneficiaryEnds) {
      addBoundary(points, end.atTick, from, to);
      addBoundary(points, end.knownAtTick, from, to);
    }
  }
  const ordered = [...points].sort((a, b) => (a < b ? -1 : 1));
  const facts: PhysicalEvidence[] = [];
  let ordinal = 0;
  for (const membership of state.lifecycle.memberships) {
    for (let i = 0; i < ordered.length - 1; i++) {
      const start = ordered[i]!;
      const end = ordered[i + 1]!;
      if (
        start < BigInt(membership.startedAt) ||
        (membership.endedAt !== null && start >= BigInt(membership.endedAt))
      )
        continue;
      const id = `food-${membership.membershipId}-${start}-${end}`;
      facts.push({
        ...physicalScope(state, id, tick(to), ordinal++),
        kind: 'FOOD_FULFILLMENT',
        membershipId: membership.membershipId,
        fromTick: tick(start),
        toTick: tick(end),
        channel: 'STOCK',
        location: place,
        containerId: 'fixture-supply',
      });
    }
  }
  return facts;
}

export function context(
  state: CompanyEconomyState,
  cmd: ReturnType<typeof command>,
  financeFacts: readonly FinanceEvidence[] = [],
  facts: readonly LifecycleEvidence[] = [],
  physicalFacts: readonly PhysicalEvidence[] = [],
): EconomyContext {
  return {
    companyId: state.lifecycle.companyId,
    worldId: state.lifecycle.worldId,
    principal: cmd.actorRef,
    publicRevision: state.lifecycle.knowledge.revision,
    canonicalRevision: state.lifecycle.revision,
    atTick: cmd.campaignTick,
    completeGraph: true,
    contactIds: state.lifecycle.characters.map((c) => c.identity.characterId),
    facts,
    financeFacts,
    physicalFacts: [...automaticFoodFacts(state, cmd), ...physicalFacts],
    internalGrant: {
      commandId: cmd.commandId,
      sourceEventId: cmd.sourceEventId,
      canonicalRequest: canonicalJson(cmd),
    },
  };
}

export function access(
  state: CompanyEconomyState,
  at = state.finance.processedTick,
): FinanceEvidence {
  return {
    ...scope(state, 'money-access', at),
    kind: 'LOCAL_MONEY_ACCESS',
    operatorId: 'leader',
    location: place,
    poolIds: ['local'],
    recipientWalletIds: state.finance.wallets
      .filter((w) => w.owner.kind === 'CHARACTER')
      .map((w) => w.walletId),
  };
}

export function prepared(result: EconomyResult) {
  if (result.kind !== 'PREPARED') throw new Error(result.error);
  return result;
}

export function pay(
  state: CompanyEconomyState,
  amount: bigint,
  mode: 'DEFAULT' | 'TARGETED' = 'DEFAULT',
  payeeId = 'worker-0',
) {
  const cmd = command(state, 'PayClaims', {
    poolId: 'local',
    amountQ: String(amount),
    claimIds: [],
    mode,
    ...(mode === 'TARGETED' ? { payeeId } : {}),
  });
  return prepared(prepareCompanyEconomy(state, cmd, context(state, cmd, [access(state)])));
}

export function advance(
  state: CompanyEconomyState,
  to: number,
  financeFacts: readonly FinanceEvidence[] = [],
) {
  const cmd = command(
    state,
    'AdvanceCampaign',
    {
      toTick: String(to),
      authoritativeInputs: financeFacts
        .filter((f) =>
          ['QUALIFICATION_NOTICE', 'WAGE_COMMUNICATION', 'MAINTENANCE_BOUNDARY'].includes(f.kind),
        )
        .map((f) => f.id),
    },
    `advance-${to}-${state.lifecycle.revision}`,
    'SYSTEM',
  );
  return prepared(prepareCompanyEconomy(state, cmd, context(state, cmd, financeFacts)));
}

export function observation(
  state: CompanyEconomyState,
  characterId: string,
  financeFacts: readonly FinanceEvidence[] = [],
  itemIds: readonly string[] = [],
  containerIds: readonly string[] = [],
) {
  const id = `see-${characterId}-${state.lifecycle.knowledge.revision}`;
  const cmd = command(
    state,
    'Observe',
    {
      observationId: id,
      observerRef: { kind: 'COMPANY', id: state.lifecycle.companyId },
      subjectRef: { kind: 'CHARACTER', id: characterId },
      factId: id,
      sourceId: `source-${id}`,
    },
    id,
    'DOMAIN_RECEIPT',
  );
  const fact: LifecycleEvidence = {
    ...scope(state, id),
    sourceEventId: cmd.sourceEventId,
    kind: 'COMPANY_OBSERVATION',
    subject: { kind: 'CHARACTER', id: characterId },
  };
  const physicalFact: PhysicalEvidence = {
    ...physicalScope(state, id),
    sourceEventId: cmd.sourceEventId,
    kind: 'PHYSICAL_OBSERVATION',
    observerCompanyId: state.lifecycle.companyId,
    subject: { kind: 'CHARACTER', id: characterId },
    itemIds,
    containerIds,
  };
  const ctx = context(state, cmd, financeFacts, [fact], [physicalFact]);
  return { cmd, ctx, result: prepared(prepareCompanyEconomy(state, cmd, ctx)) };
}
