import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useElementWidth } from "./useElementWidth";

/**
 * A controllable ResizeObserver. `setup.ts` installs a silent one globally;
 * this replaces it for the duration of these tests so a resize can be driven.
 */
class ControllableResizeObserver {
  static instances: ControllableResizeObserver[] = [];

  private readonly callback: ResizeObserverCallback;
  private readonly targets = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ControllableResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
  }

  resize(width: number) {
    this.callback(
      [...this.targets].map(
        (target) =>
          ({
            target,
            contentRect: { width },
          }) as unknown as ResizeObserverEntry,
      ),
      this,
    );
  }
}

const Harness: React.FC<{ step?: number }> = ({ step }) => {
  const [width, ref] = useElementWidth(step);
  return (
    <div ref={ref}>
      <span data-testid="width">{width === null ? "(null)" : width}</span>
    </div>
  );
};

const resize = (width: number) =>
  act(() => ControllableResizeObserver.instances.at(-1)?.resize(width));

const width = () => screen.getByTestId("width").textContent;

describe("useElementWidth", () => {
  beforeEach(() => {
    ControllableResizeObserver.instances.length = 0;
    vi.stubGlobal("ResizeObserver", ControllableResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports null until the element has been measured", () => {
    // jsdom has no layout, so a caller must be able to tell "not yet measured"
    // from "zero wide" and fall back to a fixed size.
    render(<Harness />);
    expect(width()).toBe("(null)");
  });

  it("reports the observed width", () => {
    render(<Harness />);
    resize(412);
    expect(width()).toBe("412");
  });

  it("quantises to the requested step", () => {
    render(<Harness step={20} />);
    resize(412);
    expect(width()).toBe("420");

    resize(409);
    expect(width()).toBe("400");
  });

  it("holds steady across changes inside one step", () => {
    // This is the point of the step: charts re-run d3 on every width change.
    render(<Harness step={20} />);
    resize(400);
    expect(width()).toBe("400");

    resize(404);
    resize(396);
    expect(width()).toBe("400");
  });

  it("never reports zero for a non-empty step", () => {
    render(<Harness step={20} />);
    resize(4);
    expect(width()).toBe("20");
  });

  it("ignores a zero-width measurement", () => {
    // A hidden or unattached element measures 0; drawing a zero-wide chart is
    // worse than keeping the last good width.
    render(<Harness step={20} />);
    resize(400);
    resize(0);
    expect(width()).toBe("400");
  });

  it("degrades to null where ResizeObserver is unavailable", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(<Harness />);
    expect(width()).toBe("(null)");
  });
});
