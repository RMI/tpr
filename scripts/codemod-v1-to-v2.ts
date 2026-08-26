/**
 * One-shot codemod: pathwayMetadata v1 -> v2 (#858).
 *
 * Run over an explicit list of files, in place:
 *
 *   npx ts-node --esm scripts/codemod-v1-to-v2.ts src/data/iea/IEA-NZE-2024.json ...
 *   npx ts-node --esm scripts/codemod-v1-to-v2.ts --dry-run src/data/iea
 *
 * A directory argument expands to the metadata files under it. Files already on v2
 * are skipped, so re-running is safe and the remaining 49 files are a re-run
 * rather than a rewrite.
 *
 * This is a development tool, not a runtime path: the app does not convert v1
 * documents on load. Files that still carry the v1 $schema simply are not loaded
 * once the loader points at v2.
 *
 * Two v1 prose fields are retired without replacement (confirmed with the data
 * owner on PR #898): `pathwayOverview`, because it restates the description
 * almost verbatim; and the '#### Application to Transition Assessment' section,
 * because the new UI does not display it. Neither has a v2 home, so the section
 * text is printed in the run report alongside the Core Drivers prose rather than
 * being dropped silently.
 *
 * It also reports, without touching, technologies attached to a sector that does
 * not list them (#461). Auto-fixing would mean either deleting a technology
 * someone deliberately recorded or inventing a sector's taxonomy -- both worse
 * than a line in the report, and `npm run schema:check` refuses the file anyway.
 *
 * What it does NOT do: populate `coreDrivers`. The v1 "#### Core Drivers" prose
 * cannot be mapped onto the 7 named fields mechanically -- several paragraphs
 * exceed the 500-char cap, the italic labels do not correspond 1:1 to the field
 * names, and each section has unlabeled paragraphs with no destination. Per #858
 * the fields are scaffolded null for hand-authoring; the prose is printed in the
 * report so it is not lost track of.
 */
import { promises as fs } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PathwayMetadataV1 } from "../src/types/pathwayMetadata.v1.d.ts";
import type { PathwayMetadataV2 } from "../src/types/pathwayMetadata.v2.d.ts";
import { technologyBelongsToSector } from "../src/utils/timeseriesTaxonomy.ts";

const V1_ID = "http://pathways.rmi.org/schema/pathwayMetadata.v1.json";
const V2_ID = "http://pathways.rmi.org/schema/pathwayMetadata.v2.json";

/** Widest sentinels, mirroring src/utils/validateScopes.ts. */
const CROSS_SECTOR = "cross-sector";
const GLOBAL_SCOPE = "Global";

/**
 * The three sections every v1 `expertOverview` is built from. Verified against all
 * 56 files: 55 have all three, and ACE-CNS-2024 is missing "Core Drivers" only
 * because its heading lost its `####` markers (see splitExpertOverview).
 */
export const PATHWAY_DESCRIPTION = "Pathway Description";
export const CORE_DRIVERS = "Core Drivers";
export const TRANSITION_ASSESSMENT = "Application to Transition Assessment";
export const SECTION_TITLES = [
  PATHWAY_DESCRIPTION,
  CORE_DRIVERS,
  TRANSITION_ASSESSMENT,
] as const;

const CORE_DRIVER_FIELDS = [
  "policies",
  "emissionsTargets",
  "technologyCosts",
  "investmentChange",
  "macroeconomicDrivers",
  "behavioralShifts",
  "otherDrivers",
] as const;

/**
 * Split a v1 `expertOverview` into its named sections.
 *
 * Headings are ATX (`#### Core Drivers`), but a bare line whose entire content is
 * a known section title also counts. That tolerance exists for exactly one file:
 * ACE-CNS-2024.json lost the `####` on its "Core Drivers" heading, which would
 * otherwise fold 1.5 KB of core-drivers prose into pathwayDescription and push it
 * past the 2500-char limit. Treating the bare title as a heading is safe because
 * the strings are long and specific enough not to occur as body text.
 */
export function splitExpertOverview(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = text.split("\n");
  let current: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current !== null) sections.set(current, buffer.join("\n").trim());
    buffer = [];
  };

  for (const line of lines) {
    const stripped = line.trim();
    const atx = /^#{1,6}\s*(.+?)\s*$/.exec(stripped);
    const heading = atx ? atx[1] : stripped;
    const known = SECTION_TITLES.find((t) => t === heading);
    if (known && (atx || stripped === known)) {
      flush();
      current = known;
      continue;
    }
    if (current !== null) buffer.push(line);
  }
  flush();
  return sections;
}

/**
 * The widest scope an entry on this pathway can carry, per #858: `cross-sector`
 * for a multi-sector pathway else its lone sector, and `Global` else the
 * pathway's single declared region or country.
 *
 * Throws rather than guessing when a pathway declares several regions or several
 * standalone countries without `global`, since which of them is "widest" is an
 * authoring decision (`cross-region` exists for that case). No file in the corpus
 * hits this today -- all 56 resolve.
 */
