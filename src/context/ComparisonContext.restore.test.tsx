import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparisonProvider, useComparison } from "./ComparisonContext";

/*
  Restoring the tray from sessionStorage, in its own file.

  No real pathway set can be incompatible — all seven loadable pathways declare
  Power — so the rule is provable only against mocked metadata. Keeping that
  mock here leaves ComparisonContext.test.tsx free of module mocks.
*/

vi.mock("../data/pathwayMetadata", () => ({
  pathwayMetadata: [
    { id: "power-a", sectors: [{ name: "Power" }] },
    { id: "power-b", sectors: [{ name: "Power" }, { name: "Steel" }] },
    { id: "cement-a", sectors: [{ name: "Cement" }] },
    { id: "no-sectors", sectors: [] },
  ],
}));

const SESSION_KEY = "pathway-comparison";

const Consumer = () => (
  <span data-testid="ids">
    {JSON.stringify(useComparison().comparedPathwayIds)}
  </span>
);

const restore = (ids: string[]): string[] => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids));
  render(
    <ComparisonProvider>
      <Consumer />
    </ComparisonProvider>,
  );
  const parsed: unknown = JSON.parse(
    screen.getByTestId("ids").textContent ?? "[]",
  );
  return parsed as string[];
};

describe("ComparisonContext — restoring a stored selection", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("keeps a selection that shares a sector", () => {
    expect(restore(["power-a", "power-b"])).toEqual(["power-a", "power-b"]);
  });

  it("clears a selection that can no longer be compared", () => {
    // Stored before the rule existed, or before a pathway's sectors were
    // re-published. Left alone it would sit in the tray with Compare enabled,
    // leading straight to the page's block message.
    expect(restore(["power-a", "cement-a"])).toEqual([]);
  });

  it("clears all of it, not just the offender", () => {
    // There is no way to tell which of the stored pathways the reader would
    // rather keep, so guessing one would be worse than starting over.
    expect(restore(["power-a", "power-b", "cement-a"])).toEqual([]);
  });

  it("keeps a single stored pathway, which cannot clash with anything", () => {
    expect(restore(["cement-a"])).toEqual(["cement-a"]);
  });

  it("keeps a selection whose sector data is missing", () => {
    // `sectors: []` is valid data; unknown must not read as incompatible.
    expect(restore(["power-a", "no-sectors"])).toEqual([
      "power-a",
      "no-sectors",
    ]);
  });

  it("keeps ids that resolve to no pathway", () => {
    // They cannot prove an incompatibility, and both consumers filter them out
    // on their own.
    expect(restore(["power-a", "does-not-exist"])).toEqual([
      "power-a",
      "does-not-exist",
    ]);
  });
});
