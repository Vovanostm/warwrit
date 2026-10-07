import { en } from './en.js';
import { ru, type MessageKey } from './ru.js';

type Locale = 'ru' | 'en';

const CATALOGUES: Readonly<Record<Locale, Readonly<Record<MessageKey, string>>>> = { ru, en };
const STORAGE_KEY = 'warwrit.locale';

function isLocale(value: string | null | undefined): value is Locale {
  return value === 'ru' || value === 'en';
}

/** `?lang=en` wins and is remembered; otherwise the stored choice; Russian by default. */
function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isLocale(fromUrl)) {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : 'ru';
  } catch {
    return 'ru';
  }
}

const locale: Locale = detectLocale();

function isMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(ru, key);
}

/** Text for a key built from game IDs; undefined when no text is authored for it. */
export function lookup(key: string): string | undefined {
  return isMessageKey(key) ? CATALOGUES[locale][key] : undefined;
}
