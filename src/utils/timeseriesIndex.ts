// src/utils/timeseriesIndex.ts
import gen from "../data/index.gen";

export type TimeseriesIndexItem = {
  datasetId: string;
  label?: string;
  path: string;
  summary?: unknown;
};

export type TimeseriesIndex = typeof gen;

export function fetchTimeseriesIndex(): Promise<TimeseriesIndex> {
  // Keep the same call signature for callers expecting a Promise.
  return Promise.resolve(gen);
}

/**
 * The index, synchronously. It is bundled with the app, so a caller that must
 * not restyle after mount (the scope ribbon's availability) can read it on the
 * first render. Going through this module rather than `index.gen` keeps it
 * mockable alongside `fetchTimeseriesIndex`.
 */
export function getTimeseriesIndex(): TimeseriesIndex {
  return gen;
}

export function datasetsForPathway(
  index: TimeseriesIndex | null,
  pathwayId: string,
) {
  if (!index) return [];
  return index.byPathway[pathwayId] ?? [];
}

export function summarizeSummary(summary: unknown): string | undefined {
  if (!summary || typeof summary !== "object") return undefined;
  const s = summary as Record<string, unknown>;
  const parts: string[] = [];

  const yr = Array.isArray(s["yearRange"])
    ? (s["yearRange"] as unknown[])
    : null;
  if (
    yr &&
    yr.length === 2 &&
    typeof yr[0] === "number" &&
    typeof yr[1] === "number"
  ) {
    parts.push(`${yr[0]} → ${yr[1]}`);
  }
  const dr = Array.isArray(s["dateRange"])
    ? (s["dateRange"] as unknown[])
    : null;
  if (
    dr &&
    dr.length === 2 &&
    typeof dr[0] === "string" &&
    typeof dr[1] === "string"
  ) {
    parts.push(`${dr[0]} → ${dr[1]}`);
  }
  if (typeof s["sectorCount"] === "number")
    parts.push(`${s["sectorCount"]} sectors`);
  if (typeof s["geographyCount"] === "number")
    parts.push(`${s["geographyCount"]} geographies`);
  if (typeof s["rowCount"] === "number") parts.push(`${s["rowCount"]} rows`);

  return parts.length ? parts.join(" · ") : undefined;
}
