import { describe, it, expect } from "vitest";
import { filterPathways, getGlobalFacetOptions } from "./searchUtils";
import type { FiltersWithArrays } from "./searchUtils";
import { ABSENT_FILTER_TOKEN } from "./absent";
import { PathwayMetadataType, SearchFilters } from "../types";

import sample01 from "../../testdata/valid/pathwayMetadata_sample_01.json" assert { type: "json" };
import sample02 from "../../testdata/valid/pathwayMetadata_sample_02.json" assert { type: "json" };
import sample03 from "../../testdata/valid/pathwayMetadata_sample_03.json" assert { type: "json" };
import sample04 from "../../testdata/valid/pathwayMetadata_sample_04.json" assert { type: "json" };
const mockPathways: PathwayMetadataType[] = [
  sample01,
  sample02,
  sample03,
  sample04,
];

describe("searchUtils", () => {
  // Mock pathway data

  describe("filterPathways", () => {
    it("returns all pathways when no filters are applied", () => {
      const emptyFilters: SearchFilters = {};
      const result = filterPathways(mockPathways, emptyFilters);

      expect(result).toEqual(mockPathways);
    });

    it("filters by pathway type", () => {
      const filters: SearchFilters = { pathwayType: "Exploratory" };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("sample-02");
    });

    it("filters by target year", () => {
      const filters: SearchFilters = { modelYearNetzero: 2050 };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(2);
      expect(result.map((x) => x.id)).toEqual(["sample-01", "sample-04"]);
    });

    it("filters by modeled temperature increase", () => {
      const filters: SearchFilters = { modelTempIncrease: 1 };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("sample-01");
    });

    it("filters by geography", () => {
      const filters: SearchFilters = { geography: "Global" };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("sample-01");
    });

    it("filters by sector", () => {
      const filters: SearchFilters = { sector: "Agriculture" };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("sample-02");
    });

    it("filters by metric", () => {
      const filters: SearchFilters = { metric: "Capacity" };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(2);
      expect(result.map((x) => x.id)).toEqual(["sample-01", "sample-02"]);
    });

    it("filters by search term in name", () => {
      const filters: SearchFilters = { searchTerm: "Pathway 01" };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("sample-01");
    });

    it("filters by search term in description", () => {
      const filters: SearchFilters = { searchTerm: "qwerty description" };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("sample-01");
    });

    it("combines multiple filters", () => {
      const filters: SearchFilters = {
        pathwayType: "Normative",
        geography: "Global",
      };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("sample-01");
    });

    it("returns empty array when no pathways match filters", () => {
      const filters: SearchFilters = {
        pathwayType: "Policy",
        modelYearNetzero: "2030",
      };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(0);
      expect(result).toEqual([]);
    });

    it("handles empty search term", () => {
      const filters: SearchFilters = { searchTerm: "" };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(mockPathways.length);
      expect(result).toEqual(mockPathways);
    });

    it("handles whitespace-only search term", () => {
      const filters: SearchFilters = { searchTerm: "   " };
      const result = filterPathways(mockPathways, filters);

      expect(result.length).toBe(mockPathways.length);
      expect(result).toEqual(mockPathways);
    });
  });

  describe("Schema compliance pathways", () => {
    it("returns matches on extant fields", () => {
      const filters: SearchFilters = {
        publisher: "Example Publisher",
      };

      const result = filterPathways(mockPathways, filters);
      expect(result.length).toBe(mockPathways.length);
      expect(result).toEqual(mockPathways);
    });

    it("safely omits results for non-existing fields", () => {
      //pathway 3 in the mock data has no modelYearNetzero
      const filters: SearchFilters = {
        modelYearNetzero: 2050,
      };

      const result = filterPathways(mockPathways, filters);
      expect(result.length).toBe(2);
      expect(result.map((x) => x.id)).toEqual(["sample-01", "sample-04"]);
    });
  });
});

import rawFullPathway from "../../testdata/valid/pathwayMetadata_full.json" assert { type: "json" };
const mockFullPathways: PathwayMetadataType[] = [rawFullPathway];

describe("searchUtils - array results", () => {
  //
  // Mock pathway data
  const geography: string[] = [
    "Global",
    "Europe and Central Asia",
    "North America",
    "South East Asia",
    "US",
  ];

  const sectors: string[] = [
    "Land Use",
    "Agriculture",
    "Buildings",
    "Steel",
    "Cement",
    "Chemicals",
    "Coal Mining",
    "Oil (Upstream)",
    "Gas (Upstream)",
    "Power",
    "Automotive",
    "Aviation",
    "Rail",
    "Shipping",
    "Other",
  ];

  //These tests are to ensure that search works for all array values, even when
  //they would not be surface directly in the UI (e.g. "Power, Road transport, + 15
  //more")
  describe("filterPathways for many array values", () => {
    geography.forEach((geography) => {
      it(`options for geography - ${geography}`, () => {
        const filters: SearchFilters = { geography: geography };
        const result = filterPathways(mockFullPathways, filters);

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("pathway-simple-full");
      });
    });

    sectors.forEach((sector) => {
      it(`filters by sector - ${sector}`, () => {
        const filters: SearchFilters = { sector: sector };
        const result = filterPathways(mockFullPathways, filters);

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("pathway-simple-full");
      });
    });
  });
});

