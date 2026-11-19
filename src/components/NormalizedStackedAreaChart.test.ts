import { describe, it, expect } from "vitest";
import { technologyColors } from "./NormalizedStackedAreaChart";
import { POWER_SECTOR_DEFINITION } from "../utils/timeseriesTaxonomy";

// Reported as capacity only, never as a share of generation, so it never
// reaches the technology mix chart.
const NOT_IN_TECHNOLOGY_MIX = ["energyStorage"];

describe("technologyColors", () => {
  it("has a colour for every power technology that can appear in the technology mix", () => {
    const missing = Object.keys(
      POWER_SECTOR_DEFINITION.technologies ?? {},
    ).filter(
      (tech) =>
        !NOT_IN_TECHNOLOGY_MIX.includes(tech) && !(tech in technologyColors),
    );

    expect(missing).toEqual([]);
  });
});
