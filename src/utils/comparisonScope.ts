import type {
  GeographyCode,
  PathwayMetadataType,
  PathwayScopeSelection,
  SearchFilters,
} from "../types";
import {
  canonicalGeographyKey,
  flattenGeography,
  geographyKind,
  geographyLabel,
  normalizeGeography,
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
  Reconciling N pathways into ONE shared scope.

  Everything in `scopeSeed.ts` is single-pathway: it answers "what scope should
  this pathway open on". The comparison page needs the plural question, and the
  two axes behave quite differently.

  Sector is easy — every pathway names sectors from the same closed vocabulary,
  so the shared axis is an intersection.

  Geography is not. Tokens are publication-specific, and a token resolves to an
  ISO set only against its own pathway's `regions` mapping. So there is no
  single "shared geography" to compute: instead every declared token is offered,
  and each column resolves the chosen one for itself (see `resolveGeography`).
*/

const pathwayLabel = (pathway: PathwayMetadataType): string => {
  const publisher = pathway.publication?.publisher;
  return publisher?.short ?? publisher?.full ?? pathway.id;
};

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

export interface SharedGeographyOption {
  /** The publisher's own spelling, used as the scope value and in the URL. */
  token: string;
  /**
   * Badge text: the token's display label (country names for ISO-2 tokens),
   * suffixed by publisher only when the compared publishers differ.
   */
  label: string;
  kind: GeographyKind;
  /** Publisher labels declaring this token, in column order. */
  publishers: string[];
  /** Pathway ids declaring this token, in column order. */
  declaredBy: string[];
}

/**
 * Every geography token any compared pathway declares, offered as one list.
 *
 * Near-equivalents are deliberately NOT merged: `Southeast Asia` (IEA) and
 * `South East Asia` (ACE) stay two options, because that is what the publishers
 * actually wrote. `resolveGeography`'s spelling-variant arm means either choice
 * still resolves correctly for both columns.
 *
 * Identical tokens DO collapse, listing every publisher that declares them. The
 * publisher suffix is suppressed when every compared pathway shares a
 * publisher, where it would be pure noise.
 */
export function sharedGeographyOptions(
  pathways: readonly PathwayMetadataType[],
): SharedGeographyOption[] {
  const publishers = new Set(pathways.map(pathwayLabel));
  const annotate = publishers.size > 1;

  const byToken = new Map<string, SharedGeographyOption>();

  for (const pathway of pathways) {
    for (const raw of flattenGeography(pathway.geography)) {
      const token = normalizeGeography(raw);
      if (!token) continue;

      const existing = byToken.get(token);
      if (existing) {
        if (!existing.publishers.includes(pathwayLabel(pathway))) {
          existing.publishers.push(pathwayLabel(pathway));
        }
        if (!existing.declaredBy.includes(pathway.id)) {
          existing.declaredBy.push(pathway.id);
        }
        continue;
      }

      byToken.set(token, {
        token,
        label: token,
        kind: geographyKind(token),
        publishers: [pathwayLabel(pathway)],
        declaredBy: [pathway.id],
      });
    }
  }

  // Global → regions → countries, then most-declared first so the geographies
  // the pathways agree on lead the list.
  const ordered = sortGeographiesForDetails([...byToken.keys()])
    .map((token) => byToken.get(token))
    .filter((o): o is SharedGeographyOption => o !== undefined);

  const ranked = [...ordered].sort(
    (a, b) =>
      b.declaredBy.length - a.declaredBy.length ||
      ordered.indexOf(a) - ordered.indexOf(b),
  );

  return ranked.map((option) => {
    // `geographyLabel` turns an ISO-2 token into a country name and leaves
    // region labels and "Global" alone, matching the detail page's badges.
    const base = geographyLabel(option.token);
    return {
      ...option,
      label: annotate ? `${base} (${option.publishers.join(", ")})` : base,
    };
  });
}

export type GeographyDivergence =
  | { kind: "none" }
  /** Some pathway does not declare the selected token at all. */
  | { kind: "notDeclared"; missing: string[] }
  /** All declare it, but their ISO membership differs. */
  | {
      kind: "membersDiffer";
      exclusives: { publisher: string; countries: GeographyCode[] }[];
    };

/**
 * Whether the compared pathways describe the selected geography differently.
 *
 * Alex asked for a warning "when there's a difference in geographies between
 * the compared scenarios ... publishers use different names / don't agree on
 * the definition of this region". Two distinct failures, reported strongest
 * first:
 *
 *  - `notDeclared` — a pathway does not publish this geography at all, so its
 *    column is showing something else entirely.
 *  - `membersDiffer` — everyone publishes it, but they disagree on which
 *    countries it contains, so the columns are not like-for-like.
 *
 * Everyone's `Global` is `none`: `scopeISOSet` returns null for global, meaning
 * "everything", and two "everything"s do not disagree.
 */
export function geographyDivergence(
  token: string | null,
  pathways: readonly PathwayMetadataType[],
): GeographyDivergence {
  if (token === null || pathways.length < 2) return { kind: "none" };

  const declared = pathways.filter((p) =>
    flattenGeography(p.geography).some(
      (t) => normalizeGeography(t) === normalizeGeography(token),
    ),
  );

  if (declared.length < pathways.length) {
    return {
      kind: "notDeclared",
      missing: pathways
        .filter((p) => !declared.includes(p))
        .map((p) => pathwayLabel(p)),
    };
  }

  const sets = declared.map((p) => ({
    publisher: pathwayLabel(p),
    iso: scopeISOSet(token, p.geography),
  }));

  // A global token covers everything on every side; nothing to disagree about.
  if (sets.some((s) => s.iso === null)) return { kind: "none" };

  const exclusives = sets
    .map(({ publisher, iso }) => ({
      publisher,
      countries: [...(iso ?? [])].filter((code) =>
        sets.some(
          (other) => other.publisher !== publisher && !other.iso?.has(code),
        ),
      ),
    }))
    .filter((e) => e.countries.length > 0);

  return exclusives.length > 0
    ? { kind: "membersDiffer", exclusives }
    : { kind: "none" };
}

/**
 * The scope the comparison page opens on: the reader's search selection where
 * it maps onto a shared option, and a default for whichever axis it does not.
 *
 * Per axis rather than all-or-nothing, matching the detail page — arriving from
 * a geography-only search still gets the sector default.
 */
export function resolveSharedScope(
  filters: Pick<SearchFilters, "sector" | "geography">,
  pathways: readonly PathwayMetadataType[],
): PathwayScopeSelection {
  const sectors = sharedSectors(pathways);
  const options = sharedGeographyOptions(pathways);

  const seededSector = collapseSelection(filters.sector);
  const sector =
    seededSector !== null && sectors.includes(seededSector)
      ? seededSector
      : sectors.includes(DEFAULT_SECTOR)
        ? DEFAULT_SECTOR
        : (sectors[0] ?? null);

  /*
    Geography: re-use the single-pathway seeder per pathway and take the
    most-voted token, so the filter-vocabulary translation and its
    coverage-fraction ranking are not reimplemented here.
  */
  const votes = new Map<string, number>();
  for (const pathway of pathways) {
    const seeded = seedGeographyFromFilters(filters.geography, pathway);
    if (seeded === null) continue;
    votes.set(seeded, (votes.get(seeded) ?? 0) + 1);
  }

  const winner = [...votes.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        options.findIndex((o) => o.token === a[0]) -
          options.findIndex((o) => o.token === b[0]),
    )
    .map(([token]) => token)
    .find((token) => options.some((o) => o.token === token));

  // Default: the most-declared option, which `sharedGeographyOptions` already
  // ranked first. Prefer a non-global token only if one is more widely declared.
  const geography = winner ?? options[0]?.token ?? null;

  return { sector, geography };
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
