import {
  COMBAT_LAB_VERSION,
  SPRITE_COMBAT_LAB_SCENARIO,
  type CombatLabBattleConfig,
  type CombatLabCatalog,
  type CombatLabView,
} from '@warwrit/protocol';
import { validateBattleDraft } from './editor-model.js';
import { isCombatLabView } from './view-validation.js';

export interface ActiveSession {
  readonly id: string;
  readonly capability: string;
  readonly view: CombatLabView;
}
const errorText: Record<string, string> = {
  FORBIDDEN_LOCAL_ORIGIN: 'Эта страница не разрешена для боя.',
  INVALID_ACTION: 'Такое действие сейчас недоступно. Состояние боя обновлено.',
  INVALID_REQUEST: 'Бой не принял это действие.',
  NOT_FOUND: 'Бой больше недоступен. Начните заново или вернитесь к редактору.',
  REQUEST_CONFLICT: 'Состояние боя изменилось. Обновите выбор.',
  STALE_VIEW: 'Ход изменился до отправки. Состояние обновлено.',
  UNAUTHORIZED: 'Сейчас ходит противник.',
  LIMIT_REACHED: 'Сейчас запущено слишком много боёв.',
};

export function responseCode(value: unknown, fallback: string): string {
  if (value !== null && typeof value === 'object' && 'code' in value) {
    const code = value.code;
    if (typeof code === 'string') return code;
  }
  return fallback;
}

export function messageFor(code: string): string {
  return errorText[code] ?? `Запрос завершился с кодом ${code}.`;
}

interface SavedSession {
  readonly id: string;
  readonly capability: string;
}

export function readSavedSession(storage: Storage, key: string): SavedSession | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  const saved: unknown = JSON.parse(raw);
  if (
    saved !== null &&
    typeof saved === 'object' &&
    'id' in saved &&
    'capability' in saved &&
    typeof saved.id === 'string' &&
    typeof saved.capability === 'string'
  )
    return { id: saved.id, capability: saved.capability };
  storage.removeItem(key);
  return null;
}

export async function readSessionView(
  response: Response,
  sessionId: string,
): Promise<CombatLabView> {
  const view: unknown = await response.json();
  if (!isCombatLabView(view) || view.sessionId !== sessionId) throw new Error('invalid view');
  return view;
}

type CreateResult =
  | { readonly status: 'created'; readonly session: ActiveSession }
  | { readonly status: 'rejected' | 'uncertain'; readonly message: string };

async function rejectedCreate(response: Response): Promise<CreateResult> {
  const error: unknown = await response.json().catch(() => null);
  if (response.status >= 500)
    return {
      status: 'uncertain',
      message:
        'Ответ о создании не получен. Этот бой мог открыться; повторный запуск пока закрыт, чтобы не создать второй.',
    };
  return {
    status: 'rejected',
    message:
      error !== null &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : messageFor(responseCode(error, `${response.status}`)),
  };
}

async function createBattleSession(
  apiBaseUrl: string,
  battle: CombatLabBattleConfig,
  signal: AbortSignal,
): Promise<CreateResult> {
  const response = await fetch(`${apiBaseUrl}/dev/combat-lab`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      version: COMBAT_LAB_VERSION,
      requestId: crypto.randomUUID(),
      scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
      battle,
    }),
    signal,
  });
  if (!response.ok) return rejectedCreate(response);
  const view: unknown = await response.json();
  const capability = response.headers.get('x-combat-lab-capability');
  if (
    !isCombatLabView(view) ||
    capability === null ||
    view.sessionId.length === 0 ||
    view.battleId.length === 0
  )
    return {
      status: 'uncertain',
      message:
        'Ответ о создании не подтверждён. Этот бой мог открыться; повторный запуск пока закрыт.',
    };
  return { status: 'created', session: { id: view.sessionId, capability, view } };
}

export function admittedBattleDraft(
  battle: CombatLabBattleConfig | null,
  catalog: CombatLabCatalog | null,
  blocked: boolean,
): CombatLabBattleConfig | null {
  if (blocked || !catalog || !battle) return null;
  return validateBattleDraft(battle, catalog).length === 0 ? battle : null;
}

interface SessionAttempt {
  readonly isCurrent: () => boolean;
  readonly created: (session: ActiveSession) => void;
  readonly failed: (uncertain: boolean, message: string) => void;
  readonly finished: () => void;
}

/** A lost create is never automatically retried: the server may already own the battle. */
export async function startSessionAttempt(
  apiBaseUrl: string,
  battle: CombatLabBattleConfig,
  signal: AbortSignal,
  attempt: SessionAttempt,
): Promise<void> {
  try {
    const result = await createBattleSession(apiBaseUrl, battle, signal);
    if (signal.aborted || !attempt.isCurrent()) return;
    if (result.status === 'created') attempt.created(result.session);
    else attempt.failed(result.status === 'uncertain', result.message);
  } catch {
    if (!signal.aborted && attempt.isCurrent())
      attempt.failed(
        true,
        'Ответ о создании потерян. Бой мог открыться; повторный запуск пока закрыт.',
      );
  } finally {
    attempt.finished();
  }
}
