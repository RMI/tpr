import { describe, it, expect } from "vitest";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  commitWrites,
  planImport,
  type Corpus,
  type WriteFs,
} from "./import-benchmark-data.ts";
import { Report } from "./import-pathway-data.ts";
import type { PathwayMetadataV2 } from "../src/types/pathwayMetadata.v2.d.ts";
// A real publication block: publishers are a closed list in the schema.
import ieaSteps from "../src/data/iea/IEA-STEPS-2024_timeseries.json" with { type: "json" };

const V2 = "http://pathways.rmi.org/schema/pathwayTimeseries.v2.json";

const row = (over: Record<string, unknown> = {}) => ({
  year: 2030,
  geography: "Southeast Asia",
  sector: "power",
  sectorSegment: ["Power generation"],
  technology: null,
  metric: "capacity",
  value: 1,
  unit: "GW",
  ...over,
});

const file = (over: Record<string, unknown> = {}, rows = [row()]) => ({
  $schema: V2,
  id: "IEA-X_timeseries",
  pathwayId: ["IEA-X"],
  name: "IEA X Timeseries Data",
  description: "A test series.",
  publication: ieaSteps.publication,
  pathwayName: "X",
  emissionsScope: "CO2",
  data: rows,
  ...over,
});

const corpus = (existing = false): Corpus => ({
  metadataGeographyById: new Map<string, PathwayMetadataV2["geography"]>([
    ["IEA-X", { global: true, regions: { "Southeast Asia": ["TH", "VN"] } }],
  ]),
  metadataPathById: new Map([["IEA-X", "src/data/iea/IEA-X.json"]]),
  occupiedPaths: new Set([
    "src/data/iea/IEA-X.json",
    ...(existing
      ? [
          "src/data/iea/X-legacy-name_timeseries.json",
          "src/data/iea/OTHER.json",
        ]
      : []),
  ]),
  timeseriesById: new Map(
    existing
      ? [
          [
            "IEA-X_timeseries",
            { path: "src/data/iea/X-legacy-name_timeseries.json", doc: {} },
          ],
          ["OTHER_timeseries", { path: "src/data/iea/OTHER.json", doc: {} }],
        ]
      : [],
  ),
});

const plan = (inputs: unknown[], c = corpus()) => {
  const report = new Report();
  const writes = planImport(
    inputs.map((data, i) => ({ name: `in/${i}.json`, data })),
    c,
    report,
  );
  return { writes, report };
};

