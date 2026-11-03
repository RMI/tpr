import { PathwayMetadataType } from "../types";
import { FileEntry, unroutableEntries } from "../utils/validateData";
import {
  assembleData,
  decideIncludeInvalid,
  isViteDev,
} from "../utils/loadData";
import { PATHWAY_TIMESERIES_V2_ID } from "../utils/validateTimeseries";
import pathwayMetadataSchema from "../schema/pathwayMetadata.v2.json" with { type: "json" };
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

// 2) Name any file that no document schema accepts. assembleData below only
//    looks at entries whose `$schema` is exactly the v2 metadata `$id` (see
//    validateDataCollect): timeseries files are meant to be skipped that way,
//    but so is a file with a retired v1, mistyped or missing `$schema` -- it is
//    neither valid nor invalid, so `includeInvalid` does not bring it back.
//    `npm run schema:check` fails on such a file in every mode; this makes the
//    dev server say why a pathway is missing too. Dev only, like the rest of
//    isViteDev's diagnostics: silent in production and under test.
const DOCUMENT_SCHEMA_IDS: ReadonlySet<string> = new Set([
  String(pathwayMetadataSchema.$id),
  PATHWAY_TIMESERIES_V2_ID,
]);

const unroutable = unroutableEntries(entries, DOCUMENT_SCHEMA_IDS);
if (unroutable.length > 0 && isViteDev()) {
  console.warn(
    `[pathwayMetadata] ${unroutable.length} data file(s) have a $schema no ` +
      `document schema accepts, so the app does not load them: ` +
      `${unroutable.join(", ")}. Run \`npm run schema:check\` for details.`,
  );
}

// 3) Validate against the v2 metadata schema.
export const pathwayMetadata: PathwayMetadataType[] = assembleData(
  entries,
  pathwayMetadataSchema,
  commonSchemas,
  {
    includeInvalid: decideIncludeInvalid(),
  },
);
