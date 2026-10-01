import type { CompanyHoldingsDto, CompanySummaryDto } from '@warwrit/protocol';

import { conditionLabel, formatCrowns, itemLabel, statusLabel } from './format.js';

export function CompanyPanel(props: {
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto | undefined;
}) {
  const { company, holdings } = props;
  const supplies = holdings?.items.filter((item) => item.carrierCharacterId === null) ?? [];
  return (
    <section className="panel company-panel" aria-label="Компания">
      <h2 className="panel-title">Отряд</h2>
      {company.runStatus === 'GAME_OVER' && (
        <p className="travel-error" role="alert">
          Путь компании завершён. Запись сохранена, новые приказы закрыты.
        </p>
      )}
      <ul className="people">
        {company.characters.map((character) => {
          const body = holdings?.people.find(
            (entry) => entry.characterId === character.characterId,
          );
          const carried =
            holdings?.items.filter((item) => item.carrierCharacterId === character.characterId) ??
            [];
          return (
            <li
              key={character.characterId}
              className={`person person-${character.knownStatus.toLowerCase()}`}
            >
              <div className="person-head">
                <span className="person-name">
                  {character.name}
                  {character.characterId === company.leaderId && (
                    <span className="leader-mark"> · глава</span>
                  )}
                </span>
                <span className="person-status">{statusLabel(character.knownStatus)}</span>
              </div>
              {body && body.maximumHealth !== null && (
                <Meter
                  label="Здоровье"
                  value={body.currentHealth ?? 0}
                  max={body.maximumHealth}
                  kind="health"
                />
              )}
              {body && body.maximumStamina !== null && (
                <Meter
                  label="Выносливость"
                  value={body.currentStamina ?? 0}
                  max={body.maximumStamina}
                  kind="stamina"
                />
              )}
              {body && body.conditions.length > 0 && (
                <p className="person-conditions">
                  {body.conditions.map(conditionLabel).join(', ')}
                </p>
              )}
              {carried.length > 0 && (
                <p className="person-items">
                  {carried
                    .map(
                      (item) =>
                        `${itemLabel(item.definitionId)}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`,
                    )
                    .join(' · ')}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {holdings && (
        <>
          <h3 className="panel-subtitle">Обоз</h3>
          {supplies.length === 0 ? (
            <p className="state-note">Общих припасов нет.</p>
          ) : (
            <ul className="supplies">
              {supplies.map((item) => (
                <li key={item.itemId}>
                  <span>{itemLabel(item.definitionId)}</span>
                  <span>{item.quantity}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="panel-subtitle">Казна</h3>
          <ul className="supplies">
            <li>
              <span>Казна компании</span>
              <span>{formatCrowns(holdings.cashQ)} кр.</span>
            </li>
            {holdings.wallets
              .filter((wallet) => wallet.ownerCharacterId !== null)
              .map((wallet) => (
                <li key={wallet.walletId}>
                  <span>
                    Кошелёк:{' '}
                    {company.characters.find(
                      (character) => character.characterId === wallet.ownerCharacterId,
                    )?.name ?? 'участник'}
                  </span>
                  <span>{formatCrowns(wallet.cashQ)} кр.</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Meter(props: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly kind: 'health' | 'stamina';
}) {
  const ratio = props.max > 0 ? Math.max(0, Math.min(1, props.value / props.max)) : 0;
  return (
    <div
      className={`meter meter-${props.kind}`}
      title={`${props.label}: ${props.value}/${props.max}`}
    >
      <span className="meter-label">{props.label}</span>
      <span className="meter-track">
        <span className="meter-fill" style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="meter-value">
        {props.value}/{props.max}
      </span>
    </div>
  );
}
