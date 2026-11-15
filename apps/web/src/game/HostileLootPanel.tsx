import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isHostileLootPickupRequestDto,
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanyHoldingsDto,
  type CompanySummaryDto,
  type HostileLootAvailabilityDto,
  type HostileLootPickupRequestDto,
  type HostileLootPickupResponseDto,
} from '@warwrit/protocol';
import { itemLabel } from './format.js';
import { encounterUnitLabel } from '../encounter/unit-label.js';
import './hostile-loot.css';

const api = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');

interface PickupAttempt {
  readonly accountId: string;
  readonly companyId: string;
  readonly request: HostileLootPickupRequestDto;
}

interface LootState {
  readonly availability?: HostileLootAvailabilityDto;
  readonly containers?: CompanyContainers;
  readonly busy: boolean;
  readonly message?: string;
}

type CompanyContainers = NonNullable<NonNullable<CompanyHoldingsDto['transfer']>['containers']>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readAvailability(value: unknown): HostileLootAvailabilityDto | undefined {
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
    typeof value['publicRevision'] !== 'string' ||
    !/^(0|[1-9][0-9]*)$/u.test(value['publicRevision']) ||
    !Array.isArray(value['sources']) ||
    !Array.isArray(value['targetContainerIds']) ||
    value['targetContainerIds'].some((id) => typeof id !== 'string') ||
    value['sources'].some((source) => {
      if (
        !isRecord(source) ||
        typeof source['hostileId'] !== 'string' ||
        typeof source['terminalSourceId'] !== 'string' ||
        !Number.isSafeInteger(source['terminalRevision']) ||
        !isRecord(source['location']) ||
        typeof source['location']['siteId'] !== 'string' ||
        typeof source['location']['areaId'] !== 'string' ||
        !Array.isArray(source['items'])
      )
        return true;
      return source['items'].some(
        (item) =>
          !isRecord(item) ||
          typeof item['itemId'] !== 'string' ||
          typeof item['definitionId'] !== 'string' ||
          !Number.isSafeInteger(item['currentCondition']) ||
          !Number.isSafeInteger(item['maximumCondition']),
      );
    })
  )
    return undefined;
  return value as unknown as HostileLootAvailabilityDto;
}

function readContainers(value: unknown, companyId: string): CompanyContainers | undefined {
  if (
    !isRecord(value) ||
    !isRecord(value['company']) ||
    value['company']['companyId'] !== companyId ||
    !isRecord(value['holdings'])
  )
    return undefined;
  const transfer = value['holdings']['transfer'];
  if (!isRecord(transfer) || !Array.isArray(transfer['containers'])) return undefined;
  const containers = transfer['containers'];
  if (
    containers.some(
      (entry) =>
        !isRecord(entry) ||
        typeof entry['containerId'] !== 'string' ||
        (entry['carrierCharacterId'] !== null && typeof entry['carrierCharacterId'] !== 'string') ||
        typeof entry['kind'] !== 'string',
    )
  )
    return undefined;
  return containers as unknown as CompanyContainers;
}

function readAttempt(
  key: string,
  accountId: string,
  companyId: string,
  instanceId: string,
): PickupAttempt | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value['accountId'] !== accountId ||
      value['companyId'] !== companyId ||
      !isHostileLootPickupRequestDto(value['request']) ||
      value['request'].instanceId !== instanceId
    )
      return undefined;
    return value as unknown as PickupAttempt;
  } catch {
    return undefined;
  }
}

function containerLabel(
  containerId: string,
  containers: CompanyContainers | undefined,
  company: CompanySummaryDto,
): string {
  const container = containers?.find((entry) => entry.containerId === containerId);
  if (container?.carrierCharacterId) {
    const character = company.characters.find(
      (entry) => entry.characterId === container.carrierCharacterId,
    );
    return `Сумка: ${character?.name ?? 'участник отряда'}`;
  }
  if (container?.kind === 'PARTY_SUPPLY') return 'Обоз отряда';
  if (container) return 'Местный контейнер';
  return 'Контейнер отряда';
}

function pickupMessage(code: HostileLootPickupResponseDto['code'] | 'UNKNOWN'): string {
  switch (code) {
    case 'CAPACITY':
      return 'В контейнере не хватает места. Обновите список и выберите другой.';
    case 'STALE_REVISION':
      return 'Состояние компании изменилось. Сверяем доступную добычу.';
    case 'NOT_AVAILABLE':
      return 'Эта вещь больше недоступна. Сверяем добычу.';
    case 'NOT_AUTHORIZED':
      return 'Компания или доступ к добыче изменились.';
    case 'INVALID_COMMAND':
      return 'Сервер отклонил приказ. Обновите список добычи.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'Приказ с тем же номером уже использован. Обновите список добычи.';
    default:
      return 'Ответ неизвестен. Повторите тот же приказ.';
  }
}

