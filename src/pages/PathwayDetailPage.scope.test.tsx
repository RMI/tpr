import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

// End-to-end coverage for the scope ribbon (#872): that a selection reaches the
// plots and both tables. Its own file, per the one-file-per-concern convention
// the sibling detail tests state, so it stays independently mergeable.
//
// The fixture spans two sectors and three geography scopes, so every axis has
// something to include and something to exclude.
const fixtures = [
  {
    id: "detail-scope",
    name: { full: "Scoped Pathway", short: "SP" },
    description: "Pathway blurb",
    pathwayDescription: "The description prose.",
    pathwayType: "Normative",
    modelYearNetzero: 2050,
    modelTempIncrease: 1.5,
    publication: {
      publisher: { full: "Publisher S", short: "PubS" },
      title: { full: "Publication S", short: "PubTitleS" },
      year: 2024,
    },
    sectors: [
      { name: "Power", technologies: [] },
      { name: "Steel", technologies: [] },
    ],
    metric: ["Capacity"],
    geography: {
      global: true,
      regions: { "South East Asia": ["ID", "TH", "VN"] },
      country: ["SG"],
    },
    keyFeatures: {
      emissionsTrajectory: [
        {
          sector: "cross-sector",
          geography: "Global",
          value: "Significant decrease",
        },
      ],
    },
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
      {
        dependency_name: "Resource availability",
        dependency_description: "Assumes scrap availability.",
        sector: "Steel",
        evidence_type: "Qualitative",
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
        {
          metricName: "Generation",
          sector: "Power",
          sectorSegment: "Power generation",
          geography: "South East Asia",
          geographyCoverage: "Regional",
          timeResolution: "5-year",
          dataFormat: "Tabular in publication",
          access: "Free",
          granularity: null,
          scopeLimitations: null,
        },
        {
          metricName: "Absolute Emissions",
          sector: "Steel",
          sectorSegment: "No information",
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

const WAIT = { timeout: 10_000 };
const TEST_TIMEOUT = 20_000;

async function mountDetailPage(
  initialEntry = "/pathway/detail-scope",
): Promise<void> {
  vi.resetModules();
  vi.doMock("../data/pathwayMetadata", () => ({ pathwayMetadata: fixtures }));
  vi.doMock("../utils/timeseriesIndex", () => ({
    fetchTimeseriesIndex: () => Promise.resolve({}),
    datasetsForPathway: () => [],
    summarizeSummary: () => undefined,
  }));

  const { default: PathwayDetailPage } = await import("./PathwayDetailPage");
  // From the same post-reset module graph as the page, so the provider and the
  // page's useFilters share one FilterContext instance.
  const { FilterProvider } = await import("../context/FilterContext");

  render(
    <FilterProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/pathway/:id"
            element={<PathwayDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </FilterProvider>,
  );
}

const clickTab = (name: string): void => {
  fireEvent.click(screen.getByRole("tab", { name }));
};

const selectScope = async (name: string): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name }));
};

describe("PathwayDetailPage — scope ribbon (#872)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it(
    "starts unscoped, with every option offered and nothing filtered",
    async () => {
      await mountDetailPage();
      await screen.findByText("The description prose.", undefined, WAIT);

      // Every declared token is selectable, and none is pressed.
      for (const name of ["Power", "Steel", "Global", "South East Asia"]) {
        expect(screen.getByRole("button", { name })).toHaveAttribute(
          "aria-pressed",
          "false",
        );
      }
      expect(
        screen.queryByRole("button", { name: "Clear sector" }),
      ).not.toBeInTheDocument();

      clickTab("Scope & Granularity");
      await screen.findByRole("rowheader", { name: "Capacity" }, WAIT);
      expect(screen.getAllByRole("rowheader")).toHaveLength(3);
      expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "filters the availability table by the selected geography",
    async () => {
      await mountDetailPage();
      await screen.findByText("The description prose.", undefined, WAIT);

      clickTab("Scope & Granularity");
      await screen.findByRole("rowheader", { name: "Capacity" }, WAIT);

      await selectScope("South East Asia");

      // The regional row plus both Global rows; Global answers any selection.
      expect(
        screen.getAllByRole("rowheader").map((th) => th.textContent),
      ).toEqual(["Capacity", "Generation", "Absolute Emissions"]);

      await selectScope("Global");
      expect(
        screen.getAllByRole("rowheader").map((th) => th.textContent),
      ).toEqual(["Capacity", "Absolute Emissions"]);
      expect(
        screen.getByText("Showing 2 of 3 rows for Global."),
      ).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "filters both tables by the selected sector",
    async () => {
      await mountDetailPage();
      await screen.findByText("The description prose.", undefined, WAIT);

      await selectScope("Steel");

      clickTab("Overview");
      await screen.findByRole(
        "rowheader",
        { name: "Resource availability" },
        WAIT,
      );
      expect(
        screen.queryByRole("rowheader", { name: "Policy strategy" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("Showing 1 of 2 dependencies for Steel."),
      ).toBeInTheDocument();

      clickTab("Scope & Granularity");
      await screen.findByRole(
        "rowheader",
        { name: "Absolute Emissions" },
        WAIT,
      );
      expect(
        screen.getAllByRole("rowheader").map((th) => th.textContent),
      ).toEqual(["Absolute Emissions"]);
    },
    TEST_TIMEOUT,
  );

  it(
    "keeps the plots' own no-data message under any sector selection",
    async () => {
      // The sector-mismatch explanation cannot be exercised here: this mount
      // stubs datasetsForPathway empty, so there is no timeseries at all and
      // the more fundamental message correctly wins. The mismatch path itself
      // is covered in PlotGrid.test.tsx, which can supply data.
      await mountDetailPage("/pathway/detail-scope?tab=timeseries");
      await screen.findByRole("heading", { name: "Benchmark Plots" }, WAIT);

      await selectScope("Steel");

      expect(
        screen.getByText("No timeseries data available for this pathway."),
      ).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "clears an axis from the ribbon",
    async () => {
      await mountDetailPage();
      await screen.findByText("The description prose.", undefined, WAIT);

      await selectScope("Steel");
      expect(screen.getByRole("button", { name: "Steel" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await userEvent.click(
        screen.getByRole("button", { name: "Clear sector" }),
      );
      expect(screen.getByRole("button", { name: "Steel" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    },
    TEST_TIMEOUT,
  );

  it(
    "leaves the coverage panels as the unfiltered inventory",
    async () => {
      await mountDetailPage("/pathway/detail-scope?tab=scope");
      await screen.findByRole("region", { name: "Geographies" }, WAIT);

      await selectScope("Steel");

      // These answer "what does this pathway cover?" — the question the
      // selection is chosen from, so filtering them would delete the evidence.
      const sectors = screen.getByRole("region", { name: "Sectors" });
      expect(sectors).toHaveTextContent("Power");
      expect(sectors).toHaveTextContent("Steel");
    },
    TEST_TIMEOUT,
  );

  it(
    "does not re-scope key features, which await the #869 resolver",
    async () => {
      await mountDetailPage("/pathway/detail-scope?tab=overview");
      await screen.findByRole(
        "heading",
        { name: "Assumptions & Trends Overview" },
        WAIT,
      );

      const before = screen
        .getAllByRole("heading", { level: 4 })
        .map((h) => h.parentElement?.textContent);

      await selectScope("Steel");

      expect(
        screen
          .getAllByRole("heading", { level: 4 })
          .map((h) => h.parentElement?.textContent),
      ).toEqual(before);
    },
    TEST_TIMEOUT,
  );
});
