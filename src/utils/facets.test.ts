import { describe, it, expect } from "vitest";
import {
  buildOptionsFromValues,
  matchesOptionalFacet,
  matchesOptionalFacetAny,
  hasAbsent,
  withAbsentOption,
} from "./facets";
import { ABSENT_FILTER_TOKEN } from "./absent";

describe("buildOptionsFromValues", () => {
  it("dedupes and sorts by label by default", () => {
    const options = buildOptionsFromValues(["b", "a", "b"]);
    expect(options.map((o) => o.label)).toEqual(["a", "b"]);
    expect(options.map((o) => o.value)).toEqual(["a", "b"]);
  });

  it("preserves numeric values and 0", () => {
    const options = buildOptionsFromValues([2030, 0, 2020, 0]);
    expect(options.map((o) => o.value)).toEqual([0, 2020, 2030]);
  });

  it("includes ABSENT bucket when null/undefined are present", () => {
    const options = buildOptionsFromValues(["2°C", undefined, "1.5°C", null]);
    const last = options[options.length - 1];
    expect(last.value).toBe(ABSENT_FILTER_TOKEN);
    expect(last.label).toBe("None");
  });

  it("can force include ABSENT even if not present", () => {
    const options = buildOptionsFromValues(["2°C", "1.5°C"], {
      forceIncludeAbsent: true,
    });
    expect(options.some((o) => o.value === ABSENT_FILTER_TOKEN)).toBe(true);
  });

  it("accepts custom labeler and noneLabel", () => {
    const options = buildOptionsFromValues([2030, 2050, null], {
      makeLabel: (y) => `${y} target`,
      noneLabel: "Unspecified",
    });

    const labels = options.map((o) => o.label);
    expect(labels).toContain("2030 target");
    expect(labels).toContain("2050 target");
    expect(labels).toContain("Unspecified");
  });

  it("can disable sorting", () => {
    const options = buildOptionsFromValues(["b", "a"], { sort: false });
    expect(options.map((o) => o.label)).toEqual(["b", "a"]);
  });
});

describe("matchesOptionalFacet", () => {
  it("matches absent when __ABSENT__ is selected", () => {
    expect(matchesOptionalFacet([ABSENT_FILTER_TOKEN], undefined)).toBe(true);
    expect(matchesOptionalFacet([ABSENT_FILTER_TOKEN], null)).toBe(true);
    expect(matchesOptionalFacet([ABSENT_FILTER_TOKEN], "2°C")).toBe(false);
  });

  it("matches concrete values when present", () => {
    expect(matchesOptionalFacet(["2°C"], "2°C")).toBe(true);
    expect(matchesOptionalFacet(["2°C"], "1.5°C")).toBe(false);
    expect(matchesOptionalFacet(["2°C"], undefined)).toBe(false);
  });

  it("supports mixed selections (concrete + __ABSENT__)", () => {
    expect(matchesOptionalFacet(["2°C", ABSENT_FILTER_TOKEN], undefined)).toBe(
      true,
    );
    expect(matchesOptionalFacet(["2°C", ABSENT_FILTER_TOKEN], "2°C")).toBe(
      true,
    );
    expect(matchesOptionalFacet(["2°C", ABSENT_FILTER_TOKEN], "1.5°C")).toBe(
      false,
    );
  });
});

it("hasAbsent detects null/undefined", () => {
  expect(hasAbsent([1, 2, null])).toBe(true);
  expect(hasAbsent(["a", undefined])).toBe(true);
  expect(hasAbsent([0, ""])).toBe(false);
});

it("withAbsentOption appends a None option only when absent exists", () => {
  const base = [{ label: "A", value: "A" }];
  const withNone = withAbsentOption(base, true);
  expect(withNone.some((o) => o.value === ABSENT_FILTER_TOKEN)).toBe(true);

  const unchanged = withAbsentOption(base, false);
  expect(unchanged).toHaveLength(1);
});

describe("matchesOptionalFacetAny (array facets)", () => {
  const norm = (s: string) => s.trim().toUpperCase();

  it("no selection → passes (no filtering)", () => {
    expect(matchesOptionalFacetAny([], ["Power"], (s) => s)).toBe(true);
    expect(matchesOptionalFacetAny(undefined, [], (s) => s)).toBe(true);
  });

  it('selecting "__ABSENT__" matches null/undefined and empty arrays', () => {
    expect(
      matchesOptionalFacetAny([ABSENT_FILTER_TOKEN], null, (s) => String(s)),
    ).toBe(true);
    expect(
      matchesOptionalFacetAny([ABSENT_FILTER_TOKEN], undefined, (s) =>
        String(s),
      ),
    ).toBe(true);
    expect(
      matchesOptionalFacetAny([ABSENT_FILTER_TOKEN], [], (s) => String(s)),
    ).toBe(true);
    // but should NOT match when there ARE values
    expect(
      matchesOptionalFacetAny([ABSENT_FILTER_TOKEN], ["EUROPE"], (s) =>
        String(s),
      ),
    ).toBe(false);
  });

  it("concrete selection matches any token produced by toToken", () => {
    // Sector-like: array of objects with .name
    const items = [{ name: "Power" }, { name: "Steel" }];
    expect(matchesOptionalFacetAny(["Power"], items, (s) => s.name)).toBe(true);
    expect(matchesOptionalFacetAny(["Aviation"], items, (s) => s.name)).toBe(
      false,
    );
  });

  it("geography-style normalization works when we normalize both sides", () => {
    // Pre-normalize selected (preserving ABSENT token if present)
    const selected = ["europe"].map((t) => norm(t));
    const values = ["EUROPE", "AFRICA"];
    expect(matchesOptionalFacetAny(selected, values, (g) => norm(g))).toBe(
      true,
    );
    expect(
      matchesOptionalFacetAny(["ASIA"].map(norm), values, (g) => norm(g)),
    ).toBe(false);
  });
});