/** Owner-visible spoils are read from the canonical hunt route before any pickup is offered. */
export function HostileLootPanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly instanceId: string;
  readonly refreshKey: number;
  readonly onRefresh: () => void;
  readonly onUnauthorized: () => void;
}) {
  const companyId = props.company.companyId;
  const key = `warwrit:hostile-loot:${props.accountId}:${companyId}:${props.instanceId}`;
  const [pending, setPending] = useState<PickupAttempt | undefined>(() =>
    readAttempt(key, props.accountId, companyId, props.instanceId),
  );
  const [destinations, setDestinations] = useState<Readonly<Record<string, string>>>({});
  const [state, setState] = useState<LootState>({ busy: false });
  const requestLock = useRef(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setState((previous) => {
      const { message: _message, ...rest } = previous;
      return { ...rest, busy: true };
    });
    try {
      const sessionResponse = await fetch(`${api}/auth/session`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (current !== generation.current) return;
      const session: unknown = await sessionResponse.json().catch(() => undefined);
      if (!sessionResponse.ok || !isRecord(session) || session['accountId'] !== props.accountId) {
        props.onUnauthorized();
        setState({ busy: false, message: 'Войдите снова, чтобы проверить добычу.' });
        return;
      }
      const [availabilityResponse, companyResponse] = await Promise.all([
        fetch(`${api}/company/hostile-loot/${encodeURIComponent(props.instanceId)}`, {
          credentials: 'same-origin',
          cache: 'no-store',
        }),
        fetch(`${api}/company`, { credentials: 'same-origin', cache: 'no-store' }),
      ]);
      if (current !== generation.current) return;
      if (availabilityResponse.status === 401 || companyResponse.status === 401) {
        props.onUnauthorized();
        setState({ busy: false, message: 'Войдите снова, чтобы проверить добычу.' });
        return;
      }
      if (!availabilityResponse.ok || !companyResponse.ok)
        throw new Error('Не удалось обновить список добычи.');
      const [availabilityValue, companyValue]: [unknown, unknown] = await Promise.all([
        availabilityResponse.json(),
        companyResponse.json(),
      ]);
      const availability = readAvailability(availabilityValue);
      if (!availability) throw new Error('Сервер вернул неполный список добычи.');
      const containers = readContainers(companyValue, companyId);
      if (current === generation.current)
        setState({ availability, ...(containers ? { containers } : {}), busy: false });
    } catch (error) {
      if (current === generation.current)
        setState((previous) => ({
          ...previous,
          busy: false,
          message: error instanceof Error ? error.message : 'Добыча пока недоступна.',
        }));
    }
  }, [props.accountId, props.instanceId, props.onUnauthorized, companyId]);

  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh, props.refreshKey, props.accountId, companyId, props.company.revision]);

  async function pickup(hostileId: string, itemId: string, toContainerId: string) {
    const availability = state.availability;
    if (requestLock.current || (!availability && !pending)) return;
    if (!pending && !availability?.targetContainerIds.includes(toContainerId)) return;
    requestLock.current = true;
    setState((previous) => {
      const { message: _message, ...rest } = previous;
      return { ...rest, busy: true };
    });
    let attempt = pending;
    if (!attempt) {
      if (!availability) return;
      const request: HostileLootPickupRequestDto = {
        schemaVersion: 1,
        commandId: crypto.randomUUID(),
        expectedPublicRevision: availability.publicRevision,
        instanceId: props.instanceId,
        hostileId,
        itemId,
        toContainerId,
      };
      attempt = { accountId: props.accountId, companyId, request };
      try {
        sessionStorage.setItem(key, JSON.stringify(attempt));
      } catch {
        setState((previous) => ({
          ...previous,
          busy: false,
          message: 'Не удалось сохранить приказ. Добычу не отправляли.',
        }));
        requestLock.current = false;
        return;
      }
      setPending(attempt);
    }
    try {
      const response = await fetch(
        `${api}/company/hostile-loot/${encodeURIComponent(props.instanceId)}/pickup`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'content-type': 'application/json',
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
          },
          body: JSON.stringify(attempt.request),
        },
      );
      const value: unknown = await response.json().catch(() => undefined);
      if (
        isRecord(value) &&
        value['schemaVersion'] === 1 &&
        value['commandId'] === attempt.request.commandId &&
        typeof value['ok'] === 'boolean' &&
        typeof value['publicRevision'] === 'string'
      ) {
        const result = value as unknown as HostileLootPickupResponseDto;
        if (result.ok) {
          sessionStorage.removeItem(key);
          setPending(undefined);
          props.onRefresh();
          await refresh();
          setState((previous) => ({ ...previous, busy: false, message: 'Вещь забрана.' }));
        } else {
          sessionStorage.removeItem(key);
          setPending(undefined);
          await refresh();
          setState((previous) => ({
            ...previous,
            busy: false,
            message: pickupMessage(result.code ?? 'UNKNOWN'),
          }));
        }
      } else {
        setState((previous) => ({ ...previous, busy: false, message: pickupMessage('UNKNOWN') }));
      }
    } catch {
      setState((previous) => ({ ...previous, busy: false, message: pickupMessage('UNKNOWN') }));
    } finally {
      requestLock.current = false;
    }
  }

  const sources = state.availability?.sources ?? [];
  if (sources.length === 0 && !state.busy && !state.message && !pending) return null;
  if (sources.length === 0 && state.message && !pending)
    return (
      <section className="hostile-loot" aria-label="Добыча после боя">
        <h3 className="panel-subtitle">Добыча после боя</h3>
        <p role="status" className="state-note">
          {state.message}
        </p>
        <button
          className="quiet-action"
          type="button"
          disabled={state.busy}
          onClick={() => void refresh()}
        >
          {state.busy ? 'Обновляем…' : 'Обновить добычу'}
        </button>
      </section>
    );
  if (sources.length === 0 && !pending && state.busy) return null;

  const pendingRequest = pending?.request;
  return (
    <section className="hostile-loot" aria-label="Добыча после боя">
      <h3 className="panel-subtitle">Добыча после боя</h3>
      {pendingRequest ? (
        <div className="hostile-loot-pending" role="status">
          <p>
            Приказ забрать{' '}
            {itemLabel(
              sources
                .flatMap((source) => source.items)
                .find((item) => item.itemId === pendingRequest.itemId)?.definitionId ?? '',
            ) || 'предмет'}{' '}
            ещё не подтверждён. Сначала повторите его без изменений.
          </p>
          <button
            className="action"
            type="button"
            disabled={state.busy}
            onClick={() =>
              void pickup(
                pendingRequest.hostileId,
                pendingRequest.itemId,
                pendingRequest.toContainerId,
              )
            }
          >
            {state.busy ? 'Повторяем приказ…' : 'Повторить тот же приказ'}
          </button>
        </div>
      ) : (
        sources.map((source) => (
          <div className="hostile-loot-source" key={source.hostileId}>
            <h4>
              {encounterUnitLabel(
                { id: source.hostileId, sideId: 'opponent' },
                Object.fromEntries(
                  props.company.characters.map((character) => [
                    character.characterId,
                    character.name,
                  ]),
                ),
              ) || 'предмет'}{' '}
            </h4>
            <ul>
              {source.items.map((item) => (
                <li key={item.itemId}>
                  <div>
                    <strong>{itemLabel(item.definitionId)}</strong>
                    <span className="state-note">
                      {' '}
                      · Состояние {item.currentCondition}/{item.maximumCondition}
                    </span>
                  </div>
                  <label className="hostile-loot-destination">
                    <span>Куда забрать</span>
                    <select
                      aria-label={`Куда забрать: ${itemLabel(item.definitionId)}`}
                      disabled={state.busy || state.availability?.targetContainerIds.length === 0}
                      value={destinations[item.itemId] ?? ''}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setDestinations((current) => ({ ...current, [item.itemId]: value }));
                      }}
                    >
                      <option value="">Выберите контейнер</option>
                      {state.availability?.targetContainerIds.map((id) => (
                        <option key={id} value={id}>
                          {containerLabel(id, state.containers, props.company)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="gear-action"
                    disabled={
                      state.busy ||
                      !state.availability?.targetContainerIds.includes(
                        destinations[item.itemId] ?? '',
                      )
                    }
                    onClick={() =>
                      void pickup(source.hostileId, item.itemId, destinations[item.itemId]!)
                    }
                  >
                    {state.busy ? 'Забираем…' : 'Забрать'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      {state.message && (
        <p role="status" className="state-note">
          {state.message}
        </p>
      )}
      {sources.length > 0 && !state.busy && !pending && (
        <button className="quiet-action" type="button" onClick={() => void refresh()}>
          Обновить добычу
        </button>
      )}
    </section>
  );
}
