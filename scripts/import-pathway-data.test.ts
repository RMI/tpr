import { describe, it, expect } from "vitest";
import {
  Report,
  publisherGroup,
  scenarioParts,
  canonicalKey,
  matchEnum,
  normalizeSector,
  splitList,
  ensurePeriod,
  isAbsent,
  resolveGeography,
  buildGeography,
  TARGETS,
  parseSegments,
  parseCoverage,
  parseGranularity,
  buildDataAvailability,
  descriptionFromV1,
  keyFeaturesFromV1,
} from "./import-pathway-data.ts";

describe("publisherGroup", () => {
  it("maps each sheet's spelling to one group", () => {
    expect(publisherGroup("International Energy Agency (IEA)")).toBe("IEA");
    expect(publisherGroup("ASEAN Centre for Energy (ACE)")).toBe("ACE");
    expect(publisherGroup("ACE")).toBe("ACE");
    // AGF must win over the SDSN check even though both live under un-sdsn-cw.
    expect(publisherGroup("ASEAN Green Future (AGF)")).toBe("AGF");
    expect(publisherGroup("UN SDSN, CW")).toBe("SDSN");
    expect(publisherGroup("Some Unknown Org")).toBeNull();
  });
});

describe("scenarioParts", () => {
  it("reads the trailing (CODE) and [CC]", () => {
    expect(scenarioParts("Current Policies Scenario (CPS)")).toEqual({
      code: "CPS",
      country: "",
    });
    expect(
      scenarioParts("Optimised More Ambitious Pathway (OMAP) [MM]"),
    ).toEqual({ code: "OMAP", country: "MM" });
  });
  it("derives JRC codes from names with no parenthetical", () => {
    expect(scenarioParts("Reference scenario").code).toBe("REFERENCE");
    expect(scenarioParts("NDC-LTS scenario").code).toBe("NDC-LTS");
    expect(scenarioParts("1.5°C scenario").code).toBe("1.5C");
  });
});

describe("canonicalKey", () => {
  it("joins the sheets across their name/publisher variations", () => {
    // "State" vs "States" typo in the sub-sheets must not break the join.
    expect(
      canonicalKey("ACE", "ASEAN Member State Targets Scenario (ATS)"),
    ).toBe("ACE:ATS:");
    expect(
      canonicalKey(
        "ASEAN Centre for Energy (ACE)",
        "ASEAN Member States Targets Scenario (ATS)",
      ),
    ).toBe("ACE:ATS:");
    // Myanmar and Laos OMAP resolve to distinct keys.
    expect(
      canonicalKey(
        "ASEAN Green Future (AGF)",
        "Optimised More Ambitious Pathway (OMAP) [MM]",
      ),
    ).toBe("AGF:OMAP:MM");
    expect(
      canonicalKey(
        "ASEAN Green Future (AGF)",
        "Optimized More Ambitious Policy (OMAP)",
      ),
    ).toBe("AGF:OMAP:");
  });
});

describe("value normalization", () => {
  it("matches enums case-insensitively and fixes the 'Signifcant' typo", () => {
    const demand = ["Significant decrease", "Low or no change"];
    expect(matchEnum("Signifcant Decrease", demand)).toBe(
      "Significant decrease",
    );
    expect(matchEnum("carbon price", ["Carbon price"])).toBe("Carbon price");
    expect(matchEnum("nonsense", demand)).toBeNull();
  });
  it("treats only NULL / n/a / blank as absent", () => {
    expect(isAbsent("NULL")).toBe(true);
    expect(isAbsent("n/a")).toBe(true);
    expect(isAbsent("")).toBe(true);
    expect(isAbsent("   ")).toBe(true);
    expect(isAbsent("No information")).toBe(false);
  });

  it("does not treat the scope sentinels as absent", () => {
    // Cookbook decision 0023 made these authored values, and #858 added them to
    // the schema. They used to be swallowed here, which discarded the very
    // distinction they exist to draw: an explicit value terminates #869's
    // fallback chain where an absent entry keeps broadening.
    expect(isAbsent("Not applicable at this scope level")).toBe(false);
    expect(isAbsent("Not Applicable")).toBe(false);
  });

  it("reports a pre-0023 spelling rather than hiding it", () => {
    // Not absent, and not an enum member either, so it lands in the importer's
    // badValues report -- which is what names the cells still to correct in the
    // workbook. Previously it disappeared silently.
    for (const retired of [
      "Not available at this scope",
      "Not applicable at that scope level",
    ]) {
      expect(isAbsent(retired)).toBe(false);
      expect(matchEnum(retired, ["Not applicable at this scope level"])).toBe(
        null,
      );
    }
  });
  it("ensures a trailing period and splits mixed-delimiter lists", () => {
    expect(ensurePeriod("foo")).toBe("foo.");
    expect(ensurePeriod("foo.")).toBe("foo.");
    expect(splitList("Carbon price; Subsidies, performance standards")).toEqual(
      ["Carbon price", "Subsidies", "performance standards"],
    );
    expect(normalizeSector("power")).toBe("Power");
    expect(normalizeSector("nope")).toBeNull();
  });
});

