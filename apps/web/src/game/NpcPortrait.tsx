import type { ReactNode } from 'react';
import './npc-portrait.css';
import ulita from '../../../../assets/art/m1/portraits/ulita-tkachikha-v1.png';
import kondrat from '../../../../assets/art/m1/portraits/kondrat-ovsyanik-v1.png';
import senka from '../../../../assets/art/m1/portraits/senka-v1.png';
import gordey from '../../../../assets/art/m1/portraits/gordey-lapa-v1.png';
import tikhon from '../../../../assets/art/m1/portraits/tikhon-bortnik-v1.png';
import frol from '../../../../assets/art/m1/portraits/frol-zvonar-v1.png';

const PORTRAITS: Readonly<Record<string, string>> = {
  ULITA: ulita,
  KONDRAT: kondrat,
  SENKA: senka,
  'npc.city-watch-contact.kamenny-brod.01': gordey,
  'npc.woodland-village-caller.bereznyak.01': tikhon,
  'npc.local-warning-keeper.tikhaya-gat.01': frol,
};

export function NpcPortrait(props: {
  readonly actorId: string;
  readonly size?: 'dialogue' | 'issuer';
}) {
  const className = `npc-portrait${props.size === 'issuer' ? ' npc-portrait-issuer' : ''}`;
  const source = PORTRAITS[props.actorId];
  const fallback = props.actorId.slice(0, 1).toLocaleUpperCase('ru-RU') || '?';
  const content: ReactNode = source ? (
    <img src={source} alt="" />
  ) : (
    <span className="npc-portrait-fallback">{fallback}</span>
  );
  return (
    <span className={className} data-actor-id={props.actorId} aria-hidden="true">
      {content}
    </span>
  );
}
