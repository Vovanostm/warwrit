import { useEffect, useState } from 'react';

import type { CompanySummaryDto, FirstHuntReadResponseDto } from '@warwrit/protocol';

import { FirstHunt } from '../FirstHunt.js';
import type { FirstHuntScope } from '../first-hunt-attempt.js';
import type { ContractVisitProps } from './contract-visits.js';
import { HostileLootPanel } from './HostileLootPanel.js';

const REFRESH_MS = 15_000;

/** Hunts after FIRST HUNT: shown where offered, and while the company takes part. */
export function HuntList(
  props: ContractVisitProps & {
    readonly scope: FirstHuntScope;
    readonly company: CompanySummaryDto;
    readonly location: string | null;
    readonly refreshKey: number;
    readonly onUnauthorized: () => void;
    readonly onRefreshCompany: () => void;
    readonly onEncounterDiscovered: () => void;
    readonly onRewardPaid?: () => void;
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
        .map(({ contract }) => {
          if (!contract) return null;
          const scope = { ...props.scope, instanceId: contract.instanceId };
          return (
            <div className="hunt-journey" key={contract.instanceId}>
              <FirstHunt
                visit={props.visit}
                canVisit={props.canVisit}
                onJournal={props.onJournal}
                onVisitIssuer={props.onVisitIssuer}
                scope={scope}
                location={props.location}
                onUnauthorized={props.onUnauthorized}
                refreshKey={props.refreshKey}
                onEncounterDiscovered={props.onEncounterDiscovered}
                {...(props.onRewardPaid ? { onRewardPaid: props.onRewardPaid } : {})}
              />
              {contract.terminal?.effects === 'APPLIED' && !contract.terminal.hostileRetreated && (
                <HostileLootPanel
                  key={`${props.scope.accountId}:${props.scope.companyId}:${contract.instanceId}`}
                  accountId={props.scope.accountId}
                  company={props.company}
                  instanceId={contract.instanceId}
                  refreshKey={props.refreshKey}
                  onRefresh={props.onRefreshCompany}
                  onUnauthorized={props.onUnauthorized}
                />
              )}
            </div>
          );
        })}
    </>
  );
}
