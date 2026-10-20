import { useEffect, useRef, useState } from 'react';

import type {
  EncounterCommandDto,
  EncounterControlGrantDto,
  EncounterPublicProjectionDto,
} from '@warwrit/protocol';
import type { CombatLabAction, CombatLabHex } from '@warwrit/protocol';

import {
  startEncounterConnection,
  type EncounterCommandSender,
  type EncounterConnectionStatus,
  type EncounterScope,
} from './encounter/connection.js';
import { BattleView } from './combat-lab/BattleView.js';
import { toEncounterBattlePresentation } from './encounter/battle-presentation.js';
import { EncounterCommandDesk } from './encounter/EncounterCommandDesk.js';
import { EncounterLiveLane } from './encounter/EncounterLiveLane.js';
import { inspectEncounterUnit } from './encounter/selection.js';
import { encounterUnitLabel } from './encounter/unit-label.js';
import { LeadershipChoice } from './encounter/LeadershipChoice.js';
import {
  canIssueEncounterIntent,
  encounterConditionAllows,
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

/** Wall-clock milliseconds refreshed every `intervalMs`, or null when not ticking. */
function useWallClock(intervalMs: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (intervalMs === null) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return intervalMs === null ? null : now;
}

function healthLabel(unit: EncounterPublicProjectionDto['units'][number]): string {
  return unit.maximumHealth === undefined
    ? `Здоровье ${unit.health} · максимум неизвестен`
    : `Здоровье ${unit.health}/${unit.maximumHealth}`;
}

export function EncounterPanel(props: {
  readonly hideWhenIdle?: boolean;
  readonly unitNames?: Readonly<Record<string, string>>;
  readonly scope: EncounterScope;
  readonly onUnauthorized: () => void;
  readonly onTerminal?: () => void;
}) {
  const [state, setState] = useState<EncounterPanelState>(initialState);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [inspectedUnitId, setInspectedUnitId] = useState<string | null>(null);
  const [inspectedHex, setInspectedHex] = useState<CombatLabHex | null>(null);
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
  const currentGrant =
    projection !== undefined &&
    scopedState?.grant !== undefined &&
    scopedState.grant.encounterId === projection.encounterId &&
    scopedState.grant.revision === projection.revision
      ? scopedState.grant
      : undefined;
  const actorActions = currentGrant?.actorActions;
  const conditionAllows = (intent: EncounterCommandDto['intent']['type']) =>
    encounterConditionAllows(
      currentGrant,
      projection?.activationId,
      projection?.actorUnitId,
      intent,
    );
  const selectable = new Set(currentGrant?.controllableUnitIds ?? []);
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
    currentGrant?.controllableUnitIds.includes(actorUnitId) === true;
  // When the server hands our unit the turn, select it so its actions appear at once.
  useEffect(() => {
    if (actorIsOurs && actorUnitId !== null && selectedRef.current !== actorUnitId)
      updateUnitSelection(actorUnitId);
  }, [actorIsOurs, actorUnitId]);
  const actorUnit = projection?.units.find((unit) => unit.id === actorUnitId);
  const clock = useWallClock(projection?.status === 'active' ? 1000 : null);
  const secondsLeft =
    projection?.deadlineAt && clock !== null
      ? Math.max(0, Math.ceil((Date.parse(projection.deadlineAt) - clock) / 1000))
      : null;
  const ourNames = props.unitNames ?? {};
  const actorLabel = actorUnit
    ? encounterUnitLabel(actorUnit, ourNames)
    : 'участник вне открытой сводки';
  const presentation = projection
    ? toEncounterBattlePresentation(
        projection,
        currentGrant,
        (unit) => encounterUnitLabel(unit, ourNames),
        Object.keys(ourNames),
      )
    : undefined;
  const isFullscreen = presentation !== undefined;
  useEffect(() => {
    if (!isFullscreen) return;
    const root = document.documentElement;
    const body = document.body;
    const rootOverflow = root.style.overflow;
    const bodyOverflow = body.style.overflow;
    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      root.style.overflow = rootOverflow;
      body.style.overflow = bodyOverflow;
    };
  }, [isFullscreen]);
  const pendingCommand = scopedState?.pendingCommand;
  const tactical =
    projection !== undefined &&
    projection.actorUnitId !== null &&
    currentGrant?.tactical !== undefined &&
    currentGrant.tactical.activationId === projection.activationId &&
    currentGrant.tactical.actorId === actorUnitId
      ? currentGrant.tactical
      : undefined;
  const movePreview = tactical?.moves.find(
    (move) => `${move.to.q},${move.to.r}` === destinationKey,
  );
  const attackPreview = tactical?.attacks.find((attack) => attack.targetId === selectedTargetId);
  const attackTargets =
    actorUnit && projection
      ? projection.units.filter(
          (unit) =>
            unit.status === 'active' &&
            unit.sideId !== actorUnit.sideId &&
            (!tactical || tactical.attacks.some((attack) => attack.targetId === unit.id)),
        )
      : [];
  const blockedHexes = new Set((projection?.map?.blocked ?? []).map(({ q, r }) => `${q},${r}`));
  const occupiedHexes = new Set(
    projection?.units.filter((unit) => unit.status === 'active').map(({ q, r }) => `${q},${r}`) ??
      [],
  );
  const moveDestinations = tactical
    ? tactical.moves.map((move) => move.to)
    : (projection?.map?.hexes.filter(({ q, r }) => {
        const key = `${q},${r}`;
        return !blockedHexes.has(key) && !occupiedHexes.has(key);
      }) ?? []);
  const destination = moveDestinations.find(({ q, r }) => `${q},${r}` === destinationKey) ?? null;
  const selectedTarget = attackTargets.find((unit) => unit.id === selectedTargetId);
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

  if (props.hideWhenIdle && scopedState?.status === 'no-active') return null;

  return (
    <section
      className={`encounter-panel${presentation ? ' encounter-panel--fullscreen' : ''}`}
      aria-label="Активное сражение"
    >
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

      {!presentation && scopedState?.message && (
        <p className="encounter-message" role="status">
          {scopedState.message}
        </p>
      )}
      {isFullscreen && (
        <EncounterLiveLane
          status={scopedState?.status ?? 'discovering'}
          statusLabel={statusLabels[scopedState?.status ?? 'discovering']}
          battleActive={projection?.status === 'active'}
          {...(scopedState?.message !== undefined ? { message: scopedState.message } : {})}
          {...(scopedState?.grant !== undefined ? { grant: scopedState.grant } : {})}
          resumePending={scopedState?.resumePending === true}
          commandPending={scopedState?.commandPending === true}
          {...(pendingCommand !== undefined ? { pendingCommand } : {})}
          onResume={() => void requestResume()}
          onRetry={(command) => void submitIntent(command)}
        />
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
          {projection.status === 'resolved' && (
            <LeadershipChoice encounterId={projection.encounterId} />
          )}
          <p className="encounter-turn" role="status">
            {projection.status !== 'active'
              ? 'Бой завершён; команды недоступны.'
              : actorUnitId === null
                ? 'Сервер пока не назначил следующий ход.'
                : actorIsOurs
                  ? `Ваш ход · ${actorLabel}${secondsLeft === null ? '' : ` · осталось ${secondsLeft} с`}`
                  : `Ход другого участника · ${actorLabel}`}
          </p>
          {presentation && (
            <BattleView
              view={presentation}
              selectedUnitId={
                presentation.units.some((unit) => unit.id === inspectedUnitId)
                  ? inspectedUnitId
                  : selectedUnitId
              }
              selectedHex={
                presentation.units.some((unit) => unit.id === inspectedUnitId)
                  ? null
                  : (inspectedHex ?? movePreview?.to ?? null)
              }
              busy={scopedState?.commandPending === true}
              onSelectUnit={(unitId) => {
                const selection = inspectEncounterUnit(
                  unitId,
                  new Set(attackTargets.map((unit) => unit.id)),
                  actorIsOurs ? actorUnitId : null,
                );
                setInspectedUnitId(selection.inspectedUnitId);
                setInspectedHex(null);
                if (selection.targetUnitId) setSelectedTargetId(selection.targetUnitId);
                else if (
                  projection.units.some(
                    (unit) => unit.id === unitId && unit.sideId !== actorUnit?.sideId,
                  )
                )
                  setSelectedTargetId('');
                if (selection.commandUnitId) updateUnitSelection(selection.commandUnitId);
              }}
              onSelectHex={(hex: CombatLabHex) => {
                setInspectedUnitId(null);
                setInspectedHex(hex);
                if (moveDestinations.some((move) => move.q === hex.q && move.r === hex.r))
                  setDestinationKey(`${hex.q},${hex.r}`);
              }}
              onAct={(action: CombatLabAction['intent']) => {
                if (!canIssue) return;
                if (
                  action.type === 'move' &&
                  moveDestinations.some(
                    (move) => move.q === action.to.q && move.r === action.to.r,
                  ) &&
                  (!tactical ||
                    tactical.moves.some(
                      (move) => move.to.q === action.to.q && move.to.r === action.to.r,
                    )) &&
                  conditionAllows('move')
                )
                  void submitIntent({ type: 'move', to: action.to });
                if (
                  action.type === 'attack' &&
                  attackTargets.some((unit) => unit.id === action.targetId) &&
                  (!tactical ||
                    tactical.attacks.some((attack) => attack.targetId === action.targetId)) &&
                  conditionAllows('attack')
                )
                  void submitIntent({ type: 'attack', targetId: action.targetId });
              }}
              selectedSkillId={null}
            >
              {canIssue && (
                <EncounterCommandDesk
                  targetId={selectedTarget?.id ?? ''}
                  targetLabel={
                    selectedTarget ? encounterUnitLabel(selectedTarget, ourNames) : 'Выберите цель'
                  }
                  destination={destination}
                  destinationLabel={
                    destination ? `клетка ${destination.q}, ${destination.r}` : 'Выберите клетку'
                  }
                  {...(attackPreview ? { attackCost: attackPreview } : {})}
                  {...(movePreview ? { moveCost: movePreview } : {})}
                  attackAllowed={
                    Boolean(selectedTarget) &&
                    (!tactical || Boolean(attackPreview)) &&
                    conditionAllows('attack')
                  }
                  moveAllowed={
                    destination !== null &&
                    (!tactical || Boolean(movePreview)) &&
                    conditionAllows('move')
                  }
                  defendAllowed={conditionAllows('defend')}
                  waitAllowed={conditionAllows('wait')}
                  retreatAllowed={conditionAllows('retreat')}
                  autoplayAllowed={Boolean(tactical) && conditionAllows('autoplay')}
                  fleeAllowed={Boolean(tactical) && conditionAllows('flee')}
                  surrenderAllowed={Boolean(tactical) && conditionAllows('surrender')}
                  {...(actorActions && actorActions.permittedIntents.length < 5
                    ? {
                        feedback:
                          'Состояние бойца ограничивает доступные действия. Переноска и спасение пока недоступны.',
                      }
                    : {})}
                  busy={Boolean(scopedState?.commandPending)}
                  onAct={(intent) => void submitIntent(intent)}
                />
              )}
            </BattleView>
          )}
          <ul className="encounter-roster" aria-label="Открытая сводка участников">
            {projection.units.map((unit) => {
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
                      {encounterUnitLabel(unit, ourNames)}
                      {unit.id in ourNames ? ' · ваш' : ''}
                    </span>
                    <span>
                      {unit.status === 'active'
                        ? healthLabel(unit)
                        : unit.status === 'dead'
                          ? 'Погиб'
                          : unit.status === 'surrendered'
                            ? 'Сдался'
                            : 'Отступил'}
                      {canSelect ? ' · можно выбрать' : ' · выбор недоступен'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {actorIsOurs &&
            !canIssue &&
            projection.status === 'active' &&
            scopedState?.grant?.selfAfk !== true && (
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
          {!presentation && pendingCommand && (
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
          {!presentation && scopedState?.message && (
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
    const command: EncounterCommandDto | undefined = retry
      ? intentOrCommand
      : projection && grant && projection.actorUnitId
        ? ({
            ...encounterIntentVersion(grant),
            encounterId: projection.encounterId,
            commandId: crypto.randomUUID(),
            expectedRevision: projection.revision,
            activationId: projection.activationId!,
            actorId: projection.actorUnitId,
            intent: intentOrCommand,
          } as EncounterCommandDto)
        : undefined;
    if (
      !command ||
      !sender ||
      pendingCommandRef.current !== undefined ||
      (!retry &&
        (!projection ||
          !canIssueEncounterIntent(projection, grant, selectedRef.current) ||
          command.actorId !== selectedRef.current ||
          projection.activationId === null ||
          !encounterConditionAllows(
            grant,
            command.activationId,
            command.actorId,
            command.intent.type,
          )))
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

function encounterIntentVersion(grant: EncounterControlGrantDto): { version: 1 | 2 } {
  return { version: grant.tactical ? 2 : 1 };
}
