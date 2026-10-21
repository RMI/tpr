import { describe, it, expect } from "vitest";
import {
  ACROSS_REGIONS,
  ACROSS_SECTORS,
  GLOBAL_SCOPE,
  containsCodes,
  declaredGeographyTokens,
  declaredTokenCodes,
  isForbiddenKeyFeatureSector,
  isScopeLevelNotApplicable,
  widestGeography,
  widestSector,
} from "./keyFeatureRules";
import type { Geography, PathwayMetadataType } from "../types";

/** Fixtures carry only the fields the rules read — hence the cast. */
function pathway(over: Record<string, unknown>): PathwayMetadataType {
  return {
    sectors: [],
    geography: {},
    keyFeatures: {},
    ...over,
  } as unknown as PathwayMetadataType;
}

const sectors = (...names: string[]) =>
  names.map((name) => ({ name, technologies: [] }));

const e = (sector: string, geo: string, value: string | string[]) => ({
  sector,
  geography: geo,
  value,
});

const sorted = (set: ReadonlySet<string> | null) =>
  set === null ? null : [...set].sort();

describe("declaredTokenCodes", () => {
  const geo: Geography = {
    global: true,
    regions: {
      "South East Asia": ["ID", "TH", "VN"],
      "Unmapped Region": [],
    },
    country: ["US"],
  };

  it("Global covers everything", () => {
    expect(declaredTokenCodes(GLOBAL_SCOPE, geo)).toBeNull();
    // Even for a pathway that declares no geography: the chain always ends there.
    expect(declaredTokenCodes(GLOBAL_SCOPE, undefined)).toBeNull();
  });

  it("a region label resolves to its members", () => {
    expect(sorted(declaredTokenCodes("South East Asia", geo))).toEqual([
      "ID",
      "TH",
      "VN",
    ]);
  });

  it("a standalone country resolves to itself", () => {
    expect(sorted(declaredTokenCodes("US", geo))).toEqual(["US"]);
  });

  it("a member of a declared region counts as declared", () => {
    expect(sorted(declaredTokenCodes("TH", geo))).toEqual(["TH"]);
  });

  it("across regions is the union of every declared country", () => {
    expect(sorted(declaredTokenCodes(ACROSS_REGIONS, geo))).toEqual([
      "ID",
      "TH",
      "US",
      "VN",
    ]);
  });

  it("an undeclared token resolves to nothing, even if it looks like a country", () => {
    // Search's scopeISOSet would answer {DE} here; a pathway's own token must
    // not claim coverage the pathway never states.
    expect(sorted(declaredTokenCodes("DE", geo))).toEqual([]);
    expect(sorted(declaredTokenCodes("Atlantis", geo))).toEqual([]);
  });

  it("an unmapped region resolves to nothing", () => {
    expect(sorted(declaredTokenCodes("Unmapped Region", geo))).toEqual([]);
  });

  it("checks region labels before countries (JRC's 'TH' and 'EU' regions)", () => {
    const jrc: Geography = {
      global: true,
      regions: {
        EU: ["AT", "BE", "DE"],
        TH: ["TH"],
        // Not in the data: a region whose label is a country code but whose
        // members differ, which is what makes the order observable.
        CN: ["CN", "HK"],
      },
    };
    expect(sorted(declaredTokenCodes("EU", jrc))).toEqual(["AT", "BE", "DE"]);
    expect(sorted(declaredTokenCodes("TH", jrc))).toEqual(["TH"]);
    expect(sorted(declaredTokenCodes("CN", jrc))).toEqual(["CN", "HK"]);
  });

  it("degrades to nothing for a missing geography", () => {
    expect(sorted(declaredTokenCodes("US", undefined))).toEqual([]);
    expect(sorted(declaredTokenCodes(ACROSS_REGIONS, null))).toEqual([]);
  });
});

describe("declaredGeographyTokens", () => {
  it("lists region labels, then countries, without Global or region members", () => {
    expect(
      declaredGeographyTokens({
        global: true,
        regions: { "Asia Pacific": ["JP", "TH"], "Southeast Asia": ["TH"] },
        country: ["JP"],
      }),
    ).toEqual(["Asia Pacific", "Southeast Asia", "JP"]);
  });

  it("is empty for a missing geography", () => {
    expect(declaredGeographyTokens(undefined)).toEqual([]);
  });
});

describe("containsCodes", () => {
  const set = (...codes: string[]) => new Set(codes);

  it("is true for a superset or an equal set", () => {
    expect(containsCodes(set("TH", "VN"), set("TH"))).toBe(true);
    expect(containsCodes(set("TH"), set("TH"))).toBe(true);
  });

  it("is false when any country is missing", () => {
    expect(containsCodes(set("TH"), set("TH", "VN"))).toBe(false);
  });

  it("treats null as everything", () => {
    expect(containsCodes(null, set("TH"))).toBe(true);
  });

  it("never contains an empty (unknown) set", () => {
    expect(containsCodes(set("TH"), set())).toBe(false);
    expect(containsCodes(null, set())).toBe(false);
  });
});

