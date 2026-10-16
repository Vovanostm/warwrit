import './combat-icons.css';

const iconUrls = {
  attack: new URL('../../../../assets/art/combat/ui-icons/crossed-swords.svg', import.meta.url)
    .href,
  move: new URL('../../../../assets/art/combat/ui-icons/walking-boot.svg', import.meta.url).href,
  defend: new URL('../../../../assets/art/combat/ui-icons/shield.svg', import.meta.url).href,
  wait: new URL('../../../../assets/art/combat/ui-icons/hourglass.svg', import.meta.url).href,
  retreat: new URL('../../../../assets/art/combat/ui-icons/run.svg', import.meta.url).href,
  brace: new URL('../../../../assets/art/combat/ui-icons/shield-bash.svg', import.meta.url).href,
  pressure: new URL('../../../../assets/art/combat/ui-icons/hammer-drop.svg', import.meta.url).href,
  reach: new URL('../../../../assets/art/combat/ui-icons/barbed-spear.svg', import.meta.url).href,
  aim: new URL('../../../../assets/art/combat/ui-icons/arrow-scope.svg', import.meta.url).href,
  rally: new URL('../../../../assets/art/combat/ui-icons/tattered-banner.svg', import.meta.url)
    .href,
};

export type CombatIconName = keyof typeof iconUrls;

/** Decorative glyph; the enclosing button owns its accessible name and tooltip. */
export function CombatIcon({ name }: { readonly name: CombatIconName }) {
  const mask = `url("${iconUrls[name]}")`;
  return (
    <span
      className="combat-icon"
      data-icon={name}
      aria-hidden="true"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}
