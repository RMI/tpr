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
 * Source of truth: the "Transition Pathways Repository — Filter Regions"
 * definition doc, confirmed with the product owner (#798). It defines five
 * continental regions plus a set of finer economic/geographic sub-regions, each
 * with an explicit ISO-3166-1 alpha-2 membership. The "Global" region (every
 * recognised code) and the individual countries are added by the query layer
 * ({@link filterRegionToISO} / {@link selectedGeographyToISO}), so they are not
 * repeated in {@link FILTER_REGIONS}.
 *
 * Edge-case assignments (confirmed with the product owner, #798): RU → Europe,
 * TR → Asia, CY (Cyprus) → Europe, GL (Greenland) → America. (The doc's prose
 * summary said GL → Europe, but its membership tables — and the product owner —
 * place Greenland in the Americas.) AQ (Antarctica) is intentionally
 * unassigned — no permanent population or single sovereign state — so it appears
 * only under "Global".
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
 * Multi-country filter regions and their ISO-3166-1 alpha-2 memberships, taken
 * verbatim from the #798 "Filter Regions" definition doc (product-owner
 * confirmed). Keyed by the user-facing label. The `satisfies` clause makes
 * TypeScript reject any code that is not a valid `GeographyCode`, so a typo'd
 * member fails the build.
 *
 * Two tiers, both flat in this map (the dropdown lists and sorts all labels
 * together): the five mutually exclusive continental regions, then the finer
 * economic/geographic sub-regions (which deliberately overlap continents and
 * each other — e.g. Cyprus is in both the EU and Europe (Continental)).
 */
export const FILTER_REGIONS = {
  // Five continental regions — mutually exclusive, and together a partition of
  // every recognised code except AQ (Antarctica), which is intentionally
  // unassigned (no permanent population or single sovereign state) and appears
  // only under "Global". Each finer sub-region below is therefore a subset of
  // one or more of these. See the coverage test in filterRegions.test.ts.
  "America (Continental)": [
    "AG",
    "AI",
    "AR",
    "AW",
    "BB",
    "BL",
    "BM",
    "BO",
    "BQ",
    "BR",
    "BS",
    "BZ",
    "CA",
    "CL",
    "CO",
    "CR",
    "CU",
    "CW",
    "DM",
    "DO",
    "EC",
    "FK",
    "GD",
    "GF",
    "GL",
    "GP",
    "GS",
    "GT",
    "GY",
    "HN",
    "HT",
    "JM",
    "KN",
    "KY",
    "LC",
    "MF",
    "MQ",
    "MS",
    "MX",
    "NI",
    "PA",
    "PE",
    "PM",
    "PR",
    "PY",
    "SR",
    "SV",
    "SX",
    "TC",
    "TT",
    "US",
    "UY",
    "VC",
    "VE",
    "VG",
    "VI",
  ],
  "Africa (Continental)": [
    "AO",
    "BF",
    "BI",
    "BJ",
    "BV",
    "BW",
    "CD",
    "CF",
    "CG",
    "CI",
    "CM",
    "CV",
    "DJ",
    "DZ",
    "EG",
    "EH",
    "ER",
    "ET",
    "GA",
    "GH",
    "GM",
    "GN",
    "GQ",
    "GW",
    "KE",
    "KM",
    "LR",
    "LS",
    "LY",
    "MA",
    "MG",
    "ML",
    "MR",
    "MU",
    "MW",
    "MZ",
    "NA",
    "NE",
    "NG",
    "RE",
    "RW",
    "SC",
    "SD",
    "SH",
    "SL",
    "SN",
    "SO",
    "SS",
    "ST",
    "SZ",
    "TD",
    "TG",
    "TN",
    "TZ",
    "UG",
    "YT",
    "ZA",
    "ZM",
    "ZW",
  ],
  "Europe (Continental)": [
    "AD",
    "AL",
    "AT",
    "AX",
    "BA",
    "BE",
    "BG",
    "BY",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FO",
    "FR",
    "GB",
    "GG",
    "GI",
    "GR",
    "HR",
    "HU",
    "IE",
    "IM",
    "IS",
    "IT",
    "JE",
    "LI",
    "LT",
    "LU",
    "LV",
    "MC",
    "MD",
    "ME",
    "MK",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "RS",
    "RU",
    "SE",
    "SI",
    "SJ",
    "SK",
    "SM",
    "UA",
    "VA",
  ],
  "Asia (Continental)": [
    "AE",
    "AF",
    "AM",
    "AZ",
    "BD",
    "BH",
    "BN",
    "BT",
    "CC",
    "CN",
    "CX",
    "GE",
    "HK",
    "ID",
    "IL",
    "IN",
    "IO",
    "IQ",
    "IR",
    "JO",
    "JP",
    "KG",
    "KH",
    "KP",
    "KR",
    "KW",
    "KZ",
    "LA",
    "LB",
    "LK",
    "MM",
    "MN",
    "MO",
    "MV",
    "MY",
    "NP",
    "OM",
    "PH",
    "PK",
    "PS",
    "QA",
    "SA",
    "SG",
    "SY",
    "TH",
    "TJ",
    "TL",
    "TM",
    "TR",
    "TW",
    "UZ",
    "VN",
    "YE",
  ],
  "Australia & Oceania (Continental)": [
    "AS",
    "AU",
    "CK",
    "FJ",
    "FM",
    "GU",
    "HM",
    "KI",
    "MH",
    "MP",
    "NC",
    "NF",
    "NR",
    "NU",
    "NZ",
    "PF",
    "PG",
    "PN",
    "PW",
    "SB",
    "TF",
    "TK",
    "TO",
    "TV",
    "UM",
    "VU",
    "WF",
    "WS",
  ],

  // Finer economic / geographic sub-regions — overlap the continents and one
  // another by design.
  "North America": ["BM", "CA", "GL", "MX", "PM", "US"],
  "Central America & Caribbean": [
    "AG",
    "AI",
    "AW",
    "BB",
    "BL",
    "BQ",
    "BS",
    "BZ",
    "CR",
    "CU",
    "CW",
    "DM",
    "DO",
    "GD",
    "GP",
    "GT",
    "HN",
    "HT",
    "JM",
    "KN",
    "KY",
    "LC",
    "MF",
    "MQ",
    "MS",
    "NI",
    "PA",
    "PR",
    "SV",
    "SX",
    "TC",
    "TT",
    "VC",
    "VG",
    "VI",
  ],
  "South America": [
    "AR",
    "BO",
    "BR",
    "CL",
    "CO",
    "EC",
    "FK",
    "GF",
    "GS",
    "GY",
    "PE",
    "PY",
    "SR",
    "UY",
    "VE",
  ],
  "European Union (EU)": [
    "AT",
    "BE",
    "BG",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GR",
    "HR",
    "HU",
    "IE",
    "IT",
    "LT",
    "LU",
    "LV",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SE",
    "SI",
    "SK",
  ],
  "Middle East & North Africa": [
    "AE",
    "BH",
    "DJ",
    "DZ",
    "EG",
    "EH",
    "IL",
    "IQ",
    "IR",
    "JO",
    "KW",
    "LB",
    "LY",
    "MA",
    "OM",
    "PS",
    "QA",
    "SA",
    "SY",
    "TN",
    "TR",
    "YE",
  ],
  "Sub-Saharan Africa": [
    "AO",
    "BF",
    "BI",
    "BJ",
    "BV",
    "BW",
    "CD",
    "CF",
    "CG",
    "CI",
    "CM",
    "CV",
    "DJ",
    "EH",
    "ER",
    "ET",
    "GA",
    "GH",
    "GM",
    "GN",
    "GQ",
    "GW",
    "KE",
    "KM",
    "LR",
    "LS",
    "MG",
    "ML",
    "MR",
    "MU",
    "MW",
    "MZ",
    "NA",
    "NE",
    "NG",
    "RE",
    "RW",
    "SC",
    "SD",
    "SH",
    "SL",
    "SN",
    "SO",
    "SS",
    "ST",
    "SZ",
    "TD",
    "TG",
    "TZ",
    "UG",
    "YT",
    "ZA",
    "ZM",
    "ZW",
  ],
  "Central Asia": ["KG", "KZ", "TJ", "TM", "UZ"],
  "South Asia": ["AF", "BD", "BT", "IN", "MV", "NP", "PK", "LK"],
  /**
   * The ten member states of ASEAN. Also grounded in IEA World Energy Outlook
   * 2024, Annex C, and matches the ACE (AEO8) and TransitionZero (TZ-APG)
   * pathway coverage already in this repo.
   */
  "Southeast Asia": [
    "BN",
    "ID",
    "KH",
    "LA",
    "MM",
    "MY",
    "PH",
    "SG",
    "TH",
    "TL",
    "VN",
  ],
  "East Asia and Pacific": [
    "AS",
    "AU",
    "BN",
    "CC",
    "CK",
    "CN",
    "CX",
    "FJ",
    "FM",
    "GU",
    "HK",
    "ID",
    "IN",
    "JP",
    "KH",
    "KI",
    "KP",
    "KR",
    "LA",
    "MH",
    "MM",
    "MN",
    "MO",
    "MP",
    "MY",
    "NC",
    "NF",
    "NR",
    "NU",
    "NZ",
    "PF",
    "PG",
    "PH",
    "PN",
    "PW",
    "SB",
    "SG",
    "TH",
    "TK",
    "TL",
    "TO",
    "TV",
    "TW",
    "UM",
    "VN",
    "VU",
    "WF",
    "WS",
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
