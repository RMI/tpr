import type { Geography } from "../types";
import {
  canonicalGeographyKey,
  geographyKind,
  geographyLabel,
  normalizeGeography,
  regionMemberCodes,
  sortGeographiesForDetails,
  toISO2,
} from "./geographyUtils";

/**
 * Which geography a plot actually ended up showing, and whether that is the one
 * the reader asked for.
 *
 * A timeseries file rarely carries every geography its pathway metadata
 * declares — `UTS-ISF-OECM-2024` declares global plus 19 countries but ships
 * only `Global` and `ID`. Before this existed, a geography miss silently
 * produced an empty chart. `fellBack` is what lets the UI say "you asked for
 * Vietnam; this is the South East Asia series" instead.
 */
export type GeographyResolution = {
  /** The geography to filter the timeseries on; null when there is nothing to plot. */
  used: string | null;
  /** Echo of what was asked for, for rendering the explanation. */
  requested: string | null;
  /** True when `used` is broader than (or simply different from) `requested`. */
  fellBack: boolean;
  reason:
    | "exact"
    | "labelVariant"
    | "containingRegion"
    | "global"
    | "broadest"
    | "none";
};

/**
 * Pick the best available geography for a plot.
 *
 * Order: the exact request → a region in the data that contains the requested
 * country → `Global` → the broadest geography present. `requested === null`
 * means "no preference", so it goes straight to the broadest and is NOT
 * reported as a fallback.
 *
 * Breadth ranking comes from `sortGeographiesForDetails`, which already orders
 * global → regions → countries, so its first entry is the broadest.
 *
 * @param available  Geographies present in the timeseries data.
 * @param requested  The reader's choice, or null for no preference.
 * @param pathwayGeography  The pathway's own metadata, used to resolve which
 *   region contains a requested country. Region membership is the publication's
 *   mapping, never a shared region vocabulary.
 */
export function resolveGeography(
  available: string[],
  requested: string | null,
  pathwayGeography: Geography | null | undefined,
): GeographyResolution {
  const ranked = sortGeographiesForDetails(available);
  const wanted = normalizeGeography(requested);

  if (ranked.length === 0) {
    return {
      used: null,
      requested: wanted || null,
      fellBack: false,
      reason: "none",
    };
  }

  const broadest = ranked[0];

  if (!wanted) {
    return {
      used: broadest,
      requested: null,
      fellBack: false,
      reason: "broadest",
    };
  }

  const exact = ranked.find((geo) => normalizeGeography(geo) === wanted);
  if (exact !== undefined) {
    return { used: exact, requested: wanted, fellBack: false, reason: "exact" };
  }

  /*
    The same region spelled differently is still the same region, so this is a
    match rather than a fallback. Without it, IEA-APS asking for its own
    declared "Southeast Asia" misses its timeseries' "South East Asia", fails
    the ISO step below (a region label is not an ISO code) and lands on Global —
    reporting a fallback while the exact series sits in the file. See #945 for
    the underlying data inconsistency, which this makes harmless.
  */
  const wantedKey = canonicalGeographyKey(wanted);
  const variant = ranked.find(
    (geo) => canonicalGeographyKey(geo) === wantedKey,
  );
  if (variant !== undefined) {
    return {
      used: variant,
      requested: wanted,
      fellBack: false,
      reason: "labelVariant",
    };
  }

  // A requested country may be covered by a region the data does carry.
  const wantedISO = toISO2(wanted);
  if (wantedISO) {
    const containing = ranked.find(
      (geo) =>
        geographyKind(geo) === "region" &&
        regionMemberCodes(pathwayGeography, geo).some(
          (code) => code === wantedISO,
        ),
    );
    if (containing !== undefined) {
      return {
        used: containing,
        requested: wanted,
        fellBack: true,
        reason: "containingRegion",
      };
    }
  }

  const global = ranked.find((geo) => geographyKind(geo) === "global");
  if (global !== undefined) {
    return {
      used: global,
      requested: wanted,
      fellBack: true,
      reason: "global",
    };
  }

  return {
    used: broadest,
    requested: wanted,
    fellBack: true,
    reason: "broadest",
  };
}

/**
 * The one-line explanation shown when a resolution had to widen, or null when
 * it did not.
 *
 * Shared by the detail page's plot grid and the comparison page's columns so the
 * two cannot word the same fact differently. Note the phrasing avoids claiming
 * the geography is unavailable "for this pathway" — once the request comes from
 * a scope control it is one of the pathway's own declared geographies, and what
 * is missing is the timeseries, not the coverage.
 */
export function geographyFallbackNote(
  resolution: GeographyResolution,
): string | null {
  if (!resolution.fellBack || !resolution.requested || !resolution.used) {
    return null;
  }
  const requested = geographyLabel(normalizeGeography(resolution.requested));
  const used = geographyLabel(normalizeGeography(resolution.used));
  return `No timeseries data for ${requested}; showing ${used} instead.`;
}
