/**
 * Reading v2's scoped keyFeatures entries (#858).
 *
 * Each keyFeature is an array of `{sector, geography, value}` entries, so
 * "what is this pathway's emissionsTrajectory?" now depends on which part of the
 * pathway's coverage you are asking about. This module answers two questions the
 * search layer needs:
 *
 *   - which entries are relevant to the user's current sector/geography filter
 *     ({@link entriesInScope}), and
 *   - what values those entries carry ({@link entryValues}).
 *
 * Deliberately **inclusion only**: an entry is relevant when its scope meets the
 * query on both axes — sector by containment, geography by non-empty ISO
 * intersection (see geographyScopeOverlaps for why the two axes differ). There is
 * no cost model, no ranking, and no notion of how far the query had to broaden —
 * that is #869's resolver, which is where strict containment belongs, as the basis
 * for ranking rather than as a hard filter.
 */
import type { GeographyCode, PathwayMetadataType } from "../types";
import { pathwayISOCoverage, toISO2 } from "./geographyUtils";
import { selectedGeographyToISO } from "./filterRegions";
import { ABSENT_FILTER_TOKEN } from "./absent";

/** Sector sentinel: the union of *this pathway's own* declared sectors. */
export const CROSS_SECTOR = "cross-sector";
/** Geography sentinels: everything, and a multi-region non-global aggregate. */
export const GLOBAL_SCOPE = "Global";
export const CROSS_REGION = "cross-region";

/** One scoped entry, structurally — the 11 fields differ only in `value`. */
export interface ScopedEntry {
  sector: string;
  geography: string;
  value: string | string[];
}

/**
 * Coerce a field's value to entries, tolerating anything that is not an array.
 *
 * Takes `unknown` on purpose. While v1 and v2 coexist a v1-shaped scalar can
 * reach these helpers from a hand-built fixture or a stale mock, and degrading to
 * "no entries" is better than throwing. `Array.isArray` narrows a typed
 * `readonly T[]` union to `any[]`, so the cast is what keeps this type-safe.
 */
function asEntries(value: unknown): readonly ScopedEntry[] {
  return Array.isArray(value) ? (value as readonly ScopedEntry[]) : [];
}

/** Flatten one field's entries to the values they carry, array-valued or not. */
export function entryValues(entries: unknown): string[] {
  return asEntries(entries).flatMap((e) => {
    if (Array.isArray(e.value)) return e.value;
    return e.value != null ? [e.value] : [];
  });
}

/**
 * Does an entry's sector scope contain a queried sector?
 *
 * `cross-sector` is **not** a universal match (per Jacob on #869): it means the
 * union of the sectors this pathway declares, so a pathway covering only Y and Z
 * does not answer a query for sector X even though its `cross-sector` values are
 * nominally broad enough.
 */
export function sectorScopeContains(
  entrySector: string,
  querySector: string,
  declaredSectors: readonly string[],
): boolean {
  if (entrySector === querySector) return true;
  if (entrySector === CROSS_SECTOR)
    return declaredSectors.includes(querySector);
  return false;
}

/**
 * The ISO codes an entry's geography scope covers, or `null` for "everything".
 *
 * A region label resolves through the pathway's own `geography.regions` mapping,
 * which is why an unmapped region (empty member array, e.g. the NGFS files
 * pending #801) resolves to the empty set and therefore matches nothing rather
 * than matching everything.
 */
export function entryISOSet(
  entryGeography: string,
  pathway: PathwayMetadataType,
): Set<GeographyCode> | null {
  if (entryGeography === GLOBAL_SCOPE) return null;

  const geo = pathway.geography;
  if (entryGeography === CROSS_REGION) return pathwayISOCoverage(geo);

  const members = geo?.regions?.[entryGeography];
  if (Array.isArray(members)) return new Set(members);

  const iso = toISO2(entryGeography);
  if (iso) return new Set([iso as GeographyCode]);

  return new Set();
}

/**
 * Does an entry's geography scope overlap a selected geography token?
 *
 * **Overlap, not containment** — a non-empty intersection is a match. Requiring
 * the query to be a strict subset of the entry looks tidier but is wrong here,
 * because the query vocabulary and each publication's own region membership are
 * different lists by design (#783), so they rarely coincide exactly. Concretely:
 * the filter vocabulary's "Southeast Asia" carries 11 codes including TL, while
 * ACE's own "South East Asia" carries 10 and omits it. Under containment that one
 * country made every ACE pathway vanish whenever a region filter was combined
 * with a keyFeature facet, even though the geography facet itself kept them --
 * it has always used overlap (`isoSets.some(overlaps)` in filterPathways). This
 * now matches that behaviour, so the two cannot disagree about the same pathway.
 *
 * "Global" stays a distinct predicate rather than "every code", again mirroring
 * the facet (`wantGlobal && pGlobal`): a Global query is answered only by a
 * Global-scoped entry, so selecting it does not quietly match everything.
 */
