import { useEffect, useRef, useState } from 'react';
import {
  COMBAT_LAB_SCENARIO,
  COMBAT_LAB_VERSION,
  type CombatLabAction,
  type CombatLabHex,
  type CombatLabView,
} from '@warwrit/protocol';
import { BattleView } from './BattleView.js';
import { isCombatLabView, latestCombatLabView } from './controller.js';
import './combat-lab.css';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const capabilityHeader = 'x-combat-lab-capability';
const pollingIntervalMs = 750;

interface ActiveSession {
  readonly id: string;
  readonly capability: string;
  readonly view: CombatLabView;
}

interface PendingAction {
  readonly body: string;
  readonly description: string;
  readonly uncertain: boolean;
}

const errorText: Record<string, string> = {
  FORBIDDEN_LOCAL_ORIGIN: 'Сервер отклонил запрос: проверьте локальный адрес страницы.',
  INVALID_ACTION: 'Это действие сейчас недопустимо. Состояние боя обновлено.',
  INVALID_REQUEST: 'Сервер не принял формат запроса.',
  NOT_FOUND: 'Сессия боя потеряна или завершилась после перезапуска сервера.',
  REQUEST_CONFLICT: 'Идентификатор запроса уже использован с другим действием.',
  STALE_VIEW: 'Ход изменился до отправки действия. Состояние обновлено.',
  UNAUTHORIZED: 'Сейчас ход другой стороны.',
  LIMIT_REACHED: 'Достигнут предел диагностической сессии.',
};

function responseCode(value: unknown, fallback: string): string {
  if (value !== null && typeof value === 'object' && 'code' in value) {
    const code = value.code;
    if (typeof code === 'string') return code;
  }
  return fallback;
}

function messageFor(code: string): string {
  return errorText[code] ?? `Запрос завершился с кодом ${code}.`;
}

function canControl(view: CombatLabView): boolean {
  const actor = view.units.find((unit) => unit.id === view.activation?.actorId);
  return view.status === 'active' && actor?.sideId === view.controlledSideId;
}

