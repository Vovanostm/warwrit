import { useRef, useState } from 'react';
import type { CompanyHoldingsDto, CompanySummaryDto } from '@warwrit/protocol';
import { conditionLabel } from './format.js';
import './company-recovery.css';
import {
  clearBrowserCompanyRosterAttempt,
  persistBrowserCompanyRosterAttempt,
  postCompanyRosterAttempt,
  readBrowserCompanyRosterAttempt,
  type CompanyRosterAttempt,
} from './company-roster-attempt.js';

const api = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');

/** Mounted per account/company so an old reply cannot change another company's controls. */
export function CompanyRecoveryPanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto;
  readonly onRefresh: () => void;
  readonly refreshBusy?: boolean;
  readonly refreshMessage?: string;
}) {
  const scope = { accountId: props.accountId, companyId: props.company.companyId };
  const [pending, setPending] = useState<CompanyRosterAttempt | undefined>(() => {
    const restored = readBrowserCompanyRosterAttempt(scope, 'SetAssignment');
    return restored.kind === 'AVAILABLE' ? restored.attempt : undefined;
  });
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState<string>();

  function prepare(characterId: string, assignment: 'FIELD' | 'RECOVERY') {
    const saved = persistBrowserCompanyRosterAttempt(scope, {
      schemaVersion: 2,
      commandId: crypto.randomUUID(),
      expectedPublicRevision: props.company.revision,
      type: 'SetAssignment',
      payload: { characterId, assignment },
    });
    if (saved.kind === 'SAVED' || saved.kind === 'EXISTING') {
      setPending(saved.attempt);
      return saved.kind === 'SAVED' ? saved.attempt : undefined;
    }
    setMessage('Не удалось сохранить приказ. Он не отправлен; проверьте доступ к хранилищу.');
    return undefined;
  }

  async function send(attempt: CompanyRosterAttempt | undefined) {
    if (!attempt || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await postCompanyRosterAttempt(api, attempt);
      if (result === 'UNKNOWN' || result === 'UNAUTHENTICATED') {
        setMessage(
          result === 'UNKNOWN'
            ? 'Ответ неизвестен. Повторите тот же приказ.'
            : 'Войдите снова и повторите тот же приказ.',
        );
        return;
      }
      if (!clearBrowserCompanyRosterAttempt(attempt)) {
        setMessage('Ответ получен. Повторите приказ, чтобы подтвердить сохранённый результат.');
        return;
      }
      setPending(undefined);
      setMessage(
        result === 'ACCEPTED'
          ? 'Назначение сохранено.'
          : 'Приказ отклонён. Обновите сведения и проверьте доступность бойца.',
      );
      props.onRefresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="company-care company-recovery" aria-label="Восстановление отряда">
      <h3 className="panel-subtitle">Восстановление</h3>
      <p className="state-note">
        Назначьте бойцу отдых. Для восстановления нужны время, еда и покой; тяжёлую рану сначала
        должен обработать врач. Место в отряде сохраняется.
      </p>
      <button
        type="button"
        className="action"
        disabled={props.refreshBusy}
        onClick={props.onRefresh}
      >
        {props.refreshBusy ? 'Обновляем состояние…' : 'Обновить состояние отряда'}
      </button>
      {props.refreshMessage && (
        <p role="status" className="state-note">
          {props.refreshMessage}
        </p>
      )}
      {!props.holdings.people.some((person) => !person.fallen && person.recovery) && (
        <p className="state-note">Сведения о назначениях пока недоступны. Обновите состояние.</p>
      )}
      <ul className="supplies">
        {props.holdings.people
          .filter((person) => !person.fallen && person.recovery)
          .map((person) => {
            const recovery = person.recovery!;
            const name =
              props.company.characters.find((entry) => entry.characterId === person.characterId)
                ?.name ?? 'Участник';
            return (
              <li key={person.characterId}>
                <div className="company-recovery-person">
                  <span>
                    {name} ·{' '}
                    {recovery.assignment === 'RECOVERY'
                      ? 'на восстановлении'
                      : recovery.assignment === 'FIELD'
                        ? 'в строю'
                        : 'другое назначение'}
                    {person.currentHealth !== null && person.maximumHealth !== null
                      ? ` · ${person.currentHealth}/${person.maximumHealth}`
                      : ''}
                  </span>
                  <p className="state-note">
                    {person.conditions.length
                      ? person.conditions.map(conditionLabel).join(', ')
                      : 'Известных ран и болезней нет.'}
                  </p>
                </div>
                {(recovery.canRest || recovery.canReturnToField) && (
                  <button
                    type="button"
                    className="gear-action"
                    aria-label={`${recovery.canReturnToField ? 'Вернуть в строй' : 'Назначить отдых'}: ${name}`}
                    disabled={busy || pending !== undefined || props.company.runStatus !== 'ACTIVE'}
                    onClick={() => {
                      if (!pending && !lock.current)
                        void send(
                          prepare(
                            person.characterId,
                            recovery.canReturnToField ? 'FIELD' : 'RECOVERY',
                          ),
                        );
                    }}
                  >
                    {recovery.canReturnToField ? 'Вернуть в строй' : 'Назначить отдых'}
                  </button>
                )}
              </li>
            );
          })}
      </ul>
      {pending && (
        <div role="status">
          <p>
            {busy
              ? 'Отправляем сохранённый приказ…'
              : 'Ответ на сохранённый приказ неизвестен. Выше показано последнее известное назначение. Точный повтор подтвердит этот приказ без нового назначения.'}
          </p>
          <button
            type="button"
            className="action"
            disabled={busy}
            onClick={() => void send(pending)}
          >
            Повторить то же назначение
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="state-note">
          {message}
        </p>
      )}
    </section>
  );
}
