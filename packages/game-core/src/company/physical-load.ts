import { createCompanyPhysicalState, validatePhysicalState } from './physical-state.js';
import type { CompanyEconomyState } from './economy-types.js';
import type { PhysicalInitialization } from './physical-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';

/**
 * Explicit compatibility boundary for schema-v1 lifecycle+finance snapshots.
 * Empty legacy condition lists can materialize with no invented health; non-empty
 * lists require real instance/source/onset bindings supplied by the loader.
 */
export function materializeCompanyPhysicalState(
  state: CompanyEconomyState,
  initialization: PhysicalInitialization = {},
): MaterializedCompanyState {
  const root: MaterializedCompanyState = state.physical
    ? { lifecycle: state.lifecycle, finance: state.finance, physical: state.physical }
    : {
        lifecycle: state.lifecycle,
        finance: state.finance,
        physical: createCompanyPhysicalState(state.lifecycle, initialization),
      };
  validatePhysicalState(root);
  return root;
}
