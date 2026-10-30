import { describe, it, expect } from "vitest";
import { validateTimeseries } from "./validateTimeseries";
import type { PathwayMetadataV2 } from "../types/pathwayMetadata.v2";
import type { PathwayTimeseriesV2 } from "../types/pathwayTimeseries.v2";

type Row = PathwayTimeseriesV2["data"][number];

const row = (over: Partial<Row> = {}): Row => ({
  year: 2030,
  geography: "Global",
  sector: "power",
  sectorSegment: ["Power generation"],
  technology: null,
  metric: "capacity",
  value: 1,
  unit: "GW",
  ...over,
});

/**
 * AJV already guarantees the file's shape, so the document carries only what
 * the cross-file check reads — hence the cast.
 */

const timeseries = (rows: Row[], pathwayId = ["P1"]): PathwayTimeseriesV2 =>
  ({ pathwayId, data: rows }) as unknown as PathwayTimeseriesV2;

const metadata = new Map<string, PathwayMetadataV2["geography"]>([
  [
    "P1",
    {
      global: true,
      regions: { "Southeast Asia": ["TH", "VN"] },
      country: ["SG"],
    },
  ],
  ["P2", { regions: { ASEAN: ["TH", "VN"] } }],
]);

describe("validateTimeseries — geography", () => {
  it("accepts every geography the pathway declares", () => {
    const rows = ["Global", "Southeast Asia", "TH", "SG"].map((geography) =>
      row({ geography }),
    );
    expect(validateTimeseries(timeseries(rows), metadata)).toEqual([]);
  });

  it("rejects a region spelled differently from the metadata", () => {
    // The #945 case this schema exists to end: the label has to be the
    // publication's own, exactly as the metadata declares it.
    expect(
      validateTimeseries(
        timeseries([row({ geography: "South East Asia" })]),
        metadata,
      ),
    ).toEqual([
      '/data/0/geography "South East Asia" is not a geography pathway P1 declares',
    ]);
  });

  it("rejects Global when the pathway is not global", () => {
    expect(
      validateTimeseries(timeseries([row()], ["P2"]), metadata),
    ).toHaveLength(1);
  });

  it("requires every pathway the file serves to declare the geography", () => {
    // P1 declares Southeast Asia, P2 calls the same countries ASEAN.
    const errors = validateTimeseries(
      timeseries([row({ geography: "Southeast Asia" })], ["P1", "P2"]),
      metadata,
    );
    expect(errors).toEqual([
      '/data/0/geography "Southeast Asia" is not a geography pathway P2 declares',
    ]);
  });

  it("reports a pathway id with no metadata", () => {
    expect(
      validateTimeseries(timeseries([row()], ["P1", "GONE"]), metadata),
    ).toEqual(['/pathwayId/1 "GONE" is not the id of any pathway']);
  });

  describe("a country written by name (#998)", () => {
    it("says which code to use for a declared country", () => {
      expect(
        validateTimeseries(
          timeseries([row({ geography: "Singapore" })]),
          metadata,
        ),
      ).toEqual([
        '/data/0/geography "Singapore" is not a geography pathway P1 declares -- use "SG"',
      ]);
    });

    it("matches a region's member, ignoring case and spacing", () => {
      expect(
        validateTimeseries(
          timeseries([row({ geography: " thailand " })], ["P1", "P2"]),
          metadata,
        ),
      ).toEqual([
        '/data/0/geography " thailand " is not a geography pathway P1 declares -- use "TH"',
        '/data/0/geography " thailand " is not a geography pathway P2 declares -- use "TH"',
      ]);
    });

    it("gives no hint for a country the pathway does not declare", () => {
      expect(
        validateTimeseries(timeseries([row({ geography: "Japan" })]), metadata),
      ).toEqual([
        '/data/0/geography "Japan" is not a geography pathway P1 declares',
      ]);
    });

    it("gives no hint for a name Intl spells differently", () => {
      // Intl's English name is "United States"; the hint is an exact match.
      const usa = new Map([["P3", { country: ["US"] }]]) as typeof metadata;
      expect(
        validateTimeseries(
          timeseries([row({ geography: "United States of America" })], ["P3"]),
          usa,
        ),
      ).toEqual([
        '/data/0/geography "United States of America" is not a geography pathway P3 declares',
      ]);
    });
  });

  it("reports a repeated mistake once, with a row count", () => {
    const rows = [1, 2, 3].map(() => row({ geography: "Atlantis" }));
    expect(validateTimeseries(timeseries(rows), metadata)).toEqual([
      '/data/0/geography "Atlantis" is not a geography pathway P1 declares (and 2 more rows)',
    ]);
  });
});

describe("validateTimeseries — sectorSegment", () => {
  it("accepts segments of the row's sector", () => {
    expect(
      validateTimeseries(
        timeseries([
          row({ sectorSegment: ["Power generation", "Energy storage"] }),
        ]),
        metadata,
      ),
    ).toEqual([]);
  });

  it("rejects a segment of another sector", () => {
    expect(
      validateTimeseries(
        timeseries([row({ sectorSegment: ["Ironmaking"] })]),
        metadata,
      ),
    ).toEqual([
      '/data/0/sectorSegment/0 "Ironmaking" is not a segment of Power',
    ]);
  });

  it.each(["Unspecified", "Not covered", "No information"])(
    "rejects the sentinel %s: a data row covers a known segment",
    (sentinel) => {
      expect(
        validateTimeseries(
          timeseries([
            row({ sectorSegment: [sentinel] as Row["sectorSegment"] }),
          ]),
          metadata,
        ),
      ).toHaveLength(1);
    },
  );

  it("rejects any segment on a sector with none defined", () => {
    expect(
      validateTimeseries(
        timeseries([
          row({ sector: "buildings", sectorSegment: ["Power generation"] }),
        ]),
        metadata,
      ),
    ).toEqual([
      '/data/0/sectorSegment/0 sector "buildings" has no segments defined, so it cannot carry "Power generation"',
    ]);
  });
});
