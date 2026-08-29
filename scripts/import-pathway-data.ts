/**
 * Import pathway metadata from the working Excel workbook into v2 JSON (#860).
 *
 * Supersedes the one-shot `codemod-v1-to-v2.ts`: where the codemod scaffolded
 * `coreDrivers` null, `dependencies` [], and a single widest-scope keyFeatures
 * entry, this reads the real values out of `pathway_data_prepared.xlsx` and
 * writes them onto the metadata files.
 *
 *   npx ts-node --esm scripts/import-pathway-data.ts --dry-run
 *   npx ts-node --esm scripts/import-pathway-data.ts
 *   npx ts-node --esm scripts/import-pathway-data.ts --xlsx other.xlsx --sheet-prefix pathway_
 *
 * Then run `npm run schema:check` and prettier over the written src/data JSON.
 *
 * This is a development tool, not a runtime path. It writes files in place and
 * prints a report of everything it could not map cleanly (unresolved scopes,
 * enum/vocabulary mismatches, over-length prose) rather than emitting anything
 * that would fail `npm run schema:check`.
 *
 * Sheet names are parameterized (`--sheet-prefix`, default `draft_`) because the
 * final `pathway_*` sheets are not populated yet; switch the prefix once they are.
 *
 * Scope of the current workbook: it covers 24 pathways across 7 publishers
 * (IEA, ACE, UN SDSN/CW, Philippines DOE, ASEAN Green Future, JRC, JETP-ID).
 * It carries NO NGFS data, so issue #801 (NGFS region memberships) is NOT
 * addressed here -- the report says so explicitly.
 */
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import {
  technologiesForSector,
  technologyBelongsToSector,
} from "../src/utils/timeseriesTaxonomy.ts";
import countryCodeSchema from "../src/schema/common/countryCode.v1.json" with { type: "json" };
import pathwayMetadataV2Schema from "../src/schema/pathwayMetadata.v2.json" with { type: "json" };
import sectorSchema from "../src/schema/common/sector.v1.json" with { type: "json" };
import technologySchema from "../src/schema/common/technology.v1.json" with { type: "json" };
import metricSchema from "../src/schema/common/metric.v1.json" with { type: "json" };
import emissionsScopeSchema from "../src/schema/common/emissionsScope.v1.json" with { type: "json" };

/** Valid ISO 3166-1 alpha-2 codes, from the schema (rejects e.g. "XK"). */
const VALID_COUNTRIES = new Set<string>(
  (countryCodeSchema as { enum?: string[] }).enum ?? [],
);

const V2_ID =
  (pathwayMetadataV2Schema as { $id?: string }).$id ??
  "http://pathways.rmi.org/schema/pathwayMetadata.v2.json";

/** Widest sentinels, mirroring src/utils/validateScopes.ts. */
const CROSS_SECTOR = "cross-sector";
const GLOBAL_SCOPE = "Global";
const CROSS_REGION = "cross-region";

/**
 * Workbook sheet selection -- the single source of truth. The data is not
 * finalized, so this is expected to change:
 *  - `SHEET_PREFIX` picks which set to read. It currently reads the populated
 *    `draft_` sheets; change it to `"pathway_"` (or override for one run with
 *    `--sheet-prefix pathway_`) once the final sheets are filled in.
 *  - `SHEET_BASENAMES` maps each logical sheet to its un-prefixed name; edit
 *    here if a sheet is renamed.
 *  - The `draft_` sheets carry two header rows (row 1 is a prose instruction);
 *    the final `pathway_` sheets carry one. `TWO_HEADER_ROW_PREFIX` selects that.
 */
const SHEET_PREFIX = "draft_";
const TWO_HEADER_ROW_PREFIX = "draft_";
const SHEET_BASENAMES = {
  metadata: "metadata",
  keyFeatures: "key_features",
  coreDrivers: "core_drivers",
  dependencies: "dependencies",
} as const;

// --------------------------------------------------------------------------
// Controlled vocabularies, read from src/schema/** at load time so they cannot
// drift from the schema this output must validate against. Only the Excel-to-
// schema *mappings* below are literals -- those have no schema representation.
// --------------------------------------------------------------------------

/** Just enough of the JSON Schema shape to pull enums out of. */
type SchemaNode = {
  enum?: string[];
  type?: string;
  $ref?: string;
  items?: SchemaNode;
  properties?: Record<string, SchemaNode>;
  $defs?: Record<string, SchemaNode>;
  definitions?: Record<string, SchemaNode>;
};

/** The `displayName` enum of a common vocabulary schema (sector/tech/metric). */
function displayNameEnum(schema: SchemaNode): string[] {
  return (schema.$defs ?? schema.definitions ?? {}).displayName?.enum ?? [];
}

const SECTORS = displayNameEnum(sectorSchema as SchemaNode);
const METRICS = displayNameEnum(metricSchema as SchemaNode);
const TECHNOLOGIES = displayNameEnum(technologySchema as SchemaNode);

const V2_PROPS = (pathwayMetadataV2Schema as SchemaNode).properties ?? {};
const PATHWAY_TYPES = V2_PROPS.pathwayType?.enum ?? [];
const EVIDENCE_TYPES =
  V2_PROPS.dependencies?.items?.properties?.evidence_type?.enum ?? [];

/**
 * Per-field keyFeatures value enums, read straight from the v2 schema. A field's
 * `value` is either an enum string (scalar), an array of enum strings
 * (policyTypes / newTechnologiesIncluded), or a $ref to a shared enum schema
 * (emissionsScope). KF_ARRAY_FIELDS records which fields are arrays.
 */
