// scripts/schema-check-files.ts
import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { FileEntry } from "../src/utils/validateData.ts";
import { validateFilesBySchema } from "../src/utils/validateData.ts";
import { decideIncludeInvalid } from "../src/utils/loadData.ts";
import pathwayMetadata from "../src/schema/pathwayMetadata.v1.json" with { type: "json" };
import pathwayMetadataV2 from "../src/schema/pathwayMetadata.v2.json" with { type: "json" };
import pathwayTimeseries from "../src/schema/pathwayTimeseries.v1.json" with { type: "json" };
import { commonSchemas } from "../src/schema/common/index.ts";
import type { PathwayMetadataV2 } from "../src/types/pathwayMetadata.v2.d.ts";
import {
  PATHWAY_METADATA_V2_ID,
  validateScopedEntries,
} from "../src/utils/validateScopes.ts";

async function run(dir: string) {
  async function getJsonFilesRecursive(base: string): Promise<string[]> {
    const dirents = await fs.readdir(base, { withFileTypes: true });
    const files: string[] = [];
    for (const d of dirents) {
      const full = join(base, d.name);
      if (d.isDirectory()) {
        files.push(...(await getJsonFilesRecursive(full)));
      } else if (d.isFile() && d.name.endsWith(".json")) {
        files.push(full);
      }
    }
    return files;
  }

  const jsonFiles = await getJsonFilesRecursive(dir);
  console.log(`Checking ${jsonFiles.length} JSON file(s) under ${dir}`);

  const entries: FileEntry[] = [];
  for (const file of jsonFiles) {
    const raw = await fs.readFile(file, "utf8");
    entries.push({ name: file, data: JSON.parse(raw) });
  }

  const { valid, invalid } = validateFilesBySchema(entries, [
    pathwayMetadata,
    pathwayMetadataV2,
    pathwayTimeseries,
    ...commonSchemas,
  ]);

  // Second pass over the AJV-valid v2 documents for the cross-field scope
  // constraint draft-07 cannot express — see src/utils/validateScopes.ts. A
  // document that fails here is reported exactly like a schema failure, so a
  // mistyped region label breaks the build instead of silently matching nothing.
  const scopeProblems = valid
    .filter((r) => r.schemaId === PATHWAY_METADATA_V2_ID)
    .map((r) => ({
      name: r.name,
      errors: validateScopedEntries(r.data as PathwayMetadataV2),
    }))
    .filter((p) => p.errors.length > 0);

  const badNames = new Set(scopeProblems.map((p) => p.name));
  return {
    dir,
    validCount: valid.filter((r) => !badNames.has(r.name)).length,
    invalid: [...invalid, ...scopeProblems],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dirs = args.length ? args : ["src/data"]; // default if none provided
  const strict = !decideIncludeInvalid();
  const inCI =
    String(process.env.GITHUB_ACTIONS || "").toLowerCase() === "true";
  const level = String(
    process.env.VALIDATION_ANNOTATION_LEVEL || "warning",
  ).toLowerCase(); // "warning" | "notice"
  const annotate = level === "notice" ? "notice" : "warning";

  let totalValid = 0;
  let totalInvalid = 0;
  let filesWithIssues = 0;

  const results = await Promise.all(dirs.map(run));

  // Emit human summary + GH annotations (without failing yet)
  for (const r of results) {
    totalValid += r.validCount;
    totalInvalid += r.invalid.length;

    if (r.invalid.length === 0) {
      console.log(`✔ ${r.dir}: OK (${r.validCount} items)`);
      continue;
    }

    console.error(
      `✖ ${r.dir}: ${r.invalid.length} schema-invalid file(s) found:`,
    );
    filesWithIssues += r.invalid.length;

    for (const p of r.invalid) {
      // Emit up to N errors per file as GH annotations.
      // `p.name` already carries the directory — getJsonFilesRecursive builds it
      // with join(base, d.name) — so re-prepending r.dir produced paths like
      // "src/data/src/data/foo.json" and the annotations pointed nowhere. Latent
      // until now because it only shows when a file actually fails.
      const file = p.name;
      const errs = p.errors.slice(0, 50);
      for (const e of errs) {
        console.log(`::${annotate} file=${file}::${e}`);
      }
      if (p.errors.length > errs.length) {
        console.log(
          `::notice file=${file}::…and ${
            p.errors.length - errs.length
          } more error(s)`,
        );
      }
    }
  }

  // Final summary
  console.log(
    `\nSummary: ${totalValid} valid item(s), ${totalInvalid} invalid file(s) across ${dirs.length} director${
      dirs.length === 1 ? "y" : "ies"
    }.`,
  );

  // Write a small Markdown summary for the job page
  if (inCI && process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      `### Schema validation summary`,
      ``,
      `| Metric | Value |`,
      `| :-- | --: |`,
      `| Directories checked | ${dirs.length} |`,
      `| Valid items | ${totalValid} |`,
      `| Files with issues | ${filesWithIssues} |`,
      `| Annotation level | ${annotate.toUpperCase()} |`,
      ``,
      filesWithIssues > 0
        ? `_See per-file annotations above in the Logs tab._`
        : `All good ✅`,
      ``,
    ].join("\n");
    await fs.appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `${summary}\n`,
      "utf8",
    );
  }

  // Optional failure gate
  if (strict && totalInvalid > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
