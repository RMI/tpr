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

  it("ignores key features until they are filtered by scope (#869)", () => {
    const pathway = {
      dependencies: [],
      keyFeatures: {
        emissionsTrajectory: [
          { sector: "Steel", geography: "TH", value: "Declining" },
        ],
      },
    } as unknown as PathwayMetadataType;
    const av = scopeAvailability(pathway, []);

    expect(av.hasSector("Steel")).toBe(false);
    expect(av.hasGeography("TH")).toBe(false);
  });

  it("makes nothing available for a pathway with neither", () => {
    const av = scopeAvailability(withDependencies(), []);

    expect(av.hasSector("Power")).toBe(false);
    expect(av.hasGeography("Global")).toBe(false);
  });
});
