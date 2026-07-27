import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
});
