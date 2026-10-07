import { contractsEn } from './contracts.en.js';
import type { MessageKey } from './ru.js';

/** English catalogue; the type requires every Russian key. Glossary: docs/content/world/glossary.csv. */
export const en: Readonly<Record<MessageKey, string>> = {
  ...contractsEn,
};
