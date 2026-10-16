import { CombatIcon, type CombatIconName } from './CombatIcon.js';
import { useEffect, useRef, useState } from 'react';
import {
  COMBAT_LAB_VERSION,
  SPRITE_COMBAT_LAB_SCENARIO,
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
import {
  combatSkillReasonText,
  handleCombatLabActionReply,
  isCombatLabView,
  latestCombatLabView,
} from './controller.js';
import './combat-lab.css';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const capabilityHeader = 'x-combat-lab-capability';
const pollingIntervalMs = 750;
const sessionStorageKey = 'warwrit.combat-lab.session.v1';

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
  FORBIDDEN_LOCAL_ORIGIN: 'Эта страница не разрешена для боя.',
  INVALID_ACTION: 'Такое действие сейчас недоступно. Состояние боя обновлено.',
  INVALID_REQUEST: 'Бой не принял это действие.',
  NOT_FOUND: 'Этот бой завершился.',
  REQUEST_CONFLICT: 'Состояние боя изменилось. Обновите выбор.',
  STALE_VIEW: 'Ход изменился до отправки. Состояние обновлено.',
  UNAUTHORIZED: 'Сейчас ходит противник.',
  LIMIT_REACHED: 'Сейчас запущено слишком много боёв.',
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
        const raw = sessionStorage.getItem(sessionStorageKey);
        if (!raw) return;
        const saved: unknown = JSON.parse(raw);
        if (
          !saved ||
          typeof saved !== 'object' ||
          !('id' in saved) ||
          !('capability' in saved) ||
          typeof saved.id !== 'string' ||
          typeof saved.capability !== 'string'
        ) {
          sessionStorage.removeItem(sessionStorageKey);
          return;
        }
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
        const view: unknown = await response.json();
        if (!isCombatLabView(view) || view.sessionId !== saved.id) throw new Error('invalid view');
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
    if (startingRef.current || startUnresolved || !catalog || !battle) return;
    if (validateBattleDraft(battle, catalog).length > 0) return;
    startingRef.current = true;
    setStarting(true);
    setNotice('');
    const expectedGeneration = ++generation.current;
    const controller = new AbortController();
    createAbort.current = controller;
    const body = JSON.stringify({
      version: COMBAT_LAB_VERSION,
      requestId: crypto.randomUUID(),
      scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
      battle,
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
            'Ответ о создании не получен. Этот бой мог открыться; повторный запуск пока закрыт, чтобы не создать второй.',
          );
          return;
        }
        setNotice(
          error !== null && typeof error === 'object' && typeof error.message === 'string'
            ? error.message
            : messageFor(responseCode(error, `${response.status}`)),
        );
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
          'Ответ о создании не подтверждён. Этот бой мог открыться; повторный запуск пока закрыт.',
        );
        return;
      }
      const next = { id: view.sessionId, capability, view };
      sessionLostRef.current = false;
      setSessionLost(false);
      sessionRef.current = next;
      sessionAbort.current = null;
      installSession(next);
      setSelectedUnitId(view.activation?.actorId ?? null);
      setSelectedHex(null);
      setNotice('Бой начался.');
    } catch {
      if (!controller.signal.aborted && generation.current === expectedGeneration) {
        setStartUnresolved(true);
        setNotice('Ответ о создании потерян. Бой мог открыться; повторный запуск пока закрыт.');
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
      autoplayRef.current ||
      !canControl(current) ||
      pendingRef.current ||
      deletingRef.current ||
      sessionLostRef.current
    )
      return;
    if (selectedSkillRef.current || intent.type === 'use-skill') {
      const skillId = intent.type === 'use-skill' ? intent.skillId : selectedSkillRef.current;
      const targetId =
        intent.type === 'use-skill' || intent.type === 'attack' ? intent.targetId : undefined;
      const skill = current.skills?.find((candidate) => candidate.skillId === skillId);
      const resolvedTargetId = skill?.target === 'self' ? current.activation?.actorId : targetId;
      const preview = current.skillPreview?.find(
        (candidate) => candidate.skillId === skillId && candidate.targetId === resolvedTargetId,
      );
      if (!skill || !preview?.legal) {
        setNotice(combatSkillReasonText(preview?.reason));
        return;
      }
      act(
        {
          type: 'use-skill',
          skillId: skill.skillId,
          ...(skill.target === 'self' ? {} : { targetId: preview.targetId }),
        },
        skill.name,
      );
      return;
    }
    if (intent.type === 'move') {
      const preview = current.movementPreview?.find(
        ({ to }) => to.q === intent.to.q && to.r === intent.to.r,
      );
      if (!preview) return;
      const fireDamage = preview.fireDamage ?? 0;
      const actor = current.units.find(({ id }) => id === current.activation?.actorId);
      if (
        fireDamage > 0 &&
        !window.confirm(
          actor && fireDamage >= actor.pools.health.current
            ? 'Боец погибнет на пути и не достигнет клетки. Продолжить?'
            : `Огонь нанесёт ${fireDamage} урона здоровью. Продолжить?`,
        )
      )
        return;
      setSelectedHex(intent.to);
      setSelectedUnitId(null);
      act(intent, 'Перемещение');
    } else if (
      intent.type === 'attack' &&
      current.attackPreview?.some(({ targetId }) => targetId === intent.targetId)
    ) {
      setSelectedUnitId(intent.targetId);
      setSelectedHex(null);
      act(intent, 'Атака');
    }
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
  const selectedTarget = view?.units.find(
    (unit) =>
      unit.id === selectedUnitId &&
      unit.sideId !== view.controlledSideId &&
      unit.status === 'active',
  );
  const selectedMovement = view?.movementPreview?.find(
    ({ to }) => selectedHex !== null && to.q === selectedHex.q && to.r === selectedHex.r,
  );
  const selectedAttack = view?.attackPreview?.find(
    ({ targetId }) => targetId === selectedTarget?.id,
  );
  const activeActor = view?.units.find(({ id }) => id === view.activation?.actorId);
  const rules = view?.ruleHints;
  const attackCost = rules?.weapons.find(({ id }) => id === activeActor?.weaponId);
  const ap = view?.activation?.actionPoints.current ?? 0;
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
  const attackReason =
    commonReason ||
    (!selectedTarget
      ? 'Выберите противника'
      : !selectedAttack
        ? attackCost && ap < attackCost.actionPointCost
          ? 'Недостаточно ОД'
          : attackCost && (activeActor?.pools.stamina.current ?? 0) < attackCost.staminaCost
            ? 'Недостаточно сил'
            : 'Цель недоступна для атаки'
        : '');
  const moveReason =
    commonReason ||
    (!selectedHex
      ? 'Выберите клетку'
      : !selectedMovement
        ? ap === 0
          ? 'Недостаточно ОД'
          : 'Нет доступного пути'
        : '');
  const defendReason =
    commonReason ||
    (view?.availableActions?.includes('defend') === false
      ? rules && ap < rules.defend.actionPointCost
        ? 'Недостаточно ОД'
        : rules && (activeActor?.pools.stamina.current ?? 0) < rules.defend.staminaCost
          ? 'Недостаточно сил'
          : 'Защита недоступна'
      : '');
  const waitReason =
    commonReason || (view?.availableActions?.includes('wait') === false ? 'Ход недоступен' : '');
  const retreatReason =
    commonReason ||
    (view?.availableActions?.includes('retreat') === false ? 'Нужен край отхода' : '');
  const commandIcons: Record<string, CombatIconName> = {
    Атаковать: 'attack',
    Переместиться: 'move',
    Защищаться: 'defend',
    'Завершить ход': 'wait',
    Отступить: 'retreat',
  };
  const commandKeys: Record<string, string> = {
    Атаковать: '1',
    Переместиться: '2',
    Защищаться: '3',
    'Завершить ход': '4',
    Отступить: '5',
  };
  hotkeyActions.current = {};
  const actionButton = (
    label: string,
    cost: string,
    reason: string,
    onClick: () => unknown,
    detail: string,
  ) => {
    reason = selectedSkillId ? 'Выбран приём · Esc — отменить' : reason;
    const key = commandKeys[label]!;
    hotkeyActions.current[key] = { reason: menuOpen ? 'Меню открыто' : reason, run: onClick };
    return (
      <div className="battle-command battle-control-slot">
        <button
          className="battle-control battle-control--icon"
          type="button"
          aria-label={label}
          aria-disabled={reason.length > 0}
          onClick={() => {
            if (!reason) onClick();
          }}
          aria-describedby={`command-${label.replaceAll(' ', '-')}`}
        >
          <CombatIcon name={commandIcons[label]!} />
          <kbd aria-hidden="true">{key}</kbd>
        </button>
        <div
          role="tooltip"
          id={`command-${label.replaceAll(' ', '-')}`}
          className="battle-command-tooltip"
        >
          <strong>
            {label} <kbd>{key}</kbd>
          </strong>
          <span>{cost}</span>
          <small className={reason ? 'battle-command-reason' : ''}>{reason || detail}</small>
        </div>
      </div>
    );
  };
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
            <section className="combat-lab-controls" aria-label="Управление текущим ходом">
              <div className="battle-command-group">
                <small>ПРИКАЗЫ</small>
                <div className="combat-lab-actions">
                  {actionButton(
                    'Атаковать',
                    selectedAttack
                      ? `${selectedAttack.actionPointCost} ОД · силы ${selectedAttack.staminaCost}`
                      : attackCost
                        ? `${attackCost.actionPointCost} ОД · силы ${attackCost.staminaCost}`
                        : 'Выберите цель',
                    attackReason,
                    () =>
                      selectedTarget && actOnField({ type: 'attack', targetId: selectedTarget.id }),
                    selectedTarget?.name ?? selectedTarget?.id ?? 'Выберите противника',
                  )}
                  {actionButton(
                    'Переместиться',
                    selectedMovement
                      ? `${selectedMovement.actionPointCost} ОД · силы ${selectedMovement.staminaCost}`
                      : 'Цена по пути',
                    moveReason,
                    () => selectedHex && actOnField({ type: 'move', to: selectedHex }),
                    selectedHex ? `Клетка ${selectedHex.q}, ${selectedHex.r}` : 'Выберите клетку',
                  )}
                  {actionButton(
                    'Защищаться',
                    rules
                      ? `${rules.defend.actionPointCost} ОД · силы ${rules.defend.staminaCost}`
                      : 'Цена не опубликована',
                    defendReason,
                    () => act({ type: 'defend' }, 'Защита'),
                    rules?.defend.damageReductionPercent !== undefined
                      ? `Сила входящего удара −${rules.defend.damageReductionPercent}% · завершает ход`
                      : 'Защита · завершает ход',
                  )}
                  {actionButton(
                    'Завершить ход',
                    'Оставшиеся ОД',
                    waitReason,
                    () => act({ type: 'wait' }, 'Завершение хода'),
                    rules
                      ? `Передать инициативу · восстановление ${rules.recovery.staminaPerActivation} сил в начале следующего хода`
                      : 'Передать инициативу',
                  )}
                  {actionButton(
                    'Отступить',
                    'Завершает ход',
                    retreatReason,
                    () => act({ type: 'retreat' }, 'Отступление'),
                    'Уйти с поля',
                  )}
                </div>
              </div>
              <p className="battle-dock-help">
                ЛКМ — осмотр · ПКМ — идти / атаковать · колесо — масштаб · средняя кнопка — сдвиг
              </p>
              <div className="battle-feedback-row">
                <span className="battle-autoplay-status" role="status" data-active={autoplay}>
                  {autoplay ? 'Автобой включён' : 'Ручное управление'}
                </span>
                {selectedMovement?.fireDamage ? (
                  <p className="battle-danger-warning">
                    {selectedMovement.fireDamage >= (activeActor?.pools.health.current ?? Infinity)
                      ? 'Боец погибнет на пути и не достигнет клетки.'
                      : `Огонь: −${selectedMovement.fireDamage} здоровья.`}{' '}
                    Требуется подтверждение.
                  </p>
                ) : null}
                {pending && (
                  <p role="status" className="battle-pending-status">
                    {pending.uncertain
                      ? `Неизвестный ответ: ${pending.description}.`
                      : `Ожидается ответ: ${pending.description}.`}
                    {pending.uncertain && (
                      <button className="battle-control" type="button" onClick={retryAction}>
                        Повторить тот же запрос
                      </button>
                    )}
                  </p>
                )}
                {notice && (
                  <p className="battle-dock-notice" role="status">
                    {notice}
                  </p>
                )}
              </div>
            </section>
          </BattleView>
        </>
      )}
    </main>
  );
}