describe("buildGeography", () => {
  it("parses the Regions cell, dropping non-ISO codes", () => {
    const report = new Report();
    const geo = buildGeography(
      "Global; Africa: [DZ, EG, XK]; PH",
      report,
      "TEST",
    );
    expect(geo?.global).toBe(true);
    expect(geo?.regions?.Africa).toEqual(["DZ", "EG"]); // XK dropped
    expect(geo?.country).toEqual(["PH"]);
    expect(report.lines.some((l) => l.includes("XK"))).toBe(true);
  });
  it("resolves geography tokens against declared coverage, ignoring punctuation", () => {
    const allowed = new Set(["Rest Sub-Saharan Africa", "TH", "Global"]);
    expect(resolveGeography("Rest Sub Saharan Africa", allowed)).toBe(
      "Rest Sub-Saharan Africa",
    );
    expect(resolveGeography("th", allowed)).toBe("TH");
    expect(resolveGeography("EFTA", allowed)).toBeNull();
  });
  it("reads `LA: [LA]` as the country it is, not a region named after it", () => {
    // The cookbook's mandated notation for an individually projected country.
    // Read as a region, every single-country pathway became a pseudo-region --
    // except Thailand, whose cell is written bare.
    const geo = buildGeography("LA: [LA]", new Report(), "TEST");
    expect(geo?.country).toEqual(["LA"]);
    expect(geo?.regions).toBeUndefined();
    // A real region, and a region whose label is a code but has several
    // members, stay regions.
    const multi = buildGeography(
      "ASEAN: [TH, VN]; EU: [FR, DE]",
      new Report(),
      "T",
    );
    expect(Object.keys(multi?.regions ?? {})).toEqual(["ASEAN", "EU"]);
    expect(multi?.country).toBeUndefined();
  });
});

describe("TARGETS", () => {
  it("matches every row of the current workbook's renamed SDSN spellings", () => {
    // The workbook now writes the Myanmar/Laos pathways as "UN SDSN, CW" with
    // the country inside the code. Under the old "AGF:...:MM" keys all seven
    // silently stopped matching, and the six Singapore files were never listed.
    for (const name of [
      "Existing Policies Pathway (EPP MM)",
      "Optimised More Ambitious Pathway (OMAP MM)",
      "Optimized More Ambitious Policy Scenario (OMAP LA)",
      "Existing Policy Scenario (EP LA)",
      "Baseline Scenario (BAS SG)",
      "Highly Ambitious Scenario 2 Simulated (HA2S SG)",
    ]) {
      const key = canonicalKey("UN SDSN, CW", name);
      expect(key && TARGETS[key], `${name} -> ${key}`).toBeTruthy();
    }
  });
});

describe("descriptionFromV1", () => {
  const overview =
    "#### Pathway Description\n\nA pathway about Laos\n\n#### Core Drivers\n\nPrices.";
  it("takes the Pathway Description section of a v1 expertOverview", () => {
    const report = new Report();
    expect(descriptionFromV1({ expertOverview: overview }, report, "T")).toBe(
      "A pathway about Laos.",
    );
    expect(report.lines.some((l) => l.includes("taken from v1"))).toBe(true);
  });
  it("returns null when there is no v1 text to fall back on", () => {
    expect(descriptionFromV1({}, new Report(), "T")).toBeNull();
    expect(descriptionFromV1(null, new Report(), "T")).toBeNull();
  });
});

describe("keyFeaturesFromV1", () => {
  const v1 = {
    $schema: "http://pathways.rmi.org/schema/pathwayMetadata.v1.json",
    sectors: [{ name: "Power" }],
    geography: { country: ["PH"] },
    keyFeatures: {
      emissionsTrajectory: "Moderate increase",
      policyTypes: ["Carbon price", "Subsidies"],
    },
  };
  it("keeps a v1 file's authored values as widest-scope entries", () => {
    const report = new Report();
    const kf = keyFeaturesFromV1(v1, report, "T");
    expect(kf?.emissionsTrajectory).toEqual([
      { sector: "Power", geography: "PH", value: "Moderate increase" },
    ]);
    expect(kf?.policyTypes).toEqual([
      {
        sector: "Power",
        geography: "PH",
        value: ["Carbon price", "Subsidies"],
      },
    ]);
    expect(report.lines.some((l) => l.includes("converted from v1"))).toBe(
      true,
    );
  });
  it("leaves a v2 file to the workbook", () => {
    const v2 = {
      ...v1,
      $schema: "http://pathways.rmi.org/schema/pathwayMetadata.v2.json",
    };
    expect(keyFeaturesFromV1(v2, new Report(), "T")).toBeNull();
    expect(keyFeaturesFromV1(null, new Report(), "T")).toBeNull();
  });
});

