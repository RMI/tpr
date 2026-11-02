import { describe, it, expect } from "vitest";
import {
  validateDataCollect,
  validateFilesBySchema,
  FileEntry,
} from "./validateData";
import pathwayMetadata from "../schema/pathwayMetadata.v2.json" with { type: "json" };
import pathwayTimeseries from "../schema/pathwayTimeseries.v2.json" with { type: "json" };
import { commonSchemas } from "../schema/common";

function ok(entry: FileEntry | FileEntry[]) {
  const arr = Array.isArray(entry) ? entry : [entry];
  const { valid, invalid } = validateDataCollect(
    arr,
    pathwayMetadata,
    commonSchemas,
  );
  expect(valid.length).toBeGreaterThan(0);
  expect(invalid.length).toBe(0);
}

function fail(entry: FileEntry | FileEntry[], rx?: RegExp | string) {
  const arr = Array.isArray(entry) ? entry : [entry];
  const rawValidation = validateDataCollect(
    arr,
    pathwayMetadata,
    commonSchemas,
  );
  const invalid = rawValidation.invalid;
  expect(invalid.length).toBeGreaterThan(0);
  if (rx) {
    const messages = invalid.flatMap((p) => p.errors).join("\n");
    expect(messages).toMatch(rx);
  }
}

import basePathway from "../../testdata/valid/pathwayMetadata_standard.json" assert { type: "json" };
import v2Full from "../../testdata/valid/pathwayMetadata_v2_full.json" assert { type: "json" };
import v2Minimal from "../../testdata/valid/pathwayMetadata_v2_minimal.json" assert { type: "json" };

describe("pathway schema enforces expected limits", () => {
  it("accepts a valid object", () => {
    ok({ name: "ok.json", data: basePathway });
  });

  it("fails when field is wrong type", () => {
    fail(
      {
        name: "start.json",
        data: {
          ...basePathway,
          modelYearStart: "1950" as string, // should be a number
        },
      },
      /modelYearStart/,
    );
  });

  it("accepts boundaries", () => {
    ok({
      name: "bounds.json",
      data: {
        ...basePathway,
        modelYearStart: 1900,
        modelYearEnd: 2100,
        modelYearNetzero: 2030,
        modelTempIncrease: 0.5, // min
        geography: { regions: { "Europe and Central Asia": ["DE", "FR"] } },
      },
    });
  });

  it("accepts multiple items & unique geography", () => {
    ok([
      {
        name: "multi.json",
        data: { ...basePathway },
      },
      {
        name: "multi.json",
        data: {
          ...basePathway,
          id: "scn-2",
          name: { full: "Other" },
          geography: {
            global: true,
            regions: { "Europe and Central Asia": ["DE", "FR"] },
          },
        },
      },
    ]);
  });

  it("fails on invalid pathwayType enum", () => {
    fail(
      {
        name: "pathwayType.json",
        data: { ...basePathway, pathwayType: "Wrong" },
      },
      /pathwayType/,
    );
  });

  it("enforces maxLength for short strings", () => {
    const long = "x".repeat(201);
    fail(
      {
        name: "maxlength.json",
        data: { ...basePathway, name: { full: long } },
      },
      /name\/full must NOT have more than 200 characters/,
    );
  });

  it("enforces maxLength for short strings", () => {
    const long = "x".repeat(201);
    fail(
      {
        name: "maxlength.json",
        data: { ...basePathway, name: { short: long } },
      },
      /name\/short must NOT have more than 20 characters/,
    );
  });

  it("fails when modelYearStart < 1900", () => {
    fail(
      {
        name: "start.json",
        data: { ...basePathway, modelYearStart: 1899 },
      },
      /modelYearStart/,
    );
  });

  it("fails when modelYearEnd > 2100", () => {
    fail(
      {
        name: "end.json",
        data: { ...basePathway, modelYearEnd: 2101 },
      },
      /modelYearEnd/,
    );
  });

  it("fails when modelYearNetzero present but < 2030", () => {
    fail(
      {
        name: "netzero.json",
        data: { ...basePathway, modelYearNetzero: 2029 },
      },
      /modelYearNetzero/,
    );
  });

  it("fails when modelTempIncrease not multiple of 0.1", () => {
    fail(
      {
        name: "temp.json",
        data: { ...basePathway, modelTempIncrease: 0.55 },
      },
      /multiple of/,
    );
  });

  it("fails when geography country has duplicates (uniqueItems)", () => {
    fail(
      {
        name: "geography.json",
        data: { ...basePathway, geography: { country: ["CN", "CN"] } },
      },
      /must NOT have duplicate items/,
    );
  });

  it("fails on a non-ISO-3166 country code", () => {
    // "EU" is a valid 2-letter string but not a country → not in the enum.
    fail(
      {
        name: "geography.json",
        data: { ...basePathway, geography: { country: ["EU"] } },
      },
      /allowed values/,
    );
  });

  it("fails on a 3-letter country code", () => {
    // ISO-3166 alpha-3 (e.g. "USA") must be rejected; only alpha-2 is accepted.
    fail(
      {
        name: "geography.json",
        data: { ...basePathway, geography: { country: ["USA"] } },
      },
      /allowed values/,
    );
  });

  it("fails on unknown geography keys (additionalProperties: false)", () => {
    fail(
      {
        name: "geography.json",
        data: { ...basePathway, geography: { global: true, foo: true } },
      },
      /must NOT have additional properties/,
    );
  });

  it("fails on an empty region label", () => {
    // Region keys must be non-empty, non-whitespace strings (propertyNames).
    fail({
      name: "geography.json",
      data: { ...basePathway, geography: { regions: { "": ["US"] } } },
    });
  });

  it("fails on a one-member region: one country code is a country (#998)", () => {
    // `Japan: [JP]` is the country JP, and belongs in `country`.
    const geography = { regions: { Japan: ["JP"] } };
    fail(
      { name: "geography.json", data: { ...basePathway, geography } },
      /regions\/Japan must NOT have fewer than 2 items/,
    );
  });

  it("fails on a region with no members", () => {
    fail(
      {
        name: "geography.json",
        data: { ...basePathway, geography: { regions: { Atlantis: [] } } },
      },
      /regions\/Atlantis must NOT have fewer than 2 items/,
    );
  });

  it("fails when sectors item missing required fields", () => {
    fail(
      {
        name: "sectors.json",
        data: {
          ...basePathway,
          sectors: [{ name: "Power" }], // missing technologies
        },
      },
      /required.*technologies/i,
    );
  });

  it("fails when unknown sector name", () => {
    fail(
      {
        name: "sector-name.json",
        data: {
          ...basePathway,
          sectors: [{ name: "Yak Shaving", technologies: ["Other"] }],
        },
      },
      /must be equal to one of the allowed values/,
    );
  });

  it("fails when technology not in enum", () => {
    fail(
      {
        name: "tech.json",
        data: {
          ...basePathway,
          sectors: [{ name: "Power", technologies: ["Cold Fusion"] }],
        },
      },
      /must be equal to one of the allowed values/,
    );
  });

  it("fails on extra unknown top-level property", () => {
    fail(
      {
        name: "extra-top.json",
        data: { ...basePathway, foobar: 1 },
      },
      /must NOT have additional properties/,
    );
  });

  it("fails on extra property inside sectors[*] object", () => {
    fail(
      {
        name: "extra-sector.json",
        data: {
          ...basePathway,
          sectors: [{ name: "Power", technologies: ["Solar"], foobar: 1 }],
        },
      },
      /must NOT have additional properties/,
    );
  });
});

