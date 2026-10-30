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

  it("gives every case study the same sub-sections, in order", () => {
    renderPage();

    const ids = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.id);

    expect(ids).toEqual(
      [
        "company-target-setting",
        "investment-opportunity-identification",
        "policy-risk-assessment",
      ].flatMap((study) =>
        [
          "situation",
          "challenge",
          "how-the-tpr-helps",
          "analysis",
          "final-notes",
        ].map((section) => `${study}-${section}`),
      ),
    );
  });

  it("lists the case studies in the on-page index, with the open one's outline", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the case studies.
    const links = within(nav).getAllByRole("link").slice(1);

    // The first case study is active on load, so its sub-headings show.
    expect(links.map((link) => link.textContent)).toEqual([
      "Company target setting",
      "Situation",
      "Challenge",
      "How the Transition Pathways Repository helps",
      "Analysis",
      "Final notes",
      "Investment and financing opportunities",
      "Policy risk assessment",
    ]);
  });

  it("shows written case studies in full and keeps the placeholder for the rest", () => {
    renderPage();

    const article = (id: string) =>
      document.getElementById(id)?.closest("article") as HTMLElement;

    for (const id of ["company-target-setting", "policy-risk-assessment"]) {
      expect(
        within(article(id)).queryByText("Content to be added."),
      ).not.toBeInTheDocument();
    }
    expect(
      within(article("investment-opportunity-identification")).getAllByText(
        "Content to be added.",
      ),
    ).toHaveLength(5);
  });

  it("describes every screenshot and chart for screen readers", () => {
    renderPage();

    const figures = screen.getAllByRole("img");
    expect(figures).toHaveLength(4);
    for (const figure of figures) {
      expect(figure).toHaveAccessibleName();
    }
  });
});
