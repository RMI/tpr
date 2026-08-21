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
      "A structured way to narrow down the right pathway",
      "A simple way to start finding the right pathways",
      "What to do next",
    ]);
  });
});
