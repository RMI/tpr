import { describe, it, expect } from "vitest";
import {
  columnGeographyOptions,
  columnsGeographyDivergence,
  decodeColumnGeographies,
  defaultGeographyForColumn,
  encodeColumnGeographies,
  resolveSharedSector,
  sharedSectors,
  sectorsCompatible,
  comparisonBlock,
  sharedGeographyOptions,
  geographyDivergence,
  resolveSharedScope,
} from "./comparisonScope";
import type { PathwayMetadataType } from "../types";

interface Shape {
  id: string;
  publisher: string;
  sectors: string[];
  global?: boolean;
  regions?: Record<string, string[]>;
  country?: string[];
}

const pathway = ({
  id,
  publisher,
  sectors,
  global = false,
  regions = {},
  country = [],
}: Shape): PathwayMetadataType =>
  ({
    id,
    // `columnsGeographyDivergence` labels a column by pathway name, not by
    // publisher — two pathways from one publisher have to stay distinguishable.
    name: { full: `Pathway ${id}`, short: id },
    publication: { publisher: { short: publisher, full: `${publisher} Long` } },
    sectors: sectors.map((name) => ({ name, technologies: [] })),
    geography: { global, regions, country },
  }) as unknown as PathwayMetadataType;

/** IEA's real shape: Global plus named regions, its own "Southeast Asia" spelling. */
const iea = pathway({
  id: "IEA-APS-2024",
  publisher: "IEA",
  sectors: ["Buildings", "Steel", "Power", "Other"],
  global: true,
  regions: {
    "Southeast Asia": ["ID", "TH", "VN", "TL"],
    "North America": ["CA", "MX", "US"],
  },
});

/** ACE's real shape: one region, spelled with a space, omitting TL. */
const ace = pathway({
  id: "ACE-ATS-2024",
  publisher: "ACE",
  sectors: ["Power", "Buildings", "Other", "Transport"],
  regions: { "South East Asia": ["ID", "TH", "VN"] },
});

const ace2 = pathway({
  id: "ACE-BAS-2024",
  publisher: "ACE",
  sectors: ["Power", "Buildings", "Other", "Transport"],
  regions: { "South East Asia": ["ID", "TH", "VN"] },
});

describe("sharedSectors", () => {
  it("intersects, in the first pathway's order", () => {
    expect(sharedSectors([iea, ace])).toEqual(["Buildings", "Power", "Other"]);
  });

  it("is empty for pathways with nothing in common", () => {
    const cement = pathway({
      id: "c",
      publisher: "X",
      sectors: ["Cement"],
    });
    expect(sharedSectors([iea, cement])).toEqual([]);
  });

  it("narrows as pathways are added", () => {
    const transportOnly = pathway({
      id: "t",
      publisher: "Y",
      sectors: ["Power", "Transport"],
    });
    expect(sharedSectors([iea, ace, transportOnly])).toEqual(["Power"]);
  });
});

describe("sectorsCompatible", () => {
  it("accepts a candidate sharing a sector with the whole set", () => {
    expect(sectorsCompatible([iea], ace)).toBe(true);
  });

  it("rejects a candidate sharing nothing", () => {
    expect(
      sectorsCompatible(
        [iea],
        pathway({ id: "c", publisher: "X", sectors: ["Cement"] }),
      ),
    ).toBe(false);
  });

  it("intersects the whole set, not pairwise with the first", () => {
    // A∩B = {Power, Steel}; A∩C = {Power, Buildings}; but A∩B∩C = ∅.
    const a = pathway({
      id: "a",
      publisher: "P",
      sectors: ["Power", "Steel", "Buildings"],
    });
    const b = pathway({ id: "b", publisher: "P", sectors: ["Steel"] });
    const c = pathway({ id: "c", publisher: "P", sectors: ["Buildings"] });

    expect(sectorsCompatible([a], b)).toBe(true);
    expect(sectorsCompatible([a], c)).toBe(true);
    // Pairwise-against-the-first would wrongly allow this third pathway.
    expect(sectorsCompatible([a, b], c)).toBe(false);
  });
});

