import { journeyEn } from './journey.en.js';
import { contractsEn } from './contracts.en.js';
import { storyEn } from './story.en.js';
import type { MessageKey } from './ru.js';

/** English catalogue; missing translations fall back to the Russian source. */
export const en: Readonly<Partial<Record<MessageKey, string>>> = {
  ...contractsEn,
  ...storyEn,
  ...journeyEn,
};
