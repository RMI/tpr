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

describe("ChoiceButton for a country", () => {
  const geo = {
    country: { CN: ["CN", "HK"], JP: ["JP"] },
  } as unknown as Geography;

  it("shows a one-option country's member codes in a tooltip", () => {
    // NGFS-NZ2050-MESSAGE-2024's only country is China, including Hong Kong.
    render(
      <ChoiceButton
        level="country"
        option={{
          token: "CN",
          label: "People's Republic of China",
          hasData: true,
        }}
        selected
        onSelect={() => {}}
        geography={geo}
      />,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: /China/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Also includes");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Hong Kong");
  });

  it("has no tooltip for a country that is just itself", () => {
    render(
      <ChoiceButton
        level="country"
        option={{ token: "JP", label: "Japan", hasData: true }}
        selected
        onSelect={() => {}}
        geography={geo}
      />,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Japan/ }));
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

/*
 * The compact size, for the comparison header (comparison-ribbon-spec §3).
 * jsdom has no layout, so a cut-off label is simulated by its widths.
 */
describe("compact size", () => {
  const geo = { country: { JP: ["JP"] } } as unknown as Geography;
  const japan = { token: "JP", label: "Japan", hasData: true };

  /** Make every element report its text as wider than its box. */
  const cutOff = () => {
    const sw = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollWidth",
    );
    const cw = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "clientWidth",
    );
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 80,
    });
    return () => {
      if (sw) Object.defineProperty(HTMLElement.prototype, "scrollWidth", sw);
      else
        delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
      if (cw) Object.defineProperty(HTMLElement.prototype, "clientWidth", cw);
      else
        delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    };
  };

  it("is one step smaller, and can shrink in a narrow column", () => {
    render(
      <ChoiceButton
        level="country"
        option={japan}
        selected
        onSelect={() => {}}
        geography={geo}
        size="compact"
      />,
    );
    const button = screen.getByRole("button", { name: /Japan/ });
    expect(button.className).toContain("h-7");
    expect(button.className).toContain("text-xs");
    expect(button.className).toContain("min-w-0");
    expect(button.querySelector("svg")).toHaveAttribute("width", "12");
  });

  it("gives a plain option its full name in a tooltip when the name is cut off", () => {
    const restore = cutOff();
    try {
      render(
        <ChoiceButton
          level="country"
          option={japan}
          selected
          onSelect={() => {}}
          geography={geo}
          size="compact"
        />,
      );
      fireEvent.mouseEnter(screen.getByRole("button", { name: /Japan/ }));
      expect(screen.getByRole("tooltip")).toHaveTextContent("Japan");
    } finally {
      restore();
    }
  });

  it("adds no tooltip repeating a name that fits", () => {
    render(
      <ChoiceButton
        level="country"
        option={japan}
        selected
        onSelect={() => {}}
        geography={geo}
        size="compact"
      />,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Japan/ }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("leaves the default size as it was", () => {
    render(
      <ChoiceButton
        level="country"
        option={japan}
        selected
        onSelect={() => {}}
        geography={geo}
      />,
    );
    const button = screen.getByRole("button", { name: /Japan/ });
    expect(button.className).toContain("h-8");
    expect(button.querySelector("svg")).toHaveAttribute("width", "14");
  });
});
