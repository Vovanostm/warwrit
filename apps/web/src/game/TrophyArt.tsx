import beastClaw from '../../../../assets/art/m1/trophies/beast-claw-v1.png';
import raiderStandard from '../../../../assets/art/m1/trophies/raider-standard-v1.png';
import './trophy-art.css';

const TROPHY_ART: Readonly<Record<string, string>> = {
  'beast-claw-trophy': beastClaw,
  'raider-standard-trophy': raiderStandard,
};

export function TrophyArt(props: { readonly definitionId: string }) {
  const source = TROPHY_ART[props.definitionId];
  if (!source) return null;
  return (
    <img
      className="trophy-art"
      src={source}
      alt=""
      aria-hidden="true"
      data-trophy-id={props.definitionId}
    />
  );
}
