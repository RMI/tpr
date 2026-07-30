import { describe, it, expect } from "vitest";
import {
  ALL_COUNTRY_CODES,
  FILTER_REGIONS,
  FILTER_REGION_LABELS,
  filterRegionToISO,
  selectedGeographyToISO,
} from "./filterRegions";
import { ABSENT_FILTER_TOKEN } from "./absent";
import { countryCodeSchema } from "../schema/common";

const ENUM = new Set(countryCodeSchema.enum as string[]);

// The five continental regions, in the order the definition doc lists them.
const CONTINENTS = [
  "America (Continental)",
  "Africa (Continental)",
  "Europe (Continental)",
  "Asia (Continental)",
  "Australia & Oceania (Continental)",
] as const;

describe("filterRegions config (#798)", () => {
  it("defines all fifteen regions from the definition doc", () => {
    expect(new Set(Object.keys(FILTER_REGIONS))).toEqual(
      new Set([
        ...CONTINENTS,
        "North America",
        "Central America & Caribbean",
        "South America",
        "European Union (EU)",
        "Middle East & North Africa",
        "Sub-Saharan Africa",
        "Central Asia",
        "South Asia",
        "Southeast Asia",
        "East Asia and Pacific",
      ]),
    );
  });

  it("Southeast Asia is exactly the eleven codes from the doc (ASEAN + TL)", () => {
    // Order-independent comparison. Includes TL (Timor-Leste) per the #798 doc.
    expect([...FILTER_REGIONS["Southeast Asia"]].sort()).toEqual(
      ["BN", "ID", "KH", "LA", "MM", "MY", "PH", "SG", "TH", "TL", "VN"].sort(),
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

  it("the five continental regions are mutually exclusive", () => {
    const seen = new Map<string, string>();
    for (const label of CONTINENTS) {
      for (const code of FILTER_REGIONS[label]) {
        expect(
          seen.has(code),
          `${code} in both ${seen.get(code)} and ${label}`,
        ).toBe(false);
        seen.set(code, label);
      }
    }
  });

  it("honours the transcontinental / political assignments (#798, product-owner confirmed)", () => {
    expect(FILTER_REGIONS["Europe (Continental)"]).toContain("RU"); // Russia
    expect(FILTER_REGIONS["Asia (Continental)"]).toContain("TR"); // Turkey
    expect(FILTER_REGIONS["Europe (Continental)"]).toContain("CY"); // Cyprus
    expect(FILTER_REGIONS["Asia (Continental)"]).not.toContain("CY");
    // GL (Greenland): the doc's prose said Europe, but its tables — and the
    // product owner's ruling under #798 — place Greenland in the Americas.
    expect(FILTER_REGIONS["America (Continental)"]).toContain("GL");
    expect(FILTER_REGIONS["North America"]).toContain("GL");
    expect(FILTER_REGIONS["Europe (Continental)"]).not.toContain("GL");
  });

  it("applies the product-owner's #798 gap assignments", () => {
    // Ruling from Jacob on the codes the doc left uncovered.
    expect(FILTER_REGIONS["America (Continental)"]).toContain("AR"); // Argentina
    expect(FILTER_REGIONS["America (Continental)"]).toContain("GS"); // S. Georgia
    expect(FILTER_REGIONS["Africa (Continental)"]).toContain("EH"); // W. Sahara
    expect(FILTER_REGIONS["Sub-Saharan Africa"]).toContain("EH");
    expect(FILTER_REGIONS["Asia (Continental)"]).toContain("PS"); // Palestine
    expect(FILTER_REGIONS["Central America & Caribbean"]).toContain("BQ"); // Bonaire
    expect(FILTER_REGIONS["Central America & Caribbean"]).toContain("SX"); // Sint Maarten
  });

  it("leaves only the intended codes uncovered by the five continents", () => {
    // Post-#798 the continents cover every code EXCEPT: AQ (Antarctica,
    // intentionally unassigned) and the Caribbean territories BQ/SX, which the
    // product owner placed in the "Central America & Caribbean" sub-region only
    // (not the continental America bucket). Pinned so any future change is
    // deliberate rather than silent.
    const covered = new Set(CONTINENTS.flatMap((c) => [...FILTER_REGIONS[c]]));
    const uncovered = [...ENUM].filter((c) => !covered.has(c)).sort();
    expect(uncovered).toEqual(["AQ", "BQ", "SX"].sort());
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
    expect(filterRegionToISO("Southeast Asia")).toHaveLength(11);
  });

  it("returns a fresh array that cannot mutate the shared config", () => {
    const first = filterRegionToISO("Southeast Asia");
    first.push("US");
    expect(filterRegionToISO("Southeast Asia")).toHaveLength(11);
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

describe("selectedGeographyToISO", () => {
  it("classifies the ABSENT token", () => {
    expect(selectedGeographyToISO(ABSENT_FILTER_TOKEN)).toEqual({
      kind: "absent",
    });
  });

  it("classifies 'Global' (case-insensitive)", () => {
    expect(selectedGeographyToISO("Global")).toEqual({ kind: "global" });
    expect(selectedGeographyToISO("global")).toEqual({ kind: "global" });
  });

  it("expands a defined region label to its ISO members", () => {
    const r = selectedGeographyToISO("Southeast Asia");
    expect(r.kind).toBe("iso");
    if (r.kind === "iso") {
      expect([...r.iso].sort()).toEqual(
        [...FILTER_REGIONS["Southeast Asia"]].sort(),
      );
    }
  });

  it("expands a valid ISO country code to a singleton set", () => {
    const r = selectedGeographyToISO("TH");
    expect(r).toEqual({ kind: "iso", iso: new Set(["TH"]) });
  });

  it("returns an empty ISO set for an unknown/legacy token (never throws)", () => {
    // Includes Object.prototype keys: an `in` check would misread these as
    // regions and throw on `new Set(fn)`; an own-property check must not.
    for (const token of [
      "Europe",
      "South East Asia",
      "XX",
      "USA",
      "",
      "toString",
      "constructor",
      "hasOwnProperty",
    ]) {
      const r = selectedGeographyToISO(token);
      expect(r).toEqual({ kind: "iso", iso: new Set() });
    }
  });
});
