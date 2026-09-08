import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  birthTick,
  campaignTick,
  canonicalRevision,
  publicRevision,
  entityId,
  moneyQ,
  canonicalJson,
  createCompanyEconomyState,
  prepareCompanyEconomy,
} from '@warwrit/game-core';
import type {
  ActorKind,
  CompanyCommandType,
  CompanyEconomyState,
  EconomyContext,
  EconomyResult,
  FinanceEvidence,
  LifecycleEvidence,
  LifecycleState,
  LifecycleCharacter,
  AtLocation,
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
    ],
    [{ poolId: 'local', walletId: 'purse' }],
  );
  return {
    ...state,
    finance: {
      ...state.finance,
      accounts: members.map((m, i) => ({
        membershipId: m.membershipId,
        poolId: 'local',
        recipient: { kind: 'CHARACTER', id: m.characterId },
        known: true,
        confirmedAt: tick(at),
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
    },
  };
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
export function context(
  state: CompanyEconomyState,
  cmd: ReturnType<typeof command>,
  financeFacts: readonly FinanceEvidence[] = [],
  facts: readonly LifecycleEvidence[] = [],
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
