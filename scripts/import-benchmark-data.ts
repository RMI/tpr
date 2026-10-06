/**
 * Import benchmark timeseries prepared by RMI/tpr_benchmark_data_preparation
 * into src/data (#915, #902).
 *
 * Usage:
 *   npx ts-node --esm scripts/import-benchmark-data.ts --in <dir> [--dry-run]
 *
 * `<dir>` holds the prep repo's output: one JSON file per timeseries dataset,
 * already in `pathwayTimeseries.v2.json` format. This script does not convert
 * anything. It is the gate between the two repos: every file must pass the v2
 * schema and the cross-file checks in src/utils/validateTimeseries.ts (geography
 * declared by the pathway's metadata, segments belonging to the row's sector)
 * against the metadata already in src/data.
 *
 * Where each file goes:
 *   - an existing src/data timeseries with the same `id` is overwritten in
 *     place, keeping its file name (some, like ACE's ATS-2024_timeseries.json,
 *     do not follow the id);
 *   - otherwise a new `<id>.json` is written next to the metadata of the
 *     file's first pathway (ids already end in `_timeseries`).
 * Existing timeseries absent from the input are reported, never deleted.
 *
 * Like import-pathway-data.ts, any error blocks the whole import: nothing is
 * written, every error is listed, and the run exits 1. A half-imported data
 * set is worse than none. With --dry-run it reports and writes nothing either
 * way, which is how the prep repo can check its output against TPR's contract.
 */
import { promises as fs } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { Report } from "./import-pathway-data.ts";
import { validateFilesBySchema } from "../src/utils/validateData.ts";
import {
  PATHWAY_TIMESERIES_V2_ID,
  validateTimeseries,
  type MetadataGeographyById,
} from "../src/utils/validateTimeseries.ts";
import { PATHWAY_METADATA_V2_ID } from "../src/utils/validateScopes.ts";
import pathwayMetadataV1Schema from "../src/schema/pathwayMetadata.v1.json" with { type: "json" };
import pathwayMetadataV2Schema from "../src/schema/pathwayMetadata.v2.json" with { type: "json" };
import pathwayTimeseriesV2Schema from "../src/schema/pathwayTimeseries.v2.json" with { type: "json" };
import { commonSchemas } from "../src/schema/common/index.ts";
import type { PathwayMetadataV2 } from "../src/types/pathwayMetadata.v2.d.ts";
import type { PathwayTimeseriesV2 } from "../src/types/pathwayTimeseries.v2.d.ts";

const DATA_DIR = "src/data";
const METADATA_IDS = new Set([
  String(pathwayMetadataV1Schema.$id),
  PATHWAY_METADATA_V2_ID,
]);
const TIMESERIES_ID_PATTERN = /pathwayTimeseries\.v\d+\.json$/;
const SAFE_FILE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

type Json = Record<string, unknown>;

/** What src/data already holds, as far as an import needs to know. */
export interface Corpus {
  /** Each pathway's declared geography, by pathway id. */
  metadataGeographyById: MetadataGeographyById;
  /** Where each pathway's metadata file lives, by pathway id. */
  metadataPathById: ReadonlyMap<string, string>;
  /** Existing timeseries files, by dataset `id`. */
  timeseriesById: ReadonlyMap<string, { path: string; doc: Json }>;
  /**
   * Every file path under src/data. A new file must not land on one: file
   * names do not always follow ids (ACE's `ATS-2024_timeseries.json` holds
   * `ACE-ATS-2024_timeseries`), so a free path cannot be inferred from ids.
   */
  occupiedPaths: ReadonlySet<string>;
}

export interface InputFile {
  name: string;
  data: unknown;
}

export interface PlannedWrite {
  path: string;
  doc: PathwayTimeseriesV2;
  replaces: boolean;
}

const distinct = (values: Iterable<string>) => [...new Set(values)].sort();

function describe(doc: { data?: unknown }): string {
  const rows = Array.isArray(doc.data) ? (doc.data as Json[]) : [];
  const geographies = distinct(rows.map((r) => String(r.geography)));
  const segments = distinct(
    rows.flatMap((r) =>
      Array.isArray(r.sectorSegment) ? (r.sectorSegment as string[]) : [],
    ),
  );
  return (
    `${rows.length} rows; geography ${geographies.join(", ") || "-"}` +
    (segments.length ? `; segments ${segments.join(", ")}` : "")
  );
}

