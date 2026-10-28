import { useState } from 'react';
import type { CompanyHoldingsDto, CompanySummaryDto } from '@warwrit/protocol';
import { itemLabel } from './format.js';
import { useItemTransfer } from './use-item-transfer.js';
import './item-transfer.css';

type TransferState = ReturnType<typeof useItemTransfer>;
type TransferContainer = NonNullable<CompanyHoldingsDto['transfer']>['containers'][number];
type Selection = { itemId: string; destination: string; quantity: number };

function containerName(container: TransferContainer, company: CompanySummaryDto) {
  if (container.carrierCharacterId) {
    const carrier = company.characters.find(
      (person) => person.characterId === container.carrierCharacterId,
    );
    return `Сумка: ${carrier?.name ?? 'участник'}`;
  }
  return container.kind === 'PARTY_SUPPLY' ? 'Обоз отряда' : 'Местный контейнер';
}
function heldItemName(holdings: CompanyHoldingsDto | undefined, itemId: string) {
  return itemLabel(holdings?.items.find((entry) => entry.itemId === itemId)?.definitionId ?? '');
}

export function ItemTransferPanel(props: {
  readonly accountId: string;
  readonly company: CompanySummaryDto;
  readonly onRefresh: () => void;
}) {
  const state = useItemTransfer(props.accountId, props.company, props.onRefresh);
  const [selection, setSelection] = useState<Selection>({
    itemId: '',
    destination: '',
    quantity: 1,
  });
  return (
    <section className="item-transfer" aria-label="Передача вещей">
      <h3 className="panel-subtitle">Передать вещи</h3>
      {state.pending ? (
        <PendingTransfer state={state} company={props.company} />
      ) : (
        <TransferForm
          state={state}
          company={props.company}
          selection={selection}
          onSelection={setSelection}
        />
      )}
      {state.message && (
        <p role="status" className="state-note">
          {state.message}
        </p>
      )}
      <button className="quiet-action" disabled={state.busy} onClick={() => void state.refresh()}>
        Обновить список
      </button>
    </section>
  );
}

function PendingTransfer({ state, company }: { state: TransferState; company: CompanySummaryDto }) {
  const pending = state.pending!;
  const holdings = state.reading?.holdings;
  const describeContainer = (id: string) => {
    const container = holdings?.transfer?.containers.find((entry) => entry.containerId === id);
    return container ? containerName(container, company) : 'прежний контейнер';
  };
  return (
    <div className="item-transfer-pending" role="status">
      <p>
        Передача {pending.payload.quantity} × {heldItemName(holdings, pending.payload.itemId)}:{' '}
        {describeContainer(pending.payload.fromContainerId)} →{' '}
        {describeContainer(pending.payload.toContainerId)} ещё не подтверждена. Сначала повторите
        тот же приказ.
      </p>
      <button
        className="action"
        disabled={state.busy || !state.reading}
        onClick={() => void state.transfer()}
      >
        Повторить эту же передачу
      </button>
    </div>
  );
}

function TransferForm({
  state,
  company,
  selection,
  onSelection,
}: {
  state: TransferState;
  company: CompanySummaryDto;
  selection: Selection;
  onSelection: (selection: Selection) => void;
}) {
  const holdings = state.reading?.holdings;
  const options = holdings?.transfer;
  if (!options || options.items.length === 0)
    return (
      <p className="state-note">
        {state.reading
          ? 'Нет доступных вещей для передачи в этом месте.'
          : 'Обновляем список вещей…'}
      </p>
    );
  const item = options.items.find((entry) => entry.itemId === selection.itemId);
  const targets = options.containers.filter((entry) => entry.containerId !== item?.containerId);
  const canTransfer = Boolean(
    item &&
    targets.some((entry) => entry.containerId === selection.destination) &&
    Number.isSafeInteger(selection.quantity) &&
    selection.quantity > 0 &&
    selection.quantity <= item.quantity,
  );
  function submit() {
    if (!item) return;
    void state.transfer({
      itemId: item.itemId,
      quantity: selection.quantity,
      fromContainerId: item.containerId,
      toContainerId: selection.destination,
    });
  }
  return (
    <div className="item-transfer-fields">
      <label className="item-transfer-field">
        <span>Вещь</span>
        <select
          aria-label="Вещь для передачи"
          value={selection.itemId}
          disabled={state.busy}
          onChange={(event) =>
            onSelection({ itemId: event.target.value, quantity: 1, destination: '' })
          }
        >
          <option value="">Выберите вещь</option>
          {options.items.map((entry) => (
            <option key={entry.itemId} value={entry.itemId}>
              {heldItemName(holdings, entry.itemId)} ·{' '}
              {containerName(
                options.containers.find(
                  (container) => container.containerId === entry.containerId,
                )!,
                company,
              )}{' '}
              · {entry.quantity}
            </option>
          ))}
        </select>
      </label>
      <label className="item-transfer-field">
        <span>Количество</span>
        <input
          aria-label="Количество для передачи"
          type="number"
          min={1}
          max={item?.quantity ?? 1}
          value={selection.quantity}
          disabled={state.busy || !item}
          onChange={(event) => onSelection({ ...selection, quantity: Number(event.target.value) })}
        />
      </label>
      <label className="item-transfer-field">
        <span>Куда</span>
        <select
          aria-label="Контейнер назначения"
          value={selection.destination}
          disabled={state.busy || !item}
          onChange={(event) => onSelection({ ...selection, destination: event.target.value })}
        >
          <option value="">Выберите контейнер</option>
          {targets.map((entry) => (
            <option key={entry.containerId} value={entry.containerId}>
              {containerName(entry, company)}
            </option>
          ))}
        </select>
      </label>
      <button
        className="action"
        disabled={state.busy || !canTransfer || company.runStatus !== 'ACTIVE'}
        onClick={submit}
      >
        {state.busy ? 'Передаём…' : 'Передать'}
      </button>
      <p className="state-note">
        Перемещение между сумками не меняет владельца вещи и общий груз отряда.
      </p>
    </div>
  );
}