const REF_ENUMS: Record<string, string[]> = {
  "emissionsScope.v1.json": (emissionsScopeSchema as SchemaNode).enum ?? [],
};
const KF_SCALAR_ENUMS: Record<string, readonly string[]> = {};
const KF_ARRAY_ENUMS: Record<string, readonly string[]> = {};
const KF_ARRAY_FIELDS = new Set<string>();
for (const [field, spec] of Object.entries(
  V2_PROPS.keyFeatures?.properties ?? {},
)) {
  const value = spec.items?.properties?.value;
  if (!value) continue;
  if (value.$ref) {
    KF_SCALAR_ENUMS[field] = REF_ENUMS[value.$ref.split("/").pop() ?? ""] ?? [];
  } else if (value.type === "array") {
    KF_ARRAY_ENUMS[field] = value.items?.enum ?? [];
    KF_ARRAY_FIELDS.add(field);
  } else {
    KF_SCALAR_ENUMS[field] = value.enum ?? [];
  }
}

/** Excel key_features column header -> v2 keyFeatures field name. */
const KF_COLUMN_TO_FIELD: Record<string, string> = {
  "Emissions trajectory": "emissionsTrajectory",
  "Energy efficiency": "energyEfficiency",
  "Energy demand": "energyDemand",
  "Electrification": "electrification",
  "Policy types": "policyTypes",
  "Technology cost trend": "technologyCostTrend",
  "Emissions scope": "emissionsScope",
  "Policy ambition": "policyAmbition",
  "Technology costs detail": "technologyCostsDetail",
  "New technologies included": "newTechnologiesIncluded",
  "Investment needs": "investmentNeeds",
};

/** Excel core_drivers column header -> v2 coreDrivers field name. */
const CORE_DRIVER_COLUMNS: Array<[string, string]> = [
  ["Policy", "policies"],
  ["Emissions targets", "emissionsTargets"],
  ["Technology costs", "technologyCosts"],
  ["Investment trend", "investmentChange"],
  ["Macroeconomic trends", "macroeconomicDrivers"],
  ["Behavioral shifts", "behavioralShifts"],
  ["Other drivers", "otherDrivers"],
];

/** Excel dependency dimension column -> schema `dependency_name` enum value. */
const DEPENDENCY_COLUMNS: Array<[string, string]> = [
  ["Policy Strategy", "Policy strategy"],
  ["Regulatory framework", "Regulatory framework"],
  ["Market and economics", "Market and economics"],
  ["Public acceptance", "Public acceptance"],
  ["Consumer and client behavior", "Consumer and client behavior"],
  ["Infrastructure and logistics", "Infrastructure and logistics"],
  ["Technology", "Technology"],
  ["Resource availability", "Resource availability"],
  [
    "Environmental impacts and ecosystem services",
    "Environmental impacts and ecosystem services",
  ],
  ["Labor availability", "Labor availability"],
];

/**
 * Geography tokens that keyFeatures rows use but the metadata `Regions` cell
 * spells differently. Only applied when the canonical form is a geography the
 * pathway actually declares, so it can never widen coverage.
 */
const GEO_ALIASES: Record<string, string> = {
  "eu": "European Union",
  "european union": "EU",
};

// --------------------------------------------------------------------------
// Row -> target file mapping. Hand-verified against the 24 workbook rows: the
// only stable join key across sheets is (publisher group, scenario code,
// country), since pathway-name strings and publisher labels vary between
// sheets (e.g. "State" vs "States" in ATS). IEA is a new WEO edition (2025 vs
// the repo's 2024, and CPS is a brand-new scenario) so its rows create new
// files and leave the 2024 files untouched, per the "keep both" decision.
// Everyone else maps 1:1 onto an existing file and is updated in place.
// --------------------------------------------------------------------------

type Target =
  | { mode: "update"; file: string; wasV1?: boolean; note?: string }
  | {
      mode: "new";
      file: string;
      id: string;
      templateFile: string;
      note?: string;
    };

