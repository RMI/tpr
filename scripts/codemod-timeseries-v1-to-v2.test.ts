import { describe, it, expect } from "vitest";
import {
  editText,
  relabel,
  upgradeTimeseries,
} from "./codemod-timeseries-v1-to-v2.ts";
import type { PathwayMetadataV2 } from "../src/types/pathwayMetadata.v2.d.ts";

type Geography = PathwayMetadataV2["geography"];

const geographyById = new Map<string, Geography>([
  ["IEA-X", { global: true, regions: { "Southeast Asia": ["TH", "VN"] } }],
  ["ACE-X", { regions: { ASEAN: ["TH", "VN"] } }],
]);
const renames = {
  "IEA-X": { "South East Asia": "Southeast Asia" },
  "ACE-X": { "South East Asia": "ASEAN" },
};

describe("relabel", () => {
  it("keeps a label the pathway declares", () => {
    expect(relabel("TH", ["IEA-X"], geographyById, renames)).toBe("TH");
  });

  it("renames by the pathway's own entry, so the same label can map differently", () => {
    expect(relabel("South East Asia", ["IEA-X"], geographyById, renames)).toBe(
      "Southeast Asia",
    );
    expect(relabel("South East Asia", ["ACE-X"], geographyById, renames)).toBe(
      "ASEAN",
    );
  });

  it("refuses a label with no rename rather than guessing", () => {
    expect(() =>
      relabel("Asia Pacific", ["IEA-X"], geographyById, renames),
    ).toThrow(/not declared by IEA-X/);
  });

  it("refuses when the pathways a file serves disagree", () => {
    expect(() =>
      relabel("South East Asia", ["IEA-X", "ACE-X"], geographyById, renames),
    ).toThrow();
  });
});

const V1 = "http://pathways.rmi.org/schema/pathwayTimeseries.v1.json";
const v1Text = `{
  "$schema": "${V1}",
  "pathwayId": ["IEA-X"],
  "data": [
    {
      "year": 2030,
      "geography": "South East Asia",
      "sector": "power",
      "technology": null,
      "metric": "capacity",
      "value": 12.5,
      "unit": "GW"
    }
  ]
}
`;

describe("upgradeTimeseries + editText", () => {
  it("changes only $schema, the label and sectorSegment, and the text edit agrees", () => {
    const { doc, renamed } = upgradeTimeseries(
      JSON.parse(v1Text) as Record<string, unknown>,
      new Map([["IEA-X", geographyById.get("IEA-X")]]),
      renames,
    );
    expect(doc.$schema).toBe(
      "http://pathways.rmi.org/schema/pathwayTimeseries.v2.json",
    );
    expect(renamed).toEqual(new Map([["South East Asia", "Southeast Asia"]]));

    const edited = editText(v1Text, renamed);
    expect(JSON.parse(edited)).toEqual(doc);
    // Every other line survives byte for byte.
    expect(edited.split("\n")).toHaveLength(v1Text.split("\n").length + 1);
    expect(edited).toContain('      "value": 12.5,');
  });

  it("puts sectorSegment right after sector", () => {
    const { doc } = upgradeTimeseries(
      JSON.parse(v1Text) as Record<string, unknown>,
      new Map([["IEA-X", geographyById.get("IEA-X")]]),
      renames,
    );
    const row = (doc.data as Record<string, unknown>[])[0];
    expect(Object.keys(row).slice(2, 4)).toEqual(["sector", "sectorSegment"]);
    expect(row.sectorSegment).toEqual(["Power generation"]);
  });

  it("refuses a non-Power row rather than guess its segment", () => {
    const doc = JSON.parse(v1Text.replace('"power"', '"steel"')) as Record<
      string,
      unknown
    >;
    expect(() =>
      upgradeTimeseries(doc, new Map([["IEA-X", geographyById.get("IEA-X")]])),
    ).toThrow(/no segment known/);
  });

  it.each([
    [[], /pathwayId is empty/],
    [["IEA-X", "IEA-X"], /lists an id twice/],
  ])("refuses a pathwayId list v2 rejects: %j", (pathwayId, message) => {
    const doc = {
      ...(JSON.parse(v1Text) as Record<string, unknown>),
      pathwayId,
    };
    expect(() =>
      upgradeTimeseries(
        doc,
        new Map([["IEA-X", geographyById.get("IEA-X")]]),
        renames,
      ),
    ).toThrow(message);
  });

  it("refuses a file whose pathway has no metadata", () => {
    expect(() =>
      upgradeTimeseries(
        JSON.parse(v1Text) as Record<string, unknown>,
        new Map(),
      ),
    ).toThrow(/no metadata for IEA-X/);
  });
});
