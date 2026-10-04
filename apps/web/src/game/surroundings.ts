import { useEffect, useRef, useState } from 'react';

import type { WorldSurroundingsDto } from '@warwrit/protocol';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const POLL_MS = 15_000;

export interface SurroundingsReading {
  readonly dto: WorldSurroundingsDto;
  /** Local monotonic time when the server reading arrived. */
  readonly receivedAt: number;
}

export type SurroundingsState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly reading: SurroundingsReading; readonly stale: boolean }
  | { readonly status: 'unavailable' };

function isSurroundings(value: unknown): value is WorldSurroundingsDto {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const map = record['map'] as Record<string, unknown> | undefined;
  return (
    record['schemaVersion'] === 1 &&
    typeof record['serverTimeMs'] === 'string' &&
    typeof record['campaign'] === 'object' &&
    typeof record['light'] === 'object' &&
    typeof map === 'object' &&
    Array.isArray(map['sites']) &&
    Array.isArray(map['edges']) &&
    Array.isArray(record['observedCompanies'])
  );
}

/**
 * Polls the observer-lawful surroundings. A failed poll keeps the last reading
 * but marks it stale so the shell can show a connection problem.
 */
export function useSurroundings(refreshKey: unknown): SurroundingsState {
  const [state, setState] = useState<SurroundingsState>({ status: 'loading' });
  const latest = useRef<SurroundingsReading | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/world/surroundings`, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('surroundings unavailable');
        const body: unknown = await response.json();
        if (!isSurroundings(body)) throw new Error('surroundings malformed');
        latest.current = { dto: body, receivedAt: performance.now() };
        setState({ status: 'ready', reading: latest.current, stale: false });
      } catch {
        if (controller.signal.aborted) return;
        setState(
          latest.current
            ? { status: 'ready', reading: latest.current, stale: true }
            : { status: 'unavailable' },
        );
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void load(), POLL_MS);
    };
    void load();
    return () => {
      controller.abort();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [refreshKey]);

  return state;
}

/** Re-render periodically so clocks and the moving party advance between server readings. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Fractional campaign tick estimated from the last server reading; display only. */
export function estimatedTick(reading: SurroundingsReading, now: number): number {
  const elapsed = Math.max(0, now - reading.receivedAt);
  return Number(reading.dto.campaign.tick) + elapsed / Number(reading.dto.campaign.msPerTick);
}

export function estimatedLight(
  reading: SurroundingsReading,
  now: number,
): { readonly phase: 'DAY' | 'NIGHT'; readonly msLeft: number } {
  const elapsed = Math.max(0, now - reading.receivedAt);
  const { phase, msIntoPhase } = reading.dto.light;
  // The server clock uses repeating 10-minute days and 5-minute nights.
  const dayMs = 600_000;
  const nightMs = 300_000;
  const cycleMs = dayMs + nightMs;
  const phaseOffset = phase === 'DAY' ? 0 : dayMs;
  const cyclePosition = (phaseOffset + Number(msIntoPhase) + elapsed) % cycleMs;
  if (cyclePosition < dayMs) return { phase: 'DAY', msLeft: dayMs - cyclePosition };
  return { phase: 'NIGHT', msLeft: cycleMs - cyclePosition };
}
