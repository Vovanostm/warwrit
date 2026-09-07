/** Transport-only boundary. The authenticated server must validate unknown payloads in game-core. */
export interface PlayerCompanyCommandDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly worldId: string;
  readonly companyId: string;
  readonly actorRef: { readonly kind: 'PLAYER'; readonly id: string };
  /** Observed PUBLIC projection revision, never an internal CAS token. */
  readonly expectedRevision: string;
  readonly campaignTick: string;
  readonly rulesetId: string;
  readonly sourceEventId?: string;
  readonly type: string;
  readonly payload: unknown;
}
/** Must be rendered from public observations, never a raw domain result/state/error object. */
export interface CompanyCommandRejectionDto {
  readonly commandId: string;
  readonly ok: false;
  readonly publicRevision: string;
  readonly code: 'INVALID_COMMAND' | 'NOT_AUTHORIZED' | 'CONTACT_OR_ACCESS_REQUIRED' | 'UNSUPPORTED_ACTION';
}
