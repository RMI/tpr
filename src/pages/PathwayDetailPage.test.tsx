import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

// The page waits out a 300 ms load timer and BadgeArray measures itself across a
// requestAnimationFrame, so these waits are sensitive to CPU contention under
// full-suite parallelism (the same class of flake ComparisonPage.test.tsx hits).
// Give them room rather than leaving a timing-dependent test in the suite.
const WAIT = { timeout: 5000 };

/** The TextWithTooltip trigger wrapping a badge (it carries tabIndex=0). */
const triggerFor = (label: string): HTMLElement => {
  const badge = screen.getByText(label);
  const trigger = badge.closest("[tabindex]");
  if (!(trigger instanceof HTMLElement)) {
    throw new Error(`No tooltip trigger found for badge "${label}"`);
  }
  return trigger;
};

describe("PathwayDetailPage — region geography tooltips", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("makes region badges hoverable and lists the mapped countries by name", async () => {
    await mountDetailPage("detail-a");

    const badge = await screen.findByText("South East Asia", undefined, WAIT);
    expect(badge).toBeInTheDocument();

    // Focus is the keyboard-equivalent of hover in TextWithTooltip, and the only
    // one jsdom drives reliably; the tooltip body is portaled to document.body.
    fireEvent.focus(triggerFor("South East Asia"));

    const tooltip = await screen.findByRole("tooltip", undefined, WAIT);
    expect(tooltip).toHaveTextContent("3 countries");
    expect(tooltip).toHaveTextContent("Indonesia");
    expect(tooltip).toHaveTextContent("Thailand");
    expect(tooltip).toHaveTextContent("Vietnam");
  });

  it("tells the user when a declared region has no published mapping", async () => {
    await mountDetailPage("detail-a");

    await screen.findByText("Unmapped Region", undefined, WAIT);
    fireEvent.focus(triggerFor("Unmapped Region"));

    const tooltip = await screen.findByRole("tooltip", undefined, WAIT);
    expect(tooltip).toHaveTextContent("No country mapping published");
  });

  it("leaves Global and country badges without a tooltip trigger", async () => {
    await mountDetailPage("detail-a");

    // "Global" and the country name render as plain badges: no tabbable wrapper,
    // so there is nothing to hover.
    const global = await screen.findByText("Global", undefined, WAIT);
    expect(global.closest("[tabindex]")).toBeNull();

    const country = screen.getByText("United States of America");
    expect(country.closest("[tabindex]")).toBeNull();
  });
});