describe("comparisonBlock", () => {
  it("passes a compatible set", () => {
    expect(comparisonBlock([iea, ace])).toBeNull();
  });

  it("never blocks fewer than two pathways", () => {
    expect(comparisonBlock([iea])).toBeNull();
    expect(comparisonBlock([])).toBeNull();
  });

  it("names the offender and what was shared before it", () => {
    const cement = pathway({
      id: "cement",
      publisher: "X",
      sectors: ["Cement"],
    });
    const block = comparisonBlock([iea, ace, cement]);

    expect(block).not.toBeNull();
    expect(block?.offenders.map((p) => p.id)).toEqual(["cement"]);
    expect(block?.sharedBefore).toEqual(["Buildings", "Power", "Other"]);
  });
});

describe("columnGeographyOptions", () => {
  /** Stub availability: these tokens are plottable, nothing else is. */
  const holding = (...tokens: string[]) => ({
    hasSector: () => true,
    hasMetric: () => true,
    hasGeography: (raw: string) => tokens.includes(raw),
  });

  const nothing = holding();

  it("offers only this pathway's own geographies", () => {
    const tokens = columnGeographyOptions(ace, nothing).map((o) => o.token);
    expect(tokens).toEqual(["South East Asia"]);
    // IEA's spelling belongs to IEA's column, not this one.
    expect(tokens).not.toContain("Southeast Asia");
  });

  it("labels plainly, with no publisher suffix", () => {
    // The column carries the provenance, so the label does not have to.
    expect(columnGeographyOptions(iea, nothing).map((o) => o.label)).toContain(
      "Southeast Asia",
    );
    expect(
      columnGeographyOptions(iea, nothing)
        .map((o) => o.label)
        .join(" "),
    ).not.toContain("(IEA)");
  });

  it("names a country by name rather than its ISO code", () => {
    const withCountry = pathway({
      id: "wc",
      publisher: "Z",
      sectors: ["Power"],
      country: ["US"],
    });
    const option = columnGeographyOptions(withCountry, nothing)[0];

    expect(option.token).toBe("US");
    expect(option.label).toBe("United States of America");
  });

  it("orders global above regions above countries", () => {
    const mixed = pathway({
      id: "m",
      publisher: "Z",
      sectors: ["Power"],
      global: true,
      regions: { "North America": ["US"] },
      country: ["SG"],
    });
    expect(columnGeographyOptions(mixed, nothing).map((o) => o.kind)).toEqual([
      "global",
      "region",
      "country",
    ]);
  });

  it("leads with what this tool can actually plot", () => {
    // 13 of IEA's 15 declared geographies have no timeseries rows, so the two
    // that do have to come first or they are lost in the list.
    const options = columnGeographyOptions(iea, holding("Southeast Asia"));

    expect(options[0].token).toBe("Southeast Asia");
    expect(options[0].available).toBe(true);
    expect(options.slice(1).every((o) => !o.available)).toBe(true);
  });

  it("keeps the kind ordering within each availability group", () => {
    const mixed = pathway({
      id: "m",
      publisher: "Z",
      sectors: ["Power"],
      global: true,
      regions: { "North America": ["US"] },
      country: ["SG"],
    });
    // Only the country is plottable, so it leads; the rest keep global→region.
    expect(
      columnGeographyOptions(mixed, holding("SG")).map((o) => o.kind),
    ).toEqual(["country", "global", "region"]);
  });

  it("flags everything unavailable when the pathway has no timeseries", () => {
    const options = columnGeographyOptions(iea, nothing);
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => !o.available)).toBe(true);
  });

  it("degrades to an empty list for a pathway declaring no geography", () => {
    const none = pathway({ id: "n", publisher: "Z", sectors: ["Power"] });
    expect(columnGeographyOptions(none, nothing)).toEqual([]);
  });
});

