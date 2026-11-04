import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import HeaderNav from "./HeaderNav";

describe("HeaderNav component", () => {
  it("renders the contact link and shared resources button", () => {
    render(
      <MemoryRouter>
        <HeaderNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(
      screen.getByRole("button", { name: /resources/i }),
    ).toBeInTheDocument();
  });

  it("places the case studies link between Contact Us and Resources", () => {
    render(
      <MemoryRouter>
        <HeaderNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Case Studies" })).toHaveAttribute(
      "href",
      "/case-studies",
    );

    const order = Array.from(
      screen.getByRole("navigation").querySelectorAll("a, button"),
    ).map((el) => el.textContent?.trim());
    expect(order.slice(0, 2)).toEqual(["Contact Us", "Case Studies"]);
    expect(order[2]).toMatch(/resources/i);
  });
});
