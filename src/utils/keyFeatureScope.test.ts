import { describe, it, expect } from "vitest";
import {
  entryValues,
  sectorScopeContains,
  entryISOSet,
  geographyScopeOverlaps,
  entriesInScope,
  valuesInScope,
  widestValue,
} from "./keyFeatureScope";
import { ABSENT_FILTER_TOKEN } from "./absent";
import type { PathwayMetadataType } from "../types";

/**
 * A pathway covering Power and Steel, with one mapped region, one unmapped region
 * (the NGFS shape pending #801), and one standalone country.
 */
function pathway(over: Partial<PathwayMetadataType> = {}): PathwayMetadataType {
  return {
    sectors: [
      { name: "Power", technologies: [] },
      { name: "Steel", technologies: [] },
    ],
    geography: {
      regions: {
        "South East Asia": ["ID", "TH", "VN"],
        "Unmapped Region": [],
      },
      country: ["US"],
    },
    ...over,
  } as unknown as PathwayMetadataType;
}

const e = (sector: string, geography: string, value: string | string[]) => ({
  sector,
  geography,
  value,
});

describe("entryValues", () => {
  it("flattens scalar and array-valued entries alike", () => {
    expect(
      entryValues([
        e("Power", "Global", "A"),
        e("Steel", "Global", ["B", "C"]),
      ]),
    ).toEqual(["A", "B", "C"]);
  });

  it("returns [] for an empty entry list", () => {
    expect(entryValues([])).toEqual([]);
  });

  it("returns [] for a non-array — a stale v1 scalar degrades, not throws", () => {
    // Relevant while v1 and v2 coexist: a v1-shaped scalar must not blow up here.
    expect(entryValues("Significant decrease")).toEqual([]);
    expect(entryValues(null)).toEqual([]);
    expect(entryValues(undefined)).toEqual([]);
  });
});

describe("sectorScopeContains", () => {
  const declared = ["Power", "Steel"];

  it("matches an exact sector", () => {
    expect(sectorScopeContains("Power", "Power", declared)).toBe(true);
  });

  it("does not match a different sector", () => {
    expect(sectorScopeContains("Power", "Steel", declared)).toBe(false);
  });

  it("cross-sector contains any sector the pathway declares", () => {
    expect(sectorScopeContains("cross-sector", "Steel", declared)).toBe(true);
  });

  it("cross-sector is NOT a universal match", () => {
    // Per Jacob on #869: cross-sector is the union of the pathway's own sectors,
    // so a pathway covering only Power and Steel does not answer a Cement query.
    expect(sectorScopeContains("cross-sector", "Cement", declared)).toBe(false);
  });
});

describe("entryISOSet", () => {
  it("returns null for Global, meaning everything", () => {
    expect(entryISOSet("Global", pathway())).toBeNull();
  });

  it("resolves a region label through the pathway's own mapping", () => {
    expect(
      [...(entryISOSet("South East Asia", pathway()) ?? [])].sort(),
    ).toEqual(["ID", "TH", "VN"]);
  });

  it("resolves a bare country code", () => {
    expect([...(entryISOSet("US", pathway()) ?? [])]).toEqual(["US"]);
  });

  it("resolves an unmapped region to the empty set, not to everything", () => {
    // #801: a region the publication never mapped must match nothing rather than
    // silently behaving like Global.
    expect(entryISOSet("Unmapped Region", pathway())?.size).toBe(0);
  });

  it("resolves cross-region to the pathway's whole ISO coverage", () => {
    const set = entryISOSet("cross-region", pathway());
    expect([...(set ?? [])].sort()).toEqual(["ID", "TH", "US", "VN"]);
  });

  it("resolves an unrecognised label to the empty set", () => {
    expect(entryISOSet("Souteast Asia", pathway())?.size).toBe(0);
  });
});

