import { describe, it, expect } from "vitest";
import v1Json from "./pathwayMetadata.v1.json" with { type: "json" };
import v2Json from "./pathwayMetadata.v2.json" with { type: "json" };
import scopeSectorJson from "./common/scopeSector.v2.json" with { type: "json" };
import sectorJson from "./common/sector.v1.json" with { type: "json" };
import emissionsScopeJson from "./common/emissionsScope.v1.json" with { type: "json" };

/**
 * Guards v2's keyFeatures against silent self-drift.
 *
 * v2 spells the scoped-entry wrapper out once per field rather than sharing a
 * `$defs` entry via `allOf`. That was measured, not assumed: the `allOf` version
 * validates identically and generates nicer types, but AJV's `strict: true`
 * (`strictRequired`, then `strictTypes`) forces the boilerplate back in for a net
 * saving of 18 lines, it cannot use `additionalProperties: false` — that keyword
 * only sees its own branch's `properties`, so it would reject `value` — and the
 * `propertyNames` substitute degrades the commonest authoring error from
 * "must NOT have additional properties" to "property name must be valid" with the
 * offending key unnamed, because `fmt()` in validateData.ts drops AJV's `params`.
 *
 * The cost of that choice is 11 copies of one shape, so these tests enforce what
 * the `$ref` would have: that the copies stay identical, and that each field's
 * `value` still matches v1's enum verbatim, which is #858's actual requirement.
 */

/** The slice of JSON Schema draft-07 these assertions actually read. */
interface JsonSchema {
  $id?: string;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  type?: string | string[];
  enum?: string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  uniqueItems?: boolean;
  minItems?: number;
  description?: string;
  tsType?: string;
}

const v1 = v1Json as unknown as JsonSchema;
const v2 = v2Json as unknown as JsonSchema;
const scopeSector = scopeSectorJson as unknown as JsonSchema;
const sector = sectorJson as unknown as JsonSchema;
const emissionsScope = emissionsScopeJson as unknown as JsonSchema;

/** Throwing accessors keep every read type-safe without non-null assertions. */
function props(schema: JsonSchema, where: string): Record<string, JsonSchema> {
  if (!schema.properties) throw new Error(`${where}: expected properties`);
  return schema.properties;
}

function prop(schema: JsonSchema, name: string, where: string): JsonSchema {
  const found = props(schema, where)[name];
  if (!found) throw new Error(`${where}: expected property ${name}`);
  return found;
}

function items(schema: JsonSchema, where: string): JsonSchema {
  if (!schema.items) throw new Error(`${where}: expected items`);
  return schema.items;
}

function enumOf(schema: JsonSchema, where: string): string[] {
  if (!schema.enum) throw new Error(`${where}: expected enum`);
  return schema.enum;
}

const KEY_FEATURE_FIELDS = [
  "emissionsTrajectory",
  "energyEfficiency",
  "energyDemand",
  "electrification",
  "policyTypes",
  "technologyCostTrend",
  "emissionsScope",
  "policyAmbition",
  "technologyCostsDetail",
  "newTechnologiesIncluded",
  "investmentNeeds",
] as const;

/** v1 stores these as arrays, so in v2 the whole array is one entry's `value`. */
const ARRAY_VALUED: ReadonlySet<string> = new Set([
  "policyTypes",
  "newTechnologiesIncluded",
]);

/** v1's only field whose enum lacked "No information" — it has "None" instead. */
const GAINED_NO_INFORMATION = "policyTypes";

const kf2 = prop(v2, "keyFeatures", "v2");
const kf1 = prop(v1, "keyFeatures", "v1");

/** The v2 field schema (the array), and the scoped entry inside it. */
const field = (name: string): JsonSchema => prop(kf2, name, "v2.keyFeatures");
const entry = (name: string): JsonSchema =>
  items(field(name), `v2.keyFeatures.${name}`);
const entryValue = (name: string): JsonSchema =>
  prop(entry(name), "value", `v2.keyFeatures.${name}.items`);

describe("pathwayMetadata.v2 keyFeatures — field set", () => {
  it("declares exactly the 11 fields, and the same ones as v1", () => {
    expect(Object.keys(props(kf2, "v2.keyFeatures"))).toEqual([
      ...KEY_FEATURE_FIELDS,
    ]);
    expect(Object.keys(props(kf2, "v2.keyFeatures"))).toEqual(
      Object.keys(props(kf1, "v1.keyFeatures")),
    );
  });

  it("requires all 11 and forbids extras", () => {
    expect([...(kf2.required ?? [])].sort()).toEqual(
      [...KEY_FEATURE_FIELDS].sort(),
    );
    expect(kf2.additionalProperties).toBe(false);
  });
});

