export interface RouteScreenPoint {
  readonly x: number;
  readonly y: number;
}
export interface RouteScreenRect extends RouteScreenPoint {
  readonly width: number;
  readonly height: number;
}
export interface RouteOverlayFrame {
  readonly width: number;
  readonly height: number;
  readonly traversed: readonly RouteScreenPoint[];
  readonly remaining: readonly RouteScreenPoint[];
  readonly partyBounds: RouteScreenRect;
  readonly goal: RouteScreenPoint;
  readonly goalSiteId: string | undefined;
}

function labelOverlapsParty(label: RouteScreenRect, party: RouteScreenRect) {
  return (
    label.x + label.width > party.x - 6 &&
    label.x < party.x + party.width + 6 &&
    label.y + label.height > party.y - 6 &&
    label.y < party.y + party.height + 6
  );
}

/** Keep the moving banner clear of labels using their actual CSS bounds. */
function avoidPartyLabels(svg: SVGSVGElement, party: RouteScreenRect | undefined) {
  const labels = svg.parentElement?.querySelectorAll<HTMLElement>('.map-label');
  if (!labels) return;
  const canvasBounds = svg.getBoundingClientRect();
  labels.forEach((label) => {
    label.style.translate = '0 0';
    if (!party) return;
    const rect = label.getBoundingClientRect();
    const position = {
      x: rect.left - canvasBounds.left,
      y: rect.top - canvasBounds.top,
      width: rect.width,
      height: rect.height,
    };
    if (!labelOverlapsParty(position, party)) return;
    const above = party.y - rect.height - 6;
    const targetTop =
      above >= 4
        ? above
        : Math.min(canvasBounds.height - rect.height - 4, party.y + party.height + 6);
    label.style.translate = `0 ${targetTop - position.y}px`;
  });
}

/** A presentation of the accepted route; never an owner of movement or time. */
export function mountRouteOverlay(svg: SVGSVGElement, legend: HTMLDivElement) {
  const history = [...svg.querySelectorAll<SVGPathElement>('[data-route="history"]')];
  const remaining = [...svg.querySelectorAll<SVGPathElement>('[data-route="remaining"]')];
  const goal = svg.querySelector<SVGGElement>('[data-route="goal"]')!;
  const path = (points: readonly RouteScreenPoint[]) => {
    if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
  };
  return (frame: RouteOverlayFrame | null) => {
    svg.style.display = frame ? 'block' : 'none';
    legend.style.display = frame ? 'flex' : 'none';
    avoidPartyLabels(svg, frame?.partyBounds);
    if (!frame) return;
    svg.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
    const past = path(frame.traversed),
      next = path(frame.remaining);
    for (const line of history) line.setAttribute('d', past);
    for (const line of remaining) line.setAttribute('d', next);
    let destination = frame.goal;
    if (frame.goalSiteId) {
      const label = svg.parentElement?.querySelector<HTMLElement>(
        `[data-site-id="${CSS.escape(frame.goalSiteId)}"]`,
      );
      if (label) {
        const rect = label.getBoundingClientRect(),
          bounds = svg.getBoundingClientRect();
        destination = {
          x: rect.left - bounds.left - 12,
          y: rect.top - bounds.top + rect.height / 2,
        };
      }
    }
    const visible = Number.isFinite(destination.x) && Number.isFinite(destination.y);
    goal.style.display = visible ? '' : 'none';
    if (visible) goal.setAttribute('transform', `translate(${destination.x} ${destination.y})`);
  };
}
