import type { PathwayScopeSelection } from "../types";
import { geographyLabel, normalizeGeography } from "./geographyUtils";
import { ACROSS_REGIONS, ACROSS_SECTORS } from "./keyFeatureRules";

/**
 * Name the active scope in prose, or null when nothing is scoped.
 *
 * `"Steel in South East Asia"` / `"Steel"` / `"Singapore"`. The geography goes
 * through `geographyLabel` so a country token reads as its name rather than its
 * ISO code — the ribbon shows "Singapore", and a notice that said "SG" would
 * not obviously refer to the same badge.
 *
 * The ribbon never selects the keyFeature scope sentinels, but a resolved scope
 * can carry them when an empty axis was filled with its widest value (#869), so
 * they read as words rather than tokens: `"all sectors in all regions"`, not
 * `"across sectors in across regions"`.
 */
export function scopeSelectionLabel(
  scope: PathwayScopeSelection,
): string | null {
  const sector = scope.sector === ACROSS_SECTORS ? "all sectors" : scope.sector;
  const geography =
    scope.geography === null
      ? null
      : scope.geography === ACROSS_REGIONS
        ? "all regions"
        : geographyLabel(normalizeGeography(scope.geography));

  if (sector !== null && geography !== null) {
    return `${sector} in ${geography}`;
  }
  return sector ?? geography;
}
