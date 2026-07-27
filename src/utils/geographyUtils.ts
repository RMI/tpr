import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import type { Geography } from "../types";
countries.registerLocale(en);

export type GeographyKind = "global" | "region" | "country";

// Flatten the structured geography object into the ordered flat token list the
// rest of the app historically operated on: "Global" (when global) → region
// labels → country codes. This intentionally does NOT expand region membership
// into countries — the canonical region→country intersection is a later phase.
// In the current dataset the `regions` member arrays are deliberately left
// empty (regions are carried only as labels, matching the pre-migration flat
// list), so this flattening reproduces exactly the tokens the app saw before.
// `geographyKind`/`geographyLabel`/`sortGeographiesForDetails` continue to work
// on the individual string tokens this returns.
export function flattenGeography(geo: Geography | null | undefined): string[] {
  if (!geo || typeof geo !== "object") return [];
  const tokens: string[] = [];
  if (geo.global) tokens.push("Global");
  if (geo.regions) tokens.push(...Object.keys(geo.regions));
  if (geo.country) tokens.push(...geo.country);
  return tokens;
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
