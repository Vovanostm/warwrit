import { useEffect, useRef, useState } from 'react';
import {
  COMBAT_LAB_VERSION,
  type CombatLabAction,
  type CombatLabBattleConfig,
  type CombatLabCatalog,
  type CombatLabHex,
  type CombatLabSkillId,
} from '@warwrit/protocol';
import { BattleView } from './BattleView.js';
import { BattleEditor } from './BattleEditor.js';
import { validateBattleDraft } from './editor-model.js';
import {
  commonCombatLabReason,
  handleCombatLabActionReply,
  createCombatLabSessionCallbacks,
} from './controller.js';
import {
  startSessionAttempt,
  admittedBattleDraft,
  messageFor,
  responseCode,
  type ActiveSession,
} from './session-transport.js';
import { isCombatLabView } from './view-validation.js';
import { executeFieldCommand, canIssueManualCommand } from './field-command.js';
import { canControl } from './command-availability.js';
import { CommandDesk } from './CommandDesk.js';
import {
  loadCombatLabCatalog,
  applyRestoredSession,
  restoreBattleSession,
  restartSessionBattle,
  downloadSessionReplay,
} from './session-lifecycle.js';
import { handleCombatLabKey, selectCombatSkill } from './command-input.js';
import { autoplayContinuation, runAutoplayStep } from './autoplay.js';
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

function useCombatLabSelection(session: ActiveSession | null) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<CombatLabHex | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<CombatLabSkillId | null>(null);
  const selectedSkillRef = useRef<CombatLabSkillId | null>(null);
  selectedSkillRef.current = selectedSkillId;
  const hotkeyActions = useRef<Record<string, { reason: string; run: () => unknown }>>({});

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      handleCombatLabKey(
        event,
        event.target instanceof HTMLElement ? event.target : null,
        hotkeyActions.current,
        () => {
          setMenuOpen(false);
          setSelectedSkillId(null);
        },
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setSelectedSkillId(null);
  }, [session?.id, session?.view.activation?.id]);

  return {
    selectedUnitId,
    setSelectedUnitId,
    selectedHex,
    setSelectedHex,
    menuOpen,
    setMenuOpen,
    selectedSkillId,
    setSelectedSkillId,
    selectedSkillRef,
    hotkeyActions,
  };
}

interface CombatLabAutoplayInputs {
  readonly session: ActiveSession | null;
  readonly pending: PendingAction | null;
  readonly sessionLost: boolean;
  readonly deleting: boolean;
  readonly setSelectedSkillId: (skillId: CombatLabSkillId | null) => void;
}

function useCombatLabAutoplay({
  session,
  pending,
  sessionLost,
  deleting,
  setSelectedSkillId,
}: CombatLabAutoplayInputs) {
  const [autoplay, setAutoplay] = useState(false);
  const autoplayRef = useRef(false);
  const autoplayAction = useRef<() => void>(() => {});
  const stopAutoplay = () => {
    autoplayRef.current = false;
    setAutoplay(false);
  };
  const view = session?.view ?? null;

  useEffect(() => {
    const continuation = autoplayContinuation({
      enabled: autoplay,
      view,
      sessionLost,
      deleting,
      pending,
    });
    if (continuation === 'stopped') stopAutoplay();
    if (continuation !== 'ready') return;
    const timer = setTimeout(() => {
      if (autoplayRef.current) autoplayAction.current();
    }, 550);
    return () => clearTimeout(timer);
  }, [autoplay, session, pending, sessionLost, deleting]);

  const toggleAutoplay = () => {
    if (autoplayRef.current) stopAutoplay();
    else {
      setSelectedSkillId(null);
      autoplayRef.current = true;
      setAutoplay(true);
    }
  };

  return { autoplay, setAutoplay, autoplayRef, autoplayAction, stopAutoplay, toggleAutoplay };
}

function useCombatLabSessionState() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [startUnresolved, setStartUnresolved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [notice, setNotice] = useState('');
  const [sessionLost, setSessionLost] = useState(false);
  return {
    session,
    setSession,
    starting,
    setStarting,
    startUnresolved,
    setStartUnresolved,
    deleting,
    setDeleting,
    pending,
    setPending,
    notice,
    setNotice,
    sessionLost,
    setSessionLost,
  };
}

function useCombatLabSessionRefs() {
  const generation = useRef(0);
  const startingRef = useRef(false);
  const pendingRef = useRef<PendingAction | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  const sessionAbort = useRef<AbortController | null>(null);
  const createAbort = useRef<AbortController | null>(null);
  const latestRead = useRef<Promise<void> | null>(null);
  const deletingRef = useRef(false);
  const sessionLostRef = useRef(false);

  return {
    generation,
    startingRef,
    pendingRef,
    sessionRef,
    sessionAbort,
    createAbort,
    latestRead,
    deletingRef,
    sessionLostRef,
  };
}

