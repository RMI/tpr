import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
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
      // Nothing but a key feature, which is enough to make it selectable.
      { name: "Buildings", technologies: [] },
    ],
    metric: ["Capacity"],
    geography: {
      global: true,
      regions: { "South East Asia": ["ID", "TH", "VN"] },
      country: ["SG"],
    },
    // `across sectors`, not the retired `cross-sector`: the resolver looks
    // scopes up exactly, so the old spelling would match nothing. The Steel row
    // gives the ribbon a value to move to on each axis.
    keyFeatures: {
      emissionsTrajectory: [
        {
          sector: "across sectors",
          geography: "Global",
          value: "Significant decrease",
        },
        {
          sector: "Steel",
          geography: "Global",
          value: "Moderate decrease",
        },
        {
          sector: "Buildings",
          geography: "Global",
          value: "Minor decrease",
        },
      ],
      // SG records only "No information", which does not make it selectable.
      energyDemand: [
        { sector: "Power", geography: "SG", value: "No information" },
      ],
      // Never recorded for Power, which it cannot apply to: Power inherits it.
      electrification: [
        {
          sector: "across sectors",
          geography: "Global",
          value: "Moderate increase",
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
          sectorSegment: ["Power generation"],
          geography: ["Global"],
          timeResolution: "5-year steps",
          dataFormat: "Tabular",
          granularity: ["Unspecified"],
          scopeLimitations: "Unspecified",
        },
        {
          metricName: "Generation",
          sector: "Power",
          sectorSegment: ["Power generation"],
          geography: ["South East Asia"],
          timeResolution: "5-year steps",
          dataFormat: "Tabular",
          granularity: ["Unspecified"],
          scopeLimitations: "Unspecified",
        },
        {
          metricName: "Absolute Emissions",
          sector: "Steel",
          sectorSegment: ["No information"],
          geography: ["Global"],
          timeResolution: "5-year steps",
          dataFormat: "Tabular",
          granularity: ["Unspecified"],
          scopeLimitations: "Unspecified",
        },
      ],
    },
  },
  {
    // Power only, like JETP-CIPP-2023: no across sectors row, so nothing for
    // Electrification to inherit.
    id: "detail-power-only",
    name: { full: "Power-only Pathway", short: "PO" },
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
    sectors: [{ name: "Power", technologies: [] }],
    metric: ["Capacity"],
    geography: { country: ["SG"] },
    keyFeatures: {
      emissionsTrajectory: [
        { sector: "Power", geography: "SG", value: "Significant decrease" },
      ],
    },
    coreDrivers: {
      policies: null,
      emissionsTargets: null,
      technologyCosts: null,
      investmentChange: null,
      macroeconomicDrivers: null,
      behavioralShifts: null,
      otherDrivers: null,
    },
    dependencies: [],
    dataAvailability: {
      overall: "Hosted as a single timeseries file.",
      byMetric: [],
    },
  },
] as const;

/*
  Benchmark data for Power at Global and South East Asia, so those badges are
  selectable (#1017). Steel is selectable through its dependency, Buildings
  through a key feature; SG has nothing to show and is left out.
*/
const SYNC_INDEX = { synchronous: true };
const SCOPE_DATASETS = [
  {
    datasetId: "detail-scope_timeseries",
    path: "/data/detail-scope_timeseries.csv",
    summary: { sectors: ["power"], geographies: ["Global", "South East Asia"] },
  },
];

const WAIT = { timeout: 10_000 };
const TEST_TIMEOUT = 20_000;

