/** The CreateCompany payload accepted by the versioned domain command schema. */
export interface CreateCompanyPayloadDto {
  readonly originId: string;
  readonly cultureId: string;
  readonly homelandId: string;
  readonly familyStoryId: string;
  readonly leaderInput: {
    readonly birthName: string;
    readonly sex: string;
    readonly birthCultureId: string;
    readonly birthplaceId: string;
    readonly originId: string;
    readonly speciesId: string;
    readonly bornAt: string;
  };
  /** Issued and validated by the server; an ID alone does not grant opening authority. */
  readonly candidateSetId: string;
  readonly selectedCandidateIds: readonly string[];
  readonly name: string;
  readonly bannerId: string;
}

/** Transport-only boundary. The authenticated server validates unknown payloads in game-core. */
export interface PlayerCompanyCommandDto<Type extends string = string, Payload = unknown> {
  readonly schemaVersion: number;
  readonly commandId: string;
  readonly worldId: string;
  readonly companyId: string;
  readonly actorRef: { readonly kind: 'PLAYER'; readonly id: string };
  /** Observed PUBLIC projection revision, never an internal CAS token. */
  readonly expectedRevision: string;
  readonly campaignTick: string;
  readonly rulesetId: string;
  readonly sourceEventId?: string;
  readonly type: Type;
  readonly payload: Payload;
}
export type CreateCompanyCommandDto = PlayerCompanyCommandDto<
  'CreateCompany',
  CreateCompanyPayloadDto
>;

export interface CompanyOpeningOptionsResponseDto {
  readonly schemaVersion: 1;
  readonly opening: {
    readonly candidateSetId: string;
    readonly companyId: string;
    readonly origin: { readonly id: string; readonly label: string };
    readonly culture: { readonly id: string; readonly label: string };
    readonly homeland: { readonly id: string; readonly label: string };
    readonly familyStory: { readonly id: string; readonly label: string };
    readonly bannerId: string;
    readonly leaderDefaults: Omit<CreateCompanyPayloadDto['leaderInput'], 'birthName'>;
    readonly candidates: readonly {
      readonly characterId: string;
      readonly name: string;
      readonly sex: string;
      readonly templateId: string;
    }[];
    readonly selection: { readonly minCount: 1; readonly maxCount: 2 };
    readonly availability: { readonly allCanonicalPlayerChoicesOpen: false };
  };
}

/** Only the untrusted request members are sent; all command scope is server-derived. */
export interface CreateCompanyRequestDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly type: 'CreateCompany';
  readonly payload: CreateCompanyPayloadDto;
}

/** Narrow allowlisted view derived from the company's observation projection. */
export interface CompanySummaryDto {
  readonly companyId: string;
  readonly revision: string;
  readonly companyPresentation: { readonly name: string; readonly bannerId: string } | null;
  readonly leaderId: string | null;
  readonly runStatus: 'ACTIVE' | 'GAME_OVER' | 'UNKNOWN';
  readonly characters: readonly {
    readonly characterId: string;
    readonly name: string;
    readonly nicknameTextKey: string | null;
    readonly perkIds: readonly string[];
    readonly knownStatus: 'AVAILABLE' | 'IN_ENCOUNTER' | 'OUT_OF_CONTACT' | 'CAPTIVE' | 'DEAD';
  }[];
}
export interface CompanyReadResponseDto {
  readonly schemaVersion: 1;
  readonly company: CompanySummaryDto | null;
}
export interface CompanyCommandAcceptedDto {
  readonly commandId: string;
  readonly ok: true;
  readonly publicRevision: string;
}
/** Must be rendered from public observations, never a raw domain result/state/error object. */
export interface CompanyCommandRejectionDto {
  readonly commandId: string;
  readonly ok: false;
  readonly publicRevision: string;
  readonly code:
    | 'INVALID_COMMAND'
    | 'NOT_AUTHORIZED'
    | 'CONTACT_OR_ACCESS_REQUIRED'
    | 'UNSUPPORTED_ACTION'
    | 'IDEMPOTENCY_CONFLICT'
    | 'STALE_REVISION'
    | 'INSUFFICIENT_ITEMS'
    | 'INSUFFICIENT_STAMINA';
}

export const ORDINARY_PLAYER_COMPANY_COMMAND_TYPES = [
  'Recruit',
  'JoinFieldParty',
  'SetAssignment',
  'RequestDeparture',
  'PayClaims',
  'GrantFarewell',
  'TransferFunds',
  'BeginFieldCamp',
  'EndMaintenance',
  'AcceptSafeService',
  'AmendSafeService',
  'StartLearning',
  'StopLearning',
  'ChoosePerk',
  'StartRetraining',
  'ApplyCare',
  'ReturnToService',
  'DesignateHeir',
  'ResolveLeadership',
  'ResolveNickname',
  'ChangePresentation',
  'RenameCompany',
  'TransferItem',
  'EquipItem',
  'RepairItem',
  'ClaimLoot',
] as const;
export type OrdinaryPlayerCompanyCommandType =
  (typeof ORDINARY_PLAYER_COMPANY_COMMAND_TYPES)[number];

/** Payloads whose complete ordinary-command effects and public readback are enabled in V2. */
export interface OrdinaryPlayerCompanyPayloads {
  readonly RenameCompany: {
    readonly name: string;
    readonly bannerId: string;
  };
  readonly ChoosePerk: {
    readonly characterId: string;
    readonly perkId: string;
    readonly milestone: 25 | 60;
  };
}

export type EnabledOrdinaryPlayerCompanyCommandType = keyof OrdinaryPlayerCompanyPayloads;
export type OrdinaryPayloadForType<Type extends EnabledOrdinaryPlayerCompanyCommandType> =
  OrdinaryPlayerCompanyPayloads[Type];

/** Strict V2 player intent. Authority, company, time and canonical revision are server supplied. */
export type OrdinaryPlayerCompanyCommandV2Dto = {
  [Type in EnabledOrdinaryPlayerCompanyCommandType]: {
    readonly schemaVersion: 2;
    readonly commandId: string;
    readonly expectedPublicRevision: string;
    readonly type: Type;
    readonly payload: OrdinaryPayloadForType<Type>;
  };
}[EnabledOrdinaryPlayerCompanyCommandType];
