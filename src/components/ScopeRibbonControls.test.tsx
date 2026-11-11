import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ChoiceButton,
  InactiveSlot,
  OrSeparator,
  ReadOnlySector,
} from "./ScopeRibbonControls";
import type { Geography } from "../types";

const geography = {
  regions: { ASEAN: ["ID", "TH", "VN"] },
} as unknown as Geography;

describe("InactiveSlot", () => {
  const renderSlot = () =>
    render(
      <InactiveSlot
        level="global"
        label="Global"
        tooltip="This pathway doesn't cover Global."
      />,
    );

  it("is reachable by keyboard but announced as unavailable", () => {
    renderSlot();
    const slot = screen.getByRole("button", { name: /Global/ });
    // aria-disabled, not disabled: a disabled button cannot be focused, and
    // the reader would never hear why.
    expect(slot).toHaveAttribute("aria-disabled", "true");
    expect(slot).not.toBeDisabled();
    expect(slot.className).toContain("opacity-50");
    expect(slot.className).toContain("cursor-not-allowed");
  });

  it("explains itself on keyboard focus", async () => {
    renderSlot();
    await userEvent.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "This pathway doesn't cover Global.",
    );
  });
});

describe("ChoiceButton", () => {
  it("selects its option and reports whether it holds the selection", async () => {
    const onSelect = vi.fn();
    render(
      <ChoiceButton
        level="global"
        option={{ token: "Global", label: "Global", hasData: true }}
        selected={false}
        onSelect={onSelect}
        geography={geography}
      />,
    );
    const button = screen.getByRole("button", { name: /Global/ });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("Global");
  });

  it("stays clickable while it holds the selection, so a reader can return to it", async () => {
    const onSelect = vi.fn();
    render(
      <ChoiceButton
        level="region"
        option={{ token: "ASEAN", label: "ASEAN", hasData: true }}
        selected
        onSelect={onSelect}
        geography={geography}
      />,
    );
    const button = screen.getByRole("button", { name: /ASEAN/ });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("ASEAN");
  });

  it("shows a one-option region's members in a tooltip", () => {
    render(
      <ChoiceButton
        level="region"
        option={{ token: "ASEAN", label: "ASEAN", hasData: true }}
        selected
        onSelect={() => {}}
        geography={geography}
      />,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: /ASEAN/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("3 countries");
  });

  it("has no tooltip for Global, which carries no information", () => {
    render(
      <ChoiceButton
        level="global"
        option={{ token: "Global", label: "Global", hasData: true }}
        selected
        onSelect={() => {}}
        geography={geography}
      />,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Global/ }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("ReadOnlySector", () => {
  it("is focusable but not a control, and explains itself", async () => {
    render(
      <ReadOnlySector
        option={{ token: "Power", label: "Power", hasData: true }}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    await userEvent.tab();
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Includes power generation");
    expect(tip).toHaveTextContent(
      "Power is the only sector this pathway covers.",
    );
  });
});

it("separates the geography slots with the word 'or'", () => {
  render(<OrSeparator />);
  expect(screen.getByText("or")).toBeInTheDocument();
});
