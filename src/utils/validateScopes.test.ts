import { describe, it, expect } from "vitest";
import { validateScopedEntries } from "./validateScopes";
import type { PathwayMetadataV2 } from "../types";
import sectorSchema from "../schema/common/sector.v1.json" with { type: "json" };

const SECTOR_NAMES: string[] = sectorSchema.$defs.displayName.enum;

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
          emissionsTrajectory: [entry("Power", "South East Asia")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("accepts the cross-sector sentinel", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("cross-sector", "South East Asia")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("rejects a sector the pathway does not declare", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Cement", "South East Asia")],
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
          emissionsTrajectory: [entry("cross-sector", "South East Asia")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });
});

describe("validateScopedEntries — geography axis", () => {
  it.each(["cross-region", "South East Asia", "SG", "TH"])(
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

  it("accepts Global only when the pathway actually is global", () => {
    const globalPathway = pathway({
      geography: { global: true, regions: { "South East Asia": ["TH"] } },
    });
    expect(
      validateScopedEntries({
        ...globalPathway,
        keyFeatures: {
          emissionsTrajectory: [entry("Power", "Global")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    ).toEqual([]);
  });

  it("rejects Global on a pathway that does not set geography.global", () => {
    // A South-East-Asia-only pathway carrying a global-scoped value would be
    // describing coverage it never claims. #858's "or the widest sentinel"
    // wording allows it read literally; that defeats the point of the check.
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Power", "Global")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"Global"');
  });

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
            entry("Power", "South East Asia"),
            entry("Cement", "Narnia"),
          ],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(2);
    expect(errors.every((e) => e.includes("/emissionsTrajectory/1/"))).toBe(
      true,
    );
  });

  it("checks every keyFeatures field, not just the first", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [entry("Power", "South East Asia")],
          policyAmbition: [entry("Cement", "South East Asia")],
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

describe("validateScopedEntries — one value per scope", () => {
  const dup = (geography: string, value: string) => ({
    sector: "Power",
    geography,
    value,
  });

  it("rejects two entries at the same scope with different values", () => {
    // uniqueItems compares whole entries, so these are "unique" to the schema.
    // Left unchecked, the resolver displays one while search matches both.
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [
            dup("South East Asia", "Significant decrease"),
            dup("South East Asia", "Minor increase"),
          ],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/keyFeatures/emissionsTrajectory/1");
    expect(errors[0]).toContain("duplicates the scope of");
    // Names the entry it collides with, so the fix is obvious in a long list.
    expect(errors[0]).toContain("/keyFeatures/emissionsTrajectory/0");
  });

  it("accepts the same value at genuinely different scopes", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [
            dup("South East Asia", "Significant decrease"),
            dup("SG", "Significant decrease"),
          ],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("distinguishes scopes that differ only by sector", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [
            { sector: "Power", geography: "SG", value: "Minor increase" },
            { sector: "Steel", geography: "SG", value: "Minor decrease" },
          ],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("reports every repeat, not just the second", () => {
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [
            dup("SG", "Significant decrease"),
            dup("SG", "Minor increase"),
            dup("SG", "Low or no change"),
          ],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toHaveLength(2);
    // Both point back at index 0 rather than chaining 1->2.
    expect(errors.every((e) => e.includes("emissionsTrajectory/0"))).toBe(true);
  });

  it("scopes the check per field, not across the whole object", () => {
    // The same (sector, geography) in two different fields is normal.
    const errors = validateScopedEntries(
      pathway({
        keyFeatures: {
          emissionsTrajectory: [dup("SG", "Significant decrease")],
          policyAmbition: [dup("SG", "High ambition policies")],
        } as unknown as PathwayMetadataV2["keyFeatures"],
      }),
    );
    expect(errors).toEqual([]);
  });

  it("does not confuse scopes whose parts concatenate alike", () => {
    // Guards the composite key: "A" + "BC" must not collide with "AB" + "C".
    const errors = validateScopedEntries(
      pathway({
        sectors: [{ name: "Power", technologies: [] }],
        geography: { regions: { "Power SG": ["SG"] }, country: ["SG"] },
        keyFeatures: {
          emissionsTrajectory: [
            { sector: "Power", geography: "SG", value: "Minor increase" },
            { sector: "Power", geography: "Power SG", value: "Minor decrease" },
          ],
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

describe("validateScopedEntries — technologies belong to their sector (#461)", () => {
  const withSectors = (sectors: unknown) =>
    validateScopedEntries(
      pathway({ sectors: sectors as PathwayMetadataV2["sectors"] }),
    );

  it("accepts technologies the sector lists", () => {
    expect(
      withSectors([{ name: "Power", technologies: ["Solar", "Wind", "Coal"] }]),
    ).toEqual([]);
  });

  it("accepts every technology Power defines", () => {
    expect(
      withSectors([
        {
          name: "Power",
          technologies: [
            "Biomass",
            "Coal",
            "Gas",
            "Hydro",
            "Nuclear",
            "Oil",
            "Other",
            "Renewables",
            "Solar",
            "Wind",
          ],
        },
      ]),
    ).toEqual([]);
  });

  it("rejects a technology outside its sector's list, naming the value", () => {
    const errors = withSectors([
      { name: "Power", technologies: ["Solar", "Hydrogen Use"] },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/sectors/0/technologies/1");
    expect(errors[0]).toContain('"Hydrogen Use"');
    expect(errors[0]).toContain('"Power"');
  });

  it("accepts an empty list for every sector the schema allows", () => {
    // The legal state for the 14 sectors whose technologies are not defined yet,
    // and what all four TransitionZero pathways carry today.
    for (const name of SECTOR_NAMES) {
      expect(withSectors([{ name, technologies: [] }])).toEqual([]);
    }
  });

  it("rejects a non-empty list on a sector with no definition", () => {
    // Closed by default. Passing this through would mean the next data round
    // populates a sector's technologies and nothing checks them.
    const errors = withSectors([
      { name: "Steel", technologies: ["Hydrogen Use"] },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/sectors/0/technologies");
    expect(errors[0]).toContain('"Steel"');
  });

  it("names the fix, since the offending data may well be correct", () => {
    // The likeliest cause is a sector whose taxonomy nobody has written down
    // yet, so the message has to say where to write it.
    const errors = withSectors([
      { name: "Cement", technologies: ["Carbon Capture and Storage"] },
    ]);
    expect(errors[0]).toContain("SECTORS_BY_KEY");
    expect(errors[0]).toContain("timeseriesTaxonomy.ts");
    expect(errors[0]).toContain('"Carbon Capture and Storage"');
  });

  it("reports one error per undefined sector, not one per technology", () => {
    // The fix is a single edit -- define the sector -- so listing its
    // technologies individually would be noise.
    const errors = withSectors([
      { name: "Steel", technologies: ["Hydrogen Use", "Electrification"] },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"Electrification"');
    expect(errors[0]).toContain('"Hydrogen Use"');
  });

  it("indexes each sector, and checks them all", () => {
    const errors = withSectors([
      { name: "Power", technologies: ["Solar"] },
      { name: "Steel", technologies: ["Hydrogen Use"] },
      { name: "Cement", technologies: [] },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/sectors/1/technologies");
  });

  it("passes a pathway with no sectors at all", () => {
    // AJV does not require `sectors`, so the check must not assume it is there.
    expect(withSectors(undefined)).toEqual([]);
  });
});

describe("validateScopedEntries — dataAvailability rows (#870)", () => {
  /** A row that passes every check, for tests to vary one field of. */
  const ROW = {
    metricName: "Capacity",
    sector: "Power",
    sectorSegment: "Power generation",
    geography: "South East Asia",
    geographyCoverage: "Regional",
    timeResolution: "1-year",
    dataFormat: "In tool",
    access: null,
    granularity: ["Solar"],
    scopeLimitations: null,
  };

  const withRows = (rows: unknown[], over: Record<string, unknown> = {}) =>
    validateScopedEntries(
      pathway({
        metric: ["Capacity", "Generation"],
        dataAvailability: { overall: null, byMetric: rows },
        ...over,
      } as unknown as Partial<PathwayMetadataV2>),
    );

  const row = (over: Record<string, unknown> = {}) => ({ ...ROW, ...over });

  it("accepts a row that satisfies every check", () => {
    expect(withRows([row()])).toEqual([]);
  });

  it("passes a pathway with no dataAvailability at all", () => {
    // Optional field: authoring is incremental, so absence is not a defect.
    expect(validateScopedEntries(pathway({}))).toEqual([]);
  });

  it("passes an empty byMetric array", () => {
    expect(withRows([])).toEqual([]);
  });

  it("rejects a sector the pathway does not declare", () => {
    const errors = withRows([row({ sector: "Cement" })]);
    expect(
      errors.some((e) => e.includes("/sector") && e.includes('"Cement"')),
    ).toBe(true);
  });

  it("rejects a geography the pathway does not cover", () => {
    const errors = withRows([row({ geography: "Narnia" })]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/dataAvailability/byMetric/0/geography");
    expect(errors[0]).toContain('"Narnia"');
  });

  it("rejects a metric the pathway does not report", () => {
    // The likeliest typo of all: `metric` and `dataAvailability` are authored
    // separately, so they drift.
    const errors = withRows([row({ metricName: "Absolute Emissions" })]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/metricName");
    expect(errors[0]).toContain('"Absolute Emissions"');
    expect(errors[0]).toContain("is not a metric this pathway reports");
  });

  it("rejects a metric that is not the sector's, naming the value", () => {
    // Reached directly here: in production AJV rejects a non-enum metricName
    // first, and Power currently defines all five members of that enum, so this
    // path only becomes live for real data once a second sector defines metrics.
    const errors = withRows([row({ metricName: "Water Use" })], {
      metric: ["Water Use"],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("is not a metric of sector");
    expect(errors[0]).toContain('"Water Use"');
  });

  it("accepts a metric under a sector whose metrics are undefined", () => {
    // Steel has no metric list. Rejecting here would make dataAvailability
    // unauthorable for 14 of 15 sectors while adding no safety, since the
    // metric is still checked against the pathway's own `metric` array.
    expect(
      withRows([
        row({
          sector: "Steel",
          sectorSegment: "No information",
          granularity: null,
        }),
      ]),
    ).toEqual([]);
  });

  it("rejects a named segment under a sector with no segments defined", () => {
    const errors = withRows([
      row({ sector: "Steel", sectorSegment: "Storage", granularity: null }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/sectorSegment");
    expect(errors[0]).toContain('"Storage"');
    // Names the one segment that is legal, and how to define the rest.
    expect(errors[0]).toContain('"No information"');
    expect(errors[0]).toContain("SECTORS_BY_KEY");
  });

  it("accepts the No information segment under any sector", () => {
    expect(withRows([row({ sectorSegment: "No information" })])).toEqual([]);
  });

  it("rejects granularity that is not a technology of the sector", () => {
    const errors = withRows([row({ granularity: ["Solar", "Hydrogen Use"] })]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/granularity/1");
    expect(errors[0]).toContain('"Hydrogen Use"');
  });

  it("rejects granularity on a sector with no technologies defined", () => {
    const errors = withRows([
      row({
        sector: "Steel",
        sectorSegment: "No information",
        granularity: ["Solar"],
      }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("no technologies are defined");
  });

  it("accepts null granularity — a metric need not be broken down", () => {
    expect(withRows([row({ granularity: null })])).toEqual([]);
  });

  it("rejects a paywall on data we host ourselves", () => {
    const errors = withRows([
      row({ dataFormat: "In tool", access: "Paywalled" }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/access");
    expect(errors[0]).toContain("we host this data");
  });

  it("rejects a null access on data held at the publisher", () => {
    const errors = withRows([
      row({ dataFormat: "Text in publication", access: null }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/access");
    expect(errors[0]).toContain('"Free" or "Paywalled"');
  });

  it("accepts both publisher access values", () => {
    for (const access of ["Free", "Paywalled"]) {
      expect(
        withRows([row({ dataFormat: "Tabular in publication", access })]),
      ).toEqual([]);
    }
  });

  it("rejects two rows at the same scope", () => {
    // uniqueItems permits these: they agree on the scope and differ elsewhere,
    // so the schema sees two distinct entries. The table has one cell to render
    // them in.
    const errors = withRows([
      row(),
      row({ timeResolution: "5-year", granularity: null }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/dataAvailability/byMetric/1");
    expect(errors[0]).toContain("duplicates the scope of");
    expect(errors[0]).toContain("/dataAvailability/byMetric/0");
  });

  it.each([
    ["metric", { metricName: "Generation" }],
    ["segment", { sectorSegment: "Storage" }],
    ["geography", { geography: "SG" }],
    [
      "sector",
      { sector: "Steel", sectorSegment: "No information", granularity: null },
    ],
  ])("treats rows differing only by %s as distinct scopes", (_axis, over) => {
    expect(withRows([row(), row(over)])).toEqual([]);
  });

  it("does not confuse scopes whose parts concatenate alike", () => {
    // Guards the NUL-joined key the same way the keyFeatures test does.
    expect(
      withRows([
        row({ sectorSegment: "Power generation", geography: "SG" }),
        row({ sectorSegment: "No information", geography: "SG" }),
      ]),
    ).toEqual([]);
  });

  it("indexes each row, and checks them all", () => {
    const errors = withRows([row(), row({ geography: "Narnia" })]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/byMetric/1/geography");
  });

  it("reports every failing check on one row", () => {
    const errors = withRows([
      row({ sector: "Cement", geography: "Narnia", access: "Free" }),
    ]);
    // undeclared sector, unresolvable geography, granularity under an undefined
    // sector, and a paywall on hosted data.
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(errors.every((e) => e.includes("/byMetric/0"))).toBe(true);
  });
});
