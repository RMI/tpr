import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ResourcesUseCasesPage from "./ResourcesUseCasesPage";

describe("ResourcesUseCasesPage — on-page index (#802)", () => {
  it("lists the page's top-level sections, excluding the hero subtitle", () => {
    render(<ResourcesUseCasesPage />);

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the page's sections.
    const links = within(nav).getAllByRole("link").slice(1);

    expect(links.map((link) => link.textContent)).toEqual([
      "How pathways inform different users",
      "Pathway use cases",
      "Creating transition intelligence",
      "Looking for more information?",
    ]);
  });
});
