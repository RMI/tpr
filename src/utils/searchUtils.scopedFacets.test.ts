import { describe, it, expect } from "vitest";
import { filterPathways, getGlobalFacetOptions } from "./searchUtils";
import type { FiltersWithArrays } from "./searchUtils";
import { ABSENT_FILTER_TOKEN } from "./absent";
import type { PathwayMetadataType } from "../types";

/**
 * Coverage for the two keyFeature-backed search facets over v2 scoped entries
 * (#858): `emissionsTrajectory` and `policyAmbition`.
 *
 * These arms had no test coverage at all before v2 — no `filterPathways` test
 * passed either filter — which is why the v1->v2 shape change broke them
 * silently: `concrete.includes(v)` against an array is simply always false, so
 * selecting either facet quietly returned zero pathways.
 *
 * The semantics asserted here are containment: a pathway matches on the value at
 * the scope the user is looking at, and a pathway holding that value only at some
 * *other* scope is not a match. Fallback ranking is #869's job, not this layer's.
 */

type Entry = { sector: string; geography: string; value: string };

function pathway(
  id: string,
  opts: {
    sectors?: string[];
    emissionsTrajectory?: Entry[];
    policyAmbition?: Entry[];
  },
): PathwayMetadataType {
  return {
    id,
    name: { full: id },
    sectors: (opts.sectors ?? ["Power", "Steel"]).map((name) => ({
      name,
      technologies: [],
    })),
    geography: {
      regions: { "South East Asia": ["ID", "TH", "VN"] },
      country: ["US"],
    },
    metric: [],
    keyFeatures: {
      emissionsTrajectory: opts.emissionsTrajectory ?? [],
      policyAmbition: opts.policyAmbition ?? [],
    },
  } as unknown as PathwayMetadataType;
}

const e = (sector: string, geography: string, value: string): Entry => ({
  sector,
  geography,
  value,
});

const ids = (list: PathwayMetadataType[]) => list.map((p) => p.id).sort();

describe("emissionsTrajectory facet over scoped entries", () => {
  const wide = pathway("wide", {
    emissionsTrajectory: [e("cross-sector", "Global", "Significant decrease")],
  });
  const perSector = pathway("perSector", {
    emissionsTrajectory: [
      e("Power", "Global", "Significant decrease"),
      e("Steel", "Global", "Minor decrease"),
    ],
  });
  const regional = pathway("regional", {
    emissionsTrajectory: [
      e("cross-sector", "South East Asia", "Significant decrease"),
    ],
  });
  const empty = pathway("empty", { emissionsTrajectory: [] });
  const all = [wide, perSector, regional, empty];

  it("matches a value held at the widest scope when nothing is narrowed", () => {
    const filters: FiltersWithArrays = {
      emissionsTrajectory: ["Significant decrease"],
    };
    expect(ids(filterPathways(all, filters))).toEqual([
      "perSector",
      "regional",
      "wide",
    ]);
  });

  it("respects the user's sector: excludes a pathway whose value at that sector differs", () => {
    // perSector holds "Significant decrease" for Power but "Minor decrease" for
    // Steel. Filtering to Steel must not match it, even though the value exists
    // elsewhere in the pathway. This is the whole point of the scope check.
    const filters: FiltersWithArrays = {
      sector: ["Steel"],
      emissionsTrajectory: ["Significant decrease"],
    };
    const result = ids(filterPathways(all, filters));
    expect(result).not.toContain("perSector");
    expect(result).toEqual(["regional", "wide"]);
  });

  it("matches that same pathway when the user asks about the sector it holds", () => {
    const filters: FiltersWithArrays = {
      sector: ["Power"],
      emissionsTrajectory: ["Significant decrease"],
    };
    expect(ids(filterPathways(all, filters))).toContain("perSector");
  });

  it("matches a regional entry from a country inside that region", () => {
    const filters: FiltersWithArrays = {
      geography: ["TH"],
      emissionsTrajectory: ["Significant decrease"],
    };
    expect(ids(filterPathways(all, filters))).toContain("regional");
  });

  it("does not match a regional entry from a country outside that region", () => {
    // "regional" only has South East Asia data; the US is not in it. (The
    // geography facet would also exclude it, but this asserts the scope check
    // independently — the pathway does declare US coverage.)
    const filters: FiltersWithArrays = {
      geography: ["US"],
      emissionsTrajectory: ["Significant decrease"],
    };
    expect(ids(filterPathways(all, filters))).not.toContain("regional");
  });

  it("treats an empty entry list as the absent bucket", () => {
    expect(
      ids(filterPathways(all, { emissionsTrajectory: [ABSENT_FILTER_TOKEN] })),
    ).toEqual(["empty"]);
  });

  it("does not match the absent bucket when a value is present", () => {
    const filters: FiltersWithArrays = {
      emissionsTrajectory: [ABSENT_FILTER_TOKEN],
    };
    expect(ids(filterPathways(all, filters))).not.toContain("wide");
  });

  it("passes every pathway through when the facet is not selected", () => {
    expect(ids(filterPathways(all, {}))).toEqual([
      "empty",
      "perSector",
      "regional",
      "wide",
    ]);
  });

  it("ANY mode matches a pathway holding either selected value", () => {
    const filters: FiltersWithArrays = {
      emissionsTrajectory: ["Minor decrease", "Moderate decrease"],
      modes: { emissionsTrajectory: "ANY" },
    };
    expect(ids(filterPathways(all, filters))).toEqual(["perSector"]);
  });

  it("ALL mode requires every selected value, which multi-scope data can satisfy", () => {
    // Newly meaningful in v2: one pathway can genuinely hold two values at once.
    const filters: FiltersWithArrays = {
      emissionsTrajectory: ["Significant decrease", "Minor decrease"],
      modes: { emissionsTrajectory: "ALL" },
    };
    expect(ids(filterPathways(all, filters))).toEqual(["perSector"]);
  });

  it("ALL mode excludes a pathway holding only one of the selected values", () => {
    const filters: FiltersWithArrays = {
      emissionsTrajectory: ["Significant decrease", "Minor decrease"],
      modes: { emissionsTrajectory: "ALL" },
    };
    expect(ids(filterPathways(all, filters))).not.toContain("wide");
  });

  it("cross-sector does not answer a sector the pathway never declares", () => {
    const powerOnly = pathway("powerOnly", {
      sectors: ["Power"],
      emissionsTrajectory: [
        e("cross-sector", "Global", "Significant decrease"),
      ],
    });
    const filters: FiltersWithArrays = {
      sector: ["Steel"],
      emissionsTrajectory: ["Significant decrease"],
    };
    // The sector facet excludes it too; asserted here so the scope rule is
    // pinned independently of that.
    expect(ids(filterPathways([powerOnly], filters))).toEqual([]);
  });
});

