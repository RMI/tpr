import { describe, it, expect } from "vitest";
import {
  availabilityMetricBelongsToSector,
  availabilityMetricsForSector,
  metricBelongsToSector,
  metricsForSector,
  POWER_SECTOR_DEFINITION,
  SECTORS_BY_KEY,
  segmentBelongsToSector,
  segmentsForSector,
  technologiesForSector,
  technologyBelongsToSector,
  UNSEGMENTED,
} from "./timeseriesTaxonomy";
import sectorSchema from "../schema/common/sector.v1.json" with { type: "json" };
import technologySchema from "../schema/common/technology.v1.json" with { type: "json" };
import metricSchema from "../schema/common/metric.v1.json" with { type: "json" };
import segmentSchema from "../schema/common/sectorSegment.v1.json" with { type: "json" };
import availabilityMetricSchema from "../schema/common/dataAvailabilityMetric.v1.json" with { type: "json" };

const SECTOR_NAMES: string[] = sectorSchema.$defs.displayName.enum;
const TECHNOLOGY_NAMES: string[] = technologySchema.$defs.displayName.enum;
const METRIC_NAMES: string[] = metricSchema.$defs.displayName.enum;
const SEGMENT_NAMES: string[] = segmentSchema.$defs.displayName.enum;
const AVAILABILITY_METRIC_NAMES: string[] =
  availabilityMetricSchema.$defs.displayName.enum;

describe("technologiesForSector", () => {
  it("accepts the two technologies cookbook 0020 added to Power", () => {
    // Both were added to technology.v1.json's enum by the #858 pass but not
    // here, so AJV accepted them while technologyBelongsToSector said "no" --
    // which silently dropped them from JETP-CIPP-2023 on import.
    expect(technologyBelongsToSector("Geothermal", "Power")).toBe("yes");
    expect(technologyBelongsToSector("Energy storage", "Power")).toBe("yes");
  });

  it("resolves Power to its twelve technologies", () => {
    expect(technologiesForSector("Power")).toEqual([
      "Biomass",
      "Coal",
      "Energy storage",
      "Gas",
      "Geothermal",
      "Hydro",
      "Nuclear",
      "Oil",
      "Other",
      "Renewables",
      "Solar",
      "Wind",
    ]);
  });

  it("derives the list from POWER_SECTOR_DEFINITION rather than duplicating it", () => {
    // Drift guard: the metadata-side allowlist and the chart-side taxonomy are
    // the same data, so adding a technology to the definition must be the only
    // edit needed. Same intent as the wrapper-consistency tests in
    // pathwayMetadata.v2.test.ts.
    expect(technologiesForSector("Power")).toEqual(
      Object.values(POWER_SECTOR_DEFINITION.technologies ?? {}).map(
        (t) => t.displayName,
      ),
    );
  });

  it("returns undefined -- not [] -- for a sector with no definition", () => {
    // The distinction is load-bearing: validateScopedEntries rejects a non-empty
    // list here, and could not tell "defined and empty" from "undefined" if this
    // collapsed to [].
    expect(technologiesForSector("Steel")).toBeUndefined();
  });

  it("returns undefined for a string that is not a sector at all", () => {
    expect(technologiesForSector("Narnia")).toBeUndefined();
  });

  it("keys on display name, not on the camelCase taxonomy key", () => {
    // SECTORS_BY_KEY is keyed "power"; metadata says "Power". Passing the key
    // must not accidentally work, or data could name sectors either way.
    expect(technologiesForSector("power")).toBeUndefined();
  });

  it("only defines technologies for sectors the metadata schema knows", () => {
    for (const sector of Object.values(SECTORS_BY_KEY)) {
      expect(SECTOR_NAMES).toContain(sector.displayName);
    }
  });

  it("only names technologies the metadata schema allows", () => {
    // A displayName here that the enum lacks would be permanently unusable: AJV
    // would reject the data before this check ever saw it.
    for (const sector of Object.values(SECTORS_BY_KEY)) {
      for (const tech of Object.values(sector.technologies ?? {})) {
        expect(TECHNOLOGY_NAMES).toContain(tech.displayName);
      }
    }
  });
});