export function geographyScopeOverlaps(
  entryGeography: string,
  queryToken: string,
  pathway: PathwayMetadataType,
): boolean {
  const query = selectedGeographyToISO(queryToken);
  // The "None" bucket says nothing about which scope to read. entriesInScope now
  // strips it before calling this, so the guard is only for direct callers.
  if (query.kind === "absent") return true;

  const entrySet = entryISOSet(entryGeography, pathway);
  if (entrySet === null) return true; // a Global entry answers anything

  if (query.kind === "global") return false; // only a Global entry answers Global
  // An unrecognised token, or a region the publication never mapped, yields an
  // empty set and so overlaps nothing -- a stale selection matches nothing
  // rather than everything.
  for (const code of query.iso) if (entrySet.has(code)) return true;
  return false;
}

export interface ScopeQuery {
  /** Selected sector tokens; empty leaves the sector axis unconstrained. */
  sectors?: readonly string[];
  /** Selected geography tokens; empty leaves the geography axis unconstrained. */
  geographies?: readonly string[];
}

/** Selected tokens with the ABSENT/"None" bucket removed — see entriesInScope. */
function dropAbsent(tokens: readonly string[] | undefined): readonly string[] {
  if (!tokens || tokens.length === 0) return [];
  return tokens.filter((t) => t !== ABSENT_FILTER_TOKEN);
}

/**
 * The entries relevant to the user's current filter.
 *
 * With neither axis filtered this returns every entry, which is what makes the
 * blank-search view behave exactly as it did on v1 data. Multiple selections on
 * an axis are treated as "contains any of them": the ANY/ALL facet mode the user
 * picked governs *value* matching, not which scope to read from, so a
 * sector=[Power, Steel] selection makes entries for either sector relevant.
 */
export function entriesInScope(
  entries: unknown,
  query: ScopeQuery,
  pathway: PathwayMetadataType,
): ScopedEntry[] {
  const all = asEntries(entries);
  // The "None" bucket is a predicate about the *pathway* ("has no sectors" /
  // "has no geography"), not a scope to read values from, so it must not
  // constrain either axis. Dropping it here rather than in each axis helper keeps
  // the two consistent: previously geographyScopeOverlaps ignored the token but
  // sectorScopeContains compared it as if it were a sector name, so selecting
  // Sector=None alongside a keyFeature facet filtered out every entry and made
  // the pathway look like it held no values at all.
  const sectors = dropAbsent(query.sectors);
  const geographies = dropAbsent(query.geographies);
  if (sectors.length === 0 && geographies.length === 0) return [...all];

  const declared = (pathway.sectors ?? []).map((s) => s.name);

  return all.filter((entry) => {
    const sectorOk =
      sectors.length === 0 ||
      sectors.some((s) => sectorScopeContains(entry.sector, s, declared));
    if (!sectorOk) return false;
    const geoOk =
      geographies.length === 0 ||
      geographies.some((g) =>
        geographyScopeOverlaps(entry.geography, g, pathway),
      );
    return geoOk;
  });
}

/** Values of the entries relevant to the query — what a facet matches against. */
export function valuesInScope(
  entries: unknown,
  query: ScopeQuery,
  pathway: PathwayMetadataType,
): string[] {
  return entryValues(entriesInScope(entries, query, pathway));
}

/**
 * How broad a scope axis is, lower being broader. Derived from the token alone so
 * this works without pathway context, which is what {@link widestValue}'s callers
 * (the rendering components) have available.
 */
function sectorBreadth(sector: string): number {
  return sector === CROSS_SECTOR ? 0 : 1;
}

function geographyBreadth(geography: string): number {
  if (geography === GLOBAL_SCOPE) return 0;
  if (geography === CROSS_REGION) return 1;
  // A two-letter token is a country code; anything longer is a region label.
  return /^[A-Za-z]{2}$/.test(geography) ? 3 : 2;
}

/**
 * The value at the broadest scope a field declares.
 *
 * **Provisional.** This is a placeholder for #869's resolver, which will pick the
 * value for the scope the *user* is looking at and report how far it had to
 * broaden so #859 can badge it. Until then the components show the widest value,
 * which is what v1 effectively showed — every codemod-migrated pathway has exactly
 * one entry, at its widest scope — so rendering is unchanged for current data.
 *
 * Returns `undefined` when nothing is authored at any scope, which the callers
 * already render as "No information".
 */
export function widestValue(entries: unknown): string | string[] | undefined {
  const all = asEntries(entries);
  if (all.length === 0) return undefined;
  const ranked = [...all].sort(
    (a, b) =>
      sectorBreadth(a.sector) - sectorBreadth(b.sector) ||
      geographyBreadth(a.geography) - geographyBreadth(b.geography),
  );
  return ranked[0].value;
}
