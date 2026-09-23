import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourcesFaqPage from "./ResourcesFaqPage";

const QUESTIONS = [
  "What is the Transition Pathways Repository (TPR) for?",
  "Who is the TPR built for?",
  "What pathways can I find in the TPR?",
  "How do I use the TPR?",
  "Does the TPR tell me which pathway is best?",
  "Why can’t I use one scenario for everything?",
  "Why do some pathways have more or different benchmark data than others?",
  "What is a corporate transition assessment (CTA)?",
  "How does the TPR relate to CTAs?",
  "What else is the TPR useful for?",
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResourcesFaqPage />
    </MemoryRouter>,
  );

describe("ResourcesFaqPage — flat, always-expanded questions (#955)", () => {
  it("renders all 10 questions as top-level headings, in order, with nothing collapsed", () => {
    renderPage();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(QUESTIONS);

    // The accordion is gone: every answer is readable without a click.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(
      screen.getByText(/The TPR centralizes and standardizes this information/),
    ).toBeInTheDocument();
  });

  it("lists every question in the on-page index", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the questions.
    const links = within(nav).getAllByRole("link").slice(1);

    expect(links.map((link) => link.textContent)).toEqual(QUESTIONS);
  });

  it("no longer shows the 'About the TPR' / 'Using the TPR' / CTAs category headings", () => {
    renderPage();

    expect(screen.queryByText("About the TPR")).not.toBeInTheDocument();
    expect(screen.queryByText("Using the TPR")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Using the TPR to support corporate transition assessments (CTAs)",
      ),
    ).not.toBeInTheDocument();
  });
});