describe("technologyBelongsToSector", () => {
  it("says yes for a technology of a defined sector", () => {
    expect(technologyBelongsToSector("Solar", "Power")).toBe("yes");
  });

  it("says no for a technology outside a defined sector's list", () => {
    expect(technologyBelongsToSector("Hydrogen Use", "Power")).toBe("no");
  });

  it("says unknown -- not no -- for a sector with no definition", () => {
    // The difference matters to non-validation callers: #869's technology axis
    // would silently drop every Steel pathway if this answered "no".
    expect(technologyBelongsToSector("Hydrogen Use", "Steel")).toBe("unknown");
    expect(technologyBelongsToSector("Solar", "Steel")).toBe("unknown");
  });

  it("says unknown for an unrecognised sector", () => {
    expect(technologyBelongsToSector("Solar", "Narnia")).toBe("unknown");
  });

  it("is exact about names, not fuzzy", () => {
    expect(technologyBelongsToSector("solar", "Power")).toBe("no");
    expect(technologyBelongsToSector("Solar Power", "Power")).toBe("no");
  });

  it("classifies every enum technology under Power as yes or no, never unknown", () => {
    for (const tech of TECHNOLOGY_NAMES) {
      expect(technologyBelongsToSector(tech, "Power")).not.toBe("unknown");
    }
  });
});

describe("metricsForSector / metricBelongsToSector (#870)", () => {
  it("resolves Power to its five metrics", () => {
    expect(metricsForSector("Power")).toEqual([
      "Absolute Emissions",
      "Capacity",
      "Emissions Intensity",
      "Generation",
      "Technology Mix",
    ]);
  });

  it("derives the list from POWER_SECTOR_DEFINITION rather than duplicating it", () => {
    expect(metricsForSector("Power")).toEqual(
      Object.values(POWER_SECTOR_DEFINITION.metrics ?? {}).map(
        (m) => m.displayName,
      ),
    );
  });

  it("covers the whole metric enum for Power", () => {
    // Worth pinning: it is why the sector/metric check cannot currently reject
    // a real Power row, and why it only becomes live for production data once a
    // second sector defines its metrics.
    expect([...(metricsForSector("Power") ?? [])].sort()).toEqual(
      [...METRIC_NAMES].sort(),
    );
  });

  it("returns undefined for a sector with no metrics defined", () => {
    expect(metricsForSector("Steel")).toBeUndefined();
  });

  it("says yes for a metric of a defined sector", () => {
    expect(metricBelongsToSector("Capacity", "Power")).toBe("yes");
  });

  it("says no for a metric outside a defined sector's list", () => {
    expect(metricBelongsToSector("Water Use", "Power")).toBe("no");
  });

  it("says unknown for a sector with no metrics defined", () => {
    // validateScopedEntries lets "unknown" pass for this axis, unlike the other
    // two — see the comment on that check.
    expect(metricBelongsToSector("Capacity", "Steel")).toBe("unknown");
  });

  it("only names metrics the schema allows", () => {
    for (const sector of Object.values(SECTORS_BY_KEY)) {
      for (const metric of Object.values(sector.metrics ?? {})) {
        expect(METRIC_NAMES).toContain(metric.displayName);
      }
    }
  });
});

