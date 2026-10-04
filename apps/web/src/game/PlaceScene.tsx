import { useRef, useState, type CSSProperties, type PointerEvent, type Ref } from 'react';
import { BUILDINGS, placeBuildings, type BuildingType } from './place-buildings.js';
import './place-scene.css';

interface PlaceProps {
  readonly siteId: string;
  readonly name: string;
  readonly kind: 'CITY' | 'VILLAGE' | 'LANDMARK';
  readonly night: boolean;
  readonly canEnter: boolean;
  readonly inside: BuildingType | null;
  readonly onInside: (type: BuildingType | null) => void;
  readonly onMap: () => void;
  readonly onContracts: () => void;
  readonly onEquipment: () => void;
}
type PlaceLayout = ReturnType<typeof placeBuildings>;
type PaintedBuilding = PlaceLayout['buildings'][number];

export function PlaceScene(props: PlaceProps) {
  const scene = useRef<HTMLDivElement>(null);
  const returnButton = useRef<HTMLButtonElement>(null);
  const inside = props.inside;
  const layout = placeBuildings(props.siteId, props.kind);
  const activeVisit = visitedBuilding(layout, inside, props.canEnter);
  function leaveBuilding() {
    const type = inside;
    props.onInside(null);
    requestAnimationFrame(() =>
      scene.current?.querySelector<HTMLButtonElement>(`[data-building="${type}"]`)?.focus(),
    );
  }
  function enterBuilding(type: BuildingType) {
    props.onInside(type);
    requestAnimationFrame(() => returnButton.current?.focus());
  }
  return (
    <section
      className={`place-scene${props.night ? ' place-night' : ''}`}
      aria-label={`Локация: ${props.name}`}
    >
      <PlaceHeader name={props.name} night={props.night} onMap={props.onMap} />
      <div
        ref={scene}
        className="place-diorama"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && activeVisit) {
            event.stopPropagation();
            leaveBuilding();
          }
        }}
      >
        <div hidden={Boolean(activeVisit)}>
          <PlaceOverview layout={layout} canEnter={props.canEnter} onEnter={enterBuilding} />
        </div>
        {activeVisit && (
          <PlaceVisit
            name={props.name}
            building={activeVisit}
            layout={layout}
            onContracts={props.onContracts}
            onEquipment={props.onEquipment}
            onLeave={leaveBuilding}
            returnRef={returnButton}
          />
        )}
      </div>
      {!activeVisit && (
        <PlaceBuildingMenu layout={layout} canEnter={props.canEnter} onEnter={enterBuilding} />
      )}
      <PlaceCaption canEnter={props.canEnter} inside={Boolean(activeVisit)} />
    </section>
  );
}

function visitedBuilding(layout: PlaceLayout, type: BuildingType | null, canEnter: boolean) {
  if (!canEnter) return undefined;
  return layout.buildings.find((building) => building.type === type);
}

function parallax(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== 'mouse') return;
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty(
    '--look-x',
    `${((event.clientX - rect.left) / rect.width - 0.5) * 18}px`,
  );
  event.currentTarget.style.setProperty(
    '--look-y',
    `${((event.clientY - rect.top) / rect.height - 0.5) * 10}px`,
  );
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

function PlaceOverview(props: {
  readonly layout: PlaceLayout;
  readonly canEnter: boolean;
  readonly onEnter: (type: BuildingType) => void;
}) {
  const [ready, setReady] = useState(false);
  return (
    <div
      className="place-panorama"
      style={{ aspectRatio: props.layout.aspect }}
      onPointerMove={parallax}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty('--look-x', '0px');
        event.currentTarget.style.setProperty('--look-y', '0px');
      }}
    >
      <img
        className="place-distance place-art"
        src={props.layout.distance}
        alt=""
        draggable={false}
      />
      <div className={`place-midground${ready ? ' place-painted' : ''}`}>
        <img
          className="place-settlement place-art"
          src={props.layout.image}
          alt=""
          draggable={false}
          onLoad={() => setReady(true)}
        />
        {props.layout.smoke.map(([x, y]) => (
          <BuildingSmoke key={`${x}:${y}`} x={x} y={y} />
        ))}
      </div>
      <img
        className="place-foreground place-art"
        src={props.layout.foreground}
        alt=""
        draggable={false}
      />
      <div className={`place-entrances${ready ? ' place-painted' : ''}`}>
        {props.layout.buildings.map((building) => (
          <BuildingEntrance
            key={building.type}
            building={building}
            ruined={props.layout.ruined}
            canEnter={props.canEnter && ready}
            onEnter={props.onEnter}
          />
        ))}
      </div>
      <div className="place-atmosphere" aria-hidden="true" />
      {!ready && (
        <p className="place-loading" role="status">
          Открываем вид поселения…
        </p>
      )}
    </div>
  );
}

