import type { PathwayMetadataType } from "../types";

/*
 * Editions: the same pathway re-published with new data under a new year.
 *
 * `IEA-NZE-2024` and `IEA-NZE-2025` are one scenario published twice. The
 * metadata has no field that says so (#869 raised it; adding one is a data
 * decision, not ours), so the link is derived here in the front end from the
 * id convention every record currently follows: `<series>-<year>`.
 *
 * That convention is not enforced by the schema. An edition published under a
 * differently shaped id silently fails to group, which is a missed link rather
 * than a wrong one -- the pathway still appears, on its own card. Treat a
 * non-matching id as a single-edition pathway, never as an error.
 */

/** Trailing four-digit year on an id, e.g. `IEA-NZE-2024` -> `IEA-NZE`. */
const SERIES_PATTERN = /^(.*)-(\d{4})$/;

/**
 * The series an id belongs to, or null when the id does not carry a year.
 *
 * Only the id shape decides this. Two records share a series when the text
 * before the trailing year is identical, so `IEA-NZE` and `IEA-NZE-ALT` stay
 * apart.
 */
export function editionSeries(id: string): string | null {
  return SERIES_PATTERN.exec(id)?.[1] ?? null;
}

/** The year in an id's suffix, or null. Used only to break sort ties. */
function idSuffixYear(id: string): number | null {
  const match = SERIES_PATTERN.exec(id);
  return match ? Number(match[2]) : null;
}

/**
 * The year to SHOW for a pathway. Always the metadata, never the id.
 *
 * Three records disagree with their own id: `UNSDSN-CW-EP-MY-2024`,
 * `UNSDSN-CW-MAP-MY-2024` and `UNSDSN-CW-MAP1-MY-2024` all end in `-2024` but
 * carry `publication.year: 2023`. The mismatch is logged for the data team and
 * is not ours to fix, so every display path reads the metadata and agrees with
 * the rest of the card.
 */
export function editionYear(pathway: PathwayMetadataType): number {
  return pathway.publication.year;
}

export interface EditionGroup {
  /** The shared series, or null for a pathway whose id carries no year. */
  series: string | null;
  /** Every edition, oldest first. The last entry is the newest. */
  editions: PathwayMetadataType[];
}

/**
 * Group pathways into series, keeping the caller's ordering.
 *
 * Groups come back in the order their FIRST member appeared in the input, so a
 * sorted or filtered list keeps its order and the grid does not reshuffle when
 * a series collapses into one card.
 *
 * Pathways whose id carries no year each get their own group. They are not
 * pooled under a shared null series: they are unrelated pathways that happen
 * to break the convention, not editions of each other.
 */
export function groupEditions(
  pathways: readonly PathwayMetadataType[],
): EditionGroup[] {
  const groups: EditionGroup[] = [];
  const bySeries = new Map<string, EditionGroup>();

  for (const pathway of pathways) {
    const series = editionSeries(pathway.id);
    if (series === null) {
      groups.push({ series: null, editions: [pathway] });
      continue;
    }
    const existing = bySeries.get(series);
    if (existing) {
      existing.editions.push(pathway);
      continue;
    }
    const group: EditionGroup = { series, editions: [pathway] };
    bySeries.set(series, group);
    groups.push(group);
  }

  for (const group of groups) {
    if (group.editions.length > 1) group.editions.sort(compareEditions);
  }
  return groups;
}

/**
 * Oldest first, by publication year.
 *
 * The id's year breaks a tie only when the metadata years are equal, which
 * keeps the order stable for the records whose id and metadata disagree
 * without letting the id override the year we display.
 */
function compareEditions(
  a: PathwayMetadataType,
  b: PathwayMetadataType,
): number {
  const byYear = editionYear(a) - editionYear(b);
  if (byYear !== 0) return byYear;
  const bySuffix = (idSuffixYear(a.id) ?? 0) - (idSuffixYear(b.id) ?? 0);
  if (bySuffix !== 0) return bySuffix;
  return a.id.localeCompare(b.id);
}

/** The edition a collapsed grid card represents: the newest in the group. */
export function newestEdition(group: EditionGroup): PathwayMetadataType {
  return group.editions[group.editions.length - 1];
}

/**
 * A ` (2025)` suffix for a label, or an empty string.
 *
 * Comparison can now hold two editions of one pathway, which would otherwise
 * produce two identical column titles and two identical ribbon slots. The year
 * is appended only when another edition of the SAME series is on screen beside
 * it: adding it unconditionally would put a year on every label in the app for
 * the sake of two pathways.
 */
export function editionLabelSuffix(
  pathway: PathwayMetadataType,
  shownWith: readonly PathwayMetadataType[],
): string {
  const series = editionSeries(pathway.id);
  if (series === null) return "";
  const hasSibling = shownWith.some(
    (other) => other.id !== pathway.id && editionSeries(other.id) === series,
  );
  return hasSibling ? ` (${editionYear(pathway)})` : "";
}
