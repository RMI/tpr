import { describe, it, expect } from "vitest";
import { planImport, type Corpus } from "./import-benchmark-data.ts";
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

  it("blocks two input files with the same id", () => {
    const { report } = plan([file(), file()]);
    expect(report.errors.join("\n")).toMatch(/also used by in\/0\.json/);
  });
});
