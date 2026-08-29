import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

// Integration coverage for the tabbed layout: that the detail page routes each
// v2 section into the right tab. Lives in its own file (like the sibling detail
// tests) so it stays independently mergeable, and carries a complete v2 fixture
// — coreDrivers, dependencies and dataAvailability — that the older fixtures lack.
const fixtures = [
  {
    id: "detail-tabs",
    name: { full: "Tabbed Pathway", short: "TP" },
    description: "Pathway blurb",
    pathwayDescription: "The full pathway description prose.",
    pathwayType: "Normative",
    modelYearNetzero: 2050,
    modelTempIncrease: 1.5,
    publication: {
      publisher: { full: "Publisher X", short: "PubX" },
      title: { full: "Publication X", short: "PubTitleX" },
      year: 2024,
    },
    sectors: [{ name: "Power", technologies: [] }],
    metric: ["Capacity"],
    geography: { global: true, regions: {}, country: [] },
    keyFeatures: { emissionsTrajectory: "Significant decrease" },
    coreDrivers: {
      policies: "Carbon pricing sustained across the region.",
      emissionsTargets: null,
      technologyCosts: null,
      investmentChange: null,
      macroeconomicDrivers: null,
      behavioralShifts: null,
      otherDrivers: null,
    },
    dependencies: [
      {
        dependency_name: "Policy strategy",
        dependency_description: "Assumes sustained carbon pricing.",
        sector: "Power",
        evidence_type: "Quantitative",
      },
    ],
    dataAvailability: {
      overall: "Hosted as a single timeseries file.",
      byMetric: [
        {
          metricName: "Capacity",
          sector: "Power",
          sectorSegment: "Power generation",
          geography: "Global",
          geographyCoverage: "Global",
          timeResolution: "5-year",
          dataFormat: "Tabular in publication",
          access: "Free",
          granularity: null,
          scopeLimitations: null,
        },
      ],
    },
  },
] as const;

// Mounting is slow: a fresh dynamic import, a 300 ms load timer, and a second
// async effect for the (stubbed) timeseries index. Match the sibling tests'
// generous budgets so a real failure surfaces as itself, not a timeout.
const WAIT = { timeout: 10_000 };
const TEST_TIMEOUT = 20_000;

async function mountDetailPage(
  initialEntry = "/pathway/detail-tabs",
): Promise<void> {
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
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/pathway/:id"
          element={<PathwayDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const clickTab = (name: string): void =>
  fireEvent.click(screen.getByRole("tab", { name }));

describe("PathwayDetailPage — tabbed layout wiring", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it(
    "shows the At a glance tab by default and defers other tabs' content",
    async () => {
      await mountDetailPage();
      // Expert Overview prose is on the default tab.
      await screen.findByText(
        "The full pathway description prose.",
        undefined,
        WAIT,
      );
      // Overview- and Scope-only content is not mounted yet.
      expect(
        screen.queryByText("Assumes sustained carbon pricing."),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("columnheader", { name: "Time resolution" }),
      ).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "routes coreDrivers and dependencies into the Overview tab",
    async () => {
      await mountDetailPage();
      await screen.findByText(
        "The full pathway description prose.",
        undefined,
        WAIT,
      );

      clickTab("Overview");

      // Assumptions & Trends: the described driver and a null-driver note.
      await screen.findByRole(
        "heading",
        { name: "Assumptions & Trends Overview" },
        WAIT,
      );
      expect(
        screen.getByText("Carbon pricing sustained across the region."),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText("Not a core driver for this pathway.").length,
      ).toBeGreaterThan(0);

      // Dependencies table row.
      expect(
        screen.getByRole("rowheader", { name: "Policy strategy" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Assumes sustained carbon pricing."),
      ).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "routes dataAvailability into the Scope & Granularity tab",
    async () => {
      await mountDetailPage();
      await screen.findByText(
        "The full pathway description prose.",
        undefined,
        WAIT,
      );

      clickTab("Scope & Granularity");

      await screen.findByText("Hosted as a single timeseries file.", undefined, WAIT);
      expect(
        screen.getByRole("columnheader", { name: "Time resolution" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("rowheader", { name: "Capacity" }),
      ).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "deep-links straight to a tab from the ?tab= query param",
    async () => {
      await mountDetailPage("/pathway/detail-tabs?tab=scope");

      // The Data Availability table renders without any tab click.
      await screen.findByRole(
        "rowheader",
        { name: "Capacity" },
        WAIT,
      );
      expect(
        screen.getByRole("tab", { name: "Scope & Granularity" }),
      ).toHaveAttribute("aria-selected", "true");
    },
    TEST_TIMEOUT,
  );
});
