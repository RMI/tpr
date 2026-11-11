import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import type { Geography, GeographyCode } from "../types";
countries.registerLocale(en);

export type GeographyKind = "global" | "region" | "country";

// Wording from the RMI policy doc (#917, replacing #800's). Single source of truth
// for the region-mapping disclaimer, rendered on the methodology page, in the
// detail-page geography tooltip, and under the Geography filter dropdown — the
// three places a user meets a region→country mapping.
export const REGION_MAPPING_DISCLAIMER =
  "Country and regional representations follow the conventions used in the " +
  "underlying data sources and do not reflect any institutional point of view by RMI.";

// Flatten the structured geography object into the ordered flat token list the
// rest of the app historically operated on: "Global" (when global) → region
// labels → country codes. This intentionally does NOT expand region membership
// into countries — it carries regions as their label only. ISO-overlap
// geography matching (#797) reads the populated `regions` member arrays via
// `pathwayISOCoverage` instead; this function is still used for display tokens
// (badges, sort) and the "absent geography" check (`isGeographyAbsent`).
// `geographyKind`/`geographyLabel`/`sortGeographiesForDetails` continue to work
// on the individual string tokens this returns.
export function flattenGeography(geo: Geography | null | undefined): string[] {
  if (!geo || typeof geo !== "object") return [];
  const tokens: string[] = [];
  if (geo.global) tokens.push("Global");
  if (geo.regions) tokens.push(...Object.keys(geo.regions));
  if (geo.country) tokens.push(...Object.keys(geo.country));
  return tokens;
}

// The ISO-3166-1 alpha-2 codes a pathway actually covers: the codes of every
// `country` entry (a country can include territories, e.g. CN with HK, #1071)
// and of every `regions` entry.
// Unlike `flattenGeography` (which carries keys and labels, not members), this is
// the country-level expansion used for ISO-overlap geography matching. The
// `global` flag is intentionally NOT expanded here — it is a separate boolean,
// so a global-only pathway yields an empty coverage set (which is what makes
// "a below-global filter never matches a global-only pathway" fall out for
// free in the matcher). Entries that aren't recognised ISO-3166-1 alpha-2
// codes are dropped (`toISO2` + a name lookup), so the result only ever holds
// real country codes — matching the query side (`selectedGeographyToISO`).
export function pathwayISOCoverage(
  geo: Geography | null | undefined,
): Set<GeographyCode> {
  const codes = new Set<GeographyCode>();
  if (!geo || typeof geo !== "object") return codes;
  const add = (raw: string) => {
    const iso = toISO2(raw);
    if (iso && countryNameFromISO2(iso)) codes.add(iso as GeographyCode);
  };
  for (const members of [
    ...Object.values(geo.country ?? {}),
    ...Object.values(geo.regions ?? {}),
  ]) {
    if (Array.isArray(members)) members.forEach(add);
  }
  return codes;
}

// The ISO-3166-1 alpha-2 codes one of a pathway's OWN tokens declares: a
// `regions[label]` entry's members, or a `country[code]` entry's codes (a
// country can include territories, e.g. CN with HK and MO, #1071). Always the
// publication's mapping, never the filter-region vocabulary in
// `filterRegions.ts`. `flattenGeography` carries keys only, so this is how
// display code gets the membership behind a badge back (#799). Returns an empty
// array for a token the pathway does not declare; every declared region has two
// or more members and every country at least its own code. `geographyKind`
// cannot tell an undeclared label apart — it answers "region" for any
// non-Global, non-country token — so a caller that needs to know has to look
// for the token in `geo` itself. Regions are looked up first, so a two-letter
// region label such as JRC's "EU" reads as the region it is. Unrecognised codes
// are dropped and duplicates collapsed, matching `pathwayISOCoverage`, and the
// order comes from `sortGeographiesForDetails` so members read A→Z by ISO2
// exactly like country badges elsewhere.
export function geographyMemberCodes(
  geo: Geography | null | undefined,
  token: string,
): GeographyCode[] {
  if (!geo || typeof geo !== "object") return [];
  const wanted = normalizeGeography(token);
  if (!wanted) return [];
  // Match on the normalized form so the lookup accepts the same token
  // `flattenGeography` emitted, even if the raw key carries stray whitespace.
  // Exact otherwise: timeseries labels are the metadata's own (#945, enforced
  // by validateTimeseries), so no spelling fold is needed.
  const regionKey = Object.keys(geo.regions ?? {}).find(
    (k) => normalizeGeography(k) === wanted,
  );
  const members: unknown =
    regionKey !== undefined
      ? geo.regions?.[regionKey]
      : geo.country?.[toISO2(wanted) ?? ""];
  if (!Array.isArray(members)) return [];
  const codes = new Set<string>();
  for (const raw of members) {
    const iso = toISO2(String(raw));
    if (iso && countryNameFromISO2(iso)) codes.add(iso);
  }
  return sortGeographiesForDetails([...codes]) as GeographyCode[];
}

// Whether a geography badge lists members in a tooltip: every region does (an
// undeclared one says it has no mapping), and so does a country that includes
// more than its own code — NGFS's US with Puerto Rico and the US Virgin Islands.
// A plain country, and Global, have nothing to list, and a tooltip-less badge
// stays a plain span with no focus trigger.
export function hasMemberList(
  geo: Geography | null | undefined,
  token: string,
): boolean {
  const kind = geographyKind(token);
  if (kind === "region") return true;
  if (kind === "global") return false;
  const self = toISO2(token);
  return geographyMemberCodes(geo, token).some((code) => code !== self);
}

