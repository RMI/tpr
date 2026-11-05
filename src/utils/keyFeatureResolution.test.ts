import { describe, it, expect } from "vitest";
import {
  createKeyFeatureResolver,
  effectiveScope,
  geographyChain,
  resolveKeyFeature,
  sourceScopeLabel,
} from "./keyFeatureResolution";
import type { Geography, PathwayMetadataType } from "../types";

const SENTINEL = "Not applicable at this scope level";

/**
 * A pathway covering Power and Buildings in one region (two of its members also
 * standalone) and nothing global, so South East Asia is its widest geography.
 * Fixtures carry only the fields the resolver reads — hence the cast.
 */
function pathway(over: Record<string, unknown> = {}): PathwayMetadataType {
  return {
    sectors: [
      { name: "Power", technologies: [] },
      { name: "Buildings", technologies: [] },
    ],
    geography: {
      regions: { "South East Asia": ["ID", "TH", "VN"] },
      country: ["TH", "VN"],
    },
    keyFeatures: {},
    ...over,
  } as unknown as PathwayMetadataType;
}

const e = (sector: string, geography: string, value: string | string[]) => ({
  sector,
  geography,
  value,
});

/** A pathway whose only populated field is `field`. */
function withEntries(
  field: string,
  entries: ReturnType<typeof e>[],
  over: Record<string, unknown> = {},
): PathwayMetadataType {
  return pathway({ keyFeatures: { [field]: entries }, ...over });
}

const at = (sector: string | null, geography: string | null) => ({
  sector,
  geography,
});

describe("geographyChain", () => {
  it("walks a country out through nested regions, smallest first", () => {
    const geo: Geography = {
      global: true,
      regions: {
        "Asia Pacific": ["AU", "JP", "KR", "TH"],
        "Japan and Korea": ["JP", "KR"],
        // Overlaps Japan and Korea without containing JP, so never on the chain.
        "East Asia": ["CN", "KR"],
      },
      country: ["JP"],
    };
    expect(geographyChain("JP", geo)).toEqual([
      "JP",
      "Japan and Korea",
      "Asia Pacific",
      "across regions",
      "Global",
    ]);
  });

  it("goes smallest-first even when the broader region is declared first (IEA-2024)", () => {
    const geo: Geography = {
      global: true,
      regions: {
        "Asia Pacific": ["JP", "TH", "VN"],
        "Southeast Asia": ["TH", "VN"],
      },
      country: ["JP"],
    };
    expect(geographyChain("Southeast Asia", geo)).toEqual([
      "Southeast Asia",
      "Asia Pacific",
      "across regions",
      "Global",
    ]);
    expect(geographyChain("JP", geo)).toEqual([
      "JP",
      "Asia Pacific",
      "across regions",
      "Global",
    ]);
  });

  it("keeps declaration order between containing tokens of equal size", () => {
    const regions: Geography["regions"] = {
      "OPECplus": ["SA", "AE"],
      "Middle East": ["AE", "SA"],
    };
    expect(geographyChain("SA", { regions, country: ["SA"] })).toEqual([
      "SA",
      "OPECplus",
      "Middle East",
      "across regions",
      "Global",
    ]);

    const reversed: Geography["regions"] = {
      "Middle East": ["AE", "SA"],
      "OPECplus": ["SA", "AE"],
    };
    expect(
      geographyChain("SA", { regions: reversed, country: ["SA"] }),
    ).toEqual(["SA", "Middle East", "OPECplus", "across regions", "Global"]);
  });

  it("walks from a country only through the regions that contain it", () => {
    const geo: Geography = {
      global: true,
      regions: {
        "South East Asia": ["ID", "TH", "VN"],
        // Shares members with South East Asia but not TH itself.
        "Rest South East Asia": ["ID", "VN"],
      },
      country: ["TH"],
    };
    expect(geographyChain("TH", geo)).toEqual([
      "TH",
      "South East Asia",
      "across regions",
      "Global",
    ]);
  });

  it("is just Global for Global", () => {
    expect(geographyChain("Global", pathway().geography)).toEqual(["Global"]);
  });

  it("puts across regions just before Global", () => {
    expect(geographyChain("across regions", pathway().geography)).toEqual([
      "across regions",
      "Global",
    ]);
  });

  it("skips straight to the aggregates for a stale token", () => {
    expect(geographyChain("Atlantis", pathway().geography)).toEqual([
      "Atlantis",
      "across regions",
      "Global",
    ]);
    // ISO-looking but undeclared: no claim to sit inside South East Asia.
    expect(geographyChain("DE", pathway().geography)).toEqual([
      "DE",
      "across regions",
      "Global",
    ]);
  });
});

