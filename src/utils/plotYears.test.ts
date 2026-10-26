import { describe, it, expect } from "vitest";
import {
  MAX_PLOT_YEAR,
  capToPlotYears,
  extendsPastPlotYears,
} from "./plotYears";

const rows = (...years: (string | number)[]) => ({
  data: years.map((year) => ({ year, value: 1 })),
});

describe("capToPlotYears", () => {
  it("keeps 2050 and drops every later year", () => {
    expect(MAX_PLOT_YEAR).toBe(2050);
    const capped = capToPlotYears(rows(2040, 2050, 2051, 2100));
    expect(capped?.data.map((d) => d.year)).toEqual([2040, 2050]);
  });

  it("reads string years as numbers", () => {
    const capped = capToPlotYears(rows("2030", "2050", "2060"));
    expect(capped?.data.map((d) => d.year)).toEqual(["2030", "2050"]);
  });

  it("keeps the other fields of the timeseries", () => {
    const capped = capToPlotYears({ ...rows(2060), datasetId: "x" });
    expect(capped).toEqual({ data: [], datasetId: "x" });
  });

  it("passes null through", () => {
    expect(capToPlotYears(null)).toBeNull();
  });
});

describe("extendsPastPlotYears", () => {
  it("is true only when some row is after 2050", () => {
    expect(extendsPastPlotYears(rows(2020, 2050))).toBe(false);
    expect(extendsPastPlotYears(rows(2020, "2055"))).toBe(true);
    expect(extendsPastPlotYears(null)).toBe(false);
  });
});