export function CombatLab() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [startUnresolved, setStartUnresolved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<CombatLabHex | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [notice, setNotice] = useState('');
  const [sessionLost, setSessionLost] = useState(false);
  const generation = useRef(0);
  const startingRef = useRef(false);
  const pendingRef = useRef<PendingAction | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  const sessionAbort = useRef<AbortController | null>(null);
  const createAbort = useRef<AbortController | null>(null);
  const latestRead = useRef<Promise<void> | null>(null);
  const deletingRef = useRef(false);
  const sessionLostRef = useRef(false);

  useEffect(
    () => () => {
      generation.current += 1;
      createAbort.current?.abort();
      sessionAbort.current?.abort();
    },
    [],
  );

  const installSession = (next: ActiveSession | null) => {
    sessionRef.current = next;
    setSession(next);
  };

  const applyLatest = (incoming: CombatLabView, expectedGeneration: number) => {
    if (generation.current !== expectedGeneration) return;
    const current = sessionRef.current;
    if (current === null || current.id !== incoming.sessionId) return;
    const view = latestCombatLabView(current.view, incoming);
    if (view !== current.view) installSession({ ...current, view });
  };

  const refreshLatest = (current: ActiveSession, expectedGeneration: number) => {
    if (latestRead.current !== null) return latestRead.current;
    const controller = sessionAbort.current;
    if (controller === null || controller.signal.aborted) return Promise.resolve();
    const request = (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/dev/combat-lab/${current.id}`, {
          headers: { [capabilityHeader]: current.capability },
          signal: controller.signal,
        });
        if (generation.current !== expectedGeneration || controller.signal.aborted) return;
        if (response.status === 404) {
          sessionLostRef.current = true;
          setSessionLost(true);
          setNotice(messageFor('NOT_FOUND'));
          return;
        }
        if (!response.ok) {
          setNotice(
            messageFor(responseCode(await response.json().catch(() => null), `${response.status}`)),
          );
          return;
        }
        const body: unknown = await response.json();
        if (!isCombatLabView(body) || body.sessionId !== current.id) {
          setNotice('Сервер вернул некорректное состояние боя.');
          return;
        }
        applyLatest(body, expectedGeneration);
        setNotice((currentNotice) =>
          currentNotice.startsWith('Сервер временно недоступен.') ||
          currentNotice.startsWith('Ответ получен. Запрашиваю актуальное состояние…')
            ? ''
            : currentNotice,
        );
      } catch {
        if (!controller.signal.aborted && generation.current === expectedGeneration) {
          setNotice('Сервер временно недоступен. Повторное чтение продолжится автоматически.');
        }
      }
    })();
    latestRead.current = request;
    void request.finally(() => {
      if (latestRead.current === request) latestRead.current = null;
    });
    return request;
  };

  // Keep one polling loop and request controller for a session; terminal views stop polling but
  // leave the same-session request path available for an uncertain historical retry.
  useEffect(() => {
    if (session === null) return;
    const controller = new AbortController();
    const expectedGeneration = generation.current;
    sessionAbort.current = controller;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (stopped || controller.signal.aborted) return;
      if (pendingRef.current === null && !deletingRef.current && !sessionLostRef.current) {
        await refreshLatest(sessionRef.current ?? session, expectedGeneration);
      }
      const latest = sessionRef.current;
      if (
        !stopped &&
        !controller.signal.aborted &&
        latest?.id === session.id &&
        latest.view.status === 'active' &&
        !sessionLostRef.current
      ) {
        timer = setTimeout(() => void poll(), pollingIntervalMs);
      }
    };

    timer = setTimeout(() => void poll(), pollingIntervalMs);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      if (sessionAbort.current === controller) sessionAbort.current = null;
    };
  }, [session?.id]);

  const startBattle = async () => {
    if (startingRef.current || startUnresolved) return;
    startingRef.current = true;
    setStarting(true);
    setNotice('');
    const expectedGeneration = ++generation.current;
    const controller = new AbortController();
    createAbort.current = controller;
    const body = JSON.stringify({
      version: COMBAT_LAB_VERSION,
      requestId: crypto.randomUUID(),
      scenarioId: COMBAT_LAB_SCENARIO,
    });
    try {
      const response = await fetch(`${apiBaseUrl}/dev/combat-lab`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: controller.signal,
      });
      if (controller.signal.aborted || generation.current !== expectedGeneration) return;
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (response.status >= 500) {
          setStartUnresolved(true);
          setNotice(
            'Сервер не подтвердил создание. Бой мог быть создан; повтор запрещён. Перезапустите сервер и затем перезагрузите вкладку для ручного восстановления.',
          );
          return;
        }
        setNotice(messageFor(responseCode(error, `${response.status}`)));
        return;
      }
      const view: unknown = await response.json();
      const capability = response.headers.get(capabilityHeader);
      if (
        !isCombatLabView(view) ||
        capability === null ||
        view.sessionId.length === 0 ||
        view.battleId.length === 0
      ) {
        setStartUnresolved(true);
        setNotice(
          'Ответ на создание не удалось подтвердить. Бой мог быть создан; новый Start запрещён. Перезапустите сервер и затем перезагрузите вкладку для ручного восстановления.',
        );
        return;
      }
      const next = { id: view.sessionId, capability, view };
      sessionLostRef.current = false;
      setSessionLost(false);
      sessionRef.current = next;
      sessionAbort.current = null;
      setSession(next);
      setSelectedUnitId(view.activation?.actorId ?? null);
      setSelectedHex(null);
      setNotice('Бой создан сервером.');
    } catch {
      if (!controller.signal.aborted && generation.current === expectedGeneration) {
        setStartUnresolved(true);
        setNotice(
          'Ответ на создание потерян или неизвестен. Бой мог быть создан; повтор запрещён. Перезапустите сервер и затем перезагрузите вкладку для ручного восстановления.',
        );
      }
    } finally {
      if (createAbort.current === controller) createAbort.current = null;
      if (generation.current === expectedGeneration) {
        startingRef.current = false;
        setStarting(false);
      }
    }
  };

  const submitAction = async (action: CombatLabAction, description: string, retryBody?: string) => {
    const current = sessionRef.current;
    const requestBody = retryBody ?? JSON.stringify(action);
    const existing = pendingRef.current;
    if (
      current === null ||
      deletingRef.current ||
      (existing !== null && (retryBody === undefined || existing.body !== requestBody)) ||
      (retryBody === undefined && !canControl(current.view))
    )
      return;
    const flight: PendingAction = { body: requestBody, description, uncertain: false };
    pendingRef.current = flight;
    setPending(flight);
    setNotice('');
    const expectedGeneration = generation.current;
    const controller = sessionAbort.current;
    if (controller === null) {
      const uncertain = { ...flight, uncertain: true };
      pendingRef.current = uncertain;
      setPending(uncertain);
      setNotice('Ответ неизвестен. Повтор отправит то же действие с тем же идентификатором.');
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/dev/combat-lab/${current.id}/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [capabilityHeader]: current.capability,
        },
        body: requestBody,
        signal: controller.signal,
      });
      if (controller.signal.aborted || generation.current !== expectedGeneration) return;
      const reply: unknown = await response.json().catch(() => null);
      if (response.status >= 500) {
        const uncertain = { ...flight, uncertain: true };
        pendingRef.current = uncertain;
        setPending(uncertain);
        setNotice('Сервер не подтвердил результат. Повтор отправит то же действие с тем же ID.');
        return;
      }
      if (response.status === 404) {
        sessionLostRef.current = true;
        setSessionLost(true);
      }
      if (!response.ok || (reply !== null && typeof reply === 'object' && 'code' in reply)) {
        const code = responseCode(reply, `${response.status}`);
        setNotice(messageFor(code));
      } else {
        setNotice('Ответ получен. Запрашиваю актуальное состояние…');
      }
      await refreshLatest(current, expectedGeneration);
      if (generation.current === expectedGeneration) {
        pendingRef.current = null;
        setPending(null);
      }
    } catch {
      if (!controller.signal.aborted && generation.current === expectedGeneration) {
        const uncertain = { ...flight, uncertain: true };
        pendingRef.current = uncertain;
        setPending(uncertain);
        setNotice('Доставка неизвестна. Повторить можно только то же действие с тем же ID.');
      }
    }
  };

  const act = (intent: CombatLabAction['intent'], description: string) => {
    const view = sessionRef.current?.view;
    if (view?.activation === null || view?.activation === undefined) return;
    void submitAction(
      {
        version: COMBAT_LAB_VERSION,
        sessionId: view.sessionId,
        battleId: view.battleId,
        requestId: crypto.randomUUID(),
        expectedViewRevision: view.viewRevision,
        activationId: view.activation.id,
        actorId: view.activation.actorId,
        intent,
      },
      description,
    );
  };

  const retryAction = () => {
    const flight = pendingRef.current;
    const current = sessionRef.current;
    if (flight === null || current === null || !flight.uncertain) return;
    const action = JSON.parse(flight.body) as CombatLabAction;
    void submitAction(action, flight.description, flight.body);
  };

  const endBattle = async () => {
    const current = sessionRef.current;
    if (current === null || deletingRef.current || pendingRef.current !== null) return;
    setDeleting(true);
    deletingRef.current = true;
    const controller = sessionAbort.current;
    try {
      const response = await fetch(`${apiBaseUrl}/dev/combat-lab/${current.id}`, {
        method: 'DELETE',
        headers: { [capabilityHeader]: current.capability },
        ...(controller === null ? {} : { signal: controller.signal }),
      });
      if (response.ok || response.status === 404) {
        generation.current += 1;
        sessionAbort.current?.abort();
        installSession(null);
        sessionLostRef.current = false;
        setSessionLost(false);
        pendingRef.current = null;
        setPending(null);
        setNotice(
          response.status === 404 ? messageFor('NOT_FOUND') : 'Диагностическая сессия завершена.',
        );
      } else {
        setNotice(
          messageFor(responseCode(await response.json().catch(() => null), `${response.status}`)),
        );
      }
    } catch {
      setNotice('Удаление не подтверждено. Сессия остаётся на сервере, пока он работает.');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const view = session?.view ?? null;
  const controlling = view !== null && !sessionLost && canControl(view);
  const selectedTarget = view?.units.find(
    (unit) =>
      unit.id === selectedUnitId &&
      unit.sideId !== view.controlledSideId &&
      unit.status === 'active',
  );

  return (
    <main className="combat-lab-page">
      <p className="eyebrow">Локальная диагностика · без сохранения кампании</p>
      <h1>Лаборатория боя</h1>
      <p>
        Ход и результат рассчитывает локальный сервер. Противник может оставаться бездействующим:
        серверное расписание PB05 ещё не подключено.
      </p>
      {!session && (
        <section aria-label="Запуск диагностического боя">
          <button
            type="button"
            onClick={() => void startBattle()}
            disabled={starting || startUnresolved}
          >
            {starting ? 'Создаём бой…' : 'Начать новый диагностический бой'}
          </button>
          {startUnresolved && <p role="alert">{notice}</p>}
        </section>
      )}
      {notice && !startUnresolved && <p role="status">{notice}</p>}
      {view && (
        <>
          <section className="combat-lab-controls" aria-label="Управление текущим ходом">
            <h2>
              {controlling ? `Ваш ход: ${view.activation?.actorId}` : 'Ожидание хода вашей стороны'}
            </h2>
            {controlling ? (
              <>
                <p>
                  Выберите клетку для перемещения или бойца противника для атаки. Выбор только
                  осматривает данные.
                </p>
                <div className="combat-lab-actions">
                  <button
                    type="button"
                    disabled={pending !== null || selectedHex === null}
                    onClick={() =>
                      selectedHex && act({ type: 'move', to: selectedHex }, 'Перемещение')
                    }
                  >
                    Переместиться в{' '}
                    {selectedHex ? `${selectedHex.q}, ${selectedHex.r}` : 'выбранную клетку'}
                  </button>
                  <button
                    type="button"
                    disabled={pending !== null || selectedTarget === undefined}
                    onClick={() =>
                      selectedTarget &&
                      act({ type: 'attack', targetId: selectedTarget.id }, 'Атака')
                    }
                  >
                    Атаковать {selectedTarget?.id ?? 'выбранную цель'}
                  </button>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => act({ type: 'defend' }, 'Защита')}
                  >
                    Защищаться
                  </button>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => act({ type: 'wait' }, 'Ожидание')}
                  >
                    Ждать
                  </button>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => act({ type: 'retreat' }, 'Отступление')}
                  >
                    Отступить
                  </button>
                </div>
              </>
            ) : (
              <p>
                Команды доступны только когда серверный активный боец относится к вашей стороне.
              </p>
            )}
            {pending && (
              <p role="status">
                {pending.uncertain
                  ? `Неизвестный ответ: ${pending.description}.`
                  : `Ожидается ответ: ${pending.description}.`}
                {pending.uncertain && (
                  <button type="button" onClick={retryAction}>
                    Повторить тот же запрос
                  </button>
                )}
              </p>
            )}
            {selectedHex && (
              <p>
                Осмотр клетки: {selectedHex.q}, {selectedHex.r}
              </p>
            )}
          </section>
          <BattleView
            view={view}
            selectedUnitId={selectedUnitId}
            onSelectUnit={setSelectedUnitId}
            onSelectHex={setSelectedHex}
          />
          <button
            type="button"
            disabled={deleting || pending !== null}
            onClick={() => void endBattle()}
          >
            {deleting ? 'Завершаем…' : 'Завершить диагностическую сессию'}
          </button>
        </>
      )}
    </main>
  );
}
