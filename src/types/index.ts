import type { FacetMode } from "../utils/searchUtils";
import type { KeyFeatureKey } from "../utils/keyFeatureRules";
import type { PathwayMetadataV2 } from "./pathwayMetadata.v2";
import type { PublicationV1 } from "./common/publication.v1";
import type { GeographyV2 } from "./common/geography.v2";
import type { CountryCodeV1 } from "./common/countryCode.v1";

// Re-export the (current) versioned pathway metadata type as generic.
// v2 as of #858: src/data/pathwayMetadata.ts validates against v2, so only v2
// documents reach the app and this is the shape every consumer sees.
export type PathwayMetadataType = PathwayMetadataV2;
export type PublicationType = PublicationV1;

export type { PathwayMetadataV2 };

/** A single scoped keyFeatures entry: {sector, geography, value} (#858). */
export type ScopedKeyFeature<K extends KeyFeatureKey> =
  PathwayMetadataV2["keyFeatures"][K][number];

// Enum-like types derived from the schema
export type PathwayType = PathwayMetadataType["pathwayType"];
export type Sector = PathwayMetadataType["sectors"][number]["name"];
export type Metric = PathwayMetadataType["metric"][number];

// Geography is an object ({ global, regions, country }). Both `regions` and
// `country` map a key to the ISO2 codes it covers; a country's key is its own
// code (#1071).
export type Geography = GeographyV2;
export type GeographyRegions = NonNullable<GeographyV2["regions"]>;
export type GeographyCountry = NonNullable<GeographyV2["country"]>;
// A single ISO-3166-1 alpha-2 country code.
export type GeographyCode = CountryCodeV1;

/**
 * The detail page's scope selection (#872): one sector and one geography, each
 * a token the pathway itself declares. `null` on an axis means "no preference",
 * which is also the cross-sector / widest-geography position for #869.
 */
export type PathwayScopeSelection = {
  sector: string | null;
  geography: string | null;
};

export type TemperatureTarget = number;
export type YearTarget =
  "2030" | "2040" | "2050" | "2060" | "2070" | "2100" | "N/A";

export interface SearchFilters {
  pathwayType?: string | string[] | null;
  modelYearNetzero?: number | (number | string)[] | null;
  modelTempIncrease?: number | string | (number | string)[] | null;
  geography?: string | string[] | null;
  sector?: string | string[] | null;
  metric?: string | string[] | null;
  emissionsTrajectory?: string | string[] | null;
  policyAmbition?: string | string[] | null;
  dataAvailability?: string | string[] | null;
  searchTerm: string;
  // Optional per-facet mode (used later by a UI toggle)
  modes?: {
    pathwayType?: FacetMode;
    modelYearNetzero?: FacetMode;
    modelTempIncrease?: FacetMode;
    geography?: FacetMode;
    sector?: FacetMode;
    metric?: FacetMode;
    emissionsTrajectory?: FacetMode;
    policyAmbition?: FacetMode;
    dataAvailability?: FacetMode;
  } | null;
}
