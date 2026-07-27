// scripts/build-timeseries-index.ts
// Build a compact linkage index from arbitrary JSON under src/data/**.
//
// Behavior (env flags):
//   - TS_INDEX_STRICT=1 : exit(1) if any timeseries is malformed (missing datasetId/id or pathwayID)
//   - TS_INDEX_DEBUG=1  : verbose logs for skipped files & reasons
//
// Detection & normalization:
//   - Identify timeseries by $schema containing "pathwayTimeseries.v1.json" (or full URL).
//   - datasetId  := datasetId | id
//   - pathwayIDs := pathwayID (string|array) | pathwayIds | pathwayId
//   - label      := label | name
//
// Output:
//   - Writes src/data/index.json with { byPathway, byDataset }.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  getSectorDefinition,
  getMetricDefinition,
  getTechnologyDefinition,
  UnknownTaxonomyError,
} from "../src/utils/timeseriesTaxonomy.ts";

const STRICT = process.env.TS_INDEX_STRICT === "1";
const DEBUG = process.env.TS_INDEX_DEBUG === "1";

type Header = {
  $schema?: string;
  datasetId?: string;
  id?: string;
  // You use singular key "pathwayID" (array or string). We also accept common variants.
  pathwayID?: string | string[];
  pathwayIds?: string[];
  pathwayId?: string | string[];
  label?: string;
  name?: string;
  summary?: unknown;
};

type IndexItem = {
  datasetId: string;
  label?: string;
  path: string;
  summary?: unknown;
};

type TimeseriesIndex = {
  byPathway: Record<string, IndexItem[]>;
  byDataset: Record<
    string,
    {
      datasetId: string;
      pathwayIds: string[];
      label?: string;
      path: string;
      summary?: unknown;
    }
  >;
};

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "src", "data");
const OUT_FILE = path.join(DATA_DIR, "index.json");

const TS_SCHEMA_MATCHERS = [
  "pathwayTimeseries.v1.json",
  "http://pathways.rmi.org/schema/pathwayTimeseries.v1.json",
];

function logDebug(...args: any[]) {
  if (DEBUG) console.log("[timeseries-index][debug]", ...args);
}
function logInfo(...args: any[]) {
  console.log("[timeseries-index]", ...args);
}
function logWarn(...args: any[]) {
  console.warn("[timeseries-index]", ...args);
}
function logError(...args: any[]) {
  console.error("[timeseries-index]", ...args);
}

function sanitizeStrings<T>(obj: T): T {
  const clean = (v: unknown): unknown =>
    typeof v === "string" ? v.replace(/\s+/g, " ").trim() : v;

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, clean(v)]),
  ) as T;
}

async function isDir(p: string) {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) yield full;
  }
}

