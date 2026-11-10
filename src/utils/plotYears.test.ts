import { describe, it, expect } from "vitest";
import {
  MAX_PLOT_YEAR,
  capToPlotYears,
  extendsPastPlotYears,
  isPastPlottedYears,
  plotXAxis,
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

  it("leaves out a last year too close to 2050", () => {
    expect(plotYearTicks(2022, 2048)).toEqual([2022, 2030, 2040, 2050]);
  });

  it("ends at 2050 when the data runs past it", () => {
    expect(plotYearTicks(2020, 2100)).toEqual([2020, 2030, 2040, 2050]);
  });
});

describe("plotXAxis", () => {
  const utc = (year: number) => new Date(Date.UTC(year, 0, 1));

  it("runs to 2050 however early the data ends", () => {
    const { domain, ticks } = plotXAxis(utc(2023), utc(2035));
    expect(domain).toEqual([utc(2023), utc(2050)]);
    expect(ticks).toEqual([2023, 2030, 2035, 2040, 2050].map(utc));
  });
});

describe("isPastPlottedYears", () => {
  // Years plotted at 100, 200 and 300: half a step past the last is 350.
  const yearXs = [200, 100, 300, 300];

  it("is false up to half a step past the last year", () => {
    expect(isPastPlottedYears(50, yearXs)).toBe(false);
    expect(isPastPlottedYears(350, yearXs)).toBe(false);
  });

  it("is true beyond half a step past the last year", () => {
    expect(isPastPlottedYears(351, yearXs)).toBe(true);
  });

  it("is true anywhere right of a single plotted year", () => {
    expect(isPastPlottedYears(101, [100])).toBe(true);
  });

  it("is false with nothing plotted", () => {
    expect(isPastPlottedYears(500, [])).toBe(false);
  });
});
