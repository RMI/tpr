import { describe, it, expect } from "vitest";
import timeseriesJson from "./pathwayTimeseries.v2.json" with { type: "json" };
import { commonSchemas } from "./common/index.ts";
import { validateFilesBySchema } from "../utils/validateData";
import ieaSteps from "../data/iea/IEA-STEPS-2024_timeseries.json" with { type: "json" };

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
