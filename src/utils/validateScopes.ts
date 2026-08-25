/**
 * Structural checks for v2 scoped keyFeatures entries (#858).
 *
 * #858 requires an entry's `sector`/`geography` to be declared in the pathway's
 * own `sectors`/`geography`, or be the widest sentinel. That constraint spans
 * sibling data with dynamic keys (`geography.regions` is an open object of
 * author-defined labels), which JSON Schema draft-07 cannot express: there is no
 * way to point an `enum` at another part of the same document, and AJV's `$data`
 * can only reference a single value, not compute the union of region labels,
 * region members, and country codes that this needs.
 *
 * So `scopeGeography.v2.json` validates the *shape* — a non-blank, non-3-letter
 * string — and this module validates the *reference*. Without it a mistyped
 * region label ("Souteast Asia") would validate cleanly and then silently match
 * nothing at search time, which is the worst of both worlds.
 *
 * It also enforces one-value-per-scope, which `uniqueItems` cannot: that keyword
 * compares whole entries, so two at the same (sector, geography) with different
 * values are "unique" to the schema while being contradictory as data.
 *
 * Run from `scripts/schema-check-files.ts`, so `npm run schema:check` gates both.
 *
 * Errors are formatted like AJV's (`<instancePath> <message>`) so callers can
 * merge them into the same `ValidationProblem.errors` list without special-casing.
 */
import type { PathwayMetadataV2 } from "../types/pathwayMetadata.v2";

/** `$id` of the schema these checks apply to. */
export const PATHWAY_METADATA_V2_ID =
  "http://pathways.rmi.org/schema/pathwayMetadata.v2.json";

/** Sector sentinel meaning "the union of this pathway's own declared sectors". */
export const CROSS_SECTOR = "cross-sector";

/** Geography sentinels: widest possible, and a multi-region non-global aggregate. */
export const GLOBAL_SCOPE = "Global";
export const CROSS_REGION = "cross-region";

type ScopedEntry = { sector: string; geography: string; value: unknown };

/**
 * Every geography token an entry on this pathway may legitimately name: each
 * declared region label, every country inside those regions, every standalone
 * country, and the sentinels where they apply. Region members count because a
 * pathway that covers "South East Asia" does cover Thailand — scoping an entry
 * to `TH` is more specific than the pathway's own declaration, not outside it.
 *
 * `Global` is allowed only when the pathway actually sets `geography.global`.
 * #858 phrases the rule as "declared by the pathway, or the widest sentinel",
 * which read literally would let a South-East-Asia-only pathway carry a
 * global-scoped value — describing coverage it never claims, and defeating the
 * point of the check. `cross-region` stays unconditional: #858 reserves it for a
 * multi-region non-global aggregate without saying when it applies, and no file
 * in the corpus uses it yet, so gating it would be inventing a rule.
 */
function allowedGeographies(pathway: PathwayMetadataV2): Set<string> {
  const allowed = new Set<string>([CROSS_REGION]);
  const geo = pathway.geography;
  if (!geo || typeof geo !== "object") return allowed;
  if (geo.global === true) allowed.add(GLOBAL_SCOPE);
  if (geo.regions) {
    for (const [label, members] of Object.entries(geo.regions)) {
      allowed.add(label);
      if (Array.isArray(members)) members.forEach((m) => allowed.add(m));
    }
  }
  if (Array.isArray(geo.country)) geo.country.forEach((c) => allowed.add(c));
  return allowed;
}

/**
 * Sectors an entry may name: the pathway's own, plus the `cross-sector`
 * sentinel.
 *
 * Note what is deliberately *not* checked: #858 remarks that `cross-sector` is
 * "only meaningful for multi-sector pathways", but a single-sector pathway using
 * it is harmless — it resolves to that one sector — so flagging it would be a
 * false positive on a legal document rather than a caught mistake.
 */
function declaredSectors(pathway: PathwayMetadataV2): Set<string> {
  const declared = new Set<string>();
  for (const s of pathway.sectors ?? []) {
    if (s?.name) declared.add(s.name);
  }
  return declared;
}

function quote(values: Iterable<string>): string {
  return [...values]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => `"${v}"`)
    .join(", ");
}

/**
 * Check one v2 metadata document's scope references. Returns an empty array when
 * everything resolves. Assumes the document already passed AJV against
 * `pathwayMetadata.v2.json`, so shapes are trusted and only references are tested.
 */
export function validateScopedEntries(pathway: PathwayMetadataV2): string[] {
  const errors: string[] = [];
  const declared = declaredSectors(pathway);
  const entrySectors = new Set<string>([CROSS_SECTOR, ...declared]);
  const geographies = allowedGeographies(pathway);

  const keyFeatures = (pathway.keyFeatures ?? {}) as Record<
    string,
    ScopedEntry[] | undefined
  >;
  for (const [field, entries] of Object.entries(keyFeatures)) {
    if (!Array.isArray(entries)) continue;
    // Tracks the first index each (sector, geography) pair was seen at, so a
    // repeat can name its twin. See the duplicate check below for why.
    const seenScopes = new Map<string, number>();
    entries.forEach((entry, i) => {
      const at = `/keyFeatures/${field}/${i}`;
      if (!entrySectors.has(entry.sector)) {
        errors.push(
          `${at}/sector "${entry.sector}" is not a sector this pathway declares` +
            ` (allowed: ${quote(entrySectors)})`,
        );
      }
      if (!geographies.has(entry.geography)) {
        errors.push(
          `${at}/geography "${entry.geography}" is not a geography this pathway` +
            ` declares (allowed: ${quote(geographies)})`,
        );
      }

      // One scope, one value. The schema's `uniqueItems` only rejects entries
      // that are identical including their value, so two entries at the same
      // (sector, geography) carrying *different* values validate cleanly -- and
      // then disagree downstream: the resolver picks one to display while search
      // matches the field under both, so a pathway surfaces under a value its
      // own detail page does not show. The likely author intent is an override,
      // which is not what the data expresses, so reject it rather than pick a
      // winner by document order.
      const scope = `${entry.sector}\u0000${entry.geography}`;
      const firstSeen = seenScopes.get(scope);
      if (firstSeen === undefined) {
        seenScopes.set(scope, i);
      } else {
        errors.push(
          `${at} duplicates the scope of /keyFeatures/${field}/${firstSeen}` +
            ` (sector "${entry.sector}", geography "${entry.geography}").` +
            ` Each scope may carry only one value; to vary a value, vary the scope.`,
        );
      }
    });
  }

  // dependencies are descriptive and not part of the inheritance chain, but
  // #858 still scopes each to a sector, and that sector must be a real one.
  // Note this uses `declared`, not `entrySectors`: the schema types this field as
  // the plain sector enum, so `cross-sector` is not a legal value here.
  (pathway.dependencies ?? []).forEach((dep, i) => {
    if (dep?.sector && !declared.has(dep.sector)) {
      errors.push(
        `/dependencies/${i}/sector "${dep.sector}" is not a sector this pathway` +
          ` declares (allowed: ${quote(declared)})`,
      );
    }
  });

  return errors;
}
