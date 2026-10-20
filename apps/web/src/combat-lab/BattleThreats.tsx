import type { BattlePresentationView } from './battle-presentation.js';
export function BattleThreats({ view }: { view: BattlePresentationView }) {
  return (
    <>
      {' '}
      {view.status === 'active' &&
        view.units.some((unit) => unit.status === 'active' && unit.threat) && (
          <aside className="battle-threat-strip" aria-label="Объявленные угрозы">
            {view.units
              .filter((unit) => unit.status === 'active' && unit.threat)
              .map((unit) => {
                const threat = unit.threat!;
                const victim = view.units.find((candidate) => candidate.id === threat.targetId);
                return (
                  <div key={unit.id}>
                    <strong>
                      {unit.name ?? unit.id} → {victim?.name ?? threat.targetId}
                    </strong>
                    <span>
                      Удар {threat.damage.minimum}–{threat.damage.maximum} до брони
                      {threat.targetHex && ` · клетка ${threat.targetHex.q}, ${threat.targetHex.r}`}
                    </span>
                    <small>
                      {threat.retargeted === undefined
                        ? 'Наведение может измениться'
                        : threat.retargeted
                        ? 'Наведение изменено · больше не сменит цель'
                        : 'Может сменить цель один раз'}{' '}
                      ·{' '}
                      {threat.responseReceived
                        ? 'Ответный ход прошёл'
                        : 'До удара — ваш ответный ход'}
                    </small>
                  </div>
                );
              })}
          </aside>
        )}
    </>
  );
}
