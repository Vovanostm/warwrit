import { useEffect, useRef, useState } from 'react';
import type {
  MapDeliveryCommand,
  MapDocument,
  MapEditorBootstrap,
  MapEditorResult,
} from '@warwrit/protocol';

const api = `${import.meta.env['VITE_API_BASE_URL'] ?? '/api'}/dev/playground/api/maps`;
const storageKey = 'warwrit.map-delivery.pending.v1';
/** Publishing registers an immutable artifact. Assignment to a game world is outside this API. */
export function MapDelivery() {
  const [boot, setBoot] = useState<MapEditorBootstrap | null>(null);
  const [doc, setDoc] = useState<MapDocument | null>(null),
    [ack, setAck] = useState('');
  const [pending, setPending] = useState<{ owner: string; command: MapDeliveryCommand } | null>(
    null,
  );
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [storageFailed, setStorageFailed] = useState(false);
  const controller = useRef<AbortController | null>(null),
    locked = useRef(false);
  useEffect(() => {
    const c = new AbortController();
    controller.current = c;
    try {
      const text = sessionStorage.getItem(storageKey);
      if (text) {
        const saved = JSON.parse(text) as NonNullable<typeof pending>;
        if (!saved || typeof saved.owner !== 'string' || saved.command?.operation !== 'publish')
          throw new Error('bad request');
        setPending(saved);
      }
    } catch {
      setStorageFailed(true);
      setMessage('Хранилище повторов недоступно. Отправка заблокирована.');
    }
    void fetch(api, { credentials: 'same-origin', signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const b = (await r.json()) as MapEditorBootstrap;
        if (!c.signal.aborted) setBoot(b);
      })
      .catch((e) => {
        if (!c.signal.aborted) setMessage(String(e));
      });
    return () => controller.current?.abort();
  }, []);
  async function publish(retry = false) {
    if (
      !boot ||
      locked.current ||
      storageFailed ||
      (pending && !retry) ||
      (!retry && (!doc || doc.status !== 'Exported' || ack !== 'PUBLISH'))
    )
      return;
    const saved = retry
      ? pending!
      : {
          owner: boot.accountId,
          command: {
            commandId: crypto.randomUUID(),
            operation: 'publish' as const,
            documentId: doc!.id,
            expectedRevision: doc!.revision,
            compatibility: 'new-worlds-only' as const,
            acknowledgement: 'PUBLISH_VERSIONED_CONTENT' as const,
          },
        };
    if (saved.owner !== boot.accountId) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      setStorageFailed(true);
      setMessage('Запрос не отправлен: не удалось сохранить повтор.');
      return;
    }
    setPending(saved);
    setBusy(true);
    locked.current = true;
    const c = new AbortController();
    controller.current?.abort();
    controller.current = c;
    try {
      const r = await fetch(`${api}/delivery`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(saved.command),
        signal: c.signal,
      });
      const result = (await r.json()) as MapEditorResult & { code?: string };
      if (!r.ok) {
        if (r.status >= 400 && r.status < 500) {
          sessionStorage.removeItem(storageKey);
          setPending(null);
        }
        throw new Error(result.code ?? `HTTP ${r.status}`);
      }
      if (
        result.commandId !== saved.command.commandId ||
        result.document?.id !== saved.command.documentId ||
        result.document.status !== 'Published' ||
        !result.artifact
      )
        throw new Error('Ответ не подтверждает публикацию. Повторите запрос.');
      sessionStorage.removeItem(storageKey);
      setPending(null);
      setDoc(result.document);
      setAck('');
      setMessage(
        `Published: ${result.artifact.source.documentId}@${result.artifact.source.revision}. Неизменяемый artifact зарегистрирован; действующие миры не затронуты.`,
      );
      setBoot({
        ...boot,
        documents: boot.documents.map((d) => (d.id === result.document.id ? result.document : d)),
      });
    } catch (e) {
      if (!c.signal.aborted) setMessage(e instanceof Error ? e.message : 'Ответ потерян.');
    } finally {
      if (!c.signal.aborted) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <main className="playground map-editor">
      <header className="playground-banner">
        <strong>DEBUG · Content delivery</strong>
        <a href="/dev/playground/maps">Вернуться в Map Editor</a>
      </header>
      <h1>Публикация версии карты</h1>
      <p>
        Отдельный шаг после экспорта. Публикация закрепляет immutable artifact в каталоге подготовки
        контента. Выбор версии для нового игрового мира требует отдельной настройки запуска; этот
        API не меняет миры и их revision references.
      </p>
      <p>
        Совместимость: только новые миры · текущие content IDs и правила · без переназначения
        существующих миров.
      </p>
      <p role="status" className="playground-feedback">
        {message}
      </p>
      {pending && (
        <p role="alert">
          Ответ не подтверждён.{' '}
          <button
            disabled={busy || pending.owner !== boot?.accountId}
            onClick={() => void publish(true)}
          >
            Повторить ту же публикацию
          </button>
        </p>
      )}
      <label>
        Экспортированная карта{' '}
        <select
          disabled={busy || !!pending || storageFailed}
          value={doc?.id ?? ''}
          onChange={(e) => {
            setDoc(boot?.documents.find((d) => d.id === e.target.value) ?? null);
            setAck('');
          }}
        >
          <option value="">Выберите artifact…</option>
          {boot?.documents
            .filter((d) => d.status === 'Exported' || d.status === 'Published')
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.content.name} · {d.status} · r{d.revision}
              </option>
            ))}
        </select>
      </label>
      {doc && (
        <>
          <p>
            Источник: {doc.id} · revision {doc.revision} · {doc.content.contentRevision}
          </p>
          <details>
            <summary>Проверить содержимое artifact</summary>
            <pre>{JSON.stringify(doc.content, null, 2)}</pre>
          </details>
          <label>
            Введите PUBLISH для отдельной публикации{' '}
            <input
              aria-label="Подтверждение публикации"
              disabled={busy || !!pending || doc.status === 'Published'}
              value={ack}
              onChange={(e) => setAck(e.target.value)}
            />
          </label>
          <button
            disabled={
              busy || !!pending || storageFailed || doc.status !== 'Exported' || ack !== 'PUBLISH'
            }
            onClick={() => void publish()}
          >
            Опубликовать versioned artifact
          </button>
        </>
      )}
    </main>
  );
}
