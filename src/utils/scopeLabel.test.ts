import { describe, it, expect } from "vitest";
import { scopeSelectionLabel } from "./scopeLabel";

describe("scopeSelectionLabel", () => {
  it("joins both axes", () => {
    expect(
      scopeSelectionLabel({ sector: "Steel", geography: "South East Asia" }),
    ).toBe("Steel in South East Asia");
  });

  it("names a country rather than its code", () => {
    expect(scopeSelectionLabel({ sector: "Power", geography: "SG" })).toBe(
      "Power in Singapore",
    );
  });

  it("names a single axis alone, and nothing for no scope", () => {
    expect(scopeSelectionLabel({ sector: "Steel", geography: null })).toBe(
      "Steel",
    );
    expect(scopeSelectionLabel({ sector: null, geography: "SG" })).toBe(
      "Singapore",
    );
    expect(scopeSelectionLabel({ sector: null, geography: null })).toBeNull();
  });

  it("reads the scope sentinels as words, not tokens", () => {
    expect(
      scopeSelectionLabel({
        sector: "across sectors",
        geography: "across regions",
      }),
    ).toBe("all sectors in all regions");
    expect(
      scopeSelectionLabel({ sector: "across sectors", geography: "TH" }),
    ).toBe("all sectors in Thailand");
    expect(
      scopeSelectionLabel({ sector: "Power", geography: "across regions" }),
    ).toBe("Power in all regions");
  });
});
