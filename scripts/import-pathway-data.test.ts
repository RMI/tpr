import { describe, it, expect } from "vitest";
import {
  Report,
  publisherGroup,
  scenarioParts,
  canonicalKey,
  matchEnum,
  normalizeSector,
  splitList,
  ensurePeriod,
  isAbsent,
  resolveGeography,
  buildGeography,
} from "./import-pathway-data.ts";

describe("publisherGroup", () => {
  it("maps each sheet's spelling to one group", () => {
    expect(publisherGroup("International Energy Agency (IEA)")).toBe("IEA");
    expect(publisherGroup("ASEAN Centre for Energy (ACE)")).toBe("ACE");
    expect(publisherGroup("ACE")).toBe("ACE");
    // AGF must win over the SDSN check even though both live under un-sdsn-cw.
    expect(publisherGroup("ASEAN Green Future (AGF)")).toBe("AGF");
    expect(publisherGroup("UN SDSN, CW")).toBe("SDSN");
    expect(publisherGroup("Some Unknown Org")).toBeNull();
  });
});

describe("scenarioParts", () => {
  it("reads the trailing (CODE) and [CC]", () => {
    expect(scenarioParts("Current Policies Scenario (CPS)")).toEqual({
      code: "CPS",
      country: "",
    });
    expect(
      scenarioParts("Optimised More Ambitious Pathway (OMAP) [MM]"),
    ).toEqual({ code: "OMAP", country: "MM" });
  });
  it("derives JRC codes from names with no parenthetical", () => {
    expect(scenarioParts("Reference scenario").code).toBe("REFERENCE");
    expect(scenarioParts("NDC-LTS scenario").code).toBe("NDC-LTS");
    expect(scenarioParts("1.5°C scenario").code).toBe("1.5C");
  });
});

describe("canonicalKey", () => {
  it("joins the sheets across their name/publisher variations", () => {
    // "State" vs "States" typo in the sub-sheets must not break the join.
    expect(
      canonicalKey("ACE", "ASEAN Member State Targets Scenario (ATS)"),
    ).toBe("ACE:ATS:");
    expect(
      canonicalKey(
        "ASEAN Centre for Energy (ACE)",
        "ASEAN Member States Targets Scenario (ATS)",
      ),
    ).toBe("ACE:ATS:");
    // Myanmar and Laos OMAP resolve to distinct keys.
    expect(
      canonicalKey(
        "ASEAN Green Future (AGF)",
        "Optimised More Ambitious Pathway (OMAP) [MM]",
      ),
    ).toBe("AGF:OMAP:MM");
    expect(
      canonicalKey(
        "ASEAN Green Future (AGF)",
        "Optimized More Ambitious Policy (OMAP)",
      ),
    ).toBe("AGF:OMAP:");
  });
});

describe("value normalization", () => {
  it("matches enums case-insensitively and fixes the 'Signifcant' typo", () => {
    const demand = ["Significant decrease", "Low or no change"];
    expect(matchEnum("Signifcant Decrease", demand)).toBe(
      "Significant decrease",
    );
    expect(matchEnum("carbon price", ["Carbon price"])).toBe("Carbon price");
    expect(matchEnum("nonsense", demand)).toBeNull();
  });
  it("treats NULL / not-applicable / blank as absent", () => {
    expect(isAbsent("NULL")).toBe(true);
    expect(isAbsent("Not applicable at that scope level")).toBe(true);
    expect(isAbsent("Not available at this scope")).toBe(true);
    expect(isAbsent("")).toBe(true);
    expect(isAbsent("No information")).toBe(false);
  });
  it("ensures a trailing period and splits mixed-delimiter lists", () => {
    expect(ensurePeriod("foo")).toBe("foo.");
    expect(ensurePeriod("foo.")).toBe("foo.");
    expect(splitList("Carbon price; Subsidies, performance standards")).toEqual(
      ["Carbon price", "Subsidies", "performance standards"],
    );
    expect(normalizeSector("power")).toBe("Power");
    expect(normalizeSector("nope")).toBeNull();
  });
});

describe("buildGeography", () => {
  it("parses the Regions cell, dropping non-ISO codes", () => {
    const report = new Report();
    const geo = buildGeography(
      "Global; Africa: [DZ, EG, XK]; PH",
      report,
      "TEST",
    );
    expect(geo?.global).toBe(true);
    expect(geo?.regions?.Africa).toEqual(["DZ", "EG"]); // XK dropped
    expect(geo?.country).toEqual(["PH"]);
    expect(report.lines.some((l) => l.includes("XK"))).toBe(true);
  });
  it("resolves geography tokens against declared coverage, ignoring punctuation", () => {
    const allowed = new Set(["Rest Sub-Saharan Africa", "TH", "Global"]);
    expect(resolveGeography("Rest Sub Saharan Africa", allowed)).toBe(
      "Rest Sub-Saharan Africa",
    );
    expect(resolveGeography("th", allowed)).toBe("TH");
    expect(resolveGeography("EFTA", allowed)).toBeNull();
  });
});
