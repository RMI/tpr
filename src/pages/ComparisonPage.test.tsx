import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
    geography: { global: true, regions: { Europe: [] }, country: ["US"] },
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
] as const;

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
      await screen.findByText("PubA: Comparison Pathway A"),
    ).toBeInTheDocument();
    expect(screen.getByText("PubB: Comparison Pathway B")).toBeInTheDocument();

    // Geography badges reflect the flattened structured object:
    //   global → "Global", region key → "Europe", ISO-2 → country name.
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Europe")).toBeInTheDocument();
    expect(screen.getByText("United States of America")).toBeInTheDocument();
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
  });

  it("shows the guard prompt when fewer than 2 valid pathways are selected", async () => {
    await mountWithFixtures("cmp-a");

    expect(
      await screen.findByText("Select at least 2 pathways to compare."),
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
      await screen.findByText("These pathways cannot be compared"),
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
    await screen.findByText("These pathways cannot be compared");

    expect(sessionStorage.getItem("pathway-comparison")).toBe(
      JSON.stringify(["cmp-a", "cmp-b"]),
    );
  });

  it("still compares a set that shares only one sector", async () => {
    await mountWithFixtures("cmp-a,cmp-b");

    expect(
      await screen.findByText("PubA: Comparison Pathway A"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("These pathways cannot be compared"),
    ).not.toBeInTheDocument();
  });
});