describe("effectiveScope", () => {
  it("keeps a selected axis as it is", () => {
    expect(effectiveScope(pathway(), at("Power", "TH"))).toEqual({
      sector: "Power",
      geography: "TH",
    });
  });

  it("fills empty axes with the widest scope", () => {
    const p = withEntries("emissionsTrajectory", [
      e("across sectors", "South East Asia", "Minor decrease"),
    ]);
    expect(effectiveScope(p, at(null, null))).toEqual({
      sector: "across sectors",
      geography: "South East Asia",
    });
  });

  it("uses across sectors when the pathway has no widest sector", () => {
    // Two sectors and no `across sectors` row: widestSector is null.
    expect(effectiveScope(pathway(), at(null, "TH")).sector).toBe(
      "across sectors",
    );
  });
});

describe("resolveKeyFeature — order", () => {
  it("returns an exact match as such", () => {
    const p = withEntries("emissionsTrajectory", [
      e("Power", "TH", "Minor decrease"),
      e("across sectors", "Global", "Significant decrease"),
    ]);
    expect(
      resolveKeyFeature(p, "emissionsTrajectory", at("Power", "TH")),
    ).toEqual({
      status: "resolved",
      value: "Minor decrease",
      sourceScope: { sector: "Power", geography: "TH" },
      requestedScope: { sector: "Power", geography: "TH" },
      isFallback: false,
    });
  });

  it("exhausts the selected sector's geographies before trying across sectors", () => {
    const p = withEntries("emissionsTrajectory", [
      e("across sectors", "TH", "Minor increase"),
      e("Power", "Global", "Moderate decrease"),
    ]);
    const result = resolveKeyFeature(
      p,
      "emissionsTrajectory",
      at("Power", "TH"),
    );
    expect(result).toMatchObject({
      status: "resolved",
      value: "Moderate decrease",
      sourceScope: { sector: "Power", geography: "Global" },
      isFallback: true,
    });
  });

  it("within across sectors, prefers the narrowest geography", () => {
    const p = withEntries("emissionsTrajectory", [
      e("across sectors", "Global", "Significant decrease"),
      e("across sectors", "South East Asia", "Moderate decrease"),
      e("across sectors", "TH", "Minor decrease"),
    ]);
    expect(
      resolveKeyFeature(p, "emissionsTrajectory", at("Power", "TH")),
    ).toMatchObject({
      value: "Minor decrease",
      sourceScope: { sector: "across sectors", geography: "TH" },
      isFallback: true,
    });
  });

  it("walks up through a containing region", () => {
    const p = withEntries("emissionsTrajectory", [
      e("Power", "South East Asia", "Minor decrease"),
    ]);
    expect(
      resolveKeyFeature(p, "emissionsTrajectory", at("Power", "VN")),
    ).toMatchObject({
      sourceScope: { sector: "Power", geography: "South East Asia" },
      isFallback: true,
    });
  });
});

