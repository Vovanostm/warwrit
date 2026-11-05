import { useEffect, useRef, useState } from 'react';

import { type LocalRecruitOfferDto, type LocalRecruitOffersResponseDto } from '@warwrit/protocol';
import { conditionLabel, formatCrowns } from './format.js';
import {
  browserCompanyRosterStorage,
  clearBrowserCompanyRosterAttempt,
  companyRosterAttemptKey,
  persistCompanyRosterAttempt,
  postCompanyRosterAttempt,
  readCompanyRosterAttempt,
  type CompanyRosterAttempt,
} from './company-roster-attempt.js';

export function RecruitmentPanel(props: {
  readonly apiBaseUrl: string;
  readonly accountId: string;
  readonly companyId: string;
  readonly expectedPublicRevision: string;
  readonly siteId: string;
  readonly onRefresh: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [offers, setOffers] = useState<readonly LocalRecruitOfferDto[]>([]);
  const storageKey = companyRosterAttemptKey(
    { accountId: props.accountId, companyId: props.companyId },
    'Recruit',
  );
  const storage = browserCompanyRosterStorage();
  const currentScopeKey = useRef(storageKey);
  currentScopeKey.current = storageKey;
  const [stored, setStored] = useState<{ key: string; attempt: CompanyRosterAttempt } | undefined>(
    () => {
      try {
        const attempt = storage
          ? readCompanyRosterAttempt(
              storage,
              { accountId: props.accountId, companyId: props.companyId },
              'Recruit',
            )
          : undefined;
        return attempt ? { key: storageKey, attempt } : undefined;
      } catch {
        return undefined;
      }
    },
  );
  const pending = stored?.key === storageKey ? stored.attempt : undefined;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const attempt = storage
        ? readCompanyRosterAttempt(
            storage,
            { accountId: props.accountId, companyId: props.companyId },
            'Recruit',
          )
        : undefined;
      setStored(attempt ? { key: storageKey, attempt } : undefined);
      setMessage(attempt ? 'Результат найма неизвестен. Повторите тот же запрос.' : undefined);
    } catch {
      setStored(undefined);
    }
  }, [storageKey, props.accountId, props.companyId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoaded(false);
    void (async () => {
      try {
        const response = await fetch(
          `${props.apiBaseUrl}/company/recruits/${encodeURIComponent(props.siteId)}`,
          { credentials: 'same-origin', cache: 'no-store', signal: controller.signal },
        );
        if (response.status === 401) {
          props.onUnauthorized();
          return;
        }
        if (!response.ok) throw new Error('offers unavailable');
        const body: unknown = await response.json();
        if (!isRecruitResponse(body)) throw new Error('invalid offers');
        if (!controller.signal.aborted) setOffers(body.offers);
      } catch {
        if (!controller.signal.aborted && !pending)
          setMessage('Не удалось узнать о местных наёмниках.');
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    })();
    return () => controller.abort();
  }, [props.apiBaseUrl, props.onUnauthorized, props.siteId]);

  type HirePreparation =
    | { readonly kind: 'ready'; readonly attempt: CompanyRosterAttempt }
    | { readonly kind: 'blocked'; readonly message?: string };

  function prepareHire(offer: LocalRecruitOfferDto | undefined, retry: boolean): HirePreparation {
    if (pending) return retry ? { kind: 'ready', attempt: pending } : { kind: 'blocked' };
    if (retry || !offer) return { kind: 'blocked' };
    return persistNewHire(offer);
  }

  function persistNewHire(offer: LocalRecruitOfferDto): HirePreparation {
    if (!storage)
      return { kind: 'blocked', message: 'Локальное хранилище недоступно; найм не отправлен.' };
    const persisted = persistCompanyRosterAttempt(
      storage,
      { accountId: props.accountId, companyId: props.companyId },
      {
        schemaVersion: 2,
        commandId: crypto.randomUUID(),
        expectedPublicRevision: props.expectedPublicRevision,
        type: 'Recruit',
        payload: { offerId: offer.offerId, offerRevision: offer.offerRevision },
      },
    );
    if (persisted.kind === 'SAVED') {
      setStored({ key: storageKey, attempt: persisted.attempt });
      return { kind: 'ready', attempt: persisted.attempt };
    }
    if (persisted.kind === 'EXISTING') setStored({ key: storageKey, attempt: persisted.attempt });
    return {
      kind: 'blocked',
      message:
        persisted.kind === 'UNAVAILABLE'
          ? 'Локальное хранилище недоступно; найм не отправлен.'
          : 'Есть незавершённый запрос найма. Сначала проверьте и повторите его.',
    };
  }

  async function settleHire(
    attempt: CompanyRosterAttempt,
    result: Awaited<ReturnType<typeof postCompanyRosterAttempt>>,
    offerName?: string,
  ) {
    if (result === 'UNAUTHENTICATED') {
      setMessage('Сеанс истёк. После входа повторите тот же запрос о найме.');
      props.onUnauthorized();
      return;
    }
    if (result === 'UNKNOWN') {
      setMessage('Ответ о найме неизвестен. Повторите тот же запрос.');
      return;
    }
    if (!clearBrowserCompanyRosterAttempt(attempt)) {
      setMessage('Ответ получен, но локальная запись не очищена. Повторите тот же запрос.');
      return;
    }
    setStored(undefined);
    setMessage(
      result === 'ACCEPTED'
        ? `${offerName ?? 'Наёмник'} нанят. Чтобы отправить его в бой, отдельно присоедините к отряду.`
        : 'Найм отклонён. Сведения об отряде обновлены.',
    );
    if (result === 'ACCEPTED') await refreshRecruitOffers();
    props.onRefresh();
  }

  async function refreshRecruitOffers() {
    const refreshed = await fetch(
      `${props.apiBaseUrl.replace(/\/$/u, '')}/company/recruits/${encodeURIComponent(props.siteId)}`,
      { credentials: 'same-origin', cache: 'no-store' },
    ).catch(() => undefined);
    if (refreshed?.status === 401) props.onUnauthorized();
    if (!refreshed?.ok) return;
    const body: unknown = await refreshed.json().catch(() => undefined);
    if (isRecruitResponse(body)) setOffers(body.offers);
  }

  async function dispatchHire(attempt: CompanyRosterAttempt, offerName?: string) {
    busyRef.current = true;
    setBusy(true);
    setMessage(undefined);
    const result = await postCompanyRosterAttempt(props.apiBaseUrl, attempt);
    if (currentScopeKey.current !== storageKey) {
      busyRef.current = false;
      setBusy(false);
      return;
    }
    await settleHire(attempt, result, offerName);
    busyRef.current = false;
    setBusy(false);
  }

  async function runHire(offer: LocalRecruitOfferDto | undefined, retry = false) {
    if (busyRef.current) return;
    const prepared = prepareHire(offer, retry);
    if (prepared.kind === 'blocked') {
      if (prepared.message) setMessage(prepared.message);
      return;
    }
    await dispatchHire(prepared.attempt, offer?.name);
  }

  return (
    <section className="panel recruitment-panel" aria-label="Местные наёмники">
      <h3>Найм в трактире</h3>
      <p className="state-note">
        50 кр. при найме · 10 кр. жалованья в день. Навыки и состояние показаны до оплаты.
      </p>
      {pending && (
        <div role="status">
          <p className="travel-error">
            {message ?? 'Результат найма неизвестен. Повторите тот же запрос.'}
          </p>
          <button
            type="button"
            className="action action-quiet"
            disabled={busy}
            onClick={() => void runHire(undefined, true)}
          >
            Повторить тот же найм
          </button>
        </div>
      )}
      {!pending && message && (
        <p className="travel-error" role="status">
          {message}
        </p>
      )}
      {!loaded && <p className="state-note">Спрашиваем о местных…</p>}
      {loaded && offers.length === 0 && (
        <p className="state-note">Свободных наёмников здесь нет.</p>
      )}
      {offers.map((offer) => (
        <article className="recruit-offer" key={offer.offerId}>
          <h4>
            {offer.name}
            {offer.physician ? ' · лекарь' : ''}
          </h4>
          <p>
            {offer.skills
              .map((skill) => {
                const aptitude = offer.aptitudes.find((entry) => entry.skillId === skill.skillId);
                return `${skillLabel(skill.skillId)} ${skill.level}${aptitude ? ` · склонность ${Math.round(aptitude.valueBps / 100)}%` : ''}`;
              })
              .join(' · ')}
          </p>
          <p>
            Здоровье {offer.health.current}/{offer.health.maximum} · выносливость{' '}
            {offer.stamina.current}/{offer.stamina.maximum}
          </p>
          <p>
            Состояние:{' '}
            {offer.conditions.length
              ? offer.conditions.map(conditionLabel).join(', ')
              : 'без известных ран'}
          </p>
          <p>Снаряжение не предлагается.</p>
          <p>
            Найм {formatCrowns(offer.signingQ)} кр. · жалованье{' '}
            {Number(offer.dailyWageMilli) / 1000} кр./день
          </p>
          <button
            type="button"
            className="action"
            disabled={busy || pending !== undefined}
            onClick={() => void runHire(offer)}
          >
            Нанять →
          </button>
        </article>
      ))}
    </section>
  );
}

