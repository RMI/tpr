import { describe, it, expect } from "vitest";
import {
  splitExpertOverview,
  widestScope,
  upgradeV1ToV2,
  PATHWAY_DESCRIPTION,
  CORE_DRIVERS,
  TRANSITION_ASSESSMENT,
} from "./codemod-v1-to-v2.ts";
import type { PathwayMetadataV1 } from "../src/types/pathwayMetadata.v1.d.ts";

const V2_ID = "http://pathways.rmi.org/schema/pathwayMetadata.v2.json";

const WELL_FORMED = [
  "#### Pathway Description",
  "",
  "A description of the pathway.",
  "",
  "#### Core Drivers",
  "",
  "*Policy:* Policies drive it.",
  "",
  "#### Application to Transition Assessment",
  "",
  "How to apply it.",
].join("\n");

/** ACE-CNS-2024's shape: the Core Drivers heading lost its `####` markers. */
const BARE_HEADING = [
  "#### Pathway Description",
  "",
  "A description of the pathway.",
  "",
  "Core Drivers",
  "",
  "*Policy:* Policies drive it.",
  "",
  "#### Application to Transition Assessment",
  "",
  "How to apply it.",
].join("\n");

describe("splitExpertOverview", () => {
  it("splits the three ATX-headed sections", () => {
    const s = splitExpertOverview(WELL_FORMED);
    expect(s.get(PATHWAY_DESCRIPTION)).toBe("A description of the pathway.");
    expect(s.get(CORE_DRIVERS)).toBe("*Policy:* Policies drive it.");
    expect(s.get(TRANSITION_ASSESSMENT)).toBe("How to apply it.");
  });

  it("treats a bare section title as a heading (the ACE-CNS case)", () => {
    const s = splitExpertOverview(BARE_HEADING);
    // Without the tolerance, Core Drivers prose would land in the description
    // and push it over the 2500-char limit.
    expect(s.get(PATHWAY_DESCRIPTION)).toBe("A description of the pathway.");
    expect(s.get(CORE_DRIVERS)).toBe("*Policy:* Policies drive it.");
  });

  it("does not treat a title mentioned mid-sentence as a heading", () => {
    const s = splitExpertOverview(
      [
        "#### Pathway Description",
        "",
        "The Core Drivers of this pathway are policy-led.",
      ].join("\n"),
    );
    expect(s.get(PATHWAY_DESCRIPTION)).toBe(
      "The Core Drivers of this pathway are policy-led.",
    );
    expect(s.has(CORE_DRIVERS)).toBe(false);
  });

  it("preserves markdown inside a section body", () => {
    const s = splitExpertOverview(
      ["#### Pathway Description", "", "para one.", "", "para two."].join("\n"),
    );
    expect(s.get(PATHWAY_DESCRIPTION)).toBe("para one.\n\npara two.");
  });

  it("returns no sections for text with no recognised headings", () => {
    expect(splitExpertOverview("Just prose.").size).toBe(0);
  });
});

function v1(over: Partial<PathwayMetadataV1>): PathwayMetadataV1 {
  return {
    $schema: "http://pathways.rmi.org/schema/pathwayMetadata.v1.json",
    id: "X",
    name: { full: "X" },
    description: "A pathway.",
    publication: {
      title: { full: "T" },
      publisher: { full: "TransitionZero" },
      year: 2024,
    },
    pathwayType: "Normative",
    geography: { global: true },
    sectors: [{ name: "Power", technologies: [] }],
    expertOverview: WELL_FORMED,
    metric: ["Capacity"],
    keyFeatures: {
      emissionsTrajectory: "Significant decrease",
      energyEfficiency: "Moderate improvement",
      energyDemand: "Minor increase",
      electrification: "Significant increase",
      policyTypes: ["Carbon price"],
      technologyCostTrend: "Decrease",
      emissionsScope: "CO2e (Kyoto)",
      policyAmbition: "High ambition policies",
      technologyCostsDetail: "Total costs",
      newTechnologiesIncluded: ["CCUS"],
      investmentNeeds: "By sector",
    },
    ...over,
  } as unknown as PathwayMetadataV1;
}

