import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import PathwayContextRibbon from "./PathwayContextRibbon";
import { MockIntersectionObserver } from "../test/mockIntersectionObserver";
import type { PathwayMetadataType } from "../types";

const pathway = {
  id: "ribbon-fixture",
  name: { full: "Ribbon Test Pathway", short: "RTP" },
  pathwayType: "Normative",
  modelYearNetzero: 2050,
  modelTempIncrease: 1.5,
  sectors: [{ name: "Power", technologies: [] }],
  geography: {
    global: true,
    regions: { "South East Asia": ["VN", "TH"] },
    country: ["US"],
  },
} as unknown as PathwayMetadataType;

const renderRibbon = () =>
  render(
    <PathwayContextRibbon pathway={pathway}>
      <div role="tablist">
        <button role="tab">At a glance</button>
      </div>
    </PathwayContextRibbon>,
  );

/** Drive the sentinel past the top of the viewport. */
const scrollPast = () =>
  act(() => {
    const observer = MockIntersectionObserver.instances.at(-1);
    const sentinel = document.querySelector("[aria-hidden='true']");
    observer?.trigger(sentinel as Element, false, { top: -10 });
  });

/** Sentinel below the viewport — not intersecting, but not scrolled past. */
const scrollBelow = () =>
  act(() => {
    const observer = MockIntersectionObserver.instances.at(-1);
    const sentinel = document.querySelector("[aria-hidden='true']");
    observer?.trigger(sentinel as Element, false, { top: 800 });
  });

describe("PathwayContextRibbon", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
  });

  it("lists the pathway's sectors and geographies", () => {
    renderRibbon();

    expect(screen.getByText("Sector")).toBeInTheDocument();
    expect(screen.getByText("Power")).toBeInTheDocument();

    expect(screen.getByText("Geography")).toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("South East Asia")).toBeInTheDocument();
    // Country codes are shown by name, as elsewhere on the page.
    expect(screen.getByText("United States of America")).toBeInTheDocument();
  });

  it("gives region badges a member-country tooltip, and others none", () => {
    renderRibbon();

    const trigger = (label: string) =>
      screen.getByText(label).closest("[tabindex]");

    expect(trigger("South East Asia")).not.toBeNull();
    expect(trigger("Global")).toBeNull();
    expect(trigger("United States of America")).toBeNull();
  });

  it("keeps the tab list rendered and reachable", () => {
    renderRibbon();

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "At a glance" })).toBeVisible();
  });

  it("collapses the condensed title until the header scrolls away", () => {
    const { container } = renderRibbon();

    const slot = container.querySelector(
      "[class*='transition-\\[height\\]']",
    ) as HTMLElement;
    expect(slot).toHaveClass("h-0");
    expect(slot).not.toHaveClass("h-10");

    scrollPast();
    expect(slot).toHaveClass("h-10");
    expect(slot).not.toHaveClass("h-0");
  });

  it("stays expanded when the sentinel is merely below the viewport", () => {
    const { container } = renderRibbon();
    const slot = container.querySelector(
      "[class*='transition-\\[height\\]']",
    ) as HTMLElement;

    // IntersectionObserver also reports not-intersecting for a sentinel below
    // the fold; that must not be mistaken for "scrolled past".
    scrollBelow();
    expect(slot).toHaveClass("h-0");
  });

  it("restates the title without adding a second heading", () => {
    renderRibbon();
    scrollPast();

    // The condensed bar repeats the name visually only — the page's single <h1>
    // lives in the full header and stays in the accessibility tree regardless.
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("RTP")).toBeInTheDocument();
  });

  it("shows the type, net-zero year and warming pills when condensed", () => {
    renderRibbon();
    scrollPast();

    expect(screen.getByText("Normative")).toBeInTheDocument();
    expect(screen.getByText("2050")).toBeInTheDocument();
    expect(screen.getByText("1.5°C")).toBeInTheDocument();
  });

  it("omits the optional pills when the pathway lacks those values", () => {
    render(
      <PathwayContextRibbon
        pathway={
          {
            ...pathway,
            modelYearNetzero: null,
            modelTempIncrease: null,
          } as unknown as PathwayMetadataType
        }
      >
        <div role="tablist" />
      </PathwayContextRibbon>,
    );
    scrollPast();

    expect(screen.getByText("Normative")).toBeInTheDocument();
    expect(screen.queryByText("2050")).not.toBeInTheDocument();
    expect(screen.queryByText("1.5°C")).not.toBeInTheDocument();
  });

  it("respects reduced motion on the collapse transition", () => {
    const { container } = renderRibbon();
    const slot = container.querySelector(
      "[class*='transition-\\[height\\]']",
    ) as HTMLElement;

    expect(slot).toHaveClass("motion-reduce:transition-none");
  });
});
