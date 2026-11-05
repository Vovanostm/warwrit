import type { WorldFreeMovementV2ResponseDto } from '@warwrit/protocol';

type Point = WorldFreeMovementV2ResponseDto['point'];
type DisplayFrame = { readonly point: Point; readonly spanIndex: number };

/** One display frame owns the accepted position and its active speed span. */
export function continuousMovementFrameAt(
  current: WorldFreeMovementV2ResponseDto | null,
  serverMs: number,
): DisplayFrame | null {
  if (!current) return null;
  const plan = current.plan;
  if (!plan) return { point: current.point, spanIndex: -1 };
  const elapsed = Math.max(0, (serverMs - Number(plan.startedAtMs)) * 1000);
  const spanIndex = plan.speedSpans.findIndex((span) => elapsed < Number(span.endOffsetUs));
  const span = plan.speedSpans[spanIndex];
  if (!span) return { point: plan.goal, spanIndex: plan.speedSpans.length };

  let from = span.from;
  let to = span.to;
  let along = Math.min(
    1,
    Math.max(
      0,
      (elapsed - Number(span.startOffsetUs)) /
        (Number(span.endOffsetUs) - Number(span.startOffsetUs)),
    ),
  );
  if (plan.planVersion === 3 && span.geometry) {
    from = plan.path[span.geometry.segmentIndex]!;
    to = plan.path[span.geometry.segmentIndex + 1]!;
    const start = Number(span.geometry.fromT.numerator) / Number(span.geometry.fromT.denominator);
    const end = Number(span.geometry.toT.numerator) / Number(span.geometry.toT.denominator);
    along = start + (end - start) * along;
  }
  return {
    point: {
      xMicroFp: String(
        Number(from.xMicroFp) + (Number(to.xMicroFp) - Number(from.xMicroFp)) * along,
      ),
      zMicroFp: String(
        Number(from.zMicroFp) + (Number(to.zMicroFp) - Number(from.zMicroFp)) * along,
      ),
    },
    spanIndex,
  };
}

/** Point-only view for callers that do not render the remaining route spans. */
export function continuousMovementPositionAt(
  current: WorldFreeMovementV2ResponseDto | null,
  serverMs: number,
): Point | null {
  return continuousMovementFrameAt(current, serverMs)?.point ?? null;
}
