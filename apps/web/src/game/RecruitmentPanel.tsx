import { useEffect, useState } from 'react';

import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type LocalRecruitOfferDto,
  type LocalRecruitOffersResponseDto,
} from '@warwrit/protocol';
import { conditionLabel, formatCrowns } from './format.js';

export function RecruitmentPanel(props: {
  readonly apiBaseUrl: string;
  readonly companyId: string;
  readonly expectedPublicRevision: string;
  readonly siteId: string;
  readonly onRefresh: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [offers, setOffers] = useState<readonly LocalRecruitOfferDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [loaded, setLoaded] = useState(false);

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
        if (!controller.signal.aborted) setMessage('Не удалось узнать о местных наёмниках.');
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    })();
    return () => controller.abort();
  }, [props.apiBaseUrl, props.onUnauthorized, props.siteId]);

  async function hire(offer: LocalRecruitOfferDto) {
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch(`${props.apiBaseUrl}/company/commands`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: props.companyId,
        },
        body: JSON.stringify({
          schemaVersion: 2,
          commandId: crypto.randomUUID(),
          expectedPublicRevision: props.expectedPublicRevision,
          type: 'Recruit',
          payload: { offerId: offer.offerId, offerRevision: offer.offerRevision },
        }),
      });
      if (response.status === 401) {
        props.onUnauthorized();
        return;
      }
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const code = isRecord(body) && typeof body['code'] === 'string' ? body['code'] : '';
        setMessage(
          code === 'INSUFFICIENT_FUNDS'
            ? 'В местной казне не хватает денег на найм.'
            : code === 'STALE_REVISION'
              ? 'Состав изменился. Обновите страницу и повторите.'
              : 'Найм сейчас невозможен: проверьте, что отряд стоит в поселении и может действовать.',
        );
        props.onRefresh();
        return;
      }
      setMessage(`${offer.name} нанят. Чтобы отправить его в бой, отдельно присоедините к отряду.`);
      const refreshed = await fetch(
        `${props.apiBaseUrl}/company/recruits/${encodeURIComponent(props.siteId)}`,
        { credentials: 'same-origin', cache: 'no-store' },
      );
      if (refreshed.ok) {
        const body: unknown = await refreshed.json();
        if (isRecruitResponse(body)) setOffers(body.offers);
      }
      props.onRefresh();
    } catch {
      setMessage('Нет связи с сервером. Проверьте состав, прежде чем повторять найм.');
      props.onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel recruitment-panel" aria-label="Местные наёмники">
      <h3>Найм в трактире</h3>
      <p className="state-note">
        50 кр. при найме · 10 кр. жалованья в день. Навыки и состояние показаны до оплаты.
      </p>
      {message && (
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
          <button type="button" className="action" disabled={busy} onClick={() => void hire(offer)}>
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
  if (!isRecord(value) || !Array.isArray(value['skills']) || !Array.isArray(value['conditions']))
    return false;
  return (
    typeof value['offerId'] === 'string' &&
    typeof value['offerRevision'] === 'string' &&
    typeof value['characterId'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['signingQ'] === 'string' &&
    typeof value['dailyWageMilli'] === 'string' &&
    typeof value['physician'] === 'boolean' &&
    isVitals(value['health']) &&
    isVitals(value['stamina']) &&
    Array.isArray(value['aptitudes']) &&
    value['skills'].every(
      (entry) =>
        isRecord(entry) && typeof entry['skillId'] === 'string' && Number.isInteger(entry['level']),
    ) &&
    value['aptitudes'].every(
      (entry) =>
        isRecord(entry) &&
        typeof entry['skillId'] === 'string' &&
        Number.isInteger(entry['valueBps']),
    ) &&
    value['conditions'].every((entry) => typeof entry === 'string')
  );
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
