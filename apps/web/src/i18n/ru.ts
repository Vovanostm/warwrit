import { journeyRu } from './journey.ru.js';
import { contractsRu } from './contracts.ru.js';
import { storyRu } from './story.ru.js';

/**
 * Russian source catalogue: one `<area>.ru.ts` file per area, merged here.
 * Style: docs/wiki/world/writing.md and docs/wiki/world/literary-style.md.
 */
export const ru = {
  ...contractsRu,
  ...storyRu,
  ...journeyRu,
} as const;

export type MessageKey = keyof typeof ru;
