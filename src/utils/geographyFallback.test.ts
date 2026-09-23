import { describe, it, expect } from "vitest";
import { geographyFallbackNote, resolveGeography } from "./geographyFallback";
import type { Geography } from "../types";

const SEA: Geography = {
  global: false,
  regions: {
    "South East Asia": ["VN", "TH", "ID", "MY", "PH", "SG", "BN", "KH", "LA"],
  },
  country: [],
};

describe("resolveGeography", () => {
  it("returns the exact match when the data carries it", () => {
    const result = resolveGeography(["Global", "VN", "TH"], "VN", SEA);

    expect(result).toEqual({
      used: "VN",
      requested: "VN",
      fellBack: false,
      reason: "exact",
    });
  });

  it("matches the exact request regardless of stray whitespace", () => {
    const result = resolveGeography(
      ["South East Asia"],
      " South East Asia ",
      SEA,
    );

    expect(result.used).toBe("South East Asia");
    expect(result.reason).toBe("exact");
    expect(result.fellBack).toBe(false);
  });

  it("falls back to a region that contains the requested country", () => {
    const result = resolveGeography(["South East Asia", "Global"], "VN", SEA);

    expect(result).toEqual({
      used: "South East Asia",
      requested: "VN",
      fellBack: true,
      reason: "containingRegion",
    });
  });

  it("prefers a containing region over Global", () => {
    const result = resolveGeography(["Global", "South East Asia"], "TH", SEA);

    expect(result.used).toBe("South East Asia");
    expect(result.reason).toBe("containingRegion");
  });

  it("falls back to Global when no region covers the request", () => {
    // DE is not a member of the pathway's South East Asia region.
    const result = resolveGeography(["Global", "South East Asia"], "DE", SEA);

    expect(result).toEqual({
      used: "Global",
      requested: "DE",
      fellBack: true,
      reason: "global",
    });
  });

  it("falls back to the broadest available geography when there is no Global", () => {
    const result = resolveGeography(["VN", "South East Asia", "TH"], "DE", SEA);

    // sortGeographiesForDetails ranks regions above countries.
    expect(result).toEqual({
      used: "South East Asia",
      requested: "DE",
      fellBack: true,
      reason: "broadest",
    });
  });

  it("picks the broadest geography and reports no fallback when nothing is requested", () => {
    const result = resolveGeography(["VN", "Global", "TH"], null, SEA);

    expect(result).toEqual({
      used: "Global",
      requested: null,
      fellBack: false,
      reason: "broadest",
    });
  });

  it("resolves a country-heavy region dataset to the region, not the first JSON row", () => {
    // TZ-REGI-2024 ships the region plus its members; raw row order starts at BN,
    // which is what the old `availableGeographies[0]` default surfaced.
    const available = [
      "BN",
      "KH",
      "ID",
      "LA",
      "MY",
      "PH",
      "SG",
      "TH",
      "VN",
      "MM",
      "South East Asia",
    ];

    expect(resolveGeography(available, null, SEA).used).toBe("South East Asia");
  });

  it("reports nothing to plot when no geography is available", () => {
    expect(resolveGeography([], "VN", SEA)).toEqual({
      used: null,
      requested: "VN",
      fellBack: false,
      reason: "none",
    });
  });

  it("reports nothing to plot when the available list holds only junk", () => {
    expect(resolveGeography(["", "   "], null, SEA)).toEqual({
      used: null,
      requested: null,
      fellBack: false,
      reason: "none",
    });
  });

  it("still resolves when the pathway declares no region membership", () => {
    const result = resolveGeography(["Global", "ID"], "VN", null);

    expect(result.used).toBe("Global");
    expect(result.reason).toBe("global");
    expect(result.fellBack).toBe(true);
  });
});

describe("resolveGeography — spelling variants", () => {
  it("matches a region spelled differently, and calls it a match not a fallback", () => {
    // The live #945 case: IEA-APS declares "Southeast Asia" in its metadata
    // while its own timeseries carries "South East Asia". Before this arm the
    // request fell through to Global while the exact series sat in the file.
    const result = resolveGeography(
      ["Global", "South East Asia"],
      "Southeast Asia",
      SEA,
    );

    expect(result).toEqual({
      used: "South East Asia",
      requested: "Southeast Asia",
      fellBack: false,
      reason: "labelVariant",
    });
  });

  it("folds case and punctuation too", () => {
    expect(resolveGeography(["Asia-Pacific"], "asia pacific", SEA).used).toBe(
      "Asia-Pacific",
    );
  });

  it("prefers an exact match over a variant", () => {
    const result = resolveGeography(
      ["South East Asia", "Southeast Asia"],
      "Southeast Asia",
      SEA,
    );
    expect(result.used).toBe("Southeast Asia");
    expect(result.reason).toBe("exact");
  });

  it("is a spelling fold, not a synonym table", () => {
    // Different words stay different: no ISO-similarity threshold is involved.
    // "ASEAN" still reaches the only option available, but as a reported
    // fallback rather than a match — which is the distinction that matters.
    expect(resolveGeography(["South East Asia"], "ASEAN", SEA)).toMatchObject({
      used: "South East Asia",
      fellBack: true,
      reason: "broadest",
    });

    expect(
      resolveGeography(["South Asia", "Global"], "South East Asia", SEA),
    ).toMatchObject({ used: "Global", fellBack: true, reason: "global" });
  });
});

describe("geographyFallbackNote", () => {
  it("explains a fallback, naming both geographies by label", () => {
    const note = geographyFallbackNote({
      used: "South East Asia",
      requested: "MY",
      fellBack: true,
      reason: "containingRegion",
    });
    expect(note).toBe(
      "No timeseries data for Malaysia; showing South East Asia instead.",
    );
  });

  it("says nothing when the request resolved", () => {
    for (const reason of ["exact", "labelVariant"] as const) {
      expect(
        geographyFallbackNote({
          used: "South East Asia",
          requested: "Southeast Asia",
          fellBack: false,
          reason,
        }),
      ).toBeNull();
    }
  });

  it("says nothing when nothing was requested or nothing resolved", () => {
    expect(
      geographyFallbackNote({
        used: "Global",
        requested: null,
        fellBack: false,
        reason: "broadest",
      }),
    ).toBeNull();
    expect(
      geographyFallbackNote({
        used: null,
        requested: "VN",
        fellBack: false,
        reason: "none",
      }),
    ).toBeNull();
  });
});
