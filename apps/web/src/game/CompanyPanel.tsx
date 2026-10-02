import type { CompanyHoldingsDto, CompanySummaryDto } from '@warwrit/protocol';

import { conditionLabel, formatCrowns, itemLabel, statusLabel } from './format.js';

type HeldItem = CompanyHoldingsDto['items'][number];

export function CompanyPanel(props: {
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto | undefined;
  readonly equipBusy: boolean;
  readonly equipMessage?: string;
  readonly onEquip: (characterId: string, item: HeldItem) => void;
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
      {props.equipMessage && (
        <p className="travel-error" role="alert">
          {props.equipMessage}
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
          const status = body?.fallen ? 'DEAD' : character.knownStatus;
          return (
            <li key={character.characterId} className={`person person-${status.toLowerCase()}`}>
              <div className="person-head">
                <span className="person-name">
                  {character.name}
                  {character.characterId === company.leaderId && (
                    <span className="leader-mark"> · глава</span>
                  )}
                </span>
                <span className="person-status">{statusLabel(status)}</span>
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
                <ul className="person-gear">
                  {carried.map((item) => (
                    <li key={item.itemId}>
                      <span className={item.equippedBy ? 'gear-equipped' : 'gear-carried'}>
                        {itemLabel(item.definitionId)}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                        {item.equippedBy
                          ? item.slot === 'HEAD' || item.slot === 'BODY'
                            ? ' · надето'
                            : ' · в руках'
                          : ''}
                      </span>
                      {item.slot !== null && item.equippedBy === null && status === 'AVAILABLE' && (
                        <button
                          type="button"
                          className="gear-action"
                          disabled={props.equipBusy}
                          onClick={() => props.onEquip(character.characterId, item)}
                        >
                          {item.slot === 'HEAD' || item.slot === 'BODY' ? 'надеть' : 'взять'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {body &&
                status === 'AVAILABLE' &&
                !carried.some((item) => item.equippedBy !== null && item.slot === 'MAIN_HAND') && (
                  <p className="person-warning">Без оружия в руках в бой не выйти.</p>
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
            {holdings.wagesOwedQ !== '0' && (
              <li>
                <span>Жалованье к выплате</span>
                <span>
                  {formatCrowns(holdings.wagesOwedQ)} кр.
                  {holdings.wagesDueQ !== '0'
                    ? ` · из них просрочено ${formatCrowns(holdings.wagesDueQ)}`
                    : ' · срок в конце дня'}
                </span>
              </li>
            )}
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