describe("sharedGeographyOptions", () => {
  it("does not merge near-equivalent spellings", () => {
    // The publishers wrote different things; the list says so. resolveGeography's
    // variant arm is what makes either choice resolve for both columns.
    const tokens = sharedGeographyOptions([iea, ace]).map((o) => o.token);
    expect(tokens).toContain("Southeast Asia");
    expect(tokens).toContain("South East Asia");
  });

  it("labels options by publisher when publishers differ", () => {
    const labels = sharedGeographyOptions([iea, ace]).map((o) => o.label);
    expect(labels).toContain("Southeast Asia (IEA)");
    expect(labels).toContain("South East Asia (ACE)");
  });

  it("labels a country token by name, not by ISO code", () => {
    // The label is what the badge shows, so it follows the detail page's
    // geographyLabel treatment rather than echoing the raw token.
    const withCountry = pathway({
      id: "wc",
      publisher: "Z",
      sectors: ["Power"],
      country: ["US"],
    });
    const option = sharedGeographyOptions([withCountry])[0];

    expect(option.token).toBe("US");
    expect(option.label).toBe("United States of America");
  });

  it("suppresses the publisher suffix when they all share one", () => {
    // "(ACE)" on every option of an ACE-only comparison is pure noise.
    const options = sharedGeographyOptions([ace, ace2]);
    expect(options.map((o) => o.label)).toEqual(["South East Asia"]);
  });

  it("collapses an identical token and lists every publisher declaring it", () => {
    const shared = pathway({
      id: "s",
      publisher: "SDSN",
      sectors: ["Power"],
      global: true,
    });
    const global = sharedGeographyOptions([iea, shared]).find(
      (o) => o.token === "Global",
    );

    expect(global?.publishers).toEqual(["IEA", "SDSN"]);
    expect(global?.declaredBy).toEqual(["IEA-APS-2024", "s"]);
  });

  it("leads with the most widely declared option", () => {
    const shared = pathway({
      id: "s",
      publisher: "SDSN",
      sectors: ["Power"],
      global: true,
    });
    // Global is declared by both; IEA's regions by one.
    expect(sharedGeographyOptions([iea, shared])[0].token).toBe("Global");
  });

  it("ranks global above regions above countries", () => {
    const withCountry = pathway({
      id: "wc",
      publisher: "Z",
      sectors: ["Power"],
      global: true,
      regions: { "North America": ["US"] },
      country: ["SG"],
    });
    expect(sharedGeographyOptions([withCountry]).map((o) => o.kind)).toEqual([
      "global",
      "region",
      "country",
    ]);
  });
});

describe("geographyDivergence", () => {
  it("reports nothing when no geography is selected", () => {
    expect(geographyDivergence(null, [iea, ace])).toEqual({ kind: "none" });
  });

  it("reports nothing for a single pathway", () => {
    expect(geographyDivergence("Southeast Asia", [iea])).toEqual({
      kind: "none",
    });
  });

  it("reports which publishers do not declare the selection", () => {
    // ACE publishes no Global, so its column must show something else.
    expect(geographyDivergence("Global", [iea, ace])).toEqual({
      kind: "notDeclared",
      missing: ["ACE"],
    });
  });

  it("reports nothing when everyone's selection is Global", () => {
    const otherGlobal = pathway({
      id: "og",
      publisher: "SDSN",
      sectors: ["Power"],
      global: true,
    });
    // scopeISOSet returns null for global — two "everything"s do not disagree.
    expect(geographyDivergence("Global", [iea, otherGlobal])).toEqual({
      kind: "none",
    });
  });

  it("reports nothing when memberships match exactly", () => {
    expect(geographyDivergence("South East Asia", [ace, ace2])).toEqual({
      kind: "none",
    });
  });

  it("names the countries only one publisher includes", () => {
    // Both declare the same spelling, but IEA's list carries TL and ACE's
    // does not — the real discrepancy behind commit 34e975a.
    const ieaSameSpelling = pathway({
      id: "iea2",
      publisher: "IEA",
      sectors: ["Power"],
      regions: { "South East Asia": ["ID", "TH", "VN", "TL"] },
    });

    const result = geographyDivergence("South East Asia", [
      ieaSameSpelling,
      ace,
    ]);

    expect(result.kind).toBe("membersDiffer");
    if (result.kind === "membersDiffer") {
      expect(result.exclusives).toEqual([
        { publisher: "IEA", countries: ["TL"] },
      ]);
    }
  });
});