describe("planImport", () => {
  it("places a new file next to its pathway's metadata", () => {
    const { writes, report } = plan([file()]);
    expect(report.errors).toEqual([]);
    expect(writes.map((w) => [w.path, w.replaces])).toEqual([
      ["src/data/iea/IEA-X_timeseries.json", false],
    ]);
  });

  it("overwrites an existing file in place, keeping its name", () => {
    const { writes, report } = plan([file()], corpus(true));
    expect(writes.map((w) => w.path)).toEqual([
      "src/data/iea/X-legacy-name_timeseries.json",
    ]);
    // ...and says which existing files the import leaves alone.
    expect(report.lines.join("\n")).toContain("left as they are: OTHER.json");
  });

  it("never lets a new id land on an existing file with another id", () => {
    // ACE's real shape: the file name drops the id's prefix, so an input whose
    // id happens to equal that name is new by id but not by path.
    const { writes, report } = plan(
      [file({ id: "X-legacy-name_timeseries" })],
      corpus(true),
    );
    expect(report.errors.join("\n")).toMatch(
      /X-legacy-name_timeseries\.json is already taken/,
    );
    expect(writes).toEqual([]);
  });

  it("treats a path differing only by case as taken", () => {
    // On default macOS and Windows file systems these are one file.
    const { writes, report } = plan([file({ id: "iea-x" })]);
    expect(report.errors.join("\n")).toMatch(
      /src\/data\/iea\/iea-x\.json is already taken/,
    );
    expect(writes).toEqual([]);
  });

  it("reports a taken destination in the same run as the file's other errors", () => {
    const { report } = plan(
      [
        file({ id: "X-legacy-name_timeseries" }, [
          row({ geography: "Atlantis" }),
        ]),
      ],
      corpus(true),
    );
    const errors = report.errors.join("\n");
    expect(errors).toMatch(/"Atlantis" is not a geography/);
    expect(errors).toMatch(/is already taken/);
  });

  it.each([
    [
      "an undeclared geography",
      [row({ geography: "South East Asia" })],
      /not a geography pathway IEA-X declares/,
    ],
    [
      "a segment of another sector",
      [row({ sectorSegment: ["Ironmaking"] })],
      /not a segment of Power/,
    ],
    [
      "a sentinel segment",
      [row({ sectorSegment: ["Unspecified"] })],
      /is not allowed/,
    ],
    [
      "a v1-shaped row with no sectorSegment",
      [{ ...row(), sectorSegment: undefined }],
      /sectorSegment/,
    ],
  ])("blocks the import on %s", (_, rows, message) => {
    const { writes, report } = plan([file({}, rows)]);
    expect(report.errors.join("\n")).toMatch(message);
    expect(writes).toEqual([]);
  });

  it("blocks a file whose pathway has no metadata", () => {
    const { report } = plan([file({ pathwayId: ["GONE"] })]);
    expect(report.errors.join("\n")).toMatch(
      /"GONE" is not the id of any pathway/,
    );
  });

  it("blocks a file still on the v1 schema", () => {
    const { report } = plan([
      file({
        $schema: "http://pathways.rmi.org/schema/pathwayTimeseries.v1.json",
      }),
    ]);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it("blocks two input files with the same id, and still checks the second", () => {
    // One run should list every problem, so the duplicate's own errors are
    // reported alongside the duplicate id.
    const { writes, report } = plan([
      file(),
      file({}, [row({ geography: "Atlantis" })]),
    ]);
    const errors = report.errors.join("\n");
    expect(errors).toMatch(/also used by in\/0\.json/);
    expect(errors).toMatch(/"Atlantis" is not a geography/);
    expect(writes.map((w) => w.path)).toEqual([
      "src/data/iea/IEA-X_timeseries.json",
    ]);
  });

  it.each(["../escape", "iea/nested", ".hidden"])(
    "blocks an id that is not a safe file name: %s",
    (id) => {
      const { writes, report } = plan([file({ id })]);
      expect(report.errors.join("\n")).toMatch(/cannot be used as a file name/);
      expect(writes).toEqual([]);
    },
  );
});

describe("commitWrites", () => {
  /** An in-memory file system whose writes fail for chosen paths. */
  const memoryFs = (files: Record<string, string>, failOn: string[] = []) => {
    const failing = new Set(failOn); // each fails once; the restore succeeds
    const io: WriteFs = {
      readFile: async (path) => files[path] ?? null,
      writeFile: async (path, text) => {
        if (failing.delete(path)) {
          // Like ENOSPC: the file is truncated before the write gives up.
          files[path] = text.slice(0, 3);
          throw new Error(`disk full at ${path}`);
        }
        files[path] = text;
      },
      removeFile: async (path) => {
        delete files[path];
      },
    };
    return { files, io };
  };

  it("writes every staged file", async () => {
    const { files, io } = memoryFs({ a: "old a" });
    await commitWrites(
      [
        { path: "a", text: "new a" },
        { path: "b", text: "new b" },
      ],
      io,
    );
    expect(files).toEqual({ a: "new a", b: "new b" });
  });

  it("restores earlier files and removes new ones when a later write fails", async () => {
    const { files, io } = memoryFs({ a: "old a", c: "old c" }, ["c"]);
    await expect(
      commitWrites(
        [
          { path: "a", text: "new a" },
          { path: "b", text: "new b" },
          { path: "c", text: "new c" },
        ],
        io,
      ),
    ).rejects.toThrow(/the 3 file\(s\) touched were restored/);
    // c included: its failed write had already truncated it.
    expect(files).toEqual({ a: "old a", c: "old c" });
  });

  it("restores the file whose own write failed, even when it is the first", async () => {
    const { files, io } = memoryFs({ a: "old a" }, ["a"]);
    await expect(
      commitWrites([{ path: "a", text: "new a" }], io),
    ).rejects.toThrow();
    expect(files).toEqual({ a: "old a" });
  });

  it("writes nothing when an existing file cannot be backed up", async () => {
    const { files, io } = memoryFs({ a: "old a" });
    io.readFile = async (path) => {
      if (path === "b") throw new Error("permission denied");
      return files[path] ?? null;
    };
    await expect(
      commitWrites(
        [
          { path: "a", text: "new a" },
          { path: "b", text: "new b" },
        ],
        io,
      ),
    ).rejects.toThrow(/permission denied/);
    expect(files).toEqual({ a: "old a" });
  });

  it("does not delete an existing file it could not back up", async () => {
    // A write-only file exists but cannot be read (EACCES). Counting that as
    // "new" would make a rollback delete it; it must abort before writing.
    const dir = await mkdtemp(join(tmpdir(), "import-benchmark-"));
    const locked = join(dir, "locked.json");
    try {
      await writeFile(locked, "old");
      await chmod(locked, 0o222);
      await expect(
        commitWrites([
          { path: locked, text: "new" },
          // Missing on read (so "new"), and its write fails: no such folder.
          { path: join(dir, "no-such-folder", "x.json"), text: "{}" },
        ]),
      ).rejects.toThrow(/EACCES/);
      await chmod(locked, 0o644);
      expect(await readFile(locked, "utf8")).toBe("old");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
