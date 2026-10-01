import { useEffect, useState } from 'react';

import type {
  WorldAvailableDepartureDto,
  WorldPartyReadResponseDto,
  WorldSurroundingsDto,
} from '@warwrit/protocol';

import {
  createWorldTravelPreviewRequest,
  readWorldTravelPreview,
  type WorldTravelAction,
} from '../world-travel-attempt.js';
import { formatTickDuration } from './format.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';

type Preview = NonNullable<ReturnType<typeof readWorldTravelPreview>>;
type PreviewState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly preview: Preview }
  | { readonly status: 'failed' };

export function departureKey(departure: WorldAvailableDepartureDto): string {
  return `${departure.purpose}:${departure.edgeIds.join('/')}`;
}

export function TravelPanel(props: {
  readonly world: WorldPartyReadResponseDto;
  readonly map: WorldSurroundingsDto['map'];
  readonly currentTick: number;
  readonly msPerTick: number;
  readonly selected: WorldAvailableDepartureDto | null;
  readonly busy: boolean;
  readonly pendingAttempt: boolean;
  readonly returnWindowOpen: boolean;
  readonly message?: string;
  readonly onSelect: (departure: WorldAvailableDepartureDto | null) => void;
  readonly onTravel: (action: WorldTravelAction) => void;
  readonly onRetry: () => void;
  readonly onRefresh: () => void;
}) {
  const siteName = (siteId: string) =>
    props.map.sites.find((site) => site.siteId === siteId)?.name ?? siteId;
  const edgeTicks = (edgeIds: readonly string[]) =>
    edgeIds.reduce(
      (sum, edgeId) =>
        sum + (props.map.edges.find((edge) => edge.edgeId === edgeId)?.travelTicks ?? 0),
      0,
    );
  const dangerous = (edgeIds: readonly string[]) =>
    edgeIds.some(
      (edgeId) => props.map.edges.find((edge) => edge.edgeId === edgeId)?.danger === 'DANGEROUS',
    );

  const party = props.world.party;
  const legacyRoute = props.world.schemaVersion === 1 ? props.world.route : null;
  const execution = props.world.schemaVersion === 2 ? props.world.execution : null;
  const travelling = legacyRoute !== null || (execution !== null && execution.phase !== 'COMPLETE');
  const departures = props.world.availableDepartures ?? [];
  const canDepart = party !== null && !travelling && !props.pendingAttempt;

  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });
  const selected = props.selected;
  const selectedKey = selected ? departureKey(selected) : null;
  useEffect(() => {
    if (!selected) {
      setPreview({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setPreview({ status: 'loading' });
    void (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/world/travel/preview`, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(createWorldTravelPreviewRequest(selected)),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('preview unavailable');
        const body = readWorldTravelPreview(await response.json());
        if (
          !body ||
          body.purpose !== selected.purpose ||
          body.edgeIds.join('/') !== selected.edgeIds.join('/')
        )
          throw new Error('preview mismatch');
        setPreview({ status: 'ready', preview: body });
      } catch {
        if (!controller.signal.aborted) setPreview({ status: 'failed' });
      }
    })();
    return () => controller.abort();
    // The key captures the departure identity; the object may be recreated on refresh.
  }, [selectedKey, props.world.publicRevision]);

  const previewCurrent =
    preview.status === 'ready' &&
    party !== null &&
    preview.preview.publicRevision === props.world.publicRevision &&
    preview.preview.routeEpoch === party.routeEpoch;

  return (
    <section className="panel travel-panel" aria-label="Путешествие">
      <h2 className="panel-title">Путь</h2>
      {!party && <p className="state-note">У компании ещё нет полевой партии.</p>}

      {party && !travelling && (
        <p className="travel-status">
          Отряд стоит в <strong>{siteName(party.location)}</strong>.
        </p>
      )}

      {execution && execution.phase !== 'COMPLETE' && (
        <TransitStatus
          execution={execution}
          siteName={siteName}
          edgeTicks={(edgeId) => edgeTicks([edgeId])}
          currentTick={props.currentTick}
          msPerTick={props.msPerTick}
          busy={props.busy}
          onRefresh={props.onRefresh}
        />
      )}

      {legacyRoute && (
        <div className="travel-transit">
          <p>
            В пути. До прибытия:{' '}
            {formatTickDuration(Number(legacyRoute.remainingTicks), props.msPerTick)}.
          </p>
          <button
            className="action action-primary"
            type="button"
            disabled={props.busy || !legacyRoute.canArrive || props.pendingAttempt}
            onClick={() => props.onTravel({ kind: 'ARRIVE' })}
          >
            {props.busy ? 'Подтверждаем…' : 'Подтвердить прибытие'}
          </button>
        </div>
      )}

      {canDepart && departures.length > 0 && (
        <>
          <DepartureList
            label="Куда выступить"
            departures={departures.filter((departure) => departure.purpose === 'NEW')}
            selectedKey={selectedKey}
            busy={props.busy}
            msPerTick={props.msPerTick}
            siteName={siteName}
            edgeTicks={edgeTicks}
            dangerous={dangerous}
            onSelect={props.onSelect}
          />
          {departures.some((departure) => departure.purpose === 'RETURN') && (
            <DepartureList
              label="Возвращение — доступно даже при нехватке припасов"
              departures={departures.filter((departure) => departure.purpose === 'RETURN')}
              selectedKey={selectedKey}
              busy={props.busy}
              msPerTick={props.msPerTick}
              siteName={siteName}
              edgeTicks={edgeTicks}
              dangerous={dangerous}
              onSelect={props.onSelect}
            />
          )}
        </>
      )}
      {canDepart && departures.length === 0 && (
        <p className="state-note">
          {props.returnWindowOpen
            ? 'Сервер пока не предложил путь отсюда.'
            : 'Отсюда сейчас нет доступных переходов.'}
        </p>
      )}

      {canDepart && selected && (
        <div className="travel-preview" aria-live="polite">
          <h3>
            {selected.purpose === 'RETURN' ? 'Возвращение в ' : 'Поход в '}
            {siteName(selected.toSiteId)}
          </h3>
          <p className="state-note">
            Через:{' '}
            {[selected.fromSiteId, ...routeSites(selected, props.map)].map(siteName).join(' → ')}
          </p>
          {dangerous(selected.edgeIds) && (
            <p className="travel-warning">
              Опасный путь. Отряд идёт на своих припасах; известная нехватка закроет новый поход, но
              не возвращение.
            </p>
          )}
          {preview.status === 'loading' && <p className="state-note">Считаем припасы…</p>}
          {preview.status === 'failed' && (
            <p className="travel-error" role="alert">
              Не удалось получить расчёт припасов. Поход не отправлен.
            </p>
          )}
          {preview.status === 'ready' && (
            <dl className="travel-supplies">
              <div>
                <dt>Нужно пайков</dt>
                <dd>{preview.preview.requiredStockUnits}</dd>
              </div>
              <div>
                <dt>В обозе</dt>
                <dd>{preview.preview.availableStockUnits}</dd>
              </div>
              <div>
                <dt>Время в пути</dt>
                <dd>{formatTickDuration(edgeTicks(selected.edgeIds), props.msPerTick)}</dd>
              </div>
            </dl>
          )}
          {preview.status === 'ready' && preview.preview.knownShortage && (
            <p className="travel-warning" role="alert">
              Припасов не хватит на весь путь.
              {selected.purpose === 'NEW'
                ? ' Сервер отклонит новый опасный поход без изменений.'
                : ' Возвращение остаётся доступным; решает сервер.'}
            </p>
          )}
          {preview.status === 'ready' && !previewCurrent && (
            <p className="state-note">Состояние изменилось; расчёт обновляется.</p>
          )}
          <div className="action-row">
            <button
              className="action action-primary"
              type="button"
              disabled={props.busy || !previewCurrent}
              onClick={() => props.onTravel({ kind: 'DEPART', departure: selected })}
            >
              {props.busy ? 'Отправляемся…' : 'Выступить'}
            </button>
            <button className="action" type="button" onClick={() => props.onSelect(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {props.pendingAttempt && (
        <div className="travel-pending" role="status">
          <p>
            Ответ сервера на последний приказ не получен. Повтор отправит тот же приказ ещё раз;
            сервер выполнит его не больше одного раза.
          </p>
          <button className="action" type="button" disabled={props.busy} onClick={props.onRetry}>
            {props.busy ? 'Сверяем…' : 'Повторить тот же приказ'}
          </button>
        </div>
      )}
      {props.message && (
        <p className="travel-error" role="alert">
          {props.message}
        </p>
      )}
    </section>
  );
}

function DepartureList(props: {
  readonly label: string;
  readonly departures: readonly WorldAvailableDepartureDto[];
  readonly selectedKey: string | null;
  readonly busy: boolean;
  readonly msPerTick: number;
  readonly siteName: (siteId: string) => string;
  readonly edgeTicks: (edgeIds: readonly string[]) => number;
  readonly dangerous: (edgeIds: readonly string[]) => boolean;
  readonly onSelect: (departure: WorldAvailableDepartureDto | null) => void;
}) {
  if (props.departures.length === 0) return null;
  return (
    <>
      <h3 className="panel-subtitle">{props.label}</h3>
      <ul className="departure-list" aria-label={props.label}>
        {props.departures.map((departure) => {
          const key = departureKey(departure);
          const ticks = props.edgeTicks(departure.edgeIds);
          const risky = props.dangerous(departure.edgeIds);
          return (
            <li key={key}>
              <button
                type="button"
                className={`departure${props.selectedKey === key ? ' departure-selected' : ''}${
                  risky ? ' departure-danger' : ''
                }`}
                aria-pressed={props.selectedKey === key}
                disabled={props.busy}
                onClick={() => props.onSelect(props.selectedKey === key ? null : departure)}
              >
                <span className="departure-name">{props.siteName(departure.toSiteId)}</span>
                <span className="departure-meta">
                  {formatTickDuration(ticks, props.msPerTick)} · {ticks} такт.
                  {risky ? ' · опасно' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function TransitStatus(props: {
  readonly execution: NonNullable<
    Extract<WorldPartyReadResponseDto, { schemaVersion: 2 }>['execution']
  >;
  readonly siteName: (siteId: string) => string;
  readonly edgeTicks: (edgeId: string) => number;
  readonly currentTick: number;
  readonly msPerTick: number;
  readonly busy: boolean;
  readonly onRefresh: () => void;
}) {
  const { execution } = props;
  const remainingEdges = execution.edgeIds.slice(execution.nextEdgeIndex + 1);
  const activeLeft = execution.activeSegment
    ? Math.max(0, Number(execution.activeSegment.dueTick) - props.currentTick)
    : 0;
  const totalLeft = activeLeft + remainingEdges.reduce((sum, id) => sum + props.edgeTicks(id), 0);
  return (
    <div className="travel-transit">
      <p>
        {execution.phase === 'IN_TRANSIT'
          ? `В пути от ${props.siteName(execution.currentSiteId)}.`
          : `Привал в ${props.siteName(execution.currentSiteId)}; следующий участок начнёт сервер.`}
      </p>
      <p className="travel-eta">
        До цели ≈ {formatTickDuration(totalLeft, props.msPerTick)} · участок{' '}
        {Math.min(execution.nextEdgeIndex + 1, execution.edgeIds.length)} из{' '}
        {execution.edgeIds.length}
      </p>
      <button className="action" type="button" disabled={props.busy} onClick={props.onRefresh}>
        {props.busy ? 'Обновляем…' : 'Обновить'}
      </button>
    </div>
  );
}

/** Sites visited after the origin, following the departure's edges. */
export function routeSites(
  departure: WorldAvailableDepartureDto,
  map: WorldSurroundingsDto['map'],
): string[] {
  const sites: string[] = [];
  let at = departure.fromSiteId;
  for (const edgeId of departure.edgeIds) {
    const edge = map.edges.find((entry) => entry.edgeId === edgeId);
    if (!edge) break;
    at = edge.fromSiteId === at ? edge.toSiteId : edge.fromSiteId;
    sites.push(at);
  }
  return sites;
}