function useCombatLabEditorState(
  sessionRef: { current: ActiveSession | null },
  setNotice: (notice: string) => void,
) {
  const [catalog, setCatalog] = useState<CombatLabCatalog | null>(null);
  const [draftBattle, setDraftBattle] = useState<CombatLabBattleConfig | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void loadCombatLabCatalog(apiBaseUrl, controller.signal)
      .then((loaded) => {
        setCatalog(loaded);
        setDraftBattle(sessionRef.current?.view.battle ?? loaded.defaultBattle);
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

  return { catalog, draftBattle, setDraftBattle, catalogLoading };
}

interface CombatLabSessionLifecycleInputs {
  readonly autoplayRef: { current: boolean };
  readonly generation: { current: number };
  readonly createAbort: { current: AbortController | null };
  readonly sessionAbort: { current: AbortController | null };
  readonly sessionRef: { current: ActiveSession | null };
  readonly setSession: (session: ActiveSession | null) => void;
  readonly setDraftBattle: (battle: CombatLabBattleConfig) => void;
  readonly setSelectedUnitId: (id: string | null) => void;
  readonly setNotice: (notice: string) => void;
}

function useCombatLabSessionLifecycle({
  autoplayRef,
  generation,
  createAbort,
  sessionAbort,
  sessionRef,
  setSession,
  setDraftBattle,
  setSelectedUnitId,
  setNotice,
}: CombatLabSessionLifecycleInputs) {
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
    void restoreBattleSession(
      apiBaseUrl,
      () => sessionStorage,
      sessionStorageKey,
      controller.signal,
      () => generation.current === expectedGeneration,
    ).then((result) => {
      applyRestoredSession(result, {
        install: installSession,
        draft: setDraftBattle,
        selectUnit: setSelectedUnitId,
        notice: setNotice,
      });
    });
    return () => controller.abort();
  }, []);

  return { installSession };
}

interface CombatLabAutoplayToggleProps {
  readonly autoplay: boolean;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}

export function CombatLabAutoplayToggle({
  autoplay,
  disabled,
  onToggle,
}: CombatLabAutoplayToggleProps) {
  return (
    <button
      className="battle-control battle-control--utility"
      type="button"
      aria-label={autoplay ? 'Остановить автобой' : 'Начать автобой'}
      title={autoplay ? 'Остановить автобой' : 'Начать автобой'}
      aria-pressed={autoplay}
      disabled={disabled}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={autoplay ? 'M8 5v14M16 5v14' : 'M8 5l11 7-11 7z'} />
      </svg>
    </button>
  );
}

export function combatLabMenuDisabled({
  autoplay,
  controlling,
  hasPending,
  deleting,
  starting,
  startUnresolved,
}: {
  readonly autoplay: boolean;
  readonly controlling: boolean;
  readonly hasPending: boolean;
  readonly deleting: boolean;
  readonly starting: boolean;
  readonly startUnresolved: boolean;
}) {
  return {
    replayDisabled: deleting || hasPending,
    restartDisabled: deleting || hasPending || starting || startUnresolved,
    stepDisabled: autoplay || !controlling || hasPending || deleting,
    autoplayDisabled: !autoplay && (!controlling || hasPending || deleting),
  };
}

