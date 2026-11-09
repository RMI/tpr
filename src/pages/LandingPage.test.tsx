import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import LandingPage from "./LandingPage";
import { NewsletterSignupProvider } from "../context/NewsletterSignupContext";

describe("LandingPage navigation", () => {
  it("uses the shared header nav resources menu", async () => {
    render(
      <MemoryRouter>
        <NewsletterSignupProvider>
          <LandingPage />
        </NewsletterSignupProvider>
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
});

describe("LandingPage newsletter signup (#995)", () => {
  it("offers signup from a hero button beside Explore Pathways, not a separate band", async () => {
    render(
      <MemoryRouter>
        <NewsletterSignupProvider>
          <LandingPage />
        </NewsletterSignupProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    const explore = screen.getAllByRole("link", {
      name: "Explore Pathways",
    })[0];
    const signup = screen.getByRole("button", { name: "Sign up for updates" });
    expect(signup.parentElement).toBe(explore.parentElement);
    expect(
      screen.queryByRole("region", { name: "Stay up to date with the TPR" }),
    ).not.toBeInTheDocument();

    await user.click(signup);

    expect(
      screen.getByRole("dialog", { name: "Sign up for TPR updates" }),
    ).toHaveAttribute("open");
  });
});
