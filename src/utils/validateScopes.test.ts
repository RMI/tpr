import { describe, it, expect } from "vitest";
import { validateScopedEntries } from "./validateScopes";
import type { PathwayMetadataV2 } from "../types";

/**
 * These cover the cross-field constraint that JSON Schema draft-07 cannot express
 * (see validateScopes.ts). AJV already guarantees the shape, so the fixtures here
 * only need the fields the check actually reads — hence the casts.
 */
function pathway(over: Partial<PathwayMetadataV2>): PathwayMetadataV2 {
  return {
    sectors: [
      { name: "Power", technologies: [] },
      { name: "Steel", technologies: [] },
    ],
    geography: {
      regions: { "South East Asia": ["TH", "VN"] },
      country: ["SG"],
    },
    keyFeatures: {},
    dependencies: [],
    ...over,
  } as unknown as PathwayMetadataV2;
}

function entry(sector: string, geography: string) {
  return { sector, geography, value: "No information" };
}

describe("validateScopedEntries — sector axis", () => {
  it("accepts a sector the pathway declares", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Power", "Global")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("accepts the cross-sector sentinel", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("cross-sector", "Global")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("rejects a sector the pathway does not declare", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Cement", "Global")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/keyFeatures/emissionsTrajectory/0/sector");
    expect(errors[0]).toContain('"Cement"');
  });

  it("accepts cross-sector on a single-sector pathway (documented non-check)", () => {
    const errors = validateScopedEntries(
      pathway({
        sectors: [{ name: "Power", technologies: [] }],
        keyFeatures: {
          emissionsTrajectory: [entry("cross-sector", "Global")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });
});

describe("validateScopedEntries — geography axis", () => {
  it.each(["Global", "cross-region", "South East Asia", "SG", "TH"])(
    "accepts %s",
    (geography) => {
      const errors = validateScopedEntries(
        pathway({
          keyFeatures: {
            emissionsTrajectory: [entry("Power", geography)],
          } as unknown as PathwayMetadataV2["keyFeatures"],
        }),
      );
      expect(errors).toEqual([]);
    },
  );

  it("accepts a country reached only through a declared region", () => {
    // The pathway declares "South East Asia": ["TH","VN"] but no standalone VN,
    // so scoping to VN is *narrower* than the declaration, not outside it.
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Power", "VN")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("rejects a mistyped region label", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Power", "Souteast Asia")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/keyFeatures/emissionsTrajectory/0/geography");
    expect(errors[0]).toContain('"Souteast Asia"');
  });

  it("rejects a country the pathway does not cover", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Power", "DE")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"DE"');
  });
});

describe("validateScopedEntries — reporting", () => {
  it("reports both axes of a single bad entry, and indexes each entry", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [
            entry("Power", "Global"),
            entry("Cement", "Narnia"),
          ],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(2);
    expect(errors.every((e) => e.includes("/emissionsTrajectory/1/"))).toBe(true);
  });

  it("checks every keyFeatures field, not just the first", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Power", "Global")],
          policyAmbition: [entry("Cement", "Global")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/keyFeatures/policyAmbition/0/sector");
  });

  it("passes an empty entries array — absent at every scope is legal", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });
});

describe("validateScopedEntries — dependencies", () => {
  it("accepts a declared sector", () => {
    const errors = validateScopedEntries(
      pathway({
        dependencies: [
          {
            dependency_name: "Technology",
            dependency_description: "Needs grid upgrades.",
            sector: "Power",
            evidence_type: "Qualitative",
          },
        ] as unknown as PathwayMetadataV2["dependencies"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("rejects an undeclared sector", () => {
    const errors = validateScopedEntries(
      pathway({
        dependencies: [
          {
            dependency_name: "Technology",
            dependency_description: "Needs grid upgrades.",
            sector: "Aviation",
            evidence_type: "Qualitative",
          },
        ] as unknown as PathwayMetadataV2["dependencies"],
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/dependencies/0/sector");
  });

  it("rejects the cross-sector sentinel, which is not legal here", () => {
    const errors = validateScopedEntries(
      pathway({
        dependencies: [
          {
            dependency_name: "Technology",
            dependency_description: "Needs grid upgrades.",
            sector: "cross-sector",
            evidence_type: "Qualitative",
          },
        ] as unknown as PathwayMetadataV2["dependencies"],
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"cross-sector"');
  });
});
