import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
// The chart's axes transition; in the app NormalizedStackedAreaChart loads this.
import "d3-transition";
import MultiLineChart from "./MultiLineChart";

function row(technology: string, year: string, value: number) {
  return {
    sector: "power",
    metric: "capacity",
    year,
    technology,
    value,
    geography: "Global",
    unit: "GW",
  };
}

// Ends in 2035, well before the x-axis does.
const data = {
  data: [
    row("coal", "2023", 10),
    row("coal", "2035", 5),
    row("solar", "2023", 1),
    row("solar", "2035", 20),
  ],
};

function labels(container: HTMLElement) {
  return Array.from(container.querySelectorAll<SVGTextElement>(".label"));
}

describe("MultiLineChart", () => {
  // jsdom cannot interpolate SVG transforms, so keep the axis transitions
  // from ever ticking.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps line labels right of the plot area when the lines end early", () => {
    const { container } = render(
      <MultiLineChart
        data={data}
        width={600}
        marginRight={80}
      />,
    );

    expect(labels(container).map((l) => l.textContent)).toEqual([
      "Coal",
      "Solar",
    ]);
    for (const label of labels(container)) {
      expect(label.getAttribute("x")).toBe("520");
    }
  });

  it("colours the highlighted line's label like the line", () => {
    const { container, rerender } = render(<MultiLineChart data={data} />);
    const fills = () => labels(container).map((l) => l.getAttribute("fill"));

    // The first technology starts out selected.
    expect(fills()).toEqual(["var(--color-donate)", null]);

    rerender(
      <MultiLineChart
        data={data}
        // A year without a solar row, so no tooltip, which needs getBBox.
        externalHoveredPoint={{ technology: "solar", year: "2030" }}
      />,
    );
    expect(fills()).toEqual([null, "var(--color-donate)"]);

    rerender(
      <MultiLineChart
        data={data}
        externalHoveredPoint={null}
      />,
    );
    expect(fills()).toEqual(["var(--color-donate)", null]);
  });
});
