import { describe, it, expect } from "vitest";
import { plottedSegments } from "./timeseriesSegments";

const POWER = { key: "power", displayName: "Power" };

const row = (geography: string, metric: string, sectorSegment: string[]) => ({
  sector: "power",
  geography,
  metric,
  sectorSegment,
});

describe("plottedSegments", () => {
  it("counts only the rows the panel draws", () => {
    const rows = [
      row("Global", "capacity", ["Power generation"]),
      row("Global", "generation", ["Transmission and distribution"]),
      row("ASEAN", "capacity", ["Energy storage"]),
    ];
    expect(plottedSegments(rows, POWER, "capacity", "Global")).toEqual([
      "Power generation",
    ]);
  });

  it("orders segments as the sector defines them, not as rows list them", () => {
    const rows = [
      row("Global", "capacity", ["Energy storage"]),
      row("Global", "capacity", ["Power generation", "Energy storage"]),
    ];
    expect(plottedSegments(rows, POWER, "capacity", "Global")).toEqual([
      "Power generation",
      "Energy storage",
    ]);
  });

  it("returns nothing for rows without segments or no rows at all", () => {
    expect(
      plottedSegments(
        [{ sector: "power", geography: "Global", metric: "capacity" }],
        POWER,
        "capacity",
        "Global",
      ),
    ).toEqual([]);
    expect(plottedSegments(undefined, POWER, "capacity", "Global")).toEqual([]);
  });
});
