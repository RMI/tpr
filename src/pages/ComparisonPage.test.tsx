import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

// Structured-geography fixtures (the post-migration `{ global, regions, country }`
// shape). Two pathways so ComparisonPage clears its `ids.length < 2` guard, and
// between them they exercise every flattenGeography token kind: "Global",
// region labels, and ISO-2 country codes. Before the call site was wrapped in
// flattenGeography, rendering these threw `input.map is not a function` inside
// sortGeographiesForDetails and crashed the whole page.
const fixtures = [
  {
    id: "cmp-a",
    name: { full: "Comparison Pathway A", short: "A" },
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
    geography: {
      global: true,
      // One region with a published mapping and one without, so both arms of
      // the member tooltip are reachable.
      regions: { "Europe": ["DE", "FR", "IT"], "Unmapped Region": [] },
      country: ["US"],
    },
    keyFeatures: {
      emissionsTrajectory: [
        { sector: "cross-sector", geography: "Global", value: "foo" },
      ],
    },
  },
  {
    id: "cmp-b",
    name: { full: "Comparison Pathway B", short: "B" },
    description: "Pathway B description",
    pathwayType: "BAU",
    modelYearNetzero: 2040,
    modelTempIncrease: 2,
    publication: {
      publisher: { full: "Publisher B", short: "PubB" },
      title: { full: "Publication B", short: "PubTitleB" },
      year: 2023,
    },
    // Shares Power with pathway A: a comparison needs one sector in common,
    // and these tests are about geography, not the sector restriction.
    sectors: [{ name: "Steel" }, { name: "Power" }],
    metric: ["Generation"],
    geography: { country: ["DE", "FR"] },
    keyFeatures: {
      emissionsTrajectory: [
        { sector: "cross-sector", geography: "DE", value: "bar" },
      ],
    },
  },
  {
    // Shares no sector with A or B, so a comparison including it has no shared
    // sector axis at all. No shipped pathway can do this — all seven declare
    // Power — so the restriction is provable only by fixture.
    id: "cmp-c",
    name: { full: "Comparison Pathway C", short: "C" },
    description: "Pathway C description",
    pathwayType: "BAU",
    publication: {
      publisher: { full: "Publisher C", short: "PubC" },
      title: { full: "Publication C", short: "PubTitleC" },
      year: 2022,
    },
    sectors: [{ name: "Cement" }],
    metric: ["Generation"],
    geography: { global: true, regions: {}, country: [] },
    keyFeatures: {},
  },
  {
    // Same publisher as A and Global-only, so A + D agree on Global and the
    // divergence notice stays silent — the case where the section order is
    // left alone.
    id: "cmp-d",
    name: { full: "Comparison Pathway D", short: "D" },
    description: "Pathway D description",
    pathwayType: "Net Zero",
    publication: {
      publisher: { full: "Publisher A", short: "PubA" },
      title: { full: "Publication D", short: "PubTitleD" },
      year: 2025,
    },
    sectors: [{ name: "Power" }],
    metric: ["Capacity"],
    geography: { global: true, regions: {}, country: [] },
    keyFeatures: {},
  },
] as const;

/*
  Mounting this page is slow and contention-sensitive: vi.resetModules() forces
  a fresh dynamic import and a second async effect re-renders once the (stubbed)
  timeseries index resolves. Under full-suite parallelism that can overrun RTL's
  default 1000 ms budget, so every findBy* here carries a generous one.

  The per-test timeout is raised file-wide rather than argument-by-argument (as
  PathwayDetailPage.*.test.tsx does it) because every test in this file mounts
  the same way — a query budget at or above vitest's default 5 s testTimeout
  would otherwise surface a real failure as an unhelpful "test timed out"
  instead of the query's own error. Closes #896.
*/
const WAIT = { timeout: 10_000 };
vi.setConfig({ testTimeout: 20_000 });

async function mountWithFixtures(ids: string): Promise<void> {
  // Reset the module graph so the mocks below apply to the next import.
  vi.resetModules();

  // ComparisonPage reads pathwayMetadata at module load, so mock BEFORE importing it.
  vi.doMock("../data/pathwayMetadata", () => ({ pathwayMetadata: fixtures }), {
    virtual: true,
  });
  // Keep the timeseries fetch out of the test: no network, no async plot loading.
  vi.doMock("../utils/timeseriesIndex", () => ({
    fetchTimeseriesIndex: () => Promise.resolve({}),
    datasetsForPathway: () => [],
    summarizeSummary: () => undefined,
  }));

  // Import ComparisonProvider from the same fresh module graph so it shares the
  // React context instance the re-imported page consumes.
  const [{ default: ComparisonPage }, { ComparisonProvider }] =
    await Promise.all([
      import("./ComparisonPage"),
      import("../context/ComparisonContext"),
    ]);

  render(
    <MemoryRouter initialEntries={[`/compare?ids=${ids}`]}>
      <ComparisonProvider>
        <ComparisonPage />
      </ComparisonProvider>
    </MemoryRouter>,
  );
}