describe("v2 documents (#858)", () => {
  const v2Entry: FileEntry = { name: "v2.json", data: v2Full };
  const v2MinEntry: FileEntry = { name: "v2-min.json", data: v2Minimal };

  it("validates v2 documents, including all-empty keyFeatures", () => {
    const { valid, invalid } = validateDataCollect(
      [v2Entry, v2MinEntry],
      pathwayMetadata,
      commonSchemas,
    );
    expect(invalid).toHaveLength(0);
    expect(valid).toHaveLength(2);
  });

  it("accepts a declared three-letter region label as a scope token", () => {
    // The cookbook says to keep a multi-country region's label exactly as the
    // publication writes it, and model regions are often three letters --
    // REMIND's SSA, LAM, EUR. scopeGeography.v2 used to reject every
    // three-letter token, so a pathway could declare `SSA` but never scope a
    // value or an availability row to it.
    const doc = structuredClone(v2Full) as typeof v2Full & {
      geography: { regions: Record<string, string[]> };
    };
    doc.geography.regions.SSA = ["NG", "KE", "ZA"];
    doc.keyFeatures.emissionsTrajectory.push({
      sector: "Power",
      geography: "SSA",
      value: "Minor decrease",
    });
    doc.dataAvailability.byMetric[0].geography.push("SSA");
    const { valid, invalid } = validateDataCollect(
      [{ name: "ssa.json", data: doc }],
      pathwayMetadata,
      commonSchemas,
    );
    expect(invalid.flatMap((p) => p.errors)).toEqual([]);
    expect(valid).toHaveLength(1);
  });

  it("rejects an unscoped (v1-style) scalar keyFeatures value", () => {
    fail(
      {
        name: "scalar-keyfeature.json",
        data: {
          ...v2Full,
          keyFeatures: {
            ...v2Full.keyFeatures,
            emissionsTrajectory: "Minor decrease",
          },
        },
      },
      /keyFeatures/,
    );
  });

  it("rejects a document that still carries the removed overview fields", () => {
    fail(
      {
        name: "expert-overview-in-v2.json",
        data: { ...v2Full, expertOverview: "Should not be here." },
      },
      /must NOT have additional properties/,
    );
  });
});

