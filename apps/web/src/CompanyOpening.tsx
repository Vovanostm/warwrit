import { useState, type FormEvent } from 'react';

import type { CompanyOpeningOptionsResponseDto } from '@warwrit/protocol';

type Opening = CompanyOpeningOptionsResponseDto['opening'];

export function CompanyOpening(props: {
  readonly opening: Opening;
  readonly accountId: string;
  readonly pendingAttempt: boolean;
  readonly onRetryPending: (accountId: string) => Promise<void>;
  readonly onCreate: (
    opening: Opening,
    input: {
      readonly name: string;
      readonly leaderName: string;
      readonly selectedCandidateIds: string[];
    },
    accountId: string,
  ) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidateIds((selected) =>
      selected.includes(candidateId)
        ? selected.filter((id) => id !== candidateId)
        : selected.length < props.opening.selection.maxCount
          ? [...selected, candidateId]
          : selected,
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || selectedCandidateIds.length < props.opening.selection.minCount) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await props.onCreate(
        props.opening,
        { name, leaderName, selectedCandidateIds },
        props.accountId,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось открыть компанию.');
      setSubmitting(false);
    }
  };

  const retryPending = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await props.onRetryPending(props.accountId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось повторить сохранение.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="journey-message">
        <p className="eyebrow">Новое начало · {props.opening.homeland.label}</p>
        <h1>Соберите компанию</h1>
        <p className="summary">
          {props.opening.origin.label}, {props.opening.culture.label}. Выберите от одного до двух
          спутников, назовите главу и компанию. Мир и начальные условия задаёт сервер.
        </p>
      </div>
      <form className="opening-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="opening-candidates" disabled={submitting || props.pendingAttempt}>
          <legend>Кто отправится с вами</legend>
          <div className="candidate-list">
            {props.opening.candidates.map((candidate) => {
              const checked = selectedCandidateIds.includes(candidate.characterId);
              const full = selectedCandidateIds.length >= props.opening.selection.maxCount;
              return (
                <label className="candidate-choice" key={candidate.characterId}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && full}
                    onChange={() => toggleCandidate(candidate.characterId)}
                  />
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.sex === 'female' ? 'Спутница' : 'Спутник'}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="opening-field">
          Имя главы
          <input
            autoComplete="off"
            maxLength={48}
            name="leaderName"
            required
            value={leaderName}
            onChange={(event) => setLeaderName(event.currentTarget.value)}
            disabled={submitting || props.pendingAttempt}
          />
        </label>
        <label className="opening-field">
          Название компании
          <input
            autoComplete="off"
            maxLength={64}
            name="companyName"
            required
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            disabled={submitting || props.pendingAttempt}
          />
        </label>
        <p className="opening-origin">
          История семьи: {props.opening.familyStory.label}. Знамя и остальные исходные условия
          устанавливаются по правилам этого начала.
        </p>
        {error !== undefined && (
          <p className="opening-error" role="alert">
            {error}
          </p>
        )}
        {props.pendingAttempt ? (
          <button
            className="primary-action button-action"
            type="button"
            disabled={submitting}
            onClick={() => void retryPending()}
          >
            {submitting ? 'Повторяем сохранение…' : 'Повторить сохранение компании'}
          </button>
        ) : (
          <button
            className="primary-action button-action"
            type="submit"
            disabled={
              submitting ||
              name.trim().length === 0 ||
              leaderName.trim().length === 0 ||
              selectedCandidateIds.length < props.opening.selection.minCount
            }
          >
            {submitting ? 'Сохраняем компанию…' : 'Открыть компанию'}
          </button>
        )}
      </form>
    </>
  );
}
