import { MovementTerrain } from './MovementTerrain.js';
import { ContinuousMapCanvas } from './ContinuousMapCanvas.js';
import { useContinuousMovement } from './continuous-movement.js';
import './game.css';
import { useEffect, useState, type ReactNode } from 'react';

import type {
  CompanyHoldingsDto,
  CompanySummaryDto,
  WorldAvailableDepartureDto,
  WorldFreeMovementResponseDto,
  WorldPartyReadResponseDto,
  WorldSurroundingsDto,
} from '@warwrit/protocol';

import type { WorldTravelAction } from '../world-travel-attempt.js';
import { CompanyPanel } from './CompanyPanel.js';
import { formatCrowns, itemLabel, siteKindLabel } from './format.js';
import {
  estimatedLight,
  estimatedTick,
  useNow,
  useSurroundings,
  type SurroundingsReading,
} from './surroundings.js';
import { departureKey, TravelPanel } from './TravelPanel.js';
import { WorldMap, type PartyMarker } from './WorldMap.js';
import { WorldMapCanvas } from './WorldMapCanvas.js';
import { placeIllustration } from '../renderer/art.js';
import { FreeMovementPanel } from './FreeMovementPanel.js';
import type { FreeMovementAction, FreeMovementScope } from '../world-free-movement-attempt.js';

type Tab = 'travel' | 'place' | 'company';
const TRANSIT_REFRESH_MS = 15_000;

