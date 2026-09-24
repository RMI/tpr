import type { PathwayScopeSelection } from "../types";
import { geographyLabel, normalizeGeography } from "./geographyUtils";

/**
 * Name the active scope in prose, or null when nothing is scoped.
 *
 * `"Steel in South East Asia"` / `"Steel"` / `"Singapore"`. The geography goes
 * through `geographyLabel` so a country token reads as its name rather than its
 * ISO code — the ribbon shows "Singapore", and a notice that said "SG" would
 * not obviously refer to the same badge.
 */
export function scopeSelectionLabel(
  scope: PathwayScopeSelection,
): string | null {
  const geography =
    scope.geography === null
      ? null
      : geographyLabel(normalizeGeography(scope.geography));

  if (scope.sector !== null && geography !== null) {
    return `${scope.sector} in ${geography}`;
  }
  return scope.sector ?? geography;
}
