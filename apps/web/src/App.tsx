import { useEffect, useState } from 'react';

import { PROTOCOL_VERSION, type HealthResponse } from '@warwrit/protocol';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';

type ConnectionState = 'checking' | 'ready' | 'unavailable';

export function App() {
  const [connection, setConnection] = useState<ConnectionState>('checking');

  useEffect(() => {
    const controller = new AbortController();

    async function checkServer(): Promise<void> {
      try {
        const response = await fetch(`${apiBaseUrl}/health/live`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setConnection('unavailable');
          return;
        }
        const health = (await response.json()) as HealthResponse;
        setConnection(health.status === 'ok' ? 'ready' : 'unavailable');
      } catch {
        if (!controller.signal.aborted) {
          setConnection('unavailable');
        }
      }
    }

    void checkServer();
    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <p className="eyebrow">WP-00 · Engineering Foundation</p>
      <h1>Warwrit</h1>
      <p className="summary">
        The browser shell is wired to versioned protocol contracts. Gameplay is intentionally
        outside this work package.
      </p>
      <dl className="status-grid">
        <div>
          <dt>Protocol</dt>
          <dd>{PROTOCOL_VERSION}</dd>
        </div>
        <div>
          <dt>Server</dt>
          <dd data-connection={connection}>{connection}</dd>
        </div>
      </dl>
    </main>
  );
}
