import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ResourcesUseCasesPage from "./ResourcesUseCasesPage";

describe("ResourcesUseCasesPage — on-page index (#802)", () => {
  it("lists the page's top-level sections, excluding the hero subtitle and the 'Why pathway selection matters' aside", () => {
    render(<ResourcesUseCasesPage />);

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the page's sections.
    const links = within(nav).getAllByRole("link").slice(1);

    expect(links.map((link) => link.textContent)).toEqual([
      "Supporting the teams financing the transition",
      "How the TPR supports decision makers",
      "How the Transition Pathways Repository supports transition intelligence",
      "Looking for more information?",
    ]);
  });
});