describe("resolveSharedScope", () => {
  const noFilters = { sector: null, geography: null };

  it("defaults sector to Power when shared", () => {
    expect(resolveSharedScope(noFilters, [iea, ace]).sector).toBe("Power");
  });

  it("falls back to the first shared sector when Power is not shared", () => {
    const a = pathway({
      id: "a",
      publisher: "P",
      sectors: ["Steel", "Cement"],
    });
    const b = pathway({
      id: "b",
      publisher: "P",
      sectors: ["Cement", "Steel"],
    });
    expect(resolveSharedScope(noFilters, [a, b]).sector).toBe("Steel");
  });

  it("defaults geography to the most widely declared option", () => {
    expect(resolveSharedScope(noFilters, [ace, ace2]).geography).toBe(
      "South East Asia",
    );
  });

  it("prefers a search sector that is shared", () => {
    expect(
      resolveSharedScope({ sector: "Buildings", geography: null }, [iea, ace])
        .sector,
    ).toBe("Buildings");
  });

  it("ignores a search sector the pathways do not share", () => {
    expect(
      resolveSharedScope({ sector: "Cement", geography: null }, [iea, ace])
        .sector,
    ).toBe("Power");
  });

  it("seeds geography from the search selection when it maps onto an option", () => {
    // "Southeast Asia" is the filter-vocabulary region; both pathways resolve a
    // token for it, and the winner must be one of the offered options.
    const scope = resolveSharedScope(
      { sector: null, geography: "Southeast Asia" },
      [ace, ace2],
    );
    expect(scope.geography).toBe("South East Asia");
  });

  it("fills in each axis independently", () => {
    const scope = resolveSharedScope(
      { sector: null, geography: "Southeast Asia" },
      [ace, ace2],
    );
    expect(scope).toEqual({ sector: "Power", geography: "South East Asia" });
  });

  it("degrades to nulls for an empty comparison", () => {
    expect(resolveSharedScope(noFilters, [])).toEqual({
      sector: null,
      geography: null,
    });
  });
});

describe("missing sector data is tolerated, not treated as a clash", () => {
  // `sectors` is required by the schema but has no minItems, so an empty list
  // is valid data. It must read as unknown rather than as incompatible.
  const sectorless = pathway({ id: "unknown", publisher: "Q", sectors: [] });

  it("skips a sector-less pathway when intersecting", () => {
    expect(sharedSectors([iea, sectorless])).toEqual(sharedSectors([iea]));
  });

  it("returns nothing when no pathway declares a sector", () => {
    expect(sharedSectors([sectorless])).toEqual([]);
  });

  it("lets a sector-less pathway be added", () => {
    expect(sectorsCompatible([iea], sectorless)).toBe(true);
    expect(sectorsCompatible([sectorless], iea)).toBe(true);
  });

  it("never blocks a comparison on missing data alone", () => {
    expect(comparisonBlock([iea, sectorless])).toBeNull();
    expect(comparisonBlock([sectorless, sectorless])).toBeNull();
  });

  it("still blocks a genuine clash alongside missing data", () => {
    const cement = pathway({ id: "cem", publisher: "X", sectors: ["Cement"] });
    expect(comparisonBlock([iea, sectorless, cement])).not.toBeNull();
  });
});

