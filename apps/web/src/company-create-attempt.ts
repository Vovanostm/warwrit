import type {
  CompanyOpeningOptionsResponseDto,
  CreateCompanyPayloadDto,
  CreateCompanyRequestDto,
} from '@warwrit/protocol';

type Opening = CompanyOpeningOptionsResponseDto['opening'];

/** Renew server IDs only while the player-visible choices are unchanged. */
export function refreshedCompanyCreatePayload(
  shown: Opening,
  fresh: Opening,
  input: {
    readonly name: string;
    readonly leaderName: string;
    readonly selectedCandidateIds: readonly string[];
  },
): CreateCompanyPayloadDto {
  const choices = ['origin', 'culture', 'homeland', 'familyStory'] as const;
  const defaults = [
    'sex',
    'birthCultureId',
    'birthplaceId',
    'originId',
    'speciesId',
    'bornAt',
  ] as const;
  const assets = ['crowns', 'signingCrowns', 'rations'] as const;
  if (
    choices.some((key) => shown[key].id !== fresh[key].id) ||
    shown.bannerId !== fresh.bannerId ||
    defaults.some((key) => shown.leaderDefaults[key] !== fresh.leaderDefaults[key]) ||
    assets.some((key) => shown.startingAssets?.[key] !== fresh.startingAssets?.[key]) ||
    shown.selection.minCount !== fresh.selection.minCount ||
    shown.selection.maxCount !== fresh.selection.maxCount
  ) {
    throw new Error(
      'Начальные условия изменились. Обновите страницу, чтобы увидеть новые условия.',
    );
  }
  const selectedCandidateIds = input.selectedCandidateIds.map((id) => {
    const selected = shown.candidates.find((candidate) => candidate.characterId === id);
    const matches = fresh.candidates.filter(
      (candidate) =>
        selected !== undefined &&
        candidate.templateId === selected.templateId &&
        candidate.name === selected.name &&
        candidate.sex === selected.sex,
    );
    if (matches.length !== 1) {
      throw new Error('Список спутников изменился. Обновите страницу и выберите спутников снова.');
    }
    return matches[0]!.characterId;
  });
  return {
    originId: fresh.origin.id,
    cultureId: fresh.culture.id,
    homelandId: fresh.homeland.id,
    familyStoryId: fresh.familyStory.id,
    leaderInput: { ...fresh.leaderDefaults, birthName: input.leaderName.trim() },
    candidateSetId: fresh.candidateSetId,
    selectedCandidateIds,
    name: input.name.trim(),
    bannerId: fresh.bannerId,
  };
}

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