describe("resolveKeyFeature — terminal and skipped values", () => {
  it("skips the scalar sentinel (ACE's Buildings electrification)", () => {
    const p = withEntries("electrification", [
      e("across sectors", "South East Asia", "Low or no change"),
      e("Buildings", "South East Asia", SENTINEL),
    ]);
    expect(
      resolveKeyFeature(
        p,
        "electrification",
        at("Buildings", "South East Asia"),
      ),
    ).toMatchObject({
      value: "Low or no change",
      sourceScope: { sector: "across sectors", geography: "South East Asia" },
      isFallback: true,
    });
  });

  it("skips an array containing the sentinel (ACE's policyTypes)", () => {
    const p = withEntries("policyTypes", [
      e("across sectors", "South East Asia", ["Target technology shares"]),
      e("Power", "South East Asia", [SENTINEL]),
    ]);
    expect(
      resolveKeyFeature(p, "policyTypes", at("Power", "South East Asia")),
    ).toMatchObject({
      value: ["Target technology shares"],
      sourceScope: { sector: "across sectors" },
    });
  });

  it("stops at an exact authored No information", () => {
    const p = withEntries("energyDemand", [
      e("Power", "TH", "No information"),
      e("across sectors", "TH", "Minor increase"),
    ]);
    expect(resolveKeyFeature(p, "energyDemand", at("Power", "TH"))).toEqual({
      status: "resolved",
      value: "No information",
      sourceScope: { sector: "Power", geography: "TH" },
      requestedScope: { sector: "Power", geography: "TH" },
      isFallback: false,
    });
  });

  it("stops at an inherited No information, recording where it came from", () => {
    const p = withEntries("energyDemand", [
      e("across sectors", "South East Asia", "No information"),
      e("across sectors", "Global", "Minor increase"),
    ]);
    expect(
      resolveKeyFeature(p, "energyDemand", at("Power", "TH")),
    ).toMatchObject({
      status: "resolved",
      value: "No information",
      sourceScope: { sector: "across sectors", geography: "South East Asia" },
      isFallback: true,
    });
  });

  it("treats None and No new technologies as answers", () => {
    const policy = withEntries("policyTypes", [
      e("Power", "TH", ["None"]),
      e("across sectors", "TH", ["Carbon price"]),
    ]);
    expect(
      resolveKeyFeature(policy, "policyTypes", at("Power", "TH")),
    ).toMatchObject({ value: ["None"], isFallback: false });

    const tech = withEntries("newTechnologiesIncluded", [
      e("Power", "TH", ["No new technologies"]),
      e("across sectors", "TH", ["CCUS"]),
    ]);
    expect(
      resolveKeyFeature(tech, "newTechnologiesIncluded", at("Power", "TH")),
    ).toMatchObject({ value: ["No new technologies"], isFallback: false });
  });

  it("preserves array values as authored", () => {
    const p = withEntries("policyTypes", [
      e("Power", "TH", ["Carbon price", "Subsidies"]),
    ]);
    expect(
      resolveKeyFeature(p, "policyTypes", at("Power", "TH")),
    ).toMatchObject({ value: ["Carbon price", "Subsidies"] });
  });
});

describe("resolveKeyFeature — edge cases", () => {
  it("is unavailable when the whole chain is exhausted", () => {
    const p = withEntries("emissionsTrajectory", [
      // Another sector, and a sentinel on the only reachable row.
      e("Buildings", "TH", "Minor decrease"),
      e("across sectors", "Global", SENTINEL),
    ]);
    expect(
      resolveKeyFeature(p, "emissionsTrajectory", at("Power", "TH")),
    ).toEqual({
      status: "unavailable",
      requestedScope: { sector: "Power", geography: "TH" },
    });
  });

  it("inherits Electrification of Power from across sectors, naming the sector", () => {
    const p = withEntries("electrification", [
      e("across sectors", "TH", "Moderate increase"),
    ]);
    expect(resolveKeyFeature(p, "electrification", at("Power", "TH"))).toEqual({
      status: "resolved",
      value: "Moderate increase",
      sourceScope: { sector: "across sectors", geography: "TH" },
      requestedScope: { sector: "Power", geography: "TH" },
      isFallback: true,
      notApplicableSector: "Power",
    });
  });

  it.each(["Significant increase", "No information", "Not Applicable"])(
    "never reads an Electrification of Power cell, even one saying %s",
    (value) => {
      // The validator rejects any value there; the resolver does not rely on it.
      const p = withEntries("electrification", [
        e("Power", "TH", value),
        e("across sectors", "TH", "Moderate increase"),
      ]);
      expect(
        resolveKeyFeature(p, "electrification", at("Power", "TH")),
      ).toMatchObject({
        status: "resolved",
        value: "Moderate increase",
        sourceScope: { sector: "across sectors", geography: "TH" },
        notApplicableSector: "Power",
      });
    },
  );

  it("is unavailable but names the sector when nothing is across sectors", () => {
    // A Power-only pathway: no across sectors row to fall back to, for the
    // ribbon's Power and for an empty sector alike. The sector is named so the
    // page says "Not applicable" rather than "No information".
    const p = withEntries("electrification", [], {
      sectors: [{ name: "Power", technologies: [] }],
      geography: { country: ["SG"] },
    });
    const unavailable = {
      status: "unavailable",
      requestedScope: { sector: "Power", geography: "SG" },
      notApplicableSector: "Power",
    };
    expect(resolveKeyFeature(p, "electrification", at("Power", "SG"))).toEqual(
      unavailable,
    );
    expect(resolveKeyFeature(p, "electrification", at(null, null))).toEqual(
      unavailable,
    );
  });

  it("names no sector when a field that applies there is unavailable", () => {
    const p = withEntries("emissionsTrajectory", [], {
      sectors: [{ name: "Power", technologies: [] }],
      geography: { country: ["SG"] },
    });
    expect(
      resolveKeyFeature(p, "emissionsTrajectory", at("Power", "SG")),
    ).toEqual({
      status: "unavailable",
      requestedScope: { sector: "Power", geography: "SG" },
    });
  });

  it("leaves Electrification of other sectors alone", () => {
    const p = withEntries("electrification", [
      e("Buildings", "TH", "Minor increase"),
      e("across sectors", "TH", "Moderate increase"),
    ]);
    expect(
      resolveKeyFeature(p, "electrification", at("Buildings", "TH")),
    ).toEqual({
      status: "resolved",
      value: "Minor increase",
      sourceScope: { sector: "Buildings", geography: "TH" },
      requestedScope: { sector: "Buildings", geography: "TH" },
      isFallback: false,
    });
  });

  it("gives an undeclared sector no across sectors fallback", () => {
    const p = withEntries("emissionsTrajectory", [
      e("across sectors", "Global", "Moderate decrease"),
    ]);
    expect(
      resolveKeyFeature(p, "emissionsTrajectory", at("Steel", "TH")),
    ).toMatchObject({ status: "unavailable" });
  });

  it("resolves null axes at the widest scope, as an exact match", () => {
    const p = withEntries("emissionsTrajectory", [
      e("across sectors", "South East Asia", "Moderate increase"),
      e("Power", "South East Asia", "Moderate decrease"),
    ]);
    expect(resolveKeyFeature(p, "emissionsTrajectory", at(null, null))).toEqual(
      {
        status: "resolved",
        value: "Moderate increase",
        sourceScope: { sector: "across sectors", geography: "South East Asia" },
        requestedScope: {
          sector: "across sectors",
          geography: "South East Asia",
        },
        isFallback: false,
      },
    );
  });

  it("is unavailable for a non-array field (a stale v1 scalar)", () => {
    const p = pathway({
      keyFeatures: { emissionsTrajectory: "Moderate decrease" },
    });
    expect(
      resolveKeyFeature(p, "emissionsTrajectory", at("Power", "TH")),
    ).toMatchObject({ status: "unavailable" });
  });

  it("is unavailable for a missing field", () => {
    expect(
      resolveKeyFeature(pathway(), "emissionsTrajectory", at("Power", "TH")),
    ).toMatchObject({ status: "unavailable" });
  });
});

