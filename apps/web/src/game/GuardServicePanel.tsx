import { useCallback, useEffect, useState } from 'react';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  isCompanyEntityId,
  type CompanyGuardServiceResponseDto,
  type CompanySummaryDto,
  type OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';

const API_BASE_URL = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const SITE_ID = 'kamenny-brod';
type GuardCommand = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { type: 'AcceptSafeService' | 'AmendSafeService' | 'EndSafeService' }
>;

export function GuardServicePanel(props: {
  readonly company: CompanySummaryDto;
  readonly busy: boolean;
  readonly actionPending: boolean;
  readonly actionMessage?: string;
  readonly onRetry: () => void;
  readonly onCommand: (request: GuardCommand) => Promise<unknown>;
  readonly onRefresh: () => unknown;
}) {
  const [readback, setReadback] = useState<CompanyGuardServiceResponseDto>();
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const companyId = props.company.companyId;
  const load = useCallback(async () => {
    if (!isCompanyEntityId(companyId)) return;
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/company/guard-service/${SITE_ID}`, {
        credentials: 'include',
        headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId },
      });
      if (!response.ok) throw new Error('read failed');
      const value: unknown = await response.json();
      if (!isGuardServiceResponse(value)) throw new Error('invalid readback');
      setReadback(value);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load, props.company.revision]);

  const issue = async (request: GuardCommand) => {
    await props.onCommand(request);
    await props.onRefresh();
    await load();
  };
  const service = readback;
  const offer = service?.offer;
  const agreement = service?.agreement;
  const activeIds = agreement?.beneficiaryIds.toSorted() ?? [];
  const offeredIds = offer?.beneficiaryIds.toSorted() ?? [];
  const needsAmendment =
    Boolean(agreement && offer) &&
    (activeIds.length !== offeredIds.length ||
      activeIds.some((id, index) => id !== offeredIds[index]));
  const disabled = props.busy || props.actionPending || refreshing;

  return (
    <section className="panel" aria-label="Служба Гордея">
      <h3 className="panel-subtitle">Служба в караульне</h3>
      {error ? (
        <p className="state-note" role="alert">
          Не удалось проверить предложение Гордея.
        </p>
      ) : !service ? (
        <p className="state-note">Проверяем предложение Гордея…</p>
      ) : (
        <>
          <p className="state-note">
            Пока компания служит Гордею, он обеспечивает её едой, ночлегом и жалованьем.
          </p>
          {agreement ? (
            <>
              <p role="status">
                На службе у Гордея: {formatMembers(agreement.beneficiaryIds, props.company)}.
              </p>
              {needsAmendment && offer && (
                <button
                  type="button"
                  className="action"
                  disabled={disabled}
                  onClick={() =>
                    void issue({
                      schemaVersion: 2,
                      commandId: crypto.randomUUID(),
                      expectedPublicRevision: service.publicRevision,
                      type: 'AmendSafeService',
                      payload: {
                        agreementId: agreement.agreementId,
                        beneficiaryIds: offer.beneficiaryIds,
                        quoteRevision: offer.quoteRevision,
                      },
                    })
                  }
                >
                  Обновить состав службы
                </button>
              )}
              <button
                type="button"
                className="action"
                disabled={disabled}
                onClick={() =>
                  void issue({
                    schemaVersion: 2,
                    commandId: crypto.randomUUID(),
                    expectedPublicRevision: service.publicRevision,
                    type: 'EndSafeService',
                    payload: { agreementId: agreement.agreementId },
                  })
                }
              >
                Закончить службу
              </button>
            </>
          ) : offer ? (
            <>
              <p>
                Гордей готов принять на службу: {formatMembers(offer.beneficiaryIds, props.company)}
                .
              </p>
              <button
                type="button"
                className="action"
                disabled={disabled}
                onClick={() =>
                  void issue({
                    schemaVersion: 2,
                    commandId: crypto.randomUUID(),
                    expectedPublicRevision: service.publicRevision,
                    type: 'AcceptSafeService',
                    payload: {
                      offerId: offer.offerId,
                      beneficiaryIds: offer.beneficiaryIds,
                      quoteRevision: offer.quoteRevision,
                    },
                  })
                }
              >
                Принять службу
              </button>
            </>
          ) : (
            <p className="state-note">
              {service.unavailableReason === 'PLACE_UNSAFE'
                ? 'В караульне сейчас опасно. Гордей не принимает отряд на службу.'
                : service.local
                  ? 'Гордей принимает группу до шести человек вместе с главой компании. Проверьте, кто сейчас может служить.'
                  : 'Предложение доступно, когда вся компания стоит у караульни в Каменном Броде.'}
            </p>
          )}
        </>
      )}
      <button type="button" className="action" disabled={disabled} onClick={() => void load()}>
        Обновить сведения о службе
      </button>
      {props.actionPending && (
        <button type="button" className="action" disabled={props.busy} onClick={props.onRetry}>
          Повторить сохранённый приказ
        </button>
      )}
      {props.actionMessage && <p role="status">{props.actionMessage}</p>}
    </section>
  );
}

function formatMembers(ids: readonly string[], company: CompanySummaryDto): string {
  return ids
    .map(
      (id) => company.characters.find((character) => character.characterId === id)?.name ?? 'боец',
    )
    .join(', ');
}

function isGuardServiceResponse(value: unknown): value is CompanyGuardServiceResponseDto {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['publicRevision'] === 'string' &&
    typeof candidate['local'] === 'boolean' &&
    candidate['providerName'] === 'Гордей Лапа' &&
    (candidate['unavailableReason'] === undefined ||
      candidate['unavailableReason'] === 'PLACE_UNSAFE') &&
    (candidate['offer'] === undefined || isOffer(candidate['offer'])) &&
    (candidate['agreement'] === undefined || isAgreement(candidate['agreement']))
  );
}

function isOffer(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const offer = value as Record<string, unknown>;
  return (
    typeof offer['offerId'] === 'string' &&
    typeof offer['quoteRevision'] === 'string' &&
    Array.isArray(offer['beneficiaryIds']) &&
    offer['beneficiaryIds'].every((id) => typeof id === 'string')
  );
}

function isAgreement(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const agreement = value as Record<string, unknown>;
  return (
    typeof agreement['agreementId'] === 'string' &&
    Array.isArray(agreement['beneficiaryIds']) &&
    agreement['beneficiaryIds'].every((id) => typeof id === 'string')
  );
}
