// @vitest-environment node
//
// pathwayMetadata.ts leaves timeseries out of its eager glob by file name
// (`!./**/*_timeseries.json`), while scripts/build-timeseries-files.ts finds
// timeseries by `$schema`. Keep the two in agreement: a timeseries file
// without the suffix would be inlined into the main JS chunk again (#1104), and
// a metadata file with it would silently disappear from the app.
//
// Reads the files with fs rather than importing pathwayMetadata.ts, which
// loads every data file and can run a test worker out of memory.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const DATA_DIR = join(process.cwd(), "src", "data");
const TIMESERIES_SCHEMA = "pathwayTimeseries.v2.json";
const TIMESERIES_SUFFIX = "_timeseries.json";

function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return jsonFiles(full);
    return e.isFile() && e.name.endsWith(".json") ? [full] : [];
  });
}

describe("src/data timeseries naming", () => {
  const files = jsonFiles(DATA_DIR);

  it("finds data files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("names a file *_timeseries.json exactly when its $schema is the timeseries schema", () => {
    const mismatched = files.flatMap((file) => {
      const data: unknown = JSON.parse(readFileSync(file, "utf8"));
      const schema =
        data && typeof data === "object" && "$schema" in data
          ? String(data.$schema)
          : "";
      const isTimeseries = schema.includes(TIMESERIES_SCHEMA);
      const hasSuffix = file.endsWith(TIMESERIES_SUFFIX);
      return isTimeseries === hasSuffix
        ? []
        : [
            `${relative(DATA_DIR, file)} (${
              isTimeseries ? "timeseries without" : "non-timeseries with"
            } the ${TIMESERIES_SUFFIX} suffix)`,
          ];
    });
    expect(mismatched).toEqual([]);
  });
});