export function GameShell(props: {
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto | undefined;
  readonly world: WorldPartyReadResponseDto;
  readonly freeMovement: WorldFreeMovementResponseDto | null;
  readonly freeMovementScope: FreeMovementScope;
  readonly freeMovementPending: boolean;
  readonly freeMovementMessage?: string;
  readonly travelBusy: boolean;
  readonly travelPending: boolean;
  readonly returnWindowOpen: boolean;
  readonly travelMessage?: string;
  readonly onTravel: (action: WorldTravelAction) => void;
  readonly onRetryTravel: () => void;
  readonly onRefreshWorld: () => void;
  readonly onRefreshFreeMovement: () => void;
  readonly onFreeMovement: (action: FreeMovementAction) => void;
  readonly onRetryFreeMovement: () => void;
  readonly onSignOut: () => void;
  readonly equipBusy: boolean;
  readonly equipMessage?: string;
  readonly onEquip: (characterId: string, item: CompanyHoldingsDto['items'][number]) => void;
  readonly onToggleCamp: (pitch: boolean) => void;
  readonly placeSlot: ReactNode;
  readonly battleSlot: ReactNode;
}) {
  const movement = useContinuousMovement(
    props.freeMovementScope,
    props.onRefreshWorld,
    props.world.party?.movementVersion !== 1 &&
      (props.world.schemaVersion === 1
        ? !props.world.route
        : !props.world.execution || props.world.execution.phase === 'COMPLETE'),
  );
  const party = props.world.party;
  const surroundings = useSurroundings(
    `${props.world.publicRevision}:${party?.routeEpoch ?? ''}:${party?.location ?? ''}`,
  );
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>('travel');
  const [selected, setSelected] = useState<WorldAvailableDepartureDto | null>(null);
  const [selectedHex, setSelectedHex] = useState<{ readonly q: number; readonly r: number } | null>(
    null,
  );
  const [selectedHexPath, setSelectedHexPath] = useState<
    readonly { readonly q: number; readonly r: number }[] | undefined
  >();
  const [freeSiteTargeting, setFreeSiteTargeting] = useState(false);
  const [focusSiteId, setFocusSiteId] = useState<string | null>(null);

  const execution = props.world.schemaVersion === 2 ? props.world.execution : null;
  const legacyRoute = props.world.schemaVersion === 1 ? props.world.route : null;
  const freeMovement = props.freeMovement;
  const freeRoute = freeMovement?.movement?.status === 'MOVING' ? freeMovement.movement : null;
  const travelling = movement.current
    ? movement.current.mode === 'MOVING'
    : legacyRoute !== null ||
      (execution !== null && execution.phase !== 'COMPLETE') ||
      freeRoute !== null;

  // A selection that the server no longer offers is dropped.
  const departures = props.world.availableDepartures ?? [];
  const selectedKey = selected ? departureKey(selected) : null;
  useEffect(() => {
    if (selectedKey && !departures.some((entry) => departureKey(entry) === selectedKey))
      setSelected(null);
  }, [departures, selectedKey]);

  // While on the road, the server worker advances the route; re-read it periodically.
  const { onRefreshWorld, onRefreshFreeMovement, travelBusy } = props;
  useEffect(() => {
    if (!travelling) return;
    const id = setInterval(() => {
      if (travelBusy) return;
      if (freeRoute) onRefreshFreeMovement();
      else onRefreshWorld();
    }, TRANSIT_REFRESH_MS);
    return () => clearInterval(id);
  }, [travelling, travelBusy, freeRoute, onRefreshFreeMovement, onRefreshWorld]);

  if (surroundings.status === 'loading') {
    return <div className="game-loading">Разворачиваем карту…</div>;
  }
  if (surroundings.status === 'unavailable') {
    return (
      <div className="game-loading" role="alert">
        Карта мира недоступна: нет связи с сервером. Повторим автоматически.
      </div>
    );
  }
  const reading = surroundings.reading;
  const map = reading.dto.map;
  const tick = estimatedTick(reading, now);
  const light = estimatedLight(reading, now);
  const msPerTick = Number(reading.dto.campaign.msPerTick);
  const ticksPerDay = Number(reading.dto.campaign.ticksPerDay);
  const siteName = (siteId: string) =>
    map.sites.find((site) => site.siteId === siteId)?.name ?? siteId;

  const reachable = new Set(travelling ? [] : departures.map((departure) => departure.toSiteId));
  const plannedEdgeIds = travelling
    ? (execution?.edgeIds ?? legacyRoute?.edgeIds ?? [])
    : (selected?.edgeIds ?? []);
  const plannedHexPath = selectedHex ? selectedHexPath : freeRoute?.path;
  const freePosition = freeRoute
    ? freePositionAt(freeRoute.path, freeRoute.startedAt, tick, freeRoute.ticksPerHex)
    : freeMovement?.party?.position.kind === 'TERRAIN'
      ? freeMovement.party.position
      : undefined;
  const marker = freePosition
    ? {
        at: { kind: 'TERRAIN' as const, ...freePosition },
        label: props.company.companyPresentation?.name ?? 'Ваш отряд',
      }
    : partyMarker(props.world, map, tick, props.company);
  const hostileSiteIds = new Set((reading.dto.observedHostiles ?? []).map((entry) => entry.siteId));
  const focusSite = map.sites.find(
    (site) => site.siteId === (focusSiteId ?? (travelling ? null : party?.location)),
  );

  const selectSite = (siteId: string) => {
    if (freeSiteTargeting) {
      const site = map.sites.find((entry) => entry.siteId === siteId);
      if (site) {
        setSelectedHex({ q: site.q, r: site.r });
        setSelectedHexPath(undefined);
        setSelected(null);
        setFreeSiteTargeting(false);
        setTab('travel');
        return;
      }
    }
    setSelectedHex(null);
    setSelectedHexPath(undefined);
    setFocusSiteId(siteId);
    const options = departures.filter((departure) => departure.toSiteId === siteId);
    if (!travelling && options.length > 0) {
      const preferred = options.find((option) => option.purpose === 'NEW') ?? options[0]!;
      setSelected(preferred);
      setTab('travel');
    } else {
      setTab('place');
    }
  };

  return (
    <div className={`game-shell${light.phase === 'NIGHT' ? ' game-night' : ''}`}>
      <header className="game-topbar">
        <a className="wordmark" href="/" aria-label="Warwrit">
          <span className="sigil" aria-hidden="true">
            <span>W</span>
          </span>
          <span className="wordmark-text">Warwrit</span>
        </a>
        <div className="topbar-company">
          <span className="topbar-name">
            {props.company.companyPresentation?.name ?? 'Компания без имени'}
          </span>
          {props.holdings && (
            <span className="topbar-money" title="Казна компании">
              {formatCrowns(props.holdings.cashQ)} кр.
            </span>
          )}
        </div>
        <Clocks tick={tick} ticksPerDay={ticksPerDay} light={light} stale={surroundings.stale} />
        <button className="action action-quiet" type="button" onClick={props.onSignOut}>
          Выйти
        </button>
      </header>

      <div className="game-main">
        <div className="map-frame">
          {map.continuous &&
          props.world.party?.movementVersion !== 1 &&
          !legacyRoute &&
          (!execution || execution.phase === 'COMPLETE') ? (
            <ContinuousMapCanvas
              region={map.continuous}
              sites={map.sites}
              current={movement.current}
              clock={movement.clock.current}
              night={light.phase === 'NIGHT'}
              onMove={movement.send}
              onSelectSite={selectSite}
            />
          ) : (
            <>
              {' '}
              <WorldMapCanvas
                map={map}
                night={light.phase === 'NIGHT'}
                party={marker}
                observed={reading.dto.observedCompanies}
                hostileSiteIds={hostileSiteIds}
                reachableSiteIds={reachable}
                selectedSiteId={selected?.toSiteId ?? focusSiteId}
                plannedEdgeIds={plannedEdgeIds}
                selectedHex={selectedHex}
                {...(plannedHexPath === undefined ? {} : { plannedHexPath })}
                onSelectSite={selectSite}
                onSelectTerrain={(position) => {
                  setSelectedHex(position);
                  setSelectedHexPath(undefined);
                  setSelected(null);
                  setFocusSiteId(null);
                  setTab('travel');
                }}
                fallback={
                  <WorldMap
                    map={map}
                    night={light.phase === 'NIGHT'}
                    party={marker}
                    moving={travelling}
                    observed={reading.dto.observedCompanies}
                    hostileSiteIds={hostileSiteIds}
                    reachableSiteIds={reachable}
                    selectedSiteId={selected?.toSiteId ?? focusSiteId}
                    plannedEdgeIds={plannedEdgeIds}
                    {...(plannedHexPath === undefined ? {} : { plannedHexPath })}
                    onSelectSite={selectSite}
                  />
                }
              />
            </>
          )}
          <p className="map-legend">
            {map.regionName} · ПКМ — идти · S — остановиться · зажать ЛКМ — двигать карту
          </p>
        </div>

        <aside className="game-side">
          <nav className="tabs" aria-label="Разделы">
            <TabButton tab="travel" current={tab} onSelect={setTab}>
              Путь
            </TabButton>
            <TabButton tab="place" current={tab} onSelect={setTab}>
              Место
            </TabButton>
            <TabButton tab="company" current={tab} onSelect={setTab}>
              Отряд
            </TabButton>
          </nav>
          <div hidden={tab !== 'travel'}>
            {map.continuous &&
            props.world.party?.movementVersion !== 1 &&
            !legacyRoute &&
            (!execution || execution.phase === 'COMPLETE') ? (
              <section className="panel travel-panel" aria-label="Путешествие">
                <h2 className="panel-title">Путь</h2>
                <p className="travel-status">
                  {movement.current?.mode === 'MOVING'
                    ? Number(movement.current.plan?.arrivesAtMs ?? 0) <=
                      movement.clock.current.serverMs +
                        performance.now() -
                        movement.clock.current.receivedAt
                      ? 'Прибываем…'
                      : `Отряд движется. Осталось ${Math.max(0, Math.ceil((Number(movement.current.plan?.arrivesAtMs ?? 0) - (movement.clock.current.serverMs + performance.now() - movement.clock.current.receivedAt)) / 1000))} с.`
                    : movement.current?.mode === 'STATIONARY_SITE'
                      ? 'Отряд в поселении.'
                      : movement.current
                        ? 'Отряд остановился в местности.'
                        : 'Сверяем положение отряда…'}
                </p>
                <MovementTerrain
                  current={movement.current}
                  region={map.continuous}
                  serverMs={
                    movement.clock.current.serverMs +
                    performance.now() -
                    movement.clock.current.receivedAt
                  }
                />
                {movement.current?.mode === 'MOVING' && (
                  <button
                    className="action"
                    disabled={movement.busy}
                    onClick={() => movement.send({ kind: 'STOP' })}
                  >
                    Остановиться
                  </button>
                )}
                {movement.busy && <p role="status">Отправляем приказ…</p>}
                {movement.unknown && (
                  <button className="action" onClick={movement.retry}>
                    Повторить сохранённый приказ
                  </button>
                )}
                {movement.message && (
                  <p className="travel-error" role="alert">
                    {movement.message}
                  </p>
                )}
                <p className="state-note">
                  Нажмите правой кнопкой по земле или поселению. Новый приказ меняет цель из
                  текущего положения.
                </p>
              </section>
            ) : (
              <>
                {' '}
                <TravelPanel
                  world={props.world}
                  map={map}
                  currentTick={tick}
                  msPerTick={msPerTick}
                  selected={selected}
                  busy={props.travelBusy}
                  pendingAttempt={props.travelPending}
                  returnWindowOpen={props.returnWindowOpen}
                  {...(props.travelMessage === undefined ? {} : { message: props.travelMessage })}
                  onSelect={(departure) => {
                    setSelected(departure);
                    if (departure) setFocusSiteId(departure.toSiteId);
                  }}
                  onTravel={(action) => {
                    props.onTravel(action);
                    setSelected(null);
                  }}
                  onRetry={props.onRetryTravel}
                  onRefresh={props.onRefreshWorld}
                />
                <FreeMovementPanel
                  map={map}
                  current={props.freeMovement}
                  destination={selectedHex}
                  scope={props.freeMovementScope}
                  msPerTick={msPerTick}
                  busy={props.travelBusy}
                  pending={props.freeMovementPending}
                  {...(props.freeMovementMessage === undefined
                    ? {}
                    : { message: props.freeMovementMessage })}
                  onDestination={setSelectedHex}
                  onPreviewPath={setSelectedHexPath}
                  siteTargeting={freeSiteTargeting}
                  onSiteTargeting={setFreeSiteTargeting}
                  onMove={(action) => {
                    props.onFreeMovement(action);
                    setSelectedHex(null);
                    setSelectedHexPath(undefined);
                  }}
                  onRetry={props.onRetryFreeMovement}
                />
              </>
            )}
          </div>
          <div hidden={tab !== 'place'}>
            <section className="panel place-panel" aria-label="Место">
              {focusSite ? (
                <>
                  {placeIllustration(focusSite.siteId) && (
                    <img
                      className="place-illustration"
                      src={placeIllustration(focusSite.siteId)}
                      alt=""
                    />
                  )}
                  <h2 className="panel-title">{focusSite.name}</h2>
                  <p className="place-kind">
                    {siteKindLabel(focusSite.kind)}
                    {focusSite.danger === 'DANGEROUS' ? ' · опасно' : ''}
                  </p>
                  <p className="state-note">
                    {!travelling && party?.location === focusSite.siteId
                      ? 'Ваш отряд здесь.'
                      : `Отряд не здесь. ${
                          reachable.has(focusSite.siteId)
                            ? 'Путь сюда открыт на вкладке «Путь».'
                            : 'Прямого пути отсюда сейчас нет.'
                        }`}
                  </p>
                  {!travelling && party?.location === focusSite.siteId && (
                    <div className="camp-row">
                      {props.holdings?.fieldCamp ? (
                        <>
                          <p className="state-note">
                            Отряд стоит лагерем: еду добывают на месте, пайки не тратятся. Чтобы
                            выступить, сверните лагерь.
                          </p>
                          <button
                            type="button"
                            className="quiet-action"
                            disabled={props.equipBusy}
                            onClick={() => props.onToggleCamp(false)}
                          >
                            Свернуть лагерь
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="quiet-action"
                          disabled={props.equipBusy}
                          onClick={() => props.onToggleCamp(true)}
                        >
                          Разбить лагерь
                        </button>
                      )}
                    </div>
                  )}
                  {reading.dto.observerSiteId === focusSite.siteId && (
                    <>
                      <ObservedHostiles observed={reading.dto.observedHostiles ?? []} />
                      <ObservedCompanies observed={reading.dto.observedCompanies} />
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2 className="panel-title">В дороге</h2>
                  <p className="state-note">
                    Отряд между поселениями. Выберите место на карте, чтобы узнать о нём.
                  </p>
                </>
              )}
            </section>
            {props.placeSlot}
          </div>
          <div hidden={tab !== 'company'}>
            <CompanyPanel
              company={props.company}
              holdings={props.holdings}
              equipBusy={props.equipBusy}
              {...(props.equipMessage === undefined ? {} : { equipMessage: props.equipMessage })}
              onEquip={props.onEquip}
            />
          </div>
        </aside>
      </div>

      <section className="game-battle">{props.battleSlot}</section>
      <footer className="game-footer">
        Локальная альфа ·{' '}
        {movement.current
          ? movement.current.mode === 'MOVING'
            ? 'отряд в пути'
            : movement.current.mode === 'STATIONARY_TERRAIN'
              ? 'отряд в местности'
              : 'отряд в поселении'
          : travelling && marker?.at.kind === 'ROAD'
            ? `в пути к ${siteName(marker.at.toSiteId)}`
            : party
              ? `стоянка: ${siteName(party.location)}`
              : 'без партии'}
      </footer>
    </div>
  );
}

function TabButton(props: {
  readonly tab: Tab;
  readonly current: Tab;
  readonly onSelect: (tab: Tab) => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tab${props.current === props.tab ? ' tab-active' : ''}`}
      aria-pressed={props.current === props.tab}
      onClick={() => props.onSelect(props.tab)}
    >
      {props.children}
    </button>
  );
}

function freePositionAt(
  path: readonly { readonly q: number; readonly r: number }[],
  startedAt: string,
  tick: number,
  ticksPerHex: number,
): { readonly q: number; readonly r: number } {
  const index = Math.min(
    path.length - 1,
    Math.max(0, Math.floor((tick - Number(startedAt)) / ticksPerHex)),
  );
  return path[index] ?? path[0] ?? { q: 0, r: 0 };
}

function ObservedCompanies(props: {
  readonly observed: WorldSurroundingsDto['observedCompanies'];
}) {
  if (props.observed.length === 0)
    return <p className="state-note">Других компаний здесь не видно.</p>;
  return (
    <>
      <h3 className="panel-subtitle">Здесь же стоят</h3>
      <ul className="supplies">
        {props.observed.map((entry, index) => (
          <li key={`${entry.companyName}:${index}`}>
            <span>{entry.companyName}</span>
            <span>{entry.memberCount} чел.</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function hostileLabel(entityId: string, weaponItemId: string): string {
  if (entityId.startsWith('world.wolf.'))
    return entityId.includes('.leader.') ? 'Вожак волчьей стаи' : 'Волк';
  if (entityId.startsWith('world.beast.')) return 'Огромный зверь';
  return `Налётчик · ${itemLabel(weaponItemId).toLowerCase()}`;
}

function ObservedHostiles(props: { readonly observed: WorldSurroundingsDto['observedHostiles'] }) {
  if (props.observed.length === 0) return null;
  return (
    <>
      <h3 className="panel-subtitle panel-subtitle-danger">Враги на месте</h3>
      <ul className="supplies hostiles">
        {props.observed.map((entry) => (
          <li key={entry.entityId}>
            <span>{hostileLabel(entry.entityId, entry.weaponItemId)}</span>
            <span>{entry.wounded ? 'ранен' : 'цел'}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Clocks(props: {
  readonly tick: number;
  readonly ticksPerDay: number;
  readonly light: ReturnType<typeof estimatedLight>;
  readonly stale: boolean;
}) {
  const day = Math.floor(props.tick / props.ticksPerDay) + 1;
  const dayTick = Math.floor(props.tick % props.ticksPerDay);
  const left = Math.ceil(props.light.msLeft / 1000);
  const minutes = Math.floor(left / 60);
  const seconds = (left % 60).toString().padStart(2, '0');
  return (
    <div className="clocks" aria-label="Время мира">
      <span className="clock" title="День кампании: 1000 тактов за 6 часов">
        День {day} · такт {dayTick}
      </span>
      <span
        className={`clock clock-light clock-${props.light.phase.toLowerCase()}`}
        title="Свет: 10 минут дня и 5 минут ночи, отдельно от дня кампании"
      >
        {props.light.phase === 'DAY' ? '☀ День' : '☾ Ночь'} · ещё {minutes}:{seconds}
      </span>
      {props.stale && (
        <span className="clock clock-stale" role="status">
          нет связи
        </span>
      )}
    </div>
  );
}

function partyMarker(
  world: WorldPartyReadResponseDto,
  map: SurroundingsReading['dto']['map'],
  tick: number,
  company: CompanySummaryDto,
): PartyMarker | null {
  const party = world.party;
  if (!party) return null;
  const label = company.companyPresentation?.name ?? 'Ваш отряд';
  const ticksOf = (edgeId: string) =>
    map.edges.find((edge) => edge.edgeId === edgeId)?.travelTicks ?? 1;
  const otherEnd = (edgeId: string, from: string) => {
    const edge = map.edges.find((entry) => entry.edgeId === edgeId);
    if (!edge) return from;
    return edge.fromSiteId === from ? edge.toSiteId : edge.fromSiteId;
  };

  if (world.schemaVersion === 2 && world.execution && world.execution.phase !== 'COMPLETE') {
    const execution = world.execution;
    const edgeId = execution.edgeIds[execution.nextEdgeIndex];
    if (execution.phase !== 'IN_TRANSIT' || !edgeId || !execution.activeSegment)
      return { at: { kind: 'SITE', siteId: execution.currentSiteId }, label };
    const length = ticksOf(edgeId);
    const left = Number(execution.activeSegment.dueTick) - tick;
    return {
      at: {
        kind: 'ROAD',
        fromSiteId: execution.currentSiteId,
        toSiteId: otherEnd(edgeId, execution.currentSiteId),
        progress: 1 - left / length,
      },
      label,
    };
  }
  if (world.schemaVersion === 1 && world.route) {
    const route = world.route;
    const started = Number(route.startedAt);
    const total = Math.max(1, Number(route.dueTick) - started);
    let travelled = Math.min(total, Math.max(0, tick - started));
    let at = party.location;
    for (const edgeId of route.edgeIds) {
      const length = ticksOf(edgeId);
      const next = otherEnd(edgeId, at);
      if (travelled < length)
        return {
          at: { kind: 'ROAD', fromSiteId: at, toSiteId: next, progress: travelled / length },
          label,
        };
      travelled -= length;
      at = next;
    }
    return { at: { kind: 'SITE', siteId: at }, label };
  }
  return { at: { kind: 'SITE', siteId: party.location }, label };
}
