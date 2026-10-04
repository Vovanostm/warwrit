import { useEffect, useRef, useState } from 'react';
import type {
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
} from '@warwrit/protocol';
import type { FreeMovementScope } from '../world-free-movement-attempt.js';
import { worldPartyReadHeaders } from '../world-free-movement-attempt.js';

const api = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
type Action = WorldFreeMovementV2RequestDto['action'];
const decimal = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9]\d{0,18})$/.test(v);
function fractionDigits(t: { numerator: string; denominator: string }): boolean {
  return /^(0|[1-9]\d{0,18})$/.test(t.numerator) && /^[1-9]\d{0,18}$/.test(t.denominator);
}
function readContinuousMovement(value: unknown): WorldFreeMovementV2ResponseDto | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as WorldFreeMovementV2ResponseDto;
  const point = (p: WorldFreeMovementV2ResponseDto['point']) =>
    p &&
    typeof p.xMicroFp === 'string' &&
    typeof p.zMicroFp === 'string' &&
    /^-?(0|[1-9]\d{0,12})$/.test(p.xMicroFp) &&
    /^-?(0|[1-9]\d{0,12})$/.test(p.zMicroFp);
  if (
    v.schemaVersion !== 2 ||
    !['ACCEPTED', 'ALREADY_AT_TARGET'].includes(v.result) ||
    !decimal(v.publicRevision) ||
    !decimal(v.movementEpoch) ||
    !decimal(v.serverTimeMs) ||
    !point(v.point) ||
    !['MOVING', 'STATIONARY_SITE', 'STATIONARY_TERRAIN'].includes(v.mode)
  )
    return undefined;
  if ((v.mode === 'MOVING') !== (v.plan !== null)) return undefined;
  if (v.plan) {
    const p = v.plan;
    if (
      (p.planVersion !== 2 && p.planVersion !== 3) ||
      (p.planVersion === 3 &&
        (p.navigationVersion !== 'polygon-v1' ||
          p.mapEdition !== 'seroe-porechye-continuous-v5')) ||
      (p.planVersion === 2 &&
        (p.navigationVersion !== undefined || p.mapEdition === 'seroe-porechye-continuous-v5')) ||
      ![
        'seroe-porechye-continuous-v1',
        'seroe-porechye-continuous-v2',
        'seroe-porechye-continuous-v3',
        'seroe-porechye-continuous-v4',
        'seroe-porechye-continuous-v5',
      ].includes(p.mapEdition) ||
      typeof p.planId !== 'string' ||
      typeof p.speedProfileId !== 'string' ||
      p.movementEpoch !== v.movementEpoch ||
      !decimal(p.startedAtMs) ||
      !decimal(p.arrivesAtMs) ||
      !decimal(p.totalDurationUs) ||
      !point(p.from) ||
      !point(p.goal) ||
      !Array.isArray(p.path) ||
      p.path.length < 2 ||
      p.path.length > 4096 ||
      !p.path.every(point) ||
      !Array.isArray(p.speedSpans) ||
      !p.speedSpans.length ||
      p.speedSpans.length > 4096
    )
      return undefined;
    let end = '0',
      previous = p.from;
    for (const span of p.speedSpans) {
      if (
        !point(span.from) ||
        !point(span.to) ||
        span.from.xMicroFp !== previous.xMicroFp ||
        span.from.zMicroFp !== previous.zMicroFp ||
        typeof span.terrainId !== 'string' ||
        (span.overlayId !== null && typeof span.overlayId !== 'string') ||
        !Number.isSafeInteger(span.speedPermille) ||
        span.speedPermille <= 0 ||
        !decimal(span.startOffsetUs) ||
        !decimal(span.endOffsetUs) ||
        span.startOffsetUs !== end ||
        BigInt(span.endOffsetUs) <= BigInt(end)
      )
        return undefined;
      if (p.planVersion === 3) {
        const g = span.geometry;
        const fraction = (t: { numerator: string; denominator: string } | undefined) => {
          if (!t || !fractionDigits(t)) return false;
          return BigInt(t.numerator) <= BigInt(t.denominator) && BigInt(t.denominator) <= 1n << 61n;
        };
        if (
          !g ||
          !Number.isSafeInteger(g.segmentIndex) ||
          g.segmentIndex < 0 ||
          g.segmentIndex + 1 >= p.path.length ||
          !fraction(g.fromT) ||
          !fraction(g.toT) ||
          BigInt(g.fromT.numerator) * BigInt(g.toT.denominator) >=
            BigInt(g.toT.numerator) * BigInt(g.fromT.denominator)
        )
          return undefined;
      }
      end = span.endOffsetUs;
      previous = span.to;
    }
    if (
      end !== p.totalDurationUs ||
      previous.xMicroFp !== p.goal.xMicroFp ||
      previous.zMicroFp !== p.goal.zMicroFp
    )
      return undefined;
  }

  return v;
}
const messageFor = (code: string) =>
  ({
    TARGET_BLOCKED: 'Сюда нельзя пройти.',
    OUT_OF_BOUNDS: 'Эта точка за пределами карты.',
    NO_PATH: 'Путь к этой точке недоступен.',
    ROUTE_FORBIDDEN: 'Этот путь проходит через опасную область. Используйте разрешённый маршрут.',
    KNOWN_SUPPLY_SHORTAGE: 'Для пути не хватает припасов.',
    MOVEMENT_NOT_ALLOWED: 'Отряд сейчас не может выступить. Проверьте лагерь, бой и занятия.',
    STALE_REVISION: 'Состояние изменилось. Обновляем карту.',
    STALE_MOVEMENT_EPOCH: 'Путь уже изменился. Обновляем карту.',
    MAP_EDITION_MISMATCH: 'Карта обновилась. Перезагрузите страницу.',
  })[code] ?? 'Не удалось принять приказ.';