describe("availabilityMetricsForSector / availabilityMetricBelongsToSector (#870)", () => {
  it("is a superset of the metadata metric list for Power", () => {
    // The whole point of the second axis (register item D16): the availability
    // row key adds the four metrics a pathway reports but we do not plot.
    const avail = availabilityMetricsForSector("Power") ?? [];
    for (const extra of [
      "Transmission lines",
      "Technology cost",
      "Investment requirement",
      "Asset lifetime",
    ]) {
      expect(avail).toContain(extra);
    }
    expect(avail).toHaveLength(9);
  });

  it("does not carry Storage capacity, which D16 dropped", () => {
    expect(availabilityMetricsForSector("Power")).not.toContain(
      "Storage capacity",
    );
  });

  it("answers for Steel and Aviation, which the metadata axis does not", () => {
    expect(availabilityMetricsForSector("Steel")).toHaveLength(10);
    expect(availabilityMetricsForSector("Aviation")).toHaveLength(13);
    // The metadata axis is still Power-only, which is what keeps the search
    // facet unchanged.
    expect(metricsForSector("Steel")).toBeUndefined();
    expect(metricsForSector("Aviation")).toBeUndefined();
  });

  it("scopes a metric to its own sector", () => {
    expect(availabilityMetricBelongsToSector("Scrap share", "Steel")).toBe(
      "yes",
    );
    expect(availabilityMetricBelongsToSector("Scrap share", "Power")).toBe(
      "no",
    );
    expect(availabilityMetricBelongsToSector("Capacity", "Power")).toBe("yes");
  });

  it("says unknown for a sector the cookbook has not reached", () => {
    // Keeps dataAvailability authorable for the other twelve sectors.
    expect(availabilityMetricBelongsToSector("Capacity", "Cement")).toBe(
      "unknown",
    );
  });

  it("only names metrics the schema allows", () => {
    // A displayName the enum lacks would be permanently unusable: AJV rejects
    // the row before this check sees it.
    for (const sector of Object.values(SECTORS_BY_KEY)) {
      for (const metric of Object.values(sector.availabilityMetrics ?? {})) {
        expect(AVAILABILITY_METRIC_NAMES).toContain(metric.displayName);
      }
    }
  });
});

describe("segmentsForSector / segmentBelongsToSector (#870)", () => {
  it("resolves Power to its four segments", () => {
    expect(segmentsForSector("Power")).toEqual([
      "Fuel extraction and processing",
      "Power generation",
      "Energy storage",
      "Transmission and distribution",
    ]);
  });

  it("resolves Steel and Aviation too, not just Power", () => {
    // All three sectors the cookbook defines segments for (#858).
    expect(segmentsForSector("Steel")).toEqual([
      "Downstream",
      "Fuel extraction and processing",
      "Ironmaking",
      "Mining",
      "Steelmaking",
    ]);
    expect(segmentsForSector("Aviation")).toEqual([
      "Freight transport",
      "Passenger transport",
      "Upstream energy and fuels",
    ]);
  });

  it("returns undefined for a sector with no segments defined", () => {
    // Cement is one of the twelve the cookbook has not reached yet, and the
    // undefined is load-bearing -- see vocabularyFor.
    expect(segmentsForSector("Cement")).toBeUndefined();
  });

  it("excludes the universal sentinel from the defined list", () => {
    // UNSEGMENTED is legal everywhere, so listing it under Power would imply it
    // is Power's in particular.
    expect(segmentsForSector("Power")).not.toContain(UNSEGMENTED);
  });

  it("says yes for a segment of a defined sector", () => {
    expect(segmentBelongsToSector("Energy storage", "Power")).toBe("yes");
  });

  it("says no for a segment outside a defined sector's list", () => {
    expect(segmentBelongsToSector("Refining", "Power")).toBe("no");
  });

  it("says unknown for a named segment under an undefined sector", () => {
    expect(segmentBelongsToSector("Energy storage", "Cement")).toBe("unknown");
  });

  it("says no for a segment of the wrong defined sector", () => {
    // Now that three sectors have segments, the lists can actually disagree:
    // Ironmaking is Steel's, not Power's.
    expect(segmentBelongsToSector("Ironmaking", "Power")).toBe("no");
    expect(segmentBelongsToSector("Energy storage", "Steel")).toBe("no");
  });

  it("says yes to the sentinel under every sector, defined or not", () => {
    // This is what keeps dataAvailability authorable before a sector's segments
    // are written down.
    for (const name of [...SECTOR_NAMES, "Narnia"]) {
      expect(segmentBelongsToSector(UNSEGMENTED, name)).toBe("yes");
    }
  });

  it("only names segments the schema allows", () => {
    for (const sector of Object.values(SECTORS_BY_KEY)) {
      for (const segment of Object.values(sector.segments ?? {})) {
        expect(SEGMENT_NAMES).toContain(segment.displayName);
      }
    }
  });

  it("keeps the sentinel in the schema enum", () => {
    expect(SEGMENT_NAMES).toContain(UNSEGMENTED);
  });
});
