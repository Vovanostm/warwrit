import type { WorldContinuousMapDto, WorldFreeMovementV2ResponseDto } from '@warwrit/protocol';
import { insidePolygon } from '../renderer/map-geography.js';

const terrainNames: Readonly<Record<string, string>> = {
  grassland: 'Луга',
  forest: 'Лес',
  hills: 'Холмы',
  marsh: 'Болото',
  riverbank: 'Берег',
  rock: 'Каменистая земля',
  deep_water: 'Вода',
  cliff: 'Скалы',
  road: 'Дорога',
  trail: 'Тропа',
  dirt_road: 'Грунтовая дорога',
  paved_road: 'Мощёный тракт',
  bridge: 'Мост',
  ford: 'Брод',
};

/** Shows the accepted speed span, rather than guessing speed from a painted texture. */
export function MovementTerrain(props: {
  readonly current: WorldFreeMovementV2ResponseDto | null;
  readonly region: WorldContinuousMapDto;
  readonly serverMs: number;
}) {
  const { current, region, serverMs } = props;
  if (!current) return null;
  if (current.plan) {
    const elapsed = Math.max(0, (serverMs - Number(current.plan.startedAtMs)) * 1000);
    const span =
      current.plan.speedSpans.find((s) => elapsed < Number(s.endOffsetUs)) ??
      current.plan.speedSpans.at(-1);
    if (!span) return null;
    return (
      <p className="state-note">
        {terrainNames[span.overlayId ?? span.terrainId] ?? 'Местность'} · скорость ×
        {span.speedPermille / 1000} от скорости в поле
      </p>
    );
  }
  if (current.surface)
    return (
      <p className="state-note">
        {terrainNames[current.surface.overlayId ?? current.surface.terrainId] ?? 'Местность'} ·
        отряд стоит
      </p>
    );
  const x =
    region.origin.xFp +
    (Math.floor((Number(current.point.xMicroFp) / 65536 - region.origin.xFp) / region.cellSizeFp) +
      0.5) *
      region.cellSizeFp;
  const z =
    region.origin.zFp +
    (Math.floor((Number(current.point.zMicroFp) / 65536 - region.origin.zFp) / region.cellSizeFp) +
      0.5) *
      region.cellSizeFp;
  const terrain = region.terrainShapes
    .filter((s) => insidePolygon(x, z, s.polygon))
    .sort((a, b) => b.paintPriority - a.paintPriority)[0];
  const overlay = region.overlayShapes
    .filter((s) => insidePolygon(x, z, s.polygon))
    .toSorted(
      (a, b) =>
        (region.navigationOverlayOrder?.indexOf(a.overlayId) ?? 0) -
        (region.navigationOverlayOrder?.indexOf(b.overlayId) ?? 0),
    )[0];
  return (
    <p className="state-note">
      {terrainNames[overlay?.overlayId ?? terrain?.terrainId ?? ''] ?? 'Местность'} · отряд стоит
    </p>
  );
}
