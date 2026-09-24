import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BadgeArray from "./BadgeArray";

describe("BadgeArray", () => {
  it("renders a Badge for each child value", () => {
    render(<BadgeArray>{["A", "B", "C"]}</BadgeArray>);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("applies a single variant to all badges", () => {
    render(<BadgeArray variant="sector">{["Power", "Aviation"]}</BadgeArray>);
    const power = screen.getByText("Power").closest("span") as HTMLElement;
    const transport = screen
      .getByText("Aviation")
      .closest("span") as HTMLElement;
    expect(power).toHaveClass("bg-solar-100");
    expect(power).toHaveClass("text-solar-800");
    expect(power).toHaveClass("border-solar-200");
    expect(transport).toHaveClass("bg-solar-100");
    expect(transport).toHaveClass("text-solar-800");
    expect(transport).toHaveClass("border-solar-200");
  });

  it("applies per-item variants when variant is an array", () => {
    render(
      <BadgeArray variant={["sector", "year"]}>{["Power", "2050"]}</BadgeArray>,
    );
    const sectorSpan = screen.getByText("Power").closest("span") as HTMLElement;
    const yearSpan = screen.getByText("2050").closest("span") as HTMLElement;
    // sector
    expect(sectorSpan).toHaveClass("bg-solar-100");
    expect(sectorSpan).toHaveClass("text-solar-800");
    expect(sectorSpan).toHaveClass("border-solar-200");
    // year
    expect(yearSpan).toHaveClass("bg-rmiblue-100");
    expect(yearSpan).toHaveClass("text-rmiblue-800");
    expect(yearSpan).toHaveClass("border-rmiblue-200");
  });

  it("supports toLabel for present values", () => {
    render(
      <BadgeArray<number> toLabel={(v) => `Y${v}`}>{[2030, 2040]}</BadgeArray>,
    );
    expect(screen.getByText("Y2030")).toBeInTheDocument();
    expect(screen.getByText("Y2040")).toBeInTheDocument();
  });

  it("renders noneLabel for nullish values", () => {
    render(<BadgeArray noneLabel="No Value">{[undefined, null]}</BadgeArray>);
    const nodes = screen.getAllByText("No Value");
    expect(nodes.length).toBe(2);
  });

  it("shows '+N more' when items are hidden by visibleCount", () => {
    render(<BadgeArray visibleCount={1}>{["A", "B", "C", "D"]}</BadgeArray>);
    expect(screen.getByText("+3 more")).toBeInTheDocument();
  });

  it("throws when variant array length does not match children length", () => {
    expect(() =>
      render(
        <BadgeArray variant={["sector"]}>{["Power", "Aviation"]}</BadgeArray>,
      ),
    ).toThrow(/length must match/);
  });

  it("throws when non-scalar children are passed", () => {
    expect(() =>
      // @ts-expect-error children must be scalar
      render(<BadgeArray>{["A", <span key="x">X</span>]}</BadgeArray>),
    ).toThrow(/children must be string \| number \| null \| undefined/);
  });
});

// --- Helpers for layout simulation in jsdom (typed, lint-safe) ---
const ORIG_RECTS = new WeakMap<HTMLElement, () => DOMRect>();
function setContainerWidth(container: HTMLElement, width: number) {
  const orig = container.getBoundingClientRect.bind(container);
  ORIG_RECTS.set(container, orig);
  container.getBoundingClientRect = () =>
    ({ left: 0, right: width, width, top: 0, bottom: 0 }) as DOMRect;
}

function restoreContainerWidth(container: HTMLElement) {
  const orig = ORIG_RECTS.get(container);
  if (orig) container.getBoundingClientRect = orig;
}

/** Force rows by stubbing offsetTop on wrapper spans (order: left→right). */
function forceRows(wrapperEls: Element[], rows: number[]) {
  // rows like [3,3,2] => first 3 items row 0, next 3 row 1, etc.
  let idx = 0;
  rows.forEach((count, rowIdx) => {
    for (let i = 0; i < count && idx < wrapperEls.length; i++, idx++) {
      const top = rowIdx * 24; // arbitrary row step
      Object.defineProperty(wrapperEls[idx], "offsetTop", {
        configurable: true,
        get() {
          return top;
        },
      });
    }
  });
  // Any remaining go to the last row
  for (; idx < wrapperEls.length; idx++) {
    const top = (rows.length - 1) * 24;
    Object.defineProperty(wrapperEls[idx], "offsetTop", {
      configurable: true,
      get() {
        return top;
      },
    });
  }
}

/** Count only REAL badge wrappers (exclude the +n token wrapper). */
function countBadgeWrappers(flex: HTMLElement): number {
  return Array.from(flex.querySelectorAll("span.inline-block")).filter((el) =>
    el.querySelector(":scope > span.inline-flex"),
  ).length;
}

describe("auto-fit & maxRows", () => {
  it("auto-fits to container width and shows '+n more' when rows exceed maxRows=1", async () => {
    const items = ["A", "B", "C", "D", "E", "F"];
    const { container } = render(<BadgeArray maxRows={1}>{items}</BadgeArray>);
    // Root flex-wrap container
    const flex = container.querySelector("div.flex.flex-wrap") as HTMLElement;
    expect(flex).toBeTruthy();

    // Narrow container (e.g., 160px). All wrappers share one row (offsetTop=0).
    setContainerWidth(flex, 160);
    const wrappers = Array.from(flex.querySelectorAll("span.inline-block"));
    // Force 2 natural rows (exceeds maxRows=1) so trimming runs.
    forceRows(wrappers, [4, 2]);

    // Kick measurement
    window.dispatchEvent(new Event("resize"));

    await waitFor(() => {
      const visibleWrappers = countBadgeWrappers(flex);
      // "+n more" must appear when items overflow one row
      const tokens = Array.from(flex.querySelectorAll("span")).filter(
        (el) =>
          /\+\d+ more/.test(el.textContent || "") &&
          el.getAttribute("aria-hidden") !== "true" &&
          !el.classList.contains("invisible"),
      );
      expect(tokens.length).toBeGreaterThan(0);
      // We definitely didn't keep all 6
      expect(visibleWrappers).toBeLessThan(items.length);
    });

    restoreContainerWidth(flex);
  });

  it("respects maxRows by collapsing excess rows with '+n more' on the last allowed row", async () => {
    const items = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const { container } = render(<BadgeArray maxRows={2}>{items}</BadgeArray>);
    const flex = container.querySelector("div.flex.flex-wrap") as HTMLElement;
    setContainerWidth(flex, 240);
    const wrappers = Array.from(flex.querySelectorAll("span.inline-block"));
    // Force 3 natural rows (3,3,2). maxRows=2 should collapse part of row 2 with a token.
    forceRows(wrappers, [3, 3, 2]);
    window.dispatchEvent(new Event("resize"));

    await waitFor(() => {
      const token = Array.from(flex.querySelectorAll("span")).find(
        (el) =>
          /\+\d+ more/.test(el.textContent || "") &&
          el.getAttribute("aria-hidden") !== "true" &&
          !el.classList.contains("invisible"),
      );
      expect(token).toBeTruthy();
      // Kept items should be <= 6 (two full rows) but > 0
      const kept = flex.querySelectorAll("span.inline-block").length;
      expect(kept).toBeGreaterThan(0);
      expect(kept).toBeLessThan(items.length);
    });
    restoreContainerWidth(flex);
  });

  it("updates when resizing narrower (keeps fewer badges)", async () => {
    const items = ["A", "B", "C", "D", "E", "F"];
    const { container } = render(<BadgeArray maxRows={2}>{items}</BadgeArray>);
    const flex = container.querySelector("div.flex.flex-wrap") as HTMLElement;
    const wrappers = Array.from(flex.querySelectorAll("span.inline-block"));
    // Start with a wide container, all on two rows (3,3)
    setContainerWidth(flex, 400);
    forceRows(wrappers, [3, 3]);
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => {
      const keptWide = countBadgeWrappers(flex);
      expect(keptWide).toBe(items.length); // wide enough → keep all
    });

    // Now narrow it; still two natural rows (3,3) but token should force trimming
    setContainerWidth(flex, 200);
    // Force MORE rows than allowed so trimming occurs
    forceRows(wrappers, [3, 2, 1]); // 3 rows > maxRows(2)
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => {
      const keptNarrow = countBadgeWrappers(flex);
      expect(keptNarrow).toBeLessThan(items.length);
      const token = Array.from(flex.querySelectorAll("span")).find(
        (el) =>
          /\+\d+ more/.test(el.textContent || "") &&
          el.getAttribute("aria-hidden") !== "true" &&
          !el.classList.contains("invisible"),
      );
      expect(token).toBeTruthy();
    });
    restoreContainerWidth(flex);
  });

  it("updates when resizing wider (keeps more badges again)", async () => {
    const items = ["A", "B", "C", "D", "E", "F", "G"];
    const { container } = render(<BadgeArray maxRows={1}>{items}</BadgeArray>);
    const flex = container.querySelector("div.flex.flex-wrap") as HTMLElement;
    const wrappers = Array.from(flex.querySelectorAll("span.inline-block"));
    // Begin narrow → force trimming on one row
    setContainerWidth(flex, 160);
    forceRows(wrappers, [4, items.length - 4]); // rows=2 > allowed=1
    // IMPORTANT: Force more natural rows than allowed (2 > 1) so trimming runs.
    forceRows(wrappers, [4, 2]);
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => {
      const keptNarrow = countBadgeWrappers(flex);
      expect(keptNarrow).toBeLessThan(items.length);
    });
    // Widen → our component should temporarily render all to measure, then keep more
    setContainerWidth(flex, 600);
    // With a wide container, rows collapse to 1 naturally
    forceRows(wrappers, [items.length]);
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => {
      const keptWide = countBadgeWrappers(flex);
      // With a wide container, all items fit on one row (maxRows=1) → keep all
      expect(keptWide).toBe(items.length);
      const token = Array.from(flex.querySelectorAll("span")).find(
        (el) =>
          /\+\d+ more/.test(el.textContent || "") &&
          el.getAttribute("aria-hidden") !== "true" &&
          !el.classList.contains("invisible"),
      );
      expect(token).toBeFalsy();
    });
    restoreContainerWidth(flex);
  });

  it("shows all items and no token when maxRows is Infinity", async () => {
    const items = ["A", "B", "C", "D", "E"];
    const { container } = render(
      <BadgeArray maxRows={Infinity}>{items}</BadgeArray>,
    );
    const flex = container.querySelector("div.flex.flex-wrap") as HTMLElement;
    setContainerWidth(flex, 120);
    const wrappers = Array.from(flex.querySelectorAll("span.inline-block"));
    forceRows(wrappers, [2, 2, 1]); // multiple rows naturally
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => {
      const kept = countBadgeWrappers(flex);
      expect(kept).toBe(items.length); // infinite rows => show all
      const token = Array.from(flex.querySelectorAll("span")).find(
        (el) =>
          /\+\d+ more/.test(el.textContent || "") &&
          el.getAttribute("aria-hidden") !== "true" &&
          !el.classList.contains("invisible"),
      );
      expect(token).toBeFalsy();
    });
    restoreContainerWidth(flex);
  });

  it("honors visibleCount override (legacy path) and ignores auto-fit", async () => {
    const { container } = render(
      <BadgeArray
        visibleCount={2}
        variant="sector"
      >
        {["A", "B", "C", "D"]}
      </BadgeArray>,
    );
    // Exactly 2 wrappers rendered; token present
    const flex = container.querySelector("div.flex.flex-wrap") as HTMLElement;
    await waitFor(() => {
      expect(countBadgeWrappers(flex)).toBe(2);
    });
    const token = Array.from(flex.querySelectorAll("span")).find(
      (el) =>
        /\+\d+ more/.test(el.textContent || "") &&
        el.getAttribute("aria-hidden") !== "true" &&
        !el.classList.contains("invisible"),
    );
    expect(token).toBeTruthy();
  });
});

