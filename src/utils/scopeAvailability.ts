import type { PathwayMetadataType } from "../types";
import { pathwayToolAvailability } from "./timeseriesAvailability";

/**
 * Which sector and geography tokens the scope ribbon can usefully select: those
 * with something on the page to show for them (#1017). The others render
 * outlined and cannot be clicked.
 */
export interface ScopeAvailability {
  hasSector: (sector: string) => boolean;
  hasGeography: (geography: string) => boolean;
}

/** Every token available: the behaviour before #1017, for callers without data. */
export const ALL_AVAILABLE: ScopeAvailability = {
  hasSector: () => true,
  hasGeography: () => true,
};

/**
 * A sector is available when the pathway has benchmark data for it or records a
 * dependency for exactly that sector; a geography only when it has benchmark
 * data, since dependencies are not scoped by geography.
 *
 * Exact matches only: an "across sectors" or Global entry does not make every
 * other token available, or nearly every badge would stay clickable.
 *
 * Key features do not count yet: they are not filtered by scope, so selecting
 * a token for its key features alone would change nothing visible. Once #869
 * scopes them, they belong here too.
 */
export function scopeAvailability(
  pathway: Pick<PathwayMetadataType, "dependencies">,
  datasets: Array<{ summary?: unknown }>,
): ScopeAvailability {
  const timeseries = pathwayToolAvailability(datasets);
  const dependencySectors = new Set<string>(
    (pathway.dependencies ?? []).map((d) => d.sector),
  );

  return {
    hasSector: (sector) =>
      timeseries.hasSector(sector) || dependencySectors.has(sector),
    hasGeography: (geography) => timeseries.hasGeography(geography),
  };
}
