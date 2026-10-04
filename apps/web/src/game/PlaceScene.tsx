import { useRef, useState, type CSSProperties, type PointerEvent, type Ref } from 'react';
import { MAP_ART, placeIllustration } from '../renderer/art.js';
import {
  BUILDINGS,
  placeBuildings,
  type BuildingType,
  type BuildingVariant,
} from './place-buildings.js';
import './place-scene.css';

interface PlaceProps {
  readonly siteId: string;
  readonly name: string;
  readonly kind: 'CITY' | 'VILLAGE' | 'LANDMARK';
  readonly night: boolean;
  readonly canEnter: boolean;
  readonly onMap: () => void;
  readonly onContracts: () => void;
  readonly onEquipment: () => void;
}

export function PlaceScene(props: PlaceProps) {
  const scene = useRef<HTMLDivElement>(null);
  const returnButton = useRef<HTMLButtonElement>(null);
  const [inside, setInside] = useState<BuildingType | null>(null);
  const layout = placeBuildings(props.siteId, props.kind);
  const activeVisit = props.canEnter ? inside : null;
  function leaveBuilding() {
    const type = inside;
    setInside(null);
    requestAnimationFrame(() =>
      scene.current?.querySelector<HTMLButtonElement>(`[data-building="${type}"]`)?.focus(),
    );
  }
  function enterBuilding(type: BuildingType) {
    setInside(type);
    requestAnimationFrame(() => returnButton.current?.focus());
  }
  return (
    <section className={placeClass(props, layout.ruined)} aria-label={`Локация: ${props.name}`}>
      <PlaceHeader {...props} />
      <div
        ref={scene}
        className="place-diorama"
        onPointerMove={(event) => parallax(event, scene.current)}
        onPointerLeave={() => {
          scene.current?.style.setProperty('--look-x', '0px');
          scene.current?.style.setProperty('--look-y', '0px');
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && activeVisit) {
            event.stopPropagation();
            leaveBuilding();
          }
        }}
      >
        <PlaceLayers siteId={props.siteId} />
        {activeVisit ? (
          <PlaceVisit
            {...props}
            type={activeVisit}
            variant={layout.variant}
            ruined={layout.ruined}
            onLeave={leaveBuilding}
            returnRef={returnButton}
          />
        ) : (
          <div className="place-buildings">
            {layout.buildings.map((building) => (
              <BuildingEntrance
                key={building.type}
                building={building}
                variant={layout.variant}
                ruined={layout.ruined}
                canEnter={props.canEnter}
                onEnter={enterBuilding}
              />
            ))}
          </div>
        )}
      </div>
      <PlaceCaption canEnter={props.canEnter} inside={Boolean(activeVisit)} />
    </section>
  );
}

function placeClass(props: PlaceProps, ruined: boolean) {
  return `place-scene${props.night ? ' place-night' : ''}${props.kind === 'LANDMARK' ? ' place-wild' : ''}${ruined ? ' place-ruin' : ''}`;
}

function parallax(event: PointerEvent<HTMLDivElement>, node: HTMLDivElement | null) {
  if (event.pointerType !== 'mouse' || !node) return;
  const rect = node.getBoundingClientRect();
  node.style.setProperty('--look-x', `${((event.clientX - rect.left) / rect.width - 0.5) * 16}px`);
  node.style.setProperty('--look-y', `${((event.clientY - rect.top) / rect.height - 0.5) * 8}px`);
}

function PlaceHeader(props: Pick<PlaceProps, 'name' | 'night' | 'onMap'>) {
  return (
    <header className="place-scene-header">
      <div>
        <span className="place-eyebrow">Серое Поречье · {props.night ? 'ночь' : 'день'}</span>
        <h2>{props.name}</h2>
      </div>
      <button type="button" className="action action-quiet" onClick={props.onMap}>
        ← Карта
      </button>
    </header>
  );
}

function PlaceLayers(props: { readonly siteId: string }) {
  const backdrop = placeIllustration(props.siteId);
  return (
    <>
      {backdrop && (
        <div className="place-distance" style={{ backgroundImage: `url(${backdrop})` }} />
      )}
      <div
        className="place-ground"
        style={{ '--ground-image': `url(${MAP_ART.terrainLayers.grass})` } as CSSProperties}
      />
      <svg
        className="place-path"
        viewBox="0 0 1000 700"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M515 -40 C450 130 505 180 438 258 S368 360 460 412 S575 498 465 558 S390 648 475 740"
          fill="none"
          stroke="#504933"
          strokeWidth="84"
          opacity=".3"
        />
        <path
          d="M515 -40 C450 130 505 180 438 258 S368 360 460 412 S575 498 465 558 S390 648 475 740"
          fill="none"
          stroke="#b2a17c"
          strokeWidth="72"
          opacity=".6"
        />
        <path
          d="M515 -40 C450 130 505 180 438 258 S368 360 460 412 S575 498 465 558 S390 648 475 740"
          fill="none"
          stroke="#7b6d4e"
          strokeWidth="55"
          strokeDasharray="2 21"
          opacity=".3"
        />
      </svg>
      <div className="place-haze" />
      <div className="place-foreground" aria-hidden="true">
        <img src={MAP_ART.forest} alt="" />
        <img src={MAP_ART.forest} alt="" />
      </div>
    </>
  );
}

