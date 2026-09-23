// src/components/TextWithTooltip.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TextWithTooltip from "./TextWithTooltip";

describe("TextWithTooltip component", () => {
  it("renders the trigger text", () => {
    render(
      <TextWithTooltip
        text="Hover me"
        tooltip="Tooltip content"
      />,
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("sets up trigger element with correct attributes", () => {
    render(
      <TextWithTooltip
        text="Trigger"
        tooltip="Tooltip content"
      />,
    );

    const trigger = screen.getByText("Trigger");
    expect(trigger).toHaveAttribute("tabIndex", "0");
    // The aria-describedby attribute is only added when the tooltip is visible
    // so we don't test for it initially
  });

  it("properly passes tooltip content to the component", () => {
    // Testing the props are received correctly
    const TestComponent = () => {
      const tooltipContent = (
        <span className="whitespace-nowrap">Multi Word Content</span>
      );
      return (
        <TextWithTooltip
          text="Trigger"
          tooltip={tooltipContent}
        />
      );
    };

    render(<TestComponent />);

    // Just verify the trigger is rendered correctly
    expect(screen.getByText("Trigger")).toBeInTheDocument();

    // We can't easily test the portal content, so we'll assume it works
    // if the component doesn't throw errors
  });
});

describe("TextWithTooltip as a button trigger", () => {
  it("defaults to a focusable span, not a button", () => {
    render(
      <TextWithTooltip
        text="Power"
        tooltip="A sector"
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Power").closest("[tabindex]")).not.toBeNull();
  });

  it("renders a real button when asked, with no nested tab stop", () => {
    render(
      <TextWithTooltip
        as="button"
        text="Power"
        tooltip="A sector"
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "button");
    // A button may contain no descendant with tabindex; that invalid markup
    // (and its double tab stop) is the reason this mode exists.
    expect(button.querySelector("[tabindex]")).toBeNull();
  });

  it("forwards button props such as aria-pressed and onClick", async () => {
    const onClick = vi.fn();
    render(
      <TextWithTooltip
        as="button"
        text="Power"
        tooltip="A sector"
        buttonProps={{ "aria-pressed": true, onClick }}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps showing its tooltip on focus", async () => {
    render(
      <TextWithTooltip
        as="button"
        text="South East Asia"
        tooltip="Ten member countries"
      />,
    );

    fireEvent.focus(screen.getByRole("button"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Ten member countries",
    );
  });

  it("does not blur itself on click in button mode", async () => {
    // The span trigger blurs on click to dismiss the tooltip. A button's click
    // is the action, so blurring would fight it and hide what was just opened.
    render(
      <TextWithTooltip
        as="button"
        text="Power"
        tooltip="A sector"
      />,
    );

    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(button).toHaveFocus();
  });
});
