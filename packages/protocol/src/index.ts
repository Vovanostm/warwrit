export const PROTOCOL_VERSION = '0.1.0' as const;
export const MAIN_WORLD_ID = 'main' as const;

export interface ApiEnvelope<Data> {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly data: Data;
}

export interface HealthResponse {
  readonly status: 'ok' | 'unavailable';
  readonly service: 'warwrit-server';
  readonly protocolVersion: typeof PROTOCOL_VERSION;
}

export function envelope<Data>(data: Data): ApiEnvelope<Data> {
  return {
    data,
    protocolVersion: PROTOCOL_VERSION,
  };
}

export type {
  CompanyOpeningOptionsResponseDto,
  CompanyCommandAcceptedDto,
  CompanyCommandRejectionDto,
  CompanyReadResponseDto,
  CompanySummaryDto,
  CreateCompanyCommandDto,
  CreateCompanyPayloadDto,
  CreateCompanyRequestDto,
  OrdinaryPlayerCompanyCommandType,
  OrdinaryPlayerCompanyCommandV2Dto,
  PlayerCompanyCommandDto,
} from './company.js';
export { ORDINARY_PLAYER_COMPANY_COMMAND_TYPES } from './company.js';
export type {
  WorldAvailableDepartureDto,
  WorldPartyReadResponseDto,
  WorldPartyReadResponseV1Dto,
  WorldPartyReadResponseV2Dto,
  WorldTravelActionDto,
  WorldTravelRequestDto,
  WorldTravelResponseDto,
  WorldTravelV2RequestDto,
  WorldTravelV2ResponseDto,
  WorldTravelRejectionDto,
  WorldTravelV1RejectionDto,
  WorldTravelV2RejectionDto,
} from './world.js';
export { WORLD_EXPECTED_COMPANY_ID_HEADER } from './world.js';
export * from './contracts.js';
export * from './encounter.js';
export * from './combat-lab.js';
