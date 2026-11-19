import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ComparisonRibbon from "../components/ComparisonRibbon";
import { ComparisonProvider } from "../context/ComparisonContext";
import { FilterProvider } from "../context/FilterContext";
import { pathwayMetadata } from "../data/pathwayMetadata";

/*
  Comparison can now hold two editions of one pathway, which would otherwise
  produce two identical labels. These assert the disambiguation at the surfaces
  that show a name without a year beside it.
*/
const SESSION_KEY = "pathway-comparison";
const real = (id: string) => {
  const found = pathwayMetadata.find((p) => p.id === id);
  if (!found)
    throw new Error(`fixture drift: ${id} is no longer in the corpus`);
  return found;
};

const renderRibbon = (comparedIds: string[]) => {
  // Resolve first: ComparisonContext silently drops ids it cannot find, so an
  // id that left the corpus would leave an empty tray and a vacuous pass.
  comparedIds.forEach(real);
  sessionStorage.clear();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(comparedIds));
  return render(
    <MemoryRouter>
      <FilterProvider>
        <ComparisonProvider>
          <ComparisonRibbon />
        </ComparisonProvider>
      </FilterProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => sessionStorage.clear());

describe("ComparisonRibbon slot labels", () => {
  const expand = async () => {
    // The ribbon starts collapsed; its slots only render once expanded.
    await userEvent.click(
      screen.getByRole("button", { name: /Compare Pathways/i }),
    );
  };

  it("adds the year when both editions of one pathway are selected", async () => {
    renderRibbon(["IEA-NZE-2024", "IEA-NZE-2025"]);
    await expand();
    const text = document.body.textContent ?? "";
    expect(text).toContain("(2024)");
    expect(text).toContain("(2025)");
  });

  it("leaves the label alone when no sibling edition is selected", async () => {
    // Two different pathways, same year: nothing is ambiguous, so no suffix.
    renderRibbon(["IEA-NZE-2024", "IEA-STEPS-2024"]);
    await expand();
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("(2024)");
  });
});