describe("filterPathways (array-backed facets)", () => {
  const pathways: PathwayMetadataType[] = [
    {
      id: "A",
      name: "A",
      sectors: undefined,
      geography: undefined,
      modelTempIncrease: undefined,
      pathwayType: undefined,
      modelYearNetzero: undefined,
      publisher: undefined,
      publicationYear: undefined,
      description: undefined,
    },
    {
      id: "B",
      name: "B",
      sectors: [{ name: "Power" }],
      geography: { regions: { Europe: [] } },
      modelTempIncrease: 2.0,
      pathwayType: "Normative",
      modelYearNetzero: 2040,
      publisher: "X",
      publicationYear: 2020,
      description: "",
    },
    {
      id: "C",
      name: "C",
      sectors: [{ name: "Steel" }],
      geography: { regions: { Asia: [] } },
      modelTempIncrease: 1.5,
      pathwayType: "Exploratory",
      modelYearNetzero: 2030,
      publisher: "X",
      publicationYear: 2020,
      description: "",
    },
  ];

  it("pathwayType: OR over multiple selections; empty array = no filter", () => {
    let out = filterPathways(pathways, {
      pathwayType: ["Normative", "Exploratory"],
    });
    expect(out.map((s) => s.id)).toEqual(["B", "C"]);

    out = filterPathways(pathways, { pathwayType: [] });
    expect(out.map((s) => s.id)).toEqual(["A", "B", "C"]);
  });

  it("pathwayType: ABSENT token matches missing value only", () => {
    const out = filterPathways(pathways, {
      pathwayType: [ABSENT_FILTER_TOKEN],
    });
    expect(out.map((s) => s.id)).toEqual(["A"]);
  });

  it("numeric (modelYearNetzero): OR over numbers, with ABSENT", () => {
    let out = filterPathways(pathways, {
      modelYearNetzero: [2040, 2030],
    });
    expect(out.map((s) => s.id)).toEqual(["B", "C"]);
    out = filterPathways(pathways, {
      modelYearNetzero: [2040, ABSENT_FILTER_TOKEN],
    } as FiltersWithArrays);
    expect(out.map((s) => s.id)).toEqual(["A", "B"]);
    out = filterPathways(pathways, {
      modelYearNetzero: [ABSENT_FILTER_TOKEN],
    });
    expect(out.map((s) => s.id)).toEqual(["A"]);
    out = filterPathways(pathways, {
      modelYearNetzero: [9999],
    });
    expect(out.map((s) => s.id)).toEqual([]);
  });

  it("numeric (temperature): OR over numbers, with ABSENT", () => {
    let out = filterPathways(pathways, {
      modelTempIncrease: [1.5, 2.0],
    });
    expect(out.map((s) => s.id)).toEqual(["B", "C"]);
    out = filterPathways(pathways, {
      modelTempIncrease: [ABSENT_FILTER_TOKEN],
    });
    expect(out.map((s) => s.id)).toEqual(["A"]);
  });

  it("geography: ALL mode requires all tokens; ANY is default", () => {
    // Add a pathway with two geos
    const many: PathwayMetadataType[] = [
      ...pathways,
      {
        ...pathways[1],
        id: "B2",
        name: "B2",
        geography: { regions: { Europe: [], Asia: [] } },
      },
    ];
    // ANY (default): Europe OR Asia → B, C, B2
    let out = filterPathways(many, {
      geography: ["Europe", "Asia"],
    });
    expect(out.map((s) => s.id)).toEqual(["B", "C", "B2"]);
    // ALL: must have both → only B2
    out = filterPathways(many, {
      geography: ["Europe", "Asia"],
      modes: { geography: "ALL" },
    });
    expect(out.map((s) => s.id)).toEqual(["B2"]);
  });

  it("pathwayType: ALL with two tokens yields no results (single-valued facet)", () => {
    const out = filterPathways(
      [
        {
          id: "A",
          name: "A",
          sectors: [],
          geography: [],
          modelTempIncrease: 2,
          pathwayType: "Net Zero",
          modelYearNetzero: 2050,
          publisher: "",
          publicationYear: 2020,
          description: "",
        },
        {
          id: "B",
          name: "B",
          sectors: [],
          geography: [],
          modelTempIncrease: 1.5,
          pathwayType: "BAU",
          modelYearNetzero: 2030,
          publisher: "",
          publicationYear: 2020,
          description: "",
        },
      ] as PathwayMetadataType[],
      { pathwayType: ["Net Zero", "BAU"], modes: { pathwayType: "ALL" } },
    );
    expect(out).toHaveLength(0);
  });

  it("modelYearNetzero: ALL with [2030,2050] yields no results (single-valued facet)", () => {
    const out = filterPathways(
      [
        {
          id: "A",
          name: "A",
          sectors: [],
          geography: [],
          modelTempIncrease: 2,
          pathwayType: "X",
          modelYearNetzero: 2030,
          publisher: "",
          publicationYear: 2020,
          description: "",
        },
        {
          id: "B",
          name: "B",
          sectors: [],
          geography: [],
          modelTempIncrease: 2,
          pathwayType: "Y",
          modelYearNetzero: 2050,
          publisher: "",
          publicationYear: 2020,
          description: "",
        },
      ] as PathwayMetadataType[],
      { modelYearNetzero: [2030, 2050], modes: { modelYearNetzero: "ALL" } },
    );
    expect(out).toHaveLength(0);
  });

  it("modelTempIncrease: ALL with [1.5,2.0] yields no results (single-valued facet)", () => {
    const out = filterPathways(
      [
        {
          id: "A",
          name: "A",
          sectors: [],
          geography: [],
          modelTempIncrease: 1.5,
          pathwayType: "X",
          modelYearNetzero: 2030,
          publisher: "",
          publicationYear: 2020,
          description: "",
        },
        {
          id: "B",
          name: "B",
          sectors: [],
          geography: [],
          modelTempIncrease: 2.0,
          pathwayType: "Y",
          modelYearNetzero: 2050,
          publisher: "",
          publicationYear: 2020,
          description: "",
        },
      ] as PathwayMetadataType[],
      { modelTempIncrease: [1.5, 2.0], modes: { modelTempIncrease: "ALL" } },
    );
    expect(out).toHaveLength(0);
  });

  it("single-valued facets: ALL with one token behaves like equality; ABSENT-only matches null", () => {
    const out1 = filterPathways(
      [
        {
          id: "A",
          name: "A",
          sectors: [],
          geography: [],
          modelTempIncrease: null,
          pathwayType: null,
          modelYearNetzero: null,
          publisher: "",
          publicationYear: 2020,
          description: "",
        },
      ] as PathwayMetadataType[],
      { pathwayType: [ABSENT_FILTER_TOKEN], modes: { pathwayType: "ALL" } },
    );
    expect(out1.map((s) => s.id)).toEqual(["A"]);

    const out2 = filterPathways(
      [
        {
          id: "B",
          name: "B",
          sectors: [],
          geography: [],
          modelTempIncrease: 2.0,
          pathwayType: "Net Zero",
          modelYearNetzero: 2030,
          publisher: "",
          publicationYear: 2020,
          description: "",
        },
      ] as PathwayMetadataType[],
      { modelTempIncrease: [2.0], modes: { modelTempIncrease: "ALL" } },
    );
    expect(out2.map((s) => s.id)).toEqual(["B"]);
  });
});

