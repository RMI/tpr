import { describe, it, expect } from "vitest";
import {
  csvCell,
  jsonToCsv,
  publisherLabel,
  sectorSegmentColumns,
} from "./timeseries-csv.ts";

describe("sectorSegmentColumns", () => {
  it("lists the row's segments and their definitions in the same order", () => {
    const cols = sectorSegmentColumns("power", [
      "Power generation",
      "Energy storage",
    ]);
    expect(cols.sector_segment).toBe("Power generation; Energy storage");
    const definitions = cols.definition_sector_segment.split("; ");
    expect(definitions).toHaveLength(2);
    expect(definitions[0]).toMatch(/Generation of electricity/);
    expect(definitions[1]).toMatch(/Storing electricity/);
  });

  it("leaves both cells empty for a row with no segments", () => {
    expect(sectorSegmentColumns("power", undefined)).toEqual({
      sector_segment: "",
      definition_sector_segment: "",
    });
  });

  it("throws on a segment the sector does not define", () => {
    expect(() => sectorSegmentColumns("power", ["Ironmaking"])).toThrow(
      /Unknown segment "Ironmaking"/,
    );
  });
});

describe("CSV writing", () => {
  it("quotes strings and joins a list into one quoted cell", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(["Power generation", "Energy storage"])).toBe(
      '"Power generation; Energy storage"',
    );
    expect(csvCell(42)).toBe("42");
    expect(csvCell(null)).toBe("");
  });

  it("keeps a list in its own column", () => {
    const csv = jsonToCsv([
      { geography: "Southeast Asia", sector_segment: ["A", "B"], value: 1 },
    ]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("geography,sector_segment,value");
    expect(row).toBe('"Southeast Asia","A; B",1');
  });
});

describe("publisherLabel", () => {
  it("uses the short name when there is one", () => {
    expect(
      publisherLabel({ short: "IEA", full: "International Energy Agency" }),
    ).toBe("IEA");
  });

  it("falls back to the full name when there is no short one", () => {
    // TransitionZero's files carry a full name only.
    expect(publisherLabel({ full: "TransitionZero" })).toBe("TransitionZero");
    expect(publisherLabel({ short: " ", full: "TransitionZero" })).toBe(
      "TransitionZero",
    );
  });
});