describe("data-availability cell parsing", () => {
  it("unwraps `Sector: [..]` and splits segments on ; or ,", () => {
    const bad = new Set<string>();
    expect(
      parseSegments("Power: [Power generation, Energy storage]", "Power", bad),
    ).toEqual(["Power generation", "Energy storage"]);
    expect(
      parseSegments("power generation; Energy Storage", "Power", bad),
    ).toEqual(["Power generation", "Energy storage"]);
    expect(bad.size).toBe(0);
  });
  it("takes the label of `Label: [members]` coverage and normalises sentinel case", () => {
    const allowed = new Set(["SG", "ASEAN"]);
    const bad = new Set<string>();
    expect(parseCoverage("SG: [SG]", allowed, bad)).toEqual(["SG"]);
    expect(parseCoverage("Not Covered", allowed, bad)).toEqual(["Not covered"]);
    expect(parseCoverage("ASEAN; Atlantis", allowed, bad)).toEqual(["ASEAN"]);
    expect([...bad]).toEqual(['geography:"Atlantis"']);
  });
  it("does not split granularity values that contain commas", () => {
    const bad = new Set<string>();
    expect(parseGranularity("Capital costs, O&M, etc.", bad)).toEqual([
      "Capital costs, O&M, etc.",
    ]);
    expect(parseGranularity("Coal / Oil / Gas", bad)).toEqual([
      "Coal",
      "Oil",
      "Gas",
    ]);
    // A comma list is split only when every part is a known value.
    expect(parseGranularity("Coal, Solar", bad)).toEqual(["Coal", "Solar"]);
    expect(bad.size).toBe(0);
    parseGranularity("Coal, Moonbeams", bad);
    expect([...bad]).toEqual(['granularity:"Coal, Moonbeams"']);
  });
});

describe("buildDataAvailability", () => {
  const row = (over: Record<string, string> = {}) => ({
    "Sector": "Power",
    "Metric": "Capacity",
    "Sector segment": "Power generation",
    "Granularity": "Coal; Solar",
    "Scope limitations": "Grid-connected only.",
    "Geography coverage": "TH",
    "Time resolution": "5-year steps",
    "Data Format": "Tabular",
    ...over,
  });
  const build = (rows: Record<string, string>[], sectors = ["Power"]) => {
    const report = new Report();
    const out = buildDataAvailability(
      rows,
      new Set(sectors),
      new Set(["TH"]),
      report,
      "T",
    );
    return {
      out,
      notes: report.lines.join("\n"),
      errors: report.errors.join("\n"),
    };
  };

  it("emits a complete row with schema-cased values", () => {
    const { out } = build([row({ Metric: "absolute emissions" })]);
    expect(out?.overall).toBeNull();
    expect(out?.byMetric).toEqual([
      {
        metricName: "Absolute Emissions",
        sector: "Power",
        sectorSegment: ["Power generation"],
        geography: ["TH"],
        timeResolution: "5-year steps",
        dataFormat: "Tabular",
        granularity: ["Coal", "Solar"],
        scopeLimitations: "Grid-connected only.",
      },
    ]);
  });
  it("matches the metric against the row's own sector first", () => {
    // Power spells it "Absolute Emissions", Steel "Absolute emissions"; a flat
    // case-insensitive match would hand Steel the Power spelling.
    const { out } = build(
      [
        row({
          Sector: "Steel",
          Metric: "Absolute Emissions",
          Granularity: "Scope 1",
        }),
      ],
      ["Steel"],
    );
    expect(out?.byMetric[0].metricName).toBe("Absolute emissions");
  });
  it("reports a row with no Data Format as an error rather than inventing one", () => {
    const { out, errors } = build([
      row(),
      row({ "Metric": "Generation", "Data Format": "" }),
    ]);
    expect(out?.byMetric.map((r) => r.metricName)).toEqual(["Capacity"]);
    expect(errors).toContain(
      "T/dataAvailability Power Generation: blank or unrecognised data format",
    );
  });
  it("reports a row that is Not covered on some variables only as an error", () => {
    const { out, errors } = build([row({ "Data Format": "Not covered" })]);
    expect(out).toBeNull();
    expect(errors).toContain('"Not covered" on data format only');
  });
  it("keeps a row that is Not covered on every variable", () => {
    const nc = "Not covered";
    const { out, errors } = build([
      row({
        "Sector segment": nc,
        "Granularity": nc,
        "Scope limitations": nc,
        "Geography coverage": "Not Covered",
        "Time resolution": nc,
        "Data Format": nc,
      }),
    ]);
    expect(out?.byMetric).toHaveLength(1);
    expect(errors).toBe("");
  });
  it("returns null when the sheet has no rows for the pathway", () => {
    expect(build([]).out).toBeNull();
  });
});
