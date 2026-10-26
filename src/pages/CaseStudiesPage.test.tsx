import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import CaseStudiesPage from "./CaseStudiesPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CaseStudiesPage />
    </MemoryRouter>,
  );

describe("CaseStudiesPage", () => {
  it("says the companies are hypothetical and the pathways are real", () => {
    renderPage();

    expect(
      screen.getByText(/companies in these case studies are hypothetical/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pathways and their data are real/),
    ).toBeInTheDocument();
  });

  it("gives each case study a stable heading id for deep links", () => {
    renderPage();

    const ids = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.id);

    expect(ids).toEqual([
      "company-target-setting",
      "investment-opportunity-identification",
      "policy-risk-assessment",
    ]);
  });

  it("lists the case studies in the on-page index, with the open one's outline", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the case studies.
    const links = within(nav).getAllByRole("link").slice(1);

    // The first case study is active on load, so its sub-headings show.
    expect(links.map((link) => link.textContent)).toEqual([
      "Company target setting",
      "The question",
      "The company",
      "Finding matching pathways",
      "Comparing the company to the pathways",
      "Investment and financing opportunities",
      "Policy risk assessment",
    ]);
  });
});
