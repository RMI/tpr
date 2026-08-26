import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourcesHowToChooseAPathwayPage from "./ResourcesHowToChooseAPathwayPage";

describe("ResourcesHowToChooseAPathwayPage — on-page index (#802)", () => {
  it("lists the page's top-level sections, excluding the hero subtitle and the 'Credible does not mean suitable' aside", () => {
    render(
      <MemoryRouter>
        <ResourcesHowToChooseAPathwayPage />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the page's sections.
    const links = within(nav).getAllByRole("link").slice(1);

    expect(links.map((link) => link.textContent)).toEqual([
      "Five steps to finding the right pathway",
      "Pathway characteristics for different use cases",
      "How-to guides",
      "What to do next",
    ]);
  });

  it("renders the comparison guide as an h3 accordion entry, collapsed by default like a FAQ item", () => {
    render(
      <MemoryRouter>
        <ResourcesHowToChooseAPathwayPage />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", {
      level: 3,
      name: "How to compare pathways using the TPR",
    });
    const button = within(heading).getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
