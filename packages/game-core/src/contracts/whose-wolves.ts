const WHOSE_WOLVES_RAID_DELAY_TICKS = 7_000n;

export const WHOSE_WOLVES_INSTANCE_ID = 'ci.m1.whose-wolves.01' as const;
export const WHOSE_WOLVES_ISSUER_ID = 'npc.kondrat-ovsyanik.severny-dvor.01' as const;
export const WHOSE_WOLVES_REWARD_Q = '80000000' as const;
export const WHOSE_WOLVES_GUIDE_ORIGIN_SITE_ID = 'tikhaya-gat' as const;
export const WHOSE_WOLVES_GUIDE_DESTINATION_SITE_ID = 'severny-dvor' as const;

export type WhoseWolvesFindingId = 'bones-and-fish-guts' | 'efim-feeds-the-pack';

export interface WhoseWolvesFinding {
  readonly findingId: WhoseWolvesFindingId;
  readonly sourceEventId: string;
  readonly atTick: string;
}

export interface WhoseWolvesCompanyState {
  readonly companyId: string;
  readonly findings: readonly WhoseWolvesFinding[];
  readonly refusalPending: boolean;
  readonly deniedOfferInstanceId?: string;
}

export interface WhoseWolvesOutcome {
  readonly kind: 'PACK_KILLED' | 'PACK_SPARED_AND_EXPOSED';
  readonly companyId: string;
  readonly sourceEventId: string;
  readonly atTick: string;
  readonly raidDueTick?: string;
  readonly raidAtTick?: string;
}

export interface WhoseWolvesQuestState {
  readonly schemaVersion: 1;
  readonly companies: readonly WhoseWolvesCompanyState[];
  readonly outcome: WhoseWolvesOutcome | null;
}

export interface WhoseWolvesGuideEntitlement {
  readonly sourceEventId: string;
  readonly originSiteId: typeof WHOSE_WOLVES_GUIDE_ORIGIN_SITE_ID;
  readonly destinationSiteId: typeof WHOSE_WOLVES_GUIDE_DESTINATION_SITE_ID;
  readonly timeMultiplier: { readonly numerator: 3; readonly denominator: 4 };
}

export const emptyWhoseWolvesQuestState = (): WhoseWolvesQuestState => ({
  schemaVersion: 1,
  companies: [],
  outcome: null,
});

export function readWhoseWolvesQuestState(value: unknown): WhoseWolvesQuestState {
  if (!isRecord(value) || !hasExactKeys(value, ['schemaVersion', 'companies', 'outcome']))
    throw new TypeError('Whose-wolves quest state is invalid');
  if (value['schemaVersion'] !== 1 || !Array.isArray(value['companies']))
    throw new TypeError('Whose-wolves quest state is invalid');
  const companyIds = new Set<string>();
  const companies = value['companies'].map((raw) => {
    if (
      !isRecord(raw) ||
      !['companyId', 'findings', 'refusalPending'].every((key) => Object.hasOwn(raw, key)) ||
      Object.keys(raw).some(
        (key) =>
          !['companyId', 'findings', 'refusalPending', 'deniedOfferInstanceId'].includes(key),
      ) ||
      !isText(raw['companyId']) ||
      !Array.isArray(raw['findings']) ||
      typeof raw['refusalPending'] !== 'boolean' ||
      (raw['deniedOfferInstanceId'] !== undefined && !isText(raw['deniedOfferInstanceId']))
    )
      throw new TypeError('Whose-wolves company state is invalid');
    if (companyIds.has(raw['companyId'])) throw new TypeError('Duplicate whose-wolves company');
    companyIds.add(raw['companyId']);
    const findingIds = new Set<string>();
    const findings = raw['findings'].map((finding) => {
      if (
        !isRecord(finding) ||
        !hasExactKeys(finding, ['findingId', 'sourceEventId', 'atTick']) ||
        (finding['findingId'] !== 'bones-and-fish-guts' &&
          finding['findingId'] !== 'efim-feeds-the-pack') ||
        !isText(finding['sourceEventId']) ||
        !isDecimal(finding['atTick']) ||
        findingIds.has(finding['findingId'])
      )
        throw new TypeError('Whose-wolves finding is invalid');
      findingIds.add(finding['findingId']);
      return finding as unknown as WhoseWolvesFinding;
    });
    return {
      companyId: raw['companyId'],
      findings,
      refusalPending: raw['refusalPending'],
      ...(typeof raw['deniedOfferInstanceId'] === 'string'
        ? { deniedOfferInstanceId: raw['deniedOfferInstanceId'] }
        : {}),
    } satisfies WhoseWolvesCompanyState;
  });
  const outcome = value['outcome'] === null ? null : readWhoseWolvesOutcome(value['outcome']);
  if (outcome && !companyIds.has(outcome.companyId))
    throw new TypeError('Whose-wolves outcome has no company state');
  return { schemaVersion: 1, companies, outcome };
}

