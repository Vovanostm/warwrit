import type { BattlePresentationView } from './battle-presentation.js';
export function BattleHeading({ view }: { view: BattlePresentationView }) {
  const controlled = new Set(view.controlledUnitIds);
  return (
    <header className="battle-heading">
      <p>{view.label}</p>
      <small>
        Под вашим управлением:{' '}
        {view.units.filter((u) => controlled.has(u.id) && u.status === 'active').length} · остальные
        участники: {view.units.filter((u) => !controlled.has(u.id) && u.status === 'active').length}
      </small>
    </header>
  );
}
