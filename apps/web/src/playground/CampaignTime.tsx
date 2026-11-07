import { useEffect, useState } from 'react';
import type { PlaygroundTimeReceipt } from '@warwrit/protocol';

interface TimeCommand {
  commandId: string;
  ticks: number;
}
const steps = [1, 10, 100, 1000];
const decimal = (value: unknown): value is string =>
  typeof value === 'string' && /^\d+$/u.test(value);

export function CampaignTime({ accountId, worldId }: { accountId: string; worldId: string }) {
  const key = `warwrit.playground.time.v1:${accountId}:${worldId}`;
  const api = `${import.meta.env['VITE_API_BASE_URL'] ?? '/api'}/dev/playground/api/campaign-time`;
  const [tick, setTick] = useState<string>();
  const [pending, setPending] = useState<TimeCommand | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as TimeCommand;
        if (
          !saved ||
          typeof saved.commandId !== 'string' ||
          !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu.test(saved.commandId) ||
          !steps.includes(saved.ticks)
        )
          throw new Error('Повреждён сохранённый запрос времени.');
        setPending(saved);
      } else setPending(null);
      setStorageReady(true);
    } catch {
      setMessage('Хранилище запроса недоступно. Новые команды заблокированы.');
    }
    void fetch(api, { credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Часы QA-мира недоступны.');
        const reading = (await response.json()) as { worldId: string; tick: string };
        if (reading.worldId !== worldId || !decimal(reading.tick))
          throw new Error('Неверный ответ часов.');
        setTick(reading.tick);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage('Часы QA-мира недоступны.');
      });
    return () => controller.abort();
  }, [api, key, worldId]);

  async function advance(ticks?: number) {
    const command = pending ?? { commandId: crypto.randomUUID(), ticks: ticks! };
    setBusy(true);
    try {
      try {
        localStorage.setItem(key, JSON.stringify(command));
      } catch {
        setStorageReady(false);
        setMessage('Не удалось сохранить запрос. Время не изменено; проверьте хранилище браузера.');
        return;
      }
      setPending(command);
      const response = await fetch(api, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (!response.ok) {
        if (response.status === 400 || response.status === 409) {
          const failure = (await response.json()) as { code?: string };
          if (failure.code !== 'ACTIVE_ENCOUNTER')
            throw new Error('Запрос отклонён; сохранён для проверки.');
          localStorage.removeItem(key);
          setPending(null);
          setMessage(
            'Сначала завершите бой и дождитесь сохранения последствий. Время не изменено.',
          );
          return;
        }
        throw new Error('Ответ не подтверждён.');
      }
      const receipt = (await response.json()) as PlaygroundTimeReceipt;
      if (
        receipt.commandId !== command.commandId ||
        receipt.worldId !== worldId ||
        receipt.ticks !== command.ticks ||
        !decimal(receipt.beforeTick) ||
        !decimal(receipt.afterTick) ||
        BigInt(receipt.afterTick) - BigInt(receipt.beforeTick) !== BigInt(command.ticks)
      )
        throw new Error('Ответ не подтверждён.');
      localStorage.removeItem(key);
      setPending(null);
      setTick(receipt.afterTick);
      setMessage(
        `Сервер продвинул время на ${receipt.ticks} тактов. Обновите игру для расчёта последствий.`,
      );
    } catch {
      setMessage('Нет подтверждения. Повторите тот же запрос; время не прибавится дважды.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Ускорение времени QA-мира">
      <h2>Время изолированного QA-мира</h2>
      <p>
        {worldId} · последняя отметка {tick ?? '…'}. Изменяется кампания этого тестового стенда.
        Еда, отдых и жалованье рассчитываются игрой. Часы входа и таймер боя не меняются.
      </p>
      {steps.map((step) => (
        <button
          key={step}
          disabled={!storageReady || busy || pending !== null}
          onClick={() => {
            void advance(step);
          }}
        >
          +{step} тактов
        </button>
      ))}
      {pending && (
        <button
          disabled={busy}
          onClick={() => {
            void advance();
          }}
        >
          Повторить запрос времени
        </button>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
