import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

// The page waits out a 300 ms load timer and BadgeArray measures itself across a
// requestAnimationFrame, so these waits are sensitive to CPU contention under
// full-suite parallelism. Give them room — but stay under vitest's 5 s
// testTimeout, or a genuine failure surfaces as an unhelpful "test timed out"
// instead of the query's own error.
const WAIT = { timeout: 2000 };

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

describe("PathwayDetailPage — geography disclaimer (#800)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("includes the region-mapping disclaimer in the Geographies tooltip", async () => {
    await mountDetailPage();

    const info = await screen.findByLabelText(
      "Geography availability information",
      undefined,
      WAIT,
    );
    fireEvent.focus(info);

    const tooltip = await screen.findByRole("tooltip", undefined, WAIT);
    // Both statements share the tooltip: what the badge shading means, and whose
    // mapping the regions represent.
    expect(tooltip).toHaveTextContent(GEOGRAPHY_AVAILABILITY_TOOLTIP);
    expect(tooltip).toHaveTextContent(REGION_MAPPING_DISCLAIMER);
  });

  it("does not add the disclaimer to the sector or metric tooltips", async () => {
    await mountDetailPage();

    const sectorInfo = await screen.findByLabelText(
      "Sector availability information",
      undefined,
      WAIT,
    );
    fireEvent.focus(sectorInfo);

    const tooltip = await screen.findByRole("tooltip", undefined, WAIT);
    expect(tooltip).not.toHaveTextContent(REGION_MAPPING_DISCLAIMER);
  });
});
