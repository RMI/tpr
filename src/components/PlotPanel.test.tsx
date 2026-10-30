import { describe, it, expect } from "vitest";
import { BENCHMARK_PLOT_ORDER, PLOT_OPTIONS } from "./PlotPanel";

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
