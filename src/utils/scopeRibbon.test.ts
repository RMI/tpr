import { describe, it, expect } from "vitest";
import {
  filterOptions,
  geographyLevels,
  geographyOptions,
  levelOf,
  needsSearch,
  onlySectorText,
  orderOptions,
  sectorOptions,
  slotState,
  type RibbonOption,
} from "./scopeRibbon";
import { pathwayMetadata } from "../data/pathwayMetadata";
import { scopeAvailability } from "./scopeAvailability";
import { datasetsForPathway, getTimeseriesIndex } from "./timeseriesIndex";
import type { Geography } from "../types";

const opt = (label: string, hasData = true, token = label): RibbonOption => ({
  token,
  label,
  hasData,
});

describe("geographyLevels", () => {
  it("reads each level from the bucket it is declared in", () => {
    const geo = {
      global: true,
      regions: { ASEAN: ["ID", "TH"], EU: ["DE", "FR"] },
      country: ["ID", "VN"],
    } as unknown as Geography;
    expect(geographyLevels(geo)).toEqual({
      global: ["Global"],
      region: ["ASEAN", "EU"],
      country: ["ID", "VN"],
    });
  });

  it("puts a region named like a country under region, not country", () => {
    // IEA declared a region keyed "CN". `geographyKind` guesses from the
    // label and once showed it as a country; the bucket is the truth.
    const geo = { regions: { CN: ["CN", "HK"] } } as unknown as Geography;
    expect(geographyLevels(geo).region).toEqual(["CN"]);
    expect(geographyLevels(geo).country).toEqual([]);
  });

  it("returns empty levels for a missing geography", () => {
    expect(geographyLevels(null)).toEqual({
      global: [],
      region: [],
      country: [],
    });
  });
});

describe("levelOf", () => {
  const geo = {
    global: true,
    regions: { ASEAN: ["ID"] },
    country: ["ID"],
  } as unknown as Geography;

  it("names the slot a selected token lives in", () => {
    expect(levelOf("Global", geo)).toBe("global");
    expect(levelOf("ASEAN", geo)).toBe("region");
    expect(levelOf("ID", geo)).toBe("country");
  });

  it("returns null for no selection or an undeclared token", () => {
    expect(levelOf(null, geo)).toBeNull();
    expect(levelOf("EU", geo)).toBeNull();
  });
});

describe("orderOptions", () => {
  it("puts options with data first, each group alphabetical", () => {
    const { withData, withoutData } = orderOptions([
      opt("Steel", false),
      opt("Power"),
      opt("Buildings", false),
      opt("Aviation"),
    ]);
    expect(withData.map((o) => o.label)).toEqual(["Aviation", "Power"]);
    expect(withoutData.map((o) => o.label)).toEqual(["Buildings", "Steel"]);
  });

  it("keeps every declared option: nothing is hidden", () => {
    const all = [opt("A"), opt("B", false), opt("C", false)];
    const { withData, withoutData } = orderOptions(all);
    expect(withData.length + withoutData.length).toBe(all.length);
  });
});

describe("slotState", () => {
  it("is inactive with an explanation when the level is not declared", () => {
    expect(slotState("global", [])).toEqual({
      kind: "inactive",
      label: "Global",
      tooltip: "This pathway doesn't cover Global.",
    });
    expect(slotState("region", []).kind).toBe("inactive");
    expect(slotState("region", [])).toMatchObject({
      label: "Region",
      tooltip: "This pathway doesn't include any regions.",
    });
    expect(slotState("country", [])).toMatchObject({
      label: "Country",
      tooltip: "This pathway doesn't include any countries.",
    });
  });

  it("covers a pathway that declares no sectors", () => {
    // The spec's tooltip table has no row for this, but the schema allows an
    // empty `sectors` list, so the state is reachable.
    expect(slotState("sector", [])).toMatchObject({
      kind: "inactive",
      label: "Sector",
      tooltip: "This pathway doesn't include any sectors.",
    });
  });

  it("keeps a lone no-data option's name, as in the spec's edge fixture", () => {
    // EDGE-ONE-COUNTRY-NO-DATA: no real pathway hits this today.
    expect(slotState("country", [opt("Indonesia", false, "ID")])).toEqual({
      kind: "inactive",
      label: "Indonesia",
      tooltip: "No data for Indonesia in TPR yet.",
    });
  });

  it("counts the options when several exist and none has data", () => {
    expect(
      slotState("region", [opt("A", false), opt("B", false)]),
    ).toMatchObject({
      kind: "inactive",
      label: "Region",
      tooltip: "None of this pathway's 2 regions has data in TPR yet.",
    });
    expect(
      slotState("sector", [opt("Power", false), opt("Steel", false)]),
    ).toMatchObject({
      label: "Sector",
      tooltip: "None of this pathway's 2 sectors has data in TPR yet.",
    });
  });

  it("is single when exactly one option exists and it has data", () => {
    const only = opt("ASEAN");
    expect(slotState("region", [only])).toEqual({
      kind: "single",
      option: only,
    });
  });

  it("is a dropdown for two or more options with at least one with data", () => {
    const state = slotState("sector", [opt("Steel", false), opt("Power")]);
    expect(state.kind).toBe("dropdown");
    if (state.kind === "dropdown") {
      expect(state.withData.map((o) => o.label)).toEqual(["Power"]);
      expect(state.withoutData.map((o) => o.label)).toEqual(["Steel"]);
    }
  });
});

