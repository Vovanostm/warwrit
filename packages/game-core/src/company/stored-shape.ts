import { plainObject } from './input.js';
import { isEntityId, isExactInteger } from './values.js';

export function hasExactStoredFields(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  return (
    plainObject(value) &&
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key))
  );
}

export function companyLocationShape(value: unknown): boolean {
  if (!plainObject(value)) return false;
  return value['kind'] === 'AT'
    ? hasExactStoredFields(value, ['kind', 'siteId', 'areaId']) &&
        isEntityId(value['siteId']) &&
        isEntityId(value['areaId'])
    : value['kind'] === 'TERRAIN'
      ? hasExactStoredFields(value, ['kind', 'regionVersion', 'q', 'r']) &&
        typeof value['regionVersion'] === 'string' &&
        value['regionVersion'].length > 0 &&
        isExactInteger(value['q'], true) &&
        isExactInteger(value['r'], true)
      : value['kind'] === 'MOVING'
        ? hasExactStoredFields(value, [
            'kind',
            'segmentId',
            'regionVersion',
            'fromQ',
            'fromR',
            'toQ',
            'toR',
            'startedAt',
            'arrivalNotBefore',
          ]) &&
          ['segmentId', 'regionVersion'].every((key) => isEntityId(value[key])) &&
          ['fromQ', 'fromR', 'toQ', 'toR'].every((key) => isExactInteger(value[key], true)) &&
          isExactInteger(value['startedAt']) &&
          isExactInteger(value['arrivalNotBefore'])
        : value['kind'] === 'TRANSIT' &&
          hasExactStoredFields(value, [
            'kind',
            'segmentId',
            'from',
            'to',
            'startedAt',
            'arrivalNotBefore',
          ]) &&
          ['segmentId', 'from', 'to'].every((key) => isEntityId(value[key])) &&
          isExactInteger(value['startedAt']) &&
          isExactInteger(value['arrivalNotBefore']);
}
