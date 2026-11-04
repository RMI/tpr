import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import LandingPage from "./LandingPage";

describe("LandingPage navigation", () => {
  it("uses the shared header nav resources menu", async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup();

    expect(
      screen.getByRole("link", { name: "Contact Us" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /resources/i }));
    const resourcesNav = screen.getByRole("navigation", { name: "Resources" });

    expect(
      within(resourcesNav).getByRole("link", {
        name: "How to choose a pathway",
      }),
    ).toBeInTheDocument();
    expect(
      within(resourcesNav).getByRole("link", { name: "Use cases" }),
    ).toBeInTheDocument();
    expect(
      within(resourcesNav).getByRole("link", { name: "Methodology" }),
    ).toBeInTheDocument();
    expect(
      within(resourcesNav).getByRole("link", { name: "Updates" }),
    ).toBeInTheDocument();
    expect(
      within(resourcesNav).getByRole("link", { name: "FAQs" }),
    ).toBeInTheDocument();
  });

  it("links each case study tile to its section of the case studies page", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Company target setting/ }),
    ).toHaveAttribute("href", "/case-studies#company-target-setting");
    expect(
      screen.getByRole("link", {
        name: /Investment and financing opportunities/,
      }),
    ).toHaveAttribute(
      "href",
      "/case-studies#investment-opportunity-identification",
    );
    expect(
      screen.getByRole("link", { name: /Policy risk assessment/ }),
    ).toHaveAttribute("href", "/case-studies#policy-risk-assessment");
  });
});