const TARGETS: Record<string, Target> = {
  // IEA World Energy Outlook 2025 -- new edition, new files.
  "IEA:CPS:": {
    mode: "new",
    file: "src/data/iea/IEA-CPS-2025.json",
    id: "IEA-CPS-2025",
    templateFile: "src/data/iea/IEA-STEPS-2024.json",
    note: "new WEO-2025 scenario (no 2024 equivalent)",
  },
  "IEA:STEPS:": {
    mode: "new",
    file: "src/data/iea/IEA-STEPS-2025.json",
    id: "IEA-STEPS-2025",
    templateFile: "src/data/iea/IEA-STEPS-2024.json",
    note: "WEO-2025 edition; IEA-STEPS-2024 kept",
  },
  "IEA:NZE:": {
    mode: "new",
    file: "src/data/iea/IEA-NZE-2025.json",
    id: "IEA-NZE-2025",
    templateFile: "src/data/iea/IEA-NZE-2024.json",
    note: "WEO-2025 edition; IEA-NZE-2024 kept",
  },
  // ACE 8th ASEAN Energy Outlook -- already v2, refreshed.
  "ACE:BAS:": {
    mode: "update",
    file: "src/data/asean-centre-for-energy/ACE-BAS-2024.json",
  },
  "ACE:ATS:": {
    mode: "update",
    file: "src/data/asean-centre-for-energy/ACE-ATS-2024.json",
  },
  "ACE:RAS:": {
    mode: "update",
    file: "src/data/asean-centre-for-energy/ACE-RAS-2024.json",
  },
  "ACE:CNS:": {
    mode: "update",
    file: "src/data/asean-centre-for-energy/ACE-CNS-2024.json",
  },
  // UN SDSN / ClimateWorks -- Thailand.
  "SDSN:EXT TH:": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-EXT-TH-2024.json",
    wasV1: true,
  },
  "SDSN:MAP TH:": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-MAP-TH-2024.json",
    wasV1: true,
  },
  "SDSN:NZE TH:": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-NZE-TH-2024.json",
    wasV1: true,
  },
  // Philippines DOE. Excel Year of Publication is 2024 while the repo ids say
  // 2023 (id uses the plan's base year); same single report, so update in place.
  "PHDOE:REF:": {
    mode: "update",
    file: "src/data/philippines-department-of-energy/PHDOE-REFERENCE-2023.json",
    wasV1: true,
    note: "Excel year 2024 vs repo id year 2023 (same report)",
  },
  "PHDOE:CES1:": {
    mode: "update",
    file: "src/data/philippines-department-of-energy/PHDOE-CES1-2023.json",
    wasV1: true,
    note: "Excel year 2024 vs repo id year 2023 (same report)",
  },
  "PHDOE:CES2:": {
    mode: "update",
    file: "src/data/philippines-department-of-energy/PHDOE-CES2-2023.json",
    wasV1: true,
    note: "Excel year 2024 vs repo id year 2023 (same report)",
  },
  // ASEAN Green Future -- stored under un-sdsn-cw. Myanmar ([MM]) and Laos.
  "AGF:EPP:MM": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-EPP-MM-2025.json",
    wasV1: true,
  },
  "AGF:OEPP:MM": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-OEPP-MM-2025.json",
    wasV1: true,
  },
  "AGF:OMAP:MM": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-OMAP-MM-2025.json",
    wasV1: true,
  },
  "AGF:EP:": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-EP-LA-2025.json",
    wasV1: true,
  },
  "AGF:OEP:": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-OEP-LA-2025.json",
    wasV1: true,
  },
  "AGF:MAP:": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-MAP-LA-2025.json",
    wasV1: true,
  },
  "AGF:OMAP:": {
    mode: "update",
    file: "src/data/un-sdsn-cw/SDSN-CW-OMAP-LA-2025.json",
    wasV1: true,
  },
  // JRC GECO -- repo files already year 2025, same edition; update in place.
  "JRC:REFERENCE:": {
    mode: "update",
    file: "src/data/jrc/JRC-GECO-REFERENCE-2025.json",
    wasV1: true,
  },
  "JRC:NDC-LTS:": {
    mode: "update",
    file: "src/data/jrc/JRC-GECO-NDC-LTS-2025.json",
    wasV1: true,
  },
  "JRC:1.5C:": {
    mode: "update",
    file: "src/data/jrc/JRC-GECO-1-5-2025.json",
    wasV1: true,
  },
  // JETP Indonesia.
  "JETP:CIPP:": {
    mode: "update",
    file: "src/data/jetp-id/JETP-CIPP-2023.json",
    wasV1: true,
  },
};

/** Publisher label (any sheet's spelling) -> canonical group used in the key. */
export function publisherGroup(label: string): string | null {
  const l = label.toLowerCase();
  if (l.includes("green future") || l.includes("agf")) return "AGF";
  if (l.includes("iea") || l.includes("international energy")) return "IEA";
  if (l.includes("asean centre") || l === "ace") return "ACE";
  if (l.includes("philippines") || l.includes("department of energy"))
    return "PHDOE";
  if (l.includes("joint research") || l.includes("jrc")) return "JRC";
  if (l.includes("jetp")) return "JETP";
  if (l.includes("sdsn") || l.includes("climateworks")) return "SDSN";
  return null;
}

/** Scenario code + optional [CC] country, from the pathway name. */
export function scenarioParts(name: string): { code: string; country: string } {
  const country = /\[([A-Z]{2})\]/.exec(name)?.[1] ?? "";
  const parens = [...name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  let code = parens.length > 0 ? parens[parens.length - 1] : "";
  if (!code) {
    // JRC pathways have no parenthetical code.
    const l = name.toLowerCase();
    if (l.startsWith("reference")) code = "REFERENCE";
    else if (l.includes("ndc-lts")) code = "NDC-LTS";
    else if (l.includes("1.5")) code = "1.5C";
  }
  return { code, country };
}

export function canonicalKey(
  publisher: string,
  pathwayName: string,
): string | null {
  const group = publisherGroup(publisher);
  if (!group) return null;
  const { code, country } = scenarioParts(pathwayName);
  if (!code) return null;
  return `${group}:${code}:${country}`;
}

// --------------------------------------------------------------------------
// Workbook reading.
// --------------------------------------------------------------------------

type Row = Record<string, string>;

interface Sheets {
  metadata: Row[];
  keyFeatures: Row[];
  coreDrivers: Row[];
  dependencies: Row[];
}

/** Flatten one ExcelJS cell value to trimmed text. */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value instanceof Date) return String(value.getFullYear());
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return v.richText
        .map((r) => (r as { text?: string }).text ?? "")
        .join("")
        .trim();
    }
    if ("text" in v && typeof v.text === "string") return v.text.trim();
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("formula" in v) return "";
  }
  return String(value).trim();
}