/**
 * Validate the input files and decide where each goes. Pure apart from the
 * report: errors are recorded there, and the caller writes only when there
 * are none.
 */
export function planImport(
  inputs: readonly InputFile[],
  corpus: Corpus,
  report: Report,
): PlannedWrite[] {
  const { valid, invalid } = validateFilesBySchema(
    [...inputs],
    [
      pathwayMetadataV1Schema,
      pathwayMetadataV2Schema,
      pathwayTimeseriesV2Schema,
      ...commonSchemas,
    ],
  );
  for (const problem of invalid)
    for (const e of problem.errors) report.error(`${problem.name}: ${e}`);

  const planned: PlannedWrite[] = [];
  const plannedPaths = new Set<string>();
  const seenIds = new Map<string, string>();
  for (const record of valid) {
    if (record.schemaId !== PATHWAY_TIMESERIES_V2_ID) {
      report.error(
        `${record.name}: $schema is ${record.schemaId}, expected ${PATHWAY_TIMESERIES_V2_ID}`,
      );
      continue;
    }
    const doc = record.data as PathwayTimeseriesV2;
    // Every check runs before the file is skipped, so one run lists every
    // problem rather than the first one found.
    const problems = validateTimeseries(doc, corpus.metadataGeographyById);
    const earlier = seenIds.get(doc.id);
    if (earlier) problems.push(`id "${doc.id}" is also used by ${earlier}`);
    else seenIds.set(doc.id, record.name);
    // A new file is named after its id, so the id must not be able to point
    // anywhere else (no "/" or a leading ".").
    if (!SAFE_FILE_ID.test(doc.id))
      problems.push(
        `id "${doc.id}" cannot be used as a file name: use letters, digits, ".", "_" and "-", starting with a letter or digit`,
      );
    for (const e of problems) report.error(`${record.name}: ${e}`);
    if (problems.length > 0) continue;

    const existing = corpus.timeseriesById.get(doc.id);
    if (existing) {
      planned.push({ path: existing.path, doc, replaces: true });
      report.note(
        `UPD  ${existing.path}: ${describe(existing.doc)} -> ${describe(doc)}`,
      );
    } else {
      const metadataPath = corpus.metadataPathById.get(doc.pathwayId[0]);
      // Unreachable after validateTimeseries, which rejects unknown pathway
      // ids; an error rather than a guessed location if that ever changes.
      if (metadataPath === undefined) {
        report.error(
          `${record.name}: no metadata file for ${doc.pathwayId[0]}`,
        );
        continue;
      }
      const path = join(dirname(metadataPath), `${doc.id}.json`);
      if (corpus.occupiedPaths.has(path) || plannedPaths.has(path)) {
        report.error(
          `${record.name}: id "${doc.id}" is new, but ${path} already holds another file; ` +
            "an update must use the existing file's id",
        );
        continue;
      }
      plannedPaths.add(path);
      planned.push({ path, doc, replaces: false });
      report.note(`NEW  ${path}: ${describe(doc)}`);
    }
  }

  const imported = new Set(seenIds.keys());
  const untouched = [...corpus.timeseriesById]
    .filter(([id]) => !imported.has(id))
    .map(([, { path }]) => basename(path));
  if (untouched.length)
    report.note(
      `Not in this import, left as they are: ${untouched.sort().join(", ")}`,
    );
  return planned;
}

/** The file operations {@link commitWrites} needs; injectable for tests. */
export interface WriteFs {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, text: string): Promise<void>;
  removeFile(path: string): Promise<void>;
}

