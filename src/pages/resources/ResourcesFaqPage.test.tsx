import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourcesFaqPage from "./ResourcesFaqPage";

describe("ResourcesFaqPage — on-page index (#802)", () => {
  it("lists the page's 3 category headings, not the individual (collapsed) questions", () => {
    render(
      <MemoryRouter>
        <ResourcesFaqPage />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the page's sections.
    const links = within(nav).getAllByRole("link").slice(1);

    expect(links.map((link) => link.textContent)).toEqual([
      "About the TPR",
      "Using the TPR",
      "Using the TPR to support corporate transition assessments (CTAs)",
    ]);
  });
});
