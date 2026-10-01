import { useEffect, useRef, useState } from 'react';

import type {
  EncounterCommandDto,
  EncounterControlGrantDto,
  EncounterPublicProjectionDto,
} from '@warwrit/protocol';

import {
  startEncounterConnection,
  type EncounterCommandSender,
  type EncounterConnectionStatus,
  type EncounterScope,
} from './encounter/connection.js';
import { PlayCanvasView } from './renderer/PlayCanvasView.js';
import {
  canIssueEncounterIntent,
  neutralUnitLabel,
  readEncounterCommandResponse,
  retainedSelection,
} from './renderer/projection.js';

interface EncounterPanelState {
  readonly scopeKey?: string;
  readonly status: EncounterConnectionStatus;
  readonly projection?: EncounterPublicProjectionDto;
  readonly grant?: EncounterControlGrantDto;
  readonly commandSender?: EncounterCommandSender;
  readonly pendingCommand?: EncounterCommandDto;
  readonly commandPending?: boolean;
  readonly resumePending?: boolean;
  readonly message?: string;
}

const initialState: EncounterPanelState = { status: 'discovering' };

const statusLabels: Record<EncounterConnectionStatus, string> = {
  discovering: 'Проверяем активный бой',
  'no-active': 'Активного боя нет',
  connecting: 'Подключаем общую сводку боя',
  connected: 'Сводка боя синхронизирована',
  reconnecting: 'Связь прервана · восстанавливаем подключение',
  'lost-access': 'Доступ к бою не подтверждён',
  failed: 'Не удалось восстановить бой',
};

