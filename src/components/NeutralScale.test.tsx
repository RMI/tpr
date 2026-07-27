import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NeutralScale from "./NeutralScale";

const VALUES = [
  "No policies included",
  "Current/legislated policies",
  "Current and drafted policies",
  "NDCs, unconditional only",
  "NDCs incl. conditional targets",
  "High ambition policies",
  "Other policy ambition",
];

/** All segment divs in the scale bar (distinguished by rounded-sm, which only segments use). */
function getSegments(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[class*='rounded-sm']"),
  );
}

describe("NeutralScale", () => {
  it("renders the selected value as a text label below the scale", () => {
    render(
      <NeutralScale
        values={VALUES}
        selectedValue="NDCs incl. conditional targets"
      />,
    );
    expect(
      screen.getByText("NDCs incl. conditional targets"),
    ).toBeInTheDocument();
  });

  it("renders a 'No information' badge when selectedValue is 'No information'", () => {
    render(
      <NeutralScale
        values={VALUES}
        selectedValue="No information"
      />,
    );
    expect(screen.getByText("No information")).toBeInTheDocument();
  });

  it("renders the correct number of segments", () => {
    const { container } = render(
      <NeutralScale
        values={VALUES}
        selectedValue="High ambition policies"
      />,
    );
    expect(getSegments(container)).toHaveLength(VALUES.length);
  });

  it("selected segment has bg-rmiblue-400; all others have bg-neutral-200", () => {
    const { container } = render(
      <NeutralScale
        values={VALUES}
        selectedValue="High ambition policies"
      />,
    );
    const segments = getSegments(container);
    const selectedIndex = VALUES.indexOf("High ambition policies");

    segments.forEach((seg, i) => {
      if (i === selectedIndex) {
        expect(seg).toHaveClass("bg-rmiblue-400");
        expect(seg).not.toHaveClass("bg-neutral-200");
      } else {
        expect(seg).toHaveClass("bg-neutral-200");
        expect(seg).not.toHaveClass("bg-rmiblue-400");
      }
    });
  });

  it("selected segment has h-3; all others have h-1.5", () => {
    const { container } = render(
      <NeutralScale
        values={VALUES}
        selectedValue="Current/legislated policies"
      />,
    );
    const segments = getSegments(container);
    const selectedIndex = VALUES.indexOf("Current/legislated policies");

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

  it("all segments show bg-neutral-200 when value is 'No information'", () => {
    const { container } = render(
      <NeutralScale
        values={VALUES}
        selectedValue="No information"
      />,
    );
    getSegments(container).forEach((seg) => {
      expect(seg).toHaveClass("bg-neutral-200");
      expect(seg).not.toHaveClass("bg-rmiblue-400");
    });
  });

  it("calls tooltipGetter for every scale value", () => {
    const tooltipGetter = vi.fn().mockReturnValue("a tooltip");
    render(
      <NeutralScale
        values={VALUES}
        selectedValue="High ambition policies"
        tooltipGetter={tooltipGetter}
      />,
    );
    expect(tooltipGetter).toHaveBeenCalledTimes(VALUES.length);
    VALUES.forEach((v) => expect(tooltipGetter).toHaveBeenCalledWith(v));
  });

  it("calls tooltipGetter for every scale value even when selected value is 'No information'", () => {
    const tooltipGetter = vi.fn().mockReturnValue("a tooltip");
    render(
      <NeutralScale
        values={VALUES}
        selectedValue="No information"
        tooltipGetter={tooltipGetter}
      />,
    );
    expect(tooltipGetter).toHaveBeenCalledTimes(VALUES.length);
  });
});
