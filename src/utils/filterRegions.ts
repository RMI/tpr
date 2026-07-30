/**
 * Filter regions (issue #798) — the predetermined vocabulary of regions a user
 * can pick in the search dropdown, each mapped to its ISO-3166-1 alpha-2 members.
 *
 * This is the "query side" of best-effort geography search: #783 matches a
 * selected filter region against each pathway's coverage by ISO overlap, and the
 * #869 resolver uses the same sets to compute geography containment. Kept here as
 * a plain, UI-independent map/util (per #797) so the dropdown and the resolver can
 * share one source of truth rather than duplicating region logic in the component.
 *
 * ⚠️ WORK IN PROGRESS — this is the beginning of #798, seeded with only the
 * regions that have a grounded, published definition, so downstream work (#783
 * filtering, #869 resolver) has real data to build and test against. The full
 * vocabulary — the five continental regions, "East Asia and Pacific", and the
 * individual countries — is still pending the finalized list under #798 and
 * product sign-off before it is added here. "Asia Pacific" (already grounded to
 * IEA WEO 2024 Annex C in the IEA pathway data) is the natural next addition.
 */
import { countryCodeSchema } from "../schema/common";
import type { GeographyCode } from "../types";
import { ABSENT_FILTER_TOKEN } from "./absent";
import {
  toISO2,
  countryNameFromISO2,
  normalizeGeography,
} from "./geographyUtils";

/**
 * Every ISO-3166-1 alpha-2 code recognised by the repo's schema. Canonical source
 * for the "Global" filter region (#798: "a 'Global' region that maps to all ISO
 * 3166 codes"), derived from the schema enum so it can never drift from the codes
 * pathways are actually allowed to use.
 */
export const ALL_COUNTRY_CODES: readonly GeographyCode[] = Object.freeze(
  (countryCodeSchema.enum as GeographyCode[] | undefined) ?? [],
);

/**
 * Multi-country filter regions with a grounded, publication-sourced membership.
 * Keyed by the user-facing label; values are ISO-3166-1 alpha-2 codes. The
 * `satisfies` clause makes TypeScript reject any code that is not a valid
 * `GeographyCode`, so a typo'd member fails the build.
 */
export const FILTER_REGIONS = {
  /**
   * The ten member states of ASEAN. Grounded: IEA World Energy Outlook 2024,
   * Annex C — "Southeast Asia: Brunei Darussalam, Cambodia, Indonesia, Lao PDR,
   * Malaysia, Myanmar, Philippines, Singapore, Thailand and Viet Nam. These
   * countries are all members of [ASEAN]." Matches the ACE (AEO8) and
   * TransitionZero (TZ-APG) pathway coverage already in this repo.
   */
  "Southeast Asia": [
    "BN",
    "KH",
    "ID",
    "LA",
    "MY",
    "MM",
    "PH",
    "SG",
    "TH",
    "VN",
  ],
} as const satisfies Record<string, readonly GeographyCode[]>;

/** A recognised filter-region label: a defined multi-country region or "Global". */
export type FilterRegionLabel = keyof typeof FILTER_REGIONS | "Global";

/** The special label whose membership is every recognised country code. */
export const GLOBAL_REGION_LABEL = "Global" as const;

/**
 * Resolve a filter-region label to its ISO-3166-1 alpha-2 member codes. "Global"
 * expands to every code in the schema; a defined region returns its membership.
 * Returns a fresh array so callers cannot mutate the shared config.
 */
export function filterRegionToISO(label: FilterRegionLabel): GeographyCode[] {
  if (label === GLOBAL_REGION_LABEL) return [...ALL_COUNTRY_CODES];
  return [...FILTER_REGIONS[label]];
}

/** Defined multi-country filter-region labels (excludes the special "Global"). */
export const FILTER_REGION_LABELS = Object.keys(
  FILTER_REGIONS,
) as (keyof typeof FILTER_REGIONS)[];

/**
 * A single selected geography-filter token, classified for matching.
 * - `absent` — the "None" bucket (pathways with no geography).
 * - `global` — the special "Global" label (matches only whole-world pathways).
 * - `iso` — a concrete ISO set: a defined region's members, a single country
 *   code, or the empty set for an unrecognised token (which then matches
 *   nothing, so stale/legacy selections degrade safely rather than throwing).
 */
export type SelectedGeography =
  | { kind: "absent" }
  | { kind: "global" }
  | { kind: "iso"; iso: Set<GeographyCode> };

/**
 * Classify one selected dropdown value into its match descriptor. This is the
 * query-side counterpart of {@link filterRegionToISO}: the search matcher (#783)
 * and the #869 resolver both interpret a user selection through here so they
 * share one vocabulary. Checked in order so the categories can't collide
 * (region labels are multi-word, never two letters).
 */
export function selectedGeographyToISO(value: string): SelectedGeography {
  if (value === ABSENT_FILTER_TOKEN) return { kind: "absent" };
  // Own-property check, not `in`: `in` walks the prototype chain, so tokens
  // like "toString" would be misread as regions and throw on `new Set(fn)`.
  if (Object.hasOwn(FILTER_REGIONS, value)) {
    return {
      kind: "iso",
      iso: new Set(FILTER_REGIONS[value as keyof typeof FILTER_REGIONS]),
    };
  }
  if (
    normalizeGeography(value).toLowerCase() ===
    GLOBAL_REGION_LABEL.toLowerCase()
  ) {
    return { kind: "global" };
  }
  const iso = toISO2(value);
  if (iso && countryNameFromISO2(iso)) {
    return { kind: "iso", iso: new Set([iso as GeographyCode]) };
  }
  return { kind: "iso", iso: new Set() };
}
