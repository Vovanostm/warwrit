import { useState, type CSSProperties } from 'react';
import type { placeBuildings } from './place-buildings.js';

type Layout = ReturnType<typeof placeBuildings>;

/** Background work anchored to painted buildings; never an NPC, witness or target. */
export function PlaceActivity({ layout }: { layout: Layout }) {
  const [phase] = useState(() => (Date.now() / 1000) % 29);
  if (layout.ruined) return null;
  return (
    <>
      {layout.buildings
        .filter((building) => ['forge', 'granary', 'watch'].includes(building.type))
        .map((building) => {
          const activity =
            building.type === 'forge' ? 'smith' : building.type === 'watch' ? 'guard' : 'porter';
          return (
            <span
              key={activity}
              className={`place-activity place-activity-${activity}`}
              aria-hidden="true"
              style={
                {
                  left: `${building.x + (activity === 'guard' ? 2 : -3)}%`,
                  top: `${building.y + 5}%`,
                  '--activity-phase': `${-(phase + (building.x % 7))}s`,
                } as CSSProperties
              }
            >
              <WorkerFigure activity={activity} />
            </span>
          );
        })}
    </>
  );
}

function WorkerFigure({ activity }: { activity: 'smith' | 'guard' | 'porter' }) {
  return (
    <svg viewBox="0 0 40 68" className="place-worker">
      <ellipse cx="20" cy="65" rx="13" ry="2" fill="#25251b" opacity=".35" />
      <g className="worker-body" stroke="#29261f" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M15 34L13 51 9 62 14 64 21 48 24 61 30 63 30 58 25 36Z" fill="#47463b" />
        <path
          d="M14 16L9 21 11 37 18 40 29 36 28 23 24 16Z"
          fill={activity === 'guard' ? '#53574d' : '#726551'}
        />
        <path d="M17 4L24 5 26 12 23 17 17 15 15 9Z" fill="#9b896b" />
        <path d="M15 8L15 4 20 2 25 5 25 9 21 7Z" fill="#403c32" />
        <path d="M17 19L23 21 25 35 14 36Z" fill="#39372e" />
        <path d="M10 22L8 31 12 39 16 37 12 29 16 22Z" fill="#726551" />
        {activity === 'smith' ? (
          <g className="worker-hammer">
            <path d="M25 21L31 27 33 16 36 17 35 32 29 33 23 26Z" fill="#726551" />
            <path d="M34 21L35 8" stroke="#5d4931" strokeWidth="2" />
            <path d="M30 6L39 6 39 10 30 11Z" fill="#444942" />
          </g>
        ) : activity === 'porter' ? (
          <>
            <path d="M24 15L32 11 37 17 36 35 28 38 23 32Z" fill="#958467" />
            <path d="M25 22L30 30 34 25" fill="none" stroke="#726551" strokeWidth="4" />
            <path d="M32 13L32 33" fill="none" opacity=".4" />
          </>
        ) : (
          <>
            <path d="M25 22L30 30 35 29" fill="none" stroke="#53574d" strokeWidth="4" />
            <path d="M35 62L35 8" stroke="#6d5841" strokeWidth="2" />
            <path d="M35 8L33 12 35 1 37 12Z" fill="#777b71" />
          </>
        )}
      </g>
    </svg>
  );
}
