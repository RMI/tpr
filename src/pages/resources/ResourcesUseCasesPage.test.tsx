import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourcesUseCasesPage from "./ResourcesUseCasesPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResourcesUseCasesPage />
    </MemoryRouter>,
  );

describe("ResourcesUseCasesPage — on-page index (#802)", () => {
  it("lists the page's top-level sections, excluding the hero subtitle", () => {
    renderPage();

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

describe("ResourcesUseCasesPage — worked examples", () => {
  it("links each use case with a case study to that case study", () => {
    renderPage();

    const links = screen.getAllByRole("link", { name: /See a worked example/ });

    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      [
        "See a worked example: Company target setting →",
        "/case-studies#company-target-setting",
      ],
      [
        "See a worked example: Investment and financing opportunities →",
        "/case-studies#investment-opportunity-identification",
      ],
      [
        "See a worked example: Policy risk assessment →",
        "/case-studies#policy-risk-assessment",
      ],
    ]);
  });
});