describe("BadgeArray single-select toggles", () => {
  it("renders static spans and no buttons without onSelect", () => {
    // The regression guard for the four existing callers: opting out must
    // leave the markup exactly as it was.
    const { container } = render(<BadgeArray>{["Power", "Steel"]}</BadgeArray>);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelectorAll("span").length).toBeGreaterThan(0);
  });

  it("renders each badge as a toggle button when onSelect is given", () => {
    render(
      <BadgeArray
        onSelect={() => {}}
        visibleCount={Infinity}
      >
        {["Power", "Steel"]}
      </BadgeArray>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("marks the selected item pressed", () => {
    render(
      <BadgeArray
        selected="Steel"
        onSelect={() => {}}
        visibleCount={Infinity}
      >
        {["Power", "Steel"]}
      </BadgeArray>,
    );

    expect(screen.getByRole("button", { name: "Power" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Steel" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reports the clicked item", async () => {
    const onSelect = vi.fn();
    render(
      <BadgeArray
        onSelect={onSelect}
        visibleCount={Infinity}
      >
        {["Power", "Steel"]}
      </BadgeArray>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Steel" }));
    expect(onSelect).toHaveBeenCalledWith("Steel");
  });

  it("reports null when the already-selected item is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <BadgeArray
        selected="Steel"
        onSelect={onSelect}
        visibleCount={Infinity}
      >
        {["Power", "Steel"]}
      </BadgeArray>,
    );

    // Re-clicking the pressed badge is how an axis is cleared.
    await userEvent.click(screen.getByRole("button", { name: "Steel" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("keeps focus on the clicked token when the caller reorders", () => {
    // The scope ribbon pins the selected token first, so the array order
    // changes between renders. Index keys would rewrite nodes in place and
    // leave focus on whatever token moved into that slot.
    const { rerender } = render(
      <BadgeArray
        onSelect={() => {}}
        visibleCount={Infinity}
      >
        {["Power", "Steel", "Cement"]}
      </BadgeArray>,
    );

    const steel = screen.getByRole("button", { name: "Steel" });
    steel.focus();
    expect(steel).toHaveFocus();

    rerender(
      <BadgeArray
        selected="Steel"
        onSelect={() => {}}
        visibleCount={Infinity}
      >
        {["Steel", "Power", "Cement"]}
      </BadgeArray>,
    );

    expect(screen.getByRole("button", { name: "Steel" })).toHaveFocus();
  });

  it("still renders a tooltip on a toggle badge", async () => {
    render(
      <BadgeArray
        onSelect={() => {}}
        tooltipGetter={(item) => `About ${item}`}
        visibleCount={Infinity}
      >
        {["Power"]}
      </BadgeArray>,
    );

    fireEvent.focus(screen.getByRole("button"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("About Power");
  });
});
