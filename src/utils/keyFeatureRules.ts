/**
 * The rules for reading scoped keyFeatures that the app and the validator must
 * agree on (#869, cookbook decision 0023): the scope sentinels, the
 * Electrification × Power exclusion, the scope-level sentinel value, which
 * countries a pathway's own geography token covers, and a pathway's widest scope
 * on each axis.
 *
 * Type-only imports, deliberately. `scripts/schema-check-files.ts` runs under
 * ts-node, which can follow `.ts`-extension imports of plain modules but not the
 * app's bundler-only ones (`geographyUtils` pulls in a JSON locale). Keeping this
 * module dependency-free lets `validateScopes.ts` import it the way it already
 * imports `timeseriesTaxonomy.ts`, so the resolver and the validator read one
 * definition instead of two copies that drift.
 */
import type { PathwayMetadataV2 } from "../types/pathwayMetadata.v2";

type Geography = PathwayMetadataV2["geography"];
type CountryCode = NonNullable<Geography["country"]>[number];

/**
 * The eleven scoped fields of `keyFeatures`. The one name for them: the feature
 * config, the tooltips and the resolver all use it, and it lives here so the
 * validator can too.
 */
export type KeyFeatureKey = keyof PathwayMetadataV2["keyFeatures"];

/** Sector sentinel: the union of *this pathway's own* declared sectors. */
export const ACROSS_SECTORS = "across sectors";
/** Geography sentinels: everything, and a multi-region non-global aggregate. */
export const GLOBAL_SCOPE = "Global";
export const ACROSS_REGIONS = "across regions";

/**
 * A cell that says "this field is recorded at another scope level, not here".
 *
 * Not an answer, unlike an authored `No information`: the resolver skips it and
 * keeps walking the fallback chain, exactly as it would for a missing entry. In
 * an array-valued field it stands for the whole cell, so an array containing it
 * is skipped too — see {@link isScopeLevelNotApplicable}.
 */
export const SCOPE_LEVEL_NOT_APPLICABLE = "Not applicable at this scope level";

/**
 * The measure for a field that cannot apply to a sector at all — Electrification
 * of the Power sector, since power already is electricity. Distinct from
 * {@link SCOPE_LEVEL_NOT_APPLICABLE}, which is about where a value is recorded
 * rather than whether one can exist.
 *
 * The resolver treats it like that sentinel: not an answer, so it skips the cell
 * and falls back to `across sectors`. Which (field, sector) pairs must carry it,
 * and that it appears nowhere else, is the validator's rule (PR 2), so the
 * resolver needs no list of them.
 */
export const MEASURE_NOT_APPLICABLE = "Not Applicable";

/**
 * Is this cell the scope-level sentinel? True for the scalar, and for any array
 * containing it: the sentinel describes the cell, so an array that mixes it with
 * real values is still a skipped cell rather than a partial answer. (Rejecting
 * that mix is the validator's job, in PR 2.)
 */
export function isScopeLevelNotApplicable(value: unknown): boolean {
  return Array.isArray(value)
    ? value.includes(SCOPE_LEVEL_NOT_APPLICABLE)
    : value === SCOPE_LEVEL_NOT_APPLICABLE;
}

/**
 * The pathway's own geography tokens, in declaration order: region labels, then
 * standalone countries. `Global` is left out — it is a flag, not a token with
 * members — and so are region member codes, which are reachable through their
 * region but are not something the ribbon offers.
 */
export function declaredGeographyTokens(
  geo: Geography | null | undefined,
): string[] {
  if (!geo || typeof geo !== "object") return [];
  return [...Object.keys(geo.regions ?? {}), ...(geo.country ?? [])];
}

