import { describe, it, expect } from "vitest";
import timeseriesJson from "./pathwayTimeseries.v2.json" with { type: "json" };
import { commonSchemas } from "./common/index.ts";
import { validateFilesBySchema } from "../utils/validateData";
import { SECTORS_BY_KEY } from "../utils/timeseriesTaxonomy";
import ieaSteps from "../data/iea/IEA-STEPS-2024_timeseries.json" with { type: "json" };

/** The slice of the schema these assertions read. */
interface RowSchema {
  properties: { technology: { enum: (string | null)[] } };
  then: { properties: { technology: { enum: (string | null)[] } } };
}

const row = (
  timeseriesJson as unknown as {
    properties: { data: { items: RowSchema } };
  }
).properties.data.items;
const allSectors = row.properties.technology.enum;
const power = row.then.properties.technology.enum;

describe("pathwayTimeseries.v2 Power technologies (#977)", () => {
  it("are exactly the taxonomy's Power technology keys", () => {
    // The plots and the CSV download look every row's technology up in the
    // taxonomy, so the schema must not allow one it cannot resolve.
    const taxonomy = Object.keys(SECTORS_BY_KEY.power.technologies ?? {});
    expect(power.filter((t) => t !== null).sort()).toEqual(taxonomy.sort());
    expect(power).toContain(null); // a sector-level row has no technology
  });

  it("are all in the all-sector enum too, since both lists apply", () => {
    expect(power.filter((t) => !allSectors.includes(t))).toEqual([]);
  });

  const validate = (technology: string) => {
    const doc = structuredClone(ieaSteps) as {
      data: { technology: unknown }[];
    };
    doc.data = [{ ...doc.data[0], technology }];
    return validateFilesBySchema(
      [{ name: "row.json", data: doc }],
      [timeseriesJson, ...commonSchemas],
    );
  };

  it.each(["geothermal", "energyStorage"])("accepts a %s row", (technology) => {
    expect(validate(technology).invalid).toEqual([]);
  });

  it.each(["battery", "hydrogen"])("rejects the retired %s", (technology) => {
    expect(validate(technology).invalid).toHaveLength(1);
  });
});

/** A real file with one field replaced, validated against the v2 schema. */
const validateWith = (over: Record<string, unknown>) =>
  validateFilesBySchema(
    [{ name: "file.json", data: { ...structuredClone(ieaSteps), ...over } }],
    [timeseriesJson, ...commonSchemas],
  );

describe("pathwayTimeseries.v2 pathwayId", () => {
  it("accepts one or more distinct pathway ids", () => {
    expect(validateWith({ pathwayId: ["A"] }).invalid).toEqual([]);
    expect(validateWith({ pathwayId: ["A", "B"] }).invalid).toEqual([]);
  });

  it("rejects an empty list, which would make the cross-file check vacuous", () => {
    expect(validateWith({ pathwayId: [] }).invalid).toHaveLength(1);
  });

  it("rejects a repeated id, which would duplicate index entries", () => {
    expect(validateWith({ pathwayId: ["A", "A"] }).invalid).toHaveLength(1);
  });
});
