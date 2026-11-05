import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import PathwayCard from "./PathwayCard";
import type { PathwayMetadataType } from "../types";
import { ComparisonProvider } from "../context/ComparisonContext";
import { pathwayMetadata } from "../data/pathwayMetadata";
import mockPathway from "../../testdata/valid/pathwayMetadata_standard.json" assert { type: "json" };

/*
  The in-comparison cases use REAL corpus pathways, not invented ids.
  `ComparisonContext` resolves every restored id against `pathwayMetadata` and
  drops the ones it cannot find, so a fabricated id silently never enters the
  comparison and the test would assert against an empty tray.
*/
const SESSION_KEY = "pathway-comparison";
const realEdition = (id: string): PathwayMetadataType => {
  const found = pathwayMetadata.find((p) => p.id === id);
  if (!found)
    throw new Error(`fixture drift: ${id} is no longer in the corpus`);
  return found;
};

/** The standard fixture re-badged as one edition of a series. */
const base = mockPathway as unknown as PathwayMetadataType;
const edition = (id: string, year: number): PathwayMetadataType => ({
  ...base,
  id,
  publication: { ...base.publication, year },
});

const older = edition("SER-NZE-2024", 2024);
const newer = edition("SER-NZE-2025", 2025);

const renderCard = (
  props: Partial<React.ComponentProps<typeof PathwayCard>> = {},
  comparedIds: string[] = [],
) => {
  sessionStorage.clear();
  if (comparedIds.length > 0) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(comparedIds));
  }
  return render(
    <MemoryRouter>
      <ComparisonProvider>
        <PathwayCard
          pathway={newer}
          searchTerm=""
          {...props}
        />
      </ComparisonProvider>
    </MemoryRouter>,
  );
};

const pill = () => screen.queryByRole("button", { name: /editions/i });

describe("PathwayCard edition pill", () => {
  it("renders no pill for a single-edition pathway", () => {
    renderCard();
    expect(pill()).toBeNull();
  });

  it("renders no pill when the series has exactly one edition", () => {
    renderCard({ editions: [newer] });
    expect(pill()).toBeNull();
  });

  it("counts the other editions, not all of them", () => {
    renderCard({ editions: [older, newer] });
    expect(screen.getByText("+1 edition")).toBeTruthy();
  });

  it("pluralizes beyond one other edition", () => {
    renderCard({ editions: [edition("SER-NZE-2023", 2023), older, newer] });
    expect(screen.getByText("+2 editions")).toBeTruthy();
  });

  it("describes itself for screen readers and opens a dialog", () => {
    renderCard({ editions: [older, newer] });
    const button = screen.getByRole("button", { name: "See all 2 editions" });
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("calls the page's handler when clicked", async () => {
    const onOpenEditions = vi.fn();
    renderCard({ editions: [older, newer], onOpenEditions });
    await userEvent.click(screen.getByRole("button", { name: /editions/i }));
    expect(onOpenEditions).toHaveBeenCalledTimes(1);
  });

  it("goes dark and names the year when a hidden edition is in comparison", () => {
    // The card shows 2025. A compare selection on 2024 would otherwise leave
    // no trace on the grid at all.
    const real2024 = realEdition("IEA-NZE-2024");
    const real2025 = realEdition("IEA-NZE-2025");
    renderCard({ pathway: real2025, editions: [real2024, real2025] }, [
      real2024.id,
    ]);
    expect(screen.getByText("2024 in compare")).toBeTruthy();
    const button = screen.getByRole("button", { name: /in comparison/i });
    expect(button.className).toContain("bg-bluespruce");
  });

  it("stays in the default state when the shown edition is the compared one", () => {
    // Only a HIDDEN edition justifies the dark state: the card's own compare
    // button already shows this one's state.
    const real2024 = realEdition("IEA-NZE-2024");
    const real2025 = realEdition("IEA-NZE-2025");
    renderCard({ pathway: real2025, editions: [real2024, real2025] }, [
      real2025.id,
    ]);
    expect(screen.getByText("+1 edition")).toBeTruthy();
    const button = screen.getByRole("button", { name: /editions/i });
    expect(button.className).toContain("bg-rmiblue-100");
  });
});

describe("PathwayCard publication title", () => {
  it("truncates rather than wraps, so the card cannot grow a line", () => {
    renderCard({ editions: [older, newer] });
    const title = screen.getByText(/Publication:/).nextElementSibling;
    expect(title?.className).toContain("truncate");
    expect(title?.parentElement?.className).toContain("min-w-0");
  });
});
