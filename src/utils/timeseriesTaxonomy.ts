// src/utils/timeseriesTaxonomy.ts

export interface TechnologyDefinition {
  displayName: string;
  definition: string;
}

export interface MetricDefinition {
  displayName: string;
  definition: string;
  sectorScope?: string;
}

/**
 * A subdivision of a sector (#870): Power splits into generation, storage and
 * transmission & distribution, and a metric's data availability can differ
 * between them.
 */
export interface SegmentDefinition {
  displayName: string;
  definition: string;
}

export interface SectorDefinition {
  key: string;
  displayName: string;
  technologies: Record<string, TechnologyDefinition>;
  metrics: Record<string, MetricDefinition>;
  /**
   * Optional, unlike the two above: segments arrived with #870 and only Power
   * has them. Absent means "nobody has written this sector's segments down",
   * which the membership check below treats as closed rather than open.
   */
  segments?: Record<string, SegmentDefinition>;
}

export const POWER_SECTOR_DEFINITION: SectorDefinition = {
  key: "power",
  displayName: "Power",
  technologies: {
    biomass: {
      displayName: "Biomass",
      definition:
        "Electricity generation using organic materials (biomass, biogas, or waste) as fuel for combustion or steam turbines.",
    },
    coal: {
      displayName: "Coal",
      definition:
        "Electricity generation using coal combustion to produce steam that drives turbines for power.",
    },
    gas: {
      displayName: "Gas",
      definition:
        "Electricity generation using natural gas combustion in turbines or combined-cycle plants.",
    },
    hydro: {
      displayName: "Hydro",
      definition:
        "Electricity generation using flowing or falling water from rivers or dams to drive turbines (includes large and small sites, excludes pumped storage).",
    },
    nuclear: {
      displayName: "Nuclear",
      definition:
        "Electricity generation using heat from controlled nuclear fission reactors to produce steam.",
    },
    oil: {
      displayName: "Oil",
      definition:
        "Electricity generation using petroleum-based fuels (diesel, heavy oil) to drive engines or steam turbines.",
    },
    other: {
      displayName: "Other",
      definition:
        "Electricity generation using alternative or emerging sources such as geothermal, tidal, or hydrogen.",
    },
    renewables: {
      displayName: "Renewables",
      definition:
        "Total electricity generation from renewable, low- or zero-emission sources (solar, wind, hydro, nuclear, other renewables).",
    },
    solar: {
      displayName: "Solar",
      definition:
        "Electricity generation via photovoltaic cells that convert sunlight directly into electricity.",
    },
    wind: {
      displayName: "Wind",
      definition:
        "Electricity generation via wind turbines, both onshore and offshore.",
    },
  },
  segments: {
    powerGeneration: {
      displayName: "Power generation",
      definition:
        "Generation of electricity at the plant, before it reaches the grid.",
    },
    storage: {
      displayName: "Storage",
      definition:
        "Storing electricity for later dispatch (batteries, pumped hydro).",
    },
    transmissionAndDistribution: {
      displayName: "Transmission & Distribution",
      definition:
        "Moving electricity from generators to consumers, including grid losses.",
    },
  },
  metrics: {
    absoluteEmissions: {
      displayName: "Absolute Emissions",
      definition:
        "Total greenhouse gas emissions produced, regardless of output. Measured in metric tons of CO2 equivalent",
      sectorScope: "Power generation",
    },
    capacity: {
      displayName: "Capacity",
      definition:
        "The maximum output a power plant or energy source can produce under ideal conditions, measured in GW",
      sectorScope: "Power generation",
    },
    emissionsIntensity: {
      displayName: "Emissions Intensity",
      definition:
        "Amount of greenhouse gases emitted per unit of physical output. Indicates how low-carbon the output production is",
      sectorScope: "Power generation",
    },
    generation: {
      displayName: "Generation",
      definition:
        "The actual amount of electricity produced over a specific period, typically measured in TWh",
      sectorScope: "Power generation",
    },
    technologyMix: {
      displayName: "Technology Mix",
      definition:
        "The breakdown of energy sources used for electricity generation (e.g., coal, solar, wind, nuclear). Reflects the diversity and sustainability of the energy portfolio",
      sectorScope: "Power generation",
    },
  },
};

// Extend this as you add more sectors:
export const SECTORS_BY_KEY: Record<string, SectorDefinition> = {
  power: POWER_SECTOR_DEFINITION,
};

export class UnknownTaxonomyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownTaxonomyError";
  }
}

export function getSectorDefinition(sectorKey: string): SectorDefinition {
  const sector = SECTORS_BY_KEY[sectorKey];
  if (!sector) {
    throw new UnknownTaxonomyError(
      `Unknown sector key "${sectorKey}" in timeseries metadata definitions`,
    );
  }
  return sector;
}

export function getMetricDefinition(
  sectorKey: string,
  metricKey: string,
): MetricDefinition {
  const sector = getSectorDefinition(sectorKey);
  const metric = sector.metrics[metricKey];
  if (!metric) {
    throw new UnknownTaxonomyError(
      `Unknown metric key "${metricKey}" for sector "${sectorKey}" in timeseries metadata definitions`,
    );
  }
  return metric;
}

export function getTechnologyDefinition(
  sectorKey: string,
  technologyKey: string,
): TechnologyDefinition {
  const sector = getSectorDefinition(sectorKey);
  const tech = sector.technologies[technologyKey];
  if (!tech) {
    throw new UnknownTaxonomyError(
      `Unknown technology key "${technologyKey}" for sector "${sectorKey}" in timeseries metadata definitions`,
    );
  }
  return tech;
}

