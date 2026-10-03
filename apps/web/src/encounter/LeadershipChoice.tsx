import { useCallback, useEffect, useState } from 'react';

import type { EncounterLeadershipDto } from '@warwrit/protocol';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';

/** After a lost leader, the owner names a successor; the server applies it with the outcome. */
export function LeadershipChoice(props: { readonly encounterId: string }) {
  const [view, setView] = useState<EncounterLeadershipDto | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const url = `${apiBaseUrl}/encounters/${encodeURIComponent(props.encounterId)}/leadership`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;
      setView((await response.json()) as EncounterLeadershipDto);
    } catch {
      // The next poll retries; the outcome does not change while waiting.
    }
  }, [url]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  if (!view?.required) return null;
  const choose = async (candidateId: string) => {
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, candidateId, mode: 'PERMANENT' }),
      });
      setMessage(
        response.ok
          ? 'Выбор записан. Сервер применит последствия боя вместе с ним.'
          : 'Сервер не принял выбор. Обновите и попробуйте другого кандидата.',
      );
      await load();
    } catch {
      setMessage('Нет связи. Выбор не подтверждён — повторите.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="leadership-choice" role="alert">
      <h3>Глава компании погиб</h3>
      <p>
        Последствия боя ждут вашего решения: кто поведёт компанию дальше. Наследник сам не
        назначается.
      </p>
      {view.candidates.length === 0 ? (
        <p className="state-note">Живых кандидатов нет; сервер завершит путь компании.</p>
      ) : (
        <ul>
          {view.candidates.map((candidate) => (
            <li key={candidate.characterId}>
              <button
                type="button"
                className="action action-primary"
                disabled={busy}
                onClick={() => void choose(candidate.characterId)}
              >
                {candidate.name}
                {view.chosen?.candidateId === candidate.characterId ? ' · выбран' : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="state-note">{message}</p>}
    </div>
  );
}
