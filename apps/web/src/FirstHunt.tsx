import { useCallback, useEffect, useRef, useState } from 'react';
import {
  issuerBuilding,
  issuerVenue,
  oldMillVisit,
  visitingIssuer,
  type ContractVisitProps,
} from './game/contract-visits.js';
import { lookup } from './i18n/index.js';

import {
  isFirstHuntReadResponse,
  type FirstHuntCommandDto,
  type FirstHuntReadResponseDto,
} from '@warwrit/protocol';
import {
  availableFirstHuntActions,
  clearFirstHuntAttempt,
  createFirstHuntAttempt,
  firstHuntEncounterDiscoveryId,
  readFirstHuntCommandResponse,
  readFirstHuntAttempt,
  saveFirstHuntAttempt,
  startFirstHuntActivationPolling,
  shouldPollForFirstHuntActivation,
  type FirstHuntAttempt,
  type FirstHuntScope,
  type FirstHuntStorage,
} from './first-hunt-attempt.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const CONTRACT_POLL_MS = 10_000;

interface ViewState {
  readonly status: 'loading' | 'ready' | 'failed';
  readonly response?: FirstHuntReadResponseDto;
  readonly error?: string;
  readonly attempt?: FirstHuntAttempt;
  readonly pending?: boolean;
}

function storage(): FirstHuntStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function firstHuntCommandError(code: unknown): string {
  switch (code) {
    case 'STALE_REVISION':
      return 'Состояние контракта изменилось. Данные обновлены; проверьте условия перед новым действием.';
    case 'TERMS_CHANGED':
      return 'Условия изменились; контракт не принят.';
    case 'INCOMPATIBLE_ACTIVITY':
      return 'Состав компании не может сейчас участвовать в этом действии.';
    case 'CAPACITY':
      return 'Для всех участников не хватает места в бою.';
    case 'INSUFFICIENT_FUNDS':
      return 'Кошелёк заказчика не покрывает выплату.';
    case 'NOT_AUTHORIZED':
      return 'Сеанс или право компании изменились.';
    default:
      return 'Действие пока недоступно для этого состояния контракта.';
  }
}

/** Container ids are opaque; the player sees where the item is carried. */
function containerLabel(containerId: string): string {
  return containerId.endsWith('"party-supply"]') ? 'в обозе отряда' : 'у бойца отряда';
}

const HUNT_CODES: Readonly<Record<string, string>> = {
  'ci.m1.raider-standard.01': 'HUNT-03',
  'ci.m1.wolf-trail.01': 'HUNT-02',
  'ci.m1.mill-beast.01': 'HUNT-01',
};