describe("a retired v1 document (#981)", () => {
  // The schema set scripts/schema-check-files.ts preloads. With no v1 schema in
  // it, a v1 `$schema` is a hard failure there rather than a silent skip.
  const SCHEMA_CHECK_SCHEMAS = [
    pathwayMetadata,
    pathwayTimeseries,
    ...commonSchemas,
  ];

  it.each([
    "http://pathways.rmi.org/schema/pathwayMetadata.v1.json",
    "http://pathways.rmi.org/schema/pathwayTimeseries.v1.json",
  ])("is invalid under schema:check: %s", ($schema) => {
    const { valid, invalid } = validateFilesBySchema(
      [{ name: "v1.json", data: { ...v2Minimal, $schema } }],
      SCHEMA_CHECK_SCHEMAS,
    );
    expect(valid).toEqual([]);
    expect(invalid.flatMap((p) => p.errors)).toEqual([
      `no schema preloaded for $schema "${$schema}"`,
    ]);
  });
});

describe("v2 enforces its own required fields (#858)", () => {
  // `coreDrivers` and `dependencies` matter most: they are new in v2, so they
  // are the fields most likely to be omitted when authoring by hand.
  const V2_REQ = [
    "id",
    "name",
    "description",
    "publication",
    "pathwayType",
    "geography",
    "sectors",
    "pathwayDescription",
    "metric",
    "keyFeatures",
    "coreDrivers",
    "dependencies",
  ];

  for (const key of V2_REQ) {
    it(`fails when required property '${key}' is missing`, () => {
      const rest: Record<string, unknown> = { ...v2Full };
      delete rest[key];
      fail({ name: "missing.json", data: rest }, new RegExp(key));
    });
  }

  it("accepts a null pathwayDescription, but not a missing one", () => {
    // Nullable-but-required: "we have no description" is authored explicitly,
    // which is the same distinction #858 draws for coreDrivers and keyFeatures.
    const { invalid } = validateDataCollect(
      [
        {
          name: "null-desc.json",
          data: { ...v2Full, pathwayDescription: null },
        },
      ],
      pathwayMetadata,
      commonSchemas,
    );
    expect(invalid).toHaveLength(0);
  });

  it("requires every one of the 7 coreDrivers keys, nullable though they are", () => {
    const { coreDrivers } = v2Full as unknown as {
      coreDrivers: Record<string, unknown>;
    };
    for (const key of Object.keys(coreDrivers)) {
      const partial = { ...coreDrivers };
      delete partial[key];
      fail(
        {
          name: `missing-driver-${key}.json`,
          data: { ...v2Full, coreDrivers: partial },
        },
        new RegExp(key),
      );
    }
  });

  it("rejects an unknown coreDrivers key", () => {
    fail(
      {
        name: "extra-driver.json",
        data: {
          ...v2Full,
          coreDrivers: {
            ...(v2Full as unknown as { coreDrivers: object }).coreDrivers,
            madeUpDriver: "Nope.",
          },
        },
      },
      /must NOT have additional properties/,
    );
  });

  it("rejects a dependency scoped to an unknown sector", () => {
    fail(
      {
        name: "bad-dep-sector.json",
        data: {
          ...v2Full,
          dependencies: [
            {
              dependency_name: "Technology",
              dependency_description: "Needs something.",
              sector: "Yak Shaving",
              evidence_type: "Qualitative",
            },
          ],
        },
      },
      /allowed values/,
    );
  });

  it("rejects an unknown dependency_name or evidence_type", () => {
    const base = {
      dependency_name: "Technology",
      dependency_description: "Needs something.",
      sector: "Power",
      evidence_type: "Qualitative",
    };
    fail(
      {
        name: "bad-dep-name.json",
        data: {
          ...v2Full,
          dependencies: [{ ...base, dependency_name: "Vibes" }],
        },
      },
      /allowed values/,
    );
    fail(
      {
        name: "bad-evidence.json",
        data: {
          ...v2Full,
          dependencies: [{ ...base, evidence_type: "Hearsay" }],
        },
      },
      /allowed values/,
    );
  });
});