// A pathway has "absent" geography when flattening yields no tokens — i.e. an
// empty/missing geography object (`{}`, `undefined`, or the legacy empty array).
// Single source of truth shared by the "None" facet gate and the ABSENT match
// arm so the two can never disagree about what counts as empty.
export function isGeographyAbsent(geo: Geography | null | undefined): boolean {
  return flattenGeography(geo).length === 0;
}

//Normalize to a safe string: accept strings (and basic primitives), drop everything else.
export function normalizeGeography(raw: unknown): string {
  let s = "";
  if (typeof raw === "string") s = raw;
  else if (typeof raw === "number" || typeof raw === "boolean") s = String(raw);
  else return ""; // objects, null, undefined, symbols, functions → treated as empty

  return s.replace(/[\u200B-\u200D\u2060\uFEFF\u00A0]/g, "").trim();
}

const ISO2 = /^[A-Za-z]{2}$/;

export function toISO2(raw: string): string | null {
  const s = normalizeGeography(raw).toUpperCase();
  if (!s) return null;
  return ISO2.test(s) ? s : null;
}

const NAME_CACHE = new Map<string, string>();
export function countryNameFromISO2(code: string): string | null {
  const cc = toISO2(code);
  if (!cc) return null;
  const cached = NAME_CACHE.get(cc);
  if (cached) return cached;
  const name = countries.getName(cc, "en");
  if (!name) return null;
  NAME_CACHE.set(cc, name);
  return name;
}

export function assertKnownCountryISO2(raw: string): string {
  const iso2 = toISO2(raw);
  if (!iso2) {
    throw new Error(`Not an ISO-2 code: ${raw}`);
  }
  const name = countryNameFromISO2(iso2);
  if (!name) {
    throw new Error(`Unknown ISO-2 country code: ${iso2}`);
  }
  return iso2; // normalized uppercase
}

export function geographyKind(raw: string): GeographyKind {
  const s = normalizeGeography(raw ?? "").toLowerCase();
  if (/^global$/i.test(s)) return "global"; // match literal "global"
  if (toISO2(raw) && countryNameFromISO2(raw)) return "country";
  return "region";
}

/**
 * A publication-independent identity for a geography token, folding away
 * spelling differences only: case, spacing and punctuation.
 *
 * Different publishers spell the same region differently — IEA writes
 * "Southeast Asia", JRC "South East Asia" — which matters when one page sets
 * pathways side by side (comparisonScope). Within one pathway no fold is
 * needed: its timeseries use its metadata's own labels (#945). This
 * is deliberately a spelling fold and NOT a synonym table: "ASEAN" does not
 * merge with "South East Asia", and no ISO-similarity threshold is involved,
 * because a fuzzy match is unreviewable. Two tokens share a key only when they
 * are the same words written differently.
 */
export function canonicalGeographyKey(raw: string): string {
  return normalizeGeography(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// geographyLabel does not support mapping for ISO-3 country codes, region
// codes, or other ISO standards.
export function geographyLabel(raw: string): string {
  const s = normalizeGeography(raw);
  if (!s) return "";
  const kind = geographyKind(s);
  if (kind === "global") return "Global";
  const name = countryNameFromISO2(s);
  return name ?? s; // country name if known; else passthrough
}

export function sortGeographiesForDetails(input: unknown[]): string[] {
  // Callers are expected to flatten structured geography (via flattenGeography)
  // before calling this. Guard defensively so a non-array input degrades to an
  // empty result instead of throwing `input.map is not a function`.
  if (!Array.isArray(input)) return [];
  const annotated = input
    .map((v, idx) => {
      const raw = normalizeGeography(v);
      if (!raw) return null;
      const kind = geographyKind(raw);
      const iso2Maybe = toISO2(raw);
      const iso2 = kind === "country" && iso2Maybe ? iso2Maybe : null;
      const label = geographyLabel(raw); // used for display; sorting uses iso2
      return { idx, raw, kind, iso2, label };
    })
    .filter(
      (
        x,
      ): x is {
        idx: number;
        raw: string;
        kind: GeographyKind;
        iso2: string | null;
        label: string;
      } => !!x,
    );

  const globals = annotated.filter((a) => a.kind === "global"); // keep input order
  const regions = annotated.filter((a) => a.kind === "region"); // keep input order
  const countries = annotated
    .filter((a) => a.kind === "country")
    .sort((a, b) => (a.iso2! < b.iso2! ? -1 : a.iso2! > b.iso2! ? 1 : 0)); // A→Z by ISO2

  return [...globals, ...regions, ...countries].map((a) => a.raw);
}

export function geographyVariant(
  kind: GeographyKind,
): "geographyGlobal" | "geographyRegion" | "geographyCountry" {
  // Pick names that fit your existing design tokens.
  // If your Badge has a strict union, add these variants there.
  switch (kind) {
    case "global":
      return "geographyGlobal"; // e.g., neutral/gray
    case "region":
      return "geographyRegion"; // e.g., indigo/blue
    case "country":
      return "geographyCountry"; // e.g., green
  }
}
