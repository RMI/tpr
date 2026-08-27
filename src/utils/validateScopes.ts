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
 * It also enforces #461 -- that a technology belongs to the sector it is attached
 * to. #461 suggests mirroring the `if`/`then` sector conditional in
 * `pathwayTimeseries.v1.json`, but that keyword pair defeats
 * `json-schema-to-typescript`: the timeseries `data` items use exactly that shape
 * and generate as `{ [k: string]: unknown }[]`. Applying it to `sectors.items`
 * would collapse today's `{ name; technologies }` object type and break every
 * consumer of `Sector`, so the constraint lives here with its siblings instead.
 *
 * #870's `dataAvailability` rows are checked here for the same reasons: their
 * `metricName`/`sectorSegment`/`granularity` vocabularies are sector-conditional,
 * their scope must resolve against the pathway's own coverage, and `access` is
 * tied to a sibling property -- none of which draft-07 can express.
 *
 * Run from `scripts/schema-check-files.ts`, so `npm run schema:check` gates all
 * of it.
 *
 * Errors are formatted like AJV's (`<instancePath> <message>`) so callers can
 * merge them into the same `ValidationProblem.errors` list without special-casing.
 */
import type { PathwayMetadataV2 } from "../types/pathwayMetadata.v2";
import {
  metricBelongsToSector,
  metricsForSector,
  segmentBelongsToSector,
  segmentsForSector,
  technologiesForSector,
  technologyBelongsToSector,
  UNSEGMENTED,
} from "./timeseriesTaxonomy.ts";

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

/**
 * The trailing clause of a "not a valid X of sector Y" message.
 *
 * Three cases, because they call for three different actions. Undefined means
 * nobody has written that sector's vocabulary down, and the fix is to write it.
 * Defined-but-empty means someone has, and the answer is genuinely "none" -- so
 * saying "(allowed: )" would read as a bug in the checker rather than an answer.
 * Only a non-empty list can usefully be listed.
 */
