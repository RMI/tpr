import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AccordionItem from "./AccordionItem";

describe("AccordionItem", () => {
  it("keeps the panel mounted but hidden by default, with aria-controls pointing at it", () => {
    render(
      <AccordionItem
        header={<span>Title</span>}
        panelClassName="panel"
      >
        <p>Panel content</p>
      </AccordionItem>,
    );

    const button = screen.getByRole("button", { name: "Title" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    const panel = screen.getByText("Panel content").closest(".panel");
    expect(panel).not.toBeNull();
    expect(panel).not.toBeVisible();

    const controlsId = button.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    expect(document.getElementById(controlsId as string)).toBe(panel);
  });

  it("reveals the panel and flips aria-expanded when the header is clicked", () => {
    render(
      <AccordionItem
        header={<span>Title</span>}
        panelClassName="panel"
      >
        <p>Panel content</p>
      </AccordionItem>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Title" }));

    expect(screen.getByRole("button", { name: "Title" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Panel content")).toBeVisible();
  });
});
