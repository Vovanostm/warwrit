const sideColors = ['#9bb9c2', '#cf927c', '#c7b879', '#a6b991', '#b29cc5', '#d0a6a0'] as const;

/** Stable muted accent for every side ID, including sides beyond the first two. */
export function battleSideColor(
  sideId: string,
  sideIds: readonly string[] = [],
): (typeof sideColors)[number] {
  const sideIndex = sideIds.indexOf(sideId);
  if (sideIndex >= 0) return sideColors[sideIndex % sideColors.length]!;
  let hash = 0;
  for (const character of sideId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return sideColors[hash % sideColors.length]!;
}
