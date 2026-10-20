import type { Unit } from './battle-presentation.js';

type UnitPools = Pick<Unit, 'pools'>;

export function unitVitalPools(unit: UnitPools): readonly {
  key: 'health' | 'armor' | 'morale';
  label: string;
  current: number | undefined;
  maximum: number | undefined;
  percent: number | undefined;
}[] {
  return (['health', 'armor', 'morale'] as const).map((key) => {
    const pool = unit.pools[key];
    const current = pool?.current;
    const maximum = pool?.maximum;
    const percent = current !== undefined && maximum !== undefined && maximum > 0
      ? Math.max(0, Math.min(100, (current / maximum) * 100))
      : undefined;
    return {
      key,
      label: key === 'health' ? 'Здр' : key === 'armor' ? 'Брн' : 'Мор',
      current,
      maximum,
      percent,
    };
  });
}
