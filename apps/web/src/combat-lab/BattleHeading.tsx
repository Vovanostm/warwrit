import type { CombatLabView } from '@warwrit/protocol';
export function BattleHeading({ view }: { view: CombatLabView }) {
  return (
    <header className="battle-heading">
      <p>{view.map.name ?? view.battle?.map.name ?? 'Старая мельница'}</p>
      <small>
        {
          view.units.filter((u) => u.sideId === view.controlledSideId && u.status === 'active')
            .length
        }{' '}
        против{' '}
        {
          view.units.filter((u) => u.sideId !== view.controlledSideId && u.status === 'active')
            .length
        }{' '}
      </small>
    </header>
  );
}