describe("createKeyFeatureResolver", () => {
  it("answers each field exactly as resolveKeyFeature does", () => {
    // One fixture exercising every outcome, so sharing the chains across
    // fields cannot leak one field's state into another's.
    const p = pathway({
      keyFeatures: {
        emissionsTrajectory: [e("Power", "TH", "Minor decrease")],
        energyDemand: [
          e("across sectors", "South East Asia", "No information"),
        ],
        electrification: [e("across sectors", "Global", "Moderate increase")],
        policyTypes: [e("Power", "TH", [SENTINEL])],
      },
    });
    const selection = at("Power", "TH");
    const resolve = createKeyFeatureResolver(p, selection);
    const fields = [
      "emissionsTrajectory",
      "energyDemand",
      "electrification",
      "policyTypes",
      "investmentNeeds",
    ] as const;

    for (const field of fields) {
      expect(resolve(field)).toEqual(resolveKeyFeature(p, field, selection));
    }
    expect(fields.map((field) => resolve(field).status)).toEqual([
      "resolved",
      "resolved",
      "resolved",
      "unavailable",
      "unavailable",
    ]);
  });
});

describe("sourceScopeLabel", () => {
  it("names the sentinels in sentence case", () => {
    expect(
      sourceScopeLabel({ sector: "across sectors", geography: "ASEAN" }),
    ).toBe("Across sectors · ASEAN");
    expect(
      sourceScopeLabel({ sector: "Power", geography: "across regions" }),
    ).toBe("Power · Across regions");
  });

  it("names a country rather than its code", () => {
    expect(sourceScopeLabel({ sector: "Power", geography: "TH" })).toBe(
      "Power · Thailand",
    );
  });

  it("keeps region labels and Global as they are", () => {
    expect(
      sourceScopeLabel({ sector: "Buildings", geography: "South East Asia" }),
    ).toBe("Buildings · South East Asia");
    expect(sourceScopeLabel({ sector: "Power", geography: "Global" })).toBe(
      "Power · Global",
    );
  });
});
