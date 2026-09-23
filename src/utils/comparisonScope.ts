import type {
  GeographyCode,
  PathwayMetadataType,
  SearchFilters,
} from "../types";
import {
  canonicalGeographyKey,
  flattenGeography,
  geographyKind,
  geographyLabel,
  sortGeographiesForDetails,
  type GeographyKind,
} from "./geographyUtils";
import { GLOBAL_SCOPE, scopeISOSet } from "./keyFeatureScope";
import {
  sortByAvailability,
  type PathwayToolAvailability,
} from "./timeseriesAvailability";
import {
  DEFAULT_SECTOR,
  collapseSelection,
  seedGeographyFromFilters,
} from "./scopeSeed";

/*
  Reconciling N pathways into a comparison scope.

  Everything in `scopeSeed.ts` is single-pathway: it answers "what scope should
  this pathway open on". The comparison page needs the plural question, and the
  two axes turn out to be different kinds of thing.

  Sector is a closed vocabulary — every pathway names sectors from the same
  list — so the axis is an intersection and ONE shared value scopes every
  column.

  Geography is not. Tokens are publication-specific, and a token resolves to an
  ISO set only against its own pathway's `regions` mapping. Across the loadable
  pathways no token is declared by more than one publisher, so there is nothing
  to intersect and a shared value would leave every column but one in a
  fallback. Each column therefore carries its OWN geography, over its own
  options.
*/

const sectorNames = (pathway: PathwayMetadataType): string[] =>
  (pathway.sectors ?? []).map((s) => s.name as string);

/**
 * Sector names every compared pathway declares, in the first pathway's order.
 *
 * Pathways declaring no sectors at all are skipped rather than emptying the
 * intersection. `sectors` is required by the schema but carries no `minItems`,
 * so `sectors: []` is valid — and a pathway with no sector data should read as
 * unknown, never as incompatible. A data gap must not look like a rule.
 */
export function sharedSectors(
  pathways: readonly PathwayMetadataType[],
): string[] {
  const declaring = pathways.filter((p) => sectorNames(p).length > 0);
  if (declaring.length === 0) return [];
  const [first, ...rest] = declaring;
  return sectorNames(first).filter((name) =>
    rest.every((p) => sectorNames(p).includes(name)),
  );
}

/**
 * Would adding `candidate` leave the comparison with a sector in common?
 *
 * Intersects the WHOLE running set rather than checking pairwise against the
 * first: with three pathways, A∩B ≠ ∅ and A∩C ≠ ∅ does not imply A∩B∩C ≠ ∅, and
 * the shared sector axis has to be non-empty for the page to have anything to
 * scope by.
 */
export function sectorsCompatible(
  selected: readonly PathwayMetadataType[],
  candidate: PathwayMetadataType,
): boolean {
  return sharedSectors([...selected, candidate]).length > 0;
}

export interface ComparisonBlock {
  /** Sectors shared by the pathways up to, but excluding, the first offender. */
  sharedBefore: string[];
  /** Pathways that broke the intersection, in column order. */
  offenders: PathwayMetadataType[];
}

/**
 * Why this set cannot be compared, or null when it can.
 *
 * Alex's hard restriction: "cannot compare one sector to another". The page
 * needs more than a boolean so it can name which pathways clashed.
 *
 * NOTE: unreachable with the data shipped today — all seven loadable pathways
 * declare Power, so every pair shares at least three sectors. It becomes
 * reachable as the remaining v1 pathways migrate. Proven by fixture, not by the
 * running app.
 */
export function comparisonBlock(
  pathways: readonly PathwayMetadataType[],
): ComparisonBlock | null {
  if (pathways.length < 2) return null;

  // Only pathways that actually declare sectors can prove an incompatibility.
  const declaring = pathways.filter((p) => sectorNames(p).length > 0);
  if (declaring.length < 2) return null;

  const offenders: PathwayMetadataType[] = [];
  let running = sectorNames(declaring[0]);

  for (const pathway of declaring.slice(1)) {
    const next = running.filter((name) => sectorNames(pathway).includes(name));
    if (next.length === 0) {
      offenders.push(pathway);
    } else {
      running = next;
    }
  }

  return offenders.length > 0 ? { sharedBefore: running, offenders } : null;
}

