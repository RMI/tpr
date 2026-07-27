import type {
  Metric,
  PathwayMetadataType,
  PathwayType,
  Sector,
} from "../types";

export const unknownTooltip = "No tooltip available.";

export const pathwayTypeTooltips: Record<PathwayType, string> = {
  Exploratory: "Examines a range of plausible futures without fixed goals.",
  Normative: "Starts from a desired end state and works backward to actions.",
  Predictive:
    "Projects likely futures based on current trends and assumptions.",
};

export const getPathwayTypeTooltip = (type: PathwayType): string => {
  return pathwayTypeTooltips[type] || unknownTooltip;
};

export const sectorTooltips: Record<Sector, string> = {
  "Agriculture": "Agricultural activities.",
  "Automotive": "Automotive manufacturing.",
  "Aviation": "Logistics of passengers and cargo by airplane.",
  "Buildings": "Residential and commercial buildings. Focus on energy use.",
  "Cement": "Cement manufacturing.",
  "Chemicals":
    "Production of primary chemicals and/or chemicals for end use, such as plastics, fertilizer, pharmaceuticals.",
  "Coal Mining": "Extraction of coal.",
  "Gas (Upstream)": "Extraction of natural gas.",
  "Land Use": "Agriculture, Forestry, Fishery, other forms of land use.",
  "Oil (Upstream)": "Extraction of oil.",
  "Other":
    "Other climate relevant sectors that are not covered by any of the available categories.",
  "Power":
    "Includes power generation based on any energy source. Can also include power storage, transmission, and distribution.",
  "Rail": "Logistics of passengers and cargo by train.",
  "Shipping": "Logistics of passengers and cargo by ship.",
  "Steel":
    "Steel making, both primary and secondary. Can include upstream and downstream activities.",
};

export const getSectorTooltip = (sector: Sector): string => {
  return sectorTooltips[sector] || unknownTooltip;
};

export const metricTooltips: Record<string, string> = {
  "Emissions Intensity":
    "Amount of greenhouse gases emitted per unit of physical output. Indicates how low-carbon the output production is.",
  "Capacity":
    "The maximum output a power plant or energy source can produce under ideal conditions, measured in GW.",
  "Generation":
    "The actual amount of electricity produced over a specific period, typically measured in TWh.",
  "Technology Mix":
    "The breakdown of energy sources used for electricity generation (e.g., coal, solar, wind, nuclear). Reflects the diversity and sustainability of the energy portfolio.",
  "Absolute Emissions":
    "Total greenhouse gas emissions produced, regardless of output. Measured in metric tons of CO₂ equivalent.",
};

export const getMetricTooltip = (metric: Metric): string => {
  return metricTooltips[metric] || unknownTooltip;
};

export type KeyFeatureSection = keyof PathwayMetadataType["keyFeatures"];

/**
 * Subsection-aware tooltip resolver for Key Features.
 * Collisions are resolved by looking up [sectionKey][value].
 */
