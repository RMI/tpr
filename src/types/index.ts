import type { FacetMode } from "../utils/searchUtils";
import type { PathwayMetadataV1 } from "./pathwayMetadata.v1";
import type { PublicationV1 } from "./common/publication.v1";
import type { GeographyV1 } from "./common/geography.v1";

// Re-export the (current) versioned pathway metadata type as generic
export type PathwayMetadataType = PathwayMetadataV1;
export type PublicationType = PublicationV1;

// Enum-like types derived from the schema
export type PathwayType = PathwayMetadataType["pathwayType"];
export type Sector = PathwayMetadataType["sectors"][number]["name"];
export type Metric = PathwayMetadataType["metric"][number];

// Geography is now an object ({ global, regions, country }), not a flat array.
export type Geography = GeographyV1;
export type GeographyRegions = NonNullable<GeographyV1["regions"]>;
export type GeographyCountry = NonNullable<GeographyV1["country"]>;
// A single ISO-3166-1 alpha-2 country code.
export type GeographyCode = GeographyCountry[number];

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