export function widestScope(doc: PathwayMetadataV1): {
  sector: string;
  geography: string;
} {
  const names = [...new Set((doc.sectors ?? []).map((s) => s.name))];
  if (names.length === 0) throw new Error("pathway declares no sectors");
  const sector = names.length > 1 ? CROSS_SECTOR : names[0];

  const geo = doc.geography ?? {};
  const regions = Object.keys(geo.regions ?? {});
  const countries = geo.country ?? [];

  let geography: string;
  if (geo.global === true) {
    geography = GLOBAL_SCOPE;
  } else if (regions.length === 1) {
    geography = regions[0];
  } else if (regions.length > 1) {
    throw new Error(
      `${regions.length} regions and no "global" flag: widest geography is ambiguous ` +
        `(consider "cross-region"): ${regions.join(", ")}`,
    );
  } else if (countries.length === 1) {
    geography = countries[0];
  } else if (countries.length > 1) {
    throw new Error(
      `${countries.length} countries and no "global" flag or region: widest geography is ambiguous`,
    );
  } else {
    throw new Error("pathway declares no geography");
  }

  return { sector, geography };
}

/** Wrap one v1 value as a single scoped entry at the given scope. */
function scoped<T>(sector: string, geography: string, value: T) {
  return [{ sector, geography, value }];
}

export interface UpgradeResult {
  doc: PathwayMetadataV2;
  /** Prose with no destination in v2 -- reported so it is not lost track of. */
  coreDriversProse: string;
  /** Ditto: the new UI does not show this, so v2 has no field for it. */
  transitionAssessmentProse: string;
  scope: { sector: string; geography: string };
  /** Chars of `pathwayOverview` discarded, for the run report. */
  droppedPathwayOverview: number;
  /**
   * `"Sector: Technology"` for each technology its sector does not list (#461).
   * Carried straight over from v1, so this reports pre-existing data rather than
   * anything the codemod introduced.
   */
  unscopedTechnologies: string[];
}

/** Transform one v1 document into its v2 equivalent. Pure; does no I/O. */
export function upgradeV1ToV2(doc: PathwayMetadataV1): UpgradeResult {
  const scope = widestScope(doc);
  const { sector, geography } = scope;
  const kf = doc.keyFeatures;

  const sections = splitExpertOverview(doc.expertOverview ?? "");
  const description = sections.get(PATHWAY_DESCRIPTION) ?? "";
  const assessment = sections.get(TRANSITION_ASSESSMENT) ?? "";
  const coreDriversProse = sections.get(CORE_DRIVERS) ?? "";

  // `pathwayOverview` is DISCARDED, not folded into pathwayDescription.
  //
  // #858 says to move it in, and an earlier version of this script did. Reading
  // the output showed why that is wrong: the two texts restate each other almost
  // verbatim, so the merged field opens by saying the same thing twice. IEA-STEPS
  // for instance had "STEPS provides a sense of the energy sector's direction of
  // travel today, based on the latest market data, technology costs and in-depth
  // analysis of the prevailing policy settings..." immediately followed by "STEPS
  // projects the energy sector's current direction of travel, based on the latest
  // market data, technology costs and in-depth analysis of the stated policies...".
  //
  // Confirmed with the data owner (Jacob, PR #898): the field was already out of
  // use and should be removed without replacement. It has no readers in the app,
  // so nothing observable is lost.
  const droppedPathwayOverview = doc.pathwayOverview?.trim().length ?? 0;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    switch (key) {
      case "$schema":
        out.$schema = V2_ID;
        break;
      case "pathwayOverview":
        // Superseded; emitted below in expertOverview's position.
        break;
      case "expertOverview":
        out.pathwayDescription = description.length > 0 ? description : null;
        break;
      case "keyFeatures":
        out.keyFeatures = {
          emissionsTrajectory: scoped(
            sector,
            geography,
            kf.emissionsTrajectory,
          ),
          energyEfficiency: scoped(sector, geography, kf.energyEfficiency),
          energyDemand: scoped(sector, geography, kf.energyDemand),
          electrification: scoped(sector, geography, kf.electrification),
          policyTypes: scoped(sector, geography, kf.policyTypes),
          technologyCostTrend: scoped(
            sector,
            geography,
            kf.technologyCostTrend,
          ),
          emissionsScope: scoped(sector, geography, kf.emissionsScope),
          policyAmbition: scoped(sector, geography, kf.policyAmbition),
          technologyCostsDetail: scoped(
            sector,
            geography,
            kf.technologyCostsDetail,
          ),
          newTechnologiesIncluded: scoped(
            sector,
            geography,
            kf.newTechnologiesIncluded,
          ),
          investmentNeeds: scoped(sector, geography, kf.investmentNeeds),
        };
        // Scaffolded for hand-authoring; see the file header.
        out.coreDrivers = Object.fromEntries(
          CORE_DRIVER_FIELDS.map((f) => [f, null]),
        );
        out.dependencies = [];
        break;
      default:
        out[key] = value;
    }
  }

  const unscopedTechnologies = (doc.sectors ?? []).flatMap((s) =>
    (s.technologies ?? [])
      .filter((t) => technologyBelongsToSector(t, s.name) !== "yes")
      .map((t) => `${s.name}: ${t}`),
  );

  return {
    doc: out as unknown as PathwayMetadataV2,
    unscopedTechnologies,
    coreDriversProse,
    transitionAssessmentProse: assessment,
    scope,
    droppedPathwayOverview,
  };
}