// Minimal comment stripping to tolerate // and /* */ in JSON files.
function parseJsonWithComments(raw: string): any {
  let s = raw.replace(/\/\*[\s\S]*?\*\//g, ""); // remove /* block */ comments
  s = s.replace(/(^|\s)\/\/.*$/gm, ""); // remove // line comments (line-wise)
  return JSON.parse(s);
}

function isTimeseriesHeader(h: Header | null | undefined): h is Header {
  if (!h || typeof h !== "object") return false;
  const s = h.$schema;
  if (typeof s !== "string") return false;
  return TS_SCHEMA_MATCHERS.some((m) => s.includes(m));
}

// Map absolute file path under src/data/** to a web path, defaulting to "/data/..."
function toWebPath(abs: string): string {
  const marker = `${path.sep}src${path.sep}data${path.sep}`;
  const i = abs.lastIndexOf(marker);
  if (i >= 0) {
    const tail = abs
      .slice(i + `${path.sep}src${path.sep}`.length)
      .split(path.sep)
      .join("/");
    // tail starts with "data/..."
    return "/" + tail; // "/data/..."
  }
  // Fallback—shouldn't happen in this repo.
  return "/data/" + path.basename(abs);
}

function toArray(v: unknown): string[] | null {
  if (typeof v === "string") return [v];
  if (Array.isArray(v) && v.every((x) => typeof x === "string"))
    return v as string[];
  return null;
}

async function main() {
  if (!(await isDir(DATA_DIR))) {
    logError(`Not found: ${DATA_DIR}`);
    process.exit(1);
  }

  const byPathway: TimeseriesIndex["byPathway"] = {};
  const byDataset: TimeseriesIndex["byDataset"] = {};

  const invalidTimeseries: string[] = [];
  const debugParseErrors: string[] = [];
  const debugNonTimeseries: string[] = [];

  for await (const file of walk(DATA_DIR)) {
    let parsed: Header | null = null;

    // Silently skip JSON we can't parse; optionally record debug info.
    try {
      const raw = await fs.readFile(file, "utf8");
      parsed = parseJsonWithComments(raw) as Header;
    } catch (e: any) {
      if (DEBUG)
        debugParseErrors.push(
          `${path.relative(ROOT, file)} :: ${e?.message ?? "parse error"}`,
        );
      continue;
    }

    if (!isTimeseriesHeader(parsed)) {
      if (DEBUG) debugNonTimeseries.push(path.relative(ROOT, file));
      continue; // not a timeseries → skip silently (or debug-log)
    }

    // ---- Normalize keys per your BAS file shape ----
    const datasetId = (parsed.datasetId ?? parsed.id) as string | undefined;

    // pathwayIDs: prefer singular key "pathwayID", else fallback to other common keys.
    let pids: string[] | null =
      toArray(parsed.pathwayID) ??
      (Array.isArray(parsed.pathwayIds)
        ? parsed.pathwayIds
        : toArray(parsed.pathwayId));

    if (!datasetId || !pids || pids.length === 0) {
      invalidTimeseries.push(path.relative(ROOT, file));
      continue; // skip malformed timeseries; strict mode may fail later
    }

    // Normalize label/path
    const label = (parsed.label ?? parsed.name) as string | undefined;
    const webPath = toWebPath(file);

    // ---------- Compute lightweight summary ----------
    // We avoid heavy work; single pass over data if it exists.
    const rawData: unknown = (parsed as any)?.data;
    let computed: Record<string, unknown> = {};
    if (Array.isArray(rawData) && rawData.length > 0) {
      let minYear: number | undefined;
      let maxYear: number | undefined;
      let rowCount = 0;
      const sectors = new Set<string>();
      const geos = new Set<string>();
      const metrics = new Set<string>();

      for (const row of rawData as any[]) {
        rowCount++;
        // Year from explicit 'year' or from 'date'
        const y =
          typeof row?.year === "number"
            ? row.year
            : row?.date
              ? new Date(row.date).getUTCFullYear()
              : undefined;
        if (typeof y === "number" && Number.isFinite(y)) {
          if (minYear === undefined || y < minYear) minYear = y;
          if (maxYear === undefined || y > maxYear) maxYear = y;
        }
        // Unique sectors
        if (typeof row?.sector === "string" && row.sector)
          sectors.add(row.sector);
        // Unique geographies (prefer 'geography', fallback 'region')
        const g =
          typeof row?.geography === "string"
            ? row.geography
            : typeof row?.region === "string"
              ? row.region
              : undefined;
        if (g) geos.add(g);
        // Unique metrics
        if (typeof row?.metric === "string" && row.metric)
          metrics.add(row.metric);
      }

      if (rowCount > 0) computed.rowCount = rowCount;
      if (minYear !== undefined && maxYear !== undefined) {
        computed.yearRange = [minYear, maxYear];
      }
      if (sectors.size > 0) {
        computed.sectorCount = sectors.size;
        computed.sectors = [...sectors].sort();
      }
      if (geos.size > 0) {
        computed.geographyCount = geos.size;
        computed.geographies = [...geos].sort();
      }
      if (metrics.size > 0) computed.metrics = [...metrics].sort();
    }

    // Merge with any author-provided summary in the file (computed wins on conflicts)
    const userSummary =
      parsed.summary && typeof parsed.summary === "object"
        ? (parsed.summary as Record<string, unknown>)
        : {};
    const summary = { ...userSummary, ...computed };

    const item: IndexItem = { datasetId, label, summary, path: webPath };

    // byDataset (datasetId should be unique; last one wins deterministically by traversal)
    byDataset[datasetId] = {
      datasetId,
      pathwayIds: [...new Set(pids)].sort(),
      label,
      summary,
      path: webPath,
    };

    // byPathway
    for (const pid of pids) {
      if (!byPathway[pid]) byPathway[pid] = [];
      byPathway[pid].push(item);
    }
  }

  // Deterministic ordering
  for (const pid of Object.keys(byPathway)) {
    byPathway[pid].sort((a, b) => a.datasetId.localeCompare(b.datasetId));
  }

  const out: TimeseriesIndex = {
    byPathway,
    byDataset,
  };

  // -------------------------------
  // Copy dataset files to public/ and rewrite paths to /data/...
  // -------------------------------
  // Build reverse index so we can rewrite all occurrences in byPathway
  const itemsByDatasetId: Record<
    string,
    { arr: Array<{ path: string }>; idx: number }[]
  > = {};
  for (const [, arr] of Object.entries(out.byPathway)) {
    arr.forEach((item, idx) => {
      const key = item.datasetId;
      if (!itemsByDatasetId[key]) itemsByDatasetId[key] = [];
      itemsByDatasetId[key].push({ arr, idx });
    });
  }

  const PUBLIC_DATA_DIR = path.join(ROOT, "public", "data");
  await fs.mkdir(PUBLIC_DATA_DIR, { recursive: true });

  function jsonToCsv(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) return "";
    // Merge metadata into each row
    const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
    const escape = (v: any) =>
      typeof v === "string"
        ? `"${v.replace(/"/g, '""')}"`
        : v === null || v === undefined
          ? ""
          : String(v);
    const header = keys.join(",");
    const rows = data.map((row) => keys.map((k) => escape(row[k])).join(","));
    return [header, ...rows].join("\n");
  }

  for (const [dsId, ds] of Object.entries(out.byDataset)) {
    logDebug(`Processing datasetId: ${dsId}`);
    // ds.path currently looks like "/data/…file.json" (derived from src earlier).
    // Convert to an absolute src path:
    const srcAbs = path.join(ROOT, "src", ds.path.replace(/^\//, "")); // -> "<root>/src/data/.../file.json"
    // Preserve subfolders under data/
    const relUnderData = ds.path.replace(/^\/?data\/?/, ""); // "foo/bar.json"
    const destAbsJson = path.join(PUBLIC_DATA_DIR, relUnderData); // "<root>/public/data/foo/bar.json"
    await fs.mkdir(path.dirname(destAbsJson), { recursive: true });
    try {
      await fs.copyFile(srcAbs, destAbsJson);

      // --- CSV conversion ---
      const raw = await fs.readFile(srcAbs, "utf8");
      const parsed = parseJsonWithComments(raw);

      const getRowMetadata = (
        sectorRaw: string,
        metricRaw: string,
        technologyRaw: string,
      ): object => {
        // Normalize keys; treat null / "null" / empty as "no key"
        const sector = sectorRaw?.trim();
        const metric =
          metricRaw && metricRaw !== "null" ? metricRaw.trim() : "";
        const technology =
          technologyRaw && technologyRaw !== "null" ? technologyRaw.trim() : "";

        logDebug(
          `  getRowMetadata: sector=${sector}, metric=${metric}, technology=${technology}`,
        );

        const pub = parsed.publication;
        // License (optional)
        const licensePart = pub.license ? `License: ${pub.license}` : "";
        // Links (optional array)
        const linksPart =
          Array.isArray(pub.links) && pub.links.length > 0
            ? pub.links.map((l) => `${l.description}: ${l.url}`).join(", ")
            : "";
        // Collect optional parentheses content
        const optionalParts = [licensePart, linksPart]
          .filter(Boolean)
          .join(", ");
        const optionalBlock = optionalParts ? ` (${optionalParts})` : "";
        // Final string
        const source = `${pub.publisher.short}, ${pub.year}, ${pub.title.full}${optionalBlock}`;

        // Look up definitions from centralized taxonomy.
        // These WILL throw if unknown, which is what we want in strict mode.
        const sectorDef = getSectorDefinition(sector);

        const metricDef = metric
          ? getMetricDefinition(sectorDef.key, metric)
          : undefined;

        const techDef = technology
          ? getTechnologyDefinition(sectorDef.key, technology)
          : undefined;

        const outRaw = {
          publisher: parsed.publication.publisher.short,
          publicationName: parsed.publication.title.full,
          publicationYear: parsed.publication.year,
          pathwayName: parsed.pathwayName,
          source,
          sector: sectorDef.displayName,
          emissionsScope: parsed.emissionsScope,
          sectorScope: metricDef?.sectorScope ?? "",
          metric: metricDef?.displayName ?? "",
          definitionMetric: metricDef?.definition ?? "",
          technology: techDef?.displayName ?? "",
          definitionTechnology: techDef?.definition ?? "",
        };

        // First sanitize whitespace
        const sanitized = sanitizeStrings(outRaw);

        // Then remove empty-string / undefined / null fields
        const cleaned = Object.fromEntries(
          Object.entries(sanitized).filter(([_, v]) => {
            if (v === null || v === undefined) return false;
            if (typeof v === "string" && v.trim() === "") return false;
            return true;
          }),
        );

        logDebug(`    returning metadata: ${JSON.stringify(cleaned)}`);
        return cleaned;
      };

      logDebug(
        `  parsed.data has ${Array.isArray(parsed.data) ? parsed.data.length : 0} rows.`,
      );

      // Build “export-ready” rows by mapping parsed.data
      const exportRows =
        Array.isArray(parsed.data) && parsed.data.length > 0
          ? parsed.data.map((rowRaw) => {
              logDebug(`    Processing row: ${JSON.stringify(rowRaw)}`);
              const row = rowRaw as Record<string, unknown>;
              const sector = String(row.sector ?? "");
              const metric =
                row.metric === null || row.metric === undefined
                  ? ""
                  : String(row.metric);
              const technology =
                row.technology === null || row.technology === undefined
                  ? ""
                  : String(row.technology);

              const rowMetadata = getRowMetadata(sector, metric, technology);

              const out = {
                publisher: rowMetadata.publisher,
                publication_name: rowMetadata.publicationName,
                publication_year: rowMetadata.publicationYear,
                pathway_name: rowMetadata.pathwayName,
                year: row.year,
                geography: row.geography,
                sector: rowMetadata.sector,
                technology: rowMetadata.technology,
                metric: rowMetadata.metric,
                value: row.value,
                unit: row.unit,
                source: rowMetadata.source,
                emissions_scope: rowMetadata.emissionsScope,
                sector_scope: rowMetadata.sectorScope,
                definition_technology: rowMetadata.definitionTechnology,
                definition_metric: rowMetadata.definitionMetric,
              };
              logDebug(`    Export row: ${JSON.stringify(out)}`);
              return out;
            })
          : [];

      logDebug(`  Preparing to export ${exportRows.length} rows to CSV.`);

      const csvData = exportRows.length > 0 ? jsonToCsv(exportRows) : "";
      const destAbsCsv = destAbsJson.replace(/\.json$/i, ".csv");
      await fs.writeFile(destAbsCsv, csvData, "utf8");
      const publicUrl = `/data/${relUnderData.replace(/\.json$/i, ".csv")}`;
      logDebug(`  Generated CSV: ${publicUrl}`);

      // Rewrite in byDataset
      ds.path = publicUrl;
      // Rewrite all appearances in byPathway
      const slots = itemsByDatasetId[dsId] ?? [];
      for (const slot of slots) {
        slot.arr[slot.idx].path = publicUrl;
      }
    } catch (err) {
      console.error("Error copying or processing file:", srcAbs, err);
      if (err instanceof UnknownTaxonomyError) {
        // Fatal error — unknown metric/technology, fail build
        process.exit(1);
      }
      // If copy fails, leave original path (SWA won't find it, but we don't crash the build).
      if (DEBUG) logDebug("copyFile or CSV failed (skipping):", srcAbs);
    }
  }
  logInfo(
    `Copied dataset files to ${path.relative(ROOT, PUBLIC_DATA_DIR)} and generated CSVs.`,
  );
  // -------------------------------
  // Emit TS module for build-time import + JSON for inspection/fetch
  // -------------------------------
  const GEN_TS = path.join(ROOT, "src", "data", "index.gen.ts");
  const banner =
    "/* AUTO-GENERATED FILE. DO NOT EDIT.\n   Created by scripts/build-timeseries-index.ts */\n";
  const tsExport =
    banner +
    `export type TimeseriesIndexItem = { datasetId: string; label?: string; path: string; summary?: unknown };
  export type TimeseriesIndex = {
    byPathway: Record<string, TimeseriesIndexItem[]>;
    byDataset: Record<string, { datasetId: string; pathwayIds: string[]; label?: string; path: string; summary?: unknown }>;
  };
  export const index: TimeseriesIndex = ${JSON.stringify(out, null, 2)} as const;
  export default index;
  `;
  await fs.writeFile(GEN_TS, tsExport, "utf8");
  logInfo(`Wrote ${path.relative(ROOT, GEN_TS)}.`);

  const PUBLIC_INDEX = path.join(PUBLIC_DATA_DIR, "index.json");
  await fs.writeFile(PUBLIC_INDEX, JSON.stringify(out, null, 2) + "\n", "utf8");
  logInfo(`Wrote ${path.relative(ROOT, PUBLIC_INDEX)}`);

  if (DEBUG) {
    if (debugParseErrors.length) {
      logDebug(`Parse-skipped files (${debugParseErrors.length}):`);
      for (const m of debugParseErrors) logDebug("  -", m);
    }
    if (debugNonTimeseries.length) {
      logDebug(`Non-timeseries JSON skipped (${debugNonTimeseries.length}):`);
      for (const f of debugNonTimeseries) logDebug("  -", f);
    }
  }

  if (invalidTimeseries.length) {
    const sample = invalidTimeseries.slice(0, 5);
    logWarn(
      `Skipped ${invalidTimeseries.length} invalid timeseries (missing datasetId/id or pathwayID). Example(s): ${sample.join(
        ", ",
      )}`,
    );
    if (STRICT) {
      logError("STRICT mode: failing due to invalid timeseries.");
      process.exit(1);
    }
  }
}

main().catch((e) => {
  logError("Fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