describe("encode/decodeColumnGeographies", () => {
  it("round-trips a per-column selection", () => {
    const selection = {
      "IEA-APS-2024": "Southeast Asia",
      "ACE-ATS-2024": "South East Asia",
    };
    expect(decodeColumnGeographies(encodeColumnGeographies(selection))).toEqual(
      selection,
    );
  });

  it("keys by pathway id, not by column position", () => {
    // Reordering ?ids= must not repoint a column at another pathway's choice.
    const encoded = encodeColumnGeographies({ b: "Global", a: "VN" });
    expect(decodeColumnGeographies(encoded)).toEqual({ b: "Global", a: "VN" });
  });

  it("percent-encodes spaces so the param stays one token per column", () => {
    expect(encodeColumnGeographies({ x: "South East Asia" })).toBe(
      "x:South%20East%20Asia",
    );
  });

  it("survives a token containing the delimiters", () => {
    // No shipped token does, but region labels are publisher prose.
    const selection = { x: "Asia, Pacific: East" };
    expect(decodeColumnGeographies(encodeColumnGeographies(selection))).toEqual(
      selection,
    );
  });

  it("reads an empty param as no selection", () => {
    expect(decodeColumnGeographies(null)).toEqual({});
    expect(decodeColumnGeographies("")).toEqual({});
  });

  it("drops unparseable entries rather than repairing them", () => {
    // A stale or hand-edited link degrades to the per-column defaults, the
    // same rule useUrlParamState follows for a single value.
    expect(decodeColumnGeographies("no-colon,x:Global,:empty-id,y:")).toEqual({
      x: "Global",
    });
  });

  it("does not throw on a malformed escape", () => {
    expect(decodeColumnGeographies("x:%zz,y:Global")).toEqual({ y: "Global" });
  });

  it("omits empty selections when encoding", () => {
    expect(encodeColumnGeographies({ x: "", y: "Global" })).toBe("y:Global");
  });
});

describe("resolveSharedSector", () => {
  it("defaults to Power when shared", () => {
    expect(resolveSharedSector({ sector: null }, [iea, ace])).toBe("Power");
  });

  it("falls back to the first shared sector when Power is not shared", () => {
    const a = pathway({
      id: "a",
      publisher: "P",
      sectors: ["Steel", "Cement"],
    });
    const b = pathway({
      id: "b",
      publisher: "P",
      sectors: ["Cement", "Steel"],
    });
    expect(resolveSharedSector({ sector: null }, [a, b])).toBe("Steel");
  });

  it("prefers a search sector that is shared", () => {
    expect(resolveSharedSector({ sector: "Buildings" }, [iea, ace])).toBe(
      "Buildings",
    );
  });

  it("ignores a search sector the pathways do not share", () => {
    expect(resolveSharedSector({ sector: "Cement" }, [iea, ace])).toBe("Power");
  });

  it("degrades to null for an empty comparison", () => {
    expect(resolveSharedSector({ sector: null }, [])).toBeNull();
  });
});

describe("defaultGeographyForColumn", () => {
  const options = (...tokens: string[]) =>
    tokens.map((token) => ({
      token,
      label: token,
      kind: "region" as const,
      available: true,
    }));

  it("leads with the first option, which is the broadest with data", () => {
    // columnGeographyOptions ranks plottable geographies first, so this means
    // "the broadest geography that actually charts" rather than merely the
    // broadest declared.
    expect(
      defaultGeographyForColumn(
        { geography: null },
        ace,
        options("South East Asia", "Global"),
      ),
    ).toBe("South East Asia");
  });

  it("prefers the search selection, in this publication's own spelling", () => {
    // "Southeast Asia" is the filter vocabulary; ACE writes it with a space.
    expect(
      defaultGeographyForColumn(
        { geography: "Southeast Asia" },
        ace,
        options("Global", "South East Asia"),
      ),
    ).toBe("South East Asia");
  });

  it("ignores a search selection this column cannot offer", () => {
    expect(
      defaultGeographyForColumn(
        { geography: "Europe" },
        ace,
        options("South East Asia"),
      ),
    ).toBe("South East Asia");
  });

  it("degrades to null for a column with no geographies", () => {
    expect(defaultGeographyForColumn({ geography: null }, ace, [])).toBeNull();
  });
});

