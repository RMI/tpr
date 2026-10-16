import { segmentsForSector } from "./timeseriesTaxonomy";

interface SegmentedRow {
  sector: string;
  metric: string;
  geography: string;
  sectorSegment?: readonly string[];
}

/**
 * The sector segments a plotted series covers: the distinct `sectorSegment`
 * values of the rows a panel actually draws (#915).
 *
 * Read from the data rather than the metric, because v2 records segments per
 * row — two pathways' capacity series can differ, one including Energy
 * storage and one not. Ordered as the sector defines its segments, so the
 * badges read the same way on every panel; anything outside that list keeps
 * its first-seen order at the end.
 */
export function plottedSegments(
  rows: readonly SegmentedRow[] | undefined,
  sector: { key: string; displayName: string },
  metric: string,
  geography: string,
): string[] {
  const seen = new Set<string>();
  for (const row of rows ?? []) {
    if (
      row.sector === sector.key &&
      row.metric === metric &&
      row.geography === geography
    )
      row.sectorSegment?.forEach((segment) => seen.add(segment));
  }
  const order = segmentsForSector(sector.displayName) ?? [];
  const rank = (segment: string) => {
    const i = order.indexOf(segment);
    return i === -1 ? order.length : i;
  };
  return [...seen].sort((a, b) => rank(a) - rank(b));
}