describe("pathwayMetadata.v2 keyFeatures — the wrapper is identical everywhere", () => {
  it.each(KEY_FEATURE_FIELDS)(
    "%s is a uniqueItems array with a description",
    (name) => {
      const f = field(name);
      expect(f.type).toBe("array");
      expect(f.uniqueItems).toBe(true);
      // No minItems: an empty array is the legal "absent at every scope" state.
      expect(f.minItems).toBeUndefined();
      expect(typeof f.description).toBe("string");
      expect(f.description?.endsWith(".")).toBe(true);
    },
  );

  it.each(KEY_FEATURE_FIELDS)(
    "%s entries are closed {sector, geography, value}",
    (name) => {
      const e = entry(name);
      expect(e.type).toBe("object");
      expect(Object.keys(props(e, name)).sort()).toEqual([
        "geography",
        "sector",
        "value",
      ]);
      expect([...(e.required ?? [])].sort()).toEqual([
        "geography",
        "sector",
        "value",
      ]);
      expect(e.additionalProperties).toBe(false);
    },
  );

  it("every field's sector and geography subschemas are byte-identical", () => {
    // The whole point of the guard: one field drifting is the failure mode a
    // shared $ref would have made impossible.
    const scopes = KEY_FEATURE_FIELDS.map((name) =>
      JSON.stringify({
        sector: prop(entry(name), "sector", name),
        geography: prop(entry(name), "geography", name),
      }),
    );
    expect(new Set(scopes).size).toBe(1);
  });

  it("points sector and geography at the v2 scope subschemas", () => {
    const e = entry("emissionsTrajectory");
    expect(prop(e, "sector", "sector").$ref).toBe(
      "http://pathways.rmi.org/schema/common/scopeSector.v2.json",
    );
    expect(prop(e, "geography", "geography").$ref).toBe(
      "http://pathways.rmi.org/schema/common/scopeGeography.v2.json",
    );
    // Without the tsType hints the generator inlines the unions per field
    // instead of importing the named types.
    expect(prop(e, "sector", "sector").tsType).toContain("ScopeSectorV2");
    expect(prop(e, "geography", "geography").tsType).toContain(
      "ScopeGeographyV2",
    );
  });
});

describe("pathwayMetadata.v2 keyFeatures — values carry over from v1", () => {
  it.each(KEY_FEATURE_FIELDS)("%s value enum matches v1", (name) => {
    const v2Value = entryValue(name);
    const v1Value = prop(kf1, name, "v1.keyFeatures");

    if (name === "emissionsScope") {
      // A $ref in v1, so it stays a $ref — the enum lives in the common schema.
      expect(v2Value.$ref).toBe(v1Value.$ref);
      return;
    }

    if (ARRAY_VALUED.has(name)) {
      // The v1 array becomes one entry's value, not one entry per member.
      expect(v2Value.type).toBe("array");
      expect(v2Value.uniqueItems).toBe(v1Value.uniqueItems);
      expect(v2Value.minItems).toBe(v1Value.minItems);
      const v1Members = enumOf(items(v1Value, name), name);
      const expected =
        name === GAINED_NO_INFORMATION
          ? ["No information", ...v1Members]
          : v1Members;
      expect(enumOf(items(v2Value, name), name)).toEqual(expected);
      return;
    }

    expect(v2Value.type).toBe("string");
    expect(enumOf(v2Value, name)).toEqual(enumOf(v1Value, name));
  });

  it('every field offers an explicit "No information" value', () => {
    // #858: an explicit "No information" terminates the resolver's fallback
    // chain, as distinct from an absent entry. It only works if every field can
    // express it — policyTypes is the one v1 field that could not.
    for (const name of KEY_FEATURE_FIELDS) {
      const value = entryValue(name);
      // emissionsScope holds its enum in the common subschema it $refs, so follow
      // the reference rather than skipping the field — skipping would let this
      // test pass while the one $ref'd field quietly lost the value.
      let options: string[];
      if (value.enum) {
        options = value.enum;
      } else if (value.items?.enum) {
        options = value.items.enum;
      } else if (value.$ref === emissionsScope.$id) {
        options = enumOf(emissionsScope, "emissionsScope.v1");
      } else {
        throw new Error(`${name}: could not resolve a value enum`);
      }
      expect(options, `${name} is missing "No information"`).toContain(
        "No information",
      );
    }
  });
});

describe("scopeSector.v2 tracks sector.v1", () => {
  it("is sector.v1's display names plus the cross-sector sentinel", () => {
    const defs = sector.$defs;
    if (!defs) throw new Error("sector.v1: expected $defs");
    const sectorNames = enumOf(defs.displayName, "sector.v1.displayName");
    const scopeNames = enumOf(scopeSector, "scopeSector.v2");
    expect(scopeNames).toContain("cross-sector");
    expect([...scopeNames].filter((n) => n !== "cross-sector").sort()).toEqual(
      [...sectorNames].sort(),
    );
  });
});
