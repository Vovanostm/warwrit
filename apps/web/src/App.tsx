import { useEffect, useState } from 'react';

import { PROTOCOL_VERSION, type HealthResponse } from '@warwrit/protocol';
import { CombatLab } from './combat-lab/CombatLab.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';

type ConnectionState = 'checking' | 'ready' | 'unavailable';

export function App() {
  const [connection, setConnection] = useState<ConnectionState>('checking');
  const combatLabEnabled = import.meta.env.DEV && import.meta.env['VITE_COMBAT_LAB'] === '1';
  const isCombatLab = combatLabEnabled && window.location.pathname === '/combat-lab';

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

  if (isCombatLab) return <CombatLab />;

  return (
    <main className="shell">
      <p className="eyebrow">WP-00 · Engineering Foundation</p>
      <h1>Warwrit</h1>
      <p className="summary">
        The browser shell is wired to versioned protocol contracts. Gameplay is intentionally
        outside this work package.
      </p>
      {combatLabEnabled && (
        <p>
          <a href="/combat-lab">Открыть локальную лабораторию боя</a>
        </p>
      )}
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