/* -------------------------------------------------------------------------- */
/* Sector-conditional membership (#461 technologies, #870 metrics + segments)  */
/* -------------------------------------------------------------------------- */

/**
 * Whether some value belongs to a sector.
 *
 * Tri-state rather than boolean on purpose. Only one of the fifteen sectors in
 * `sector.v1.json` has its vocabularies defined here, so a boolean would have to
 * answer `false` for the other fourteen — indistinguishable from "definitely not
 * this sector's value" and wrong for every caller that is not validation.
 * `"unknown"` lets each caller choose: `validateScopedEntries` treats it as a
 * failure (see below), while a search filter can treat it as a match rather than
 * silently dropping every non-Power pathway.
 */
export type TaxonomyMembership = "yes" | "no" | "unknown";

/** @deprecated Use {@link TaxonomyMembership}; kept so #461's callers still compile. */
export type TechnologyMembership = TaxonomyMembership;

/**
 * Sector definitions indexed by display name.
 *
 * `SECTORS_BY_KEY` is keyed by the camelCase key the timeseries data uses
 * (`power`), while pathway metadata names sectors by their display name
 * (`"Power"`, `"Oil (Upstream)"`). `displayName` is the only bridge between the
 * two: there is no camelCase↔Title-Case converter in the repo, and there cannot
 * be a lossless one — `capitalizeWords` is a one-way chart-label prettifier and
 * could never produce `"Oil (Upstream)"` from `oilUpstream`.
 */
const SECTORS_BY_DISPLAY_NAME: ReadonlyMap<string, SectorDefinition> = new Map(
  Object.values(SECTORS_BY_KEY).map((sector) => [sector.displayName, sector]),
);

/** The `SectorDefinition` axes that carry a sector-conditional vocabulary. */
type VocabularyAxis = "technologies" | "metrics" | "segments";

/**
 * The display names a sector defines on one axis, or `undefined` when that
 * sector defines nothing on it.
 *
 * The `undefined` is load-bearing: it separates "this vocabulary is defined and
 * happens to be empty" from "nobody has said what this sector's values are".
 * Callers must not collapse it to `[]` — that is the difference between a
 * checked sector and an unchecked one.
 *
 * Derived from `SECTORS_BY_KEY` rather than listed separately, so adding a
 * sector definition is the single edit that opens it up to metadata as well.
 */
function vocabularyFor(
  sectorDisplayName: string,
  axis: VocabularyAxis,
): readonly string[] | undefined {
  const defined = SECTORS_BY_DISPLAY_NAME.get(sectorDisplayName)?.[axis];
  if (!defined) return undefined;
  return Object.values(defined).map((entry) => entry.displayName);
}

/**
 * Closed-by-default membership on one axis.
 *
 * Note this cannot distinguish "sector with no definition" from "not a sector at
 * all" — both are `"unknown"`. That is fine for the callers there are: AJV has
 * already checked the sector against `sector.v1.json`'s enum before validation
 * reaches here, and a caller that wants to know whether a string is a sector
 * should ask the schema, not the taxonomy.
 */
function membership(
  value: string,
  sectorDisplayName: string,
  axis: VocabularyAxis,
): TaxonomyMembership {
  const allowed = vocabularyFor(sectorDisplayName, axis);
  if (!allowed) return "unknown";
  return allowed.includes(value) ? "yes" : "no";
}

/** The technologies defined for a sector (#461). */
export function technologiesForSector(
  sectorDisplayName: string,
): readonly string[] | undefined {
  return vocabularyFor(sectorDisplayName, "technologies");
}

/**
 * #461: scope technologies to their sector. Both arguments are display names, as
 * they appear in pathway metadata's `sectors[]`.
 */
export function technologyBelongsToSector(
  technologyDisplayName: string,
  sectorDisplayName: string,
): TaxonomyMembership {
  return membership(technologyDisplayName, sectorDisplayName, "technologies");
}

/** The metrics defined for a sector (#870). */
export function metricsForSector(
  sectorDisplayName: string,
): readonly string[] | undefined {
  return vocabularyFor(sectorDisplayName, "metrics");
}

/**
 * #870: a `dataAvailability` row may only describe a metric its sector actually
 * has. Power's five metrics are currently the whole of `metric.v1.json`'s enum,
 * so this bites on the other fourteen sectors rather than on Power.
 */
export function metricBelongsToSector(
  metricDisplayName: string,
  sectorDisplayName: string,
): TaxonomyMembership {
  return membership(metricDisplayName, sectorDisplayName, "metrics");
}

/**
 * The segment every sector accepts, whatever its definition says (#870).
 *
 * Without this, closed-by-default would make `dataAvailability` unauthorable for
 * the fourteen sectors whose segments nobody has written down yet — which would
 * turn a validation aid into a content blocker. Mirrors the `"No information"`
 * sentinel the v2 keyFeature enums already use.
 */
export const UNSEGMENTED = "No information";

/** The segments defined for a sector (#870), excluding the universal sentinel. */
export function segmentsForSector(
  sectorDisplayName: string,
): readonly string[] | undefined {
  return vocabularyFor(sectorDisplayName, "segments");
}

/** #870: scope segments to their sector, with {@link UNSEGMENTED} always legal. */
export function segmentBelongsToSector(
  segmentDisplayName: string,
  sectorDisplayName: string,
): TaxonomyMembership {
  if (segmentDisplayName === UNSEGMENTED) return "yes";
  return membership(segmentDisplayName, sectorDisplayName, "segments");
}
