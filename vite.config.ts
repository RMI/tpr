import { defineConfig, Plugin, version as viteVersion } from "vite";
import type { ViteDevServer } from "vite";
import type { PluginContext } from "rollup";
import react from "@vitejs/plugin-react";
import { simpleGit } from "simple-git";
import os from "os";
import { FileEntry } from "./src/utils/validateData";
import { assembleData, decideIncludeInvalid } from "./src/utils/loadData";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import pkg from "./package.json";
import pathwayMetadata from "./src/schema/pathwayMetadata.v1.json" with { type: "json" };
import { commonSchemas } from "./src/schema/common";

// Safe wrapper for OS functions with proper typing
const getOsInfo = (): {
  hostname: string;
  platform: string;
  release: string;
  arch: string;
} => {
  const safeCall = (fn: () => string, defaultValue: string): string => {
    try {
      return fn();
    } catch {
      return defaultValue;
    }
  };

  return {
    hostname: safeCall(() => os.hostname(), "unknown"),
    platform: safeCall(() => os.platform(), "unknown"),
    release: safeCall(() => os.release(), "unknown"),
    arch: safeCall(() => os.arch(), "unknown"),
  } as const;
};

const getEnv = (key: string, defaultValue?: string): string => {
  const value = (process as { env: Record<string, string | undefined> }).env?.[
    key
  ];
  if (typeof value !== "string" || value === undefined || value.trim() === "") {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Safe wrapper for git operations
const getGitInfo = async (): Promise<{
  sha: string;
  isClean: boolean | undefined;
  branch: string;
}> => {
  try {
    const git = simpleGit();
    const [sha, status, branch] = await Promise.all([
      git.revparse(["HEAD"]).catch(() => process.env.VITE_GIT_SHA || "unknown"),
      git.status().catch(() => ({
        isClean: () => process.env.VITE_GIT_CLEAN === "true",
      })),
      git
        .revparse(["--abbrev-ref", "HEAD"])
        .catch(() => process.env.VITE_GIT_BRANCH || "unknown"),
    ]);

    return {
      sha,
      isClean: status.isClean(),
      branch,
    };
  } catch {
    // Fallback to environment variables or defaults
    return {
      sha: getEnv("VITE_GIT_SHA", "unknown"),
      isClean: getEnv("VITE_GIT_CLEAN", "false") === "true",
      branch: getEnv("VITE_GIT_BRANCH", "unknown"),
    };
  }
};

// Plugin to inject git information at build time
function buildInfoPlugin(): Plugin {
  return {
    name: "vite-plugin-build-info",
    async config(_, { mode }) {
      const gitInfo = await getGitInfo();
      const osInfo = getOsInfo();
      const pkgVersion = (pkg as { version: string | undefined }).version;
      const appVersion =
        // CI / releases: injected by semantic-release exec plugin
        process.env.VITE_APP_VERSION ||
        // Local dev / fallback
        pkgVersion;

      return {
        define: {
          // Build Env
          "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
          "import.meta.env.VITE_NODE_VERSION": JSON.stringify(process.version),
          "import.meta.env.VITE_VERSION": JSON.stringify(viteVersion),
          "import.meta.env.VITE_ENVIRONMENT": JSON.stringify(mode),
          "import.meta.env.VITE_BUILD_TIME": JSON.stringify(
            new Date().toISOString(),
          ),

          //// Git information
          "import.meta.env.VITE_GIT_SHA": JSON.stringify(gitInfo.sha),
          "import.meta.env.VITE_GIT_CLEAN": JSON.stringify(
            gitInfo.isClean ? "true" : "false",
          ),
          "import.meta.env.VITE_GIT_BRANCH": JSON.stringify(gitInfo.branch),

          // Build machine information
          "import.meta.env.VITE_BUILD_MACHINE_NAME": JSON.stringify(
            osInfo.hostname,
          ),
          "import.meta.env.VITE_BUILD_OS": JSON.stringify(osInfo.platform),
          "import.meta.env.VITE_BUILD_OS_VERSION": JSON.stringify(
            osInfo.release,
          ),
          "import.meta.env.VITE_BUILD_ARCH": JSON.stringify(osInfo.arch),
        },
      };
    },
  };
}

function dataValidationPlugin(dir: string = "src/data") {
  return {
    name: "data-validation",
    apply: "build" as const,
    enforce: "pre" as const,
    async buildStart(this: PluginContext) {
      const names = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
      const entries: FileEntry[] = [];

      for (const name of names) {
        const raw = await fs.readFile(join(dir, name), "utf8");
        entries.push({
          name,
          data: JSON.parse(raw) as unknown[],
        });
      }

      // Decide lenient vs strict
      const includeInvalid = decideIncludeInvalid();
      const inCI =
        String(process.env.GITHUB_ACTIONS || "").toLowerCase() === "true";

      // Validate + assemble; surface warnings via Vite's logger
      assembleData(entries, pathwayMetadata as object, commonSchemas, {
        includeInvalid,
        warn: (msg: string): void => {
          console.warn(msg);
        },
        onInvalid: (problems): void => {
          // Emit per-file annotations for Actions
          if (inCI) {
            for (const p of problems) {
              const file = join(dir, p.name);
              // one line per error keeps annotations readable; cap to 20
              const errs = p.errors.slice(0, 20);
              for (const e of errs) {
                // GitHub Actions workflow command:
                // ::warning file=<path>,line=<n>,col=<n>::message
                // We don't have line/col (JSON), so omit them.
                console.log(`::warning file=${file}::${e}`);
              }
              if (p.errors.length > errs.length) {
                console.log(
                  `::notice file=${file}::…and ${p.errors.length - errs.length} more error(s)`,
                );
              }
            }
          }
        },
      });
    },
  };
}

// Create a new plugin for serving schema files
// Used to access the schema files with the dev server
function schemaServePlugin(): Plugin {
  return {
    name: "schema-serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        "/schema",
        (
          req: IncomingMessage,
          res: ServerResponse,
          next: (err?: unknown) => void,
        ): void => {
          try {
            const baseDir = resolve("src/schema");
            const relPath = decodeURIComponent(
              (req.url || "").replace(/^\/schema\/?/, ""),
            );
            if (!relPath) return next(); // no file requested, let Vite handle
            const absPath = resolve(baseDir, relPath);
            // prevent path traversal
            if (!absPath.startsWith(baseDir)) return next();
            // only serve JSON files
            if (!absPath.endsWith(".json")) return next();
            readFile(absPath, "utf8")
              .then((json) => {
                res.setHeader("Content-Type", "application/json");
                res.end(json);
              })
              .catch(next);
          } catch (err) {
            next(err);
          }
        },
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    buildInfoPlugin(),
    dataValidationPlugin("src/data"),
    schemaServePlugin(),
    viteStaticCopy({
      // Publish the schema JSON at /schema/..., the URLs their $id names.
      // Since v4 the plugin keeps the source path, so strip "src/schema/".
      targets: [
        {
          src: "src/schema/**/*.json",
          dest: "schema",
          rename: { stripBase: 2 },
        },
      ],
    }),
  ],
  server: {
    open: true,
    port: 3000,
  },
});
