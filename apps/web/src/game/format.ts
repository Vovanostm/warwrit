import type { CompanySummaryDto } from '@warwrit/protocol';

const Q_PER_CROWN = 1_000_000n;

/** Exact q amount rendered as crowns; never rounds money away. */
export function formatCrowns(cashQ: string): string {
  const value = BigInt(cashQ);
  const sign = value < 0n ? '−' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / Q_PER_CROWN;
  const fraction = (absolute % Q_PER_CROWN).toString().padStart(6, '0').replace(/0+$/u, '');
  return `${sign}${whole.toLocaleString('ru-RU')}${fraction ? `,${fraction}` : ''}`;
}

const ITEM_LABELS: Readonly<Record<string, string>> = {
  sword: 'Меч',
  shield: 'Щит',
  spear: 'Копьё',
  bow: 'Лук',
  'great-weapon': 'Двуручное оружие',
  'raider-weapon': 'Оружие налётчика',
  'simple-helmet': 'Простой шлем',
  'padded-coat': 'Стёганка',
  ration: 'Паёк',
  'medical-unit': 'Перевязочный набор',
  'repair-unit': 'Ремонтный набор',
  'raider-standard-trophy': 'Знамя налётчиков',
};

export function itemLabel(definitionId: string): string {
  return ITEM_LABELS[definitionId] ?? definitionId;
}

const CONDITION_LABELS: Readonly<Record<string, string>> = {
  'minor-field-wound': 'Лёгкая рана',
  'severe-stable-wound': 'Тяжёлая рана',
  'critical-bleed': 'Сильное кровотечение',
  'old-impairment': 'Старое увечье',
};

export function conditionLabel(definitionId: string): string {
  return CONDITION_LABELS[definitionId] ?? definitionId;
}

export function statusLabel(
  status: CompanySummaryDto['characters'][number]['knownStatus'],
): string {
  switch (status) {
    case 'AVAILABLE':
      return 'В отряде';
    case 'IN_ENCOUNTER':
      return 'В бою';
    case 'OUT_OF_CONTACT':
      return 'Нет связи';
    case 'CAPTIVE':
      return 'В плену';
    case 'DEAD':
      return 'Погиб';
  }
}

export function siteKindLabel(kind: 'CITY' | 'VILLAGE' | 'LANDMARK'): string {
  switch (kind) {
    case 'CITY':
      return 'Город';
    case 'VILLAGE':
      return 'Деревня';
    case 'LANDMARK':
      return 'Опасное место';
  }
}

/** Real duration of a campaign interval at the accepted rate (21.6 s per tick). */
export function formatTickDuration(ticks: number, msPerTick: number): string {
  const totalSeconds = Math.max(0, Math.round((ticks * msPerTick) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} ч ${minutes.toString().padStart(2, '0')} мин`;
  if (minutes > 0) return `${minutes} мин ${seconds.toString().padStart(2, '0')} с`;
  return `${seconds} с`;
}
