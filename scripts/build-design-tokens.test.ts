import { describe, it, expect } from "vitest";
import { buildTokens, parseThemeColors } from "./build-design-tokens.js";

describe("parseThemeColors", () => {
  it("reads --color-* properties from @theme in source order", () => {
    const css = `
      @import "tailwindcss";
      @theme {
        /* Primary colours */
        --color-bluespruce: #003b63;
        --color-energy:#45cfcc ;
        --font-display: "Inter";
      }
    `;
    expect([...parseThemeColors(css)]).toEqual([
      ["bluespruce", "#003b63"],
      ["energy", "#45cfcc"],
    ]);
  });

  it("ignores colours outside @theme and inside comments", () => {
    const css = `
      :root { --color-outside: #ffffff; }
      @theme {
        /* --color-commented: #000000; a { brace } too */
        --color-inside: #111111;
      }
    `;
    expect([...parseThemeColors(css).keys()]).toEqual(["inside"]);
  });

  it("combines several @theme blocks, the last declaration winning", () => {
    const css = `
      @theme { --color-a: #000001; --color-b: #000002; }
      @theme { --color-a: #000003; }
    `;
    expect(Object.fromEntries(parseThemeColors(css))).toEqual({
      a: "#000003",
      b: "#000002",
    });
  });

  it("fails loudly rather than emptying the token file", () => {
    expect(() => parseThemeColors("body { color: red; }")).toThrow(/@theme/);
    expect(() => parseThemeColors("@theme { --font-x: a; }")).toThrow(
      /--color-/,
    );
  });
});

describe("buildTokens", () => {
  const existing = {
    color: {
      energy: {
        value: "#000000",
        type: "color" as const,
        description: "Accent.",
      },
      removed: { value: "#ffffff", type: "color" as const },
    },
    fontSize: { sm: { value: "14px", type: "fontSizes" } },
  };

  it("replaces colour values and keeps descriptions by name", () => {
    const colors = new Map([
      ["bluespruce", "#003b63"],
      ["energy", "#45cfcc"],
    ]);
    expect(buildTokens(colors, existing).color).toEqual({
      bluespruce: { value: "#003b63", type: "color" },
      energy: { value: "#45cfcc", type: "color", description: "Accent." },
    });
  });

  it("leaves the hand-maintained groups and their order untouched", () => {
    const tokens = buildTokens(new Map([["energy", "#45cfcc"]]), existing);
    expect(Object.keys(tokens)).toEqual(["color", "fontSize"]);
    expect(tokens.fontSize).toBe(existing.fontSize);
  });
});
