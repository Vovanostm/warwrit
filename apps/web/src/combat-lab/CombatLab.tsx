import { useEffect, useRef, useState } from 'react';
import {
  COMBAT_LAB_VERSION,
  type CombatLabAction,
  type CombatLabBattleConfig,
  type CombatLabCatalog,
  type CombatLabHex,
  type CombatLabSkillId,
  type CombatLabView,
} from '@warwrit/protocol';
import { BattleView } from './BattleView.js';
import { BattleEditor } from './BattleEditor.js';
import { validateBattleDraft } from './editor-model.js';
import { handleCombatLabActionReply, latestCombatLabView } from './controller.js';
import {
  startSessionAttempt,
  admittedBattleDraft,
  readSavedSession,
  readSessionView,
  messageFor,
  responseCode,
  type ActiveSession,
} from './session-transport.js';
import { isCombatLabView } from './view-validation.js';
import { executeFieldCommand, canIssueManualCommand } from './field-command.js';
import { canControl } from './command-availability.js';
import { CommandDesk } from './CommandDesk.js';
import './combat-lab.css';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const capabilityHeader = 'x-combat-lab-capability';
const pollingIntervalMs = 750;
const sessionStorageKey = 'warwrit.combat-lab.session.v1';

interface PendingAction {
  readonly body: string;
  readonly description: string;
  readonly uncertain: boolean;
}

