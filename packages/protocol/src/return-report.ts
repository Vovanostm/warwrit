export const COMPANY_RETURN_REPORT_EVENT_TYPES = [
  'CompanyStarted',
  'CompanyEnded',
  'LeadershipResolved',
  'HeirDesignated',
  'HeirNotified',
  'ServiceStarted',
  'JoinedFieldParty',
  'Arrived',
  'AssignmentChanged',
  'ReturnedToService',
  'PerkChosen',
  'NicknameProposed',
  'NicknameAccepted',
  'NicknameRejected',
  'CompanyRenamed',
] as const;

export type CompanyReturnReportEventType = (typeof COMPANY_RETURN_REPORT_EVENT_TYPES)[number];

export interface CompanyReturnReportEventDto {
  readonly type: CompanyReturnReportEventType;
  readonly atTick: string;
  readonly subjectIds: readonly string[];
}

/** Amounts are exact integer money-Q strings; elapsedDays is a decimal string. */
export interface CompanyReturnReportDto {
  readonly schemaVersion: 1;
  readonly reportId: string;
  readonly fromTick: string;
  readonly toTick: string;
  readonly elapsedCampaignTicks: string;
  readonly elapsedDays: string;
  readonly rationsConsumed: string;
  readonly includesLateFoodSettlement: boolean;
  readonly earliestFoodFromTick?: string;
  readonly wages: {
    readonly accruedQ: string;
    readonly paidQ: string;
    readonly currentOwedQ: string;
  };
  readonly debt: { readonly currentQ: string };
  readonly events: readonly CompanyReturnReportEventDto[];
  readonly contractOutcomes?: readonly {
    readonly instanceId:
      | 'ci.m1.empty-watch-record.01'
      | 'ci.m1.stretcher-and-sword.01'
      | 'ci.m1.whose-wolves.01'
      | 'ci.m1.foul-well.01';
    readonly outcome:
      | 'PROKOP_HANDED_OVER'
      | 'PROOF_DESTROYED'
      | 'REFUGEE_CAMP_REMOVED'
      | 'OLD_FORD_REVEALED'
      | 'LUKA_RESCUED'
      | 'NASTYA_ONLY'
      | 'LUKA_DEATH_OBSERVED'
      | 'LUKA_RECRUIT_OFFER'
      | 'WOLVES_PACK_KILLED'
      | 'WOLVES_PACK_SPARED'
      | 'WOLVES_RAID'
      | 'FOUL_WELL_TRUTH_REPORTED'
      | 'FOUL_WELL_AGHAFYA_ACCUSED'
      | 'FOUL_WELL_HERBALIST_EXILED';
    readonly atTick: string;
  }[];
}

export interface CompanyReturnReportReadResponseDto {
  readonly report: CompanyReturnReportDto | null;
}

export interface CompanyReturnReportAcknowledgeRequestDto {
  readonly schemaVersion: 1;
  readonly reportId: string;
}

export interface CompanyReturnReportAcknowledgeResponseDto {
  readonly ok: true;
  readonly duplicate: boolean;
}
