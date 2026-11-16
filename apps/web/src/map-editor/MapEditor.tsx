import { useEffect, useRef, useState } from 'react';
import type {
  MapArtifact,
  MapContent,
  MapDocument,
  MapEditorBootstrap,
  MapEditorCommand,
  MapEditorResult,
  MapIssue,
  MapPoint,
  MapPreview,
} from '@warwrit/protocol';
import { BattleEditor } from '../combat-lab/BattleEditor.js';
import { BattleView } from '../combat-lab/BattleView.js';
import { WorldEditor } from './WorldEditor.js';
import '../playground/playground.css';
import './map-editor.css';
import { MapDelivery } from './MapDelivery.js';

const api = `${import.meta.env['VITE_API_BASE_URL'] ?? '/api'}/dev/playground/api/maps`;
const pretty = (v: unknown) => JSON.stringify(v, null, 2);
const key = 'warwrit.map-editor.pending.v1';
interface Pending {
  readonly owner: string;
  readonly path: '/commands' | '/import';
  readonly body: MapEditorCommand | { readonly commandId: string; readonly artifact: MapArtifact };
}
async function request<T>(path: string, signal: AbortSignal, body?: unknown): Promise<T> {
  const r = await fetch(`${api}${path}`, {
    credentials: 'same-origin',
    signal,
    ...(body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  const data = (await r.json()) as T & { code?: string };
  if (!r.ok) throw Object.assign(new Error(data.code ?? `HTTP ${r.status}`), { status: r.status });
  return data;
}
export function MapEditor() {
  if (new URLSearchParams(window.location.search).get('delivery') === '1') return <MapDelivery />;
  return <MapAuthoring />;
}

function MapAuthoring() {
  const [boot, setBoot] = useState<MapEditorBootstrap | null>(null);
  const [doc, setDoc] = useState<MapDocument | null>(null),
    [content, setContent] = useState<MapContent | null>(null);
  const [mode, setMode] = useState<MapContent['kind']>('world');
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const [pending, setPending] = useState<Pending | null>(null),
    [storageFailed, setStorageFailed] = useState(false);
  const [preview, setPreview] = useState<MapPreview | null>(null),
    [selectedIssue, setSelectedIssue] = useState<MapIssue | null>(null);
  const [deployment, setDeployment] = useState('');
  const controller = useRef<AbortController | null>(null),
    locked = useRef(false);
  const importFile = useRef<HTMLInputElement>(null);
  const dirty = !!doc && !!content && pretty(doc.content) !== pretty(content);
  const blocked = busy || !!pending || storageFailed;
  const frozen = doc?.status === 'Published';
  const issues = dirty ? [] : (preview?.issues ?? doc?.issues ?? []);
  function select(d: MapDocument | null) {
    setDoc(d);
    setContent(d?.content ?? null);
    if (d) setMode(d.content.kind);
    setPreview(null);
    setSelectedIssue(null);
    window.history.replaceState(null, '', `/dev/playground/maps${d ? `?map=${d.id}` : ''}`);
  }
  async function refresh(signal: AbortSignal, id?: string) {
    const next = await request<MapEditorBootstrap>('', signal);
    if (signal.aborted) return;
    setBoot(next);
    const selected = id ?? new URLSearchParams(window.location.search).get('map');
    select(next.documents.find((d) => d.id === selected) ?? null);
  }
  useEffect(() => {
    const c = new AbortController();
    controller.current = c;
    try {
      const text = sessionStorage.getItem(key);
      if (text) {
        const p = JSON.parse(text) as Pending;
        if (
          !p ||
          typeof p.owner !== 'string' ||
          !['/commands', '/import'].includes(p.path) ||
          !p.body ||
          typeof p.body.commandId !== 'string'
        )
          throw new Error('Сохранённый запрос повреждён.');
        setPending(p);
      }
    } catch {
      setStorageFailed(true);
      setMessage(
        'Хранилище повторов недоступно. Команды заблокированы; проверьте сохранённое состояние.',
      );
    }
    void refresh(c.signal).catch((e) => {
      if (!c.signal.aborted)
        setMessage(
          `Доступ к редактору: ${e instanceof Error ? e.message : 'сервер недоступен'}. Войдите в игру аккаунтом из allowlist.`,
        );
    });
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (content?.kind === 'battle') setDeployment(pretty(content.deployment));
  }, [content]);
  async function mutate(path: Pending['path'], body: Pending['body'], retry = false) {
    if (!boot || locked.current || storageFailed || (pending && !retry)) return;
    const saved = retry ? pending! : { owner: boot.accountId, path, body };
    if (saved.owner !== boot.accountId) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(saved));
    } catch {
      setStorageFailed(true);
      setMessage('Запрос не отправлен: хранилище повторов недоступно.');
      return;
    }
    setPending(saved);
    setBusy(true);
    locked.current = true;
    setMessage('');
    setPreview(null);
    const c = new AbortController();
    controller.current?.abort();
    controller.current = c;
    try {
      const result = await request<MapEditorResult>(saved.path, c.signal, saved.body);
      if (
        result.commandId !== saved.body.commandId ||
        !result.document?.id ||
        !Number.isSafeInteger(result.document.revision)
      )
        throw new Error('Ответ не подтверждает команду. Повторите тот же запрос.');
      sessionStorage.removeItem(key);
      setPending(null);
      await refresh(c.signal, result.document.id);
      setMessage(
        result.document.issues.length
          ? `Draft сохранён. Ошибок: ${result.document.issues.length}.`
          : `Сервер подтвердил: ${result.document.status}.`,
      );
      if (result.artifact) download(result.artifact);
    } catch (e) {
      if (c.signal.aborted) return;
      if (
        e &&
        typeof e === 'object' &&
        'status' in e &&
        Number(e.status) >= 400 &&
        Number(e.status) < 500
      ) {
        try {
          sessionStorage.removeItem(key);
          setPending(null);
        } catch {
          setStorageFailed(true);
        }
      }
      setMessage(e instanceof Error ? e.message : 'Ответ потерян. Повторите тот же запрос.');
    } finally {
      if (!c.signal.aborted) {
        setBusy(false);
        locked.current = false;
      }
    }
  }
  function send(operation: MapEditorCommand['operation']) {
    if (operation !== 'create' && !doc) return;
    const value = operation === 'create' ? boot?.templates.find((t) => t.kind === mode) : content;
    if (!value) return;
    void mutate('/commands', {
      commandId: crypto.randomUUID(),
      operation,
      ...(operation === 'create' ? {} : { documentId: doc!.id, expectedRevision: doc!.revision }),
      ...(['create', 'save'].includes(operation) ? { content: value } : {}),
    });
  }
  function download(a: MapArtifact) {
    const url = URL.createObjectURL(new Blob([pretty(a)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `warwrit-map-${a.source.documentId}-r${a.source.revision}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function inspect(from?: MapPoint, to?: MapPoint) {
    if (!doc || dirty || blocked || locked.current) return;
    setBusy(true);
    locked.current = true;
    setPreview(null);
    setMessage('Проверка серверной геометрии…');
    const c = new AbortController();
    controller.current?.abort();
    controller.current = c;
    try {
      const p = await request<MapPreview>(`/${doc.id}/preview`, c.signal, {
        revision: doc.revision,
        ...(from && to ? { from, to } : {}),
      });
      if (p.revision !== doc.revision) throw new Error('STALE_REVISION');
      setPreview(p);
      setMessage(
        p.issues.length
          ? `Ошибок: ${p.issues.length}. Preview не публикует контент.`
          : p.durationUs
            ? `Маршрут сервера: ${(Number(p.durationUs) / 1000000).toFixed(1)} с игрового времени.`
            : 'Preview готов. Мир не изменён.',
      );
    } catch (e) {
      if (!c.signal.aborted) setMessage(e instanceof Error ? e.message : 'Preview недоступен.');
    } finally {
      if (!c.signal.aborted) {
        setBusy(false);
        locked.current = false;
      }
    }
  }
  function change(c: MapContent) {
    setContent(c);
    setPreview(null);
    setSelectedIssue(null);
  }
  return (
    <main className="playground map-editor">
      <header className="playground-banner">
        <strong>DEBUG · Developer Playground</strong>
        <a
          href="/"
          onClick={(e) => {
            if (dirty) {
              e.preventDefault();
              setMessage('Сохраните или отмените изменения перед выходом.');
            }
          }}
        >
          Вернуться в игру
        </a>
      </header>
      <div className="playground-title">
        <h1>Map Editor</h1>
        <nav>
          <a
            href="/dev/playground/combat"
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                setMessage('Сохраните или отмените изменения перед выходом.');
              }
            }}
          >
            Combat Lab
          </a>
          <a
            href="/dev/playground/maps?delivery=1"
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                setMessage('Сохраните или отмените изменения перед выходом.');
              }
            }}
          >
            Content delivery
          </a>
          <a
            aria-current="page"
            href="/dev/playground/maps"
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                setMessage('Сохраните или отмените изменения перед выходом.');
              }
            }}
          >
            Map Editor
          </a>
        </nav>
      </div>
      <p>World Map / Battle Map · Atlas v6 · Аккаунт: {boot?.accountId ?? 'проверка доступа'}</p>
      <p>
        Draft → Validated → Exported → Published. Публикация — отдельная процедура content delivery.
        Редактор не меняет активные миры.
      </p>
      <p className="playground-feedback" role="status">
        {message}
      </p>
      {pending && (
        <div role="alert" className="playground-feedback">
          Ответ не подтверждён. Новые команды заблокированы.{' '}
          <button
            disabled={busy || pending.owner !== boot?.accountId}
            onClick={() => void mutate(pending.path, pending.body, true)}
          >
            Повторить тот же запрос
          </button>
        </div>
      )}
      <div className="map-toolbar">
        <label>
          Режим{' '}
          <select
            aria-label="Режим редактора"
            disabled={blocked || dirty}
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as MapContent['kind']);
              select(null);
              setMode(e.target.value as MapContent['kind']);
            }}
          >
            <option value="world">World Map</option>
            <option value="battle">Battle Map</option>
          </select>
        </label>
        <label>
          Карты{' '}
          <select
            aria-label="Сохранённая карта"
            value={doc?.id ?? ''}
            disabled={blocked || dirty}
            onChange={(e) => select(boot?.documents.find((d) => d.id === e.target.value) ?? null)}
          >
            <option value="">Выберите draft…</option>
            {boot?.documents
              .filter((d) => d.content.kind === mode)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.content.name} · {d.status} · r{d.revision}
                </option>
              ))}
          </select>
        </label>
        <button disabled={!boot || blocked || dirty} onClick={() => send('create')}>
          Новый draft
        </button>
        <button disabled={!doc || blocked || dirty} onClick={() => send('clone')}>
          Клонировать
        </button>
        <button disabled={!boot || blocked || dirty} onClick={() => importFile.current?.click()}>
          Импорт artifact v1
        </button>
        <button
          disabled={blocked || dirty}
          onClick={() => {
            const c = new AbortController();
            controller.current?.abort();
            controller.current = c;
            void refresh(c.signal).catch((e) => setMessage(String(e)));
          }}
        >
          Перечитать сервер
        </button>
        <input
          hidden
          type="file"
          ref={importFile}
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 512 * 1024) {
              setMessage('Файл превышает 512 КБ.');
              return;
            }
            void f
              .text()
              .then((t) => {
                const artifact = JSON.parse(t) as MapArtifact;
                return mutate('/import', { commandId: crypto.randomUUID(), artifact });
              })
              .catch(() => setMessage('Некорректный JSON artifact.'));
          }}
        />
      </div>
      {!doc && (
        <p>
          Создайте независимый draft из{' '}
          {mode === 'world' ? 'актуального атласа v6' : 'текущего боевого каталога'} или
          импортируйте versioned artifact.
        </p>
      )}
      {doc && content && (
        <>
          <div className="map-toolbar">
            <label>
              Название{' '}
              <input
                aria-label="Название draft"
                maxLength={100}
                value={content.name}
                disabled={blocked || frozen}
                onChange={(e) => change({ ...content, name: e.target.value })}
              />
            </label>
            <strong>
              {doc.status} · r{doc.revision}
            </strong>
            <button disabled={blocked || frozen || !dirty} onClick={() => send('save')}>
              Сохранить draft
            </button>
            <button disabled={blocked || frozen || dirty} onClick={() => send('validate')}>
              Validate
            </button>
            <button disabled={blocked || dirty} onClick={() => void inspect()}>
              Preview
            </button>
            <button
              disabled={blocked || frozen || dirty || doc.status === 'Draft'}
              onClick={() => send('export')}
            >
              Экспорт artifact v1
            </button>
            <button
              disabled={blocked || frozen || !dirty}
              onClick={() => {
                change(doc.content);
                setMessage('Несохранённые изменения отменены.');
              }}
            >
              Отменить изменения
            </button>
            <button disabled={blocked || frozen || dirty} onClick={() => send('delete')}>
              Удалить draft
            </button>
          </div>
          {dirty && (
            <p className="playground-feedback">
              Есть несохранённые изменения. Сохраните draft перед validation, preview и export.
            </p>
          )}
          <section className="map-validation" aria-label="Ошибки карты">
            <h2>Validation · {issues.length}</h2>
            <ul>
              {issues.map((i, n) => (
                <li key={n}>
                  <button onClick={() => setSelectedIssue(i)}>
                    {i.code} · {i.objectId}: {i.message}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {content.kind === 'world' ? (
            <WorldEditor
              key={doc.id}
              content={content}
              onChange={change}
              issues={issues}
              preview={preview}
              disabled={blocked || frozen}
              onRoute={(a, b) => void inspect(a, b)}
              selectedIssue={selectedIssue}
              canPreview={!dirty && !blocked}
              knownSites={boot?.templates.find((t) => t.kind === 'world')?.region.sites ?? []}
              atlasUrl={`${api}/atlas-v6.png`}
            />
          ) : (
            <>
              {boot && (
                <BattleEditor
                  managed
                  catalog={boot.catalog}
                  value={content.battle}
                  disabled={blocked || frozen}
                  onChange={(battle) => change({ ...content, battle })}
                  focusHex={selectedIssue?.hex ?? null}
                  cellMarkers={[
                    ...content.deployment.flatMap((d) =>
                      d.hexes.map((h) => ({ ...h, label: d.sideId, error: false })),
                    ),
                    ...issues
                      .filter((i) => i.hex)
                      .map((i) => ({ ...i.hex!, label: i.code, error: true })),
                  ]}
                />
              )}
              <section className="map-deployment">
                <h3>Deployment zones</h3>
                <p>
                  Spawns — позиции участников. Все spawns должны попадать в зону своей стороны;
                  препятствия запрещены.
                </p>
                <label>
                  Зоны по сторонам · q/r
                  <textarea
                    aria-label="Deployment JSON"
                    value={deployment}
                    disabled={blocked || frozen}
                    onChange={(e) => setDeployment(e.target.value)}
                  />
                </label>
                <button
                  disabled={blocked || frozen}
                  onClick={() => {
                    try {
                      const d = JSON.parse(deployment) as typeof content.deployment;
                      if (
                        !Array.isArray(d) ||
                        d.length !== 2 ||
                        d.some(
                          (z) =>
                            !z ||
                            !['human', 'opponent'].includes(z.sideId) ||
                            !Array.isArray(z.hexes) ||
                            z.hexes.some(
                              (h: { q: number; r: number }) =>
                                !h ||
                                !Number.isInteger(h.q) ||
                                !Number.isInteger(h.r) ||
                                h.q < 0 ||
                                h.q > 14 ||
                                h.r < 0 ||
                                h.r > 10,
                            ),
                        )
                      )
                        throw new Error('invalid');
                      change({ ...content, deployment: d });
                    } catch {
                      setMessage('Некорректные deployment zones.');
                    }
                  }}
                >
                  Применить зоны
                </button>
                <button
                  disabled={blocked || frozen}
                  onClick={() =>
                    change({
                      ...content,
                      deployment: (['human', 'opponent'] as const).map((sideId) => ({
                        sideId,
                        hexes: content.battle.units
                          .filter((u) => u.sideId === sideId)
                          .map((u) => u.position),
                      })),
                    })
                  }
                >
                  Зоны из текущих spawns
                </button>
              </section>
              {preview?.view && (
                <div className="playground-scene">
                  <BattleView
                    key={`${doc.id}:${doc.revision}`}
                    view={preview.view}
                    selectedUnitId={null}
                    selectedHex={null}
                    busy
                    onSelectUnit={() => {}}
                    onSelectHex={() => {}}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