/**
 * Read one sheet into records. Draft sheets have two header rows -- row 1 is a
 * prose instruction, row 2 is the field name -- so field names come from row 2
 * and data from row 3 on. `CHECK *` and blank-header helper columns are dropped.
 * The final `pathway_*` sheets carry a single header row; `headerRow` handles that.
 */
function readSheet(
  ws: ExcelJS.Worksheet | undefined,
  headerRow: number,
): Row[] {
  if (!ws) return [];
  const headers: Record<number, string> = {};
  ws.getRow(headerRow).eachCell({ includeEmpty: true }, (cell, col) => {
    const h = cellText(cell.value);
    if (h && !h.startsWith("CHECK")) headers[col] = h;
  });
  const rows: Row[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rec: Row = {};
    let any = false;
    for (const [colStr, header] of Object.entries(headers)) {
      const text = cellText(row.getCell(Number(colStr)).value);
      rec[header] = text;
      if (text) any = true;
    }
    if (any) rows.push(rec);
  }
  return rows;
}

async function readWorkbook(path: string, prefix: string): Promise<Sheets> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  // Draft sheets: two header rows. Final `pathway_` sheets: one.
  const headerRow = prefix === TWO_HEADER_ROW_PREFIX ? 2 : 1;
  const sheet = (base: string) => wb.getWorksheet(`${prefix}${base}`);
  return {
    metadata: readSheet(sheet(SHEET_BASENAMES.metadata), headerRow),
    keyFeatures: readSheet(sheet(SHEET_BASENAMES.keyFeatures), headerRow),
    coreDrivers: readSheet(sheet(SHEET_BASENAMES.coreDrivers), headerRow),
    dependencies: readSheet(sheet(SHEET_BASENAMES.dependencies), headerRow),
  };
}

// --------------------------------------------------------------------------
// Value normalization helpers.
// --------------------------------------------------------------------------

/** Cells that mean "no value at this scope" -- the entry is omitted entirely. */
export function isAbsent(raw: string): boolean {
  const l = raw.trim().toLowerCase();
  return (
    l === "" ||
    l === "null" ||
    l === "n/a" ||
    l.startsWith("not applicable") ||
    l.startsWith("not available")
  );
}

export function matchEnum(
  raw: string,
  options: readonly string[],
): string | null {
  const cleaned = raw.trim().replace(/signifcant/gi, "Significant");
  const hit = options.find((o) => o.toLowerCase() === cleaned.toLowerCase());
  return hit ?? null;
}

export function ensurePeriod(text: string): string {
  const t = text.trim();
  return /\.$/.test(t) ? t : `${t}.`;
}

export function normalizeSector(raw: string): string | null {
  return (
    SECTORS.find((s) => s.toLowerCase() === raw.trim().toLowerCase()) ?? null
  );
}

function normalizeTechnology(raw: string): string | null {
  return (
    TECHNOLOGIES.find((t) => t.toLowerCase() === raw.trim().toLowerCase()) ??
    null
  );
}

function normalizeMetric(raw: string): string | null {
  return (
    METRICS.find((m) => m.toLowerCase() === raw.trim().toLowerCase()) ?? null
  );
}

/** Split a delimited list cell on `;` and `,`, dropping empties. */
export function splitList(raw: string): string[] {
  return raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// --------------------------------------------------------------------------
// Reporting.
// --------------------------------------------------------------------------

export class Report {
  readonly lines: string[] = [];
  section(title: string) {
    this.lines.push(`\n## ${title}`);
  }
  note(text: string) {
    this.lines.push(`  - ${text}`);
  }
}

// --------------------------------------------------------------------------
// Field builders.
// --------------------------------------------------------------------------

interface Geography {
  global?: boolean;
  regions?: Record<string, string[]>;
  country?: string[];
}

/**
 * Parse the metadata `Regions` cell into a v2 geography object. Format:
 *   Global; Africa: [DZ, EG]; Atlantic Basin: []; Brazil: [BR]; PH
 * A bare token (`Global`) sets the flag or, if a 2-letter code, becomes a
 * standalone country. `Label: [..]` is a region and its ISO members.
 */
export function buildGeography(
  cell: string,
  report: Report,
  id: string,
): Geography | null {
  const raw = cell.trim().replace(/^"+|"+$/g, "");
  if (!raw) return null;
  const geo: Geography = {};
  const regions: Record<string, string[]> = {};
  const countries: string[] = [];
  // Split top-level entries on `;` (member lists inside [..] use commas only).
  for (const part of raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const m = /^(.+?):\s*\[(.*)\]$/.exec(part);
    if (m) {
      const label = m[1].trim();
      const all = m[2]
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z]{2}$/.test(s));
      const members = all.filter((c) => VALID_COUNTRIES.has(c));
      const dropped = all.filter((c) => !VALID_COUNTRIES.has(c));
      if (dropped.length) {
        report.note(
          `${id}: geography region "${label}" dropped non-ISO code(s) {${dropped.join(", ")}}`,
        );
      }
      regions[label] = members;
    } else if (/^global$/i.test(part)) {
      geo.global = true;
    } else if (/^[A-Z]{2}$/.test(part.toUpperCase()) && part.length === 2) {
      const c = part.toUpperCase();
      if (VALID_COUNTRIES.has(c)) countries.push(c);
      else report.note(`${id}: geography dropped non-ISO country "${part}"`);
    } else {
      // A region label with no bracketed member list.
      regions[part] = [];
      report.note(
        `${id}: region "${part}" declared with no members (matches nothing)`,
      );
    }
  }
  if (Object.keys(regions).length > 0) geo.regions = regions;
  if (countries.length > 0) geo.country = countries;
  return geo;
}