describe("policyAmbition facet over scoped entries", () => {
  const p = pathway("p", {
    policyAmbition: [
      e("Power", "Global", "High ambition policies"),
      e("Steel", "Global", "Current/legislated policies"),
    ],
  });

  it("respects the user's sector, same as emissionsTrajectory", () => {
    expect(
      ids(
        filterPathways([p], {
          sector: ["Steel"],
          policyAmbition: ["High ambition policies"],
        }),
      ),
    ).toEqual([]);
    expect(
      ids(
        filterPathways([p], {
          sector: ["Power"],
          policyAmbition: ["High ambition policies"],
        }),
      ),
    ).toEqual(["p"]);
  });

  it("applies independently of the emissionsTrajectory facet", () => {
    const filters: FiltersWithArrays = {
      policyAmbition: ["Current/legislated policies"],
      emissionsTrajectory: ["Significant decrease"],
    };
    // emissionsTrajectory is empty on this pathway, so the conjunction fails.
    expect(ids(filterPathways([p], filters))).toEqual([]);
  });
});

describe("Sector=None combined with a scoped facet", () => {
  // Regression for the case Copilot flagged: selecting the "None" sector bucket
  // alongside a keyFeature facet used to return nothing, because the ABSENT token
  // was compared as though it were a sector name and filtered out every entry.
  const noSectors = {
    id: "no-sectors",
    name: { full: "No Sectors" },
    sectors: [],
    geography: { global: true },
    metric: [],
    keyFeatures: {
      emissionsTrajectory: [
        e("cross-sector", "Global", "Significant decrease"),
      ],
      policyAmbition: [],
    },
  } as unknown as PathwayMetadataType;

  it("matches on the sector bucket alone", () => {
    expect(
      ids(filterPathways([noSectors], { sector: [ABSENT_FILTER_TOKEN] })),
    ).toEqual(["no-sectors"]);
  });

  it("still matches when combined with the keyFeature facet", () => {
    expect(
      ids(
        filterPathways([noSectors], {
          sector: [ABSENT_FILTER_TOKEN],
          emissionsTrajectory: ["Significant decrease"],
        }),
      ),
    ).toEqual(["no-sectors"]);
  });

  it("does not match a value the pathway does not hold", () => {
    expect(
      ids(
        filterPathways([noSectors], {
          sector: [ABSENT_FILTER_TOKEN],
          emissionsTrajectory: ["Minor decrease"],
        }),
      ),
    ).toEqual([]);
  });

  it("behaves the same for the geography None bucket", () => {
    expect(
      ids(
        filterPathways([noSectors], {
          geography: [ABSENT_FILTER_TOKEN],
          emissionsTrajectory: ["Significant decrease"],
        }),
      ),
    ).toEqual([]); // geography facet itself excludes it: this pathway IS global
  });
});

describe("getGlobalFacetOptions over scoped entries", () => {
  const all = [
    pathway("a", {
      emissionsTrajectory: [
        e("cross-sector", "Global", "Significant decrease"),
      ],
      policyAmbition: [e("cross-sector", "Global", "High ambition policies")],
    }),
    pathway("b", {
      emissionsTrajectory: [
        e("Power", "Global", "Minor decrease"),
        e("Steel", "Global", "Significant decrease"),
      ],
    }),
  ];

  it("lists the union of values across every scope, deduplicated", () => {
    const { emissionsTrajectoryOptions } = getGlobalFacetOptions(all);
    const values = emissionsTrajectoryOptions
      .map((o) => o.value)
      .filter((v) => v !== ABSENT_FILTER_TOKEN);
    expect([...values].sort()).toEqual([
      "Minor decrease",
      "Significant decrease",
    ]);
  });

  it("never emits an option built from an entry object", () => {
    // The v1->v2 break turned these options into "[object Object]" because the
    // entries were passed through verbatim instead of their values.
    const { emissionsTrajectoryOptions, policyAmbitionOptions } =
      getGlobalFacetOptions(all);
    for (const opt of [
      ...emissionsTrajectoryOptions,
      ...policyAmbitionOptions,
    ]) {
      expect(String(opt.label)).not.toContain("object");
      expect(String(opt.value)).not.toContain("object");
    }
  });

  it("offers the absent bucket when a pathway has no entries for the field", () => {
    const { policyAmbitionOptions } = getGlobalFacetOptions(all);
    expect(policyAmbitionOptions.map((o) => o.value)).toContain(
      ABSENT_FILTER_TOKEN,
    );
  });
});