describe("widestSector", () => {
  it("is across sectors when any keyFeature row uses it", () => {
    expect(
      widestSector(
        pathway({
          sectors: sectors("Power", "Buildings"),
          keyFeatures: {
            emissionsTrajectory: [e("Power", "ASEAN", "Minor decrease")],
            electrification: [e(ACROSS_SECTORS, "ASEAN", "Minor increase")],
          },
        }),
      ),
    ).toBe(ACROSS_SECTORS);
  });

  it("is the single declared sector otherwise", () => {
    expect(
      widestSector(
        pathway({
          sectors: sectors("Power"),
          keyFeatures: {
            emissionsTrajectory: [e("Power", "SG", "Minor decrease")],
          },
        }),
      ),
    ).toBe("Power");
  });

  it("is null for several sectors and no across sectors row (PHDOE-CES1)", () => {
    expect(
      widestSector(
        pathway({
          sectors: sectors("Power", "Other"),
          keyFeatures: {
            emissionsTrajectory: [e("Power", "PH", "Minor decrease")],
          },
        }),
      ),
    ).toBeNull();
  });

  it("is null for a pathway with no sectors", () => {
    expect(widestSector(pathway({}))).toBeNull();
  });

  it("tolerates a non-array field", () => {
    expect(
      widestSector(
        pathway({
          sectors: sectors("Power"),
          keyFeatures: { emissionsTrajectory: "Minor decrease" },
        }),
      ),
    ).toBe("Power");
  });
});

describe("widestGeography", () => {
  it("is Global for a global pathway", () => {
    expect(
      widestGeography(
        pathway({
          geography: { global: true, regions: { Europe: ["DE"] } },
        }),
      ),
    ).toBe(GLOBAL_SCOPE);
  });

  it("is the single region of a one-region pathway (ACE)", () => {
    expect(
      widestGeography(
        pathway({ geography: { regions: { ASEAN: ["ID", "TH", "VN"] } } }),
      ),
    ).toBe("ASEAN");
  });

  it("is the single country of a one-country pathway (SDSN)", () => {
    expect(widestGeography(pathway({ geography: { country: ["SG"] } }))).toBe(
      "SG",
    );
  });

  it("is a region listed alongside its own members", () => {
    expect(
      widestGeography(
        pathway({
          geography: {
            regions: { "South East Asia": ["ID", "TH", "VN"] },
            country: ["ID", "TH", "VN"],
          },
        }),
      ),
    ).toBe("South East Asia");
  });

  it("is the region that contains another region", () => {
    expect(
      widestGeography(
        pathway({
          geography: {
            regions: {
              "Southeast Asia": ["TH", "VN"],
              "Asia Pacific": ["JP", "TH", "VN"],
            },
          },
        }),
      ),
    ).toBe("Asia Pacific");
  });

  it("is across regions when no token contains the rest", () => {
    expect(
      widestGeography(
        pathway({
          geography: { regions: { Europe: ["DE"] }, country: ["US"] },
        }),
      ),
    ).toBe(ACROSS_REGIONS);
  });

  it("is across regions when an unmapped region could extend past the rest", () => {
    expect(
      widestGeography(
        pathway({
          geography: {
            regions: { "South East Asia": ["TH", "VN"], "East of Suez": [] },
          },
        }),
      ),
    ).toBe(ACROSS_REGIONS);
  });

  it("is a lone unmapped region, since there is nothing else to contain", () => {
    expect(
      widestGeography(pathway({ geography: { regions: { Somewhere: [] } } })),
    ).toBe("Somewhere");
  });

  it("is across regions for a pathway with no geography", () => {
    expect(widestGeography(pathway({ geography: {} }))).toBe(ACROSS_REGIONS);
  });
});

describe("isScopeLevelNotApplicable", () => {
  const sentinel = "Not applicable at this scope level";

  it("matches the scalar sentinel", () => {
    expect(isScopeLevelNotApplicable(sentinel)).toBe(true);
  });

  it("matches an array containing it, alone or not — it stands for the cell", () => {
    expect(isScopeLevelNotApplicable([sentinel])).toBe(true);
    expect(isScopeLevelNotApplicable(["Carbon price", sentinel])).toBe(true);
  });

  it("does not match real values or other absences", () => {
    expect(isScopeLevelNotApplicable("No information")).toBe(false);
    expect(isScopeLevelNotApplicable("Not Applicable")).toBe(false);
    expect(isScopeLevelNotApplicable(["Carbon price", "None"])).toBe(false);
    expect(isScopeLevelNotApplicable(undefined)).toBe(false);
  });
});

describe("isForbiddenKeyFeatureSector", () => {
  it("forbids Electrification of Power", () => {
    expect(isForbiddenKeyFeatureSector("electrification", "Power")).toBe(true);
  });

  it("allows Electrification of other sectors, including across sectors", () => {
    expect(isForbiddenKeyFeatureSector("electrification", "Buildings")).toBe(
      false,
    );
    expect(isForbiddenKeyFeatureSector("electrification", ACROSS_SECTORS)).toBe(
      false,
    );
  });

  it("allows every other field for Power", () => {
    expect(isForbiddenKeyFeatureSector("emissionsTrajectory", "Power")).toBe(
      false,
    );
  });
});
