import type { CombatLabView } from '@warwrit/protocol';

type UnitPools = Pick<CombatLabView['units'][number], 'pools'>;

export function unitVitalPools(unit: UnitPools): readonly {
  key: 'health' | 'armor' | 'morale';
  label: string;
  current: number;
  maximum: number;
  percent: number;
}[] {
  return (['health', 'armor', 'morale'] as const).map((key) => {
    const { current, maximum } = unit.pools[key];
    const percent = maximum > 0 ? Math.max(0, Math.min(100, (current / maximum) * 100)) : 0;
    return {
      key,
      label: key === 'health' ? 'Здр' : key === 'armor' ? 'Брн' : 'Мор',
      current,
      maximum,
      percent,
    };
  });
}