/**
 * The countries one of THIS pathway's own geography tokens covers, or `null` for
 * everything.
 *
 *   - `Global` → `null`.
 *   - `across regions` → every country the pathway declares, in any region or
 *     standalone.
 *   - a region label → its members. Checked before countries, so JRC's regions
 *     named `"TH"` and `"EU"` resolve through their member lists: `"EU"` is not a
 *     country at all, and the region `"TH"` is what JRC means by it.
 *   - a declared country → itself. "Declared" as `validateScopes` means it: a
 *     standalone country or a member of a declared region.
 *   - anything else → the empty set, as does a region the publication never
 *     mapped. Both mean "unknown", not "nothing": see {@link containsCodes}.
 *
 * Unlike `scopeISOSet`, which serves search and accepts any ISO-looking token, this
 * only answers for tokens the pathway declares, so a stale selection cannot claim
 * coverage the pathway never stated.
 */
export function declaredTokenCodes(
  token: string,
  geo: Geography | null | undefined,
): ReadonlySet<CountryCode> | null {
  if (token === GLOBAL_SCOPE) return null;
  if (!geo || typeof geo !== "object") return new Set();

  const regions = geo.regions ?? {};
  if (token === ACROSS_REGIONS) {
    return new Set([...Object.values(regions).flat(), ...(geo.country ?? [])]);
  }

  const members = regions[token];
  if (Array.isArray(members)) return new Set(members);

  const code = token as CountryCode;
  const declared =
    (geo.country ?? []).includes(code) ||
    Object.values(regions).some((m) => Array.isArray(m) && m.includes(code));
  return declared ? new Set([code]) : new Set();
}

/**
 * Does `outer` cover every country in `inner`? `null` is everything.
 *
 * An empty `inner` is never contained. It comes from an unmapped region or an
 * unknown token, whose coverage is unknown rather than nothing, so no other token
 * can be shown to include it — counting it as a vacuous subset would let any
 * region "contain" one the publication never described.
 */
export function containsCodes(
  outer: ReadonlySet<string> | null,
  inner: ReadonlySet<string>,
): boolean {
  if (inner.size === 0) return false;
  if (outer === null) return true;
  for (const code of inner) if (!outer.has(code)) return false;
  return true;
}

/**
 * The widest sector a keyFeature row on this pathway can carry: `across sectors`
 * if any row uses it; otherwise the pathway's single declared sector; otherwise
 * `null`, for a multi-sector pathway that records no `across sectors` row (the
 * PHDOE-CES1 shape) or one with no sectors at all.
 */
export function widestSector(
  pathway: Pick<PathwayMetadataV2, "sectors" | "keyFeatures">,
): string | null {
  // `unknown` so a stale v1 scalar degrades to "no rows" rather than throwing.
  const fields: unknown[] = Object.values(pathway.keyFeatures ?? {});
  const usesAcrossSectors = fields.some(
    (entries) =>
      Array.isArray(entries) &&
      entries.some(
        (entry: { sector?: unknown } | null) =>
          entry?.sector === ACROSS_SECTORS,
      ),
  );
  if (usesAcrossSectors) return ACROSS_SECTORS;

  const sectors = pathway.sectors ?? [];
  return sectors.length === 1 ? (sectors[0]?.name ?? null) : null;
}

/**
 * The widest geography this pathway declares: `Global` if it is global;
 * otherwise the first declared token whose countries contain every other
 * token's (ACE's single `ASEAN`, an SDSN pathway's single country, a region
 * listed alongside its own members); otherwise `across regions`, the aggregate
 * of regions none of which contains the rest.
 *
 * An unmapped region is contained by nothing (see {@link containsCodes}), so a
 * pathway that declares one alongside other tokens has no provable widest token
 * and gets `across regions`.
 */
export function widestGeography(
  pathway: Pick<PathwayMetadataV2, "geography">,
): string {
  const geo = pathway.geography;
  if (geo?.global === true) return GLOBAL_SCOPE;

  const tokens = declaredGeographyTokens(geo);
  const widest = tokens.find((candidate) => {
    const outer = declaredTokenCodes(candidate, geo);
    return tokens.every(
      (other) =>
        other === candidate ||
        containsCodes(outer, declaredTokenCodes(other, geo) ?? new Set()),
    );
  });
  return widest ?? ACROSS_REGIONS;
}
