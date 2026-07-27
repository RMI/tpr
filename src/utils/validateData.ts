import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { SchemaObject, ErrorObject } from "ajv";

export type FileEntry = { name: string; data: unknown };
export type ValidationProblem = {
  name: string;
  errors: string[];
  data?: unknown;
};
export type ValidationRecord = {
  name: string;
  schemaId: string;
  data: unknown;
};
export type ValidationOutcome = {
  valid: ValidationRecord[];
  invalid: ValidationProblem[];
};

function makeAjv(schemas: readonly (object | SchemaObject)[]) {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    multipleOfPrecision: 12,
  });
  addFormats(ajv);
  // Accept json-schema-to-typescript’s hint keyword without affecting validation

  ajv.addKeyword({
    keyword: "tsType",
    schemaType: "string",
    errors: false,
  });

  for (const s of schemas) ajv.addSchema(s);
  return ajv;
}

function fmt(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || !errors.length) return [];
  return errors.map((e) =>
    `${e.instancePath || "/"} ${e.message ?? "validation error"}`.trim(),
  );
}

// ---------- Safe $schema access ----------
type HasSchemaString = { $schema: string };
function hasSchemaString(x: unknown): x is HasSchemaString {
  return (
    typeof x === "object" &&
    x !== null &&
    "$schema" in (x as Record<string, unknown>) &&
    typeof (x as Record<string, unknown>)["$schema"] === "string"
  );
}

/**
 * Generic, schema-routed validator.
 * - Preload *only* the schemas you pass in.
 * - Each entry must include a string `"$schema"` that matches one of those schemas’ `$id`.
 */
export function validateFilesBySchema(
  entries: FileEntry[],
  schemas: readonly (object | SchemaObject)[],
): ValidationOutcome {
  const ajv = makeAjv(schemas);
  const valid: ValidationRecord[] = [];
  const invalid: ValidationProblem[] = [];

  for (const { name, data } of entries) {
    if (!hasSchemaString(data)) {
      invalid.push({ name, errors: ['missing or non-string "$schema"'] });
      continue;
    }
    const schemaId = data.$schema;
    const validate = ajv.getSchema(schemaId);
    if (!validate) {
      invalid.push({
        name,
        errors: [`no schema preloaded for $schema "${schemaId}"`],
        data,
      });
      continue;
    }
    const ok = validate(data);
    if (ok) valid.push({ name, schemaId, data });
    else invalid.push({ name, errors: fmt(validate.errors), data });
  }
  return { valid, invalid };
}

/**
 *  - Filters to *only* metadata files (`$schema === pathwayMetadata.$id`)
 *  - Validates them using the metadata schema only
 *  - Returns the same {valid, invalid} shape as the generic validator
 *
 * This keeps CI happy (counts still work) and isolates the UI’s eager path.
 */
export function validateDataCollect(
  entries: FileEntry[],
  schema: object | SchemaObject,
  referencedSchemas: Array<object | SchemaObject> = [],
): ValidationOutcome {
  const META_ID = String((schema as SchemaObject).$id);
  const metaEntries = entries.filter(
    (e) => hasSchemaString(e.data) && e.data.$schema === META_ID,
  );
  return validateFilesBySchema(metaEntries, [schema, ...referencedSchemas]);
}
