import { describe, it, expect } from "vitest";
import {
  BENCHMARK_PLOT_ORDER,
  PLOT_OPTIONS,
  hasDataForMetric,
} from "./PlotPanel";

const row = (geography: string, year: string) => ({
  sector: "power",
  sectorSegment: ["Power generation"],
  metric: "capacity",
  geography,
  year,
  value: 1,
  unit: "GW",
  technology: "Solar",
});

describe("BENCHMARK_PLOT_ORDER", () => {
  it("orders every plot type exactly once for each plotted sector (#1028)", () => {
    const plotTypes = PLOT_OPTIONS.map((opt) => opt.value).sort();
    for (const order of Object.values(BENCHMARK_PLOT_ORDER)) {
      expect([...order].sort()).toEqual(plotTypes);
    }
  });

  it("pairs related Power plots two to a row", () => {
    expect(BENCHMARK_PLOT_ORDER.power).toEqual([
      "absoluteEmissions",
      "emissionsIntensity",
      "capacity",
      "generation",
      "technologyMix",
    ]);
  });
});

describe("hasDataForMetric", () => {
  it("needs two years at one geography, not two years across geographies", () => {
    // One 2020 row at Global and one 2030 row at VN plot nothing anywhere.
    expect(
      hasDataForMetric(
        { data: [row("Global", "2020"), row("VN", "2030")] },
        "capacity",
      ),
    ).toBe(false);
    expect(
      hasDataForMetric(
        { data: [row("Global", "2020"), row("VN", "2030"), row("VN", "2040")] },
        "capacity",
      ),
    ).toBe(true);
  });
});