describe("geographyScopeOverlaps", () => {
  const p = pathway();

  it("a Global entry answers any query", () => {
    expect(geographyScopeOverlaps("Global", "TH", p)).toBe(true);
  });

  it("a region entry answers a country inside it", () => {
    expect(geographyScopeOverlaps("South East Asia", "TH", p)).toBe(true);
  });

  it("a country entry answers a region query that includes it", () => {
    // Overlap, not containment. "Southeast Asia" is the query vocabulary's
    // label (11 ISO codes) and includes TH, so a Thailand-scoped entry is a
    // match. Under the old containment rule this was false, which is what made
    // region filters drop pathways whose own region list differs by a country.
    expect(geographyScopeOverlaps("TH", "Southeast Asia", p)).toBe(true);
  });

  it("tolerates a publication label the query vocabulary does not share", () => {
    // The pathway's own regions are named "South East Asia" (with spaces); the
    // filter vocabulary calls it "Southeast Asia". The two lists also differ by
    // one country (TL), so containment would fail even once spelling matched.
    // Overlap makes the intersection sufficient, which is the point of #783.
    expect(geographyScopeOverlaps("South East Asia", "Southeast Asia", p)).toBe(
      true,
    );
  });

  it("does not match a country outside the entry's region", () => {
    expect(geographyScopeOverlaps("South East Asia", "US", p)).toBe(false);
  });

  it("only a Global entry answers a Global query", () => {
    // Mirrors the geography facet's `wantGlobal && pGlobal`: selecting "Global"
    // means whole-world pathways, not "match anything".
    expect(geographyScopeOverlaps("Global", "Global", p)).toBe(true);
    expect(geographyScopeOverlaps("South East Asia", "Global", p)).toBe(false);
  });

  it("an unrecognised token matches nothing", () => {
    // "South East Asia" is a publication label, not a query-vocabulary token, so
    // it resolves to an empty ISO set and must not vacuously match.
    expect(geographyScopeOverlaps("TH", "South East Asia", p)).toBe(false);
    expect(geographyScopeOverlaps("TH", "Souteast Asia", p)).toBe(false);
  });

  it("the absent bucket does not constrain which scope to read", () => {
    expect(
      geographyScopeOverlaps("South East Asia", ABSENT_FILTER_TOKEN, p),
    ).toBe(true);
  });

  it("an unmapped region overlaps nothing", () => {
    expect(geographyScopeOverlaps("Unmapped Region", "TH", p)).toBe(false);
  });
});

describe("entriesInScope", () => {
  const entries = [
    e("cross-sector", "Global", "wide"),
    e("Power", "South East Asia", "power-sea"),
    e("Steel", "US", "steel-us"),
  ];
  const p = pathway();

  it("returns every entry when neither axis is filtered", () => {
    expect(entriesInScope(entries, {}, p)).toHaveLength(3);
  });

  it("keeps entries whose sector contains the queried sector", () => {
    expect(
      entriesInScope(entries, { sectors: ["Power"] }, p).map((x) => x.value),
    ).toEqual(["wide", "power-sea"]);
  });

  it("keeps entries whose geography contains the queried country", () => {
    expect(
      entriesInScope(entries, { geographies: ["TH"] }, p).map((x) => x.value),
    ).toEqual(["wide", "power-sea"]);
  });

  it("applies both axes together", () => {
    expect(
      entriesInScope(
        entries,
        { sectors: ["Steel"], geographies: ["US"] },
        p,
      ).map((x) => x.value),
    ).toEqual(["wide", "steel-us"]);
  });

  it("excludes an entry when only one axis matches", () => {
    // Steel data exists, but only for the US — not for Thailand.
    expect(
      entriesInScope(
        entries,
        { sectors: ["Steel"], geographies: ["TH"] },
        p,
      ).map((x) => x.value),
    ).toEqual(["wide"]);
  });

  it("treats several selections on one axis as 'any of them'", () => {
    expect(
      entriesInScope(entries, { sectors: ["Power", "Steel"] }, p).map(
        (x) => x.value,
      ),
    ).toEqual(["wide", "power-sea", "steel-us"]);
  });

  it("can narrow to nothing when no entry covers the query", () => {
    const narrow = [e("Power", "South East Asia", "power-sea")];
    expect(entriesInScope(narrow, { geographies: ["US"] }, p)).toEqual([]);
  });

  it("returns [] for absent entries", () => {
    expect(entriesInScope(undefined, { sectors: ["Power"] }, p)).toEqual([]);
    expect(entriesInScope([], { sectors: ["Power"] }, p)).toEqual([]);
  });
});