describe("widestScope", () => {
  it("uses the lone sector when there is only one", () => {
    expect(widestScope(v1({})).sector).toBe("Power");
  });

  it("uses cross-sector for a multi-sector pathway", () => {
    const doc = v1({
      sectors: [
        { name: "Power", technologies: [] },
        { name: "Steel", technologies: [] },
      ],
    } as Partial<PathwayMetadataV1>);
    expect(widestScope(doc).sector).toBe("cross-sector");
  });

  it("collapses a repeated sector name rather than calling it multi-sector", () => {
    // pathwayMetadata has no uniqueItems on sectors, and the _full fixture
    // deliberately lists Automotive twice.
    const doc = v1({
      sectors: [
        { name: "Power", technologies: [] },
        { name: "Power", technologies: ["Solar"] },
      ],
    } as Partial<PathwayMetadataV1>);
    expect(widestScope(doc).sector).toBe("Power");
  });

  it("prefers Global when the pathway is global, even with regions present", () => {
    const doc = v1({
      geography: { global: true, regions: { "South East Asia": ["TH"] } },
    } as Partial<PathwayMetadataV1>);
    expect(widestScope(doc).geography).toBe("Global");
  });

  it("uses the lone region label (the ACE case)", () => {
    const doc = v1({
      geography: { regions: { "South East Asia": ["TH", "VN"] } },
    } as Partial<PathwayMetadataV1>);
    expect(widestScope(doc).geography).toBe("South East Asia");
  });

  it("uses the lone country code", () => {
    const doc = v1({
      geography: { country: ["TH"] },
    } as Partial<PathwayMetadataV1>);
    expect(widestScope(doc).geography).toBe("TH");
  });

  it("throws rather than guessing between several regions", () => {
    const doc = v1({
      geography: { regions: { A: ["TH"], B: ["VN"] } },
    } as Partial<PathwayMetadataV1>);
    expect(() => widestScope(doc)).toThrow(/ambiguous/);
  });

  it("throws rather than guessing between several countries", () => {
    const doc = v1({
      geography: { country: ["TH", "VN"] },
    } as Partial<PathwayMetadataV1>);
    expect(() => widestScope(doc)).toThrow(/ambiguous/);
  });

  it("throws when there is no geography at all", () => {
    const doc = v1({ geography: {} } as Partial<PathwayMetadataV1>);
    expect(() => widestScope(doc)).toThrow(/no geography/);
  });
});

describe("upgradeV1ToV2", () => {
  it("repoints $schema at v2", () => {
    expect(upgradeV1ToV2(v1({})).doc.$schema).toBe(V2_ID);
  });

  it("wraps every keyFeature as one entry at the widest scope", () => {
    const { doc } = upgradeV1ToV2(v1({}));
    const kf = doc.keyFeatures;
    expect(Object.keys(kf)).toHaveLength(11);
    for (const entries of Object.values(kf)) {
      expect(entries).toHaveLength(1);
      expect(entries[0].sector).toBe("Power");
      expect(entries[0].geography).toBe("Global");
    }
    expect(kf.emissionsTrajectory[0].value).toBe("Significant decrease");
  });

  it("nests an array-valued field rather than splatting it into entries", () => {
    const doc = upgradeV1ToV2(
      v1({
        keyFeatures: {
          ...v1({}).keyFeatures,
          policyTypes: ["Carbon price", "Subsidies"],
        },
      } as Partial<PathwayMetadataV1>),
    ).doc;
    expect(doc.keyFeatures.policyTypes).toHaveLength(1);
    expect(doc.keyFeatures.policyTypes[0].value).toEqual([
      "Carbon price",
      "Subsidies",
    ]);
  });

  it("moves the description section into pathwayDescription", () => {
    const { doc } = upgradeV1ToV2(v1({}));
    expect(doc.pathwayDescription).toBe("A description of the pathway.");
    expect(doc.transitionAssessment).toBe("How to apply it.");
  });

  it("discards pathwayOverview rather than folding it in", () => {
    // #858 says to fold it in; the data owner confirmed on PR #898 that it should
    // be dropped, because the two texts restate each other and the merged field
    // reads as immediate self-repetition.
    const { doc, droppedPathwayOverview } = upgradeV1ToV2(
      v1({ pathwayOverview: "A short summary." } as Partial<PathwayMetadataV1>),
    );
    expect(droppedPathwayOverview).toBe("A short summary.".length);
    expect(doc.pathwayDescription).toBe("A description of the pathway.");
    expect(doc.pathwayDescription).not.toContain("A short summary.");
  });

  it("reports nothing dropped when there was no pathwayOverview", () => {
    expect(upgradeV1ToV2(v1({})).droppedPathwayOverview).toBe(0);
  });

  it("drops the v1 overview fields", () => {
    const { doc } = upgradeV1ToV2(
      v1({ pathwayOverview: "A short summary." } as Partial<PathwayMetadataV1>),
    );
    expect("expertOverview" in doc).toBe(false);
    expect("pathwayOverview" in doc).toBe(false);
  });

  it("scaffolds coreDrivers all-null and dependencies empty", () => {
    const { doc } = upgradeV1ToV2(v1({}));
    expect(Object.values(doc.coreDrivers)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(doc.dependencies).toEqual([]);
  });

  it("returns the Core Drivers prose it does not carry over", () => {
    expect(upgradeV1ToV2(v1({})).coreDriversProse).toBe(
      "*Policy:* Policies drive it.",
    );
  });

  it("nulls pathwayDescription when there is no description section", () => {
    const { doc } = upgradeV1ToV2(
      v1({ expertOverview: "No headings here." } as Partial<PathwayMetadataV1>),
    );
    expect(doc.pathwayDescription).toBeNull();
    expect(doc.transitionAssessment).toBeNull();
  });

  it("preserves unrelated fields and their order", () => {
    const { doc } = upgradeV1ToV2(
      v1({ modelYearNetzero: 2050 } as Partial<PathwayMetadataV1>),
    );
    expect(doc.modelYearNetzero).toBe(2050);
    // pathwayDescription takes expertOverview's slot; coreDrivers/dependencies
    // follow keyFeatures. Key order keeps the data-file diffs readable.
    const keys = Object.keys(doc);
    expect(keys.indexOf("pathwayDescription")).toBeLessThan(
      keys.indexOf("metric"),
    );
    expect(keys.indexOf("coreDrivers")).toBeGreaterThan(
      keys.indexOf("keyFeatures"),
    );
  });
});
