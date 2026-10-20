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
  /** Actor-scoped condition restrictions, bound to this grant's revision and activation. Costs/range still apply. */
  readonly actorActions?: {
    readonly activationId: string;
    readonly actorId: string;
    readonly permittedIntents: readonly (
      'move' | 'attack' | 'defend' | 'wait' | 'retreat' | 'flee' | 'surrender' | 'autoplay'
    )[];
  };
  readonly tactical?: EncounterTacticalPreviewDto;
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

interface EncounterCommandBase {
  readonly encounterId: string;
  readonly commandId: string;
  readonly expectedRevision: number;
  readonly activationId: string;
  readonly actorId: string;
}

type EncounterLegacyIntent =
  | { readonly type: 'move'; readonly to: Readonly<{ q: number; r: number }> }
  | { readonly type: 'attack'; readonly targetId: string }
  | { readonly type: 'defend' | 'wait' | 'retreat' };
export type EncounterSkillId =
  'shield-brace' | 'armor-pressure' | 'reach-thrust' | 'aimed-shot' | 'rally';
export type EncounterCommandDto = EncounterCommandBase &
  (
    | { readonly version: 1; readonly intent: EncounterLegacyIntent }
    | {
        readonly version: 2;
        readonly intent:
          | EncounterLegacyIntent
          | {
              readonly type: 'use-skill';
              readonly skillId: EncounterSkillId;
              readonly targetId?: string;
            }
          | { readonly type: 'prepare-threat' | 'retarget-threat'; readonly targetId: string }
          | { readonly type: 'flee' | 'surrender' | 'execute-threat' | 'autoplay' };
      }
  );

export interface EncounterTacticalPreviewDto {
  readonly activationId: string;
  readonly actorId: string;
  readonly actionPoints: number;
  readonly stamina: number;
  readonly moves: readonly {
    readonly to: Readonly<{ q: number; r: number }>;
    readonly path: readonly Readonly<{ q: number; r: number }>[];
    readonly actionPointCost: number;
    readonly staminaCost: number;
    readonly fireDamage: number;
    readonly reactionCount: number;
  }[];
  readonly attacks: readonly {
    readonly targetId: string;
    readonly hitChance: number;
    readonly actionPointCost: number;
    readonly staminaCost: number;
    readonly damage: {
      readonly health: { readonly minimum: number; readonly maximum: number };
      readonly armor: { readonly minimum: number; readonly maximum: number };
    };
  }[];
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
    (value['version'] !== 1 && value['version'] !== 2) ||
    !isEncounterId(value['encounterId']) ||
    !isId(value['commandId']) ||
    !Number.isSafeInteger(value['expectedRevision']) ||
    (value['expectedRevision'] as number) < 0 ||
    !isId(value['activationId']) ||
    !isId(value['actorId']) ||
    !isRecord(value['intent'])
  )
    return false;

  return (
    validLegacyIntent(value['intent']) ||
    (value['version'] === 2 && validTacticalIntent(value['intent']))
  );
}