describe("entriesInScope — the ABSENT/None token", () => {
  // Regression: the None bucket is a predicate about the pathway ("has no
  // sectors"), not a scope. geographyScopeContains always ignored it, but the
  // sector axis compared it as a sector name, so Sector=None plus a keyFeature
  // facet filtered out every entry and the pathway looked empty.
  const entries = [
    e("cross-sector", "Global", "wide"),
    e("Power", "South East Asia", "power-sea"),
  ];
  const p = pathway();

  it("does not constrain the sector axis", () => {
    expect(
      entriesInScope(entries, { sectors: [ABSENT_FILTER_TOKEN] }, p).map(
        (x) => x.value,
      ),
    ).toEqual(["wide", "power-sea"]);
  });

  it("does not constrain the geography axis", () => {
    expect(
      entriesInScope(entries, { geographies: [ABSENT_FILTER_TOKEN] }, p).map(
        (x) => x.value,
      ),
    ).toEqual(["wide", "power-sea"]);
  });

  it("is ignored on both axes at once", () => {
    expect(
      entriesInScope(
        entries,
        { sectors: [ABSENT_FILTER_TOKEN], geographies: [ABSENT_FILTER_TOKEN] },
        p,
      ),
    ).toHaveLength(2);
  });

  it("still applies the concrete tokens alongside it", () => {
    // None + Power: the real sector still narrows; None adds no constraint.
    expect(
      entriesInScope(
        entries,
        { sectors: [ABSENT_FILTER_TOKEN, "Steel"] },
        p,
      ).map((x) => x.value),
    ).toEqual(["wide"]);
  });

  it("treats it the same for a pathway that declares no sectors at all", () => {
    const noSectors = pathway({ sectors: [] });
    expect(
      entriesInScope(
        [e("cross-sector", "Global", "wide")],
        { sectors: [ABSENT_FILTER_TOKEN] },
        noSectors,
      ),
    ).toHaveLength(1);
  });
});

describe("widestValue", () => {
  it("returns undefined when nothing is authored", () => {
    expect(widestValue([])).toBeUndefined();
    expect(widestValue(undefined)).toBeUndefined();
  });

  it("returns the only value when there is one entry", () => {
    expect(widestValue([e("cross-sector", "Global", "only")])).toBe("only");
  });

  it("prefers cross-sector over a named sector", () => {
    expect(
      widestValue([
        e("Power", "Global", "narrow"),
        e("cross-sector", "Global", "wide"),
      ]),
    ).toBe("wide");
  });

  it("prefers Global over a region, and a region over a country", () => {
    expect(
      widestValue([
        e("cross-sector", "TH", "country"),
        e("cross-sector", "South East Asia", "region"),
        e("cross-sector", "Global", "global"),
      ]),
    ).toBe("global");
    expect(
      widestValue([
        e("cross-sector", "TH", "country"),
        e("cross-sector", "South East Asia", "region"),
      ]),
    ).toBe("region");
  });

  it("ranks sector ahead of geography", () => {
    // A cross-sector entry wins even when its geography is narrower, matching the
    // "sector > geography" precedence #869 defines for its cost model.
    expect(
      widestValue([
        e("Power", "Global", "power-global"),
        e("cross-sector", "TH", "cross-th"),
      ]),
    ).toBe("cross-th");
  });

  it("preserves an array value intact", () => {
    expect(widestValue([e("cross-sector", "Global", ["a", "b"])])).toEqual([
      "a",
      "b",
    ]);
  });

  it("degrades to undefined for a stale v1 scalar", () => {
    expect(widestValue("Moderate decrease")).toBeUndefined();
  });
});

describe("valuesInScope", () => {
  it("flattens the in-scope entries' values", () => {
    const entries = [
      e("cross-sector", "Global", ["a", "b"]),
      e("Steel", "US", "c"),
    ];
    expect(valuesInScope(entries, { sectors: ["Power"] }, pathway())).toEqual([
      "a",
      "b",
    ]);
  });
});
