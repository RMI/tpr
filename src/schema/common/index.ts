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
];

export default commonSchemas;
