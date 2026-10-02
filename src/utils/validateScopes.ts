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
 * their scope must resolve against the pathway's own coverage, and the two
 * sentinel rules span sibling properties -- a sentinel must be its list's only
 * member, and `Not covered` describes the whole row rather than one variable.
 * None of that is expressible in draft-07.
 *
 * Run from `scripts/schema-check-files.ts`, so `npm run schema:check` gates all
 * of it.
 *
 * Errors are formatted like AJV's (`<instancePath> <message>`) so callers can
 * merge them into the same `ValidationProblem.errors` list without special-casing.
 */
import type { PathwayMetadataV2 } from "../types/pathwayMetadata.v2";
import { dataAvailabilitySchema } from "../schema/common/index.ts";
import {
  availabilityMetricBelongsToSector,
  availabilityMetricsForSector,
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
export const ACROSS_SECTORS = "across sectors";

/** Geography sentinels: widest possible, and a multi-region non-global aggregate. */
export const GLOBAL_SCOPE = "Global";
export const ACROSS_REGIONS = "across regions";

/**
 * The two authored-absence values every dataAvailability variable shares
 * (cookbook tpr_cookbook_20260924).
 *
 * They are not interchangeable and neither is a null. `Unspecified` says the
 * pathway covers this (sector, metric) pair but does not state the value;
 * `Not covered` says it does not cover the pair at all, and so applies to every
 * variable on the row at once. Keeping both explicit is the same rule #858 sets
 * for keyFeatures, where an authored "No information" terminates the fallback
 * chain and an absent entry does not.
 */
export const UNSPECIFIED = "Unspecified";
export const NOT_COVERED = "Not covered";

const SENTINELS: readonly string[] = [UNSPECIFIED, NOT_COVERED];

function isSentinel(value: string): boolean {
  return SENTINELS.includes(value);
}

/**
 * Granularity members drawn from the `granularityBreakdown` vocabulary rather
 * than from the sector's technologies — emissions scopes and the sentinels.
 * They are exempt from the technology check below, not from the schema enum.
 *
 * Read off the schema rather than restated here, the same way `filterRegions`
 * derives `ALL_COUNTRY_CODES` from `countryCode.v1`: the two lists must agree,
 * and a copy is a copy that drifts.
 */
const GRANULARITY_BREAKDOWN: ReadonlySet<string> = new Set(
  (dataAvailabilitySchema.$defs as Record<string, { enum?: string[] }>)
    ?.granularityBreakdown?.enum ?? [],
);

function isBreakdownValue(value: string): boolean {
  return GRANULARITY_BREAKDOWN.has(value);
}

/**
 * Whether each of a dataAvailability row's six variables reads `Not covered`.
 *
 * One entry per variable rather than a flat list of values, because the rule it
 * feeds is about agreement *between* variables: either they all say the pair is
 * uncovered or none of them do. `dataFormat` counts even though its enum has no
 * `Unspecified` — it does have `Not covered`.
 */
function notCoveredByVariable(row: {
  geography: readonly string[];
  granularity: readonly string[];
  sectorSegment: readonly string[];
  timeResolution: string;
  dataFormat: string;
  scopeLimitations: string;
}): boolean[] {
  return [
    row.geography.includes(NOT_COVERED),
    row.granularity.includes(NOT_COVERED),
    row.sectorSegment.includes(NOT_COVERED),
    row.timeResolution === NOT_COVERED,
    row.dataFormat === NOT_COVERED,
    row.scopeLimitations === NOT_COVERED,
  ];
}

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
 * point of the check. `across regions` stays unconditional: #858 reserves it for a
 * multi-region non-global aggregate without saying when it applies, and no file
 * in the corpus uses it yet, so gating it would be inventing a rule.
 */
function allowedGeographies(pathway: PathwayMetadataV2): Set<string> {
  const allowed = new Set<string>([ACROSS_REGIONS]);
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
 * Sectors an entry may name: the pathway's own, plus the `across sectors`
 * sentinel.
 *
 * Note what is deliberately *not* checked: #858 remarks that `across sectors` is
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
  const entrySectors = new Set<string>([ACROSS_SECTORS, ...declared]);
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

    /*
      The pathway-level `segments` list, same rule as `technologies` above and
      for the same reason -- but without the undefined-sector rejection.

      `technologies` rejects a non-empty list under a sector with no definition,
      because the field is required and `[]` is the authored way to say "none".
      `segments` is optional, so there is no `[]` to fall back to: rejecting
      would make the field unusable for the twelve sectors whose segments the
      cookbook has not written down, rather than catching a mistake. An
      undefined sector therefore passes, as it does for a dataAvailability row.
    */
    const segmentsAllowed = segmentsForSector(sector.name);
    if (segmentsAllowed) {
      (sector.segments ?? []).forEach((segment, g) => {
        if (segmentBelongsToSector(segment, sector.name) !== "yes") {
          errors.push(
            `/sectors/${i}/segments/${g} "${segment}" is not a segment of` +
              ` sector "${sector.name}" ` +
              allowedClause(segmentsAllowed, "segments"),
          );
        }
      });
    }
  });

  // #870: dataAvailability rows. Optional -- authoring is incremental, and a
  // pathway without the field is not an invalid pathway.
  const availability = pathway.dataAvailability;
  if (availability && Array.isArray(availability.byMetric)) {
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
      // The cookbook types Geography coverage as "a subset of the geographies
      // listed at pathway level", so every member is checked the way the single
      // token used to be. A sentinel stands in for the whole list rather than
      // naming a place, so it is legal only alone -- checked with the other
      // sentinels below.
      row.geography.forEach((token, g) => {
        if (isSentinel(token)) return;
        if (!geographies.has(token)) {
          errors.push(
            `${at}/geography/${g} "${token}" is not a geography this pathway` +
              ` declares (allowed: ${quote(geographies)})`,
          );
        }
      });

      /*
        Checked against the sector's *availability* metric vocabulary, not the
        pathway's own `metric` array.

        The pathway-level check this replaces required every row to name a
        metric the pathway lists in `metric`. Under the cookbook that is wrong
        twice over: the two metric variables are separate vocabularies (register
        item D16), and a covered sector earns a row for *every* metric in the
        extended list, with the ones it does not report marked `Not covered`. So
        the old rule made the cookbook's completeness requirement unsatisfiable
        -- a `Not covered` row was rejected precisely because it was not
        reported.

        This closes the axis by default, unlike the comment that used to sit
        here: `availabilityMetricsForSector` is defined for all three sectors the
        cookbook covers, and a sector with no definition still answers
        "unknown" and passes.
      */
      if (
        availabilityMetricBelongsToSector(row.metricName, row.sector) === "no"
      ) {
        errors.push(
          `${at}/metricName "${row.metricName}" is not a metric of sector` +
            ` "${row.sector}" ` +
            allowedClause(availabilityMetricsForSector(row.sector), "metrics"),
        );
      }

      // Multi-valued since the cookbook types it Multiple, so each member is
      // checked the way the single value used to be. The sentinels are legal
      // under every sector, like UNSEGMENTED; that they must then be the list's
      // only member is checked with the other sentinels below.
      row.sectorSegment.forEach((segment, g) => {
        if (isSentinel(segment)) return;
        if (segmentBelongsToSector(segment, row.sector) === "yes") return;
        const defined = segmentsForSector(row.sector);
        errors.push(
          `${at}/sectorSegment/${g} "${segment}" is not a segment of sector` +
            ` "${row.sector}" ` +
            // UNSEGMENTED and the two sentinels are always legal, so they
            // belong in every allowed list.
            allowedClause(
              [...(defined ?? []), UNSEGMENTED, ...SENTINELS],
              "segments",
            ) +
            (defined
              ? ""
              : ` No segments are defined for that sector; add them to` +
                ` SECTORS_BY_KEY in src/utils/timeseriesTaxonomy.ts.`),
        );
      });

      // Same rule as sectors[].technologies (#461): a breakdown dimension has to
      // be a technology the sector actually has. Members of the
      // granularityBreakdown vocabulary are not technologies and are skipped --
      // the schema enum is what constrains those.
      row.granularity.forEach((value, g) => {
        if (isBreakdownValue(value)) return;
        if (technologyBelongsToSector(value, row.sector) !== "yes") {
          errors.push(
            `${at}/granularity/${g} "${value}" is not a technology of` +
              ` sector "${row.sector}" ` +
              allowedClause(technologiesForSector(row.sector), "technologies"),
          );
        }
      });

      // A sentinel replaces the list rather than joining it: "Not covered"
      // alongside a real breakdown would say both that the pair is uncovered and
      // how it is broken down.
      for (const [field, values] of [
        ["geography", row.geography],
        ["granularity", row.granularity],
        ["sectorSegment", row.sectorSegment],
      ] as const) {
        const sentinel = values.findIndex(isSentinel);
        if (sentinel !== -1 && values.length > 1) {
          errors.push(
            `${at}/${field} lists "${values[sentinel]}" alongside` +
              ` ${values.length - 1} other value(s). A sentinel stands in for the` +
              ` whole list, so it must be its only member.`,
          );
        }
      }

      // "Not covered" is a property of the (sector, metric) pair, not of one
      // variable: the cookbook requires a row for every allowable pair and marks
      // an uncovered pair across the whole row. A row uncovered for one variable
      // and authored for another is a half-filled row, not data.
      const notCovered = notCoveredByVariable(row);
      if (notCovered.some(Boolean) && !notCovered.every(Boolean)) {
        errors.push(
          `${at} mixes "${NOT_COVERED}" with other values. "${NOT_COVERED}"` +
            ` describes the whole (sector, metric) pair, so when it applies every` +
            ` variable on the row carries it. Use "${UNSPECIFIED}" for a covered` +
            ` pair the pathway says nothing about.`,
        );
      }

      const scope = [
        row.metricName,
        row.sector,
        // Order within either list is an authoring accident, not data, so the
        // key is the set: two rows covering the same segments and places
        // collide however they happen to be written down.
        [...row.sectorSegment].sort().join(","),
        [...row.geography].sort().join(","),
      ].join("\u0000");
      const firstSeen = seenRows.get(scope);
      if (firstSeen === undefined) {
        seenRows.set(scope, i);
      } else {
        errors.push(
          `${at} duplicates the scope of /dataAvailability/byMetric/${firstSeen}` +
            ` (metric "${row.metricName}", sector "${row.sector}", segments` +
            ` ${quote(row.sectorSegment)}, geography ${quote(row.geography)}).` +
            ` Each combination may describe only one row; the table has one cell` +
            ` per column to render it in.`,
        );
      }
    });
  }

  // dependencies are descriptive and not part of the inheritance chain, but
  // #858 still scopes each to a sector, and that sector must be a real one.
  // Note this uses `declared`, not `entrySectors`: the schema types this field as
  // the plain sector enum, so `across sectors` is not a legal value here.
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
