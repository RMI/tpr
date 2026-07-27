// src/utils/timeseriesAvailability.ts
import { SECTORS_BY_KEY } from "./timeseriesTaxonomy";
import { geographyLabel, normalizeGeography } from "./geographyUtils";

interface TimeseriesSummary {
  sectors?: string[];
  geographies?: string[];
  metrics?: string[];
}

function parseSummary(summary: unknown): TimeseriesSummary {
  if (!summary || typeof summary !== "object") return {};
  const s = summary as Record<string, unknown>;
  const toStringArray = (v: unknown): string[] | undefined =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.length > 0)
      : undefined;
  return {
    sectors: toStringArray(s["sectors"]),
    geographies: toStringArray(s["geographies"]),
    metrics: toStringArray(s["metrics"]),
  };
}

function sectorDisplayNames(summary: unknown): Set<string> {
  const names = new Set<string>();
  for (const key of parseSummary(summary).sectors ?? []) {
    const def = SECTORS_BY_KEY[key];
    if (def) names.add(def.displayName);
  }
  return names;
}

function metricDisplayNames(summary: unknown): Set<string> {
  const s = parseSummary(summary);
  const names = new Set<string>();
  for (const sectorKey of s.sectors ?? []) {
    const sectorDef = SECTORS_BY_KEY[sectorKey];
    if (!sectorDef) continue;
    for (const metricKey of s.metrics ?? []) {
      const metricDef = sectorDef.metrics[metricKey];
      if (metricDef) names.add(metricDef.displayName);
    }
  }
  return names;
}

export interface PathwayToolAvailability {
  hasSector: (sectorDisplayName: string) => boolean;
  hasMetric: (metricDisplayName: string) => boolean;
  hasGeography: (rawGeo: string) => boolean;
}

const NO_DATA: PathwayToolAvailability = {
  hasSector: () => false,
  hasMetric: () => false,
  hasGeography: () => false,
};

export function pathwayToolAvailability(
  datasets: Array<{ summary?: unknown }>,
): PathwayToolAvailability {
  if (datasets.length === 0) return NO_DATA;

  const sectorNames = new Set<string>();
  const metricNames = new Set<string>();
  const geoStrings = new Set<string>();

  for (const ds of datasets) {
    for (const v of sectorDisplayNames(ds.summary)) sectorNames.add(v);
    for (const v of metricDisplayNames(ds.summary)) metricNames.add(v);
    for (const v of parseSummary(ds.summary).geographies ?? [])
      geoStrings.add(v);
  }

  return {
    hasSector: (name) => sectorNames.has(name),
    hasMetric: (name) => metricNames.has(name),
    hasGeography: (rawGeo) => {
      const label = geographyLabel(normalizeGeography(rawGeo));
      return geoStrings.has(label) || geoStrings.has(rawGeo);
    },
  };
}

export function sortByAvailability<T>(
  items: T[],
  isAvailable: (item: T) => boolean,
): T[] {
  return [
    ...items.filter(isAvailable),
    ...items.filter((item) => !isAvailable(item)),
  ];
}

export const GEOGRAPHY_AVAILABILITY_TOOLTIP =
  "Filled badges indicate that data is available for visualization and download in this tool. Outlined badges indicate the data for this geography is available in the source publication, but not currently in this tool.";

export const SECTOR_AVAILABILITY_TOOLTIP =
  "Filled badges indicate that data is available for visualization and download in this tool. Outlined badges indicate the data for this sector is available in the source publication, but not currently in this tool.";

export const METRIC_AVAILABILITY_TOOLTIP =
  "Filled badges indicate that data is available for visualization and download in this tool. Outlined badges indicate the data for this metric is available in the source publication, but not currently in this tool.";
