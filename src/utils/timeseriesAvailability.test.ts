import { describe, it, expect } from "vitest";
import { pathwayToolAvailability } from "./timeseriesAvailability";

const POWER_SUMMARY = {
  sectors: ["power"],
  geographies: ["Global", "South East Asia"],
  metrics: [
    "absoluteEmissions",
    "capacity",
    "emissionsIntensity",
    "generation",
    "technologyMix",
  ],
};

describe("pathwayToolAvailability", () => {
  describe("with no datasets", () => {
    const av = pathwayToolAvailability([]);

    it("hasSector returns false", () => {
      expect(av.hasSector("Power")).toBe(false);
    });

    it("hasMetric returns false", () => {
      expect(av.hasMetric("Capacity")).toBe(false);
    });

    it("hasGeography returns false", () => {
      expect(av.hasGeography("Global")).toBe(false);
    });
  });

  describe("hasSector", () => {
    const av = pathwayToolAvailability([{ summary: POWER_SUMMARY }]);

    it("returns true for a sector present in the timeseries (by display name)", () => {
      expect(av.hasSector("Power")).toBe(true);
    });

    it("returns false for a sector not present", () => {
      expect(av.hasSector("Buildings")).toBe(false);
    });

    it("returns false for the internal key instead of the display name", () => {
      expect(av.hasSector("power")).toBe(false);
    });
  });

  describe("hasMetric", () => {
    const av = pathwayToolAvailability([{ summary: POWER_SUMMARY }]);

    it("returns true for metrics present in the timeseries (by display name)", () => {
      expect(av.hasMetric("Absolute Emissions")).toBe(true);
      expect(av.hasMetric("Capacity")).toBe(true);
      expect(av.hasMetric("Emissions Intensity")).toBe(true);
      expect(av.hasMetric("Generation")).toBe(true);
      expect(av.hasMetric("Technology Mix")).toBe(true);
    });

    it("returns false for a metric not present", () => {
      expect(av.hasMetric("Carbon Price")).toBe(false);
    });

    it("returns false for the internal key instead of the display name", () => {
      expect(av.hasMetric("absoluteEmissions")).toBe(false);
    });

    it("returns false when the metric key exists but no matching sector is present", () => {
      // Metrics are resolved through sectors — without a matching sector, no
      // display names can be looked up even if metric keys are listed.
      const av = pathwayToolAvailability([
        { summary: { sectors: [], geographies: [], metrics: ["capacity"] } },
      ]);
      expect(av.hasMetric("Capacity")).toBe(false);
    });
  });

  describe("hasGeography", () => {
    const av = pathwayToolAvailability([{ summary: POWER_SUMMARY }]);

    it("returns true for a direct string match", () => {
      expect(av.hasGeography("Global")).toBe(true);
      expect(av.hasGeography("South East Asia")).toBe(true);
    });

    it("returns false for a geography not present", () => {
      expect(av.hasGeography("North America")).toBe(false);
    });

    it("maps ISO2 country codes to display names", () => {
      // "DE" maps to "Germany" via geographyLabel — confirmed by PathwayCard tests.
      const av = pathwayToolAvailability([
        {
          summary: {
            sectors: [],
            geographies: ["Germany"],
            metrics: [],
          },
        },
      ]);
      expect(av.hasGeography("DE")).toBe(true);
    });

    it("returns false for an ISO2 code whose display name is not present", () => {
      const av = pathwayToolAvailability([
        { summary: { sectors: [], geographies: ["Germany"], metrics: [] } },
      ]);
      expect(av.hasGeography("FR")).toBe(false);
    });
  });

  describe("merging multiple datasets", () => {
    const av = pathwayToolAvailability([
      {
        summary: {
          sectors: ["power"],
          geographies: ["Global"],
          metrics: ["capacity"],
        },
      },
      {
        summary: {
          sectors: [],
          geographies: ["South East Asia"],
          metrics: [],
        },
      },
    ]);

    it("unions geographies across all datasets", () => {
      expect(av.hasGeography("Global")).toBe(true);
      expect(av.hasGeography("South East Asia")).toBe(true);
    });

    it("unions sectors across all datasets", () => {
      expect(av.hasSector("Power")).toBe(true);
    });
  });

  describe("missing or malformed summary", () => {
    it("treats null summary as all-false", () => {
      const av = pathwayToolAvailability([{ summary: null }]);
      expect(av.hasSector("Power")).toBe(false);
      expect(av.hasMetric("Capacity")).toBe(false);
      expect(av.hasGeography("Global")).toBe(false);
    });

    it("treats empty summary object as all-false", () => {
      const av = pathwayToolAvailability([{ summary: {} }]);
      expect(av.hasSector("Power")).toBe(false);
      expect(av.hasMetric("Capacity")).toBe(false);
      expect(av.hasGeography("Global")).toBe(false);
    });

    it("treats dataset with no summary field as all-false", () => {
      const av = pathwayToolAvailability([{}]);
      expect(av.hasSector("Power")).toBe(false);
      expect(av.hasMetric("Capacity")).toBe(false);
      expect(av.hasGeography("Global")).toBe(false);
    });
  });
});
