import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterAll,
} from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { ScopedContainer, type ScopeSegment } from "./ScopeTab";

/*
 * The phone-width rule: an "X < Y" half shows only X
 * when the full tab does not fit its container, and its full label again once
 * it does. jsdom has no layout, so widths are stubbed: a label's scrollWidth
 * is its text length × 5px, its clientWidth what the container leaves it.
 */

let containerWidth = 1000;
const observed = new Set<Element>();
let notify: () => void = () => undefined;

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: ResizeObserverCallback) {
        notify = () =>
          cb(
            [...observed].map((target) => ({ target }) as ResizeObserverEntry),
            this,
          );
      }
      observe(el: Element) {
        observed.add(el);
      }
      unobserve(el: Element) {
        observed.delete(el);
      }
      disconnect() {}
    },
  );
});

// Per test: the project's config restores spies after each one.
beforeEach(() => {
  const label = (el: HTMLElement) => el.hasAttribute("data-scope-label");
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return label(this) ? (this.textContent?.length ?? 0) * 5 : 0;
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      if (!label(this)) return containerWidth;
      // Each label gets an even share of the container, at most its own text.
      const labels =
        this.closest("[role=list]")!.querySelectorAll(
          "[data-scope-label]",
        ).length;
      return Math.min(
        (this.textContent?.length ?? 0) * 5,
        containerWidth / labels,
      );
    },
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const MARKED: ScopeSegment[] = [
  {
    label: "Across sectors < Power",
    short: "Across sectors",
    tone: "marked",
    tooltip: "sector",
  },
  {
    label: "Global < United States of America",
    short: "Global",
    tone: "marked",
    tooltip: "geography",
  },
];

const halves = () =>
  within(screen.getByRole("list", { name: "Scope shown" }))
    .getAllByRole("listitem")
    .map((half) => half.textContent);

describe("ScopeTab phone-width rule", () => {
  it("keeps the full labels when they fit", () => {
    containerWidth = 1000;
    render(<ScopedContainer segments={MARKED}>value</ScopedContainer>);
    expect(halves()).toEqual([
      "Across sectors < Power",
      "Global < United States of America",
    ]);
  });

  it("shows only where each value came from when they don't, and back when they do", () => {
    containerWidth = 200;
    render(<ScopedContainer segments={MARKED}>value</ScopedContainer>);
    expect(halves()).toEqual(["Across sectors", "Global"]);

    // Wider, but still short of the full tab (22 + 33 characters, 1px divider).
    containerWidth = 270;
    act(() => notify());
    expect(halves()).toEqual(["Across sectors", "Global"]);

    containerWidth = 276;
    act(() => notify());
    expect(halves()).toEqual([
      "Across sectors < Power",
      "Global < United States of America",
    ]);
  });

  it("measures only a tab that has a short form", () => {
    observed.clear();
    containerWidth = 50;
    render(
      <ScopedContainer
        segments={[
          { label: "Power", tone: "match", tooltip: "s" },
          { label: "Rest of Commonwealth", tone: "missing", tooltip: "g" },
        ]}
      >
        value
      </ScopedContainer>,
    );
    expect(observed.size).toBe(0);
    expect(halves()).toEqual(["Power", "Rest of Commonwealth"]);
  });
});