describe("ComparisonPage — structured geography", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("renders structured geography for compared pathways without crashing", async () => {
    await mountWithFixtures("cmp-a,cmp-b");

    // Both pathway summary cards render (proves the page did not crash).
    expect(
      await screen.findByText("PubA: Comparison Pathway A", undefined, WAIT),
    ).toBeInTheDocument();
    expect(screen.getByText("PubB: Comparison Pathway B")).toBeInTheDocument();

    /*
      Geography badges reflect the flattened structured object:
        global → "Global", region key → "Europe", ISO-2 → country name.

      getAllByText rather than getByText: the scope header's per-column
      dropdown mirrors the coverage section, so a token the column has selected
      appears twice on the page by design.
    */
    expect(screen.getAllByText("Global").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Europe").length).toBeGreaterThan(0);
    expect(screen.getByText("United States of America")).toBeInTheDocument();
    expect(screen.getAllByText("Germany").length).toBeGreaterThan(0);
    expect(screen.getByText("France")).toBeInTheDocument();
  });

  it("shows the guard prompt when fewer than 2 valid pathways are selected", async () => {
    await mountWithFixtures("cmp-a");

    expect(
      await screen.findByText(
        "Select at least 2 pathways to compare.",
        undefined,
        WAIT,
      ),
    ).toBeInTheDocument();
  });
});

describe("ComparisonPage — pathways with no sector in common", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("blocks the comparison and names the offending pathway", async () => {
    // The tray cannot assemble this set (PathwayCard blocks it), but `?ids=` is
    // read straight from the query string, so a hand-edited or stale shared
    // link still reaches the page.
    await mountWithFixtures("cmp-a,cmp-c");

    expect(
      await screen.findByText(
        "These pathways cannot be compared",
        undefined,
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PubC: Comparison Pathway C shares no sector/),
    ).toBeInTheDocument();

    // The comparison itself is not rendered.
    expect(
      screen.queryByText("PubA: Comparison Pathway A"),
    ).not.toBeInTheDocument();
  });

  it("leaves the reader's own selection alone", async () => {
    // Syncing `?ids=` into the tray would replace a perfectly good selection
    // with the broken one from the link.
    sessionStorage.setItem(
      "pathway-comparison",
      JSON.stringify(["cmp-a", "cmp-b"]),
    );

    await mountWithFixtures("cmp-a,cmp-c");
    await screen.findByText(
      "These pathways cannot be compared",
      undefined,
      WAIT,
    );

    expect(sessionStorage.getItem("pathway-comparison")).toBe(
      JSON.stringify(["cmp-a", "cmp-b"]),
    );
  });

  it("still compares a set that shares only one sector", async () => {
    await mountWithFixtures("cmp-a,cmp-b");

    expect(
      await screen.findByText("PubA: Comparison Pathway A", undefined, WAIT),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("These pathways cannot be compared"),
    ).not.toBeInTheDocument();
  });
});