export function CombatLab() {
  const [catalog, setCatalog] = useState<CombatLabCatalog | null>(null);
  const [draftBattle, setDraftBattle] = useState<CombatLabBattleConfig | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [startUnresolved, setStartUnresolved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<CombatLabHex | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<CombatLabSkillId | null>(null);
  const selectedSkillRef = useRef<CombatLabSkillId | null>(null);
  selectedSkillRef.current = selectedSkillId;
  const [autoplay, setAutoplay] = useState(false);
  const autoplayRef = useRef(false);
  const autoplayAction = useRef<() => void>(() => {});
  const stopAutoplay = () => {
    autoplayRef.current = false;
    setAutoplay(false);
  };
  const [notice, setNotice] = useState('');
  const [sessionLost, setSessionLost] = useState(false);
  const hotkeyActions = useRef<Record<string, { reason: string; run: () => unknown }>>({});
  const generation = useRef(0);
  const startingRef = useRef(false);
  const pendingRef = useRef<PendingAction | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  const sessionAbort = useRef<AbortController | null>(null);
  const createAbort = useRef<AbortController | null>(null);
  const latestRead = useRef<Promise<void> | null>(null);
  const deletingRef = useRef(false);
  const sessionLostRef = useRef(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setSelectedSkillId(null);
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, button, [contenteditable="true"]')
      )
        return;
      if (!(event.target instanceof HTMLElement) || !event.target.closest('.battle-view')) return;
      const action = hotkeyActions.current[event.key === ' ' ? '4' : event.key];
      if (!action || action.reason) return;
      event.preventDefault();
      action.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/dev/combat-lab/catalog`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('catalog unavailable');
        const value: unknown = await response.json();
        if (
          value === null ||
          typeof value !== 'object' ||
          !('profiles' in value) ||
          !Array.isArray(value.profiles) ||
          !('defaultBattle' in value) ||
          value.defaultBattle === null ||
          typeof value.defaultBattle !== 'object'
        )
          throw new Error('invalid catalog');
        const loaded = value as CombatLabCatalog;
        setCatalog(loaded);
        setDraftBattle(sessionRef.current?.view.battle ?? loaded.defaultBattle);
        setNotice('');
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setNotice(
            'Не удалось загрузить составы и карту. Обновите страницу, чтобы попробовать снова.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      autoplayRef.current = false;
      generation.current += 1;
      createAbort.current?.abort();
      sessionAbort.current?.abort();
    },
    [],
  );

  const installSession = (next: ActiveSession | null) => {
    sessionRef.current = next;
    setSession(next);
    try {
      if (next === null) sessionStorage.removeItem(sessionStorageKey);
      else
        sessionStorage.setItem(
          sessionStorageKey,
          JSON.stringify({ id: next.id, capability: next.capability }),
        );
    } catch {
      /* A tab with disabled storage can still play its current session. */
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const expectedGeneration = generation.current;
    const restore = async () => {
      try {
        const saved = readSavedSession(sessionStorage, sessionStorageKey);
        if (!saved) return;
        const response = await fetch(
          `${apiBaseUrl}/dev/combat-lab/${encodeURIComponent(saved.id)}`,
          { headers: { [capabilityHeader]: saved.capability }, signal: controller.signal },
        );
        if (controller.signal.aborted || generation.current !== expectedGeneration) return;
        if (response.status === 404 || response.status === 401) {
          sessionStorage.removeItem(sessionStorageKey);
          setNotice('Сохранённая сессия недоступна. Создайте новый бой.');
          return;
        }
        if (!response.ok) throw new Error('restore unavailable');
        const view = await readSessionView(response, saved.id);
        installSession({ id: saved.id, capability: saved.capability, view });
        if (view.battle) setDraftBattle(view.battle);
        setSelectedUnitId(view.activation?.actorId ?? null);
      } catch {
        if (!controller.signal.aborted)
          setNotice('Не удалось восстановить бой. Обновите страницу для повторного чтения.');
      }
    };
    void restore();
    return () => controller.abort();
  }, []);

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

  const startBattle = async (battle = draftBattle) => {
    stopAutoplay();
    const admitted = admittedBattleDraft(battle, catalog, startingRef.current || startUnresolved);
    if (!admitted) return;
    startingRef.current = true;
    setStarting(true);
    setNotice('');
    const expectedGeneration = ++generation.current;
    const controller = new AbortController();
    createAbort.current = controller;
    await startSessionAttempt(apiBaseUrl, admitted, controller.signal, {
      isCurrent: () => generation.current === expectedGeneration,
      created: (next) => {
        sessionLostRef.current = false;
        setSessionLost(false);
        sessionRef.current = next;
        sessionAbort.current = null;
        installSession(next);
        setSelectedUnitId(next.view.activation?.actorId ?? null);
        setSelectedHex(null);
        setNotice('Бой начался.');
      },
      failed: (uncertain, message) => {
        setStartUnresolved(uncertain);
        setNotice(message);
      },
      finished: () => {
        if (createAbort.current === controller) createAbort.current = null;
        if (generation.current === expectedGeneration) {
          startingRef.current = false;
          setStarting(false);
        }
      },
    });
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
      stopAutoplay();
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
        stopAutoplay();
        pendingRef.current = uncertain;
        setPending(uncertain);
        setNotice('Сервер не подтвердил результат. Повтор отправит то же действие с тем же ID.');
        return;
      }
      if (response.status === 404) {
        sessionLostRef.current = true;
        setSessionLost(true);
      }
      const action = JSON.parse(requestBody) as CombatLabAction;
      const outcome = await handleCombatLabActionReply(response.status, reply, action, () =>
        refreshLatest(current, expectedGeneration),
      );
      if (controller.signal.aborted || generation.current !== expectedGeneration) return;
      if (outcome.status === 'uncertain') {
        const uncertain = { ...flight, uncertain: true };
        stopAutoplay();
        pendingRef.current = uncertain;
        setPending(uncertain);
        setNotice('Ответ на действие не подтвержден. Повтор отправит то же действие с тем же ID.');
        return;
      }
      if (outcome.status !== 'accepted') stopAutoplay();
      if (
        outcome.status === 'accepted' &&
        sessionRef.current?.view.viewRevision === action.expectedViewRevision
      )
        stopAutoplay();
      if (outcome.status === 'accepted') setSelectedSkillId(null);
      setNotice(outcome.status === 'rejected' ? messageFor(outcome.code) : '');
      if (generation.current === expectedGeneration) {
        pendingRef.current = null;
        setPending(null);
      }
    } catch {
      if (!controller.signal.aborted && generation.current === expectedGeneration) {
        const uncertain = { ...flight, uncertain: true };
        stopAutoplay();
        pendingRef.current = uncertain;
        setPending(uncertain);
        setNotice('Доставка неизвестна. Повторить можно только то же действие с тем же ID.');
      }
    }
  };

  const act = (intent: CombatLabAction['intent'], description: string) => {
    if (autoplayRef.current && intent.type !== 'autoplay') return;
    if (selectedSkillRef.current && intent.type !== 'use-skill' && intent.type !== 'autoplay')
      return;
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

  const actOnField = (intent: CombatLabAction['intent']) => {
    const current = sessionRef.current?.view;
    if (
      !current ||
      !canIssueManualCommand(current, {
        autoplay: autoplayRef.current,
        pending: pendingRef.current !== null,
        deleting: deletingRef.current,
        sessionLost: sessionLostRef.current,
      })
    )
      return;
    executeFieldCommand(current, intent, selectedSkillRef.current, {
      notice: setNotice,
      confirm: (message) => window.confirm(message),
      selectMovement: (to) => {
        setSelectedHex(to);
        setSelectedUnitId(null);
      },
      selectTarget: (id) => {
        setSelectedUnitId(id);
        setSelectedHex(null);
      },
      act,
    });
  };

  const endBattle = async (): Promise<boolean> => {
    stopAutoplay();
    const current = sessionRef.current;
    if (current === null) return true;
    if (deletingRef.current || pendingRef.current !== null) return false;
    setDeleting(true);
    deletingRef.current = true;
    const controller = sessionAbort.current;
    let removed = false;
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
        removed = true;
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
    return removed;
  };

  const restartBattle = async () => {
    const acceptedBattle = sessionRef.current?.view.battle;
    if (!catalog || startingRef.current || startUnresolved) {
      setNotice('Перезапуск недоступен: дождитесь загрузки состава или обновите страницу.');
      return;
    }
    if (acceptedBattle && validateBattleDraft(acceptedBattle, catalog).length > 0) return;
    if (!acceptedBattle || !(await endBattle())) return;
    await startBattle(acceptedBattle);
  };

  const downloadReplay = async () => {
    const current = sessionRef.current;
    if (!current || deletingRef.current) return;
    try {
      const response = await fetch(`${apiBaseUrl}/dev/combat-lab/${current.id}/replay`, {
        headers: { [capabilityHeader]: current.capability },
      });
      if (!response.ok) {
        setNotice(
          response.status === 404 ? messageFor('NOT_FOUND') : 'Повтор боя скачать не удалось.',
        );
        return;
      }
      const replay = await response.json();
      const url = URL.createObjectURL(
        new Blob([`${JSON.stringify(replay, null, 2)}\n`], { type: 'application/json' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${current.view.battle?.name ?? 'battle-replay'}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice('Запись боя скачана.');
    } catch {
      setNotice('Повтор боя скачать не удалось.');
    }
  };

  autoplayAction.current = () => {
    const current = sessionRef.current;
    if (
      !current ||
      pendingRef.current ||
      deletingRef.current ||
      sessionLostRef.current ||
      !canControl(current.view)
    )
      return;
    act({ type: 'autoplay' }, 'Шаг автобоя');
  };
  useEffect(() => {
    if (!autoplay) return;
    if (
      !session ||
      session.view.status !== 'active' ||
      sessionLost ||
      deleting ||
      pending?.uncertain
    ) {
      stopAutoplay();
      return;
    }
    if (pending || !canControl(session.view)) return;
    const timer = setTimeout(() => {
      if (autoplayRef.current) autoplayAction.current();
    }, 550);
    return () => clearTimeout(timer);
  }, [autoplay, session, pending, sessionLost, deleting]);

  useEffect(() => {
    setSelectedSkillId(null);
  }, [session?.id, session?.view.activation?.id]);
  const view = session?.view ?? null;
  const controlling = view !== null && !sessionLost && canControl(view);
  const commonReason = sessionLost
    ? 'Бой недоступен'
    : autoplay
      ? 'Автобой включён — остановите для ручного приказа'
      : deleting
        ? 'Завершаем бой'
        : pending
          ? pending.uncertain
            ? 'Результат не подтверждён'
            : 'Ожидается ответ'
          : view?.status === 'resolved'
            ? 'Бой завершён'
            : !controlling
              ? 'Ход противника'
              : '';
  const draftErrors = catalog && draftBattle ? validateBattleDraft(draftBattle, catalog) : [];

  return (
    <main className={`combat-lab-page${session ? ' combat-lab-page--fighting' : ''}`}>
      {!session && (
        <>
          <p className="eyebrow">Отдельный бой · кампания не меняется</p>
          <h1>Лаборатория боя</h1>
        </>
      )}
      {!session && (
        <p>Составьте бой и карту, затем проверьте приказы на поле. Фигуры остаются статичными.</p>
      )}
      {!session && (
        <section aria-label="Настройка боя">
          {catalogLoading && <p role="status">Загружаются бойцы и карты…</p>}
          {catalog && draftBattle && (
            <>
              <BattleEditor
                catalog={catalog}
                value={draftBattle}
                onChange={setDraftBattle}
                disabled={starting || startUnresolved}
              />
              <p className="battle-editor-note">
                Мельничная тварь предупреждает о тяжёлом ударе. Паника заставляет бежать; людям
                можно сдаться, если безопасный выход перекрыт.
              </p>
            </>
          )}
          {!catalogLoading && !catalog && !notice && <p role="alert">Редактор боя недоступен.</p>}
          <button
            type="button"
            onClick={() => void startBattle()}
            disabled={
              !catalog ||
              !draftBattle ||
              catalogLoading ||
              starting ||
              startUnresolved ||
              draftErrors.length > 0
            }
          >
            {starting ? 'Начинаем бой…' : 'Начать бой'}
          </button>
          {draftErrors.length > 0 && (
            <ul className="battle-editor-errors">
              {draftErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setDraftBattle(catalog?.defaultBattle ?? null)}
            disabled={!catalog || starting || startUnresolved}
          >
            Вернуть исходную карту и состав
          </button>
          {startUnresolved && <p role="alert">{notice}</p>}
        </section>
      )}
      {notice && !startUnresolved && !session && <p role="status">{notice}</p>}
      {view && (
        <>
          <BattleView
            view={view}
            selectedUnitId={selectedUnitId}
            selectedHex={selectedHex}
            onSelectUnit={(id) => {
              setSelectedUnitId(id);
              setSelectedHex(null);
            }}
            onSelectHex={setSelectedHex}
            onAct={actOnField}
            onRefusal={setNotice}
            selectedSkillId={selectedSkillId}
            skillDisabledReason={commonReason}
            onSelectSkill={(skillId) => {
              const skill = view.skills?.find((candidate) => candidate.skillId === skillId);
              if (!skill || commonReason) return;
              if (skill.target === 'self') actOnField({ type: 'use-skill', skillId });
              else setSelectedSkillId(selectedSkillId === skillId ? null : skillId);
            }}
            busy={deleting || pending !== null || starting || startUnresolved}
            onRestart={() => {
              setMenuOpen(false);
              void restartBattle();
            }}
            onEditor={() => {
              setMenuOpen(false);
              void endBattle();
            }}
            menu={
              <>
                <button
                  className="battle-control battle-control--utility"
                  type="button"
                  aria-label={autoplay ? 'Остановить автобой' : 'Начать автобой'}
                  title={autoplay ? 'Остановить автобой' : 'Начать автобой'}
                  aria-pressed={autoplay}
                  disabled={!autoplay && (!controlling || pending !== null || deleting)}
                  onClick={() => {
                    if (autoplayRef.current) stopAutoplay();
                    else {
                      setSelectedSkillId(null);
                      autoplayRef.current = true;
                      setAutoplay(true);
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={autoplay ? 'M8 5v14M16 5v14' : 'M8 5l11 7-11 7z'} />
                  </svg>
                </button>
                <div className="battle-menu">
                  <button
                    className="battle-control battle-control--utility"
                    type="button"
                    aria-label="Меню боя"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen(!menuOpen)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 6h14M5 12h14M5 18h14" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="battle-menu-panel" aria-label="Меню боя">
                      <strong>Управление боем</strong>
                      <button
                        className="battle-control"
                        type="button"
                        disabled={deleting || pending !== null}
                        onClick={() => void downloadReplay()}
                      >
                        Скачать запись боя
                      </button>
                      <button
                        className="battle-control"
                        type="button"
                        disabled={deleting || pending !== null || starting || startUnresolved}
                        onClick={() => {
                          setMenuOpen(false);
                          void restartBattle();
                        }}
                      >
                        Начать заново
                      </button>
                      <button
                        className="battle-control"
                        type="button"
                        disabled={deleting || pending !== null}
                        onClick={() => {
                          setMenuOpen(false);
                          void endBattle();
                        }}
                      >
                        К редактору
                      </button>
                      <div className="battle-autoplay" aria-label="Автобой">
                        <button
                          className="battle-control"
                          type="button"
                          disabled={autoplay || !controlling || pending !== null || deleting}
                          onClick={() => autoplayAction.current()}
                        >
                          Один шаг
                        </button>
                      </div>
                      <small>
                        ЛКМ — осмотр · ПКМ — приказ
                        <br />
                        Тянуть ЛКМ — камера · колесо — масштаб
                        <br />
                        WASD / стрелки — камера
                      </small>
                    </div>
                  )}
                </div>
              </>
            }
          >
            <CommandDesk
              view={view}
              selectedUnitId={selectedUnitId}
              selectedHex={selectedHex}
              commonReason={commonReason}
              selectedSkillId={selectedSkillId}
              menuOpen={menuOpen}
              hotkeyActions={hotkeyActions}
              act={act}
              actOnField={actOnField}
              autoplay={autoplay}
              pending={pending}
              retryAction={retryAction}
              notice={notice}
            />
          </BattleView>
        </>
      )}
    </main>
  );
}