export function recordWhoseWolvesFinding(
  state: WhoseWolvesQuestState,
  input: {
    readonly companyId: string;
    readonly findingId: WhoseWolvesFindingId;
    readonly sourceEventId: string;
    readonly atTick: string;
  },
): WhoseWolvesQuestState | undefined {
  if (!isText(input.companyId) || !isText(input.sourceEventId) || !isDecimal(input.atTick))
    return undefined;
  if (state.outcome !== null) return undefined;
  const company = companyState(state, input.companyId);
  if (company.findings.some((finding) => finding.findingId === input.findingId)) return undefined;
  if (
    input.findingId === 'efim-feeds-the-pack' &&
    !company.findings.some((finding) => finding.findingId === 'bones-and-fish-guts')
  )
    return undefined;
  const nextCompany = {
    ...company,
    findings: [
      ...company.findings,
      {
        findingId: input.findingId,
        sourceEventId: input.sourceEventId,
        atTick: input.atTick,
      },
    ],
  };
  return replaceCompany(state, nextCompany);
}

export function exposeWhoseWolvesTruth(
  state: WhoseWolvesQuestState,
  input: { readonly companyId: string; readonly sourceEventId: string; readonly atTick: string },
): WhoseWolvesQuestState | undefined {
  if (state.outcome !== null || !isText(input.sourceEventId) || !isDecimal(input.atTick))
    return undefined;
  const company = companyState(state, input.companyId);
  if (
    !company.findings.some((finding) => finding.findingId === 'bones-and-fish-guts') ||
    !company.findings.some((finding) => finding.findingId === 'efim-feeds-the-pack')
  )
    return undefined;
  const nextCompany = { ...company, refusalPending: true };
  return {
    ...replaceCompany(state, nextCompany),
    outcome: {
      kind: 'PACK_SPARED_AND_EXPOSED',
      companyId: input.companyId,
      sourceEventId: input.sourceEventId,
      atTick: input.atTick,
    },
  };
}

export function settleWhoseWolvesKill(
  state: WhoseWolvesQuestState,
  input: { readonly companyId: string; readonly sourceEventId: string; readonly atTick: string },
): WhoseWolvesQuestState | undefined {
  if (state.outcome !== null || !isText(input.companyId) || !isText(input.sourceEventId))
    return undefined;
  if (!isDecimal(input.atTick)) return undefined;
  const dueTick = (BigInt(input.atTick) + WHOSE_WOLVES_RAID_DELAY_TICKS).toString();
  return {
    ...state,
    companies: ensureCompany(state, input.companyId),
    outcome: {
      kind: 'PACK_KILLED',
      companyId: input.companyId,
      sourceEventId: input.sourceEventId,
      atTick: input.atTick,
      raidDueTick: dueTick,
    },
  };
}

export function matureWhoseWolvesRaid(
  state: WhoseWolvesQuestState,
  currentTick: string,
): WhoseWolvesQuestState | undefined {
  const outcome = state.outcome;
  if (
    outcome?.kind !== 'PACK_KILLED' ||
    outcome.raidAtTick !== undefined ||
    outcome.raidDueTick === undefined ||
    !isDecimal(currentTick) ||
    BigInt(currentTick) < BigInt(outcome.raidDueTick)
  )
    return undefined;
  return { ...state, outcome: { ...outcome, raidAtTick: outcome.raidDueTick } };
}

/** The refusal binds to the first later offer from this issuer, once per company. */
export function refuseNextWhoseWolvesIssuerOffer(
  state: WhoseWolvesQuestState,
  input: {
    readonly companyId: string;
    readonly instanceId: string;
    readonly issuerId: string;
  },
): WhoseWolvesQuestState | undefined {
  if (
    input.issuerId !== WHOSE_WOLVES_ISSUER_ID ||
    !isText(input.companyId) ||
    !isText(input.instanceId) ||
    state.outcome?.kind !== 'PACK_SPARED_AND_EXPOSED' ||
    state.outcome.companyId !== input.companyId
  )
    return undefined;
  const company = companyState(state, input.companyId);
  if (!company.refusalPending || company.deniedOfferInstanceId !== undefined) return undefined;
  return replaceCompany(state, {
    ...company,
    refusalPending: false,
    deniedOfferInstanceId: input.instanceId,
  });
}

