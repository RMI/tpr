// src/components/DropdownFacetShell.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DropdownFacetShell from "./DropdownFacetShell";

function renderShell(opts?: {
  label?: string;
  active?: boolean;
  summary?: string | number | null;
  menuWidthClassName?: string;
  header?: React.ReactNode;
  children?:
    React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
}) {
  const onClear = vi.fn();
  const utils = render(
    <DropdownFacetShell
      label={opts?.label ?? "Sector"}
      active={Boolean(opts?.active)}
      summary={opts?.summary ?? "all"}
      onClear={onClear}
      menuWidthClassName={opts?.menuWidthClassName}
      header={
        opts?.header ?? (
          <>
            <div />
            <div />
          </>
        )
      }
    >
      {opts?.children ??
        (() => (
          <ul
            role="listbox"
            aria-multiselectable="true"
            data-testid="panel-list"
          >
            <li>One</li>
          </ul>
        ))}
    </DropdownFacetShell>,
  );
  return { onClear, ...utils };
}

// Safe default measurement for *all* tests in this file.
// Safe default measurement for *all* tests in this file.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      // Give buttons a width so the shell can compute minWidth
      if (
        this.tagName.toLowerCase() === "button" ||
        this.getAttribute("role") === "button"
      ) {
        return {
          width: 160,
          height: 32,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          x: 0,
          y: 0,
          toJSON() {},
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
        toJSON() {},
      };
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("DropdownFacetShell – open/close", () => {
  it("opens on trigger click; closes on outside click; closes on Escape", async () => {
    const user = userEvent.setup();
    const { container } = renderShell({ active: false, summary: "all" });
    const scope = within(container);
    const trigger = scope
      .getAllByRole("button")
      .find((el) => el.getAttribute("aria-haspopup") === "dialog")!;

    await user.click(trigger);
    const dialog = scope.getByRole("dialog", { name: /sector/i });
    expect(dialog).toBeInTheDocument();

    // click outside
    await user.click(document.body);
    expect(scope.queryByRole("dialog", { name: /sector/i })).toBeNull();

    // open again and press Escape
    await user.click(trigger);
    expect(scope.getByRole("dialog", { name: /sector/i })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(scope.queryByRole("dialog", { name: /sector/i })).toBeNull();
  });
});

describe("DropdownFacetShell – trigger affordance (ChevronDown vs X)", () => {
  it("inactive: shows ChevronDown and opens on trigger click", async () => {
    const user = userEvent.setup();
    const { container } = renderShell({ active: false, summary: "all" });
    const scope = within(container);
    const trigger = scope.getByRole("button", { name: /sector/i });
    // ChevronDown renders as an <svg> when inactive
    expect(trigger.querySelector("svg")).toBeTruthy();
    await user.click(trigger);
    expect(scope.getByRole("dialog", { name: /sector/i })).toBeInTheDocument();
  });

  it("active: shows X (clear) and clears without opening", async () => {
    const user = userEvent.setup();
    const { container, onClear } = renderShell({
      active: true,
      summary: "3 selected",
    });
    const scope = within(container);
    const trigger = scope
      .getAllByRole("button")
      .find(
        (el) => el.getAttribute("aria-haspopup") === "dialog",
      ) as HTMLButtonElement;
    const clearBtn = trigger.querySelector(
      '[aria-label^="Clear"]',
    ) as HTMLElement;
    expect(clearBtn).toBeTruthy();
    await user.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
    expect(scope.queryByRole("dialog", { name: /sector/i })).toBeNull();
  });
});

describe("DropdownFacetShell – sizing", () => {
  it("panel minWidth ≥ trigger width when no fixed class is provided", async () => {
    const user = userEvent.setup();
    const { container } = renderShell({ summary: "all" });
    const scope = within(container);

    const trigger = scope.getByRole("button", { name: /sector/i });
    await user.click(trigger);

    // The inline minWidth style is set on the dialog element itself
    const dialog = scope.getByRole("dialog", {
      name: /sector/i,
    });
    expect(dialog.getAttribute("style") || "").toMatch(/min-width:\s*160px/i);
  });

  it("fixed width class (menuWidthClassName) disables inline minWidth", async () => {
    const user = userEvent.setup();
    const { container } = renderShell({
      menuWidthClassName: "w-96",
      summary: "all",
    });
    const scope = within(container);

    const trigger = scope.getByRole("button", { name: /sector/i });
    await user.click(trigger);

    const dialog = scope.getByRole("dialog", {
      name: /sector/i,
    });
    expect(dialog.className).toMatch(/\bw-96\b/);
    expect((dialog.getAttribute("style") || "").trim()).toBe("");
  });
});

describe("DropdownFacetShell – children-as-function close()", () => {
  it("body can call api.close() to close the panel", async () => {
    const user = userEvent.setup();
    const { container } = renderShell({
      children: ({ close }) => (
        <button
          type="button"
          onClick={close}
          data-testid="close-via-api"
        >
          Close
        </button>
      ),
    });

    const scope = within(container);
    const trigger = scope.getByRole("button", { name: /sector/i });
    await user.click(trigger);
    expect(scope.getByRole("dialog", { name: /sector/i })).toBeInTheDocument();

    await user.click(scope.getByTestId("close-via-api"));
    expect(scope.queryByRole("dialog", { name: /sector/i })).toBeNull();
  });
});
