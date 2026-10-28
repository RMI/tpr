import type { PathwayMetadataType } from "../types";
import { asEntries } from "./keyFeatureScope";
import {
  MEASURE_NOT_APPLICABLE,
  isScopeLevelNotApplicable,
} from "./keyFeatureRules";
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
 * Does a key-feature value say something about its scope? Not the two
 * not-applicable markers, which the resolver skips, and not "No information":
 * a token whose only values are "No information" would show nothing new when
 * selected.
 */
function isInformative(value: unknown): boolean {
  if (value == null || isScopeLevelNotApplicable(value)) return false;
  if (value === MEASURE_NOT_APPLICABLE) return false;
  const values = Array.isArray(value) ? value : [value];
  return values.some((v) => v !== "No information");
}

/** The sectors and geographies key features record informative values at. */
function keyFeatureScopes(
  keyFeatures: PathwayMetadataType["keyFeatures"] | undefined,
): { sectors: Set<string>; geographies: Set<string> } {
  const sectors = new Set<string>();
  const geographies = new Set<string>();
  for (const field of Object.values(keyFeatures ?? {})) {
    for (const entry of asEntries(field)) {
      if (!isInformative(entry.value)) continue;
      sectors.add(entry.sector);
      geographies.add(entry.geography);
    }
  }
  return { sectors, geographies };
}

/**
 * A sector is available when the pathway has benchmark data for it, records a
 * dependency for exactly that sector, or (with `keyFeatures`) records an
 * informative key-feature value at exactly that sector. A geography needs
 * benchmark data or, with `keyFeatures`, a key-feature value there:
 * dependencies are not scoped by geography.
 *
 * Exact matches only: an "across sectors" or Global entry does not make every
 * other token available, or nearly every badge would stay clickable.
 *
 * `keyFeatures` is for pages that resolve key features for the selected scope
 * (#869): the detail page. The comparison page leaves it off until it resolves
 * them per column too, since selecting a token for its key features alone would
 * change nothing visible there.
 */
export function scopeAvailability(
  pathway: Pick<PathwayMetadataType, "dependencies" | "keyFeatures">,
  datasets: Array<{ summary?: unknown }>,
  { keyFeatures = false }: { keyFeatures?: boolean } = {},
): ScopeAvailability {
  const timeseries = pathwayToolAvailability(datasets);
  const dependencySectors = new Set<string>(
    (pathway.dependencies ?? []).map((d) => d.sector),
  );
  const recorded = keyFeatures
    ? keyFeatureScopes(pathway.keyFeatures)
    : { sectors: new Set<string>(), geographies: new Set<string>() };

  return {
    hasSector: (sector) =>
      timeseries.hasSector(sector) ||
      dependencySectors.has(sector) ||
      recorded.sectors.has(sector),
    hasGeography: (geography) =>
      timeseries.hasGeography(geography) || recorded.geographies.has(geography),
  };
}
