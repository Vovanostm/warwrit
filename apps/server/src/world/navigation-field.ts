import {
  buildNavigationField,
  type NavigationField,
  type NavigationRegion,
} from '@warwrit/game-core';

// One compiled field per immutable region, shared by movement and observation.
const fields = new WeakMap<NavigationRegion, NavigationField>();

export function worldNavigationField(region: NavigationRegion): NavigationField {
  let field = fields.get(region);
  if (!field) {
    field = buildNavigationField(region);
    fields.set(region, field);
  }
  return field;
}
