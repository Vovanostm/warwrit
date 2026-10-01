import type { WorldPartyReadResponseDto } from '@warwrit/protocol';

import {
  createWorldTravelPreviewRequest,
  readWorldTravelPreview,
  type WorldTravelAction,
} from './world-travel-attempt.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';

export function WorldTravel(props: {
  readonly current: WorldPartyReadResponseDto;
  readonly returnWindowOpen: boolean;
  readonly busy: boolean;
  readonly pendingAttempt: boolean;
  readonly message?: string;
  readonly onTravel: (action: WorldTravelAction) => void;
  readonly onRetry: () => void;
  readonly onRefresh: () => void;
}) {
  const party = props.current.party;
  const location = party?.location;
  const legacy = props.current.schemaVersion === 1 ? props.current : undefined;
  const route = legacy?.route ?? null;
  const execution = props.current.schemaVersion === 2 ? props.current.execution : null;
  const departures = props.current.availableDepartures ?? [];
  const activeRoute =
    legacy !== undefined ? route !== null : execution !== null && execution.phase !== 'COMPLETE';
  const canDepart = party !== null && !activeRoute && !props.pendingAttempt;

  return (
    <section className="world-travel" aria-label="Путешествие компании">
      <p className="eyebrow">Путь компании</p>
      <h2>Серое Поречье</h2>
      <p className="world-location">
        Последнее подтверждённое место:{' '}
        <strong>{party ? locationLabel(party.location) : 'партия ещё не создана'}</strong>
      </p>
      {party && <p className="world-epoch">Эпоха пути · {party.routeEpoch}</p>}
      {execution && (
        <div className="world-route-status">
          <p>
            Маршрут из {execution.edgeIds.length} участков: завершено {execution.nextEdgeIndex}.
          </p>
          <p className="state-note">
            {execution.phase === 'IN_TRANSIT'
              ? 'Компания в пути.'
              : execution.phase === 'AT_BOUNDARY'
                ? 'Компания достигла промежуточной точки; следующий переход выполняется сервером.'
                : 'Маршрут завершён.'}
          </p>
          <button
            className="quiet-action"
            type="button"
            disabled={props.busy}
            onClick={props.onRefresh}
          >
            {props.busy ? 'Обновляем состояние…' : 'Обновить состояние маршрута'}
          </button>
        </div>
      )}
      {route && (
        <div className="world-route-status">
          <p>Компания в пути. До прибытия: {route.remainingTicks} тактов.</p>
          <button
            className="primary-action button-action"
            type="button"
            disabled={props.busy || !route.canArrive || props.pendingAttempt}
            onClick={() => props.onTravel({ kind: 'ARRIVE' })}
          >
            {props.busy ? 'Подтверждаем…' : 'Подтвердить прибытие'}
          </button>
          {!route.canArrive && (
            <>
              <p className="state-note">Прибытие пока не подтверждено сервером.</p>
              <button
                className="quiet-action"
                type="button"
                disabled={props.busy || props.pendingAttempt}
                onClick={props.onRefresh}
              >
                {props.busy ? 'Обновляем состояние…' : 'Проверить готовность к прибытию'}
              </button>
            </>
          )}
        </div>
      )}
      {party && canDepart && departures.length > 0 && (
        <div className="world-departures" aria-label="Доступные маршруты">
          <p className="state-note">Выберите путь, предложенный состоянием мира.</p>
          <ul>
            {departures.map((departure) => (
              <li key={`${departure.purpose}:${departure.edgeIds.join('/')}`}>
                <button
                  className="primary-action button-action"
                  type="button"
                  disabled={!canDepart || props.busy}
                  onClick={() => previewThenTravel(departure, props)}
                >
                  {props.busy
                    ? 'Отправляемся…'
                    : departure.purpose === 'RETURN'
                      ? `Вернуться в ${locationLabel(departure.toSiteId)}`
                      : `Отправиться в ${locationLabel(departure.toSiteId)}`}
                  <span className="departure-length">
                    {departure.edgeIds.length === 1
                      ? '1 переход'
                      : `${departure.edgeIds.length} перехода`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {party && canDepart && departures.length === 0 && (
        <p className="state-note">
          {props.returnWindowOpen
            ? 'Сервер пока не предложил доступный путь из этого места.'
            : 'Для этого места доступных переходов пока нет.'}
        </p>
      )}
      {props.pendingAttempt && (
        <div className="world-travel-pending" role="status">
          <p>Результат запроса не подтверждён. Повтор будет отправлен без изменения тела.</p>
          <button
            className="quiet-action"
            type="button"
            disabled={props.busy}
            onClick={props.onRetry}
          >
            {props.busy ? 'Проверяем запрос…' : 'Повторить тот же запрос'}
          </button>
        </div>
      )}
      {props.message && (
        <p className="opening-error" role="alert">
          {props.message}
        </p>
      )}
    </section>
  );
}

async function previewThenTravel(
  departure: NonNullable<WorldPartyReadResponseDto['availableDepartures']>[number],
  props: Parameters<typeof WorldTravel>[0],
): Promise<void> {
  const party = props.current.party;
  if (!party) return;
  try {
    const request = createWorldTravelPreviewRequest(departure);
    const response = await fetch(`${apiBaseUrl}/world/travel/preview`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('preview unavailable');
    const preview = readWorldTravelPreview(await response.json());
    if (
      !preview ||
      preview.purpose !== departure.purpose ||
      JSON.stringify(preview.edgeIds) !== JSON.stringify(departure.edgeIds)
    )
      throw new Error('preview unavailable');
    if (
      preview.publicRevision !== props.current.publicRevision ||
      preview.routeEpoch !== party.routeEpoch ||
      preview.atTick !== props.current.worldTick
    ) {
      props.onRefresh();
      window.alert('Состояние мира изменилось. Обновите маршрут и запросите расчёт ещё раз.');
      return;
    }
    const assumptions = preview.assumptions
      .map((assumption) => {
        switch (assumption) {
          case 'SERVER_CLOCK':
            return 'время сервера';
          case 'CURRENT_COMPANY_OWNED_PARTY_STOCK':
            return 'припасы компании в точке отправления';
          case 'EXACT_FRACTIONAL_FOOD_CARRY':
            return 'точный остаток дробного рациона';
          default:
            return assumption;
        }
      })
      .join(', ');
    const shortage =
      preview.purpose === 'NEW' && preview.knownShortage
        ? '\nИзвестная нехватка: сервер может отклонить новый опасный маршрут без изменения состояния.'
        : preview.knownShortage
          ? '\nИзвестная нехватка рассчитана отдельно; доступность возврата определяет сервер.'
          : '';
    const confirmed = window.confirm(
      `Расчёт припасов для пути:\nТребуется: ${preview.requiredStockUnits}\nДоступно: ${preview.availableStockUnits}\nУчтено: ${assumptions}${shortage}\n\nОтправить запрос на путь?`,
    );
    if (confirmed) props.onTravel({ kind: 'DEPART', departure });
  } catch {
    window.alert('Не удалось получить расчёт припасов. Переход не отправлен.');
  }
}

function locationLabel(location: string): string {
  switch (location) {
    case 'bereznyak':
      return 'Березняк';
    case 'severny-dvor':
      return 'Северный Двор';
    case 'kamenny-brod':
      return 'Каменный Брод';
    case 'tikhaya-gat':
      return 'Тихая Гать';
    case 'staraya-melnitsa':
      return 'Старая мельница';
    default:
      return location;
  }
}
