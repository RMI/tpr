import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("ResourcesFaqPage — single accordion (no section headers, no on-page index)", () => {
  it("has no on-page index, since the page no longer has any section headings to list", () => {
    render(
      <MemoryRouter>
        <ResourcesFaqPage />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("navigation", { name: "On this page" }),
    ).not.toBeInTheDocument();
  });

  it("no longer shows the 'About the TPR' / 'Using the TPR' / CTAs category headings", () => {
    render(
      <MemoryRouter>
        <ResourcesFaqPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("About the TPR")).not.toBeInTheDocument();
    expect(screen.queryByText("Using the TPR")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Using the TPR to support corporate transition assessments (CTAs)",
      ),
    ).not.toBeInTheDocument();
  });

  it("renders all 10 questions as one flat, collapsed-by-default accordion, in order", () => {
    render(
      <MemoryRouter>
        <ResourcesFaqPage />
      </MemoryRouter>,
    );

    const buttons = QUESTIONS.map((question) =>
      screen.getByRole("button", { name: question }),
    );
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    // All 10 live in the same single list, in the same top-to-bottom order.
    const allButtons = screen.getAllByRole("button");
    expect(allButtons).toHaveLength(QUESTIONS.length);
    expect(allButtons).toEqual(buttons);
  });
});