describe("search", () => {
  it("appears only above eight options", () => {
    expect(needsSearch(8)).toBe(false);
    expect(needsSearch(9)).toBe(true);
  });

  it("matches the label or the token, ignoring case and spaces", () => {
    const options = [
      opt("People's Republic of China", true, "CN"),
      opt("Viet Nam", true, "VN"),
    ];
    // The library names put the familiar word second; the code still finds it.
    expect(filterOptions(options, "china").map((o) => o.token)).toEqual(["CN"]);
    expect(filterOptions(options, " cn ").map((o) => o.token)).toEqual(["CN"]);
    expect(filterOptions(options, "VIET").map((o) => o.token)).toEqual(["VN"]);
  });

  it("returns everything for an empty query, and nothing for no match", () => {
    const options = [opt("A"), opt("B")];
    expect(filterOptions(options, "")).toHaveLength(2);
    expect(filterOptions(options, "zzz")).toHaveLength(0);
  });
});

it("phrases the read-only sector's closing line", () => {
  expect(onlySectorText("Power")).toBe(
    "Power is the only sector this pathway covers.",
  );
});

/*
 * The spec's §11 fixtures, run against REAL pathways with the app's own
 * availability rule. These fail loudly if a fixture leaves the corpus or its
 * data changes enough to move a slot into a different state, which is the
 * point: the spec's examples should stay true, or be updated deliberately.
 */
describe("spec fixtures against the real corpus", () => {
  const index = getTimeseriesIndex();
  const states = (id: string) => {
    const p = pathwayMetadata.find((x) => x.id === id);
    if (!p) throw new Error(`fixture drift: ${id} is no longer in the corpus`);
    const a = scopeAvailability(p, datasetsForPathway(index, p.id), {
      keyFeatures: true,
    });
    const levels = geographyLevels(p.geography);
    return {
      sector: slotState(
        "sector",
        sectorOptions(
          p.sectors.map((s) => s.name),
          a,
        ),
      ),
      global: slotState("global", geographyOptions(levels.global, a)),
      region: slotState("region", geographyOptions(levels.region, a)),
      country: slotState("country", geographyOptions(levels.country, a)),
    };
  };

  it("TZ-BAU-2024: read-only sector, no Global, one region, a country list", () => {
    const s = states("TZ-BAU-2024");
    expect(s.sector.kind).toBe("single");
    expect(s.global).toMatchObject({
      kind: "inactive",
      tooltip: "This pathway doesn't cover Global.",
    });
    expect(s.region).toMatchObject({
      kind: "single",
      option: { token: "ASEAN" },
    });
    expect(s.country.kind).toBe("dropdown");
  });

  it("CGS-IESR-1-5-2024: read-only sector, only a single country", () => {
    const s = states("CGS-IESR-1-5-2024");
    expect(s.sector.kind).toBe("single");
    expect(s.global.kind).toBe("inactive");
    expect(s.region.kind).toBe("inactive");
    expect(s.country).toMatchObject({
      kind: "single",
      option: { token: "ID" },
    });
  });

  it("NGFS-NZ2050-MESSAGE-2024: regions only, Country inactive", () => {
    const s = states("NGFS-NZ2050-MESSAGE-2024");
    expect(s.region.kind).toBe("dropdown");
    expect(s.country).toMatchObject({
      kind: "inactive",
      tooltip: "This pathway doesn't include any countries.",
    });
  });

  it("JRC-GECO-1.5C-2025: long lists with a no-data group", () => {
    const s = states("JRC-GECO-1.5C-2025");
    expect(s.sector.kind).toBe("dropdown");
    if (s.sector.kind === "dropdown") {
      expect(s.sector.withData).toHaveLength(1);
      expect(s.sector.withoutData).toHaveLength(13);
    }
    if (s.country.kind === "dropdown") {
      expect(s.country.withData).toHaveLength(24);
      expect(s.country.withoutData).toHaveLength(3);
    }
  });
});