describe("ComparisonPage — shared scope", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  /** The geography control for one column, by the pathway it belongs to. */
  const columnTrigger = (name: string) =>
    screen.getByRole("button", { name: `Geography for ${name}` });

  it("takes each column's geography from the URL", async () => {
    await mountWithFixtures(
      "cmp-a,cmp-b&sector=Power&geography=cmp-a:Europe,cmp-b:DE",
    );

    await screen.findByText("PubA: Comparison Pathway A", undefined, WAIT);

    expect(columnTrigger("A")).toHaveTextContent("Europe");
    expect(columnTrigger("B")).toHaveTextContent("Germany");
    expect(
      screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map((b) => b.textContent),
    ).toEqual(["Power"]);
  });

  it("defaults each column independently when the URL carries none", async () => {
    // A leads with Global, the broadest it declares; B declares only
    // countries, so it leads with the first of those.
    await mountWithFixtures("cmp-a,cmp-b");

    await screen.findByText("PubA: Comparison Pathway A", undefined, WAIT);

    expect(columnTrigger("A")).toHaveTextContent("Global");
    expect(columnTrigger("B")).toHaveTextContent("Germany");
  });

  it("ignores a token the column does not declare", async () => {
    // B declares no Europe, so it falls back to its own default rather than
    // showing a geography it does not publish.
    await mountWithFixtures(
      "cmp-a,cmp-b&geography=cmp-a:Atlantis,cmp-b:Europe",
    );

    await screen.findByText("PubA: Comparison Pathway A", undefined, WAIT);

    expect(columnTrigger("A")).toHaveTextContent("Global");
    expect(columnTrigger("B")).toHaveTextContent("Germany");
  });

  it("warns that the columns are not showing the same geography", async () => {
    await mountWithFixtures("cmp-a,cmp-b&geography=cmp-a:US,cmp-b:DE");
    await screen.findByText("PubA: Comparison Pathway A", undefined, WAIT);

    expect(
      screen.getByText(/not showing the same geography/),
    ).toBeInTheDocument();
  });

  it("keeps the Geographies section in place when the columns diverge", async () => {
    /*
      The section used to float above the plots on any divergence. With a
      control under each column in the header, the discrepancy is stated where
      the reader chose it, so the order stays fixed.

      "Policies" is FEATURE_GROUPS[0]; the pathway cards also carry h3s, so a
      bare querySelector("h3") would anchor on a card instead.
    */
    await mountWithFixtures("cmp-a,cmp-b&geography=cmp-a:US,cmp-b:DE");
    await screen.findByText("PubA: Comparison Pathway A", undefined, WAIT);

    const geographies = screen.getByRole("heading", { name: /Geographies/ });
    const keyFeatures = screen.getByRole("heading", { name: "Policies" });

    expect(
      geographies.compareDocumentPosition(keyFeatures) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it("changes one column without disturbing the other", async () => {
    await mountWithFixtures("cmp-a,cmp-b");
    await screen.findByText("PubA: Comparison Pathway A", undefined, WAIT);

    const user = userEvent.setup();
    await user.click(columnTrigger("A"));
    await user.click(screen.getByRole("option", { name: "Europe" }));

    expect(columnTrigger("A")).toHaveTextContent("Europe");
    expect(columnTrigger("B")).toHaveTextContent("Germany");
  });
});

describe("ComparisonPage — region geography tooltips", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  /**
   * The Geographies coverage section. Scoped, because the scope header's
   * dropdown trigger shows a geography label too — an unscoped getByText would
   * be ambiguous.
   */
  const geographiesSection = async (): Promise<HTMLElement> => {
    const heading = await screen.findByRole(
      "heading",
      { name: /Geographies/ },
      WAIT,
    );
    return heading.closest(".grid") as HTMLElement;
  };

  /**
   * Focus is the keyboard equivalent of hover in TextWithTooltip, and the only
   * one jsdom drives reliably. The tooltip portals to document.body, so it is
   * queried unscoped even though the trigger is not.
   */
  const openTooltipFor = async (
    scope: HTMLElement,
    label: string,
  ): Promise<HTMLElement> => {
    const trigger = within(scope).getByText(label).closest("[tabindex]");
    let tooltip: HTMLElement | null = null;
    await waitFor(() => {
      fireEvent.focus(trigger as HTMLElement);
      tooltip = screen.getByRole("tooltip");
    }, WAIT);
    return tooltip as unknown as HTMLElement;
  };

  it("lists a region's member countries by name", async () => {
    await mountWithFixtures("cmp-a,cmp-b");
    const section = await geographiesSection();

    const tooltip = await openTooltipFor(section, "Europe");
    expect(tooltip).toHaveTextContent("3 countries");
    expect(tooltip).toHaveTextContent("Germany");
    expect(tooltip).toHaveTextContent("France");
    expect(tooltip).toHaveTextContent("Italy");
  });

  it("uses each column's own mapping", async () => {
    // Region membership is publication-specific, so the tooltip has to read
    // the pathway whose column the badge sits in.
    await mountWithFixtures("cmp-a,cmp-b");
    const section = await geographiesSection();

    // Pathway B declares no regions at all, so only A's Europe is present.
    expect(within(section).getAllByText("Europe")).toHaveLength(1);
    expect(await openTooltipFor(section, "Europe")).toHaveTextContent(
      "Germany",
    );
  });

  it("says so when a declared region has no published mapping", async () => {
    await mountWithFixtures("cmp-a,cmp-b");
    const section = await geographiesSection();

    const tooltip = await openTooltipFor(section, "Unmapped Region");
    expect(tooltip).toHaveTextContent("No country mapping available");
  });

  it("leaves Global and country badges without a tooltip trigger", async () => {
    // Neither has members to list, so they stay plain spans — nothing to
    // hover, and no focus stop for a keyboard reader to land on.
    await mountWithFixtures("cmp-a,cmp-b");
    const section = await geographiesSection();

    expect(
      within(section).getByText("Global").closest("[tabindex]"),
    ).toBeNull();
    expect(
      within(section)
        .getByText("United States of America")
        .closest("[tabindex]"),
    ).toBeNull();
    expect(
      within(section).getByText("Germany").closest("[tabindex]"),
    ).toBeNull();
  });
});