/** Every geography token entries on this pathway may name (mirrors validateScopes). */
export function allowedGeographies(geo: Geography | undefined): Set<string> {
  const allowed = new Set<string>([CROSS_REGION]);
  if (!geo) return allowed;
  if (geo.global === true) allowed.add(GLOBAL_SCOPE);
  for (const [label, members] of Object.entries(geo.regions ?? {})) {
    allowed.add(label);
    members.forEach((m) => allowed.add(m));
  }
  (geo.country ?? []).forEach((c) => allowed.add(c));
  return allowed;
}

/** Alnum-only, lowercase -- for punctuation/spacing-insensitive label matching. */
function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveGeography(
  token: string,
  allowed: Set<string>,
): string | null {
  const t = token.trim();
  if (allowed.has(t)) return t;
  const up = t.toUpperCase();
  if (/^[A-Z]{2}$/.test(up) && allowed.has(up)) return up;
  const alias = GEO_ALIASES[t.toLowerCase()];
  if (alias && allowed.has(alias)) return alias;
  // Last resort: match ignoring case, punctuation and spacing, so a key-feature
  // token like "Rest Sub Saharan Africa" resolves to a declared region labeled
  // "Rest Sub-Saharan Africa". Genuine word differences ("Other" vs "Rest") do
  // not match and are reported instead.
  const tn = normKey(t);
  for (const a of allowed) {
    if (normKey(a) === tn) return a;
  }
  return null;
}

function sectorBreadth(s: string): number {
  return s === CROSS_SECTOR ? 0 : 1;
}
function geographyBreadth(g: string): number {
  if (g === GLOBAL_SCOPE) return 0;
  if (g === CROSS_REGION) return 1;
  return /^[A-Z]{2}$/.test(g) ? 3 : 2;
}

type ScopedEntry = {
  sector: string;
  geography: string;
  value: string | string[];
};

/**
 * Build the 11 scoped keyFeatures arrays from this pathway's key_features rows.
 * Emits every resolvable (sector, geography) scope. Entries whose sector or
 * geography does not resolve against the pathway's declared coverage are
 * omitted and reported, so the file still passes validateScopedEntries.
 */
function buildKeyFeatures(
  rows: Row[],
  declaredSectors: Set<string>,
  geoAllowed: Set<string>,
  report: Report,
  id: string,
): Record<string, ScopedEntry[]> {
  const fields: Record<string, ScopedEntry[]> = {};
  const seen: Record<string, Set<string>> = {};
  for (const field of Object.values(KF_COLUMN_TO_FIELD)) {
    fields[field] = [];
    seen[field] = new Set();
  }
  const badSectors = new Set<string>();
  const badGeos = new Set<string>();
  const badValues = new Set<string>();
  let dupScopes = 0;

  for (const row of rows) {
    const rawSector = row["Key features sector scope"] ?? "";
    const rawGeo = row["Key features regional scope"] ?? "";
    let sector: string | null;
    if (/^across sectors$/i.test(rawSector.trim())) sector = CROSS_SECTOR;
    else sector = normalizeSector(rawSector);
    if (!sector || (sector !== CROSS_SECTOR && !declaredSectors.has(sector))) {
      badSectors.add(rawSector.trim() || "(blank)");
      continue;
    }
    const geography = resolveGeography(rawGeo, geoAllowed);
    if (!geography) {
      badGeos.add(rawGeo.trim() || "(blank)");
      continue;
    }
    const scopeKey = `${sector}\u0000${geography}`;

    for (const [column, field] of Object.entries(KF_COLUMN_TO_FIELD)) {
      const raw = row[column] ?? "";
      if (isAbsent(raw)) continue;
      let value: string | string[] | null = null;
      if (KF_ARRAY_FIELDS.has(field)) {
        const tokens = splitList(raw);
        const mapped: string[] = [];
        for (const tok of tokens) {
          const hit = matchEnum(tok, KF_ARRAY_ENUMS[field]);
          if (hit) {
            if (!mapped.includes(hit)) mapped.push(hit);
          } else {
            badValues.add(`${field}:"${tok}"`);
          }
        }
        value = mapped.length > 0 ? mapped : null;
      } else {
        const hit = matchEnum(raw, KF_SCALAR_ENUMS[field]);
        if (hit) value = hit;
        else badValues.add(`${field}:"${raw}"`);
      }
      if (value === null) continue;
      if (seen[field].has(scopeKey)) {
        dupScopes++;
        continue;
      }
      seen[field].add(scopeKey);
      fields[field].push({ sector, geography, value });
    }
  }

  const emitted = Object.values(fields).reduce((n, a) => n + a.length, 0);
  const parts: string[] = [`${emitted} keyFeature entries emitted`];
  if (badSectors.size)
    parts.push(`undeclared sector scopes {${[...badSectors].join(", ")}}`);
  if (badGeos.size)
    parts.push(`unresolved geographies {${[...badGeos].join(", ")}}`);
  if (badValues.size) parts.push(`${badValues.size} off-enum value(s) dropped`);
  if (dupScopes) parts.push(`${dupScopes} duplicate-scope value(s) collapsed`);
  if (parts.length > 1) report.note(`${id}: ${parts.join("; ")}`);

  for (const field of Object.keys(fields)) {
    fields[field].sort(
      (a, b) =>
        sectorBreadth(a.sector) - sectorBreadth(b.sector) ||
        geographyBreadth(a.geography) - geographyBreadth(b.geography) ||
        a.sector.localeCompare(b.sector) ||
        a.geography.localeCompare(b.geography),
    );
  }
  return fields;
}

