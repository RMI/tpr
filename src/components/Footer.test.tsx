import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Footer from "./Footer";

describe("Footer component", () => {
  // Helper function to render Footer with MemoryRouter
  const renderFooter = () => {
    return render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
  };

  it("renders the title text correctly", () => {
    renderFooter();
    expect(
      screen.getByText("Transition Pathways Repository"),
    ).toBeInTheDocument();
  });

  it("contains Legal link with correct path", () => {
    renderFooter();
    const legalLink = screen.getByText("Legal");
    expect(legalLink).toBeInTheDocument();
    expect(legalLink.getAttribute("href")).toBe("/legal");
  });

  it("contains Give Feedback email link", () => {
    renderFooter();
    const feedbackLink = screen.getByText("Give Feedback");
    expect(feedbackLink).toBeInTheDocument();
    expect(feedbackLink.closest("a")).toHaveAttribute(
      "href",
      "mailto:tomwhite+tpr@rmi.org",
    );
  });

  it("displays the current year in the copyright notice", () => {
    renderFooter();
    const currentYear = new Date().getFullYear().toString();
    expect(
      screen.getByText(new RegExp(`© ${currentYear} RMI`)),
    ).toBeInTheDocument();
  });

  it("contains the RMI logo image", () => {
    renderFooter();
    const logo = screen.getByAltText("RMI logo");
    expect(logo).toBeInTheDocument();
  });
});
