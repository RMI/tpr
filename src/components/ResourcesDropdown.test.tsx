import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ResourcesDropdown from "./ResourcesDropdown";

describe("ResourcesDropdown component", () => {
  const renderDropdown = () =>
    render(
      <MemoryRouter>
        <ResourcesDropdown />
      </MemoryRouter>,
    );

  it("shows the shared resource links when opened", async () => {
    renderDropdown();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /resources/i }));
    const resourcesNav = screen.getByRole("navigation", { name: "Resources" });

    expect(
      within(resourcesNav).getByRole("link", {
        name: "How to choose a pathway",
      }),
    ).toHaveAttribute("href", "/resources/how-to-choose-a-pathway");
    expect(
      within(resourcesNav).getByRole("link", { name: "Use cases" }),
    ).toHaveAttribute("href", "/resources/use-cases");
    expect(
      within(resourcesNav).getByRole("link", { name: "Methodology" }),
    ).toHaveAttribute("href", "/resources/methodology");
    expect(
      within(resourcesNav).getByRole("link", { name: "Updates" }),
    ).toHaveAttribute("href", "/resources/updates");
    expect(
      within(resourcesNav).getByRole("link", { name: "FAQs" }),
    ).toHaveAttribute("href", "/resources/faq");
  });

  it("closes when clicking outside the menu", async () => {
    renderDropdown();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /resources/i }));
    expect(
      screen.getByRole("link", { name: "How to choose a pathway" }),
    ).toBeInTheDocument();

    await user.click(document.body);

    expect(
      screen.queryByRole("navigation", { name: "Resources" }),
    ).not.toBeInTheDocument();
  });

  it("closes after clicking a menu item", async () => {
    renderDropdown();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /resources/i }));
    await user.click(
      screen.getByRole("link", { name: "How to choose a pathway" }),
    );

    expect(
      screen.queryByRole("navigation", { name: "Resources" }),
    ).not.toBeInTheDocument();
  });
});
