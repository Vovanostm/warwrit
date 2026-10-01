import type { CreateCompanyRequestDto } from '@warwrit/protocol';

export interface CompanyCreateAttemptSlot {
  current: CreateCompanyRequestDto | undefined;
}

export function getOrCreateCompanyCreateAttempt(
  slot: CompanyCreateAttemptSlot,
  createRequest: () => CreateCompanyRequestDto,
): CreateCompanyRequestDto {
  if (slot.current === undefined) slot.current = createRequest();
  return slot.current;
}
