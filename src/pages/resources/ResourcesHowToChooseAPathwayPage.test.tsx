import { describe, it, expect } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourcesHowToChooseAPathwayPage from "./ResourcesHowToChooseAPathwayPage";
import { MockIntersectionObserver } from "../../test/mockIntersectionObserver";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResourcesHowToChooseAPathwayPage />
    </MemoryRouter>,
  );

/** Top-level index entries only, skipping the "Back to top" link and any
 * sub-entries that the section currently in view has expanded. */
const topLevelEntries = (nav: HTMLElement): (string | null)[] =>
  Array.from(nav.querySelectorAll(":scope > ul > li > a"))
    .slice(1)
    .map((link) => link.textContent);

describe("ResourcesHowToChooseAPathwayPage — on-page index (#802, #955)", () => {
  it("lists the page's top-level sections, excluding the page subtitle", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });

    expect(topLevelEntries(nav)).toEqual([
      "Five steps to finding the right pathway",
      "Pathway characteristics for different use cases",
      "How-to guides",
      "What to do next",
    ]);
  });

  it("nests the five steps under the section they belong to, while it is in view", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // "Five steps" is the first section, so it is active on load.
    const subEntries = Array.from(
      nav.querySelectorAll(":scope > ul > li > ul > li > a"),
    ).map((link) => link.textContent);

    expect(subEntries).toEqual([
      "Define the intended application",
      "Check credibility",
      "Review pathway features",
      "Check granularity",
      "Confirm benchmark data availability",
    ]);

    // Scrolling on to another section collapses them again.
    const observer = MockIntersectionObserver.instances[0];
    act(() => {
      observer.trigger(document.getElementById("how-to-guides")!, true);
      observer.trigger(document.getElementById("five-steps")!, false);
    });

    expect(nav.querySelectorAll(":scope > ul > li > ul > li > a")).toHaveLength(
      1,
    );
    expect(
      within(nav).getByRole("link", {
        name: "How to compare pathways using the TPR",
      }),
    ).toBeInTheDocument();
  });
});

describe("ResourcesHowToChooseAPathwayPage — no collapsed content (#955)", () => {
  it("renders every step and guide expanded, with no disclosure buttons", () => {
    renderPage();

    expect(screen.queryAllByRole("button")).toHaveLength(0);

    [
      "Define the intended application",
      "Check credibility",
      "Review pathway features",
      "Check granularity",
      "Confirm benchmark data availability",
      "How to compare pathways using the TPR",
    ].forEach((name) => {
      expect(
        screen.getByRole("heading", { level: 3, name }),
      ).toBeInTheDocument();
    });

    // Body text of a step that used to be hidden behind a click.
    expect(
      screen.getByText(/Does the methodology appear technically sound\?/),
    ).toBeInTheDocument();
  });

  it("keeps the 'Credible does not mean suitable' note, now inline within step 2", () => {
    const { container } = renderPage();
    const text = (container.textContent ?? "").replace(/\s+/g, " ");

    expect(text).toContain("Credible does not mean suitable.");
    expect(text).toContain(
      "Pathway credibility is necessary, but not sufficient.",
    );
    // It is no longer a heading competing with the page's real sections.
    expect(
      screen.queryByRole("heading", {
        name: /Credible does not mean suitable/,
      }),
    ).not.toBeInTheDocument();
  });
});