export function EncounterPanel(props: {
  readonly scope: EncounterScope;
  readonly onUnauthorized: () => void;
  readonly onTerminal?: () => void;
}) {
  const [state, setState] = useState<EncounterPanelState>(initialState);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [destinationKey, setDestinationKey] = useState('');
  const [connectionGeneration, setConnectionGeneration] = useState(0);
  const projectionRef = useRef<EncounterPublicProjectionDto | undefined>(undefined);
  const grantRef = useRef<EncounterControlGrantDto | undefined>(undefined);
  const commandSenderRef = useRef<EncounterCommandSender | undefined>(undefined);
  const pendingCommandRef = useRef<EncounterCommandDto | undefined>(undefined);
  const selectedRef = useRef<string | null>(null);
  const unauthorizedRef = useRef(props.onUnauthorized);
  const notifiedTerminalEncounter = useRef<string | undefined>(undefined);
  unauthorizedRef.current = props.onUnauthorized;

  useEffect(() => {
    const scopeKey = `${props.scope.accountId}:${props.scope.companyId}`;
    const updateSelection = (next: string | null) => {
      selectedRef.current = next;
      setSelectedUnitId(next);
    };
    setState({ ...initialState, scopeKey });
    projectionRef.current = undefined;
    grantRef.current = undefined;
    updateSelection(null);

    return startEncounterConnection({
      scope: props.scope,
      observer: {
        onStatus(status) {
          if (status !== 'connected') {
            grantRef.current = undefined;
            commandSenderRef.current = undefined;
            updateSelection(null);
          }
          setState((current) => ({ ...current, scopeKey, status }));
        },
        onProjection(projection) {
          projectionRef.current = projection;
          if (!projection) {
            grantRef.current = undefined;
            updateSelection(null);
            setState({ scopeKey, status: 'failed' });
            return;
          }
          const nextSelection = retainedSelection(
            selectedRef.current,
            projection,
            grantRef.current,
          );
          updateSelection(nextSelection);
          setState((current) => {
            const { message: _message, ...rest } = current;
            return { ...rest, scopeKey, projection };
          });
        },
        onControlGrant(grant) {
          grantRef.current = grant;
          const projection = projectionRef.current;
          updateSelection(
            projection ? retainedSelection(selectedRef.current, projection, grant) : null,
          );
          setState((current) => {
            const { grant: _previousGrant, ...rest } = current;
            return grant === undefined ? { ...rest, scopeKey } : { ...rest, scopeKey, grant };
          });
        },
        onCommandSender(sender) {
          commandSenderRef.current = sender;
          setState((current) => {
            const { commandSender: _previousSender, ...rest } = current;
            return sender ? { ...rest, scopeKey, commandSender: sender } : { ...rest, scopeKey };
          });
        },
        onUnauthorized() {
          unauthorizedRef.current();
        },
        onError(message) {
          setState((current) => ({ ...current, scopeKey, message }));
        },
      },
    });
  }, [props.scope.accountId, props.scope.companyId, connectionGeneration]);

  useEffect(() => {
    const projection =
      state.scopeKey === `${props.scope.accountId}:${props.scope.companyId}`
        ? state.projection
        : undefined;
    if (
      projection?.status === 'resolved' &&
      notifiedTerminalEncounter.current !== projection.encounterId
    ) {
      notifiedTerminalEncounter.current = projection.encounterId;
      props.onTerminal?.();
    }
  }, [props.onTerminal, props.scope.accountId, props.scope.companyId, state]);

  const currentScopeKey = `${props.scope.accountId}:${props.scope.companyId}`;
  const scopedState = state.scopeKey === currentScopeKey ? state : undefined;
  const projection = scopedState?.projection;
  const selectable = new Set(scopedState?.grant?.controllableUnitIds ?? []);
  const actorUnitId = projection?.actorUnitId ?? null;
  const canIssue =
    projection !== undefined &&
    canIssueEncounterIntent(projection, scopedState?.grant, selectedUnitId) &&
    scopedState?.status === 'connected' &&
    scopedState.commandSender !== undefined &&
    scopedState.commandPending !== true &&
    scopedState.pendingCommand === undefined;
  const actorIsOurs =
    projection !== undefined &&
    actorUnitId !== null &&
    scopedState?.grant?.revision === projection.revision &&
    scopedState.grant.controllableUnitIds.includes(actorUnitId);
  // When the server hands our unit the turn, select it so its actions appear at once.
  useEffect(() => {
    if (actorIsOurs && actorUnitId !== null && selectedRef.current !== actorUnitId)
      updateUnitSelection(actorUnitId);
  }, [actorIsOurs, actorUnitId]);
  const actorUnit = projection?.units.find((unit) => unit.id === actorUnitId);
  const actorLabel = actorUnit ? neutralUnitLabel(actorUnit) : 'участник вне открытой сводки';
  const pendingCommand = scopedState?.pendingCommand;
  const attackTargets =
    actorUnit && projection
      ? projection.units.filter(
          (unit) => unit.status === 'active' && unit.sideId !== actorUnit.sideId,
        )
      : [];
  const blockedHexes = new Set((projection?.map?.blocked ?? []).map(({ q, r }) => `${q},${r}`));
  const occupiedHexes = new Set(
    projection?.units.filter((unit) => unit.status === 'active').map(({ q, r }) => `${q},${r}`) ??
      [],
  );
  const moveDestinations =
    projection?.map?.hexes.filter(({ q, r }) => {
      const key = `${q},${r}`;
      return !blockedHexes.has(key) && !occupiedHexes.has(key);
    }) ?? [];
  useEffect(() => {
    if (!attackTargets.some((unit) => unit.id === selectedTargetId))
      setSelectedTargetId(attackTargets[0]?.id ?? '');
  }, [attackTargets, selectedTargetId]);
  useEffect(() => {
    if (!moveDestinations.some(({ q, r }) => `${q},${r}` === destinationKey))
      setDestinationKey(
        moveDestinations[0] ? `${moveDestinations[0].q},${moveDestinations[0].r}` : '',
      );
  }, [destinationKey, moveDestinations]);

  return (
    <section className="encounter-panel" aria-label="Активное сражение">
      <div className="encounter-panel-heading">
        <div>
          <p className="eyebrow">Состояние компании</p>
          <h2>Сражение</h2>
        </div>
        <span
          className={`encounter-status encounter-status-${scopedState?.status ?? 'discovering'}`}
          role="status"
        >
          {statusLabels[scopedState?.status ?? 'discovering']}
        </span>
      </div>

      {scopedState?.message && (
        <p className="encounter-message" role="status">
          {scopedState.message}
        </p>
      )}
      {scopedState?.status === 'no-active' && (
        <p className="encounter-empty">Сохранённая компания сейчас не участвует в бою.</p>
      )}
      {projection && (
        <>
          <p className="encounter-summary">
            {projection.status === 'active' ? 'Бой продолжается' : 'Бой завершён'} · раунд{' '}
            {projection.round} · обновление {projection.revision}
          </p>
          <p className="encounter-turn" role="status">
            {projection.status !== 'active'
              ? 'Бой завершён; команды недоступны.'
              : actorUnitId === null
                ? 'Сервер пока не назначил следующий ход.'
                : actorIsOurs
                  ? `Ваш ход · ${actorLabel}`
                  : `Ход другой стороны · ${actorLabel}`}
          </p>
          {scopedState?.grant?.selfAfk === true && (
            <div className="encounter-afk" role="status">
              <p>Вы отмечены сервером как бездействующий участник.</p>
              {scopedState.grant.resumeRequestedAfterEpoch !== null &&
              scopedState.grant.resumeRequestedAfterEpoch !== undefined ? (
                <p>Запрос на возвращение принят; он подействует после следующего хода.</p>
              ) : (
                <button
                  className="quiet-action"
                  type="button"
                  disabled={scopedState.resumePending || scopedState.status !== 'connected'}
                  onClick={() => void requestResume()}
                >
                  {scopedState.resumePending ? 'Отправляем запрос…' : 'Вернуться к управлению'}
                </button>
              )}
            </div>
          )}
          {scopedState?.grant?.selfAfk === false && (
            <p className="state-note">Сервер не считает вас бездействующим участником.</p>
          )}
          {scopedState?.grant?.selfAfk === undefined && scopedState?.status === 'connected' && (
            <p className="state-note">Состояние бездействия недоступно в этой версии службы.</p>
          )}
          <PlayCanvasView
            projection={projection}
            controllableUnitIds={scopedState?.grant?.controllableUnitIds ?? []}
            selectedUnitId={selectedUnitId}
            onSelectUnit={updateUnitSelection}
          />
          <ul className="encounter-roster" aria-label="Открытая сводка участников">
            {projection.units.map((unit, index) => {
              const canSelect = selectable.has(unit.id);
              return (
                <li key={unit.id}>
                  <button
                    className="encounter-unit"
                    type="button"
                    disabled={!canSelect}
                    aria-pressed={selectedUnitId === unit.id}
                    onClick={() => updateUnitSelection(unit.id)}
                  >
                    <span>
                      {neutralUnitLabel(unit)} · №{index + 1}
                    </span>
                    <span>
                      {unit.status === 'active'
                        ? `Здоровье ${unit.health}`
                        : unit.status === 'dead'
                          ? 'Погиб'
                          : 'Отступил'}
                      {canSelect ? ' · можно выбрать' : ' · выбор недоступен'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {canIssue && (
            <div className="encounter-actions" aria-label="Команды текущего участника">
              <p>Текущий ход: выберите одно действие для указанного участника.</p>
              {attackTargets.length > 0 && (
                <>
                  <label>
                    Цель другой стороны
                    <select
                      value={selectedTargetId}
                      onChange={(event) => setSelectedTargetId(event.currentTarget.value)}
                    >
                      {attackTargets.map((unit, index) => (
                        <option key={unit.id} value={unit.id}>
                          Участник №{index + 1} · {unit.health} здоровья
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="primary-action button-action"
                    type="button"
                    disabled={!selectedTargetId}
                    onClick={() =>
                      void submitIntent({ type: 'attack', targetId: selectedTargetId })
                    }
                  >
                    Атаковать выбранную цель
                  </button>
                </>
              )}
              {moveDestinations.length > 0 && (
                <>
                  <label>
                    Открытая клетка карты
                    <select
                      value={destinationKey}
                      onChange={(event) => setDestinationKey(event.currentTarget.value)}
                    >
                      {moveDestinations.map(({ q, r }) => (
                        <option key={`${q},${r}`} value={`${q},${r}`}>
                          q {q}, r {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="quiet-action"
                    type="button"
                    disabled={!destinationKey}
                    onClick={() => {
                      const [q, r] = destinationKey.split(',').map(Number);
                      void submitIntent({ type: 'move', to: { q: q!, r: r! } });
                    }}
                  >
                    Переместиться
                  </button>
                </>
              )}
              <p className="state-note">
                Дальность, путь и затраты проверяет сервер; эта схема показывает только открытые
                клетки и не предсказывает результат.
              </p>
              <button
                className="primary-action button-action"
                type="button"
                onClick={() => void submitIntent({ type: 'defend' })}
              >
                Защищаться
              </button>
              <button
                className="quiet-action"
                type="button"
                onClick={() => void submitIntent({ type: 'wait' })}
              >
                Ждать
              </button>
              <button
                className="quiet-action"
                type="button"
                onClick={() => void submitIntent({ type: 'retreat' })}
              >
                Отступить
              </button>
            </div>
          )}
          {actorIsOurs && !canIssue && projection.status === 'active' && (
            <p className="state-note">
              Ваш ход известен, но текущая сводка или полномочие управления устарели. Дождитесь
              синхронизации связи.
            </p>
          )}
          {!actorIsOurs && projection.status === 'active' && (
            <p className="state-note">
              Команды появятся, когда сервер подтвердит ваш ход и право управления.
            </p>
          )}
          {pendingCommand && (
            <div className="encounter-command-pending" role="status">
              <p>
                {scopedState.commandPending
                  ? 'Ждём подтверждение команды.'
                  : 'Ответ не подтверждён. Повтор отправит тот же запрос с тем же ID.'}
              </p>
              {!scopedState.commandPending && (
                <button
                  className="quiet-action"
                  type="button"
                  onClick={() => void submitIntent(pendingCommand)}
                >
                  Повторить команду
                </button>
              )}
            </div>
          )}
          {scopedState?.message && (
            <p className="encounter-message" role="status">
              {scopedState.message}
            </p>
          )}
        </>
      )}
    </section>
  );

  function updateUnitSelection(unitId: string | null) {
    const current = projectionRef.current;
    updateSelected(
      current && retainedSelection(unitId, current, grantRef.current) === unitId ? unitId : null,
    );
  }

  function updateSelected(unitId: string | null) {
    selectedRef.current = unitId;
    setSelectedUnitId(unitId);
  }

  async function submitIntent(
    intentOrCommand: EncounterCommandDto['intent'] | EncounterCommandDto,
  ): Promise<void> {
    const projection = projectionRef.current;
    const grant = grantRef.current;
    const sender = commandSenderRef.current;
    const retry = 'commandId' in intentOrCommand;
    const command = retry
      ? intentOrCommand
      : projection && grant && projection.actorUnitId
        ? {
            version: 1 as const,
            encounterId: projection.encounterId,
            commandId: crypto.randomUUID(),
            expectedRevision: projection.revision,
            activationId: projection.activationId!,
            actorId: projection.actorUnitId,
            intent: intentOrCommand,
          }
        : undefined;
    if (
      !command ||
      !sender ||
      pendingCommandRef.current !== undefined ||
      (!retry &&
        (!projection ||
          !canIssueEncounterIntent(projection, grant, selectedRef.current) ||
          command.actorId !== selectedRef.current ||
          projection.activationId === null))
    )
      return;
    pendingCommandRef.current = command;
    setState((current) => {
      const { message: _message, ...rest } = current;
      return { ...rest, pendingCommand: command, commandPending: true };
    });
    try {
      const raw = await sender(command);
      const response = readEncounterCommandResponse(raw, command);
      if (!response) throw new Error('Ответ боя не подтверждает отправленную команду.');
      pendingCommandRef.current = undefined;
      if (response.status === 'rejected') {
        if (response.code === 'UNAUTHORIZED') unauthorizedRef.current();
        setState((current) => {
          const { pendingCommand: _pending, ...rest } = current;
          return {
            ...rest,
            commandPending: false,
            message:
              response.code === 'CONFLICT'
                ? 'Состояние хода изменилось. Сверяем бой перед новой командой.'
                : 'Сервер не принял команду; состояние боя не изменено.',
          };
        });
        setConnectionGeneration((generation) => generation + 1);
        return;
      }
      setState((current) => {
        const { pendingCommand: _pending, ...rest } = current;
        return {
          ...rest,
          commandPending: false,
          message: 'Команда принята сервером. Обновляем состояние боя.',
        };
      });
    } catch (error) {
      pendingCommandRef.current = undefined;
      setState((current) => ({
        ...current,
        pendingCommand: command,
        commandPending: false,
        message: error instanceof Error ? error.message : 'Не удалось подтвердить команду.',
      }));
    }
  }

  async function requestResume(): Promise<void> {
    const projection = projectionRef.current;
    const grant = grantRef.current;
    if (!projection || !grant || grant.selfAfk !== true || grant.revision !== projection.revision)
      return;
    setState((current) => {
      const { message: _message, ...rest } = current;
      return { ...rest, resumePending: true };
    });
    try {
      const response = await fetch(
        `${import.meta.env['VITE_API_BASE_URL'] ?? '/api'}/encounters/${encodeURIComponent(projection.encounterId)}/resume`,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: 1, encounterId: projection.encounterId }),
        },
      );
      if (response.status === 401) {
        unauthorizedRef.current();
        return;
      }
      const value: unknown = await response.json();
      if (
        !response.ok ||
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value) ||
        Object.keys(value).length !== 3 ||
        !('version' in value) ||
        value.version !== 1 ||
        !('encounterId' in value) ||
        value.encounterId !== projection.encounterId ||
        !('afterEpoch' in value) ||
        typeof value.afterEpoch !== 'number' ||
        !Number.isSafeInteger(value.afterEpoch) ||
        value.afterEpoch < 0
      )
        throw new Error('Сервер не подтвердил запрос на возвращение в бой.');
      setState((current) => ({
        ...current,
        resumePending: false,
        message: 'Запрос на возвращение сохранён сервером; он подействует после следующего хода.',
      }));
      setConnectionGeneration((generation) => generation + 1);
    } catch (error) {
      setState((current) => ({
        ...current,
        resumePending: false,
        message: error instanceof Error ? error.message : 'Не удалось запросить возвращение.',
      }));
    }
  }
}
