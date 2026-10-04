import { useEffect, useState } from 'react';

import type { FirstHuntReadResponseDto } from '@warwrit/protocol';

import { FirstHunt } from '../FirstHunt.js';
import type { FirstHuntScope } from '../first-hunt-attempt.js';
import type { ContractVisitProps } from './contract-visits.js';

const REFRESH_MS = 15_000;

/** Hunts after FIRST HUNT: shown where offered, and while the company takes part. */
export function HuntList(
  props: ContractVisitProps & {
    readonly scope: FirstHuntScope;
    readonly location: string | null;
    readonly refreshKey: number;
    readonly onUnauthorized: () => void;
    readonly onEncounterDiscovered: () => void;
  },
) {
  const [hunts, setHunts] = useState<readonly FirstHuntReadResponseDto[]>([]);
  const { onUnauthorized } = props;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/contracts/hunts', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (response.status === 401) {
          onUnauthorized();
          return;
        }
        if (!response.ok) return;
        const body = (await response.json()) as {
          readonly schemaVersion: 1;
          readonly hunts: readonly FirstHuntReadResponseDto[];
        };
        if (!cancelled && body.schemaVersion === 1 && Array.isArray(body.hunts))
          setHunts(body.hunts);
      } catch {
        // The list is advisory; each hunt card reports its own failures.
      }
    };
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [onUnauthorized, props.location, props.refreshKey]);

  return (
    <>
      {hunts
        .filter(
          ({ contract }) =>
            contract &&
            (contract.yourRole !== 'NONE' ||
              (contract.knownState !== 'SETTLED' &&
                contract.terms.issuerLocation.siteId === props.location)),
        )
        .map(({ contract }) => (
          <FirstHunt
            visit={props.visit}
            canVisit={props.canVisit}
            onJournal={props.onJournal}
            onVisitIssuer={props.onVisitIssuer}
            key={contract!.instanceId}
            scope={{ ...props.scope, instanceId: contract!.instanceId }}
            location={props.location}
            onUnauthorized={props.onUnauthorized}
            refreshKey={props.refreshKey}
            onEncounterDiscovered={props.onEncounterDiscovered}
          />
        ))}
    </>
  );
}
