import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ContactPage from "./ContactPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  );

describe("ContactPage", () => {
  it("lists its sections in the on-page index (#955)", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the page's sections.
    const links = within(nav).getAllByRole("link").slice(1);

    expect(links.map((link) => link.textContent)).toEqual([
      "How to reach us",
      "Feedback and suggestions",
    ]);
  });

  it("keeps the ways to get in touch", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Tom White" })).toHaveAttribute(
      "href",
      "mailto:tomwhite+tpr@rmi.org",
    );
    expect(screen.getByRole("link", { name: "Nayra Herrera" })).toHaveAttribute(
      "href",
      "mailto:nherrera+tpr@rmi.org",
    );
    expect(
      screen.getByRole("link", { name: "GitHub repository" }),
    ).toHaveAttribute("href", "https://github.com/RMI/tpr/issues");
  });
});
