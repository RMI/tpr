import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GetUpdatesPage from "./GetUpdatesPage";

const FORM_TITLE = /newsletter signup form/i;

describe("GetUpdatesPage (#995)", () => {
  it("shows the signup form in the page, without opening anything", () => {
    render(<GetUpdatesPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Stay up to date with the TPR",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTitle(FORM_TITLE).getAttribute("src")).toMatch(
      /^https:\/\/rmi\.tfaforms\.net\/312\?/,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts the open-in-new-tab fallback above the form", () => {
    render(<GetUpdatesPage />);

    const fallback = screen.getByRole("link", { name: "Open it in a new tab" });
    expect(fallback).toHaveAttribute("href", "https://rmi.tfaforms.net/312");
    expect(fallback).toHaveAttribute("target", "_blank");
    expect(
      fallback.compareDocumentPosition(screen.getByTitle(FORM_TITLE)) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