function isRecruitResponse(value: unknown): value is LocalRecruitOffersResponseDto {
  return isRecord(value) && Array.isArray(value['offers']) && value['offers'].every(isRecruitOffer);
}

function isRecruitOffer(value: unknown): value is LocalRecruitOfferDto {
  return (
    isRecord(value) &&
    hasRecruitOfferIdentity(value) &&
    hasRecruitOfferVitals(value) &&
    hasRecruitOfferDetails(value)
  );
}

function hasRecruitOfferIdentity(value: Record<string, unknown>): boolean {
  return hasRecruitOfferStrings(value) && typeof value['physician'] === 'boolean';
}

function hasRecruitOfferStrings(value: Record<string, unknown>): boolean {
  const stringKeys = [
    'offerId',
    'offerRevision',
    'characterId',
    'name',
    'signingQ',
    'dailyWageMilli',
  ];
  return stringKeys.every((key) => typeof value[key] === 'string');
}

function hasRecruitOfferVitals(value: Record<string, unknown>): boolean {
  return isVitals(value['health']) && isVitals(value['stamina']);
}

function hasRecruitOfferDetails(value: Record<string, unknown>): boolean {
  return (
    isRecruitSkillList(value['skills']) &&
    isRecruitAptitudeList(value['aptitudes']) &&
    isStringList(value['conditions'])
  );
}

function isRecruitSkillList(value: unknown): value is LocalRecruitOfferDto['skills'] {
  return Array.isArray(value) && value.every(isRecruitSkill);
}

function isRecruitSkill(value: unknown): boolean {
  return (
    isRecord(value) && typeof value['skillId'] === 'string' && Number.isInteger(value['level'])
  );
}

function isRecruitAptitudeList(value: unknown): value is LocalRecruitOfferDto['aptitudes'] {
  return Array.isArray(value) && value.every(isRecruitAptitude);
}

function isRecruitAptitude(value: unknown): boolean {
  return (
    isRecord(value) && typeof value['skillId'] === 'string' && Number.isInteger(value['valueBps'])
  );
}

function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isVitals(value: unknown): value is { readonly current: number; readonly maximum: number } {
  return (
    isRecord(value) && Number.isInteger(value['current']) && Number.isInteger(value['maximum'])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function skillLabel(skillId: string): string {
  const labels: Readonly<Record<string, string>> = {
    medicine: 'Медицина',
    blades: 'Клинки',
    defense: 'Защита',
    polearms: 'Древковое оружие',
    archery: 'Стрельба',
    leadership: 'Лидерство',
    scholarship: 'Учёность',
  };
  return labels[skillId] ?? skillId;
}