export interface ColumnGeographyOption {
  /** The publisher's own spelling — the scope value, and what lands in the URL. */
  token: string;
  /** Badge text: country names for ISO-2 tokens, region labels as written. */
  label: string;
  kind: GeographyKind;
  /** Whether this tool holds timeseries data for it, or only the publication does. */
  available: boolean;
}

/**
 * One pathway's own geographies, ordered and flagged exactly as the comparison
 * page's Geographies coverage section shows them.
 *
 * Geography is the one axis that cannot be pooled across compared pathways: a
 * token resolves to an ISO set only against its own publication's `regions`
 * mapping, and across the loadable pathways no token is declared by more than
 * one publisher. So each column offers its own list, and this is the single
 * place that list is derived — the header's per-column control and the coverage
 * section both read it, so the two cannot drift.
 *
 * Ordering: global → regions → countries (`sortGeographiesForDetails`), then
 * stable-partitioned available-first, so what the reader can actually plot
 * leads.
 */
export function columnGeographyOptions(
  pathway: PathwayMetadataType,
  availability: PathwayToolAvailability,
): ColumnGeographyOption[] {
  // sortGeographiesForDetails normalizes and drops empty tokens, so these are
  // already clean enough to use as values.
  const tokens = sortGeographiesForDetails(flattenGeography(pathway.geography));

  return sortByAvailability(
    tokens.map((token) => ({
      token,
      label: geographyLabel(token),
      kind: geographyKind(token),
      available: availability.hasGeography(token),
    })),
    (option) => option.available,
  );
}

// Per-column geography: URL codec, defaults, and divergence

/** One column's geography choice, keyed by pathway id. */
export type ColumnGeographySelection = Record<string, string>;

/**
 * Encode the per-column choices for the `geography` query param, as
 * `id:token,id:token`.
 *
 * Keyed by pathway id rather than by position, so reordering `?ids=` cannot
 * silently repoint a column at another pathway's geography. Both halves are
 * percent-encoded, so a token containing a comma or colon cannot break the
 * delimiters — none does today, but region labels are publisher prose and
 * being safe costs one function call.
 */
export function encodeColumnGeographies(
  selection: ColumnGeographySelection,
): string {
  return Object.entries(selection)
    .filter(([id, token]) => id !== "" && token !== "")
    .map(
      ([id, token]) => `${encodeURIComponent(id)}:${encodeURIComponent(token)}`,
    )
    .join(",");
}

/**
 * Read the `geography` param back.
 *
 * Anything unparseable is dropped rather than repaired: a malformed or stale
 * link degrades to the per-column defaults, the same rule `useUrlParamState`
 * follows for a single value. Checking that a token is one the pathway actually
 * declares is the caller's job, since only it holds the option lists.
 */
export function decodeColumnGeographies(
  raw: string | null,
): ColumnGeographySelection {
  if (!raw) return {};

  const selection: ColumnGeographySelection = {};
  for (const part of raw.split(",")) {
    // First colon only. An encoded token cannot contain one, but a hand-edited
    // URL might, and being lenient costs nothing.
    const at = part.indexOf(":");
    if (at <= 0) continue;
    try {
      const id = decodeURIComponent(part.slice(0, at));
      const token = decodeURIComponent(part.slice(at + 1));
      if (id && token) selection[id] = token;
    } catch {
      // decodeURIComponent throws on a malformed escape such as "%zz".
      continue;
    }
  }
  return selection;
}

/**
 * The sector axis for a comparison: the reader's search selection where the
 * pathways share it, else Power, else the first shared sector.
 *
 * Split out of `resolveSharedScope` when geography stopped being one shared
 * value. Sector stays shared because it is a closed vocabulary with a
 * guaranteed non-empty intersection (see `comparisonBlock`).
 */
export function resolveSharedSector(
  filters: Pick<SearchFilters, "sector">,
  pathways: readonly PathwayMetadataType[],
): string | null {
  const sectors = sharedSectors(pathways);
  const seeded = collapseSelection(filters.sector);

  if (seeded !== null && sectors.includes(seeded)) return seeded;
  if (sectors.includes(DEFAULT_SECTOR)) return DEFAULT_SECTOR;
  return sectors[0] ?? null;
}

