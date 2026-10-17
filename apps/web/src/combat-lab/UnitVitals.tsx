import type { CombatLabView } from '@warwrit/protocol';
import './unit-vitals.css';
import { unitVitalPools } from './unit-vitals.js';

type Unit = CombatLabView['units'][number];

export function UnitVitals({ unit }: { unit: Unit }) {
  return (
    <span className="unit-vitals" aria-label="Наблюдаемые ресурсы бойца">
      {unitVitalPools(unit).map(({ key, label, current, maximum, percent }) => {
        const name = key === 'health' ? 'Здоровье' : key === 'armor' ? 'Броня' : 'Мораль';
        return (
          <span
            className="unit-vital"
            data-resource={key}
            key={key}
            role="img"
            aria-label={`${name}: ${current} из ${maximum}`}
            title={`${name}: ${current}/${maximum}`}
          >
            <span className="unit-vital-reading" aria-hidden="true">
              <span>{label}</span>
              <span>{current}</span>
            </span>
            <span className="unit-vital-track" aria-hidden="true">
              <i style={{ width: `${percent}%` }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
