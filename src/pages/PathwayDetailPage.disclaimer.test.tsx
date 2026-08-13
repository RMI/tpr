import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { REGION_MAPPING_DISCLAIMER } from "../utils/geographyUtils";
import { GEOGRAPHY_AVAILABILITY_TOOLTIP } from "../utils/timeseriesAvailability";

// NOTE ON THE FILENAME: #895 adds a `PathwayDetailPage.test.tsx`. This lives in a
// separate file so the two PRs stay independently mergeable in either order; the
// two can be folded together once both have landed.

const fixtures = [
  {
    id: "detail-disclaimer",
    name: { full: "Disclaimer Pathway", short: "D" },
    description: "Pathway description",
    expertOverview: "Overview",
    pathwayType: "Normative",
    modelYearNetzero: 2050,
    modelTempIncrease: 1.5,
    publication: {
      publisher: { full: "Publisher D", short: "PubD" },
      title: { full: "Publication D", short: "PubTitleD" },
      year: 2024,
    },
    sectors: [{ name: "Power" }],
    metric: ["Capacity"],
    geography: { global: true, regions: { "South East Asia": ["TH"] } },
    keyFeatures: { emissionsTrajectory: "Significant decrease" },
  },
] as const;

// Mounting this page is slow and contention-sensitive: vi.resetModules() forces a
// fresh dynamic import, the page then waits out a 300 ms load timer, and a second
// async effect re-renders once the (stubbed) timeseries index resolves. Under
// full-suite parallelism that can overrun a short budget, so these waits are
// generous and the tests carry a matching per-test timeout — a query budget at or
// above vitest's default 5 s testTimeout would otherwise surface a real failure as
// an unhelpful "test timed out" instead of the query's own error.
const WAIT = { timeout: 10_000 };
const TEST_TIMEOUT = 20_000;

async function mountDetailPage(): Promise<void> {
  vi.resetModules();
  vi.doMock("../data/pathwayMetadata", () => ({ pathwayMetadata: fixtures }), {
    virtual: true,
  });
  vi.doMock("../utils/timeseriesIndex", () => ({
    fetchTimeseriesIndex: () => Promise.resolve({}),
    datasetsForPathway: () => [],
    summarizeSummary: () => undefined,
  }));

  const { default: PathwayDetailPage } = await import("./PathwayDetailPage");

  render(
    <MemoryRouter initialEntries={["/pathway/detail-disclaimer"]}>
      <Routes>
        <Route
          path="/pathway/:id"
          element={<PathwayDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Focus an ⓘ trigger by its aria-label and resolve with the tooltip it opens.
 *
 * The focus is re-fired on every poll rather than dispatched once. The trigger is
 * in the DOM as soon as React commits, but it only listens once React has flushed
 * TextWithTooltip's passive effect and attached its focus listener. Those are
 * separate ticks, so a single up-front dispatch can be delivered to an element
 * that is not yet listening — the event is dropped, no state changes, and the wait
 * then times out with "Unable to find role=tooltip" however long its budget is.
 */
const openTooltipFor = async (ariaLabel: string): Promise<HTMLElement> => {
  let tooltip: HTMLElement | null = null;
  await waitFor(() => {
    fireEvent.focus(screen.getByLabelText(ariaLabel));
    tooltip = screen.getByRole("tooltip");
  }, WAIT);
  return tooltip as unknown as HTMLElement;
};

describe("PathwayDetailPage — geography disclaimer (#800)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it(
    "includes the region-mapping disclaimer in the Geographies tooltip",
    async () => {
      await mountDetailPage();
      await screen.findByLabelText(
        "Geography availability information",
        undefined,
        WAIT,
      );

      const tooltip = await openTooltipFor(
        "Geography availability information",
      );
      // Both statements share the tooltip: what the badge shading means, and
      // whose mapping the regions represent.
      expect(tooltip).toHaveTextContent(GEOGRAPHY_AVAILABILITY_TOOLTIP);
      expect(tooltip).toHaveTextContent(REGION_MAPPING_DISCLAIMER);
    },
    TEST_TIMEOUT,
  );

  it(
    "does not add the disclaimer to the sector or metric tooltips",
    async () => {
      await mountDetailPage();
      await screen.findByLabelText(
        "Sector availability information",
        undefined,
        WAIT,
      );

      const tooltip = await openTooltipFor("Sector availability information");
      expect(tooltip).not.toHaveTextContent(REGION_MAPPING_DISCLAIMER);
    },
    TEST_TIMEOUT,
  );
});
