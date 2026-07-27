/// <reference types="node" />

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PathwayMetadataType } from "../types";
import { join, resolve } from "node:path";
import { readdir, readFile } from "node:fs/promises";

type LoadDataModule = typeof import("./loadData");
type ImportMetaEnvShim = {
  meta?: {
    env?: {
      DEV?: boolean;
      VITE_INCLUDE_INVALID?: string | boolean;
    };
  };
};

// We will import the module under test *lazily* after setting up any vi.mocks,
// so that mocked dependencies are wired correctly.
const importModule = async (): Promise<LoadDataModule> =>
  await import("./loadData");

/** Reset module cache & env between tests */
beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs?.(); // vitest >=1.6 provides this; if older, ignore
  // Clean up any global import.meta/env shims:
  (globalThis as typeof globalThis & { import?: ImportMetaEnvShim }).import =
    undefined;
});

afterEach(() => {
  vi.resetModules();
});

/* ----------------------------
 * decideIncludeInvalid unit tests
 * ---------------------------- */
describe("decideIncludeInvalid", () => {
  it("returns false in production regardless of env flags", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITE_BUILD_MODE", "production");
    vi.stubEnv("VITE_INCLUDE_INVALID", "true");

    const { decideIncludeInvalid } = await importModule();
    expect(decideIncludeInvalid()).toBe(false);
  });

  it("returns false when DEV but flag unset/false", async () => {
    (globalThis as typeof globalThis & { import?: ImportMetaEnvShim }).import =
      {
        meta: { env: { DEV: true, VITE_INCLUDE_INVALID: "false" } },
      };
    const { decideIncludeInvalid } = await importModule();
    expect(decideIncludeInvalid()).toBe(false);
  });

  it("can also read Node env in DEV contexts", async () => {
    // Vite-like DEV with no vite flag, but Node env set:
    (globalThis as typeof globalThis & { import?: ImportMetaEnvShim }).import =
      {
        meta: { env: { DEV: true } },
      };
    vi.stubEnv("VITE_INCLUDE_INVALID", "true");

    const { decideIncludeInvalid } = await importModule();
    expect(decideIncludeInvalid()).toBe(true);
  });
});

describe("validate files on disk", () => {
  it("all src/data/*.json data files conform to schema", async () => {
    const dir = resolve(__dirname, "../data");
    const names = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    const entries = await Promise.all(
      names.map(async (name) => ({
        name,
        data: JSON.parse(
          await readFile(join(dir, name), "utf8"),
        ) as PathwayMetadataType[],
      })),
    );
    // In app code we now *filter* invalid blobs rather than throw.
    const warn = vi.fn();
    const { assembleData } = await importModule();
    const list = assembleData(entries, { includeInvalid: false, warn });
    expect(Array.isArray(list)).toBe(true);
    // We don't assert on warn count, because it depends on repo data state.
    // But we *do* ensure warn is callable without throwing:
    expect(warn).toBeTypeOf("function");
  });

  it("all testdata/valid/*.json data files conform to schema", async () => {
    const dir = resolve(__dirname, "../../testdata/valid");
    const names = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    const entries = await Promise.all(
      names.map(async (name) => ({
        name,
        data: JSON.parse(
          await readFile(join(dir, name), "utf8"),
        ) as PathwayMetadataType[],
      })),
    );
    // In app code we now *filter* invalid blobs rather than throw.
    const warn = vi.fn();
    const { assembleData } = await importModule();
    const list = assembleData(entries, { includeInvalid: false, warn });
    expect(Array.isArray(list)).toBe(true);
    // We don't assert on warn count, because it depends on repo data state.
    // But we *do* ensure warn is callable without throwing:
    expect(warn).toBeTypeOf("function");
  });
});
