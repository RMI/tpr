import { describe, it, expect } from "vitest";
import { scopeAvailability } from "./scopeAvailability";
import type { PathwayMetadataType } from "../types";

const POWER_IN_SEA = [
  { summary: { sectors: ["power"], geographies: ["South East Asia"] } },
];

const withDependencies = (...sectors: string[]) =>
  ({
    dependencies: sectors.map((sector) => ({ sector })),
  }) as unknown as PathwayMetadataType;

describe("scopeAvailability", () => {
  it("makes available what the benchmark data covers", () => {
    const av = scopeAvailability(withDependencies(), POWER_IN_SEA);

    expect(av.hasSector("Power")).toBe(true);
    expect(av.hasSector("Steel")).toBe(false);
    expect(av.hasGeography("South East Asia")).toBe(true);
    expect(av.hasGeography("TH")).toBe(false);
  });

  it("makes a sector available through its dependencies alone", () => {
    const av = scopeAvailability(withDependencies("Steel"), []);

    expect(av.hasSector("Steel")).toBe(true);
    expect(av.hasSector("Power")).toBe(false);
  });

  it("never makes a geography available through dependencies", () => {
    // Dependencies are not scoped by geography, so they cannot vouch for one.
    const av = scopeAvailability(withDependencies("Power"), []);

    expect(av.hasGeography("Global")).toBe(false);
  });

  it("does not let a Global series stand in for other geographies", () => {
    const av = scopeAvailability(withDependencies(), [
      { summary: { sectors: ["power"], geographies: ["Global"] } },
    ]);

    expect(av.hasGeography("Global")).toBe(true);
    expect(av.hasGeography("South East Asia")).toBe(false);
  });

  describe("key features", () => {
    const withKeyFeatures = (...entries: unknown[]) =>
      ({
        dependencies: [],
        keyFeatures: { emissionsTrajectory: entries },
      }) as unknown as PathwayMetadataType;
    const entry = (sector: string, geography: string, value: unknown) => ({
      sector,
      geography,
      value,
    });

    it("are ignored unless asked for (the comparison page, until it resolves them)", () => {
      const av = scopeAvailability(
        withKeyFeatures(entry("Steel", "TH", "Minor decrease")),
        [],
      );

      expect(av.hasSector("Steel")).toBe(false);
      expect(av.hasGeography("TH")).toBe(false);
    });

    it("make their exact sector and geography available when counted", () => {
      const av = scopeAvailability(
        withKeyFeatures(entry("Steel", "TH", "Minor decrease")),
        [],
        { keyFeatures: true },
      );

      expect(av.hasSector("Steel")).toBe(true);
      expect(av.hasGeography("TH")).toBe(true);
    });

    it("do not let an across sectors or Global value stand in for other tokens", () => {
      const av = scopeAvailability(
        withKeyFeatures(entry("across sectors", "Global", "Minor decrease")),
        [],
        { keyFeatures: true },
      );

      expect(av.hasSector("Power")).toBe(false);
      expect(av.hasGeography("TH")).toBe(false);
      expect(av.hasGeography("Global")).toBe(true);
    });

    it("count only values that say something", () => {
      const av = scopeAvailability(
        withKeyFeatures(
          entry("Steel", "TH", "Not applicable at this scope level"),
          entry("Power", "VN", "Not Applicable"),
          entry("Cement", "ID", "No information"),
          entry("Rail", "MY", ["No information"]),
          entry("Aviation", "PH", ["Not applicable at this scope level"]),
        ),
        [],
        { keyFeatures: true },
      );

      for (const sector of ["Steel", "Power", "Cement", "Rail", "Aviation"]) {
        expect(av.hasSector(sector)).toBe(false);
      }
      for (const geography of ["TH", "VN", "ID", "MY", "PH"]) {
        expect(av.hasGeography(geography)).toBe(false);
      }
    });

    it("count an array value with anything besides No information", () => {
      const av = scopeAvailability(
        withKeyFeatures(entry("Steel", "TH", ["No information", "CCUS"])),
        [],
        { keyFeatures: true },
      );

      expect(av.hasSector("Steel")).toBe(true);
    });
  });

  it("makes nothing available for a pathway with neither", () => {
    const av = scopeAvailability(withDependencies(), []);

    expect(av.hasSector("Power")).toBe(false);
    expect(av.hasGeography("Global")).toBe(false);
  });
});
