import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

// Structured-geography fixture (#799): one region the publication mapped to three
// countries, one it declared but left unmapped (the NGFS shape), plus a global flag
// and a standalone country so the non-region badges are covered too.
const fixtures = [
  {
    id: "detail-a",
    name: { full: "Detail Pathway A", short: "A" },
    description: "Pathway A description",
    expertOverview: "Overview A",
    pathwayType: "Normative",
    modelYearNetzero: 2050,
    modelTempIncrease: 1.5,
    publication: {
      publisher: { full: "Publisher A", short: "PubA" },
      title: { full: "Publication A", short: "PubTitleA" },
      year: 2024,
    },
    sectors: [{ name: "Power" }],
    metric: ["Capacity"],
    geography: {
      global: true,
      regions: {
        "South East Asia": ["VN", "ID", "TH"],
        "Unmapped Region": [],
      },
      country: ["US"],
    },
    keyFeatures: { emissionsTrajectory: "Significant decrease" },
  },
] as const;

async function mountDetailPage(id: string): Promise<void> {
  // Reset the module graph so the mocks below apply to the next import.
  vi.resetModules();

  // The page reads pathwayMetadata at module load, so mock BEFORE importing it.
  vi.doMock("../data/pathwayMetadata", () => ({ pathwayMetadata: fixtures }), {
    virtual: true,
  });
  // Keep the timeseries fetch out of the test: no network, no async plot loading.
  // With no datasets, every badge takes its "-pub" (outlined) variant, which does
  // not affect the tooltip wiring under test.
  vi.doMock("../utils/timeseriesIndex", () => ({
    fetchTimeseriesIndex: () => Promise.resolve({}),
    datasetsForPathway: () => [],
    summarizeSummary: () => undefined,
  }));

  const { default: PathwayDetailPage } = await import("./PathwayDetailPage");

  render(
    <MemoryRouter initialEntries={[`/pathway/${id}`]}>
      <Routes>
        <Route
          path="/pathway/:id"
          element={<PathwayDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// Mounting this page is slow and contention-sensitive: vi.resetModules() forces a
// fresh dynamic import, the page then waits out a 300 ms load timer, and a second
// async effect re-renders once the (stubbed) timeseries index resolves. Under
// full-suite parallelism that can overrun a short budget, so these waits are
// generous and the tests carry a matching per-test timeout — a query budget at or
// above vitest's default 5 s testTimeout would otherwise surface a real failure as
// an unhelpful "test timed out" instead of the query's own error.
const WAIT = { timeout: 10_000 };
const TEST_TIMEOUT = 20_000;

/** The TextWithTooltip trigger wrapping a badge (it carries tabIndex=0). */
const triggerFor = (label: string): HTMLElement => {
  const badge = screen.getByText(label);
  const trigger = badge.closest("[tabindex]");
  if (!(trigger instanceof HTMLElement)) {
    throw new Error(`No tooltip trigger found for badge "${label}"`);
  }
  return trigger;
};

/**
 * Focus a badge's tooltip trigger and resolve with the tooltip it opens.
 *
 * The focus is re-fired on every poll rather than dispatched once. A badge's text
 * lands in the DOM as soon as React commits, but the trigger only becomes
 * interactive once React flushes TextWithTooltip's passive effect and attaches its
 * focus listener. Those are separate ticks, so a single up-front dispatch can be
 * delivered to an element that is not yet listening — the event is dropped, no
 * state changes, and the wait then times out with "Unable to find role=tooltip"
 * no matter how long its budget is. Re-firing makes the wait self-healing.
 */
const openTooltipFor = async (label: string): Promise<HTMLElement> => {
  let tooltip: HTMLElement | null = null;
  await waitFor(() => {
    fireEvent.focus(triggerFor(label));
    tooltip = screen.getByRole("tooltip");
  }, WAIT);
  return tooltip as unknown as HTMLElement;
};

describe("PathwayDetailPage — region geography tooltips", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it(
    "makes region badges hoverable and lists the mapped countries by name",
    async () => {
      await mountDetailPage("detail-a");

      const badge = await screen.findByText("South East Asia", undefined, WAIT);
      expect(badge).toBeInTheDocument();

      // Focus is the keyboard-equivalent of hover in TextWithTooltip, and the
      // only one jsdom drives reliably; the body is portaled to document.body.
      const tooltip = await openTooltipFor("South East Asia");
      expect(tooltip).toHaveTextContent("3 countries");
      expect(tooltip).toHaveTextContent("Indonesia");
      expect(tooltip).toHaveTextContent("Thailand");
      expect(tooltip).toHaveTextContent("Vietnam");
    },
    TEST_TIMEOUT,
  );

  it(
    "tells the user when a declared region has no published mapping",
    async () => {
      await mountDetailPage("detail-a");

      await screen.findByText("Unmapped Region", undefined, WAIT);

      const tooltip = await openTooltipFor("Unmapped Region");
      expect(tooltip).toHaveTextContent("No country mapping available");
    },
    TEST_TIMEOUT,
  );

  it(
    "leaves Global and country badges without a tooltip trigger",
    async () => {
      await mountDetailPage("detail-a");

      // "Global" and the country name render as plain badges: no tabbable
      // wrapper, so there is nothing to hover.
      const global = await screen.findByText("Global", undefined, WAIT);
      expect(global.closest("[tabindex]")).toBeNull();

      const country = screen.getByText("United States of America");
      expect(country.closest("[tabindex]")).toBeNull();
    },
    TEST_TIMEOUT,
  );
});
