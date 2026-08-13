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
 * nothing at search time, which is the worst of both worlds. Run from
 * `scripts/schema-check-files.ts`, so `npm run schema:check` gates it.
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
 * Every geography token an entry on this pathway may legitimately name: the
 * two sentinels, each declared region label, every country inside those regions,
 * and every standalone country. Region members count because a pathway that
 * covers "South East Asia" does cover Thailand — scoping an entry to `TH` is
 * more specific than the pathway's own declaration, not outside it.
 */
function allowedGeographies(pathway: PathwayMetadataV2): Set<string> {
  const allowed = new Set<string>([GLOBAL_SCOPE, CROSS_REGION]);
  const geo = pathway.geography;
  if (!geo || typeof geo !== "object") return allowed;
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