/**
 * The geography one column opens on.
 *
 * Prefers the reader's search selection, translated into this publication's own
 * vocabulary by the existing single-pathway seeder, and falls back to the
 * leading option. Because `columnGeographyOptions` ranks what this tool can
 * plot first, that fallback means "the broadest geography with actual data"
 * rather than merely the broadest declared.
 */
export function defaultGeographyForColumn(
  filters: Pick<SearchFilters, "geography">,
  pathway: PathwayMetadataType,
  options: readonly ColumnGeographyOption[],
): string | null {
  const seeded = seedGeographyFromFilters(filters.geography, pathway);
  if (seeded !== null && options.some((o) => o.token === seeded)) return seeded;
  return options[0]?.token ?? null;
}

export type ColumnGeographyDivergence =
  | { kind: "none" }
  /** Every column named the same geography, but their country lists differ. */
  | {
      kind: "membersDiffer";
      token: string;
      exclusives: { column: string; countries: GeographyCode[] }[];
    }
  /** The columns are scoped to geographies covering different countries. */
  | {
      kind: "differentGeographies";
      columns: { column: string; label: string }[];
    };

/**
 * Signature for a global scope, which covers everything rather than a country
 * list. "*" is safe as a sentinel: ISO-3166 alpha-2 codes are letters only.
 */
const COVERS_EVERYTHING = "*";

const columnLabel = (pathway: PathwayMetadataType): string =>
  pathway.name?.short || pathway.name?.full || pathway.id;

/**
 * Whether the compared columns are showing the same thing.
 *
 * Alex asked for a warning "when there's a difference in geographies between
 * the compared scenarios ... publishers use different names / don't agree on
 * the definition of this region". Now that each column picks its own
 * geography, the honest test is not whether the names match but whether the
 * **country sets** do:
 *
 *  - Two publishers spelling one region differently while covering the same
 *    countries is not a discrepancy, and no longer warns.
 *  - One name covering different countries is one, and still does.
 *
 * A column whose region maps to no countries is treated as *unknown
 * membership* and skipped rather than counted as different — the rule the
 * sector restriction already follows, where a data gap must not look like a
 * rule.
 *
 * There is no "does not declare it" case any more: each column only offers
 * what its own pathway declares.
 */
export function columnsGeographyDivergence(
  selection: Readonly<Record<string, string | null>>,
  pathways: readonly PathwayMetadataType[],
): ColumnGeographyDivergence {
  const columns = pathways
    .map((pathway) => {
      const token = selection[pathway.id] ?? null;
      if (token === null) return null;
      const iso = scopeISOSet(token, pathway.geography);
      const countries = iso === null ? null : [...iso];
      return {
        column: columnLabel(pathway),
        token,
        countries,
        signature:
          countries === null
            ? COVERS_EVERYTHING
            : [...countries].sort().join(","),
      };
    })
    .filter((column): column is NonNullable<typeof column> => column !== null)
    // An empty mapping is unknown membership, not an empty geography.
    .filter((column) => column.signature !== "");

  if (columns.length < 2) return { kind: "none" };
  if (new Set(columns.map((c) => c.signature)).size === 1) {
    return { kind: "none" };
  }

  // One name everywhere: the publishers disagree on what it contains.
  const names = new Set(columns.map((c) => canonicalGeographyKey(c.token)));
  if (names.size === 1) {
    const exclusives = columns
      .map(({ column, countries }) => ({
        column,
        countries: (countries ?? []).filter((code) =>
          columns.some(
            (other) =>
              other.column !== column &&
              other.countries !== null &&
              !other.countries.includes(code),
          ),
        ),
      }))
      .filter((entry) => entry.countries.length > 0);

    if (exclusives.length > 0) {
      return { kind: "membersDiffer", token: columns[0].token, exclusives };
    }
  }

  return {
    kind: "differentGeographies",
    columns: columns.map((column) => ({
      column: column.column,
      label: geographyLabel(column.token),
    })),
  };
}

/** Re-exported so callers do not need a second import for the global sentinel. */
export { GLOBAL_SCOPE };
