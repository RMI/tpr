/**
 * Regenerate the colour tokens in docs/design/tpr-design-tokens.json from the
 * `@theme` block in src/index.css, so the designer's Figma tokens cannot drift
 * from the colours the app actually renders.
 *
 * Run with `npm run tokens:build`. CI runs it too and fails when the committed
 * file differs from the output (see node-build-committed-files.yml).
 *
 * Only the `color` group is generated. Everything else in the file -- the type
 * scale, radius and shadows, which are Tailwind defaults src/index.css never
 * defines -- is hand-maintained and carried over untouched, as is each colour's
 * optional `description`. A renamed colour therefore loses its description.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CSS_PATH = path.resolve("src/index.css");
const TOKENS_PATH = path.resolve("docs/design/tpr-design-tokens.json");

export interface ColorToken {
  value: string;
  type: "color";
  description?: string;
}

type TokenFile = Record<string, unknown> & {
  color?: Record<string, Partial<ColorToken>>;
};

/**
 * Every `--color-*` custom property declared inside an `@theme` block, keyed by
 * the name after `--color-`, in source order.
 *
 * Comments are stripped first so a brace or a commented-out declaration inside
 * one cannot end the block early or leak in as a token. A name declared twice
 * keeps its last value, as it would in CSS.
 */
export function parseThemeColors(css: string): Map<string, string> {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [...uncommented.matchAll(/@theme\b[^{]*\{([^}]*)\}/g)];
  if (blocks.length === 0) {
    throw new Error("No @theme block found in the stylesheet.");
  }

  const colors = new Map<string, string>();
  for (const [, body] of blocks) {
    for (const [, name, value] of body.matchAll(
      /--color-([\w-]+)\s*:\s*([^;]+);/g,
    )) {
      colors.set(name, value.trim());
    }
  }
  if (colors.size === 0) {
    throw new Error("The @theme block declares no --color-* properties.");
  }
  return colors;
}

/**
 * The token file with its `color` group rebuilt from `colors`. The group keeps
 * its position among the file's top-level keys, and every other key is
 * returned as it was.
 */
export function buildTokens(
  colors: Map<string, string>,
  existing: TokenFile,
): TokenFile {
  const previous = existing.color ?? {};
  const color: Record<string, ColorToken> = {};
  for (const [name, value] of colors) {
    const description = previous[name]?.description;
    color[name] = description
      ? { value, type: "color", description }
      : { value, type: "color" };
  }
  return { ...existing, color };
}

function main(): void {
  if (!fs.existsSync(TOKENS_PATH)) {
    // The file is the only home of the hand-maintained groups, so it is never
    // created from scratch here.
    throw new Error(
      `${path.relative(process.cwd(), TOKENS_PATH)} is missing. Restore it from git before running this script.`,
    );
  }
  const css = fs.readFileSync(CSS_PATH, "utf8");
  const existing = JSON.parse(
    fs.readFileSync(TOKENS_PATH, "utf8"),
  ) as TokenFile;

  const colors = parseThemeColors(css);
  const tokens = buildTokens(colors, existing);
  fs.writeFileSync(TOKENS_PATH, `${JSON.stringify(tokens, null, 2)}\n`);
  console.info(
    `Wrote ${colors.size} colour tokens to ${path.relative(process.cwd(), TOKENS_PATH)}.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
