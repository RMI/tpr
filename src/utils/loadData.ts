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

/**
 * Read a Vite-like env if one is present — the browser/preview build, or a test
 * shim. Access to import.meta must not use `typeof import` (keyword), which
 * esbuild rejects, hence the try/catch.
 */
function readViteEnv(): ViteEnv {
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
  return viteEnv;
}

/**
 * True only when we are confidently running the Vite dev server.
 *
 * Deliberately conservative: Vite replaces `import.meta.env.DEV` with `false` in
 * production builds, and in Node/vitest there is no `import.meta.env` at all, so
 * both of those read as "not dev". That is the behaviour wanted for gating
 * developer-facing diagnostics — silent in production, and silent under test
 * (where src/test/failOnReactWarnings.ts spies on console.warn).
 *
 * Note this cannot be derived from `decideIncludeInvalid()`: that answers a
 * different question (whether to keep schema-invalid pathways) and returns false
 * in dev unless VITE_INCLUDE_INVALID is set.
 */
export function isViteDev(): boolean {
  return !!readViteEnv()?.DEV;
}

// Decider reads both Vite and Node envs so it works in browser & Node contexts.
export function decideIncludeInvalid(): boolean {
  const viteEnv = readViteEnv();

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