export function useContinuousMovement(
  scope: FreeMovementScope,
  onRefreshWorld: () => void,
  enabled = true,
) {
  const [current, setCurrent] = useState<WorldFreeMovementV2ResponseDto | null>(null);
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const currentRef = useRef(current),
    queued = useRef<Action | null>(null),
    pending = useRef<WorldFreeMovementV2RequestDto | null>(null);
  const controls = useRef<{ send: (a: Action) => void; retry: () => void } | null>(null);
  const refreshRef = useRef(onRefreshWorld);
  refreshRef.current = onRefreshWorld;
  const clock = useRef({ serverMs: 0, receivedAt: 0 });
  useEffect(() => {
    if (!enabled) {
      setCurrent(null);
      currentRef.current = null;
      return;
    }
    let live = true,
      reading = false,
      sending = false;
    const abort = new AbortController(),
      storageKey = `warwrit.continuous.${scope.accountId}.${scope.companyId}`;
    setCurrent(null);
    currentRef.current = null;
    clock.current = { serverMs: 0, receivedAt: performance.now() };
    queued.current = null;
    setMessage(undefined);
    setBusy(false);
    setUnknown(false);
    try {
      const raw = localStorage.getItem(storageKey);
      pending.current = raw ? (JSON.parse(raw) as WorldFreeMovementV2RequestDto) : null;
    } catch {
      pending.current = null;
    }
    const apply = (v: WorldFreeMovementV2ResponseDto, sent: number) => {
      if (!live) return;
      const old = currentRef.current;
      if (
        old &&
        (BigInt(v.movementEpoch) < BigInt(old.movementEpoch) ||
          (v.movementEpoch === old.movementEpoch &&
            BigInt(v.publicRevision) < BigInt(old.publicRevision)))
      )
        return;
      const wasMoving = old?.mode === 'MOVING';
      const receivedAt = performance.now();
      // A receipt replay retains its historical timestamp; it must not rewind rendering.
      clock.current = {
        serverMs: Math.max(
          Number(v.serverTimeMs) + (receivedAt - sent) / 2,
          clock.current.serverMs + receivedAt - clock.current.receivedAt,
        ),
        receivedAt,
      };
      currentRef.current = v;
      setCurrent(v);
      if (wasMoving && v.mode !== 'MOVING') refreshRef.current();
    };
    const read = async () => {
      if (!live || reading || sending || pending.current) return;
      reading = true;
      const sent = performance.now();
      try {
        const r = await fetch(`${api}/world/free-movement`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: worldPartyReadHeaders(scope),
          signal: abort.signal,
        });
        if (!r.ok) throw new Error('read unavailable');
        const v = readContinuousMovement(await r.json());
        if (!v) throw new Error('invalid state');
        apply(v, sent);
        setMessage((old) => (old === 'Не удалось сверить положение отряда.' ? undefined : old));
      } catch {
        if (live && !abort.signal.aborted) setMessage('Не удалось сверить положение отряда.');
      } finally {
        reading = false;
      }
    };
    const run = async () => {
      if (!live || sending) return;
      const state = currentRef.current;
      if (!pending.current) {
        if (!state || !queued.current) return;
        pending.current = {
          schemaVersion: 2,
          commandId: crypto.randomUUID(),
          expectedPublicRevision: state.publicRevision,
          expectedMovementEpoch: state.movementEpoch,
          action: queued.current,
        };
        queued.current = null;
        try {
          localStorage.setItem(storageKey, JSON.stringify(pending.current));
        } catch {
          pending.current = null;
          setMessage('Не удалось сохранить приказ перед отправкой.');
          return;
        }
      }

      sending = true;
      setBusy(true);
      setMessage(undefined);
      const sent = performance.now();
      try {
        const r = await fetch(`${api}/world/free-movement`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json', ...worldPartyReadHeaders(scope) },
          body: JSON.stringify(pending.current),
          signal: abort.signal,
        });
        const body = await r.json();
        if (!live) return;
        const v = readContinuousMovement(body);
        if (
          !v &&
          !(
            body?.schemaVersion === 2 &&
            body?.result === 'REJECTED' &&
            typeof body.code === 'string'
          )
        )
          throw new Error('unknown response');
        pending.current = null;
        localStorage.removeItem(storageKey);
        setUnknown(false);
        if (v) {
          apply(v, sent);
          refreshRef.current();
        } else setMessage(messageFor(body.code));
      } catch {
        if (live && !abort.signal.aborted) {
          setUnknown(true);
          setMessage('Ответ не получен. Повторите сохранённый приказ.');
        }
      } finally {
        sending = false;
        if (live) {
          setBusy(false);
          await read();
          if (!pending.current && queued.current) void run();
        }
      }
    };
    controls.current = {
      send(a) {
        queued.current = a;
        // Resolve an uncertain saved command before sending the latest queued goal.
        void run();
      },
      retry() {
        void run();
      },
    };
    const sync = () => {
      if (document.visibilityState === 'visible') void read();
    };
    const timer = setInterval(() => void read(), 1000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', sync);
    void read().then(() => {
      if (pending.current) void run();
      else if (queued.current) void run();
    });
    return () => {
      live = false;
      abort.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', sync);
      controls.current = null;
    };
  }, [scope.accountId, scope.companyId, enabled]);
  return {
    current,
    message,
    busy,
    unknown,
    clock,
    send: (a: Action) => controls.current?.send(a),
    retry: () => controls.current?.retry(),
  };
}
