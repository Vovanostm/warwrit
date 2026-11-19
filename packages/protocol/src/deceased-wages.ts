export interface DeceasedWageQuoteDto {
  readonly publicRevision: string;
  readonly local: boolean;
  readonly people: readonly {
    readonly characterId: string;
    readonly name: string;
    readonly amountQ: string;
  }[];
}
