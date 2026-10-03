export const ENCOUNTER_PROTOCOL_VERSION = 1 as const;

export interface EncounterFixtureCreateDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
}

export interface EncounterActiveDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
  readonly encounterId: string | null;
}

export interface EncounterControlGrantRequestDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
}

export interface EncounterResumeDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
  readonly encounterId: string;
}

export function isEncounterResumeDto(value: unknown): value is EncounterResumeDto {
  return (
    isRecord(value) &&
    Object.keys(value).length === 2 &&
    value['version'] === ENCOUNTER_PROTOCOL_VERSION &&
    isEncounterId(value['encounterId'])
  );
}

export interface EncounterControlGrantDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
  readonly encounterId: string;
  readonly revision: number;
  readonly controllableUnitIds: readonly string[];
  /** Authenticated caller's status only; absent when served by an older runtime. */
  readonly selfAfk?: boolean;
  /** Activation epoch after which the caller's resume request may take effect. */
  readonly resumeRequestedAfterEpoch?: number | null;
}

export function isEncounterControlGrantRequestDto(
  value: unknown,
): value is EncounterControlGrantRequestDto {
  return (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    value['version'] === ENCOUNTER_PROTOCOL_VERSION
  );
}

export interface EncounterCommandDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
  readonly encounterId: string;
  readonly commandId: string;
  readonly expectedRevision: number;
  readonly activationId: string;
  readonly actorId: string;
  readonly intent:
    | { readonly type: 'move'; readonly to: Readonly<{ q: number; r: number }> }
    | { readonly type: 'attack'; readonly targetId: string }
    | { readonly type: 'defend' | 'wait' | 'retreat' };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;

export const isEncounterId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);

export function isEncounterCommandDto(value: unknown): value is EncounterCommandDto {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 7 ||
    value['version'] !== ENCOUNTER_PROTOCOL_VERSION ||
    !isEncounterId(value['encounterId']) ||
    !isId(value['commandId']) ||
    !Number.isSafeInteger(value['expectedRevision']) ||
    (value['expectedRevision'] as number) < 0 ||
    !isId(value['activationId']) ||
    !isId(value['actorId']) ||
    !isRecord(value['intent'])
  )
    return false;

  const intent = value['intent'];
  switch (intent['type']) {
    case 'move':
      return (
        Object.keys(intent).length === 2 &&
        isRecord(intent['to']) &&
        Object.keys(intent['to']).length === 2 &&
        Number.isSafeInteger(intent['to']['q']) &&
        Number.isSafeInteger(intent['to']['r'])
      );
    case 'attack':
      return Object.keys(intent).length === 2 && isId(intent['targetId']);
    case 'defend':
    case 'wait':
    case 'retreat':
      return Object.keys(intent).length === 1;
    default:
      return false;
  }
}

export type EncounterCommandResponse =
  | {
      readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
      readonly encounterId: string;
      readonly commandId: string;
      readonly receiptId: string;
      readonly status: 'accepted';
      readonly revision: number;
    }
  | {
      readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
      readonly commandId: string;
      readonly status: 'rejected';
      readonly code: 'NOT_FOUND' | 'CONFLICT' | 'UNAUTHORIZED' | 'INVALID_COMMAND';
    };

export interface EncounterFixtureCreatedDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
  readonly encounterId: string;
  readonly revision: number;
  readonly status: 'active' | 'resolved';
}

export interface EncounterPublicUnitDto {
  readonly id: string;
  readonly sideId: string;
  readonly q: number;
  readonly r: number;
  readonly health: number;
  readonly status: 'active' | 'dead' | 'retreated';
}

export interface EncounterPublicProjectionDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
  readonly encounterId: string;
  readonly revision: number;
  readonly status: 'active' | 'resolved';
  readonly round: number;
  readonly activationId: string | null;
  readonly actorUnitId: string | null;
  readonly deadlineAt: string | null;
  readonly units: readonly EncounterPublicUnitDto[];
  /** Public board geometry. Optional only for compatibility with older responses. */
  readonly map?: {
    readonly hexes: readonly Readonly<{ q: number; r: number }>[];
    readonly blocked: readonly Readonly<{ q: number; r: number }>[];
  };
}

export interface EncounterRoomTicketDto {
  readonly name: string;
  readonly sessionId: string;
  readonly roomId: string;
  readonly processId?: string;
  readonly publicAddress?: string;
  readonly reconnectionToken?: string;
  readonly devMode?: boolean;
}

/** Owner-only succession choice after the company leader died in a resolved encounter. */
export interface EncounterLeadershipDto {
  readonly version: 1;
  readonly encounterId: string;
  /** True while consequences wait for the owner to name a successor. */
  readonly required: boolean;
  readonly candidates: readonly { readonly characterId: string; readonly name: string }[];
  readonly modes: readonly ('PERMANENT' | 'ACTING' | 'REGENCY')[];
  readonly chosen: null | {
    readonly candidateId: string;
    readonly mode: 'PERMANENT' | 'ACTING' | 'REGENCY';
  };
}