async function mountDetailPage(
  initialEntry = "/pathway/detail-scope",
): Promise<void> {
  vi.resetModules();
  vi.doMock("../data/pathwayMetadata", () => ({ pathwayMetadata: fixtures }));
  vi.doMock("../utils/timeseriesIndex", () => ({
    fetchTimeseriesIndex: () => Promise.resolve({}),
    getTimeseriesIndex: () => SYNC_INDEX,
    // Only the synchronous read behind the ribbon's availability sees data, so
    // the plots' JSON fetch stays out of the test.
    datasetsForPathway: (index: unknown) =>
      index === SYNC_INDEX ? SCOPE_DATASETS : [],
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

/** The key feature labelled `label`: its item in the group's list. */
async function findFeature(label: string): Promise<HTMLElement> {
  let item: HTMLElement = await screen.findByText(
    label,
    { selector: "p" },
    WAIT,
  );
  while (
    item.parentElement &&
    !item.parentElement.classList.contains("space-y-4")
  ) {
    item = item.parentElement;
  }
  return item;
}

/** Open the tooltip on `trigger`'s focusable ancestor, and read it. */
async function tooltipOf(trigger: HTMLElement): Promise<string | null> {
  const focusable = trigger.closest("[tabindex]") as HTMLElement;
  // Re-fired inside waitFor: TextWithTooltip attaches its listeners in an
  // effect, and a focus that lands before them is dropped without a trace.
  await waitFor(() => {
    fireEvent.focus(focusable);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
  const content = screen.getByRole("tooltip").textContent;
  fireEvent.blur(focusable);
  return content;
}

describe("PathwayDetailPage — scope ribbon (#872)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it(
    "opens on the widest geography and the Power sector",
    async () => {
      await mountDetailPage();
      await screen.findByText("The description prose.", undefined, WAIT);

      // Widest declared token first: this fixture is global, so Global.
      expect(screen.getByRole("button", { name: "Power" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Global" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Steel" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(
        screen.getByRole("button", { name: "South East Asia" }),
      ).toHaveAttribute("aria-pressed", "false");

      // Every declared token stays offered, whether selected or not.
      expect(
        screen.queryByRole("button", { name: /^Clear/ }),
      ).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "leaves a token with nothing to show out of the ribbon, but not out of Coverage (#1046)",
    async () => {
      await mountDetailPage("/pathway/detail-scope?tab=scope");
      await screen.findByRole("region", { name: "Geographies" }, WAIT);

      // SG has no benchmark data, and its only key feature says "No
      // information", so there is nothing to show for it (#1017).
      expect(
        screen.getByRole("group", { name: "Geography" }),
      ).not.toHaveTextContent("Singapore");
      // The Coverage panel still lists the pathway's full coverage.
      expect(
        screen.getByRole("region", { name: "Geographies" }),
      ).toHaveTextContent("Singapore");
    },
    TEST_TIMEOUT,
  );

  it(
    "makes a sector selectable through its key features alone",
    async () => {
      await mountDetailPage("/pathway/detail-scope?tab=assumptions");
      // Wait for the Emissions group, not the panel title: the title differs
      // per tab and has been renamed before (#1041).
      await screen.findByRole("heading", { level: 4, name: "Emissions" }, WAIT);

      // Buildings has no benchmark data or dependency, only a key feature.
      await selectScope("Buildings");
      expect(screen.getByRole("button", { name: "Buildings" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(
        screen.getByRole("heading", { level: 4, name: "Emissions" })
          .parentElement,
      ).toHaveTextContent("Minor decrease");
    },
    TEST_TIMEOUT,
  );

  it(
    "opens with the tables already narrowed to that scope",
    async () => {
      await mountDetailPage("/pathway/detail-scope?tab=scope");
      await screen.findByRole("rowheader", { name: "Capacity" }, WAIT);

      // Power + Global: the Power/SEA and Steel/Global rows are both excluded.
      expect(
        screen.getAllByRole("rowheader").map((th) => th.textContent),
      ).toEqual(["Capacity"]);
      expect(
        screen.getByText("Showing 1 of 3 rows for Power in Global."),
      ).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "re-filters the availability table when the geography changes",
    async () => {
      await mountDetailPage("/pathway/detail-scope?tab=scope");
      await screen.findByRole("rowheader", { name: "Capacity" }, WAIT);

      await selectScope("South East Asia");

      // Still Power, now regional: the regional row joins, and the Global row
      // stays because a global row answers any selection.
      expect(
        screen.getAllByRole("rowheader").map((th) => th.textContent),
      ).toEqual(["Capacity", "Generation"]);
      expect(
        screen.getByText("Showing 2 of 3 rows for Power in South East Asia."),
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

      clickTab("Assumptions & Dependencies");
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
    "seeds a matching search selection instead of the default",
    async () => {
      // Arriving from a search for Thailand: the geography axis takes the
      // pathway's region containing TH, while the sector axis, which the search
      // said nothing about, still takes its default.
      sessionStorage.setItem(
        "pathway-filters",
        JSON.stringify({ geography: "TH", searchTerm: "" }),
      );

      await mountDetailPage();
      await screen.findByText("The description prose.", undefined, WAIT);

      expect(
        screen.getByRole("button", { name: "South East Asia" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Global" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByRole("button", { name: "Power" })).toHaveAttribute(
        "aria-pressed",
        "true",
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

  // Both tabs render their own KeyFeatures panel, each wired separately, so
  // each is checked: At a glance is the default tab, opened without `?tab`.
  it.each([
    ["At a glance", "/pathway/detail-scope"],
    ["Assumptions & Dependencies", "/pathway/detail-scope?tab=assumptions"],
  ])(
    "resolves key features for the ribbon's scope on %s, badging inherited values",
    async (_tab, path) => {
      await mountDetailPage(path);
      // Wait for the Emissions group, not the panel title: the title differs
      // per tab and has been renamed before (#1041).
      await screen.findByRole("heading", { level: 4, name: "Emissions" }, WAIT);
      const emissions = (): HTMLElement =>
        screen.getByRole("heading", { level: 4, name: "Emissions" })
          .parentElement as HTMLElement;

      // Power · Global has no row of its own: inherited from across sectors.
      expect(emissions()).toHaveTextContent("Significant decrease");
      expect(emissions()).toHaveTextContent("Across sectors · Global");

      // Steel · Global is recorded exactly, so nothing is inherited.
      await selectScope("Steel");
      expect(emissions()).toHaveTextContent("Moderate decrease");
      expect(emissions()).not.toHaveTextContent(" · ");

      // Steel · South East Asia falls back up the geography chain, and stays
      // in Steel rather than taking the across sectors value.
      await selectScope("South East Asia");
      expect(emissions()).toHaveTextContent("Moderate decrease");
      expect(emissions()).toHaveTextContent("Steel · Global");
    },
    TEST_TIMEOUT,
  );

  it(
    "says Electrification does not apply to Power, inheriting where it can",
    async () => {
      // Electrification is on the full panel only, not At a glance's subset.
      await mountDetailPage("/pathway/detail-scope?tab=assumptions");
      const electrification = await findFeature("Electrification");

      // Opens on Power · Global, which inherits the across sectors value.
      expect(electrification).toHaveTextContent("Moderate increase");
      expect(
        await tooltipOf(
          within(electrification).getByText("Across sectors · Global"),
        ),
      ).toBe(
        "Electrification does not apply to the Power sector; showing the" +
          " closest broader scope this pathway reports.",
      );
    },
    TEST_TIMEOUT,
  );

  it(
    "shows Not applicable, not No information, when Power has nothing to inherit",
    async () => {
      await mountDetailPage("/pathway/detail-power-only?tab=assumptions");
      const electrification = await findFeature("Electrification");

      expect(electrification).not.toHaveTextContent("No information");
      expect(
        await tooltipOf(within(electrification).getByText("Not applicable")),
      ).toBe("Electrification does not apply to the Power sector.");
    },
    TEST_TIMEOUT,
  );
});
