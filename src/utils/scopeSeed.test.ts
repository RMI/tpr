import { describe, it, expect } from "vitest";
import {
  collapseSelection,
  seedSectorFromFilters,
  seedGeographyFromFilters,
  seedScopeFromFilters,
} from "./scopeSeed";
import { geographyScopeOverlaps } from "./keyFeatureScope";
import { ABSENT_FILTER_TOKEN } from "./absent";
import { flattenGeography } from "./geographyUtils";
import type { PathwayMetadataType } from "../types";

function pathway(over: Partial<PathwayMetadataType> = {}): PathwayMetadataType {
  return {
    sectors: [
      { name: "Power", technologies: [] },
      { name: "Steel", technologies: [] },
    ],
    geography: {
      global: true,
      regions: {
        "South East Asia": ["ID", "TH", "VN"],
        "Unmapped Region": [],
      },
      country: ["US", "SG"],
    },
    ...over,
  } as unknown as PathwayMetadataType;
}

/**
 * The ACE shape: one published region, spelled with a space, omitting TL — the
 * exact discrepancy that made containment matching unusable (commit 34e975a).
 */
const ace = pathway({
  sectors: [{ name: "Power", technologies: [] }],
  geography: {
    global: false,
    regions: {
      "South East Asia": [
        "BN",
        "ID",
        "KH",
        "LA",
        "MM",
        "MY",
        "PH",
        "SG",
        "TH",
        "VN",
      ],
    },
    country: [],
  },
} as unknown as Partial<PathwayMetadataType>);

describe("collapseSelection", () => {
  it("passes a single token through", () => {
    expect(collapseSelection("Power")).toBe("Power");
    expect(collapseSelection(["Power"])).toBe("Power");
  });

  it("treats nothing selected as no preference", () => {
    expect(collapseSelection(null)).toBeNull();
    expect(collapseSelection(undefined)).toBeNull();
    expect(collapseSelection([])).toBeNull();
  });

  it("collapses a multi-selection to no preference, not to its first element", () => {
    // Facet order is vocabulary order, not intent — picking one would silently
    // discard the rest of the reader's own selection.
    expect(collapseSelection(["Power", "Steel"])).toBeNull();
  });

  it("strips the None bucket before collapsing", () => {
    // "None" selects pathways without the field; it is not a scope to read at.
    expect(collapseSelection([ABSENT_FILTER_TOKEN, "Power"])).toBe("Power");
    expect(collapseSelection([ABSENT_FILTER_TOKEN])).toBeNull();
    expect(collapseSelection(ABSENT_FILTER_TOKEN)).toBeNull();
  });
});

describe("seedSectorFromFilters", () => {
  it("pre-selects a sector the pathway declares", () => {
    expect(seedSectorFromFilters("Steel", pathway())).toBe("Steel");
  });

  it("declines a sector the pathway does not declare", () => {
    expect(seedSectorFromFilters("Cement", pathway())).toBeNull();
  });

  it("declines a multi-sector selection", () => {
    expect(seedSectorFromFilters(["Power", "Steel"], pathway())).toBeNull();
  });
});

describe("seedGeographyFromFilters", () => {
  it("maps a filter region onto the publication's own spelling", () => {
    // The case the whole mapping exists for: the filter vocabulary carries 11
    // codes including TL, ACE publishes 10 without it. Containment would reject
    // the region; coverage scores it 10/11 and picks it.
    expect(seedGeographyFromFilters("Southeast Asia", ace)).toBe(
      "South East Asia",
    );
  });

  it("prefers a containing region over Global for a country request", () => {
    const p = pathway({
      geography: {
        global: true,
        regions: { "South East Asia": ["ID", "TH", "VN"] },
        country: [],
      },
    } as unknown as Partial<PathwayMetadataType>);

    expect(seedGeographyFromFilters("TH", p)).toBe("South East Asia");
  });

  it("prefers the exact country when the pathway declares it", () => {
    const p = pathway({
      geography: {
        global: true,
        regions: { "South East Asia": ["ID", "TH", "VN"] },
        country: ["TH"],
      },
    } as unknown as Partial<PathwayMetadataType>);

    // TH covers the request completely and drags nothing extra in.
    expect(seedGeographyFromFilters("TH", p)).toBe("TH");
  });

  it("pre-selects Global only when the pathway is global", () => {
    expect(seedGeographyFromFilters("Global", pathway())).toBe("Global");
    expect(seedGeographyFromFilters("Global", ace)).toBeNull();
  });

  it("declines when nothing the pathway covers overlaps the request", () => {
    // Brazil against a South East Asia pathway.
    expect(seedGeographyFromFilters("BR", ace)).toBeNull();
  });

  it("never pre-selects Global as a consolation prize", () => {
    // A global pathway asked for an unrelated country: null, not "Global", so
    // the ribbon does not claim to have narrowed to the reader's selection.
    expect(seedGeographyFromFilters("BR", pathway())).toBeNull();
  });

  it("never pre-selects a region the publication left unmapped", () => {
    const p = pathway({
      geography: {
        global: false,
        regions: { "Unmapped Region": [] },
        country: [],
      },
    });

    expect(seedGeographyFromFilters("Southeast Asia", p)).toBeNull();
  });

  it("treats the None bucket as no preference", () => {
    expect(seedGeographyFromFilters(ABSENT_FILTER_TOKEN, pathway())).toBeNull();
  });

  it("declines a multi-geography selection", () => {
    expect(seedGeographyFromFilters(["TH", "VN"], pathway())).toBeNull();
  });
});

describe("seedScopeFromFilters invariants", () => {
  const cases: {
    sector: string | string[] | null;
    geography: string | string[] | null;
  }[] = [
    { sector: null, geography: null },
    { sector: "Power", geography: "Southeast Asia" },
    { sector: "Cement", geography: "BR" },
    { sector: ["Power", "Steel"], geography: "Global" },
    { sector: "Steel", geography: ABSENT_FILTER_TOKEN },
    { sector: null, geography: "TH" },
  ];

  it("only ever seeds a token the pathway itself declares", () => {
    for (const p of [pathway(), ace]) {
      const tokens = flattenGeography(p.geography);
      const sectors = (p.sectors ?? []).map((s) => s.name as string);

      for (const filters of cases) {
        const seed = seedScopeFromFilters(filters, p);
        if (seed.geography !== null) {
          expect(tokens).toContain(seed.geography);
        }
        if (seed.sector !== null) {
          expect(sectors).toContain(seed.sector);
        }
      }
    }
  });

  it("agrees with the search matcher on every non-null geography seed", () => {
    // The seed can never disagree with what search itself considers a match.
    for (const p of [pathway(), ace]) {
      for (const filters of cases) {
        const seed = seedScopeFromFilters(filters, p);
        const token = collapseSelection(filters.geography);
        if (seed.geography !== null && token !== null) {
          expect(geographyScopeOverlaps(seed.geography, token, p)).toBe(true);
        }
      }
    }
  });

  it("seeds nothing when the reader arrived with no selection", () => {
    expect(
      seedScopeFromFilters({ sector: null, geography: null }, pathway()),
    ).toEqual({ sector: null, geography: null });
  });
});
