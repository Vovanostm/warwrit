import { useEffect, useState } from 'react';
import type { WorldFreeMovementResponseDto, WorldSurroundingsDto } from '@warwrit/protocol';
import {
  readFreeMovementPreview,
  worldPartyReadHeaders,
  type FreeMovementAction,
  type FreeMovementScope,
} from '../world-free-movement-attempt.js';
import { formatTickDuration } from './format.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
type Position = { readonly q: number; readonly r: number };

export function FreeMovementPanel(props: {
  readonly map: WorldSurroundingsDto['map'];
  readonly current: WorldFreeMovementResponseDto | null;
  readonly destination: Position | null;
  readonly scope: FreeMovementScope;
  readonly msPerTick: number;
  readonly busy: boolean;
  readonly pending: boolean;
  readonly siteTargeting: boolean;
  readonly message?: string;
  readonly onDestination: (position: Position | null) => void;
  readonly onPreviewPath: (path: readonly Position[] | undefined) => void;
  readonly onSiteTargeting: (enabled: boolean) => void;
  readonly onMove: (action: FreeMovementAction) => void;
  readonly onRetry: () => void;
}) {
  const [preview, setPreview] = useState<ReturnType<typeof readFreeMovementPreview>>();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const current = props.current;
  const destination = props.destination;
  const party = current?.party;

  useEffect(() => {
    if (!current || !destination) {
      setPreview(undefined);
      props.onPreviewPath(undefined);
      setLoading(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    setPreview(undefined);
    props.onPreviewPath(undefined);
    setLoading(true);
    setFailed(false);
    void (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/world/free-movement/preview`, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'content-type': 'application/json',
            ...worldPartyReadHeaders(props.scope),
          },
          body: JSON.stringify({
            schemaVersion: 1,
            expectedPublicRevision: current.publicRevision,
            expectedRouteEpoch: party?.routeEpoch,
            destination,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('preview unavailable');
        const value = readFreeMovementPreview(await response.json());
        if (
          !value ||
          value.publicRevision !== current.publicRevision ||
          value.routeEpoch !== party?.routeEpoch
        )
          throw new Error('preview stale');
        setPreview(value);
        props.onPreviewPath(value.path);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [
    current?.publicRevision,
    party?.routeEpoch,
    destination?.q,
    destination?.r,
    props.scope.accountId,
    props.scope.companyId,
    props.onPreviewPath,
  ]);

  const previewCurrent = Boolean(
    preview &&
    current &&
    party &&
    preview.publicRevision === current.publicRevision &&
    preview.routeEpoch === party.routeEpoch,
  );
  const site =
    destination &&
    props.map.sites.find((entry) => entry.q === destination.q && entry.r === destination.r);
  const moving = current?.movement?.status === 'MOVING';
  const duration = preview ? Number(BigInt(preview.arrivesAt) - BigInt(preview.worldTick)) : 0;
  const destinationName = site?.name ?? (destination ? `${destination.q}, ${destination.r}` : '');

  return (
    <section className="panel travel-panel" aria-label="Свободное движение">
      <h2 className="panel-title">Путь по местности</h2>
      {!current && (
        <p className="state-note">Свободное движение недоступно во время дорожного маршрута.</p>
      )}
      {current && (
        <button
          className="quiet-action"
          type="button"
          aria-pressed={props.siteTargeting}
          onClick={() => props.onSiteTargeting(!props.siteTargeting)}
        >
          {props.siteTargeting ? 'Выберите поселение на карте…' : 'Свободный путь к поселению'}
        </button>
      )}
      {party && !moving && (
        <p className="travel-status">
          Отряд стоит в{' '}
          {party.position.kind === 'SITE'
            ? siteName(props.map, party.position.siteId ?? '')
            : 'местности'}
          .
        </p>
      )}
      {moving && current?.movement && (
        <div className="travel-transit">
          <p>
            Отряд движется по карте. Осталось примерно{' '}
            {formatTickDuration(
              Math.max(0, Number(BigInt(current.movement.arrivesAt) - BigInt(current.worldTick))),
              props.msPerTick,
            )}
            .
          </p>
          <button
            className="action"
            type="button"
            disabled={props.busy || props.pending}
            onClick={() => props.onMove({ kind: 'STOP' })}
          >
            {props.busy ? 'Сверяем положение…' : 'Остановиться здесь'}
          </button>
        </div>
      )}
      {current?.movement?.status === 'STOPPED' && (
        <p className="state-note">
          Отряд остановился в местности. Выберите новую точку, чтобы продолжить путь.
        </p>
      )}
      {destination && (
        <div className="travel-preview" aria-live="polite">
          <h3>
            {moving ? 'Перенаправить к ' : 'Путь к '}
            {destinationName}
          </h3>
          {loading && <p className="state-note">Считаем путь и припасы…</p>}
          {failed && (
            <p className="travel-error" role="alert">
              Не удалось проверить путь. Приказ не отправлен.
            </p>
          )}
          {preview && (
            <dl className="travel-supplies">
              <div>
                <dt>Шагов</dt>
                <dd>{preview.path.length - 1}</dd>
              </div>
              <div>
                <dt>Нужно пайков</dt>
                <dd>{preview.requiredStockUnits}</dd>
              </div>
              <div>
                <dt>В обозе</dt>
                <dd>{preview.availableStockUnits}</dd>
              </div>
              <div>
                <dt>Время в пути</dt>
                <dd>{formatTickDuration(duration, props.msPerTick)}</dd>
              </div>
            </dl>
          )}
          {preview?.knownShortage && (
            <p className="travel-warning" role="alert">
              Пайков может не хватить на весь путь; решение принимает сервер.
            </p>
          )}
          {preview && !previewCurrent && (
            <p className="state-note">Состояние изменилось; расчёт пути обновляется.</p>
          )}
          <div className="action-row">
            <button
              className="action action-primary"
              type="button"
              disabled={props.busy || props.pending || !previewCurrent}
              onClick={() => props.onMove({ kind: moving ? 'REROUTE' : 'START', destination })}
            >
              {props.busy ? 'Отправляем…' : moving ? 'Перенаправить' : 'Выступить'}
            </button>
            <button className="action" type="button" onClick={() => props.onDestination(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}
      {props.pending && (
        <div className="travel-pending" role="status">
          <p>Ответ на приказ не получен. Повтор отправит тот же приказ с тем же номером.</p>
          <button className="action" type="button" disabled={props.busy} onClick={props.onRetry}>
            Повторить тот же приказ
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

function siteName(map: WorldSurroundingsDto['map'], siteId: string): string {
  return map.sites.find((entry) => entry.siteId === siteId)?.name ?? siteId;
}