describe("getGlobalFacetOptions", () => {
  it("builds global options for all facets from data", () => {
    const {
      pathwayTypeOptions,
      modelYearNetzeroOptions,
      temperatureOptions,
      geographyOptions,
      sectorOptions,
      metricOptions,
    } = getGlobalFacetOptions(mockPathways);

    // spot checks; exact sets depend on fixtures
    expect(pathwayTypeOptions.map((o) => o.value)).toContain("Normative");
    expect(modelYearNetzeroOptions.map((o) => o.value)).toContain(2050);
    expect(temperatureOptions.map((o) => o.value)).toEqual(
      expect.arrayContaining([1, 2]),
    );
    // geography options are objects (value/label or structured Geography)
    expect(geographyOptions.length).toBeGreaterThan(0);
    // sectors are strings; ensure dedup worked
    expect(new Set(sectorOptions.map((o) => o.value)).size).toBe(
      sectorOptions.length,
    );
    // metrics: flattened set from all pathways
    expect(metricOptions.length).toBeGreaterThan(0);

    // pathwayTypeOptions should be in expected order
    const pathwayTypeLabels = pathwayTypeOptions.map((opt) => opt.label);
    expect(pathwayTypeLabels.slice(0, 3)).toEqual([
      "Predictive",
      "Exploratory",
      "Normative",
    ]);
  });

  it("includes 'None' ABSENT option for sectors/geography when missing in data", () => {
    // Build a dataset with a missing sectors and missing geography entry
    const withMissing: PathwayMetadataType[] = [
      { ...mockPathways[0], sectors: undefined, geography: undefined },
      ...mockPathways.slice(1),
    ];
    const { geographyOptions, sectorOptions } =
      getGlobalFacetOptions(withMissing);
    expect(sectorOptions.map((o) => o.label)).toContain("None");
    // geographyOptions uses withAbsentOption; presence of ABSENT is encoded as an extra option
    expect(geographyOptions.map((o) => o.label)).toContain("None");
  });
});