export function whoseWolvesFindingsFor(
  state: WhoseWolvesQuestState,
  companyId: string | undefined,
): readonly WhoseWolvesFinding[] {
  if (!companyId) return [];
  return companyState(state, companyId).findings;
}

export function whoseWolvesOfferWasRefused(
  state: WhoseWolvesQuestState,
  companyId: string | undefined,
  instanceId: string,
): boolean {
  if (!companyId) return false;
  return companyState(state, companyId).deniedOfferInstanceId === instanceId;
}

/** The guide applies only to its informed company and the route Efim showed. */
export function whoseWolvesGuideEntitlement(
  state: WhoseWolvesQuestState,
  companyId: string | undefined,
  originSiteId: string,
  destinationSiteId: string,
): WhoseWolvesGuideEntitlement | undefined {
  const outcome = state.outcome;
  if (
    !companyId ||
    outcome?.kind !== 'PACK_SPARED_AND_EXPOSED' ||
    outcome.companyId !== companyId ||
    originSiteId !== WHOSE_WOLVES_GUIDE_ORIGIN_SITE_ID ||
    destinationSiteId !== WHOSE_WOLVES_GUIDE_DESTINATION_SITE_ID
  )
    return undefined;
  return {
    sourceEventId: outcome.sourceEventId,
    originSiteId: WHOSE_WOLVES_GUIDE_ORIGIN_SITE_ID,
    destinationSiteId: WHOSE_WOLVES_GUIDE_DESTINATION_SITE_ID,
    timeMultiplier: { numerator: 3, denominator: 4 },
  };
}

function readWhoseWolvesOutcome(value: unknown): WhoseWolvesOutcome {
  if (
    !isRecord(value) ||
    !['kind', 'companyId', 'sourceEventId', 'atTick'].every((key) => Object.hasOwn(value, key))
  )
    throw new TypeError('Whose-wolves outcome is invalid');
  const common =
    isText(value['companyId']) && isText(value['sourceEventId']) && isDecimal(value['atTick']);
  if (!common) throw new TypeError('Whose-wolves outcome is invalid');
  if (
    value['kind'] === 'PACK_SPARED_AND_EXPOSED' &&
    hasExactKeys(value, ['kind', 'companyId', 'sourceEventId', 'atTick'])
  )
    return value as unknown as WhoseWolvesOutcome;
  if (
    value['kind'] === 'PACK_KILLED' &&
    (hasExactKeys(value, ['kind', 'companyId', 'sourceEventId', 'atTick', 'raidDueTick']) ||
      hasExactKeys(value, [
        'kind',
        'companyId',
        'sourceEventId',
        'atTick',
        'raidDueTick',
        'raidAtTick',
      ])) &&
    isDecimal(value['raidDueTick']) &&
    (value['raidAtTick'] === undefined || isDecimal(value['raidAtTick'])) &&
    BigInt(value['raidDueTick']) ===
      BigInt(value['atTick'] as string) + WHOSE_WOLVES_RAID_DELAY_TICKS
  )
    return value as unknown as WhoseWolvesOutcome;
  throw new TypeError('Whose-wolves outcome is invalid');
}

function companyState(state: WhoseWolvesQuestState, companyId: string): WhoseWolvesCompanyState {
  return (
    state.companies.find((company) => company.companyId === companyId) ?? {
      companyId,
      findings: [],
      refusalPending: false,
    }
  );
}

function ensureCompany(
  state: WhoseWolvesQuestState,
  companyId: string,
): readonly WhoseWolvesCompanyState[] {
  return state.companies.some((company) => company.companyId === companyId)
    ? state.companies
    : [...state.companies, { companyId, findings: [], refusalPending: false }];
}

function replaceCompany(
  state: WhoseWolvesQuestState,
  company: WhoseWolvesCompanyState,
): WhoseWolvesQuestState {
  return {
    ...state,
    companies: state.companies.some((entry) => entry.companyId === company.companyId)
      ? state.companies.map((entry) => (entry.companyId === company.companyId ? company : entry))
      : [...state.companies, company],
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 256;

const isDecimal = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9]\d{0,18})$/.test(value);
