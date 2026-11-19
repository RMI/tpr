import type { Geography } from "../types";
import {
  geographyKind,
  geographyLabel,
  normalizeGeography,
  geographyMemberCodes,
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
  reason: "exact" | "containingRegion" | "global" | "broadest" | "none";
};

/**
 * Pick the best available geography for a plot.
 *
 * Order: the exact request → the smallest geography in the data that contains
 * every code of the requested country → `Global` → the broadest geography
 * present. "Contains" reads the pathway's own mapping, so a request for `HK`
 * falls back to a `CN` that includes it (#1071), and one for that `CN`
 * {CN, HK} only to a region holding both. `requested === null`
 * means "no preference", so it goes straight to the broadest and is NOT
 * reported as a fallback.
 *
 * Breadth ranking comes from `sortGeographiesForDetails`, which already orders
 * global → regions → countries, so its first entry is the broadest.
 *
 * @param available  Geographies present in the timeseries data.
 * @param requested  The reader's choice, or null for no preference.
 * @param pathwayGeography  The pathway's own metadata, used to resolve which
 *   region or country contains a requested country. Membership is the
 *   publication's mapping, never a shared region vocabulary.
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

  // A requested country may be covered by a broader geography the data does
  // carry: a region, or a country that includes it. Smallest first, so the
  // fallback stays as close to the request as the data allows.
  // Countries only: a region request (even a two-letter one like JRC's "EU")
  // goes on to Global, as it always has.
  const wantedISO = toISO2(wanted);
  if (wantedISO && geographyKind(wanted) === "country") {
    const declared = geographyMemberCodes(pathwayGeography, wanted);
    const wantedCodes: string[] = declared.length > 0 ? declared : [wantedISO];
    const containing = ranked
      .filter((geo) => geographyKind(geo) !== "global")
      .map((geo) => ({
        geo,
        codes: new Set<string>(geographyMemberCodes(pathwayGeography, geo)),
      }))
      .filter(
        ({ geo, codes }) =>
          normalizeGeography(geo) !== wanted &&
          wantedCodes.every((code) => codes.has(code)),
      )
      // Array#sort is stable, so equal sizes keep the ranked order.
      .sort((a, b) => a.codes.size - b.codes.size)[0]?.geo;
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
