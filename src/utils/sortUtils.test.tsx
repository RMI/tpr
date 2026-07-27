import { describe, it, expect } from "vitest";
import { prioritizeGeographies, sortPathwayType } from "../utils/sortUtils";
describe("sortPathwayType", () => {
  it("sorts pathway types according to pathwayTypeOrder", () => {
    const arr = [
      { title: "Normative" },
      { title: "Predictive" },
      { title: "Exploratory" },
    ];
    const sorted = sortPathwayType(arr);
    expect(sorted.map((x) => x.title)).toEqual([
      "Predictive",
      "Exploratory",
      "Normative",
    ]);
  });

  it("sorts unknown pathway types to the end", () => {
    const arr = [
      { title: "Normative" },
      { title: "UnknownType" },
      { title: "Predictive" },
    ];
    const sorted = sortPathwayType(arr);
    expect(sorted.map((x) => x.title)).toEqual([
      "Predictive",
      "Normative",
      "UnknownType",
    ]);
    // UnknownType is last
    expect(sorted[sorted.length - 1].title).toBe("UnknownType");
  });

  it("returns empty array when input is empty", () => {
    expect(sortPathwayType([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const arr = [
      { title: "Normative" },
      { title: "Predictive" },
      { title: "Exploratory" },
    ];
    const arrCopy = [...arr];
    sortPathwayType(arr);
    expect(arr).toEqual(arrCopy);
  });
});

describe("prioritizeGeographies", () => {
  it("moves CN to front for 'China' or 'CN'", () => {
    const base = ["Global", "APAC", "CN", "US"];
    expect(prioritizeGeographies(base, "China")[0]).toBe("CN");
    expect(prioritizeGeographies(base, "CN")[0]).toBe("CN");
  });
});
