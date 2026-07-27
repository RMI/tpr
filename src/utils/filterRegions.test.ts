import { describe, it, expect } from "vitest";
import {
  ALL_COUNTRY_CODES,
  FILTER_REGIONS,
  FILTER_REGION_LABELS,
  filterRegionToISO,
} from "./filterRegions";
import { countryCodeSchema } from "../schema/common";

const ENUM = new Set(countryCodeSchema.enum as string[]);

describe("filterRegions config (#798 seed)", () => {
  it("Southeast Asia is exactly the ten ASEAN member states", () => {
    // Grounded: IEA WEO 2024 Annex C. Order-independent comparison.
    expect([...FILTER_REGIONS["Southeast Asia"]].sort()).toEqual(
      ["BN", "ID", "KH", "LA", "MM", "MY", "PH", "SG", "TH", "VN"].sort(),
    );
  });

  it("every defined region member is a valid schema country code", () => {
    for (const [label, codes] of Object.entries(FILTER_REGIONS)) {
      for (const code of codes) {
        expect(ENUM.has(code), `${label} → ${code}`).toBe(true);
      }
    }
  });

  it("region members are unique within each region", () => {
    for (const [label, codes] of Object.entries(FILTER_REGIONS)) {
      expect(new Set(codes).size, label).toBe(codes.length);
    }
  });
});

describe("filterRegionToISO", () => {
  it("expands Global to every recognised country code", () => {
    const global = filterRegionToISO("Global");
    expect(global.length).toBe(ENUM.size);
    expect(new Set(global)).toEqual(ENUM);
  });

  it("resolves a defined region to its membership", () => {
    expect(filterRegionToISO("Southeast Asia")).toContain("TH");
    expect(filterRegionToISO("Southeast Asia")).toHaveLength(10);
  });

  it("returns a fresh array that cannot mutate the shared config", () => {
    const first = filterRegionToISO("Southeast Asia");
    first.push("US");
    expect(filterRegionToISO("Southeast Asia")).toHaveLength(10);
  });

  it("Global is a strict superset of Southeast Asia (containment holds)", () => {
    const global = new Set(filterRegionToISO("Global"));
    for (const code of filterRegionToISO("Southeast Asia")) {
      expect(global.has(code)).toBe(true);
    }
  });
});

describe("exports", () => {
  it("FILTER_REGION_LABELS lists the defined regions and excludes Global", () => {
    expect(FILTER_REGION_LABELS).toContain("Southeast Asia");
    expect(FILTER_REGION_LABELS).not.toContain("Global");
  });

  it("ALL_COUNTRY_CODES matches the schema enum", () => {
    expect(ALL_COUNTRY_CODES.length).toBe(ENUM.size);
  });
});
