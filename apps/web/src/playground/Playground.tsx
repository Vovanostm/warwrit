import { useEffect, useRef, useState } from 'react';
import type {
  PlaygroundBootstrap,
  PlaygroundCommand,
  PlaygroundInspection,
  PlaygroundOperation,
  PlaygroundResult,
} from '@warwrit/protocol';
import { BattleView } from '../combat-lab/BattleView.js';
import './playground.css';

const api = `${import.meta.env['VITE_API_BASE_URL'] ?? '/api'}/dev/playground/api`;
const pendingKey = 'warwrit.playground.pending.v1';
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function readPending(): { accountId: string; command: PlaygroundCommand } | null {
  const text = sessionStorage.getItem(pendingKey);
  if (!text) return null;
  const saved = JSON.parse(text) as { accountId: string; command: PlaygroundCommand };
  const value = saved.command;
  if (
    !value ||
    typeof saved.accountId !== 'string' ||
    typeof value.commandId !== 'string' ||
    typeof value.operation !== 'string'
  )
    throw new Error('Сохранённый запрос повреждён. Сначала проверьте состояние sandbox.');
  return saved;
}

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${api}${path}`, { credentials: 'same-origin', signal });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Войдите в игру, затем вернитесь в Playground.'
        : response.status === 403
          ? 'Аккаунт отсутствует в списке разработчиков.'
          : `Чтение недоступно (HTTP ${response.status}).`,
    );
  return response.json() as Promise<T>;
}

export function Playground() {
  const [bootstrap, setBootstrap] = useState<PlaygroundBootstrap | null>(null);
  const [inspection, setInspection] = useState<PlaygroundInspection | null>(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<PlaygroundCommand | null>(null);
  const [pendingOwner, setPendingOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [receipt, setReceipt] = useState<PlaygroundResult['receipt'] | null>(null);
  const [lastCommand, setLastCommand] = useState<PlaygroundCommand | null>(null);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const mapMode = window.location.pathname.endsWith('/maps');
  const sandbox = inspection?.sandbox;

  async function refresh(signal: AbortSignal, id?: string) {
    const next = await getJson<PlaygroundBootstrap>('', signal);
    if (signal.aborted) return;
    setBootstrap(next);
    const selected =
      id ?? new URLSearchParams(window.location.search).get('sandbox') ?? next.sandboxes[0]?.id;
    const current = selected && next.sandboxes.find((item) => item.id === selected);
    if (!current) {
      setInspection(null);
      setDraft(pretty(next.template));
      setPreview(false);
      return;
    }
    const detail = await getJson<PlaygroundInspection>(
      `/${encodeURIComponent(current.id)}`,
      signal,
    );
    if (signal.aborted) return;
    if (detail.validationError)
      setMessage(
        'CONTENT_REVISION_MISMATCH: просмотр старого сценария закрыт. Можно удалить sandbox или сбросить и сохранить новый draft.',
      );
    setInspection(detail);
    setDraft(pretty(detail.sandbox.scenario));
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?sandbox=${encodeURIComponent(current.id)}`,
    );
  }

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    try {
      const saved = readPending();
      setPending(saved?.command ?? null);
      setPendingOwner(saved?.accountId ?? null);
      setLastCommand(saved?.command ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Хранилище недоступно.');
      locked.current = true;
    }
    void refresh(request.signal).catch((error: unknown) => {
      if (!request.signal.aborted)
        setMessage(error instanceof Error ? error.message : 'Сервер недоступен.');
    });
    return () => {
      controller.current?.abort();
    };
  }, []);

  async function open(id?: string) {
    if (locked.current) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    locked.current = true;
    setPreview(false);
    setMessage('');
    try {
      await refresh(request.signal, id);
    } catch (error) {
      if (!request.signal.aborted)
        setMessage(error instanceof Error ? error.message : 'Ошибка чтения.');
    } finally {
      if (!request.signal.aborted) {
        setBusy(false);
        locked.current = false;
      }
    }
  }

  async function send(operation: PlaygroundOperation, retry?: PlaygroundCommand) {
    if (operation !== 'create' && !sandbox && !retry) return;
    if (
      !bootstrap ||
      locked.current ||
      (pending && !retry) ||
      (retry && pendingOwner !== bootstrap.accountId)
    )
      return;
    const command: PlaygroundCommand = retry ?? {
      commandId: crypto.randomUUID(),
      issuedAt: new Date().toISOString(),
      operation,
      ...(operation === 'create'
        ? {}
        : { sandboxId: sandbox!.id, expectedRevision: sandbox!.revision }),
      ...(operation === 'configure'
        ? { scenario: JSON.parse(draft) as NonNullable<PlaygroundCommand['scenario']> }
        : {}),
    };
    try {
      sessionStorage.setItem(
        pendingKey,
        JSON.stringify({ accountId: bootstrap.accountId, command }),
      );
    } catch {
      setMessage('Запрос не отправлен: не удалось сохранить его для повтора.');
      return;
    }
    setPending(command);
    setPendingOwner(bootstrap.accountId);
    setLastCommand(command);
    setMessage('');
    setReceipt(null);
    setPreview(false);
    locked.current = true;
    setBusy(true);
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const response = await fetch(`${api}/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(command),
        signal: request.signal,
      });
      const result = (await response.json()) as PlaygroundResult & { code?: string };
      if (!response.ok) {
        if (response.status < 500) {
          sessionStorage.removeItem(pendingKey);
          setPending(null);
        }
        throw new Error(`Команда отклонена: ${result.code ?? `HTTP ${response.status}`}`);
      }
      if (
        result.receipt?.status !== 'accepted' ||
        result.receipt.commandId !== command.commandId ||
        result.receipt.sandboxId !== result.sandbox?.id ||
        result.receipt.revision !== result.sandbox.revision
      )
        throw new Error('Ответ не подтверждает команду. Повторите тот же запрос.');
      sessionStorage.removeItem(pendingKey);
      setPending(null);
      setReceipt(result.receipt);
      setMessage(`Сервер подтвердил: ${command.operation}.`);
      await refresh(request.signal, result.sandbox.id);
    } catch (error) {
      if (!request.signal.aborted)
        setMessage(
          error instanceof Error ? error.message : 'Ответ потерян. Повторите тот же запрос.',
        );
    } finally {
      if (!request.signal.aborted) {
        locked.current = false;
        setBusy(false);
      }
    }
  }

  async function downloadReplay() {
    if (!sandbox || locked.current) return;
    locked.current = true;
    setBusy(true);
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const replay = await getJson<unknown>(`/${sandbox.id}/replay`, request.signal);
      if (request.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([pretty(replay)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `sandbox-${sandbox.id}-initial-replay.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      if (!request.signal.aborted) setMessage('Не удалось скачать replay.');
    } finally {
      if (!request.signal.aborted) {
        locked.current = false;
        setBusy(false);
      }
    }
  }

  function configure() {
    try {
      JSON.parse(draft);
      void send('configure').catch(() => setMessage('Некорректный JSON сценария.'));
    } catch {
      setMessage('Некорректный JSON сценария. Изменения не отправлены.');
    }
  }
  const query = sandbox ? `?sandbox=${encodeURIComponent(sandbox.id)}` : '';
  const blocked = busy || pending !== null;
  const dirty = sandbox !== undefined && draft !== pretty(sandbox.scenario);
  return (
    <main className="playground">
      <header className="playground-banner">
        <strong>DEBUG · Developer Playground</strong>
        <a href="/">Вернуться в игру</a>
      </header>
      <div className="playground-title">
        <div>
          <p className="playground-eyebrow">WLC-05 · Изолированные эксперименты</p>
          <h1>{mapMode ? 'Map Editor' : 'Combat Lab'}</h1>
        </div>
        <nav aria-label="Инструменты">
          <a aria-current={!mapMode ? 'page' : undefined} href={`/dev/playground/combat${query}`}>
            Combat Lab
          </a>
          <a aria-current={mapMode ? 'page' : undefined} href={`/dev/playground/maps${query}`}>
            Map Editor
          </a>
        </nav>
      </div>
      <p className="playground-environment">
        Среда: <b>{bootstrap?.environment ?? 'проверка доступа'}</b> · Content:{' '}
        {bootstrap?.contentRevision ?? '—'}
        <br />
        Сессия аккаунта: {bootstrap?.accountId ?? '—'} · Sandbox: {sandbox?.id ?? 'не выбран'}
      </p>
      <p>
        Общий фундамент: сценарии и просмотр. {mapMode ? 'Редактирование карты' : 'Управление боем'}{' '}
        появится на следующем этапе. Основной мир не изменяется.
      </p>
      {message && (
        <p role="status" className="playground-feedback">
          {message}
        </p>
      )}
      {pending && (
        <div className="playground-feedback" role="alert">
          {pendingOwner !== bootstrap?.accountId
            ? 'Сохранённый запрос принадлежит другому аккаунту. Войдите под исходным аккаунтом.'
            : `Ответ о команде ${pending.operation} не подтверждён.`}{' '}
          Новые команды заблокированы.{' '}
          <button
            disabled={busy || !bootstrap || pendingOwner !== bootstrap.accountId}
            onClick={() => void send(pending.operation, pending)}
          >
            Повторить тот же запрос
          </button>
        </div>
      )}
      <div className="playground-layout">
        <aside>
          <h2>Мои sandbox</h2>
          <button disabled={!bootstrap || blocked} onClick={() => void send('create')}>
            Создать sandbox
          </button>
          <button disabled={busy} onClick={() => void open()}>
            Перечитать
          </button>
          <ul>
            {bootstrap?.sandboxes.map((item) => (
              <li key={item.id}>
                <button
                  aria-pressed={item.id === sandbox?.id}
                  disabled={busy}
                  onClick={() => void open(item.id)}
                >
                  {item.scenario.metadata.name}
                  <small>
                    {item.status} · rev {item.revision}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          <p>
            TTL: 24 часа с создания. Не более 8 sandbox на аккаунт. Удалённые квитанции сохраняются
            до TTL.
          </p>
        </aside>
        <section>
          <h2>{sandbox?.scenario.metadata.name ?? 'Выберите или создайте sandbox'}</h2>
          {sandbox && (
            <>
              <p>
                {sandbox.status} · rev {sandbox.revision} · до{' '}
                {new Date(sandbox.expiresAt).toLocaleString('ru-RU')}
              </p>
              {dirty && (
                <p className="playground-feedback">
                  Есть несохранённые изменения. Сначала сохраните draft, затем выполните Validate.
                </p>
              )}
              <div className="playground-controls">
                <button disabled={blocked || sandbox.status === 'active'} onClick={configure}>
                  Сохранить draft
                </button>
                <button
                  disabled={blocked || dirty || sandbox.status === 'active'}
                  onClick={() => void send('validate')}
                >
                  Validate
                </button>
                <button
                  disabled={blocked || dirty || sandbox.status !== 'validated'}
                  onClick={() => void send('activate')}
                >
                  Activate
                </button>
                <button disabled={blocked} onClick={() => void send('clone')}>
                  Клонировать
                </button>
                <button disabled={blocked} onClick={() => void send('reset')}>
                  Reset в draft
                </button>
                <button disabled={blocked} onClick={() => void send('delete')}>
                  Удалить
                </button>
              </div>
              <label className="playground-draft">
                Scenario · schema v1
                <textarea
                  spellCheck={false}
                  value={draft}
                  readOnly={sandbox.status === 'active' || blocked}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </label>
              {inspection?.view && (
                <>
                  <button disabled={busy} onClick={() => setPreview(!preview)}>
                    {preview ? 'Закрыть сцену' : 'Открыть сцену · только просмотр'}
                  </button>
                  {preview && (
                    <div className="playground-scene">
                      <BattleView
                        key={sandbox.id}
                        view={inspection.view}
                        selectedUnitId={null}
                        selectedHex={null}
                        onSelectUnit={() => {}}
                        onSelectHex={() => {}}
                        busy={true}
                      />
                    </div>
                  )}
                </>
              )}
              {inspection?.view && (
                <button disabled={blocked} onClick={() => void downloadReplay()}>
                  Скачать initial replay
                </button>
              )}
              <details>
                <summary>Команда, результат и журнал ({inspection?.audit.length ?? 0})</summary>
                <pre>
                  {pretty({
                    command: lastCommand,
                    result: receipt,
                    sessionId: sandbox.id,
                    revision: sandbox.revision,
                    replay: inspection?.view
                      ? `${sandbox.id}:initial`
                      : 'Симуляция ещё не запускалась',
                    audit: inspection?.audit,
                  })}
                </pre>
              </details>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
