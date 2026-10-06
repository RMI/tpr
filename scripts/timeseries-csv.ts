/**
 * CSV pieces of the timeseries download, kept out of
 * build-timeseries-files.ts so they can be tested: that script runs on import.
 */
import {
  getSectorDefinition,
  segmentDefinitionFor,
  UnknownTaxonomyError,
} from "../src/utils/timeseriesTaxonomy.ts";

/** How a list value is written into one CSV cell. */
export const LIST_SEPARATOR = "; ";

/**
 * The download's segment columns for one row: the segments it covers and, in
 * the same order, what each means.
 *
 * They replace the former `sector_scope` column, which repeated one taxonomy
 * string per metric; segments now come from the row itself (#915). A row
 * without segments (a v1 file) gets empty cells rather than a guess.
 */
export function sectorSegmentColumns(
  sectorKey: string,
  segments: readonly string[] | undefined,
): { sector_segment: string; definition_sector_segment: string } {
  const list = segments ?? [];
  const sector = getSectorDefinition(sectorKey).displayName;
  const definitions = list.map((segment) => {
    const def = segmentDefinitionFor(sector, segment);
    // Schema validation guarantees this; failing loudly beats a blank cell.
    if (!def)
      throw new UnknownTaxonomyError(
        `Unknown segment "${segment}" for sector "${sector}"`,
      );
    return def.definition;
  });
  return {
    sector_segment: list.join(LIST_SEPARATOR),
    definition_sector_segment: definitions.join(LIST_SEPARATOR),
  };
}

/**
 * One CSV cell. Strings are always quoted; a list is joined first, so it can
 * never spill its commas into the next columns.
 */
export function csvCell(value: unknown): string {
  if (Array.isArray(value)) return csvCell(value.join(LIST_SEPARATOR));
  if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Rows to CSV text; the header is the union of the rows' keys. */
export function jsonToCsv(data: readonly Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
  const header = keys.join(",");
  const rows = data.map((row) => keys.map((k) => csvCell(row[k])).join(","));
  return [header, ...rows].join("\n");
}
