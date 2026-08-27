import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { REGION_MAPPING_DISCLAIMER } from "../utils/geographyUtils";
import { GEOGRAPHY_AVAILABILITY_TOOLTIP } from "../utils/timeseriesAvailability";

// Mirrors PathwayDetailPage.disclaimer.test.tsx (#800): the comparison view's
// Geographies (i) hover reuses the same disclaimer, so it gets the same coverage.

const fixtures = [
  {
    id: "cmp-disclaimer-a",
    name: { full: "Disclaimer Pathway A", short: "A" },
    description: "Pathway A description",
    pathwayType: "Net Zero",
    modelYearNetzero: 2050,
    modelTempIncrease: 1.5,
    publication: {
      publisher: { full: "Publisher A", short: "PubA" },
      title: { full: "Publication A", short: "PubTitleA" },
      year: 2024,
    },
    sectors: [{ name: "Power" }],
    metric: ["Capacity"],
    geography: { global: true, regions: { Europe: [] } },
    keyFeatures: { emissionsTrajectory: "foo" },
  },
  {
    id: "cmp-disclaimer-b",
    name: { full: "Disclaimer Pathway B", short: "B" },
    description: "Pathway B description",
    pathwayType: "BAU",
    modelYearNetzero: 2040,
    modelTempIncrease: 2,
    publication: {
      publisher: { full: "Publisher B", short: "PubB" },
      title: { full: "Publication B", short: "PubTitleB" },
      year: 2023,
    },
    sectors: [{ name: "Steel" }],
    metric: ["Generation"],
    geography: { country: ["DE"] },
    keyFeatures: { emissionsTrajectory: "bar" },
  },
] as const;

async function mountWithFixtures(): Promise<void> {
  vi.resetModules();
  vi.doMock("../data/pathwayMetadata", () => ({ pathwayMetadata: fixtures }), {
    virtual: true,
  });
  vi.doMock("../utils/timeseriesIndex", () => ({
    fetchTimeseriesIndex: () => Promise.resolve({}),
    datasetsForPathway: () => [],
    summarizeSummary: () => undefined,
  }));

  const [{ default: ComparisonPage }, { ComparisonProvider }] =
    await Promise.all([
      import("./ComparisonPage"),
      import("../context/ComparisonContext"),
    ]);

  render(
    <MemoryRouter
      initialEntries={["/compare?ids=cmp-disclaimer-a,cmp-disclaimer-b"]}
    >
      <ComparisonProvider>
        <ComparisonPage />
      </ComparisonProvider>
    </MemoryRouter>,
  );
}

/** See PathwayDetailPage.disclaimer.test.tsx for why focus is re-fired on poll. */
const openTooltipFor = async (ariaLabel: string): Promise<HTMLElement> => {
  let tooltip: HTMLElement | null = null;
  await waitFor(() => {
    fireEvent.focus(screen.getByLabelText(ariaLabel));
    tooltip = screen.getByRole("tooltip");
  });
  return tooltip as unknown as HTMLElement;
};

describe("ComparisonPage — geography disclaimer (#894)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("includes the region-mapping disclaimer in the Geographies tooltip", async () => {
    await mountWithFixtures();
    await screen.findByLabelText("Geography availability information");

    const tooltip = await openTooltipFor("Geography availability information");
    expect(tooltip).toHaveTextContent(GEOGRAPHY_AVAILABILITY_TOOLTIP);
    expect(tooltip).toHaveTextContent(REGION_MAPPING_DISCLAIMER);
  });

  it("does not add the disclaimer to the sector or metric tooltips", async () => {
    await mountWithFixtures();
    await screen.findByLabelText("Sector availability information");

    const sectorTooltip = await openTooltipFor(
      "Sector availability information",
    );
    expect(sectorTooltip).not.toHaveTextContent(REGION_MAPPING_DISCLAIMER);
    fireEvent.blur(screen.getByLabelText("Sector availability information"));

    const metricTooltip = await openTooltipFor(
      "Benchmark metric availability information",
    );
    expect(metricTooltip).not.toHaveTextContent(REGION_MAPPING_DISCLAIMER);
  });
});