function BuildingEntrance(props: {
  readonly building: ReturnType<typeof placeBuildings>['buildings'][number];
  readonly variant: BuildingVariant;
  readonly ruined: boolean;
  readonly canEnter: boolean;
  readonly onEnter: (type: BuildingType) => void;
}) {
  const { building } = props;
  const name = props.ruined ? 'Двор мельницы' : BUILDINGS[building.type].name;
  return (
    <button
      type="button"
      data-building={building.type}
      className={`place-building place-building-${building.type}`}
      style={{
        left: `${building.x}%`,
        top: `${building.y}%`,
        width: `${building.width}%`,
        zIndex: Math.round(building.y),
      }}
      disabled={!props.canEnter}
      aria-label={`Войти: ${name}`}
      aria-describedby="place-access"
      onClick={() => props.onEnter(building.type)}
    >
      {!props.ruined && <BuildingArt type={building.type} variant={props.variant} />}
      <BuildingSmoke type={building.type} />
      <span className="place-building-label">{name}</span>
      <span className="place-enter" aria-hidden="true">
        Войти
      </span>
    </button>
  );
}

function BuildingSmoke(props: { readonly type: BuildingType }) {
  if (!['forge', 'inn', 'elder'].includes(props.type)) return null;
  return (
    <span className="place-smoke" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

const RUIN_VISIT = {
  name: 'Разрушенная мельница',
  sign: 'Мельничное колесо',
  interior: 'Мельничный двор',
  detail: 'Обрушенная кровля, старое колесо и заросший двор. Здесь нужно быть осторожным.',
  service: 'Сверьтесь с поручениями и видимыми угрозами, прежде чем действовать.',
};

function PlaceVisit(
  props: Pick<PlaceProps, 'siteId' | 'name' | 'onContracts' | 'onEquipment'> & {
    readonly type: BuildingType;
    readonly variant: BuildingVariant;
    readonly ruined: boolean;
    readonly onLeave: () => void;
    readonly returnRef: Ref<HTMLButtonElement>;
  },
) {
  const selected = props.ruined ? RUIN_VISIT : BUILDINGS[props.type];
  return (
    <div className="place-interior" aria-label={selected.interior}>
      <div className="place-interior-art">
        {props.ruined ? (
          <img src={placeIllustration(props.siteId)} alt="Разрушенная мельница у реки" />
        ) : (
          <BuildingArt type={props.type} variant={props.variant} />
        )}
      </div>
      <div className="place-interior-copy">
        <span className="place-eyebrow">
          {props.name} · вывеска «{selected.sign}»
        </span>
        <h3>{selected.name}</h3>
        <p>{selected.detail}</p>
        <p className="place-service">{selected.service}</p>
        <VisitAction
          type={props.type}
          ruined={props.ruined}
          onContracts={props.onContracts}
          onEquipment={props.onEquipment}
        />
        <button
          ref={props.returnRef}
          className="action action-quiet"
          type="button"
          onClick={props.onLeave}
        >
          ← На площадь
        </button>
      </div>
    </div>
  );
}

function VisitAction(
  props: Pick<PlaceProps, 'onContracts' | 'onEquipment'> & {
    readonly type: BuildingType;
    readonly ruined: boolean;
  },
) {
  if (props.type === 'elder' || props.ruined) {
    return (
      <button className="action" type="button" onClick={props.onContracts}>
        Местные поручения →
      </button>
    );
  }
  if (props.type !== 'forge') return null;
  return (
    <button className="action" type="button" onClick={props.onEquipment}>
      Снаряжение отряда →
    </button>
  );
}

function PlaceCaption(props: { readonly canEnter: boolean; readonly inside: boolean }) {
  return (
    <footer className="place-scene-footer">
      <span id="place-access" className="place-access">
        {props.canEnter
          ? '◆ Двери открыты для вашего отряда'
          : '◇ Вид издали · чтобы войти, прибудьте сюда'}
      </span>
      <span>
        {props.inside ? 'Esc — на площадь' : 'Выберите здание · мышь раскрывает глубину сцены'}
      </span>
    </footer>
  );
}

function BuildingArt(props: { readonly type: BuildingType; readonly variant: BuildingVariant }) {
  return (
    <span
      className="place-building-art"
      aria-hidden="true"
      style={{
        backgroundImage: `url(${BUILDINGS[props.type].image})`,
        backgroundPosition: `${props.variant * 50}% 50%`,
      }}
    />
  );
}