function validLegacyIntent(intent: Record<string, unknown>): boolean {
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

function validTacticalIntent(intent: Record<string, unknown>): boolean {
  switch (intent['type']) {
    case 'use-skill':
      return (
        typeof intent['skillId'] === 'string' &&
        ['shield-brace', 'armor-pressure', 'reach-thrust', 'aimed-shot', 'rally'].includes(
          intent['skillId'],
        ) &&
        Object.keys(intent).every((key) => ['type', 'skillId', 'targetId'].includes(key)) &&
        (!Object.hasOwn(intent, 'targetId') || isId(intent['targetId']))
      );
    case 'prepare-threat':
    case 'retarget-threat':
      return Object.keys(intent).length === 2 && isId(intent['targetId']);
    case 'flee':
    case 'surrender':
    case 'execute-threat':
    case 'autoplay':
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
  /** Canonical visible cap; absent means unknown, never infer it from current HP. */
  readonly maximumHealth?: number;
  /** Actual combatant weapon class used only to choose matching established sprite art. */
  readonly weaponId?: 'bow' | 'great-weapon' | 'raider' | 'spear' | 'sword-shield' | 'fists';
  /** Public card values and visible combat states; never the source unit record. */
  readonly armor?: number;
  readonly stamina?: number;
  readonly morale?: number;
  readonly guarding?: boolean;
  readonly panicking?: boolean;
  readonly threat?: {
    readonly targetId: string;
    readonly damage: { readonly minimum: number; readonly maximum: number };
    readonly responseReceived: boolean;
  } | null;
  readonly weaponReach?: {
    readonly minimumRange: number;
    readonly maximumRange: number;
    readonly cells: readonly Readonly<{ q: number; r: number }> [];
  };
  readonly status: 'active' | 'dead' | 'retreated' | 'surrendered';
}

export interface EncounterPublicProjectionDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
  readonly encounterId: string;
  readonly revision: number;
  readonly status: 'active' | 'resolved';
  readonly round: number;
  readonly activationId: string | null;
  readonly actorUnitId: string | null;
  /** Canonical current queue and cursor; optional for older projection readers. */
  readonly initiativeOrder?: readonly string[];
  readonly turnIndex?: number;
  readonly nextRoundInitiative?: { readonly round: number; readonly unitIds: readonly string[] };
  readonly deadlineAt: string | null;
  readonly units: readonly EncounterPublicUnitDto[];
  /** Public board geometry. Optional only for compatibility with older responses. */
  readonly map?: {
    readonly hexes: readonly Readonly<{ q: number; r: number }>[];
    readonly blocked: readonly Readonly<{ q: number; r: number }>[];
    readonly tiles?: readonly Readonly<{
      q: number;
      r: number;
      height: 0 | 1 | 2;
      terrain: 'plain' | 'mud' | 'fire';
    }>[];
  };
  readonly outcome?: {
    readonly reason: 'last-side-standing' | 'round-limit';
    readonly winnerSideId: string | null;
  } | null;
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

/** Strict transport reader for derived, actor-private previews; contains no combat rules. */
export function isEncounterTacticalPreviewDto(
  value: unknown,
): value is EncounterTacticalPreviewDto {
  const exact = (item: unknown, keys: readonly string[]): item is Record<string, unknown> =>
    isRecord(item) &&
    Object.keys(item).length === keys.length &&
    keys.every((key) => Object.hasOwn(item, key));
  const natural = (item: unknown): item is number =>
    Number.isSafeInteger(item) && (item as number) >= 0;
  const hex = (item: unknown): boolean =>
    exact(item, ['q', 'r']) && Number.isSafeInteger(item['q']) && Number.isSafeInteger(item['r']);
  const range = (item: unknown): boolean =>
    exact(item, ['minimum', 'maximum']) &&
    natural(item['minimum']) &&
    natural(item['maximum']) &&
    item['minimum'] <= item['maximum'];
  return (
    exact(value, ['activationId', 'actorId', 'actionPoints', 'stamina', 'moves', 'attacks']) &&
    isId(value['activationId']) &&
    isId(value['actorId']) &&
    natural(value['actionPoints']) &&
    natural(value['stamina']) &&
    Array.isArray(value['moves']) &&
    value['moves'].every(
      (move) =>
        exact(move, [
          'to',
          'path',
          'actionPointCost',
          'staminaCost',
          'fireDamage',
          'reactionCount',
        ]) &&
        hex(move['to']) &&
        Array.isArray(move['path']) &&
        move['path'].length > 0 &&
        move['path'].every(hex) &&
        ['actionPointCost', 'staminaCost', 'fireDamage', 'reactionCount'].every((key) =>
          natural(move[key]),
        ),
    ) &&
    Array.isArray(value['attacks']) &&
    value['attacks'].every(
      (attack) =>
        exact(attack, ['targetId', 'hitChance', 'actionPointCost', 'staminaCost', 'damage']) &&
        isId(attack['targetId']) &&
        ['hitChance', 'actionPointCost', 'staminaCost'].every((key) => natural(attack[key])) &&
        (attack['hitChance'] as number) <= 100 &&
        exact(attack['damage'], ['health', 'armor']) &&
        range(attack['damage']['health']) &&
        range(attack['damage']['armor']),
    )
  );
}
