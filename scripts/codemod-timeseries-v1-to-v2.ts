/**
 * One-off migration of timeseries files from pathwayTimeseries.v1 to v2 (#915).
 *
 * Usage:
 *   node --experimental-strip-types scripts/codemod-timeseries-v1-to-v2.ts [--dry-run]
 *
 * Per file it changes three things and nothing else:
 *
 * - `$schema` becomes the v2 id.
 * - Every row gains `sectorSegment: ["Power generation"]`. That is exactly what
 *   v1 meant: the taxonomy gave every Power metric the sector scope "Power
 *   generation", and every row in the corpus is Power. The codemod refuses any
 *   other sector rather than guess its segment.
 * - A row's `geography` becomes the label its pathway's metadata declares.
 *   Labels already declared are kept. The rest come from {@link RENAMES}, an
 *   explicit table rather than a fuzzy match: "South East Asia" means "ASEAN"
 *   for ACE but "Southeast Asia" for IEA, which no spelling rule can know. A
 *   label neither declared nor in the table stops the run.
 *
 * Values are never touched. The file is edited line by line, so the diff shows
 * only the changed lines, and the edited text is then parsed back and compared
 * with the intended document, so a formatting surprise cannot slip through.
 */
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { declaredGeographies } from "../src/utils/validateScopes.ts";
import type { PathwayMetadataV2 } from "../src/types/pathwayMetadata.v2.d.ts";

const V1_ID = "http://pathways.rmi.org/schema/pathwayTimeseries.v1.json";
const V2_ID = "http://pathways.rmi.org/schema/pathwayTimeseries.v2.json";
const METADATA_IDS = new Set([
  "http://pathways.rmi.org/schema/pathwayMetadata.v1.json",
  "http://pathways.rmi.org/schema/pathwayMetadata.v2.json",
]);
const POWER_SEGMENT = "Power generation";

type Geography = PathwayMetadataV2["geography"];
type Json = Record<string, unknown>;
type Row = Json & { geography: string; sector: string };

/**
 * Timeseries labels that differ from their pathway's metadata, keyed by
 * pathway id. Reviewed by hand: each says which region of the publication the
 * series is.
 */
export const RENAMES: Record<string, Record<string, string>> = {
  // ACE's 8th ASEAN Energy Outlook models the ASEAN member states.
  "ACE-ATS-2024": { "South East Asia": "ASEAN" },
  "ACE-BAS-2024": { "South East Asia": "ASEAN" },
  "ACE-CNS-2024": { "South East Asia": "ASEAN" },
  "ACE-RAS-2024": { "South East Asia": "ASEAN" },
  // IEA's WEO spells its region "Southeast Asia" (#945).
  "IEA-APS-2024": { "South East Asia": "Southeast Asia" },
  "IEA-STEPS-2024": { "South East Asia": "Southeast Asia" },
};

/**
 * The label a row's geography becomes: kept when every pathway declares it,
 * renamed when every pathway's {@link RENAMES} entry agrees and declares the
 * result. Throws otherwise.
 */
export function relabel(
  token: string,
  pathwayIds: readonly string[],
  geographyById: ReadonlyMap<string, Geography | undefined>,
  renames: Record<string, Record<string, string>> = RENAMES,
): string {
  const declaredByAll = (label: string) =>
    pathwayIds.every((id) =>
      declaredGeographies(geographyById.get(id)).has(label),
    );
  if (declaredByAll(token)) return token;
  const targets = new Set(pathwayIds.map((id) => renames[id]?.[token]));
  const [target] = targets;
  if (targets.size === 1 && target !== undefined && declaredByAll(target))
    return target;
  throw new Error(
    `geography "${token}" is not declared by ${pathwayIds.join(", ")} and has no agreed rename to a declared label`,
  );
}

