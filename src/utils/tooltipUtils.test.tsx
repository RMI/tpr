import { describe, test, expect } from "vitest";
import {
  pathwayTypeTooltips,
  sectorTooltips,
  getPathwayTypeTooltip,
  getSectorTooltip,
  getSectorSegmentTooltip,
  unknownTooltip,
} from "./tooltipUtils";
import { segmentsForSector, UNSEGMENTED } from "./timeseriesTaxonomy";

import pathwayMetadata from "../schema/pathwayMetadata.v1.json";
import sectorSchema from "../schema/common/sector.v1.json" with { type: "json" };

const schema: unknown = pathwayMetadata;

// ✅ Type guards to keep ESLint happy about "unsafe" usage
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

// Safe enum walker (no `any`, no unsafe access)
const getEnumAtPath = (root: unknown, path: readonly string[]): string[] => {
  // Walk the path safely and return [] if missing
  let node: unknown = root;
  for (const segment of path) {
    if (!isRecord(node) || !(segment in node)) return [];
    node = node[segment];
  }
  return isStringArray(node) ? node : [];
};

// ----------------------------------------
// Coverage helper
// ----------------------------------------

type CoverageOpts = {
  label: string;
  schemaValues: readonly string[];
  record: Record<string, string>;
  getter?: (v: string) => string;
};

const expectTooltipCoverage = (opts: CoverageOpts) => {
  const { label, schemaValues, record, getter } = opts;
  const fallback: string = unknownTooltip;

  describe(`${label} tooltip coverage`, () => {
    test("every schema enum value has a tooltip", () => {
      const missing = schemaValues.filter((v) => !(v in record));
      expect(missing).toEqual([]);
    });

    test("no extra keys in tooltip record (kept in sync with schema)", () => {
      const extras = Object.keys(record).filter(
        (k) => !schemaValues.includes(k),
      );
      expect(extras).toEqual([]);
    });

    test("all tooltips are non-empty strings", () => {
      const empties = Object.entries(record)
        .filter(([, val]) => typeof val !== "string" || val.trim().length === 0)
        .map(([k]) => k);
      expect(empties).toEqual([]);
    });

    test("all tooltips end with a period", () => {
      const bad = Object.entries(record)
        .filter(
          ([, val]) => typeof val === "string" && !val.trim().endsWith("."),
        )
        .map(([k]) => k);
      expect(bad).toEqual([]);
    });

    if (getter) {
      test("public getter never falls back for valid enum values", () => {
        const bad = schemaValues
          .map((v) => [v, getter(v)] as const)
          .filter(([, tip]) => tip === fallback);
        expect(bad).toEqual([]);
      });

      test("public getter falls back correctly with unknown value", () => {
        const bad = getter("___this_is_not_a_real_enum_value___");
        expect(bad).toEqual(fallback);
      });

      test("public getter outputs strings ending with period", () => {
        const bad = [...schemaValues, "___this_is_not_a_real_enum_value___"]
          .map((v) => [v, getter(v)] as const)
          .filter(
            ([, tip]) => typeof tip === "string" && !tip.trim().endsWith("."),
          );
        expect(bad).toEqual([]);
      });
    }
  });
};

// ----------------------------------------
// Checks
// ----------------------------------------
const CHECKS: Array<{
  label: string;
  schemaPath: readonly string[];
  record: Record<string, string>;
  getter?: (v: string) => string;
}> = [
  {
    label: "pathwayType",
    schemaPath: ["properties", "pathwayType", "enum"] as const,
    record: pathwayTypeTooltips,
    getter: getPathwayTypeTooltip,
  },
];

describe("Tooltip <-> JSON Schema enum integration", () => {
  CHECKS.forEach(({ label, schemaPath, record, getter }) => {
    const values = getEnumAtPath(schema, schemaPath);
    expectTooltipCoverage({
      label,
      schemaValues: values,
      record,
      getter,
    });
  });
});

// sectors.name now comes from the extracted common schema:
describe("sectors.name tooltip coverage (from common/sector.v1.json)", () => {
  const sectorEnum =
    isRecord(sectorSchema) &&
    isRecord(sectorSchema.$defs) &&
    isRecord(sectorSchema.$defs.displayName) &&
    Array.isArray(sectorSchema.$defs.displayName.enum)
      ? sectorSchema.$defs.displayName.enum
      : [];

  expectTooltipCoverage({
    label: "sectors.name",
    schemaValues: sectorEnum,
    record: sectorTooltips,
    getter: getSectorTooltip,
  });
});

// Sector segments have no schema enum to check against, so the taxonomy itself
// is the reference: getSectorSegmentTooltip reads each segment's definition out
// of SECTORS_BY_KEY rather than a record in tooltipUtils. That makes the
// coverage check below taxonomy-driven instead of enum-driven, which is why it
// is not run through expectTooltipCoverage.
describe("sector segment tooltips (from the timeseries taxonomy)", () => {
  test("returns the taxonomy definition for each of Power's segments", () => {
    expect(
      getSectorSegmentTooltip("Power", "Fuel extraction and processing"),
    ).toBe(
      "Extraction and processing of fuels used as energy carriers for power generation.",
    );
    expect(getSectorSegmentTooltip("Power", "Power generation")).toBe(
      "Generation of electricity at the plant, before it reaches the grid.",
    );
    expect(getSectorSegmentTooltip("Power", "Energy storage")).toBe(
      "Storing electricity for later dispatch (batteries, pumped hydro).",
    );
    expect(
      getSectorSegmentTooltip("Power", "Transmission & Distribution"),
    ).toBe(
      "Moving electricity from generators to consumers, including grid losses.",
    );
  });

  test("every segment Power defines resolves to a real tooltip", () => {
    const segments = segmentsForSector("Power") ?? [];
    expect(segments.length).toBeGreaterThan(0);

    const missing = segments.filter(
      (segment) => getSectorSegmentTooltip("Power", segment) === unknownTooltip,
    );
    expect(missing).toEqual([]);
  });

  test("segment tooltips end with a period, like the others", () => {
    const bad = (segmentsForSector("Power") ?? []).filter(
      (segment) => !getSectorSegmentTooltip("Power", segment).endsWith("."),
    );
    expect(bad).toEqual([]);
  });

  test("falls back for a segment name the sector does not define", () => {
    expect(getSectorSegmentTooltip("Power", "Refining")).toBe(unknownTooltip);
  });

  test("falls back for a sector whose segments nobody has written down", () => {
    // Steel is a real sector with no segments defined (#870).
    expect(getSectorSegmentTooltip("Steel", "Energy storage")).toBe(
      unknownTooltip,
    );
  });

  test("falls back for the universal unsegmented sentinel", () => {
    // UNSEGMENTED is legal under every sector but is not a segment definition.
    expect(getSectorSegmentTooltip("Power", UNSEGMENTED)).toBe(unknownTooltip);
  });
});
