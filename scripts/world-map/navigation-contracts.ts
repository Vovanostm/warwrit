import { atlasContracts, type ContractCopy } from './porechye-atlas-contracts.js';

// Preview-only card. Design truths and possible outcomes are never serialized
// into the DOM; navigating to a place does not accept or complete a quest.
export function mountContractPreview(navigate: (name: string) => void) {
  document.getElementById('contracts-section')!.removeAttribute('hidden');
  const select = document.getElementById('contract') as HTMLSelectElement;
  const language = document.getElementById('contract-language') as HTMLSelectElement;
  const card = document.getElementById('contract-preview')!;
  atlasContracts.forEach((c, i) => select.add(new Option(`${i + 1}. ${c.title}`, String(i))));
  function render() {
    const english = language.value === 'en';
    select.options[0]!.textContent = english ? 'Choose a proposal' : 'Выберите предложение';
    atlasContracts.forEach((c, i) => {
      select.options[i + 1]!.textContent = `${i + 1}. ${english ? c.en.title : c.title}`;
    });
    card.replaceChildren();
    card.hidden = select.value === '';
    if (card.hidden) return;
    const contract = atlasContracts[Number(select.value)]!;
    const copy = english ? contract.en : contract;
    appendCopy(card, copy);
    const location = document.createElement('p');
    location.textContent = `${english ? 'Issuer location' : 'Заказчик находится'}: ${copy.issuerAt}. ${english ? 'Site' : 'Место'}: ${copy.place}.`;
    card.append(location);
    for (const [label, name] of [
      [english ? 'Travel to issuer' : 'К заказчику', contract.issuerAt],
      [english ? 'Travel to site' : 'К месту', contract.place],
    ]) {
      const button = document.createElement('button');
      button.textContent = label!;
      button.addEventListener('click', () => navigate(name!));
      card.append(button);
    }
  }
  select.addEventListener('change', render);
  language.addEventListener('change', render);
}
function appendCopy(card: HTMLElement, copy: ContractCopy) {
  const title = document.createElement('h3');
  title.textContent = copy.title;
  card.append(title);
  for (const text of [copy.issuer, copy.kind, copy.brief]) paragraph(card, text);
  for (const turn of copy.scene) {
    const p = paragraph(card, `${turn.speaker}: «${turn.text}»`);
    p.className = 'contract-turn';
  }
  paragraph(card, copy.objective);
  paragraph(card, copy.description);
}
function paragraph(card: HTMLElement, text: string) {
  const p = document.createElement('p');
  p.textContent = text;
  card.append(p);
  return p;
}