function allowedClause(
  defined: readonly string[] | undefined,
  axis: string,
): string {
  if (!defined) {
    return (
      `-- no ${axis} are defined for that sector. Add them to SECTORS_BY_KEY in` +
      ` src/utils/timeseriesTaxonomy.ts.`
    );
  }
  if (defined.length === 0) {
    return `-- that sector defines no ${axis}.`;
  }
  return `(allowed: ${quote(defined)})`;
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

  // #461: a technology must belong to the sector it is attached to. The schema
  // types `technologies` as the flat 31-member enum, which is why the generated
  // type still reads as "a bit of a random list" -- that breadth is answered here
  // rather than in the type.
  //
  // Closed by default: a sector whose technologies are not defined in
  // `timeseriesTaxonomy.ts` accepts only an empty list. The alternative -- passing
  // anything through for undefined sectors -- means the next data round populates
  // technologies for a new sector and nothing checks them, which is the failure
  // this whole check exists to prevent. Rejecting instead makes the missing
  // definition impossible to miss, and the message says exactly where to add it.
  (pathway.sectors ?? []).forEach((sector, i) => {
    if (!sector?.name) return;
    const allowed = technologiesForSector(sector.name);
    const technologies = sector.technologies ?? [];
    if (!allowed) {
      if (technologies.length > 0) {
        errors.push(
          `/sectors/${i}/technologies lists ${quote(technologies)} but no` +
            ` technology list is defined for sector "${sector.name}". Add one to` +
            ` SECTORS_BY_KEY in src/utils/timeseriesTaxonomy.ts, or use [].`,
        );
      }
      return;
    }
    technologies.forEach((technology, t) => {
      if (technologyBelongsToSector(technology, sector.name) !== "yes") {
        errors.push(
          `/sectors/${i}/technologies/${t} "${technology}" is not a technology of` +
            ` sector "${sector.name}" ` +
            allowedClause(allowed, "technologies"),
        );
      }
    });
  });

  // #870: dataAvailability rows. Optional -- authoring is incremental, and a
  // pathway without the field is not an invalid pathway.
  const availability = pathway.dataAvailability;
  if (availability && Array.isArray(availability.byMetric)) {
    // Metrics the pathway itself claims to report. Availability for a metric it
    // does not report is a typo, not data -- and the likeliest typo of all,
    // since the two lists are authored separately.
    const reported = new Set<string>(pathway.metric ?? []);
    // First index each (metricName, sector, sectorSegment, geography) was seen
    // at. NUL-joined so no combination of parts can collide with another; see
    // the keyFeatures duplicate check above for the same reasoning.
    const seenRows = new Map<string, number>();

    availability.byMetric.forEach((row, i) => {
      const at = `/dataAvailability/byMetric/${i}`;

      if (!declared.has(row.sector)) {
        errors.push(
          `${at}/sector "${row.sector}" is not a sector this pathway declares` +
            ` (allowed: ${quote(declared)})`,
        );
      }
      if (!geographies.has(row.geography)) {
        errors.push(
          `${at}/geography "${row.geography}" is not a geography this pathway` +
            ` declares (allowed: ${quote(geographies)})`,
        );
      }

      if (!reported.has(row.metricName)) {
        errors.push(
          `${at}/metricName "${row.metricName}" is not a metric this pathway` +
            ` reports (allowed: ${quote(reported)})`,
        );
      }

      // Deliberately rejects only a definite "no", unlike the technology and
      // segment checks: a sector whose metrics are undefined passes. Those two
      // axes have no other constraint, so closing them by default is the only
      // thing standing between a typo and production. `metricName` already has
      // one -- it must appear in the pathway's own `metric` array, checked just
      // above -- so closing this axis too would add no safety while making
      // dataAvailability unauthorable for the fourteen sectors whose metrics
      // nobody has defined, which is the blockage `UNSEGMENTED` exists to avoid.
      if (metricBelongsToSector(row.metricName, row.sector) === "no") {
        errors.push(
          `${at}/metricName "${row.metricName}" is not a metric of sector` +
            ` "${row.sector}" ` +
            allowedClause(metricsForSector(row.sector), "metrics"),
        );
      }

      if (segmentBelongsToSector(row.sectorSegment, row.sector) !== "yes") {
        const defined = segmentsForSector(row.sector);
        errors.push(
          `${at}/sectorSegment "${row.sectorSegment}" is not a segment of sector` +
            ` "${row.sector}" ` +
            // UNSEGMENTED is always legal, so it belongs in every allowed list.
            allowedClause([...(defined ?? []), UNSEGMENTED], "segments") +
            (defined
              ? ""
              : ` No segments are defined for that sector; add them to` +
                ` SECTORS_BY_KEY in src/utils/timeseriesTaxonomy.ts.`),
        );
      }

      // Same rule as sectors[].technologies (#461): a breakdown dimension has to
      // be a technology the sector actually has.
      (row.granularity ?? []).forEach((technology, g) => {
        if (technologyBelongsToSector(technology, row.sector) !== "yes") {
          errors.push(
            `${at}/granularity/${g} "${technology}" is not a technology of` +
              ` sector "${row.sector}" ` +
              allowedClause(technologiesForSector(row.sector), "technologies"),
          );
        }
      });

      // `access` describes the cost of reaching the publisher's copy, so it is
      // meaningless for data we serve ourselves and required for data we do not.
      const inTool = row.dataFormat === "In tool";
      if (inTool && row.access !== null) {
        errors.push(
          `${at}/access is "${row.access}" but dataFormat is "In tool" -- we host` +
            ` this data, so there is no publisher paywall to describe. Use null.`,
        );
      } else if (!inTool && row.access === null) {
        errors.push(
          `${at}/access is null but dataFormat is "${row.dataFormat}" -- say` +
            ` whether reaching it at the publisher is "Free" or "Paywalled".`,
        );
      }

      const scope = [
        row.metricName,
        row.sector,
        row.sectorSegment,
        row.geography,
      ].join("\u0000");
      const firstSeen = seenRows.get(scope);
      if (firstSeen === undefined) {
        seenRows.set(scope, i);
      } else {
        errors.push(
          `${at} duplicates the scope of /dataAvailability/byMetric/${firstSeen}` +
            ` (metric "${row.metricName}", sector "${row.sector}", segment` +
            ` "${row.sectorSegment}", geography "${row.geography}").` +
            ` Each combination may describe only one row; the table has one cell` +
            ` per column to render it in.`,
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
