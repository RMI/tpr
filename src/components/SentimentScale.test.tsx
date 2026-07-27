import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SentimentScale from "./SentimentScale";

const VALUES_7 = [
  "Significant increase",
  "Moderate increase",
  "Minor increase",
  "Low or no change",
  "Minor decrease",
  "Moderate decrease",
  "Significant decrease",
];

const VALUES_3 = ["Increase", "Low or no change", "Decrease"];

/** All segment divs in the scale bar (distinguished by rounded-sm, which only segments use). */
function getSegments(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[class*='rounded-sm']"),
  );
}

describe("SentimentScale", () => {
  it("renders the selected value as a text label below the scale", () => {
    render(
      <SentimentScale
        values={VALUES_7}
        selectedValue="Moderate decrease"
        greenEnd="last"
      />,
    );
    expect(screen.getByText("Moderate decrease")).toBeInTheDocument();
  });

  it("renders a 'No information' badge when selectedValue is 'No information'", () => {
    render(
      <SentimentScale
        values={VALUES_7}
        selectedValue="No information"
        greenEnd="last"
      />,
    );
    expect(screen.getByText("No information")).toBeInTheDocument();
  });

  it("renders the correct number of segments", () => {
    const { container } = render(
      <SentimentScale
        values={VALUES_7}
        selectedValue="Moderate decrease"
        greenEnd="last"
      />,
    );
    expect(getSegments(container)).toHaveLength(VALUES_7.length);
  });

  it("selected segment has h-3; all others have h-1.5", () => {
    const { container } = render(
      <SentimentScale
        values={VALUES_7}
        selectedValue="Moderate decrease"
        greenEnd="last"
      />,
    );
    const segments = getSegments(container);
    const selectedIndex = VALUES_7.indexOf("Moderate decrease");

    segments.forEach((seg, i) => {
      if (i === selectedIndex) {
        expect(seg).toHaveClass("h-3");
        expect(seg).not.toHaveClass("h-1.5");
      } else {
        expect(seg).toHaveClass("h-1.5");
        expect(seg).not.toHaveClass("h-3");
      }
    });
  });

  it("all segments have opacity-20 when value is 'No information'", () => {
    const { container } = render(
      <SentimentScale
        values={VALUES_7}
        selectedValue="No information"
        greenEnd="last"
      />,
    );
    getSegments(container).forEach((seg) => {
      expect(seg).toHaveClass("opacity-20");
    });
  });

  it("only the selected segment lacks opacity-20 when a real value is selected", () => {
    const { container } = render(
      <SentimentScale
        values={VALUES_7}
        selectedValue="Minor decrease"
        greenEnd="last"
      />,
    );
    const segments = getSegments(container);
    const selectedIndex = VALUES_7.indexOf("Minor decrease");

    segments.forEach((seg, i) => {
      if (i === selectedIndex) {
        expect(seg).not.toHaveClass("opacity-20");
      } else {
        expect(seg).toHaveClass("opacity-20");
      }
    });
  });

  it("calls tooltipGetter for every scale value", () => {
    const tooltipGetter = vi.fn().mockReturnValue("a tooltip");
    render(
      <SentimentScale
        values={VALUES_7}
        selectedValue="Minor decrease"
        greenEnd="last"
        tooltipGetter={tooltipGetter}
      />,
    );
    expect(tooltipGetter).toHaveBeenCalledTimes(VALUES_7.length);
    VALUES_7.forEach((v) => expect(tooltipGetter).toHaveBeenCalledWith(v));
  });

  it("calls tooltipGetter for every scale value even when selected value is 'No information'", () => {
    const tooltipGetter = vi.fn().mockReturnValue("a tooltip");
    render(
      <SentimentScale
        values={VALUES_7}
        selectedValue="No information"
        greenEnd="last"
        tooltipGetter={tooltipGetter}
      />,
    );
    expect(tooltipGetter).toHaveBeenCalledTimes(VALUES_7.length);
  });

  it("works correctly with a 3-step scale", () => {
    const { container } = render(
      <SentimentScale
        values={VALUES_3}
        selectedValue="Decrease"
        greenEnd="last"
      />,
    );
    expect(getSegments(container)).toHaveLength(3);
    expect(screen.getByText("Decrease")).toBeInTheDocument();
  });
});
