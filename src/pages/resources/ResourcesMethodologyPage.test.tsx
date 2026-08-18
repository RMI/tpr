import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourcesMethodologyPage from "./ResourcesMethodologyPage";
import { REGION_MAPPING_DISCLAIMER } from "../../utils/geographyUtils";

const TERRITORIAL_CLAIMS =
  "RMI does not make any statements on country delineations and/or conflicting territorial claims.";

/** Render the page and expand the collapsed "Regions" subsection. */
const renderWithRegionsOpen = () => {
  const view = render(
    <MemoryRouter>
      <ResourcesMethodologyPage />
    </MemoryRouter>,
  );
  // The disclosure button's accessible name runs the title straight into the
  // subtitle with no separator: "RegionsWhich regions and countries are covered?".
  fireEvent.click(
    screen.getByRole("button", { name: /^Regions\s*Which regions/i }),
  );
  return view;
};

/** Page text with whitespace collapsed, so JSX line wrapping doesn't matter. */
const flatText = (container: HTMLElement): string =>
  (container.textContent ?? "").replace(/\s+/g, " ");

const countOf = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

describe("ResourcesMethodologyPage — Regions note", () => {
  it("states that region mappings come from the pathway's model, not RMI (#800)", () => {
    const { container } = renderWithRegionsOpen();
    expect(flatText(container)).toContain(REGION_MAPPING_DISCLAIMER);
  });

  it("keeps the existing territorial-claims sentence in the same note", () => {
    const { container } = renderWithRegionsOpen();
    const text = flatText(container);

    expect(text).toContain(TERRITORIAL_CLAIMS);
    // Reconciled into one note rather than added alongside the old one — a second
    // near-duplicate note is exactly what #800 asked us to avoid.
    expect(countOf(text, TERRITORIAL_CLAIMS)).toBe(1);
    expect(countOf(text, REGION_MAPPING_DISCLAIMER)).toBe(1);
  });

  it("renders the note as a single italic block", () => {
    const { container } = renderWithRegionsOpen();

    const italics = Array.from(container.querySelectorAll("i")).filter((el) =>
      (el.textContent ?? "").replace(/\s+/g, " ").includes(TERRITORIAL_CLAIMS),
    );
    expect(italics).toHaveLength(1);
    expect(flatText(italics[0])).toContain(REGION_MAPPING_DISCLAIMER);
  });

  it("does not show the note until the Regions subsection is expanded", () => {
    const { container } = render(
      <MemoryRouter>
        <ResourcesMethodologyPage />
      </MemoryRouter>,
    );
    expect(flatText(container)).not.toContain(REGION_MAPPING_DISCLAIMER);
  });
});
