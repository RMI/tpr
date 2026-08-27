import type { SchemaObject } from "ajv";

// Use explicit type per import to make sure the JSON is treated as an AJV schema
import publicationSchemaJson from "./publication.v1.json" with { type: "json" };
export const publicationSchema: SchemaObject = publicationSchemaJson;

import sectorSchemaJson from "./sector.v1.json" with { type: "json" };
export const sectorSchema: SchemaObject = sectorSchemaJson;

import technologySchemaJson from "./technology.v1.json" with { type: "json" };
export const technologySchema: SchemaObject = technologySchemaJson;

import metricSchemaJson from "./metric.v1.json" with { type: "json" };
export const metricSchema: SchemaObject = metricSchemaJson;

import labelSchemaJson from "./label.v1.json" with { type: "json" };
export const labelSchema: SchemaObject = labelSchemaJson;

import geographyItemSchemaJson from "./geographyItem.v1.json" with { type: "json" };
export const geographyItemSchema: SchemaObject = geographyItemSchemaJson;

import countryCodeSchemaJson from "./countryCode.v1.json" with { type: "json" };
export const countryCodeSchema: SchemaObject = countryCodeSchemaJson;

import geographySchemaJson from "./geography.v1.json" with { type: "json" };
export const geographySchema: SchemaObject = geographySchemaJson;

import emissionsScopeSchemaJson from "./emissionsScope.v1.json" with { type: "json" };
export const emissionsScopeSchema: SchemaObject = emissionsScopeSchemaJson;

// The two axes of a v2 scoped keyFeatures entry (#858).
import scopeSectorSchemaJson from "./scopeSector.v2.json" with { type: "json" };
export const scopeSectorSchema: SchemaObject = scopeSectorSchemaJson;

import scopeGeographySchemaJson from "./scopeGeography.v2.json" with { type: "json" };
export const scopeGeographySchema: SchemaObject = scopeGeographySchemaJson;

// Vocabularies for the per-metric dataAvailability entries (#870).
import sectorSegmentSchemaJson from "./sectorSegment.v1.json" with { type: "json" };
export const sectorSegmentSchema: SchemaObject = sectorSegmentSchemaJson;

import dataAvailabilitySchemaJson from "./dataAvailability.v1.json" with { type: "json" };
export const dataAvailabilitySchema: SchemaObject = dataAvailabilitySchemaJson;

// Aggregate — type stays correct
export const commonSchemas: SchemaObject[] = [
  publicationSchema,
  sectorSchema,
  technologySchema,
  metricSchema,
  labelSchema,
  geographyItemSchema,
  countryCodeSchema,
  geographySchema,
  emissionsScopeSchema,
  scopeSectorSchema,
  scopeGeographySchema,
  sectorSegmentSchema,
  dataAvailabilitySchema,
];

export default commonSchemas;
