import type { CombatLabBattleConfig, CombatLabCatalog } from '@warwrit/protocol';
import { validateBattleDraft } from './editor-model.js';
import {
  messageFor,
  readSavedSession,
  readSessionView,
  type ActiveSession,
} from './session-transport.js';

function isCatalog(value: unknown): value is CombatLabCatalog {
  return (
    value !== null &&
    typeof value === 'object' &&
    'profiles' in value &&
    Array.isArray(value.profiles) &&
    'defaultBattle' in value &&
    value.defaultBattle !== null &&
    typeof value.defaultBattle === 'object'
  );
}

export async function loadCombatLabCatalog(
  apiBaseUrl: string,
  signal: AbortSignal,
): Promise<CombatLabCatalog> {
  const response = await fetch(`${apiBaseUrl}/dev/combat-lab/catalog`, { signal });
  if (!response.ok) throw new Error('catalog unavailable');
  const value: unknown = await response.json();
  if (!isCatalog(value)) throw new Error('invalid catalog');
  return value;
}

type RestoredSession =
  | { readonly status: 'restored'; readonly session: ActiveSession }
  | { readonly status: 'absent' | 'stale' }
  | { readonly status: 'unavailable' | 'failed'; readonly notice: string };

/** Restoring is a read. Only an explicit missing saved session removes its local credentials. */
export async function restoreBattleSession(
  apiBaseUrl: string,
  getStorage: () => Storage,
  key: string,
  signal: AbortSignal,
  isCurrent: () => boolean,
): Promise<RestoredSession> {
  try {
    const storage = getStorage();
    const saved = readSavedSession(storage, key);
    if (!saved) return { status: 'absent' };
    const response = await fetch(`${apiBaseUrl}/dev/combat-lab/${encodeURIComponent(saved.id)}`, {
      headers: { 'x-combat-lab-capability': saved.capability },
      signal,
    });
    if (signal.aborted || !isCurrent()) return { status: 'stale' };
    if (response.status === 404 || response.status === 401) {
      storage.removeItem(key);
      return {
        status: 'unavailable',
        notice: 'Сохранённая сессия недоступна. Создайте новый бой.',
      };
    }
    if (!response.ok) throw new Error('restore unavailable');
    const view = await readSessionView(response, saved.id);
    if (signal.aborted || !isCurrent()) return { status: 'stale' };
    return { status: 'restored', session: { id: saved.id, capability: saved.capability, view } };
  } catch {
    return signal.aborted
      ? { status: 'stale' }
      : {
          status: 'failed',
          notice: 'Не удалось восстановить бой. Обновите страницу для повторного чтения.',
        };
  }
}

/** Validate the existing accepted setup before deleting anything; a failed deletion never starts a replacement. */
export async function restartSessionBattle(
  current: ActiveSession | null,
  catalog: CombatLabCatalog | null,
  blocked: boolean,
  end: () => Promise<boolean>,
  start: (battle: CombatLabBattleConfig) => Promise<void>,
  notice: (message: string) => void,
): Promise<void> {
  if (!catalog || blocked) {
    notice('Перезапуск недоступен: дождитесь загрузки состава или обновите страницу.');
    return;
  }
  const battle = current?.view.battle;
  if (!battle || validateBattleDraft(battle, catalog).length > 0) return;
  if (await end()) await start(battle);
}

export async function downloadSessionReplay(
  apiBaseUrl: string,
  current: ActiveSession | null,
  deleting: boolean,
  save: (replay: unknown, filename: string) => void,
  notice: (message: string) => void,
): Promise<void> {
  if (!current || deleting) return;
  try {
    const response = await fetch(`${apiBaseUrl}/dev/combat-lab/${current.id}/replay`, {
      headers: { 'x-combat-lab-capability': current.capability },
    });
    if (!response.ok) {
      notice(response.status === 404 ? messageFor('NOT_FOUND') : 'Повтор боя скачать не удалось.');
      return;
    }
    const replay: unknown = await response.json();
    save(replay, `${current.view.battle?.name ?? 'battle-replay'}.json`);
    notice('Запись боя скачана.');
  } catch {
    notice('Повтор боя скачать не удалось.');
  }
}

export function applyRestoredSession(
  result: RestoredSession,
  effects: {
    readonly install: (session: ActiveSession) => void;
    readonly draft: (battle: CombatLabBattleConfig) => void;
    readonly selectUnit: (unitId: string | null) => void;
    readonly notice: (message: string) => void;
  },
): void {
  if (result.status === 'restored') {
    effects.install(result.session);
    if (result.session.view.battle) effects.draft(result.session.view.battle);
    effects.selectUnit(result.session.view.activation?.actorId ?? null);
  } else if ('notice' in result) effects.notice(result.notice);
}
