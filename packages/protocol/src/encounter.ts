export const ENCOUNTER_PROTOCOL_VERSION = 1 as const;

export interface EncounterFixtureCreateDto {
  readonly version: typeof ENCOUNTER_PROTOCOL_VERSION;
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
