import { describe, it, expect } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourcesMethodologyPage from "./ResourcesMethodologyPage";
import { REGION_MAPPING_DISCLAIMER } from "../../utils/geographyUtils";
import { MockIntersectionObserver } from "../../test/mockIntersectionObserver";

const TERRITORIAL_CLAIMS =
  "RMI does not make any statements on country delineations and/or conflicting territorial claims.";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResourcesMethodologyPage />
    </MemoryRouter>,
  );

/** Page text with whitespace collapsed, so JSX line wrapping doesn't matter. */
const flatText = (container: HTMLElement): string =>
  (container.textContent ?? "").replace(/\s+/g, " ");

const countOf = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

describe("ResourcesMethodologyPage — Regions note", () => {
  it("states that region mappings come from the pathway's model, not RMI (#800)", () => {
    const { container } = renderPage();
    expect(flatText(container)).toContain(REGION_MAPPING_DISCLAIMER);
  });

  it("keeps the existing territorial-claims sentence in the same note", () => {
    const { container } = renderPage();
    const text = flatText(container);

    expect(text).toContain(TERRITORIAL_CLAIMS);
    // Reconciled into one note rather than added alongside the old one — a second
    // near-duplicate note is exactly what #800 asked us to avoid.
    expect(countOf(text, TERRITORIAL_CLAIMS)).toBe(1);
    expect(countOf(text, REGION_MAPPING_DISCLAIMER)).toBe(1);
  });

  it("renders the note as a single italic block", () => {
    const { container } = renderPage();

    const italics = Array.from(container.querySelectorAll("i")).filter((el) =>
      (el.textContent ?? "").replace(/\s+/g, " ").includes(TERRITORIAL_CLAIMS),
    );
    expect(italics).toHaveLength(1);
    expect(flatText(italics[0])).toContain(REGION_MAPPING_DISCLAIMER);
  });

  it("shows the note without any interaction, now that subsections no longer collapse (#955)", () => {
    const { container } = renderPage();
    expect(flatText(container)).toContain(REGION_MAPPING_DISCLAIMER);
    // The whole page is readable without clicking: no disclosure buttons left.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("ResourcesMethodologyPage — on-page index (#802)", () => {
  it("lists the page's top-level sections, in order, excluding the hero subtitle", () => {
    render(
      <MemoryRouter>
        <ResourcesMethodologyPage />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the page's sections.
    const links = within(nav).getAllByRole("link").slice(1);

    expect(links.map((link) => link.textContent)).toEqual([
      "Key definitions",
      "Expert overview",
      "Meta data classification",
      "Scope and granularity classification",
      "Narrative and assumptions classification",
      "What to do next",
    ]);
  });

  it("reveals a section's subsections in the index only while that section is the one in view (#955)", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    const entries = () =>
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent);

    // "Key definitions" is active on load and has no subsections, so no
    // sub-entries are listed anywhere yet.
    expect(entries()).not.toContain("Pathway type");
    expect(entries()).not.toContain("Regions");

    const observer = MockIntersectionObserver.instances[0];
    act(() => {
      observer.trigger(
        document.getElementById("meta-data-classification")!,
        true,
      );
    });

    // Its own subsections expand...
    expect(entries()).toContain("Pathway type");
    expect(entries()).toContain("Net zero reached");
    // ...and no other section's do.
    expect(entries()).not.toContain("Regions");

    act(() => {
      observer.trigger(
        document.getElementById("scope-and-granularity-classification")!,
        true,
      );
      observer.trigger(
        document.getElementById("meta-data-classification")!,
        false,
      );
    });

    expect(entries()).toContain("Regions");
    expect(entries()).not.toContain("Pathway type");
  });

  it("marks the parent section expanded when a subsection itself is in view", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger(document.getElementById("regions")!, true);
    });

    const active = within(nav)
      .getAllByRole("link")
      .find((link) => link.getAttribute("aria-current"));
    expect(active?.textContent).toBe("Regions");
    // Its parent's other subsections are listed alongside it.
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toContain("Sectors");
  });
});