describe("columnsGeographyDivergence", () => {
  it("says nothing for a single column", () => {
    expect(
      columnsGeographyDivergence({ [ace.id]: "South East Asia" }, [ace]),
    ).toEqual({ kind: "none" });
  });

  it("says nothing when a column has made no choice", () => {
    expect(
      columnsGeographyDivergence({ [ace.id]: "South East Asia" }, [ace, ace2]),
    ).toEqual({ kind: "none" });
  });

  it("says nothing when both columns cover the same countries", () => {
    expect(
      columnsGeographyDivergence(
        { [ace.id]: "South East Asia", [ace2.id]: "South East Asia" },
        [ace, ace2],
      ),
    ).toEqual({ kind: "none" });
  });

  it("says nothing when both columns are global", () => {
    const other = pathway({
      id: "og",
      publisher: "SDSN",
      sectors: ["Power"],
      global: true,
    });
    expect(
      columnsGeographyDivergence({ [iea.id]: "Global", [other.id]: "Global" }, [
        iea,
        other,
      ]),
    ).toEqual({ kind: "none" });
  });

  it("says nothing for two spellings of the same country set", () => {
    // The genuine improvement over comparing names: IEA writes "Southeast
    // Asia" and ACE writes "South East Asia". If they cover the same
    // countries, the columns ARE like-for-like and warning would be noise.
    const ieaMatching = pathway({
      id: "iea-matching",
      publisher: "IEA",
      sectors: ["Power"],
      regions: { "Southeast Asia": ["ID", "TH", "VN"] },
    });
    expect(
      columnsGeographyDivergence(
        { [ieaMatching.id]: "Southeast Asia", [ace.id]: "South East Asia" },
        [ieaMatching, ace],
      ),
    ).toEqual({ kind: "none" });
  });

  it("names the countries only one column includes", () => {
    // The real ACE-vs-IEA discrepancy: IEA's list carries Timor-Leste.
    const ieaSameSpelling = pathway({
      id: "iea2",
      publisher: "IEA",
      sectors: ["Power"],
      regions: { "South East Asia": ["ID", "TH", "VN", "TL"] },
    });
    const result = columnsGeographyDivergence(
      { [ieaSameSpelling.id]: "South East Asia", [ace.id]: "South East Asia" },
      [ieaSameSpelling, ace],
    );

    expect(result.kind).toBe("membersDiffer");
    if (result.kind === "membersDiffer") {
      expect(result.token).toBe("South East Asia");
      expect(result.exclusives).toEqual([
        { column: ieaSameSpelling.name.short, countries: ["TL"] },
      ]);
    }
  });

  it("keys the difference by column, so two pathways from one publisher do not collide", () => {
    // geographyDivergence keyed by publisher label, which made IEA-APS and
    // IEA-STEPS indistinguishable.
    const a = pathway({
      id: "a",
      publisher: "IEA",
      sectors: ["Power"],
      regions: { SEA: ["ID", "TH"] },
    });
    const b = pathway({
      id: "b",
      publisher: "IEA",
      sectors: ["Power"],
      regions: { SEA: ["ID"] },
    });
    const result = columnsGeographyDivergence({ a: "SEA", b: "SEA" }, [a, b]);

    expect(result.kind).toBe("membersDiffer");
    if (result.kind === "membersDiffer") {
      expect(result.exclusives.map((e) => e.column)).toEqual([a.name.short]);
    }
  });

  it("reports columns scoped to different geographies", () => {
    const result = columnsGeographyDivergence(
      { [iea.id]: "Global", [ace.id]: "South East Asia" },
      [iea, ace],
    );

    expect(result.kind).toBe("differentGeographies");
    if (result.kind === "differentGeographies") {
      expect(result.columns).toEqual([
        { column: iea.name.short, label: "Global" },
        { column: ace.name.short, label: "South East Asia" },
      ]);
    }
  });

  it("treats an unmapped region as unknown, not as different", () => {
    // A data gap must not look like a rule — the same principle the sector
    // restriction follows. Real case: regions: { Europe: [] }.
    const unmapped = pathway({
      id: "u",
      publisher: "Z",
      sectors: ["Power"],
      regions: { Europe: [] },
    });
    expect(
      columnsGeographyDivergence(
        { [unmapped.id]: "Europe", [ace.id]: "South East Asia" },
        [unmapped, ace],
      ),
    ).toEqual({ kind: "none" });
  });
});
