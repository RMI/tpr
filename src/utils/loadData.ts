import { validateDataCollect } from "./validateData.ts";
import type { FileEntry, ValidationOutcome } from "./validateData.ts";
import type { SchemaObject } from "ajv";

declare const process:
  | {
      env?: {
        NODE_ENV?: string;
        VITE_BUILD_MODE?: string;
        VITE_INCLUDE_INVALID?: string;
      };
    }
  | undefined;

type ImportMetaEnvShim = {
  meta?: {
    env?: {
      DEV?: boolean;
      VITE_INCLUDE_INVALID?: string | boolean;
    };
  };
};

type ViteEnv =
  | {
      DEV?: boolean;
      VITE_INCLUDE_INVALID?: string | boolean;
    }
  | undefined;

// Decider reads both Vite and Node envs so it works in browser & Node contexts.
export function decideIncludeInvalid(): boolean {
  // Try to read a Vite-like env if present (works in browser/preview and in tests with a shim)
  // Access to import.meta must not use `typeof import` (keyword) — esbuild will error.
  let viteEnv: ViteEnv = undefined;

  try {
    // @ts-expect-error: import.meta is not defined in Node tests
    viteEnv = import.meta?.env;
  } catch {
    // Ignore runtime access failures and fall back to any injected shim below.
  }
  if (viteEnv === undefined) {
    // Fallback to a test shim placed at globalThis.import.meta.env
    viteEnv = (globalThis as typeof globalThis & { import?: ImportMetaEnvShim })
      .import?.meta?.env;
  }

  const viteDev = !!viteEnv?.DEV;
  const viteFlag =
    viteEnv?.VITE_INCLUDE_INVALID !== undefined &&
    String(viteEnv.VITE_INCLUDE_INVALID).toLowerCase() === "true";

  const nodeEnv = typeof process !== "undefined" ? process.env : undefined;
  const nodeFlag = nodeEnv?.VITE_INCLUDE_INVALID?.toLowerCase() === "true";

  // In prod builds we never include invalid pathways.
  const nodeProd =
    nodeEnv?.NODE_ENV === "production" ||
    nodeEnv?.VITE_BUILD_MODE === "production";
  const nodeDev = !nodeProd;

  if (nodeProd) return false;
  return viteFlag || (viteDev && nodeFlag) || (!viteEnv && nodeDev && nodeFlag);
}

/**
 * Core assembly: takes already-parsed entries, validates them, and returns the
 * list. When includeInvalid=true, invalid blobs are appended.
 */
export function assembleData<T>(
  entries: FileEntry[],
  schema: object | SchemaObject,
  referencedSchemas: Array<object | SchemaObject> = [],
  opts?: {
    includeInvalid?: boolean;
    warn?: (msg: string) => void;
    /** Optional structured hook for callers that want to annotate files, etc. */
    onInvalid?: (
      problems: Array<{ name: string; errors: string[]; data?: T[] }>,
    ) => void;
  },
): T[] {
  const includeInvalid = !!opts?.includeInvalid;
  const onInvalid = opts?.onInvalid;

  const { valid: valid, invalid: invalid }: ValidationOutcome =
    validateDataCollect(entries, schema, referencedSchemas);

  if (invalid.length && opts?.warn) {
    const totalInvalid = invalid.length;
    opts.warn(
      `[assembleData] Warning: ${totalInvalid} invalid data files${
        totalInvalid !== 1 ? "s" : ""
      } found in ${invalid.length} file${invalid.length !== 1 ? "s" : ""}. ${
        includeInvalid
          ? "These will be included in the output."
          : "These will be excluded from the output."
      }`,
    );
    if (onInvalid) onInvalid(invalid);
  }

  if (!includeInvalid) return valid.map((v) => v.data).flat();
  return [...valid, ...invalid].map((v) => v.data).flat();
}
