import './unit-vitals.css';
import { unitVitalPools } from './unit-vitals.js';
import type { Unit } from './battle-presentation.js';

export function UnitVitals({
  unit,
  includeMorale = true,
}: {
  unit: Unit;
  includeMorale?: boolean;
}) {
  return (
    <span className="unit-vitals" aria-label="Наблюдаемые ресурсы бойца">
      {unitVitalPools(unit)
        .filter(({ key }) => includeMorale || key !== 'morale')
        .map(({ key, label, current, maximum, percent }) => {
          const name = key === 'health' ? 'Здоровье' : key === 'armor' ? 'Броня' : 'Мораль';
          const reading =
            current === undefined
              ? 'неизвестно'
              : maximum === undefined
                ? `${current} · максимум неизвестен`
                : `${current} из ${maximum}`;
          const tooltip =
            current === undefined
              ? `${name}: неизвестно`
              : maximum === undefined
                ? `${name}: ${current} · максимум неизвестен`
                : `${name}: ${current}/${maximum}`;
          return (
            <span
              className="unit-vital"
              data-resource={key}
              key={key}
              role="img"
              aria-label={`${name}: ${reading}`}
              title={tooltip}
            >
              <span className="unit-vital-reading" aria-hidden="true">
                <span>{label}</span>
                <span>{current ?? '—'}</span>
              </span>
              <span className="unit-vital-track" aria-hidden="true">
                <i style={{ width: `${percent ?? 0}%` }} />
              </span>
            </span>
          );
        })}
    </span>
  );
}
