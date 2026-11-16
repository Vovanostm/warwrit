import { CampaignTime } from './CampaignTime.js';
import { useEffect, useRef, useState } from 'react';
import type {
  PlaygroundBootstrap,
  PlaygroundCommand,
  PlaygroundInspection,
  PlaygroundOperation,
  PlaygroundResult,
  PlaygroundScenario,
  PlaygroundFieldError,
} from '@warwrit/protocol';
import { SandboxSetup, isEditableScenario } from './SandboxSetup.js';
import { SandboxCombat } from './SandboxCombat.js';
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
  const [combatPending, setCombatPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<PlaygroundFieldError[]>([]);
  const [receipt, setReceipt] = useState<PlaygroundResult['receipt'] | null>(null);
  const [lastCommand, setLastCommand] = useState<PlaygroundCommand | null>(null);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const mapMode = window.location.pathname.replace(/\/$/u, '').endsWith('/maps');
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

  useEffect(() => {
    if (!bootstrap || !sandbox || sandbox.status === 'active') return;
    const request = new AbortController();
    const timer = setTimeout(() => {
      try {
        const value: unknown = JSON.parse(draft);
        void fetch(`${api}/preflight`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(value),
          signal: request.signal,
        })
          .then(async (response) => {
            const result = (await response.json()) as { errors?: PlaygroundFieldError[] };
            if (!request.signal.aborted && Array.isArray(result.errors))
              setFieldErrors(result.errors);
          })
          .catch(() => {
            /* Explicit preflight/save still reports transport failure. */
          });
      } catch {
        setFieldErrors([{ field: 'scenario', message: 'Некорректный JSON.' }]);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      request.abort();
    };
  }, [draft, sandbox?.id, sandbox?.status, bootstrap?.accountId]);

  async function open(id?: string) {
    if (locked.current) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    locked.current = true;
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
      combatPending ||
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
      const result = (await response.json()) as PlaygroundResult & {
        code?: string;
        errors?: PlaygroundFieldError[];
      };
      setFieldErrors(result.errors ?? []);
      if (!response.ok) {
        if ([400, 404, 409].includes(response.status) && typeof result.code === 'string') {
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

  async function preflight() {
    try {
      const response = await fetch(`${api}/preflight`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(JSON.parse(draft)),
        signal: controller.current?.signal ?? null,
      });
      const result = (await response.json()) as { valid: boolean; errors: PlaygroundFieldError[] };
      if (!response.ok && !Array.isArray(result.errors)) throw new Error(`HTTP ${response.status}`);
      setFieldErrors(result.errors ?? []);
      setMessage(
        result.valid
          ? 'Preflight: сценарий допустим. Сохраните draft перед Validate / Start.'
          : 'Preflight: исправьте указанные поля.',
      );
    } catch {
      setMessage(
        'Не удалось проверить draft. Проверьте JSON и соединение с сервером, затем повторите.',
      );
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
  const blocked = busy || pending !== null || combatPending;
  let parsed: PlaygroundScenario | null = null;
  try {
    const candidate = JSON.parse(draft) as PlaygroundScenario;
    if (isEditableScenario(candidate)) parsed = candidate;
  } catch {
    /* JSON editor retains invalid text. */
  }
  const dirty = sandbox !== undefined && draft !== pretty(sandbox.scenario);
  return (
    <main className="playground">
      <header className="playground-banner">
        <strong>DEBUG · Developer Playground</strong>
        <a href="/">Вернуться в игру</a>
      </header>
      <div className="playground-title">
        <div>
          <p className="playground-eyebrow">WLC-06 · Изолированные эксперименты</p>
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
      {bootstrap?.campaignTimeWorldId && (
        <CampaignTime accountId={bootstrap.accountId} worldId={bootstrap.campaignTimeWorldId} />
      )}
      <p>
        Сохраните и проверьте расстановку, затем нажмите Start. Каждый приказ подтверждает сервер.
        Команды sandbox не изменяют мир кампании.
      </p>
      {message && (
        <p role="status" className="playground-feedback">
          {message}
        </p>
      )}
      {fieldErrors.length > 0 && (
        <ul role="alert">
          {fieldErrors.map((error, index) => (
            <li key={index}>
              <code>{error.field}</code>: {error.message}
            </li>
          ))}
        </ul>
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
      <div className={`playground-layout${inspection?.view ? ' playground-layout--fighting' : ''}`}>
        <aside>
          <details open={!inspection?.view}>
            <summary>Мои sandbox</summary>
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
              TTL: 24 часа с создания. Не более 8 sandbox на аккаунт. Удалённые квитанции
              сохраняются до TTL.
            </p>
          </details>
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
                {!parsed && bootstrap && sandbox.status !== 'active' && (
                  <button disabled={blocked} onClick={() => setDraft(pretty(bootstrap.template))}>
                    Новый шаблон в draft
                  </button>
                )}
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
                  Start · создать encounter
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
              {sandbox.status !== 'active' && bootstrap && parsed && (
                <SandboxSetup
                  scenario={parsed}
                  bootstrap={bootstrap}
                  disabled={blocked}
                  onChange={(value) => {
                    setDraft(pretty(value));
                    setFieldErrors([]);
                  }}
                />
              )}
              <button
                disabled={blocked || sandbox.status === 'active'}
                onClick={() => void preflight()}
              >
                Preflight draft
              </button>
              <details>
                <summary>Scenario JSON · schema {parsed?.schemaRevision ?? '?'}</summary>
                <label className="playground-draft">
                  Scenario JSON
                  <textarea
                    spellCheck={false}
                    value={draft}
                    readOnly={sandbox.status === 'active' || blocked}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                </label>
              </details>
              {inspection?.view && bootstrap && !mapMode && (
                <SandboxCombat
                  key={sandbox.id}
                  api={api}
                  accountId={bootstrap.accountId}
                  inspection={inspection}
                  onInspection={setInspection}
                  onPending={setCombatPending}
                />
              )}
              {mapMode && inspection?.view && (
                <p>
                  Бой активен.{' '}
                  <a href={`/dev/playground/combat${query}`}>Открыть единственный Combat Lab</a> для
                  команд и инспекции.
                </p>
              )}
              <details>
                <summary>Команда, результат и журнал ({inspection?.audit.length ?? 0})</summary>
                <pre>
                  {pretty({
                    command: lastCommand,
                    result: receipt,
                    sessionId: sandbox.id,
                    revision: sandbox.revision,
                    encounterId: inspection?.encounterId,
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
