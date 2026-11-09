import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render } from "@testing-library/react";
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

  it("highlights a line and its label, without a tooltip, while its label is hovered", () => {
    const onHoverPoint = vi.fn();
    const { container } = render(
      <MultiLineChart
        data={data}
        onHoverPoint={onHoverPoint}
      />,
    );
    const solarLabel = labels(container)[1];

    fireEvent.pointerEnter(container.querySelector("svg")!);
    fireEvent.pointerMove(solarLabel);

    const strokes = Array.from(container.querySelectorAll(".line")).map(
      (line) => [
        line.getAttribute("data-technology"),
        line.getAttribute("stroke"),
      ],
    );
    expect(strokes).toEqual(
      expect.arrayContaining([
        ["solar", "var(--color-donate)"],
        ["coal", "#ddd"],
      ]),
    );
    expect(solarLabel.getAttribute("fill")).toBe("var(--color-donate)");
    expect(container.querySelector(".tooltip")).toHaveAttribute(
      "display",
      "none",
    );
    // Sibling charts highlight the series too, with no year to show.
    expect(onHoverPoint).toHaveBeenLastCalledWith({
      technology: "solar",
      year: null,
    });
  });

  it("selects the line whose label is clicked", () => {
    const { container } = render(<MultiLineChart data={data} />);
    const solarLabel = labels(container)[1];

    fireEvent.click(solarLabel);

    expect(solarLabel.getAttribute("fill")).toBe("var(--color-donate)");
    expect(
      container
        .querySelector('.line[data-technology="solar"]')
        ?.getAttribute("stroke"),
    ).toBe("var(--color-donate)");
  });
});
