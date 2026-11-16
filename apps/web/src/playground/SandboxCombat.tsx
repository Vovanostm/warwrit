import { useEffect, useRef, useState } from 'react';
import { isEncounterCommandDto } from '@warwrit/protocol';
import type {
  CombatLabAction,
  CombatLabHex,
  EncounterCommandDto,
  EncounterCommandResponse,
  PlaygroundInspection,
  PlaygroundReplayReport,
} from '@warwrit/protocol';
import { BattleView } from '../combat-lab/BattleView.js';
import { CommandDesk } from '../combat-lab/CommandDesk.js';
import { executeFieldCommand } from '../combat-lab/field-command.js';
import { handleCombatLabKey } from '../combat-lab/command-input.js';
import '../combat-lab/combat-lab.css';

export const sandboxPendingKey = 'warwrit.playground.combat.pending.v1';
type Pending = { accountId: string; sandboxId: string; command: EncounterCommandDto };

export function SandboxCombat({
  api,
  accountId,
  inspection,
  onInspection,
  onPending,
}: {
  readonly api: string;
  readonly accountId: string;
  readonly inspection: PlaygroundInspection;
  readonly onInspection: (inspection: PlaygroundInspection) => void;
  readonly onPending: (pending: boolean) => void;
}) {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<CombatLabHex | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [autoplay, setAutoplay] = useState(false);
  const [lastAccepted, setLastAccepted] = useState<Pending | null>(null);
  const [discardNext, setDiscardNext] = useState(false);
  const discardReply = useRef(false);
  const [report, setReport] = useState<PlaygroundReplayReport | null>(null);
  const locked = useRef(false);
  const auto = useRef(false);
  const abort = useRef(new AbortController());
  const hotkeys = useRef<Record<string, { reason: string; run: () => unknown }>>({});
  const view = inspection.view;
  const inspectionRef = useRef(inspection);
  inspectionRef.current = inspection;
  const onPendingRef = useRef(onPending);
  onPendingRef.current = onPending;

  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    try {
      const saved = sessionStorage.getItem(sandboxPendingKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Pending;
        if (
          !parsed ||
          typeof parsed.accountId !== 'string' ||
          typeof parsed.sandboxId !== 'string' ||
          !isEncounterCommandDto(parsed.command)
        )
          throw new Error('invalid saved request');
        setPending(parsed);
        onPendingRef.current(true);
      }
    } catch {
      locked.current = true;
      onPendingRef.current(true);
      setNotice('Не удалось прочитать сохранённый запрос. Новые команды закрыты.');
    }
    const key = (event: KeyboardEvent) =>
      handleCombatLabKey(
        event,
        event.target instanceof HTMLElement ? event.target : null,
        hotkeys.current,
        () => {},
      );
    window.addEventListener('keydown', key);
    return () => {
      auto.current = false;
      controller.abort();
      window.removeEventListener('keydown', key);
    };
  }, []);

  async function refresh() {
    const signal = abort.current.signal;
    const response = await fetch(`${api}/${inspection.sandbox.id}`, {
      credentials: 'same-origin',
      signal,
    });
    if (!response.ok) throw new Error(`Чтение: HTTP ${response.status}`);
    const next = (await response.json()) as PlaygroundInspection;
    if (!signal.aborted) onInspection(next);
  }

  async function send(intent: CombatLabAction['intent'], retry?: Pending) {
    const signal = abort.current.signal;
    const current = inspectionRef.current;
    const activation = current.view?.activation;
    if (locked.current || (!retry && pending) || !current.encounterId || (!retry && !activation))
      return;
    if (retry && (retry.accountId !== accountId || retry.sandboxId !== current.sandbox.id)) return;
    const saved: Pending = retry ?? {
      accountId,
      sandboxId: current.sandbox.id,
      command: {
        version: 2,
        encounterId: current.encounterId,
        commandId: crypto.randomUUID(),
        expectedRevision: current.view!.viewRevision,
        activationId: activation!.id,
        actorId: activation!.actorId,
        intent,
      },
    };
    try {
      sessionStorage.setItem(sandboxPendingKey, JSON.stringify(saved));
    } catch {
      setNotice('Не отправлено: запрос невозможно сохранить для точного повтора.');
      stop();
      return;
    }
    setPending(saved);
    onPendingRef.current(true);
    locked.current = true;
    setBusy(true);
    setReport(null);
    try {
      const response = await fetch(`${api}/combat/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(saved.command),
      });
      const result = (await response.json()) as EncounterCommandResponse;
      if (signal.aborted) return;
      const accepted =
        response.ok &&
        result.status === 'accepted' &&
        result.encounterId === saved.command.encounterId &&
        result.receiptId === `${result.encounterId}:${result.revision}` &&
        result.revision === saved.command.expectedRevision + 1;
      const refused =
        (response.status === 409 &&
          result.status === 'rejected' &&
          ['CONFLICT', 'UNAUTHORIZED', 'INVALID_COMMAND'].includes(result.code)) ||
        (response.status === 404 && result.status === 'rejected' && result.code === 'NOT_FOUND');
      if (result.commandId !== saved.command.commandId || (!accepted && !refused))
        throw new Error('Ответ не подтверждён. Повторите тот же запрос.');
      if (accepted && discardReply.current) {
        discardReply.current = false;
        setDiscardNext(false);
        throw new Error('DEBUG: ответ сервера отброшен. Точный запрос сохранён для повтора.');
      }
      if (accepted) setLastAccepted(saved);
      sessionStorage.removeItem(sandboxPendingKey);
      setPending(null);
      onPendingRef.current(false);
      setNotice(
        result.status === 'accepted'
          ? `Принято · rev ${result.revision} · ${result.receiptId}`
          : `Отклонено сервером: ${result.code}`,
      );
      if (!accepted) stop();
      await refresh();
    } catch (error) {
      stop();
      if (!signal.aborted)
        setNotice(
          error instanceof Error ? error.message : 'Ответ потерян. Точный запрос сохранён.',
        );
    } finally {
      if (!signal.aborted) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  function stop() {
    auto.current = false;
    setAutoplay(false);
  }
  useEffect(() => {
    if (view?.status === 'resolved') {
      stop();
      return;
    }
    if (!autoplay || busy || pending || !view) return;
    const timer = setTimeout(() => {
      if (auto.current) void send({ type: 'autoplay' });
    }, 400);
    return () => clearTimeout(timer);
  }, [autoplay, busy, pending, view]);

  async function replay(download: boolean) {
    const signal = abort.current.signal;
    if (locked.current) return;
    stop();
    locked.current = true;
    setBusy(true);
    try {
      const response = await fetch(`${api}/${inspection.sandbox.id}/replay`, {
        credentials: 'same-origin',
        signal,
      });
      if (!response.ok) throw new Error(`Replay: HTTP ${response.status}`);
      const value = (await response.json()) as PlaygroundReplayReport;
      if (signal.aborted) return;
      setReport(value);
      if (download) {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `combat-${inspection.encounterId}-replay.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (!signal.aborted) setNotice(error instanceof Error ? error.message : 'Replay недоступен.');
    } finally {
      if (!signal.aborted) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  if (!view) return <p>Серверная сцена недоступна. Перечитайте sandbox.</p>;
  const reason = busy
    ? 'Ожидание сервера'
    : pending
      ? 'Нужен точный повтор'
      : autoplay
        ? 'Остановите автобой'
        : view.status !== 'active'
          ? 'Бой завершён'
          : '';
  const act = (intent: CombatLabAction['intent']) => {
    if (!reason) void send(intent);
  };
  const field = (intent: CombatLabAction['intent']) => {
    if (!reason)
      executeFieldCommand(view, intent, null, {
        confirm: (message) => window.confirm(message),
        notice: setNotice,
        selectMovement: setSelectedHex,
        selectTarget: setSelectedUnit,
        act: (action) => act(action),
      });
  };
  return (
    <section aria-label="Authoritative sandbox encounter">
      <p>
        Encounter: <code>{inspection.encounterId}</code> · revision {view.viewRevision} ·{' '}
        {view.rulesetId}
      </p>
      <div className="playground-controls">
        <button disabled={!!reason} onClick={() => void send({ type: 'autoplay' })}>
          Step · одно решение AI
        </button>
        <button
          disabled={(!autoplay && (busy || !!pending)) || view.status !== 'active'}
          onClick={() => {
            if (auto.current) stop();
            else {
              auto.current = true;
              setAutoplay(true);
            }
          }}
        >
          {autoplay ? 'Pause · остановить автобой' : 'Autoplay'}
        </button>
        <button disabled={busy} onClick={() => void replay(false)}>
          Проверить replay
        </button>
        <button disabled={busy} onClick={() => void replay(true)}>
          Скачать replay
        </button>
      </div>
      <details className="sandbox-diagnostics">
        <summary>Диагностика транспорта и восстановления</summary>
        <p>
          Только sandbox. Дубль использует прежний ID и тело; потеря ответа сохраняет неизвестный
          запрос. Подкрепления после Start недоступны в текущих правилах.
        </p>
        <button
          disabled={busy || !!pending || autoplay || !lastAccepted}
          onClick={() => lastAccepted && void send(lastAccepted.command.intent, lastAccepted)}
        >
          Повторить последнюю команду без изменений
        </button>
        <button
          disabled={busy || !!pending || autoplay || view.status !== 'active'}
          aria-pressed={discardNext}
          onClick={() => {
            discardReply.current = !discardReply.current;
            setDiscardNext(discardReply.current);
          }}
        >
          {discardNext ? 'Отмена потери ответа' : 'Потерять следующий ответ'}
        </button>
        <button onClick={() => window.location.reload()}>Перезагрузить Lab</button>
        <p>
          Restart recovery: перезапустите API своего стенда, затем перезагрузите Lab и повторите
          сохранённый запрос. Чтение не продвигает бой.
        </p>
      </details>
      <p role="status">
        {notice ||
          'Manual · обе стороны: выберите цель или клетку; правый клик — приказ. Клавиши 1–5 — команды.'}
      </p>
      {pending && (
        <p role="alert">
          Ответ не подтверждён.{' '}
          {pending.sandboxId !== inspection.sandbox.id || pending.accountId !== accountId ? (
            'Откройте исходный sandbox под исходным аккаунтом.'
          ) : (
            <button disabled={busy} onClick={() => void send(pending.command.intent, pending)}>
              Повторить тот же боевой запрос
            </button>
          )}
        </p>
      )}
      {report && (
        <p role="status" className="playground-feedback">
          Replay: {report.matches ? 'MATCH' : `MISMATCH (${report.reason})`} · expected{' '}
          {report.expectedDigest} · actual {report.actualDigest ?? 'недоступен'}
        </p>
      )}
      <div className="playground-scene combat-lab">
        <BattleView
          view={view}
          selectedUnitId={selectedUnit}
          selectedHex={selectedHex}
          onSelectUnit={setSelectedUnit}
          onSelectHex={setSelectedHex}
          onAct={field}
          onRefusal={setNotice}
          busy={!!reason}
        >
          <CommandDesk
            view={view}
            selectedUnitId={selectedUnit}
            selectedHex={selectedHex}
            commonReason={reason}
            selectedSkillId={null}
            menuOpen={false}
            hotkeyActions={hotkeys}
            act={act}
            actOnField={field}
            autoplay={autoplay}
            pending={pending ? { uncertain: !busy, description: 'Боевой запрос' } : null}
            retryAction={() => pending && void send(pending.command.intent, pending)}
            notice={notice}
          />
        </BattleView>
      </div>
      <details>
        <summary>
          Events · {inspection.events?.length ?? 0} / commands · {inspection.commands?.length ?? 0}{' '}
          / receipts · {inspection.receipts?.length ?? 0} / rejections ·{' '}
          {inspection.rejections?.length ?? 0}
        </summary>
        <pre>
          {JSON.stringify(
            {
              events: inspection.events,
              commands: inspection.commands,
              receipts: inspection.receipts,
              rejections: inspection.rejections,
              result: view.outcome,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  );
}
