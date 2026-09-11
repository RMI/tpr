import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PathwayContextRibbon from "./PathwayContextRibbon";
import { MockIntersectionObserver } from "../test/mockIntersectionObserver";
import type { PathwayMetadataType, PathwayScopeSelection } from "../types";

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

const NO_SCOPE: PathwayScopeSelection = { sector: null, geography: null };

const renderRibbon = (
  scope: PathwayScopeSelection = NO_SCOPE,
  onScopeChange: (next: PathwayScopeSelection) => void = () => {},
) =>
  render(
    <PathwayContextRibbon
      pathway={pathway}
      scope={scope}
      onScopeChange={onScopeChange}
    >
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

  it("gives region badges a member-country tooltip, and others none", async () => {
    renderRibbon();

    // Every badge is now a toggle button, so the distinction is behavioural
    // rather than structural: only a region has members worth listing.
    const region = screen.getByRole("button", { name: "South East Asia" });
    fireEvent.focus(region);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Vietnam");
    // Blur explicitly: fireEvent.focus does not move real focus, so the open
    // tooltip would otherwise linger and mask the assertions below.
    fireEvent.blur(region);

    for (const name of ["Global", "United States of America"]) {
      const badge = screen.getByRole("button", { name });
      fireEvent.focus(badge);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      fireEvent.blur(badge);
    }
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
        scope={NO_SCOPE}
        onScopeChange={() => {}}
      >
        <div role="tablist" />
      </PathwayContextRibbon>,
    );
    scrollPast();

    expect(screen.getByText("Normative")).toBeInTheDocument();
    expect(screen.queryByText("2050")).not.toBeInTheDocument();
    expect(screen.queryByText("1.5°C")).not.toBeInTheDocument();
  });

  it("labels each axis as a group", () => {
    renderRibbon();

    expect(screen.getByRole("group", { name: "Sector" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Geography" }),
    ).toBeInTheDocument();
  });

  it("presses the badge matching the active scope, and only that one", () => {
    renderRibbon({ sector: "Power", geography: "Global" });

    expect(screen.getByRole("button", { name: "Power" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Global" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "South East Asia" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("merges a click into the existing scope rather than replacing it", async () => {
    const onScopeChange = vi.fn();
    renderRibbon({ sector: "Power", geography: null }, onScopeChange);

    await userEvent.click(
      screen.getByRole("button", { name: "South East Asia" }),
    );

    // The sector axis must survive a geography click.
    expect(onScopeChange).toHaveBeenCalledWith({
      sector: "Power",
      geography: "South East Asia",
    });
  });

  it("clears an axis when its pressed badge is clicked again", async () => {
    const onScopeChange = vi.fn();
    renderRibbon({ sector: "Power", geography: null }, onScopeChange);

    await userEvent.click(screen.getByRole("button", { name: "Power" }));

    expect(onScopeChange).toHaveBeenCalledWith({
      sector: null,
      geography: null,
    });
  });

  it("offers a Clear control only for an axis that is scoped", async () => {
    const onScopeChange = vi.fn();
    const { unmount } = renderRibbon(NO_SCOPE, onScopeChange);
    expect(
      screen.queryByRole("button", { name: "Clear sector" }),
    ).not.toBeInTheDocument();
    unmount();

    renderRibbon({ sector: "Power", geography: null }, onScopeChange);
    await userEvent.click(screen.getByRole("button", { name: "Clear sector" }));
    expect(onScopeChange).toHaveBeenCalledWith({
      sector: null,
      geography: null,
    });
  });

  it("keeps the selected token visible rather than hidden behind '+N more'", () => {
    // The ribbon pins the selection first, so a single-row collapse can never
    // swallow the badge that says what the reader is looking at.
    // The scope holds the raw token ("US"); the badge renders its label.
    renderRibbon({ sector: null, geography: "US" });

    const geographyGroup = screen.getByRole("group", { name: "Geography" });
    const first = geographyGroup.querySelector("button");
    expect(first).toHaveTextContent("United States of America");
  });

  it("reveals the remaining options on request", async () => {
    renderRibbon();

    const toggle = screen.getByRole("button", { name: "Show all" });
    await userEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: "Show fewer" }),
    ).toBeInTheDocument();
  });

  it("respects reduced motion on the collapse transition", () => {
    const { container } = renderRibbon();
    const slot = container.querySelector(
      "[class*='transition-\\[height\\]']",
    ) as HTMLElement;

    expect(slot).toHaveClass("motion-reduce:transition-none");
  });
});
