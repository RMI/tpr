import { describe, it, expect } from "vitest";
import {
  POWER_SECTOR_DEFINITION,
  SECTORS_BY_KEY,
  technologiesForSector,
  technologyBelongsToSector,
} from "./timeseriesTaxonomy";
import sectorSchema from "../schema/common/sector.v1.json" with { type: "json" };
import technologySchema from "../schema/common/technology.v1.json" with { type: "json" };

const SECTOR_NAMES: string[] = sectorSchema.$defs.displayName.enum;
const TECHNOLOGY_NAMES: string[] = technologySchema.$defs.displayName.enum;

describe("technologiesForSector", () => {
  it("resolves Power to its ten technologies", () => {
    expect(technologiesForSector("Power")).toEqual([
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
    ]);
  });

  it("derives the list from POWER_SECTOR_DEFINITION rather than duplicating it", () => {
    // Drift guard: the metadata-side allowlist and the chart-side taxonomy are
    // the same data, so adding a technology to the definition must be the only
    // edit needed. Same intent as the wrapper-consistency tests in
    // pathwayMetadata.v2.test.ts.
    expect(technologiesForSector("Power")).toEqual(
      Object.values(POWER_SECTOR_DEFINITION.technologies).map(
        (t) => t.displayName,
      ),
    );
  });

  it("returns undefined -- not [] -- for a sector with no definition", () => {
    // The distinction is load-bearing: validateScopedEntries rejects a non-empty
    // list here, and could not tell "defined and empty" from "undefined" if this
    // collapsed to [].
    expect(technologiesForSector("Steel")).toBeUndefined();
  });

  it("returns undefined for a string that is not a sector at all", () => {
    expect(technologiesForSector("Narnia")).toBeUndefined();
  });

  it("keys on display name, not on the camelCase taxonomy key", () => {
    // SECTORS_BY_KEY is keyed "power"; metadata says "Power". Passing the key
    // must not accidentally work, or data could name sectors either way.
    expect(technologiesForSector("power")).toBeUndefined();
  });

  it("only defines technologies for sectors the metadata schema knows", () => {
    for (const sector of Object.values(SECTORS_BY_KEY)) {
      expect(SECTOR_NAMES).toContain(sector.displayName);
    }
  });

  it("only names technologies the metadata schema allows", () => {
    // A displayName here that the enum lacks would be permanently unusable: AJV
    // would reject the data before this check ever saw it.
    for (const sector of Object.values(SECTORS_BY_KEY)) {
      for (const tech of Object.values(sector.technologies)) {
        expect(TECHNOLOGY_NAMES).toContain(tech.displayName);
      }
    }
  });
});

describe("technologyBelongsToSector", () => {
  it("says yes for a technology of a defined sector", () => {
    expect(technologyBelongsToSector("Solar", "Power")).toBe("yes");
  });

  it("says no for a technology outside a defined sector's list", () => {
    expect(technologyBelongsToSector("Hydrogen Use", "Power")).toBe("no");
  });

  it("says unknown -- not no -- for a sector with no definition", () => {
    // The difference matters to non-validation callers: #869's technology axis
    // would silently drop every Steel pathway if this answered "no".
    expect(technologyBelongsToSector("Hydrogen Use", "Steel")).toBe("unknown");
    expect(technologyBelongsToSector("Solar", "Steel")).toBe("unknown");
  });

  it("says unknown for an unrecognised sector", () => {
    expect(technologyBelongsToSector("Solar", "Narnia")).toBe("unknown");
  });

  it("is exact about names, not fuzzy", () => {
    expect(technologyBelongsToSector("solar", "Power")).toBe("no");
    expect(technologyBelongsToSector("Solar Power", "Power")).toBe("no");
  });

  it("classifies every enum technology under Power as yes or no, never unknown", () => {
    for (const tech of TECHNOLOGY_NAMES) {
      expect(technologyBelongsToSector(tech, "Power")).not.toBe("unknown");
    }
  });
});