/** The v2 document, as plain data. Pure; does no I/O. */
export function upgradeTimeseries(
  doc: Json,
  geographyById: ReadonlyMap<string, Geography | undefined>,
  renames: Record<string, Record<string, string>> = RENAMES,
): { doc: Json; renamed: Map<string, string> } {
  if (doc.$schema !== V1_ID) throw new Error(`not a v1 timeseries file`);
  const pathwayIds = doc.pathwayId as string[];
  // v1 allowed both; v2 rejects them, and an empty list would make every
  // geography look declared by "all" of no pathways.
  if (pathwayIds.length === 0) throw new Error(`pathwayId is empty`);
  if (new Set(pathwayIds).size !== pathwayIds.length)
    throw new Error(`pathwayId lists an id twice: ${pathwayIds.join(", ")}`);
  const missing = pathwayIds.filter((id) => !geographyById.has(id));
  if (missing.length) throw new Error(`no metadata for ${missing.join(", ")}`);

  const renamed = new Map<string, string>();
  const data = (doc.data as Row[]).map((row) => {
    if (row.sector !== "power")
      throw new Error(`sector "${row.sector}": no segment known to assign`);
    const geography = relabel(
      row.geography,
      pathwayIds,
      geographyById,
      renames,
    );
    if (geography !== row.geography) renamed.set(row.geography, geography);
    // Same key order the text edit produces: sectorSegment right after sector.
    const out: Json = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = k === "geography" ? geography : v;
      if (k === "sector") out.sectorSegment = [POWER_SEGMENT];
    }
    return out;
  });
  return { doc: { ...doc, $schema: V2_ID, data }, renamed };
}

/**
 * Apply the upgrade to the file's text line by line, so formatting and every
 * untouched line survive byte for byte.
 */
export function editText(text: string, renamed: Map<string, string>): string {
  return text
    .split("\n")
    .flatMap((line) => {
      if (line.includes(`"$schema": "${V1_ID}"`))
        return [line.replace(V1_ID, V2_ID)];
      const geo = /^(\s*)"geography": "(.*)",$/.exec(line);
      if (geo && renamed.has(geo[2]))
        return [
          `${geo[1]}"geography": ${JSON.stringify(renamed.get(geo[2]))},`,
        ];
      const sector = /^(\s*)"sector": "power",$/.exec(line);
      if (sector)
        return [line, `${sector[1]}"sectorSegment": ["${POWER_SEGMENT}"],`];
      return [line];
    })
    .join("\n");
}

async function jsonFilesUnder(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const d of await fs.readdir(dir, { withFileTypes: true })) {
    const full = join(dir, d.name);
    if (d.isDirectory()) out.push(...(await jsonFilesUnder(full)));
    else if (d.name.endsWith(".json")) out.push(full);
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const files = await jsonFilesUnder("src/data");
  const docs = await Promise.all(
    files.map(async (file) => {
      const text = await fs.readFile(file, "utf8");
      return { file, text, doc: JSON.parse(text) as Json };
    }),
  );

  const geographyById = new Map<string, Geography | undefined>(
    docs
      .filter(({ doc }) => METADATA_IDS.has(String(doc.$schema)))
      .map(({ doc }) => [String(doc.id), doc.geography as Geography]),
  );

  let migrated = 0;
  for (const { file, text, doc } of docs) {
    if (doc.$schema !== V1_ID) continue;
    const { doc: next, renamed } = upgradeTimeseries(doc, geographyById);
    const edited = editText(text, renamed);
    if (JSON.stringify(JSON.parse(edited)) !== JSON.stringify(next))
      throw new Error(`${file}: line edit does not reproduce the v2 document`);
    const renames = [...renamed].map(([a, b]) => `"${a}" -> "${b}"`);
    console.info(
      `${dryRun ? "would migrate" : "migrated"} ${file}` +
        (renames.length ? ` (${renames.join(", ")})` : ""),
    );
    if (!dryRun) await fs.writeFile(file, edited);
    migrated++;
  }
  console.info(`${migrated} file(s). Run \`npm run schema:check\` next.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e: unknown) => {
    console.error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  });
}
