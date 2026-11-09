import { describe, it, expect } from "vitest";
import {
  MAX_PLOT_YEAR,
  capToPlotYears,
  extendsPastPlotYears,
  plotYearTicks,
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

describe("plotYearTicks", () => {
  it("labels the first year, each decade and 2050", () => {
    expect(plotYearTicks(2022, 2050)).toEqual([2022, 2030, 2040, 2050]);
  });

  it("labels a last year before 2050 as well as 2050", () => {
    expect(plotYearTicks(2023, 2035)).toEqual([2023, 2030, 2035, 2040, 2050]);
  });

  it("labels a first year on a decade once", () => {
    expect(plotYearTicks(2020, 2050)).toEqual([2020, 2030, 2040, 2050]);
  });

  it("leaves out a decade too close to the first or last year", () => {
    expect(plotYearTicks(2028, 2041)).toEqual([2028, 2041, 2050]);
  });

  it("keeps a decade exactly 3 years from the first or last year", () => {
    expect(plotYearTicks(2027, 2043)).toEqual([2027, 2030, 2040, 2043, 2050]);
  });

  it("ends at 2050 when the data runs past it", () => {
    expect(plotYearTicks(2020, 2100)).toEqual([2020, 2030, 2040, 2050]);
  });
});