function buildCoreDrivers(
  row: Row | undefined,
  report: Report,
  id: string,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [column, field] of CORE_DRIVER_COLUMNS) {
    const raw = row?.[column] ?? "";
    if (isAbsent(raw)) {
      out[field] = null;
      continue;
    }
    const text = ensurePeriod(raw);
    if (text.length > 500) {
      report.note(
        `${id}/coreDrivers.${field}: ${text.length} chars > 500 -- left null, needs trimming`,
      );
      out[field] = null;
    } else {
      out[field] = text;
    }
  }
  return out;
}

function buildDependencies(
  rows: Row[],
  declaredSectors: Set<string>,
  report: Report,
  id: string,
): Array<Record<string, string>> {
  const deps: Array<Record<string, string>> = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sector = normalizeSector(row["Sector"] ?? "");
    if (!sector) {
      report.note(
        `${id}/dependencies: sector "${row["Sector"]}" not a valid sector -- rows skipped`,
      );
      continue;
    }
    if (!declaredSectors.has(sector)) {
      report.note(
        `${id}/dependencies: sector "${sector}" not declared by pathway -- rows skipped`,
      );
      continue;
    }
    for (const [column, name] of DEPENDENCY_COLUMNS) {
      const prose = row[column] ?? "";
      if (isAbsent(prose)) continue;
      const description = ensurePeriod(prose);
      if (description.length > 500) {
        report.note(
          `${id}/dependencies "${name}" (${sector}): ${description.length} chars > 500 -- skipped`,
        );
        continue;
      }
      const evidence =
        matchEnum(row[`${column}_Evidence type`] ?? "", EVIDENCE_TYPES) ??
        "No evidence";
      const key = `${name}\u0000${sector}\u0000${description}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deps.push({
        dependency_name: name,
        dependency_description: description,
        sector,
        evidence_type: evidence,
      });
    }
  }
  return deps;
}

/** Parse `Sector: [t, t]; Sector2: [..]` into a sector -> raw-tech-tokens map. */
function parseSectorGroups(cell: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!cell) return out;
  for (const part of cell
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const m = /^(.+?):\s*\[?([^\]]*)\]?$/.exec(part);
    if (!m) continue;
    out[m[1].trim()] = m[2]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return out;
}

/** Build v2 `sectors` for a new file from the Excel Sectors + Technology coverage. */
function buildSectors(
  sectorsCell: string,
  techCell: string,
  report: Report,
  id: string,
): Array<{ name: string; technologies: string[] }> {
  const techGroups = parseSectorGroups(techCell);
  // Normalize the tech-group keys to sector display names for lookup.
  const techBySector: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(techGroups)) {
    const s = normalizeSector(k);
    if (s) techBySector[s] = v;
  }
  const out: Array<{ name: string; technologies: string[] }> = [];
  const seen = new Set<string>();
  for (const rawName of splitList(sectorsCell)) {
    const name = normalizeSector(rawName);
    if (!name) {
      report.note(`${id}/sectors: "${rawName}" not a valid sector -- skipped`);
      continue;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    const technologies: string[] = [];
    for (const rawTech of techBySector[name] ?? []) {
      const tech = normalizeTechnology(rawTech);
      if (tech && technologyBelongsToSector(tech, name) === "yes") {
        if (!technologies.includes(tech)) technologies.push(tech);
      } else if (rawTech) {
        report.note(
          `${id}/sectors.${name}: technology "${rawTech}" not valid for sector -- dropped`,
        );
      }
    }
    out.push({ name, technologies });
  }
  return out;
}

/** Build the flat `metric` array for a new file from the Excel Metric cell. */
function buildMetrics(
  metricCell: string,
  report: Report,
  id: string,
): string[] {
  const groups = parseSectorGroups(metricCell);
  const metrics: string[] = [];
  for (const tokens of Object.values(groups)) {
    for (const raw of tokens) {
      const m = normalizeMetric(raw);
      if (m) {
        if (!metrics.includes(m)) metrics.push(m);
      } else if (raw) {
        report.note(
          `${id}/metric: "${raw}" not in metric vocabulary -- dropped`,
        );
      }
    }
  }
  return metrics;
}

function parseYear(raw: string): number | undefined {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1900 && n <= 2100 ? n : undefined;
}

function parseTemp(raw: string): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0.5 || n > 3) return undefined;
  return Math.round(n * 10) / 10;
}

// --------------------------------------------------------------------------
// Document assembly.
// --------------------------------------------------------------------------

type Json = Record<string, unknown>;

/** Assemble the full v2 document for one pathway. */
function buildDoc(
  target: Target,
  meta: Row,
  sub: {
    keyFeatures: Row[];
    coreDrivers: Row | undefined;
    dependencies: Row[];
  },
  existing: Json | null,
  template: Json | null,
  report: Report,
): Json {
  const id =
    target.mode === "new" ? target.id : String(existing?.id ?? target.file);

  // Geography: rebuilt from Excel where present, else keep existing.
  let geography = buildGeography(
    meta["Regions"] ?? "",
    report,
    id,
  ) as Geography | null;
  if (!geography)
    geography =
      (existing?.geography as Geography) ??
      (template?.geography as Geography) ??
      null;
  else if (existing?.geography) {
    const before = JSON.stringify(existing.geography);
    const after = JSON.stringify(geography);
    if (before !== after) {
      report.note(
        `${id}: geography rebuilt. before regions=[${Object.keys((existing.geography as Geography).regions ?? {}).join(", ")}]` +
          ` country=[${((existing.geography as Geography).country ?? []).join(", ")}] global=${(existing.geography as Geography).global}` +
          ` -> after regions=[${Object.keys(geography.regions ?? {}).join(", ")}]` +
          ` country=[${(geography.country ?? []).join(", ")}] global=${geography.global}`,
      );
    }
  }

  // Sectors are rebuilt from the Excel for every file, not preserved: the
  // workbook's Sectors cell is authoritative (it drives which keyFeatures scopes
  // are in-bounds), and preserving a v1 file's sectors could carry a technology
  // that violates #461 and fails schema:check. Technologies are filtered to the
  // sector's own vocabulary (technologiesForSector), dropping e.g. "BESS".
  const sectors = buildSectors(
    meta["Sectors"] ?? "",
    meta["Technology coverage"] ?? "",
    report,
    id,
  );
  if (sectors.length === 0 && existing?.sectors) {
    report.note(
      `${id}: Excel declared no parseable sectors -- kept existing sectors`,
    );
  }
  const effectiveSectors =
    sectors.length > 0
      ? sectors
      : ((existing?.sectors as typeof sectors) ?? []);
  const declaredSectors = new Set<string>(effectiveSectors.map((s) => s.name));

  // Metric: rebuilt from Excel for new files; preserved for updates (existing
  // values are already valid and tie to the hosted timeseries).
  const metric =
    target.mode === "new"
      ? buildMetrics(meta["Metric"] ?? "", report, id)
      : ((existing?.metric as string[]) ?? []);

  const geoAllowed = allowedGeographies(geography ?? undefined);
  const keyFeatures = buildKeyFeatures(
    sub.keyFeatures,
    declaredSectors,
    geoAllowed,
    report,
    id,
  );
  const coreDrivers = buildCoreDrivers(sub.coreDrivers, report, id);
  const dependencies = buildDependencies(
    sub.dependencies,
    declaredSectors,
    report,
    id,
  );

  // pathwayDescription from the Excel "Pathway Overview"; keep existing otherwise.
  let pathwayDescription: string | null;
  const overview = (meta["Pathway Overview"] ?? "").trim();
  if (overview && !isAbsent(overview)) {
    const text = ensurePeriod(overview);
    if (text.length <= 2500) pathwayDescription = text;
    else {
      report.note(
        `${id}/pathwayDescription: ${text.length} chars > 2500 -- kept existing`,
      );
      pathwayDescription = (existing?.pathwayDescription as string) ?? null;
    }
  } else {
    pathwayDescription =
      (existing?.pathwayDescription as string | null) ?? null;
  }

  // Scalars: take from Excel where valid, else keep existing/template.
  const pathwayType = (PATHWAY_TYPES as readonly string[]).includes(
    meta["Pathway Type"] ?? "",
  )
    ? meta["Pathway Type"]
    : (existing?.pathwayType ?? template?.pathwayType);
  const modelYearStart =
    parseYear(meta["Start Year of Model"] ?? "") ??
    (existing?.modelYearStart as number | undefined) ??
    (template?.modelYearStart as number | undefined);
  const modelYearEnd =
    parseYear(meta["End Year of Model"] ?? "") ??
    (existing?.modelYearEnd as number | undefined) ??
    (template?.modelYearEnd as number | undefined);
  const netzero = parseYear(meta["Net Zero Reached"] ?? "");
  const modelYearNetzero =
    (netzero && netzero >= 2030 ? netzero : undefined) ??
    (existing?.modelYearNetzero as number | undefined);
  const modelTempIncrease =
    parseTemp(meta["Modeled Temperature Increase"] ?? "") ??
    (existing?.modelTempIncrease as number | undefined) ??
    (template?.modelTempIncrease as number | undefined);

  // Publication / name / description.
  let publication: unknown;
  let name: unknown;
  let description: unknown;
  if (target.mode === "new") {
    const { code } = scenarioParts(meta["Name of Pathway"] ?? "");
    const full = (meta["Name of Pathway"] ?? "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/\s*\[[A-Z]{2}\]/g, "")
      .trim();
    name = { full, short: code };
    const desc = ensurePeriod(meta["Description"] ?? "");
    description =
      desc.length <= 100
        ? desc
        : (template?.description ?? desc.slice(0, 99) + ".");
    if (desc.length > 100)
      report.note(
        `${id}/description: ${desc.length} chars > 100 -- used template description`,
      );
    publication = buildPublicationForNew(
      template?.publication as Json,
      meta,
      report,
      id,
    );
  } else {
    publication = existing?.publication;
    name = existing?.name;
    description = existing?.description;
  }

  const doc: Json = {
    $schema: V2_ID,
    id,
    publication,
    name,
    description,
    geography,
    pathwayType,
  };
  if (modelTempIncrease !== undefined)
    doc.modelTempIncrease = modelTempIncrease;
  if (modelYearStart !== undefined) doc.modelYearStart = modelYearStart;
  if (modelYearEnd !== undefined) doc.modelYearEnd = modelYearEnd;
  if (modelYearNetzero !== undefined) doc.modelYearNetzero = modelYearNetzero;
  doc.sectors = effectiveSectors;
  doc.pathwayDescription = pathwayDescription;
  doc.metric = metric;
  doc.keyFeatures = keyFeatures;
  doc.coreDrivers = coreDrivers;
  doc.dependencies = dependencies;
  return doc;
}

/** Publication block for a new file: template's publisher block + Excel title/year. */
function buildPublicationForNew(
  template: Json | undefined,
  meta: Row,
  report: Report,
  id: string,
): Json {
  const pub: Json = template ? JSON.parse(JSON.stringify(template)) : {};
  const title = (meta["Name of publication"] ?? "").trim();
  const year = parseYear(meta["Year of Publication"] ?? "");
  const oldYear = pub.year as number | undefined;
  if (title) pub.title = { ...(pub.title as Json), full: title };
  if (year !== undefined) pub.year = year;
  // Bump any year in the link URLs to match (WEO 2024 -> 2025).
  if (oldYear && year && Array.isArray(pub.links)) {
    pub.links = (
      pub.links as Array<{ url?: string; description?: string }>
    ).map((l) => ({
      ...l,
      url: l.url?.replace(String(oldYear), String(year)),
    }));
  }
  if (!template)
    report.note(
      `${id}: no template for publication -- block may be incomplete`,
    );
  return pub;
}

// --------------------------------------------------------------------------
// Main.
// --------------------------------------------------------------------------

async function readJson(file: string): Promise<Json | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as Json;
  } catch {
    return null;
  }
}

/** Group sub-sheet rows by canonical key. */
function groupByKey(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const key = canonicalKey(
      row["Name of Publisher"] ?? "",
      row["Name of Pathway"] ?? "",
    );
    if (!key) continue;
    (map.get(key) ?? map.set(key, []).get(key)!).push(row);
  }
  return map;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const getArg = (flag: string, def: string) => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : def;
  };
  const xlsx = getArg("--xlsx", "pathway_data_prepared.xlsx");
  const prefix = getArg("--sheet-prefix", SHEET_PREFIX);
  const outRoot = getArg("--out", "src/data");
  void outRoot; // targets carry explicit paths; --out reserved for future use.

  const report = new Report();
  const sheets = await readWorkbook(xlsx, prefix);
  report.note(
    `Read ${xlsx} sheets ${prefix}{metadata,key_features,core_drivers,dependencies}: ` +
      `${sheets.metadata.length} pathways, ${sheets.keyFeatures.length} key-feature rows.`,
  );

  const kfByKey = groupByKey(sheets.keyFeatures);
  const cdByKey = groupByKey(sheets.coreDrivers);
  const depByKey = groupByKey(sheets.dependencies);

  const seenKeys = new Set<string>();
  let updated = 0;
  let created = 0;
  let migratedV1 = 0;
  const unmatched: string[] = [];

  report.section("Per-pathway");
  for (const meta of sheets.metadata) {
    const publisher = meta["Name of Publisher"] ?? "";
    const pathway = meta["Name of Pathway"] ?? "";
    const key = canonicalKey(publisher, pathway);
    if (!key || !TARGETS[key]) {
      unmatched.push(`${publisher} | ${pathway} (key=${key ?? "?"})`);
      continue;
    }
    seenKeys.add(key);
    const target = TARGETS[key];
    const existing =
      target.mode === "update" ? await readJson(target.file) : null;
    const template =
      target.mode === "new" ? await readJson(target.templateFile) : null;
    if (target.mode === "update" && !existing) {
      report.note(`${key}: target file ${target.file} not found -- skipped`);
      continue;
    }

    const sub = {
      keyFeatures: kfByKey.get(key) ?? [],
      coreDrivers: (cdByKey.get(key) ?? [])[0],
      dependencies: depByKey.get(key) ?? [],
    };
    if (sub.keyFeatures.length === 0)
      report.note(`${key}: no key_features rows -- keyFeatures left empty`);

    const doc = buildDoc(target, meta, sub, existing, template, report);
    const wasV1 = target.mode === "update" && existing?.$schema !== V2_ID;

    if (!dryRun)
      await fs.writeFile(target.file, `${JSON.stringify(doc, null, 2)}\n`);
    if (target.mode === "new") {
      created++;
      report.note(
        `NEW  ${target.file}${target.note ? ` (${target.note})` : ""}`,
      );
    } else {
      updated++;
      if (wasV1) migratedV1++;
      report.note(
        `UPD  ${target.file}${wasV1 ? " [v1->v2]" : ""}${target.note ? ` (${target.note})` : ""}`,
      );
    }
  }

  // Targets in the table that no metadata row hit.
  for (const [key, t] of Object.entries(TARGETS)) {
    if (!seenKeys.has(key))
      report.note(`table entry ${key} -> ${t.file} had no matching Excel row`);
  }

  report.section("Summary");
  report.note(
    `${dryRun ? "Would update" : "Updated"} ${updated} file(s) (${migratedV1} migrated v1->v2), ` +
      `${dryRun ? "would create" : "created"} ${created} new file(s).`,
  );
  if (unmatched.length > 0) {
    report.note(
      `Unmatched Excel rows (${unmatched.length}): ${unmatched.join(" ;; ")}`,
    );
  }
  report.note(
    "#801 NOT addressed: the workbook carries no NGFS data, so the 7 NGFS files' " +
      "empty region memberships are untouched. Region memberships ARE populated for " +
      "the covered pathways from their Regions cell.",
  );
  report.note(
    "dataAvailability NOT emitted this pass (optional; draft_data_availability available for follow-up).",
  );

  console.info(report.lines.join("\n"));
  if (!dryRun)
    console.info(
      '\nRun `npm run schema:check` and `npx prettier --write "src/data/**/*.json"` next.',
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e: unknown) => {
    console.error(String(e instanceof Error ? e.stack : e));
    process.exit(1);
  });
}
