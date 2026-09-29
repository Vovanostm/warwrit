import { CONTRACT_M1_CATALOGUE } from './manifest.js';
import type { BoundContractInstance, ContractCatalogue, ContractDefinition } from './types.js';

function copyAndFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => copyAndFreeze(entry))) as T;
  }
  if (value && typeof value === 'object') {
    const copy = Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, copyAndFreeze(entry)]),
    );
    return Object.freeze(copy) as T;
  }
  return value;
}

export function definitionFor(
  editionId: string,
  definitionId: string,
  catalogue: ContractCatalogue = CONTRACT_M1_CATALOGUE,
): ContractDefinition | undefined {
  const definition = catalogue.editions
    .find((edition) => edition.editionId === editionId)
    ?.definitions.find((entry) => entry.definitionId === definitionId);
  return definition ? copyAndFreeze(definition) : undefined;
}

export function bindContractInstance(
  editionId: string,
  instanceId: string,
  catalogue: ContractCatalogue = CONTRACT_M1_CATALOGUE,
): BoundContractInstance | undefined {
  const edition = catalogue.editions.find((entry) => entry.editionId === editionId);
  const instance = edition?.initialInstances.find((entry) => entry.instanceId === instanceId);
  const definition =
    instance && definitionFor(instance.definitionEdition, instance.definitionId, catalogue);
  if (!instance || !definition) return undefined;
  return copyAndFreeze({
    instanceId: instance.instanceId,
    definitionId: instance.definitionId,
    definitionEdition: instance.definitionEdition,
    definition,
  });
}

export { CONTRACT_M1_CATALOGUE, CONTRACT_M1_EDITION } from './manifest.js';
export { validateContractCatalogue } from './validate.js';
export type * from './types.js';
