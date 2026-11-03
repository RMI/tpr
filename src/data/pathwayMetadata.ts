import { PathwayMetadataType } from "../types";
import { FileEntry } from "../utils/validateData";
import { assembleData, decideIncludeInvalid } from "../utils/loadData";
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

// 2) Validate against the v2 metadata schema. assembleData only looks at
//    entries whose `$schema` is exactly the v2 `$id` (see validateDataCollect):
//    timeseries files are meant to be skipped that way, but so is a metadata
//    file with a retired v1 or mistyped `$schema` -- it is neither valid nor
//    invalid, so `includeInvalid` does not bring it back, and nothing here logs
//    it. `npm run schema:check` is what reports such a file (see
//    src/data/README.md, "Which schema a file follows").
export const pathwayMetadata: PathwayMetadataType[] = assembleData(
  entries,
  pathwayMetadataSchema,
  commonSchemas,
  {
    includeInvalid: decideIncludeInvalid(),
  },
);
