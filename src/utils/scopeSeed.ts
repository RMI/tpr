import type {
  GeographyCode,
  PathwayMetadataType,
  PathwayScopeSelection,
  SearchFilters,
} from "../types";
import { ABSENT_FILTER_TOKEN } from "./absent";
import { flattenGeography, sortGeographiesForDetails } from "./geographyUtils";
import {
  GLOBAL_SCOPE,
  entryISOSet,
  geographyScopeOverlaps,
} from "./keyFeatureScope";
import { selectedGeographyToISO } from "./filterRegions";

/**
 * Collapse a search facet selection to a single token, or null.
 *
 * The detail page's scope is single-select while search facets are multi-select,
 * so an inherited value may be an array. More than one selection collapses to
 * `null` rather than to its first element: facet order is vocabulary order, not
 * the reader's intent, so picking one would silently discard the rest of their
 * own selection and present the survivor as if they had chosen it alone. One
 * click on the ribbon recovers whichever they meant.
 *
 * The "None" bucket is stripped first — it is a predicate about which *pathways*
 * to list, not a scope to read data at, which is the same reasoning behind
 * `dropAbsent` in keyFeatureScope.
 */
export function collapseSelection(
  value: string | string[] | null | undefined,
): string | null {
  if (value == null) return null;
  const tokens = (Array.isArray(value) ? value : [value]).filter(
    (token) => token !== ABSENT_FILTER_TOKEN,
  );
  return tokens.length === 1 ? tokens[0] : null;
}

/**
 * The sector to pre-select, or null.
 *
 * Search and the ribbon share one vocabulary here — the search options are built
 * from these very display names — so this is exact equality. A sector the
 * pathway does not declare yields null; never guess a sibling sector.
 *
 * `cross-sector` is deliberately not a candidate: it is a keyFeature scope
 * token, not a declared sector, and `sector === null` already occupies the
 * cross-sector position.
 */
export function seedSectorFromFilters(
  value: string | string[] | null | undefined,
  pathway: PathwayMetadataType,
): string | null {
  const token = collapseSelection(value);
  if (token === null) return null;
  const declared = (pathway.sectors ?? []).map((s) => s.name as string);
  return declared.includes(token) ? token : null;
}

/** How much of what the reader asked for a candidate answers, and what it drags in. */
function overlapScore(
  candidate: string,
  query: Set<GeographyCode>,
  pathway: PathwayMetadataType,
): { coverage: number; excess: number } {
  const set = entryISOSet(candidate, pathway);
  if (set === null || query.size === 0) return { coverage: 0, excess: 0 };

  let shared = 0;
  for (const code of query) if (set.has(code)) shared += 1;
  return { coverage: shared / query.size, excess: set.size - shared };
}

/**
 * The geography to pre-select, or null.
 *
 * The two vocabularies differ by design (#783): the inherited token comes from
 * the publication-independent filter vocabulary, while the candidates are the
 * pathway's own tokens. So the incoming token is resolved with
 * `selectedGeographyToISO` — correct here, because it really is a search value —
 * and candidates are gated with `geographyScopeOverlaps`, reused verbatim so the
 * seed can never disagree with the search matcher about the same pathway.
 *
 * Survivors are then ranked by **coverage fraction**, not containment. That is
 * the load-bearing choice: the filter vocabulary's "Southeast Asia" carries 11
 * codes including TL, while ACE publishes 10 without it, so containment would
 * reject the region and fall through to Global. Coverage scores it 10/11 and
 * picks the region, which is what the reader meant.
 *
 * No overlap yields null, never the pathway's Global token: `resolveGeography`
 * already treats a null request as "use the broadest", so seeding Global adds
 * nothing, and a highlighted Global badge would falsely claim we had narrowed to
 * the reader's selection.
 */
export function seedGeographyFromFilters(
  value: string | string[] | null | undefined,
  pathway: PathwayMetadataType,
): string | null {
  const token = collapseSelection(value);
  if (token === null) return null;

  const candidates = sortGeographiesForDetails(
    flattenGeography(pathway.geography),
  );
  const query = selectedGeographyToISO(token);
  if (query.kind === "absent") return null;

  // Only a Global entry answers Global, mirroring geographyScopeOverlaps.
  if (query.kind === "global") {
    return candidates.includes(GLOBAL_SCOPE) ? GLOBAL_SCOPE : null;
  }

  const matches = candidates.filter((candidate) =>
    geographyScopeOverlaps(candidate, token, pathway),
  );

  // Global passes the gate unconditionally, so it is excluded from ranking
  // rather than from matching — a narrower token that also matches is always
  // the better answer to a specific request.
  const ranked = matches
    .filter((candidate) => candidate !== GLOBAL_SCOPE)
    .map((candidate, index) => ({
      candidate,
      index,
      ...overlapScore(candidate, query.iso, pathway),
    }))
    .filter((entry) => entry.coverage > 0)
    .sort(
      (a, b) =>
        b.coverage - a.coverage || a.excess - b.excess || a.index - b.index,
    );

  return ranked[0]?.candidate ?? null;
}

/**
 * Pre-select the detail page's scope from the search selection the reader
 * arrived with (#872). Each axis degrades to null independently, meaning "the
 * search said nothing about this axis" — `resolveInitialScope` then supplies the
 * default for it.
 */
export function seedScopeFromFilters(
  filters: Pick<SearchFilters, "sector" | "geography">,
  pathway: PathwayMetadataType,
): PathwayScopeSelection {
  return {
    sector: seedSectorFromFilters(filters.sector, pathway),
    geography: seedGeographyFromFilters(filters.geography, pathway),
  };
}

/** The sector the tool is built around; every pathway migrated so far has it. */
export const DEFAULT_SECTOR = "Power";

/**
 * What the detail page opens on when the search said nothing.
 *
 * Geography takes the pathway's widest declared token —
 * `sortGeographiesForDetails` already ranks global > region > country, so its
 * first entry is the broadest: `Global` for the IEA pathways, `South East Asia`
 * for ACE.
 *
 * Sector takes Power where the pathway declares it, since that is the sector
 * the tool is built around and the only one with timeseries. Otherwise the
 * first declared sector, so the axis still carries a value — the ribbon has no
 * clear affordance, and an axis with nothing selected would be unreachable
 * again once the reader had picked something.
 */
export function defaultScopeFor(
  pathway: PathwayMetadataType,
): PathwayScopeSelection {
  const sectors = (pathway.sectors ?? []).map((s) => s.name as string);
  const geographies = sortGeographiesForDetails(
    flattenGeography(pathway.geography),
  );

  return {
    sector: sectors.includes(DEFAULT_SECTOR)
      ? DEFAULT_SECTOR
      : (sectors[0] ?? null),
    geography: geographies[0] ?? null,
  };
}

/**
 * The scope the detail page opens with: whatever the search selected, and the
 * default for each axis the search left unset.
 *
 * Per-axis rather than all-or-nothing, so arriving from a search for Thailand
 * alone gives Thailand plus the default sector rather than dropping the sector
 * default entirely.
 */
export function resolveInitialScope(
  filters: Pick<SearchFilters, "sector" | "geography">,
  pathway: PathwayMetadataType,
): PathwayScopeSelection {
  const seeded = seedScopeFromFilters(filters, pathway);
  const fallback = defaultScopeFor(pathway);

  return {
    sector: seeded.sector ?? fallback.sector,
    geography: seeded.geography ?? fallback.geography,
  };
}
