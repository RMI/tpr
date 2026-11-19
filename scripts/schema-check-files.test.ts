import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run, shouldFail } from "./schema-check-files.ts";
import v2Minimal from "../testdata/valid/pathwayMetadata_v2_minimal.json" with { type: "json" };

describe("shouldFail", () => {
  it("fails on schema errors only in strict mode (#449)", () => {
    expect(shouldFail({ strict: true, invalid: 1, unroutable: 0 })).toBe(true);
    expect(shouldFail({ strict: false, invalid: 1, unroutable: 0 })).toBe(
      false,
    );
  });

  it("fails on a file no schema accepts in every mode", () => {
    expect(shouldFail({ strict: false, invalid: 1, unroutable: 1 })).toBe(true);
    expect(shouldFail({ strict: true, invalid: 1, unroutable: 1 })).toBe(true);
  });

  it("passes a clean run", () => {
    expect(shouldFail({ strict: true, invalid: 0, unroutable: 0 })).toBe(false);
  });
});

describe("run", () => {
  async function inTempDir(
    files: Record<string, unknown>,
  ): Promise<Awaited<ReturnType<typeof run>>> {
    const dir = await mkdtemp(join(tmpdir(), "schema-check-"));
    try {
      for (const [name, data] of Object.entries(files))
        await writeFile(join(dir, name), JSON.stringify(data));
      return await run(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("counts a retired v1 file as unroutable", async () => {
    const result = await inTempDir({
      "v1.json": {
        ...v2Minimal,
        $schema: "http://pathways.rmi.org/schema/pathwayMetadata.v1.json",
      },
    });
    expect(result.invalid).toHaveLength(1);
    expect(result.unroutableCount).toBe(1);
  });

  it("counts a file naming a shared fragment as unroutable", async () => {
    const result = await inTempDir({
      "fragment.json": {
        ...v2Minimal,
        $schema: "http://pathways.rmi.org/schema/common/label.v1.json",
      },
    });
    expect(result.invalid).toHaveLength(1);
    expect(result.unroutableCount).toBe(1);
  });

  it("does not count a schema-invalid v2 file as unroutable", async () => {
    const result = await inTempDir({
      "bad.json": { ...v2Minimal, pathwayType: "Nonsense" },
    });
    expect(result.invalid).toHaveLength(1);
    expect(result.unroutableCount).toBe(0);
  });
});