async function metadataFilesUnder(path: string): Promise<string[]> {
  const stat = await fs.stat(path);
  if (!stat.isDirectory()) return [path];
  const dirents = await fs.readdir(path, { withFileTypes: true });
  const found: string[] = [];
  for (const d of dirents) {
    const full = join(path, d.name);
    if (d.isDirectory()) found.push(...(await metadataFilesUnder(full)));
    else if (d.isFile() && extname(d.name) === ".json") found.push(full);
  }
  return found.sort();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const paths = args.filter((a) => !a.startsWith("--"));

  if (paths.length === 0) {
    console.error(
      "usage: codemod-v1-to-v2.ts [--dry-run] <file-or-dir> [...]\n" +
        "Refusing to run with no explicit target.",
    );
    process.exit(1);
  }

  const files = (await Promise.all(paths.map(metadataFilesUnder))).flat();
  const report: string[] = [];
  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as { $schema?: string };
    if (parsed.$schema === V2_ID) {
      skipped++;
      continue;
    }
    if (parsed.$schema !== V1_ID) {
      // Timeseries files and anything else non-metadata.
      skipped++;
      continue;
    }

    const doc = parsed as unknown as PathwayMetadataV1;
    let result: UpgradeResult;
    try {
      result = upgradeV1ToV2(doc);
    } catch (e) {
      console.error(`✖ ${file}: ${String(e instanceof Error ? e.message : e)}`);
      process.exitCode = 1;
      continue;
    }

    const { scope, coreDriversProse, droppedPathwayOverview } = result;
    const descLength = result.doc.pathwayDescription?.length ?? 0;
    console.info(
      `✔ ${file}\n` +
        `    scope: (${scope.sector}, ${scope.geography})` +
        `  pathwayDescription: ${descLength} chars` +
        (droppedPathwayOverview > 0
          ? `  [dropped ${droppedPathwayOverview}-char pathwayOverview]`
          : ""),
    );
    if (result.unscopedTechnologies.length > 0) {
      // stderr, because this needs a human before the file will pass
      // schema:check -- but not a non-zero exit, since the migration itself
      // succeeded and the offending data predates it.
      console.error(
        `    #461: technologies outside their sector's list, left as-is: ` +
          result.unscopedTechnologies.join("; "),
      );
    }

    const orphaned: string[] = [];
    if (result.coreDriversProse.length > 0) {
      orphaned.push(`### ${CORE_DRIVERS}\n\n${result.coreDriversProse}`);
    } else {
      console.info(`    note: no "${CORE_DRIVERS}" section found`);
    }
    if (result.transitionAssessmentProse.length > 0) {
      orphaned.push(
        `### ${TRANSITION_ASSESSMENT}\n\n${result.transitionAssessmentProse}`,
      );
    }
    if (orphaned.length > 0) {
      report.push(`## ${file}\n\n${orphaned.join("\n\n")}\n`);
    }

    if (!dryRun) {
      await fs.writeFile(file, `${JSON.stringify(result.doc, null, 2)}\n`);
    }
    migrated++;
  }

  console.info(
    `\n${dryRun ? "Would migrate" : "Migrated"} ${migrated} file(s); skipped ${skipped}.`,
  );

  if (report.length > 0) {
    console.info(
      "\n--- v1 prose with no v2 destination ---\n" +
        `"${CORE_DRIVERS}" becomes the structured coreDrivers object, scaffolded null here;\n` +
        `"${TRANSITION_ASSESSMENT}" is retired because the new UI does not display it.\n` +
        "Both are reproduced below so the text is not lost.\n",
    );
    console.info(report.join("\n"));
  }
  if (!dryRun) {
    console.info("Run `npm run schema:check` and `npx prettier --write` next.");
  }
}

// Only run when invoked directly, so the exported helpers stay importable by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e: unknown) => {
    console.error(String(e instanceof Error ? e.stack : e));
    process.exit(1);
  });
}