function buildingName(type: BuildingType, ruined: boolean) {
  return ruined ? 'Двор мельницы' : BUILDINGS[type].name;
}

function BuildingEntrance(props: {
  readonly building: PaintedBuilding;
  readonly ruined: boolean;
  readonly canEnter: boolean;
  readonly onEnter: (type: BuildingType) => void;
}) {
  const name = buildingName(props.building.type, props.ruined);
  return (
    <button
      type="button"
      data-building={props.building.type}
      className="place-building"
      style={{ left: `${props.building.x}%`, top: `${props.building.y}%` }}
      disabled={!props.canEnter}
      aria-label={`Войти: ${name}`}
      aria-describedby="place-access"
      onClick={() => props.onEnter(props.building.type)}
    >
      <span className="place-door" aria-hidden="true">
        ◆
      </span>
      <span className="place-building-label">{name}</span>
    </button>
  );
}

function BuildingSmoke(props: { readonly x: number; readonly y: number }) {
  return (
    <span
      className="place-smoke"
      aria-hidden="true"
      style={{ left: `${props.x}%`, top: `${props.y}%` }}
    >
      <i />
      <i />
      <i />
    </span>
  );
}

function PlaceBuildingMenu(props: {
  readonly layout: PlaceLayout;
  readonly canEnter: boolean;
  readonly onEnter: (type: BuildingType) => void;
}) {
  return (
    <nav className="place-building-menu" aria-label="Здания поселения">
      {props.layout.buildings.map(({ type }) => (
        <button
          key={type}
          type="button"
          disabled={!props.canEnter}
          aria-label={`Открыть: ${buildingName(type, props.layout.ruined)}`}
          onClick={() => props.onEnter(type)}
        >
          {buildingName(type, props.layout.ruined)}
        </button>
      ))}
    </nav>
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
  props: Pick<PlaceProps, 'name' | 'onContracts' | 'onEquipment'> & {
    readonly building: PaintedBuilding;
    readonly layout: PlaceLayout;
    readonly onLeave: () => void;
    readonly returnRef: Ref<HTMLButtonElement>;
  },
) {
  const selected = props.layout.ruined ? RUIN_VISIT : BUILDINGS[props.building.type];
  return (
    <div className="place-interior" aria-label={selected.interior}>
      <PlaceDetail building={props.building} layout={props.layout} />
      <div className="place-interior-copy">
        <span className="place-eyebrow">
          {props.name} · {selected.interior}
        </span>
        <h3>{selected.name}</h3>
        <p>{selected.detail}</p>
        <p className="place-service">{selected.service}</p>
        <VisitAction
          type={props.building.type}
          ruined={props.layout.ruined}
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

function PlaceDetail(props: { readonly building: PaintedBuilding; readonly layout: PlaceLayout }) {
  const [x, y, width, height] = props.building.crop;
  return (
    <svg
      className="place-detail place-art"
      viewBox={`${x} ${y} ${width} ${height}`}
      aria-hidden="true"
      style={{ aspectRatio: `${width * props.layout.aspect} / ${height}` } as CSSProperties}
    >
      <image href={props.layout.painting} width="100" height="100" preserveAspectRatio="none" />
    </svg>
  );
}

function VisitAction(
  props: Pick<PlaceProps, 'onContracts' | 'onEquipment'> & {
    readonly type: BuildingType;
    readonly ruined: boolean;
  },
) {
  if (['elder', 'herbalist', 'watch', 'market', 'inn'].includes(props.type) || props.ruined) {
    return (
      <button className="action" type="button" onClick={props.onContracts}>
        Поручения и действия →
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
          ? '◆ Входы доступны вашему отряду'
          : '◇ Вид издали · чтобы войти, прибудьте сюда'}
      </span>
      <span>
        {props.inside ? 'Esc — на площадь' : 'Выберите вход · на узком экране листайте панораму'}
      </span>
    </footer>
  );
}
