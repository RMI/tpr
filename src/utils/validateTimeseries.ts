/**
 * Cross-file checks for v2 timeseries files (#915).
 *
 * `pathwayTimeseries.v2.json` validates each row's *shape*: a non-blank
 * geography string and a list of known segment names. Two rules need more than
 * draft-07 can see, so they live here, run from `scripts/schema-check-files.ts`
 * and from `scripts/import-benchmark-data.ts`:
 *
 * - **Geography is the publication's own label.** A row's `geography` must be
 *   one the pathway's metadata declares — `Global`, a region label, or a
 *   country — for every pathway the file serves. That is what lets the UI match
 *   a scope selection to a series by plain equality, instead of the spelling
 *   folds #945 needed when files said "South East Asia" and metadata said
 *   "Southeast Asia" or "ASEAN".
 * - **Segments belong to the row's sector.** `sectorSegment` uses the same
 *   vocabulary as dataAvailability, but without its sentinels: a timeseries row
 *   is actual data, so it always covers a known part of the value chain.
 *
 * The metadata lives in other files, which is the other reason this cannot be a
 * schema rule. Errors use the AJV-like `<instancePath> <message>` form. A
 * problem repeated on many rows is reported once with its first path and a row
 * count, since one wrong label in a 1,500-row file is one mistake, not 1,500.
 */
import type { PathwayMetadataV2 } from "../types/pathwayMetadata.v2";
import type { PathwayTimeseriesV2 } from "../types/pathwayTimeseries.v2";
import {
  declaredGeographies,
  NOT_COVERED,
  UNSPECIFIED,
} from "./validateScopes.ts";
import {
  SECTORS_BY_KEY,
  segmentBelongsToSector,
  UNSEGMENTED,
} from "./timeseriesTaxonomy.ts";

/** `$id` of the schema these checks apply to. */
export const PATHWAY_TIMESERIES_V2_ID =
  "http://pathways.rmi.org/schema/pathwayTimeseries.v2.json";

/** A pathway's declared geography, keyed by pathway id (v1 and v2 share the shape). */
export type MetadataGeographyById = ReadonlyMap<
  string,
  PathwayMetadataV2["geography"] | null | undefined
>;

const SEGMENT_SENTINELS: ReadonlySet<string> = new Set([
  UNSPECIFIED,
  NOT_COVERED,
  UNSEGMENTED,
]);

const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * The countries a pathway declares, keyed by lower-cased English name, so a
 * rejected label like "Japan" can say which code to write instead (#998: one
 * country code is always a country). Countries inside regions count, as they do
 * for `declaredGeographies`.
 *
 * Uses Intl's short names ("United States", "China") rather than
 * geographyUtils' i18n-iso-countries names: that module imports its locale JSON
 * without an import attribute, so the ts-node scripts that run this file cannot
 * load it. An exact name match is a hint, not a rule, so a label written another
 * way ("United States of America") just gets the plain error.
 */
function declaredCountriesByName(
  geo: PathwayMetadataV2["geography"] | null | undefined,
): Map<string, string> {
  const codes = [
    ...(geo?.country ?? []),
    ...Object.values(geo?.regions ?? {}).flat(),
  ];
  const byName = new Map<string, string>();
  for (const code of codes) {
    const name = REGION_NAMES.of(code);
    if (name && name !== code) byName.set(name.toLowerCase(), code);
  }
  return byName;
}

export function validateTimeseries(
  doc: PathwayTimeseriesV2,
  metadataGeographyById: MetadataGeographyById,
): string[] {
  const errors: string[] = [];

  doc.pathwayId.forEach((id, i) => {
    if (!metadataGeographyById.has(id))
      errors.push(`/pathwayId/${i} "${id}" is not the id of any pathway`);
  });
  const declaredBy = doc.pathwayId
    .filter((id) => metadataGeographyById.has(id))
    .map((id) => ({
      id,
      declared: declaredGeographies(metadataGeographyById.get(id)),
      countryByName: declaredCountriesByName(metadataGeographyById.get(id)),
    }));

  // message -> first path and how many rows repeat it
  const repeated = new Map<string, { path: string; count: number }>();
  const report = (path: string, message: string) => {
    const seen = repeated.get(message);
    if (seen) seen.count++;
    else repeated.set(message, { path, count: 1 });
  };

  doc.data.forEach((row, i) => {
    for (const { id, declared, countryByName } of declaredBy) {
      if (declared.has(row.geography)) continue;
      const code = countryByName.get(row.geography.trim().toLowerCase());
      report(
        `/data/${i}/geography`,
        `"${row.geography}" is not a geography pathway ${id} declares` +
          (code ? ` -- use "${code}"` : ""),
      );
    }

    const sectorName = SECTORS_BY_KEY[row.sector]?.displayName;
    row.sectorSegment.forEach((segment, j) => {
      const path = `/data/${i}/sectorSegment/${j}`;
      if (SEGMENT_SENTINELS.has(segment))
        report(
          path,
          `"${segment}" is not allowed: a timeseries row is data, so it names the segment it covers`,
        );
      else if (sectorName === undefined)
        report(
          path,
          `sector "${row.sector}" has no segments defined, so it cannot carry "${segment}"`,
        );
      else if (segmentBelongsToSector(segment, sectorName) !== "yes")
        report(path, `"${segment}" is not a segment of ${sectorName}`);
    });
  });

  for (const [message, { path, count }] of repeated)
    errors.push(
      `${path} ${message}${count > 1 ? ` (and ${count - 1} more rows)` : ""}`,
    );
  return errors;
}
