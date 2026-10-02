import './game.css';
import { useEffect, useState, type ReactNode } from 'react';

import type {
  CompanyHoldingsDto,
  CompanySummaryDto,
  WorldAvailableDepartureDto,
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

type Tab = 'travel' | 'place' | 'company';
const TRANSIT_REFRESH_MS = 15_000;

export function GameShell(props: {
  readonly company: CompanySummaryDto;
  readonly holdings: CompanyHoldingsDto | undefined;
  readonly world: WorldPartyReadResponseDto;
  readonly travelBusy: boolean;
  readonly travelPending: boolean;
  readonly returnWindowOpen: boolean;
  readonly travelMessage?: string;
  readonly onTravel: (action: WorldTravelAction) => void;
  readonly onRetryTravel: () => void;
  readonly onRefreshWorld: () => void;
  readonly onSignOut: () => void;
  readonly equipBusy: boolean;
  readonly equipMessage?: string;
  readonly onEquip: (characterId: string, item: CompanyHoldingsDto['items'][number]) => void;
  readonly onToggleCamp: (pitch: boolean) => void;
  readonly placeSlot: ReactNode;
  readonly battleSlot: ReactNode;
}) {
  const party = props.world.party;
  const surroundings = useSurroundings(
    `${props.world.publicRevision}:${party?.routeEpoch ?? ''}:${party?.location ?? ''}`,
  );
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>('travel');
  const [selected, setSelected] = useState<WorldAvailableDepartureDto | null>(null);
  const [focusSiteId, setFocusSiteId] = useState<string | null>(null);

  const execution = props.world.schemaVersion === 2 ? props.world.execution : null;
  const legacyRoute = props.world.schemaVersion === 1 ? props.world.route : null;
  const travelling = legacyRoute !== null || (execution !== null && execution.phase !== 'COMPLETE');

  // A selection that the server no longer offers is dropped.
  const departures = props.world.availableDepartures ?? [];
  const selectedKey = selected ? departureKey(selected) : null;
  useEffect(() => {
    if (selectedKey && !departures.some((entry) => departureKey(entry) === selectedKey))
      setSelected(null);
  }, [departures, selectedKey]);

  // While on the road, the server worker advances the route; re-read it periodically.
  const { onRefreshWorld, travelBusy } = props;
  useEffect(() => {
    if (!travelling) return;
    const id = setInterval(() => {
      if (!travelBusy) onRefreshWorld();
    }, TRANSIT_REFRESH_MS);
    return () => clearInterval(id);
  }, [travelling, travelBusy, onRefreshWorld]);

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
  const marker = partyMarker(props.world, map, tick, props.company);
  const hostileSiteIds = new Set((reading.dto.observedHostiles ?? []).map((entry) => entry.siteId));
  const focusSite = map.sites.find(
    (site) => site.siteId === (focusSiteId ?? (travelling ? null : party?.location)),
  );

  const selectSite = (siteId: string) => {
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
          <WorldMapCanvas
            map={map}
            night={light.phase === 'NIGHT'}
            party={marker}
            observed={reading.dto.observedCompanies}
            hostileSiteIds={hostileSiteIds}
            reachableSiteIds={reachable}
            selectedSiteId={selected?.toSiteId ?? focusSiteId}
            plannedEdgeIds={plannedEdgeIds}
            onSelectSite={selectSite}
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
                onSelectSite={selectSite}
              />
            }
          />
          <p className="map-legend">
            {map.regionName} · нажмите на место на карте, чтобы проложить путь
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
        {travelling && marker?.at.kind === 'ROAD'
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
