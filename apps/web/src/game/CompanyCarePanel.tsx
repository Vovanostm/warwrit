import { useEffect, useRef, useState } from 'react';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanyHoldingsDto,
  type CompanySummaryDto,
} from '@warwrit/protocol';
import { conditionLabel, itemLabel } from './format.js';
import {
  classifyCompanyCarePost,
  readCompanyCareAttempt,
  type CompanyCareAttempt,
} from './company-care-attempt.js';
import './company-care.css';

const api = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');

export function CompanyCarePanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto;
  readonly onRefresh: () => void;
}) {
  const storageKey = `warwrit:company-care:${props.accountId}:${props.company.companyId}`;
  const lock = useRef(false);
  const [stored, setStored] = useState<{
    readonly key: string;
    readonly request: CompanyCareAttempt;
  }>();
  const pending = stored?.key === storageKey ? stored.request : undefined;
  const [treatmentId, setTreatmentId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [resourceItemId, setResourceItemId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const treatments = props.holdings.care?.treatments ?? [];
  const treatment = treatments.find((entry) => entry.conditionId === treatmentId) ?? treatments[0];
  const provider =
    treatment?.providers.find((entry) => entry.characterId === providerId) ??
    treatment?.providers[0];
  const material =
    treatment?.materials.find((entry) => entry.itemId === resourceItemId) ??
    treatment?.materials[0];

  useEffect(() => {
    try {
      const request = readCompanyCareAttempt(
        sessionStorage.getItem(storageKey),
        props.accountId,
        props.company.companyId,
      );
      setStored(request ? { key: storageKey, request } : undefined);
    } catch {
      setStored(undefined);
    }
  }, [storageKey, props.accountId, props.company.companyId]);

  async function applyCare(retry = false) {
    if (lock.current || (!pending && props.company.runStatus !== 'ACTIVE')) return;
    let request = pending;
    if (!request && !retry && treatment && provider && material) {
      request = {
        schemaVersion: 2,
        commandId: crypto.randomUUID(),
        expectedPublicRevision: props.company.revision,
        type: 'ApplyCare',
        payload: {
          characterId: treatment.characterId,
          conditionId: treatment.conditionId,
          providerId: provider.characterId,
          resourceItemId: material.itemId,
        },
      };
    }
    if (!request) return;
    lock.current = true;
    setBusy(true);
    setMessage(undefined);
    try {
      if (!pending) {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            accountId: props.accountId,
            companyId: props.company.companyId,
            request,
          }),
        );
        setStored({ key: storageKey, request });
      }
      const response = await fetch(`${api}/company/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: props.company.companyId,
        },
        body: JSON.stringify(request),
      });
      const result = classifyCompanyCarePost(
        response.status,
        await response.json().catch(() => undefined),
        request.commandId,
      );
      if (result === 'UNKNOWN') {
        setMessage('Ответ о лечении неизвестен. Повторите тот же приказ.');
        return;
      }
      if (result === 'UNAUTHENTICATED') {
        setMessage('Войдите снова и повторите тот же приказ о лечении.');
        return;
      }
      sessionStorage.removeItem(storageKey);
      setStored(undefined);
      setMessage(
        result === 'ACCEPTED'
          ? 'Уход проведён. Рана сможет восстанавливаться со временем.'
          : 'Уход не выполнен. Проверьте состояние отряда и доступность перевязочного набора.',
      );
      props.onRefresh();
    } catch {
      setMessage('Ответ о лечении неизвестен. Повторите тот же приказ.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function characterName(characterId: string) {
    return (
      props.company.characters.find((entry) => entry.characterId === characterId)?.name ??
      'участник'
    );
  }

  return (
    <section className="company-care" aria-label="Уход за ранами">
      <h3 className="panel-subtitle">Уход за ранами</h3>
      <p className="state-note">
        Перевязка расходует один медицинский набор и позволяет ране восстанавливаться со временем.
        Здоровье сразу не восстанавливается.
      </p>
      {pending ? (
        <div role="status">
          <p>Приказ о лечении ещё не подтверждён. Повторите его без изменений.</p>
          <button className="action" disabled={busy} onClick={() => void applyCare(true)}>
            Повторить тот же приказ
          </button>
        </div>
      ) : treatment && provider && material ? (
        <div className="company-care-fields">
          <label>
            <span>Раненый</span>
            <select
              aria-label="Раненый"
              value={treatment.conditionId}
              onChange={(event) => {
                setTreatmentId(event.target.value);
                setProviderId('');
                setResourceItemId('');
              }}
            >
              {treatments.map((entry) => (
                <option key={entry.conditionId} value={entry.conditionId}>
                  {characterName(entry.characterId)} · {conditionLabel(entry.definitionId)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Врач отряда</span>
            <select
              aria-label="Врач отряда"
              value={provider.characterId}
              onChange={(event) => setProviderId(event.target.value)}
            >
              {treatment.providers.map((entry) => (
                <option key={entry.characterId} value={entry.characterId}>
                  {characterName(entry.characterId)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Материал</span>
            <select
              aria-label="Медицинский набор"
              value={material.itemId}
              onChange={(event) => setResourceItemId(event.target.value)}
            >
              {treatment.materials.map((entry) => (
                <option key={entry.itemId} value={entry.itemId}>
                  {itemLabel(entry.definitionId)} · {entry.quantity} шт.
                </option>
              ))}
            </select>
          </label>
          <button
            className="action"
            disabled={busy || props.company.runStatus !== 'ACTIVE'}
            onClick={() => void applyCare()}
          >
            Провести уход
          </button>
        </div>
      ) : (
        <p className="state-note">
          Нет известной раны, которую можно лечить здесь, или рядом нет способного врача и
          доступного набора.
        </p>
      )}
      {message && (
        <p role="status" className="state-note">
          {message}
        </p>
      )}
    </section>
  );
}
