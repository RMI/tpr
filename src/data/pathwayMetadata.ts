import { PathwayMetadataType } from "../types";
import { FileEntry } from "../utils/validateData";
import {
  assembleData,
  decideIncludeInvalid,
  isViteDev,
} from "../utils/loadData";
import pathwayMetadataSchema from "../schema/pathwayMetadata.v2.json" with { type: "json" };
import pathwayMetadataV1Schema from "../schema/pathwayMetadata.v1.json" with { type: "json" };
import { commonSchemas } from "../schema/common";

// 1) Grab every JSON file in this folder **and subfolders**
//    `eager:true` = load at build time (no async), `import:'default'` = get the parsed JSON
const modules = import.meta.glob("./**/*.json", {
  eager: true,
  import: "default",
});

const entries: FileEntry[] = Object.entries(modules)
  .map(([path, data]) => ({
    // Use a stable, relative file path to disambiguate duplicates across subdirs
    // Example: "nested/pathway_metadata_1.json"
    name: path.replace(/^\.\/?/, ""),
    data, // file contents
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Count metadata files still carrying the v1 `$schema` (#858).
 *
 * `validateDataCollect` routes each document by its own `$schema` and drops
 * anything that does not match the schema it was handed — as neither valid nor
 * invalid. That is what lets v1 and v2 documents share src/data during the
 * migration, but it also means an un-migrated file vanishes from the app with no
 * error at all. Counting them here turns "pathways are missing" from a mystery
 * into a number. Timeseries files are routed away by the same mechanism and are
 * not counted, since their absence from this list is by design.
 *
 * Dev-server only. The message names an internal script and issue number, which
 * is useful to us and noise to anyone reading a production console — and this
 * module otherwise does no logging at all (assembleData warns only when a caller
 * opts in via `opts.warn`, which this one does not).
 */
const V1_METADATA_ID = String(
  (pathwayMetadataV1Schema as { $id?: string }).$id,
);

const unmigrated = entries.filter(
  (e) =>
    typeof e.data === "object" &&
    e.data !== null &&
    (e.data as { $schema?: unknown }).$schema === V1_METADATA_ID,
).length;

if (unmigrated > 0 && isViteDev()) {
  console.warn(
    `[pathwayMetadata] ${unmigrated} metadata file(s) still use schema v1 and are ` +
      `not loaded. Migrate them with scripts/codemod-v1-to-v2.ts (#858).`,
  );
}

export const pathwayMetadata: PathwayMetadataType[] = assembleData(
  entries,
  pathwayMetadataSchema,
  commonSchemas,
  {
    includeInvalid: decideIncludeInvalid(),
  },
);
