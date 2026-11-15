/** Observer-authorized proposal, suitable for an explicit accept/refuse control. */
export interface CompanyNicknameProposalDto {
  readonly proposalId: string;
  readonly characterId: string;
  readonly characterName: string | null;
  readonly textKey: string;
  readonly reasonKey: string;
  readonly proposedAt: string;
}

/** Resolved nickname decisions known to this company observer. */
export interface CompanyNicknameHistoryDto {
  readonly proposalId: string;
  readonly characterId: string;
  readonly characterName: string | null;
  readonly sourceEventId: string;
  readonly textKey: string;
  readonly reasonKey: string;
  readonly proposedAt: string | null;
  readonly resolution: 'ACCEPTED' | 'REJECTED';
  readonly decidedAt: string;
  /** Compatibility field for accepted nickname history. Null for refusals. */
  readonly acceptedAt: string | null;
}

export interface CompanyNicknamesDto {
  readonly schemaVersion: 1;
  readonly companyId: string;
  readonly publicRevision: string;
  readonly pending: readonly CompanyNicknameProposalDto[];
  readonly history: readonly CompanyNicknameHistoryDto[];
}

/** Player intent only; company, time, actor and canonical revision are server supplied. */
export interface ResolveCompanyNicknameRequestDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly expectedPublicRevision: string;
  readonly proposalId: string;
  readonly accept: boolean;
}

export function isResolveCompanyNicknameRequest(
  value: unknown,
): value is ResolveCompanyNicknameRequestDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  const keys = Object.keys(request).sort();
  return (
    keys.join('\0') ===
      ['accept', 'commandId', 'expectedPublicRevision', 'proposalId', 'schemaVersion'].join('\0') &&
    request['schemaVersion'] === 1 &&
    isEntityId(request['commandId']) &&
    isExactInteger(request['expectedPublicRevision']) &&
    isEntityId(request['proposalId']) &&
    typeof request['accept'] === 'boolean'
  );
}

function isEntityId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() !== '' &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function isExactInteger(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/u.test(value);
}