const nodeFs: WriteFs = {
  readFile: async (path) => {
    try {
      return await fs.readFile(path, "utf8");
    } catch (error) {
      // Only a missing file is "new". Any other failure (an unreadable but
      // writable file, say) must stop the import: without a backup, a
      // rollback would delete the file instead of restoring it.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  },
  writeFile: (path, text) => fs.writeFile(path, text),
  removeFile: (path) => fs.rm(path, { force: true }),
};

/**
 * Write every staged file, or none: if any write fails, every file touched so
 * far — including the one whose write failed, which may already be truncated
 * — is restored to what it held before (or removed, if new), and the error is
 * rethrown. This is what makes the import's all-or-nothing promise hold past
 * validation, through to the disk. A restore that itself fails does not stop
 * the others; the error names the files left as they are.
 */
export async function commitWrites(
  staged: readonly { path: string; text: string }[],
  io: WriteFs = nodeFs,
): Promise<void> {
  // Read every backup before writing anything; a read failure aborts here,
  // with nothing touched yet.
  const originals = await Promise.all(
    staged.map(async ({ path }) => ({ path, text: await io.readFile(path) })),
  );
  const touched: number[] = [];
  try {
    for (const [i, { path, text }] of staged.entries()) {
      touched.push(i); // before the write: a failed write may still have changed the file
      await io.writeFile(path, text);
    }
  } catch (error) {
    const unrestored: string[] = [];
    for (const i of touched.reverse()) {
      const { path, text } = originals[i];
      try {
        if (text === null) await io.removeFile(path);
        else await io.writeFile(path, text);
      } catch {
        unrestored.push(path);
      }
    }
    const outcome = unrestored.length
      ? `could NOT restore ${unrestored.join(", ")}; check them with git`
      : `the ${touched.length} file(s) touched were restored`;
    throw new Error(`writing failed, and ${outcome}: ${String(error)}`);
  }
}

async function jsonFilesUnder(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const d of await fs.readdir(dir, { withFileTypes: true })) {
    const full = join(dir, d.name);
    if (d.isDirectory()) out.push(...(await jsonFilesUnder(full)));
    else if (d.name.endsWith(".json")) out.push(full);
  }
  return out;
}

/** Read src/data into the shape {@link planImport} needs. */
export async function readCorpus(dir = DATA_DIR): Promise<Corpus> {
  const metadataGeographyById = new Map<
    string,
    PathwayMetadataV2["geography"]
  >();
  const metadataPathById = new Map<string, string>();
  const timeseriesById = new Map<string, { path: string; doc: Json }>();
  const occupiedPaths = new Set<string>();
  for (const path of await jsonFilesUnder(dir)) {
    occupiedPaths.add(path);
    let doc: Json;
    try {
      doc = JSON.parse(await fs.readFile(path, "utf8")) as Json;
    } catch {
      continue; // not a data document; schema:check reports it
    }
    const schema = String(doc.$schema ?? "");
    if (METADATA_IDS.has(schema)) {
      metadataGeographyById.set(
        String(doc.id),
        doc.geography as PathwayMetadataV2["geography"],
      );
      metadataPathById.set(String(doc.id), path);
    } else if (TIMESERIES_ID_PATTERN.test(schema)) {
      timeseriesById.set(String(doc.id), { path, doc });
    }
  }
  return {
    metadataGeographyById,
    metadataPathById,
    timeseriesById,
    occupiedPaths,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inAt = args.indexOf("--in");
  const inDir = inAt >= 0 ? args[inAt + 1] : undefined;
  if (!inDir) {
    console.error("Usage: import-benchmark-data.ts --in <dir> [--dry-run]");
    process.exit(2);
  }

  const report = new Report();
  const inputs: InputFile[] = [];
  for (const path of await jsonFilesUnder(inDir)) {
    try {
      inputs.push({
        name: path,
        data: JSON.parse(await fs.readFile(path, "utf8")),
      });
    } catch (e) {
      report.error(`${path}: not valid JSON (${String(e)})`);
    }
  }
  report.section(`Import of ${inputs.length} file(s) from ${inDir}`);
  const planned = planImport(inputs, await readCorpus(), report);

  console.info(report.lines.join("\n"));
  if (report.errors.length > 0) {
    console.error(
      `\n## ${report.errors.length} error(s) -- nothing written\n` +
        "Fix these in the prepared data and re-run the import:\n" +
        report.errors.map((e) => `  - ${e}`).join("\n"),
    );
    process.exitCode = 1;
    return;
  }
  if (dryRun) {
    console.info(`\nDry run: ${planned.length} file(s) would be written.`);
    return;
  }
  // Format everything before touching any file, so a formatting failure
  // cannot leave a half-written import behind.
  const staged = await Promise.all(
    planned.map(async ({ path, doc }) => {
      const options = (await prettier.resolveConfig(path)) ?? {};
      const text = await prettier.format(JSON.stringify(doc, null, 2), {
        ...options,
        parser: "json",
      });
      return { path, text };
    }),
  );
  await commitWrites(staged);
  console.info(
    `\nWrote ${planned.length} file(s). Run \`npm run build:timeseries\` and \`npm run schema:check\` next.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e: unknown) => {
    console.error(String(e instanceof Error ? e.stack : e));
    process.exit(1);
  });
}
