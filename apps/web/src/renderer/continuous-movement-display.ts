import type { WorldFreeMovementV2ResponseDto } from '@warwrit/protocol';

type Point = WorldFreeMovementV2ResponseDto['point'];

/** Display-only position on the accepted plan at the supplied server time. */
export function continuousMovementPositionAt(
  current: WorldFreeMovementV2ResponseDto | null,
  serverMs: number,
): Point | null {
  if (!current) return null;
  const plan = current.plan;
  if (!plan) return current.point;
  const elapsed = Math.max(0, (serverMs - Number(plan.startedAtMs)) * 1000);
  const spanIndex = plan.speedSpans.findIndex((span) => elapsed < Number(span.endOffsetUs));
  const span = plan.speedSpans[spanIndex];
  if (!span) return plan.goal;

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
    xMicroFp: String(Number(from.xMicroFp) + (Number(to.xMicroFp) - Number(from.xMicroFp)) * along),
    zMicroFp: String(Number(from.zMicroFp) + (Number(to.zMicroFp) - Number(from.zMicroFp)) * along),
  };
}
