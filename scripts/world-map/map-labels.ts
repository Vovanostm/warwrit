interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}
interface LabelContext {
  readonly viewport: Box;
  readonly blockers: readonly Box[];
  readonly placed: Box[];
}
type Offset = readonly [x: number, baseline: number];

function intersects(a: Box, b: Box): boolean {
  return (
    a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 4 && a.bottom > b.top - 4
  );
}

function available(box: Box, context: LabelContext): boolean {
  const v = context.viewport;
  return (
    box.left >= v.left + 5 &&
    box.right <= v.right - 5 &&
    box.top >= v.top + 5 &&
    box.bottom <= v.bottom - 5 &&
    !context.blockers.some((other) => intersects(box, other)) &&
    !context.placed.some((other) => intersects(box, other))
  );
}

function labelBox(origin: DOMMatrix, offset: Offset, width: number): Box {
  return {
    left: origin.e + offset[0] - width / 2,
    right: origin.e + offset[0] + width / 2,
    top: origin.f + offset[1] - 14,
    bottom: origin.f + offset[1] + 4,
  };
}

function showLabel(label: SVGTextElement, context: LabelContext): void {
  const marker = label.parentElement as unknown as SVGGElement;
  const origin = marker.getScreenCTM();
  if (!origin) return;
  const width = Number((label.dataset['textWidth'] ??= String(label.getComputedTextLength())));
  const side = width / 2 + 24;
  const choices: readonly Offset[] = [
    [0, -29],
    [side, 4],
    [0, 35],
    [-side, 4],
    [side, -28],
    [-side, -28],
    [side, 35],
    [-side, 35],
    [0, -58],
    [0, 63],
  ];
  const previous = Number(label.dataset['slot'] ?? 0);
  const slots = [previous, ...choices.map((_, i) => i).filter((i) => i !== previous)];
  const slot = slots.find((i) => available(labelBox(origin, choices[i]!, width), context));
  const leader = marker.querySelector<SVGLineElement>('.site-leader')!;
  label.style.visibility = slot === undefined ? 'hidden' : 'visible';
  leader.style.visibility = label.style.visibility;
  if (slot === undefined) return;
  const offset = choices[slot]!;
  label.dataset['slot'] = String(slot);
  label.setAttribute('x', String(offset[0]));
  label.setAttribute('y', String(offset[1]));
  leader.setAttribute('x2', String(offset[0] === 0 ? 0 : Math.sign(offset[0]) * 20));
  leader.setAttribute('y2', String(offset[1] < 0 ? offset[1] + 6 : offset[1] - 16));
  context.placed.push(labelBox(origin, offset, width));
}

function priority(label: SVGTextElement, focusedSiteId: string | undefined): number {
  if (label.parentElement?.getAttribute('data-site-id') === focusedSiteId) return 0;
  return label.dataset['major'] === 'true' ? 1 : 2;
}

/** Greedy cartographic labels: actual hit regions reserve space; anchors never move. */
export function layoutMapLabels(
  map: SVGSVGElement,
  overview: boolean,
  focusedSiteId?: string,
): void {
  const context: LabelContext = {
    viewport: map.getBoundingClientRect(),
    blockers: [
      ...map.querySelectorAll<SVGGraphicsElement>(
        '.site-hit, .group-hit, .marker-halo, .observed text',
      ),
    ]
      .filter((element) => getComputedStyle(element).visibility !== 'hidden')
      .map((element) => element.getBoundingClientRect()),
    placed: [],
  };
  const labels = [...map.querySelectorAll<SVGTextElement>('.site-label')].sort(
    (a, b) => priority(a, focusedSiteId) - priority(b, focusedSiteId),
  );
  for (const label of labels) {
    const minor = priority(label, focusedSiteId) === 2;
    if (overview && minor) {
      label.style.visibility = 'hidden';
      label.parentElement!.querySelector<SVGLineElement>('.site-leader')!.style.visibility =
        'hidden';
    } else {
      showLabel(label, context);
    }
  }
}