export function CombatLab() {
  const {
    session,
    setSession,
    starting,
    setStarting,
    startUnresolved,
    setStartUnresolved,
    deleting,
    setDeleting,
    pending,
    setPending,
    notice,
    setNotice,
    sessionLost,
    setSessionLost,
  } = useCombatLabSessionState();
  const {
    selectedUnitId,
    setSelectedUnitId,
    selectedHex,
    setSelectedHex,
    menuOpen,
    setMenuOpen,
    selectedSkillId,
    setSelectedSkillId,
    selectedSkillRef,
    hotkeyActions,
  } = useCombatLabSelection(session);
  const { autoplay, autoplayRef, autoplayAction, stopAutoplay, toggleAutoplay } =
    useCombatLabAutoplay({ session, pending, sessionLost, deleting, setSelectedSkillId });
  const view = session?.view ?? null;
  const {
    generation,
    startingRef,
    pendingRef,
    sessionRef,
    sessionAbort,
    createAbort,
    latestRead,
    deletingRef,
    sessionLostRef,
  } = useCombatLabSessionRefs();
  const { catalog, draftBattle, setDraftBattle, catalogLoading } = useCombatLabEditorState(
    sessionRef,
    setNotice,
  );

  const { installSession } = useCombatLabSessionLifecycle({
    autoplayRef,
    generation,
    createAbort,
    sessionAbort,
    sessionRef,
    setSession,
    setDraftBattle,
    setSelectedUnitId,
    setNotice,
  });

  const { applyLatest, endBattle } = createCombatLabSessionCallbacks(apiBaseUrl, {
    generation,
    sessionRef,
    sessionAbort,
    pendingRef,
    deletingRef,
    sessionLostRef,
    installSession,
    stopAutoplay,
    setDeleting,
    setSessionLost,
    setPending,
    setNotice,
  });

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
        setNotice('');
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

  const restartBattle = () =>
    restartSessionBattle(
      sessionRef.current,
      catalog,
      startingRef.current || startUnresolved,
      endBattle,
      startBattle,
      setNotice,
    );

  const downloadReplay = () =>
    downloadSessionReplay(
      apiBaseUrl,
      sessionRef.current,
      deletingRef.current,
      (replay, filename) => {
        const url = URL.createObjectURL(
          new Blob([`${JSON.stringify(replay, null, 2)}\n`], { type: 'application/json' }),
        );
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      setNotice,
    );

  autoplayAction.current = () =>
    runAutoplayStep(
      sessionRef.current?.view ?? null,
      {
        pending: pendingRef.current !== null,
        deleting: deletingRef.current,
        sessionLost: sessionLostRef.current,
      },
      act,
    );
  const controlling = view !== null && !sessionLost && canControl(view);
  const commonReason = commonCombatLabReason({
    sessionLost,
    autoplay,
    deleting,
    pending,
    resolved: view?.status === 'resolved',
    controlling,
  });

  const menuDisabled = combatLabMenuDisabled({
    autoplay,
    controlling,
    hasPending: pending !== null,
    deleting,
    starting,
    startUnresolved,
  });

  return (
    <main className={`combat-lab-page${session ? ' combat-lab-page--fighting' : ''}`}>
      {!session && (
        <CombatLabEditorShell
          catalog={catalog}
          draft={draftBattle}
          loading={catalogLoading}
          starting={starting}
          unresolved={startUnresolved}
          notice={notice}
          onChange={setDraftBattle}
          onStart={() => void startBattle()}
        />
      )}
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
              selectCombatSkill(view, skillId, selectedSkillId, commonReason, {
                act: actOnField,
                select: setSelectedSkillId,
              });
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
                <CombatLabAutoplayToggle
                  autoplay={autoplay}
                  disabled={menuDisabled.autoplayDisabled}
                  onToggle={toggleAutoplay}
                />
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
                        disabled={menuDisabled.replayDisabled}
                        onClick={() => void downloadReplay()}
                      >
                        Скачать запись боя
                      </button>
                      <button
                        className="battle-control"
                        type="button"
                        disabled={menuDisabled.restartDisabled}
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
                        disabled={menuDisabled.replayDisabled}
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
                          disabled={menuDisabled.stepDisabled}
                          onClick={() => autoplayAction.current()}
                        >
                          Один шаг
                        </button>
                      </div>
                      <small>
                        ЛКМ — осмотр · ПКМ — приказ
                        <br />
                        Тянуть ЛКМ — камера · колесо — масштаб · портрет — к бойцу
                        <br />
                        WASD / стрелки — камера · Home — обзор
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

interface CombatLabEditorProps {
  readonly catalog: CombatLabCatalog | null;
  readonly draft: CombatLabBattleConfig | null;
  readonly loading: boolean;
  readonly starting: boolean;
  readonly unresolved: boolean;
  readonly notice: string;
  readonly onChange: (draft: CombatLabBattleConfig | null) => void;
  readonly onStart: () => void;
}

export function CombatLabEditorShell(props: CombatLabEditorProps) {
  return (
    <>
      <p className="eyebrow">Тренировочный бой · кампания не меняется</p>
      <h1>Лаборатория боя</h1>
      <p>Выберите бойцов, настройте поле и начните бой.</p>
      <CombatLabEditor {...props} />
      {props.notice && !props.unresolved && <p role="status">{props.notice}</p>}
    </>
  );
}

export function CombatLabEditor(props: CombatLabEditorProps) {
  const { catalog, draft, loading, starting, unresolved, notice, onChange } = props;
  return (
    <section aria-label="Настройка боя">
      {loading && <p role="status">Загружаются бойцы и карты…</p>}
      <CombatLabEditorActions {...props} />
      {catalog && draft && (
        <>
          <BattleEditor
            catalog={catalog}
            value={draft}
            onChange={onChange}
            disabled={starting || unresolved}
          />
          <p className="battle-editor-note">
            Мельничная тварь предупреждает о тяжёлом ударе. Паника заставляет бежать; людям можно
            сдаться, если безопасный выход перекрыт.
          </p>
        </>
      )}
      {!loading && !catalog && !notice && <p role="alert">Редактор боя недоступен.</p>}
    </section>
  );
}

function CombatLabEditorActions({
  catalog,
  draft,
  loading,
  starting,
  unresolved,
  notice,
  onChange,
  onStart,
}: CombatLabEditorProps) {
  const draftErrors = catalog && draft ? validateBattleDraft(draft, catalog) : [];
  const startDisabled =
    !catalog || !draft || loading || starting || unresolved || draftErrors.length > 0;
  return (
    <div className="combat-lab-actions" role="group" aria-label="Запуск боя">
      <button type="button" className="combat-lab-start" onClick={onStart} disabled={startDisabled}>
        {starting ? 'Начинаем бой…' : 'Начать бой'}
      </button>
      {!startDisabled && <p role="status">Бой готов к запуску.</p>}
      {draftErrors.length > 0 && (
        <ul className="battle-editor-errors">
          {draftErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => onChange(catalog?.defaultBattle ?? null)}
        disabled={!catalog || starting || unresolved}
      >
        Вернуть исходную карту и состав
      </button>
      {unresolved && <p role="alert">{notice}</p>}
    </div>
  );
}
