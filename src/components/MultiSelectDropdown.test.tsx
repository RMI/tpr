import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MultiSelectDropdown from "./MultiSelectDropdown";

describe("<MultiSelectDropdown>", () => {
  function MultiSelectDropdownHarness<T extends string | number>(props: {
    options: { value: T; label: string }[];
    initial?: T[] | null;
    label?: string;
    onChange?: (next: T[]) => void;
  }) {
    const { options, initial = null, label, onChange } = props;
    const [val, setVal] = React.useState<T[] | null>(initial);
    return (
      <MultiSelectDropdown<T>
        label={label}
        options={options}
        value={val}
        onChange={(next) => {
          setVal(next);
          onChange?.(next);
        }}
      />
    );
  }

  it("emits string[] on selection toggles (controlled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MultiSelectDropdownHarness
        options={[
          { value: "EU", label: "Europe" },
          { value: "US", label: "United States" },
        ]}
        initial={[]}
        onChange={onChange}
      />,
    );

    // open
    await user.click(screen.getByRole("button", { name: /select/i }));

    // toggle EU → ["EU"]
    await user.click(screen.getByLabelText("Europe"));
    expect(onChange).toHaveBeenLastCalledWith(["EU"]);

    // toggle US → ["EU","US"]
    await user.click(screen.getByLabelText("United States"));
    expect(onChange).toHaveBeenLastCalledWith(["EU", "US"]);

    // untoggle EU → ["US"]
    await user.click(screen.getByLabelText("Europe"));
    expect(onChange).toHaveBeenLastCalledWith(["US"]);
  });

  it("supports number values and null value without crashing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiSelectDropdownHarness<number>
        label="Years"
        options={[
          { value: 2025, label: "2025" },
          { value: 2030, label: "2030" },
        ]}
        initial={null} // null-safe
        onChange={onChange}
      />,
    );

    // open
    await user.click(screen.getByRole("button", { name: /years/i }));

    // toggle 2025
    await user.click(screen.getByLabelText("2025"));
    expect(onChange).toHaveBeenLastCalledWith([2025]);

    // toggle 2030
    await user.click(screen.getByLabelText("2030"));
    expect(onChange).toHaveBeenLastCalledWith([2025, 2030]);
  });
});

describe("MultiSelectDropdown – menu header layout & interactions", () => {
  // Stable width mock so the menu open effect doesn't throw in JSDOM
  const originalGetBCR = HTMLElement.prototype.getBoundingClientRect.bind(
    HTMLElement.prototype,
  );

  beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = vi.fn(function (
      this: HTMLElement,
    ) {
      if (
        this.getAttribute("role") === "button" ||
        this.tagName.toLowerCase() === "button"
      ) {
        return {
          width: 200,
          height: 32,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          x: 0,
          y: 0,
          toJSON: () => {},
        };
      }
      return {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      };
    });
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBCR;
  });

  function renderOpenMenu(ui: React.ReactElement) {
    render(ui);
    // Shell uses aria-haspopup="dialog"; just click the first button (facet trigger)
    const [trigger] = screen.getAllByRole("button");
    fireEvent.click(trigger);
  }

  it("shows left actions and right, bordered, right-justified explainer block", () => {
    renderOpenMenu(
      <MultiSelectDropdown
        label="Geography"
        options={[
          { value: "na", label: "North America" },
          { value: "eu", label: "Europe" },
        ]}
        value={[]}
        onChange={() => {}}
        showModeToggle
        mode="ANY"
        onModeChange={() => {}}
      />,
    );

    // Left actions present; "Select all" uses whitespace-nowrap
    const selectAll = screen.getByRole("button", { name: /select all/i });
    const clearBtn = screen.getByRole("button", { name: /^clear$/i });
    expect(selectAll).toBeInTheDocument();
    expect(clearBtn).toBeInTheDocument();
    expect(selectAll.className).toMatch(/\bwhitespace-nowrap\b/);

    // Right block: two-line text and a bordered Any/All + "selected"
    const explainer = screen.getByTestId("mode-explainer");
    expect(explainer).toBeInTheDocument();
    // Right-justified container
    expect(explainer.parentElement?.className).toMatch(/\btext-right\b/);
    // First line
    expect(screen.getByText(/Show pathways matching/i)).toBeInTheDocument();

    const toggle = screen.getByTestId("mode-toggle");
    expect(toggle).toHaveAttribute("role", "button"); // single large target
    expect(within(toggle).getByText(/^Any$/)).toBeInTheDocument();
    expect(within(toggle).getByText(/^All$/)).toBeInTheDocument();
    // The toggle itself should carry the border class
    expect(toggle.className).toMatch(/\bborder\b/);
    // Trailing "selected" text is present
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
  });

  it("disables 'Select all' when all options are already selected", () => {
    // All selected -> Select all disabled, Clear enabled
    renderOpenMenu(
      <MultiSelectDropdown
        label="Sector"
        options={[
          { value: "p", label: "Power" },
          { value: "t", label: "Aviation" },
        ]}
        value={["p", "t"]}
        onChange={() => {}}
        showModeToggle
        mode="ANY"
        onModeChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /select all/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^clear$/i })).not.toBeDisabled();
  });

  it("disables 'Clear' when none selected", () => {
    // None selected -> Select all enabled, Clear disabled
    renderOpenMenu(
      <MultiSelectDropdown
        label="Sector"
        options={[
          { value: "p", label: "Power" },
          { value: "t", label: "Aviation" },
        ]}
        value={[]}
        onChange={() => {}}
        showModeToggle
        mode="ANY"
        onModeChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /select all/i }),
    ).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^clear$/i })).toBeDisabled();
  });

  it("mode toggle calls onModeChange", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={[{ value: "A", label: "A" }]}
        value={[]}
        onChange={() => {}}
        showModeToggle
        mode="ANY"
        onModeChange={onModeChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /select/i }));
    const toggle = screen.getByTestId("mode-toggle");
    // Starts at ANY; one click switches to ALL
    await user.click(toggle);
    expect(onModeChange).toHaveBeenLastCalledWith("ALL");
  });

  it("toggles mode with keyboard (Space/Enter)", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={[{ value: "A", label: "A" }]}
        value={[]}
        onChange={() => {}}
        showModeToggle
        mode="ANY"
        onModeChange={onModeChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /select/i }));
    const toggle = screen.getByTestId("mode-toggle");

    toggle.focus();
    await user.keyboard("[Space]");
    expect(onModeChange).toHaveBeenLastCalledWith("ALL");

    await user.keyboard("[Enter]");
    expect(onModeChange).toHaveBeenLastCalledWith("ALL");
  });

  it("closes panel when closeOnSelect is true", async () => {
    const u = userEvent.setup();
    render(
      <MultiSelectDropdown
        label="Sector"
        options={[
          { value: "p", label: "Power" },
          { value: "t", label: "Aviation" },
        ]}
        value={[]}
        onChange={() => {}}
        closeOnSelect
      />,
    );

    // open
    const trigger = screen.getByRole("button", { name: /^sector\b/i });
    await u.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    // click an option checkbox
    const checkbox = screen.getByRole("checkbox", { name: /power/i });
    await u.click(checkbox);

    // should close via api.close() wired in shell children
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