export function getKeyFeatureTooltip(
  sectionKey: KeyFeatureSection,
  value: string,
): string {
  // NOTE: Fill in real copy later — these are just placeholders.
  // Use the exact enum strings from your schema/data as the nested keys.
  const MAP: Partial<Record<KeyFeatureSection, Record<string, string>>> = {
    emissionsTrajectory: {
      "No information":
        "There is no quantitative information available on the trend of emissions.",
      "Significant increase":
        "Emissions in this pathway keep growing significantly in the future.",
      "Moderate increase":
        "Emissions in this pathway keep growing moderately in the future.",
      "Minor increase":
        "Emissions in this pathway show minor increases in the long term.",
      "Low or no change":
        "Emissions in this pathway show little long-term change from current levels.",
      "Minor decrease":
        "Emissions in this pathway show minor decreases in the long term.",
      "Moderate decrease":
        "Emissions in this pathway decline at a moderate pace.",
      "Significant decrease":
        "Emissions in this pathway decline significantly and quickly.",
    },
    energyEfficiency: {
      "No information":
        "There is no quantitative information on energy efficiency trends available for this pathway.",
      "Significant deterioration":
        "Energy efficiency (energy use per output unit) significantly deteriorates in this pathway.",
      "Moderate deterioration":
        "Energy efficiency (energy use per output unit) deteriorates moderately in this pathway.",
      "Minor deterioration":
        "Energy efficiency (energy use per output unit) deteriorates slowly in this pathway.",
      "Low or no change":
        "Energy efficiency (energy use per output unit) remains at a relatively constant level in this pathway.",
      "Minor improvement":
        "Energy efficiency (energy use per output unit) improves slowly in this pathway.",
      "Moderate improvement":
        "Energy efficiency (energy use per output unit) improves moderately in this pathway.",
      "Significant improvement":
        "Energy efficiency (energy use per output unit) improves significantly in this pathway.",
    },
    energyDemand: {
      "No information":
        "No quantitative information available on the trend of energy demand in this pathway (total energy used to produce economic outputs).",
      "Significant decrease":
        "Energy demand (total energy used for economic outputs) decreases significantly in this pathway.",
      "Moderate decrease":
        "Energy demand (total energy used for economic outputs) decreases moderately in this pathway.",
      "Minor decrease":
        "Energy demand (total energy used for economic outputs) decreases slowly in this pathway.",
      "Low or no change":
        "Energy demand (total energy used for economic outputs) remains close to the initial level in this pathway.",
      "Minor increase":
        "Energy demand (total energy used for economic outputs) grows slowly in this pathway.",
      "Moderate increase":
        "Energy demand (total energy used for economic outputs) grows moderately in this pathway.",
      "Significant increase":
        "Energy demand (total energy used for economic outputs) grows significantly in this pathway.",
    },
    electrification: {
      "No information":
        "No quantitative information available on the electrification trend in this pathway (share of electrical energy in total energy use).",
      "Significant decrease":
        "Electrification (share of electrical energy in total energy use) significantly decreases in this pathway.",
      "Moderate decrease":
        "Electrification (share of electrical energy in total energy use) moderately decreases in this pathway.",
      "Minor decrease":
        "Electrification (share of electrical energy in total energy use) slowly decreases in this pathway.",
      "Low or no change":
        "Electrification (share of electrical energy in total energy use) remains close to the initial level in this pathway.",
      "Minor increase":
        "Electrification (share of electrical energy in total energy use) grows slowly in this pathway.",
      "Moderate increase":
        "Electrification (share of electrical energy in total energy use) grows moderately in this pathway.",
      "Significant increase":
        "Electrification (share of electrical energy in total energy use) grows significantly in this pathway.",
    },
    policyTypes: {
      "Carbon price": "A carbon price is used to model policy impacts.",
      "Feed-in tariffs":
        "Feed-in tariffs are explicitly modeled as a policy intervention.",
      "Performance standards":
        "Performance standards are explicitly modeled as a policy intervention.",
      "Phaseout dates":
        "This pathway includes targeted phaseout dates for technologies as policy interventions.",
      "Subsidies":
        "This pathway explicitly includes changes to subsidies as a policy intervention.",
      "Target technology shares":
        "Target technology shares are used to model policy impacts.",
      "Other":
        "Impacts of other policy types modeled beside carbon prices, phaseout dates, subsidies, target technology shares, FiTs, and performance standards.",
      "None": "This pathway does not explicitly model the impact of policies.",
    },
    technologyCostTrend: {
      "No information":
        "There is no quantitative information available on technology costs in this pathway.",
      "Increase": "Technology costs increase in this pathway.",
      "Low or no change":
        "Technology costs are assumed to remain static in this pathway.",
      "Decrease": "Technology costs decline in this pathway.",
    },
    emissionsScope: {
      "No information":
        "There is no information available on the emissions scope in this pathway.",
      "CO2": "Emissions in this pathway cover CO2 only.",
      "CO2e (Kyoto)":
        "Emissions in this pathway use CO2-equivalent values covering the GHGs included in the Kyoto Protocol (CO2, methane, N2O, HFCs, PFCs, SF6, NF3).",
      "CO2e (CO2, Methane)":
        "Emissions in this pathway use CO2-equivalent values, covering the CO2 and methane.",
      "CO2e (unspecified GHGs)":
        "Emissions in this pathway use CO2-equivalent values, w/o specifying the exact coverage.",
      "Other emissions scope":
        "Emissions in this pathway cover another scope of GHGs that is not CO2 or CO2e.",
    },
    policyAmbition: {
      "No information":
        "This pathway does not have any information on the modeled policy ambition.",
      "No policies included":
        "This pathway explicitly excludes policies as a pathway driver.",
      "Current/legislated policies":
        "The policies modeled in this pathway reflect current and legislated policies.",
      "Current and drafted policies":
        "The policies modeled in this pathway reflect current and drafted policies.",
      "NDCs, unconditional only":
        "The policies modeled in this pathway assume policies are in place that ensure  all unconditional targets from NDCs are reached.",
      "NDCs incl. conditional targets":
        "The policies modeled in this pathway assume policies are in place that ensure  all targets from NDCs (conditional and unconditional) are reached.",
      "High ambition policies":
        "The policies modeled in this pathway ensure an ambitious outcome such as 1.5°C, net zero, or near net zero. Models often use least-cost optimization.",
      "Other policy ambition":
        "The policies modeled in this pathway follow other specifications of policy ambition.",
    },
    technologyCostsDetail: {
      "No information":
        "This pathway does not have any quantitative information on technology costs.",
      "Total costs": "Technology costs are provided as total unit costs.",
      "Capital costs, O&M, etc.":
        "Technology cost breakdown provides capital costs, O&M, and potentially additional other categories.",
      "Other cost breakdown":
        "Technology cost breakdown follows a different structure.",
    },
    newTechnologiesIncluded: {
      "No information":
        "This pathway does not have any information on which new technologies are included.",
      "No new technologies":
        "This pathway explicitly does not include any significant deployment of new technologies.",
      "CCUS": "This pathway assumes deployment of CCUS technology.",
      "DAC": "This pathway assumes deployment of DAC technology.",
      "Green H2/ammonia":
        "This pathway assumes deployment of green hydrogen and/or green ammonia.",
      "SAF":
        "This pathway assumes deployment of sustainable aviation fuels (SAF).",
      "Battery storage":
        "This pathway assumes deployment of grid-scale battery electricity storage.",
      "EGS/AGS":
        "This pathway assumes deployment of Enhanced and/or Advanced Geothermal Systems.",
      "Other new technologies":
        "This pathway assumes deployment of other new technologies.",
    },
    investmentNeeds: {
      "No information":
        "This pathway does not have any quantitative information on investment needs.",
      "Total investment": "This pathway provides total investment needs.",
      "By sector": "This pathway provides investment needs by sector.",
      "By sector, part of value chain":
        "This pathway provides investment needs by sector and part of the value chain (upstream, instream, downstream).",
      "By technology": "This pathway provides investment needs by technology.",
      "By tech, part of value chain":
        "This pathway provides investment needs by technology and part of the value chain (upstream, instream, downstream).",
    },
  };

  const v = String(value).trim();
  const section = MAP[sectionKey];
  if (section?.[v]) return section[v];

  // Fallback: safe generic placeholder with the raw value.
  return unknownTooltip;
}
