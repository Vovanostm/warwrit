export type StoryActorDto = 'KONDRAT' | 'SENKA' | 'ULITA';
export type StoryFactIdDto =
  | 'F01'
  | 'F02'
  | 'F03'
  | 'F04'
  | 'F05'
  | 'F06'
  | 'F07'
  | 'F08'
  | 'F09'
  | 'F10'
  | 'F11';
export type StoryChoiceIdDto =
  | 'accept'
  | 'defer'
  | 'to-kondrat'
  | 'to-senka'
  | 'to-ulita'
  | 'ask-sacks'
  | 'ask-tax'
  | 'inspect-receipts'
  | 'compare-receipts'
  | 'ask-guard'
  | 'ask-bread'
  | 'ask-son'
  | 'inspect-sack'
  | 'ask-sack-origin'
  | 'ask-where-grain'
  | 'ask-why-cache'
  | 'ask-senka-sack'
  | 'confront-ulita'
  | 'open-confrontation'
  | 'open-accusation'
  | 'accuse-ulita'
  | 'accuse-senka'
  | 'accuse-kondrat'
  | 'wait'
  | 'confirm'
  | 'back';

export interface StoryFactDto {
  readonly factId: StoryFactIdDto;
  readonly source:
    | { readonly kind: 'ACTOR'; readonly actorId: StoryActorDto }
    | {
        readonly kind: 'OBSERVED';
        readonly objectId: 'PATCHED_SACK' | 'PAYMENT_RECEIPTS';
      };
  readonly sceneId: string;
  readonly choiceId: string;
  readonly sourceEventId: string;
  readonly learnedAtTick: string;
  readonly historicalTiming?:
    | 'PETRUS_RETURNED_NIGHT_AFTER_SENKA'
    | 'SACK_PRESENT_ON_SENKA_RETURN_DAY_BEFORE_PETRUS';
}

export interface StoryPublicConsequencesDto {
  readonly senka: 'STAYS_AT_BARN' | 'DISMISSED' | 'LEAVES_VOLUNTARILY';
  readonly kondratTrust:
    | 'UNCHANGED'
    | 'LOSES_TRUST_IN_SENKA'
    | 'LOSES_TRUST_IN_FINISHING_COMPANY';
  readonly ulitaGrainWork: 'ENDS' | 'UNCHANGED';
}

export interface StoryProjectionDto {
  readonly missionId: 'sm.m1.cache-disclosure.01';
  readonly definitionVersion: 1;
  readonly availability: 'OFFERED' | 'CLOSED' | 'NOT_YET_AVAILABLE';
  readonly sceneId: string;
  readonly visibleLineIds: readonly string[];
  readonly availableChoices: readonly StoryChoiceIdDto[];
  readonly journal: readonly StoryFactDto[];
  readonly metActors: readonly StoryActorDto[];
  readonly publicOutcome: null | {
    readonly endingId: 'E01' | 'E02' | 'E03';
    readonly accusedActor: StoryActorDto;
    readonly consequences: StoryPublicConsequencesDto;
    readonly isFinishingCompany: boolean;
  };
}

export type StoryCommandPayloadDto =
  | { readonly type: 'ACCEPT' | 'DEFER' | 'CONFIRM' | 'RETURN' }
  | { readonly type: 'CHOOSE'; readonly choiceId: StoryChoiceIdDto };

export interface StoryCommandRequestDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly expectedWorldRevision: string;
  readonly expectedCompanyRevision: string;
  readonly command: StoryCommandPayloadDto;
}

export interface StoryReadResponseDto extends StoryProjectionDto {
  readonly schemaVersion: 1;
  readonly worldRevision: string;
  readonly companyRevision: string;
}

export type StoryCommandResponseDto =
  | {
      readonly schemaVersion: 1;
      readonly commandId: string;
      readonly ok: true;
      readonly story: StoryReadResponseDto;
      /** Non-null only after the issuer debit, company credit and story outcome commit. */
      readonly rewardPaidQ: string | null;
    }
  | {
      readonly schemaVersion: 1;
      readonly commandId: string;
      readonly ok: false;
      readonly code:
        | 'INVALID_COMMAND'
        | 'NOT_AUTHORIZED'
        | 'NOT_AVAILABLE'
        | 'NOT_ACCEPTED'
        | 'NOT_ELIGIBLE'
        | 'NOT_AT_LOCATION'
        | 'WRONG_PLACE'
        | 'MISSING_FACT'
        | 'NOT_MET'
        | 'NO_PENDING_ACCUSATION'
        | 'STALE_REVISION'
        | 'ALREADY_COMPLETED'
        | 'INSUFFICIENT_FUNDS'
        | 'CONFLICTING_REPLAY';
      readonly story: StoryReadResponseDto | null;
    };

const CHOICE_IDS: ReadonlySet<string> = new Set([
  'accept', 'defer', 'to-kondrat', 'to-senka', 'to-ulita', 'ask-sacks', 'ask-tax',
  'inspect-receipts', 'compare-receipts', 'ask-guard', 'ask-bread', 'ask-son',
  'inspect-sack', 'ask-sack-origin', 'ask-where-grain', 'ask-why-cache',
  'ask-senka-sack', 'confront-ulita', 'open-confrontation', 'open-accusation',
  'accuse-ulita', 'accuse-senka', 'accuse-kondrat', 'wait', 'confirm', 'back',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/u.test(value);
}

function isCommandPayload(value: unknown): value is StoryCommandPayloadDto {
  if (!isRecord(value)) return false;
  if (value['type'] === 'CHOOSE')
    return (
      hasExactKeys(value, ['type', 'choiceId']) &&
      typeof value['choiceId'] === 'string' &&
      CHOICE_IDS.has(value['choiceId'])
    );
  return (
    hasExactKeys(value, ['type']) &&
    ['ACCEPT', 'DEFER', 'CONFIRM', 'RETURN'].includes(value['type'] as string)
  );
}

export function isStoryCommandRequest(value: unknown): value is StoryCommandRequestDto {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'schemaVersion', 'commandId', 'expectedWorldRevision', 'expectedCompanyRevision', 'command',
    ]) &&
    value['schemaVersion'] === 1 &&
    typeof value['commandId'] === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(value['commandId']) &&
    isDecimal(value['expectedWorldRevision']) &&
    isDecimal(value['expectedCompanyRevision']) &&
    isCommandPayload(value['command'])
  );
}