export function FirstHunt(
  props: ContractVisitProps & {
    readonly scope: FirstHuntScope;
    readonly location: string | null;
    readonly onUnauthorized: () => void;
    readonly refreshKey?: number;
    readonly onEncounterDiscovered?: () => void;
  },
) {
  const [view, setView] = useState<ViewState>({ status: 'loading' });
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const generation = useRef(0);
  const unauthorizedRef = useRef(props.onUnauthorized);
  const encounterDiscoveredRef = useRef(props.onEncounterDiscovered);
  const notifiedEncounterRef = useRef<string | undefined>(undefined);
  unauthorizedRef.current = props.onUnauthorized;
  encounterDiscoveredRef.current = props.onEncounterDiscovered;

  const refresh = useCallback(
    async (preservedCommandError?: string) => {
      const currentGeneration = ++generation.current;
      setView((current) => ({ ...current, status: 'loading' }));
      try {
        const value = await readHunt(props.scope.instanceId);
        if (currentGeneration !== generation.current) return undefined;
        if (value === 'unauthorized') {
          unauthorizedRef.current();
          return undefined;
        }
        setView(firstHuntReadyView(value, restoredAttempt(props.scope), preservedCommandError));
        return value;
      } catch (error) {
        setView((current) => {
          if (currentGeneration !== generation.current) return current;
          return {
            ...current,
            status: 'failed',
            error: attemptError(error, 'Нет связи с контрактом.'),
          };
        });
        return undefined;
      }
    },
    [props.scope.accountId, props.scope.companyId, props.scope.instanceId, props.refreshKey],
  );

  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh]);

  // The other company's HELP/JOIN/PICKUP changes the contract without touching our
  // world revision; re-read it periodically unless one of our commands is in flight.
  const pendingRef = useRef(false);
  pendingRef.current = view.pending === true || view.attempt !== undefined;
  useEffect(() => {
    const id = setInterval(() => {
      if (!pendingRef.current) void refresh();
    }, CONTRACT_POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const submit = useCallback(
    async (type: FirstHuntCommandDto['type']) => {
      const current = view.response;
      if (!current || view.status !== 'ready' || view.pending) return;
      let attempt = view.attempt;
      if (attempt && attempt.request.type !== type) return;
      if (!attempt) {
        attempt = createFirstHuntAttempt({
          scope: props.scope,
          current,
          commandId: crypto.randomUUID(),
          type,
          ...(type === 'PICKUP' ? { containerId: selectedContainerId } : {}),
        });
        try {
          const store = storage();
          if (!store) throw new Error('Хранилище повторов недоступно; действие не отправлено.');
          saveFirstHuntAttempt(store, attempt);
        } catch (error) {
          setView((state) => ({
            ...state,
            error: attemptError(error, 'Не удалось сохранить запрос.'),
          }));
          return;
        }
      }
      setView((state) => {
        const { error: _error, ...withoutError } = state;
        return { ...withoutError, attempt, pending: true };
      });
      try {
        const response = await fetch(`${apiBaseUrl}/contracts/commands`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: attempt.body,
        });
        if (response.status === 401) {
          unauthorizedRef.current();
          return;
        }
        const value: unknown = await response.json();
        const result = readFirstHuntCommandResponse(value, attempt.request.commandId);
        if (!result) throw new Error('Ответ команды не подтверждает сохранённый запрос.');
        if (!result.ok) {
          const store = storage();
          if (store) clearFirstHuntAttempt(store, props.scope);
          setView((state) => {
            const { attempt: _attempt, ...withoutAttempt } = state;
            return { ...withoutAttempt, pending: false, error: firstHuntCommandError(result.code) };
          });
          await refresh(firstHuntCommandError(result.code));
          return;
        }
        const store = storage();
        if (store) clearFirstHuntAttempt(store, props.scope);
        setView((state) => {
          const { attempt: _attempt, ...withoutAttempt } = state;
          return { ...withoutAttempt, pending: false };
        });
        await refresh();
      } catch (error) {
        setView((state) => ({
          ...state,
          attempt,
          pending: false,
          error: attemptError(error, 'Неизвестный результат запроса.'),
        }));
      }
    },
    [props.scope.accountId, props.scope.companyId, refresh, selectedContainerId, view],
  );

  const contract = view.response?.contract;
  const encounterId = contract ? firstHuntEncounterDiscoveryId(contract) : undefined;
  const pendingJoinPollKey =
    contract && shouldPollForFirstHuntActivation(contract)
      ? `${props.scope.accountId}:${props.scope.companyId}:${contract.instanceId}`
      : undefined;
  const availableActions = contract
    ? availableFirstHuntActions(contract, props.location, contract.pickupTargets.length > 0)
    : [];
  const hasUnresolvedAttempt = view.attempt !== undefined;
  const actionsDisabled = view.status !== 'ready' || view.pending || hasUnresolvedAttempt;
  const pickupTargets = contract?.pickupTargets ?? [];
  useEffect(() => {
    if (!pickupTargets.some((target) => target.containerId === selectedContainerId))
      setSelectedContainerId(pickupTargets[0]?.containerId ?? '');
  }, [pickupTargets, selectedContainerId]);
  const notifyEncounterDiscovered = useCallback(
    (discoveredEncounterId: string) => {
      const key = `${props.scope.accountId}:${props.scope.companyId}:${discoveredEncounterId}`;
      if (notifiedEncounterRef.current === key) return;
      notifiedEncounterRef.current = key;
      encounterDiscoveredRef.current?.();
    },
    [props.scope.accountId, props.scope.companyId],
  );
  useEffect(() => {
    if (encounterId) notifyEncounterDiscovered(encounterId);
  }, [encounterId, notifyEncounterDiscovered]);
  useEffect(() => {
    if (view.status !== 'ready' || contract?.knownState !== 'ENCOUNTER_ACTIVE') return;
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [contract?.knownState, refresh, view.status]);
  useEffect(() => {
    if (!pendingJoinPollKey || !contract) return;
    return startFirstHuntActivationPolling({
      initialContract: contract,
      refresh,
      onEncounterDiscovered: notifyEncounterDiscovered,
    });
  }, [pendingJoinPollKey, refresh, notifyEncounterDiscovered]);

  const huntId = props.scope.instanceId ?? 'ci.m1.raider-standard.01';
  const huntText = {
    code: HUNT_CODES[huntId] ?? 'HUNT',
    title: lookup(`contract.${huntId}.title`) ?? 'Охота',
    brief: lookup(`contract.${huntId}.brief`),
  };
  const atIssuer = contract
    ? visitingIssuer(props.visit, contract.instanceId, contract.terms.issuerLocation.siteId)
    : false;
  const atField =
    props.visit === null ||
    oldMillVisit(props.visit, contract?.terms.objectiveLocation.siteId ?? '');
  if (contract && !view.attempt) {
    if (
      contract.yourRole === 'NONE' &&
      (contract.knownState === 'SETTLED' || contract.terms.issuerLocation.siteId !== props.location)
    )
      return null;
    if (
      props.visit &&
      !atIssuer &&
      !(
        contract.yourRole !== 'NONE' &&
        oldMillVisit(props.visit, contract.terms.objectiveLocation.siteId)
      )
    )
      return null;
    if (contract.yourRole === 'NONE' && !atIssuer) {
      const building = issuerBuilding(contract.instanceId);
      return (
        <article className="contract-card contract-lead">
          <h4>{huntText.title}</h4>
          <p>
            {issuerLabel(contract.terms.issuerId)} · {issuerVenue(contract.instanceId)}
          </p>
          <p className="state-note">Узнайте условия у заказчика.</p>
          {building && (
            <button
              type="button"
              className="quiet-action"
              disabled={!props.canVisit}
              onClick={() => props.onVisitIssuer(contract.terms.issuerLocation.siteId, building)}
            >
              Поговорить →
            </button>
          )}
        </article>
      );
    }
  }
  return (
    <section className="first-hunt" aria-label={`Контракт: ${huntText.title}`}>
      <p className="eyebrow">Контракт · {huntText.code}</p>
      <h2>{huntText.title}</h2>
      {view.status === 'loading' && view.response === undefined && (
        <p className="state-note">Загружаем условия и состояние.</p>
      )}
      {view.status === 'failed' && (
        <p className="opening-error" role="alert">
          {view.error}
        </p>
      )}
      {view.status === 'ready' && !contract && (
        <p className="state-note">Сервер пока не сообщил доступный контракт этого цикла.</p>
      )}
      {contract && (
        <>
          <p>
            Заказчик: {issuerLabel(contract.terms.issuerId)} ·{' '}
            {locationLabel(contract.terms.issuerLocation.siteId)},{' '}
            {areaLabel(contract.terms.issuerLocation.areaId)}.
          </p>
          {huntText.brief && <p className="contract-brief">{huntText.brief}</p>}
          <p>Награда: {rewardLabel(contract.terms.rewardQ)}. Принятые условия фиксированы.</p>
          <details className="contract-conversation" open={contract.yourRole !== 'NONE'}>
            <summary>Куда идти и что потребуется?</summary>
            <p>
              Цель: добраться до {locationLabel(contract.terms.objectiveLocation.siteId)}, район{' '}
              {areaLabel(contract.terms.objectiveLocation.areaId)}. Перед опасным переходом
              убедитесь, что у отряда есть провизия.
            </p>
          </details>
          <details className="contract-conversation">
            <summary>Как получить награду?</summary>
            <p>После боя нужно забрать подлинный трофей и лично предъявить его заказчику.</p>
            <p>
              Награда: {rewardLabel(contract.terms.rewardQ)} единственному носителю трофея. Помощь
              второй компании добровольна; выплата не делится. Принятые условия фиксированы.
            </p>
          </details>
          <dl>
            <dt>Ваша роль</dt>
            <dd>{firstHuntRoleLabel(contract.yourRole)}</dd>
            <dt>Состояние</dt>
            <dd>{firstHuntStateLabel(contract)}</dd>
            <dt>Слот помощника</dt>
            <dd>{contract.helperSlot === 'AVAILABLE' ? 'свободен' : 'занят'}</dd>
            <dt>Готовность к бою</dt>
            <dd>{contract.yourJoinIntent ? 'отряд готов' : 'не заявлена'}</dd>
          </dl>
          <p className="state-note">{firstHuntGuidance(contract, props.location)}</p>
          {contract.yourProof && (
            <p className="state-note">
              Трофей находится {containerLabel(contract.yourProof.containerId)} ·{' '}
              {contract.yourProof.redemption === 'REDEEMED'
                ? 'выплата получена, отметка REDEEMED'
                : 'ещё не предъявлен'}
              .
            </p>
          )}
          <div className="first-hunt-actions">
            {atIssuer && availableActions.includes('ACCEPT') && (
              <button
                className="primary-action button-action"
                type="button"
                disabled={actionsDisabled}
                onClick={() => void submit('ACCEPT')}
              >
                Договориться и взять поручение
              </button>
            )}
            {atIssuer && availableActions.includes('HELP') && (
              <button
                className="primary-action button-action"
                type="button"
                disabled={actionsDisabled}
                onClick={() => void submit('HELP')}
              >
                Вступить добровольным помощником
              </button>
            )}
            {availableActions.includes('LEAVE') && (
              <button
                className="quiet-action"
                type="button"
                disabled={actionsDisabled}
                onClick={() => void submit('LEAVE')}
              >
                Отказаться от помощи
              </button>
            )}
            {!atField &&
              (availableActions.includes('JOIN') || availableActions.includes('PICKUP')) && (
                <button type="button" className="quiet-action" onClick={props.onJournal}>
                  Выйти на площадь и продолжить →
                </button>
              )}
            {atField && availableActions.includes('JOIN') && (
              <button
                className="primary-action button-action"
                type="button"
                disabled={actionsDisabled}
                onClick={() => void submit('JOIN')}
              >
                Вступить в бой
              </button>
            )}
            {atField && contract.knownState === 'PROOF_AVAILABLE' && pickupTargets.length > 0 && (
              <>
                <label>
                  Куда положить трофей
                  <select
                    value={selectedContainerId}
                    disabled={actionsDisabled || !availableActions.includes('PICKUP')}
                    onChange={(event) => setSelectedContainerId(event.currentTarget.value)}
                  >
                    {pickupTargets.map((target) => (
                      <option key={target.containerId} value={target.containerId}>
                        {containerLabel(target.containerId)} · свободно{' '}
                        {Number(target.availableWeightG) / 1000} кг
                      </option>
                    ))}
                  </select>
                </label>
                {availableActions.includes('PICKUP') && (
                  <button
                    className="primary-action button-action"
                    type="button"
                    disabled={actionsDisabled || selectedContainerId.length === 0}
                    onClick={() => void submit('PICKUP')}
                  >
                    Забрать трофей
                  </button>
                )}
              </>
            )}
            {!atIssuer &&
              availableActions.includes('PRESENT') &&
              issuerBuilding(contract.instanceId) && (
                <button
                  type="button"
                  className="quiet-action"
                  disabled={!props.canVisit}
                  onClick={() =>
                    props.onVisitIssuer(
                      contract.terms.issuerLocation.siteId,
                      issuerBuilding(contract.instanceId)!,
                    )
                  }
                >
                  Вернуться к заказчику · {issuerVenue(contract.instanceId)} →
                </button>
              )}
            {atIssuer && availableActions.includes('PRESENT') && (
              <button
                className="primary-action button-action"
                type="button"
                disabled={actionsDisabled}
                onClick={() => void submit('PRESENT')}
              >
                Предъявить трофей заказчику
              </button>
            )}
            <button className="quiet-action" type="button" onClick={() => void refresh()}>
              Обновить контракт
            </button>
          </div>
          {contract.knownState === 'PROOF_AVAILABLE' && pickupTargets.length === 0 && (
            <p className="state-note">
              Трофей отмечен доступным, но сервер пока не предложил подходящий контейнер для вашей
              компании в этой точке.
            </p>
          )}
        </>
      )}
      {view.attempt && (
        <div role="status">
          <p>
            {view.pending
              ? 'Ждём подтверждение сервера.'
              : 'Ответ не подтверждён. Повтор отправит тот же запрос без изменения тела.'}
          </p>
          <button
            className="quiet-action"
            type="button"
            disabled={view.pending}
            onClick={() => void submit(view.attempt!.request.type)}
          >
            {view.pending ? 'Отправляем…' : 'Повторить сохранённый запрос'}
          </button>
        </div>
      )}
      {view.error && view.status !== 'failed' && (
        <p className="opening-error" role="alert">
          {view.error}
        </p>
      )}
    </section>
  );
}

export function firstHuntReadyView(
  response: FirstHuntReadResponseDto,
  attempt: FirstHuntAttempt | undefined,
  preservedCommandError: string | undefined,
): ViewState {
  return {
    status: 'ready',
    response,
    ...(attempt ? { attempt } : {}),
    ...(preservedCommandError ? { error: preservedCommandError } : {}),
  };
}

export function firstHuntRoleLabel(
  role: NonNullable<FirstHuntReadResponseDto['contract']>['yourRole'],
): string {
  return role === 'OWNER'
    ? 'компания — владелец контракта'
    : role === 'HELPER'
      ? 'помощник'
      : 'не участвуете';
}

export function firstHuntStateLabel(
  contract: NonNullable<FirstHuntReadResponseDto['contract']>,
): string {
  switch (contract.knownState) {
    case 'OFFERED':
      return 'предложен';
    case 'ACTIVE':
      return 'принят, ждёт участия';
    case 'ENCOUNTER_ACTIVE':
      return 'бой идёт';
    case 'PROOF_AVAILABLE':
      return 'трофей доступен';
    case 'PROOF_HELD':
      return contract.yourProof ? 'трофей у вашей компании' : 'трофей удерживается участником';
    case 'SETTLED':
      return 'выплата завершена';
  }
}

function issuerLabel(issuerId: string): string {
  return lookup(issuerId) ?? issuerId;
}

function locationLabel(siteId: string): string {
  return lookup(`place.${siteId}.name`) ?? siteId;
}

function areaLabel(areaId: string): string {
  return lookup(`area.${areaId}`) ?? areaId;
}

function rewardLabel(rewardQ: string): string {
  const reward = BigInt(rewardQ);
  const crowns = reward / 1_000_000n;
  const remainder = reward % 1_000_000n;
  return remainder === 0n ? `${crowns} крон` : `${crowns} крон и ${remainder} долей`;
}

export function firstHuntGuidance(
  contract: NonNullable<FirstHuntReadResponseDto['contract']>,
  currentSiteId: string | null,
): string {
  const issuer = contract.terms.issuerLocation.siteId;
  const objective = contract.terms.objectiveLocation.siteId;
  if (contract.knownState === 'OFFERED' && currentSiteId !== issuer)
    return `Чтобы принять предложение, вернитесь к заказчику в ${locationLabel(issuer)}.`;
  if (contract.knownState === 'OFFERED')
    return 'Условия показаны до принятия; примите контракт у заказчика, когда будете готовы.';
  if (contract.knownState === 'ACTIVE' && contract.yourRole === 'NONE') {
    if (contract.helperSlot === 'OCCUPIED')
      return 'Слот помощника занят; второй слот не предусмотрен.';
    return currentSiteId === issuer
      ? 'Помощь добровольна и доступна у заказчика, пока слот свободен.'
      : `Чтобы предложить помощь, прибудьте к заказчику в ${locationLabel(issuer)}.`;
  }
  if (contract.knownState === 'ACTIVE' && contract.yourRole !== 'NONE') {
    if (contract.yourJoinIntent)
      return 'Отряд готов к бою. Бой начнётся, когда выполнены условия допуска.';
    return currentSiteId === objective
      ? 'Вы у цели: вступите в бой. Участие второй компании добровольно.'
      : `Следуйте по доступным маршрутам к ${locationLabel(objective)} и запаситесь провизией перед опасным переходом.`;
  }
  if (contract.knownState === 'ENCOUNTER_ACTIVE')
    return 'Бой идёт. Участие закреплено сервером; выйти из контракта до завершения нельзя.';
  if (contract.knownState === 'PROOF_AVAILABLE')
    return currentSiteId === objective
      ? 'Выберите контейнер, предложенный сервером, чтобы забрать трофей.'
      : `Вернитесь к месту боя: ${locationLabel(objective)}.`;
  if (contract.knownState === 'PROOF_HELD')
    if (!contract.yourProof)
      return 'Трофей удерживается текущим носителем; вы не можете предъявить его от имени другой компании.';
    else
      return currentSiteId === issuer
        ? 'Предъявите трофей заказчику. Награда достанется текущему носителю.'
        : `Вернитесь к заказчику в ${locationLabel(issuer)}, сохраняя трофей в своём контейнере.`;
  return 'Выплата завершена. Трофей остаётся в прежнем контейнере и отмечен как погашенный.';
}

export async function readHunt(instanceId: string | undefined) {
  const query = instanceId === undefined ? '' : `?instanceId=${encodeURIComponent(instanceId)}`;
  const response = await fetch(`${apiBaseUrl}/contracts/first-hunt${query}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (response.status === 401) return 'unauthorized' as const;
  if (!response.ok) throw new Error('Не удалось прочитать условия контракта.');
  const value: unknown = await response.json();
  if (!isFirstHuntReadResponse(value)) throw new Error('Ответ контракта имеет неверный формат.');
  return value;
}

function restoredAttempt(scope: FirstHuntScope) {
  const local = storage();
  return local ? readFirstHuntAttempt(local, scope) : undefined;
}

function attemptError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
